// P5-3 · QuickEdit 像素基元 —— 色彩转换（纯函数，无 DOM）
//
// 本模块是 app.js 与 quick-edit-worker 的共享真源（切片 2 收敛 worker 拷贝）。
// 函数体自 app.js 原样搬入，行为不变；quickEditClampByte/clamp 一并随迁。

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function quickEditClampByte(value) {
  return clamp(Math.round(Number(value || 0)), 0, 255);
}

function quickEditRgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function quickEditHueToRgb(p, q, t) {
  let next = t;
  if (next < 0) next += 1;
  if (next > 1) next -= 1;
  if (next < 1 / 6) return p + (q - p) * 6 * next;
  if (next < 1 / 2) return q;
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
  return p;
}

function quickEditHslToRgb(h, s, l) {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s <= 0) {
    const gray = quickEditClampByte(l * 255);
    return { r: gray, g: gray, b: gray };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: quickEditClampByte(quickEditHueToRgb(p, q, hue + 1 / 3) * 255),
    g: quickEditClampByte(quickEditHueToRgb(p, q, hue) * 255),
    b: quickEditClampByte(quickEditHueToRgb(p, q, hue - 1 / 3) * 255),
  };
}

function quickEditHslToPackedRgb(h, s, l) {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s <= 0) {
    const gray = quickEditClampByte(l * 255);
    return gray | (gray << 8) | (gray << 16);
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return quickEditClampByte(quickEditHueToRgb(p, q, hue + 1 / 3) * 255)
    | (quickEditClampByte(quickEditHueToRgb(p, q, hue) * 255) << 8)
    | (quickEditClampByte(quickEditHueToRgb(p, q, hue - 1 / 3) * 255) << 16);
}

function quickEditSmoothStep(edge0, edge1, value) {
  const t = clamp((Number(value || 0) - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function quickEditLuma(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export {
  clamp,
  quickEditClampByte,
  quickEditRgbToHsl,
  quickEditHueToRgb,
  quickEditHslToRgb,
  quickEditHslToPackedRgb,
  quickEditSmoothStep,
  quickEditLuma,
};
