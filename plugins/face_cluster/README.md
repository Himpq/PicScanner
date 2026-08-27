# 人脸聚类插件（试跑版）

`YuNet(0.3MB) + SFace(2.5MB)`，128维，CPU 50-100脸/s，复用 `semantic_search` 的 `vector_core`（`face-identity` 索引）。

## 模型下载
```bash
python plugins/face_cluster/download_models.py
# 或手动把 yunet/sface 的 onnx 放到 data/plugins/face_cluster/model/
pip install --target=plugins/face_cluster/_libs -r plugins/face_cluster/requirements.txt
```

未下载/未装 `opencv-contrib-python` 时自动回退到 `dummy` 链路：整图当一张脸+哈希向量，保证 UI/DB 流程可先跑通。

## 索引
EXIF下方 `人脸聚类` 块 -> `扫描人脸`，后台增量（`mtime:size` + face_index）写入 `data/plugins/face_cluster/index.db`。
