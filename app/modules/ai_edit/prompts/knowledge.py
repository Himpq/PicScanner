"""修图领域知识：供系统提示词注入，帮助模型做出专业决策。"""

from __future__ import annotations

# ─── 核心修图知识 ────────────────────────────────────────────────

EDITING_KNOWLEDGE = """\
### 影调
- 曝光(exposure)：全局亮度偏移，单位 EV。+1EV = 亮度翻倍。风景通常 0±0.5，人像可 +0.3~0.7 提亮肤色。
- 对比度(contrast)：全局 S 曲线强度。正值增加反差（亮更亮暗更暗），负值扁平化。
- 高光(highlights)：负值恢复过曝高光细节（如天空），正值进一步提亮。
- 阴影(shadows)：正值提亮暗部（如背光人像面部），负值加深阴影增加戏剧感。
- 白色(whites)：设定白场裁切点。正值扩展动态范围让最亮处更白，负值压缩高光。
- 黑色(blacks)：设定黑场。负值让最暗处更黑（增加通透感），正值提亮暗部（褪色/胶片感）。

### 色彩
- 色温(temperature)：低值(2000-4500K)偏冷蓝，高值(7000-10000K)偏暖黄。日光约 5500K，阴天 6500-7500K，钨丝灯 3200K。
- 色调(tint)：负值偏绿，正值偏品红。常用于校正荧光灯偏绿。
- 饱和度(saturation)：全局等比提升/降低所有颜色鲜艳度。过度使用导致色彩溢出。
- 自然度(vibrance)：智能饱和度——优先提升低饱和区域，已饱和区域几乎不变。人像首选。
- HSL：按色相范围精细调整。常见用法：橙色提亮肤色(luminance+)、蓝色压暗天空(luminance-)、绿色偏青(aqua hue+)。

### 曲线
- S 曲线（中间调上方点上提、下方点下压）= 增加对比度但保持黑白场
- 提亮中间调：在 x=50 处设 y>50
- 褪色/胶片感：将左下角 (0,0) 提至 (0,10~20)，黑场变灰
- 高光柔化：将右上角 (100,100) 降至 (100,90~95)

### 细节
- 锐化(sharpening)：增强边缘对比。风景 30-60，人像 10-25（过高显脏）。
- 清晰度(clarity)：中频局部对比。正值增加质感/硬朗（建筑、街拍），负值柔化（人像磨皮感）。
- 去雾(dehaze)：正值穿透雾霾/增加通透，负值制造朦胧/柔光。
- 颗粒(grain)：模拟胶片质感。10-30 微妙，50+ 明显。

### 效果
- 暗角(vignette)：负值压暗四角引导视线到中心。人像 -20~-40，风景 -10~-25。
- 分离色调(split tone)：为不同亮度区域着色。经典：阴影偏青蓝(210°)、高光偏暖黄(45°)。
- 黑白(blackWhite)：100=完全去色。配合 HSL luminance 可模拟彩色滤镜效果（已去色时 HSL 无效，需 beforehand 调整）。

### 联动原则
- 提曝光 → 考虑降高光防溢出
- 加对比度 → 可能需要提阴影保留暗部细节
- 降色温(偏蓝) → 适当加饱和度补偿视觉变淡
- 加重清晰度 → 锐化可适当降低避免双重边缘
- 黑白转换 → 之前用 HSL luminance 控制各通道灰度混合"""


# ─── 风格预设参考 ────────────────────────────────────────────────

STYLE_PRESETS = """\
以下为常见风格的参数起点（非固定公式，需根据原片调整）：

### 日系清新
exposure +0.5, contrast -15, highlights -20, shadows +30, saturation -10, vibrance +15, temperature 6800, grain 10, vignette -10

### 电影感/青橙
splitToneShadowsHue 210, splitToneShadowsStrength 35, splitToneHighlightsHue 40, splitToneHighlightsStrength 25, contrast +20, saturation -15, vignette -30, grain 20

### 高对比黑白
blackWhite 100, contrast +40, clarity +30, sharpening 50, vignette -35, grain 15

### 胶片/褪色
curvePoints 左下角提至 (0,15), contrast -10, saturation -20, temperature 7000, grain 35, vignette -20, splitToneShadowsHue 45, splitToneShadowsStrength 15

### 风光通透
dehaze +30, clarity +20, vibrance +25, highlights -40, shadows +20, whites +10, blacks -15, sharpening 45

### 人像柔光
clarity -20, sharpening 15, exposure +0.3, highlights -30, shadows +25, vibrance +10, temperature 6700, vignette -15"""
