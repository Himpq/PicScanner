# 接入架构设计（插件注入 UI + 多向量库 + 可追溯向量）

本文件锁定两件事，均不写死 PicScanner 本体：

1. **插件主动往界面加内容**：用现有模块框架的「声明式 UI 贡献」扩展，
   一个左上角的「图片向量扫描」按钮由**语义插件自己声明**，主程序只提供
   通用插槽（slot），不出现任何语义搜索专有代码。
2. **向量核心层可扩展、可回溯**：`vector_core` 把「向量库后端」「向量记录
   数据结构」「索引注册表」三层解耦，支持不同向量库共存，每个向量带完整
   溯源元数据，方便回溯与查找。

---

## 一、UI 贡献注册表（插件加按钮，核心不写死）

### 1.1 现有基础（已具备，无需重造）

`app/modules/loader.py` 已支持：
- `module.json` 声明 `{key,name,version,description,frontend}`
- `backend.py` 的 `api_methods()` 经 `module_api(key, method, *args)` 调用
- `setup(ctx)` 注入 `storage / config / push`
- 前端 `app/ui/assets/app_modules.js` 已有 `register()` / `registerSourceStage()`
  和后端事件通道 `PicScannerModules.onBackendEvent(...)`

缺口：现有模块只能从**下拉菜单**打开、且挂在**快速修图侧栏**（需先打开照片）。
用户要的是**左上角常驻控件**，与单张照片无关 —— 这是「通用插槽」缺口。

### 1.2 设计：声明式 contributions + 通用插槽渲染

**(a) 模块清单新增 `contributions` 字段（module.json）**

```json
{
  "key": "semantic_search",
  "name": "语义搜索",
  "version": "0.1.0",
  "description": "中文语义搜图",
  "frontend": "semantic_search.js",
  "contributions": [
    {
      "slot": "toolbar-left",
      "type": "button",
      "id": "semantic-scan",
      "label": "图片向量扫描",
      "action": "open"            // 点击后调用本模块的 open() 方法
    }
  ]
}
```

`slot` 取值（主机预留的通用槽位，任何插件都能用，非语义搜索专有）：
`toolbar-left`（左上）、`toolbar-right`、`sidebar`、`search-actions`、
`settings-section`、`lightbox-actions`。

**(b) 后端 `get_modules()` 透传 contributions（api.py，1 行扩展）**

```python
def get_modules(self):
    return {"success": True, "modules": [
        {
            "key": h.key, "name": h.name, "version": h.version,
            "description": h.description, "frontend_url": h.frontend_url,
            "contributions": h.contributions,          # 新增：来自 module.json
        } for h in self._modules.values()
    ]}
```

loader 解析 manifest 时顺手把 `contributions` 读进 `ModuleHandle` 即可
（ModuleHandle 加一个字段）。

**(c) 前端通用插槽渲染器（新增 `app/ui/assets/ui_contributions.js`）**

bootstrap 阶段：遍历每个模块的 `contributions`，在对应 slot 内挂载控件。
slot 容器**动态创建**并插入 `.toolbar`（紧跟在 `.toolbar-spacer` 之前），
因此 **index.html 无需任何针对语义搜索的改动**，只是多了个通用容器：

```js
function mountContribution(meta, c) {
  const toolbar = document.querySelector('.toolbar');
  let slot = toolbar.querySelector(`[data-ui-slot="${c.slot}"]`);
  if (!slot) { slot = document.createElement('div');
    slot.className = 'ui-slot'; slot.dataset.uiSlot = c.slot;
    toolbar.insertBefore(slot, toolbar.querySelector('.toolbar-spacer')); }
  const btn = document.createElement('button');
  btn.className = 'toolbar-btn';
  btn.textContent = c.label;
  btn.addEventListener('click', () => {
    const def = window.PicScannerModules.getDef(meta.key);
    if (def && typeof def[c.action] === 'function') def[c.action]();
    else window.PS.call('module_api', meta.key, c.action);
  });
  slot.appendChild(btn);
}
```

语义插件的 `semantic_search.js` 自己实现 `open()`：弹出一个浮层/侧栏，
内含「建立索引 / 进度条 / 模型下载 / 结果列表」，全部通过 `ctx.call(...)` 调后端。

**核心零专有代码**：PicScanner 本体只多了「读 contributions + 通用插槽渲染」
这两段通用逻辑；「图片向量扫描」这个按钮是语义插件自己声明、自己实现的。

### 1.3 给主程序的改动清单（全部泛型）

| 位置 | 改动 | 是否语义搜索专用 |
|---|---|---|
| `ModuleHandle` | 新增 `contributions` 字段 | 否（通用） |
| `api.py get_modules` | 透传 contributions | 否 |
| `ui_contributions.js` | 通用插槽渲染器 | 否 |
| `index.html` | 无（容器动态创建） | — |
| `Storage.iter_indexable_photos()` | 枚举可索引照片 | 否 |
| `ScannerManager.on_scan_finished()` | 扫描完成钩子 | 否 |
| `api.search_photos` | `register_search_provider` 融合 | 否 |

---

## 二、向量核心层（多库 + 可追溯）

目标：不同向量库可共存；每个向量带完整溯源；可回溯「这条匹配由哪个模型、
哪份源文件、何时生成」。

### 2.1 目录结构

```
plugins/semantic_search/vector_core/
    record.py       # VectorRecord 数据结构 + 校验
    backend.py      # VectorBackend 协议 + NumpyBackend + 预留后端桩
    store.py        # VectorStore：元数据 + 委托后端做 ANN + SQLite 持久化
    registry.py     # VectorIndexRegistry：命名索引、跨库查找、回溯
```

### 2.2 VectorRecord —— 每个向量的可追溯结构

```python
@dataclass
class VectorRecord:
    id: str                 # 稳定主键，建议 f"{source_id}:{item_key}"
    index_name: str         # 所属索引/命名空间（"semantic-image" 等）
    source_id: str          # 来源库（与 photos.source_id 对齐）
    item_key: str           # 与 source_marks.item_key 同口径，便于关联
    path: str               # 原文件绝对路径（点击打开/回溯用）
    media_type: str         # 'photo' | 'face' | 'region' | 'text'
    modality: str           # 'image' | 'text'
    model: str              # 'OFA-Sys/chinese-clip-vit-base-patch16'
    model_version: str      # 模型版本/校验和，决定是否需要重算
    dim: int                # 向量维度（用于跨库隔离）
    source_signature: str   # mtime^size 哈希，增量更新 + 审计
    created_at: str         # 生成时间（ISO）
    extra: dict             # 自由字段：exif 摘要、标签、父区域、质量分
    embedding: bytes        # float32.tobytes()，与元数据分离存储
```

`store` 的数据库表据此设计**显式列**（而非只存 BLOB），使溯源字段可用 SQL 查询：

```sql
CREATE TABLE vector_records (
    id               TEXT PRIMARY KEY,
    index_name       TEXT NOT NULL,
    source_id        TEXT NOT NULL,
    item_key         TEXT NOT NULL,
    path             TEXT NOT NULL,
    media_type       TEXT,
    modality         TEXT,
    model            TEXT NOT NULL,
    model_version    TEXT,
    dim              INTEGER NOT NULL,
    source_signature TEXT,
    created_at       TEXT,
    extra            TEXT,            -- JSON
    embedding        BLOB NOT NULL
);
CREATE INDEX idx_vec_index ON vector_records(index_name);
CREATE INDEX idx_vec_source ON vector_records(source_id, item_key);
CREATE INDEX idx_vec_model  ON vector_records(model);
```

### 2.3 VectorBackend —— 向量库后端抽象（支持不同库）

```python
class VectorBackend:
    def add(self, ids: list[str], vectors: np.ndarray) -> None: ...
    def query(self, vector: np.ndarray, top_k: int) -> list[tuple[str, float]]: ...
    def remove(self, ids: list[str]) -> None: ...
    def rebuild(self, ids: list[str], vectors: np.ndarray) -> None: ...
```

实现：
- `NumpyBackend`：**当前方案**，精确余弦、零依赖，万级够用。
- `FaissBackend` / `SqliteVecBackend` / `LanceBackend`：**预留桩**，仅当规模
  到百万级或需要持久 ANN 时启用，按 config 选择。

`VectorStore` 只认 `VectorBackend` 接口，不关心底层是 numpy 还是 faiss ——
**这就是「不同向量库」的预留点**：换库不改上层语义逻辑，只换 backend 实现。

### 2.4 VectorStore —— 上层（元数据 + 委托 + 溯源）

```python
class VectorStore:
    def __init__(self, index_name, backend: VectorBackend, db_path): ...
    def upsert(self, record: VectorRecord) -> None: ...        # 写表 + backend.add
    def remove(self, id: str) -> None: ...
    def search(self, query_vec, top_k=8, filters=None) -> list[ScoredRecord]:
        # 1) backend.query 拿 (id, score)
        # 2) 回表取完整 VectorRecord（带 model/source/created_at）
        # 3) 返回 ScoredRecord(record, score) —— 结果天然可追溯
    # 回溯/查找助手：
    def by_model(self, model) -> list[VectorRecord]: ...
    def by_source(self, source_id) -> list[VectorRecord]: ...
    def audit(self) -> dict: ...   # 计数、模型分布、维度分布
```

`ScoredRecord` 让前端/调用方拿到**完整溯源**，而非裸 path+score：
「这张照片为什么被搜出 → 由模型 X 在 T 时刻生成、源文件为 P」。

### 2.5 VectorIndexRegistry —— 命名索引注册表（多库共存 + 统一入口）

```python
class VectorIndexRegistry:
    def register(self, name: str, store: VectorStore) -> None: ...
    def get(self, name: str) -> VectorStore: ...
    def list(self) -> list[str]: ...
    def search_across(self, names, query_vec, top_k) -> dict[str, list[ScoredRecord]]: ...
```

- 每个语义索引、人脸嵌入、第三方插件索引各占一个 `name`，可各自用不同
  backend / model / dim —— **「不同向量库」在运行期表现为一组命名索引**。
- 注册表是**唯一查找入口**：`registry.get("semantic-image").search(...)`，
  也支撑跨库联合检索（`search_across`）。
- 多库隔离关键：不同 `dim` 的向量不会混算（search 时校验），老模型向量
  可被 `by_model` 精确挑出并重算。

### 2.6 为何满足三条要求

| 要求 | 设计落点 |
|---|---|
| 不同向量库 | `VectorBackend` 抽象 + `VectorIndexRegistry` 命名索引，每索引可换库/换模型 |
| 每个向量的数据结构 | `VectorRecord` 全字段 + 显式列表列，SQL 可查 |
| 方便回溯与查找 | `ScoredRecord` 带 model/source/created_at；`by_model/by_source/audit` 助手；注册表统一入口 |

---

## 三、语义插件挂接（薄包装）

`plugins/semantic_search/` 在正式化后：
- 复用现有 `encoder.py`（ChineseCLIP 封装）
- `store.py` 改为基于 `vector_core.VectorStore`，索引名 `"semantic-image"`
- `backend.py` 的 `api_methods` 暴露 `search / build_index / index_status /
  cancel_index / set_config / open`
- 前端 `semantic_search.js` 实现 `open()` 弹层（接 `contributions` 的按钮）

---

## 四、迁移路径（不破坏当前可跑的工具）

1. 新增 `vector_core/`（record/backend/store/registry），独立可单测。
2. 让 `plugins/semantic_search/store.py` 改为 `VectorStore` 的薄壳，
   现有 `scan`/`search` CLI 行为不变（CLI 直接用 store.py，绕开注册表）。
3. 主程序侧按 §1.3 清单做泛型改动；语义插件以模块形式接入。
4. 验证：CLI 仍可用 → 模块模式可用 → 搜索框融合可用。

---

## 五、给主程序的最小改动总结（全部非专有）

- `ModuleHandle` + `get_modules`：透传 `contributions`（通用）
- 新增 `ui_contributions.js`：通用插槽渲染（通用）
- 新增 `Storage.iter_indexable_photos()`（通用枚举）
- 新增 `ScannerManager.on_scan_finished()`（通用钩子）
- `search_photos` 增加 `register_search_provider`（通用融合入口）
- 语义搜索相关内容**只存在于插件目录**，主程序零硬编码
