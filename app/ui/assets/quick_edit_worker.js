function quickEditWorkerMain() {
  'use strict';

  const QUICK_EDIT_TEMPERATURE_MIN_K = 2000;
  const QUICK_EDIT_TEMPERATURE_NEUTRAL_K = 6500;
  const QUICK_EDIT_TEMPERATURE_MAX_K = 10000;
  const QUICK_EDIT_TEMPERATURE_STEP_K = 50;
  const QUICK_EDIT_EXPOSURE_MIN_EV = -5;
  const QUICK_EDIT_EXPOSURE_MAX_EV = 5;
  const QUICK_EDIT_DEFAULT_CURVE_POINTS = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ];
  const QUICK_EDIT_HSL_COLORS = [
    { key: 'red', hue: 0 },
    { key: 'orange', hue: 30 },
    { key: 'yellow', hue: 60 },
    { key: 'green', hue: 120 },
    { key: 'aqua', hue: 180 },
    { key: 'blue', hue: 230 },
    { key: 'purple', hue: 275 },
    { key: 'magenta', hue: 320 },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function quickEditClampByte(value) {
    return clamp(Math.round(Number(value || 0)), 0, 255);
  }

  function quickEditPerfNow() {
    return self.performance && typeof self.performance.now === 'function'
      ? self.performance.now()
      : Date.now();
  }

  function quickEditRoundTemperatureK(value) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return QUICK_EDIT_TEMPERATURE_NEUTRAL_K;
    const clamped = clamp(raw, QUICK_EDIT_TEMPERATURE_MIN_K, QUICK_EDIT_TEMPERATURE_MAX_K);
    return Math.round(clamped / QUICK_EDIT_TEMPERATURE_STEP_K) * QUICK_EDIT_TEMPERATURE_STEP_K;
  }

  function normalizeQuickEditTemperature(value) {
    if (value === null || value === undefined || value === '') return QUICK_EDIT_TEMPERATURE_NEUTRAL_K;
    const number = Number(value);
    if (!Number.isFinite(number)) return QUICK_EDIT_TEMPERATURE_NEUTRAL_K;
    return quickEditRoundTemperatureK(number);
  }

  function normalizeQuickEditCurvePoints(points) {
    const source = Array.isArray(points) && points.length >= 2 ? points : QUICK_EDIT_DEFAULT_CURVE_POINTS;
    const clean = [];
    source.forEach((point) => {
      const x = Number(point && point.x);
      const y = Number(point && point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      clean.push({ x: clamp(x, 0, 100), y: clamp(y, 0, 100) });
    });
    clean.sort((a, b) => a.x - b.x);
    const merged = [];
    clean.forEach((point) => {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.x - point.x) < 0.5) {
        last.x = point.x;
        last.y = point.y;
      } else {
        merged.push(Object.assign({}, point));
      }
    });
    const first = merged[0] || { x: 0, y: 0 };
    const last = merged[merged.length - 1] || { x: 100, y: 100 };
    const interior = merged
      .filter((point) => point.x > 0.5 && point.x < 99.5)
      .map((point) => ({ x: clamp(point.x, 1, 99), y: clamp(point.y, 0, 100) }));
    return [
      { x: 0, y: clamp(first.x <= 0.5 ? first.y : 0, 0, 100) },
      ...interior,
      { x: 100, y: clamp(last.x >= 99.5 ? last.y : 100, 0, 100) },
    ];
  }

  function normalizeQuickEditLutEntries(raw) {
    return (Array.isArray(raw.luts) ? raw.luts : [])
      .map((lut) => {
        if (!lut || typeof lut !== 'object') return null;
        return {
          size: Math.max(0, Math.floor(Number(lut.size || 0))),
          strength: clamp(Number(lut.strength === undefined ? 100 : lut.strength), 0, 100),
          domainMin: Array.isArray(lut.domainMin) ? lut.domainMin.slice(0, 3) : [0, 0, 0],
          domainMax: Array.isArray(lut.domainMax) ? lut.domainMax.slice(0, 3) : [1, 1, 1],
          data: lut.data || null,
        };
      })
      .filter((lut) => lut && lut.size && lut.data && lut.strength > 0);
  }

  function normalizeQuickEditParams(input) {
    const raw = input || {};
    const clean = {
      exposure: clamp(Number(raw.exposure || 0), QUICK_EDIT_EXPOSURE_MIN_EV, QUICK_EDIT_EXPOSURE_MAX_EV),
      contrast: clamp(Number(raw.contrast || 0), -100, 100),
      highlights: clamp(Number(raw.highlights || 0), -100, 100),
      shadows: clamp(Number(raw.shadows || 0), -100, 100),
      whites: clamp(Number(raw.whites || 0), -100, 100),
      blacks: clamp(Number(raw.blacks || 0), -100, 100),
      dehaze: clamp(Number(raw.dehaze || 0), -100, 100),
      saturation: clamp(Number(raw.saturation || 0), -100, 100),
      vibrance: clamp(Number(raw.vibrance || 0), -100, 100),
      sharpening: clamp(Number(raw.sharpening || 0), 0, 100),
      clarity: clamp(Number(raw.clarity || 0), -100, 100),
      grain: clamp(Number(raw.grain || 0), 0, 100),
      vignette: clamp(Number(raw.vignette || 0), -100, 100),
      vignetteFeather: clamp(Number(raw.vignetteFeather === undefined ? 58 : raw.vignetteFeather), 0, 100),
      blackWhite: clamp(Number(raw.blackWhite || 0), 0, 100),
      bwRed: clamp(Number(raw.bwRed || 0), -100, 100),
      bwYellow: clamp(Number(raw.bwYellow || 0), -100, 100),
      bwGreen: clamp(Number(raw.bwGreen || 0), -100, 100),
      bwAqua: clamp(Number(raw.bwAqua || 0), -100, 100),
      bwBlue: clamp(Number(raw.bwBlue || 0), -100, 100),
      bwMagenta: clamp(Number(raw.bwMagenta || 0), -100, 100),
      temperature: normalizeQuickEditTemperature(raw.temperature),
      tint: clamp(Number(raw.tint || 0), -100, 100),
      splitToneShadowsHue: clamp(Number(raw.splitToneShadowsHue === undefined ? 220 : raw.splitToneShadowsHue), 0, 360),
      splitToneShadowsStrength: clamp(Number(raw.splitToneShadowsStrength || 0), 0, 100),
      splitToneMidtonesHue: clamp(Number(raw.splitToneMidtonesHue === undefined ? 35 : raw.splitToneMidtonesHue), 0, 360),
      splitToneMidtonesStrength: clamp(Number(raw.splitToneMidtonesStrength || 0), 0, 100),
      splitToneHighlightsHue: clamp(Number(raw.splitToneHighlightsHue === undefined ? 45 : raw.splitToneHighlightsHue), 0, 360),
      splitToneHighlightsStrength: clamp(Number(raw.splitToneHighlightsStrength || 0), 0, 100),
      splitToneBalance: clamp(Number(raw.splitToneBalance || 0), -100, 100),
      lutStrength: clamp(Number(raw.lutStrength === undefined ? 100 : raw.lutStrength), 0, 100),
      curvePoints: normalizeQuickEditCurvePoints(raw.curvePoints),
      luts: normalizeQuickEditLutEntries(raw),
    };
    QUICK_EDIT_HSL_COLORS.forEach((color) => {
      clean['hsl_' + color.key + '_hue'] = clamp(Number(raw['hsl_' + color.key + '_hue'] || 0), -60, 60);
      clean['hsl_' + color.key + '_saturation'] = clamp(Number(raw['hsl_' + color.key + '_saturation'] || 0), -100, 100);
      clean['hsl_' + color.key + '_luminance'] = clamp(Number(raw['hsl_' + color.key + '_luminance'] || 0), -100, 100);
    });
    return clean;
  }

  function quickEditTemperatureStrength(value) {
    const kelvin = normalizeQuickEditTemperature(value);
    if (kelvin >= QUICK_EDIT_TEMPERATURE_NEUTRAL_K) {
      return clamp(
        (kelvin - QUICK_EDIT_TEMPERATURE_NEUTRAL_K)
        / (QUICK_EDIT_TEMPERATURE_MAX_K - QUICK_EDIT_TEMPERATURE_NEUTRAL_K),
        0,
        1,
      );
    }
    return clamp(
      (kelvin - QUICK_EDIT_TEMPERATURE_NEUTRAL_K)
      / (QUICK_EDIT_TEMPERATURE_NEUTRAL_K - QUICK_EDIT_TEMPERATURE_MIN_K),
      -1,
      0,
    );
  }

  function quickEditCurvePoints(params) {
    return normalizeQuickEditParams(params).curvePoints.map((point) => Object.assign({}, point));
  }

  function isQuickEditCurveNeutral(params) {
    const points = quickEditCurvePoints(params);
    return points.length === 2
      && points[0].x === 0
      && points[0].y === 0
      && points[1].x === 100
      && points[1].y === 100;
  }

  function quickEditCurveOutput(params, input) {
    const points = quickEditCurvePoints(params);
    const x = clamp(Number(input || 0), 0, 1) * 100;
    let index = 0;
    while (index < points.length - 2 && x > points[index + 1].x) index += 1;
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[Math.min(points.length - 1, index + 1)];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const span = Math.max(0.0001, p2.x - p1.x);
    const t = clamp((x - p1.x) / span, 0, 1);
    const t2 = t * t;
    const t3 = t2 * t;
    const slope1 = (p2.y - p0.y) / Math.max(0.0001, p2.x - p0.x) * span;
    const slope2 = (p3.y - p1.y) / Math.max(0.0001, p3.x - p1.x) * span;
    const y = (2 * t3 - 3 * t2 + 1) * p1.y
      + (t3 - 2 * t2 + t) * slope1
      + (-2 * t3 + 3 * t2) * p2.y
      + (t3 - t2) * slope2;
    return clamp(y / 100, 0, 1);
  }

  function quickEditCurveMap(params) {
    const map = new Array(256);
    for (let i = 0; i < 256; i += 1) {
      map[i] = Math.round(quickEditCurveOutput(params, i / 255) * 255);
    }
    return map;
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

  function quickEditSplitToneActive(params) {
    return !!(
      Number(params.splitToneShadowsStrength || 0)
      || Number(params.splitToneMidtonesStrength || 0)
      || Number(params.splitToneHighlightsStrength || 0)
    );
  }

  function quickEditSplitToneWeight(value, center, width) {
    const distance = Math.abs(Number(value || 0) - Number(center || 0));
    const raw = clamp(1 - distance / Math.max(0.0001, Number(width || 1)), 0, 1);
    return raw * raw * (3 - 2 * raw);
  }

  function quickEditSplitToneColor(hue) {
    return quickEditHslToRgb(hue, 0.72, 0.5);
  }

  function quickEditBlendSplitToneChannel(value, toneValue, weight) {
    return quickEditClampByte(Number(value || 0) + (Number(toneValue || 0) - Number(value || 0)) * weight);
  }

  function quickEditApplySplitTone(r, g, b, clean) {
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

  function quickEditHueDistance(a, b) {
    return Math.abs((((a - b) % 360) + 540) % 360 - 180);
  }

  function quickEditHslBandWeight(hue, center) {
    return clamp(1 - quickEditHueDistance(hue, center) / 42, 0, 1);
  }

  function quickEditActiveHslAdjustments(params) {
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

  function quickEditApplyHslMixer(r, g, b, adjustments) {
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

  function hasQuickEditHslAdjustments(params) {
    return quickEditActiveHslAdjustments(normalizeQuickEditParams(params)).length > 0;
  }

  function quickEditActiveLuts(params) {
    const clean = normalizeQuickEditParams(params);
    return clean.luts
      .filter((lut) => lut && lut.data && lut.size && lut.strength > 0)
      .map((lut) => ({ lut: quickEditPrepareLut(lut), strength: lut.strength / 100 }));
  }

  function quickEditPrepareLut(lut) {
    const size = lut.size;
    const domainMin = lut.domainMin || [0, 0, 0];
    const domainMax = lut.domainMax || [1, 1, 1];
    const key = [
      size,
      Number(domainMin[0] || 0), Number(domainMin[1] || 0), Number(domainMin[2] || 0),
      Number(domainMax[0] || 1), Number(domainMax[1] || 1), Number(domainMax[2] || 1),
    ].join('|');
    if (lut._quickEditPrepared && lut._quickEditPrepared.key === key) return lut._quickEditPrepared;
    const buildAxis = (axis) => {
      const min = Number(domainMin[axis] || 0);
      const max = Number(domainMax[axis] || 1);
      const span = Math.max(0.000001, max - min);
      const low = new Uint16Array(256);
      const high = new Uint16Array(256);
      const mix = new Float32Array(256);
      for (let value = 0; value < 256; value += 1) {
        const mapped = clamp(((value / 255) - min) / span, 0, 1) * (size - 1);
        const base = Math.floor(mapped);
        low[value] = base;
        high[value] = Math.min(size - 1, base + 1);
        mix[value] = mapped - base;
      }
      return { low, high, mix };
    };
    const red = buildAxis(0);
    const green = buildAxis(1);
    const blue = buildAxis(2);
    lut._quickEditPrepared = {
      key,
      size,
      data: lut.data,
      r0: red.low,
      r1: red.high,
      rt: red.mix,
      g0: green.low,
      g1: green.high,
      gt: green.mix,
      b0: blue.low,
      b1: blue.high,
      bt: blue.mix,
    };
    return lut._quickEditPrepared;
  }

  function quickEditLerpLutChannel(data, i000, i001, i010, i011, i100, i101, i110, i111, channel, rt, gt, bt) {
    const c000 = data[i000 + channel] || 0;
    const c001 = data[i001 + channel] || 0;
    const c010 = data[i010 + channel] || 0;
    const c011 = data[i011 + channel] || 0;
    const c100 = data[i100 + channel] || 0;
    const c101 = data[i101 + channel] || 0;
    const c110 = data[i110 + channel] || 0;
    const c111 = data[i111 + channel] || 0;
    const c00 = c000 + (c100 - c000) * rt;
    const c01 = c001 + (c101 - c001) * rt;
    const c10 = c010 + (c110 - c010) * rt;
    const c11 = c011 + (c111 - c011) * rt;
    const c0 = c00 + (c10 - c00) * gt;
    const c1 = c01 + (c11 - c01) * gt;
    return c0 + (c1 - c0) * bt;
  }

  function quickEditApplyLut(r, g, b, lut) {
    const data = lut.data;
    const size = lut.size;
    const r0 = lut.r0[r];
    const g0 = lut.g0[g];
    const b0 = lut.b0[b];
    const r1 = lut.r1[r];
    const g1 = lut.g1[g];
    const b1 = lut.b1[b];
    const rt = lut.rt[r];
    const gt = lut.gt[g];
    const bt = lut.bt[b];
    const i000 = ((b0 * size + g0) * size + r0) * 3;
    const i001 = ((b1 * size + g0) * size + r0) * 3;
    const i010 = ((b0 * size + g1) * size + r0) * 3;
    const i011 = ((b1 * size + g1) * size + r0) * 3;
    const i100 = ((b0 * size + g0) * size + r1) * 3;
    const i101 = ((b1 * size + g0) * size + r1) * 3;
    const i110 = ((b0 * size + g1) * size + r1) * 3;
    const i111 = ((b1 * size + g1) * size + r1) * 3;
    const outR = quickEditClampByte(quickEditLerpLutChannel(data, i000, i001, i010, i011, i100, i101, i110, i111, 0, rt, gt, bt) * 255);
    const outG = quickEditClampByte(quickEditLerpLutChannel(data, i000, i001, i010, i011, i100, i101, i110, i111, 1, rt, gt, bt) * 255);
    const outB = quickEditClampByte(quickEditLerpLutChannel(data, i000, i001, i010, i011, i100, i101, i110, i111, 2, rt, gt, bt) * 255);
    return outR | (outG << 8) | (outB << 16);
  }

  function quickEditBlendLutColor(r, g, b, activeLuts) {
    if (!activeLuts || !activeLuts.length) return r | (g << 8) | (b << 16);
    let nextR = r;
    let nextG = g;
    let nextB = b;
    activeLuts.forEach((activeLut) => {
      const mapped = quickEditApplyLut(nextR, nextG, nextB, activeLut.lut);
      const strength = activeLut.strength;
      const mappedR = mapped & 255;
      const mappedG = (mapped >> 8) & 255;
      const mappedB = (mapped >> 16) & 255;
      nextR = quickEditClampByte(nextR + (mappedR - nextR) * strength);
      nextG = quickEditClampByte(nextG + (mappedG - nextG) * strength);
      nextB = quickEditClampByte(nextB + (mappedB - nextB) * strength);
    });
    return nextR | (nextG << 8) | (nextB << 16);
  }

  function quickEditSmoothStep(edge0, edge1, value) {
    const t = clamp((Number(value || 0) - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function quickEditToneChannel(value, amount, weight) {
    const strength = clamp(Number(amount || 0) / 100, -1, 1) * clamp(Number(weight || 0), 0, 1);
    if (!strength) return value;
    return strength > 0
      ? value + (255 - value) * strength * 0.72
      : value + value * strength * 0.72;
  }

  function quickEditLuma(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function quickEditApplyContrastChannel(value, contrast) {
    const amount = clamp(Number(contrast || 0) / 100, -1, 1);
    if (!amount) return value;
    const factor = amount > 0 ? 1 + amount * 1.45 : 1 + amount * 0.82;
    return quickEditClampByte((value - 128) * factor + 128);
  }

  function quickEditApplyContrast(r, g, b, contrast) {
    if (!contrast) return r | (g << 8) | (b << 16);
    return quickEditApplyContrastChannel(r, contrast)
      | (quickEditApplyContrastChannel(g, contrast) << 8)
      | (quickEditApplyContrastChannel(b, contrast) << 16);
  }

  function quickEditApplyWhiteBlackLevels(r, g, b, whites, blacks) {
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

  function quickEditApplyDehaze(r, g, b, dehaze) {
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

  function quickEditApplyHighlightShadow(r, g, b, highlights, shadows) {
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

  function quickEditApplyVibrance(r, g, b, vibrance) {
    const amount = clamp(Number(vibrance || 0) / 100, -1, 1);
    if (!amount) return r | (g << 8) | (b << 16);
    const hsl = quickEditRgbToHsl(r, g, b);
    const protect = 1 - hsl.s;
    const factor = amount > 0
      ? 1 + amount * (0.35 + protect * 0.85)
      : 1 + amount * (0.72 + hsl.s * 0.28);
    return quickEditHslToPackedRgb(hsl.h, clamp(hsl.s * factor, 0, 1), hsl.l);
  }

  function quickEditBwWeightForHue(hue, center, width) {
    const distance = quickEditHueDistance(hue, center);
    return clamp(1 - distance / Math.max(1, Number(width || 1)), 0, 1);
  }

  function quickEditApplyBlackWhiteMixer(r, g, b, clean) {
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

  function quickEditApplyVignette(pixels, width, height, clean) {
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

  function applyQuickEditSharpening(pixels, width, height, sharpening, onProgress) {
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

  function applyQuickEditClarity(pixels, width, height, clarity, onProgress) {
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

  function quickEditGrainNoise(x, y, seed) {
    let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(seed + 1, 224682251);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return (((value ^ (value >>> 16)) >>> 0) / 2147483647.5) - 1;
  }

  function applyQuickEditGrain(pixels, width, height, grain, onProgress) {
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

  function quickEditDetailEffectCount(clean) {
    return (clean.clarity ? 1 : 0) + (clean.sharpening ? 1 : 0) + (clean.grain ? 1 : 0);
  }

  function applyQuickEditDetailEffects(pixels, width, height, clean, onProgress) {
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

  function applyQuickEditPixelAdjustments(pixels, params, width, height, onProgress) {
    const clean = normalizeQuickEditParams(params);
    const reportProgress = typeof onProgress === 'function' ? onProgress : null;
    const detailEffectCount = quickEditDetailEffectCount(clean);
    const colorProgressEnd = detailEffectCount ? 0.72 : 1;
    const progressStep = reportProgress
      ? Math.max(262144, Math.floor(Math.max(1, pixels.length) / 40))
      : 0;
    let nextProgressByte = progressStep;
    function maybeReportProgress(offset) {
      if (!reportProgress || offset < nextProgressByte) return;
      nextProgressByte = offset + progressStep;
      reportProgress(clamp(offset / Math.max(1, pixels.length), 0, 1) * colorProgressEnd);
    }
    function reportDetailProgress(ratio) {
      if (!reportProgress) return;
      reportProgress(colorProgressEnd + clamp(Number(ratio || 0), 0, 1) * (1 - colorProgressEnd));
    }
    if (reportProgress) reportProgress(0);
    const brightness = Math.pow(2, clean.exposure);
    const globalSaturation = Math.max(0, 100 + clean.saturation) / 100;
    const contrast = clean.contrast;
    const highlights = clean.highlights;
    const shadows = clean.shadows;
    const whites = clean.whites;
    const blacks = clean.blacks;
    const dehaze = clean.dehaze;
    const vibrance = clean.vibrance;
    const blackWhiteActive = !!clean.blackWhite;
    const vignetteActive = !!clean.vignette;
    const temperature = quickEditTemperatureStrength(clean.temperature);
    const tint = clean.tint / 100;
    const redGain = 1 + temperature * 0.18 + Math.max(0, tint) * 0.08;
    const greenGain = 1 - Math.abs(temperature) * 0.035 - tint * 0.16;
    const blueGain = 1 - temperature * 0.18 + Math.max(0, tint) * 0.08;
    const curveNeutral = isQuickEditCurveNeutral(clean);
    const hslAdjustments = quickEditActiveHslAdjustments(clean);
    const hslActive = hslAdjustments.length > 0;
    const splitToneActive = quickEditSplitToneActive(clean);
    const useSaturationMatrix = Math.abs(globalSaturation - 1) > 0.0001;
    const useContrast = !!contrast;
    const useWhiteBlackLevels = !!(whites || blacks);
    const useDehaze = !!dehaze;
    const useToneControls = !!(highlights || shadows);
    const useVibrance = !!vibrance;
    const curveMap = curveNeutral ? null : quickEditCurveMap(clean);
    const activeLuts = quickEditActiveLuts(clean);
    if (
      !hslActive
      && !splitToneActive
      && !blackWhiteActive
      && !vignetteActive
      && !useSaturationMatrix
      && !useContrast
      && !useWhiteBlackLevels
      && !useDehaze
      && !useToneControls
      && !useVibrance
      && Math.abs(brightness - 1) < 0.0001
    ) {
      for (let i = 0; i < pixels.length; i += 4) {
        maybeReportProgress(i);
        if (!pixels[i + 3]) continue;
        let r = quickEditClampByte(pixels[i] * redGain);
        let g = quickEditClampByte(pixels[i + 1] * greenGain);
        let b = quickEditClampByte(pixels[i + 2] * blueGain);
        const bwColor = blackWhiteActive ? quickEditApplyBlackWhiteMixer(r, g, b, clean) : (r | (g << 8) | (b << 16));
        const bwR = bwColor & 255;
        const bwG = (bwColor >> 8) & 255;
        const bwB = (bwColor >> 16) & 255;
        const lutColor = quickEditBlendLutColor(bwR, bwG, bwB, activeLuts);
        r = lutColor & 255;
        g = (lutColor >> 8) & 255;
        b = (lutColor >> 16) & 255;
        pixels[i] = curveMap ? curveMap[r] : r;
        pixels[i + 1] = curveMap ? curveMap[g] : g;
        pixels[i + 2] = curveMap ? curveMap[b] : b;
      }
      applyQuickEditDetailEffects(pixels, width, height, clean, reportProgress ? reportDetailProgress : null);
      if (reportProgress) reportProgress(1);
      return;
    }
    for (let i = 0; i < pixels.length; i += 4) {
      maybeReportProgress(i);
      if (!pixels[i + 3]) continue;
      const brightR = pixels[i] * brightness * redGain;
      const brightG = pixels[i + 1] * brightness * greenGain;
      const brightB = pixels[i + 2] * brightness * blueGain;
      let r = 0;
      let g = 0;
      let b = 0;
      if (useSaturationMatrix) {
        r = quickEditClampByte(
          (0.213 + 0.787 * globalSaturation) * brightR
          + (0.715 - 0.715 * globalSaturation) * brightG
          + (0.072 - 0.072 * globalSaturation) * brightB,
        );
        g = quickEditClampByte(
          (0.213 - 0.213 * globalSaturation) * brightR
          + (0.715 + 0.285 * globalSaturation) * brightG
          + (0.072 - 0.072 * globalSaturation) * brightB,
        );
        b = quickEditClampByte(
          (0.213 - 0.213 * globalSaturation) * brightR
          + (0.715 - 0.715 * globalSaturation) * brightG
          + (0.072 + 0.928 * globalSaturation) * brightB,
        );
      } else {
        r = quickEditClampByte(brightR);
        g = quickEditClampByte(brightG);
        b = quickEditClampByte(brightB);
      }
      const contrasted = useContrast ? quickEditApplyContrast(r, g, b, contrast) : (r | (g << 8) | (b << 16));
      const contrastR = contrasted & 255;
      const contrastG = (contrasted >> 8) & 255;
      const contrastB = (contrasted >> 16) & 255;
      const leveled = useWhiteBlackLevels ? quickEditApplyWhiteBlackLevels(contrastR, contrastG, contrastB, whites, blacks) : contrasted;
      const levelR = leveled & 255;
      const levelG = (leveled >> 8) & 255;
      const levelB = (leveled >> 16) & 255;
      const dehazed = useDehaze ? quickEditApplyDehaze(levelR, levelG, levelB, dehaze) : leveled;
      const dehazeR = dehazed & 255;
      const dehazeG = (dehazed >> 8) & 255;
      const dehazeB = (dehazed >> 16) & 255;
      const toned = useToneControls ? quickEditApplyHighlightShadow(dehazeR, dehazeG, dehazeB, highlights, shadows) : dehazed;
      const tonedR = toned & 255;
      const tonedG = (toned >> 8) & 255;
      const tonedB = (toned >> 16) & 255;
      const vibrant = useVibrance ? quickEditApplyVibrance(tonedR, tonedG, tonedB, vibrance) : toned;
      const vibrantR = vibrant & 255;
      const vibrantG = (vibrant >> 8) & 255;
      const vibrantB = (vibrant >> 16) & 255;
      const splitToned = splitToneActive ? quickEditApplySplitTone(vibrantR, vibrantG, vibrantB, clean) : vibrant;
      const splitR = splitToned & 255;
      const splitG = (splitToned >> 8) & 255;
      const splitB = (splitToned >> 16) & 255;
      const mixed = hslActive ? quickEditApplyHslMixer(splitR, splitG, splitB, hslAdjustments) : splitToned;
      const mixedR = mixed & 255;
      const mixedG = (mixed >> 8) & 255;
      const mixedB = (mixed >> 16) & 255;
      const bwColor = blackWhiteActive ? quickEditApplyBlackWhiteMixer(mixedR, mixedG, mixedB, clean) : mixed;
      const bwR = bwColor & 255;
      const bwG = (bwColor >> 8) & 255;
      const bwB = (bwColor >> 16) & 255;
      const lutColor = quickEditBlendLutColor(bwR, bwG, bwB, activeLuts);
      const lutR = lutColor & 255;
      const lutG = (lutColor >> 8) & 255;
      const lutB = (lutColor >> 16) & 255;
      pixels[i] = curveMap ? curveMap[lutR] : lutR;
      pixels[i + 1] = curveMap ? curveMap[lutG] : lutG;
      pixels[i + 2] = curveMap ? curveMap[lutB] : lutB;
    }
    quickEditApplyVignette(pixels, width, height, clean);
    applyQuickEditDetailEffects(pixels, width, height, clean, reportProgress ? reportDetailProgress : null);
    if (reportProgress) reportProgress(1);
  }

  function drawQuickEditBitmap(ctx, bitmap, width, height, applyOrientation, orientation) {
    if (!applyOrientation) {
      ctx.drawImage(bitmap, 0, 0, width, height);
      return;
    }
    const value = String(orientation || '');
    ctx.save();
    if (value === '5') {
      ctx.transform(0, 1, 1, 0, 0, 0);
      ctx.drawImage(bitmap, 0, 0, height, width);
    } else if (value === '6' || value.toLowerCase().includes('90')) {
      ctx.transform(0, 1, -1, 0, width, 0);
      ctx.drawImage(bitmap, 0, 0, height, width);
    } else if (value === '7') {
      ctx.transform(0, -1, -1, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, height, width);
    } else if (value === '8' || value.toLowerCase().includes('270')) {
      ctx.transform(0, -1, 1, 0, 0, height);
      ctx.drawImage(bitmap, 0, 0, height, width);
    } else {
      ctx.drawImage(bitmap, 0, 0, width, height);
    }
    ctx.restore();
  }

  function drawQuickEditBitmapInBox(ctx, bitmap, x, y, width, height, applyOrientation, orientation) {
    if (!applyOrientation) {
      ctx.drawImage(bitmap, x, y, width, height);
      return;
    }
    const value = String(orientation || '').toLowerCase();
    ctx.save();
    ctx.translate(x, y);
    if (value === '5') {
      ctx.transform(0, 1, 1, 0, 0, 0);
      ctx.drawImage(bitmap, 0, 0, height, width);
    } else if (value === '6' || value.includes('90')) {
      ctx.transform(0, 1, -1, 0, width, 0);
      ctx.drawImage(bitmap, 0, 0, height, width);
    } else if (value === '7') {
      ctx.transform(0, -1, -1, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, height, width);
    } else if (value === '8' || value.includes('270')) {
      ctx.transform(0, -1, 1, 0, 0, height);
      ctx.drawImage(bitmap, 0, 0, height, width);
    } else {
      ctx.drawImage(bitmap, 0, 0, width, height);
    }
    ctx.restore();
  }

  function postQuickEditSaveProgress(message, stage, percent, detail) {
    self.postMessage({
      type: 'save-progress',
      token: Number(message.token || 0),
      key: String(message.key || ''),
      stage: String(stage || ''),
      percent: clamp(Number(percent || 0), 0, 100),
      detail: String(detail || ''),
    });
  }

  async function renderQuickEditImage(message) {
    const perfEnabled = !!message.perfEnabled;
    const totalStart = quickEditPerfNow();
    if (typeof OffscreenCanvas !== 'function') {
      throw new Error('当前 WebView Worker 不支持 OffscreenCanvas');
    }
    const bitmap = message.bitmap;
    if (!bitmap) throw new Error('异步渲染缺少 ImageBitmap');
    const sourceWidth = Math.max(1, Number(bitmap.width || 1));
    const sourceHeight = Math.max(1, Number(bitmap.height || 1));
    const displayWidth = Math.max(1, Number(message.displayWidth || sourceWidth));
    const displayHeight = Math.max(1, Number(message.displayHeight || sourceHeight));
    const maxSide = Math.max(1, Number(message.maxSide || 1));
    const scale = Math.min(1, maxSide / Math.max(displayWidth, displayHeight));
    const width = Math.max(1, Math.round(displayWidth * scale));
    const height = Math.max(1, Math.round(displayHeight * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('无法创建异步渲染画布');
    const drawStart = quickEditPerfNow();
    drawQuickEditBitmap(ctx, bitmap, width, height, !!message.applyOrientation, message.orientation);
    if (typeof bitmap.close === 'function') bitmap.close();
    const drawMs = quickEditPerfNow() - drawStart;
    const readStart = quickEditPerfNow();
    const imageData = ctx.getImageData(0, 0, width, height);
    const readMs = quickEditPerfNow() - readStart;
    const adjustStart = quickEditPerfNow();
    applyQuickEditPixelAdjustments(imageData.data, message.params || {}, width, height);
    const adjustMs = quickEditPerfNow() - adjustStart;
    const putStart = quickEditPerfNow();
    ctx.putImageData(imageData, 0, 0);
    const putMs = quickEditPerfNow() - putStart;
    const encodeStart = quickEditPerfNow();
    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: clamp(Number(message.quality || 0.92), 0.1, 1),
    });
    const encodeMs = quickEditPerfNow() - encodeStart;
    const totalMs = quickEditPerfNow() - totalStart;
    return {
      type: 'rendered',
      token: Number(message.token || 0),
      key: String(message.key || ''),
      renderSignature: String(message.renderSignature || ''),
      sourceSrc: String(message.sourceSrc || ''),
      maxSide,
      sourceWidth,
      sourceHeight,
      displayWidth,
      displayHeight,
      outputWidth: width,
      outputHeight: height,
      perf: perfEnabled ? {
        decodeMs: Number(Number(message.decodeMs || 0).toFixed(2)),
        drawMs: Number(drawMs.toFixed(2)),
        readMs: Number(readMs.toFixed(2)),
        adjustMs: Number(adjustMs.toFixed(2)),
        putMs: Number(putMs.toFixed(2)),
        encodeMs: Number(encodeMs.toFixed(2)),
        totalWorkerMs: Number(totalMs.toFixed(2)),
        pixels: width * height,
        lutCount: message.params && Array.isArray(message.params.luts) ? message.params.luts.length : 0,
      } : null,
      blob,
    };
  }

  async function renderQuickEditSaveImage(message) {
    const perfEnabled = !!message.perfEnabled;
    const totalStart = quickEditPerfNow();
    if (typeof OffscreenCanvas !== 'function') {
      throw new Error('当前 WebView Worker 不支持 OffscreenCanvas');
    }
    const bitmap = message.bitmap;
    if (!bitmap) throw new Error('保存渲染缺少 ImageBitmap');

    const outputWidth = Math.max(1, Math.round(Number(message.outputWidth || 1)));
    const outputHeight = Math.max(1, Math.round(Number(message.outputHeight || 1)));
    const outputScale = Math.max(0.0001, Number(message.outputScale || 1));
    const frame = message.frame || {};
    const frameX = Number(frame.x || 0);
    const frameY = Number(frame.y || 0);
    const baseWidth = Math.max(1, Number(message.baseWidth || outputWidth));
    const baseHeight = Math.max(1, Number(message.baseHeight || outputHeight));
    const baseLeft = Number(message.baseLeft || 0);
    const baseTop = Number(message.baseTop || 0);
    const pan = message.pan || {};
    const panX = Number(pan.x || 0);
    const panY = Number(pan.y || 0);
    const zoom = Math.max(0.0001, Number(message.zoom || 1));
    const angleRadians = Number(message.angleRadians || 0);
    const mime = String(message.mime || 'image/jpeg');
    const quality = clamp(Number(message.quality || 0.92), 0.1, 1);

    postQuickEditSaveProgress(message, '准备渲染', 8, outputWidth + ' x ' + outputHeight);
    const canvas = new OffscreenCanvas(outputWidth, outputHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建保存画布');
    const imageCanvas = new OffscreenCanvas(outputWidth, outputHeight);
    const imageCtx = imageCanvas.getContext('2d', { willReadFrequently: true });
    if (!imageCtx) throw new Error('无法创建保存调色画布');

    const drawStart = quickEditPerfNow();
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, outputWidth, outputHeight);
    imageCtx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
    imageCtx.translate(baseLeft - frameX + baseWidth / 2 + panX, baseTop - frameY + baseHeight / 2 + panY);
    imageCtx.scale(zoom, zoom);
    imageCtx.rotate(angleRadians);
    drawQuickEditBitmapInBox(
      imageCtx,
      bitmap,
      -baseWidth / 2,
      -baseHeight / 2,
      baseWidth,
      baseHeight,
      !!message.applyOrientation,
      message.orientation,
    );
    if (typeof bitmap.close === 'function') bitmap.close();
    const drawMs = quickEditPerfNow() - drawStart;

    postQuickEditSaveProgress(message, '读取像素', 30, outputWidth + ' x ' + outputHeight);
    const readStart = quickEditPerfNow();
    const imageData = imageCtx.getImageData(0, 0, outputWidth, outputHeight);
    const readMs = quickEditPerfNow() - readStart;

    const adjustStart = quickEditPerfNow();
    applyQuickEditPixelAdjustments(imageData.data, message.params || {}, outputWidth, outputHeight, (ratio) => {
      postQuickEditSaveProgress(message, '应用调色', 36 + clamp(Number(ratio || 0), 0, 1) * 34, outputWidth + ' x ' + outputHeight);
    });
    const adjustMs = quickEditPerfNow() - adjustStart;

    postQuickEditSaveProgress(message, '合成图像', 74, outputWidth + ' x ' + outputHeight);
    const putStart = quickEditPerfNow();
    imageCtx.setTransform(1, 0, 0, 1, 0, 0);
    imageCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(imageCanvas, 0, 0);
    const putMs = quickEditPerfNow() - putStart;

    postQuickEditSaveProgress(message, '编码图片', 84, String(message.format || '').toUpperCase());
    const encodeStart = quickEditPerfNow();
    const blob = await canvas.convertToBlob({ type: mime, quality });
    const encodeMs = quickEditPerfNow() - encodeStart;
    if (!blob) throw new Error('保存编码失败');

    const totalMs = quickEditPerfNow() - totalStart;
    postQuickEditSaveProgress(message, '渲染完成', 88, outputWidth + ' x ' + outputHeight);
    return {
      type: 'save-rendered',
      token: Number(message.token || 0),
      key: String(message.key || ''),
      format: String(message.format || ''),
      mime,
      outputWidth,
      outputHeight,
      perf: perfEnabled ? {
        decodeMs: Number(Number(message.decodeMs || 0).toFixed(2)),
        drawMs: Number(drawMs.toFixed(2)),
        readMs: Number(readMs.toFixed(2)),
        adjustMs: Number(adjustMs.toFixed(2)),
        putMs: Number(putMs.toFixed(2)),
        encodeMs: Number(encodeMs.toFixed(2)),
        totalWorkerMs: Number(totalMs.toFixed(2)),
        pixels: outputWidth * outputHeight,
        lutCount: message.params && Array.isArray(message.params.luts) ? message.params.luts.length : 0,
      } : null,
      blob,
    };
  }

  self.onmessage = (ev) => {
    const message = ev && ev.data ? ev.data : {};
    const type = String(message.type || '');
    const task = type === 'save' ? 'save' : 'render';
    const work = type === 'save'
      ? renderQuickEditSaveImage(message)
      : (type === 'render' ? renderQuickEditImage(message) : null);
    if (!work) return;
    work.then((payload) => {
      self.postMessage(payload);
    }).catch((err) => {
      if (message.bitmap && typeof message.bitmap.close === 'function') {
        try {
          message.bitmap.close();
        } catch (_closeErr) {
          // ImageBitmap may already be closed.
        }
      }
      self.postMessage({
        type: 'error',
        task,
        token: Number(message.token || 0),
        key: String(message.key || ''),
        sourceSrc: String(message.sourceSrc || ''),
        message: String((err && err.message) || err || (task === 'save' ? '保存渲染失败' : '异步渲染失败')),
      });
    });
  };
}

if (typeof document !== 'undefined') {
  window.PicScannerQuickEditWorkerSource = '(' + quickEditWorkerMain.toString() + '());';
} else {
  quickEditWorkerMain();
}
