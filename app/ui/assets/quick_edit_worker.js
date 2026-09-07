// P5-3：QuickEdit Worker 与 app.js 主线程共享同一套像素数学模块，消除双份漂移。
// 本文件现在是 vite 的 worker 入口（vite.worker.config.js）：import 会被内联进
// 自包含 bundle，构建产物再被插件变换为「源码字符串赋值」文件，供 index.html
// 加载后由 app.js 造 Blob Worker（file:// 下无法直接构造文件 Worker，字符串是硬约束）。
import {
  clamp,
  quickEditClampByte,
} from '../../../frontend/src/quickedit/pixel/color.js';
import {
  QUICK_EDIT_HSL_COLORS,
  quickEditActiveHslAdjustments,
  quickEditApplyHslMixer,
  quickEditApplySplitTone,
  quickEditSplitToneActive,
} from '../../../frontend/src/quickedit/pixel/hsl.js';
import {
  quickEditCurveMap as sharedQuickEditCurveMap,
  quickEditCurveOutput as sharedQuickEditCurveOutput,
} from '../../../frontend/src/quickedit/pixel/curve.js';
import {
  quickEditPrepareLut,
  quickEditBlendLutColor,
} from '../../../frontend/src/quickedit/pixel/lut.js';
import {
  quickEditApplyBlackWhiteMixer as sharedQuickEditApplyBlackWhiteMixer,
  quickEditApplyContrast as sharedQuickEditApplyContrast,
  quickEditApplyDehaze as sharedQuickEditApplyDehaze,
  applyQuickEditDetailEffects as sharedApplyQuickEditDetailEffects,
  quickEditApplyHighlightShadow as sharedQuickEditApplyHighlightShadow,
  quickEditApplyVibrance as sharedQuickEditApplyVibrance,
  quickEditApplyVignette as sharedQuickEditApplyVignette,
  quickEditApplyWhiteBlackLevels as sharedQuickEditApplyWhiteBlackLevels,
  quickEditDetailEffectCount as sharedQuickEditDetailEffectCount,
} from '../../../frontend/src/quickedit/pixel/toning.js';

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
    return sharedQuickEditCurveOutput(quickEditCurvePoints(params), input);
  }

  function quickEditCurveMap(params) {
    return sharedQuickEditCurveMap(quickEditCurvePoints(params));
  }

  function quickEditActiveLuts(params) {
    const clean = normalizeQuickEditParams(params);
    return clean.luts
      .filter((lut) => lut && lut.data && lut.size && lut.strength > 0)
      .map((lut) => ({ lut: quickEditPrepareLut(lut), strength: lut.strength / 100 }));
  }

  function applyQuickEditPixelAdjustments(pixels, params, width, height, onProgress) {
    const clean = normalizeQuickEditParams(params);
    const reportProgress = typeof onProgress === 'function' ? onProgress : null;
    const detailEffectCount = sharedQuickEditDetailEffectCount(clean);
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
        const bwColor = blackWhiteActive ? sharedQuickEditApplyBlackWhiteMixer(r, g, b, clean) : (r | (g << 8) | (b << 16));
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
      sharedApplyQuickEditDetailEffects(pixels, width, height, clean, reportProgress ? reportDetailProgress : null);
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
      const contrasted = useContrast ? sharedQuickEditApplyContrast(r, g, b, contrast) : (r | (g << 8) | (b << 16));
      const contrastR = contrasted & 255;
      const contrastG = (contrasted >> 8) & 255;
      const contrastB = (contrasted >> 16) & 255;
      const leveled = useWhiteBlackLevels ? sharedQuickEditApplyWhiteBlackLevels(contrastR, contrastG, contrastB, whites, blacks) : contrasted;
      const levelR = leveled & 255;
      const levelG = (leveled >> 8) & 255;
      const levelB = (leveled >> 16) & 255;
      const dehazed = useDehaze ? sharedQuickEditApplyDehaze(levelR, levelG, levelB, dehaze) : leveled;
      const dehazeR = dehazed & 255;
      const dehazeG = (dehazed >> 8) & 255;
      const dehazeB = (dehazed >> 16) & 255;
      const toned = useToneControls ? sharedQuickEditApplyHighlightShadow(dehazeR, dehazeG, dehazeB, highlights, shadows) : dehazed;
      const tonedR = toned & 255;
      const tonedG = (toned >> 8) & 255;
      const tonedB = (toned >> 16) & 255;
      const vibrant = useVibrance ? sharedQuickEditApplyVibrance(tonedR, tonedG, tonedB, vibrance) : toned;
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
      const bwColor = blackWhiteActive ? sharedQuickEditApplyBlackWhiteMixer(mixedR, mixedG, mixedB, clean) : mixed;
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
    sharedQuickEditApplyVignette(pixels, width, height, clean);
    sharedApplyQuickEditDetailEffects(pixels, width, height, clean, reportProgress ? reportDetailProgress : null);
    if (reportProgress) reportProgress(1);
  }

  function applyQuickEditPixelStages(pixels, params, width, height, onProgress) {
    const stages = params && Array.isArray(params.stages) && params.stages.length
      ? params.stages
      : [params || {}];
    const reportProgress = typeof onProgress === 'function' ? onProgress : null;
    stages.forEach((stage, index) => {
      applyQuickEditPixelAdjustments(
        pixels,
        stage,
        width,
        height,
        reportProgress ? (ratio) => reportProgress((index + clamp(Number(ratio || 0), 0, 1)) / stages.length) : null,
      );
    });
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
    applyQuickEditPixelStages(imageData.data, message.params || {}, width, height);
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
    applyQuickEditPixelStages(imageData.data, message.params || {}, outputWidth, outputHeight, (ratio) => {
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

// 构建产物会被 vite 插件（vite.worker.config.js）整体变换为
// 「window.PicScannerQuickEditWorkerSource = <bundle 文本>」的赋值文件：
// 页面加载只定义字符串，永不执行 bundle；Blob Worker 评估整段 bundle 时
// document 不存在 → 此处启动主循环。
if (typeof document === 'undefined') {
  quickEditWorkerMain();
}
