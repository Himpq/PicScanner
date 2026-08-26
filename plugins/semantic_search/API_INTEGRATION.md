# PicScanner ↔ semantic_search 插件接口设计

目标：让插件读到主程序的照片清单与缩略图、跟随扫描自动建索引、
把语义结果并入主搜索框。分四个阶段推进，前两阶段主程序几乎不用改。

## 零、现状盘点（插件能拿到什么）

`app/modules/loader.py` 的模块约定已经提供了大部分基础设施：

| 已有能力 | 出处 | 对本插件的意义 |
|---|---|---|
| `setup(ctx)` 注入 `storage` | loader.discover_modules | 直接用 Storage 实例查照片表 |
| 注入 `push(event, data)` | 同上，经 `_module_push`→evaluate_js | 索引进度条事件通道现成 |
| 注入 `config`（PluginConfig） | 同上，存 data/module_configs/{key}.json | 存模型选择/阈值/开关 |
| `module_api(key, method, *args)` | api.py | 前端调用插件方法的统一入口 |
| 模块加载失败不阻断启动 | loader 设计保证 | 缺 torch 时优雅降级为关键词搜索 |
| 缩略图管线 | thumbnailer.ensure_thumbnail / existing_thumbnail | 编码输入源，覆盖 RAW 预览 |

缺的只有三样：照片全量枚举方法、扫描完成事件、语义结果并入主搜索。

## 一、阶段 1：只读直连（不改主程序一行代码）

插件以独立进程运行时直接 import 主程序代码（同仓库同环境），

```python
from app.backend.thumbnailer import existing_thumbnail, ensure_thumbnail

# 只读打开主库，绝不写主程序的 picscanner.db
URI = f"file:{DB_PATH.as_posix()}?mode=ro"
conn = sqlite3.connect(URI, uri=True, timeout=30)

rows = conn.execute("""
    SELECT id, source_id, path, mtime, size
    FROM photos
    WHERE renderable = 1          -- 只索引可渲染图
      AND COALESCE(hidden, 0) = 0
""").fetchall()
```

要点与坑：

- **编码输入用缩略图**：先 `existing_thumbnail(path)` 取 420px JPEG，
  没有才 `ensure_thumbnail()`。CLIP 输入本来就缩到 224px，
  精度无损、I/O 大幅加快、RAW 自动走内嵌预览。
- **向量键从绝对路径换成 photo_id**：`(photo_id PRIMARY KEY, source_id,
  mtime, size, dim, model, embedding)`，仍存插件自己的 index.db，
  与主库物理分离，避免写锁竞争；查询时 Python 侧按 id 关联。
- 若主程序同时开着：只读连接 + WAL 模式可安全并发；
  ensure_thumbnail 有极小概率与主进程竞争同一张图的生成，
  最坏情况是重复生成一次，无一致性风险。
- 这个阶段的产出：**用真实相册验证精度**（配合 OPTIMIZATION.md 的评测集），
  为换 L/14 模型提供依据。

## 二、阶段 2：宿主 API（主程序三处小改）

### 2.1 Storage 提供公开枚举方法（storage.py）

替代插件手写 SQL：

```python
def iter_indexable_photos(self, source_id: str | None = None) -> list[dict]:
    """供索引类插件使用：renderable、未隐藏的照片引用列表。
    返回 [{id, source_id, path, relative_path, mtime, size}, ...]"""
```

### 2.2 扫描完成事件（scanner.py / api.py）

ScannerManager 状态机已有 finished 终态，补一个轻量回调注册即可：

```python
# ScannerManager
self._scan_finished_hooks: list[Callable[[str, dict], None]] = []
def on_scan_finished(self, cb): ...   # _run_scan 结束处逐个调用

# loader ctx 增补透传：ctx["events"] = {"scan_finished": 注册器}
```

插件收到事件后自动触发增量索引（后台线程），进度经 `ctx["push"]`
推送 `semantic_index_progress {done, total, phase}` 给前端画进度条。

### 2.3 语义结果并入主搜索（api.py search_photos，两档方案）

- **A 档（零主程序改动）**：前端在现有 search 之后追加
  `module_api('semantic_search', 'search', query, {...})`，JS 侧合并去重。
- **B 档（推荐终态）**：api.py 增加搜索提供者注册表：

```python
_search_providers: list = []
def register_search_provider(fn): ...   # fn(query, scope_ctx) -> [row-like]

# search_photos 内：keyword_rows 之后
for fn in _search_providers:
    extra = fn(clean_query, {"root_path": root, "source_id": resolved_source_id})
    rows = rrf_merge(rows, extra)       # score = Σ 1/(60+rank)
```

语义行打 `"search_match": "语义匹配"` 标签，前端零改动展示。

## 三、阶段 3：模块化落地形态

```
app/modules/semantic_search/
    module.json     # {"key":"semantic_search", "name":"语义搜索", "frontend":"frontend.js"}
    backend.py      # MODULE_CLASS = SemanticSearchModule（包装 plugins/semantic_search 现有代码）
    frontend.js     # 设置面板：建索引按钮/进度条/模型信息/阈值滑杆
```

backend.py 的 api_methods 建议：

| 方法 | 职责 |
|---|---|
| `search(query, source_id?, top_k?)` | 文本编码 + 向量检索，返回 photo_id+score+payload |
| `build_index(source_id?, rebuild=False)` | 后台线程增量索引，进度走 push |
| `index_status()` | 条数/体积/模型/设备/上次索引时间 |
| `cancel_index()` | 置停止标志 |
| `set_config(k,v)` | 透传 PluginConfig |

工程约束：

- **模型单例 + 惰性加载**：首次 search/scan 才加载；空闲 10 分钟卸载释放显存
  （与 face 模块的 mediapipe 共存）。
- **推理不进 UI 线程**：查询在 worker 线程，webview js_api 调用点只做排队等待。
- **模型版本写入每行**（model 字段）：换 L/14 后旧向量维度不符自动跳过，
  提示重建而不是静默混排。
- **降级链**：模型目录缺失→提示下载；torch 导入失败→模块加载跳过，
  主搜索不受影响（loader 已保证）。

## 四、里程碑与验收

| 阶段 | 改动方 | 验收标准 |
|---|---|---|
| 1 只读直连 | 仅插件 | 真实相册 500+ 张建索引成功；评测集 Recall@1 报表产出 |
| 2 宿主 API | 主程序 ≤3 处小改 | 扫描完成后自动增量索引；搜索框出「语义匹配」结果 |
| 3 模块化 | 双方 | 设置页可控；缺依赖时主程序照常启动 |
