// P5-3 切片 3 · QuickEdit 像素基元 —— 色调/对比/去雾/高光阴影/自然饱和度/
// 黑白混色/晕影/锐化/清晰度/颗粒（纯函数，无 DOM）。函数体自 app.js 原样搬入。

import {
  clamp,
  quickEditClampByte,
  quickEditLuma,
  quickEditSmoothStep,
  quickEditRgbToHsl,
  quickEditHslToPackedRgb,
} from './color.js';
import { quickEditHueDistance } from './hsl.js';

export function quickEditToneChannel(value, amount, weight) {
  const strength = clamp(Number(amount || 0) / 100, -1, 1) * clamp(Number(weight || 0), 0, 1);
  if (!strength) return value;
  return strength > 0
    ? value + (255 - value) * strength * 0.72
    : value + value * strength * 0.72;
}

export function quickEditApplyContrastChannel(value, contrast) {
  const amount = clamp(Number(contrast || 0) / 100, -1, 1);
  if (!amount) return value;
  const factor = amount > 0 ? 1 + amount * 1.45 : 1 + amount * 0.82;
  return quickEditClampByte((value - 128) * factor + 128);
}

export function quickEditApplyContrast(r, g, b, contrast) {
  if (!contrast) return r | (g << 8) | (b << 16);
  return quickEditApplyContrastChannel(r, contrast)
    | (quickEditApplyContrastChannel(g, contrast) << 8)
    | (quickEditApplyContrastChannel(b, contrast) << 16);
}

export function quickEditApplyWhiteBlackLevels(r, g, b, whites, blacks) {
  const whiteAmount = Number(whites || 0);
  const blackAmount = Number(blacks || 0);
  if (!whiteAmount && !blackAmount) return r | (g << 8) | (b << 16);
  const luma = quickEditLuma(r, g, b);
  const whiteWeight = quickEditSmoothStep(0.58, 0.96, luma);
  const blackWeight = 1 - quickEditSmoothStep(0.04, 0.42, luma);
  const nextR = quickEditToneChannel(quickEditToneChannel(r, blackAmount, blackWeight), whiteAmount, whiteWeight);
  const nextG = quickEditToneChannel(quickEditToneChannel(g, blackAmount, blackWeight), whiteAmount, whiteWeight);
  const nextB = quickEditToneChannel(quickEditToneChannel(b, blackAmount, blackWeight), whiteAmount, whiteWeight);
  return quickEditClampByte(nextR) | (quickEditClampByte(nextG) << 8) | (quickEditClampByte(nextB) << 16);
}

export function quickEditApplyDehaze(r, g, b, dehaze) {
  const amount = clamp(Number(dehaze || 0) / 100, -1, 1);
  if (!amount) return r | (g << 8) | (b << 16);
  const luma = quickEditLuma(r, g, b);
  const gray = luma * 255;
  if (amount > 0) {
    const darkChannel = Math.min(r, g, b) / 255;
    const hazeWeight = quickEditSmoothStep(0.18, 0.92, luma) * (1 - darkChannel * 0.48);
    const contrastFactor = 1 + amount * (0.52 + hazeWeight * 0.78);
    const saturationFactor = 1 + amount * (0.10 + hazeWeight * 0.24);
    const density = amount * hazeWeight * 18;
    const nextR = (gray + (((r - 128) * contrastFactor + 128 - density) - gray) * saturationFactor);
    const nextG = (gray + (((g - 128) * contrastFactor + 128 - density) - gray) * saturationFactor);
    const nextB = (gray + (((b - 128) * contrastFactor + 128 - density) - gray) * saturationFactor);
    return quickEditClampByte(nextR) | (quickEditClampByte(nextG) << 8) | (quickEditClampByte(nextB) << 16);
  }
  const haze = -amount;
  const contrastFactor = 1 - haze * 0.42;
  const saturationFactor = 1 - haze * 0.28;
  const veil = haze * (0.12 + quickEditSmoothStep(0.18, 0.94, luma) * 0.16);
  const nextR = gray + (((r - 128) * contrastFactor + 128) - gray) * saturationFactor;
  const nextG = gray + (((g - 128) * contrastFactor + 128) - gray) * saturationFactor;
  const nextB = gray + (((b - 128) * contrastFactor + 128) - gray) * saturationFactor;
  const veilColor = 224;
  return quickEditClampByte(nextR + (veilColor - nextR) * veil)
    | (quickEditClampByte(nextG + (veilColor - nextG) * veil) << 8)
    | (quickEditClampByte(nextB + (veilColor - nextB) * veil) << 16);
}

export function quickEditApplyHighlightShadow(r, g, b, highlights, shadows) {
  const highlightAmount = Number(highlights || 0);
  const shadowAmount = Number(shadows || 0);
  if (!highlightAmount && !shadowAmount) return r | (g << 8) | (b << 16);
  const luma = quickEditLuma(r, g, b);
  const highlightWeight = quickEditSmoothStep(0.48, 0.96, luma);
  const shadowWeight = 1 - quickEditSmoothStep(0.04, 0.52, luma);
  const nextR = quickEditToneChannel(quickEditToneChannel(r, shadowAmount, shadowWeight), highlightAmount, highlightWeight);
  const nextG = quickEditToneChannel(quickEditToneChannel(g, shadowAmount, shadowWeight), highlightAmount, highlightWeight);
  const nextB = quickEditToneChannel(quickEditToneChannel(b, shadowAmount, shadowWeight), highlightAmount, highlightWeight);
  return quickEditClampByte(nextR) | (quickEditClampByte(nextG) << 8) | (quickEditClampByte(nextB) << 16);
}

export function quickEditApplyVibrance(r, g, b, vibrance) {
  const amount = clamp(Number(vibrance || 0) / 100, -1, 1);
  if (!amount) return r | (g << 8) | (b << 16);
  const hsl = quickEditRgbToHsl(r, g, b);
  const protect = 1 - hsl.s;
  const factor = amount > 0
    ? 1 + amount * (0.35 + protect * 0.85)
    : 1 + amount * (0.72 + hsl.s * 0.28);
  const packed = quickEditHslToPackedRgb(hsl.h, clamp(hsl.s * factor, 0, 1), hsl.l);
  return packed;
}

export function quickEditBwWeightForHue(hue, center, width) {
  const distance = quickEditHueDistance(hue, center);
  return clamp(1 - distance / Math.max(1, Number(width || 1)), 0, 1);
}

export function quickEditApplyBlackWhiteMixer(r, g, b, clean) {
  const amount = clamp(Number(clean.blackWhite || 0) / 100, 0, 1);
  if (!amount) return r | (g << 8) | (b << 16);
  const hsl = quickEditRgbToHsl(r, g, b);
  const weights = [
    quickEditBwWeightForHue(hsl.h, 0, 42) * Number(clean.bwRed || 0),
    quickEditBwWeightForHue(hsl.h, 60, 48) * Number(clean.bwYellow || 0),
    quickEditBwWeightForHue(hsl.h, 120, 54) * Number(clean.bwGreen || 0),
    quickEditBwWeightForHue(hsl.h, 180, 48) * Number(clean.bwAqua || 0),
    quickEditBwWeightForHue(hsl.h, 230, 54) * Number(clean.bwBlue || 0),
    quickEditBwWeightForHue(hsl.h, 310, 54) * Number(clean.bwMagenta || 0),
  ];
  const mixAdjust = weights.reduce((sum, value) => sum + value, 0) / 100;
  const luma = clamp((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 + mixAdjust * 0.32, 0, 1);
  const gray = quickEditClampByte(luma * 255);
  return quickEditClampByte(r + (gray - r) * amount)
    | (quickEditClampByte(g + (gray - g) * amount) << 8)
    | (quickEditClampByte(b + (gray - b) * amount) << 16);
}

export function quickEditApplyVignette(pixels, width, height, clean) {
  const amount = clamp(Number(clean.vignette || 0) / 100, -1, 1);
  const w = Math.max(1, Math.round(Number(width || 0)));
  const h = Math.max(1, Math.round(Number(height || 0)));
  if (!amount || w < 2 || h < 2 || pixels.length < w * h * 4) return;
  const feather = clamp(Number(clean.vignetteFeather === undefined ? 58 : clean.vignetteFeather) / 100, 0, 1);
  const inner = 0.18 + feather * 0.34;
  const outer = 0.92 + feather * 0.18;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const invX = 1 / Math.max(1, cx);
  const invY = 1 / Math.max(1, cy);
  for (let y = 0; y < h; y += 1) {
    const ny = (y - cy) * invY;
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (!pixels[i + 3]) continue;
      const nx = (x - cx) * invX;
      const distance = Math.sqrt(nx * nx + ny * ny);
      const raw = clamp((distance - inner) / Math.max(0.0001, outer - inner), 0, 1);
      const weight = raw * raw * (3 - 2 * raw);
      const factor = amount > 0 ? 1 - weight * amount * 0.72 : 1 + weight * (-amount) * 0.48;
      pixels[i] = quickEditClampByte(pixels[i] * factor);
      pixels[i + 1] = quickEditClampByte(pixels[i + 1] * factor);
      pixels[i + 2] = quickEditClampByte(pixels[i + 2] * factor);
    }
  }
}

export function applyQuickEditSharpening(pixels, width, height, sharpening, onProgress) {
  const amount = clamp(Number(sharpening || 0), 0, 100) / 100;
  const w = Math.max(1, Math.round(Number(width || 0)));
  const h = Math.max(1, Math.round(Number(height || 0)));
  const reportProgress = typeof onProgress === 'function' ? onProgress : null;
  if (!amount || w < 3 || h < 3 || pixels.length < w * h * 4) {
    if (reportProgress) reportProgress(1);
    return;
  }
  const source = new Uint8ClampedArray(pixels);
  const row = w * 4;
  const strength = amount * 1.25;
  const threshold = 1 + amount * 3;
  for (let y = 1; y < h - 1; y += 1) {
    if (reportProgress && y % 16 === 0) reportProgress(clamp(y / Math.max(1, h - 2), 0, 1));
    let offset = y * row + 4;
    for (let x = 1; x < w - 1; x += 1, offset += 4) {
      if (!source[offset + 3]) continue;
      for (let channel = 0; channel < 3; channel += 1) {
        const index = offset + channel;
        const center = source[index];
        const blur = (
          source[index] * 2
          + source[index - 4]
          + source[index + 4]
          + source[index - row]
          + source[index + row]
        ) / 6;
        const delta = center - blur;
        if (Math.abs(delta) < threshold) continue;
        pixels[index] = quickEditClampByte(center + delta * strength);
      }
    }
  }
  if (reportProgress) reportProgress(1);
}

export function applyQuickEditClarity(pixels, width, height, clarity, onProgress) {
  const amount = clamp(Number(clarity || 0), -100, 100) / 100;
  const w = Math.max(1, Math.round(Number(width || 0)));
  const h = Math.max(1, Math.round(Number(height || 0)));
  const reportProgress = typeof onProgress === 'function' ? onProgress : null;
  if (!amount || w < 3 || h < 3 || pixels.length < w * h * 4) {
    if (reportProgress) reportProgress(1);
    return;
  }
  const source = new Uint8ClampedArray(pixels);
  const row = w * 4;
  const strength = amount * 0.92;
  const threshold = amount > 0 ? 1.5 : 0;
  for (let y = 1; y < h - 1; y += 1) {
    if (reportProgress && y % 16 === 0) reportProgress(clamp(y / Math.max(1, h - 2), 0, 1));
    let offset = y * row + 4;
    for (let x = 1; x < w - 1; x += 1, offset += 4) {
      if (!source[offset + 3]) continue;
      const luma = quickEditLuma(source[offset], source[offset + 1], source[offset + 2]);
      const midtoneWeight = clamp(1 - Math.abs(luma - 0.5) * 1.65, 0, 1);
      if (!midtoneWeight) continue;
      for (let channel = 0; channel < 3; channel += 1) {
        const index = offset + channel;
        const center = source[index];
        const blur = (
          center * 4
          + source[index - 4] * 2
          + source[index + 4] * 2
          + source[index - row] * 2
          + source[index + row] * 2
          + source[index - row - 4]
          + source[index - row + 4]
          + source[index + row - 4]
          + source[index + row + 4]
        ) / 16;
        const delta = center - blur;
        if (Math.abs(delta) < threshold) continue;
        pixels[index] = quickEditClampByte(center + delta * strength * midtoneWeight);
      }
    }
  }
  if (reportProgress) reportProgress(1);
}

export function quickEditGrainNoise(x, y, seed) {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(seed + 1, 224682251);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (((value ^ (value >>> 16)) >>> 0) / 2147483647.5) - 1;
}

export function applyQuickEditGrain(pixels, width, height, grain, onProgress) {
  const amount = clamp(Number(grain || 0), 0, 100) / 100;
  const w = Math.max(1, Math.round(Number(width || 0)));
  const h = Math.max(1, Math.round(Number(height || 0)));
  const reportProgress = typeof onProgress === 'function' ? onProgress : null;
  if (!amount || w < 1 || h < 1 || pixels.length < w * h * 4) {
    if (reportProgress) reportProgress(1);
    return;
  }
  const strength = amount * 28;
  const seed = Math.round(amount * 997);
  for (let y = 0; y < h; y += 1) {
    if (reportProgress && y % 16 === 0) reportProgress(clamp(y / Math.max(1, h - 1), 0, 1));
    let offset = y * w * 4;
    for (let x = 0; x < w; x += 1, offset += 4) {
      if (!pixels[offset + 3]) continue;
      const luma = quickEditLuma(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      const midtoneWeight = 0.36 + clamp(1 - Math.abs(luma - 0.5) * 2, 0, 1) * 0.64;
      const noise = quickEditGrainNoise(x, y, seed) * strength * midtoneWeight;
      pixels[offset] = quickEditClampByte(pixels[offset] + noise);
      pixels[offset + 1] = quickEditClampByte(pixels[offset + 1] + noise);
      pixels[offset + 2] = quickEditClampByte(pixels[offset + 2] + noise);
    }
  }
  if (reportProgress) reportProgress(1);
}

export function quickEditDetailEffectCount(clean) {
  return (clean.clarity ? 1 : 0) + (clean.sharpening ? 1 : 0) + (clean.grain ? 1 : 0);
}

export function applyQuickEditDetailEffects(pixels, width, height, clean, onProgress) {
  const total = quickEditDetailEffectCount(clean);
  const reportProgress = typeof onProgress === 'function' ? onProgress : null;
  if (!total) {
    if (reportProgress) reportProgress(1);
    return;
  }
  let index = 0;
  function reportStep(ratio) {
    if (!reportProgress) return;
    reportProgress(clamp((index + clamp(Number(ratio || 0), 0, 1)) / total, 0, 1));
  }
  if (clean.clarity) {
    applyQuickEditClarity(pixels, width, height, clean.clarity, reportProgress ? reportStep : null);
    index += 1;
  }
  if (clean.sharpening) {
    applyQuickEditSharpening(pixels, width, height, clean.sharpening, reportProgress ? reportStep : null);
    index += 1;
  }
  if (clean.grain) {
    applyQuickEditGrain(pixels, width, height, clean.grain, reportProgress ? reportStep : null);
    index += 1;
  }
  if (reportProgress) reportProgress(1);
}
