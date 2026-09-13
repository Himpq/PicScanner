# semantic_search 插件（终端测试版）

基于 Chinese-CLIP 的本地语义搜图：输入自然语言（如「沙滩」「海边日落」），
按画面内容找出最相关的照片。全程离线运行，照片不出本机。

## 现状

独立立项阶段，不依赖 PicScanner 主程序：扫描指定文件夹 -> 向量化 ->
存入独立 SQLite 向量库 -> 终端交互查询。等主程序开放 API 后再迁入正式插件体系。

## 使用

先把测试照片放进项目根目录的 `test/` 文件夹（支持子文件夹），然后：

```bash
# 第一步：下载模型（仅首次，约 700MB，支持断点续传）
python -m plugins.semantic_search.download_model

# 第二步：建立索引（增量；换图后重跑只会处理变化的文件）
python -m plugins.semantic_search.cli scan

# 第三步：进入交互查询（也可直接运行，会自动进入交互模式）
python -m plugins.semantic_search.cli

# 单次查询
python -m plugins.semantic_search.cli search "沙滩"
```

交互模式下：

| 输入 | 作用 |
|---|---|
| 任意文字 | 搜索，如 `沙滩`、`海边日落`、`一只猫` |
| 数字（如 `2`） | 用系统默认看图器打开对应结果 |
| `:top 10` | 修改返回条数 |
| `:rescan` | 增量重扫 `test/` |
| `:stat` | 查看索引状态 |
| `:quit` | 退出 |

## 技术要点

- **模型**：`OFA-Sys/chinese-clip-vit-base-patch16`（中文原生支持，512 维向量，
  权重约 700MB）。由 `download_model.py` 下载为普通文件夹放在
  `data/plugins/semantic_search/model/`——不走 HF 缓存布局，零符号链接依赖，
  删除该目录即完成卸载
- **存储**：`data/plugins/semantic_search/index.db`（SQLite 单表，向量以 BLOB 存储；
  3k 张约 6MB，numpy 暴力检索毫秒级返回精确结果，无需专用向量数据库）
- **增量**：以 (mtime, size) 为文件签名，未变化文件跳过重编码；自动清理已删除文件的条目
- **设备**：自动选择 CUDA / DirectML / CPU。打包用 `onnxruntime-directml`（内置 CPU
  provider，无 GPU 机器照常运行）；DML/CUDA 初始化失败自动回退 CPU
- **进程隔离**：ONNX session 位于独立 worker 进程（`encoder_worker.py` +
  `app/ort_worker_entry.py` 垫片），主进程只做图像预处理与管道收发——ORT 建会话
  在 C++ 层持 GIL（DML 冷启动 2-4s），进程隔离保证模型加载/推理完全不卡 UI；
  worker 不可用时自动回退进程内编码器

## 已知限制（测试版）

- 仅支持常规图片格式（jpg/png/webp/bmp/gif/tiff）；RAW 格式待接入主程序的
  缩略图管线（`thumbnailer.ensure_thumbnail`）后再支持
- 搜索范围是整个索引库，尚未接入主程序的 source_id / 日期 / 过滤器体系

## 接入正式版的路线

1. 主程序提供插件 API：读取照片列表、缩略图缓存、marks/分类信息
2. 索引键从绝对路径改为 (source_id, item_key)，与 `source_marks` 口径一致
3. 编码输入改用缩略图缓存（420px JPEG，含 RAW 预览），加速索引并覆盖 RAW
4. `search_photos` 增加语义通道：关键词命中之外合并语义结果，
   标记 `search_match: "语义匹配"`
5. 前端搜索框直接复用，无需大改

## 打包分发（无 Python 机器）

本机 `python` 直跑无需额外操作；给无环境机器发 `exe` 时，插件依赖走**外置 `_libs` 直拷**，分享即 `zip` 解压到 `plugins/`：

1. **本机生成 `_libs`**（`exe` 内嵌的 `Python 3.13.5` 对应 `cp313-win_amd64`）：
   ```bat
   pip install --target=plugins/semantic_search/_libs -r plugins/semantic_search/requirements.txt
   :: 按需选 cpu 版（~200MB）或 cu128 版（~2GB）
   ```
2. **插件自注入**：`plugins/semantic_search/__init__.py` 启动时若 `_libs/` 存在则 `sys.path.insert(0, _libs)`，否则回退本机 `site-packages`，不影响当前开发
3. **打 zip**：将 `plugins/semantic_search/` 整个（含 `_libs/`、`model/`、`vector_core/`）打成 `semantic_search.zip`，接收方解压到 `PicScanner/plugins/`
4. **主 exe 不捆 `torch`**：`PyInstaller` 正常打 `PicScanner.exe`（`_internal/` 自带解释器），插件在该解释器内 `import torch` 时优先命中 `_libs`，缺 `_libs` 时 `Terminal` 提示 `向量依赖缺失` 并降级，不阻断主程序

## 相关文档

- [OPTIMIZATION.md](OPTIMIZATION.md) —— 检索精度分析与优化阶梯（查询模板扩展、
  温度归一化、升级 L/14、评测集）
- [API_INTEGRATION.md](API_INTEGRATION.md) —— 与主程序的接口设计
  （只读直连 → 宿主 API → 模块化三阶段）
- [ARCHITECTURE.md](ARCHITECTURE.md) —— 接入架构：插件声明式 UI 贡献（左上角按钮
  不写死本体）+ 多向量库/可追溯向量的 vector_core 三层设计
