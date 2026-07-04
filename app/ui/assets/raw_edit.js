(function () {
  'use strict';

  const RAW_TEMPERATURE_MIN_K = 2000;
  const RAW_TEMPERATURE_NEUTRAL_K = 6500;
  const RAW_TEMPERATURE_MAX_K = 10000;
  const RAW_TEMPERATURE_STEP_K = 50;
  const RAW_EXPOSURE_MIN_EV = -5;
  const RAW_EXPOSURE_MAX_EV = 5;
  const RAW_DEFAULT_CURVE_POINTS = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ];
  const RAW_DEVELOP_PARAM_KEYS = [
    'exposure',
    'temperature',
    'tint',
    'rawHighlightRecovery',
    'rawNoiseReduction',
    'curvePoints',
  ];
  const RAW_DEVELOP_DEFAULTS = {
    exposure: 0,
    temperature: RAW_TEMPERATURE_NEUTRAL_K,
    tint: 0,
    rawHighlightRecovery: 0,
    rawNoiseReduction: 0,
    curvePoints: RAW_DEFAULT_CURVE_POINTS.map((point) => Object.assign({}, point)),
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function roundTemperature(value) {
    const clamped = clamp(
      finiteNumber(value, RAW_TEMPERATURE_NEUTRAL_K),
      RAW_TEMPERATURE_MIN_K,
      RAW_TEMPERATURE_MAX_K,
    );
    return Math.round(clamped / RAW_TEMPERATURE_STEP_K) * RAW_TEMPERATURE_STEP_K;
  }

  function legacyCurvePoints(raw) {
    const source = raw || {};
    return [
      { x: 0, y: clamp(finiteNumber(source.curveBlack, 0), 0, 100) },
      { x: 50, y: clamp(finiteNumber(source.curveMid, 50), 0, 100) },
      { x: 100, y: clamp(finiteNumber(source.curveWhite, 100), 0, 100) },
    ];
  }

  function normalizeCurvePoints(points, raw) {
    const source = Array.isArray(points) && points.length >= 2 ? points : legacyCurvePoints(raw);
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

  function normalizeParams(input) {
    const raw = input && typeof input === 'object' ? input : {};
    return {
      exposure: Number(clamp(finiteNumber(raw.exposure, 0), RAW_EXPOSURE_MIN_EV, RAW_EXPOSURE_MAX_EV).toFixed(3)),
      temperature: roundTemperature(raw.temperature),
      tint: Math.round(clamp(finiteNumber(raw.tint, 0), -100, 100)),
      rawHighlightRecovery: Math.round(clamp(finiteNumber(raw.rawHighlightRecovery, 0), 0, 100)),
      rawNoiseReduction: Math.round(clamp(finiteNumber(raw.rawNoiseReduction, 0), 0, 100)),
      curvePoints: normalizeCurvePoints(raw.curvePoints, raw),
    };
  }

  function signature(input) {
    const clean = normalizeParams(input);
    return JSON.stringify({
      exposure: clean.exposure,
      temperature: clean.temperature,
      tint: clean.tint,
      rawHighlightRecovery: clean.rawHighlightRecovery,
      rawNoiseReduction: clean.rawNoiseReduction,
      curvePoints: clean.curvePoints,
    });
  }

  function isRawDevelopParam(key) {
    return RAW_DEVELOP_PARAM_KEYS.includes(String(key || ''));
  }

  window.PicScannerRawEdit = {
    RAW_TEMPERATURE_MIN_K,
    RAW_TEMPERATURE_NEUTRAL_K,
    RAW_TEMPERATURE_MAX_K,
    RAW_TEMPERATURE_STEP_K,
    RAW_EXPOSURE_MIN_EV,
    RAW_EXPOSURE_MAX_EV,
    RAW_DEVELOP_PARAM_KEYS,
    RAW_DEVELOP_DEFAULTS,
    normalizeParams,
    normalizeCurvePoints,
    signature,
    isRawDevelopParam,
  };
}());
