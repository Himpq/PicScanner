// P5-3 切片 3 · QuickEdit 像素基元 —— HSL 混色器与分离色调（纯函数，无 DOM）
// 函数体自 app.js 原样搬入；色彩转换基元来自 ./color.js。

import {
  clamp,
  quickEditClampByte,
  quickEditHslToRgb,
  quickEditHslToPackedRgb,
} from './color.js';

// 八色 HSL 混色器色相中心（主线程与 Worker 共享）
export const QUICK_EDIT_HSL_COLORS = [
  { key: 'red', hue: 0 },
  { key: 'orange', hue: 30 },
  { key: 'yellow', hue: 60 },
  { key: 'green', hue: 120 },
  { key: 'aqua', hue: 180 },
  { key: 'blue', hue: 230 },
  { key: 'purple', hue: 275 },
  { key: 'magenta', hue: 320 },
];

export function quickEditHueDistance(a, b) {
  const diff = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return diff;
}

export function quickEditHslBandWeight(hue, center) {
  return clamp(1 - quickEditHueDistance(hue, center) / 42, 0, 1);
}

export function quickEditActiveHslAdjustments(params) {
  const active = [];
  QUICK_EDIT_HSL_COLORS.forEach((color) => {
    const hue = Number(params['hsl_' + color.key + '_hue'] || 0);
    const saturation = Number(params['hsl_' + color.key + '_saturation'] || 0);
    const luminance = Number(params['hsl_' + color.key + '_luminance'] || 0);
    if (!hue && !saturation && !luminance) return;
    active.push({
      hueCenter: color.hue,
      hueShift: hue,
      saturationShift: saturation / 100,
      luminanceShift: luminance / 100,
    });
  });
  return active;
}

export function quickEditApplyHslMixer(r, g, b, adjustments) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  let hueShift = 0;
  let saturationShift = 0;
  let luminanceShift = 0;
  for (let index = 0; index < adjustments.length; index += 1) {
    const adjustment = adjustments[index];
    const weight = quickEditHslBandWeight(h, adjustment.hueCenter);
    if (!weight) continue;
    hueShift += adjustment.hueShift * weight;
    saturationShift += adjustment.saturationShift * weight;
    luminanceShift += adjustment.luminanceShift * weight;
  }
  if (!hueShift && !saturationShift && !luminanceShift) return r | (g << 8) | (b << 16);
  return quickEditHslToPackedRgb(
    h + hueShift,
    clamp(s * (1 + saturationShift), 0, 1),
    clamp(l + luminanceShift * 0.5, 0, 1),
  );
}

export function quickEditSplitToneActive(params) {
  return !!(
    Number(params.splitToneShadowsStrength || 0)
    || Number(params.splitToneMidtonesStrength || 0)
    || Number(params.splitToneHighlightsStrength || 0)
  );
}

export function quickEditSplitToneWeight(value, center, width) {
  const distance = Math.abs(Number(value || 0) - Number(center || 0));
  const raw = clamp(1 - distance / Math.max(0.0001, Number(width || 1)), 0, 1);
  return raw * raw * (3 - 2 * raw);
}

export function quickEditSplitToneColor(hue) {
  return quickEditHslToRgb(hue, 0.72, 0.5);
}

export function quickEditBlendSplitToneChannel(value, toneValue, weight) {
  return quickEditClampByte(Number(value || 0) + (Number(toneValue || 0) - Number(value || 0)) * weight);
}

export function quickEditApplySplitTone(r, g, b, clean) {
  const luminance = clamp((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, 0, 1);
  const balance = clamp(Number(clean.splitToneBalance || 0) / 100, -1, 1);
  const shadowCenter = 0.24 + balance * 0.16;
  const highlightCenter = 0.76 + balance * 0.16;
  const midCenter = 0.5 + balance * 0.08;
  const shadowWeight = quickEditSplitToneWeight(luminance, shadowCenter, 0.46) * clamp(Number(clean.splitToneShadowsStrength || 0) / 100, 0, 1);
  const midtoneWeight = quickEditSplitToneWeight(luminance, midCenter, 0.38) * clamp(Number(clean.splitToneMidtonesStrength || 0) / 100, 0, 1);
  const highlightWeight = quickEditSplitToneWeight(luminance, highlightCenter, 0.46) * clamp(Number(clean.splitToneHighlightsStrength || 0) / 100, 0, 1);
  const totalWeight = shadowWeight + midtoneWeight + highlightWeight;
  if (totalWeight <= 0.0001) return r | (g << 8) | (b << 16);
  const shadowColor = quickEditSplitToneColor(clean.splitToneShadowsHue);
  const midtoneColor = quickEditSplitToneColor(clean.splitToneMidtonesHue);
  const highlightColor = quickEditSplitToneColor(clean.splitToneHighlightsHue);
  const strength = clamp(totalWeight * 0.42, 0, 0.72);
  const toneR = (shadowColor.r * shadowWeight + midtoneColor.r * midtoneWeight + highlightColor.r * highlightWeight) / totalWeight;
  const toneG = (shadowColor.g * shadowWeight + midtoneColor.g * midtoneWeight + highlightColor.g * highlightWeight) / totalWeight;
  const toneB = (shadowColor.b * shadowWeight + midtoneColor.b * midtoneWeight + highlightColor.b * highlightWeight) / totalWeight;
  return quickEditBlendSplitToneChannel(r, toneR, strength)
    | (quickEditBlendSplitToneChannel(g, toneG, strength) << 8)
    | (quickEditBlendSplitToneChannel(b, toneB, strength) << 16);
}
