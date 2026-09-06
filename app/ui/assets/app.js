(function () {
  const PS = window.PS;
  // P5-3 切片 1：像素色彩基元改由共享模块提供
  // （frontend/src/quickedit/pixel/color.js，经 Vue 包挂到 window）。
  // Vue 包先于本脚本加载，此处解构时序成立；worker 拷贝在切片 2 收敛。
  const quickeditPixel = (window.PicScannerVue && window.PicScannerVue.quickeditPixel) || {};
  const quickEditRgbToHsl = quickeditPixel.quickEditRgbToHsl;
  const quickEditHueToRgb = quickeditPixel.quickEditHueToRgb;
  const quickEditHslToRgb = quickeditPixel.quickEditHslToRgb;
  const quickEditHslToPackedRgb = quickeditPixel.quickEditHslToPackedRgb;
  const quickEditSmoothStep = quickeditPixel.quickEditSmoothStep;
  const quickEditLuma = quickeditPixel.quickEditLuma;
  const state = PS.state;
  const els = PS.els;
  const lightboxHomeParent = PS.lightboxHomeParent;
  const lightboxHomeNextSibling = PS.lightboxHomeNextSibling;
  const api = PS.api;
  const call = PS.call;
  const quickEditGeometryApi = PS.quickEditGeometryApi;
  const missingStartupApiMethods = PS.missingStartupApiMethods;
  const startupApiReady = PS.startupApiReady;
  const show = PS.show;
  const hide = PS.hide;
  const finishTextInput = PS.finishTextInput;
  const activeInputModalField = PS.activeInputModalField;
  const openTextInput = PS.openTextInput;
  const confirmTextInput = PS.confirmTextInput;
  const cancelTextInput = PS.cancelTextInput;
  const ensureToast = PS.ensureToast;
  const showToast = PS.showToast;
  const text = PS.text;
  const clamp = PS.clamp;
  const joinClean = PS.joinClean;
  const escapeHtml = PS.escapeHtml;
  const scanStatusLabel = PS.scanStatusLabel;
  const quickEditPerfEnabled = PS.quickEditPerfEnabled;
  const quickEditPerfNow = PS.quickEditPerfNow;
  const quickEditPerfLog = PS.quickEditPerfLog;
  const SORT_OPTIONS = PS.SORT_OPTIONS;
  const SETTINGS_TABS = PS.SETTINGS_TABS;
  const PROJECT_URL = PS.PROJECT_URL;
  const STATUS_LABELS = PS.STATUS_LABELS;
  const LIGHTBOX_MIN_ZOOM = PS.LIGHTBOX_MIN_ZOOM;
  const LIGHTBOX_MAX_ZOOM = PS.LIGHTBOX_MAX_ZOOM;
  const LIGHTBOX_ZOOM_STEP = PS.LIGHTBOX_ZOOM_STEP;
  const LIGHTBOX_NAV_HOVER_WIDTH = PS.LIGHTBOX_NAV_HOVER_WIDTH;
  const LIGHTBOX_INFO_MIN_WIDTH = PS.LIGHTBOX_INFO_MIN_WIDTH;
  const LIGHTBOX_INFO_MAX_WIDTH = PS.LIGHTBOX_INFO_MAX_WIDTH;
  const LIGHTBOX_INFO_MIN_HEIGHT = PS.LIGHTBOX_INFO_MIN_HEIGHT;
  const LIGHTBOX_INFO_MAX_HEIGHT = PS.LIGHTBOX_INFO_MAX_HEIGHT;
  const PREVIEW_CONCURRENCY = PS.PREVIEW_CONCURRENCY;
  const MORE_SCAN_COOLDOWN_MS = PS.MORE_SCAN_COOLDOWN_MS;
  const RENDER_AHEAD_PHOTOS = PS.RENDER_AHEAD_PHOTOS;
  const APP_BUILD = PS.APP_BUILD;
  const FAVORITE_CATEGORY = PS.FAVORITE_CATEGORY;
  const DATE_RAIL_LOAD_LIMIT = PS.DATE_RAIL_LOAD_LIMIT;
  const INITIAL_PHOTO_LIMIT = PS.INITIAL_PHOTO_LIMIT;
  const PHOTO_LOAD_BATCH = PS.PHOTO_LOAD_BATCH;
  const GALLERY_ITEM_SIZE_WHEEL_SCALE = PS.GALLERY_ITEM_SIZE_WHEEL_SCALE;
  const SEARCH_DEBOUNCE_MS = PS.SEARCH_DEBOUNCE_MS;
  const QUICK_EDIT_CROP_MIN_SIZE = PS.QUICK_EDIT_CROP_MIN_SIZE;
  const QUICK_EDIT_CROP_MIN_FRAME_PX = PS.QUICK_EDIT_CROP_MIN_FRAME_PX;
  const QUICK_EDIT_CROP_STAGE_MARGIN = PS.QUICK_EDIT_CROP_STAGE_MARGIN;
  const QUICK_EDIT_MIN_ZOOM = PS.QUICK_EDIT_MIN_ZOOM;
  const QUICK_EDIT_MAX_ZOOM = PS.QUICK_EDIT_MAX_ZOOM;
  const QUICK_EDIT_SHADE_DELAY_MS = PS.QUICK_EDIT_SHADE_DELAY_MS;
  const QUICK_EDIT_ROTATION_PX_PER_DEGREE = PS.QUICK_EDIT_ROTATION_PX_PER_DEGREE;
  const QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE = PS.QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE;
  const QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE = PS.QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE;
  const QUICK_EDIT_SETTLED_PREVIEW_HARD_MAX_SIDE = PS.QUICK_EDIT_SETTLED_PREVIEW_HARD_MAX_SIDE;
  const QUICK_EDIT_PREVIEW_RENDER_BUCKETS = PS.QUICK_EDIT_PREVIEW_RENDER_BUCKETS;
  const QUICK_EDIT_ORIGINAL_PREVIEW_DELAY_MS = PS.QUICK_EDIT_ORIGINAL_PREVIEW_DELAY_MS;
  const QUICK_EDIT_RAW_ORIGINAL_PREVIEW_DELAY_MS = PS.QUICK_EDIT_RAW_ORIGINAL_PREVIEW_DELAY_MS;
  const QUICK_EDIT_ZOOM_SETTLE_RENDER_DELAY_MS = PS.QUICK_EDIT_ZOOM_SETTLE_RENDER_DELAY_MS;
  const QUICK_EDIT_EXPOSURE_MIN_EV = PS.QUICK_EDIT_EXPOSURE_MIN_EV;
  const QUICK_EDIT_EXPOSURE_MAX_EV = PS.QUICK_EDIT_EXPOSURE_MAX_EV;
  const QUICK_EDIT_TEMPERATURE_MIN_K = PS.QUICK_EDIT_TEMPERATURE_MIN_K;
  const QUICK_EDIT_TEMPERATURE_NEUTRAL_K = PS.QUICK_EDIT_TEMPERATURE_NEUTRAL_K;
  const QUICK_EDIT_TEMPERATURE_MAX_K = PS.QUICK_EDIT_TEMPERATURE_MAX_K;
  const QUICK_EDIT_TEMPERATURE_STEP_K = PS.QUICK_EDIT_TEMPERATURE_STEP_K;
  const QUICK_EDIT_DEFAULT_CURVE_POINTS = PS.QUICK_EDIT_DEFAULT_CURVE_POINTS;
  const QUICK_EDIT_HSL_COLORS = PS.QUICK_EDIT_HSL_COLORS;
  const QUICK_EDIT_DEFAULT_PARAMS = PS.QUICK_EDIT_DEFAULT_PARAMS;
  const QUICK_EDIT_SPLIT_TONE_PRESETS = PS.QUICK_EDIT_SPLIT_TONE_PRESETS;
  const QUICK_EDIT_SAVE_OPTIONS_KEY = PS.QUICK_EDIT_SAVE_OPTIONS_KEY;
  const QUICK_EDIT_SAVE_FORMATS = PS.QUICK_EDIT_SAVE_FORMATS;
  const QUICK_EDIT_FRAME_TEXT_COLORS = PS.QUICK_EDIT_FRAME_TEXT_COLORS;
  const QUICK_EDIT_FRAME_TEXT_TOKENS = PS.QUICK_EDIT_FRAME_TEXT_TOKENS;
  const QUICK_EDIT_DEFAULT_SAVE_QUALITY = PS.QUICK_EDIT_DEFAULT_SAVE_QUALITY;
  const QUICK_EDIT_SAVE_QUALITY_PRESETS = PS.QUICK_EDIT_SAVE_QUALITY_PRESETS;
  const QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT = PS.QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT;
  const QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MIN = PS.QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MIN;
  const QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX = PS.QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX;


  function showSourceChooser() {
    if (PS.batchProcessingController && PS.batchProcessingController.isRunning()) {
      showToast('批量处理正在运行，完成或取消后才能切换来源', 'error');
      return;
    }
    if (state.quickEdit.saveSaving) {
      showQuickEditSaveConfirm();
      return;
    }
    if (PS.batchProcessingController) PS.batchProcessingController.close();
    if (PS.batchSelectionController) PS.batchSelectionController.clear();
    closeQuickEdit({ silent: true });
    PS.closeSearchPanel();
    PS.closeSettingsPage({ animate: false });
    PS.closeStatsPage({ animate: false });
    PS.closeExportConfirm();
    hide(els.confirmModal);
    hide(els.workspace);
    show(els.sourceScreen);
    playSourceEnter();
    loadSources();
  }

  function openConfirm(source) {
    state.selectedSource = source;
    els.confirmPath.textContent = source.path;
    show(els.confirmModal);
  }

  function playWorkspaceEnter() {
    els.workspace.classList.remove('entering');
    void els.workspace.offsetWidth;
    els.workspace.classList.add('entering');
  }

  function playSourceEnter() {
    els.sourceScreen.classList.remove('entering');
    void els.sourceScreen.offsetWidth;
    els.sourceScreen.classList.add('entering');
  }

  // P3 · 来源首页渲染代码已删除
  //
  // 原先这里有 6 个函数：sourceEmpty / updateSourcePageCounts / sourceSummaryText /
  // selectSource / sourceCard / renderSources。
  // 来源网格改由 frontend/src/islands/SourceScreen.vue 渲染，
  // 数据来自 stores/source.js 的 get_sources / choose_folder。
  //
  // 保留在下方：showSourceStartupError / loadSources / chooseFolder ——
  // 它们是启动与切换来源的编排入口，只是把渲染委托给了 Vue。


  function showSourceStartupError(error, context) {
    const prefix = String(context || '来源加载失败');
    console.error('[PicScannerStartup] ' + prefix, error);
    // P3：#drive-list 已随来源首页移入 Vue，错误改由 store 显示在来源网格里
    const bridge = window.PicScannerVue && window.PicScannerVue.source;
    if (bridge && typeof bridge.showError === 'function') {
      bridge.showError(prefix, error);
    }
    if (window.PicScannerSourceConflicts) window.PicScannerSourceConflicts.close();
    show(els.sourceScreen);
  }

  function loadSources() {
    // P3：渲染交给 Vue，这里只负责在 Vue 不可用时兜底显示错误
    const bridge = window.PicScannerVue && window.PicScannerVue.source;
    if (bridge && typeof bridge.refresh === 'function') {
      bridge.refresh().catch((err) => showSourceStartupError(err, '来源加载失败'));
      return;
    }
    call('get_sources').then((data) => {
      PS.applyAppConfig(data && data.config);
    }).catch((err) => {
      showSourceStartupError(err, '来源加载失败');
    });
  }

  function resetGallery() {
    state.dates = [];
    state.dateCounts = new Map();
    state.dateExifCounts = new Map();
    state.dateNotes = new Map();
    state.dateCovers = new Map();
    state.dateCursor = null;
    state.loadingDates = false;
    state.noMoreDates = false;
    state.lastDateBootstrapKey = '';
    state.scanRequesting = false;
    state.lastMoreScanAt = 0;
    state.bottomWheelTicking = false;
    state.photoOffsets = new Map();
    state.exifCache = new Map();
    state.photoCache = new Map();
    state.lightboxCachePending = new Set();
    state.activeDate = null;
    state.visibleDates = new Set();
    state.dateFocus = new Map();
    state.lastVisibleRefreshAt = 0;
    state.lastStatsSignature = '';
    state.pendingRestoreDate = '';
    state.pendingRestoreOffset = 0;
    state.restoringDate = false;
    state.lastViewedDateSaved = '';
    state.suppressLastViewedSaveUntil = 0;
    clearTimeout(state.saveViewedDateTimer);
    state.saveViewedDateTimer = null;
    els.dateRail.innerHTML = '';
  }


  function quickEditDefaultParams() {
    return Object.assign({}, QUICK_EDIT_DEFAULT_PARAMS, {
      curvePoints: QUICK_EDIT_DEFAULT_CURVE_POINTS.map((point) => Object.assign({}, point)),
    });
  }

  function normalizeQuickEditRotation(value) {
    const raw = Number(value || 0);
    if (!Number.isFinite(raw)) return 0;
    const wrapped = ((raw % 360) + 540) % 360 - 180;
    return Math.round(wrapped);
  }

  function quickEditRoundTemperatureK(value) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return QUICK_EDIT_TEMPERATURE_NEUTRAL_K;
    const clamped = clamp(raw, QUICK_EDIT_TEMPERATURE_MIN_K, QUICK_EDIT_TEMPERATURE_MAX_K);
    return Math.round(clamped / QUICK_EDIT_TEMPERATURE_STEP_K) * QUICK_EDIT_TEMPERATURE_STEP_K;
  }

  function quickEditTemperatureKFromLegacy(value) {
    const legacy = clamp(Number(value || 0), -100, 100);
    if (legacy >= 0) {
      return quickEditRoundTemperatureK(
        QUICK_EDIT_TEMPERATURE_NEUTRAL_K
        + legacy / 100 * (QUICK_EDIT_TEMPERATURE_MAX_K - QUICK_EDIT_TEMPERATURE_NEUTRAL_K),
      );
    }
    return quickEditRoundTemperatureK(
      QUICK_EDIT_TEMPERATURE_NEUTRAL_K
      + legacy / 100 * (QUICK_EDIT_TEMPERATURE_NEUTRAL_K - QUICK_EDIT_TEMPERATURE_MIN_K),
    );
  }

  function normalizeQuickEditTemperature(value) {
    if (value === null || value === undefined || value === '') return QUICK_EDIT_TEMPERATURE_NEUTRAL_K;
    const number = Number(value);
    if (!Number.isFinite(number)) return QUICK_EDIT_TEMPERATURE_NEUTRAL_K;
    if (number >= -100 && number <= 100) return quickEditTemperatureKFromLegacy(number);
    return quickEditRoundTemperatureK(number);
  }

  function combineQuickEditTemperature(base, extra) {
    const combined = normalizeQuickEditTemperature(base)
      + (normalizeQuickEditTemperature(extra) - QUICK_EDIT_TEMPERATURE_NEUTRAL_K);
    return quickEditRoundTemperatureK(combined);
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

  function quickEditLegacyCurvePoints(raw) {
    const source = raw || {};
    return [
      { x: 0, y: clamp(Number(source.curveBlack || 0), 0, 100) },
      { x: 50, y: clamp(Number(source.curveMid === undefined ? 50 : source.curveMid), 0, 100) },
      { x: 100, y: clamp(Number(source.curveWhite === undefined ? 100 : source.curveWhite), 0, 100) },
    ];
  }

  function normalizeQuickEditCurvePoints(points, raw) {
    const source = Array.isArray(points) && points.length >= 2 ? points : quickEditLegacyCurvePoints(raw);
    const clean = [];
    source.forEach((point) => {
      const x = Number(point && point.x);
      const y = Number(point && point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      clean.push({
        x: clamp(x, 0, 100),
        y: clamp(y, 0, 100),
      });
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
      .map((point) => ({
        x: clamp(point.x, 1, 99),
        y: clamp(point.y, 0, 100),
      }));
    return [
      { x: 0, y: clamp(first.x <= 0.5 ? first.y : 0, 0, 100) },
      ...interior,
      { x: 100, y: clamp(last.x >= 99.5 ? last.y : 100, 0, 100) },
    ];
  }

  function normalizeQuickEditParams(params) {
    const input = params || {};
    const raw = Object.assign({}, QUICK_EDIT_DEFAULT_PARAMS, input);
    const curvePoints = normalizeQuickEditCurvePoints(
      Object.prototype.hasOwnProperty.call(input, 'curvePoints') ? raw.curvePoints : null,
      raw,
    );
    const minCrop = QUICK_EDIT_CROP_MIN_SIZE;
    const cropLeft = clamp(Number(raw.cropLeft || 0), 0, 100 - minCrop);
    const cropTop = clamp(Number(raw.cropTop || 0), 0, 100 - minCrop);
    const cropRight = clamp(Number(raw.cropRight || 0), 0, 100 - minCrop - cropLeft);
    const cropBottom = clamp(Number(raw.cropBottom || 0), 0, 100 - minCrop - cropTop);
    const cleanParams = {
      cropTop,
      cropRight,
      cropBottom,
      cropLeft,
      rotation: normalizeQuickEditRotation(raw.rotation),
      straighten: clamp(Number(raw.straighten || 0), -45, 45),
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
      rawHighlightRecovery: clamp(Number(raw.rawHighlightRecovery || 0), 0, 100),
      rawNoiseReduction: clamp(Number(raw.rawNoiseReduction || 0), 0, 100),
      lutStrength: clamp(Number(raw.lutStrength === undefined ? 100 : raw.lutStrength), 0, 100),
      curveBlack: clamp(Number(raw.curveBlack || 0), 0, 100),
      curveMid: clamp(Number(raw.curveMid === undefined ? 50 : raw.curveMid), 0, 100),
      curveWhite: clamp(Number(raw.curveWhite === undefined ? 100 : raw.curveWhite), 0, 100),
      curvePoints,
    };
    QUICK_EDIT_HSL_COLORS.forEach((color) => {
      cleanParams['hsl_' + color.key + '_hue'] = clamp(Number(raw['hsl_' + color.key + '_hue'] || 0), -60, 60);
      cleanParams['hsl_' + color.key + '_saturation'] = clamp(Number(raw['hsl_' + color.key + '_saturation'] || 0), -100, 100);
      cleanParams['hsl_' + color.key + '_luminance'] = clamp(Number(raw['hsl_' + color.key + '_luminance'] || 0), -100, 100);
    });
    return cleanParams;
  }

  function quickEditParamsFromCropRect(base, extra) {
    const baseRect = quickEditCropRect(base);
    const extraRect = quickEditCropRect(extra);
    const composed = quickEditGeometryApi().composeCrop(baseRect, extraRect, QUICK_EDIT_CROP_MIN_SIZE);
    return {
      cropLeft: composed.x,
      cropTop: composed.y,
      cropRight: 100 - composed.x - composed.w,
      cropBottom: 100 - composed.y - composed.h,
    };
  }

  function combineQuickEditParams(base, extra) {
    const cleanBase = normalizeQuickEditParams(base);
    const cleanExtra = normalizeQuickEditParams(extra);
    const useBaseCurve = isQuickEditCurveNeutral(cleanExtra);
    const combined = normalizeQuickEditParams(Object.assign(
      {},
      quickEditParamsFromCropRect(cleanBase, cleanExtra),
      {
        rotation: cleanBase.rotation + cleanExtra.rotation,
        straighten: cleanBase.straighten + cleanExtra.straighten,
        exposure: cleanBase.exposure + cleanExtra.exposure,
        contrast: cleanBase.contrast + cleanExtra.contrast,
        highlights: cleanBase.highlights + cleanExtra.highlights,
        shadows: cleanBase.shadows + cleanExtra.shadows,
        whites: cleanBase.whites + cleanExtra.whites,
        blacks: cleanBase.blacks + cleanExtra.blacks,
        dehaze: cleanBase.dehaze + cleanExtra.dehaze,
        saturation: cleanBase.saturation + cleanExtra.saturation,
        vibrance: cleanBase.vibrance + cleanExtra.vibrance,
        sharpening: cleanBase.sharpening + cleanExtra.sharpening,
        clarity: cleanBase.clarity + cleanExtra.clarity,
        grain: cleanBase.grain + cleanExtra.grain,
        vignette: cleanBase.vignette + cleanExtra.vignette,
        vignetteFeather: cleanExtra.vignette ? cleanExtra.vignetteFeather : cleanBase.vignetteFeather,
        blackWhite: cleanBase.blackWhite + cleanExtra.blackWhite,
        bwRed: cleanBase.bwRed + cleanExtra.bwRed,
        bwYellow: cleanBase.bwYellow + cleanExtra.bwYellow,
        bwGreen: cleanBase.bwGreen + cleanExtra.bwGreen,
        bwAqua: cleanBase.bwAqua + cleanExtra.bwAqua,
        bwBlue: cleanBase.bwBlue + cleanExtra.bwBlue,
        bwMagenta: cleanBase.bwMagenta + cleanExtra.bwMagenta,
        temperature: combineQuickEditTemperature(cleanBase.temperature, cleanExtra.temperature),
        tint: cleanBase.tint + cleanExtra.tint,
        splitToneShadowsHue: cleanExtra.splitToneShadowsStrength ? cleanExtra.splitToneShadowsHue : cleanBase.splitToneShadowsHue,
        splitToneShadowsStrength: cleanBase.splitToneShadowsStrength + cleanExtra.splitToneShadowsStrength,
        splitToneMidtonesHue: cleanExtra.splitToneMidtonesStrength ? cleanExtra.splitToneMidtonesHue : cleanBase.splitToneMidtonesHue,
        splitToneMidtonesStrength: cleanBase.splitToneMidtonesStrength + cleanExtra.splitToneMidtonesStrength,
        splitToneHighlightsHue: cleanExtra.splitToneHighlightsStrength ? cleanExtra.splitToneHighlightsHue : cleanBase.splitToneHighlightsHue,
        splitToneHighlightsStrength: cleanBase.splitToneHighlightsStrength + cleanExtra.splitToneHighlightsStrength,
        splitToneBalance: cleanBase.splitToneBalance + cleanExtra.splitToneBalance,
        rawHighlightRecovery: cleanBase.rawHighlightRecovery + cleanExtra.rawHighlightRecovery,
        rawNoiseReduction: cleanBase.rawNoiseReduction + cleanExtra.rawNoiseReduction,
        lutStrength: cleanExtra.lutStrength,
        curvePoints: (useBaseCurve ? cleanBase.curvePoints : cleanExtra.curvePoints).map((point) => Object.assign({}, point)),
      },
    ));
    QUICK_EDIT_HSL_COLORS.forEach((color) => {
      ['hue', 'saturation', 'luminance'].forEach((field) => {
        const key = 'hsl_' + color.key + '_' + field;
        combined[key] = clamp(Number(cleanBase[key] || 0) + Number(cleanExtra[key] || 0), field === 'hue' ? -60 : -100, field === 'hue' ? 60 : 100);
      });
    });
    return normalizeQuickEditParams(combined);
  }

  function quickEditEffectiveParams() {
    return combineQuickEditParams(state.quickEdit.committedParams || quickEditDefaultParams(), state.quickEdit.params);
  }

  function quickEditEffectivePan() {
    return {
      x: Number(state.quickEdit.panX || 0),
      y: Number(state.quickEdit.panY || 0),
    };
  }

  function quickEditValueText(key, value) {
    const number = Number(value || 0);
    if (key === 'rotation') return Math.round(number) + ' 度';
    if (key === 'straighten') return (number > 0 ? '+' : '') + number.toFixed(1) + ' 度';
    if (key === 'exposure') return (number > 0 ? '+' : '') + number.toFixed(2) + ' EV';
    if (
      key === 'contrast'
      || key === 'highlights'
      || key === 'shadows'
      || key === 'whites'
      || key === 'blacks'
      || key === 'dehaze'
      || key === 'saturation'
      || key === 'vibrance'
      || key === 'clarity'
      || key === 'vignette'
      || key === 'bwRed'
      || key === 'bwYellow'
      || key === 'bwGreen'
      || key === 'bwAqua'
      || key === 'bwBlue'
      || key === 'bwMagenta'
    ) return (number > 0 ? '+' : '') + Math.round(number) + '%';
    if (key === 'sharpening' || key === 'grain' || key === 'blackWhite' || key === 'vignetteFeather') return Math.round(number) + '%';
    if (key === 'temperature') return Math.round(normalizeQuickEditTemperature(number)) + ' K';
    if (key === 'tint') return (number > 0 ? '+' : '') + Math.round(number);
    if (
      key === 'splitToneShadowsHue'
      || key === 'splitToneMidtonesHue'
      || key === 'splitToneHighlightsHue'
    ) return Math.round(number) + ' 度';
    if (
      key === 'splitToneShadowsStrength'
      || key === 'splitToneMidtonesStrength'
      || key === 'splitToneHighlightsStrength'
    ) return Math.round(number) + '%';
    if (key === 'splitToneBalance') return (number > 0 ? '+' : '') + Math.round(number);
    if (key === 'rawHighlightRecovery' || key === 'rawNoiseReduction') return Math.round(number) + '%';
    if (key === 'lutStrength') return Math.round(number) + '%';
    return String(number);
  }

  function quickEditHslColorConfig(key) {
    return QUICK_EDIT_HSL_COLORS.find((color) => color.key === key) || QUICK_EDIT_HSL_COLORS[0];
  }

  function quickEditHslParamKey(field) {
    const color = quickEditHslColorConfig(state.quickEdit.hslColor);
    return 'hsl_' + color.key + '_' + field;
  }

  function quickEditHslColorFromHue(hue) {
    let best = QUICK_EDIT_HSL_COLORS[0];
    let bestDistance = Infinity;
    QUICK_EDIT_HSL_COLORS.forEach((color) => {
      const distance = quickEditHueDistance(hue, color.hue);
      if (distance < bestDistance) {
        best = color;
        bestDistance = distance;
      }
    });
    return best;
  }

  function quickEditHslValueText(field, value) {
    const number = Number(value || 0);
    if (field === 'hue') return (number > 0 ? '+' : '') + Math.round(number);
    return (number > 0 ? '+' : '') + Math.round(number) + '%';
  }

  function quickEditCssHsl(hue, saturation, luminance) {
    const wrappedHue = ((Number(hue || 0) % 360) + 360) % 360;
    const cleanSaturation = clamp(Number(saturation || 0), 0, 100);
    const cleanLuminance = clamp(Number(luminance || 0), 0, 100);
    return 'hsl('
      + Math.round(wrappedHue) + ', '
      + Math.round(cleanSaturation) + '%, '
      + Math.round(cleanLuminance) + '%)';
  }

  function quickEditHslRangeTrack(field, color) {
    const hue = Number(color && color.hue || 0);
    if (field === 'hue') {
      return 'linear-gradient(90deg, '
        + quickEditCssHsl(hue - 60, 84, 56) + ' 0%, '
        + quickEditCssHsl(hue, 84, 56) + ' 50%, '
        + quickEditCssHsl(hue + 60, 84, 56) + ' 100%)';
    }
    if (field === 'saturation') {
      return 'linear-gradient(90deg, '
        + quickEditCssHsl(hue, 0, 56) + ' 0%, '
        + quickEditCssHsl(hue, 62, 56) + ' 52%, '
        + quickEditCssHsl(hue, 100, 56) + ' 100%)';
    }
    if (field === 'luminance') {
      return 'linear-gradient(90deg, '
        + quickEditCssHsl(hue, 78, 12) + ' 0%, '
        + quickEditCssHsl(hue, 78, 52) + ' 50%, '
        + quickEditCssHsl(hue, 82, 88) + ' 100%)';
    }
    return '';
  }

  function quickEditCurvePoints(params) {
    const clean = normalizeQuickEditParams(params);
    return clean.curvePoints.map((point) => Object.assign({}, point));
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

  function quickEditCurveTableValues(params) {
    const values = [];
    for (let i = 0; i <= 32; i += 1) {
      values.push(quickEditCurveOutput(params, i / 32).toFixed(4));
    }
    return values.join(' ');
  }

  function ensureQuickEditCurveFilter(params) {
    const id = 'quick-edit-curve-filter';
    let svg = document.getElementById('quick-edit-filter-defs');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'quick-edit-filter-defs';
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.position = 'absolute';
      svg.style.left = '-9999px';
      svg.innerHTML = [
        '<filter id="' + id + '" color-interpolation-filters="sRGB">',
        '<feComponentTransfer>',
        '<feFuncR type="table" tableValues="0 1"></feFuncR>',
        '<feFuncG type="table" tableValues="0 1"></feFuncG>',
        '<feFuncB type="table" tableValues="0 1"></feFuncB>',
        '</feComponentTransfer>',
        '</filter>',
      ].join('');
      document.body.appendChild(svg);
    }
    const table = quickEditCurveTableValues(params);
    svg.querySelectorAll('[tableValues]').forEach((node) => {
      node.setAttribute('tableValues', table);
    });
    return id;
  }

  function quickEditPreviewFilter(params) {
    const pixelParams = quickEditPixelParamsForCurrentSource(params);
    const exposureBrightness = Math.pow(2, pixelParams.exposure);
    const saturation = Math.max(0, 100 + pixelParams.saturation);
    const filters = [
      'brightness(' + exposureBrightness.toFixed(4) + ')',
      'saturate(' + saturation.toFixed(2) + '%)',
    ];
    if (!isQuickEditCurveNeutral(pixelParams)) {
      filters.push('url(#' + ensureQuickEditCurveFilter(pixelParams) + ')');
    }
    return filters.join(' ');
  }

  function applyQuickEditCurveToCanvas(canvas, params) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('无法读取快速调整预览画布');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyQuickEditPixelAdjustments(data.data, quickEditPixelParamsForCurrentSource(params), canvas.width, canvas.height);
    ctx.putImageData(data, 0, 0);
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
    const diff = Math.abs((((a - b) % 360) + 540) % 360 - 180);
    return diff;
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

  function quickEditActiveLuts(luts) {
    const source = arguments.length ? luts : state.quickEdit.luts;
    return (source || [])
      .map((lut) => normalizeQuickEditLut(lut))
      .filter((lut) => lut && lut.data && lut.size && Number(lut.strength || 0) > 0)
      .map((lut) => ({
        lut: quickEditPrepareLut(lut),
        strength: clamp(Number(lut.strength || 0), 0, 100) / 100,
      }));
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

  function quickEditToneChannel(value, amount, weight) {
    const strength = clamp(Number(amount || 0) / 100, -1, 1) * clamp(Number(weight || 0), 0, 1);
    if (!strength) return value;
    return strength > 0
      ? value + (255 - value) * strength * 0.72
      : value + value * strength * 0.72;
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
    const packed = quickEditHslToPackedRgb(hsl.h, clamp(hsl.s * factor, 0, 1), hsl.l);
    return packed;
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

  function applyQuickEditSharpening(pixels, width, height, sharpening) {
    const amount = clamp(Number(sharpening || 0), 0, 100) / 100;
    const w = Math.max(1, Math.round(Number(width || 0)));
    const h = Math.max(1, Math.round(Number(height || 0)));
    if (!amount || w < 3 || h < 3 || pixels.length < w * h * 4) return;
    const source = new Uint8ClampedArray(pixels);
    const row = w * 4;
    const strength = amount * 1.25;
    const threshold = 1 + amount * 3;
    for (let y = 1; y < h - 1; y += 1) {
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
  }

  function applyQuickEditClarity(pixels, width, height, clarity) {
    const amount = clamp(Number(clarity || 0), -100, 100) / 100;
    const w = Math.max(1, Math.round(Number(width || 0)));
    const h = Math.max(1, Math.round(Number(height || 0)));
    if (!amount || w < 3 || h < 3 || pixels.length < w * h * 4) return;
    const source = new Uint8ClampedArray(pixels);
    const row = w * 4;
    const strength = amount * 0.92;
    const threshold = amount > 0 ? 1.5 : 0;
    for (let y = 1; y < h - 1; y += 1) {
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
  }

  function quickEditGrainNoise(x, y, seed) {
    let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(seed + 1, 224682251);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return (((value ^ (value >>> 16)) >>> 0) / 2147483647.5) - 1;
  }

  function applyQuickEditGrain(pixels, width, height, grain) {
    const amount = clamp(Number(grain || 0), 0, 100) / 100;
    const w = Math.max(1, Math.round(Number(width || 0)));
    const h = Math.max(1, Math.round(Number(height || 0)));
    if (!amount || w < 1 || h < 1 || pixels.length < w * h * 4) return;
    const strength = amount * 28;
    const seed = Math.round(amount * 997);
    for (let y = 0; y < h; y += 1) {
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
  }

  function applyQuickEditDetailEffects(pixels, width, height, clean) {
    applyQuickEditClarity(pixels, width, height, clean.clarity);
    applyQuickEditSharpening(pixels, width, height, clean.sharpening);
    applyQuickEditGrain(pixels, width, height, clean.grain);
  }

  function applyQuickEditPixelAdjustments(pixels, params, width, height) {
    const clean = normalizeQuickEditParams(params);
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
    const activeLuts = quickEditActiveLuts(
      params && Array.isArray(params.luts) ? params.luts : state.quickEdit.luts,
    );
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
      applyQuickEditDetailEffects(pixels, width, height, clean);
      return;
    }
    for (let i = 0; i < pixels.length; i += 4) {
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
    applyQuickEditDetailEffects(pixels, width, height, clean);
  }

  function applyQuickEditPixelStages(pixels, params, width, height) {
    const stages = params && Array.isArray(params.stages) && params.stages.length
      ? params.stages
      : [params || {}];
    stages.forEach((stage) => applyQuickEditPixelAdjustments(pixels, stage, width, height));
  }

  function quickEditSourceUrl(photo, cachedPhoto) {
    return PS.lightboxSourceUrl(photo, cachedPhoto);
  }

  function quickEditUsesPhotoImageBasis() {
    const src = String(state.quickEdit.sourceSrc || '');
    return !!state.quickEdit.photo && !/^data:/i.test(src) && !/^blob:/i.test(src);
  }

  function quickEditImageBasis(fallbackWidth, fallbackHeight) {
    const rawWidth = Number(fallbackWidth || 0);
    const rawHeight = Number(fallbackHeight || 0);
    if (!quickEditUsesPhotoImageBasis()) {
      return { width: rawWidth, height: rawHeight };
    }
    const basis = PS.lightboxImageBasis(state.quickEdit.photo, rawWidth, rawHeight);
    const basisWidth = Number(basis.width);
    const basisHeight = Number(basis.height);
    if (
      quickEditIsRawPhoto()
      && (!Number.isFinite(basisWidth) || !Number.isFinite(basisHeight) || basisWidth <= 1 || basisHeight <= 1)
      && Number(state.quickEdit.rawPreviewWidth || 0) > 0
      && Number(state.quickEdit.rawPreviewHeight || 0) > 0
    ) {
      return {
        width: Number(state.quickEdit.rawPreviewWidth || rawWidth),
        height: Number(state.quickEdit.rawPreviewHeight || rawHeight),
      };
    }
    return basis;
  }

  function quickEditSourceNeedsOrientationTransform(source, basis) {
    if (!quickEditUsesPhotoImageBasis() || !PS.orientationSwapsSize(state.quickEdit.photo && state.quickEdit.photo.orientation)) {
      return false;
    }
    const sourceWidth = Number(source && (source.naturalWidth || source.width) || 0);
    const sourceHeight = Number(source && (source.naturalHeight || source.height) || 0);
    const basisWidth = Number(basis && basis.width || 0);
    const basisHeight = Number(basis && basis.height || 0);
    if (sourceWidth <= 1 || sourceHeight <= 1 || basisWidth <= 1 || basisHeight <= 1) return false;
    return (sourceWidth >= sourceHeight) !== (basisWidth >= basisHeight);
  }

  function quickEditDisplayFitSize(width, height) {
    const rawWidth = Math.max(1, Number(width || 1));
    const rawHeight = Math.max(1, Number(height || 1));
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    const rect = stage ? stage.getBoundingClientRect() : null;
    if (!rect || rect.width <= 1 || rect.height <= 1) {
      return { width: rawWidth, height: rawHeight };
    }
    const maxWidth = Math.max(1, rect.width - 44);
    const maxHeight = Math.max(1, rect.height - 44);
    const scale = Math.min(maxWidth / rawWidth, maxHeight / rawHeight);
    return {
      width: Math.max(1, rawWidth * scale),
      height: Math.max(1, rawHeight * scale),
    };
  }

  function quickEditFramePreviewSpaceRatio(width, height) {
    const imageWidth = Math.max(1, Number(width || 1));
    const imageHeight = Math.max(1, Number(height || 1));
    const preset = quickEditFramePresetKey(state.quickEdit.framePreset);
    if (preset === 'none') return { width: 1, height: 1 };
    const config = quickEditFrameExportConfig(preset);
    const insets = quickEditNormalizeFrameInsets(config ? config.insets : null);
    const basis = Math.max(1, Math.min(imageWidth, imageHeight));
    return {
      width: (imageWidth + basis * (insets.left + insets.right) / 100) / imageWidth,
      height: (imageHeight + basis * (insets.top + insets.bottom) / 100) / imageHeight,
    };
  }

  function setQuickEditImageDisplayBasis(img, width, height) {
    if (!img) return;
    const el = state.quickEdit.el;
    const w = Number(width || 0);
    const h = Number(height || 0);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 1 || h <= 1) {
      img.style.removeProperty('width');
      img.style.removeProperty('height');
      img.style.removeProperty('aspect-ratio');
      const compareImg = el ? el.querySelector('[data-quick-edit-compare-img]') : null;
      const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
      [compareImg, framePreview].forEach((node) => {
        if (!node) return;
        node.style.removeProperty('width');
        node.style.removeProperty('height');
        node.style.removeProperty('aspect-ratio');
      });
      return;
    }
    const frameRatio = quickEditFramePreviewSpaceRatio(w, h);
    const fit = quickEditDisplayFitSize(w * frameRatio.width, h * frameRatio.height);
    const imageScale = Math.min(
      fit.width / Math.max(1, w * frameRatio.width),
      fit.height / Math.max(1, h * frameRatio.height),
    );
    img.style.width = Math.max(1, w * imageScale).toFixed(2) + 'px';
    img.style.height = Math.max(1, h * imageScale).toFixed(2) + 'px';
    img.style.aspectRatio = Math.round(w) + ' / ' + Math.round(h);
    state.quickEdit.displayBasisReady = true;
    state.quickEdit.displayBasisWidth = Number.parseFloat(img.style.width);
    state.quickEdit.displayBasisHeight = Number.parseFloat(img.style.height);
    const compareImg = el ? el.querySelector('[data-quick-edit-compare-img]') : null;
    if (compareImg) {
      compareImg.style.width = img.style.width;
      compareImg.style.height = img.style.height;
      compareImg.style.aspectRatio = img.style.aspectRatio;
    }
    const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
    if (framePreview) {
      framePreview.style.width = img.style.width;
      framePreview.style.height = img.style.height;
      framePreview.style.aspectRatio = img.style.aspectRatio;
    }
  }

  function quickEditDisplayBasisSize(img) {
    const storedWidth = Number(state.quickEdit.displayBasisWidth || 0);
    const storedHeight = Number(state.quickEdit.displayBasisHeight || 0);
    if (state.quickEdit.displayBasisReady && storedWidth > 1 && storedHeight > 1) {
      return { width: storedWidth, height: storedHeight };
    }
    return {
      width: Math.max(1, Number.parseFloat(img && img.style.width || '') || Number(img && img.offsetWidth || 1)),
      height: Math.max(1, Number.parseFloat(img && img.style.height || '') || Number(img && img.offsetHeight || 1)),
    };
  }

  function enforceQuickEditDisplayBasis(img) {
    if (!img || !state.quickEdit.displayBasisReady) return quickEditDisplayBasisSize(img);
    const basis = quickEditDisplayBasisSize(img);
    const actualWidth = Number(img.offsetWidth || 0);
    const actualHeight = Number(img.offsetHeight || 0);
    if (Math.abs(actualWidth - basis.width) > 0.5 || Math.abs(actualHeight - basis.height) > 0.5) {
      console.warn('[PicScannerFrameGeometry] corrected divergent image display basis', {
        actual: { width: actualWidth, height: actualHeight },
        expected: basis,
        source: String(img.currentSrc || img.src || '').slice(0, 160),
      });
    }
    img.style.width = basis.width.toFixed(2) + 'px';
    img.style.height = basis.height.toFixed(2) + 'px';
    const el = state.quickEdit.el;
    const compareImg = el ? el.querySelector('[data-quick-edit-compare-img]') : null;
    if (compareImg) {
      compareImg.style.width = img.style.width;
      compareImg.style.height = img.style.height;
      compareImg.style.aspectRatio = img.style.aspectRatio;
    }
    return basis;
  }

  function refreshQuickEditImageDisplayBasis() {
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    if (!img || !PS.imageHasSource(img)) return;
    const basis = quickEditImageBasis(img.naturalWidth || img.width, img.naturalHeight || img.height);
    setQuickEditImageDisplayBasis(img, basis.width, basis.height);
    if (!isQuickEditCropToolActive()) {
      fitQuickEditCommittedOutput({ force: true, silent: true });
      applyQuickEditPreview({ skipOverlay: true, skipColorRender: true });
    }
    refreshQuickEditPanController();
    syncQuickEditFramePreview();
  }

  function resetQuickEditRenderedPreview() {
    state.quickEdit.previewRenderedSignature = '';
    state.quickEdit.previewRenderedMaxSide = 0;
    clearQuickEditPendingPreviewRender();
    clearQuickEditQueuedPreviewRender();
  }

  function invalidateQuickEditRenderedPreview(options) {
    const opts = options || {};
    if (opts.clearTimers) {
      clearTimeout(state.quickEdit.previewRenderTimer);
      clearTimeout(state.quickEdit.previewSettleTimer);
      clearQuickEditOriginalPreviewTimer();
      state.quickEdit.previewRenderTimer = null;
      state.quickEdit.previewSettleTimer = null;
    }
    if (opts.cancelWorker !== false) cancelQuickEditPreviewWorker();
    state.quickEdit.previewRenderToken += 1;
    state.quickEdit.previewRenderKey = '';
    state.quickEdit.previewRenderRequestSignature = '';
    setQuickEditPreviewRendering(false);
    resetQuickEditRenderedPreview();
  }

  function revokeQuickEditPreviewObjectUrl() {
    const url = String(state.quickEdit.previewObjectUrl || '');
    if (!url) return;
    state.quickEdit.previewObjectUrl = '';
    URL.revokeObjectURL(url);
  }

  function setQuickEditImageSource(img, src, options) {
    const opts = options || {};
    const deferDisplay = !!opts.deferDisplay;
    state.quickEdit.sourceSrc = String(src || '');
    quickEditPerfLog('source:set', {
      hasObjectPreview: /^blob:/i.test(String(img && img.src || '')),
      deferred: deferDisplay,
      nextKind: /^blob:/i.test(state.quickEdit.sourceSrc) ? 'blob' : 'source',
      nextLength: state.quickEdit.sourceSrc.length,
    });
    invalidateQuickEditRenderedPreview({ clearTimers: true });
    if (!deferDisplay) revokeQuickEditPreviewObjectUrl();
    state.quickEdit.sourceImageSrc = '';
    state.quickEdit.sourceImage = null;
    state.quickEdit.sourceImagePromise = null;
    if (img) {
      if (!opts.preserveDisplayBasis && !state.quickEdit.displayBasisReady) setQuickEditImageDisplayBasis(img, 0, 0);
      if (!deferDisplay) img.src = state.quickEdit.sourceSrc;
    }
  }

  function quickEditOriginalCompareUrl() {
    const photo = state.quickEdit.photo || {};
    const cachedPhoto = state.photoCache.get(Number(photo.id || 0)) || {};
    const sourceSrc = String(state.quickEdit.sourceSrc || '');
    if (sourceSrc) return sourceSrc;
    return String(photo.preview_url || cachedPhoto.preview_url || '');
  }

  function showQuickEditOriginalCompare() {
    if (!state.quickEdit.open || state.quickEdit.compareOriginalActive) return false;
    const el = state.quickEdit.el;
    const overlay = el ? el.querySelector('[data-quick-edit-compare-img]') : null;
    const originalUrl = quickEditOriginalCompareUrl();
    if (!overlay || !originalUrl) {
      console.warn('[PicScanner] 快速调整原图对比缺少可显示的缩略图', {
        photoId: state.quickEdit.photo && state.quickEdit.photo.id,
        sourceReady: !!state.quickEdit.sourceSrc,
      });
      return false;
    }
    state.quickEdit.compareOriginalActive = true;
    if (overlay.src !== originalUrl) overlay.src = originalUrl;
    applyQuickEditPreview({ skipColorRender: true, skipOverlay: true });
    overlay.classList.remove('hidden');
    return true;
  }

  function hideQuickEditOriginalCompare() {
    if (!state.quickEdit.compareOriginalActive) return;
    const el = state.quickEdit.el;
    const overlay = el ? el.querySelector('[data-quick-edit-compare-img]') : null;
    state.quickEdit.compareOriginalActive = false;
    if (overlay) overlay.classList.add('hidden');
    applyQuickEditPreview();
  }

  function clearQuickEditRawPreviewTimer() {
    clearTimeout(state.quickEdit.rawPreviewTimer);
    state.quickEdit.rawPreviewTimer = null;
  }

  function clearQuickEditRawOriginalPreviewTimer() {
    clearTimeout(state.quickEdit.rawPreviewOriginalTimer);
    state.quickEdit.rawPreviewOriginalTimer = null;
    state.quickEdit.rawPreviewOriginalSignature = '';
  }

  function resetQuickEditRawPreviewState(options) {
    const opts = options || {};
    clearQuickEditRawPreviewTimer();
    clearQuickEditRawOriginalPreviewTimer();
    state.quickEdit.rawPreviewLoading = false;
    state.quickEdit.rawPreviewSignature = '';
    state.quickEdit.rawPreviewUrl = '';
    state.quickEdit.rawPreviewWidth = 0;
    state.quickEdit.rawPreviewHeight = 0;
    state.quickEdit.rawPreviewPendingMaxSide = 0;
    state.quickEdit.rawPreviewRenderedMaxSide = 0;
    state.quickEdit.rawPreviewDesiredSignature = '';
    state.quickEdit.rawPreviewInFlight = false;
    state.quickEdit.rawPreviewInFlightSignature = '';
    state.quickEdit.rawPreviewQueuedSignature = '';
    state.quickEdit.rawPreviewQueuedOptions = null;
    if (!opts.keepToken) state.quickEdit.rawPreviewToken += 1;
  }

  function quickEditRawPreviewCacheKey(photoId, rawSignature) {
    return Number(photoId || 0) + '|' + String(rawSignature || '');
  }

  function rememberQuickEditRawPreview(photoId, rawSignature, signature, maxSide, response) {
    const url = String(response && response.url || '');
    if (!photoId || !rawSignature || !url) return null;
    const cache = state.quickEdit.rawPreviewCache;
    const key = quickEditRawPreviewCacheKey(photoId, rawSignature);
    const next = {
      photoId: Number(photoId),
      rawSignature: String(rawSignature),
      signature: String(signature),
      maxSide: Number(maxSide || 0),
      url,
      width: Math.max(0, Number(response.width || 0)),
      height: Math.max(0, Number(response.height || 0)),
    };
    const current = cache.get(key);
    const rank = (entry) => (entry && Number(entry.maxSide || 0) <= 0 ? Number.MAX_SAFE_INTEGER : Number(entry && entry.maxSide || 0));
    if (!current || rank(next) >= rank(current)) cache.set(key, next);
    while (cache.size > 64) cache.delete(cache.keys().next().value);
    return cache.get(key) || next;
  }

  function cachedQuickEditRawPreview(photoId, rawSignature, requestedMaxSide) {
    const entry = state.quickEdit.rawPreviewCache.get(quickEditRawPreviewCacheKey(photoId, rawSignature));
    if (!entry || !entry.url) return null;
    const cachedSide = Number(entry.maxSide || 0);
    const requestedSide = Number(requestedMaxSide || 0);
    if (requestedSide <= 0 && cachedSide > 0) return null;
    if (requestedSide > 0 && cachedSide > 0 && cachedSide < requestedSide) return null;
    return entry;
  }

  function displayCachedQuickEditRawPreview(entry, img) {
    if (!entry || !img) return false;
    state.quickEdit.rawPreviewSignature = String(entry.signature || '');
    state.quickEdit.rawPreviewUrl = String(entry.url || '');
    state.quickEdit.rawPreviewWidth = Math.max(0, Number(entry.width || 0));
    state.quickEdit.rawPreviewHeight = Math.max(0, Number(entry.height || 0));
    state.quickEdit.rawPreviewPendingMaxSide = 0;
    state.quickEdit.rawPreviewRenderedMaxSide = Number(entry.maxSide || 0);
    setQuickEditRawPreviewLoading(false);
    setQuickEditImageSource(img, entry.url, { preserveDisplayBasis: true });
    renderQuickEditMeta(state.quickEdit.photo, 'ready');
    applyQuickEditPreview();
    scheduleQuickEditHistogramRender(120);
    return true;
  }

  function setQuickEditRawPreviewLoading(loading) {
    state.quickEdit.rawPreviewLoading = !!loading;
    setQuickEditLoading(loading);
    if (state.quickEdit.photo) renderQuickEditMeta(state.quickEdit.photo, loading ? 'raw-developing' : 'ready');
  }

  function scheduleQuickEditRawDevelopPreview(options) {
    if (!state.quickEdit.open || !quickEditIsRawPhoto() || state.quickEdit.bakedSource) return;
    const opts = options || {};
    const request = quickEditRawPreviewRequest(opts);
    if (!request) return;
    const delayMs = Number.isFinite(Number(opts.delayMs))
      ? Math.max(0, Number(opts.delayMs))
      : (opts.interactive ? 220 : 80);
    state.quickEdit.rawPreviewDesiredSignature = request.requestSignature;
    state.quickEdit.rawPreviewPendingMaxSide = request.maxSide;
    clearQuickEditRawPreviewTimer();
    clearQuickEditRawOriginalPreviewTimer();
    if (state.quickEdit.rawPreviewInFlight) {
      if (!opts.force && state.quickEdit.rawPreviewInFlightSignature === request.requestSignature) {
        setQuickEditRawPreviewLoading(true);
        return;
      }
      queueQuickEditRawDevelopPreview(request);
      return;
    }
    state.quickEdit.rawPreviewTimer = setTimeout(() => {
      state.quickEdit.rawPreviewTimer = null;
      requestQuickEditRawDevelopPreview(opts);
    }, delayMs);
  }

  function quickEditRawPreviewMaxSide(value) {
    const side = Number(value);
    if (Number.isFinite(side) && side <= 0) return 0;
    return Math.max(720, Math.min(4096, Number.isFinite(side) ? side : 2400));
  }

  function quickEditRawPreviewRequest(options) {
    if (!state.quickEdit.open || !quickEditIsRawPhoto()) return null;
    const opts = Object.assign({}, options || {});
    const photo = state.quickEdit.photo || {};
    const photoId = Number(photo.id || 0);
    if (!photoId) return null;
    const params = quickEditRawDevelopParams(quickEditEffectiveParams());
    const requestedMaxSide = Object.prototype.hasOwnProperty.call(opts, 'maxSide')
      ? opts.maxSide
      : QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE;
    const maxSide = quickEditRawPreviewMaxSide(requestedMaxSide);
    const rawSignature = quickEditRawDevelopSignature(params);
    const signature = rawSignature + '|preview|' + maxSide;
    return {
      opts,
      photo,
      photoId,
      params,
      maxSide,
      rawSignature,
      signature,
      requestSignature: photoId + '|' + signature,
    };
  }

  function clearQuickEditQueuedRawPreview() {
    state.quickEdit.rawPreviewQueuedSignature = '';
    state.quickEdit.rawPreviewQueuedOptions = null;
  }

  function queueQuickEditRawDevelopPreview(request) {
    if (!request) return false;
    state.quickEdit.rawPreviewDesiredSignature = request.requestSignature;
    state.quickEdit.rawPreviewPendingMaxSide = request.maxSide;
    state.quickEdit.rawPreviewQueuedSignature = request.requestSignature;
    state.quickEdit.rawPreviewQueuedOptions = Object.assign({}, request.opts, { maxSide: request.maxSide });
    setQuickEditRawPreviewLoading(true);
    return true;
  }

  function flushQueuedQuickEditRawDevelopPreview() {
    const queuedSignature = String(state.quickEdit.rawPreviewQueuedSignature || '');
    const queuedOptions = state.quickEdit.rawPreviewQueuedOptions;
    if (!queuedSignature || !queuedOptions) return false;
    clearQuickEditQueuedRawPreview();
    requestAnimationFrame(() => {
      if (!state.quickEdit.open || !quickEditIsRawPhoto()) return;
      requestQuickEditRawDevelopPreview(queuedOptions);
    });
    return true;
  }

  function scheduleQuickEditRawOriginalDevelopPreview(rawSignature) {
    const signature = String(rawSignature || '');
    if (!state.quickEdit.open || !quickEditIsRawPhoto() || !signature) return;
    const fullSignature = signature + '|preview|0';
    if (state.quickEdit.rawPreviewSignature === fullSignature && state.quickEdit.sourceSrc === state.quickEdit.rawPreviewUrl) return;
    if (
      state.quickEdit.rawPreviewOriginalTimer
      && state.quickEdit.rawPreviewOriginalSignature === signature
    ) {
      return;
    }
    clearQuickEditRawOriginalPreviewTimer();
    state.quickEdit.rawPreviewOriginalSignature = signature;
    state.quickEdit.rawPreviewOriginalTimer = setTimeout(() => {
      state.quickEdit.rawPreviewOriginalTimer = null;
      state.quickEdit.rawPreviewOriginalSignature = '';
      if (!state.quickEdit.open || !quickEditIsRawPhoto()) return;
      if (quickEditRawDevelopSignature(quickEditEffectiveParams()) !== signature) return;
      requestQuickEditRawDevelopPreview({ maxSide: 0, original: true });
    }, QUICK_EDIT_RAW_ORIGINAL_PREVIEW_DELAY_MS);
  }

  function requestQuickEditRawDevelopPreview(options) {
    const request = quickEditRawPreviewRequest(options);
    if (!request) return Promise.resolve(false);
    const { opts, photo, photoId, params, maxSide, rawSignature, signature, requestSignature } = request;
    if (
      !opts.force
      && state.quickEdit.rawPreviewSignature === signature
      && state.quickEdit.rawPreviewUrl
      && state.quickEdit.sourceSrc === state.quickEdit.rawPreviewUrl
    ) {
      if (maxSide > 0) {
        scheduleQuickEditRawOriginalDevelopPreview(rawSignature);
      }
      return Promise.resolve(true);
    }
    const cachedPreview = cachedQuickEditRawPreview(photoId, rawSignature, maxSide);
    const cachedImg = state.quickEdit.el ? state.quickEdit.el.querySelector('[data-quick-edit-img]') : null;
    if (cachedPreview && cachedImg && displayCachedQuickEditRawPreview(cachedPreview, cachedImg)) {
      if (maxSide > 0 && Number(cachedPreview.maxSide || 0) > 0) {
        scheduleQuickEditRawOriginalDevelopPreview(rawSignature);
      }
      return Promise.resolve(true);
    }
    state.quickEdit.rawPreviewDesiredSignature = requestSignature;
    if (state.quickEdit.rawPreviewInFlight) {
      if (!opts.force && state.quickEdit.rawPreviewInFlightSignature === requestSignature) {
        state.quickEdit.rawPreviewPendingMaxSide = maxSide;
        setQuickEditRawPreviewLoading(true);
        return Promise.resolve(true);
      }
      queueQuickEditRawDevelopPreview(request);
      return Promise.resolve(false);
    }
    const token = ++state.quickEdit.rawPreviewToken;
    state.quickEdit.rawPreviewInFlight = true;
    state.quickEdit.rawPreviewInFlightSignature = requestSignature;
    state.quickEdit.rawPreviewPendingMaxSide = maxSide;
    const isCurrent = () => (
      state.quickEdit.open
      && quickEditIsRawPhoto()
      && token === Number(state.quickEdit.rawPreviewToken || 0)
      && state.quickEdit.photo
      && Number(state.quickEdit.photo.id || 0) === photoId
    );
    const shouldDisplay = () => (
      isCurrent()
      && state.quickEdit.rawPreviewDesiredSignature === requestSignature
      && !state.quickEdit.rawPreviewQueuedSignature
    );
    setQuickEditRawPreviewLoading(true);
    return call('develop_quick_edit_raw_preview', photoId, params, maxSide).then((res) => {
      if (!shouldDisplay()) return false;
      if (!res || !res.success || !res.url) {
        throw new Error(res && res.message ? res.message : 'RAW 显影预览失败');
      }
      const el = ensureQuickEdit();
      const img = el.querySelector('[data-quick-edit-img]');
      state.quickEdit.rawPreviewSignature = signature;
      state.quickEdit.rawPreviewUrl = String(res.url || '');
      state.quickEdit.rawPreviewWidth = Math.max(0, Number(res.width || 0));
      state.quickEdit.rawPreviewHeight = Math.max(0, Number(res.height || 0));
      state.quickEdit.rawPreviewPendingMaxSide = 0;
      state.quickEdit.rawPreviewRenderedMaxSide = maxSide;
      rememberQuickEditRawPreview(photoId, rawSignature, signature, maxSide, res);
      setQuickEditRawPreviewLoading(false);
      if (img) {
        const keepAdjustedPreview = /^blob:/i.test(String(img.src || ''))
          && !isQuickEditAdvancedPixelNeutral(quickEditAdvancedPixelParams(quickEditEffectiveParams()));
        setQuickEditImageSource(img, state.quickEdit.rawPreviewUrl, {
          preserveDisplayBasis: true,
          deferDisplay: keepAdjustedPreview,
        });
      }
      renderQuickEditMeta(state.quickEdit.photo, 'ready');
      applyQuickEditPreview();
      scheduleQuickEditHistogramRender(160);
      if (maxSide > 0) {
        scheduleQuickEditRawOriginalDevelopPreview(rawSignature);
      }
      return true;
    }).catch((err) => {
      if (!shouldDisplay()) return false;
      state.quickEdit.rawPreviewPendingMaxSide = 0;
      setQuickEditRawPreviewLoading(false);
      console.warn('[PicScanner] RAW 显影预览失败', {
        photoId,
        filename: photo.filename || '',
        path: photo.path || '',
        params,
        error: err,
      });
      showToast('RAW 显影预览失败，详情见控制台', 'error');
      return false;
    }).finally(() => {
      if (state.quickEdit.rawPreviewInFlightSignature === requestSignature) {
        state.quickEdit.rawPreviewInFlight = false;
        state.quickEdit.rawPreviewInFlightSignature = '';
      }
      const flushed = flushQueuedQuickEditRawDevelopPreview();
      if (
        !flushed
        && !state.quickEdit.rawPreviewTimer
        && state.quickEdit.rawPreviewDesiredSignature === requestSignature
      ) {
        state.quickEdit.rawPreviewPendingMaxSide = 0;
        setQuickEditRawPreviewLoading(false);
      }
    });
  }

  function quickEditPixelSignature(params) {
    return JSON.stringify(quickEditWorkerPixelStages(params).map((stage) => ({
      params: normalizeQuickEditParams(stage),
      luts: (stage.luts || []).map((lut) => ({
        id: String(lut && lut.id || ''),
        size: Number(lut && lut.size || 0),
        strength: Number(lut && lut.strength || 0),
        domainMin: Array.isArray(lut && lut.domainMin) ? lut.domainMin.slice(0, 3) : [0, 0, 0],
        domainMax: Array.isArray(lut && lut.domainMax) ? lut.domainMax.slice(0, 3) : [1, 1, 1],
      })),
    })));
  }

  function quickEditAdvancedPixelParams(params) {
    const clean = quickEditPixelParamsForCurrentSource(params);
    clean.exposure = 0;
    clean.saturation = 0;
    clean.curvePoints = QUICK_EDIT_DEFAULT_CURVE_POINTS.map((point) => Object.assign({}, point));
    return clean;
  }

  function isQuickEditAdvancedPixelNeutral(params) {
    const clean = quickEditPixelParamsForCurrentSource(params);
    if (
      clean.highlights
      || clean.shadows
      || clean.contrast
      || clean.whites
      || clean.blacks
      || clean.dehaze
      || clean.vibrance
      || clean.clarity
      || clean.sharpening
      || clean.grain
      || clean.vignette
      || clean.blackWhite
      || clean.temperature !== QUICK_EDIT_TEMPERATURE_NEUTRAL_K
      || clean.tint
      || quickEditSplitToneActive(clean)
      || !isQuickEditCurveNeutral(clean)
    ) return false;
    return !hasQuickEditHslAdjustments(clean) && !quickEditActiveLuts().length;
  }

  function parseQuickEditCube(textValue, filename, options) {
    const opts = options || {};
    const text = String(textValue || '');
    const name = String(filename || 'LUT').trim() || 'LUT';
    const values = [];
    let title = '';
    const comments = [];
    let size = 0;
    let domainMin = [0, 0, 0];
    let domainMax = [1, 1, 1];
    text.split(/\r?\n/).forEach((rawLine) => {
      const line = String(rawLine || '').trim();
      if (!line) return;
      if (line.startsWith('#')) {
        comments.push(line);
        const titleMatch = line.match(/^#\s*title\s*:\s*(.+)$/i);
        if (titleMatch && !title) title = String(titleMatch[1] || '').trim();
        return;
      }
      const parts = line.split(/\s+/);
      const key = String(parts[0] || '').toUpperCase();
      if (key === 'TITLE') {
        const match = line.match(/^TITLE\s+"?(.+?)"?$/i);
        title = match ? String(match[1] || '').trim() : title;
        return;
      }
      if (key === 'LUT_3D_SIZE') {
        size = Math.max(0, Math.floor(Number(parts[1] || 0)));
        return;
      }
      if (key === 'DOMAIN_MIN' || key === 'DOMAIN_MAX') {
        const next = parts.slice(1, 4).map((part) => Number(part));
        if (next.length === 3 && next.every((value) => Number.isFinite(value))) {
          if (key === 'DOMAIN_MIN') domainMin = next;
          else domainMax = next;
        }
        return;
      }
      if (/^[A-Z_]+$/i.test(key)) return;
      const rgb = parts.slice(0, 3).map((part) => Number(part));
      if (rgb.length === 3 && rgb.every((value) => Number.isFinite(value))) {
        values.push(clamp(rgb[0], 0, 1), clamp(rgb[1], 0, 1), clamp(rgb[2], 0, 1));
      }
    });
    if (!size || size < 2) throw new Error('LUT 缺少有效的 LUT_3D_SIZE');
    const expected = size * size * size * 3;
    if (values.length !== expected) {
      throw new Error('LUT 数据数量不匹配，期望 ' + expected / 3 + ' 行，实际 ' + values.length / 3 + ' 行');
    }
    const marker = [name, title, comments.join(' ')].join(' ').toLowerCase();
    const isLogTransform = /\bflog2c_to_|\bflog2_to_|\bflog_to_|f-log2c|f-log2|f-log/.test(marker);
    const displayName = String(opts.name || name).trim() || name;
    const displayTitle = String(title || opts.title || displayName).trim() || displayName;
    return {
      id: String(opts.id || (name + ':' + size + ':' + values.length + ':' + Date.now())),
      libraryId: String(opts.libraryId || opts.id || ''),
      name: displayName,
      title: displayTitle,
      size,
      domainMin,
      domainMax,
      inputKind: isLogTransform ? 'log' : 'display',
      warning: isLogTransform ? 'Log 转换 LUT：普通照片建议低强度，和相机内 RAW 胶片模拟不同' : '',
      recommendedStrength: isLogTransform ? 30 : 100,
      data: new Float32Array(values),
    };
  }

  function normalizeQuickEditLutLibraryItem(item) {
    const raw = item && typeof item === 'object' ? item : {};
    const id = String(raw.id || '').trim();
    if (!id) return null;
    const title = String(raw.title || raw.name || id).trim() || id;
    return {
      id,
      title,
      name: String(raw.name || title).trim() || title,
      bytes: Math.max(0, Number(raw.bytes || 0)),
      modifiedAt: Math.max(0, Number(raw.modified_at || 0)),
    };
  }

  function quickEditFormatBytes(value) {
    let size = Math.max(0, Number(value || 0));
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return index === 0 ? Math.round(size) + ' ' + units[index] : size.toFixed(1) + ' ' + units[index];
  }

  function quickEditIconSvg(name) {
    const attrs = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
    const icons = {
      check: '<svg ' + attrs + '><path d="M20 6 9 17l-5-5"/></svg>',
      close: '<svg ' + attrs + '><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>',
      chevron: '<svg ' + attrs + '><path d="m6 9 6 6 6-6"/></svg>',
      import: '<svg ' + attrs + '><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
      export: '<svg ' + attrs + '><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></svg>',
      refresh: '<svg ' + attrs + '><path d="M20 11a8 8 0 0 0-14.5-4.7L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.7L20 16"/><path d="M20 20v-4h-4"/></svg>',
      plus: '<svg ' + attrs + '><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
      save: '<svg ' + attrs + '><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>',
      trash: '<svg ' + attrs + '><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>',
      pipette: '<svg ' + attrs + '><path d="m14.5 5.5 4 4"/><path d="M12 8 5 15v4h4l7-7"/><path d="m14 4 6 6"/><path d="m5 19-2 2"/></svg>',
      library: '<svg ' + attrs + '><path d="M4 19.5V5a2 2 0 0 1 2-2h11"/><path d="M8 7h12v14H8z"/><path d="M12 11h4"/></svg>',
      copy: '<svg ' + attrs + '><rect x="9" y="9" width="10" height="10" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    };
    return icons[name] || '';
  }

  function quickEditLutKey(lut) {
    return String(lut && (lut.libraryId || lut.id) || '').trim();
  }

  function quickEditNormalizeLutStrength(value, lut) {
    const source = value === undefined || value === null || value === ''
      ? (lut && lut.recommendedStrength !== undefined ? lut.recommendedStrength : 100)
      : value;
    return clamp(Math.round(Number(source || 0)), 0, 100);
  }

  function normalizeQuickEditLut(lut) {
    if (!lut || typeof lut !== 'object') return null;
    const id = quickEditLutKey(lut);
    if (!id) return null;
    const next = Object.assign({}, lut);
    next.id = String(lut.id || id);
    next.libraryId = String(lut.libraryId || id);
    next.title = String(lut.title || lut.name || id).trim() || id;
    next.name = String(lut.name || next.title).trim() || next.title;
    next.strength = quickEditNormalizeLutStrength(lut.strength, lut);
    return next;
  }

  function quickEditSetLuts(luts) {
    const seen = new Set();
    state.quickEdit.luts = (Array.isArray(luts) ? luts : [])
      .map((lut) => normalizeQuickEditLut(lut))
      .filter((lut) => {
        if (!lut) return false;
        const key = quickEditLutKey(lut);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    state.quickEdit.lut = state.quickEdit.luts[0] || null;
  }

  function quickEditEnabledLuts() {
    quickEditSetLuts(state.quickEdit.luts || []);
    return state.quickEdit.luts;
  }

  function quickEditEnabledLutById(lutId) {
    const id = String(lutId || '').trim();
    return quickEditEnabledLuts().find((lut) => quickEditLutKey(lut) === id) || null;
  }

  function quickEditLutLibraryItemById(lutId) {
    const id = String(lutId || '').trim();
    return (state.quickEdit.lutLibrary || []).find((item) => item.id === id) || null;
  }

  function quickEditLutLibraryCountText() {
    const count = (state.quickEdit.lutLibrary || []).length;
    return count ? '库中 ' + count + ' 个' : '库为空';
  }

  function syncQuickEditLutUi() {
    const el = state.quickEdit.el;
    if (el) syncQuickEditLutSide(el);
    syncQuickEditLutModal();
  }

  function syncQuickEditLutSide(el) {
    const trigger = el.querySelector('[data-quick-edit-lut-open]');
    const selected = el.querySelector('[data-quick-edit-lut-selected]');
    const selectedDetail = el.querySelector('[data-quick-edit-lut-selected-detail]');
    const header = el.querySelector('[data-quick-edit-lut-header]');
    const activeList = el.querySelector('[data-quick-edit-lut-active-list]');
    const lutStatus = el.querySelector('[data-quick-edit-lut-status]');
    const luts = quickEditEnabledLuts();
    const activeCount = luts.length;

    if (selected) selected.textContent = activeCount ? ('已启用 ' + activeCount + ' 个 LUT') : '未启用 LUT';
    if (selectedDetail) selectedDetail.textContent = activeCount ? luts.map((lut) => lut.title).join(' / ') : quickEditLutLibraryCountText() + ' · 点击管理';
    if (header) header.textContent = activeCount ? ('已启用 ' + activeCount + ' 个') : quickEditLutLibraryCountText();
    if (trigger) trigger.classList.toggle('active', activeCount > 0);
    if (lutStatus) {
      if (state.quickEdit.lutLibraryMessage) {
        lutStatus.textContent = state.quickEdit.lutLibraryMessage;
        lutStatus.title = state.quickEdit.lutLibraryMessage;
      } else if (activeCount) {
        const warning = luts.map((lut) => lut.warning).find(Boolean);
        lutStatus.textContent = warning || '当前 LUT 会按列表顺序叠加生效';
        lutStatus.title = warning || luts.map((lut) => lut.title).join(' / ');
      } else {
        lutStatus.textContent = '未启用 LUT';
        lutStatus.removeAttribute('title');
      }
    }

    if (!activeList) return;
    if (!activeCount) {
      activeList.innerHTML = '';
      return;
    }
    activeList.innerHTML = luts.map((lut) => [
      '<div class="quick-edit-lut-active-item">',
      '<div class="quick-edit-lut-active-head"><b>' + escapeHtml(lut.title) + '</b><output data-quick-edit-lut-strength-text="' + escapeHtml(quickEditLutKey(lut)) + '">' + escapeHtml(quickEditValueText('lutStrength', quickEditNormalizeLutStrength(lut.strength, lut))) + '</output></div>',
      '<label class="quick-edit-lut-strength"><span>强度</span><input type="range" min="0" max="100" step="1" value="' + quickEditNormalizeLutStrength(lut.strength, lut) + '" style="--quick-edit-lut-strength:' + quickEditNormalizeLutStrength(lut.strength, lut) + '%" data-quick-edit-lut-strength="' + escapeHtml(quickEditLutKey(lut)) + '" /></label>',
      '</div>',
    ].join('')).join('');
  }

  function syncQuickEditLutModal() {
    const modal = state.quickEdit.lutModal;
    if (!modal || !modal.isConnected) return;
    const items = state.quickEdit.lutLibrary || [];
    const enabledList = modal.querySelector('[data-quick-edit-lut-enabled]');
    const disabledList = modal.querySelector('[data-quick-edit-lut-disabled]');
    const count = modal.querySelector('[data-quick-edit-lut-library-count]');
    const enabledCount = modal.querySelector('[data-quick-edit-lut-enabled-count]');
    const disabledCount = modal.querySelector('[data-quick-edit-lut-disabled-count]');
    const message = modal.querySelector('[data-quick-edit-lut-modal-message]');
    const activeLuts = quickEditEnabledLuts();
    const activeIds = new Set(activeLuts.map((lut) => quickEditLutKey(lut)));
    const inactiveItems = items.filter((item) => !activeIds.has(item.id));
    if (count) count.textContent = quickEditLutLibraryCountText();
    if (enabledCount) enabledCount.textContent = activeLuts.length ? activeLuts.length + ' 个已启用' : '未启用';
    if (disabledCount) disabledCount.textContent = inactiveItems.length ? inactiveItems.length + ' 个可启用' : '没有未启用项';
    if (message) message.textContent = state.quickEdit.lutLibraryMessage || '';
    modal.classList.toggle('loading', !!state.quickEdit.lutLibraryLoading);

    if (!enabledList || !disabledList) return;
    if (!activeLuts.length) {
      enabledList.innerHTML = '<div class="quick-edit-lut-modal-empty">右侧会显示已启用 LUT</div>';
    } else {
      enabledList.innerHTML = activeLuts.map((lut) => {
        const id = quickEditLutKey(lut);
        const loading = state.quickEdit.lutDraftLoadingId === id;
        return '<div class="quick-edit-lut-library-item active' + (loading ? ' loading' : '') + '" data-quick-edit-lut-modal-id="' + escapeHtml(id) + '">' +
          '<button class="icon-btn quick-edit-lut-toggle" type="button" title="关闭 LUT" aria-label="关闭 LUT">' + quickEditIconSvg(loading ? 'refresh' : 'check') + '</button>' +
          '<span><b>' + escapeHtml(lut.title) + '</b><em>点击关闭</em></span>' +
          '</div>';
      }).join('');
    }

    if (state.quickEdit.lutLibraryLoading && !items.length) {
      disabledList.innerHTML = '<div class="quick-edit-lut-modal-empty">正在读取 LUT 库</div>';
      return;
    }
    if (!items.length) {
      disabledList.innerHTML = '<div class="quick-edit-lut-modal-empty">暂无 LUT，先导入 .cube</div>';
      return;
    }
    if (!inactiveItems.length) {
      disabledList.innerHTML = '<div class="quick-edit-lut-modal-empty">所有 LUT 都已启用</div>';
      return;
    }
    disabledList.innerHTML = inactiveItems.map((item) => {
      const loading = state.quickEdit.lutDraftLoadingId === item.id;
      return '<div class="quick-edit-lut-library-item' + (loading ? ' loading' : '') + '" data-quick-edit-lut-modal-id="' + escapeHtml(item.id) + '">' +
        '<button class="icon-btn quick-edit-lut-toggle" type="button" title="启用 LUT" aria-label="启用 LUT">' + quickEditIconSvg(loading ? 'refresh' : 'plus') + '</button>' +
        '<span><b>' + escapeHtml(item.title) + '</b><em>点击启用</em></span>' +
        '</div>';
    }).join('');
  }

  async function refreshQuickEditLutLibrary(options) {
    const opts = options || {};
    if (state.quickEdit.lutLibraryLoading) return;
    state.quickEdit.lutLibraryLoading = true;
    state.quickEdit.lutLibraryMessage = '正在读取 LUT 库';
    syncQuickEditLutUi();
    try {
      const res = await call('list_quick_edit_luts');
      if (!res || !res.success) {
        const message = res && res.message ? res.message : 'LUT 库读取失败';
        state.quickEdit.lutLibraryMessage = message;
        if (!opts.silent) showToast(message, 'error');
        return;
      }
      state.quickEdit.lutLibrary = (Array.isArray(res.items) ? res.items : [])
        .map(normalizeQuickEditLutLibraryItem)
        .filter(Boolean);
      state.quickEdit.lutLibraryLoaded = true;
      state.quickEdit.lutLibraryMessage = '';
    } catch (err) {
      const message = String((err && err.message) || err || 'LUT 库读取失败');
      state.quickEdit.lutLibraryMessage = message;
      if (!opts.silent) showToast(message, 'error');
    } finally {
      state.quickEdit.lutLibraryLoading = false;
      syncQuickEditLutUi();
    }
  }

  function commitQuickEditLutChange(options) {
    const opts = options || {};
    quickEditSetLuts(state.quickEdit.luts || []);
    invalidateQuickEditRenderedPreview({ clearTimers: true });
    syncQuickEditControls();
    applyQuickEditPreview({ interactive: true });
    scheduleQuickEditHistogramRender(220);
    if (!opts.silent && opts.message) showToast(opts.message);
  }

  function addQuickEditLut(lut, options) {
    const next = normalizeQuickEditLut(lut);
    if (!next) return;
    const id = quickEditLutKey(next);
    const luts = quickEditEnabledLuts().filter((item) => quickEditLutKey(item) !== id);
    luts.push(next);
    quickEditSetLuts(luts);
    commitQuickEditLutChange(options || { message: next.warning || ('已启用 LUT：' + next.title) });
  }

  function removeQuickEditLut(lutId, options) {
    const id = String(lutId || '').trim();
    const before = quickEditEnabledLuts().length;
    quickEditSetLuts(quickEditEnabledLuts().filter((lut) => quickEditLutKey(lut) !== id));
    if (before !== quickEditEnabledLuts().length) {
      commitQuickEditLutChange(options || { message: '已停用 LUT' });
    } else {
      syncQuickEditLutUi();
    }
  }

  function syncQuickEditLutStrengthText(lutId) {
    const lut = quickEditEnabledLutById(lutId);
    if (!lut) return;
    const text = quickEditValueText('lutStrength', quickEditNormalizeLutStrength(lut.strength, lut));
    document.querySelectorAll('[data-quick-edit-lut-strength-text]').forEach((node) => {
      if (String(node.dataset.quickEditLutStrengthText || '') !== String(lutId || '')) return;
      node.textContent = text;
    });
  }

  function updateQuickEditLutStrength(lutId, value) {
    const id = String(lutId || '').trim();
    let changed = false;
    const luts = quickEditEnabledLuts().map((lut) => {
      if (quickEditLutKey(lut) !== id) return lut;
      changed = true;
      return Object.assign({}, lut, { strength: quickEditNormalizeLutStrength(value, lut) });
    });
    if (!changed) return;
    quickEditSetLuts(luts);
    invalidateQuickEditRenderedPreview({ clearTimers: true });
    syncQuickEditLutStrengthText(id);
    applyQuickEditPreview({ interactive: true });
    scheduleQuickEditHistogramRender(220);
  }

  async function toggleQuickEditLutFromLibrary(lutId) {
    const id = String(lutId || '').trim();
    if (!id) return;
    if (quickEditEnabledLutById(id)) {
      removeQuickEditLut(id);
      return;
    }
    const item = quickEditLutLibraryItemById(id);
    state.quickEdit.lutDraftLoadingId = id;
    syncQuickEditLutUi();
    try {
      const res = await call('read_quick_edit_lut', id);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : 'LUT 读取失败', 'error');
        return;
      }
      const meta = normalizeQuickEditLutLibraryItem(res.item) || item || { id, title: id, name: id };
      const lut = parseQuickEditCube(res.text || '', meta.name || meta.title || id, {
        id: meta.id,
        libraryId: meta.id,
        name: meta.name || meta.title || id,
        title: meta.title || meta.name || id,
      });
      addQuickEditLut(lut, { message: lut.warning || ('已启用 LUT：' + lut.title) });
    } catch (err) {
      console.warn('[PicScanner] LUT 读取失败', err);
      showToast(String((err && err.message) || 'LUT 读取失败'), 'error');
    } finally {
      state.quickEdit.lutDraftLoadingId = '';
      syncQuickEditLutUi();
    }
  }

  function openQuickEditLutImportPicker() {
    const el = state.quickEdit.el;
    const input = el ? el.querySelector('[data-quick-edit-lut-file]') : null;
    if (!input) {
      showToast('LUT 导入入口尚未就绪', 'error');
      return;
    }
    input.value = '';
    input.click();
  }

  function readQuickEditLutFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('LUT 文件读取失败'));
      reader.readAsText(file);
    });
  }

  async function importQuickEditLutFileToLibrary(file) {
    if (!file) return;
    const filename = String(file.name || 'LUT.cube');
    if (!/\.cube$/i.test(filename)) {
      showToast('请选择 .cube LUT 文件', 'error');
      return;
    }
    try {
      const text = await readQuickEditLutFile(file);
      const parsed = parseQuickEditCube(text, filename);
      const res = await call('save_quick_edit_lut', filename, text);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : 'LUT 导入失败', 'error');
        return;
      }
      await refreshQuickEditLutLibrary({ silent: true });
      const item = normalizeQuickEditLutLibraryItem(res.item);
      if (item && item.id) {
        parsed.id = item.id;
        parsed.libraryId = item.id;
        parsed.name = item.name || parsed.name;
        parsed.title = parsed.title || item.title || parsed.name;
        addQuickEditLut(parsed, { silent: true });
      }
      showToast(res.message || (res.duplicate ? 'LUT 已在库中' : '已导入 LUT'));
    } catch (err) {
      console.warn('[PicScanner] LUT 导入失败', err);
      showToast(String((err && err.message) || 'LUT 导入失败'), 'error');
    }
  }

  function hideQuickEditLutModal() {
    const modal = state.quickEdit.lutModal;
    if (!modal) return;
    modal.classList.add('hidden');
    state.quickEdit.lutDraftLoadingId = '';
  }

  function ensureQuickEditLutModal() {
    if (state.quickEdit.lutModal && state.quickEdit.lutModal.isConnected) return state.quickEdit.lutModal;
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-lut-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'LUT 管理');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-lut-card">',
      '<div class="quick-edit-save-head">',
      '<h2>LUT 管理</h2>',
      '<div class="quick-edit-lut-head-actions">',
      '<button class="icon-btn" type="button" data-quick-edit-lut-modal-import title="导入 .cube" aria-label="导入 .cube">' + quickEditIconSvg('import') + '</button>',
      '<button class="icon-btn" type="button" data-quick-edit-lut-modal-refresh title="刷新 LUT 库" aria-label="刷新 LUT 库">' + quickEditIconSvg('refresh') + '</button>',
      '<button class="icon-btn quick-edit-save-close" type="button" data-quick-edit-lut-cancel title="关闭" aria-label="关闭">' + quickEditIconSvg('close') + '</button>',
      '</div>',
      '</div>',
      '<div class="quick-edit-lut-modal-message" data-quick-edit-lut-modal-message></div>',
      '<div class="quick-edit-lut-manager">',
      '<section class="quick-edit-lut-pane quick-edit-lut-pane-disabled">',
      '<div class="quick-edit-lut-pane-head"><span><b>未启用</b><em data-quick-edit-lut-disabled-count>库为空</em></span><em data-quick-edit-lut-library-count>库为空</em></div>',
      '<div class="quick-edit-lut-library-list" data-quick-edit-lut-disabled></div>',
      '</section>',
      '<section class="quick-edit-lut-pane quick-edit-lut-pane-enabled">',
      '<div class="quick-edit-lut-pane-head"><span><b>已启用</b><em data-quick-edit-lut-enabled-count>未启用</em></span></div>',
      '<div class="quick-edit-lut-library-list" data-quick-edit-lut-enabled></div>',
      '</section>',
      '</div>',
      '</div>',
    ].join('');
    modal.querySelectorAll('[data-quick-edit-lut-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => hideQuickEditLutModal());
    });
    modal.querySelector('[data-quick-edit-lut-modal-import]').addEventListener('click', () => {
      openQuickEditLutImportPicker();
    });
    modal.querySelector('[data-quick-edit-lut-modal-refresh]').addEventListener('click', () => {
      refreshQuickEditLutLibrary();
    });
    modal.querySelector('.quick-edit-lut-manager').addEventListener('click', (ev) => {
      const itemBtn = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-lut-modal-id]') : null;
      if (!itemBtn || state.quickEdit.lutDraftLoadingId) return;
      toggleQuickEditLutFromLibrary(String(itemBtn.dataset.quickEditLutModalId || ''));
    });
    document.body.appendChild(modal);
    state.quickEdit.lutModal = modal;
    return modal;
  }

  function showQuickEditLutModal() {
    const modal = ensureQuickEditLutModal();
    state.quickEdit.lutDraftLoadingId = '';
    modal.classList.remove('hidden');
    syncQuickEditLutUi();
    if (!state.quickEdit.lutLibraryLoaded && !state.quickEdit.lutLibraryLoading) {
      refreshQuickEditLutLibrary({ silent: true });
    }
    const first = modal.querySelector('[data-quick-edit-lut-modal-import]');
    if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
  }

  function clearQuickEditLut() {
    if (!quickEditEnabledLuts().length) return;
    quickEditSetLuts([]);
    commitQuickEditLutChange({ message: '已停用 LUT' });
  }

  function normalizeQuickEditPresetItem(item) {
    const raw = item && typeof item === 'object' ? item : {};
    const id = String(raw.id || '').trim();
    const name = String(raw.name || '').trim();
    if (!id || !name) return null;
    return {
      id,
      name,
      params: normalizeQuickEditParams(raw.params || quickEditDefaultParams()),
      luts: Array.isArray(raw.luts) ? raw.luts.map(normalizeQuickEditLut).filter(Boolean) : [],
      favorite: raw.favorite === true,
      order: Number(raw.order || 0),
      createdAt: Math.max(0, Number(raw.created_at || 0)),
      updatedAt: Math.max(0, Number(raw.updated_at || 0)),
    };
  }

  function quickEditPresetStyleParams(params) {
    const clean = normalizeQuickEditParams(params || quickEditEffectiveParams());
    clean.cropTop = 0;
    clean.cropRight = 0;
    clean.cropBottom = 0;
    clean.cropLeft = 0;
    clean.rotation = 0;
    clean.straighten = 0;
    return clean;
  }

  function quickEditPresetById(presetId) {
    const id = String(presetId || '').trim();
    return (state.quickEdit.presets || []).find((preset) => preset.id === id) || null;
  }

  function quickEditPresetStatusText() {
    if (state.quickEdit.presetsLoading) return '正在读取预设';
    if (state.quickEdit.presetsMessage) return state.quickEdit.presetsMessage;
    const count = (state.quickEdit.presets || []).length;
    return count ? '已有 ' + count + ' 个预设' : '还没有预设';
  }

  function syncQuickEditPresetUi() {
    const el = state.quickEdit.el;
    if (el) syncQuickEditPresetSide(el);
    syncQuickEditPresetModal();
  }

  function syncQuickEditPresetSide(el) {
    const list = el.querySelector('[data-quick-edit-preset-list]');
    const status = el.querySelector('[data-quick-edit-preset-status]');
    if (status) status.textContent = quickEditPresetStatusText();
    if (!list) return;
    const presets = state.quickEdit.presets || [];
    if (state.quickEdit.presetsLoading && !presets.length) {
      list.innerHTML = '<div class="quick-edit-preset-empty">正在读取预设</div>';
      return;
    }
    if (!presets.length) {
      list.innerHTML = '<div class="quick-edit-preset-empty">保存当前参数后会显示在这里</div>';
      return;
    }
    list.innerHTML = presets.slice(0, 5).map((preset) => (
      '<button class="quick-edit-preset-pill" type="button" data-quick-edit-preset-apply="' + escapeHtml(preset.id) + '" title="' + escapeHtml(preset.name) + '">' +
      (preset.favorite ? '<b aria-hidden="true">★</b>' : '') +
      '<span>' + escapeHtml(preset.name) + '</span>' +
      '</button>'
    )).join('');
  }

  function syncQuickEditPresetModal() {
    const modal = state.quickEdit.presetModal;
    if (!modal || !modal.isConnected) return;
    const list = modal.querySelector('[data-quick-edit-preset-modal-list]');
    const count = modal.querySelector('[data-quick-edit-preset-modal-count]');
    const message = modal.querySelector('[data-quick-edit-preset-modal-message]');
    const presets = state.quickEdit.presets || [];
    if (count) count.textContent = presets.length ? presets.length + ' 个预设' : '没有预设';
    if (message) message.textContent = quickEditPresetStatusText();
    modal.classList.toggle('loading', !!state.quickEdit.presetsLoading);
    if (!list) return;
    if (state.quickEdit.presetsLoading && !presets.length) {
      list.innerHTML = '<div class="quick-edit-preset-modal-empty">正在读取预设</div>';
      return;
    }
    if (!presets.length) {
      list.innerHTML = '<div class="quick-edit-preset-modal-empty">还没有预设，先保存当前调整</div>';
      return;
    }
    list.innerHTML = presets.map((preset) => {
      const loading = state.quickEdit.presetApplyingId === preset.id;
      const overwriting = state.quickEdit.presetOverwritingId === preset.id;
      const selected = state.quickEdit.presetSelectedId === preset.id;
      const detail = [
        preset.favorite ? '已收藏' : '',
        preset.luts.length ? preset.luts.length + ' 个 LUT' : '',
        preset.updatedAt ? new Date(preset.updatedAt * 1000).toLocaleString() : '',
      ].filter(Boolean).join(' · ') || '样式参数';
      return '<div class="quick-edit-preset-modal-item' + (loading ? ' loading' : '') + (overwriting ? ' overwriting' : '') + (selected ? ' selected' : '') + '" data-quick-edit-preset-modal-id="' + escapeHtml(preset.id) + '">' +
        '<button class="icon-btn quick-edit-preset-apply-btn" type="button" data-quick-edit-preset-modal-apply="' + escapeHtml(preset.id) + '" title="应用预设" aria-label="应用预设">' + quickEditIconSvg(loading ? 'refresh' : 'check') + '</button>' +
        '<span><b>' + escapeHtml(preset.name) + '</b><em>' + escapeHtml(detail) + '</em></span>' +
        '<button class="icon-btn quick-edit-preset-overwrite-btn" type="button" data-quick-edit-preset-modal-overwrite="' + escapeHtml(preset.id) + '" title="用当前调整覆盖此预设" aria-label="用当前调整覆盖此预设">' + quickEditIconSvg(overwriting ? 'refresh' : 'save') + '</button>' +
        '<button class="icon-btn quick-edit-preset-favorite-btn' + (preset.favorite ? ' active' : '') + '" type="button" data-quick-edit-preset-modal-favorite="' + escapeHtml(preset.id) + '" title="收藏置顶" aria-label="收藏置顶">★</button>' +
        '<button class="icon-btn quick-edit-preset-move-btn" type="button" data-quick-edit-preset-modal-move="up" data-quick-edit-preset-modal-move-id="' + escapeHtml(preset.id) + '" title="上移" aria-label="上移">↑</button>' +
        '<button class="icon-btn quick-edit-preset-move-btn" type="button" data-quick-edit-preset-modal-move="down" data-quick-edit-preset-modal-move-id="' + escapeHtml(preset.id) + '" title="下移" aria-label="下移">↓</button>' +
        '<button class="icon-btn quick-edit-preset-rename-btn" type="button" data-quick-edit-preset-modal-rename="' + escapeHtml(preset.id) + '" title="重命名" aria-label="重命名">名</button>' +
        '<button class="icon-btn quick-edit-preset-delete-btn" type="button" data-quick-edit-preset-modal-delete="' + escapeHtml(preset.id) + '" title="删除预设" aria-label="删除预设">' + quickEditIconSvg('trash') + '</button>' +
        '</div>';
    }).join('');
  }

  async function refreshQuickEditPresets(options) {
    const opts = options || {};
    if (state.quickEdit.presetsLoading) return;
    state.quickEdit.presetsLoading = true;
    state.quickEdit.presetsMessage = '正在读取预设';
    syncQuickEditPresetUi();
    try {
      const res = await call('list_quick_edit_presets');
      if (!res || !res.success) {
        const message = res && res.message ? res.message : '预设读取失败';
        state.quickEdit.presetsMessage = message;
        if (!opts.silent) showToast(message, 'error');
        return;
      }
      state.quickEdit.presets = (Array.isArray(res.items) ? res.items : [])
        .map(normalizeQuickEditPresetItem)
        .filter(Boolean);
      state.quickEdit.presetsLoaded = true;
      state.quickEdit.presetsMessage = '';
    } catch (err) {
      const message = String((err && err.message) || err || '预设读取失败');
      state.quickEdit.presetsMessage = message;
      if (!opts.silent) showToast(message, 'error');
    } finally {
      state.quickEdit.presetsLoading = false;
      syncQuickEditPresetUi();
    }
  }

  function quickEditPresetPayloadParams() {
    return quickEditPresetStyleParams(quickEditEffectiveParams());
  }

  async function saveCurrentQuickEditPreset() {
    if (!state.quickEdit.open) return;
    const name = await openTextInput({
      title: '保存预设',
      message: '保存当前影调、色彩、细节、色调分离、HSL 和 LUT，不包含裁切、旋转、缩放。',
      placeholder: '例如：暖调人像',
      value: '',
    });
    const cleanName = String(name || '').trim();
    if (!cleanName) return;
    try {
      const res = await call('save_quick_edit_preset', cleanName, quickEditPresetPayloadParams(), quickEditEnabledLuts());
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '预设保存失败', 'error');
        return;
      }
      state.quickEdit.presetsMessage = '';
      setQuickEditPresetsFromResponse(res);
      showToast(res.message || '已保存预设');
    } catch (err) {
      console.warn('[PicScanner] 预设保存失败', err);
      showToast(String((err && err.message) || '预设保存失败'), 'error');
    }
  }

  async function quickEditHydratePresetLuts(preset) {
    const source = Array.isArray(preset && preset.luts) ? preset.luts : [];
    const loaded = [];
    const missing = [];
    for (const ref of source) {
      const id = quickEditLutKey(ref);
      if (!id) continue;
      try {
        const res = await call('read_quick_edit_lut', id);
        if (!res || !res.success) {
          missing.push(ref.title || id);
          continue;
        }
        const meta = normalizeQuickEditLutLibraryItem(res.item) || { id, title: ref.title || id, name: ref.name || id };
        const lut = parseQuickEditCube(res.text || '', meta.name || meta.title || id, {
          id: meta.id,
          libraryId: meta.id,
          name: meta.name || ref.name || meta.title || id,
          title: ref.title || meta.title || meta.name || id,
        });
        lut.strength = quickEditNormalizeLutStrength(ref.strength, lut);
        loaded.push(lut);
      } catch (err) {
        missing.push(ref.title || id);
      }
    }
    return { loaded, missing };
  }

  function ensureQuickEditPresetApplyConfirm() {
    if (state.quickEdit.presetApplyConfirm && state.quickEdit.presetApplyConfirm.isConnected) return state.quickEdit.presetApplyConfirm;
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-preset-apply-confirm hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '应用预设确认');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-exit-card">',
      '<h2>应用预设？</h2>',
      '<p data-quick-edit-preset-apply-message>当前样式参数会被预设替换。</p>',
      '<div class="modal-actions">',
      '<button class="ghost-btn" type="button" data-quick-edit-preset-apply-cancel>取消</button>',
      '<button class="primary-btn" type="button" data-quick-edit-preset-apply-confirm>确认应用</button>',
      '</div>',
      '</div>',
    ].join('');
    modal.querySelector('[data-quick-edit-preset-apply-cancel]').addEventListener('click', () => hideQuickEditPresetApplyConfirm());
    modal.querySelector('[data-quick-edit-preset-apply-confirm]').addEventListener('click', () => {
      const presetId = String(modal.dataset.quickEditPresetApplyId || '');
      hideQuickEditPresetApplyConfirm();
      applyQuickEditPresetNow(presetId);
    });
    document.body.appendChild(modal);
    state.quickEdit.presetApplyConfirm = modal;
    return modal;
  }

  function hideQuickEditPresetApplyConfirm() {
    const modal = state.quickEdit.presetApplyConfirm;
    if (!modal) return;
    modal.classList.add('hidden');
    modal.dataset.quickEditPresetApplyId = '';
  }

  function applyQuickEditPreset(presetId) {
    const preset = quickEditPresetById(presetId);
    if (!preset || state.quickEdit.presetApplyingId) return;
    const modal = ensureQuickEditPresetApplyConfirm();
    const message = modal.querySelector('[data-quick-edit-preset-apply-message]');
    if (message) {
      message.textContent = '将应用“' + preset.name + '”，当前影调、色彩、细节、色调分离、HSL 和 LUT 会被替换；裁切、旋转、缩放不会改变。';
    }
    modal.dataset.quickEditPresetApplyId = preset.id;
    modal.classList.remove('hidden');
    const confirm = modal.querySelector('[data-quick-edit-preset-apply-confirm]');
    if (confirm) requestAnimationFrame(() => confirm.focus({ preventScroll: true }));
  }

  async function applyQuickEditPresetNow(presetId) {
    const preset = quickEditPresetById(presetId);
    if (!preset || state.quickEdit.presetApplyingId) return;
    state.quickEdit.presetApplyingId = preset.id;
    syncQuickEditPresetUi();
    try {
      const hydrated = await quickEditHydratePresetLuts(preset);
      state.quickEdit.params = quickEditPresetStyleParams(preset.params);
      state.quickEdit.committedParams = quickEditDefaultParams();
      state.quickEdit.committedStages = [];
      quickEditSetLuts(hydrated.loaded);
      invalidateQuickEditRenderedPreview({ clearTimers: true });
      syncQuickEditControls();
      applyQuickEditPreview({ interactive: true });
      scheduleQuickEditHistogramRender(180);
      if (quickEditUsesRawDevelopPipeline()) scheduleQuickEditRawDevelopPreview({ interactive: true });
      showToast(hydrated.missing.length ? ('已应用预设，' + hydrated.missing.length + ' 个 LUT 缺失') : ('已应用预设：' + preset.name));
    } catch (err) {
      console.warn('[PicScanner] 预设应用失败', err);
      showToast(String((err && err.message) || '预设应用失败'), 'error');
    } finally {
      state.quickEdit.presetApplyingId = '';
      syncQuickEditPresetUi();
    }
  }

  async function deleteQuickEditPreset(presetId) {
    const preset = quickEditPresetById(presetId);
    if (!preset) return;
    try {
      const res = await call('delete_quick_edit_preset', preset.id);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '预设删除失败', 'error');
        return;
      }
      setQuickEditPresetsFromResponse(res);
      showToast(res.message || '已删除预设');
    } catch (err) {
      console.warn('[PicScanner] 预设删除失败', err);
      showToast(String((err && err.message) || '预设删除失败'), 'error');
    }
  }

  function ensureQuickEditPresetOverwriteConfirm() {
    if (state.quickEdit.presetOverwriteConfirm && state.quickEdit.presetOverwriteConfirm.isConnected) return state.quickEdit.presetOverwriteConfirm;
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-preset-apply-confirm hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '覆盖预设确认');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-exit-card">',
      '<h2>覆盖预设？</h2>',
      '<p data-quick-edit-preset-overwrite-message>当前调整会写入这个预设。</p>',
      '<div class="modal-actions">',
      '<button class="ghost-btn" type="button" data-quick-edit-preset-overwrite-cancel>取消</button>',
      '<button class="primary-btn" type="button" data-quick-edit-preset-overwrite-confirm>覆盖保存</button>',
      '</div>',
      '</div>',
    ].join('');
    modal.querySelector('[data-quick-edit-preset-overwrite-cancel]').addEventListener('click', () => hideQuickEditPresetOverwriteConfirm());
    modal.querySelector('[data-quick-edit-preset-overwrite-confirm]').addEventListener('click', () => {
      const presetId = String(modal.dataset.quickEditPresetOverwriteId || '');
      hideQuickEditPresetOverwriteConfirm();
      overwriteQuickEditPresetNow(presetId);
    });
    document.body.appendChild(modal);
    state.quickEdit.presetOverwriteConfirm = modal;
    return modal;
  }

  function hideQuickEditPresetOverwriteConfirm() {
    const modal = state.quickEdit.presetOverwriteConfirm;
    if (!modal) return;
    modal.classList.add('hidden');
    modal.dataset.quickEditPresetOverwriteId = '';
  }

  function overwriteQuickEditPreset(presetId) {
    const preset = quickEditPresetById(presetId);
    if (!preset || state.quickEdit.presetOverwritingId) return;
    const modal = ensureQuickEditPresetOverwriteConfirm();
    const message = modal.querySelector('[data-quick-edit-preset-overwrite-message]');
    if (message) {
      message.textContent = '将用当前影调、色彩、细节、色调分离、HSL 和 LUT 覆盖“' + preset.name + '”；名称、收藏和排序会保留。';
    }
    modal.dataset.quickEditPresetOverwriteId = preset.id;
    modal.classList.remove('hidden');
    const confirm = modal.querySelector('[data-quick-edit-preset-overwrite-confirm]');
    if (confirm) requestAnimationFrame(() => confirm.focus({ preventScroll: true }));
  }

  async function overwriteQuickEditPresetNow(presetId) {
    const preset = quickEditPresetById(presetId);
    if (!preset || state.quickEdit.presetOverwritingId) return;
    state.quickEdit.presetOverwritingId = preset.id;
    state.quickEdit.presetSelectedId = preset.id;
    syncQuickEditPresetUi();
    try {
      const res = await call('update_quick_edit_preset', preset.id, quickEditPresetPayloadParams(), quickEditEnabledLuts());
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '预设覆盖失败', 'error');
        return;
      }
      state.quickEdit.presetsMessage = '';
      state.quickEdit.presetSelectedId = preset.id;
      setQuickEditPresetsFromResponse(res);
      showToast(res.message || '已覆盖预设');
    } catch (err) {
      console.warn('[PicScanner] 预设覆盖失败', err);
      showToast(String((err && err.message) || '预设覆盖失败'), 'error');
    } finally {
      state.quickEdit.presetOverwritingId = '';
      syncQuickEditPresetUi();
    }
  }

  function setQuickEditPresetsFromResponse(res) {
    state.quickEdit.presets = (Array.isArray(res && res.items) ? res.items : [])
      .map(normalizeQuickEditPresetItem)
      .filter(Boolean);
    state.quickEdit.presetsLoaded = true;
    if (state.quickEdit.presetSelectedId && !quickEditPresetById(state.quickEdit.presetSelectedId)) {
      state.quickEdit.presetSelectedId = '';
    }
    if (state.quickEdit.presetHoverId && !quickEditPresetById(state.quickEdit.presetHoverId)) {
      state.quickEdit.presetHoverId = '';
    }
    syncQuickEditPresetUi();
  }

  async function renameQuickEditPreset(presetId) {
    const preset = quickEditPresetById(presetId);
    if (!preset) return;
    const name = await openTextInput({
      title: '重命名预设',
      message: '输入新的预设名称。',
      placeholder: '预设名称',
      value: preset.name,
    });
    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName === preset.name) return;
    try {
      const res = await call('rename_quick_edit_preset', preset.id, cleanName);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '预设重命名失败', 'error');
        return;
      }
      setQuickEditPresetsFromResponse(res);
      showToast(res.message || '已重命名预设');
    } catch (err) {
      console.warn('[PicScanner] 预设重命名失败', err);
      showToast(String((err && err.message) || '预设重命名失败'), 'error');
    }
  }

  async function toggleQuickEditPresetFavorite(presetId) {
    const preset = quickEditPresetById(presetId);
    if (!preset) return;
    try {
      const res = await call('set_quick_edit_preset_favorite', preset.id, !preset.favorite);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '预设收藏失败', 'error');
        return;
      }
      state.quickEdit.presetSelectedId = preset.id;
      setQuickEditPresetsFromResponse(res);
      showToast(preset.favorite ? '已取消预设置顶' : '已收藏置顶');
    } catch (err) {
      console.warn('[PicScanner] 预设收藏失败', err);
      showToast(String((err && err.message) || '预设收藏失败'), 'error');
    }
  }

  async function moveQuickEditPreset(presetId, direction) {
    const preset = quickEditPresetById(presetId);
    if (!preset) return;
    try {
      const res = await call('move_quick_edit_preset', preset.id, direction);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '预设排序失败', 'error');
        return;
      }
      state.quickEdit.presetSelectedId = preset.id;
      setQuickEditPresetsFromResponse(res);
      showToast(res.message || '已调整预设顺序');
    } catch (err) {
      console.warn('[PicScanner] 预设排序失败', err);
      showToast(String((err && err.message) || '预设排序失败'), 'error');
    }
  }

  async function exportQuickEditPresets() {
    try {
      const res = await call('export_quick_edit_presets');
      if (!res || !res.success) {
        if (res && res.cancelled) return;
        showToast(res && res.message ? res.message : '预设导出失败', 'error');
        return;
      }
      showToast(res.message || '已导出预设');
    } catch (err) {
      console.warn('[PicScanner] 预设导出失败', err);
      showToast(String((err && err.message) || '预设导出失败'), 'error');
    }
  }

  async function importQuickEditPresets() {
    try {
      const res = await call('import_quick_edit_presets');
      if (!res || !res.success) {
        if (res && res.cancelled) return;
        showToast(res && res.message ? res.message : '预设导入失败', 'error');
        return;
      }
      setQuickEditPresetsFromResponse(res);
      showToast(res.message || '已导入预设');
    } catch (err) {
      console.warn('[PicScanner] 预设导入失败', err);
      showToast(String((err && err.message) || '预设导入失败'), 'error');
    }
  }

  function hideQuickEditPresetModal() {
    const modal = state.quickEdit.presetModal;
    if (!modal) return;
    hideQuickEditPresetOverwriteConfirm();
    modal.classList.add('hidden');
    state.quickEdit.presetApplyingId = '';
  }

  function ensureQuickEditPresetModal() {
    if (state.quickEdit.presetModal && state.quickEdit.presetModal.isConnected) return state.quickEdit.presetModal;
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-preset-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '预设管理');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-preset-card">',
      '<div class="quick-edit-save-head">',
      '<h2>预设管理</h2>',
      '<div class="quick-edit-lut-head-actions">',
      '<button class="icon-btn" type="button" data-quick-edit-preset-modal-save title="保存当前为预设" aria-label="保存当前为预设">' + quickEditIconSvg('plus') + '</button>',
      '<button class="icon-btn" type="button" data-quick-edit-preset-modal-import title="导入预设文件" aria-label="导入预设文件">' + quickEditIconSvg('import') + '</button>',
      '<button class="icon-btn" type="button" data-quick-edit-preset-modal-export title="导出预设文件" aria-label="导出预设文件">' + quickEditIconSvg('export') + '</button>',
      '<button class="icon-btn" type="button" data-quick-edit-preset-modal-refresh title="刷新预设" aria-label="刷新预设">' + quickEditIconSvg('refresh') + '</button>',
      '<button class="icon-btn quick-edit-save-close" type="button" data-quick-edit-preset-cancel title="关闭" aria-label="关闭">' + quickEditIconSvg('close') + '</button>',
      '</div>',
      '</div>',
      '<div class="quick-edit-preset-modal-head"><span data-quick-edit-preset-modal-message></span><em data-quick-edit-preset-modal-count>没有预设</em></div>',
      '<div class="quick-edit-preset-modal-list" data-quick-edit-preset-modal-list></div>',
      '</div>',
    ].join('');
    modal.querySelectorAll('[data-quick-edit-preset-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => hideQuickEditPresetModal());
    });
    modal.querySelector('[data-quick-edit-preset-modal-save]').addEventListener('click', () => {
      saveCurrentQuickEditPreset();
    });
    modal.querySelector('[data-quick-edit-preset-modal-import]').addEventListener('click', () => {
      importQuickEditPresets();
    });
    modal.querySelector('[data-quick-edit-preset-modal-export]').addEventListener('click', () => {
      exportQuickEditPresets();
    });
    modal.querySelector('[data-quick-edit-preset-modal-refresh]').addEventListener('click', () => {
      refreshQuickEditPresets();
    });
    modal.querySelector('[data-quick-edit-preset-modal-list]').addEventListener('click', (ev) => {
      const apply = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-modal-apply]') : null;
      if (apply) {
        applyQuickEditPreset(String(apply.dataset.quickEditPresetModalApply || ''));
        return;
      }
      const overwrite = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-modal-overwrite]') : null;
      if (overwrite) {
        overwriteQuickEditPreset(String(overwrite.dataset.quickEditPresetModalOverwrite || ''));
        return;
      }
      const favorite = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-modal-favorite]') : null;
      if (favorite) {
        toggleQuickEditPresetFavorite(String(favorite.dataset.quickEditPresetModalFavorite || ''));
        return;
      }
      const move = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-modal-move]') : null;
      if (move) {
        moveQuickEditPreset(
          String(move.dataset.quickEditPresetModalMoveId || ''),
          String(move.dataset.quickEditPresetModalMove || ''),
        );
        return;
      }
      const rename = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-modal-rename]') : null;
      if (rename) {
        renameQuickEditPreset(String(rename.dataset.quickEditPresetModalRename || ''));
        return;
      }
      const del = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-modal-delete]') : null;
      if (del) {
        deleteQuickEditPreset(String(del.dataset.quickEditPresetModalDelete || ''));
        return;
      }
      const row = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-modal-id]') : null;
      if (row) {
        state.quickEdit.presetSelectedId = String(row.dataset.quickEditPresetModalId || '');
        syncQuickEditPresetUi();
      }
    });
    modal.addEventListener('keydown', (ev) => {
      if (ev.key !== 'f' && ev.key !== 'F') return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const preset = quickEditPresetById(state.quickEdit.presetSelectedId);
      if (!preset) return;
      ev.preventDefault();
      ev.stopPropagation();
      toggleQuickEditPresetFavorite(preset.id);
    });
    document.body.appendChild(modal);
    state.quickEdit.presetModal = modal;
    return modal;
  }

  function showQuickEditPresetModal() {
    const modal = ensureQuickEditPresetModal();
    modal.classList.remove('hidden');
    syncQuickEditPresetUi();
    if (!state.quickEdit.presetsLoaded && !state.quickEdit.presetsLoading) {
      refreshQuickEditPresets({ silent: true });
    }
    const first = modal.querySelector('[data-quick-edit-preset-modal-save]');
    if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
  }

  function loadQuickEditImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('快速调整预览图加载失败'));
      image.src = src;
    });
  }

  function loadQuickEditSourceImage(src) {
    const sourceSrc = String(src || '');
    if (!sourceSrc) return Promise.reject(new Error('快速调整源图为空'));
    if (state.quickEdit.sourceImageSrc === sourceSrc && state.quickEdit.sourceImage) {
      return Promise.resolve(state.quickEdit.sourceImage);
    }
    if (state.quickEdit.sourceImageSrc === sourceSrc && state.quickEdit.sourceImagePromise) {
      return state.quickEdit.sourceImagePromise;
    }
    state.quickEdit.sourceImageSrc = sourceSrc;
    state.quickEdit.sourceImage = null;
    state.quickEdit.sourceImagePromise = loadQuickEditImage(sourceSrc).then((image) => {
      if (state.quickEdit.sourceImageSrc === sourceSrc) {
        state.quickEdit.sourceImage = image;
        state.quickEdit.sourceImagePromise = null;
      }
      return image;
    }).catch((err) => {
      if (state.quickEdit.sourceImageSrc === sourceSrc) {
        state.quickEdit.sourceImageSrc = '';
        state.quickEdit.sourceImage = null;
        state.quickEdit.sourceImagePromise = null;
      }
      throw err;
    });
    return state.quickEdit.sourceImagePromise;
  }

  function quickEditImagePointFromEvent(img, ev) {
    if (!img || !ev) return null;
    const rect = img.getBoundingClientRect();
    const basis = quickEditDisplayBasisSize(img);
    const width = Math.max(1, Number(basis.width || img.width || rect.width || 1));
    const height = Math.max(1, Number(basis.height || img.height || rect.height || 1));
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const matrix = new DOMMatrixReadOnly(window.getComputedStyle(img).transform || 'none');
    const viewZoom = Math.max(0.0001, Number(state.quickEdit.viewZoom || 1));
    const local = matrix.inverse().transformPoint(new DOMPoint(
      (ev.clientX - cx) / viewZoom,
      (ev.clientY - cy) / viewZoom,
    ));
    const x = local.x + width / 2;
    const y = local.y + height / 2;
    if (x < 0 || y < 0 || x > width || y > height) return null;
    return {
      x: clamp(x / width, 0, 1),
      y: clamp(y / height, 0, 1),
    };
  }

  async function sampleQuickEditHslFromEvent(ev) {
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const point = quickEditImagePointFromEvent(img, ev);
    if (!point || !img || !PS.imageHasSource(img) || !img.naturalWidth || !img.naturalHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const sx = clamp(Math.round(point.x * Math.max(1, img.naturalWidth - 1)), 0, Math.max(0, img.naturalWidth - 1));
    const sy = clamp(Math.round(point.y * Math.max(1, img.naturalHeight - 1)), 0, Math.max(0, img.naturalHeight - 1));
    ctx.drawImage(img, sx, sy, 1, 1, 0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return quickEditRgbToHsl(data[0], data[1], data[2]);
  }

  function quickEditWorkerLutPayload(luts) {
    return (Array.isArray(luts) ? luts : [])
      .filter((lut) => lut && lut.data && lut.size && Number(lut.strength || 0) > 0)
      .map((lut) => ({
        id: quickEditLutKey(lut),
        size: Number(lut.size || 0),
        strength: quickEditNormalizeLutStrength(lut.strength, lut),
        domainMin: Array.isArray(lut.domainMin) ? lut.domainMin.slice(0, 3) : [0, 0, 0],
        domainMax: Array.isArray(lut.domainMax) ? lut.domainMax.slice(0, 3) : [1, 1, 1],
        data: lut.data,
      }));
  }

  function cloneQuickEditWorkerLutPayload(luts) {
    return (Array.isArray(luts) ? luts : []).map((lut) => ({
      id: String(lut && lut.id || ''),
      size: Number(lut && lut.size || 0),
      strength: Number(lut && lut.strength || 0),
      domainMin: Array.isArray(lut && lut.domainMin) ? lut.domainMin.slice(0, 3) : [0, 0, 0],
      domainMax: Array.isArray(lut && lut.domainMax) ? lut.domainMax.slice(0, 3) : [1, 1, 1],
      data: lut && lut.data ? lut.data : null,
    }));
  }

  function cloneQuickEditPixelStage(stage) {
    const clean = normalizeQuickEditParams(stage || quickEditDefaultParams());
    return Object.assign({}, clean, {
      luts: cloneQuickEditWorkerLutPayload(stage && stage.luts),
      _signature: String(stage && stage._signature || ''),
    });
  }

  function quickEditPixelStageSignature(params, luts) {
    const clean = normalizeQuickEditParams(params || quickEditDefaultParams());
    return JSON.stringify({
      params: clean,
      luts: (Array.isArray(luts) ? luts : []).map((lut) => ({
        id: String(lut && (lut.id || lut.name || lut.filename) || ''),
        size: Number(lut && lut.size || 0),
        strength: Number(lut && lut.strength || 0),
      })),
    });
  }

  function captureQuickEditPixelStage(params, luts) {
    const sourceLuts = Array.isArray(luts) ? luts : quickEditEnabledLuts();
    return Object.assign({}, normalizeQuickEditParams(params || quickEditDefaultParams()), {
      luts: quickEditWorkerLutPayload(sourceLuts),
      _signature: quickEditPixelStageSignature(params, sourceLuts),
    });
  }

  function quickEditWorkerPixelStages(params, options) {
    const opts = options || {};
    const committed = (state.quickEdit.committedStages || []).map(cloneQuickEditPixelStage);
    const current = captureQuickEditPixelStage(state.quickEdit.params || params, quickEditEnabledLuts());
    const stages = committed.concat([current]);
    return stages.map((stage) => {
      const clean = opts.rawDeveloped
        ? quickEditPixelParamsForRawDevelopedSource(stage)
        : quickEditPixelParamsForCurrentSource(stage);
      return Object.assign({}, clean, { luts: cloneQuickEditWorkerLutPayload(stage.luts) });
    });
  }

  function quickEditWorkerPixelStagesNeutral(params) {
    const ignoredKeys = new Set([
      'rotation',
      'straighten',
      'cropLeft',
      'cropTop',
      'cropRight',
      'cropBottom',
      'rawHighlightRecovery',
      'rawNoiseReduction',
      'lutStrength',
    ]);
    const comparable = (stage) => {
      const clean = normalizeQuickEditParams(stage || quickEditDefaultParams());
      return Object.keys(clean).reduce((result, key) => {
        if (!ignoredKeys.has(key)) result[key] = clean[key];
        return result;
      }, {});
    };
    const neutral = JSON.stringify(comparable(quickEditPixelParamsForCurrentSource(quickEditDefaultParams())));
    return quickEditWorkerPixelStages(params).every((stage) => (
      (!Array.isArray(stage.luts) || stage.luts.length === 0)
      && JSON.stringify(comparable(stage)) === neutral
    ));
  }

  function quickEditWorkerParams(params, options) {
    const opts = options || {};
    if (opts.prepared) {
      const clean = normalizeQuickEditParams(params);
      const luts = Array.isArray(opts.luts) ? opts.luts : quickEditWorkerLutPayload(quickEditEnabledLuts());
      return Object.assign({}, clean, { luts: cloneQuickEditWorkerLutPayload(luts) });
    }
    return { stages: quickEditWorkerPixelStages(params, opts) };
  }

  function quickEditPreviewWorkerUrl() {
    const source = String(window.PicScannerQuickEditWorkerSource || '');
    if (source) {
      if (!PS.quickEditPreviewWorkerObjectUrl) {
        PS.quickEditPreviewWorkerObjectUrl = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
      }
      return PS.quickEditPreviewWorkerObjectUrl;
    }
    // P5-3 切片 2：worker 源已改为 vite 构建产物（assets/vue/quick-edit-worker.js，
    // 页面脚本加载后由上面的字符串路径接管；此处只是源缺失时的兜底 URL）。
    return new URL('assets/vue/quick-edit-worker.js?v=' + encodeURIComponent(APP_BUILD), window.location.href).href;
  }

  function cancelQuickEditPreviewWorker() {
    if (!PS.quickEditPreviewWorker) return;
    PS.quickEditPreviewWorker.terminate();
    PS.quickEditPreviewWorker = null;
  }

  function clearQuickEditPendingPreviewRender() {
    state.quickEdit.previewRenderPendingKey = '';
    state.quickEdit.previewRenderPendingSignature = '';
    state.quickEdit.previewRenderPendingMaxSide = 0;
  }

  function clearQuickEditQueuedPreviewRender() {
    state.quickEdit.previewRenderQueuedSignature = '';
    state.quickEdit.previewRenderQueuedOptions = null;
  }

  function quickEditQueuedPreviewSupersedes(renderSignature, maxSide) {
    const queuedSignature = String(state.quickEdit.previewRenderQueuedSignature || '');
    const queuedOptions = state.quickEdit.previewRenderQueuedOptions;
    if (!queuedOptions || queuedSignature !== String(renderSignature || '')) return false;
    return Number(queuedOptions.maxSide || 0) > Number(maxSide || 0);
  }

  function clearQuickEditOriginalPreviewTimer() {
    clearTimeout(state.quickEdit.previewOriginalTimer);
    state.quickEdit.previewOriginalTimer = null;
    state.quickEdit.previewOriginalSignature = '';
  }

  function quickEditRenderQueuePriority(options) {
    const opts = options || {};
    if (opts.original) return 3;
    if (opts.interactive) return 1;
    return 2;
  }

  function queueQuickEditPreviewRender(renderSignature, options) {
    const opts = Object.assign({}, options || {});
    const current = state.quickEdit.previewRenderQueuedOptions;
    if (
      current
      && state.quickEdit.previewRenderQueuedSignature === renderSignature
      && quickEditRenderQueuePriority(current) > quickEditRenderQueuePriority(opts)
    ) {
      return;
    }
    state.quickEdit.previewRenderQueuedSignature = renderSignature;
    state.quickEdit.previewRenderQueuedOptions = opts;
  }

  function flushQueuedQuickEditPreviewRender(renderSignature) {
    const queuedSignature = String(state.quickEdit.previewRenderQueuedSignature || '');
    const queuedOptions = state.quickEdit.previewRenderQueuedOptions;
    if (!queuedOptions || queuedSignature !== String(renderSignature || '')) return false;
    clearQuickEditQueuedPreviewRender();
    requestAnimationFrame(() => {
      if (!state.quickEdit.open || state.quickEdit.previewRenderRequestSignature !== queuedSignature) return;
      renderQuickEditAdjustedPreview(queuedOptions);
    });
    return true;
  }

  function isQuickEditPreviewRenderJobCurrent(job) {
    if (!job || !state.quickEdit.open) return false;
    const renderSignature = String(job.renderSignature || '');
    return Number(job.token || 0) === Number(state.quickEdit.previewRenderToken || 0)
      && String(job.sourceSrc || '') === String(state.quickEdit.sourceSrc || '')
      && renderSignature === String(state.quickEdit.previewRenderRequestSignature || '');
  }

  function ensureQuickEditPreviewWorker() {
    if (PS.quickEditPreviewWorker) return PS.quickEditPreviewWorker;
    PS.quickEditPreviewWorker = new Worker(quickEditPreviewWorkerUrl());
    PS.quickEditPreviewWorker.onmessage = onQuickEditPreviewWorkerMessage;
    PS.quickEditPreviewWorker.onerror = (err) => {
      console.warn('[PicScanner] 快速调整异步渲染 Worker 异常', {
        url: quickEditPreviewWorkerUrl(),
        error: err,
      });
      showToast('快速调整异步渲染启动失败，详情见控制台', 'error');
      clearQuickEditPendingPreviewRender();
      setQuickEditPreviewRendering(false);
      cancelQuickEditPreviewWorker();
    };
    return PS.quickEditPreviewWorker;
  }

  function onQuickEditPreviewWorkerMessage(ev) {
    const message = ev && ev.data ? ev.data : {};
    if (message.type === 'error') {
      if (Number(message.token || 0) === Number(state.quickEdit.previewRenderToken || 0)) {
        if (state.quickEdit.previewRenderPendingKey === String(message.key || '')) {
          clearQuickEditPendingPreviewRender();
        }
        setQuickEditPreviewRendering(false);
        console.warn('[PicScanner] 快速调整异步渲染失败', message);
      }
      return;
    }
    if (message.type !== 'rendered') return;
    const token = Number(message.token || 0);
    const maxSide = Number(message.maxSide || 0);
    const renderSignature = String(message.renderSignature || '');
    if (
      token !== Number(state.quickEdit.previewRenderToken || 0)
      || !state.quickEdit.open
      || String(message.sourceSrc || '') !== String(state.quickEdit.sourceSrc || '')
      || renderSignature !== String(state.quickEdit.previewRenderRequestSignature || '')
      || quickEditRenderedPreviewCovers(renderSignature, maxSide)
    ) {
      return;
    }
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    if (!img || !message.blob) return;
    state.quickEdit.previewRenderKey = String(message.key || '');
    if (state.quickEdit.previewRenderPendingKey === state.quickEdit.previewRenderKey) {
      clearQuickEditPendingPreviewRender();
    }
    quickEditPerfLog('worker:done', {
      key: state.quickEdit.previewRenderKey,
      maxSide,
      source: message.sourceWidth + 'x' + message.sourceHeight,
      display: message.displayWidth + 'x' + message.displayHeight,
      output: message.outputWidth + 'x' + message.outputHeight,
      perf: message.perf || null,
    });
    const messageKey = String(message.key || '');
    const originalTargetMaxSide = quickEditOriginalPreviewTargetFromMessage(message);
    if (
      messageKey.includes('|interactive|')
      && originalTargetMaxSide > QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE
      && state.quickEdit.previewRenderQueuedSignature === renderSignature
      && state.quickEdit.previewRenderQueuedOptions
      && !state.quickEdit.previewRenderQueuedOptions.original
      && !state.quickEdit.previewRenderQueuedOptions.interactive
    ) {
      clearQuickEditQueuedPreviewRender();
    }
    const supersededByQueuedRender = quickEditQueuedPreviewSupersedes(renderSignature, maxSide);
    const flushedQueuedRender = flushQueuedQuickEditPreviewRender(renderSignature);
    if (supersededByQueuedRender) {
      quickEditPerfLog('worker:skip-superseded-display', {
        key: state.quickEdit.previewRenderKey,
        maxSide,
      });
      return;
    }
    const nextUrl = URL.createObjectURL(message.blob);
    revokeQuickEditPreviewObjectUrl();
    state.quickEdit.previewObjectUrl = nextUrl;
    state.quickEdit.previewRenderedSignature = renderSignature;
    state.quickEdit.previewRenderedMaxSide = maxSide;
    setQuickEditPreviewRendering(false);
    const scheduledOriginal = !flushedQueuedRender
      && !messageKey.includes('|original|')
      && scheduleQuickEditOriginalPreviewRender(renderSignature, originalTargetMaxSide);
    if (scheduledOriginal && messageKey.includes('|interactive|')) {
      clearTimeout(state.quickEdit.previewSettleTimer);
      state.quickEdit.previewSettleTimer = null;
    }
    if (!state.quickEdit.displayBasisReady) {
      setQuickEditImageDisplayBasis(
        img,
        message.displayWidth || message.sourceWidth,
        message.displayHeight || message.sourceHeight,
      );
    }
    img.src = nextUrl;
  }

  function renderQuickEditPreviewInWorker(source, params, job) {
    if (typeof createImageBitmap !== 'function') {
      throw new Error('当前 WebView 不支持异步图像解码 createImageBitmap');
    }
    if (!isQuickEditPreviewRenderJobCurrent(job)) return Promise.resolve();
    const worker = ensureQuickEditPreviewWorker();
    const decodeStart = quickEditPerfNow();
    return createImageBitmap(source).then((bitmap) => {
      if (!isQuickEditPreviewRenderJobCurrent(job)) {
        if (bitmap && typeof bitmap.close === 'function') bitmap.close();
        quickEditPerfLog('worker:skip-stale-post', {
          key: job.key,
          token: job.token,
          currentToken: state.quickEdit.previewRenderToken,
        });
        return;
      }
      const postToWorker = (finalBitmap, overrides) => {
        const decodeMs = quickEditPerfNow() - decodeStart;
        quickEditPerfLog('worker:post', {
          key: job.key,
          token: job.token,
          maxSide: job.maxSide,
          decodeMs: Number(decodeMs.toFixed(2)),
          source: (source.naturalWidth || source.width) + 'x' + (source.naturalHeight || source.height),
        });
        const message = Object.assign({
          type: 'render',
          token: job.token,
          key: job.key,
          renderSignature: job.renderSignature,
          sourceSrc: job.sourceSrc,
          maxSide: job.maxSide,
          orientation: job.orientation,
          applyOrientation: !!job.applyOrientation,
          displayWidth: job.displayWidth,
          displayHeight: job.displayHeight,
          quality: job.quality,
          decodeMs,
          perfEnabled: quickEditPerfEnabled(),
          params: quickEditWorkerParams(params),
          bitmap: finalBitmap,
        }, overrides || {});
        try {
          worker.postMessage(message, [finalBitmap]);
        } catch (err) {
          if (finalBitmap && typeof finalBitmap.close === 'function') finalBitmap.close();
          throw err;
        }
      };
      const stageEntry = quickEditCurrentSourceStageEntry();
      if (stageEntry) {
        return window.PicScannerModules.applySourceStages(bitmap, stageEntry, { maxSide: job.maxSide }).then((result) => {
          if (!isQuickEditPreviewRenderJobCurrent(job)) {
            if (result && result.bitmap && typeof result.bitmap.close === 'function') result.bitmap.close();
            quickEditPerfLog('worker:skip-stale-post', {
              key: job.key,
              token: job.token,
              currentToken: state.quickEdit.previewRenderToken,
            });
            return;
          }
          const overrides = {};
          if (result && result.orientationApplied) {
            const orientedBasis = quickEditImageBasis(
              Math.max(1, Number(result.width || 1)),
              Math.max(1, Number(result.height || 1)),
            );
            overrides.orientation = '';
            overrides.applyOrientation = false;
            overrides.displayWidth = orientedBasis.width;
            overrides.displayHeight = orientedBasis.height;
          }
          return postToWorker(result.bitmap, overrides);
        });
      }
      return postToWorker(bitmap, {});
    });
  }

  function scheduleQuickEditPreviewRender(options) {
    if (!state.quickEdit.open || !state.quickEdit.sourceSrc) return;
    const opts = options || {};
    const interactive = !!opts.interactive;
    const delayMs = Number.isFinite(Number(opts.delayMs))
      ? Math.max(0, Number(opts.delayMs))
      : (interactive ? 45 : 90);
    if (!interactive) {
      clearTimeout(state.quickEdit.previewSettleTimer);
      state.quickEdit.previewSettleTimer = null;
    }
    clearTimeout(state.quickEdit.previewRenderTimer);
    quickEditPerfLog('schedule', {
      interactive,
      delayMs,
      sourceReady: !!state.quickEdit.sourceSrc,
    });
    state.quickEdit.previewRenderTimer = setTimeout(
      () => renderQuickEditAdjustedPreview({
        maxSide: interactive ? QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE : QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE,
        quality: interactive ? 0.86 : 0.92,
        qualityKey: interactive ? 'interactive' : 'settled',
        interactive,
      }),
      delayMs,
    );
    if (interactive) {
      clearTimeout(state.quickEdit.previewSettleTimer);
      state.quickEdit.previewSettleTimer = setTimeout(() => {
        scheduleQuickEditPreviewRender({ interactive: false });
      }, 260);
    }
  }

  function quickEditShouldUseLowResolutionInteractive() {
    return quickEditActiveLuts().length > 0;
  }

  function scheduleQuickEditOriginalPreviewRender(renderSignature, sourceMaxSide) {
    const renderedMaxSide = Number(state.quickEdit.previewRenderedMaxSide || 0);
    const targetMaxSide = Math.max(1, Number(sourceMaxSide || 1));
    if (!state.quickEdit.open || !renderSignature || targetMaxSide <= QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE) return false;
    if (state.quickEdit.previewRenderedSignature === renderSignature && renderedMaxSide >= targetMaxSide) return false;
    if (
      state.quickEdit.previewOriginalTimer
      && state.quickEdit.previewOriginalSignature === renderSignature
    ) {
      return true;
    }
    clearQuickEditOriginalPreviewTimer();
    state.quickEdit.previewOriginalSignature = renderSignature;
    state.quickEdit.previewOriginalTimer = setTimeout(() => {
      state.quickEdit.previewOriginalTimer = null;
      state.quickEdit.previewOriginalSignature = '';
      if (!state.quickEdit.open || state.quickEdit.previewRenderRequestSignature !== renderSignature) return;
      renderQuickEditAdjustedPreview({
        original: true,
        maxSide: targetMaxSide,
        quality: 0.98,
        qualityKey: 'original',
        interactive: false,
      });
    }, QUICK_EDIT_ORIGINAL_PREVIEW_DELAY_MS);
    return true;
  }

  function scheduleQuickEditOriginalPreviewForSource(renderSignature, source) {
    return scheduleQuickEditOriginalPreviewRender(renderSignature, quickEditOriginalPreviewTargetForSource(source));
  }

  function quickEditCurrentSourceStageEntry() {
    const modules = window.PicScannerModules;
    if (!modules) return null;
    const photo = state.quickEdit.photo;
    const id = Number((photo && photo.id) || 0);
    if (!id) return null;
    const entry = modules.getModuleSourceEntry(id);
    return modules.sourceStagesActive(entry) ? entry : null;
  }

  function quickEditRenderSignature(sourceSrc, pixelSignature) {
    let signature = String(sourceSrc || '') + '|' + String(pixelSignature || '');
    const modules = window.PicScannerModules;
    if (modules) {
      const stageSignature = modules.sourceSignature(quickEditCurrentSourceStageEntry());
      if (stageSignature) signature += '|ss:' + stageSignature;
    }
    return signature;
  }

  function quickEditRenderedPreviewCovers(renderSignature, maxSide) {
    return state.quickEdit.previewRenderedSignature === renderSignature
      && Number(state.quickEdit.previewRenderedMaxSide || 0) >= Number(maxSide || 0);
  }

  function quickEditPendingPreviewCovers(renderSignature, maxSide) {
    return state.quickEdit.previewRenderPendingSignature === renderSignature
      && Number(state.quickEdit.previewRenderPendingMaxSide || 0) >= Number(maxSide || 0);
  }

  function quickEditSourcePixelMaxSide(source) {
    return Math.max(
      1,
      Number(source && (source.naturalWidth || source.width) || 1),
      Number(source && (source.naturalHeight || source.height) || 1),
    );
  }

  function quickEditBasisMaxSide(width, height) {
    const basis = quickEditImageBasis(Math.max(1, Number(width || 1)), Math.max(1, Number(height || 1)));
    return Math.max(1, Number(basis.width || 1), Number(basis.height || 1));
  }

  function quickEditOriginalPreviewTargetForSource(source) {
    const sourceWidth = Math.max(1, Number(source && (source.naturalWidth || source.width) || 1));
    const sourceHeight = Math.max(1, Number(source && (source.naturalHeight || source.height) || 1));
    return Math.min(quickEditSourcePixelMaxSide(source), quickEditBasisMaxSide(sourceWidth, sourceHeight));
  }

  function quickEditOriginalPreviewTargetFromMessage(message) {
    const displayMaxSide = Math.max(
      1,
      Number(message && (message.displayWidth || message.sourceWidth) || 1),
      Number(message && (message.displayHeight || message.sourceHeight) || 1),
    );
    // 用 display basis（= 原图尺寸）而非 min(source, display)：有 source stage（如人脸
    // 磨皮）激活时，位图先被降采样到 maxSide 再进 QE worker，message.sourceWidth 变成
    // 降采样后的尺寸，会把原图目标误算成 <=1800，导致原图级渲染永不调度。
    // displayWidth/displayHeight 来自 basis（原图尺寸），始终可靠；无 stage 时两者相等。
    return displayMaxSide;
  }

  function cancelStaleQuickEditPendingRender(nextKey, nextRenderSignature) {
    const pendingKey = String(state.quickEdit.previewRenderPendingKey || '');
    if (!pendingKey || pendingKey === String(nextKey || '')) return false;
    const pendingSignature = String(state.quickEdit.previewRenderPendingSignature || '');
    if (pendingSignature && pendingSignature === String(nextRenderSignature || '')) return false;
    quickEditPerfLog('render:cancel-pending', {
      pendingKey,
      nextKey: String(nextKey || ''),
    });
    cancelQuickEditPreviewWorker();
    clearQuickEditPendingPreviewRender();
    clearQuickEditQueuedPreviewRender();
    return true;
  }

  function quickEditPreviewBucketMaxSide(targetMaxSide, sourceMaxSide) {
    const source = Math.min(
      Math.max(1, Number(sourceMaxSide || 1)),
      QUICK_EDIT_SETTLED_PREVIEW_HARD_MAX_SIDE,
    );
    const target = Math.min(source, Math.max(1, Number(targetMaxSide || 1)));
    for (let i = 0; i < QUICK_EDIT_PREVIEW_RENDER_BUCKETS.length; i += 1) {
      const bucket = Math.min(source, Number(QUICK_EDIT_PREVIEW_RENDER_BUCKETS[i] || 0));
      if (bucket > 0 && target <= bucket) return bucket;
    }
    return source;
  }

  function quickEditPreviewRenderMaxSide(source, options) {
    const opts = options || {};
    const basis = quickEditImageBasis(
      Math.max(1, Number(source && (source.naturalWidth || source.width) || 1)),
      Math.max(1, Number(source && (source.naturalHeight || source.height) || 1)),
    );
    const sourceMaxSide = Math.max(Math.max(1, Number(basis.width || 1)), Math.max(1, Number(basis.height || 1)));
    const baseMaxSide = Math.max(1, Number(opts.maxSide || QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE));
    if (opts.original) return Math.min(sourceMaxSide, quickEditSourcePixelMaxSide(source), baseMaxSide);
    if (opts.interactive) return Math.min(sourceMaxSide, baseMaxSide);
    const zoom = Math.max(1, Number(state.quickEdit.viewZoom || 1));
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    const stageRect = stage ? stage.getBoundingClientRect() : null;
    const displayMaxSide = Math.max(
      img && img.offsetWidth > 1 ? img.offsetWidth : 0,
      img && img.offsetHeight > 1 ? img.offsetHeight : 0,
      stageRect && stageRect.width > 1 ? stageRect.width : 0,
      stageRect && stageRect.height > 1 ? stageRect.height : 0,
    );
    const dpr = Math.max(1, Math.min(2, Number(window.devicePixelRatio || 1)));
    const viewMaxSide = displayMaxSide > 1 ? Math.ceil(displayMaxSide * zoom * dpr) : baseMaxSide;
    return quickEditPreviewBucketMaxSide(Math.max(baseMaxSide, viewMaxSide), sourceMaxSide);
  }

  function renderQuickEditAdjustedPreview(options) {
    const opts = options || {};
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const sourceSrc = state.quickEdit.sourceSrc;
    if (!img || !sourceSrc || !state.quickEdit.open) return;
    const params = quickEditEffectiveParams();
    const signature = quickEditPixelSignature(params);
    const renderSignature = quickEditRenderSignature(sourceSrc, signature);
    state.quickEdit.previewRenderRequestSignature = renderSignature;
    if (quickEditWorkerPixelStagesNeutral(params) && !quickEditCurrentSourceStageEntry()) {
      const key = renderSignature + '|source';
      if (state.quickEdit.previewRenderKey === key) return;
      state.quickEdit.previewRenderKey = key;
      state.quickEdit.previewRenderedSignature = renderSignature;
      state.quickEdit.previewRenderedMaxSide = Number.MAX_SAFE_INTEGER;
      clearQuickEditPendingPreviewRender();
      clearQuickEditQueuedPreviewRender();
      revokeQuickEditPreviewObjectUrl();
      setQuickEditPreviewRendering(false);
      quickEditPerfLog('render:neutral', { key });
      if (img.src !== sourceSrc) img.src = sourceSrc;
      return;
    }
    setQuickEditPreviewRendering(true);
    const loadStart = quickEditPerfNow();
    loadQuickEditSourceImage(sourceSrc).then((source) => {
      if (!state.quickEdit.open || state.quickEdit.previewRenderRequestSignature !== renderSignature) {
        quickEditPerfLog('render:skip-stale-request', { renderSignature });
        return;
      }
      const basis = quickEditImageBasis(source.naturalWidth || source.width, source.naturalHeight || source.height);
      const maxSide = quickEditPreviewRenderMaxSide(source, opts);
      const qualityKey = String(opts.qualityKey || 'settled');
      const key = renderSignature + '|' + qualityKey + '|' + maxSide;
      if (state.quickEdit.previewRenderKey === key || quickEditRenderedPreviewCovers(renderSignature, maxSide)) {
        setQuickEditPreviewRendering(false);
        quickEditPerfLog('render:skip-covered', { key, maxSide });
        if (!opts.original && !opts.interactive) scheduleQuickEditOriginalPreviewForSource(renderSignature, source);
        return;
      }
      if (quickEditPendingPreviewCovers(renderSignature, maxSide)) {
        quickEditPerfLog('render:skip-pending', {
          key,
          maxSide,
          pendingKey: state.quickEdit.previewRenderPendingKey,
        });
        return;
      }
      if (state.quickEdit.previewRenderPendingSignature === renderSignature) {
        queueQuickEditPreviewRender(renderSignature, Object.assign({}, opts, { maxSide }));
        quickEditPerfLog('render:queue-after-pending', {
          key,
          maxSide,
          pendingKey: state.quickEdit.previewRenderPendingKey,
          pendingMaxSide: state.quickEdit.previewRenderPendingMaxSide,
        });
        return;
      }
      cancelStaleQuickEditPendingRender(key, renderSignature);
      const token = ++state.quickEdit.previewRenderToken;
      state.quickEdit.previewRenderPendingKey = key;
      state.quickEdit.previewRenderPendingSignature = renderSignature;
      state.quickEdit.previewRenderPendingMaxSide = maxSide;
      setQuickEditPreviewRendering(true);
      quickEditPerfLog('render:start', {
        key,
        token,
        interactive: !!opts.interactive,
        maxSide,
        loadSourceMs: Number((quickEditPerfNow() - loadStart).toFixed(2)),
        source: (source.naturalWidth || source.width) + 'x' + (source.naturalHeight || source.height),
        basis: basis.width + 'x' + basis.height,
      });
      return renderQuickEditPreviewInWorker(source, params, {
        token,
        key,
        renderSignature,
        sourceSrc,
        maxSide,
        orientation: quickEditUsesPhotoImageBasis() ? String(state.quickEdit.photo && state.quickEdit.photo.orientation || '') : '',
        applyOrientation: quickEditSourceNeedsOrientationTransform(source, basis),
        displayWidth: basis.width,
        displayHeight: basis.height,
        quality: Number(opts.quality || 0.92),
      });
    }).catch((err) => {
      setQuickEditPreviewRendering(false);
      console.warn('[PicScanner] 快速调整实时预览渲染失败', err);
    });
  }

  function canQuickEditPhoto(photo) {
    return !!(photo && (photo.original_url || photo.lightbox_url || photo.preview_url || photo.previewable));
  }

  function quickEditNeedsPairChoice(photo) {
    return !!(photo && photo.is_jpg && photo.has_raw_pair && !photo.is_raw);
  }

  function quickEditPairChoiceTitle(photo, fallback) {
    return String((photo && (photo.filename || photo.format_label || photo.format)) || fallback || '').trim();
  }

  function quickEditPairChoiceDetail(photo, mode) {
    const parts = [];
    if (mode) parts.push(mode);
    if (photo && photo.size_text) parts.push(photo.size_text);
    if (photo && photo.format) parts.push(photo.format);
    return parts.join(' · ');
  }

  function renderQuickEditPairChoice() {
    const modal = state.quickEdit.pairChoiceModal;
    if (!modal) return;
    const data = state.quickEdit.pairChoice || {};
    const body = modal.querySelector('[data-quick-edit-pair-body]');
    if (!body) return;
    if (data.loading) {
      body.innerHTML = '<div class="quick-edit-pair-loading">正在读取 RAW+JPG 配对...</div>';
      return;
    }
    if (data.error) {
      body.innerHTML = '<div class="quick-edit-pair-error">' + escapeHtml(data.error) + '</div>';
      return;
    }
    const jpg = data.jpgPhoto || data.sourcePhoto || {};
    const rawOptions = Array.isArray(data.rawOptions) ? data.rawOptions : [];
    const rawButtons = rawOptions.map((raw) => (
      '<button class="quick-edit-pair-option" type="button" data-quick-edit-pair-raw-id="' + escapeHtml(String(raw.id || '')) + '">' +
      '<span><b>RAW 显影</b><em>' + escapeHtml(quickEditPairChoiceTitle(raw, 'RAW 文件')) + '</em></span>' +
      '<small>' + escapeHtml(quickEditPairChoiceDetail(raw, '白平衡 / 高光恢复 / 降噪')) + '</small>' +
      '</button>'
    )).join('');
    body.innerHTML = [
      '<button class="quick-edit-pair-option" type="button" data-quick-edit-pair-jpg>',
      '<span><b>编辑 JPG</b><em>' + escapeHtml(quickEditPairChoiceTitle(jpg, 'JPG 文件')) + '</em></span>',
      '<small>' + escapeHtml(quickEditPairChoiceDetail(jpg, '使用相机直出 JPG')) + '</small>',
      '</button>',
      rawButtons || '<div class="quick-edit-pair-error">没有找到可编辑的 RAW 配对，请重新扫描。</div>',
    ].join('');
  }

  function hideQuickEditPairChoice() {
    if (state.quickEdit.pairChoiceModal) state.quickEdit.pairChoiceModal.classList.add('hidden');
    state.quickEdit.pairChoice = null;
    state.quickEdit.pairChoiceToken += 1;
  }

  function chooseQuickEditPairSource(source) {
    const data = state.quickEdit.pairChoice || {};
    let selected = null;
    if (source === 'jpg') {
      selected = data.jpgPhoto || data.sourcePhoto || null;
    } else {
      const rawId = Number(source || 0);
      selected = (Array.isArray(data.rawOptions) ? data.rawOptions : [])
        .find((photo) => Number(photo.id || 0) === rawId) || null;
    }
    if (!selected) {
      showToast('没有找到可编辑的配对文件', 'error');
      return;
    }
    hideQuickEditPairChoice();
    openQuickEdit(selected, { skipPairChoice: true });
  }

  function ensureQuickEditPairChoice() {
    const existing = state.quickEdit.pairChoiceModal;
    if (existing && existing.isConnected) return existing;
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-pair-choice hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '选择 RAW+JPG 修图源');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-pair-card">',
      '<div class="quick-edit-pair-head">',
      '<h2>选择修图源</h2>',
      '<button class="icon-btn quick-edit-save-close" type="button" data-quick-edit-pair-cancel title="关闭" aria-label="关闭">×</button>',
      '</div>',
      '<p>检测到这张照片同时存在 RAW 和 JPG，请选择本次要编辑的源文件。</p>',
      '<div class="quick-edit-pair-body" data-quick-edit-pair-body></div>',
      '<div class="modal-actions">',
      '<button class="ghost-btn" type="button" data-quick-edit-pair-cancel>取消</button>',
      '</div>',
      '</div>',
    ].join('');
    modal.querySelectorAll('[data-quick-edit-pair-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => hideQuickEditPairChoice());
    });
    modal.querySelector('[data-quick-edit-pair-body]').addEventListener('click', (ev) => {
      const jpg = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-pair-jpg]') : null;
      if (jpg) {
        chooseQuickEditPairSource('jpg');
        return;
      }
      const raw = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-pair-raw-id]') : null;
      if (raw) chooseQuickEditPairSource(raw.dataset.quickEditPairRawId || '');
    });
    document.body.appendChild(modal);
    state.quickEdit.pairChoiceModal = modal;
    return modal;
  }

  function showQuickEditPairChoice(photo) {
    const current = photo || null;
    if (!quickEditNeedsPairChoice(current)) return false;
    const modal = ensureQuickEditPairChoice();
    const token = ++state.quickEdit.pairChoiceToken;
    state.quickEdit.pairChoice = {
      loading: true,
      error: '',
      sourcePhoto: current,
      jpgPhoto: current,
      rawOptions: [],
    };
    renderQuickEditPairChoice();
    modal.classList.remove('hidden');
    call('get_quick_edit_pair_options', current.id).then((res) => {
      const data = state.quickEdit.pairChoice;
      if (!data || state.quickEdit.pairChoiceModal !== modal || token !== state.quickEdit.pairChoiceToken) return;
      if (!res || !res.success || !Array.isArray(res.raw_options) || !res.raw_options.length) {
        throw new Error(res && res.message ? res.message : '没有找到 RAW 配对文件');
      }
      const jpgPhoto = res.jpg_photo || current;
      state.photoCache.set(Number(jpgPhoto.id || current.id || 0), jpgPhoto);
      res.raw_options.forEach((item) => {
        if (item && item.id) state.photoCache.set(Number(item.id), item);
      });
      state.quickEdit.pairChoice = Object.assign({}, data, {
        loading: false,
        error: '',
        jpgPhoto,
        rawOptions: res.raw_options,
      });
      renderQuickEditPairChoice();
    }).catch((err) => {
      const data = state.quickEdit.pairChoice;
      if (!data || state.quickEdit.pairChoiceModal !== modal || token !== state.quickEdit.pairChoiceToken) return;
      console.warn('[PicScanner] RAW+JPG 配对读取失败', err);
      state.quickEdit.pairChoice = Object.assign({}, data, {
        loading: false,
        error: String((err && err.message) || 'RAW+JPG 配对读取失败'),
      });
      renderQuickEditPairChoice();
    });
    return true;
  }

  function requirePicModification() {
    if (
      !window.PicModification
      || typeof window.PicModification.createQuickEditPanController !== 'function'
      || typeof window.PicModification.createCurvePanel !== 'function'
    ) {
      throw new Error('PicModification module not loaded');
    }
    return window.PicModification;
  }

  function ensureQuickEditPanController(stage) {
    if (PS.quickEditPanController) {
      PS.quickEditPanController.refresh();
      return PS.quickEditPanController;
    }
    PS.quickEditPanController = requirePicModification().createQuickEditPanController({
      stage,
      isOpen: () => state.quickEdit.open,
      isToolIdle: () => (
        !isQuickEditCropToolActive()
        && !isQuickEditRotateToolActive()
        && Number(state.quickEdit.viewZoom || 1) > 1
      ),
      hasImage: () => {
        const el = state.quickEdit.el;
        const img = el ? el.querySelector('[data-quick-edit-img]') : null;
        return !!(img && PS.imageHasSource(img));
      },
      getPan: () => ({
        x: state.quickEdit.panX,
        y: state.quickEdit.panY,
      }),
      setPan: (x, y) => {
        const pan = clampQuickEditPan(x, y);
        state.quickEdit.panX = pan.x;
        state.quickEdit.panY = pan.y;
      },
      applyPreview: () => applyQuickEditPreview({ skipOverlay: true, skipColorRender: true }),
    });
    return PS.quickEditPanController;
  }

  function hideQuickEditExitConfirm() {
    const modal = state.quickEdit.exitConfirm;
    if (!modal) return;
    modal.classList.add('hidden');
  }

  function ensureQuickEditExitConfirm() {
    if (state.quickEdit.exitConfirm && state.quickEdit.exitConfirm.isConnected) return state.quickEdit.exitConfirm;
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-exit-confirm hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '退出快速调整确认');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-exit-card">',
      '<h2>退出快速调整？</h2>',
      '<p>当前调整尚未保留。再次按 Esc，或点击确认退出，将丢弃这些更改。</p>',
      '<div class="modal-actions">',
      '<button class="ghost-btn" type="button" data-quick-edit-exit-cancel>继续调整</button>',
      '<button class="danger-btn" type="button" data-quick-edit-exit-confirm>确认退出</button>',
      '</div>',
      '</div>',
    ].join('');
    modal.querySelector('[data-quick-edit-exit-cancel]').addEventListener('click', () => hideQuickEditExitConfirm());
    modal.querySelector('[data-quick-edit-exit-confirm]').addEventListener('click', () => {
      hideQuickEditExitConfirm();
      closeQuickEdit({ force: true });
    });
    document.body.appendChild(modal);
    state.quickEdit.exitConfirm = modal;
    return modal;
  }

  function showQuickEditExitConfirm() {
    const modal = ensureQuickEditExitConfirm();
    modal.classList.remove('hidden');
    const confirm = modal.querySelector('[data-quick-edit-exit-confirm]');
    if (confirm) requestAnimationFrame(() => confirm.focus({ preventScroll: true }));
  }

  function quickEditRawModule() {
    return window.PicScannerRawEdit || null;
  }

  function quickEditIsRawPhoto(photo) {
    const current = photo || state.quickEdit.photo || {};
    return !!current.is_raw;
  }

  function quickEditUsesRawDevelopPipeline() {
    return quickEditIsRawPhoto() && !state.quickEdit.bakedSource;
  }

  function quickEditRawDevelopParams(params, options) {
    const opts = options || {};
    const clean = normalizeQuickEditParams(params || quickEditEffectiveParams());
    const mod = quickEditRawModule();
    const normalized = mod && typeof mod.normalizeParams === 'function' ? mod.normalizeParams(clean) : {
      exposure: clamp(Number(clean.exposure || 0), QUICK_EDIT_EXPOSURE_MIN_EV, QUICK_EDIT_EXPOSURE_MAX_EV),
      temperature: normalizeQuickEditTemperature(clean.temperature),
      tint: clamp(Number(clean.tint || 0), -100, 100),
      rawHighlightRecovery: clamp(Number(clean.rawHighlightRecovery || 0), 0, 100),
      rawNoiseReduction: clamp(Number(clean.rawNoiseReduction || 0), 0, 100),
      curvePoints: quickEditCurvePoints(clean),
    };
    const stageSource = Array.isArray(opts.stages)
      ? opts.stages
      : (state.quickEdit.committedStages || []).concat([state.quickEdit.params || quickEditDefaultParams()]);
    const curveStages = stageSource
      .map((stage) => quickEditCurvePoints(stage))
      .filter((points) => !isQuickEditCurveNeutral({ curvePoints: points }));
    normalized.curvePoints = QUICK_EDIT_DEFAULT_CURVE_POINTS.map((point) => Object.assign({}, point));
    normalized.curveStages = curveStages;
    return normalized;
  }

  function quickEditRawDevelopSignature(params) {
    const rawParams = quickEditRawDevelopParams(params);
    const mod = quickEditRawModule();
    if (mod && typeof mod.signature === 'function') return mod.signature(rawParams);
    return JSON.stringify(rawParams);
  }

  function quickEditIsRawDevelopParamKey(key) {
    const mod = quickEditRawModule();
    if (mod && typeof mod.isRawDevelopParam === 'function') return mod.isRawDevelopParam(key);
    return ['exposure', 'temperature', 'tint', 'rawHighlightRecovery', 'rawNoiseReduction', 'curvePoints'].includes(String(key || ''));
  }

  function quickEditRawPreviewHasDevelopParams(params) {
    if (!quickEditIsRawPhoto()) return false;
    const signature = quickEditRawDevelopSignature(params || quickEditEffectiveParams());
    return !!signature
      && String(state.quickEdit.rawPreviewSignature || '').startsWith(signature + '|preview|')
      && String(state.quickEdit.sourceSrc || '') === String(state.quickEdit.rawPreviewUrl || '');
  }

  function quickEditPixelParamsForRawDevelopedSource(params) {
    const clean = normalizeQuickEditParams(params);
    clean.exposure = 0;
    clean.temperature = QUICK_EDIT_TEMPERATURE_NEUTRAL_K;
    clean.tint = 0;
    clean.rawHighlightRecovery = 0;
    clean.rawNoiseReduction = 0;
    clean.curvePoints = QUICK_EDIT_DEFAULT_CURVE_POINTS.map((point) => Object.assign({}, point));
    return clean;
  }

  function quickEditPixelParamsForCurrentSource(params) {
    const clean = normalizeQuickEditParams(params);
    if (state.quickEdit.bakedSource) return clean;
    if (!quickEditIsRawPhoto()) return clean;
    clean.exposure = 0;
    clean.temperature = QUICK_EDIT_TEMPERATURE_NEUTRAL_K;
    clean.tint = 0;
    clean.rawHighlightRecovery = 0;
    clean.rawNoiseReduction = 0;
    clean.curvePoints = QUICK_EDIT_DEFAULT_CURVE_POINTS.map((point) => Object.assign({}, point));
    return clean;
  }

  function quickEditSaveFormatConfig(format) {
    const key = String(format || 'jpg').toLowerCase();
    return QUICK_EDIT_SAVE_FORMATS.find((item) => item.key === key) || QUICK_EDIT_SAVE_FORMATS[0];
  }

  function quickEditSaveSupportsFormat(format) {
    const item = quickEditSaveFormatConfig(format);
    return !item.rawOnly || quickEditIsRawPhoto();
  }

  function quickEditSaveMime(format) {
    const key = quickEditSaveFormatConfig(format).key;
    if (key === 'tif16') return 'image/tiff';
    if (key === 'png') return 'image/png';
    if (key === 'webp') return 'image/webp';
    return 'image/jpeg';
  }

  function quickEditSaveSupportsExif(format) {
    return ['jpg', 'tif16'].includes(quickEditSaveFormatConfig(format).key);
  }

  function quickEditSaveQualityRatio(quality) {
    return clamp(Number(quality || 92), 1, 100) / 100;
  }

  function quickEditNormalizeSaveLongEdge(value) {
    return Math.round(clamp(
      Number(value || QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT),
      QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MIN,
      QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX,
    ));
  }

  function quickEditNormalizeSaveDimension(value, fallback) {
    return Math.round(clamp(
      Number(value || fallback || QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT),
      1,
      QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX,
    ));
  }

  function quickEditConstrainSaveDimensions(width, height) {
    let w = quickEditNormalizeSaveDimension(width, QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT);
    let h = quickEditNormalizeSaveDimension(height, QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT);
    const maxSide = Math.max(w, h);
    if (maxSide > QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX) {
      const scale = QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX / maxSide;
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }
    return { width: w, height: h };
  }

  function quickEditPositiveSaveDimensions(width, height) {
    return {
      width: Math.max(1, Math.round(Number(width || 1))),
      height: Math.max(1, Math.round(Number(height || 1))),
    };
  }

  function quickEditScaleSaveDimensionsToLongEdge(size, longEdge) {
    const base = quickEditConstrainSaveDimensions(size && size.width, size && size.height);
    const baseLongEdge = Math.max(base.width, base.height);
    const targetLongEdge = Math.min(baseLongEdge, quickEditNormalizeSaveLongEdge(longEdge));
    const scale = targetLongEdge / Math.max(1, baseLongEdge);
    return quickEditConstrainSaveDimensions(
      Math.round(base.width * scale),
      Math.round(base.height * scale),
    );
  }

  function quickEditSaveDimensionsFromEditedSide(side, value, basis) {
    const base = quickEditConstrainSaveDimensions(basis && basis.width, basis && basis.height);
    const key = side === 'height' ? 'height' : 'width';
    const entered = quickEditNormalizeSaveDimension(value, base[key]);
    if (key === 'height') {
      return quickEditConstrainSaveDimensions(
        Math.round(entered * base.width / Math.max(1, base.height)),
        entered,
      );
    }
    return quickEditConstrainSaveDimensions(
      entered,
      Math.round(entered * base.height / Math.max(1, base.width)),
    );
  }

  function quickEditCurrentSaveResolution() {
    const photo = state.quickEdit.photo || {};
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    if (
      stage
      && img
      && PS.imageHasSource(img)
      && Number(img.offsetWidth || 0) > 1
      && Number(img.offsetHeight || 0) > 1
    ) {
      const frame = quickEditBakeFrame(stage, img, { canonical: true });
      if (frame && frame.w > 1 && frame.h > 1) {
        const renderView = quickEditRenderView({ canonical: true });
        const basis = quickEditImageBasis(img.naturalWidth || img.width, img.naturalHeight || img.height);
        const sourceScale = Math.max(
          Number(basis.width || img.naturalWidth || img.width || 1) / Math.max(1, Number(img.offsetWidth || 1)),
          Number(basis.height || img.naturalHeight || img.height || 1) / Math.max(1, Number(img.offsetHeight || 1)),
        );
        return quickEditPositiveSaveDimensions(
          Math.round(frame.w * sourceScale / renderView.zoom),
          Math.round(frame.h * sourceScale / renderView.zoom),
        );
      }
    }
    const basis = PS.lightboxImageBasis(
      photo,
      Math.max(1, Number(photo.width || 1)),
      Math.max(1, Number(photo.height || 1)),
    );
    return quickEditPositiveSaveDimensions(basis.width, basis.height);
  }

  function quickEditSourcePath() {
    return String((state.quickEdit.photo && state.quickEdit.photo.path) || '');
  }

  function quickEditOriginalSaveUrl() {
    const photo = state.quickEdit.photo || {};
    return String(photo.original_url || '');
  }

  function quickEditDefaultSavePath() {
    const photoPath = quickEditSourcePath();
    if (photoPath) {
      const index = Math.max(photoPath.lastIndexOf('\\'), photoPath.lastIndexOf('/'));
      if (index > 0) return photoPath.slice(0, index);
    }
    return String(state.currentRootPath || '');
  }

  function quickEditQualityDescription(value) {
    const quality = clamp(Number(value || 92), 1, 100);
    if (quality >= 98) return '最高保真，文件体积最大';
    if (quality >= 90) return '高质量，适合成片保存';
    if (quality >= 80) return '标准质量，体积和画质均衡';
    return '预览质量，适合快速分享';
  }

  function quickEditSaveSizeDescription(options, formatConfig) {
    const opts = quickEditSaveOptions(options);
    if (formatConfig && formatConfig.key === 'tif16') return '导出 ' + quickEditSaveOutputDetail(opts.currentWidth, opts.currentHeight);
    const frameConfig = quickEditActiveExportFrame(opts);
    const framedSize = frameConfig ? quickEditFramedOutputSize(opts.sizeWidth, opts.sizeHeight, frameConfig) : null;
    return '导出 ' + quickEditSaveOutputDetail(framedSize ? framedSize.width : opts.sizeWidth, framedSize ? framedSize.height : opts.sizeHeight);
  }

  function quickEditSaveProgressState(stage, percent, detail) {
    return {
      stage: String(stage || '准备保存'),
      percent: clamp(Number(percent || 0), 0, 100),
      detail: String(detail || ''),
    };
  }

  function setQuickEditSaveProgress(stage, percent, detail) {
    state.quickEdit.saveProgress = quickEditSaveProgressState(stage, percent, detail);
    syncQuickEditSaveConfirm();
  }

  function clearQuickEditSaveProgress() {
    state.quickEdit.saveProgress = null;
    syncQuickEditSaveConfirm();
  }

  function readQuickEditSaveOptionsMemory() {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(QUICK_EDIT_SAVE_OPTIONS_KEY) : '';
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      console.warn('[PicScanner] 快速调整保存选项读取失败', err);
      return {};
    }
  }

  function rememberQuickEditSaveOptions(options) {
    const clean = quickEditSaveOptions(options);
    state.quickEdit.saveOptions = clean;
    try {
      if (window.localStorage) {
        window.localStorage.setItem(QUICK_EDIT_SAVE_OPTIONS_KEY, JSON.stringify(clean));
      }
    } catch (err) {
      console.warn('[PicScanner] 快速调整保存选项保存失败', err);
    }
    return clean;
  }

  function quickEditSaveOptions(source) {
    const current = Object.assign({}, state.quickEdit.saveOptions || {}, source || {});
    let format = quickEditSaveFormatConfig(current.format).key;
    if (!quickEditSaveSupportsFormat(format)) format = QUICK_EDIT_SAVE_FORMATS[0].key;
    const path = String(current.path || '').trim() || quickEditDefaultSavePath();
    const sizeMode = current.sizeMode === 'longEdge' ? 'longEdge' : 'original';
    const currentSize = quickEditCurrentSaveResolution();
    const requestedSizePreset = sizeMode === 'longEdge' ? String(current.sizePreset || '') : 'original';
    let sizeWidth = quickEditNormalizeSaveDimension(current.sizeWidth, currentSize.width);
    let sizeHeight = quickEditNormalizeSaveDimension(current.sizeHeight, currentSize.height);
    if (sizeMode !== 'longEdge') {
      sizeWidth = currentSize.width;
      sizeHeight = currentSize.height;
    } else if (requestedSizePreset === '2048') {
      const presetSize = quickEditScaleSaveDimensionsToLongEdge(currentSize, 2048);
      sizeWidth = presetSize.width;
      sizeHeight = presetSize.height;
    } else if (!Number(current.sizeWidth || 0) || !Number(current.sizeHeight || 0)) {
      const legacy = quickEditScaleSaveDimensionsToLongEdge(currentSize, current.sizeLongEdge);
      sizeWidth = legacy.width;
      sizeHeight = legacy.height;
    } else {
      const constrained = quickEditConstrainSaveDimensions(sizeWidth, sizeHeight);
      sizeWidth = constrained.width;
      sizeHeight = constrained.height;
    }
    const sizeLongEdge = Math.max(sizeWidth, sizeHeight);
    let sizePreset = sizeMode === 'longEdge' ? String(current.sizePreset || '') : 'original';
    if (sizeMode !== 'longEdge') {
      sizePreset = 'original';
    } else if (!['2048', 'custom'].includes(sizePreset)) {
      sizePreset = sizeMode === 'longEdge' && quickEditNormalizeSaveLongEdge(current.sizeLongEdge) === 2048 ? '2048' : 'custom';
    }
    return {
      path,
      quality: clamp(Number(current.quality || QUICK_EDIT_DEFAULT_SAVE_QUALITY), 1, 100),
      format,
      sizeMode,
      sizePreset,
      currentWidth: currentSize.width,
      currentHeight: currentSize.height,
      sizeWidth,
      sizeHeight,
      sizeLongEdge,
      includeFrame: !!current.includeFrame,
      preserveExif: quickEditSaveSupportsExif(format) && !!current.preserveExif,
    };
  }

  function quickEditFrameDefaultInsets(preset) {
    const key = quickEditFramePresetKey(preset);
    if (key === 'paper') return { top: 5, right: 5, bottom: 13, left: 5 };
    if (key === 'white' || key === 'black') return { top: 5, right: 5, bottom: 5, left: 5 };
    return { top: 5, right: 5, bottom: 5, left: 5 };
  }

  function quickEditNormalizeFrameInsets(source) {
    const src = source && typeof source === 'object' ? source : {};
    return {
      top: clamp(Number(src.top || 0), 0, 40),
      right: clamp(Number(src.right || 0), 0, 40),
      bottom: clamp(Number(src.bottom || 0), 0, 40),
      left: clamp(Number(src.left || 0), 0, 40),
    };
  }

  function quickEditDefaultFrameTextColor() {
    return quickEditFramePresetKey(state.quickEdit.framePreset) === 'black' ? '#f5f5f2' : '#222222';
  }

  function quickEditNormalizeFrameTextOffset(value) {
    const n = Number(value || 0);
    // 偏移以锚点为基准存储，纵向可达范围随画面长宽比增大而远超 ±100%；
    // 真正的位置边界由渲染/导出时的像素级裁剪（相框外框）保证，这里仅做宽松数值约束。
    return Number.isFinite(n) ? Math.round(clamp(n, -1000, 1000) * 1000) / 1000 : 0;
  }

  const QUICK_EDIT_FRAME_TEXT_COORDINATE_SPACE = 'short-edge-anchor-v1';
  const QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE = 'axis-percent-anchor-v1';

  function quickEditNormalizeFrameTextWeight(value) {
    const n = Number(value || 560);
    return Number.isFinite(n) ? clamp(Math.round(n), 100, 900) : 560;
  }

  function quickEditCanvasFrameTextWeight(value) {
    return Math.max(100, Math.min(900, Math.round(quickEditNormalizeFrameTextWeight(value) / 100) * 100));
  }

  function quickEditFrameTextBasisScale(contentBasis, displayBasis) {
    const content = Math.max(1, Number(contentBasis || 1));
    const display = Math.max(1, Number(displayBasis || 1));
    return content / display;
  }

  function quickEditPreviewFrameTextSize(layer, contentBasis) {
    const rawSize = clamp(Number(layer && layer.size || 18), 8, 72);
    const basis = Math.max(1, Number(contentBasis || 1));
    return Math.max(1, Math.round(rawSize * basis / 600 * 100) / 100);
  }

  function quickEditScaledFrameTextSize(layer, contentBasis, displayBasis) {
    const rawSize = clamp(Number(layer && layer.size || 18), 8, 72);
    return Math.max(1, Math.round(rawSize * quickEditFrameTextBasisScale(contentBasis, displayBasis) * 100) / 100);
  }

  function quickEditNormalizeFrameTextFamily(value) {
    const clean = String(value || 'system-ui')
      .replace(/[;\r\n]/g, '')
      .trim()
      .slice(0, 80);
    return clean || 'system-ui';
  }

  function quickEditCanvasFrameTextFamily(value) {
    const generic = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace)$/i;
    const families = quickEditNormalizeFrameTextFamily(value)
      .split(',')
      .map((item) => {
        const family = String(item || '').trim().replace(/^['"]|['"]$/g, '').replace(/["\\]/g, '');
        if (!family) return '';
        if (/^(system-ui|ui-sans-serif)$/i.test(family)) return 'system-ui, "Segoe UI", "Microsoft YaHei", sans-serif';
        return generic.test(family) ? family : '"' + family + '"';
      })
      .filter(Boolean);
    return families.length ? families.join(', ') : 'system-ui';
  }

  function quickEditCanvasFrameTextFont(layer, contentBasis, displayBasis) {
    return quickEditCanvasFrameTextWeight(layer && layer.weight) + ' '
      + quickEditScaledFrameTextSize(layer, contentBasis, displayBasis) + 'px '
      + quickEditCanvasFrameTextFamily(layer && layer.fontFamily);
  }

  function quickEditNormalizeFrameTextCoordinateSpace(value) {
    const space = String(value || '');
    if (space === QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE) return QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE;
    return QUICK_EDIT_FRAME_TEXT_COORDINATE_SPACE;
  }

  function quickEditNewFrameTextLayer() {
    return {
      id: 'frame-text-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      text: '{filename}  {shutter_speed}  f/{aperture}  ISO {iso}',
      position: 'bottom-center',
      coordinateSpace: QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE,
      x: 0,
      y: 0,
      fontFamily: 'system-ui',
      size: 18,
      weight: 560,
      color: quickEditDefaultFrameTextColor(),
      enabled: true,
    };
  }

  function quickEditNormalizeFrameTextLayer(layer, index) {
    const raw = layer && typeof layer === 'object' ? layer : {};
    const position = ['top-center', 'bottom-center', 'bottom-left', 'bottom-right'].includes(String(raw.position || ''))
      ? String(raw.position)
      : 'bottom-center';
    return {
      id: String(raw.id || ('frame-text-' + index + '-' + Date.now().toString(36))),
      text: String(raw.text || ''),
      position,
      coordinateSpace: quickEditNormalizeFrameTextCoordinateSpace(raw.coordinateSpace || raw.coordinate_space),
      x: quickEditNormalizeFrameTextOffset(raw.x !== undefined ? raw.x : raw.offsetX),
      y: quickEditNormalizeFrameTextOffset(raw.y !== undefined ? raw.y : raw.offsetY),
      fontFamily: quickEditNormalizeFrameTextFamily(raw.fontFamily || raw.font_family),
      size: clamp(Number(raw.size || 18), 8, 72),
      weight: quickEditNormalizeFrameTextWeight(raw.weight),
      color: /^#[0-9a-f]{6}$/i.test(String(raw.color || '')) ? String(raw.color).toLowerCase() : quickEditDefaultFrameTextColor(),
      enabled: raw.enabled !== false,
    };
  }

  function quickEditFrameTextLayers() {
    const layers = Array.isArray(state.quickEdit.frameTextLayers) ? state.quickEdit.frameTextLayers : [];
    const normalized = layers.map((layer, index) => quickEditNormalizeFrameTextLayer(layer, index));
    state.quickEdit.frameTextLayers = normalized;
    return normalized;
  }

  function quickEditNormalizeFrameImageOffset(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.round(clamp(n, -160, 160) * 1000) / 1000 : 0;
  }

  function quickEditNormalizeFrameImageSize(value) {
    const n = Number(value || 18);
    return Number.isFinite(n) ? Math.round(clamp(n, 2, 90) * 10) / 10 : 18;
  }

  function quickEditNormalizeFrameImageRotation(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.round(clamp(n, -180, 180) * 10) / 10 : 0;
  }

  function quickEditNormalizeFrameImageOpacity(value) {
    const n = Number(value === undefined || value === null || value === '' ? 100 : value);
    return Number.isFinite(n) ? Math.round(clamp(n, 0, 100)) : 100;
  }

  const QUICK_EDIT_FRAME_IMAGE_COORDINATE_SPACE = 'short-edge-anchor-v1';
  const QUICK_EDIT_FRAME_IMAGE_AXIS_COORDINATE_SPACE = 'axis-percent-anchor-v1';

  function quickEditNormalizeFrameImageAnchor(value) {
    return quickEditGeometryApi().normalizeImageLayerAnchor(value);
  }

  function quickEditNormalizeFrameAssetId(value) {
    const text = String(value || '').trim();
    if (!text || text === '.' || text === '..' || /[\\/]/.test(text)) return '';
    return /\.(png|jpe?g|webp|svg)$/i.test(text) ? text : '';
  }

  function quickEditFrameAssetName(assetId, fallback) {
    const source = String(fallback || assetId || '').trim();
    const base = source.replace(/\.[^.]+$/, '').replace(/--[0-9a-f]{12}$/i, '').trim();
    return base || '图片标识';
  }

  function quickEditCacheFrameAsset(item, dataUrl) {
    const assetId = quickEditNormalizeFrameAssetId(item && item.id);
    const url = String(dataUrl || '');
    if (!assetId || !url) return;
    const current = PS.quickEditFrameAssetCache.get(assetId) || {};
    PS.quickEditFrameAssetCache.set(assetId, Object.assign({}, current, { dataUrl: url, item: item || null }));
  }

  function quickEditCachedFrameAssetUrl(assetId) {
    const id = quickEditNormalizeFrameAssetId(assetId);
    if (!id) return '';
    const entry = PS.quickEditFrameAssetCache.get(id);
    return entry && entry.dataUrl ? entry.dataUrl : '';
  }

  function quickEditCachedFrameAssetAspectRatio(assetId) {
    const id = quickEditNormalizeFrameAssetId(assetId);
    if (!id) return 0;
    const entry = PS.quickEditFrameAssetCache.get(id);
    const ratio = Number(entry && entry.aspectRatio || 0);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 0;
  }

  function quickEditEnsureFrameAssetMetrics(assetId) {
    const id = quickEditNormalizeFrameAssetId(assetId);
    if (!id) return Promise.reject(new Error('标识图片引用无效'));
    const cachedRatio = quickEditCachedFrameAssetAspectRatio(id);
    if (cachedRatio > 0) return Promise.resolve(cachedRatio);
    const current = PS.quickEditFrameAssetCache.get(id) || {};
    if (current.metricsPromise) return current.metricsPromise;
    const metricsPromise = quickEditLoadFrameAssetUrl(id, { silent: true })
      .then((url) => quickEditLoadFrameImageElement(url))
      .then((image) => {
        const width = Number(image.naturalWidth || image.width || 0);
        const height = Number(image.naturalHeight || image.height || 0);
        if (!(width > 0) || !(height > 0)) throw new Error('标识图片没有可用的宽高信息');
        const ratio = width / height;
        const latest = PS.quickEditFrameAssetCache.get(id) || {};
        PS.quickEditFrameAssetCache.set(id, Object.assign({}, latest, { aspectRatio: ratio, metricsPromise: null }));
        return ratio;
      })
      .catch((err) => {
        const latest = PS.quickEditFrameAssetCache.get(id) || {};
        PS.quickEditFrameAssetCache.set(id, Object.assign({}, latest, { metricsPromise: null }));
        throw err;
      });
    const latest = PS.quickEditFrameAssetCache.get(id) || current;
    PS.quickEditFrameAssetCache.set(id, Object.assign({}, latest, { metricsPromise }));
    return metricsPromise;
  }

  function quickEditLoadFrameAssetUrl(assetId, options) {
    const id = quickEditNormalizeFrameAssetId(assetId);
    const opts = options || {};
    if (!id) return Promise.reject(new Error('标识图片引用无效'));
    const current = PS.quickEditFrameAssetCache.get(id);
    if (current && current.dataUrl) return Promise.resolve(current.dataUrl);
    if (current && current.promise) return current.promise;
    if (current && current.error) return Promise.reject(new Error(current.error));
    const promise = call('read_quick_edit_frame_asset', id)
      .then((res) => {
        if (!res || !res.success || !res.data_url) {
          throw new Error(res && res.message ? res.message : '标识图片读取失败');
        }
        quickEditCacheFrameAsset(res.item || { id }, res.data_url);
        return res.data_url;
      })
      .catch((err) => {
        const message = String((err && err.message) || err || '标识图片读取失败');
        PS.quickEditFrameAssetCache.set(id, { error: message });
        if (!opts.silent) showToast(message, 'error');
        throw err;
      });
    PS.quickEditFrameAssetCache.set(id, Object.assign({}, current || {}, { promise }));
    return promise;
  }

  function quickEditEnsureFrameAssetUrl(assetId) {
    const id = quickEditNormalizeFrameAssetId(assetId);
    if (!id) return '';
    const url = quickEditCachedFrameAssetUrl(id);
    if (url) return url;
    const current = PS.quickEditFrameAssetCache.get(id);
    if (!current || (!current.promise && !current.error)) {
      quickEditLoadFrameAssetUrl(id, { silent: true })
        .then(() => {
          renderQuickEditFrameImageLayers();
          syncQuickEditFrameAssetModal();
          syncQuickEditFramePreview();
        })
        .catch((err) => console.warn('[PicScanner] frame asset preview load failed', err));
    }
    return '';
  }

  function quickEditNormalizeFrameImageCoordinateSpace(value) {
    const space = String(value || '');
    if (space === QUICK_EDIT_FRAME_IMAGE_AXIS_COORDINATE_SPACE) return QUICK_EDIT_FRAME_IMAGE_AXIS_COORDINATE_SPACE;
    return QUICK_EDIT_FRAME_IMAGE_COORDINATE_SPACE;
  }

  function quickEditNewFrameImageLayer(asset, dataUrl) {
    const assetId = quickEditNormalizeFrameAssetId(asset && asset.id);
    return {
      id: 'frame-image-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      assetId,
      name: quickEditFrameAssetName(assetId, asset && asset.name),
      mime: String(asset && asset.mime || ''),
      src: String(dataUrl || ''),
      coordinateSpace: QUICK_EDIT_FRAME_IMAGE_AXIS_COORDINATE_SPACE,
      anchor: 'center',
      x: 0,
      y: 0,
      size: 18,
      rotation: 0,
      opacity: 100,
      enabled: true,
    };
  }

  function quickEditNormalizeFrameImageLayer(layer, index) {
    const raw = layer && typeof layer === 'object' ? layer : {};
    const assetId = quickEditNormalizeFrameAssetId(raw.assetId || raw.asset_id);
    const name = quickEditFrameAssetName(assetId, raw.name);
    const rawSpace = String(raw.coordinateSpace || raw.coordinate_space || '');
    let coordinateSpace = rawSpace === QUICK_EDIT_FRAME_IMAGE_AXIS_COORDINATE_SPACE
      || rawSpace === QUICK_EDIT_FRAME_IMAGE_COORDINATE_SPACE
      ? rawSpace
      : '';
    let anchor = coordinateSpace ? (quickEditNormalizeFrameImageAnchor(raw.anchor) || 'center') : '';
    let x = quickEditNormalizeFrameImageOffset(raw.x);
    let y = quickEditNormalizeFrameImageOffset(raw.y);
    if (!coordinateSpace) {
      const legacyX = 0.5 + x / 100;
      const legacyY = 0.5 + y / 100;
      anchor = quickEditGeometryApi().closestImageLayerAnchor(legacyX, legacyY, 1, 1);
      const migrated = quickEditGeometryApi().imageLayerOffsetsForPoint({
        x: legacyX,
        y: legacyY,
        contentWidth: 1,
        contentHeight: 1,
        anchor,
      });
      coordinateSpace = QUICK_EDIT_FRAME_IMAGE_COORDINATE_SPACE;
      x = quickEditNormalizeFrameImageOffset(migrated.offsetXPercent);
      y = quickEditNormalizeFrameImageOffset(migrated.offsetYPercent);
    }
    if (assetId && raw.src) quickEditCacheFrameAsset({ id: assetId, name, mime: raw.mime }, raw.src);
    return {
      id: String(raw.id || ('frame-image-' + index + '-' + Date.now().toString(36))),
      assetId,
      name,
      mime: String(raw.mime || ''),
      src: quickEditCachedFrameAssetUrl(assetId) || String(raw.src || ''),
      coordinateSpace,
      anchor,
      x,
      y,
      size: quickEditNormalizeFrameImageSize(raw.size),
      rotation: quickEditNormalizeFrameImageRotation(raw.rotation),
      opacity: quickEditNormalizeFrameImageOpacity(raw.opacity),
      enabled: raw.enabled !== false,
    };
  }

  function quickEditFrameImageLayers() {
    const layers = Array.isArray(state.quickEdit.frameImageLayers) ? state.quickEdit.frameImageLayers : [];
    const normalized = layers
      .map((layer, index) => quickEditNormalizeFrameImageLayer(layer, index))
      .filter((layer) => layer.assetId);
    state.quickEdit.frameImageLayers = normalized;
    return normalized;
  }

  function quickEditFrameImageLayerById(id) {
    const layerId = String(id || '');
    return quickEditFrameImageLayers().find((layer) => layer.id === layerId) || null;
  }

  function quickEditFrameAssetById(assetId) {
    const id = quickEditNormalizeFrameAssetId(assetId);
    if (!id) return null;
    return (state.quickEdit.frameAssets || []).find((item) => item && item.id === id) || null;
  }

  function quickEditCurrentFrameUsesAsset(assetId) {
    const id = quickEditNormalizeFrameAssetId(assetId);
    if (!id) return false;
    return quickEditFrameImageLayers().some((layer) => quickEditNormalizeFrameAssetId(layer.assetId) === id);
  }

  function addQuickEditFrameAssetLayer(asset, options) {
    const opts = options || {};
    const item = asset && typeof asset === 'object' ? asset : quickEditFrameAssetById(asset);
    const assetId = quickEditNormalizeFrameAssetId(item && item.id);
    if (!assetId) {
      showToast('标识图片引用无效', 'error');
      return false;
    }
    const layers = quickEditFrameImageLayers();
    const layer = quickEditNewFrameImageLayer(
      Object.assign({}, item, { id: assetId }),
      quickEditCachedFrameAssetUrl(assetId),
    );
    if (!layer.assetId) {
      showToast('标识图片引用无效', 'error');
      return false;
    }
    layers.push(layer);
    state.quickEdit.frameImageLayers = layers;
    renderQuickEditFrameImageLayers();
    syncQuickEditFramePreview();
    syncQuickEditFramePresetUi();
    syncQuickEditSaveConfirm();
    if (!opts.silent) showToast('已添加图片标识：' + (layer.name || assetId));
    return true;
  }

  async function refreshQuickEditFrameAssets(options) {
    const opts = options || {};
    if (state.quickEdit.frameAssetsLoading) return;
    state.quickEdit.frameAssetsLoading = true;
    if (!opts.silent) state.quickEdit.frameAssetsMessage = '正在读取图片库';
    syncQuickEditFrameAssetModal();
    try {
      const res = await call('list_quick_edit_frame_assets');
      if (!res || !res.success) throw new Error(res && res.message ? res.message : '图片库读取失败');
      state.quickEdit.frameAssets = Array.isArray(res.items) ? res.items : [];
      state.quickEdit.frameAssetsLoaded = true;
      state.quickEdit.frameAssetsMessage = '';
    } catch (err) {
      console.warn('[PicScanner] 图片库读取失败', err);
      state.quickEdit.frameAssetsMessage = String((err && err.message) || '图片库读取失败');
      if (!opts.silent) showToast(state.quickEdit.frameAssetsMessage, 'error');
    } finally {
      state.quickEdit.frameAssetsLoading = false;
      syncQuickEditFrameAssetModal();
    }
  }

  async function importQuickEditFrameAssetToLibrary(options) {
    if (!state.quickEdit.open) return;
    const opts = options || {};
    try {
      const res = await call('import_quick_edit_frame_asset');
      if (!res || !res.success) {
        if (res && res.cancelled) return;
        showToast(res && res.message ? res.message : '标识图片导入失败', 'error');
        return;
      }
      quickEditCacheFrameAsset(res.item, res.data_url);
      if (res.item && res.item.id) {
        const current = (state.quickEdit.frameAssets || []).filter((item) => item && item.id !== res.item.id);
        state.quickEdit.frameAssets = [res.item].concat(current);
        state.quickEdit.frameAssetsLoaded = true;
        state.quickEdit.frameAssetSelectedId = res.item.id;
      }
      syncQuickEditFrameAssetModal();
      if (opts.addToFrame !== false) addQuickEditFrameAssetLayer(res.item, { silent: true });
      showToast(res.message || '已添加图片标识');
      refreshQuickEditFrameAssets({ silent: true });
    } catch (err) {
      console.warn('[PicScanner] 标识图片导入失败', err);
      showToast(String((err && err.message) || '标识图片导入失败'), 'error');
    }
  }

  function quickEditFrameAssetCountText() {
    const count = (state.quickEdit.frameAssets || []).length;
    if (state.quickEdit.frameAssetsLoading) return '读取中';
    return count ? ('库中 ' + count + ' 张') : '库为空';
  }

  function quickEditFrameAssetUsageText(item) {
    const presetCount = Number(item && item.used_count || 0);
    const current = quickEditCurrentFrameUsesAsset(item && item.id);
    if (current && presetCount) return '当前相框 / ' + presetCount + ' 个预设使用';
    if (current) return '当前相框使用中';
    if (presetCount) return presetCount + ' 个预设使用';
    return '未被预设使用';
  }

  function syncQuickEditFrameAssetModal() {
    const modal = state.quickEdit.frameAssetModal;
    if (!modal || !modal.isConnected) return;
    const list = modal.querySelector('[data-quick-edit-frame-asset-list]');
    const count = modal.querySelector('[data-quick-edit-frame-asset-count]');
    const message = modal.querySelector('[data-quick-edit-frame-asset-message]');
    if (count) count.textContent = quickEditFrameAssetCountText();
    if (message) {
      message.textContent = state.quickEdit.frameAssetsMessage || '导入后的图片会保存在本地素材库';
      message.title = message.textContent;
    }
    if (!list) return;
    const items = Array.isArray(state.quickEdit.frameAssets) ? state.quickEdit.frameAssets : [];
    if (state.quickEdit.frameAssetsLoading && !items.length) {
      list.innerHTML = '<div class="quick-edit-frame-asset-empty">正在读取图片库</div>';
      return;
    }
    if (!items.length) {
      list.innerHTML = '<div class="quick-edit-frame-asset-empty">还没有图片素材，点击导入添加</div>';
      return;
    }
    list.innerHTML = items.map((item) => {
      const id = quickEditNormalizeFrameAssetId(item && item.id);
      const url = quickEditEnsureFrameAssetUrl(id);
      const selected = state.quickEdit.frameAssetSelectedId === id;
      const usedCurrent = quickEditCurrentFrameUsesAsset(id);
      const usedCount = Number(item && item.used_count || 0);
      const canDelete = !usedCurrent && !usedCount;
      const thumb = url
        ? '<img alt="" src="' + escapeHtml(url) + '" />'
        : '<span>读取中</span>';
      return '<div class="quick-edit-frame-asset-item' + (selected ? ' selected' : '') + '" data-quick-edit-frame-asset-id="' + escapeHtml(id) + '">'
        + '<button class="quick-edit-frame-asset-thumb" type="button" data-quick-edit-frame-asset-add="' + escapeHtml(id) + '" title="添加到当前相框" aria-label="添加到当前相框">' + thumb + '</button>'
        + '<span><b>' + escapeHtml(item && item.name || id) + '</b><em>' + escapeHtml(quickEditFrameAssetUsageText(item)) + ' · ' + escapeHtml(quickEditFormatBytes(item && item.size)) + '</em></span>'
        + '<button class="icon-btn quick-edit-preset-apply-btn" type="button" data-quick-edit-frame-asset-add="' + escapeHtml(id) + '" title="添加到当前相框" aria-label="添加到当前相框">' + quickEditIconSvg('plus') + '</button>'
        + '<button class="icon-btn quick-edit-preset-delete-btn" type="button" data-quick-edit-frame-asset-delete="' + escapeHtml(id) + '"' + (canDelete ? '' : ' disabled') + ' title="' + (canDelete ? '删除素材' : '使用中的素材不能删除') + '" aria-label="删除素材">' + quickEditIconSvg('trash') + '</button>'
        + '</div>';
    }).join('');
  }

  function hideQuickEditFrameAssetModal() {
    const modal = state.quickEdit.frameAssetModal;
    if (!modal) return;
    modal.classList.add('hidden');
  }

  function ensureQuickEditFrameAssetModal() {
    if (state.quickEdit.frameAssetModal && state.quickEdit.frameAssetModal.isConnected) return state.quickEdit.frameAssetModal;
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-preset-modal quick-edit-frame-asset-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '图片素材库');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-frame-asset-card">',
      '<div class="quick-edit-save-head">',
      '<h2>图片素材库</h2>',
      '<div class="quick-edit-lut-head-actions">',
      '<button class="icon-btn" type="button" data-quick-edit-frame-asset-import title="导入图片素材" aria-label="导入图片素材">' + quickEditIconSvg('import') + '</button>',
      '<button class="icon-btn" type="button" data-quick-edit-frame-asset-refresh title="刷新图片库" aria-label="刷新图片库">' + quickEditIconSvg('refresh') + '</button>',
      '<button class="icon-btn quick-edit-save-close" type="button" data-quick-edit-frame-asset-cancel title="关闭" aria-label="关闭">' + quickEditIconSvg('close') + '</button>',
      '</div>',
      '</div>',
      '<div class="quick-edit-preset-modal-head"><span data-quick-edit-frame-asset-message></span><em data-quick-edit-frame-asset-count>库为空</em></div>',
      '<div class="quick-edit-frame-asset-list" data-quick-edit-frame-asset-list></div>',
      '</div>',
    ].join('');
    modal.querySelector('[data-quick-edit-frame-asset-cancel]').addEventListener('click', () => hideQuickEditFrameAssetModal());
    modal.querySelector('[data-quick-edit-frame-asset-import]').addEventListener('click', () => {
      importQuickEditFrameAssetToLibrary({ addToFrame: true });
    });
    modal.querySelector('[data-quick-edit-frame-asset-refresh]').addEventListener('click', () => {
      refreshQuickEditFrameAssets();
    });
    modal.querySelector('[data-quick-edit-frame-asset-list]').addEventListener('click', (ev) => {
      const add = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-asset-add]') : null;
      if (add) {
        const assetId = String(add.dataset.quickEditFrameAssetAdd || '');
        state.quickEdit.frameAssetSelectedId = assetId;
        addQuickEditFrameAssetLayer(assetId);
        syncQuickEditFrameAssetModal();
        return;
      }
      const del = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-asset-delete]') : null;
      if (del) {
        deleteQuickEditFrameAsset(String(del.dataset.quickEditFrameAssetDelete || ''));
        return;
      }
      const row = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-asset-id]') : null;
      if (row) {
        state.quickEdit.frameAssetSelectedId = String(row.dataset.quickEditFrameAssetId || '');
        syncQuickEditFrameAssetModal();
      }
    });
    document.body.appendChild(modal);
    state.quickEdit.frameAssetModal = modal;
    return modal;
  }

  function showQuickEditFrameAssetModal() {
    const modal = ensureQuickEditFrameAssetModal();
    modal.classList.remove('hidden');
    syncQuickEditFrameAssetModal();
    if (!state.quickEdit.frameAssetsLoaded && !state.quickEdit.frameAssetsLoading) {
      refreshQuickEditFrameAssets({ silent: true });
    }
    const first = modal.querySelector('[data-quick-edit-frame-asset-import]');
    if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
  }

  async function deleteQuickEditFrameAsset(assetId) {
    const id = quickEditNormalizeFrameAssetId(assetId);
    if (!id) return;
    if (quickEditCurrentFrameUsesAsset(id)) {
      showToast('当前相框正在使用这个素材，请先删除对应图片层', 'error');
      return;
    }
    try {
      const res = await call('delete_quick_edit_frame_asset', id);
      if (!res || !res.success) {
        state.quickEdit.frameAssets = Array.isArray(res && res.items) ? res.items : state.quickEdit.frameAssets;
        syncQuickEditFrameAssetModal();
        showToast(res && res.message ? res.message : '图片素材删除失败', 'error');
        return;
      }
      PS.quickEditFrameAssetCache.delete(id);
      state.quickEdit.frameAssets = Array.isArray(res.items) ? res.items : [];
      state.quickEdit.frameAssetsLoaded = true;
      if (state.quickEdit.frameAssetSelectedId === id) state.quickEdit.frameAssetSelectedId = '';
      syncQuickEditFrameAssetModal();
      showToast(res.message || '已删除图片素材');
    } catch (err) {
      console.warn('[PicScanner] 图片素材删除失败', err);
      showToast(String((err && err.message) || '图片素材删除失败'), 'error');
    }
  }

  function quickEditPhotoTokenMap(photoOverride) {
    const basePhoto = photoOverride || state.quickEdit.photo || {};
    const photo = Object.assign({}, basePhoto, state.photoCache.get(Number(basePhoto && basePhoto.id || 0)) || {});
    const dateKey = String(photo.date_key || photo.datetime_original || '').slice(0, 10);
    const dateParts = dateKey ? dateKey.split('-') : [];
    const focal = Number(photo.focal_length || 0);
    const focal35 = Number(photo.focal_length_35mm || 0);
    const aperture = photo.f_number ? String(Number(photo.f_number)).replace(/\.0$/, '') : String(photo.aperture_bucket || '').replace(/^f\//i, '');
    const lensName = String(photo.lens_model || photo.focal_bucket || '').trim();
    const camera = [photo.make, photo.model].map((item) => String(item || '').trim()).filter(Boolean).join(' ');
    return {
      filename: String(photo.filename || '').replace(/\.[^.]+$/, ''),
      origin_name: String(photo.filename || '').replace(/\.[^.]+$/, ''),
      date: dateKey,
      Y: dateParts[0] || '',
      M: dateParts[1] || '',
      D: dateParts[2] || '',
      camera,
      model: String(photo.model || '').trim(),
      lens: lensName,
      lens_name: lensName,
      len_name: lensName,
      shutter: String(photo.exposure_time || '').trim(),
      shutter_speed: String(photo.exposure_time || '').trim(),
      aperture,
      iso: String(photo.iso || photo.iso_bucket || '').trim(),
      focal_length: focal > 0 ? PS.formatMmValue(focal) + 'mm' : '',
      focal_length_35mm: focal35 > 0 ? PS.formatMmValue(focal35) + 'mm' : '',
      format: String(photo.format || '').trim(),
    };
  }

  function quickEditResolveFrameTextTemplate(text, photoOverride) {
    const tokens = quickEditPhotoTokenMap(photoOverride);
    return String(text || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(tokens, key) ? String(tokens[key] || '') : match
    ));
  }

  function quickEditFrameExportConfigFromPayload(frame) {
    const source = frame && typeof frame === 'object' ? frame : {};
    const key = quickEditFramePresetKey(source.preset || source.framePreset || source.key);
    const textLayers = Array.isArray(source.textLayers)
      ? source.textLayers.map((layer, index) => quickEditNormalizeFrameTextLayer(layer, index))
      : [];
    const imageLayers = Array.isArray(source.imageLayers)
      ? source.imageLayers.map((layer, index) => quickEditNormalizeFrameImageLayer(layer, index)).filter((layer) => layer.assetId)
      : [];
    if (key === 'none') {
      const hasText = textLayers.some((layer) => layer.enabled && String(layer.text || '').trim());
      const hasImage = imageLayers.some((layer) => layer.enabled && layer.assetId);
      return hasText ? {
        key,
        color: '',
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
        textLayers,
        imageLayers,
      } : (hasImage ? {
        key,
        color: '',
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
        textLayers,
        imageLayers,
      } : null);
    }
    const insets = quickEditNormalizeFrameInsets(source.insets || quickEditFrameDefaultInsets(key));
    if (key === 'white') return { key, color: '#f5f5f2', insets, textLayers, imageLayers };
    if (key === 'black') return { key, color: '#08080a', insets, textLayers, imageLayers };
    if (key === 'paper') return { key, color: '#f2eee5', insets, textLayers, imageLayers };
    return null;
  }

  function quickEditFrameExportConfig(preset) {
    return quickEditFrameExportConfigFromPayload({
      preset,
      insets: state.quickEdit.frameInsets,
      textLayers: quickEditFrameTextLayers(),
      imageLayers: quickEditFrameImageLayers(),
    });
  }

  function quickEditActiveExportFrame(options) {
    const opts = options || {};
    if (!opts.includeFrame) return null;
    return quickEditFrameExportConfig(state.quickEdit.framePreset);
  }

  function quickEditFramedOutputSize(width, height, frameConfig) {
    const w = Math.max(1, Math.round(Number(width || 1)));
    const h = Math.max(1, Math.round(Number(height || 1)));
    if (!frameConfig) return { width: w, height: h, frame: { left: 0, right: 0, top: 0, bottom: 0 } };
    const basis = Math.max(1, Math.min(w, h));
    const insets = quickEditNormalizeFrameInsets(frameConfig.insets);
    const left = Math.max(0, Math.round(basis * insets.left / 100));
    const right = Math.max(0, Math.round(basis * insets.right / 100));
    const top = Math.max(0, Math.round(basis * insets.top / 100));
    const bottom = Math.max(0, Math.round(basis * insets.bottom / 100));
    return {
      width: w + left + right,
      height: h + top + bottom,
      frame: { left, right, top, bottom },
    };
  }

  function setQuickEditSaveFormatOpen(open) {
    const modal = state.quickEdit.saveConfirm;
    if (!modal) return;
    const menu = modal.querySelector('[data-quick-edit-save-format-menu]');
    const trigger = modal.querySelector('[data-quick-edit-save-format-trigger]');
    if (menu) menu.classList.toggle('hidden', !open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function syncQuickEditSaveConfirm() {
    const modal = state.quickEdit.saveConfirm;
    if (!modal) return;
    const options = quickEditSaveOptions();
    const formatConfig = quickEditSaveFormatConfig(options.format);
    const saving = !!state.quickEdit.saveSaving;
    const tiff16 = formatConfig.key === 'tif16';
    const progress = state.quickEdit.saveProgress || quickEditSaveProgressState('准备保存', 0, '');
    const path = modal.querySelector('[data-quick-edit-save-path]');
    const target = modal.querySelector('[data-quick-edit-save-target]');
    const formatLabel = modal.querySelector('[data-quick-edit-save-format-label]');
    const formatDetail = modal.querySelector('[data-quick-edit-save-format-detail]');
    const confirm = modal.querySelector('[data-quick-edit-save-confirm]');
    const progressWrap = modal.querySelector('[data-quick-edit-save-progress]');
    const progressStage = modal.querySelector('[data-quick-edit-save-progress-stage]');
    const progressPercent = modal.querySelector('[data-quick-edit-save-progress-percent]');
    const progressFill = modal.querySelector('[data-quick-edit-save-progress-fill]');
    const progressDetail = modal.querySelector('[data-quick-edit-save-progress-detail]');
    const sizeValue = modal.querySelector('[data-quick-edit-save-size-value]');
    const sizeDetail = modal.querySelector('[data-quick-edit-save-size-detail]');
    const sizeWidthInput = modal.querySelector('[data-quick-edit-save-size-width]');
    const sizeHeightInput = modal.querySelector('[data-quick-edit-save-size-height]');
    const includeFrame = modal.querySelector('[data-quick-edit-save-include-frame]');
    const preserveExif = modal.querySelector('[data-quick-edit-save-preserve-exif]');
    modal.classList.toggle('saving', saving);
    modal.querySelectorAll('[data-quick-edit-save-format]').forEach((btn) => {
      const formatKey = String(btn.dataset.quickEditSaveFormat || '');
      const active = formatKey === options.format;
      const supported = quickEditSaveSupportsFormat(formatKey);
      btn.classList.toggle('active', active);
      btn.classList.toggle('disabled', !supported);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('aria-disabled', supported ? 'false' : 'true');
    });
    const quality = modal.querySelector('[data-quick-edit-save-quality]');
    const qualityValue = modal.querySelector('[data-quick-edit-save-quality-value]');
    const qualityDetail = modal.querySelector('[data-quick-edit-save-quality-detail]');
    if (path) {
      path.textContent = options.path || '未选择保存路径';
      path.classList.toggle('empty', !options.path);
    }
    if (target) target.textContent = target.dataset.quickEditSaveTarget || '目标文件将在确认前校验';
    if (formatLabel) formatLabel.textContent = formatConfig.label;
    if (formatDetail) formatDetail.textContent = formatConfig.detail;
    if (quality && String(quality.value) !== String(options.quality)) quality.value = String(options.quality);
    if (qualityValue) {
      qualityValue.textContent = tiff16 ? '16bit' : String(Math.round(options.quality));
      qualityValue.classList.toggle('raw-depth', tiff16);
    }
    if (qualityDetail) qualityDetail.textContent = tiff16 ? 'TIFF 16-bit 使用 RAW 显影位深' : quickEditQualityDescription(options.quality);
    modal.querySelectorAll('[data-quick-edit-save-quality-preset]').forEach((btn) => {
      const active = Number(btn.dataset.quickEditSaveQualityPreset || 0) === Number(options.quality);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (sizeValue) sizeValue.textContent = '当前 ' + quickEditSaveOutputDetail(options.currentWidth, options.currentHeight);
    if (sizeDetail) sizeDetail.textContent = quickEditSaveSizeDescription(options, formatConfig);
    if (sizeWidthInput && String(sizeWidthInput.value) !== String(options.sizeWidth)) {
      sizeWidthInput.value = String(options.sizeWidth);
    }
    if (sizeHeightInput && String(sizeHeightInput.value) !== String(options.sizeHeight)) {
      sizeHeightInput.value = String(options.sizeHeight);
    }
    if (includeFrame) {
      const hasFrameOutput = !!quickEditFrameExportConfig(state.quickEdit.framePreset);
      includeFrame.checked = hasFrameOutput && !!options.includeFrame;
      includeFrame.disabled = saving || !hasFrameOutput || tiff16;
      const includeFrameWrap = includeFrame.closest('.quick-edit-save-toggle');
      if (includeFrameWrap) includeFrameWrap.classList.toggle('disabled', !hasFrameOutput || tiff16);
    }
    if (preserveExif) {
      const exifSupported = quickEditSaveSupportsExif(options.format);
      preserveExif.checked = exifSupported && !!options.preserveExif;
      preserveExif.disabled = saving || !exifSupported;
      const preserveExifWrap = preserveExif.closest('.quick-edit-save-toggle');
      if (preserveExifWrap) preserveExifWrap.classList.toggle('disabled', !exifSupported);
    }
    modal.querySelectorAll('[data-quick-edit-save-size-preset]').forEach((btn) => {
      const preset = String(btn.dataset.quickEditSaveSizePreset || '');
      const active = (
        (preset === 'original' && (tiff16 || options.sizeMode !== 'longEdge'))
        || (preset === '2048' && !tiff16 && options.sizeMode === 'longEdge' && options.sizePreset === '2048')
        || (preset === 'custom' && !tiff16 && options.sizeMode === 'longEdge' && options.sizePreset === 'custom')
      );
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    modal.querySelectorAll(
      '[data-quick-edit-save-cancel], '
      + '[data-quick-edit-save-path-choose], '
      + '[data-quick-edit-save-format-trigger], '
      + '[data-quick-edit-save-format], '
      + '[data-quick-edit-save-quality], '
      + '[data-quick-edit-save-quality-preset], '
      + '[data-quick-edit-save-size-preset], '
      + '[data-quick-edit-save-size-width], '
      + '[data-quick-edit-save-size-height], '
      + '[data-quick-edit-save-include-frame], '
      + '[data-quick-edit-save-preserve-exif]',
    ).forEach((control) => {
      if (control.matches && control.matches('[data-quick-edit-save-format]')) {
        control.disabled = saving || !quickEditSaveSupportsFormat(control.dataset.quickEditSaveFormat || '');
      } else if (control.matches && control.matches('[data-quick-edit-save-quality], [data-quick-edit-save-quality-preset]')) {
        control.disabled = saving || tiff16;
      } else if (control.matches && control.matches('[data-quick-edit-save-size-preset], [data-quick-edit-save-size-width], [data-quick-edit-save-size-height]')) {
        control.disabled = saving || tiff16;
      } else if (control.matches && control.matches('[data-quick-edit-save-include-frame]')) {
        control.disabled = saving || tiff16 || !quickEditFrameExportConfig(state.quickEdit.framePreset);
      } else if (control.matches && control.matches('[data-quick-edit-save-preserve-exif]')) {
        control.disabled = saving || !quickEditSaveSupportsExif(options.format);
      } else {
        control.disabled = saving;
      }
    });
    if (progressWrap) {
      progressWrap.classList.toggle('hidden', !saving);
      progressWrap.setAttribute('aria-valuenow', String(Math.round(progress.percent)));
      progressWrap.setAttribute('aria-valuemin', '0');
      progressWrap.setAttribute('aria-valuemax', '100');
    }
    if (progressStage) progressStage.textContent = progress.stage;
    if (progressPercent) progressPercent.textContent = Math.round(progress.percent) + '%';
    if (progressFill) progressFill.style.width = progress.percent.toFixed(1) + '%';
    if (progressDetail) progressDetail.textContent = progress.detail || '保存期间请保持当前窗口打开';
    if (confirm) {
      confirm.disabled = saving;
      confirm.textContent = saving ? '保存中...' : '确认保存';
    }
  }

  function hideQuickEditSaveConfirm() {
    const modal = state.quickEdit.saveConfirm;
    if (!modal) return;
    if (state.quickEdit.saveSaving) {
      showToast('正在保存，完成前不能退出', 'error');
      return;
    }
    modal.classList.add('hidden');
    setQuickEditSaveFormatOpen(false);
  }

  function chooseQuickEditSavePath() {
    if (state.quickEdit.saveSaving) {
      showToast('正在保存，完成前不能更改路径', 'error');
      return;
    }
    call('choose_export_folder').then((folder) => {
      if (!folder || !folder.success) {
        if (!folder || !folder.cancelled) showToast(folder && folder.message ? folder.message : '选择保存路径失败', 'error');
        return;
      }
      rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), { path: String(folder.path || '') }));
      syncQuickEditSaveConfirm();
      validateQuickEditSaveDestination({ showSuccess: false });
    }).catch((err) => {
      console.warn('[PicScanner] 快速调整保存路径选择失败', err);
      showToast('选择保存路径失败，详情见控制台', 'error');
    });
  }

  function setQuickEditSaveTargetText(text, error) {
    const modal = state.quickEdit.saveConfirm;
    const target = modal ? modal.querySelector('[data-quick-edit-save-target]') : null;
    if (!target) return;
    target.dataset.quickEditSaveTarget = String(text || '');
    target.textContent = String(text || '目标文件将在确认前校验');
    target.classList.toggle('error', !!error);
    target.classList.toggle('empty', !text);
  }

  function validateQuickEditSaveDestination(options) {
    const opts = options || {};
    const saveOptions = quickEditSaveOptions();
    if (!saveOptions.path) {
      setQuickEditSaveTargetText('未选择保存路径', true);
      if (!opts.silent) showToast('请选择保存路径', 'error');
      return Promise.resolve(false);
    }
    return call(
      'check_quick_edit_save_destination',
      saveOptions.path,
      quickEditSourcePath(),
      saveOptions.format,
    ).then((res) => {
      if (!res || !res.success) {
        const message = res && res.message ? res.message : '保存目标不可用';
        setQuickEditSaveTargetText(message, true);
        if (!opts.silent) showToast(message, 'error');
        return false;
      }
      setQuickEditSaveTargetText(res.path || res.filename || '', false);
      if (opts.showSuccess) showToast('保存目标可用');
      return true;
    }).catch((err) => {
      console.warn('[PicScanner] 快速调整保存目标校验失败', err);
      setQuickEditSaveTargetText('保存目标校验失败', true);
      if (!opts.silent) showToast('保存目标校验失败，详情见控制台', 'error');
      return false;
    });
  }

  function ensureQuickEditSaveConfirm() {
    if (state.quickEdit.saveConfirm && state.quickEdit.saveConfirm.isConnected) return state.quickEdit.saveConfirm;
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-save-confirm hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '保存快速调整');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-save-card">',
      '<div class="quick-edit-save-head">',
      '<h2>保存调整</h2>',
      '<button class="icon-btn quick-edit-save-close" type="button" data-quick-edit-save-cancel title="关闭" aria-label="关闭">×</button>',
      '</div>',
      '<div class="quick-edit-save-form">',
      '<div class="quick-edit-save-field">',
      '<div class="quick-edit-save-label">保存地点</div>',
      '<div class="quick-edit-save-path-row">',
      '<div class="quick-edit-save-path" data-quick-edit-save-path></div>',
      '<button class="ghost-btn quick-edit-save-path-btn" type="button" data-quick-edit-save-path-choose>选择路径</button>',
      '</div>',
      '<div class="quick-edit-save-target empty" data-quick-edit-save-target>目标文件将在确认前校验</div>',
      '</div>',
      '<div class="quick-edit-save-field">',
      '<div class="quick-edit-save-label">保存格式</div>',
      '<div class="quick-edit-save-format-select">',
      '<button class="quick-edit-save-format-trigger" type="button" data-quick-edit-save-format-trigger aria-expanded="false">',
      '<span data-quick-edit-save-format-label>JPEG</span>',
      '<small data-quick-edit-save-format-detail>体积小，适合分享和通用查看</small>',
      '<b aria-hidden="true">' + quickEditIconSvg('chevron') + '</b>',
      '</button>',
      '<div class="quick-edit-save-format-menu hidden" data-quick-edit-save-format-menu role="menu">',
      QUICK_EDIT_SAVE_FORMATS.map((format) => (
        '<button type="button" role="menuitemradio" data-quick-edit-save-format="' + format.key + '" aria-pressed="false">'
        + '<span>' + format.label + '</span><small>' + format.detail + '</small></button>'
      )).join(''),
      '</div>',
      '</div>',
      '</div>',
      '<div class="quick-edit-save-field quick-edit-save-size">',
      '<div class="quick-edit-save-size-head">',
      '<span class="quick-edit-save-label">导出尺寸</span>',
      '<div class="quick-edit-save-size-readout"><b data-quick-edit-save-size-value>原尺寸</b><span data-quick-edit-save-size-detail>按当前裁剪输出原始像素</span></div>',
      '</div>',
      '<div class="quick-edit-save-segment quick-edit-save-size-presets" role="group" aria-label="导出尺寸预设">',
      '<button type="button" data-quick-edit-save-size-preset="original" aria-pressed="true">原尺寸</button>',
      '<button type="button" data-quick-edit-save-size-preset="2048" aria-pressed="false">长边 2048</button>',
      '<button type="button" data-quick-edit-save-size-preset="custom" aria-pressed="false">自定义</button>',
      '</div>',
      '<div class="quick-edit-save-size-custom" aria-label="自定义导出尺寸">',
      '<span>像素尺寸</span>',
      '<div class="quick-edit-save-size-inputs">',
      '<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="2048" aria-label="导出宽度" data-quick-edit-save-size-width />',
      '<b aria-hidden="true">×</b>',
      '<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="1365" aria-label="导出高度" data-quick-edit-save-size-height />',
      '</div>',
      '</div>',
      '</div>',
      '<label class="quick-edit-save-toggle">',
      '<input type="checkbox" data-quick-edit-save-include-frame />',
      '<span aria-hidden="true"></span>',
      '<b>包含相框/文字</b>',
      '</label>',
      '<label class="quick-edit-save-toggle">',
      '<input type="checkbox" data-quick-edit-save-preserve-exif />',
      '<span aria-hidden="true"></span>',
      '<b>完整复制原始 EXIF</b>',
      '</label>',
      '<label class="quick-edit-save-field quick-edit-save-quality">',
      '<span class="quick-edit-save-label">保存画质</span>',
      '<div class="quick-edit-save-quality-readout"><b data-quick-edit-save-quality-value>100</b><span data-quick-edit-save-quality-detail>最高保真，文件体积最大</span></div>',
      '<input type="range" min="1" max="100" step="1" value="100" data-quick-edit-save-quality />',
      '<div class="quick-edit-save-quality-presets" role="group" aria-label="保存画质预设">',
      QUICK_EDIT_SAVE_QUALITY_PRESETS.map((preset) => (
        '<button type="button" data-quick-edit-save-quality-preset="' + preset.value + '" aria-pressed="false">' + preset.label + '</button>'
      )).join(''),
      '</div>',
      '</label>',
      '<div class="quick-edit-save-progress hidden" data-quick-edit-save-progress role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">',
      '<div class="quick-edit-save-progress-head"><span data-quick-edit-save-progress-stage>准备保存</span><b data-quick-edit-save-progress-percent>0%</b></div>',
      '<div class="quick-edit-save-progress-track" aria-hidden="true"><div data-quick-edit-save-progress-fill></div></div>',
      '<div class="quick-edit-save-progress-detail" data-quick-edit-save-progress-detail>保存期间请保持当前窗口打开</div>',
      '</div>',
      '</div>',
      '<div class="modal-actions">',
      '<button class="ghost-btn" type="button" data-quick-edit-save-cancel>取消</button>',
      '<button class="primary-btn" type="button" data-quick-edit-save-confirm>确认保存</button>',
      '</div>',
      '</div>',
    ].join('');
    modal.querySelectorAll('[data-quick-edit-save-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => hideQuickEditSaveConfirm());
    });
    modal.querySelector('[data-quick-edit-save-path-choose]').addEventListener('click', () => {
      chooseQuickEditSavePath();
    });
    modal.querySelector('[data-quick-edit-save-format-trigger]').addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (state.quickEdit.saveSaving) {
        showToast('正在保存，完成前不能更改格式', 'error');
        return;
      }
      const menu = modal.querySelector('[data-quick-edit-save-format-menu]');
      setQuickEditSaveFormatOpen(!!(menu && menu.classList.contains('hidden')));
    });
    modal.querySelectorAll('[data-quick-edit-save-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.quickEdit.saveSaving) {
          showToast('正在保存，完成前不能更改格式', 'error');
          return;
        }
        const format = String(btn.dataset.quickEditSaveFormat || 'jpg');
        if (!quickEditSaveSupportsFormat(format)) {
          showToast('TIFF 16-bit 只支持 RAW 显影导出', 'error');
          return;
        }
        rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), {
          format: quickEditSaveFormatConfig(format).key,
        }));
        setQuickEditSaveFormatOpen(false);
        syncQuickEditSaveConfirm();
        validateQuickEditSaveDestination({ silent: true });
      });
    });
    modal.querySelectorAll('[data-quick-edit-save-quality-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.quickEdit.saveSaving) {
          showToast('正在保存，完成前不能更改画质', 'error');
          return;
        }
        rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), {
          quality: clamp(Number(btn.dataset.quickEditSaveQualityPreset || 92), 1, 100),
        }));
        syncQuickEditSaveConfirm();
      });
    });
    modal.querySelectorAll('[data-quick-edit-save-size-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.quickEdit.saveSaving) {
          showToast('正在保存，完成前不能更改导出尺寸', 'error');
          return;
        }
        const preset = String(btn.dataset.quickEditSaveSizePreset || '');
        if (preset === 'original') {
          rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), {
            sizeMode: 'original',
            sizePreset: 'original',
          }));
        } else if (preset === '2048') {
          const size = quickEditScaleSaveDimensionsToLongEdge(quickEditCurrentSaveResolution(), 2048);
          rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), {
            sizeMode: 'longEdge',
            sizePreset: '2048',
            sizeWidth: size.width,
            sizeHeight: size.height,
            sizeLongEdge: 2048,
          }));
        } else {
          const input = modal.querySelector('[data-quick-edit-save-size-width]');
          const size = quickEditSaveDimensionsFromEditedSide(
            'width',
            input ? input.value : QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT,
            quickEditCurrentSaveResolution(),
          );
          rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), {
            sizeMode: 'longEdge',
            sizePreset: 'custom',
            sizeWidth: size.width,
            sizeHeight: size.height,
            sizeLongEdge: Math.max(size.width, size.height),
          }));
          if (input) {
            setTimeout(() => {
              input.focus();
              input.select();
            }, 0);
          }
        }
        syncQuickEditSaveConfirm();
      });
    });
    const sizeWidthInput = modal.querySelector('[data-quick-edit-save-size-width]');
    const sizeHeightInput = modal.querySelector('[data-quick-edit-save-size-height]');
    const commitQuickEditSaveSizeInput = (side) => {
      if (!sizeWidthInput || !sizeHeightInput || state.quickEdit.saveSaving) return;
      const input = side === 'height' ? sizeHeightInput : sizeWidthInput;
      const digits = String(input.value || '').replace(/[^\d]/g, '');
      const basis = quickEditCurrentSaveResolution();
      const size = quickEditSaveDimensionsFromEditedSide(
        side === 'height' ? 'height' : 'width',
        digits || (side === 'height' ? basis.height : basis.width),
        basis,
      );
      sizeWidthInput.value = String(size.width);
      sizeHeightInput.value = String(size.height);
      rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), {
        sizeMode: 'longEdge',
        sizePreset: 'custom',
        sizeWidth: size.width,
        sizeHeight: size.height,
        sizeLongEdge: Math.max(size.width, size.height),
      }));
      syncQuickEditSaveConfirm();
    };
    const bindQuickEditSaveSizeInput = (input, side) => {
      if (!input) return;
      input.addEventListener('input', () => {
        const digits = String(input.value || '').replace(/[^\d]/g, '').slice(0, 5);
        if (input.value !== digits) input.value = digits;
        if (digits) commitQuickEditSaveSizeInput(side);
      });
      input.addEventListener('change', () => commitQuickEditSaveSizeInput(side));
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          commitQuickEditSaveSizeInput(side);
        }
      });
    };
    bindQuickEditSaveSizeInput(sizeWidthInput, 'width');
    bindQuickEditSaveSizeInput(sizeHeightInput, 'height');
    const includeFrame = modal.querySelector('[data-quick-edit-save-include-frame]');
    if (includeFrame) {
      includeFrame.addEventListener('change', () => {
        if (state.quickEdit.saveSaving) {
          showToast('正在保存，完成前不能更改相框导出选项', 'error');
          return;
        }
        rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), {
          includeFrame: !!includeFrame.checked,
        }));
        syncQuickEditSaveConfirm();
      });
    }
    const preserveExif = modal.querySelector('[data-quick-edit-save-preserve-exif]');
    if (preserveExif) {
      preserveExif.addEventListener('change', () => {
        if (state.quickEdit.saveSaving) {
          showToast('正在保存，完成前不能更改 EXIF 选项', 'error');
          return;
        }
        if (!quickEditSaveSupportsExif(quickEditSaveOptions().format)) {
          showToast('保存 EXIF 目前只支持 JPEG 导出', 'error');
          syncQuickEditSaveConfirm();
          return;
        }
        rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), {
          preserveExif: !!preserveExif.checked,
        }));
        syncQuickEditSaveConfirm();
      });
    }
    const quality = modal.querySelector('[data-quick-edit-save-quality]');
    if (quality) {
      quality.addEventListener('input', () => {
        if (state.quickEdit.saveSaving) {
          showToast('正在保存，完成前不能更改画质', 'error');
          return;
        }
        rememberQuickEditSaveOptions(Object.assign(quickEditSaveOptions(), {
          quality: clamp(Number(quality.value || 92), 1, 100),
        }));
        syncQuickEditSaveConfirm();
      });
    }
    modal.addEventListener('click', (ev) => {
      const formatSelect = ev.target && ev.target.closest ? ev.target.closest('.quick-edit-save-format-select') : null;
      if (!formatSelect) setQuickEditSaveFormatOpen(false);
    });
    modal.querySelector('[data-quick-edit-save-confirm]').addEventListener('click', () => {
      saveQuickEditFinalImage();
    });
    document.body.appendChild(modal);
    state.quickEdit.saveConfirm = modal;
    syncQuickEditSaveConfirm();
    return modal;
  }

  function showQuickEditSaveConfirm() {
    if (state.quickEdit.saveSaving) {
      const savingModal = ensureQuickEditSaveConfirm();
      savingModal.classList.remove('hidden');
      syncQuickEditSaveConfirm();
      showToast('正在保存，请等待完成', 'error');
      return;
    }
    const memory = readQuickEditSaveOptionsMemory();
    const current = state.quickEdit.saveOptions || {};
    const hasFrameOutput = !!quickEditFrameExportConfig(state.quickEdit.framePreset);
    state.quickEdit.saveOptions = quickEditSaveOptions(Object.assign({}, memory, current, {
      path: current.path || memory.path || quickEditDefaultSavePath(),
      includeFrame: hasFrameOutput,
    }));
    const modal = ensureQuickEditSaveConfirm();
    syncQuickEditSaveConfirm();
    modal.classList.remove('hidden');
    validateQuickEditSaveDestination({ silent: true });
    const confirm = modal.querySelector('[data-quick-edit-save-confirm]');
    if (confirm) requestAnimationFrame(() => confirm.focus({ preventScroll: true }));
  }

  function quickEditSaveOutputDetail(width, height) {
    return Math.max(1, Math.round(Number(width || 1))) + ' x ' + Math.max(1, Math.round(Number(height || 1)));
  }

  function quickEditSaveOutputScale(frame, sourceScale, options) {
    const baseScale = Math.max(0.0001, Number(sourceScale || 1));
    const opts = quickEditSaveOptions(options);
    if (opts.sizeMode !== 'longEdge') return baseScale;
    const fullWidth = Math.max(1, Math.round(Number(frame && frame.w || 1) * baseScale));
    const fullHeight = Math.max(1, Math.round(Number(frame && frame.h || 1) * baseScale));
    const targetWidth = quickEditNormalizeSaveDimension(opts.sizeWidth, fullWidth);
    const targetHeight = quickEditNormalizeSaveDimension(opts.sizeHeight, fullHeight);
    const targetScale = Math.min(
      1,
      targetWidth / Math.max(1, fullWidth),
      targetHeight / Math.max(1, fullHeight),
    );
    return baseScale * targetScale;
  }

  function quickEditBlobToDataUrl(blob, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (ev) => {
        if (typeof onProgress !== 'function' || !ev || !ev.lengthComputable) return;
        onProgress(clamp(Number(ev.loaded || 0) / Math.max(1, Number(ev.total || 1)), 0, 1));
      };
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('图片数据读取失败'));
      reader.readAsDataURL(blob);
    });
  }

  function quickEditFrameTextDisplayBasis(sourceWidth, sourceHeight, frameConfig) {
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
    const previewBasis = framePreview
      ? Number.parseFloat(framePreview.style.getPropertyValue('--quick-edit-frame-image-basis') || '')
      : 0;
    if (Number.isFinite(previewBasis) && previewBasis > 1) return previewBasis;
    const imageWidth = img ? (Number.parseFloat(img.style.width || '') || img.offsetWidth || 0) : 0;
    const imageHeight = img ? (Number.parseFloat(img.style.height || '') || img.offsetHeight || 0) : 0;
    if (Number.isFinite(imageWidth) && Number.isFinite(imageHeight) && imageWidth > 1 && imageHeight > 1) {
      return Math.min(imageWidth, imageHeight);
    }
    const sourceBasis = Math.max(1, Math.min(sourceWidth, sourceHeight));
    const insets = quickEditNormalizeFrameInsets(frameConfig ? frameConfig.insets : null);
    const outputWidth = sourceWidth + sourceBasis * (insets.left + insets.right) / 100;
    const outputHeight = sourceHeight + sourceBasis * (insets.top + insets.bottom) / 100;
    const fit = quickEditDisplayFitSize(outputWidth, outputHeight);
    const scale = Math.min(
      fit.width / Math.max(1, outputWidth),
      fit.height / Math.max(1, outputHeight),
    );
    const computedBasis = sourceBasis * scale;
    if (Number.isFinite(computedBasis) && computedBasis > 1) return computedBasis;
    throw new Error('无法读取相框文字预览尺寸，已停止导出以避免导出与预览不一致');
  }

  function quickEditCanvasFrameTextPlacement(layer, canvasWidth, canvasHeight, frameBox, displayBasis) {
    const position = String(layer && layer.position || 'bottom-center');
    const left = Number(frameBox.left || 0);
    const right = Number(frameBox.right || 0);
    const top = Number(frameBox.top || 0);
    const bottom = Number(frameBox.bottom || 0);
    const contentWidth = Math.max(1, canvasWidth - left - right);
    const contentHeight = Math.max(1, canvasHeight - top - bottom);
    const contentBasis = Math.max(1, Math.min(contentWidth, contentHeight));
    const size = quickEditScaledFrameTextSize(layer, contentBasis, displayBasis);
    const defaultInset = Math.max(1, 12 * quickEditFrameTextBasisScale(contentBasis, displayBasis));
    const axis = quickEditNormalizeFrameTextCoordinateSpace(layer && layer.coordinateSpace) === QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE;
    const offsetBasisX = axis ? contentWidth : contentBasis;
    const offsetBasisY = axis ? contentHeight : contentBasis;
    const offsetX = offsetBasisX * quickEditNormalizeFrameTextOffset(layer && layer.x) / 100;
    const offsetY = offsetBasisY * quickEditNormalizeFrameTextOffset(layer && layer.y) / 100;
    const constrain = (placement) => Object.assign({}, placement, {
      x: clamp(Number(placement.x || 0), 0, canvasWidth),
      y: clamp(Number(placement.y || 0), size / 2, canvasHeight - size / 2),
    });
    if (position === 'top-center') {
      return constrain({
        x: canvasWidth / 2 + offsetX,
        y: (top > 0 ? top / 2 : defaultInset + size / 2) + offsetY,
        align: 'center',
        maxWidth: Math.max(1, canvasWidth),
        contentBasis,
        contentWidth,
        contentHeight,
      });
    }
    if (position === 'bottom-left') {
      return constrain({
        x: left + offsetX,
        y: (bottom > 0 ? canvasHeight - bottom / 2 : canvasHeight - defaultInset - size / 2) + offsetY,
        align: 'left',
        maxWidth: Math.max(1, canvasWidth),
        contentBasis,
        contentWidth,
        contentHeight,
      });
    }
    if (position === 'bottom-right') {
      return constrain({
        x: canvasWidth - right + offsetX,
        y: (bottom > 0 ? canvasHeight - bottom / 2 : canvasHeight - defaultInset - size / 2) + offsetY,
        align: 'right',
        maxWidth: Math.max(1, canvasWidth),
        contentBasis,
        contentWidth,
        contentHeight,
      });
    }
    return constrain({
      x: canvasWidth / 2 + offsetX,
      y: (bottom > 0 ? canvasHeight - bottom / 2 : canvasHeight - defaultInset - size / 2) + offsetY,
      align: 'center',
      maxWidth: Math.max(1, canvasWidth),
      contentBasis,
      contentWidth,
      contentHeight,
    });
  }

  function quickEditCanvasFrameImagePlacement(layer, canvasWidth, canvasHeight, frameBox, imageWidth, imageHeight) {
    const left = Number(frameBox.left || 0);
    const right = Number(frameBox.right || 0);
    const top = Number(frameBox.top || 0);
    const bottom = Number(frameBox.bottom || 0);
    const contentWidth = Math.max(1, canvasWidth - left - right);
    const contentHeight = Math.max(1, canvasHeight - top - bottom);
    const assetWidth = Number(imageWidth || 0);
    const assetHeight = Number(imageHeight || 0);
    if (!(assetWidth > 0) || !(assetHeight > 0)) throw new Error('标识图片没有可用的宽高信息');
    const aspectRatio = assetWidth / assetHeight;
    const geometry = quickEditGeometryApi().imageLayerPlacement({
      contentWidth,
      contentHeight,
      outerLeft: -left,
      outerTop: -top,
      outerRight: contentWidth + right,
      outerBottom: contentHeight + bottom,
      coordinateSpace: quickEditNormalizeFrameImageCoordinateSpace(layer && layer.coordinateSpace),
      sizePercent: quickEditNormalizeFrameImageSize(layer && layer.size),
      aspectRatio,
      rotationDegrees: quickEditNormalizeFrameImageRotation(layer && layer.rotation),
      anchor: quickEditNormalizeFrameImageAnchor(layer && layer.anchor) || 'center',
      offsetXPercent: quickEditNormalizeFrameImageOffset(layer && layer.x),
      offsetYPercent: quickEditNormalizeFrameImageOffset(layer && layer.y),
    });
    return {
      x: left + geometry.x,
      y: top + geometry.y,
      width: geometry.width,
      height: geometry.height,
      rotation: geometry.rotation,
      opacity: quickEditNormalizeFrameImageOpacity(layer && layer.opacity) / 100,
      contentWidth,
      contentHeight,
      offsetXPercent: geometry.offsetXPercent,
      offsetYPercent: geometry.offsetYPercent,
    };
  }

  function quickEditLoadFrameImageElement(src) {
    const url = String(src || '');
    if (!url) return Promise.reject(new Error('标识图片为空'));
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('标识图片解码失败'));
      img.src = url;
    });
  }

  async function quickEditDrawFrameImageLayers(ctx, frameConfig, canvasWidth, canvasHeight, frameBox) {
    const layers = (frameConfig && frameConfig.imageLayers || []).filter((layer) => layer.enabled && layer.assetId);
    const rendered = [];
    for (const layer of layers) {
      const url = await quickEditLoadFrameAssetUrl(layer.assetId);
      const image = await quickEditLoadFrameImageElement(url);
      const placement = quickEditCanvasFrameImagePlacement(layer, canvasWidth, canvasHeight, frameBox, image.naturalWidth || image.width, image.naturalHeight || image.height);
      ctx.save();
      ctx.globalAlpha = placement.opacity;
      ctx.translate(placement.x, placement.y);
      ctx.rotate(placement.rotation);
      ctx.drawImage(image, -placement.width / 2, -placement.height / 2, placement.width, placement.height);
      ctx.restore();
      rendered.push({
        name: layer.name,
        x: Math.round(placement.x),
        y: Math.round(placement.y),
        width: Math.round(placement.width),
        height: Math.round(placement.height),
        opacity: Math.round(placement.opacity * 100),
        contentWidth: Math.round(placement.contentWidth),
        contentHeight: Math.round(placement.contentHeight),
        offsetXPercent: placement.offsetXPercent,
        offsetYPercent: placement.offsetYPercent,
      });
    }
    return rendered;
  }

  async function quickEditApplyFrameToRenderedBlob(rendered, options, frameConfig, context) {
    if (!rendered || !rendered.blob || !frameConfig) return rendered;
    const ctxOptions = context || {};
    const reportProgress = typeof ctxOptions.onProgress === 'function'
      ? ctxOptions.onProgress
      : (stage, percent, detail) => setQuickEditSaveProgress(stage, percent, detail);
    const sourceWidth = Math.max(1, Math.round(Number(rendered.outputWidth || 1)));
    const sourceHeight = Math.max(1, Math.round(Number(rendered.outputHeight || 1)));
    const framedSize = quickEditFramedOutputSize(sourceWidth, sourceHeight, frameConfig);
    const displayBasis = 600;
    const canvas = document.createElement('canvas');
    canvas.width = framedSize.width;
    canvas.height = framedSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建相框导出画布');
    reportProgress('渲染相框', 86, quickEditSaveOutputDetail(framedSize.width, framedSize.height));
    const bitmap = await createImageBitmap(rendered.blob);
    try {
      if (frameConfig.color) {
        ctx.fillStyle = frameConfig.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(bitmap, framedSize.frame.left, framedSize.frame.top, sourceWidth, sourceHeight);
      const renderedImageLayers = await quickEditDrawFrameImageLayers(ctx, frameConfig, canvas.width, canvas.height, framedSize.frame);
      const renderedTextLayers = [];
      (frameConfig.textLayers || []).filter((layer) => layer.enabled && String(layer.text || '').trim()).forEach((layer) => {
        const text = quickEditResolveFrameTextTemplate(layer.text, ctxOptions.photo);
        if (!String(text || '').trim()) return;
        const placement = quickEditCanvasFrameTextPlacement(layer, canvas.width, canvas.height, framedSize.frame, displayBasis);
        const font = quickEditCanvasFrameTextFont(layer, placement.contentBasis, displayBasis);
        const textColor = quickEditNormalizeHexColor(layer.color) || quickEditDefaultFrameTextColor();
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = font;
        ctx.textAlign = placement.align;
        ctx.textBaseline = 'middle';
        const measuredWidth = Math.min(Math.max(1, ctx.measureText(text).width), placement.maxWidth);
        const textX = placement.align === 'right'
          ? clamp(placement.x, measuredWidth, canvas.width)
          : (placement.align === 'left'
            ? clamp(placement.x, 0, canvas.width - measuredWidth)
            : clamp(placement.x, measuredWidth / 2, canvas.width - measuredWidth / 2));
        ctx.fillText(text, textX, placement.y, placement.maxWidth);
        ctx.restore();
        renderedTextLayers.push({
          position: layer.position,
          textLength: String(text).length,
          textSample: String(text).slice(0, 32),
          x: Math.round(textX),
          y: Math.round(placement.y),
          maxWidth: Math.round(placement.maxWidth),
          font,
          color: textColor,
          contentWidth: Math.round(placement.contentWidth),
          contentHeight: Math.round(placement.contentHeight),
          offsetXPercent: quickEditNormalizeFrameTextOffset(layer.x),
          offsetYPercent: quickEditNormalizeFrameTextOffset(layer.y),
        });
      });
      if (renderedTextLayers.length) {
        console.info('[PicScanner] quick edit frame text export', {
          canvas: { width: canvas.width, height: canvas.height },
          frame: framedSize.frame,
          displayBasis,
          layers: renderedTextLayers,
        });
      } else if ((frameConfig.textLayers || []).some((layer) => layer.enabled && String(layer.text || '').trim())) {
        console.warn('[PicScanner] quick edit frame text export skipped all resolved text layers', {
          canvas: { width: canvas.width, height: canvas.height },
          frame: framedSize.frame,
          displayBasis,
          sourceLayers: (frameConfig.textLayers || []).map((layer) => ({
            position: layer && layer.position,
            textLength: String(layer && layer.text || '').length,
          })),
        });
      }
      if (renderedImageLayers.length) {
        console.info('[PicScanner] quick edit frame image export', {
          canvas: { width: canvas.width, height: canvas.height },
          frame: framedSize.frame,
          layers: renderedImageLayers,
        });
      }
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
    const mime = String(ctxOptions.mime || quickEditSaveMime(options && options.format));
    const quality = quickEditSaveQualityRatio(options && options.quality);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (nextBlob) resolve(nextBlob);
        else reject(new Error('相框导出编码失败'));
      }, mime, quality);
    });
    return {
      blob,
      mime,
      outputWidth: framedSize.width,
      outputHeight: framedSize.height,
    };
  }

  async function renderQuickEditFinalBlobInWorker(saveOptions) {
    if (typeof createImageBitmap !== 'function') {
      throw new Error('当前 WebView 不支持异步图像解码 createImageBitmap');
    }
    const options = saveOptions || {};
    const format = quickEditSaveFormatConfig(options.format || 'jpg').key;
    const mime = quickEditSaveMime(format);
    const quality = quickEditSaveQualityRatio(options.quality);
    const el = ensureQuickEdit();
    const stage = el.querySelector('[data-quick-edit-stage]');
    const img = el.querySelector('[data-quick-edit-img]');
    const sourceSrc = String(options.sourceSrc || quickEditOriginalSaveUrl());
    if (!sourceSrc) throw new Error('当前图片缺少原图路径，无法保存原图质量版本');
    if (!stage || !img || !PS.imageHasSource(img) || !img.naturalWidth || !img.naturalHeight) {
      throw new Error('当前预览图还没有加载完成');
    }

    setQuickEditSaveProgress('加载原图', 6, '正在读取原始图片');
    const sourceImg = await loadQuickEditImage(sourceSrc);
    const frame = quickEditBakeFrame(stage, img, { canonical: true });
    if (!frame || frame.w <= 0.0001 || frame.h <= 0.0001) {
      throw new Error('当前取景框尺寸无效');
    }

    const params = options.pixelParams ? normalizeQuickEditParams(options.pixelParams) : quickEditEffectiveParams();
    const renderView = quickEditRenderView({ canonical: true });
    const pan = renderView.pan;
    const angleRadians = (params.rotation + params.straighten) * Math.PI / 180;
    const stageRect = stage.getBoundingClientRect();
    const displayBasis = quickEditDisplayBasisSize(img);
    const baseWidth = displayBasis.width;
    const baseHeight = displayBasis.height;
    const token = Number(state.quickEdit.saveToken || 0);
    const isCurrent = () => (
      state.quickEdit.saveSaving
      && token === Number(state.quickEdit.saveToken || 0)
    );

    setQuickEditSaveProgress('解码原图', 12, '正在解码原始图片');
    const decodeStart = quickEditPerfNow();
    let bitmap = await createImageBitmap(sourceImg);
    let decodeMs = quickEditPerfNow() - decodeStart;
    if (!isCurrent()) {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      throw new Error('保存任务已失效');
    }

    let sourceBasis = Number(options.sourceBasisWidth || 0) > 0 && Number(options.sourceBasisHeight || 0) > 0
      ? { width: Number(options.sourceBasisWidth || 0), height: Number(options.sourceBasisHeight || 0) }
      : quickEditImageBasis(sourceImg.naturalWidth || sourceImg.width, sourceImg.naturalHeight || sourceImg.height);
    let saveOrientation = options.orientation === undefined
      ? (quickEditUsesPhotoImageBasis() ? String(state.quickEdit.photo && state.quickEdit.photo.orientation || '') : '')
      : String(options.orientation || '');
    let saveApplyOrientation = options.applyOrientation === undefined
      ? quickEditSourceNeedsOrientationTransform(sourceImg, sourceBasis)
      : !!options.applyOrientation;

    const stageEntry = quickEditCurrentSourceStageEntry();
    if (stageEntry) {
      setQuickEditSaveProgress('应用修脸变形', 16, '正在处理源图像');
      const stageStart = quickEditPerfNow();
      const stageResult = await window.PicScannerModules.applySourceStages(bitmap, stageEntry, { maxSide: 0 });
      if (!isCurrent()) {
        if (stageResult && stageResult.bitmap && typeof stageResult.bitmap.close === 'function') stageResult.bitmap.close();
        throw new Error('保存任务已失效');
      }
      if (stageResult && stageResult.bitmap && stageResult.bitmap !== bitmap) {
        bitmap = stageResult.bitmap;
      }
      if (stageResult && stageResult.orientationApplied) {
        sourceBasis = {
          width: Math.max(1, Number(stageResult.width || 1)),
          height: Math.max(1, Number(stageResult.height || 1)),
        };
        saveOrientation = '';
        saveApplyOrientation = false;
      }
      decodeMs += quickEditPerfNow() - stageStart;
    }

    const sourceScale = Math.max(
      Number(sourceBasis.width || sourceImg.naturalWidth || sourceImg.width || 1) / Math.max(1, baseWidth),
      Number(sourceBasis.height || sourceImg.naturalHeight || sourceImg.height || 1) / Math.max(1, baseHeight),
    );
    const outputScale = quickEditSaveOutputScale(frame, sourceScale / renderView.zoom, options);
    const outputWidth = Math.max(1, Math.round(frame.w * outputScale));
    const outputHeight = Math.max(1, Math.round(frame.h * outputScale));
    const outputDetail = quickEditSaveOutputDetail(outputWidth, outputHeight);
    const key = token + '|' + format + '|' + outputDetail;

    return new Promise((resolve, reject) => {
      const worker = new Worker(quickEditPreviewWorkerUrl());
      let settled = false;
      const cleanup = () => {
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
      };
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };
      worker.onmessage = (ev) => {
        const message = ev && ev.data ? ev.data : {};
        if (Number(message.token || 0) !== token || String(message.key || '') !== key) return;
        if (message.type === 'save-progress') {
          if (isCurrent()) setQuickEditSaveProgress(message.stage, message.percent, message.detail);
          return;
        }
        if (message.type === 'error') {
          finish(reject, new Error(message.message || '保存渲染失败'));
          return;
        }
        if (message.type !== 'save-rendered') return;
        quickEditPerfLog('save:worker-done', {
          output: message.outputWidth + 'x' + message.outputHeight,
          format,
          perf: message.perf || null,
        });
        finish(resolve, {
          blob: message.blob,
          mime: message.mime || mime,
          outputWidth: message.outputWidth || outputWidth,
          outputHeight: message.outputHeight || outputHeight,
        });
      };
      worker.onerror = (err) => {
        finish(reject, new Error((err && err.message) || '保存渲染 Worker 异常'));
      };
      try {
        worker.postMessage({
          type: 'save',
          token,
          key,
          sourceSrc,
          format,
          mime,
          quality,
          decodeMs,
          outputScale,
          outputWidth,
          outputHeight,
          frame: {
            x: frame.x,
            y: frame.y,
            w: frame.w,
            h: frame.h,
          },
          baseWidth,
          baseHeight,
          baseLeft: (stageRect.width - baseWidth) / 2,
          baseTop: (stageRect.height - baseHeight) / 2,
          pan,
          zoom: renderView.zoom,
          angleRadians,
          orientation: saveOrientation,
          applyOrientation: saveApplyOrientation,
          perfEnabled: quickEditPerfEnabled(),
          params: Array.isArray(options.pixelStages)
            ? { stages: options.pixelStages.map(cloneQuickEditPixelStage) }
            : quickEditWorkerParams(params, { prepared: !!options.pixelParams }),
          bitmap,
        }, [bitmap]);
      } catch (err) {
        if (bitmap && typeof bitmap.close === 'function') bitmap.close();
        finish(reject, err);
      }
    });
  }

  async function renderQuickEditRawFinalBlobInWorker(saveOptions) {
    const photo = state.quickEdit.photo || {};
    const photoId = Number(photo.id || 0);
    if (!photoId || !quickEditIsRawPhoto(photo)) {
      throw new Error('当前图片不是 RAW 文件');
    }
    const params = quickEditRawDevelopParams(quickEditEffectiveParams());
    setQuickEditSaveProgress('RAW 显影', 5, '生成全尺寸显影源');
    const res = await call('develop_quick_edit_raw_preview', photoId, params, 0, false);
    if (!res || !res.success || !res.url) {
      throw new Error(res && res.message ? res.message : 'RAW 全尺寸显影失败');
    }
    setQuickEditSaveProgress(
      '加载显影源',
      10,
      quickEditSaveOutputDetail(res.width || 0, res.height || 0),
    );
    return renderQuickEditFinalBlobInWorker(Object.assign({}, saveOptions || {}, {
      sourceSrc: String(res.url || ''),
      sourceBasisWidth: Number(res.width || 0),
      sourceBasisHeight: Number(res.height || 0),
      orientation: '',
      applyOrientation: false,
      pixelStages: quickEditWorkerPixelStages(quickEditEffectiveParams(), { rawDeveloped: true }),
    }));
  }

  async function saveQuickEditRawTiffImage(options) {
    const photo = state.quickEdit.photo || {};
    const photoId = Number(photo.id || 0);
    if (!photoId || !quickEditIsRawPhoto(photo)) {
      throw new Error('当前图片不是 RAW 文件');
    }
    const params = quickEditRawDevelopParams(quickEditEffectiveParams());
    setQuickEditSaveProgress('RAW 显影', 12, '16bit TIFF');
    const res = await call(
      'save_quick_edit_raw_tiff',
      photoId,
      params,
      options.path,
      quickEditSourcePath(),
      options.format,
      options.preserveExif,
    );
    if (!res || !res.success) {
      throw new Error(res && res.message ? res.message : '16bit TIFF 保存失败');
    }
    return res;
  }

  async function saveQuickEditFinalImage() {
    if (state.quickEdit.saveSaving) return;
    const options = rememberQuickEditSaveOptions(quickEditSaveOptions());
    const valid = await validateQuickEditSaveDestination();
    if (!valid) return;

    state.quickEdit.saveSaving = true;
    state.quickEdit.saveToken += 1;
    setQuickEditSaveProgress('准备保存', 3, '保存期间不能退出修图界面');
    syncQuickEditSaveConfirm();
    let hideAfterSave = false;
    try {
      if (quickEditIsRawPhoto() && quickEditSaveFormatConfig(options.format).key === 'tif16') {
        const res = await saveQuickEditRawTiffImage(options);
        setQuickEditSaveTargetText(res.path || '', false);
        setQuickEditSaveProgress(
          '保存完成',
          100,
          res.width && res.height ? quickEditSaveOutputDetail(res.width, res.height) : (res.path || ''),
        );
        hideAfterSave = true;
        showToast(res.message || '已保存');
        return;
      }

      let rendered = quickEditIsRawPhoto()
        ? await renderQuickEditRawFinalBlobInWorker(options)
        : await renderQuickEditFinalBlobInWorker(options);
      if (!rendered || !rendered.blob) throw new Error('保存渲染没有返回图片数据');
      const exportFrame = quickEditActiveExportFrame(options);
      if (exportFrame) rendered = await quickEditApplyFrameToRenderedBlob(rendered, options, exportFrame);
      setQuickEditSaveProgress(
        '准备写入',
        90,
        quickEditSaveOutputDetail(rendered.outputWidth, rendered.outputHeight),
      );
      const dataUrl = await quickEditBlobToDataUrl(rendered.blob, (ratio) => {
        setQuickEditSaveProgress('整理图片数据', 90 + clamp(Number(ratio || 0), 0, 1) * 4, rendered.mime || '');
      });
      if (!String(dataUrl || '').startsWith('data:' + quickEditSaveMime(options.format) + ';')) {
        throw new Error('当前 WebView 不支持导出 ' + quickEditSaveFormatConfig(options.format).label);
      }
      setQuickEditSaveProgress('写入文件', 96, options.path);
      const res = await call(
        'save_quick_edit_image',
        dataUrl,
        options.path,
        quickEditSourcePath(),
        options.format,
        options.quality,
        options.preserveExif,
      );
      if (!res || !res.success) {
        const message = res && res.message ? res.message : '保存失败';
        setQuickEditSaveTargetText(message, true);
        showToast(message, 'error');
        return;
      }
      setQuickEditSaveTargetText(res.path || '', false);
      setQuickEditSaveProgress('保存完成', 100, res.path || '');
      hideAfterSave = true;
      showToast(res.message || '已保存');
    } catch (err) {
      console.warn('[PicScanner] 快速调整保存失败', err);
      showToast(String((err && err.message) || '保存失败'), 'error');
    } finally {
      state.quickEdit.saveSaving = false;
      if (hideAfterSave) hideQuickEditSaveConfirm();
      clearQuickEditSaveProgress();
      syncQuickEditSaveConfirm();
    }
  }

  function refreshQuickEditPanController() {
    if (PS.quickEditPanController) PS.quickEditPanController.refresh();
  }

  function cancelQuickEditPan() {
    if (PS.quickEditPanController) PS.quickEditPanController.cancel();
  }

  function ensureQuickEditCurvePanel() {
    if (PS.quickEditCurvePanel) return PS.quickEditCurvePanel;
    PS.quickEditCurvePanel = requirePicModification().createCurvePanel({
      getPoints: () => quickEditCurvePoints(state.quickEdit.params),
      getHistogram: () => state.quickEdit.histogramData,
      setPoints: (points) => {
        const next = normalizeQuickEditParams(state.quickEdit.params);
        next.curvePoints = normalizeQuickEditCurvePoints(points, next);
        state.quickEdit.params = normalizeQuickEditParams(next);
      },
      onChange: () => {
        invalidateQuickEditRenderedPreview({ clearTimers: true });
        syncQuickEditControls();
        if (quickEditUsesRawDevelopPipeline()) {
          applyQuickEditPreview({ skipColorRender: true });
          scheduleQuickEditRawDevelopPreview({ interactive: true });
        } else {
          applyQuickEditPreview({ interactive: true });
        }
        scheduleQuickEditHistogramRender(180);
      },
    });
    return PS.quickEditCurvePanel;
  }

  function hideQuickEditCurvePanel() {
    if (PS.quickEditCurvePanel) PS.quickEditCurvePanel.hide();
  }

  function syncQuickEditCurvePanel() {
    if (PS.quickEditCurvePanel) PS.quickEditCurvePanel.sync();
  }

  function quickEditHistogramChannels() {
    const channels = Object.assign({ red: true, green: true, blue: true }, state.quickEdit.histogramChannels || {});
    if (!channels.red && !channels.green && !channels.blue) channels.red = true;
    state.quickEdit.histogramChannels = channels;
    return channels;
  }

  function quickEditHistogramChannelKeys() {
    const channels = quickEditHistogramChannels();
    return ['red', 'green', 'blue'].filter((key) => channels[key]);
  }

  function quickEditHistogramRgbLabel() {
    const labels = { red: 'R', green: 'G', blue: 'B' };
    const selected = quickEditHistogramChannelKeys().map((key) => labels[key]);
    return selected.length === 3 ? 'RGB' : selected.join('/');
  }

  function setQuickEditHistogramMenuOpen(open) {
    state.quickEdit.histogramMenuOpen = !!open;
    const el = state.quickEdit.el;
    const menu = el ? el.querySelector('[data-quick-edit-rgb-menu]') : null;
    const trigger = el ? el.querySelector('[data-quick-edit-rgb-menu-trigger]') : null;
    if (menu) menu.classList.toggle('hidden', !state.quickEdit.histogramMenuOpen);
    if (trigger) trigger.setAttribute('aria-expanded', state.quickEdit.histogramMenuOpen ? 'true' : 'false');
  }

  function toggleQuickEditHistogramChannel(channel) {
    if (channel !== 'red' && channel !== 'green' && channel !== 'blue') return;
    const channels = quickEditHistogramChannels();
    const enabledCount = quickEditHistogramChannelKeys().length;
    if (channels[channel] && enabledCount <= 1) return;
    channels[channel] = !channels[channel];
    state.quickEdit.histogramChannels = channels;
    state.quickEdit.histogramMode = 'rgb';
    syncQuickEditControls();
    renderQuickEditHistogram();
  }

  function quickEditCollapsedSections() {
    const sections = Object.assign({ tone: false, color: false, detail: false, effects: false, blackWhite: false, splitTone: false, hsl: false, lut: false, framePresets: false, frameAdjust: false, frameText: false }, state.quickEdit.collapsedSections || {});
    state.quickEdit.collapsedSections = sections;
    return sections;
  }

  function normalizeQuickEditCollapsedSections(value) {
    const raw = value && typeof value === 'object' ? value : {};
    return {
      tone: raw.tone === true,
      color: raw.color === true,
      detail: raw.detail === true,
      effects: raw.effects === true,
      blackWhite: raw.blackWhite === true,
      splitTone: raw.splitTone === true,
      hsl: raw.hsl === true,
      lut: raw.lut === true,
      framePresets: raw.framePresets === true,
      frameAdjust: raw.frameAdjust === true,
      frameText: raw.frameText === true,
    };
  }

  function setQuickEditCollapsedSections(value, options) {
    const opts = options || {};
    state.quickEdit.collapsedSections = normalizeQuickEditCollapsedSections(value);
    syncQuickEditSections();
    if (opts.save === false) return;
    call('set_quick_edit_collapsed_sections', state.quickEdit.collapsedSections).catch((err) => {
      console.warn('[PicScanner] 快速调整折叠状态保存失败', err);
    });
  }

  function toggleQuickEditSection(section) {
    const key = String(section || '').trim();
    if (!['tone', 'color', 'detail', 'effects', 'blackWhite', 'splitTone', 'hsl', 'lut', 'framePresets', 'frameAdjust', 'frameText'].includes(key)) return;
    const sections = quickEditCollapsedSections();
    sections[key] = !sections[key];
    if (key === 'lut' && sections[key]) hideQuickEditLutModal();
    setQuickEditCollapsedSections(sections);
  }

  function syncQuickEditSections() {
    const el = state.quickEdit.el;
    if (!el) return;
    const sections = quickEditCollapsedSections();
    el.querySelectorAll('[data-quick-edit-section]').forEach((group) => {
      const key = String(group.dataset.quickEditSection || '');
      const collapsed = !!sections[key];
      const toggle = group.querySelector('[data-quick-edit-section-toggle]');
      group.classList.toggle('collapsed', collapsed);
      if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
    if (window.PicScannerVue && window.PicScannerVue.syncQuickEditSliders) {
      window.PicScannerVue.syncQuickEditSliders();
    }
  }

  function setQuickEditHslPickerActive(active) {
    state.quickEdit.hslPickerActive = !!active;
    const el = state.quickEdit.el;
    if (!el) return;
    const stage = el.querySelector('[data-quick-edit-stage]');
    const btn = el.querySelector('[data-quick-edit-hsl-picker]');
    const status = el.querySelector('[data-quick-edit-hsl-picker-status]');
    if (stage) stage.classList.toggle('hsl-picking', state.quickEdit.hslPickerActive);
    if (btn) {
      btn.classList.toggle('active', state.quickEdit.hslPickerActive);
      btn.setAttribute('aria-pressed', state.quickEdit.hslPickerActive ? 'true' : 'false');
    }
    if (status) status.textContent = state.quickEdit.hslPickerActive ? '在画面点击颜色' : '点击吸管后在画面取色';
  }

  function quickEditAllowedPanelTabs() {
    const allowed = state.quickEdit.batchMode ? ['adjust', 'frame', 'sync', 'output'] : ['adjust', 'frame'];
    if (state.openModuleKey) allowed.push('module');
    return allowed;
  }

  function setQuickEditPanelTab(tab) {
    const allowed = quickEditAllowedPanelTabs();
    state.quickEdit.panelTab = allowed.includes(tab) ? tab : 'adjust';
    syncQuickEditPanelTabs();
  }

  function syncQuickEditPanelTabs() {
    const el = state.quickEdit.el;
    if (!el) return;
    const allowed = quickEditAllowedPanelTabs();
    const activeTab = allowed.includes(state.quickEdit.panelTab) ? state.quickEdit.panelTab : 'adjust';
    el.querySelectorAll('[data-quick-edit-panel-tab]').forEach((btn) => {
      const tab = String(btn.dataset.quickEditPanelTab || 'adjust');
      const active = tab === activeTab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    el.querySelectorAll('[data-quick-edit-panel-page]').forEach((page) => {
      page.classList.toggle('hidden', String(page.dataset.quickEditPanelPage || 'adjust') !== activeTab);
    });
    el.querySelectorAll('.qe-module-overlay').forEach((ov) => {
      ov.classList.toggle('hidden', activeTab !== 'module');
    });
  }

  function quickEditFramePresetKey(key) {
    const value = String(key || 'none');
    return ['none', 'white', 'black', 'paper'].includes(value) ? value : 'none';
  }

  function syncQuickEditFramePreview() {
    const el = state.quickEdit.el;
    if (!el) return;
    const stage = el.querySelector('[data-quick-edit-stage]');
    const img = el.querySelector('[data-quick-edit-img]');
    const framePreview = el.querySelector('[data-quick-edit-frame-preview]');
    if (!framePreview || !stage || !img) return;
    enforceQuickEditDisplayBasis(img);
    const preset = quickEditFramePresetKey(state.quickEdit.framePreset);
    const frameConfig = quickEditFrameExportConfig(preset);
    const params = quickEditEffectiveParams();
    const stageRect = stage.getBoundingClientRect();
    const cropActive = isQuickEditCropToolActive();
    const baseGeometry = PS.imageHasSource(img) && stageRect.width > 1 && stageRect.height > 1
      ? quickEditTransformedImageGeometry(params, {
        stage,
        img,
        zoom: 1,
        pan: { x: 0, y: 0 },
        recenter: false,
      })
      : null;
    const outputFrame = baseGeometry ? quickEditCropFrameForParams(params, baseGeometry) : null;
    framePreview.classList.toggle('hidden', !frameConfig || !outputFrame || cropActive);
    ['white', 'black', 'paper'].forEach((item) => {
      framePreview.classList.toggle('frame-' + item, preset === item);
    });
    if (!frameConfig || !outputFrame || cropActive) return;
    framePreview.style.position = 'absolute';
    framePreview.style.left = outputFrame.x.toFixed(2) + 'px';
    framePreview.style.top = outputFrame.y.toFixed(2) + 'px';
    framePreview.style.width = outputFrame.w.toFixed(2) + 'px';
    framePreview.style.height = outputFrame.h.toFixed(2) + 'px';
    framePreview.style.aspectRatio = outputFrame.w.toFixed(2) + ' / ' + outputFrame.h.toFixed(2);
    framePreview.style.transformOrigin = 'center center';
    framePreview.style.transform = 'none';
    const insets = quickEditNormalizeFrameInsets(frameConfig ? frameConfig.insets : null);
    const imageWidth = Math.max(1, outputFrame.w);
    const imageHeight = Math.max(1, outputFrame.h);
    const basis = Math.min(imageWidth, imageHeight);
    const frameTop = basis * insets.top / 100;
    const frameRight = basis * insets.right / 100;
    const frameBottom = basis * insets.bottom / 100;
    const frameLeft = basis * insets.left / 100;
    framePreview.style.setProperty('--quick-edit-frame-image-basis', basis.toFixed(2) + 'px');
    framePreview.style.setProperty('--quick-edit-frame-top', frameTop.toFixed(2) + 'px');
    framePreview.style.setProperty('--quick-edit-frame-right', frameRight.toFixed(2) + 'px');
    framePreview.style.setProperty('--quick-edit-frame-bottom', frameBottom.toFixed(2) + 'px');
    framePreview.style.setProperty('--quick-edit-frame-left', frameLeft.toFixed(2) + 'px');
    framePreview.style.setProperty('--quick-edit-frame-top-half', (frameTop / 2).toFixed(2) + 'px');
    framePreview.style.setProperty('--quick-edit-frame-bottom-half', (frameBottom / 2).toFixed(2) + 'px');
    framePreview.style.setProperty('--quick-edit-frame-x-shift', ((frameRight - frameLeft) / 2).toFixed(2) + 'px');
    const hasVisibleFrame = frameConfig.key !== 'none';
    framePreview.style.setProperty('--quick-edit-frame-color', hasVisibleFrame && frameConfig.color ? frameConfig.color : 'transparent');
    framePreview.style.setProperty('--quick-edit-frame-overlap', hasVisibleFrame ? '1px' : '0px');
    renderQuickEditFramePreviewImages(framePreview, frameConfig);
    renderQuickEditFramePreviewText(framePreview, frameConfig);
  }

  function quickEditFramePreviewMetrics(framePreview) {
    const basis = Math.max(1, Number.parseFloat(framePreview.style.getPropertyValue('--quick-edit-frame-image-basis') || '') || framePreview.offsetWidth || 1);
    return {
      basis,
      contentWidth: Math.max(1, Number.parseFloat(framePreview.style.width || '') || framePreview.offsetWidth || basis),
      contentHeight: Math.max(1, Number.parseFloat(framePreview.style.height || '') || framePreview.offsetHeight || basis),
      frameTop: Number.parseFloat(framePreview.style.getPropertyValue('--quick-edit-frame-top') || '') || 0,
      frameRight: Number.parseFloat(framePreview.style.getPropertyValue('--quick-edit-frame-right') || '') || 0,
      frameBottom: Number.parseFloat(framePreview.style.getPropertyValue('--quick-edit-frame-bottom') || '') || 0,
      frameLeft: Number.parseFloat(framePreview.style.getPropertyValue('--quick-edit-frame-left') || '') || 0,
    };
  }

  function quickEditFrameLayerAnchor(position, layer, frameConfig, metrics) {
    const pos = String(position || 'bottom-center');
    const hasFrame = frameConfig && frameConfig.key !== 'none';
    const size = clamp(Number(layer && layer.size || 18), 8, 72);
    const box = metrics || {};
    const contentWidth = Math.max(1, Number(box.contentWidth || 1));
    const contentHeight = Math.max(1, Number(box.contentHeight || 1));
    const frameTop = hasFrame ? Math.max(0, Number(box.frameTop || 0)) : 0;
    const frameRight = hasFrame ? Math.max(0, Number(box.frameRight || 0)) : 0;
    const frameBottom = hasFrame ? Math.max(0, Number(box.frameBottom || 0)) : 0;
    const frameLeft = hasFrame ? Math.max(0, Number(box.frameLeft || 0)) : 0;
    const outerLeft = -frameLeft;
    const outerRight = contentWidth + frameRight;
    const outerTop = -frameTop;
    const outerBottom = contentHeight + frameBottom;
    const centeredX = contentWidth / 2 + (frameRight - frameLeft) / 2;
    let x = centeredX;
    let y = contentHeight + (hasFrame ? frameBottom / 2 : -(12 + size / 2));
    let align = 'center';
    let anchor = 'bottom';
    if (pos === 'top-center') {
      y = hasFrame ? -frameTop / 2 : 12 + size / 2;
      anchor = 'top';
    } else if (pos === 'bottom-left') {
      x = 0;
      align = 'left';
    } else if (pos === 'bottom-right') {
      x = contentWidth;
      align = 'right';
    }
    return {
      x,
      y,
      align,
      anchor,
      size,
      contentWidth,
      contentHeight,
      outerLeft,
      outerRight,
      outerTop,
      outerBottom,
    };
  }

  function quickEditFrameLayerPlacement(position, layer, frameConfig, metrics) {
    const base = quickEditFrameLayerAnchor(position, layer, frameConfig, metrics);
    const axis = quickEditNormalizeFrameTextCoordinateSpace(layer && layer.coordinateSpace) === QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE;
    const basisX = axis ? Math.max(1, base.contentWidth) : Math.min(base.contentWidth, base.contentHeight);
    const basisY = axis ? Math.max(1, base.contentHeight) : Math.min(base.contentWidth, base.contentHeight);
    const offsetX = basisX * quickEditNormalizeFrameTextOffset(layer && layer.x) / 100;
    const offsetY = basisY * quickEditNormalizeFrameTextOffset(layer && layer.y) / 100;
    return {
      x: clamp(base.x + offsetX, base.outerLeft, base.outerRight).toFixed(2) + 'px',
      y: clamp(base.y + offsetY, base.outerTop + base.size / 2, base.outerBottom - base.size / 2).toFixed(2) + 'px',
      align: base.align,
      anchor: base.anchor,
      maxWidth: Math.max(1, base.outerRight - base.outerLeft).toFixed(2) + 'px',
    };
  }

  function renderQuickEditFramePreviewText(framePreview, frameConfig) {
    if (!framePreview) return;
    let wrap = framePreview.querySelector('[data-quick-edit-frame-preview-text-list]');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'quick-edit-frame-preview-text-list';
      wrap.setAttribute('data-quick-edit-frame-preview-text-list', '');
      framePreview.appendChild(wrap);
    }
    wrap.innerHTML = '';
    const layers = frameConfig ? quickEditFrameTextLayers().filter((layer) => layer.enabled && String(layer.text || '').trim()) : [];
    const metrics = quickEditFramePreviewMetrics(framePreview);
    const { basis, contentWidth, contentHeight, frameTop, frameRight, frameBottom, frameLeft } = metrics;
    layers.forEach((layer) => {
      const resolved = quickEditResolveFrameTextTemplate(layer.text);
      if (!String(resolved || '').trim()) return;
      const placement = quickEditFrameLayerPlacement(layer.position, layer, frameConfig, metrics);
      const node = document.createElement('b');
      node.textContent = resolved;
      node.dataset.quickEditFrameTextPreview = layer.id;
      node.dataset.quickEditFrameTextAnchor = placement.anchor;
      node.title = '拖动文字层';
      node.style.left = placement.x;
      node.style.top = placement.y;
      node.style.color = layer.color;
      node.style.fontSize = quickEditPreviewFrameTextSize(layer, basis) + 'px';
      node.style.fontFamily = quickEditNormalizeFrameTextFamily(layer.fontFamily);
      node.style.fontWeight = String(quickEditNormalizeFrameTextWeight(layer.weight));
      node.style.marginLeft = '0';
      node.style.marginTop = '0';
      node.style.maxWidth = placement.maxWidth;
      node.style.textAlign = placement.align;
      node.style.transform = placement.align === 'center'
        ? 'translate(-50%, -50%)'
        : (placement.align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)');
      wrap.appendChild(node);
      const outerLeft = -frameLeft;
      const outerRight = contentWidth + frameRight;
      const outerTop = -frameTop;
      const outerBottom = contentHeight + frameBottom;
      const nodeWidth = Math.min(Math.max(1, node.offsetWidth || 1), Math.max(1, outerRight - outerLeft));
      const nodeHeight = Math.max(1, node.offsetHeight || Number(layer.size || 18));
      const currentX = Number.parseFloat(placement.x) || 0;
      const currentY = Number.parseFloat(placement.y) || 0;
      const minX = placement.align === 'right'
        ? outerLeft + nodeWidth
        : outerLeft + (placement.align === 'center' ? nodeWidth / 2 : 0);
      const maxX = placement.align === 'left'
        ? outerRight - nodeWidth
        : outerRight - (placement.align === 'center' ? nodeWidth / 2 : 0);
      node.style.left = clamp(currentX, Math.min(minX, maxX), Math.max(minX, maxX)).toFixed(2) + 'px';
      node.style.top = clamp(currentY, outerTop + nodeHeight / 2, outerBottom - nodeHeight / 2).toFixed(2) + 'px';
    });
  }

  function quickEditCanonicalizeFrameTextLayerOffset(layerId) {
    const el = state.quickEdit.el;
    const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
    const node = framePreview
      ? Array.from(framePreview.querySelectorAll('[data-quick-edit-frame-text-preview]')).find((item) => item.dataset.quickEditFrameTextPreview === String(layerId || ''))
      : null;
    const frameConfig = quickEditFrameExportConfig(state.quickEdit.framePreset);
    const layer = quickEditFrameTextLayerById(layerId);
    if (!framePreview || !node || !frameConfig || !layer) return false;
    const metrics = quickEditFramePreviewMetrics(framePreview);
    const base = quickEditFrameLayerAnchor(layer.position, layer, frameConfig, metrics);
    const actualX = Number.parseFloat(node.style.left || '');
    const actualY = Number.parseFloat(node.style.top || '');
    if (!Number.isFinite(actualX) || !Number.isFinite(actualY)) return false;
    const axis = quickEditNormalizeFrameTextCoordinateSpace(layer.coordinateSpace) === QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE;
    const basisX = axis ? Math.max(1, base.contentWidth) : Math.min(base.contentWidth, base.contentHeight);
    const basisY = axis ? Math.max(1, base.contentHeight) : Math.min(base.contentWidth, base.contentHeight);
    const x = quickEditNormalizeFrameTextOffset((actualX - base.x) / basisX * 100);
    const y = quickEditNormalizeFrameTextOffset((actualY - base.y) / basisY * 100);
    if (Math.abs(x - layer.x) < 0.0005 && Math.abs(y - layer.y) < 0.0005) return false;
    const layers = quickEditFrameTextLayers();
    const index = layers.findIndex((item) => item.id === layer.id);
    if (index < 0) return false;
    layers[index] = quickEditNormalizeFrameTextLayer(Object.assign({}, layers[index], { x, y }), index);
    state.quickEdit.frameTextLayers = layers;
    return true;
  }

  const QUICK_EDIT_SNAP_THRESHOLD = 8;
  const QUICK_EDIT_SNAP_GUIDE_COLOR = '#ff2f92';

  function quickEditSnapFrameScreenBox(framePreview) {
    const frameRect = framePreview.getBoundingClientRect();
    const metrics = quickEditFramePreviewMetrics(framePreview);
    const scaleX = frameRect.width / Math.max(1, metrics.contentWidth);
    const scaleY = frameRect.height / Math.max(1, metrics.contentHeight);
    return {
      frameRect,
      metrics,
      scaleX,
      scaleY,
      contentLeft: frameRect.left,
      contentTop: frameRect.top,
      contentRight: frameRect.right,
      contentBottom: frameRect.bottom,
      outerLeft: frameRect.left - metrics.frameLeft * scaleX,
      outerTop: frameRect.top - metrics.frameTop * scaleY,
      outerRight: frameRect.right + metrics.frameRight * scaleX,
      outerBottom: frameRect.bottom + metrics.frameBottom * scaleY,
    };
  }

  function quickEditCollectSnapTargets(framePreview, excludeLayerId) {
    const box = quickEditSnapFrameScreenBox(framePreview);
    const xs = [];
    const ys = [];
    const pushX = (left, right) => {
      xs.push(left, (left + right) / 2, right);
    };
    const pushY = (top, bottom) => {
      ys.push(top, (top + bottom) / 2, bottom);
    };
    pushX(box.contentLeft, box.contentRight);
    pushY(box.contentTop, box.contentBottom);
    xs.push(box.outerLeft, box.outerRight);
    ys.push(box.outerTop, box.outerBottom);
    const exclude = String(excludeLayerId || '');
    const addNode = (node, idAttr) => {
      if (!node || node.dataset[idAttr] === exclude) return;
      const rect = node.getBoundingClientRect();
      if (!(rect.width > 0.5) || !(rect.height > 0.5)) return;
      pushX(rect.left, rect.right);
      pushY(rect.top, rect.bottom);
    };
    framePreview.querySelectorAll('[data-quick-edit-frame-text-preview]').forEach((node) => addNode(node, 'quickEditFrameTextPreview'));
    framePreview.querySelectorAll('[data-quick-edit-frame-image-preview]').forEach((node) => addNode(node, 'quickEditFrameImagePreview'));
    return { xs, ys };
  }

  function quickEditComputeSnap(rect, targets, threshold) {
    const dragXs = [rect.left, rect.left + rect.width / 2, rect.right];
    const dragYs = [rect.top, rect.top + rect.height / 2, rect.bottom];
    let dx = 0;
    let guideX = null;
    let bestX = Infinity;
    dragXs.forEach((value) => {
      targets.xs.forEach((candidate) => {
        const dist = Math.abs(value - candidate);
        if (dist <= threshold && dist < bestX) {
          bestX = dist;
          dx = candidate - value;
          guideX = candidate;
        }
      });
    });
    let dy = 0;
    let guideY = null;
    let bestY = Infinity;
    dragYs.forEach((value) => {
      targets.ys.forEach((candidate) => {
        const dist = Math.abs(value - candidate);
        if (dist <= threshold && dist < bestY) {
          bestY = dist;
          dy = candidate - value;
          guideY = candidate;
        }
      });
    });
    return { dx, dy, guideX, guideY };
  }

  function quickEditEnsureSnapGuideLayer(framePreview) {
    let overlay = framePreview.querySelector('[data-quick-edit-snap-guides]');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'quick-edit-snap-guides';
      overlay.setAttribute('data-quick-edit-snap-guides', '');
      framePreview.appendChild(overlay);
    }
    return overlay;
  }

  function quickEditRenderSnapGuides(framePreview, guideX, guideY) {
    const overlay = quickEditEnsureSnapGuideLayer(framePreview);
    overlay.innerHTML = '';
    if (guideX === null && guideY === null) return;
    const box = quickEditSnapFrameScreenBox(framePreview);
    const localLeft = -box.metrics.frameLeft;
    const localTop = -box.metrics.frameTop;
    const localWidth = box.metrics.contentWidth + box.metrics.frameLeft + box.metrics.frameRight;
    const localHeight = box.metrics.contentHeight + box.metrics.frameTop + box.metrics.frameBottom;
    if (guideX !== null && Number.isFinite(guideX)) {
      const line = document.createElement('i');
      line.className = 'quick-edit-snap-guide vertical';
      line.style.background = QUICK_EDIT_SNAP_GUIDE_COLOR;
      line.style.left = ((guideX - box.frameRect.left) / box.scaleX).toFixed(2) + 'px';
      line.style.top = localTop.toFixed(2) + 'px';
      line.style.height = localHeight.toFixed(2) + 'px';
      overlay.appendChild(line);
    }
    if (guideY !== null && Number.isFinite(guideY)) {
      const line = document.createElement('i');
      line.className = 'quick-edit-snap-guide horizontal';
      line.style.background = QUICK_EDIT_SNAP_GUIDE_COLOR;
      line.style.top = ((guideY - box.frameRect.top) / box.scaleY).toFixed(2) + 'px';
      line.style.left = localLeft.toFixed(2) + 'px';
      line.style.width = localWidth.toFixed(2) + 'px';
      overlay.appendChild(line);
    }
  }

  function quickEditClearSnapGuides(framePreview) {
    const overlay = framePreview ? framePreview.querySelector('[data-quick-edit-snap-guides]') : null;
    if (overlay) overlay.innerHTML = '';
  }

  function quickEditApplyLayerSnap(layerId, framePreview, ev, offsetBasis, kind) {
    if (!framePreview) return;
    if (ev && ev.altKey) {
      quickEditClearSnapGuides(framePreview);
      return;
    }
    const basis = offsetBasis && typeof offsetBasis === 'object'
      ? { x: Math.max(0.000001, Number(offsetBasis.x || 1)), y: Math.max(0.000001, Number(offsetBasis.y || 1)) }
      : (() => {
        const value = Math.max(0.000001, Number(offsetBasis || 1));
        return { x: value, y: value };
      })();
    const attr = kind === 'text' ? 'quickEditFrameTextPreview' : 'quickEditFrameImagePreview';
    const selector = kind === 'text' ? '[data-quick-edit-frame-text-preview]' : '[data-quick-edit-frame-image-preview]';
    const node = Array.from(framePreview.querySelectorAll(selector)).find((item) => item.dataset[attr] === String(layerId || '')) || null;
    if (!node) {
      quickEditClearSnapGuides(framePreview);
      return;
    }
    const rect = node.getBoundingClientRect();
    const targets = quickEditCollectSnapTargets(framePreview, layerId);
    const snap = quickEditComputeSnap(rect, targets, QUICK_EDIT_SNAP_THRESHOLD);
    if (snap.dx || snap.dy) {
      const current = kind === 'text' ? quickEditFrameTextLayerById(layerId) : quickEditFrameImageLayerById(layerId);
      if (current) {
        const deltaXPercent = quickEditGeometryApi().screenDeltaToPercent(snap.dx, basis.x);
        const deltaYPercent = quickEditGeometryApi().screenDeltaToPercent(snap.dy, basis.y);
        if (kind === 'text') {
          updateQuickEditFrameTextLayer(layerId, {
            x: Number(current.x || 0) + deltaXPercent,
            y: Number(current.y || 0) + deltaYPercent,
          }, { skipRender: true });
          quickEditCanonicalizeFrameTextLayerOffset(layerId);
        } else {
          updateQuickEditFrameImageLayer(layerId, {
            x: Number(current.x || 0) + deltaXPercent,
            y: Number(current.y || 0) + deltaYPercent,
          }, { skipRender: true });
        }
      }
    }
    quickEditRenderSnapGuides(framePreview, snap.guideX, snap.guideY);
  }

  function quickEditFrameOffsetBasis(layer, basisX, basisY) {
    const width = Math.max(1, Number(basisX || 1));
    const height = Math.max(1, Number(basisY || 1));
    const space = layer && (layer.coordinateSpace || '');
    const axis = space === QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE || space === QUICK_EDIT_FRAME_IMAGE_AXIS_COORDINATE_SPACE;
    return axis ? { x: width, y: height } : { x: Math.min(width, height), y: Math.min(width, height) };
  }

  function startQuickEditFrameTextDrag(ev, layerId) {
    if (!ev || ev.button !== 0) return false;
    if (state.quickEdit.hslPickerActive) return false;
    const el = state.quickEdit.el;
    const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
    let layer = quickEditFrameTextLayerById(layerId);
    if (!layer || !framePreview) return false;
    quickEditCanonicalizeFrameTextLayerOffset(layer.id);
    layer = quickEditFrameTextLayerById(layer.id);
    const screenRect = framePreview.getBoundingClientRect();
    const basisX = Math.max(1, Number(screenRect.width || 0));
    const basisY = Math.max(1, Number(screenRect.height || 0));
    const coordinateBasis = Math.min(basisX, basisY);
    state.quickEdit.frameTextDrag = {
      layerId: layer.id,
      startClientX: ev.clientX,
      startClientY: ev.clientY,
      startLayerX: Number(layer.x || 0),
      startLayerY: Number(layer.y || 0),
      basisX,
      basisY,
      coordinateBasis,
      offsetBasis: quickEditFrameOffsetBasis(layer, basisX, basisY),
      boundaryClampCount: 0,
    };
    ev.preventDefault();
    ev.stopPropagation();
    window.addEventListener('pointermove', onQuickEditFrameTextDragMove, { passive: false });
    window.addEventListener('pointerup', endQuickEditFrameTextDrag, { passive: false });
    window.addEventListener('pointercancel', endQuickEditFrameTextDrag, { passive: false });
    return true;
  }

  function onQuickEditFrameTextDragMove(ev) {
    const drag = state.quickEdit.frameTextDrag;
    if (!drag) return;
    ev.preventDefault();
    const layer = quickEditFrameTextLayerById(drag.layerId);
    const el = state.quickEdit.el;
    const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
    if (!layer || !framePreview) return;
    const coordinateBasis = Math.max(1, Number(drag.coordinateBasis || 1));
    const offsetBasis = drag.offsetBasis || { x: coordinateBasis, y: coordinateBasis };
    const geometry = quickEditGeometryApi();
    // 期望位置由“起始偏移 + 鼠标总位移”绝对推得，吸附只修正渲染位置；
    // 这样鼠标移出吸附阈值后图层能立即跟随，不会被“钉死”在参考线上。
    const desiredX = Number(drag.startLayerX || 0) + geometry.screenDeltaToPercent(Number(ev.clientX || 0) - Number(drag.startClientX || 0), offsetBasis.x);
    const desiredY = Number(drag.startLayerY || 0) + geometry.screenDeltaToPercent(Number(ev.clientY || 0) - Number(drag.startClientY || 0), offsetBasis.y);
    updateQuickEditFrameTextLayer(drag.layerId, { x: desiredX, y: desiredY }, { skipRender: true });
    if (quickEditCanonicalizeFrameTextLayerOffset(drag.layerId)) drag.boundaryClampCount += 1;
    quickEditApplyLayerSnap(drag.layerId, framePreview, ev, offsetBasis, 'text');
  }

  function endQuickEditFrameTextDrag(ev) {
    if (ev) ev.preventDefault();
    const drag = state.quickEdit.frameTextDrag;
    if (!drag) return;
    state.quickEdit.frameTextDrag = null;
    window.removeEventListener('pointermove', onQuickEditFrameTextDragMove);
    window.removeEventListener('pointerup', endQuickEditFrameTextDrag);
    window.removeEventListener('pointercancel', endQuickEditFrameTextDrag);
    const el = state.quickEdit.el;
    const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
    quickEditClearSnapGuides(framePreview);
    renderQuickEditFrameTextLayers();
    syncQuickEditFramePreview();
    syncQuickEditSaveConfirm();
    const layer = quickEditFrameTextLayerById(drag.layerId);
    console.info('[PicScannerFrameGeometry] text layer positioned', {
      layerId: drag.layerId,
      anchor: layer ? layer.position : '',
      offsetX: layer ? layer.x : null,
      offsetY: layer ? layer.y : null,
      basis: { width: drag.basisX, height: drag.basisY },
      coordinateBasis: drag.coordinateBasis,
      boundaryClampCount: drag.boundaryClampCount,
    });
  }

  function quickEditFrameImagePreviewPlacement(layer, framePreview, aspectRatio) {
    const metrics = quickEditFramePreviewMetrics(framePreview);
    const geometry = quickEditGeometryApi().imageLayerPlacement({
      contentWidth: metrics.contentWidth,
      contentHeight: metrics.contentHeight,
      outerLeft: -metrics.frameLeft,
      outerTop: -metrics.frameTop,
      outerRight: metrics.contentWidth + metrics.frameRight,
      outerBottom: metrics.contentHeight + metrics.frameBottom,
      coordinateSpace: quickEditNormalizeFrameImageCoordinateSpace(layer && layer.coordinateSpace),
      sizePercent: quickEditNormalizeFrameImageSize(layer && layer.size),
      aspectRatio,
      rotationDegrees: quickEditNormalizeFrameImageRotation(layer && layer.rotation),
      anchor: quickEditNormalizeFrameImageAnchor(layer && layer.anchor) || 'center',
      offsetXPercent: quickEditNormalizeFrameImageOffset(layer && layer.x),
      offsetYPercent: quickEditNormalizeFrameImageOffset(layer && layer.y),
    });
    return Object.assign({ metrics }, geometry);
  }

  function quickEditWriteFrameImageCanonicalOffset(layerId, placement) {
    const layer = quickEditFrameImageLayerById(layerId);
    if (!layer || !placement) return false;
    const x = quickEditNormalizeFrameImageOffset(placement.offsetXPercent);
    const y = quickEditNormalizeFrameImageOffset(placement.offsetYPercent);
    const anchor = placement.anchor ? quickEditNormalizeFrameImageAnchor(placement.anchor) : layer.anchor;
    const coordinateSpace = quickEditNormalizeFrameImageCoordinateSpace(layer.coordinateSpace);
    if (
      Math.abs(x - layer.x) < 0.0005
      && Math.abs(y - layer.y) < 0.0005
      && anchor === layer.anchor
      && coordinateSpace === layer.coordinateSpace
    ) return false;
    const layers = quickEditFrameImageLayers();
    const index = layers.findIndex((item) => item.id === layer.id);
    if (index < 0) return false;
    layers[index] = quickEditNormalizeFrameImageLayer(Object.assign({}, layers[index], {
      coordinateSpace,
      anchor,
      x,
      y,
    }), index);
    state.quickEdit.frameImageLayers = layers;
    return true;
  }

  function quickEditReanchorFrameImageLayer(layerId, framePreview, aspectRatio) {
    const layer = quickEditFrameImageLayerById(layerId);
    if (!layer || !framePreview || !(aspectRatio > 0)) return layer;
    const placement = quickEditFrameImagePreviewPlacement(layer, framePreview, aspectRatio);
    const anchor = quickEditGeometryApi().closestImageLayerAnchor(
      placement.x,
      placement.y,
      placement.metrics.contentWidth,
      placement.metrics.contentHeight,
    );
    const offsets = quickEditGeometryApi().imageLayerOffsetsForPoint({
      x: placement.x,
      y: placement.y,
      contentWidth: placement.metrics.contentWidth,
      contentHeight: placement.metrics.contentHeight,
      anchor,
      coordinateSpace: quickEditNormalizeFrameImageCoordinateSpace(layer.coordinateSpace),
    });
    quickEditWriteFrameImageCanonicalOffset(layer.id, offsets);
    return quickEditFrameImageLayerById(layer.id) || layer;
  }

  function renderQuickEditFramePreviewImages(framePreview, frameConfig) {
    if (!framePreview) return;
    let wrap = framePreview.querySelector('[data-quick-edit-frame-preview-image-list]');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'quick-edit-frame-preview-image-list';
      wrap.setAttribute('data-quick-edit-frame-preview-image-list', '');
      framePreview.appendChild(wrap);
    }
    wrap.innerHTML = '';
    const layers = frameConfig ? (frameConfig.imageLayers || []).filter((layer) => layer.enabled && layer.assetId) : [];
    layers.forEach((configuredLayer) => {
      const aspectRatio = quickEditCachedFrameAssetAspectRatio(configuredLayer.assetId);
      if (!(aspectRatio > 0)) {
        quickEditEnsureFrameAssetMetrics(configuredLayer.assetId)
          .then(() => syncQuickEditFramePreview())
          .catch((err) => console.warn('[PicScannerFrameGeometry] frame asset metrics failed', { assetId: configuredLayer.assetId, error: String((err && err.message) || err || '') }));
        return;
      }
      const layer = quickEditFrameImageLayerById(configuredLayer.id) || configuredLayer;
      const node = document.createElement('button');
      const url = quickEditEnsureFrameAssetUrl(layer.assetId);
      const placement = quickEditFrameImagePreviewPlacement(layer, framePreview, aspectRatio);
      quickEditWriteFrameImageCanonicalOffset(layer.id, placement);
      node.type = 'button';
      node.className = 'quick-edit-frame-preview-image' + (url ? '' : ' loading');
      node.dataset.quickEditFrameImagePreview = layer.id;
      node.title = layer.name || '图片标识';
      node.style.left = placement.x.toFixed(2) + 'px';
      node.style.top = placement.y.toFixed(2) + 'px';
      node.style.width = placement.width.toFixed(2) + 'px';
      node.style.height = placement.height.toFixed(2) + 'px';
      node.style.marginLeft = '0';
      node.style.marginTop = '0';
      node.style.opacity = String(quickEditNormalizeFrameImageOpacity(layer.opacity) / 100);
      node.style.transform = 'translate(-50%, -50%) rotate(' + placement.rotationDegrees.toFixed(1) + 'deg)';
      if (url) {
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.src = url;
        node.appendChild(img);
      } else {
        node.textContent = '读取中';
      }
      wrap.appendChild(node);
    });
  }

  function startQuickEditFrameImageDrag(ev, layerId) {
    if (!ev || ev.button !== 0) return false;
    if (state.quickEdit.hslPickerActive) return false;
    const el = state.quickEdit.el;
    const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
    let layer = quickEditFrameImageLayerById(layerId);
    if (!layer || !framePreview) return false;
    const aspectRatio = quickEditCachedFrameAssetAspectRatio(layer.assetId);
    if (!(aspectRatio > 0)) return false;
    quickEditWriteFrameImageCanonicalOffset(layer.id, quickEditFrameImagePreviewPlacement(layer, framePreview, aspectRatio));
    layer = quickEditFrameImageLayerById(layer.id);
    const screenRect = framePreview.getBoundingClientRect();
    const basisX = Math.max(1, Number(screenRect.width || 0));
    const basisY = Math.max(1, Number(screenRect.height || 0));
    const coordinateBasis = Math.min(basisX, basisY);
    state.quickEdit.frameImageDrag = {
      layerId: layer.id,
      startClientX: ev.clientX,
      startClientY: ev.clientY,
      startLayerX: Number(layer.x || 0),
      startLayerY: Number(layer.y || 0),
      basisX,
      basisY,
      coordinateBasis,
      offsetBasis: quickEditFrameOffsetBasis(layer, basisX, basisY),
      boundaryClampCount: 0,
    };
    ev.preventDefault();
    ev.stopPropagation();
    window.addEventListener('pointermove', onQuickEditFrameImageDragMove, { passive: false });
    window.addEventListener('pointerup', endQuickEditFrameImageDrag, { passive: false });
    window.addEventListener('pointercancel', endQuickEditFrameImageDrag, { passive: false });
    return true;
  }

  function onQuickEditFrameImageDragMove(ev) {
    const drag = state.quickEdit.frameImageDrag;
    if (!drag) return;
    ev.preventDefault();
    const layer = quickEditFrameImageLayerById(drag.layerId);
    const el = state.quickEdit.el;
    const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
    const aspectRatio = layer ? quickEditCachedFrameAssetAspectRatio(layer.assetId) : 0;
    if (!layer || !framePreview || !(aspectRatio > 0)) return;
    const coordinateBasis = Math.max(1, Number(drag.coordinateBasis || 1));
    const offsetBasis = drag.offsetBasis || { x: coordinateBasis, y: coordinateBasis };
    const geometry = quickEditGeometryApi();
    // 与文本层一致：期望位置由“起始偏移 + 鼠标总位移”绝对推得，吸附只修正渲染位置，
    // 避免图层被吸附参考线钉死。
    const desired = Object.assign({}, layer, {
      x: Number(drag.startLayerX || 0) + geometry.screenDeltaToPercent(Number(ev.clientX || 0) - Number(drag.startClientX || 0), offsetBasis.x),
      y: Number(drag.startLayerY || 0) + geometry.screenDeltaToPercent(Number(ev.clientY || 0) - Number(drag.startClientY || 0), offsetBasis.y),
    });
    const placement = quickEditFrameImagePreviewPlacement(desired, framePreview, aspectRatio);
    if (Math.abs(placement.offsetXPercent - desired.x) >= 0.0005 || Math.abs(placement.offsetYPercent - desired.y) >= 0.0005) {
      drag.boundaryClampCount += 1;
    }
    updateQuickEditFrameImageLayer(drag.layerId, {
      x: placement.offsetXPercent,
      y: placement.offsetYPercent,
    }, { skipRender: true });
    quickEditApplyLayerSnap(drag.layerId, framePreview, ev, offsetBasis, 'image');
  }

  function endQuickEditFrameImageDrag(ev) {
    if (ev) ev.preventDefault();
    const drag = state.quickEdit.frameImageDrag;
    if (!drag) return;
    state.quickEdit.frameImageDrag = null;
    window.removeEventListener('pointermove', onQuickEditFrameImageDragMove);
    window.removeEventListener('pointerup', endQuickEditFrameImageDrag);
    window.removeEventListener('pointercancel', endQuickEditFrameImageDrag);
    const el = state.quickEdit.el;
    const framePreview = el ? el.querySelector('[data-quick-edit-frame-preview]') : null;
    quickEditClearSnapGuides(framePreview);
    const current = quickEditFrameImageLayerById(drag.layerId);
    const aspectRatio = current ? quickEditCachedFrameAssetAspectRatio(current.assetId) : 0;
    const layer = quickEditReanchorFrameImageLayer(drag.layerId, framePreview, aspectRatio);
    renderQuickEditFrameImageLayers();
    syncQuickEditFramePreview();
    syncQuickEditSaveConfirm();
    console.info('[PicScannerFrameGeometry] image layer positioned', {
      layerId: drag.layerId,
      anchor: layer ? layer.anchor : '',
      offsetX: layer ? layer.x : null,
      offsetY: layer ? layer.y : null,
      basis: { width: drag.basisX, height: drag.basisY },
      coordinateBasis: drag.coordinateBasis,
      boundaryClampCount: drag.boundaryClampCount,
    });
  }

  function onQuickEditFrameImageWheel(ev) {
    if (!state.quickEdit.open || !ev) return;
    const target = ev.target && ev.target.closest
      ? ev.target.closest('[data-quick-edit-frame-image-preview]')
      : null;
    if (!target) return;
    const layer = quickEditFrameImageLayerById(target.dataset.quickEditFrameImagePreview);
    if (!layer) return;
    ev.preventDefault();
    ev.stopPropagation();
    const delta = Number(ev.deltaY || 0);
    if (!delta) return;
    const factor = delta < 0 ? LIGHTBOX_ZOOM_STEP : 1 / LIGHTBOX_ZOOM_STEP;
    const size = quickEditNormalizeFrameImageSize(Number(layer.size || 18) * factor);
    if (Math.abs(size - layer.size) < 0.0005) return;
    updateQuickEditFrameImageLayer(layer.id, { size }, { skipRender: true });
    renderQuickEditFrameImageLayers();
  }

  function syncQuickEditFrameUi() {
    const el = state.quickEdit.el;
    if (!el) return;
    const preset = quickEditFramePresetKey(state.quickEdit.framePreset);
    state.quickEdit.framePreset = preset;
    el.querySelectorAll('[data-quick-edit-frame-preset]').forEach((btn) => {
      const active = quickEditFramePresetKey(btn.dataset.quickEditFramePreset) === preset;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const insets = quickEditNormalizeFrameInsets(state.quickEdit.frameInsets || quickEditFrameDefaultInsets(preset));
    state.quickEdit.frameInsets = insets;
    el.querySelectorAll('[data-quick-edit-frame-inset]').forEach((input) => {
      const key = String(input.dataset.quickEditFrameInset || '');
      if (Object.prototype.hasOwnProperty.call(insets, key) && String(input.value) !== String(insets[key])) {
        input.value = String(insets[key]);
      }
      input.disabled = preset === 'none';
    });
    const textAdd = el.querySelector('[data-quick-edit-frame-text-add]');
    if (textAdd) textAdd.disabled = false;
    const imageAdd = el.querySelector('[data-quick-edit-frame-image-add]');
    if (imageAdd) imageAdd.disabled = false;
    renderQuickEditFrameTextLayers();
    renderQuickEditFrameImageLayers();
    syncQuickEditFramePresetUi();
    syncQuickEditFramePreview();
  }

  function setQuickEditFramePreset(preset) {
    const next = quickEditFramePresetKey(preset);
    state.quickEdit.framePreset = next;
    if (next !== 'none') state.quickEdit.frameInsets = quickEditFrameDefaultInsets(next);
    refreshQuickEditImageDisplayBasis();
    syncQuickEditFrameUi();
    syncQuickEditSaveConfirm();
  }

  function quickEditFrameTextPositionLabel(position) {
    if (position === 'top-center') return '上中';
    if (position === 'bottom-left') return '左下';
    if (position === 'bottom-right') return '右下';
    return '下中';
  }

  function quickEditNormalizeHexColor(value) {
    const raw = String(value || '').trim();
    const body = raw.startsWith('#') ? raw.slice(1) : raw;
    return /^[0-9a-f]{6}$/i.test(body) ? '#' + body.toLowerCase() : '';
  }

  function quickEditHslToHex(hue, saturation, lightness) {
    const h = (((Number(hue || 0) % 360) + 360) % 360) / 360;
    const s = clamp(Number(saturation || 0), 0, 100) / 100;
    const l = clamp(Number(lightness || 0), 0, 100) / 100;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const channel = (offset) => {
      let t = h + offset;
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      let value = p;
      if (t < 1 / 6) value = p + (q - p) * 6 * t;
      else if (t < 1 / 2) value = q;
      else if (t < 2 / 3) value = p + (q - p) * (2 / 3 - t) * 6;
      return Math.round(clamp(value, 0, 1) * 255).toString(16).padStart(2, '0');
    };
    return '#' + channel(1 / 3) + channel(0) + channel(-1 / 3);
  }

  function quickEditFrameTextColorChoices() {
    const colors = QUICK_EDIT_FRAME_TEXT_COLORS.map((item) => item.color);
    [0, 28, 45, 130, 188, 215, 265, 330].forEach((hue) => {
      colors.push(quickEditHslToHex(hue, 82, 56));
      colors.push(quickEditHslToHex(hue, 64, 38));
    });
    colors.push('#111111', '#444444', '#888888', '#cccccc', '#ffffff');
    return colors;
  }

  function quickEditFrameTextColorControl(layer) {
    const layerId = escapeHtml(layer.id);
    const color = quickEditNormalizeHexColor(layer.color) || quickEditDefaultFrameTextColor();
    return '<div class="quick-edit-frame-text-color-row">'
      + '<input type="text" maxlength="7" autocomplete="off" spellcheck="false" value="' + escapeHtml(color) + '" data-quick-edit-frame-text-color-input="' + layerId + '" />'
      + '<button type="button" class="quick-edit-frame-text-color-trigger" style="--quick-edit-frame-text-color:' + color + '" data-quick-edit-frame-text-color-trigger="' + layerId + '" title="选择颜色" aria-label="选择颜色"><span></span></button>'
      + '</div>';
  }

  function quickEditFrameTextLayerById(id) {
    const layerId = String(id || '');
    return quickEditFrameTextLayers().find((layer) => layer.id === layerId) || null;
  }

  function positionQuickEditFloatPanel(panel, anchor, width) {
    if (!panel || !anchor) return;
    panel.classList.remove('hidden');
    const rect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const pad = 10;
    const panelWidth = width || panelRect.width || 292;
    const left = Math.max(pad, Math.min(rect.left, window.innerWidth - panelWidth - pad));
    const top = Math.max(pad + 36, Math.min(rect.bottom + 8, window.innerHeight - (panelRect.height || 220) - pad));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function syncQuickEditFrameTextColorControl(layerId, color) {
    const clean = quickEditNormalizeHexColor(color);
    if (!clean || !state.quickEdit.el) return;
    const input = Array.from(state.quickEdit.el.querySelectorAll('[data-quick-edit-frame-text-color-input]'))
      .find((node) => node.dataset.quickEditFrameTextColorInput === layerId);
    const trigger = Array.from(state.quickEdit.el.querySelectorAll('[data-quick-edit-frame-text-color-trigger]'))
      .find((node) => node.dataset.quickEditFrameTextColorTrigger === layerId);
    if (input && input.value !== clean) input.value = clean;
    if (trigger) trigger.style.setProperty('--quick-edit-frame-text-color', clean);
  }

  function ensureQuickEditFrameTextColorPanel() {
    if (PS.quickEditFrameTextColorPanel && PS.quickEditFrameTextColorPanel.isConnected) return PS.quickEditFrameTextColorPanel;
    const panel = document.createElement('div');
    panel.className = 'quick-edit-curve-panel quick-edit-frame-text-pop quick-edit-frame-text-color-pop hidden';
    document.body.appendChild(panel);
    PS.quickEditFrameTextColorPanel = panel;
    return panel;
  }

  function hideQuickEditFrameTextColorPanel() {
    if (PS.quickEditFrameTextColorPanel) PS.quickEditFrameTextColorPanel.classList.add('hidden');
  }

  function openQuickEditFrameTextColorPanel(layerId, anchor) {
    const layer = quickEditFrameTextLayerById(layerId);
    if (!layer || !anchor) return;
    const color = quickEditNormalizeHexColor(layer.color) || quickEditDefaultFrameTextColor();
    const panel = ensureQuickEditFrameTextColorPanel();
    const choices = quickEditFrameTextColorChoices();
    panel.dataset.layerId = layer.id;
    panel.innerHTML = '<div class="quick-edit-curve-head">'
      + '<span>文字颜色</span>'
      + '<div class="quick-edit-curve-head-actions"><button class="icon-btn quick-edit-curve-close" type="button" data-quick-edit-frame-text-color-close title="关闭" aria-label="关闭">' + quickEditIconSvg('close') + '</button></div>'
      + '</div>'
      + '<div class="quick-edit-frame-text-color-current">'
      + '<input type="text" readonly value="' + escapeHtml(color) + '" />'
      + '<span style="--quick-edit-frame-text-color:' + color + '"></span>'
      + '</div>'
      + '<div class="quick-edit-frame-text-color-grid">'
      + choices.map((item) => '<button type="button" style="--quick-edit-frame-text-color:' + item + '" data-quick-edit-frame-text-color-choice="' + escapeHtml(item) + '" aria-label="选择颜色"><span></span></button>').join('')
      + '</div>';
    positionQuickEditFloatPanel(panel, anchor, 292);
  }

  function ensureQuickEditFrameTextTokenPanel() {
    if (PS.quickEditFrameTextTokenPanel && PS.quickEditFrameTextTokenPanel.isConnected) return PS.quickEditFrameTextTokenPanel;
    const panel = document.createElement('div');
    panel.className = 'quick-edit-curve-panel quick-edit-frame-text-pop quick-edit-frame-text-token-pop hidden';
    document.body.appendChild(panel);
    PS.quickEditFrameTextTokenPanel = panel;
    return panel;
  }

  function hideQuickEditFrameTextTokenPanel() {
    if (PS.quickEditFrameTextTokenPanel) PS.quickEditFrameTextTokenPanel.classList.add('hidden');
  }

  function hideQuickEditFrameTextPanels() {
    hideQuickEditFrameTextColorPanel();
    hideQuickEditFrameTextTokenPanel();
  }

  function openQuickEditFrameTextTokenPanel(anchor) {
    if (!anchor) return;
    const panel = ensureQuickEditFrameTextTokenPanel();
    panel.innerHTML = '<div class="quick-edit-curve-head">'
      + '<span>参数注入</span>'
      + '<div class="quick-edit-curve-head-actions"><button class="icon-btn quick-edit-curve-close" type="button" data-quick-edit-frame-text-token-close title="关闭" aria-label="关闭">' + quickEditIconSvg('close') + '</button></div>'
      + '</div>'
      + '<div class="quick-edit-frame-text-token-list">'
      + QUICK_EDIT_FRAME_TEXT_TOKENS.map((item) => '<div class="quick-edit-frame-text-token-row">'
        + '<span>' + escapeHtml(item.label) + '</span>'
        + '<input type="text" readonly value="' + escapeHtml(item.token) + '" data-quick-edit-frame-text-token-value />'
        + '<button class="icon-btn" type="button" data-quick-edit-frame-text-token-copy="' + escapeHtml(item.token) + '" title="复制" aria-label="复制">' + quickEditIconSvg('copy') + '</button>'
        + '</div>').join('')
      + '</div>';
    positionQuickEditFloatPanel(panel, anchor, 334);
  }

  function copyQuickEditFrameTextToken(token) {
    const textValue = String(token || '').trim();
    if (!textValue) return;
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      showToast('当前环境不能直接写入剪贴板，请选中后复制', 'error');
      return;
    }
    navigator.clipboard.writeText(textValue)
      .then(() => showToast('已复制 ' + textValue))
      .catch((err) => {
        console.warn('[PicScanner] 参数复制失败', err);
        showToast('复制失败，请选中后复制', 'error');
      });
  }

  function quickEditFramePresetName(preset) {
    const key = quickEditFramePresetKey(preset);
    if (key === 'white') return '白边';
    if (key === 'black') return '黑边';
    if (key === 'paper') return '相纸';
    return '无相框';
  }

  function renderQuickEditFrameTextLayers() {
    const el = state.quickEdit.el;
    if (!el) return;
    const list = el.querySelector('[data-quick-edit-frame-text-list]');
    if (!list) return;
    const layers = quickEditFrameTextLayers();
    if (!layers.length) {
      list.innerHTML = '<div class="quick-edit-frame-text-empty">暂无文字层</div>';
      return;
    }
    list.innerHTML = layers.map((layer, index) => {
      const layerId = escapeHtml(layer.id);
      return '<div class="quick-edit-frame-text-layer" data-quick-edit-frame-text-layer="' + layerId + '">'
      + '<div class="quick-edit-frame-text-layer-head">'
      + '<input type="text" maxlength="120" autocomplete="off" value="' + escapeHtml(layer.text) + '" data-quick-edit-frame-text-template="' + layerId + '" />'
      + '<button class="icon-btn quick-edit-frame-text-remove-btn" type="button" data-quick-edit-frame-text-remove="' + layerId + '" title="删除文字层" aria-label="删除文字层">' + quickEditIconSvg('trash') + '</button>'
      + '</div>'
      + '<div class="quick-edit-frame-text-controls">'
      + '<div class="quick-edit-frame-text-positions">'
      + ['top-center', 'bottom-left', 'bottom-center', 'bottom-right'].map((position) => (
        '<button type="button" class="' + (layer.position === position ? 'active' : '') + '" data-quick-edit-frame-text-position-layer="' + layerId + '" data-quick-edit-frame-text-position="' + position + '">' + quickEditFrameTextPositionLabel(position) + '</button>'
      )).join('')
      + '</div>'
      + '<div class="quick-edit-frame-text-offsets">'
      + '<label><span>X</span><input type="text" inputmode="decimal" pattern="-?[0-9]*[.]?[0-9]*" value="' + layer.x + '" data-quick-edit-frame-text-x="' + layerId + '" /></label>'
      + '<label><span>Y</span><input type="text" inputmode="decimal" pattern="-?[0-9]*[.]?[0-9]*" value="' + layer.y + '" data-quick-edit-frame-text-y="' + layerId + '" /></label>'
      + '</div>'
      + '<label class="quick-edit-frame-space"><span>坐标基准</span>'
      + '<select data-quick-edit-frame-text-space="' + layerId + '" title="按轴百分比：X 相对内容宽度、Y 相对内容高度，缩放/换图时贴边不漂移">'
      + '<option value="short-edge-anchor-v1"' + (layer.coordinateSpace !== QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE ? ' selected' : '') + '>短边基准</option>'
      + '<option value="axis-percent-anchor-v1"' + (layer.coordinateSpace === QUICK_EDIT_FRAME_TEXT_AXIS_COORDINATE_SPACE ? ' selected' : '') + '>按轴百分比</option>'
      + '</select>'
      + '</label>'
      + '<div class="quick-edit-frame-text-font-row">'
      + '<label><span>FontFamily</span><input type="text" maxlength="80" autocomplete="off" value="' + escapeHtml(layer.fontFamily) + '" data-quick-edit-frame-text-family="' + layerId + '" /></label>'
      + '<label><span>字号</span><input type="text" inputmode="numeric" pattern="[0-9]*" value="' + layer.size + '" data-quick-edit-frame-text-size="' + layerId + '" /></label>'
      + '<label><span>粗细程度</span><input type="text" inputmode="numeric" pattern="[0-9]*" value="' + layer.weight + '" data-quick-edit-frame-text-weight="' + layerId + '" /></label>'
      + '</div>'
      + '<div class="quick-edit-frame-text-color"><span>颜色</span>' + quickEditFrameTextColorControl(layer) + '</div>'
      + '</div>'
      + '</div>';
    }).join('');
  }

  function renderQuickEditFrameImageLayers() {
    const el = state.quickEdit.el;
    if (!el) return;
    const list = el.querySelector('[data-quick-edit-frame-image-list]');
    if (!list) return;
    const layers = quickEditFrameImageLayers();
    if (!layers.length) {
      list.innerHTML = '<div class="quick-edit-frame-text-empty">暂无图片标识</div>';
      return;
    }
    list.innerHTML = layers.map((layer) => {
      const layerId = escapeHtml(layer.id);
      const assetUrl = quickEditCachedFrameAssetUrl(layer.assetId);
      return '<div class="quick-edit-frame-text-layer quick-edit-frame-image-layer" data-quick-edit-frame-image-layer="' + layerId + '">'
        + '<div class="quick-edit-frame-text-layer-head">'
        + '<span title="' + escapeHtml(layer.name) + '">' + escapeHtml(layer.name) + '</span>'
        + '<button class="icon-btn quick-edit-frame-text-remove-btn" type="button" data-quick-edit-frame-image-remove="' + layerId + '" title="删除图片标识" aria-label="删除图片标识">' + quickEditIconSvg('trash') + '</button>'
        + '</div>'
        + '<div class="quick-edit-frame-image-row">'
        + '<div class="quick-edit-frame-image-thumb">' + (assetUrl ? '<img alt="" src="' + escapeHtml(assetUrl) + '" />' : '<span>读取中</span>') + '</div>'
        + '<div class="quick-edit-frame-text-controls">'
        + '<div class="quick-edit-frame-text-offsets">'
        + '<label><span>X</span><input type="text" inputmode="decimal" pattern="-?[0-9]*[.]?[0-9]*" value="' + layer.x + '" data-quick-edit-frame-image-x="' + layerId + '" /></label>'
        + '<label><span>Y</span><input type="text" inputmode="decimal" pattern="-?[0-9]*[.]?[0-9]*" value="' + layer.y + '" data-quick-edit-frame-image-y="' + layerId + '" /></label>'
        + '</div>'
        + '<label class="quick-edit-frame-space"><span>坐标基准</span>'
        + '<select data-quick-edit-frame-image-space="' + layerId + '" title="按轴百分比：X 相对内容宽度、Y 相对内容高度，缩放/换图时贴边不漂移">'
        + '<option value="short-edge-anchor-v1"' + (layer.coordinateSpace !== QUICK_EDIT_FRAME_IMAGE_AXIS_COORDINATE_SPACE ? ' selected' : '') + '>短边基准</option>'
        + '<option value="axis-percent-anchor-v1"' + (layer.coordinateSpace === QUICK_EDIT_FRAME_IMAGE_AXIS_COORDINATE_SPACE ? ' selected' : '') + '>按轴百分比</option>'
        + '</select>'
        + '</label>'
        + '<div class="quick-edit-frame-image-controls">'
        + '<label><span>大小</span><input type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" value="' + layer.size + '" data-quick-edit-frame-image-size="' + layerId + '" /></label>'
        + '<label><span>透明</span><input type="text" inputmode="numeric" pattern="[0-9]*" value="' + layer.opacity + '" data-quick-edit-frame-image-opacity="' + layerId + '" /></label>'
        + '<label><span>旋转</span><input type="text" inputmode="decimal" pattern="-?[0-9]*[.]?[0-9]*" value="' + layer.rotation + '" data-quick-edit-frame-image-rotation="' + layerId + '" /></label>'
        + '</div>'
        + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  function quickEditFrameTextNumericInputMeta(target) {
    const dataset = target && target.dataset ? target.dataset : {};
    if (dataset.quickEditFrameTextSize) {
      return { id: dataset.quickEditFrameTextSize, key: 'size', min: 8, max: 72, step: 1, shiftStep: 5, signed: false };
    }
    if (dataset.quickEditFrameTextWeight) {
      return { id: dataset.quickEditFrameTextWeight, key: 'weight', min: 100, max: 900, step: 20, shiftStep: 100, signed: false };
    }
    if (dataset.quickEditFrameTextX) {
      return { id: dataset.quickEditFrameTextX, key: 'x', min: -100, max: 100, step: 0.2, shiftStep: 1, signed: true, precision: 1 };
    }
    if (dataset.quickEditFrameTextY) {
      return { id: dataset.quickEditFrameTextY, key: 'y', min: -100, max: 100, step: 0.2, shiftStep: 1, signed: true, precision: 1 };
    }
    return null;
  }

  function quickEditFrameImageNumericInputMeta(target) {
    const dataset = target && target.dataset ? target.dataset : {};
    if (dataset.quickEditFrameImageSize) {
      return { id: dataset.quickEditFrameImageSize, key: 'size', min: 2, max: 90, step: 0.5, shiftStep: 5, signed: false, precision: 1 };
    }
    if (dataset.quickEditFrameImageOpacity) {
      return { id: dataset.quickEditFrameImageOpacity, key: 'opacity', min: 0, max: 100, step: 1, shiftStep: 10, signed: false };
    }
    if (dataset.quickEditFrameImageRotation) {
      return { id: dataset.quickEditFrameImageRotation, key: 'rotation', min: -180, max: 180, step: 1, shiftStep: 10, signed: true, precision: 1 };
    }
    if (dataset.quickEditFrameImageX) {
      return { id: dataset.quickEditFrameImageX, key: 'x', min: -160, max: 160, step: 0.2, shiftStep: 1, signed: true, precision: 1 };
    }
    if (dataset.quickEditFrameImageY) {
      return { id: dataset.quickEditFrameImageY, key: 'y', min: -160, max: 160, step: 0.2, shiftStep: 1, signed: true, precision: 1 };
    }
    return null;
  }

  function quickEditSanitizeFrameTextNumber(value, meta) {
    const raw = String(value || '').trim().replace(',', '.');
    const negative = !!meta.signed && raw.startsWith('-');
    const precision = Math.max(0, Number(meta.precision || 0));
    if (!precision) {
      const digits = raw.replace(/[^\d]/g, '').slice(0, 3);
      return (negative ? '-' : '') + digits;
    }
    const body = raw.replace(/[^\d.]/g, '');
    const dotIndex = body.indexOf('.');
    const hasDot = dotIndex >= 0;
    const whole = (hasDot ? body.slice(0, dotIndex) : body).replace(/[^\d]/g, '').slice(0, 3);
    const fraction = hasDot ? body.slice(dotIndex + 1).replace(/[^\d]/g, '').slice(0, precision) : '';
    return (negative ? '-' : '') + whole + (hasDot ? '.' + fraction : '');
  }

  function quickEditFormatFrameTextNumber(value, meta) {
    const precision = Math.max(0, Number(meta.precision || 0));
    const rounded = precision ? Math.round(Number(value || 0) * Math.pow(10, precision)) / Math.pow(10, precision) : Math.round(Number(value || 0));
    return precision ? String(Number(rounded.toFixed(precision))) : String(rounded);
  }

  function quickEditFrameTextInputNumberValue(target, meta, emptyValue) {
    const clean = quickEditSanitizeFrameTextNumber(target.value, meta);
    if (target.value !== clean) target.value = clean;
    if (clean === '' || clean === '-' || clean === '.' || clean === '-.') return emptyValue;
    const precision = Math.max(0, Number(meta.precision || 0));
    const value = clamp(Number(clean || 0), meta.min, meta.max);
    return precision ? Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision) : Math.round(value);
  }

  function commitQuickEditFrameTextNumericInput(target, options) {
    const meta = quickEditFrameTextNumericInputMeta(target);
    if (!meta) return false;
    const opts = options || {};
    const emptyValue = opts.emptyValue !== undefined ? opts.emptyValue : (meta.signed ? 0 : meta.min);
    const value = quickEditFrameTextInputNumberValue(target, meta, emptyValue);
    if (value === undefined || value === null || !Number.isFinite(Number(value))) return true;
    if (opts.normalizeInput) {
      const displayValue = quickEditFormatFrameTextNumber(value, meta);
      if (String(target.value) !== displayValue) target.value = displayValue;
    }
    updateQuickEditFrameTextLayer(meta.id, { [meta.key]: value }, { skipRender: true });
    return true;
  }

  function stepQuickEditFrameTextNumericInput(target, direction, shiftKey) {
    const meta = quickEditFrameTextNumericInputMeta(target);
    if (!meta) return false;
    const current = quickEditFrameTextInputNumberValue(target, meta, 0);
    const step = shiftKey ? meta.shiftStep : meta.step;
    const value = clamp(Number(current || 0) + direction * step, meta.min, meta.max);
    target.value = quickEditFormatFrameTextNumber(value, meta);
    updateQuickEditFrameTextLayer(meta.id, { [meta.key]: value }, { skipRender: true });
    return true;
  }

  function commitQuickEditFrameImageNumericInput(target, options) {
    const meta = quickEditFrameImageNumericInputMeta(target);
    if (!meta) return false;
    const opts = options || {};
    const emptyValue = opts.emptyValue !== undefined ? opts.emptyValue : (meta.signed ? 0 : meta.min);
    const value = quickEditFrameTextInputNumberValue(target, meta, emptyValue);
    if (value === undefined || value === null || !Number.isFinite(Number(value))) return true;
    if (opts.normalizeInput) {
      const displayValue = quickEditFormatFrameTextNumber(value, meta);
      if (String(target.value) !== displayValue) target.value = displayValue;
    }
    updateQuickEditFrameImageLayer(meta.id, { [meta.key]: value }, { skipRender: true });
    return true;
  }

  function stepQuickEditFrameImageNumericInput(target, direction, shiftKey) {
    const meta = quickEditFrameImageNumericInputMeta(target);
    if (!meta) return false;
    const current = quickEditFrameTextInputNumberValue(target, meta, 0);
    const step = shiftKey ? meta.shiftStep : meta.step;
    const value = clamp(Number(current || 0) + direction * step, meta.min, meta.max);
    target.value = quickEditFormatFrameTextNumber(value, meta);
    updateQuickEditFrameImageLayer(meta.id, { [meta.key]: value }, { skipRender: true });
    return true;
  }

  function updateQuickEditFrameTextLayer(id, patch, options) {
    const opts = options || {};
    const layers = quickEditFrameTextLayers();
    const index = layers.findIndex((layer) => layer.id === id);
    if (index < 0) return;
    layers[index] = quickEditNormalizeFrameTextLayer(Object.assign({}, layers[index], patch || {}), index);
    state.quickEdit.frameTextLayers = layers;
    if (!opts.skipRender) renderQuickEditFrameTextLayers();
    syncQuickEditFramePreview();
    syncQuickEditFramePresetUi();
    syncQuickEditSaveConfirm();
  }

  function updateQuickEditFrameImageLayer(id, patch, options) {
    const opts = options || {};
    const layers = quickEditFrameImageLayers();
    const index = layers.findIndex((layer) => layer.id === id);
    if (index < 0) return;
    layers[index] = quickEditNormalizeFrameImageLayer(Object.assign({}, layers[index], patch || {}), index);
    state.quickEdit.frameImageLayers = layers;
    if (!opts.skipRender) renderQuickEditFrameImageLayers();
    syncQuickEditFramePreview();
    syncQuickEditFramePresetUi();
    syncQuickEditSaveConfirm();
  }

  function quickEditFramePresetPayload() {
    return {
      preset: quickEditFramePresetKey(state.quickEdit.framePreset),
      insets: quickEditNormalizeFrameInsets(state.quickEdit.frameInsets),
      textLayers: quickEditFrameTextLayers().map((layer) => ({
        id: layer.id,
        text: layer.text,
        position: layer.position,
        coordinateSpace: layer.coordinateSpace,
        x: layer.x,
        y: layer.y,
        fontFamily: layer.fontFamily,
        size: layer.size,
        weight: layer.weight,
        color: layer.color,
        enabled: layer.enabled !== false,
      })),
      imageLayers: quickEditFrameImageLayers().map((layer) => ({
        id: layer.id,
        assetId: layer.assetId,
        name: layer.name,
        mime: layer.mime,
        coordinateSpace: layer.coordinateSpace,
        anchor: layer.anchor,
        x: layer.x,
        y: layer.y,
        size: layer.size,
        rotation: layer.rotation,
        opacity: layer.opacity,
        enabled: layer.enabled !== false,
      })),
    };
  }

  function normalizeQuickEditFramePresetItem(item) {
    const raw = item && typeof item === 'object' ? item : {};
    const id = String(raw.id || '').trim();
    const name = String(raw.name || '').trim();
    const frame = raw.frame && typeof raw.frame === 'object' ? raw.frame : raw;
    const preset = quickEditFramePresetKey(frame.preset || frame.framePreset || frame.key);
    const textLayers = Array.isArray(frame.textLayers)
      ? frame.textLayers.map((layer, index) => quickEditNormalizeFrameTextLayer(layer, index))
      : [];
    const imageLayers = Array.isArray(frame.imageLayers)
      ? frame.imageLayers.map((layer, index) => quickEditNormalizeFrameImageLayer(layer, index)).filter((layer) => layer.assetId)
      : [];
    const hasText = textLayers.some((layer) => layer.enabled && String(layer.text || '').trim());
    const hasImage = imageLayers.some((layer) => layer.enabled && layer.assetId);
    if (!id || !name || (preset === 'none' && !hasText && !hasImage)) return null;
    return {
      id,
      name,
      frame: {
        preset,
        insets: quickEditNormalizeFrameInsets(frame.insets),
        textLayers,
        imageLayers,
      },
      favorite: raw.favorite === true,
      order: Number(raw.order || 0),
      createdAt: Math.max(0, Number(raw.created_at || 0)),
      updatedAt: Math.max(0, Number(raw.updated_at || 0)),
    };
  }

  function quickEditFramePresetById(presetId) {
    const id = String(presetId || '').trim();
    return (state.quickEdit.framePresets || []).find((preset) => preset.id === id) || null;
  }

  function quickEditFramePresetStatusText() {
    if (state.quickEdit.framePresetsLoading) return '正在读取相框预设';
    if (state.quickEdit.framePresetsMessage) return state.quickEdit.framePresetsMessage;
    const count = (state.quickEdit.framePresets || []).length;
    return count ? '已有 ' + count + ' 个相框预设' : '还没有相框预设';
  }

  function quickEditFramePresetDetail(preset) {
    return [
      quickEditFramePresetName(preset && preset.frame && preset.frame.preset),
      preset && preset.frame && preset.frame.textLayers && preset.frame.textLayers.length ? preset.frame.textLayers.length + ' 个文字层' : '',
      preset && preset.frame && preset.frame.imageLayers && preset.frame.imageLayers.length ? preset.frame.imageLayers.length + ' 张图片标识' : '',
      preset && preset.updatedAt ? new Date(preset.updatedAt * 1000).toLocaleString() : '',
    ].filter(Boolean).join(' · ') || '相框参数';
  }

  function syncQuickEditFramePresetUi() {
    const el = state.quickEdit.el;
    if (el) syncQuickEditFramePresetSide(el);
    syncQuickEditFramePresetModal();
  }

  function syncQuickEditFramePresetSide(el) {
    if (!el) return;
    const status = el.querySelector('[data-quick-edit-frame-preset-status]');
    const list = el.querySelector('[data-quick-edit-frame-preset-list]');
    const save = el.querySelector('[data-quick-edit-frame-preset-save]');
    const manage = el.querySelector('[data-quick-edit-frame-preset-manage]');
    const hasFramePreset = quickEditFramePresetKey(state.quickEdit.framePreset) !== 'none';
    const hasText = quickEditFrameTextLayers().some((layer) => layer.enabled && String(layer.text || '').trim());
    const hasImage = quickEditFrameImageLayers().some((layer) => layer.enabled && layer.assetId);
    const canSave = hasFramePreset || hasText || hasImage;
    if (status) status.textContent = quickEditFramePresetStatusText();
    if (save) save.disabled = !canSave || state.quickEdit.framePresetsLoading;
    if (manage) manage.disabled = state.quickEdit.framePresetsLoading && !(state.quickEdit.framePresets || []).length;
    if (!list) return;
    const presets = state.quickEdit.framePresets || [];
    if (state.quickEdit.framePresetsLoading && !presets.length) {
      list.innerHTML = '<div class="quick-edit-frame-preset-empty">正在读取相框预设</div>';
      return;
    }
    if (!presets.length) {
      list.innerHTML = '<div class="quick-edit-frame-preset-empty">保存当前相框后会显示在这里</div>';
      return;
    }
    list.innerHTML = presets.slice(0, 8).map((preset) => (
      '<button class="quick-edit-preset-pill quick-edit-frame-preset-pill" type="button" data-quick-edit-frame-preset-apply="' + escapeHtml(preset.id) + '" title="' + escapeHtml(quickEditFramePresetDetail(preset)) + '">' +
      (preset.favorite ? '<b aria-hidden="true">★</b>' : '') +
      '<span>' + escapeHtml(preset.name) + '</span>' +
      '</button>'
    )).join('');
  }

  function syncQuickEditFramePresetModal() {
    const modal = state.quickEdit.framePresetModal;
    if (!modal || !modal.isConnected) return;
    const list = modal.querySelector('[data-quick-edit-frame-preset-modal-list]');
    const count = modal.querySelector('[data-quick-edit-frame-preset-modal-count]');
    const message = modal.querySelector('[data-quick-edit-frame-preset-modal-message]');
    const presets = state.quickEdit.framePresets || [];
    if (count) count.textContent = presets.length ? presets.length + ' 个相框预设' : '没有相框预设';
    if (message) message.textContent = quickEditFramePresetStatusText();
    modal.classList.toggle('loading', !!state.quickEdit.framePresetsLoading);
    if (!list) return;
    if (state.quickEdit.framePresetsLoading && !presets.length) {
      list.innerHTML = '<div class="quick-edit-preset-modal-empty">正在读取相框预设</div>';
      return;
    }
    if (!presets.length) {
      list.innerHTML = '<div class="quick-edit-preset-modal-empty">还没有相框预设，先保存当前相框</div>';
      return;
    }
    list.innerHTML = presets.map((preset) => {
      const selected = state.quickEdit.framePresetSelectedId === preset.id;
      const overwriting = state.quickEdit.framePresetOverwritingId === preset.id;
      return '<div class="quick-edit-preset-modal-item quick-edit-frame-preset-modal-item' + (overwriting ? ' overwriting' : '') + (selected ? ' selected' : '') + '" data-quick-edit-frame-preset-modal-id="' + escapeHtml(preset.id) + '">'
        + '<button class="icon-btn quick-edit-preset-apply-btn" type="button" data-quick-edit-frame-preset-modal-apply="' + escapeHtml(preset.id) + '" title="应用相框预设" aria-label="应用相框预设">' + quickEditIconSvg('check') + '</button>'
        + '<span><b>' + escapeHtml(preset.name) + '</b><em>' + escapeHtml(quickEditFramePresetDetail(preset)) + '</em></span>'
        + '<button class="icon-btn quick-edit-preset-overwrite-btn" type="button" data-quick-edit-frame-preset-modal-overwrite="' + escapeHtml(preset.id) + '" title="用当前相框覆盖此预设" aria-label="用当前相框覆盖此预设">' + quickEditIconSvg(overwriting ? 'refresh' : 'save') + '</button>'
        + '<button class="icon-btn quick-edit-preset-favorite-btn' + (preset.favorite ? ' active' : '') + '" type="button" data-quick-edit-frame-preset-modal-favorite="' + escapeHtml(preset.id) + '" title="收藏置顶" aria-label="收藏置顶">★</button>'
        + '<button class="icon-btn quick-edit-preset-move-btn" type="button" data-quick-edit-frame-preset-modal-move="up" data-quick-edit-frame-preset-modal-move-id="' + escapeHtml(preset.id) + '" title="上移" aria-label="上移">↑</button>'
        + '<button class="icon-btn quick-edit-preset-move-btn" type="button" data-quick-edit-frame-preset-modal-move="down" data-quick-edit-frame-preset-modal-move-id="' + escapeHtml(preset.id) + '" title="下移" aria-label="下移">↓</button>'
        + '<button class="icon-btn quick-edit-preset-rename-btn" type="button" data-quick-edit-frame-preset-modal-rename="' + escapeHtml(preset.id) + '" title="重命名" aria-label="重命名">名</button>'
        + '<button class="icon-btn quick-edit-preset-delete-btn" type="button" data-quick-edit-frame-preset-modal-delete="' + escapeHtml(preset.id) + '" title="删除相框预设" aria-label="删除相框预设">' + quickEditIconSvg('trash') + '</button>'
        + '</div>';
    }).join('');
  }

  function setQuickEditFramePresetsFromResponse(res) {
    state.quickEdit.framePresets = (Array.isArray(res && res.items) ? res.items : [])
      .map(normalizeQuickEditFramePresetItem)
      .filter(Boolean);
    state.quickEdit.framePresetsLoaded = true;
    state.quickEdit.framePresetsMessage = '';
    if (state.quickEdit.framePresetSelectedId && !quickEditFramePresetById(state.quickEdit.framePresetSelectedId)) {
      state.quickEdit.framePresetSelectedId = '';
    }
    if (state.quickEdit.framePresetHoverId && !quickEditFramePresetById(state.quickEdit.framePresetHoverId)) {
      state.quickEdit.framePresetHoverId = '';
    }
    syncQuickEditFramePresetUi();
  }

  async function refreshQuickEditFramePresets(options) {
    const opts = options || {};
    if (state.quickEdit.framePresetsLoading) return;
    state.quickEdit.framePresetsLoading = true;
    state.quickEdit.framePresetsMessage = '正在读取相框预设';
    syncQuickEditFramePresetUi();
    try {
      const res = await call('list_quick_edit_frame_presets');
      if (!res || !res.success) {
        const message = res && res.message ? res.message : '相框预设读取失败';
        state.quickEdit.framePresetsMessage = message;
        if (!opts.silent) showToast(message, 'error');
        return;
      }
      setQuickEditFramePresetsFromResponse(res);
    } catch (err) {
      const message = String((err && err.message) || err || '相框预设读取失败');
      state.quickEdit.framePresetsMessage = message;
      if (!opts.silent) showToast(message, 'error');
    } finally {
      state.quickEdit.framePresetsLoading = false;
      syncQuickEditFramePresetUi();
    }
  }

  async function saveCurrentQuickEditFramePreset() {
    if (!state.quickEdit.open) return;
    const hasText = quickEditFrameTextLayers().some((layer) => layer.enabled && String(layer.text || '').trim());
    const hasImage = quickEditFrameImageLayers().some((layer) => layer.enabled && layer.assetId);
    if (quickEditFramePresetKey(state.quickEdit.framePreset) === 'none' && !hasText && !hasImage) {
      showToast('请选择相框或添加文字后再保存预设', 'error');
      return;
    }
    const name = await openTextInput({
      title: '保存相框预设',
      message: '保存当前相框宽度和文字层。',
      placeholder: '例如：白边参数条',
      value: '',
    });
    const cleanName = String(name || '').trim();
    if (!cleanName) return;
    try {
      const res = await call('save_quick_edit_frame_preset', cleanName, quickEditFramePresetPayload());
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '相框预设保存失败', 'error');
        return;
      }
      setQuickEditFramePresetsFromResponse(res);
      showToast(res.message || '已保存相框预设');
    } catch (err) {
      console.warn('[PicScanner] 相框预设保存失败', err);
      showToast(String((err && err.message) || '相框预设保存失败'), 'error');
    }
  }

  function applyQuickEditFramePreset(presetId) {
    const preset = quickEditFramePresetById(presetId);
    if (!preset) return;
    state.quickEdit.framePreset = quickEditFramePresetKey(preset.frame.preset);
    state.quickEdit.frameInsets = quickEditNormalizeFrameInsets(preset.frame.insets);
    state.quickEdit.frameTextLayers = (preset.frame.textLayers || []).map((layer, index) => quickEditNormalizeFrameTextLayer(layer, index));
    state.quickEdit.frameImageLayers = (preset.frame.imageLayers || []).map((layer, index) => quickEditNormalizeFrameImageLayer(layer, index));
    quickEditFrameImageLayers().forEach((layer) => {
      quickEditLoadFrameAssetUrl(layer.assetId, { silent: true })
        .then(() => {
          renderQuickEditFrameImageLayers();
          syncQuickEditFramePreview();
        })
        .catch((err) => console.warn('[PicScanner] frame asset preload failed', err));
    });
    refreshQuickEditImageDisplayBasis();
    syncQuickEditFrameUi();
    syncQuickEditSaveConfirm();
    showToast('已应用相框预设：' + preset.name);
  }

  async function renameQuickEditFramePreset(presetId) {
    const preset = quickEditFramePresetById(presetId);
    if (!preset) return;
    const name = await openTextInput({
      title: '重命名相框预设',
      message: '输入新的相框预设名称。',
      placeholder: '相框预设名称',
      value: preset.name,
    });
    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName === preset.name) return;
    try {
      const res = await call('rename_quick_edit_frame_preset', preset.id, cleanName);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '相框预设重命名失败', 'error');
        return;
      }
      state.quickEdit.framePresetSelectedId = preset.id;
      setQuickEditFramePresetsFromResponse(res);
      showToast(res.message || '已重命名相框预设');
    } catch (err) {
      console.warn('[PicScanner] 相框预设重命名失败', err);
      showToast(String((err && err.message) || '相框预设重命名失败'), 'error');
    }
  }

  async function toggleQuickEditFramePresetFavorite(presetId) {
    const preset = quickEditFramePresetById(presetId);
    if (!preset) return;
    try {
      const res = await call('set_quick_edit_frame_preset_favorite', preset.id, !preset.favorite);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '相框预设收藏失败', 'error');
        return;
      }
      state.quickEdit.framePresetSelectedId = preset.id;
      setQuickEditFramePresetsFromResponse(res);
      showToast(preset.favorite ? '已取消相框预设置顶' : '已收藏相框预设置顶');
    } catch (err) {
      console.warn('[PicScanner] 相框预设收藏失败', err);
      showToast(String((err && err.message) || '相框预设收藏失败'), 'error');
    }
  }

  async function moveQuickEditFramePreset(presetId, direction) {
    const preset = quickEditFramePresetById(presetId);
    if (!preset) return;
    try {
      const res = await call('move_quick_edit_frame_preset', preset.id, direction);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '相框预设排序失败', 'error');
        return;
      }
      state.quickEdit.framePresetSelectedId = preset.id;
      setQuickEditFramePresetsFromResponse(res);
      showToast(res.message || '已调整相框预设顺序');
    } catch (err) {
      console.warn('[PicScanner] 相框预设排序失败', err);
      showToast(String((err && err.message) || '相框预设排序失败'), 'error');
    }
  }

  function deleteQuickEditFramePreset(presetId) {
    const preset = quickEditFramePresetById(presetId);
    if (!preset) return;
    const modal = ensureQuickEditFramePresetDeleteConfirm();
    const message = modal.querySelector('[data-quick-edit-frame-preset-delete-message]');
    if (message) {
      message.textContent = '确定删除“' + preset.name + '”？这个相框预设会从本机预设库移除。';
    }
    modal.dataset.quickEditFramePresetDeleteId = preset.id;
    modal.classList.remove('hidden');
    const confirm = modal.querySelector('[data-quick-edit-frame-preset-delete-confirm]');
    if (confirm) requestAnimationFrame(() => confirm.focus({ preventScroll: true }));
  }

  async function deleteQuickEditFramePresetNow(presetId) {
    const preset = quickEditFramePresetById(presetId);
    if (!preset) return;
    try {
      const res = await call('delete_quick_edit_frame_preset', preset.id);
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '相框预设删除失败', 'error');
        return;
      }
      setQuickEditFramePresetsFromResponse(res);
      showToast(res.message || '已删除相框预设');
    } catch (err) {
      console.warn('[PicScanner] 相框预设删除失败', err);
      showToast(String((err && err.message) || '相框预设删除失败'), 'error');
    }
  }

  function ensureQuickEditFramePresetOverwriteConfirm() {
    if (state.quickEdit.framePresetOverwriteConfirm && state.quickEdit.framePresetOverwriteConfirm.isConnected) {
      return state.quickEdit.framePresetOverwriteConfirm;
    }
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-preset-apply-confirm hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '覆盖相框预设确认');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-exit-card">',
      '<h2>覆盖相框预设？</h2>',
      '<p data-quick-edit-frame-preset-overwrite-message>当前相框会写入这个预设。</p>',
      '<div class="modal-actions">',
      '<button class="ghost-btn" type="button" data-quick-edit-frame-preset-overwrite-cancel>取消</button>',
      '<button class="primary-btn" type="button" data-quick-edit-frame-preset-overwrite-confirm>覆盖保存</button>',
      '</div>',
      '</div>',
    ].join('');
    modal.querySelector('[data-quick-edit-frame-preset-overwrite-cancel]').addEventListener('click', () => hideQuickEditFramePresetOverwriteConfirm());
    modal.querySelector('[data-quick-edit-frame-preset-overwrite-confirm]').addEventListener('click', () => {
      const presetId = String(modal.dataset.quickEditFramePresetOverwriteId || '');
      hideQuickEditFramePresetOverwriteConfirm();
      overwriteQuickEditFramePresetNow(presetId);
    });
    document.body.appendChild(modal);
    state.quickEdit.framePresetOverwriteConfirm = modal;
    return modal;
  }

  function hideQuickEditFramePresetOverwriteConfirm() {
    const modal = state.quickEdit.framePresetOverwriteConfirm;
    if (!modal) return;
    modal.classList.add('hidden');
    modal.dataset.quickEditFramePresetOverwriteId = '';
  }

  function quickEditCanSaveFramePreset() {
    const hasText = quickEditFrameTextLayers().some((layer) => layer.enabled && String(layer.text || '').trim());
    const hasImage = quickEditFrameImageLayers().some((layer) => layer.enabled && layer.assetId);
    return quickEditFramePresetKey(state.quickEdit.framePreset) !== 'none' || hasText || hasImage;
  }

  function overwriteQuickEditFramePreset(presetId) {
    const preset = quickEditFramePresetById(presetId);
    if (!preset || state.quickEdit.framePresetOverwritingId) return;
    if (!quickEditCanSaveFramePreset()) {
      showToast('请选择相框或添加文字后再覆盖预设', 'error');
      return;
    }
    const modal = ensureQuickEditFramePresetOverwriteConfirm();
    const message = modal.querySelector('[data-quick-edit-frame-preset-overwrite-message]');
    if (message) {
      message.textContent = '将用当前相框宽度和文字层覆盖“' + preset.name + '”；名称、收藏和排序会保留。';
    }
    modal.dataset.quickEditFramePresetOverwriteId = preset.id;
    modal.classList.remove('hidden');
    const confirm = modal.querySelector('[data-quick-edit-frame-preset-overwrite-confirm]');
    if (confirm) requestAnimationFrame(() => confirm.focus({ preventScroll: true }));
  }

  async function overwriteQuickEditFramePresetNow(presetId) {
    const preset = quickEditFramePresetById(presetId);
    if (!preset || state.quickEdit.framePresetOverwritingId) return;
    if (!quickEditCanSaveFramePreset()) {
      showToast('请选择相框或添加文字后再覆盖预设', 'error');
      return;
    }
    state.quickEdit.framePresetOverwritingId = preset.id;
    state.quickEdit.framePresetSelectedId = preset.id;
    syncQuickEditFramePresetUi();
    try {
      const res = await call('update_quick_edit_frame_preset', preset.id, quickEditFramePresetPayload());
      if (!res || !res.success) {
        showToast(res && res.message ? res.message : '相框预设覆盖失败', 'error');
        return;
      }
      state.quickEdit.framePresetSelectedId = preset.id;
      setQuickEditFramePresetsFromResponse(res);
      showToast(res.message || '已覆盖相框预设');
    } catch (err) {
      console.warn('[PicScanner] 相框预设覆盖失败', err);
      showToast(String((err && err.message) || '相框预设覆盖失败'), 'error');
    } finally {
      state.quickEdit.framePresetOverwritingId = '';
      syncQuickEditFramePresetUi();
    }
  }

  function ensureQuickEditFramePresetDeleteConfirm() {
    if (state.quickEdit.framePresetDeleteConfirm && state.quickEdit.framePresetDeleteConfirm.isConnected) {
      return state.quickEdit.framePresetDeleteConfirm;
    }
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-preset-apply-confirm hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '删除相框预设确认');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-exit-card">',
      '<h2>删除相框预设？</h2>',
      '<p data-quick-edit-frame-preset-delete-message>确定删除这个相框预设？</p>',
      '<div class="modal-actions">',
      '<button class="ghost-btn" type="button" data-quick-edit-frame-preset-delete-cancel>取消</button>',
      '<button class="danger-btn" type="button" data-quick-edit-frame-preset-delete-confirm>删除</button>',
      '</div>',
      '</div>',
    ].join('');
    modal.querySelector('[data-quick-edit-frame-preset-delete-cancel]').addEventListener('click', () => hideQuickEditFramePresetDeleteConfirm());
    modal.querySelector('[data-quick-edit-frame-preset-delete-confirm]').addEventListener('click', () => {
      const presetId = String(modal.dataset.quickEditFramePresetDeleteId || '');
      hideQuickEditFramePresetDeleteConfirm();
      deleteQuickEditFramePresetNow(presetId);
    });
    document.body.appendChild(modal);
    state.quickEdit.framePresetDeleteConfirm = modal;
    return modal;
  }

  function hideQuickEditFramePresetDeleteConfirm() {
    const modal = state.quickEdit.framePresetDeleteConfirm;
    if (!modal) return;
    modal.classList.add('hidden');
    modal.dataset.quickEditFramePresetDeleteId = '';
  }

  function hideQuickEditFramePresetModal() {
    const modal = state.quickEdit.framePresetModal;
    if (!modal) return;
    hideQuickEditFramePresetOverwriteConfirm();
    modal.classList.add('hidden');
  }

  function ensureQuickEditFramePresetModal() {
    if (state.quickEdit.framePresetModal && state.quickEdit.framePresetModal.isConnected) return state.quickEdit.framePresetModal;
    const modal = document.createElement('div');
    modal.className = 'modal quick-edit-preset-modal quick-edit-frame-preset-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '相框预设管理');
    modal.innerHTML = [
      '<div class="modal-card quick-edit-preset-card">',
      '<div class="quick-edit-save-head">',
      '<h2>相框预设管理</h2>',
      '<div class="quick-edit-lut-head-actions">',
      '<button class="icon-btn" type="button" data-quick-edit-frame-preset-modal-save title="保存当前相框预设" aria-label="保存当前相框预设">' + quickEditIconSvg('plus') + '</button>',
      '<button class="icon-btn quick-edit-save-close" type="button" data-quick-edit-frame-preset-modal-cancel title="关闭" aria-label="关闭">' + quickEditIconSvg('close') + '</button>',
      '</div>',
      '</div>',
      '<div class="quick-edit-preset-modal-head"><span data-quick-edit-frame-preset-modal-message></span><em data-quick-edit-frame-preset-modal-count>没有相框预设</em></div>',
      '<div class="quick-edit-preset-modal-list" data-quick-edit-frame-preset-modal-list></div>',
      '</div>',
    ].join('');
    modal.querySelector('[data-quick-edit-frame-preset-modal-cancel]').addEventListener('click', () => hideQuickEditFramePresetModal());
    modal.querySelector('[data-quick-edit-frame-preset-modal-save]').addEventListener('click', () => {
      saveCurrentQuickEditFramePreset();
    });
    modal.querySelector('[data-quick-edit-frame-preset-modal-list]').addEventListener('click', (ev) => {
      const apply = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-modal-apply]') : null;
      if (apply) {
        applyQuickEditFramePreset(String(apply.dataset.quickEditFramePresetModalApply || ''));
        return;
      }
      const overwrite = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-modal-overwrite]') : null;
      if (overwrite) {
        overwriteQuickEditFramePreset(String(overwrite.dataset.quickEditFramePresetModalOverwrite || ''));
        return;
      }
      const favorite = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-modal-favorite]') : null;
      if (favorite) {
        toggleQuickEditFramePresetFavorite(String(favorite.dataset.quickEditFramePresetModalFavorite || ''));
        return;
      }
      const move = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-modal-move]') : null;
      if (move) {
        moveQuickEditFramePreset(
          String(move.dataset.quickEditFramePresetModalMoveId || ''),
          String(move.dataset.quickEditFramePresetModalMove || ''),
        );
        return;
      }
      const rename = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-modal-rename]') : null;
      if (rename) {
        renameQuickEditFramePreset(String(rename.dataset.quickEditFramePresetModalRename || ''));
        return;
      }
      const del = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-modal-delete]') : null;
      if (del) {
        deleteQuickEditFramePreset(String(del.dataset.quickEditFramePresetModalDelete || ''));
        return;
      }
      const row = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-modal-id]') : null;
      if (row) {
        state.quickEdit.framePresetSelectedId = String(row.dataset.quickEditFramePresetModalId || '');
        syncQuickEditFramePresetUi();
      }
    });
    modal.addEventListener('keydown', (ev) => {
      if (ev.key !== 'f' && ev.key !== 'F') return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const preset = quickEditFramePresetById(state.quickEdit.framePresetSelectedId);
      if (!preset) return;
      ev.preventDefault();
      ev.stopPropagation();
      toggleQuickEditFramePresetFavorite(preset.id);
    });
    document.body.appendChild(modal);
    state.quickEdit.framePresetModal = modal;
    return modal;
  }

  function showQuickEditFramePresetModal() {
    const modal = ensureQuickEditFramePresetModal();
    modal.classList.remove('hidden');
    syncQuickEditFramePresetUi();
    if (!state.quickEdit.framePresetsLoaded && !state.quickEdit.framePresetsLoading) {
      refreshQuickEditFramePresets({ silent: true });
    }
    const first = modal.querySelector('[data-quick-edit-frame-preset-modal-save]');
    if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
  }

  function applyQuickEditSplitTonePreset(key) {
    const preset = QUICK_EDIT_SPLIT_TONE_PRESETS.find((item) => item.key === key);
    if (!preset) return;
    const before = snapshotQuickEditState();
    const next = normalizeQuickEditParams(state.quickEdit.params);
    next.splitToneShadowsHue = preset.shadowsHue;
    next.splitToneShadowsStrength = preset.shadowsStrength;
    next.splitToneMidtonesHue = preset.midtonesHue;
    next.splitToneMidtonesStrength = preset.midtonesStrength;
    next.splitToneHighlightsHue = preset.highlightsHue;
    next.splitToneHighlightsStrength = preset.highlightsStrength;
    next.splitToneBalance = preset.balance;
    state.quickEdit.params = normalizeQuickEditParams(next);
    if (before) {
      state.quickEdit.history.push(before);
      if (state.quickEdit.history.length > 24) state.quickEdit.history.shift();
    }
    syncQuickEditControls();
    applyQuickEditPreview({ interactive: true });
    scheduleQuickEditHistogramRender(80);
    showToast('已应用色调分离：' + preset.label);
  }

  async function pickQuickEditHslColor(ev) {
    if (!state.quickEdit.hslPickerActive) return false;
    ev.preventDefault();
    ev.stopPropagation();
    try {
      const hsl = await sampleQuickEditHslFromEvent(ev);
      if (!hsl) {
        showToast('没有取到图片颜色', 'error');
        return true;
      }
      const color = quickEditHslColorFromHue(hsl.h);
      state.quickEdit.hslColor = color.key;
      setQuickEditHslPickerActive(false);
      syncQuickEditControls();
      showToast('已选中 HSL：' + color.name);
    } catch (err) {
      console.warn('[PicScanner] HSL 吸管取色失败', err);
      showToast('取色失败，详情见控制台', 'error');
    }
    return true;
  }

  function ensureQuickEdit() {
    if (state.quickEdit.el && state.quickEdit.el.isConnected) return state.quickEdit.el;
    const el = document.createElement('section');
    el.className = 'quick-edit-screen hidden';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '快速调整');
    const sliderSectionsHtml = window.PicScannerVue
      ? '<div data-quick-edit-vue-slots></div>'
      : [
        '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="tone">',
        '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="tone" aria-expanded="true">',
        '<span><b>影调</b><em>曝光与明暗层次</em></span>',
        '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
        '</button>',
        '<div class="quick-edit-section-body" data-quick-edit-section-body="tone">',
        '<label class="quick-edit-control"><span>曝光</span><b data-quick-edit-value="exposure">0.00 EV</b><input type="range" min="' + QUICK_EDIT_EXPOSURE_MIN_EV + '" max="' + QUICK_EDIT_EXPOSURE_MAX_EV + '" step="0.05" value="0" data-quick-edit-range="exposure" /></label>',
        '<label class="quick-edit-control"><span>高光</span><b data-quick-edit-value="highlights">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="highlights" /></label>',
        '<label class="quick-edit-control"><span>阴影</span><b data-quick-edit-value="shadows">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="shadows" /></label>',
        '<label class="quick-edit-control"><span>白色色阶</span><b data-quick-edit-value="whites">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="whites" /></label>',
        '<label class="quick-edit-control"><span>黑色色阶</span><b data-quick-edit-value="blacks">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="blacks" /></label>',
        '<label class="quick-edit-control"><span>去雾</span><b data-quick-edit-value="dehaze">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="dehaze" /></label>',
        '</div>',
        '</div>',
        '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="color">',
        '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="color" aria-expanded="true">',
        '<span><b>饱和度&色温</b><em>色彩强度与白平衡</em></span>',
        '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
        '</button>',
        '<div class="quick-edit-section-body" data-quick-edit-section-body="color">',
        '<label class="quick-edit-control"><span>对比度</span><b data-quick-edit-value="contrast">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="contrast" /></label>',
        '<label class="quick-edit-control"><span>饱和度</span><b data-quick-edit-value="saturation">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="saturation" /></label>',
        '<label class="quick-edit-control"><span>自然饱和度</span><b data-quick-edit-value="vibrance">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="vibrance" /></label>',
        '<label class="quick-edit-control quick-edit-control-kelvin"><span>色温</span><input class="quick-edit-kelvin-input" type="number" min="' + QUICK_EDIT_TEMPERATURE_MIN_K + '" max="' + QUICK_EDIT_TEMPERATURE_MAX_K + '" step="' + QUICK_EDIT_TEMPERATURE_STEP_K + '" value="' + QUICK_EDIT_TEMPERATURE_NEUTRAL_K + '" data-quick-edit-number="temperature" aria-label="色温 K 值" /><b data-quick-edit-value="temperature">' + QUICK_EDIT_TEMPERATURE_NEUTRAL_K + ' K</b><input type="range" min="' + QUICK_EDIT_TEMPERATURE_MIN_K + '" max="' + QUICK_EDIT_TEMPERATURE_MAX_K + '" step="' + QUICK_EDIT_TEMPERATURE_STEP_K + '" value="' + QUICK_EDIT_TEMPERATURE_NEUTRAL_K + '" data-quick-edit-range="temperature" /></label>',
        '<label class="quick-edit-control"><span>色调</span><b data-quick-edit-value="tint">0</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="tint" /></label>',
        '</div>',
        '</div>',
        '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="detail">',
        '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="detail" aria-expanded="true">',
        '<span><b>细节</b><em>清晰度、锐化与颗粒</em></span>',
        '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
        '</button>',
        '<div class="quick-edit-section-body" data-quick-edit-section-body="detail">',
        '<label class="quick-edit-control"><span>清晰度</span><b data-quick-edit-value="clarity">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="clarity" /></label>',
        '<label class="quick-edit-control"><span>锐化</span><b data-quick-edit-value="sharpening">0%</b><input type="range" min="0" max="100" step="1" value="0" data-quick-edit-range="sharpening" /></label>',
        '<label class="quick-edit-control"><span>颗粒</span><b data-quick-edit-value="grain">0%</b><input type="range" min="0" max="100" step="1" value="0" data-quick-edit-range="grain" /></label>',
        '</div>',
        '</div>',
        '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="effects">',
        '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="effects" aria-expanded="true">',
        '<span><b>效果</b><em>暗角与边缘氛围</em></span>',
        '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
        '</button>',
        '<div class="quick-edit-section-body" data-quick-edit-section-body="effects">',
        '<label class="quick-edit-control"><span>暗角</span><b data-quick-edit-value="vignette">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="vignette" /></label>',
        '<label class="quick-edit-control"><span>羽化</span><b data-quick-edit-value="vignetteFeather">58%</b><input type="range" min="0" max="100" step="1" value="58" data-quick-edit-range="vignetteFeather" /></label>',
        '</div>',
        '</div>',
        '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="blackWhite">',
        '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="blackWhite" aria-expanded="true">',
        '<span><b>黑白混色</b><em>控制各色在黑白中的明暗</em></span>',
        '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
        '</button>',
        '<div class="quick-edit-section-body" data-quick-edit-section-body="blackWhite">',
        '<label class="quick-edit-control"><span>黑白强度</span><b data-quick-edit-value="blackWhite">0%</b><input type="range" min="0" max="100" step="1" value="0" data-quick-edit-range="blackWhite" /></label>',
        '<div class="quick-edit-bw-grid">',
        '<label class="quick-edit-control"><span>红</span><b data-quick-edit-value="bwRed">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="bwRed" /></label>',
        '<label class="quick-edit-control"><span>黄</span><b data-quick-edit-value="bwYellow">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="bwYellow" /></label>',
        '<label class="quick-edit-control"><span>绿</span><b data-quick-edit-value="bwGreen">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="bwGreen" /></label>',
        '<label class="quick-edit-control"><span>青</span><b data-quick-edit-value="bwAqua">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="bwAqua" /></label>',
        '<label class="quick-edit-control"><span>蓝</span><b data-quick-edit-value="bwBlue">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="bwBlue" /></label>',
        '<label class="quick-edit-control"><span>品红</span><b data-quick-edit-value="bwMagenta">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="bwMagenta" /></label>',
        '</div>',
        '</div>',
        '</div>',
        '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="splitTone">',
        '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="splitTone" aria-expanded="true">',
        '<span><b>色调分离</b><em>阴影、中间调与高光染色</em></span>',
        '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
        '</button>',
        '<div class="quick-edit-section-body" data-quick-edit-section-body="splitTone">',
        '<div class="quick-edit-split-tone-presets">',
        QUICK_EDIT_SPLIT_TONE_PRESETS.map((preset) => '<button type="button" data-quick-edit-split-tone-preset="' + preset.key + '">' + preset.label + '</button>').join(''),
        '</div>',
        '<label class="quick-edit-control quick-edit-split-tone-control"><span>阴影色相</span><b data-quick-edit-value="splitToneShadowsHue">220 度</b><input type="range" min="0" max="360" step="1" value="220" data-quick-edit-range="splitToneShadowsHue" /></label>',
        '<label class="quick-edit-control"><span>阴影强度</span><b data-quick-edit-value="splitToneShadowsStrength">0%</b><input type="range" min="0" max="100" step="1" value="0" data-quick-edit-range="splitToneShadowsStrength" /></label>',
        '<label class="quick-edit-control quick-edit-split-tone-control"><span>中间调色相</span><b data-quick-edit-value="splitToneMidtonesHue">35 度</b><input type="range" min="0" max="360" step="1" value="35" data-quick-edit-range="splitToneMidtonesHue" /></label>',
        '<label class="quick-edit-control"><span>中间调强度</span><b data-quick-edit-value="splitToneMidtonesStrength">0%</b><input type="range" min="0" max="100" step="1" value="0" data-quick-edit-range="splitToneMidtonesStrength" /></label>',
        '<label class="quick-edit-control quick-edit-split-tone-control"><span>高光色相</span><b data-quick-edit-value="splitToneHighlightsHue">45 度</b><input type="range" min="0" max="360" step="1" value="45" data-quick-edit-range="splitToneHighlightsHue" /></label>',
        '<label class="quick-edit-control"><span>高光强度</span><b data-quick-edit-value="splitToneHighlightsStrength">0%</b><input type="range" min="0" max="100" step="1" value="0" data-quick-edit-range="splitToneHighlightsStrength" /></label>',
        '<label class="quick-edit-control"><span>Balance</span><b data-quick-edit-value="splitToneBalance">0</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-range="splitToneBalance" /></label>',
        '</div>',
        '</div>',
      ].join('');
    el.innerHTML = [
      '<section class="quick-edit-main">',
      '<div class="quick-edit-toolbar">',
      '<button class="ghost-btn back-btn" type="button" data-quick-edit-close><span aria-hidden="true">←</span><span>返回</span></button>',
      '<div class="toolbar-spacer"></div>',
      '<button class="icon-btn quick-edit-reset-all" type="button" data-quick-edit-reset title="重置" aria-label="重置"><span aria-hidden="true">↺</span></button>',
      '</div>',
      '<div class="quick-edit-content">',
      '<div class="quick-edit-preview">',
      '<div class="quick-edit-stage" data-quick-edit-stage>',
      '<div class="quick-edit-visual-layer" data-quick-edit-visual-layer>',
      '<img class="quick-edit-img" alt="" data-quick-edit-img />',
      '<img class="quick-edit-compare-img hidden" alt="" data-quick-edit-compare-img />',
      '<div class="quick-edit-output-mask hidden" aria-hidden="true" data-quick-edit-output-mask>',
      '<span data-quick-edit-output-mask-side="top"></span>',
      '<span data-quick-edit-output-mask-side="right"></span>',
      '<span data-quick-edit-output-mask-side="bottom"></span>',
      '<span data-quick-edit-output-mask-side="left"></span>',
      '</div>',
      '<div class="quick-edit-frame-preview hidden" aria-hidden="true" data-quick-edit-frame-preview>',
      '<span data-quick-edit-frame-side="top"></span>',
      '<span data-quick-edit-frame-side="right"></span>',
      '<span data-quick-edit-frame-side="bottom"></span>',
      '<span data-quick-edit-frame-side="left"></span>',
      '</div>',
      '</div>',
      '<div class="quick-edit-crop-overlay hidden" data-quick-edit-crop-overlay>',
      '<div class="quick-edit-crop-box" data-quick-edit-crop-box>',
      '<div class="quick-edit-crop-grid"></div>',
      '<span data-quick-edit-crop-handle="nw"></span>',
      '<span data-quick-edit-crop-handle="n"></span>',
      '<span data-quick-edit-crop-handle="ne"></span>',
      '<span data-quick-edit-crop-handle="e"></span>',
      '<span data-quick-edit-crop-handle="se"></span>',
      '<span data-quick-edit-crop-handle="s"></span>',
      '<span data-quick-edit-crop-handle="sw"></span>',
      '<span data-quick-edit-crop-handle="w"></span>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="quick-edit-rotation-ruler hidden" data-quick-edit-rotation-ruler role="slider" aria-label="旋转角度" aria-valuemin="-180" aria-valuemax="180" aria-valuenow="0" tabindex="0">',
      '<div class="quick-edit-rotation-value"><span>旋转</span><b data-quick-edit-value="rotation">0 度</b></div>',
      '<div class="quick-edit-rotation-viewport">',
      '<div class="quick-edit-rotation-ticks" aria-hidden="true"></div>',
      '<div class="quick-edit-rotation-center" aria-hidden="true"></div>',
      '</div>',
      '</div>',
      '<div class="quick-edit-meta">',
      '<div class="quick-edit-filename" data-quick-edit-filename></div>',
      '<div class="quick-edit-subline"><span data-quick-edit-format></span><span data-quick-edit-status></span></div>',
      '</div>',
      '<div class="quick-edit-batch-strip hidden" data-quick-edit-batch-strip><div class="quick-edit-batch-thumbnails" data-quick-edit-batch-thumbnails></div></div>',
      '</div>',
      '<aside class="quick-edit-side">',
      '<div class="quick-edit-side-head">',
      '<div class="section-title">快速调整</div>',
      '<div class="quick-edit-panel-tabs" role="tablist" aria-label="快速调整面板">',
      '<button class="quick-edit-panel-tab active" type="button" data-quick-edit-panel-tab="adjust" aria-pressed="true">调参</button>',
      '<button class="quick-edit-panel-tab" type="button" data-quick-edit-panel-tab="frame" aria-pressed="false">相框</button>',
      '<button class="quick-edit-panel-tab quick-edit-batch-only hidden" type="button" data-quick-edit-panel-tab="sync" aria-pressed="false">同步</button>',
      '<button class="quick-edit-panel-tab quick-edit-batch-only hidden" type="button" data-quick-edit-panel-tab="output" aria-pressed="false">输出设置</button>',
      '<span class="qe-module-spacer"></span>',
      '<div class="qe-module-dropdown hidden" data-qe-module-dropdown>',
      '<button class="qe-module-trigger" type="button" data-qe-module-trigger aria-haspopup="true" aria-expanded="false" title="扩展模块">',
      '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45"/></svg>',
      '</button>',
      '<div class="qe-module-menu hidden" data-qe-module-menu role="menu"></div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="quick-edit-panel-page" data-quick-edit-panel-page="adjust">',
      '<div class="quick-edit-group">',
      '<div class="quick-edit-group-head">',
      '<div class="quick-edit-group-title">直方图</div>',
      '<div class="quick-edit-histogram-tabs" role="tablist" aria-label="直方图模式">',
      '<button class="quick-edit-histogram-tab active" type="button" data-quick-edit-histogram-mode="white" aria-pressed="true">W</button>',
      '<div class="quick-edit-histogram-rgb-wrap">',
      '<button class="quick-edit-histogram-tab" type="button" data-quick-edit-histogram-mode="rgb" aria-pressed="false"><span data-quick-edit-rgb-label>RGB</span></button>',
      '<button class="quick-edit-histogram-menu-trigger" type="button" data-quick-edit-rgb-menu-trigger title="选择 RGB 通道" aria-label="选择 RGB 通道">' + quickEditIconSvg('chevron') + '</button>',
      '<div class="quick-edit-rgb-menu hidden" data-quick-edit-rgb-menu>',
      '<button type="button" role="menuitemcheckbox" data-quick-edit-rgb-channel="red" aria-checked="true"><span></span><b>R</b></button>',
      '<button type="button" role="menuitemcheckbox" data-quick-edit-rgb-channel="green" aria-checked="true"><span></span><b>G</b></button>',
      '<button type="button" role="menuitemcheckbox" data-quick-edit-rgb-channel="blue" aria-checked="true"><span></span><b>B</b></button>',
      '</div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="quick-edit-histogram" data-quick-edit-histogram-open><canvas width="288" height="96" data-quick-edit-histogram></canvas><div class="quick-edit-histogram-empty hidden" data-quick-edit-histogram-empty>无法读取</div></div>',
      '</div>',
      '<div class="quick-edit-group quick-edit-preset-group">',
      '<div class="quick-edit-preset-head">',
      '<div><div class="quick-edit-group-title">预设</div><div class="quick-edit-preset-status" data-quick-edit-preset-status>还没有预设</div></div>',
      '<div class="quick-edit-preset-actions">',
      '<button class="icon-btn" type="button" data-quick-edit-preset-save title="保存当前为预设" aria-label="保存当前为预设">' + quickEditIconSvg('plus') + '</button>',
      '<button class="icon-btn" type="button" data-quick-edit-preset-manage title="管理预设" aria-label="管理预设">' + quickEditIconSvg('library') + '</button>',
      '</div>',
      '</div>',
      '<div class="quick-edit-preset-list" data-quick-edit-preset-list><div class="quick-edit-preset-empty">保存当前参数后会显示在这里</div></div>',
      '</div>',
      '<div class="quick-edit-group">',
      '<div class="quick-edit-group-title">功能区</div>',
      '<div class="quick-edit-tool-grid">',
      '<button class="icon-btn quick-edit-tool-btn" type="button" data-quick-edit-tool="crop" title="裁切" aria-label="裁切"><span aria-hidden="true">⌗</span></button>',
      '<button class="icon-btn quick-edit-tool-btn" type="button" data-quick-edit-tool="rotate" title="旋转" aria-label="旋转"><span aria-hidden="true">⟳</span></button>',
      '<button class="icon-btn quick-edit-tool-btn" type="button" data-quick-edit-reset-current title="重置本轮调整" aria-label="重置本轮调整"><span aria-hidden="true">↺</span></button>',
      '<span class="quick-edit-tool-divider" aria-hidden="true"></span>',
      '<button class="icon-btn quick-edit-tool-btn" type="button" data-quick-edit-save-current title="保存更改" aria-label="保存更改"><span aria-hidden="true">✓</span></button>',
      '<button class="icon-btn quick-edit-tool-btn" type="button" data-quick-edit-save-final title="保存" aria-label="保存"><span class="quick-edit-disk-icon" aria-hidden="true"></span></button>',
      '</div>',
      '</div>',
      '<div class="quick-edit-group quick-edit-raw-develop hidden" data-quick-edit-raw-panel>',
      '<div class="quick-edit-group-title">RAW 显影</div>',
      '<label class="quick-edit-control"><span>高光恢复</span><b data-quick-edit-value="rawHighlightRecovery">0%</b><input type="range" min="0" max="100" step="1" value="0" data-quick-edit-range="rawHighlightRecovery" /></label>',
      '<label class="quick-edit-control"><span>降噪</span><b data-quick-edit-value="rawNoiseReduction">0%</b><input type="range" min="0" max="100" step="1" value="0" data-quick-edit-range="rawNoiseReduction" /></label>',
      '</div>',
      sliderSectionsHtml,
      '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="hsl">',
      '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="hsl" aria-expanded="true">',
      '<span><b>HSL 混合器</b><em data-quick-edit-hsl-active>红色</em></span>',
      '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
      '</button>',
      '<div class="quick-edit-section-body" data-quick-edit-section-body="hsl">',
      '<div class="quick-edit-hsl-tools">',
      '<button class="icon-btn quick-edit-hsl-picker" type="button" data-quick-edit-hsl-picker title="吸取画面颜色" aria-label="吸取画面颜色">' + quickEditIconSvg('pipette') + '</button>',
      '<span data-quick-edit-hsl-picker-status>点击吸管后在画面取色</span>',
      '</div>',
      '<div class="quick-edit-hsl-swatches">',
      QUICK_EDIT_HSL_COLORS.map((color) => '<button type="button" data-quick-edit-hsl-color="' + color.key + '" title="' + color.name + '" aria-label="' + color.name + '" style="--hsl-color:' + color.color + '"><span>' + color.label + '</span></button>').join(''),
      '</div>',
      '<label class="quick-edit-control"><span>色相</span><b data-quick-edit-hsl-value="hue">0</b><input type="range" min="-60" max="60" step="1" value="0" data-quick-edit-hsl-range="hue" /></label>',
      '<label class="quick-edit-control"><span>饱和</span><b data-quick-edit-hsl-value="saturation">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-hsl-range="saturation" /></label>',
      '<label class="quick-edit-control"><span>明度</span><b data-quick-edit-hsl-value="luminance">0%</b><input type="range" min="-100" max="100" step="1" value="0" data-quick-edit-hsl-range="luminance" /></label>',
      '</div>',
      '</div>',
      '<div class="quick-edit-group quick-edit-collapsible quick-edit-lut-group" data-quick-edit-section="lut">',
      '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="lut" aria-expanded="true">',
      '<span><b>LUT 库</b><em data-quick-edit-lut-header>库为空</em></span>',
      '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
      '</button>',
      '<div class="quick-edit-section-body" data-quick-edit-section-body="lut">',
      '<button class="quick-edit-lut-select" type="button" data-quick-edit-lut-open>',
      '<span class="quick-edit-lut-current-label">当前 LUT</span>',
      '<strong data-quick-edit-lut-selected>未启用 LUT</strong>',
      '<em data-quick-edit-lut-selected-detail>库为空 · 点击管理</em>',
      '<b aria-hidden="true">' + quickEditIconSvg('library') + '</b>',
      '</button>',
      '<div class="quick-edit-lut-active-list" data-quick-edit-lut-active-list></div>',
      '<input class="quick-edit-lut-file" type="file" accept=".cube" data-quick-edit-lut-file />',
      '<div class="quick-edit-lut-status" data-quick-edit-lut-status>未选择 LUT</div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="quick-edit-panel-page quick-edit-frame-page hidden" data-quick-edit-panel-page="frame">',
      '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="framePresets">',
      '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="framePresets" aria-expanded="true">',
      '<span><b>相框预设</b><em data-quick-edit-frame-preset-status>还没有相框预设</em></span>',
      '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
      '</button>',
      '<div class="quick-edit-section-body" data-quick-edit-section-body="framePresets">',
      '<div class="quick-edit-frame-preset-panel">',
      '<div class="quick-edit-frame-preset-head">',
      '<span>常用相框</span>',
      '<div>',
      '<button class="icon-btn" type="button" data-quick-edit-frame-preset-save title="保存相框预设" aria-label="保存相框预设">' + quickEditIconSvg('plus') + '</button>',
      '<button class="icon-btn" type="button" data-quick-edit-frame-preset-manage title="管理相框预设" aria-label="管理相框预设">' + quickEditIconSvg('library') + '</button>',
      '</div>',
      '</div>',
      '<div class="quick-edit-frame-preset-list" data-quick-edit-frame-preset-list></div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="frameAdjust">',
      '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="frameAdjust" aria-expanded="true">',
      '<span><b>相框选择</b><em>样式与边距</em></span>',
      '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
      '</button>',
      '<div class="quick-edit-section-body" data-quick-edit-section-body="frameAdjust">',
      '<div class="quick-edit-frame-main">',
      '<div class="quick-edit-frame-options">',
      '<button type="button" class="active" data-quick-edit-frame-preset="none"><span></span><b>无相框</b></button>',
      '<button type="button" data-quick-edit-frame-preset="white"><span></span><b>白边</b></button>',
      '<button type="button" data-quick-edit-frame-preset="black"><span></span><b>黑边</b></button>',
      '<button type="button" data-quick-edit-frame-preset="paper"><span></span><b>相纸</b></button>',
      '</div>',
      '<div class="quick-edit-frame-insets" aria-label="相框宽度">',
      '<label><span>上</span><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-quick-edit-frame-inset="top" /></label>',
      '<label><span>右</span><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-quick-edit-frame-inset="right" /></label>',
      '<label><span>下</span><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-quick-edit-frame-inset="bottom" /></label>',
      '<label><span>左</span><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-quick-edit-frame-inset="left" /></label>',
      '</div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="frameText">',
      '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="frameText" aria-expanded="true">',
      '<span><b>文字</b><em>模板、位置与字体</em></span>',
      '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
      '</button>',
      '<div class="quick-edit-section-body" data-quick-edit-section-body="frameText">',
      '<div class="quick-edit-frame-text-panel">',
      '<div class="quick-edit-frame-text-tools">',
      '<button type="button" data-quick-edit-frame-text-add>添加文字</button>',
      '<button type="button" data-quick-edit-frame-text-token>参数注入</button>',
      '<button type="button" data-quick-edit-frame-image-add>图片库</button>',
      '</div>',
      '<div class="quick-edit-frame-text-list" data-quick-edit-frame-text-list></div>',
      '<div class="quick-edit-frame-image-list" data-quick-edit-frame-image-list></div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="quick-edit-panel-page quick-edit-batch-page hidden" data-quick-edit-panel-page="sync"></div>',
      '<div class="quick-edit-panel-page quick-edit-batch-page hidden" data-quick-edit-panel-page="output"><div class="quick-edit-batch-output"><b>批量输出设置</b><span>使用每张照片独立保存的调参与相框状态。</span><button class="primary-btn" type="button" data-quick-edit-batch-output-open>打开输出设置</button></div></div>',
      '</aside>',
      '</div>',
      '</section>',
    ].join('');
    document.body.appendChild(el);
    state.quickEdit.el = el;
    if (window.PicScannerVue) {
      window.PicScannerVue.mountQuickEditSliders(el.querySelector('[data-quick-edit-vue-slots]'));
    }
    if (window.PicScannerModules && window.PicScannerModules.renderDropdown) {
      window.PicScannerModules.renderDropdown();
    }

    el.querySelector('[data-quick-edit-close]').addEventListener('click', () => closeQuickEdit());
    const stage = el.querySelector('[data-quick-edit-stage]');
    if (stage) {
      stage.addEventListener('pointerdown', (ev) => {
        if (!state.quickEdit.hslPickerActive) return;
        pickQuickEditHslColor(ev);
      }, true);
      stage.addEventListener('wheel', onQuickEditWheel, { passive: false });
      stage.addEventListener('dblclick', onQuickEditDoubleClick);
      ensureQuickEditPanController(stage);
    }
    const framePreview = el.querySelector('[data-quick-edit-frame-preview]');
    if (framePreview) {
      framePreview.addEventListener('wheel', onQuickEditFrameImageWheel, { passive: false });
      framePreview.addEventListener('pointerdown', (ev) => {
        const textTarget = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-text-preview]') : null;
        if (textTarget) {
          startQuickEditFrameTextDrag(ev, textTarget.dataset.quickEditFrameTextPreview);
          return;
        }
        const imageTarget = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-image-preview]') : null;
        if (!imageTarget) return;
        startQuickEditFrameImageDrag(ev, imageTarget.dataset.quickEditFrameImagePreview);
      });
    }
    const previewImg = el.querySelector('[data-quick-edit-img]');
    if (previewImg) {
      previewImg.addEventListener('load', () => requestAnimationFrame(() => {
        const hadDisplayBasis = !!state.quickEdit.displayBasisReady;
        const source = state.quickEdit.sourceImage || previewImg;
        const basis = quickEditImageBasis(
          source.naturalWidth || source.width,
          source.naturalHeight || source.height,
        );
        if (!hadDisplayBasis) {
          setQuickEditImageDisplayBasis(
            previewImg,
            basis.width,
            basis.height,
          );
        }
        if (isQuickEditCropToolActive()) {
          ensureQuickEditCenteredCropFrame(false);
        } else if (!hadDisplayBasis && !state.quickEdit.cropFrame && fitQuickEditCommittedOutput({ force: true })) {
          applyQuickEditPreview({ skipOverlay: true, skipColorRender: true });
        }
        updateQuickEditCropOverlay();
        scheduleQuickEditHistogramRender(120);
        refreshQuickEditPanController();
      }));
    }
    const rotationRuler = el.querySelector('[data-quick-edit-rotation-ruler]');
    if (rotationRuler) {
      rotationRuler.addEventListener('pointerdown', onQuickEditRotationPointerDown);
      rotationRuler.addEventListener('pointermove', onQuickEditRotationPointerMove);
      rotationRuler.addEventListener('pointerup', endQuickEditRotationDrag);
      rotationRuler.addEventListener('pointercancel', endQuickEditRotationDrag);
      rotationRuler.addEventListener('wheel', onQuickEditRotationWheel, { passive: false });
      rotationRuler.addEventListener('keydown', onQuickEditRotationKeydown);
    }
    const cropOverlay = el.querySelector('[data-quick-edit-crop-overlay]');
    if (cropOverlay) {
      cropOverlay.addEventListener('pointerdown', onQuickEditCropPointerDown);
      cropOverlay.addEventListener('pointermove', onQuickEditCropPointerMove);
      cropOverlay.addEventListener('pointerup', endQuickEditCropDrag);
      cropOverlay.addEventListener('pointercancel', endQuickEditCropDrag);
    }
    el.querySelector('[data-quick-edit-reset]').addEventListener('click', () => {
      state.quickEdit.params = quickEditDefaultParams();
      state.quickEdit.committedParams = null;
      state.quickEdit.committedStages = [];
      state.quickEdit.panX = 0;
      state.quickEdit.panY = 0;
      state.quickEdit.cropFrame = null;
      state.quickEdit.activeTools = { crop: false, rotate: false };
      state.quickEdit.histogramMode = 'white';
      state.quickEdit.histogramMenuOpen = false;
      state.quickEdit.histogramData = null;
      state.quickEdit.hslColor = 'red';
      state.quickEdit.framePreset = 'none';
      state.quickEdit.frameInsets = quickEditFrameDefaultInsets('none');
      state.quickEdit.frameTextLayers = [];
      state.quickEdit.frameTextDrag = null;
      state.quickEdit.frameImageLayers = [];
      state.quickEdit.frameImageDrag = null;
      state.quickEdit.lut = null;
      state.quickEdit.luts = [];
      state.quickEdit.lutDraft = null;
      state.quickEdit.lutDrafts = [];
      state.quickEdit.lutDraftLoadingId = '';
      state.quickEdit.history = [];
      state.quickEdit.viewZoom = 1;
      resetQuickEditRawPreviewState();
      invalidateQuickEditRenderedPreview({ clearTimers: true });
      fitQuickEditCommittedOutput({ force: true });
      syncQuickEditControls();
      applyQuickEditPreview();
      if (quickEditUsesRawDevelopPipeline()) scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
      scheduleQuickEditHistogramRender(0);
      scheduleQuickEditCropShade();
    });
    el.querySelector('[data-quick-edit-reset-current]').addEventListener('click', () => {
      resetQuickEditCurrentChanges();
    });
    el.querySelector('[data-quick-edit-save-current]').addEventListener('click', (ev) => {
      console.info('[PicScannerCrop] toolbar confirm click', {
        photoId: Number(state.quickEdit.photo && state.quickEdit.photo.id || 0),
        cropActive: isQuickEditCropToolActive(),
        disabled: !!ev.currentTarget.disabled,
        frame: state.quickEdit.cropFrame,
      });
      saveQuickEditCurrentChanges();
    });
    el.querySelector('[data-quick-edit-save-final]').addEventListener('click', () => {
      showQuickEditSaveConfirm();
    });
    el.querySelector('[data-quick-edit-histogram-open]').addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      ensureQuickEditCurvePanel().toggle(ev.currentTarget);
      syncQuickEditControls();
    });
    el.querySelectorAll('[data-quick-edit-section-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleQuickEditSection(String(btn.dataset.quickEditSectionToggle || ''));
      });
    });
    el.querySelectorAll('[data-quick-edit-panel-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setQuickEditPanelTab(String(btn.dataset.quickEditPanelTab || 'adjust'));
      });
    });
    el.querySelector('[data-quick-edit-batch-thumbnails]').addEventListener('click', (ev) => {
      const button = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-batch-index]') : null;
      if (!button) return;
      switchBatchQuickEditPhoto(Number(button.dataset.quickEditBatchIndex || 0));
    });
    el.querySelector('[data-quick-edit-batch-output-open]').addEventListener('click', () => {
      if (!state.quickEdit.batchMode || !PS.batchProcessingController) return;
      saveActiveBatchEditSession();
      PS.batchProcessingController.open(state.quickEdit.batchPhotos, { sessions: state.quickEdit.batchSessions, activePage: 'output' });
    });
    el.querySelectorAll('[data-quick-edit-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleQuickEditTool(String(btn.dataset.quickEditTool || ''));
      });
    });
    el.querySelectorAll('[data-quick-edit-histogram-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = String(btn.dataset.quickEditHistogramMode || 'white');
        setQuickEditHistogramMenuOpen(false);
        state.quickEdit.histogramMode = mode === 'rgb' ? 'rgb' : 'white';
        syncQuickEditControls();
        renderQuickEditHistogram();
      });
    });
    el.querySelector('[data-quick-edit-rgb-menu-trigger]').addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      state.quickEdit.histogramMode = 'rgb';
      setQuickEditHistogramMenuOpen(!state.quickEdit.histogramMenuOpen);
      syncQuickEditControls();
      renderQuickEditHistogram();
    });
    el.querySelectorAll('[data-quick-edit-rgb-channel]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        toggleQuickEditHistogramChannel(String(btn.dataset.quickEditRgbChannel || ''));
      });
    });
    el.querySelectorAll('[data-quick-edit-hsl-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.quickEdit.hslColor = quickEditHslColorConfig(String(btn.dataset.quickEditHslColor || '')).key;
        setQuickEditHslPickerActive(false);
        syncQuickEditControls();
      });
    });
    el.querySelectorAll('[data-quick-edit-split-tone-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyQuickEditSplitTonePreset(String(btn.dataset.quickEditSplitTonePreset || ''));
      });
    });
    el.querySelectorAll('[data-quick-edit-frame-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setQuickEditFramePreset(btn.dataset.quickEditFramePreset);
      });
    });
    const framePresetSave = el.querySelector('[data-quick-edit-frame-preset-save]');
    if (framePresetSave) {
      framePresetSave.addEventListener('click', () => {
        saveCurrentQuickEditFramePreset();
      });
    }
    const framePresetManage = el.querySelector('[data-quick-edit-frame-preset-manage]');
    if (framePresetManage) {
      framePresetManage.addEventListener('click', () => {
        showQuickEditFramePresetModal();
      });
    }
    const framePresetList = el.querySelector('[data-quick-edit-frame-preset-list]');
    if (framePresetList) {
      framePresetList.addEventListener('mouseover', (ev) => {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-apply]') : null;
        if (btn) state.quickEdit.framePresetHoverId = String(btn.dataset.quickEditFramePresetApply || '');
      });
      framePresetList.addEventListener('focusin', (ev) => {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-apply]') : null;
        if (btn) state.quickEdit.framePresetHoverId = String(btn.dataset.quickEditFramePresetApply || '');
      });
      framePresetList.addEventListener('mouseleave', () => {
        state.quickEdit.framePresetHoverId = '';
      });
      framePresetList.addEventListener('focusout', (ev) => {
        if (!framePresetList.contains(ev.relatedTarget)) state.quickEdit.framePresetHoverId = '';
      });
      framePresetList.addEventListener('click', (ev) => {
        const apply = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-preset-apply]') : null;
        if (apply) {
          applyQuickEditFramePreset(String(apply.dataset.quickEditFramePresetApply || ''));
        }
      });
    }
    el.querySelectorAll('[data-quick-edit-frame-inset]').forEach((input) => {
      const commit = () => {
        const key = String(input.dataset.quickEditFrameInset || '');
        if (!['top', 'right', 'bottom', 'left'].includes(key)) return;
        const digits = String(input.value || '').replace(/[^\d]/g, '').slice(0, 2);
        const value = clamp(Number(digits || 0), 0, 40);
        const insets = quickEditNormalizeFrameInsets(state.quickEdit.frameInsets);
        insets[key] = value;
        state.quickEdit.frameInsets = insets;
        input.value = String(value);
        refreshQuickEditImageDisplayBasis();
        syncQuickEditFrameUi();
        syncQuickEditSaveConfirm();
      };
      input.addEventListener('input', () => {
        const digits = String(input.value || '').replace(/[^\d]/g, '').slice(0, 2);
        if (input.value !== digits) input.value = digits;
        commit();
      });
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
        ev.preventDefault();
        const key = String(input.dataset.quickEditFrameInset || '');
        if (!['top', 'right', 'bottom', 'left'].includes(key)) return;
        const step = ev.shiftKey ? 5 : 1;
        const delta = ev.key === 'ArrowUp' ? step : -step;
        const current = Number(String(input.value || '').replace(/[^\d]/g, '') || 0);
        const value = clamp(current + delta, 0, 40);
        const insets = quickEditNormalizeFrameInsets(state.quickEdit.frameInsets);
        insets[key] = value;
        state.quickEdit.frameInsets = insets;
        input.value = String(value);
        refreshQuickEditImageDisplayBasis();
        syncQuickEditFrameUi();
        syncQuickEditSaveConfirm();
      });
    });
    const frameTextAdd = el.querySelector('[data-quick-edit-frame-text-add]');
    if (frameTextAdd) {
      frameTextAdd.addEventListener('click', () => {
        const layers = quickEditFrameTextLayers();
        layers.push(quickEditNewFrameTextLayer());
        state.quickEdit.frameTextLayers = layers;
        renderQuickEditFrameTextLayers();
        syncQuickEditFramePreview();
        syncQuickEditFramePresetUi();
        syncQuickEditSaveConfirm();
      });
    }
    const frameTextToken = el.querySelector('[data-quick-edit-frame-text-token]');
    if (frameTextToken) {
      frameTextToken.addEventListener('click', () => {
        openQuickEditFrameTextTokenPanel(frameTextToken);
      });
    }
    const frameImageAdd = el.querySelector('[data-quick-edit-frame-image-add]');
    if (frameImageAdd) {
      frameImageAdd.title = '打开图片素材库';
      frameImageAdd.addEventListener('click', () => {
        showQuickEditFrameAssetModal();
      });
    }
    const frameTextList = el.querySelector('[data-quick-edit-frame-text-list]');
    if (frameTextList) {
      frameTextList.addEventListener('input', (ev) => {
        const target = ev.target;
        if (!target || !target.dataset) return;
        if (target.dataset.quickEditFrameTextTemplate) {
          updateQuickEditFrameTextLayer(target.dataset.quickEditFrameTextTemplate, { text: String(target.value || '').slice(0, 120) }, { skipRender: true });
        } else if (target.dataset.quickEditFrameTextFamily) {
          updateQuickEditFrameTextLayer(target.dataset.quickEditFrameTextFamily, { fontFamily: String(target.value || '').slice(0, 80) }, { skipRender: true });
        } else if (target.dataset.quickEditFrameTextColorInput) {
          const layerId = String(target.dataset.quickEditFrameTextColorInput || '');
          let value = String(target.value || '').trim().replace(/[^#0-9a-f]/gi, '').slice(0, 7);
          if (value && !value.startsWith('#')) value = '#' + value.slice(0, 6);
          if (target.value !== value) target.value = value;
          const color = quickEditNormalizeHexColor(value);
          if (color) {
            updateQuickEditFrameTextLayer(layerId, { color }, { skipRender: true });
            syncQuickEditFrameTextColorControl(layerId, color);
          }
        } else if (target.dataset.quickEditFrameTextSpace) {
          return;
        } else {
          commitQuickEditFrameTextNumericInput(target, { emptyValue: undefined });
        }
      });
      frameTextList.addEventListener('change', (ev) => {
        const target = ev.target;
        if (!target || !target.dataset) return;
        if (target.dataset.quickEditFrameTextSpace) {
          updateQuickEditFrameTextLayer(target.dataset.quickEditFrameTextSpace, { coordinateSpace: String(target.value || '') });
          return;
        }
        if (target.dataset.quickEditFrameTextColorInput) {
          const layerId = String(target.dataset.quickEditFrameTextColorInput || '');
          const layer = quickEditFrameTextLayerById(layerId);
          const color = quickEditNormalizeHexColor(target.value) || (layer && layer.color) || quickEditDefaultFrameTextColor();
          target.value = color;
          updateQuickEditFrameTextLayer(layerId, { color }, { skipRender: true });
          syncQuickEditFrameTextColorControl(layerId, color);
          return;
        }
        commitQuickEditFrameTextNumericInput(target, { normalizeInput: true });
      });
      frameTextList.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
        const target = ev.target;
        if (!target || !target.dataset || !quickEditFrameTextNumericInputMeta(target)) return;
        ev.preventDefault();
        stepQuickEditFrameTextNumericInput(target, ev.key === 'ArrowUp' ? 1 : -1, ev.shiftKey);
      });
      frameTextList.addEventListener('click', (ev) => {
        const target = ev.target && ev.target.closest ? ev.target.closest('button') : null;
        if (!target || !target.dataset) return;
        if (target.dataset.quickEditFrameTextRemove) {
          state.quickEdit.frameTextLayers = quickEditFrameTextLayers().filter((layer) => layer.id !== target.dataset.quickEditFrameTextRemove);
          renderQuickEditFrameTextLayers();
          syncQuickEditFramePreview();
          syncQuickEditFramePresetUi();
          syncQuickEditSaveConfirm();
        } else if (target.dataset.quickEditFrameTextPositionLayer) {
          updateQuickEditFrameTextLayer(
            target.dataset.quickEditFrameTextPositionLayer,
            { position: target.dataset.quickEditFrameTextPosition || 'bottom-center' },
          );
        } else if (target.dataset.quickEditFrameTextColorTrigger) {
          openQuickEditFrameTextColorPanel(target.dataset.quickEditFrameTextColorTrigger, target);
        }
      });
    }
    const frameImageList = el.querySelector('[data-quick-edit-frame-image-list]');
    if (frameImageList) {
      frameImageList.addEventListener('input', (ev) => {
        const target = ev.target;
        if (!target || !target.dataset) return;
        if (target.dataset.quickEditFrameImageSpace) return;
        commitQuickEditFrameImageNumericInput(target, { emptyValue: undefined });
      });
      frameImageList.addEventListener('change', (ev) => {
        const target = ev.target;
        if (!target || !target.dataset) return;
        if (target.dataset.quickEditFrameImageSpace) {
          updateQuickEditFrameImageLayer(target.dataset.quickEditFrameImageSpace, { coordinateSpace: String(target.value || '') });
          return;
        }
        commitQuickEditFrameImageNumericInput(target, { normalizeInput: true });
      });
      frameImageList.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
        const target = ev.target;
        if (!target || !target.dataset || !quickEditFrameImageNumericInputMeta(target)) return;
        ev.preventDefault();
        stepQuickEditFrameImageNumericInput(target, ev.key === 'ArrowUp' ? 1 : -1, ev.shiftKey);
      });
      frameImageList.addEventListener('click', (ev) => {
        const target = ev.target && ev.target.closest ? ev.target.closest('button') : null;
        if (!target || !target.dataset) return;
        if (target.dataset.quickEditFrameImageRemove) {
          state.quickEdit.frameImageLayers = quickEditFrameImageLayers().filter((layer) => layer.id !== target.dataset.quickEditFrameImageRemove);
          renderQuickEditFrameImageLayers();
          syncQuickEditFramePreview();
          syncQuickEditFramePresetUi();
          syncQuickEditSaveConfirm();
        }
      });
    }
    const hslPicker = el.querySelector('[data-quick-edit-hsl-picker]');
    if (hslPicker) {
      hslPicker.addEventListener('click', () => {
        setQuickEditHslPickerActive(!state.quickEdit.hslPickerActive);
      });
    }
    const lutOpen = el.querySelector('[data-quick-edit-lut-open]');
    const lutActiveList = el.querySelector('[data-quick-edit-lut-active-list]');
    const lutFileInput = el.querySelector('[data-quick-edit-lut-file]');
    const presetList = el.querySelector('[data-quick-edit-preset-list]');
    const presetSave = el.querySelector('[data-quick-edit-preset-save]');
    const presetManage = el.querySelector('[data-quick-edit-preset-manage]');
    if (presetSave) presetSave.addEventListener('click', () => saveCurrentQuickEditPreset());
    if (presetManage) presetManage.addEventListener('click', () => showQuickEditPresetModal());
    if (presetList) {
      presetList.addEventListener('mouseover', (ev) => {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-apply]') : null;
        if (btn) state.quickEdit.presetHoverId = String(btn.dataset.quickEditPresetApply || '');
      });
      presetList.addEventListener('focusin', (ev) => {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-apply]') : null;
        if (btn) state.quickEdit.presetHoverId = String(btn.dataset.quickEditPresetApply || '');
      });
      presetList.addEventListener('mouseleave', () => {
        state.quickEdit.presetHoverId = '';
      });
      presetList.addEventListener('focusout', (ev) => {
        if (!presetList.contains(ev.relatedTarget)) state.quickEdit.presetHoverId = '';
      });
      presetList.addEventListener('click', (ev) => {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-preset-apply]') : null;
        if (!btn) return;
        applyQuickEditPreset(String(btn.dataset.quickEditPresetApply || ''));
      });
    }
    if (lutOpen) {
      lutOpen.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        showQuickEditLutModal();
      });
    }
    if (lutFileInput) {
      lutFileInput.addEventListener('change', () => {
        importQuickEditLutFileToLibrary(lutFileInput.files && lutFileInput.files[0]);
      });
    }
    if (lutActiveList) {
      lutActiveList.addEventListener('input', (ev) => {
        const range = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-lut-strength]') : null;
        if (!range) return;
        range.style.setProperty('--quick-edit-lut-strength', quickEditNormalizeLutStrength(range.value) + '%');
        updateQuickEditLutStrength(String(range.dataset.quickEditLutStrength || ''), range.value);
      });
    }
    el.querySelectorAll('[data-quick-edit-range]').forEach((input) => {
      if (input.closest('[data-quick-edit-vue-slots]')) return;
      input.addEventListener('input', () => {
        const key = String(input.dataset.quickEditRange || '');
        if (!key) return;
        const next = normalizeQuickEditParams(state.quickEdit.params);
        next[key] = Number(input.value || 0);
        state.quickEdit.params = normalizeQuickEditParams(next);
        const rawDevelop = quickEditUsesRawDevelopPipeline() && quickEditIsRawDevelopParamKey(key);
        invalidateQuickEditRenderedPreview({ clearTimers: true });
        syncQuickEditControls();
        if (rawDevelop) {
          applyQuickEditPreview({ skipColorRender: true });
          scheduleQuickEditRawDevelopPreview({ interactive: true });
        } else {
          applyQuickEditPreview({ interactive: true });
          scheduleQuickEditHistogramRender(key === 'temperature' ? 320 : 180);
        }
      });
    });
    el.querySelectorAll('[data-quick-edit-number]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = String(input.dataset.quickEditNumber || '');
        if (key !== 'temperature') return;
        const next = normalizeQuickEditParams(state.quickEdit.params);
        next.temperature = normalizeQuickEditTemperature(input.value);
        state.quickEdit.params = normalizeQuickEditParams(next);
        invalidateQuickEditRenderedPreview({ clearTimers: true });
        syncQuickEditControls();
        if (quickEditUsesRawDevelopPipeline()) {
          applyQuickEditPreview({ skipColorRender: true });
          scheduleQuickEditRawDevelopPreview({ interactive: true });
        } else {
          applyQuickEditPreview({ interactive: true });
          scheduleQuickEditHistogramRender(320);
        }
      });
      input.addEventListener('change', () => {
        const next = normalizeQuickEditParams(state.quickEdit.params);
        next.temperature = normalizeQuickEditTemperature(input.value);
        state.quickEdit.params = normalizeQuickEditParams(next);
        invalidateQuickEditRenderedPreview({ clearTimers: true });
        syncQuickEditControls();
        if (quickEditUsesRawDevelopPipeline()) {
          applyQuickEditPreview({ skipColorRender: true });
          scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
        } else {
          applyQuickEditPreview();
          scheduleQuickEditHistogramRender(0);
        }
      });
    });
    el.querySelectorAll('[data-quick-edit-hsl-range]').forEach((input) => {
      input.addEventListener('input', () => {
        const field = String(input.dataset.quickEditHslRange || '');
        const key = quickEditHslParamKey(field);
        const next = normalizeQuickEditParams(state.quickEdit.params);
        next[key] = Number(input.value || 0);
        state.quickEdit.params = normalizeQuickEditParams(next);
        invalidateQuickEditRenderedPreview({ clearTimers: true });
        syncQuickEditControls();
        applyQuickEditPreview({ interactive: true });
        scheduleQuickEditHistogramRender(180);
      });
    });
    return el;
  }

  function clearQuickEditCropShade() {
    clearTimeout(state.quickEdit.shadeTimer);
    state.quickEdit.shadeTimer = null;
    const el = state.quickEdit.el;
    const overlay = el ? el.querySelector('[data-quick-edit-crop-overlay]') : null;
    if (overlay) overlay.classList.remove('shade-active');
  }

  function isQuickEditCropToolActive() {
    return !!(state.quickEdit.activeTools && state.quickEdit.activeTools.crop);
  }

  function isQuickEditRotateToolActive() {
    return !!(state.quickEdit.activeTools && state.quickEdit.activeTools.rotate);
  }

  function toggleQuickEditTool(tool) {
    if (tool !== 'crop' && tool !== 'rotate') return;
    const tools = Object.assign({ crop: false, rotate: false }, state.quickEdit.activeTools || {});
    const nextActive = !tools[tool];
    tools[tool] = !tools[tool];
    state.quickEdit.activeTools = tools;
    if (!tools.crop) {
      state.quickEdit.cropDrag = null;
      state.quickEdit.cropFrame = null;
      clearQuickEditCropShade();
      if (tool === 'crop' && !nextActive) fitQuickEditCommittedOutput({ force: true });
    } else if (tool === 'crop' && nextActive) {
      state.quickEdit.cropFrame = null;
      fitQuickEditCommittedOutput({ force: true, silent: true });
    }
    if (!tools.rotate) {
      state.quickEdit.rotationDrag = null;
    }
    syncQuickEditControls();
    applyQuickEditPreview({ skipColorRender: true });
    if (tool === 'crop' && nextActive) {
      requestAnimationFrame(() => {
        ensureQuickEditCenteredCropFrame(true);
        console.info('[PicScannerGeometry] crop session opened', {
          photoId: Number(state.quickEdit.photo && state.quickEdit.photo.id || 0),
          effectiveParams: quickEditEffectiveParams(),
          frame: quickEditCropFrameRect(),
          zoom: state.quickEdit.viewZoom,
        });
      });
    }
    scheduleQuickEditCropShade();
  }

  function resetQuickEditCurrentChanges() {
    state.quickEdit.params = quickEditDefaultParams();
    state.quickEdit.lut = null;
    state.quickEdit.luts = [];
    state.quickEdit.lutDraft = null;
    state.quickEdit.lutDrafts = [];
    state.quickEdit.lutDraftLoadingId = '';
    state.quickEdit.panX = 0;
    state.quickEdit.panY = 0;
    state.quickEdit.viewZoom = 1;
    resetQuickEditRawPreviewState();
    invalidateQuickEditRenderedPreview({ clearTimers: true });
    if (isQuickEditCropToolActive()) {
      state.quickEdit.cropFrame = null;
      fitQuickEditCommittedOutput({ force: true, silent: true });
      requestAnimationFrame(() => ensureQuickEditCenteredCropFrame(true));
    } else {
      fitQuickEditCommittedOutput({ force: true });
    }
    syncQuickEditControls();
    applyQuickEditPreview();
    if (quickEditUsesRawDevelopPipeline()) scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
    scheduleQuickEditCropShade();
    showToast('已重置本轮调整');
  }

  function resetQuickEditPreviewAdjustments(options) {
    const opts = options || {};
    cancelQuickEditPan();
    state.quickEdit.params = quickEditDefaultParams();
    state.quickEdit.committedParams = null;
    state.quickEdit.committedStages = [];
    state.quickEdit.panX = 0;
    state.quickEdit.panY = 0;
    state.quickEdit.cropFrame = null;
    state.quickEdit.activeTools = { crop: false, rotate: false };
    state.quickEdit.cropDrag = null;
    state.quickEdit.rotationDrag = null;
    state.quickEdit.viewZoom = 1;
    state.quickEdit.histogramMenuOpen = false;
    state.quickEdit.histogramData = null;
    state.quickEdit.hslColor = 'red';
    state.quickEdit.hslPickerActive = false;
    state.quickEdit.panelTab = 'adjust';
    state.quickEdit.framePreset = 'none';
    state.quickEdit.frameInsets = quickEditFrameDefaultInsets('none');
    state.quickEdit.frameTextLayers = [];
    state.quickEdit.frameTextDrag = null;
    state.quickEdit.frameImageLayers = [];
    state.quickEdit.frameImageDrag = null;
    state.quickEdit.lut = null;
    state.quickEdit.luts = [];
    state.quickEdit.lutDraft = null;
    state.quickEdit.lutDrafts = [];
    state.quickEdit.lutDraftLoadingId = '';
    if (!opts.keepHistogramMode) state.quickEdit.histogramMode = 'white';
    resetQuickEditRawPreviewState();
    invalidateQuickEditRenderedPreview({ clearTimers: true });
    clearQuickEditCropShade();
  }

  function quickEditRenderView(options) {
    const opts = options || {};
    const canonical = !!opts.canonical && !isQuickEditCropToolActive();
    return canonical
      ? { zoom: 1, pan: { x: 0, y: 0 } }
      : {
        zoom: Math.max(0.0001, Number(state.quickEdit.viewZoom || 1)),
        pan: quickEditEffectivePan(),
      };
  }

  function quickEditBakeFrame(stage, img, options) {
    const opts = options || {};
    if (isQuickEditCropToolActive()) {
      const frame = quickEditCropFrameRect();
      if (frame) return frame;
    }
    const params = quickEditEffectiveParams();
    const view = quickEditRenderView(opts);
    const geometry = quickEditTransformedImageGeometry(params, {
      stage,
      img,
      zoom: view.zoom,
      pan: view.pan,
      recenter: false,
    });
    return geometry ? quickEditCropFrameForParams(params, geometry) : null;
  }

  function quickEditCropParamsFromFrame(frame) {
    const el = ensureQuickEdit();
    const img = el.querySelector('[data-quick-edit-img]');
    const stage = el.querySelector('[data-quick-edit-stage]');
    if (!frame || !img || !stage) return null;
    const params = quickEditEffectiveParams();
    const geometry = quickEditTransformedImageGeometry(params, { stage, img });
    if (!geometry) return null;
    const baseFrame = quickEditCropFrameForParams(params, geometry);
    const selection = quickEditGeometryApi().selectionFromFrames(
      baseFrame,
      frame,
      QUICK_EDIT_CROP_MIN_SIZE,
    );
    if (!selection) return null;
    const composed = quickEditGeometryApi().composeCrop(
      quickEditCropRect(params),
      selection,
      QUICK_EDIT_CROP_MIN_SIZE,
    );
    return {
      cropLeft: composed.x,
      cropTop: composed.y,
      cropRight: 100 - composed.x - composed.w,
      cropBottom: 100 - composed.y - composed.h,
    };
  }

  async function bakeQuickEditPreviewToImage(options) {
    const saveOptions = options || {};
    const format = quickEditSaveFormatConfig(saveOptions.format || 'jpg').key;
    const mime = quickEditSaveMime(format);
    const quality = quickEditSaveQualityRatio(saveOptions.quality);
    const el = ensureQuickEdit();
    const stage = el.querySelector('[data-quick-edit-stage]');
    const img = el.querySelector('[data-quick-edit-img]');
    const sourceSrc = String(saveOptions.sourceSrc || state.quickEdit.sourceSrc || (img && PS.imageHasSource(img) ? img.src : ''));
    if (saveOptions.fullResolution && !sourceSrc) {
      throw new Error('当前图片缺少原图路径，无法保存原图质量版本');
    }
    if (!stage || !img || !sourceSrc || !PS.imageHasSource(img) || !img.naturalWidth || !img.naturalHeight) {
      throw new Error('当前预览图还没有加载完成');
    }
    const sourceImg = await loadQuickEditImage(sourceSrc);
    const frame = quickEditBakeFrame(stage, img, { canonical: true });
    if (!frame || frame.w <= 0.0001 || frame.h <= 0.0001) {
      throw new Error('当前取景框尺寸无效');
    }
    const params = quickEditEffectiveParams();
    const renderView = quickEditRenderView({ canonical: true });
    const pan = renderView.pan;
    const angle = (params.rotation + params.straighten) * Math.PI / 180;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    const stageRect = stage.getBoundingClientRect();
    const displayBasis = quickEditDisplayBasisSize(img);
    const baseWidth = displayBasis.width;
    const baseHeight = displayBasis.height;
    const sourceBasis = quickEditImageBasis(sourceImg.naturalWidth || sourceImg.width, sourceImg.naturalHeight || sourceImg.height);
    const sourceScale = Math.max(
      Number(sourceBasis.width || sourceImg.naturalWidth || sourceImg.width || 1) / Math.max(1, baseWidth),
      Number(sourceBasis.height || sourceImg.naturalHeight || sourceImg.height || 1) / Math.max(1, baseHeight),
    );
    const maxSide = 2400;
    const outputScale = saveOptions.fullResolution
      ? sourceScale / renderView.zoom
      : Math.min(dpr, maxSide / Math.max(frame.w, frame.h));
    canvas.width = Math.max(1, Math.round(frame.w * outputScale));
    canvas.height = Math.max(1, Math.round(frame.h * outputScale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建预览画布');
    const baseLeft = (stageRect.width - baseWidth) / 2;
    const baseTop = (stageRect.height - baseHeight) / 2;
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = canvas.width;
    imageCanvas.height = canvas.height;
    const imageCtx = imageCanvas.getContext('2d');
    if (!imageCtx) throw new Error('无法创建曲线预览画布');
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    imageCtx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
    imageCtx.translate(baseLeft - frame.x + baseWidth / 2 + pan.x, baseTop - frame.y + baseHeight / 2 + pan.y);
    imageCtx.scale(renderView.zoom, renderView.zoom);
    imageCtx.rotate(angle);
    imageCtx.drawImage(sourceImg, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
    applyQuickEditCurveToCanvas(imageCanvas, params);
    ctx.drawImage(imageCanvas, 0, 0);
    const dataUrl = canvas.toDataURL(mime, quality);
    if (!String(dataUrl || '').startsWith('data:' + mime + ';')) {
      throw new Error('当前 WebView 不支持导出 ' + quickEditSaveFormatConfig(format).label);
    }
    return dataUrl;
  }

  function snapshotQuickEditState() {
    const el = ensureQuickEdit();
    const img = el.querySelector('[data-quick-edit-img]');
    return {
      src: img && PS.imageHasSource(img) ? img.src : '',
      sourceSrc: state.quickEdit.sourceSrc || (img && PS.imageHasSource(img) ? img.src : ''),
      params: normalizeQuickEditParams(state.quickEdit.params),
      effectiveParams: quickEditEffectiveParams(),
      committedParams: normalizeQuickEditParams(state.quickEdit.committedParams || quickEditDefaultParams()),
      committedStages: (state.quickEdit.committedStages || []).map(cloneQuickEditPixelStage),
      panX: Number(state.quickEdit.panX || 0),
      panY: Number(state.quickEdit.panY || 0),
      panRatioX: img && img.offsetWidth ? Number(state.quickEdit.panX || 0) / img.offsetWidth : 0,
      panRatioY: img && img.offsetHeight ? Number(state.quickEdit.panY || 0) / img.offsetHeight : 0,
      cropFrame: state.quickEdit.cropFrame ? Object.assign({}, state.quickEdit.cropFrame) : null,
      activeTools: Object.assign({ crop: false, rotate: false }, state.quickEdit.activeTools || {}),
      viewZoom: Number(state.quickEdit.viewZoom || 1),
      histogramMode: state.quickEdit.histogramMode || 'white',
      luts: quickEditEnabledLuts().map((lut) => Object.assign({}, lut)),
      framePreset: String(state.quickEdit.framePreset || 'none'),
      frameInsets: Object.assign({}, state.quickEdit.frameInsets || quickEditFrameDefaultInsets('none')),
      frameTextLayers: (state.quickEdit.frameTextLayers || []).map((layer) => Object.assign({}, layer)),
      frameImageLayers: (state.quickEdit.frameImageLayers || []).map((layer) => Object.assign({}, layer)),
      panelTab: String(state.quickEdit.panelTab || 'adjust'),
      history: (state.quickEdit.history || []).slice(),
      bakedSource: !!state.quickEdit.bakedSource,
      sourceStages: (() => {
        const photo = state.quickEdit.photo;
        const id = Number((photo && photo.id) || 0);
        if (!id) return null;
        const entry = state.sourceStages.get(id);
        return entry ? JSON.parse(JSON.stringify(entry)) : null;
      })(),
    };
  }

  function applyQuickEditSnapshotState(snapshot) {
    if (!snapshot) return false;
    state.quickEdit.params = normalizeQuickEditParams(snapshot.params);
    state.quickEdit.committedParams = normalizeQuickEditParams(snapshot.committedParams);
    state.quickEdit.committedStages = (snapshot.committedStages || []).map(cloneQuickEditPixelStage);
    state.quickEdit.panX = Number(snapshot.panX || 0);
    state.quickEdit.panY = Number(snapshot.panY || 0);
    state.quickEdit.cropFrame = snapshot.cropFrame ? Object.assign({}, snapshot.cropFrame) : null;
    state.quickEdit.activeTools = Object.assign({ crop: false, rotate: false }, snapshot.activeTools || {});
    state.quickEdit.viewZoom = Number(snapshot.viewZoom || 1);
    state.quickEdit.histogramMode = snapshot.histogramMode || 'white';
    quickEditSetLuts(snapshot.luts || (snapshot.lut ? [snapshot.lut] : []));
    state.quickEdit.framePreset = String(snapshot.framePreset || 'none');
    state.quickEdit.frameInsets = Object.assign({}, snapshot.frameInsets || quickEditFrameDefaultInsets(state.quickEdit.framePreset));
    state.quickEdit.frameTextLayers = (snapshot.frameTextLayers || []).map((layer) => Object.assign({}, layer));
    state.quickEdit.frameImageLayers = (snapshot.frameImageLayers || []).map((layer) => Object.assign({}, layer));
    state.quickEdit.panelTab = String(snapshot.panelTab || 'adjust');
    state.quickEdit.history = (snapshot.history || []).slice();
    state.quickEdit.bakedSource = !!snapshot.bakedSource;
    if (Object.prototype.hasOwnProperty.call(snapshot, 'sourceStages')) {
      const photo = state.quickEdit.photo;
      const id = Number((photo && photo.id) || 0);
      if (id) {
        if (snapshot.sourceStages) {
          state.sourceStages.set(id, JSON.parse(JSON.stringify(snapshot.sourceStages)));
        } else {
          state.sourceStages.delete(id);
        }
      }
    }
    state.quickEdit.cropDrag = null;
    state.quickEdit.rotationDrag = null;
    return true;
  }

  function restoreQuickEditState(snapshot, options) {
    if (!snapshot) return false;
    const opts = options || {};
    const el = ensureQuickEdit();
    const img = el.querySelector('[data-quick-edit-img]');
    applyQuickEditSnapshotState(snapshot);
    invalidateQuickEditRenderedPreview({ clearTimers: true });
    clearQuickEditCropShade();
    if (!opts.keepCurrentSource && img && (snapshot.sourceSrc || snapshot.src)) {
      setQuickEditImageSource(img, snapshot.sourceSrc || snapshot.src);
    }
    syncQuickEditControls();
    if (quickEditUsesRawDevelopPipeline()) {
      applyQuickEditPreview({ skipColorRender: true });
      scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
    } else {
      applyQuickEditPreview();
    }
    updateQuickEditCropOverlay();
    scheduleQuickEditHistogramRender(0);
    scheduleQuickEditCropShade();
    return true;
  }

  function undoQuickEditHistory() {
    if (!state.quickEdit.open) return false;
    const snapshot = state.quickEdit.history.pop();
    if (!snapshot) {
      showToast('没有可撤销的快速调整');
      return true;
    }
    restoreQuickEditState(snapshot);
    showToast('已撤销上一步调整');
    return true;
  }

  function quickEditParamsChanged() {
    const current = normalizeQuickEditParams(state.quickEdit.params || quickEditDefaultParams());
    const defaults = normalizeQuickEditParams(quickEditDefaultParams());
    return JSON.stringify(current) !== JSON.stringify(defaults);
  }

  function quickEditCommittedParamsChanged() {
    const committed = state.quickEdit.committedParams;
    if (!committed) return false;
    return JSON.stringify(normalizeQuickEditParams(committed)) !== JSON.stringify(normalizeQuickEditParams(quickEditDefaultParams()));
  }

  function hasQuickEditUnsavedChanges() {
    return quickEditParamsChanged()
      || quickEditCommittedParamsChanged()
      || !!quickEditFrameExportConfig(state.quickEdit.framePreset)
      || quickEditEnabledLuts().length > 0
      || (isQuickEditCropToolActive() && !!state.quickEdit.cropFrame)
      || (Array.isArray(state.quickEdit.history) && state.quickEdit.history.length > 0);
  }

  async function saveQuickEditCurrentChanges() {
    const cropFrame = isQuickEditCropToolActive() ? quickEditCropFrameRect() : null;
    const before = snapshotQuickEditState();
    console.info('[PicScannerCrop] confirm start', {
      photoId: Number(state.quickEdit.photo && state.quickEdit.photo.id || 0),
      batchMode: !!state.quickEdit.batchMode,
      cropActive: !!cropFrame,
      frame: cropFrame,
      effectiveParams: quickEditEffectiveParams(),
    });
    const committed = quickEditEffectiveParams();
    if (cropFrame) {
      const cropParams = quickEditCropParamsFromFrame(cropFrame);
      if (!cropParams) {
        console.error('[PicScannerCrop] confirm failed', { reason: 'crop transform unavailable', frame: cropFrame });
        showToast('裁切确认失败：无法换算图片坐标', 'error');
        return;
      }
      Object.assign(committed, cropParams);
    }
    state.quickEdit.history.push(before);
    if (state.quickEdit.history.length > 24) state.quickEdit.history.shift();
    const stage = captureQuickEditPixelStage(state.quickEdit.params, quickEditEnabledLuts());
    state.quickEdit.committedStages = (state.quickEdit.committedStages || []).concat([stage]);
    state.quickEdit.committedParams = normalizeQuickEditParams(committed);
    state.quickEdit.params = quickEditDefaultParams();
    quickEditSetLuts([]);
    state.quickEdit.bakedSource = false;
    state.quickEdit.activeTools = { crop: false, rotate: false };
    fitQuickEditCommittedOutput({ force: true });
    syncQuickEditControls();
    applyQuickEditPreview();
    updateQuickEditCropOverlay();
    scheduleQuickEditHistogramRender(0);
    if (state.quickEdit.batchMode) saveActiveBatchEditSession();
    console.info('[PicScannerCrop] confirm complete', {
      photoId: Number(state.quickEdit.photo && state.quickEdit.photo.id || 0),
      batchMode: !!state.quickEdit.batchMode,
      bakedSource: false,
      rawPreserved: quickEditIsRawPhoto(),
      cropExited: !isQuickEditCropToolActive(),
      paramsReset: JSON.stringify(normalizeQuickEditParams(state.quickEdit.params)) === JSON.stringify(normalizeQuickEditParams(quickEditDefaultParams())),
      committedStored: !!state.quickEdit.committedParams,
      committedStageCount: state.quickEdit.committedStages.length,
      sourcePreserved: !state.quickEdit.bakedSource,
      presentationFitted: true,
      presentationZoom: state.quickEdit.viewZoom,
      presentationPan: quickEditEffectivePan(),
    });
    showToast(cropFrame ? '裁切已确认' : '当前调整已确认');
  }

  function scheduleQuickEditCropShade() {
    clearQuickEditCropShade();
    if (!state.quickEdit.open || !isQuickEditCropToolActive()) return;
    state.quickEdit.shadeTimer = setTimeout(() => {
      const el = state.quickEdit.el;
      const overlay = el ? el.querySelector('[data-quick-edit-crop-overlay]') : null;
      if (overlay && state.quickEdit.open && !state.quickEdit.cropDrag) overlay.classList.add('shade-active');
    }, QUICK_EDIT_SHADE_DELAY_MS);
  }

  function quickEditMinimumZoomForCropFrame() {
    if (!isQuickEditCropToolActive()) return quickEditPresentationZoomBounds().min;
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const frame = quickEditCropFrameRect();
    if (!stage || !img || !frame) return quickEditPresentationZoomBounds().min;
    const params = quickEditEffectiveParams();
    const geometry = quickEditTransformedImageGeometry(params, {
      stage,
      img,
      zoom: 1,
      pan: { x: 0, y: 0 },
    });
    const outputFrame = geometry ? quickEditCropFrameForParams(params, geometry) : null;
    if (!outputFrame) return quickEditPresentationZoomBounds().min;
    return Math.max(
      0.0001,
      frame.w / Math.max(0.0001, outputFrame.w),
      frame.h / Math.max(0.0001, outputFrame.h),
    );
  }

  function resolveAnchoredZoomView(options) {
    const opts = options || {};
    const currentZoom = Math.max(0.0001, Number(opts.currentZoom || 1));
    const requestedZoom = Number(opts.nextZoom);
    const zoom = clamp(
      Number.isFinite(requestedZoom) ? requestedZoom : currentZoom,
      Number(opts.minZoom),
      Number(opts.maxZoom),
    );
    let panX = Number(opts.panX || 0);
    let panY = Number(opts.panY || 0);
    const anchorEvent = opts.anchorEvent;
    const stage = opts.stage;
    if (opts.resetPan) {
      panX = Number(opts.resetPanX || 0);
      panY = Number(opts.resetPanY || 0);
    } else if (opts.anchorCenter) {
      // 以画面中心为锚点：等比收缩平移，视觉上向中心缩放；
      // centerPullExponent > 1 时回中的拉力更明显
      const exponent = Number.isFinite(Number(opts.centerPullExponent))
        ? Math.max(1, Number(opts.centerPullExponent))
        : 1;
      const decay = Math.pow(zoom / currentZoom, exponent);
      panX *= decay;
      panY *= decay;
    } else if (anchorEvent && stage) {
      const rect = stage.getBoundingClientRect();
      const localX = anchorEvent.clientX - rect.left - rect.width / 2;
      const localY = anchorEvent.clientY - rect.top - rect.height / 2;
      const ratio = zoom / currentZoom;
      panX = localX - (localX - panX) * ratio;
      panY = localY - (localY - panY) * ratio;
    }
    const resetThreshold = Number(opts.resetAtOrBelowZoom);
    if (Number.isFinite(resetThreshold) && zoom <= resetThreshold) {
      panX = Number(opts.resetPanX || 0);
      panY = Number(opts.resetPanY || 0);
    }
    return { zoom, panX, panY };
  }

  function setQuickEditZoom(nextZoom, anchorEvent, options) {
    if (!state.quickEdit.open) return;
    const opts = options || {};
    const oldZoom = Number(state.quickEdit.viewZoom || 1);
    const oldPanX = Number(state.quickEdit.panX || 0);
    const oldPanY = Number(state.quickEdit.panY || 0);
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    const cropActive = isQuickEditCropToolActive();
    const zoomBounds = quickEditPresentationZoomBounds();
    const minimumZoom = cropActive ? quickEditMinimumZoomForCropFrame() : zoomBounds.min;
    const maximumZoom = Math.max(minimumZoom, zoomBounds.max);
    const view = resolveAnchoredZoomView({
      currentZoom: oldZoom,
      nextZoom,
      minZoom: minimumZoom,
      maxZoom: maximumZoom,
      panX: oldPanX,
      panY: oldPanY,
      anchorEvent,
      stage,
      resetPan: !!opts.resetPan,
      resetAtOrBelowZoom: cropActive ? null : zoomBounds.fit,
      resetPanX: zoomBounds.panX,
      resetPanY: zoomBounds.panY,
    });
    const zoom = view.zoom;
    state.quickEdit.viewZoom = zoom;
    state.quickEdit.panX = view.panX;
    state.quickEdit.panY = view.panY;
    const panChanged = Math.abs(Number(state.quickEdit.panX || 0) - oldPanX) > 0.01
      || Math.abs(Number(state.quickEdit.panY || 0) - oldPanY) > 0.01;
    if (Math.abs(zoom - oldZoom) < 0.0001 && !panChanged) return;
    if (stage) {
      stage.classList.add('zooming');
      clearTimeout(state.quickEdit.zoomTimer);
      state.quickEdit.zoomTimer = setTimeout(() => {
        stage.classList.remove('zooming');
        state.quickEdit.zoomTimer = null;
      }, 150);
    }
    clearQuickEditCropShade();
    applyQuickEditPreview({ skipColorRender: true });
    if (!isQuickEditAdvancedPixelNeutral(quickEditAdvancedPixelParams(quickEditEffectiveParams()))) {
      scheduleQuickEditPreviewRender({
        interactive: false,
        delayMs: QUICK_EDIT_ZOOM_SETTLE_RENDER_DELAY_MS,
      });
    }
    refreshQuickEditPanController();
    requestAnimationFrame(() => {
      if (isQuickEditCropToolActive()) {
        const pan = clampQuickEditPan(state.quickEdit.panX, state.quickEdit.panY);
        state.quickEdit.panX = pan.x;
        state.quickEdit.panY = pan.y;
        applyQuickEditPreview({ skipOverlay: true, skipColorRender: true });
      }
      updateQuickEditCropOverlay();
      scheduleQuickEditCropShade();
      refreshQuickEditPanController();
    });
  }

  function onQuickEditWheel(ev) {
    if (!state.quickEdit.open) return;
    ev.preventDefault();
    ev.stopPropagation();
    const factor = ev.deltaY < 0 ? LIGHTBOX_ZOOM_STEP : 1 / LIGHTBOX_ZOOM_STEP;
    setQuickEditZoom(state.quickEdit.viewZoom * factor, ev);
  }

  function onQuickEditDoubleClick(ev) {
    if (!state.quickEdit.open) return;
    ev.preventDefault();
    ev.stopPropagation();
    const zoomBounds = quickEditPresentationZoomBounds();
    setQuickEditZoom(zoomBounds.fit, null, { resetPan: true });
  }

  function setQuickEditRotation(value) {
    const committed = normalizeQuickEditParams(state.quickEdit.committedParams || quickEditDefaultParams());
    const next = normalizeQuickEditParams(state.quickEdit.params);
    next.rotation = normalizeQuickEditRotation(
      normalizeQuickEditRotation(value) - committed.rotation - committed.straighten,
    );
    next.straighten = 0;
    state.quickEdit.params = normalizeQuickEditParams(next);
    syncQuickEditControls();
    applyQuickEditPreview({ skipColorRender: true });
    requestAnimationFrame(() => {
      state.quickEdit.viewZoom = Math.max(state.quickEdit.viewZoom, quickEditMinimumZoomForCropFrame());
      const pan = clampQuickEditPan(state.quickEdit.panX, state.quickEdit.panY);
      state.quickEdit.panX = pan.x;
      state.quickEdit.panY = pan.y;
      applyQuickEditPreview({ skipOverlay: true, skipColorRender: true });
      updateQuickEditCropOverlay();
      scheduleQuickEditCropShade();
    });
  }

  function onQuickEditRotationPointerDown(ev) {
    if (ev.button !== 0 || !state.quickEdit.open) return;
    const ruler = ev.currentTarget;
    state.quickEdit.rotationDrag = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startRotation: quickEditEffectiveParams().rotation,
    };
    ruler.classList.add('dragging');
    try {
      ruler.setPointerCapture(ev.pointerId);
    } catch (err) {
      // Pointer capture can fail if the pointer is already released.
    }
    ev.preventDefault();
    ev.stopPropagation();
  }

  function onQuickEditRotationPointerMove(ev) {
    const drag = state.quickEdit.rotationDrag;
    if (!drag || drag.pointerId !== ev.pointerId) return;
    const dx = ev.clientX - drag.startX;
    setQuickEditRotation(drag.startRotation - dx / QUICK_EDIT_ROTATION_PX_PER_DEGREE);
    ev.preventDefault();
    ev.stopPropagation();
  }

  function endQuickEditRotationDrag(ev) {
    const drag = state.quickEdit.rotationDrag;
    if (!drag || drag.pointerId !== ev.pointerId) return;
    state.quickEdit.rotationDrag = null;
    ev.currentTarget.classList.remove('dragging');
    try {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    } catch (err) {
      // Pointer capture may already be released by the browser.
    }
    console.info('[PicScannerGeometry] rotation drag complete', {
      photoId: Number(state.quickEdit.photo && state.quickEdit.photo.id || 0),
      startRotation: drag.startRotation,
      rotation: quickEditEffectiveParams().rotation,
      frame: isQuickEditCropToolActive() ? quickEditCropFrameRect() : null,
      zoom: state.quickEdit.viewZoom,
    });
    scheduleQuickEditCropShade();
    ev.stopPropagation();
  }

  function onQuickEditRotationWheel(ev) {
    if (!state.quickEdit.open) return;
    ev.preventDefault();
    ev.stopPropagation();
    const current = quickEditEffectiveParams().rotation;
    setQuickEditRotation(current + (ev.deltaY < 0 ? 1 : -1));
  }

  function onQuickEditRotationKeydown(ev) {
    if (!state.quickEdit.open) return;
    const current = quickEditEffectiveParams().rotation;
    const step = ev.shiftKey ? 10 : 1;
    if (ev.key === 'ArrowLeft') {
      setQuickEditRotation(current - step);
    } else if (ev.key === 'ArrowRight') {
      setQuickEditRotation(current + step);
    } else if (ev.key === 'Home') {
      setQuickEditRotation(0);
    } else {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
  }

  function syncQuickEditControls() {
    const el = ensureQuickEdit();
    const params = normalizeQuickEditParams(state.quickEdit.params);
    const effectiveParams = quickEditEffectiveParams();
    state.quickEdit.params = params;
    const rawActive = quickEditIsRawPhoto();
    const rawPanel = el.querySelector('[data-quick-edit-raw-panel]');
    if (rawPanel) rawPanel.classList.toggle('hidden', !rawActive);
    const saveCurrent = el.querySelector('[data-quick-edit-save-current]');
    if (saveCurrent) {
      saveCurrent.disabled = false;
      saveCurrent.classList.remove('disabled');
      saveCurrent.title = rawActive ? '确认当前 RAW 预览调整' : '保存更改';
      saveCurrent.setAttribute('aria-disabled', 'false');
    }
    el.querySelectorAll('[data-quick-edit-range]').forEach((input) => {
      const key = String(input.dataset.quickEditRange || '');
      if (!key || !Object.prototype.hasOwnProperty.call(params, key)) return;
      input.value = String(params[key]);
    });
    el.querySelectorAll('[data-quick-edit-number]').forEach((input) => {
      const key = String(input.dataset.quickEditNumber || '');
      if (key === 'temperature') input.value = String(params.temperature);
    });
    const hslColor = quickEditHslColorConfig(state.quickEdit.hslColor);
    const hslActive = el.querySelector('[data-quick-edit-hsl-active]');
    if (hslActive) hslActive.textContent = hslColor.name;
    setQuickEditHslPickerActive(state.quickEdit.hslPickerActive);
    el.querySelectorAll('[data-quick-edit-hsl-color]').forEach((btn) => {
      const active = String(btn.dataset.quickEditHslColor || '') === hslColor.key;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    el.querySelectorAll('[data-quick-edit-hsl-range]').forEach((input) => {
      const field = String(input.dataset.quickEditHslRange || '');
      const key = quickEditHslParamKey(field);
      input.value = String(params[key] || 0);
      const track = quickEditHslRangeTrack(field, hslColor);
      if (track) input.style.setProperty('--quick-edit-hsl-track', track);
      else input.style.removeProperty('--quick-edit-hsl-track');
    });
    el.querySelectorAll('[data-quick-edit-hsl-value]').forEach((node) => {
      const field = String(node.dataset.quickEditHslValue || '');
      const key = quickEditHslParamKey(field);
      node.textContent = quickEditHslValueText(field, params[key]);
    });
    el.querySelectorAll('[data-quick-edit-value]').forEach((node) => {
      const key = String(node.dataset.quickEditValue || '');
      if (!key || !Object.prototype.hasOwnProperty.call(params, key)) return;
      node.textContent = quickEditValueText(key, key === 'rotation' ? effectiveParams[key] : params[key]);
    });
    syncQuickEditLutUi();
    syncQuickEditPanelTabs();
    syncQuickEditFrameUi();
    el.querySelectorAll('[data-quick-edit-tool]').forEach((btn) => {
      const key = String(btn.dataset.quickEditTool || '');
      const active = !!(state.quickEdit.activeTools && state.quickEdit.activeTools[key]);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    el.querySelectorAll('[data-quick-edit-histogram-mode]').forEach((btn) => {
      const active = String(btn.dataset.quickEditHistogramMode || '') === state.quickEdit.histogramMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const rgbLabel = el.querySelector('[data-quick-edit-rgb-label]');
    if (rgbLabel) rgbLabel.textContent = quickEditHistogramRgbLabel();
    el.querySelectorAll('[data-quick-edit-rgb-channel]').forEach((btn) => {
      const key = String(btn.dataset.quickEditRgbChannel || '');
      const checked = !!quickEditHistogramChannels()[key];
      btn.classList.toggle('active', checked);
      btn.setAttribute('aria-checked', checked ? 'true' : 'false');
    });
    setQuickEditHistogramMenuOpen(state.quickEdit.histogramMenuOpen);
    const rotationRuler = el.querySelector('[data-quick-edit-rotation-ruler]');
    if (rotationRuler) {
      rotationRuler.classList.toggle('hidden', !isQuickEditRotateToolActive());
      rotationRuler.style.setProperty(
        '--quick-edit-rotation-offset',
        (-effectiveParams.rotation * QUICK_EDIT_ROTATION_PX_PER_DEGREE).toFixed(2) + 'px',
      );
      rotationRuler.setAttribute('aria-valuenow', String(Math.round(effectiveParams.rotation)));
      rotationRuler.setAttribute('aria-valuetext', quickEditValueText('rotation', effectiveParams.rotation));
    }
    requestAnimationFrame(updateQuickEditCropOverlay);
    refreshQuickEditPanController();
    syncQuickEditCurvePanel();
    syncQuickEditSections();
  }

  function quickEditCropRect(params) {
    const clean = normalizeQuickEditParams(params);
    return {
      x: clean.cropLeft,
      y: clean.cropTop,
      w: Math.max(QUICK_EDIT_CROP_MIN_SIZE, 100 - clean.cropLeft - clean.cropRight),
      h: Math.max(QUICK_EDIT_CROP_MIN_SIZE, 100 - clean.cropTop - clean.cropBottom),
    };
  }

  function quickEditHasCropInsets(params) {
    const clean = normalizeQuickEditParams(params);
    return clean.cropTop > 0.000001
      || clean.cropRight > 0.000001
      || clean.cropBottom > 0.000001
      || clean.cropLeft > 0.000001;
  }

  function quickEditStageRect() {
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return null;
    return rect;
  }

  function quickEditCropStageBounds(stageRect) {
    const width = Math.max(1, Number(stageRect && stageRect.width || 0));
    const height = Math.max(1, Number(stageRect && stageRect.height || 0));
    const marginX = Math.min(QUICK_EDIT_CROP_STAGE_MARGIN, Math.max(0, (width - QUICK_EDIT_CROP_MIN_FRAME_PX) / 2));
    const marginY = Math.min(QUICK_EDIT_CROP_STAGE_MARGIN, Math.max(0, (height - QUICK_EDIT_CROP_MIN_FRAME_PX) / 2));
    return {
      left: marginX,
      top: marginY,
      right: width - marginX,
      bottom: height - marginY,
      width: Math.max(1, width - marginX * 2),
      height: Math.max(1, height - marginY * 2),
    };
  }

  function quickEditTransformedImageGeometry(params, options) {
    const opts = options || {};
    const el = state.quickEdit.el;
    const stage = opts.stage || (el ? el.querySelector('[data-quick-edit-stage]') : null);
    const img = opts.img || (el ? el.querySelector('[data-quick-edit-img]') : null);
    if (!stage || !img) return null;
    const displayBasis = quickEditDisplayBasisSize(img);
    if (displayBasis.width <= 1 || displayBasis.height <= 1) return null;
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 1 || stageRect.height <= 1) return null;
    const clean = normalizeQuickEditParams(params || quickEditEffectiveParams());
    const zoom = Math.max(0.0001, Number(opts.zoom === undefined ? state.quickEdit.viewZoom : opts.zoom));
    const pan = opts.pan || quickEditEffectivePan();
    const angle = (Number(clean.rotation || 0) + Number(clean.straighten || 0)) * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const unscaledWidth = Math.abs(cos) * displayBasis.width + Math.abs(sin) * displayBasis.height;
    const unscaledHeight = Math.abs(sin) * displayBasis.width + Math.abs(cos) * displayBasis.height;
    const recenterParams = opts.recenterParams || quickEditEffectiveParams();
    const transformed = quickEditGeometryApi().transformedGeometry({
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
      fullWidth: unscaledWidth,
      fullHeight: unscaledHeight,
      crop: quickEditCropRect(recenterParams),
      zoom,
      panX: Number(pan.x || 0),
      panY: Number(pan.y || 0),
      recenter: opts.recenter !== false,
    });
    const scaledWidth = Math.max(1, displayBasis.width * zoom);
    const scaledHeight = Math.max(1, displayBasis.height * zoom);
    return {
      x: transformed.x,
      y: transformed.y,
      w: transformed.w,
      h: transformed.h,
      centerX: transformed.centerX,
      centerY: transformed.centerY,
      angle,
      cos,
      sin,
      scaledWidth,
      scaledHeight,
      unscaledWidth,
      unscaledHeight,
      presentationOffsetX: transformed.offsetX,
      presentationOffsetY: transformed.offsetY,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
    };
  }

  function quickEditCropFrameForParams(params, geometry) {
    const crop = quickEditCropRect(params);
    return {
      x: geometry.x + crop.x / 100 * geometry.w,
      y: geometry.y + crop.y / 100 * geometry.h,
      w: crop.w / 100 * geometry.w,
      h: crop.h / 100 * geometry.h,
      stageWidth: geometry.stageWidth,
      stageHeight: geometry.stageHeight,
    };
  }

  function quickEditClipPathForFrame(frame, geometry) {
    if (!frame || !geometry) return '';
    const corners = [
      [frame.x, frame.y],
      [frame.x + frame.w, frame.y],
      [frame.x + frame.w, frame.y + frame.h],
      [frame.x, frame.y + frame.h],
    ];
    const points = corners.map(([x, y]) => {
      const dx = x - geometry.centerX;
      const dy = y - geometry.centerY;
      const localX = dx * geometry.cos + dy * geometry.sin;
      const localY = -dx * geometry.sin + dy * geometry.cos;
      return [
        clamp(50 + localX / geometry.scaledWidth * 100, 0, 100),
        clamp(50 + localY / geometry.scaledHeight * 100, 0, 100),
      ];
    });
    return 'polygon(' + points.map((point) => point[0].toFixed(4) + '% ' + point[1].toFixed(4) + '%').join(', ') + ')';
  }

  function storeQuickEditCropFrameRect(rect) {
    const stageRect = quickEditStageRect();
    if (!stageRect || !rect) return null;
    const width = Math.max(1, Number(rect.w || rect.width || 0));
    const height = Math.max(1, Number(rect.h || rect.height || 0));
    const x = Number(rect.x || 0);
    const y = Number(rect.y || 0);
    state.quickEdit.cropFrame = {
      width,
      height,
      offsetX: x - (stageRect.width - width) / 2,
      offsetY: y - (stageRect.height - height) / 2,
    };
    return state.quickEdit.cropFrame;
  }

  function quickEditOutputFitMetrics() {
    if (!state.quickEdit.open) return null;
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const stageRect = stage ? stage.getBoundingClientRect() : null;
    if (!stageRect || !img) return null;
    const displayBasis = quickEditDisplayBasisSize(img);
    if (displayBasis.width <= 1 || displayBasis.height <= 1) return null;
    const params = quickEditEffectiveParams();
    const geometry = quickEditTransformedImageGeometry(params, {
      stage,
      img,
      zoom: 1,
      pan: { x: 0, y: 0 },
    });
    if (!geometry) return null;
    const frame = quickEditCropFrameForParams(params, geometry);
    const bounds = quickEditCropStageBounds(stageRect);
    const frameConfig = isQuickEditCropToolActive() ? null : quickEditFrameExportConfig(state.quickEdit.framePreset);
    const insets = quickEditNormalizeFrameInsets(frameConfig ? frameConfig.insets : null);
    const basis = Math.max(1, Math.min(frame.w, frame.h));
    const frameLeft = basis * insets.left / 100;
    const frameRight = basis * insets.right / 100;
    const frameTop = basis * insets.top / 100;
    const frameBottom = basis * insets.bottom / 100;
    const outerWidth = frame.w + frameLeft + frameRight;
    const outerHeight = frame.h + frameTop + frameBottom;
    const scale = Math.max(0.0001, Math.min(
      bounds.width / Math.max(0.0001, outerWidth),
      bounds.height / Math.max(0.0001, outerHeight),
    ));
    return {
      params,
      frame,
      bounds,
      scale,
      panX: (frameLeft - frameRight) * scale / 2,
      panY: (frameTop - frameBottom) * scale / 2,
    };
  }

  function quickEditPresentationZoomBounds() {
    const metrics = quickEditOutputFitMetrics();
    const fitZoom = metrics ? metrics.scale : 1;
    return {
      fit: fitZoom,
      min: Math.max(0.0001, fitZoom * QUICK_EDIT_MIN_ZOOM),
      max: Math.max(0.0001, fitZoom * QUICK_EDIT_MAX_ZOOM),
      panX: metrics ? metrics.panX : 0,
      panY: metrics ? metrics.panY : 0,
    };
  }

  function fitQuickEditCommittedOutput(options) {
    const opts = options || {};
    if (!state.quickEdit.open || (isQuickEditCropToolActive() && !opts.force)) return false;
    const metrics = quickEditOutputFitMetrics();
    if (!metrics) return false;
    state.quickEdit.viewZoom = metrics.scale;
    state.quickEdit.panX = metrics.panX;
    state.quickEdit.panY = metrics.panY;
    if (!opts.preserveCropFrame) {
      state.quickEdit.cropFrame = null;
    }
    if (!opts.silent) {
      console.info('[PicScannerGeometry] committed output fitted', {
        photoId: Number(state.quickEdit.photo && state.quickEdit.photo.id || 0),
        rawSourcePreserved: quickEditIsRawPhoto(),
        crop: quickEditCropRect(metrics.params),
        rotation: Number(metrics.params.rotation || 0) + Number(metrics.params.straighten || 0),
        presentationZoom: metrics.scale,
        presentationPan: { x: state.quickEdit.panX, y: state.quickEdit.panY },
        outputFrame: metrics.frame,
      });
    }
    return true;
  }

  function quickEditCropFrameRect() {
    const stageRect = quickEditStageRect();
    if (!stageRect) return null;
    const bounds = quickEditCropStageBounds(stageRect);
    const frame = state.quickEdit.cropFrame || {};
    const minW = Math.min(QUICK_EDIT_CROP_MIN_FRAME_PX, bounds.width);
    const minH = Math.min(QUICK_EDIT_CROP_MIN_FRAME_PX, bounds.height);
    const width = clamp(Number(frame.width || bounds.width * 0.72), minW, bounds.width);
    const height = clamp(Number(frame.height || bounds.height * 0.62), minH, bounds.height);
    const rawX = (stageRect.width - width) / 2 + Number(frame.offsetX || 0);
    const rawY = (stageRect.height - height) / 2 + Number(frame.offsetY || 0);
    const x = clamp(rawX, bounds.left, bounds.right - width);
    const y = clamp(rawY, bounds.top, bounds.bottom - height);
    return {
      x,
      y,
      w: width,
      h: height,
      offsetX: x - (stageRect.width - width) / 2,
      offsetY: y - (stageRect.height - height) / 2,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
    };
  }

  function ensureQuickEditCenteredCropFrame(force) {
    if (!state.quickEdit.open || !isQuickEditCropToolActive()) return;
    if (!force && state.quickEdit.cropFrame) return;
    const stageRect = quickEditStageRect();
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const params = quickEditEffectiveParams();
    const geometry = quickEditTransformedImageGeometry(params, { img });
    if (!stageRect || !geometry) return;
    const bounds = quickEditCropStageBounds(stageRect);
    const desired = quickEditCropFrameForParams(params, geometry);
    const width = Math.min(bounds.width, desired.w);
    const height = Math.min(bounds.height, desired.h);
    storeQuickEditCropFrameRect({
      x: clamp(desired.x, bounds.left, bounds.right - width),
      y: clamp(desired.y, bounds.top, bounds.bottom - height),
      w: width,
      h: height,
    });
    applyQuickEditPreview({ skipOverlay: true, skipColorRender: true });
    updateQuickEditCropOverlay();
    const overlay = el ? el.querySelector('[data-quick-edit-crop-overlay]') : null;
    if (overlay) overlay.classList.add('shade-active');
  }

  function updateQuickEditCropOverlay() {
    const el = state.quickEdit.el;
    if (!el || !state.quickEdit.open || el.classList.contains('hidden')) return;
    const stage = el.querySelector('[data-quick-edit-stage]');
    const img = el.querySelector('[data-quick-edit-img]');
    const overlay = el.querySelector('[data-quick-edit-crop-overlay]');
    const box = el.querySelector('[data-quick-edit-crop-box]');
    if (!isQuickEditCropToolActive()) {
      if (overlay) overlay.classList.add('hidden');
      return;
    }
    if (!stage || !img || !overlay || !box || !PS.imageHasSource(img)) {
      if (overlay) overlay.classList.add('hidden');
      return;
    }
    const stageRect = stage.getBoundingClientRect();
    const frame = quickEditCropFrameRect();
    if (!frame) {
      overlay.classList.add('hidden');
      return;
    }
    overlay.classList.remove('hidden');
    overlay.style.left = '0px';
    overlay.style.top = '0px';
    overlay.style.width = stageRect.width.toFixed(2) + 'px';
    overlay.style.height = stageRect.height.toFixed(2) + 'px';

    box.style.left = frame.x.toFixed(2) + 'px';
    box.style.top = frame.y.toFixed(2) + 'px';
    box.style.width = frame.w.toFixed(2) + 'px';
    box.style.height = frame.h.toFixed(2) + 'px';
  }

  function quickEditClampByte(value) {
    return clamp(Math.round(Number(value || 0)), 0, 255);
  }

  function quickEditReadHistogramData(img, params) {
    const sample = document.createElement('canvas');
    const naturalWidth = Math.max(1, Number(img.naturalWidth || img.width || 1));
    const naturalHeight = Math.max(1, Number(img.naturalHeight || img.height || 1));
    const sampleMaxSide = Math.min(640, Math.max(naturalWidth, naturalHeight));
    const sampleScale = Math.min(1, sampleMaxSide / Math.max(naturalWidth, naturalHeight));
    const sampleWidth = Math.max(1, Math.round(naturalWidth * sampleScale));
    const sampleHeight = Math.max(1, Math.round(naturalHeight * sampleScale));
    sample.width = sampleWidth;
    sample.height = sampleHeight;
    const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
    if (!sampleCtx) throw new Error('无法创建直方图采样画布');
    sampleCtx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    const data = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight).data;
    applyQuickEditPixelStages(data, quickEditWorkerParams(params), sampleWidth, sampleHeight);
    const white = new Array(256).fill(0);
    const red = new Array(256).fill(0);
    const green = new Array(256).fill(0);
    const blue = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      red[r] += 1;
      green[g] += 1;
      blue[b] += 1;
      white[Math.round((r + g + b) / 3)] += 1;
    }
    return { white, red, green, blue };
  }

  function quickEditHistogramDisplayValues(values) {
    const source = Array.isArray(values) ? values : [];
    const smoothed = new Array(256).fill(0);
    for (let i = 0; i < 256; i += 1) {
      const prev2 = source[Math.max(0, i - 2)] || 0;
      const prev1 = source[Math.max(0, i - 1)] || 0;
      const current = source[i] || 0;
      const next1 = source[Math.min(255, i + 1)] || 0;
      const next2 = source[Math.min(255, i + 2)] || 0;
      smoothed[i] = (prev2 + prev1 * 2 + current * 3 + next1 * 2 + next2) / 9;
    }
    return smoothed;
  }

  function quickEditHistogramDisplayMax(series) {
    const values = [];
    series.forEach((items) => {
      if (!Array.isArray(items)) return;
      for (let i = 1; i < 255; i += 1) {
        const value = Number(items[i] || 0);
        if (value > 0) values.push(value);
      }
    });
    if (!values.length) return 1;
    values.sort((a, b) => a - b);
    const index = Math.min(values.length - 1, Math.floor(values.length * 0.985));
    return Math.max(1, values[index] * 1.12);
  }

  function quickEditHistogramRenderSignature(sourceSrc, params) {
    const clean = quickEditPixelParamsForCurrentSource(params);
    let signature = String(sourceSrc || '') + '|'
      + quickEditPixelSignature(params) + '|'
      + JSON.stringify({
        exposure: clean.exposure,
        saturation: clean.saturation,
        curvePoints: clean.curvePoints,
      });
    const modules = window.PicScannerModules;
    if (modules) {
      const stageSignature = modules.sourceSignature(quickEditCurrentSourceStageEntry());
      if (stageSignature) signature += '|ss:' + stageSignature;
    }
    return signature;
  }

  function drawQuickEditHistogramCanvas(ctx, width, height, histogram, mode, channelKeys) {
    const data = histogram || {};
    const channels = Array.isArray(channelKeys) && channelKeys.length ? channelKeys : ['red', 'green', 'blue'];
    const colors = {
      red: '#ff6b6b',
      green: '#62d6aa',
      blue: '#8ea8ff',
      white: '#f4f4f5',
    };
    const alpha = {
      red: 0.84,
      green: 0.84,
      blue: 0.88,
      white: 0.92,
    };
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#070708';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 4; x += 1) {
      const px = Math.round(x * width / 4) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
    const keys = mode === 'rgb' ? channels : ['white'];
    const displaySeries = {};
    keys.forEach((key) => {
      displaySeries[key] = quickEditHistogramDisplayValues(data[key]);
    });
    const max = quickEditHistogramDisplayMax(keys.map((key) => displaySeries[key]));
    const drawCurve = (values, color, curveAlpha) => {
      if (!values) return;
      ctx.beginPath();
      for (let i = 0; i < 256; i += 1) {
        const x = i / 255 * (width - 1);
        const y = height - Math.sqrt(Math.min(1, values[i] / max)) * (height - 8) - 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = curveAlpha;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    if (mode === 'rgb') {
      channels.forEach((key) => drawCurve(displaySeries[key], colors[key], alpha[key]));
    } else {
      drawCurve(displaySeries.white, colors.white, alpha.white);
    }
  }

  function scheduleQuickEditHistogramRender(delay) {
    clearTimeout(state.quickEdit.histogramRenderTimer);
    state.quickEdit.histogramRenderTimer = setTimeout(() => {
      state.quickEdit.histogramRenderTimer = null;
      renderQuickEditHistogram();
    }, Math.max(0, Number(delay || 0)));
  }

  async function renderQuickEditHistogram() {
    const el = state.quickEdit.el;
    if (!el || !state.quickEdit.open) return;
    const img = el.querySelector('[data-quick-edit-img]');
    const canvas = el.querySelector('[data-quick-edit-histogram]');
    const empty = el.querySelector('[data-quick-edit-histogram-empty]');
    const sourceSrc = state.quickEdit.sourceSrc || (img && PS.imageHasSource(img) ? img.src : '');
    if (!img || !canvas || !sourceSrc) {
      state.quickEdit.histogramData = null;
      if (empty) empty.classList.remove('hidden');
      syncQuickEditCurvePanel();
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const params = quickEditEffectiveParams();
    const renderSignature = quickEditHistogramRenderSignature(sourceSrc, params);
    const token = ++state.quickEdit.histogramRenderToken;
    try {
      let source = await loadQuickEditSourceImage(sourceSrc);
      const stageEntry = quickEditCurrentSourceStageEntry();
      if (stageEntry && typeof createImageBitmap === 'function') {
        const rawBitmap = await createImageBitmap(source);
        const stageResult = await window.PicScannerModules.applySourceStages(rawBitmap, stageEntry, { maxSide: 640 });
        if (stageResult && stageResult.bitmap) source = stageResult.bitmap;
      }
      if (
        token !== state.quickEdit.histogramRenderToken
        || sourceSrc !== state.quickEdit.sourceSrc
        || renderSignature !== quickEditHistogramRenderSignature(state.quickEdit.sourceSrc, quickEditEffectiveParams())
        || !state.quickEdit.open
      ) return;
      const histogram = quickEditReadHistogramData(source, params);
      state.quickEdit.histogramData = Object.assign({}, histogram, {
        mode: state.quickEdit.histogramMode,
        channels: quickEditHistogramChannelKeys(),
      });
      if (empty) empty.classList.add('hidden');
      drawQuickEditHistogramCanvas(ctx, width, height, histogram, state.quickEdit.histogramMode, quickEditHistogramChannelKeys());
      syncQuickEditCurvePanel();
    } catch (err) {
      state.quickEdit.histogramData = null;
      ctx.clearRect(0, 0, width, height);
      if (empty) empty.classList.remove('hidden');
      syncQuickEditCurvePanel();
      console.warn('[PicScanner] 快速调整直方图读取失败', err);
    }
  }

  function quickEditCropDragMode(target, box) {
    const handle = target && target.closest ? target.closest('[data-quick-edit-crop-handle]') : null;
    if (handle && box && box.contains(handle)) return String(handle.dataset.quickEditCropHandle || '');
    if (box && box.contains(target)) return 'image';
    return 'image';
  }

  function setQuickEditCropFrameRect(rect) {
    const stageRect = quickEditStageRect();
    if (!stageRect) return;
    const bounds = quickEditCropStageBounds(stageRect);
    const raw = rect || {};
    const minW = Math.min(QUICK_EDIT_CROP_MIN_FRAME_PX, bounds.width);
    const minH = Math.min(QUICK_EDIT_CROP_MIN_FRAME_PX, bounds.height);
    const width = clamp(Number(raw.w || raw.width || 0), minW, bounds.width);
    const height = clamp(Number(raw.h || raw.height || 0), minH, bounds.height);
    const x = clamp(Number(raw.x || 0), bounds.left, bounds.right - width);
    const y = clamp(Number(raw.y || 0), bounds.top, bounds.bottom - height);
    storeQuickEditCropFrameRect({ x, y, w: width, h: height });
    updateQuickEditCropOverlay();
    scheduleQuickEditCropShade();
  }

  function centerQuickEditCropFrameWithAnimation() {
    const frame = quickEditCropFrameRect();
    const stageRect = quickEditStageRect();
    if (!frame || !stageRect) return;
    const currentCenterX = frame.x + frame.w / 2;
    const currentCenterY = frame.y + frame.h / 2;
    const bounds = quickEditCropStageBounds(stageRect);
    const targetX = clamp(stageRect.width / 2, bounds.left + frame.w / 2, bounds.right - frame.w / 2);
    const targetY = clamp(stageRect.height / 2, bounds.top + frame.h / 2, bounds.bottom - frame.h / 2);
    const dx = targetX - currentCenterX;
    const dy = targetY - currentCenterY;
    const el = state.quickEdit.el;
    const overlay = el ? el.querySelector('[data-quick-edit-crop-overlay]') : null;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    if (overlay) overlay.classList.add('centering');
    if (stage) stage.classList.add('settling');
    storeQuickEditCropFrameRect({
      x: frame.x + dx,
      y: frame.y + dy,
      w: frame.w,
      h: frame.h,
    });
    state.quickEdit.viewZoom = Math.max(state.quickEdit.viewZoom, quickEditMinimumZoomForCropFrame());
    applyQuickEditPreview({ skipOverlay: true, skipColorRender: true });
    updateQuickEditCropOverlay();
    const pan = clampQuickEditPan(state.quickEdit.panX + dx, state.quickEdit.panY + dy);
    state.quickEdit.panX = pan.x;
    state.quickEdit.panY = pan.y;
    applyQuickEditPreview({ skipOverlay: true, skipColorRender: true });
    setTimeout(() => {
      if (overlay) overlay.classList.remove('centering');
      if (stage) stage.classList.remove('settling');
    }, 260);
  }

  function clampQuickEditPan(x, y) {
    const raw = { x: Number(x || 0), y: Number(y || 0) };
    if (!isQuickEditCropToolActive()) return raw;
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const frame = quickEditCropFrameRect();
    if (!stage || !img || !frame) return raw;
    const params = quickEditEffectiveParams();
    const geometry = quickEditTransformedImageGeometry(params, {
      stage,
      img,
      zoom: state.quickEdit.viewZoom,
      pan: { x: 0, y: 0 },
    });
    const outputFrame = geometry ? quickEditCropFrameForParams(params, geometry) : null;
    if (!outputFrame) return raw;
    const minX = frame.x + frame.w - outputFrame.x - outputFrame.w;
    const maxX = frame.x - outputFrame.x;
    const minY = frame.y + frame.h - outputFrame.y - outputFrame.h;
    const maxY = frame.y - outputFrame.y;
    return {
      x: clamp(raw.x, Math.min(minX, maxX), Math.max(minX, maxX)),
      y: clamp(raw.y, Math.min(minY, maxY), Math.max(minY, maxY)),
    };
  }

  function onQuickEditCropPointerDown(ev) {
    if (ev.button !== 0) return;
    const el = state.quickEdit.el;
    if (!el || !state.quickEdit.open) return;
    const overlay = el.querySelector('[data-quick-edit-crop-overlay]');
    const box = el.querySelector('[data-quick-edit-crop-box]');
    const mode = quickEditCropDragMode(ev.target, box);
    if (!overlay || !box || !mode) return;
    const overlayRect = overlay.getBoundingClientRect();
    if (overlayRect.width <= 1 || overlayRect.height <= 1) return;
    const startRect = quickEditCropFrameRect();
    const params = quickEditEffectiveParams();
    const geometry = quickEditTransformedImageGeometry(params);
    if (!startRect || !geometry) return;
    const outputFrame = quickEditCropFrameForParams(params, geometry);
    state.quickEdit.cropDrag = {
      mode,
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      overlayWidth: overlayRect.width,
      overlayHeight: overlayRect.height,
      startRect,
      startPanX: state.quickEdit.panX,
      startPanY: state.quickEdit.panY,
      startZoom: state.quickEdit.viewZoom,
      startOutputCenterX: outputFrame.x + outputFrame.w / 2,
      startOutputCenterY: outputFrame.y + outputFrame.h / 2,
      minWidth: Math.max(QUICK_EDIT_CROP_MIN_FRAME_PX, outputFrame.w * QUICK_EDIT_CROP_MIN_SIZE / 100),
      minHeight: Math.max(QUICK_EDIT_CROP_MIN_FRAME_PX, outputFrame.h * QUICK_EDIT_CROP_MIN_SIZE / 100),
    };
    clearQuickEditCropShade();
    overlay.classList.add('dragging');
    try {
      overlay.setPointerCapture(ev.pointerId);
    } catch (err) {
      // Pointer capture can fail if the pointer is already released.
    }
    ev.preventDefault();
    ev.stopPropagation();
  }

  function quickEditCropResizeAnchor(rect, mode) {
    return {
      x: mode.includes('w') ? rect.x + rect.w : (mode.includes('e') ? rect.x : rect.x + rect.w / 2),
      y: mode.includes('n') ? rect.y + rect.h : (mode.includes('s') ? rect.y : rect.y + rect.h / 2),
    };
  }

  function quickEditScaleRectAroundAnchor(rect, anchor, scale) {
    const left = anchor.x + (rect.x - anchor.x) * scale;
    const top = anchor.y + (rect.y - anchor.y) * scale;
    const right = anchor.x + (rect.x + rect.w - anchor.x) * scale;
    const bottom = anchor.y + (rect.y + rect.h - anchor.y) * scale;
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  function quickEditCropAutoFitScale(rect, anchor, bounds) {
    let scale = 1;
    if (rect.x < bounds.left && anchor.x > rect.x) {
      scale = Math.min(scale, (anchor.x - bounds.left) / (anchor.x - rect.x));
    }
    if (rect.x + rect.w > bounds.right && rect.x + rect.w > anchor.x) {
      scale = Math.min(scale, (bounds.right - anchor.x) / (rect.x + rect.w - anchor.x));
    }
    if (rect.y < bounds.top && anchor.y > rect.y) {
      scale = Math.min(scale, (anchor.y - bounds.top) / (anchor.y - rect.y));
    }
    if (rect.y + rect.h > bounds.bottom && rect.y + rect.h > anchor.y) {
      scale = Math.min(scale, (bounds.bottom - anchor.y) / (rect.y + rect.h - anchor.y));
    }
    return clamp(scale, 0.0001, 1);
  }

  function resizedQuickEditCropFrame(startRect, mode, dx, dy, minWidth, minHeight) {
    let left = startRect.x;
    let top = startRect.y;
    let right = startRect.x + startRect.w;
    let bottom = startRect.y + startRect.h;

    if (mode === 'image') {
      return { x: left, y: top, w: startRect.w, h: startRect.h };
    }

    if (mode.includes('w')) left = Math.min(left + dx, right - minWidth);
    if (mode.includes('e')) right = Math.max(right + dx, left + minWidth);
    if (mode.includes('n')) top = Math.min(top + dy, bottom - minHeight);
    if (mode.includes('s')) bottom = Math.max(bottom + dy, top + minHeight);
    const desired = {
      x: left,
      y: top,
      w: right - left,
      h: bottom - top,
    };
    const anchor = quickEditCropResizeAnchor(startRect, mode);
    const bounds = quickEditCropStageBounds({ width: startRect.stageWidth, height: startRect.stageHeight });
    return {
      desired,
      anchor,
      scale: quickEditCropAutoFitScale(desired, anchor, bounds),
    };
  }

  function onQuickEditCropPointerMove(ev) {
    const drag = state.quickEdit.cropDrag;
    if (!drag || drag.pointerId !== ev.pointerId) return;
    if (drag.mode === 'image') {
      const pan = clampQuickEditPan(
        drag.startPanX + ev.clientX - drag.startX,
        drag.startPanY + ev.clientY - drag.startY,
      );
      state.quickEdit.panX = pan.x;
      state.quickEdit.panY = pan.y;
      applyQuickEditPreview({ skipOverlay: true, skipColorRender: true });
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    const resized = resizedQuickEditCropFrame(
      drag.startRect,
      drag.mode,
      ev.clientX - drag.startX,
      ev.clientY - drag.startY,
      drag.minWidth,
      drag.minHeight,
    );
    const scale = resized.scale;
    const nextFrame = quickEditScaleRectAroundAnchor(resized.desired, resized.anchor, scale);
    const nextOutputCenterX = resized.anchor.x + (drag.startOutputCenterX - resized.anchor.x) * scale;
    const nextOutputCenterY = resized.anchor.y + (drag.startOutputCenterY - resized.anchor.y) * scale;
    state.quickEdit.viewZoom = Math.max(0.0001, drag.startZoom * scale);
    state.quickEdit.panX = nextOutputCenterX - drag.startRect.stageWidth / 2;
    state.quickEdit.panY = nextOutputCenterY - drag.startRect.stageHeight / 2;
    setQuickEditCropFrameRect(nextFrame);
    state.quickEdit.viewZoom = Math.max(state.quickEdit.viewZoom, quickEditMinimumZoomForCropFrame());
    const pan = clampQuickEditPan(state.quickEdit.panX, state.quickEdit.panY);
    state.quickEdit.panX = pan.x;
    state.quickEdit.panY = pan.y;
    applyQuickEditPreview({ skipOverlay: true, skipColorRender: true });
    updateQuickEditCropOverlay();
    ev.preventDefault();
    ev.stopPropagation();
  }

  function endQuickEditCropDrag(ev) {
    const drag = state.quickEdit.cropDrag;
    if (!drag || drag.pointerId !== ev.pointerId) return;
    state.quickEdit.cropDrag = null;
    const el = state.quickEdit.el;
    const overlay = el ? el.querySelector('[data-quick-edit-crop-overlay]') : null;
    if (overlay) {
      overlay.classList.remove('dragging');
      try {
        overlay.releasePointerCapture(ev.pointerId);
      } catch (err) {
        // Pointer capture may already be released by the browser.
      }
    }
    if (drag.mode !== 'image') centerQuickEditCropFrameWithAnimation();
    console.info('[PicScannerGeometry] crop drag complete', {
      photoId: Number(state.quickEdit.photo && state.quickEdit.photo.id || 0),
      mode: drag.mode,
      frame: quickEditCropFrameRect(),
      zoom: state.quickEdit.viewZoom,
      pan: quickEditEffectivePan(),
    });
    scheduleQuickEditCropShade();
    ev.stopPropagation();
  }

  function quickEditResolutionText(maxSide) {
    const value = Number(maxSide || 0);
    if (!Number.isFinite(value) || value <= 0 || value === Number.MAX_SAFE_INTEGER) return '';
    return Math.round(value) + 'px';
  }

  function quickEditRenderedStatusText() {
    const renderedMaxSide = Number(state.quickEdit.previewRenderedMaxSide || 0);
    if (renderedMaxSide === Number.MAX_SAFE_INTEGER) return '原图（高分辨率）';
    if (renderedMaxSide > 0) {
      const resolution = quickEditResolutionText(renderedMaxSide);
      if (renderedMaxSide <= QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE) return '低分辨率预览' + (resolution ? ' · ' + resolution : '');
      if (renderedMaxSide > QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE) return '原图级预览' + (resolution ? ' · ' + resolution : '');
      return '高分辨率预览' + (resolution ? ' · ' + resolution : '');
    }
    return '';
  }

  function quickEditAdjustmentLevelText(value) {
    const number = Number(value || 0);
    if (number <= 0) return '';
    if (number < 34) return '轻微';
    if (number < 67) return '中等';
    return '强';
  }

  function quickEditRawDevelopStatusDetail() {
    const params = quickEditRawDevelopParams(quickEditEffectiveParams());
    const parts = [];
    const recoveryLevel = quickEditAdjustmentLevelText(params.rawHighlightRecovery);
    const noiseLevel = quickEditAdjustmentLevelText(params.rawNoiseReduction);
    if (recoveryLevel) parts.push('RAW 高光恢复' + recoveryLevel);
    if (noiseLevel) parts.push('RAW 降噪' + noiseLevel);
    return parts.join(' / ') || 'RAW 显影';
  }

  function quickEditRawResolutionStatusText(maxSide, prefix) {
    const value = Number(maxSide || 0);
    const detail = quickEditRawDevelopStatusDetail();
    if (value <= 0) return prefix + '原图级预览 · ' + detail;
    const resolution = quickEditResolutionText(value);
    return prefix + '中等分辨率预览' + (resolution ? ' · ' + resolution : '') + ' · ' + detail;
  }

  function quickEditRawCurrentStatusText() {
    const signature = String(state.quickEdit.rawPreviewSignature || '');
    if (!signature) return 'RAW 预览';
    if (signature.endsWith('|preview|0')) return quickEditRawResolutionStatusText(0, 'RAW ');
    return quickEditRawResolutionStatusText(Number(state.quickEdit.rawPreviewRenderedMaxSide || 0), 'RAW ');
  }

  function quickEditPreviewStatus(photo, mode) {
    if (mode === 'rendering') {
      const pendingMaxSide = Number(state.quickEdit.previewRenderPendingMaxSide || 0);
      const resolution = quickEditResolutionText(pendingMaxSide);
      if (pendingMaxSide > 0 && pendingMaxSide <= QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE) {
        return '正在渲染低分辨率预览' + (resolution ? ' · ' + resolution : '');
      }
      if (pendingMaxSide > QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE) {
        return '正在渲染原图级预览' + (resolution ? ' · ' + resolution : '');
      }
      if (pendingMaxSide > 0) return '正在渲染高分辨率预览' + (resolution ? ' · ' + resolution : '');
      return '正在准备渲染预览';
    }
    if (mode === 'loading') return '生成预览中...';
    if (mode === 'raw-developing' || state.quickEdit.rawPreviewLoading) {
      return quickEditRawResolutionStatusText(Number(state.quickEdit.rawPreviewPendingMaxSide || 0), '正在渲染');
    }
    if (mode === 'error') return '预览失败';
    const rendered = quickEditRenderedStatusText();
    if (photo && photo.is_raw && state.quickEdit.rawPreviewSignature) {
      if (rendered && rendered !== '原图（高分辨率）') return rendered;
      return quickEditRawCurrentStatusText();
    }
    if (rendered) return rendered;
    if (photo && photo.is_raw) return quickEditRawCurrentStatusText();
    if (mode === 'thumbnail') return '缩略图预览';
    return '原图（高分辨率）';
  }

  function renderQuickEditMeta(photo, mode) {
    const el = ensureQuickEdit();
    const current = photo || {};
    const filename = el.querySelector('[data-quick-edit-filename]');
    const format = el.querySelector('[data-quick-edit-format]');
    const status = el.querySelector('[data-quick-edit-status]');
    if (filename) filename.textContent = current.filename || current.relative_path || '未命名照片';
    if (format) {
      format.textContent = [current.format_label || current.format || '', current.size_text || '']
        .filter(Boolean)
        .join(' · ');
    }
    if (status) status.textContent = quickEditPreviewStatus(current, state.quickEdit.previewRendering ? 'rendering' : mode);
  }

  function setQuickEditPreviewRendering(rendering) {
    state.quickEdit.previewRendering = !!rendering;
    const el = state.quickEdit.el;
    const status = el ? el.querySelector('[data-quick-edit-status]') : null;
    if (!status) return;
    const photo = state.quickEdit.photo || {};
    status.textContent = quickEditPreviewStatus(photo, state.quickEdit.previewRendering ? 'rendering' : 'ready');
  }

  function setQuickEditLoading(loading) {
    const el = ensureQuickEdit();
    const stage = el.querySelector('[data-quick-edit-stage]');
    if (stage) stage.classList.toggle('loading', !!loading);
  }

  function syncQuickEditOutputMask(frame) {
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    const mask = el ? el.querySelector('[data-quick-edit-output-mask]') : null;
    if (!stage || !mask || !frame || frame.w <= 0 || frame.h <= 0) {
      if (mask) mask.classList.add('hidden');
      return;
    }
    const stageWidth = Math.max(1, stage.clientWidth);
    const stageHeight = Math.max(1, stage.clientHeight);
    const left = clamp(Number(frame.x || 0), 0, stageWidth);
    const top = clamp(Number(frame.y || 0), 0, stageHeight);
    const right = clamp(left + Number(frame.w || 0), left, stageWidth);
    const bottom = clamp(top + Number(frame.h || 0), top, stageHeight);
    const sides = {
      top: { left: 0, top: 0, width: stageWidth, height: top },
      right: { left: right, top, width: stageWidth - right, height: bottom - top },
      bottom: { left: 0, top: bottom, width: stageWidth, height: stageHeight - bottom },
      left: { left: 0, top, width: left, height: bottom - top },
    };
    Object.keys(sides).forEach((key) => {
      const node = mask.querySelector('[data-quick-edit-output-mask-side="' + key + '"]');
      const rect = sides[key];
      if (!node) return;
      node.style.left = rect.left.toFixed(2) + 'px';
      node.style.top = rect.top.toFixed(2) + 'px';
      node.style.width = Math.max(0, rect.width).toFixed(2) + 'px';
      node.style.height = Math.max(0, rect.height).toFixed(2) + 'px';
    });
    mask.classList.remove('hidden');
  }

  function applyQuickEditPreview(options) {
    const opts = options || {};
    const el = ensureQuickEdit();
    const img = el.querySelector('[data-quick-edit-img]');
    if (!img) return;
    enforceQuickEditDisplayBasis(img);
    const compareImg = el.querySelector('[data-quick-edit-compare-img]');
    const visualLayer = el.querySelector('[data-quick-edit-visual-layer]');
    const stage = el.querySelector('[data-quick-edit-stage]');
    const params = quickEditEffectiveParams();
    const pan = quickEditEffectivePan();
    const angle = params.rotation + params.straighten;
    const clipParams = params;
    const presentationGeometry = quickEditTransformedImageGeometry(params, {
      stage,
      img,
      zoom: 1,
      pan: { x: 0, y: 0 },
      recenterParams: clipParams,
    });
    const offsetX = Number(presentationGeometry && presentationGeometry.presentationOffsetX || 0);
    const offsetY = Number(presentationGeometry && presentationGeometry.presentationOffsetY || 0);
    const viewTransform = 'translate(' + pan.x.toFixed(2) + 'px, ' + pan.y.toFixed(2) + 'px) '
      + 'scale(' + state.quickEdit.viewZoom.toFixed(4) + ') '
      + 'translate(' + (-offsetX).toFixed(2) + 'px, ' + (-offsetY).toFixed(2) + 'px)';
    if (visualLayer) visualLayer.style.transform = viewTransform;
    img.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';
    img.style.filter = 'none';
    const committedCropVisible = quickEditHasCropInsets(clipParams);
    const geometry = committedCropVisible ? quickEditTransformedImageGeometry(params, {
      stage,
      img,
      zoom: 1,
      pan: { x: 0, y: 0 },
      recenter: false,
    }) : null;
    const committedFrame = geometry ? quickEditCropFrameForParams(clipParams, geometry) : null;
    img.style.clipPath = committedCropVisible ? quickEditClipPathForFrame(committedFrame, geometry) : '';
    syncQuickEditOutputMask(null);
    if (compareImg) {
      compareImg.style.width = img.style.width || '';
      compareImg.style.height = img.style.height || '';
      compareImg.style.aspectRatio = img.style.aspectRatio || '';
      compareImg.style.transform = img.style.transform;
      compareImg.style.filter = 'none';
      compareImg.style.clipPath = img.style.clipPath;
    }
    syncQuickEditFramePreview();
    if (!opts.skipColorRender) {
      const interactive = !!opts.interactive && quickEditShouldUseLowResolutionInteractive(params);
      scheduleQuickEditPreviewRender({
        interactive,
        delayMs: opts.interactive && !interactive ? 45 : undefined,
      });
    }
    if (!opts.skipOverlay) requestAnimationFrame(updateQuickEditCropOverlay);
  }

  function captureQuickEditObservation(options) {
    const opts = options || {};
    const maxSide = Math.max(320, Math.min(1600, Number(opts.maxSide || 1024)));
    const timeoutMs = Math.max(2000, Math.min(20000, Number(opts.timeoutMs || 12000)));
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const photoId = Number(state.quickEdit.photo && state.quickEdit.photo.id || 0);
    const sourceSrc = String(state.quickEdit.sourceSrc || '');
    if (!state.quickEdit.open || !img || !photoId || !sourceSrc) {
      return Promise.reject(new Error('当前照片尚未进入可观察的快速调整状态'));
    }

    const params = quickEditEffectiveParams();
    const expectedSignature = quickEditRenderSignature(sourceSrc, quickEditPixelSignature(params));
    clearTimeout(state.quickEdit.previewRenderTimer);
    state.quickEdit.previewRenderTimer = null;
    renderQuickEditAdjustedPreview({
      maxSide,
      quality: 0.9,
      qualityKey: 'agent-observation',
      interactive: false,
    });

    const startedAt = Date.now();
    return new Promise((resolve, reject) => {
      function fail(message) {
        const details = {
          photoId,
          expectedSignature,
          requestedSignature: String(state.quickEdit.previewRenderRequestSignature || ''),
          renderedSignature: String(state.quickEdit.previewRenderedSignature || ''),
          pendingSignature: String(state.quickEdit.previewRenderPendingSignature || ''),
          rendering: !!state.quickEdit.previewRendering,
        };
        console.error('[AiEditAgent] 观察图生成失败', details);
        reject(new Error(message));
      }

      function capture() {
        try {
          const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('无法创建观察图画布上下文');
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          if (!dataUrl.startsWith('data:image/')) throw new Error('观察图编码结果无效');
          resolve(dataUrl);
        } catch (err) {
          fail(err && err.message ? err.message : String(err));
        }
      }

      function check() {
        if (!state.quickEdit.open || Number(state.quickEdit.photo && state.quickEdit.photo.id || 0) !== photoId) {
          fail('Agent 运行期间当前照片已变化');
          return;
        }
        const currentSignature = quickEditRenderSignature(
          String(state.quickEdit.sourceSrc || ''),
          quickEditPixelSignature(quickEditEffectiveParams()),
        );
        if (currentSignature !== expectedSignature) {
          fail('Agent 运行期间调整参数已被其他操作修改');
          return;
        }
        if (
          String(state.quickEdit.previewRenderedSignature || '') === expectedSignature
          && !state.quickEdit.previewRendering
          && img.complete
          && img.naturalWidth > 0
          && img.naturalHeight > 0
        ) {
          requestAnimationFrame(capture);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          fail('等待目标参数对应的预览渲染超时');
          return;
        }
        setTimeout(check, 40);
      }

      check();
    });
  }

  function loadQuickEditPreview(photo) {
    const el = ensureQuickEdit();
    const img = el.querySelector('[data-quick-edit-img]');
    if (!img || !photo) return;
    const token = ++state.quickEdit.loadToken;
    const photoId = Number(photo.id || 0);
    const cachedPhoto = state.photoCache.get(photoId) || photo;
    const url = quickEditSourceUrl(photo, cachedPhoto);
    const previewUrl = (photo && photo.preview_url) || (cachedPhoto && cachedPhoto.preview_url) || '';
    const previewable = !!(photo.previewable || cachedPhoto.previewable);
    const isCurrent = () => (
      state.quickEdit.open
      && token === state.quickEdit.loadToken
      && state.quickEdit.photo
      && Number(state.quickEdit.photo.id || 0) === photoId
    );

    img.alt = photo.filename || '';
    if (quickEditIsRawPhoto(cachedPhoto)) {
      const request = quickEditRawPreviewRequest({ maxSide: QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE });
      const cachedRaw = request
        ? cachedQuickEditRawPreview(photoId, request.rawSignature, request.maxSide)
        : null;
      if (cachedRaw && displayCachedQuickEditRawPreview(cachedRaw, img)) {
        if (Number(cachedRaw.maxSide || 0) > 0) {
          scheduleQuickEditRawOriginalDevelopPreview(request.rawSignature);
        }
        return;
      }
      revokeQuickEditPreviewObjectUrl();
      state.quickEdit.sourceSrc = '';
      state.quickEdit.sourceImageSrc = '';
      state.quickEdit.sourceImage = null;
      state.quickEdit.sourceImagePromise = null;
      img.removeAttribute('src');
      setQuickEditRawPreviewLoading(true);
      renderQuickEditMeta(cachedPhoto, 'raw-developing');
      applyQuickEditPreview({ skipColorRender: true });
      scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
      return;
    }
    if (url) {
      setQuickEditImageSource(img, url);
      setQuickEditLoading(false);
      renderQuickEditMeta(cachedPhoto, 'ready');
      applyQuickEditPreview();
      return;
    }
    if (previewUrl) {
      setQuickEditImageSource(img, previewUrl);
      renderQuickEditMeta(cachedPhoto, 'thumbnail');
    } else {
      state.quickEdit.sourceSrc = '';
      img.removeAttribute('src');
      renderQuickEditMeta(cachedPhoto, 'loading');
    }
    applyQuickEditPreview();

    if (!previewable || !photoId) {
      setQuickEditLoading(false);
      renderQuickEditMeta(cachedPhoto, 'error');
      showToast('这张照片暂时无法预览调整', 'error');
      return;
    }

    setQuickEditLoading(true);
    call('get_photo_lightbox_preview', photoId).then((res) => {
      if (!isCurrent()) return;
      const loadedUrl = res && res.photo ? (res.photo.lightbox_url || res.photo.original_url || '') : '';
      if (!res || !res.success || !res.photo || !loadedUrl) {
        throw new Error(res && res.message ? res.message : '无法生成高清预览');
      }
      const merged = PS.mergeLightboxCachePhoto(photoId, PS.mergePhotoPreserve(cachedPhoto, res.photo));
      state.quickEdit.photo = merged;
      renderQuickEditMeta(merged, 'ready');
      loadQuickEditPreview(merged);
    }).catch((err) => {
      if (!isCurrent()) return;
      setQuickEditLoading(false);
      renderQuickEditMeta(cachedPhoto, 'error');
      console.warn('[PicScanner] 快速调整预览生成失败', {
        photoId,
        filename: photo.filename || '',
        path: photo.path || '',
        error: err,
      });
      showToast('预览生成失败，详情见控制台', 'error');
    });
  }

  function cancelQuickEditPicking() {
    if (!state.quickEdit.picking) return;
    state.quickEdit.picking = false;
    if (els.gallery) els.gallery.classList.remove('quick-edit-picking');
    // P1：通知 Vue 同步。Q/Esc 取消不经过 openQuickEdit（那里有自己的 notifyVue），
    // PhotoGrid 的高亮边框依赖这条信号熄灭。
    if (typeof PS !== 'undefined' && PS && typeof PS.notifyVue === 'function') PS.notifyVue();
  }

  function closeQuickEdit(options) {
    const opts = options || {};
    if (state.quickEdit.saveSaving) {
      showToast('正在保存，完成前不能退出修图界面', 'error');
      return;
    }
    cancelQuickEditPicking();
    if (!state.quickEdit.open && (!state.quickEdit.el || state.quickEdit.el.classList.contains('hidden'))) return;
    if (window.PicScannerModules && window.PicScannerModules.closeModule) {
      window.PicScannerModules.closeModule();
    }
    if (!opts.force && !opts.silent && hasQuickEditUnsavedChanges()) {
      showQuickEditExitConfirm();
      return;
    }
    hideQuickEditExitConfirm();
    hideQuickEditSaveConfirm();
    hideQuickEditPresetApplyConfirm();
    hideQuickEditPresetOverwriteConfirm();
    hideQuickEditPresetModal();
    hideQuickEditFramePresetOverwriteConfirm();
    hideQuickEditFramePresetDeleteConfirm();
    hideQuickEditFramePresetModal();
    hideQuickEditFrameAssetModal();
    hideQuickEditFrameTextPanels();
    hideQuickEditLutModal();
    cancelQuickEditPan();
    endQuickEditFrameTextDrag();
    endQuickEditFrameImageDrag();
    hideQuickEditCurvePanel();
    state.quickEdit.open = false;
    // P1：通知 Vue 同步（rAF 合并，同一同步块内的后续赋值一并生效）
    if (typeof PS !== 'undefined' && PS && typeof PS.notifyVue === 'function') PS.notifyVue();
    state.quickEdit.batchMode = false;
    state.quickEdit.batchPhotos = [];
    state.quickEdit.batchIndex = 0;
    state.quickEdit.batchSessions = new Map();
    state.quickEdit.batchSwitching = false;
    state.quickEdit.bakedSource = false;
    state.quickEdit.photo = null;
    state.quickEdit.params = null;
    state.quickEdit.committedParams = null;
    state.quickEdit.committedStages = [];
    state.quickEdit.panX = 0;
    state.quickEdit.panY = 0;
    state.quickEdit.cropFrame = null;
    state.quickEdit.activeTools = { crop: false, rotate: false };
    state.quickEdit.histogramMode = 'white';
    state.quickEdit.histogramMenuOpen = false;
    state.quickEdit.histogramData = null;
    state.quickEdit.hslColor = 'red';
    state.quickEdit.hslPickerActive = false;
    state.quickEdit.panelTab = 'adjust';
    state.quickEdit.lut = null;
    state.quickEdit.luts = [];
    state.quickEdit.lutDraft = null;
    state.quickEdit.lutDrafts = [];
    state.quickEdit.lutDraftLoadingId = '';
    state.quickEdit.exitConfirm = state.quickEdit.exitConfirm || null;
    state.quickEdit.saveConfirm = state.quickEdit.saveConfirm || null;
    state.quickEdit.saveProgress = null;
    state.quickEdit.compareOriginalActive = false;
    state.quickEdit.history = [];
    state.quickEdit.cropDrag = null;
    state.quickEdit.rotationDrag = null;
    clearTimeout(state.quickEdit.zoomTimer);
    clearTimeout(state.quickEdit.previewRenderTimer);
    clearTimeout(state.quickEdit.previewSettleTimer);
    clearQuickEditOriginalPreviewTimer();
    clearTimeout(state.quickEdit.histogramRenderTimer);
    cancelQuickEditPreviewWorker();
    state.quickEdit.zoomTimer = null;
    state.quickEdit.previewRenderTimer = null;
    state.quickEdit.previewSettleTimer = null;
    state.quickEdit.histogramRenderTimer = null;
    state.quickEdit.sourceSrc = '';
    state.quickEdit.sourceImageSrc = '';
    state.quickEdit.sourceImage = null;
    state.quickEdit.sourceImagePromise = null;
    resetQuickEditRawPreviewState();
    state.quickEdit.previewRenderKey = '';
    state.quickEdit.previewRenderRequestSignature = '';
    resetQuickEditRenderedPreview();
    state.quickEdit.previewRenderToken += 1;
    state.quickEdit.previewRendering = false;
    revokeQuickEditPreviewObjectUrl();
    state.quickEdit.viewZoom = 1;
    state.quickEdit.displayBasisReady = false;
    state.quickEdit.displayBasisWidth = 0;
    state.quickEdit.displayBasisHeight = 0;
    state.quickEdit.bakedSource = false;
    state.quickEdit.loadToken += 1;
    clearQuickEditCropShade();
    const el = ensureQuickEdit();
    el.classList.remove('batch-mode');
    el.querySelectorAll('.quick-edit-batch-only').forEach((node) => node.classList.add('hidden'));
    const batchStrip = el.querySelector('[data-quick-edit-batch-strip]');
    if (batchStrip) batchStrip.classList.add('hidden');
    const img = el.querySelector('[data-quick-edit-img]');
    if (img) {
      img.removeAttribute('src');
      img.removeAttribute('style');
      img.alt = '';
    }
    const compareImg = el.querySelector('[data-quick-edit-compare-img]');
    if (compareImg) {
      compareImg.classList.add('hidden');
      compareImg.removeAttribute('src');
      compareImg.removeAttribute('style');
    }
    const visualLayer = el.querySelector('[data-quick-edit-visual-layer]');
    if (visualLayer) visualLayer.removeAttribute('style');
    const framePreview = el.querySelector('[data-quick-edit-frame-preview]');
    if (framePreview) {
      framePreview.classList.add('hidden');
      framePreview.classList.remove('frame-white', 'frame-black', 'frame-paper');
      framePreview.removeAttribute('style');
    }
    const outputMask = el.querySelector('[data-quick-edit-output-mask]');
    if (outputMask) {
      outputMask.classList.add('hidden');
      outputMask.querySelectorAll('[data-quick-edit-output-mask-side]').forEach((node) => node.removeAttribute('style'));
    }
    const overlay = el.querySelector('[data-quick-edit-crop-overlay]');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('dragging');
      overlay.removeAttribute('style');
    }
    setQuickEditLoading(false);
    hide(el);
    refreshQuickEditPanController();
    if (!opts.silent) showToast('已退出快速调整');
  }

  function openQuickEdit(photo, options) {
    const opts = options || {};
    const preservedBatch = opts.preserveBatch ? {
      batchMode: state.quickEdit.batchMode,
      batchPhotos: state.quickEdit.batchPhotos,
      batchIndex: state.quickEdit.batchIndex,
      batchSessions: state.quickEdit.batchSessions,
    } : null;
    const current = photo || null;
    if (!canQuickEditPhoto(current)) {
      showToast('这张照片暂时无法预览调整', 'error');
      return false;
    }
    if (!opts.skipPairChoice && quickEditNeedsPairChoice(current)) {
      return showQuickEditPairChoice(current);
    }
    hideQuickEditPairChoice();
    cancelQuickEditPicking();
    PS.closeSearchPanel();
    PS.closeCategoryPicker();
    PS.setSortOpen(false);
    PS.closeFilterMenu();
    PS.closeFilterPop();
    PS.hideContextMenu();
    PS.hideNoteTooltip();
    const el = ensureQuickEdit();
    state.quickEdit.open = true;
    // P1：通知 Vue 同步（rAF 合并，同一同步块内的后续赋值一并生效）
    if (typeof PS !== 'undefined' && PS && typeof PS.notifyVue === 'function') PS.notifyVue();
    state.quickEdit.photo = current;
    state.quickEdit.params = quickEditDefaultParams();
    state.quickEdit.committedParams = null;
    state.quickEdit.committedStages = [];
    state.quickEdit.panX = 0;
    state.quickEdit.panY = 0;
    state.quickEdit.cropFrame = null;
    state.quickEdit.activeTools = { crop: false, rotate: false };
    state.quickEdit.histogramMode = 'white';
    state.quickEdit.histogramMenuOpen = false;
    state.quickEdit.histogramData = null;
    state.quickEdit.hslColor = 'red';
    state.quickEdit.framePreset = 'none';
    state.quickEdit.frameInsets = quickEditFrameDefaultInsets('none');
    state.quickEdit.frameTextLayers = [];
    state.quickEdit.frameTextDrag = null;
    state.quickEdit.frameImageLayers = [];
    state.quickEdit.frameImageDrag = null;
    state.quickEdit.lut = null;
    state.quickEdit.luts = [];
    state.quickEdit.lutDraft = null;
    state.quickEdit.lutDrafts = [];
    state.quickEdit.lutDraftLoadingId = '';
    hideQuickEditSaveConfirm();
    state.quickEdit.saveProgress = null;
    state.quickEdit.compareOriginalActive = false;
    state.quickEdit.history = [];
    state.quickEdit.cropDrag = null;
    state.quickEdit.rotationDrag = null;
    state.quickEdit.viewZoom = 1;
    state.quickEdit.displayBasisReady = false;
    state.quickEdit.displayBasisWidth = 0;
    state.quickEdit.displayBasisHeight = 0;
    state.quickEdit.bakedSource = false;
    if (preservedBatch) Object.assign(state.quickEdit, preservedBatch);
    resetQuickEditRawPreviewState();
    if (opts.session) applyQuickEditSnapshotState(opts.session);
    syncQuickEditControls();
    syncQuickEditPresetUi();
    if (!state.quickEdit.lutLibraryLoaded && !state.quickEdit.lutLibraryLoading) {
      refreshQuickEditLutLibrary({ silent: true });
    }
    if (!state.quickEdit.presetsLoaded && !state.quickEdit.presetsLoading) {
      refreshQuickEditPresets({ silent: true });
    }
    if (!state.quickEdit.framePresetsLoaded && !state.quickEdit.framePresetsLoading) {
      refreshQuickEditFramePresets({ silent: true });
    }
    renderQuickEditMeta(current, 'loading');
    show(el);
    refreshQuickEditPanController();
    applyQuickEditPreview();
    loadQuickEditPreview(current);
    scheduleQuickEditCropShade();
    return true;
  }

  function saveActiveBatchEditSession() {
    if (!state.quickEdit.batchMode || !state.quickEdit.photo) return;
    const snapshot = snapshotQuickEditState();
    if (!snapshot.bakedSource) {
      snapshot.src = '';
      snapshot.sourceSrc = '';
    }
    state.quickEdit.batchSessions.set(Number(state.quickEdit.photo.id), snapshot);
  }

  function renderQuickEditBatchStrip() {
    const el = ensureQuickEdit();
    const strip = el.querySelector('[data-quick-edit-batch-strip]');
    const list = el.querySelector('[data-quick-edit-batch-thumbnails]');
    el.classList.toggle('batch-mode', state.quickEdit.batchMode);
    el.querySelectorAll('.quick-edit-batch-only').forEach((node) => node.classList.toggle('hidden', !state.quickEdit.batchMode));
    if (!strip || !list) return;
    strip.classList.toggle('hidden', !state.quickEdit.batchMode);
    list.innerHTML = '';
    if (!state.quickEdit.batchMode) return;
    state.quickEdit.batchPhotos.forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-edit-batch-thumbnail' + (index === state.quickEdit.batchIndex ? ' active' : '');
      button.dataset.quickEditBatchIndex = String(index);
      button.title = String(photo.filename || ('图片 ' + (index + 1)));
      const src = String(photo.preview_url || photo.lightbox_url || photo.original_url || '');
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        button.appendChild(img);
      }
      const order = document.createElement('b');
      order.textContent = String(index + 1);
      button.appendChild(order);
      list.appendChild(button);
    });
    const active = list.querySelector('.quick-edit-batch-thumbnail.active');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function switchBatchQuickEditPhoto(index) {
    if (!state.quickEdit.batchMode || state.quickEdit.batchSwitching) return false;
    const nextIndex = Math.max(0, Math.min(state.quickEdit.batchPhotos.length - 1, Number(index || 0)));
    if (nextIndex === state.quickEdit.batchIndex) return true;
    saveActiveBatchEditSession();
    const nextPhoto = state.quickEdit.batchPhotos[nextIndex];
    const session = state.quickEdit.batchSessions.get(Number(nextPhoto.id)) || null;
    state.quickEdit.batchSwitching = true;
    state.quickEdit.batchIndex = nextIndex;
    const editor = ensureQuickEdit();
    const previewImg = editor.querySelector('[data-quick-edit-img]');
    state.quickEdit.sourceSrc = '';
    state.quickEdit.sourceImageSrc = '';
    state.quickEdit.sourceImage = null;
    state.quickEdit.sourceImagePromise = null;
    if (previewImg) previewImg.removeAttribute('src');
    openQuickEdit(nextPhoto, { skipPairChoice: true, preserveBatch: true, session });
    state.quickEdit.batchSwitching = false;
    renderQuickEditBatchStrip();
    return true;
  }

  function openBatchQuickEdit(photos) {
    const selected = (Array.isArray(photos) ? photos : []).filter((photo) => Number(photo && photo.id || 0));
    if (!selected.length) return false;
    state.quickEdit.batchMode = true;
    state.quickEdit.batchPhotos = selected.map((photo) => Object.assign({}, photo));
    state.quickEdit.batchIndex = 0;
    state.quickEdit.batchSessions = new Map();
    if (!openQuickEdit(state.quickEdit.batchPhotos[0], { skipPairChoice: true, preserveBatch: true })) return false;
    renderQuickEditBatchStrip();
    return true;
  }

  function beginQuickEditPicking() {
    if (state.quickEdit.open) {
      closeQuickEdit();
      return true;
    }
    if (!els.workspace || els.workspace.classList.contains('hidden') || state.settingsOpen || state.statsOpen) {
      showToast('先进入图库再按 Q', 'error');
      return true;
    }
    if (!els.lightbox.classList.contains('hidden')) return false;
    state.quickEdit.picking = true;
    PS.closeSearchPanel();
    PS.closeCategoryPicker();
    PS.setSortOpen(false);
    PS.closeFilterMenu();
    PS.closeFilterPop();
    PS.hideContextMenu();
    PS.hideNoteTooltip();
    if (els.gallery) els.gallery.classList.add('quick-edit-picking');
    // P1：通知 Vue 同步（PhotoGrid 依 quickEdit store 的 picking 点亮选图边框）
    if (typeof PS !== 'undefined' && PS && typeof PS.notifyVue === 'function') PS.notifyVue();
    showToast('选择一张照片进行快速调整');
    return true;
  }

  function handleQuickEditShortcut(ev) {
    if ((ev.key !== 'q' && ev.key !== 'Q') || ev.ctrlKey || ev.metaKey || ev.altKey) return false;
    if (ev.repeat) return true;
    if (state.quickEdit.picking) {
      cancelQuickEditPicking();
      showToast('已取消快速调整选图');
      return true;
    }
    // 兼容 Vue 灯箱：legacy els.lightbox.hidden 时仍需判定 Vue store 是否打开
    const isVueLbOpen = (() => {
      try { if (window.__lightboxStore && window.__lightboxStore.open) return true; } catch {}
      try {
        const vueLb = document.getElementById('vue-lightbox');
        if (vueLb && vueLb.querySelector('.ps-lightbox-shell')) return true;
        if (document.querySelector('.ps-lightbox-shell')) return true;
      } catch {}
      return false;
    })();
    const lightboxOpen = !els.lightbox.classList.contains('hidden') || isVueLbOpen || !!state.lightbox.photo && isVueLbOpen;
    if (lightboxOpen) {
      if (state.compare.lightbox) {
        showToast('对比模式暂不支持快速调整');
        return true;
      }
      // 集锦上下文：优先用集锦列表中的完整照片，避免 state.lightbox.photo 为精简版。
      // P3：PS.__collectionsContext 已废除，集锦翻页列表搬到 lightbox store 的 navList，
      // 当前这张由 store.photo 持有（本身就是集锦里那份完整对象）。
      try {
        const ls = window.__lightboxStore;
        if (ls && Array.isArray(ls.navList) && ls.navList.length) {
          const cur = ls.photo || state.lightbox.photo;
          if (cur) return openQuickEdit(cur);
        }
      } catch {}
      if (!state.lightbox.photo) {
        // 尝试从 Vue store 取
        try {
          const vs = window.__lightboxStore && window.__lightboxStore.photo;
          if (vs) return openQuickEdit(vs);
        } catch {}
        showToast('当前没有可调整照片', 'error');
        return true;
      }
      return openQuickEdit(state.lightbox.photo);
    }
    // 非灯箱：若集锦列表/详情页打开，禁止进入拾取（避免错误嵌入）
    if (state.collectionsOpen || state.collectionDetailOpen) return false;
    return beginQuickEditPicking();
  }

  // P4 收口：older-sentinel 随 legacy 引擎链删除，日期分页由 PhotoGrid 的
  // maybeLoadMore 在滚动接近底部时驱动（PS.loadOlderDates）。

  function saveLastViewedDate(dateKey, options) {
    const category = options && Object.prototype.hasOwnProperty.call(options, 'category') ? options.category : state.activeCategory;
    const immediate = !!(options && options.immediate);
    const position = viewedPositionFromScroll(dateKey);
    const cleanDate = position.date;
    const offset = position.offset;
    const saveKey = PS.viewedCategoryKey(category) + '|' + cleanDate + '|' + offset;
    if (!state.currentSourceId || !cleanDate || state.lastViewedDateSaved === saveKey) return;
    if (!immediate && (state.pendingRestoreDate || state.restoringDate || Date.now() < state.suppressLastViewedSaveUntil)) return;
    const writeViewedDate = () => {
      state.lastViewedDateSaved = saveKey;
      if (category === null) {
        state.sourceLastViewedDate = cleanDate;
        state.sourceLastViewedOffset = offset;
        call('set_last_viewed_date', state.currentSourceId, cleanDate, null, offset).catch(console.warn);
      } else {
        const categoryName = String(category || '');
        state.categoryLastViewedDates.set(categoryName, { date: cleanDate, offset });
        call('set_last_viewed_date', state.currentSourceId, cleanDate, categoryName, offset).catch(console.warn);
      }
    };
    clearTimeout(state.saveViewedDateTimer);
    if (immediate) {
      state.saveViewedDateTimer = null;
      writeViewedDate();
      return;
    }
    state.saveViewedDateTimer = setTimeout(() => {
      writeViewedDate();
    }, 500);
  }

  function viewedOffsetForDate() {
    // P4 收口：legacy 分区 DOM 已删，日期内偏移不再可得，恢复落在分区顶部
    return 0;
  }

  function viewedPositionFromScroll(fallbackDate) {
    return { date: String(fallbackDate || '').trim(), offset: 0 };
  }

  function restoreLastViewedPosition(position) {
    const dateKey = String((position && position.date) || '').trim();
    if (!dateKey) return;
    const offset = Math.max(0, Number((position && position.offset) || 0));
    clearTimeout(state.saveViewedDateTimer);
    state.saveViewedDateTimer = null;
    state.pendingRestoreDate = String(dateKey);
    state.pendingRestoreOffset = offset;
    state.lastViewedDateSaved = PS.viewedCategoryKey(state.activeCategory) + '|' + String(dateKey) + '|' + offset;
    state.suppressLastViewedSaveUntil = Date.now() + 2500;
    tryRestorePendingDate();
  }

  function tryRestorePendingDate() {
    const dateKey = state.pendingRestoreDate;
    const offset = state.pendingRestoreOffset;
    if (!dateKey || state.restoringDate || state.loadingDates) return;
    // P4 收口：分区 DOM 不存在了，改用日期计数表判定目标日期是否已加载
    const known = state.dateCounts instanceof Map && state.dateCounts.has(dateKey);
    if (known) {
      state.pendingRestoreDate = '';
      state.pendingRestoreOffset = 0;
      PS.jumpToDate(dateKey, offset);
      state.suppressLastViewedSaveUntil = Date.now() + 800;
      return;
    }
    if (state.noMoreDates) {
      state.pendingRestoreDate = '';
      state.pendingRestoreOffset = 0;
      return;
    }
    state.restoringDate = true;
    PS.loadOlderDates({ allowScanRequest: false }).then((loaded) => {
      state.restoringDate = false;
      if (loaded) {
        setTimeout(tryRestorePendingDate, 0);
      } else if (state.noMoreDates) {
        state.pendingRestoreDate = '';
        state.pendingRestoreOffset = 0;
      }
    });
  }

  function setActiveDate(dateKey) {
    if (!dateKey) return;
    const previous = state.activeDate;
    const changed = previous !== dateKey;
    state.activeDate = dateKey;
    if (previous) updateDatePill(previous);
    updateDatePill(dateKey);
    if (changed) {
      saveLastViewedDate(dateKey);
      const active = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
      if (active) active.scrollIntoView({ block: 'center' });
    } else {
      saveLastViewedDate(dateKey);
    }
  }

  function setVisibleDates(dateKeys) {
    const next = new Set(dateKeys || []);
    const changed = new Set([...state.visibleDates, ...next]);
    let same = state.visibleDates.size === next.size;
    if (same) {
      for (const key of next) {
        if (!state.visibleDates.has(key)) {
          same = false;
          break;
        }
      }
    }
    if (same) return;
    state.visibleDates = next;
    changed.forEach(updateDatePill);
  }

  function setDateFocus(focusByDate) {
    const next = new Map(focusByDate || []);
    const changed = new Set([...state.dateFocus.keys(), ...next.keys()]);
    state.dateFocus = next;
    changed.forEach(updateDatePill);
  }

  function updateDatePill(dateKey) {
    const btn = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
    if (!btn) return;
    btn.classList.toggle('active', state.activeDate === dateKey);
    btn.classList.toggle('visible', state.visibleDates.has(dateKey));
    const focus = state.dateFocus.get(dateKey) || 0;
    btn.style.setProperty('--date-focus', focus.toFixed(3));
    btn.style.setProperty('--date-visible-color-alpha', (0.66 + focus * 0.34).toFixed(3));
    btn.style.setProperty('--date-visible-bg-alpha', (0.05 + focus * 0.16).toFixed(3));
    btn.style.setProperty('--date-visible-border-alpha', (0.28 + focus * 0.64).toFixed(3));
    btn.style.setProperty('--date-visible-ring-alpha', (0.12 + focus * 0.34).toFixed(3));
    btn.style.setProperty('--date-visible-glow-alpha', (0.08 + focus * 0.20).toFixed(3));
    btn.style.setProperty('--date-active-bg-alpha', (0.12 + focus * 0.12).toFixed(3));
    btn.style.setProperty('--date-active-ring-alpha', (0.36 + focus * 0.24).toFixed(3));
    btn.style.setProperty('--date-active-glow-alpha', (0.14 + focus * 0.18).toFixed(3));
    btn.style.setProperty('--date-cover-color-alpha', (0.78 + focus * 0.22).toFixed(3));
    btn.style.setProperty('--date-cover-border-alpha', (0.34 + focus * 0.58).toFixed(3));
    btn.style.setProperty('--date-cover-ring-alpha', (0.16 + focus * 0.34).toFixed(3));
    btn.style.setProperty('--date-cover-glow-alpha', (0.10 + focus * 0.20).toFixed(3));
    btn.style.setProperty('--date-cover-active-ring-alpha', (0.38 + focus * 0.22).toFixed(3));
    btn.style.setProperty('--date-cover-active-glow-alpha', (0.16 + focus * 0.18).toFixed(3));
    btn.classList.toggle('focus-center', focus >= 0.72);
  }

  // P4 收口：日期栏高亮由 PhotoGrid 的 syncRailFromScroll 回写接管
  // （setVisibleDates / setDateFocus / setActiveDate），legacy 的
  // updateDateHighlight 及其 DOM 几何计算随引擎链删除。

  function batchSelectionShortcutsAvailable() {
    return !!els.workspace
      && !els.workspace.classList.contains('hidden')
      && !state.settingsOpen
      && !state.statsOpen
      && !state.searchOpen
      && !state.quickEdit.open
      && !state.quickEdit.picking
      && !state.compare.lightbox
      && els.lightbox.classList.contains('hidden')
      && (!PS.batchProcessingController || !PS.batchProcessingController.isOpen());
  }

  function batchImageGeometry(photo, image, options) {
    const naturalWidth = Math.max(1, Number(image && (image.naturalWidth || image.width) || 1));
    const naturalHeight = Math.max(1, Number(image && (image.naturalHeight || image.height) || 1));
    if (options && options.developedRaw) {
      return { width: naturalWidth, height: naturalHeight, orientation: '', applyOrientation: false };
    }
    const basis = PS.lightboxImageBasis(photo || {}, naturalWidth, naturalHeight);
    const width = Math.max(1, Number(basis.width || naturalWidth));
    const height = Math.max(1, Number(basis.height || naturalHeight));
    const orientation = String(photo && photo.orientation || '');
    const applyOrientation = PS.orientationSwapsSize(orientation)
      && ((naturalWidth >= naturalHeight) !== (width >= height));
    return { width, height, orientation, applyOrientation };
  }

  function waitForBatchPresetLoad(isLoading, label) {
    if (!isLoading()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        if (!isLoading()) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - startedAt > 15000) {
          clearInterval(timer);
          reject(new Error(label + '读取超时'));
        }
      }, 50);
    });
  }

  async function batchListAdjustmentPresets() {
    if (!state.quickEdit.presetsLoaded && !state.quickEdit.presetsLoading) {
      await refreshQuickEditPresets({ silent: true });
    }
    await waitForBatchPresetLoad(() => state.quickEdit.presetsLoading, '调整预设');
    if (state.quickEdit.presetsMessage) throw new Error(state.quickEdit.presetsMessage);
    return (state.quickEdit.presets || []).map((preset) => ({
      id: preset.id,
      name: preset.name,
      detail: preset.luts.length ? preset.luts.length + ' 个 LUT' : '影调、色彩与细节',
    }));
  }

  async function batchPrepareAdjustmentPreset(presetId) {
    const id = String(presetId || '').trim();
    let name = '无调整预设';
    let params = quickEditPresetStyleParams(quickEditDefaultParams());
    let hydratedLuts = [];
    if (id) {
      if (!state.quickEdit.presetsLoaded && !state.quickEdit.presetsLoading) {
        await refreshQuickEditPresets({ silent: true });
      }
      await waitForBatchPresetLoad(() => state.quickEdit.presetsLoading, '调整预设');
      const preset = quickEditPresetById(id);
      if (!preset) throw new Error('调整预设不存在或已被删除: ' + id);
      const hydrated = await quickEditHydratePresetLuts(preset);
      if (hydrated.missing.length) {
        throw new Error('调整预设“' + preset.name + '”引用的 LUT 缺失：' + hydrated.missing.join('、'));
      }
      name = preset.name;
      params = quickEditPresetStyleParams(preset.params);
      hydratedLuts = hydrated.loaded;
    }
    const luts = quickEditWorkerLutPayload(hydratedLuts);
    return {
      id,
      name,
      params,
      rawDevelopParams: quickEditRawDevelopParams(params, { stages: [params] }),
      workerParams: Object.assign({}, params, { luts }),
      rawWorkerParams: Object.assign({}, quickEditPixelParamsForRawDevelopedSource(params), { luts }),
    };
  }

  async function batchPrepareAdjustmentSession(session) {
    const params = quickEditPresetStyleParams(session && session.effectiveParams || session && session.params || quickEditDefaultParams());
    const luts = quickEditWorkerLutPayload(session && session.luts || []);
    const stages = (session && session.committedStages || []).map(cloneQuickEditPixelStage).concat([
      Object.assign({}, normalizeQuickEditParams(session && session.params || quickEditDefaultParams()), { luts }),
    ]);
    const rawStages = stages.map((stage) => Object.assign(
      {},
      quickEditPixelParamsForRawDevelopedSource(stage),
      { luts: cloneQuickEditWorkerLutPayload(stage.luts) },
    ));
    return {
      id: '',
      name: '独立调整',
      params,
      rawDevelopParams: quickEditRawDevelopParams(params, { stages }),
      workerParams: { stages },
      rawWorkerParams: { stages: rawStages },
    };
  }

  async function batchPrepareFrameSession(session) {
    const frame = quickEditFrameExportConfigFromPayload({
      preset: session && session.framePreset || 'none',
      insets: session && session.frameInsets,
      textLayers: session && session.frameTextLayers || [],
      imageLayers: session && session.frameImageLayers || [],
    });
    if (!frame) return null;
    const assets = (frame.imageLayers || []).filter((layer) => layer.enabled && layer.assetId);
    await Promise.all(assets.map((layer) => quickEditLoadFrameAssetUrl(layer.assetId)));
    return { id: '', name: '独立相框', frame };
  }

  async function batchListFramePresets() {
    if (!state.quickEdit.framePresetsLoaded && !state.quickEdit.framePresetsLoading) {
      await refreshQuickEditFramePresets({ silent: true });
    }
    await waitForBatchPresetLoad(() => state.quickEdit.framePresetsLoading, '相框预设');
    if (state.quickEdit.framePresetsMessage) throw new Error(state.quickEdit.framePresetsMessage);
    return (state.quickEdit.framePresets || []).map((preset) => ({
      id: preset.id,
      name: preset.name,
      detail: quickEditFramePresetDetail(preset),
    }));
  }

  async function batchPrepareFramePreset(presetId) {
    const id = String(presetId || '').trim();
    if (!id) return null;
    if (!state.quickEdit.framePresetsLoaded && !state.quickEdit.framePresetsLoading) {
      await refreshQuickEditFramePresets({ silent: true });
    }
    await waitForBatchPresetLoad(() => state.quickEdit.framePresetsLoading, '相框预设');
    const preset = quickEditFramePresetById(id);
    if (!preset) throw new Error('相框预设不存在或已被删除: ' + id);
    const frame = quickEditFrameExportConfigFromPayload(preset.frame);
    if (!frame) throw new Error('相框预设没有可应用的相框内容: ' + preset.name);
    const assets = (frame.imageLayers || []).filter((layer) => layer.enabled && layer.assetId);
    await Promise.all(assets.map((layer) => quickEditLoadFrameAssetUrl(layer.assetId)));
    return { id, name: preset.name, frame };
  }

  function batchApplyFrame(rendered, options, frame, context) {
    const sourceBasis = Math.max(1, Math.min(
      Number(rendered && rendered.outputWidth || 1),
      Number(rendered && rendered.outputHeight || 1),
    ));
    return quickEditApplyFrameToRenderedBlob(rendered, options, frame, Object.assign({}, context || {}, {
      displayBasis: Math.min(QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE, sourceBasis),
    }));
  }

  function initializeBatchControllers() {
    if (PS.batchProcessingController || PS.batchSelectionController) return;
    if (!window.PicScannerBatchRenderer || !window.PicScannerBatchProcessing || !window.PicScannerBatchSelection) {
      throw new Error('批量处理模块未完整加载，请检查 batch_renderer.js、batch_processing.js 和 batch_selection.js');
    }
    const renderer = window.PicScannerBatchRenderer.create({
      call,
      resolveGeometry: batchImageGeometry,
    });
    PS.batchProcessingController = window.PicScannerBatchProcessing.create({
      call,
      renderer,
      showToast,
      listAdjustmentPresets: batchListAdjustmentPresets,
      prepareAdjustmentPreset: batchPrepareAdjustmentPreset,
      prepareAdjustmentSession: batchPrepareAdjustmentSession,
      listFramePresets: batchListFramePresets,
      prepareFramePreset: batchPrepareFramePreset,
      prepareFrameSession: batchPrepareFrameSession,
      applyFrame: batchApplyFrame,
      attachLightbox: PS.attachBatchLightbox,
      showLightboxPreview: PS.showBatchLightboxPreview,
      setLightboxBusy: PS.setBatchLightboxBusy,
      detachLightbox: PS.detachBatchLightbox,
    });
    PS.batchSelectionController = window.PicScannerBatchSelection.create({
      getSourceId: () => state.currentSourceId || '',
      canUseShortcuts: batchSelectionShortcutsAvailable,
      onProcess: (photos) => {
        const opened = openBatchQuickEdit(photos);
        if (opened && PS.batchSelectionController) PS.batchSelectionController.clear();
        return opened;
      },
    });
    PS.syncBatchSelectionSource();
  }

  PS.renderSortMenu();

  els.cancelScan.addEventListener('click', () => hide(els.confirmModal));
  els.confirmScan.addEventListener('click', PS.beginScan);
  els.cancelExport.addEventListener('click', PS.closeExportConfirm);
  els.confirmExport.addEventListener('click', PS.confirmPendingExport);
  els.inputModalCancel.addEventListener('click', cancelTextInput);
  els.inputModalConfirm.addEventListener('click', confirmTextInput);
  els.inputModal.addEventListener('click', (ev) => {
    if (ev.target === els.inputModal) cancelTextInput();
  });
  els.inputModal.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      cancelTextInput();
      return;
    }
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      ev.stopPropagation();
      confirmTextInput();
    }
  });
  els.changeSource.addEventListener('click', showSourceChooser);
  els.openSettings.addEventListener('click', () => PS.openSettingsPage());
  // P3：#close-settings 按钮已随设置屏内容移入 Vue 组件（SettingsScreen.vue 内直接调 PS.closeSettingsPage）
  els.openStats.addEventListener('click', PS.openStatsPage);
  // P3：#close-stats 按钮已随统计屏内容移入 Vue 组件（StatsScreen.vue 内直接调 PS.closeStatsPage）
  els.addCategory.addEventListener('click', PS.addCategoryFromSidebar);
  els.scanAll.addEventListener('click', PS.toggleScanAll);
  els.readExif.addEventListener('click', PS.toggleExifRead);
  els.sortTrigger.addEventListener('click', (ev) => {
    ev.stopPropagation();
    PS.setSortOpen(!state.sortOpen);
  });
  els.filterTrigger.addEventListener('click', PS.onFilterTriggerClick);
  els.filterTrigger.addEventListener('contextmenu', PS.onFilterTriggerContextMenu);
  els.lightboxClose.addEventListener('click', PS.closeLightbox);
  els.lightbox.addEventListener('click', (ev) => {
    if (state.compare.lightbox) return;
    if (Date.now() < state.lightbox.suppressCloseUntil) return;
    if (state.lightbox.zoom > 1) return;
    if (ev.target === els.lightbox || ev.target === els.lightboxStage) PS.closeLightbox();
  });
  els.lightbox.addEventListener('mousemove', PS.updateLightboxNavHover);
  els.lightbox.addEventListener('mouseleave', () => PS.setLightboxNavHover(''));
  els.lightboxStage.addEventListener('wheel', PS.onLightboxWheel, { passive: false });
  els.lightboxStage.addEventListener('dblclick', PS.onLightboxDoubleClick);
  els.lightboxStage.addEventListener('pointerdown', PS.onLightboxPointerDown);
  els.lightboxStage.addEventListener('pointermove', PS.onLightboxPointerMove);
  els.lightboxStage.addEventListener('pointerup', PS.endLightboxDrag);
  els.lightboxStage.addEventListener('pointercancel', PS.endLightboxDrag);
  els.lightboxInfoHead.addEventListener('pointerdown', PS.onLightboxInfoPointerDown);
  els.lightboxInfo.addEventListener('pointerdown', PS.onLightboxInfoResizePointerDown);
  els.lightboxInfoDetailsToggle.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  els.lightboxInfoDetailsToggle.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    PS.setLightboxInfoDetailsCollapsed(!state.lightboxInfoDetailsCollapsed);
  });
  els.lightboxInfoClose.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  els.lightboxInfoClose.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    PS.setLightboxInfoVisible(false);
  });
  els.lightboxInfo.addEventListener('pointermove', PS.onLightboxInfoPointerMove);
  els.lightboxInfo.addEventListener('pointerup', PS.endLightboxInfoDrag);
  els.lightboxInfo.addEventListener('pointercancel', PS.endLightboxInfoDrag);
  els.lightboxInfoToggle.addEventListener('click', () => PS.setLightboxInfoVisible(!state.lightbox.infoVisible));
  if (els.compareInfoToggle) {
    els.compareInfoToggle.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      PS.setCompareInfoVisible(!state.compare.infoVisible);
    });
  }
  if (els.lightboxCompare) {
    els.lightboxCompare.querySelectorAll('[data-compare-info-head]').forEach((head) => {
      head.addEventListener('pointerdown', PS.onCompareInfoPointerDown);
    });
    els.lightboxCompare.querySelectorAll('[data-compare-info-close]').forEach((btn) => {
      btn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        PS.setCompareInfoVisible(false);
      });
    });
    els.lightboxCompare.querySelectorAll('[data-compare-info]').forEach((panel) => {
      panel.addEventListener('pointermove', PS.onCompareInfoPointerMove);
      panel.addEventListener('pointerup', PS.endCompareInfoDrag);
      panel.addEventListener('pointercancel', PS.endCompareInfoDrag);
    });
  }
  if (els.compareLock) {
    els.compareLock.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      state.compare.locked = !state.compare.locked;
      PS.updateCompareView();
    });
  }
  els.lightboxPrev.addEventListener('click', () => PS.navigateLightbox(-1));
  els.lightboxNext.addEventListener('click', () => PS.navigateLightbox(1));
  els.lightboxZoomOut.addEventListener('click', () => PS.setLightboxZoom(PS.currentLightboxZoom() / LIGHTBOX_ZOOM_STEP));
  els.lightboxZoomIn.addEventListener('click', () => PS.setLightboxZoom(PS.currentLightboxZoom() * LIGHTBOX_ZOOM_STEP));
  els.lightboxZoom.addEventListener('focus', () => els.lightboxZoom.select());
  els.lightboxZoom.addEventListener('blur', PS.applyZoomInput);
  els.lightboxZoom.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      ev.stopPropagation();
      PS.applyZoomInput();
      els.lightboxZoom.blur();
    } else if (ev.key === 'Escape') {
      ev.stopPropagation();
      els.lightboxZoom.value = PS.formatZoomValue(PS.currentLightboxZoom());
      els.lightboxZoom.blur();
    }
  });
  // P4：vanilla 搜索面板的事件绑定已删除（#search-panel 属于已删除的
  // #vanilla-toolbar）。搜索输入、范围切换、结果点击、Esc 关闭全部由
  // Vue 工具栏（GalleryToolbar.vue）处理；Esc 关闭由组件自身的 onKey 负责。
  window.addEventListener('keydown', PS.handleCategoryPickerKey, true);
  window.addEventListener('beforeunload', (ev) => {
    if (!state.quickEdit.saveSaving && !(PS.batchProcessingController && PS.batchProcessingController.isRunning())) return undefined;
    ev.preventDefault();
    ev.returnValue = '';
    return '';
  });
  document.addEventListener('click', (ev) => {
    const batchRunning = !!(PS.batchProcessingController && PS.batchProcessingController.isRunning());
    if (!state.quickEdit.saveSaving && !batchRunning) return;
    const target = ev.target;
    const closeControl = target && target.closest
      ? target.closest('.wvu-close, .wvu-btb-btn.close, [data-act="close"]')
      : null;
    if (!closeControl) return;
    ev.preventDefault();
    ev.stopPropagation();
    showToast(batchRunning ? '批量处理正在运行，完成或取消后才能退出程序' : '正在保存，完成前不能退出程序', 'error');
  }, true);
  // 最高优先级：Esc 强制关闭对比选图（capture，盖过所有 early return）
  // 兼容 lightbox 残留标志：只要 open 或面板可见即视为可关
  function isComparePickerVisible() {
    try {
      const p = state.compare.panel;
      if (p && !p.classList.contains('hidden')) return true;
    } catch {}
    return !!state.compare.open;
  }
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    try { console.warn('[compare-esc][win-capture] open='+state.compare.open+' lightbox='+state.compare.lightbox+' visible='+isComparePickerVisible()+' selected='+JSON.stringify(state.compare.selected)); } catch {}
    if (state.compare.open || isComparePickerVisible() || state.compare.lightbox) {
      const wasLightbox = !!state.compare.lightbox;
      try {
        if (wasLightbox) PS.closeLightbox();
        else PS.closeComparePanel();
      } catch {}
      // 强制清空选中并刷新卡片徽标，Esc 退出对比（尤其灯箱）不应保留 PhotoGrid 角标
      try { state.compare.selected = [null, null]; } catch {}
      try { if (state.compare.panel) state.compare.panel.classList.add('hidden'); } catch {}
      try { state.compare.open = false; state.compare.lightbox = false; } catch {}
      try { if (typeof PS.renderComparePanel === 'function') PS.renderComparePanel(); } catch {}
      try { if (typeof PS.updateCompareCardHighlights === 'function') PS.updateCompareCardHighlights(); } catch {}
      try {
        if (window.__lightboxStore) {
          window.__lightboxStore.compareOpen = false;
          window.__lightboxStore.compareSelected = [null, null];
          if (typeof window.__lightboxStore.syncToLegacy === 'function') window.__lightboxStore.syncToLegacy();
        }
      } catch {}
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) try { ev.stopImmediatePropagation(); } catch {}
    }
  }, true);
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    if (state.compare.open || isComparePickerVisible() || state.compare.lightbox) {
      const wasLightbox = !!state.compare.lightbox;
      try {
        if (wasLightbox) PS.closeLightbox();
        else PS.closeComparePanel();
      } catch {}
      try { state.compare.selected = [null, null]; } catch {}
      try { if (state.compare.panel) state.compare.panel.classList.add('hidden'); } catch {}
      try { state.compare.open = false; state.compare.lightbox = false; } catch {}
      try { if (typeof PS.renderComparePanel === 'function') PS.renderComparePanel(); } catch {}
      try { if (typeof PS.updateCompareCardHighlights === 'function') PS.updateCompareCardHighlights(); } catch {}
      try {
        if (window.__lightboxStore) {
          window.__lightboxStore.compareOpen = false;
          window.__lightboxStore.compareSelected = [null, null];
          if (typeof window.__lightboxStore.syncToLegacy === 'function') window.__lightboxStore.syncToLegacy();
        }
      } catch {}
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) try { ev.stopImmediatePropagation(); } catch {}
    }
  }, true);
  document.addEventListener('keydown', (ev) => {
    if (PS.batchProcessingController && PS.batchProcessingController.handleKeydown(ev)) return;
    if (PS.batchSelectionController && PS.batchSelectionController.handleKeydown(ev)) return;
    if (ev.key === 'Alt') {
      if (!ev.repeat) PS.showAltExifFromPointer(ev);
      if (PS.canShowGalleryExif() && !PS.isTypingTarget(document.activeElement)) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      return;
    }
    if (ev.key === 'Escape' && state.quickEdit.pairChoiceModal && !state.quickEdit.pairChoiceModal.classList.contains('hidden')) {
      hideQuickEditPairChoice();
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    // Ctrl+F 已移除：搜索面板归 Vue 工具栏（GalleryToolbar.vue 在捕获阶段处理）。
    // 以前这里在**冒泡**阶段再切一次，而 Vue 在捕获阶段已经打开过，
    // 两边读写同一个被代理的 state.searchOpen —— 结果开了就关。
    // PS.toggleSearchPanel 仍保留导出，但没有调用方了。
    if (state.quickEdit.open && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
      showQuickEditSaveConfirm();
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (
      state.quickEdit.open
      && (ev.key === 'c' || ev.key === 'C')
      && !ev.ctrlKey
      && !ev.metaKey
      && !ev.altKey
      && !PS.isTypingTarget(document.activeElement)
      && (!state.quickEdit.presetModal || state.quickEdit.presetModal.classList.contains('hidden'))
      && (!state.quickEdit.presetApplyConfirm || state.quickEdit.presetApplyConfirm.classList.contains('hidden'))
      && (!state.quickEdit.presetOverwriteConfirm || state.quickEdit.presetOverwriteConfirm.classList.contains('hidden'))
      && (!state.quickEdit.framePresetModal || state.quickEdit.framePresetModal.classList.contains('hidden'))
      && (!state.quickEdit.framePresetDeleteConfirm || state.quickEdit.framePresetDeleteConfirm.classList.contains('hidden'))
      && (!state.quickEdit.framePresetOverwriteConfirm || state.quickEdit.framePresetOverwriteConfirm.classList.contains('hidden'))
      && (!state.quickEdit.saveConfirm || state.quickEdit.saveConfirm.classList.contains('hidden'))
      && (!state.quickEdit.exitConfirm || state.quickEdit.exitConfirm.classList.contains('hidden'))
    ) {
      if (!ev.repeat) showQuickEditOriginalCompare();
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (
      state.quickEdit.open
      && (ev.key === 'f' || ev.key === 'F')
      && !ev.ctrlKey
      && !ev.metaKey
      && !ev.altKey
      && !PS.isTypingTarget(document.activeElement)
      && (!state.quickEdit.presetModal || state.quickEdit.presetModal.classList.contains('hidden'))
      && (!state.quickEdit.presetApplyConfirm || state.quickEdit.presetApplyConfirm.classList.contains('hidden'))
      && (!state.quickEdit.presetOverwriteConfirm || state.quickEdit.presetOverwriteConfirm.classList.contains('hidden'))
      && (!state.quickEdit.framePresetModal || state.quickEdit.framePresetModal.classList.contains('hidden'))
      && (!state.quickEdit.framePresetDeleteConfirm || state.quickEdit.framePresetDeleteConfirm.classList.contains('hidden'))
      && (!state.quickEdit.framePresetOverwriteConfirm || state.quickEdit.framePresetOverwriteConfirm.classList.contains('hidden'))
      && (!state.quickEdit.saveConfirm || state.quickEdit.saveConfirm.classList.contains('hidden'))
      && (!state.quickEdit.exitConfirm || state.quickEdit.exitConfirm.classList.contains('hidden'))
    ) {
      const preset = state.quickEdit.panelTab === 'frame'
        ? quickEditFramePresetById(state.quickEdit.framePresetHoverId)
        : quickEditPresetById(state.quickEdit.presetHoverId);
      if (preset) {
        if (state.quickEdit.panelTab === 'frame') toggleQuickEditFramePresetFavorite(preset.id);
        else toggleQuickEditPresetFavorite(preset.id);
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
    }
    if (
      state.quickEdit.open
      && (ev.key === 'f' || ev.key === 'F')
      && !ev.ctrlKey
      && !ev.metaKey
      && !ev.altKey
      && !PS.isTypingTarget(document.activeElement)
      && state.quickEdit.presetModal
      && !state.quickEdit.presetModal.classList.contains('hidden')
      && (!state.quickEdit.presetApplyConfirm || state.quickEdit.presetApplyConfirm.classList.contains('hidden'))
      && (!state.quickEdit.presetOverwriteConfirm || state.quickEdit.presetOverwriteConfirm.classList.contains('hidden'))
    ) {
      const preset = quickEditPresetById(state.quickEdit.presetSelectedId);
      if (preset) {
        toggleQuickEditPresetFavorite(preset.id);
        ev.preventDefault();
        ev.stopPropagation();
      }
      return;
    }
    if (
      state.quickEdit.open
      && (ev.key === 'f' || ev.key === 'F')
      && !ev.ctrlKey
      && !ev.metaKey
      && !ev.altKey
      && !PS.isTypingTarget(document.activeElement)
      && state.quickEdit.framePresetModal
      && !state.quickEdit.framePresetModal.classList.contains('hidden')
      && (!state.quickEdit.framePresetDeleteConfirm || state.quickEdit.framePresetDeleteConfirm.classList.contains('hidden'))
      && (!state.quickEdit.framePresetOverwriteConfirm || state.quickEdit.framePresetOverwriteConfirm.classList.contains('hidden'))
    ) {
      const preset = quickEditFramePresetById(state.quickEdit.framePresetSelectedId);
      if (preset) {
        toggleQuickEditFramePresetFavorite(preset.id);
        ev.preventDefault();
        ev.stopPropagation();
      }
      return;
    }
    if (PS.handleCategoryPickerKey(ev)) return;
    if (ev.key === 'Escape' && state.quickEdit.open) {
      const exitConfirm = state.quickEdit.exitConfirm;
      if (exitConfirm && !exitConfirm.classList.contains('hidden')) {
        closeQuickEdit({ force: true });
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      const saveConfirm = state.quickEdit.saveConfirm;
      if (saveConfirm && !saveConfirm.classList.contains('hidden')) {
        hideQuickEditSaveConfirm();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      const presetApplyConfirm = state.quickEdit.presetApplyConfirm;
      if (presetApplyConfirm && !presetApplyConfirm.classList.contains('hidden')) {
        hideQuickEditPresetApplyConfirm();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      const presetOverwriteConfirm = state.quickEdit.presetOverwriteConfirm;
      if (presetOverwriteConfirm && !presetOverwriteConfirm.classList.contains('hidden')) {
        hideQuickEditPresetOverwriteConfirm();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      const framePresetOverwriteConfirm = state.quickEdit.framePresetOverwriteConfirm;
      if (framePresetOverwriteConfirm && !framePresetOverwriteConfirm.classList.contains('hidden')) {
        hideQuickEditFramePresetOverwriteConfirm();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      const framePresetDeleteConfirm = state.quickEdit.framePresetDeleteConfirm;
      if (framePresetDeleteConfirm && !framePresetDeleteConfirm.classList.contains('hidden')) {
        hideQuickEditFramePresetDeleteConfirm();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      const framePresetModal = state.quickEdit.framePresetModal;
      if (framePresetModal && !framePresetModal.classList.contains('hidden')) {
        hideQuickEditFramePresetModal();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      const presetModal = state.quickEdit.presetModal;
      if (presetModal && !presetModal.classList.contains('hidden')) {
        hideQuickEditPresetModal();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      if (
        (PS.quickEditFrameTextColorPanel && !PS.quickEditFrameTextColorPanel.classList.contains('hidden'))
        || (PS.quickEditFrameTextTokenPanel && !PS.quickEditFrameTextTokenPanel.classList.contains('hidden'))
      ) {
        hideQuickEditFrameTextPanels();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      if (PS.quickEditCurvePanel && PS.quickEditCurvePanel.isOpen()) {
        hideQuickEditCurvePanel();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      if (state.quickEdit.histogramMenuOpen) {
        setQuickEditHistogramMenuOpen(false);
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      closeQuickEdit();
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (state.quickEdit.open && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
      undoQuickEditHistory();
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (ev.key === 'Escape' && state.quickEdit.picking) {
      cancelQuickEditPicking();
      showToast('已取消快速调整选图');
      ev.preventDefault();
      return;
    }
    if (
      state.quickEdit.picking
      && (ev.key === 'q' || ev.key === 'Q')
      && !ev.ctrlKey
      && !ev.metaKey
      && !ev.altKey
    ) {
      if (!ev.repeat) {
        cancelQuickEditPicking();
        showToast('已取消快速调整选图');
      }
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (state.quickEdit.open) return;
    if (ev.key === 'Escape' && state.compare.open && !state.compare.lightbox) {
      PS.closeComparePanel();
      ev.preventDefault();
      return;
    }
    // 集锦列表/详情页打开时，屏蔽画廊快捷键的错误嵌入（c/q/f/e/s/Arrow 等）
    // 灯箱除外：集锦内的灯箱仍需响应 q/Arrow/Esc
    const isLbOpenForGuard = !els.lightbox.classList.contains('hidden') || (()=>{ try{ return !!(window.__lightboxStore && window.__lightboxStore.open); }catch{ return false; }})();
    if ((state.collectionsOpen || state.collectionDetailOpen) && !isLbOpenForGuard) {
      // 仅允许 Esc（已由 collections.js capture 处理，此处不再消费）
      // 其它字母/方向键直接阻断，避免 c 触发对比、q 进入拾取等
      if (ev.key && /^[a-zA-Z]$/.test(ev.key) && !ev.ctrlKey && !ev.metaKey && !ev.altKey) return;
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') return;
      if (ev.key === 'Escape') return;
    }
    if (PS.isTypingTarget(document.activeElement)) return;
    if (handleQuickEditShortcut(ev)) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (ev.key === 'Escape' && state.searchOpen) {
      PS.closeSearchPanel();
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Escape' && state.pendingExport) {
      PS.closeExportConfirm();
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Escape' && state.settingsOpen) {
      PS.closeSettingsPage();
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Escape' && state.statsOpen) {
      PS.closeStatsPage();
      ev.preventDefault();
      return;
    }
    if (state.settingsOpen || state.statsOpen) return;
    if (!els.lightbox.classList.contains('hidden') && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
      ev.preventDefault();
      PS.navigateLightbox(ev.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if ((ev.key === 'c' || ev.key === 'C') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (PS.isTypingTarget(document.activeElement)) return;
      if (!els.lightbox.classList.contains('hidden') && state.compare.lightbox) {
        PS.closeLightbox();
        ev.preventDefault(); PS.hideContextMenu(); return;
      }
      if (!els.lightbox.classList.contains('hidden') && !state.compare.lightbox) return;
      PS.toggleComparePanel();
      ev.preventDefault();
      PS.hideContextMenu();
      return;
    }
    if ((ev.key === 'f' || ev.key === 'F') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (PS.favoriteHoveredPhoto()) {
        ev.preventDefault();
        PS.hideContextMenu();
      }
      return;
    }
    if ((ev.key === 'e' || ev.key === 'E') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (PS.editHoveredPhotoNote()) {
        ev.preventDefault();
        PS.hideContextMenu();
      }
      return;
    }
    if ((ev.key === 'r' || ev.key === 'R') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (PS.editActiveDateNote()) {
        ev.preventDefault();
        PS.hideContextMenu();
      }
      return;
    }
    if ((ev.key === 's' || ev.key === 'S') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (PS.openCategoryPickerForHover()) {
        ev.preventDefault();
        PS.hideContextMenu();
      }
      return;
    }
    if (ev.key === 'Escape') PS.setSortOpen(false);
    if (ev.key === 'Escape') PS.hideContextMenu();
    if (ev.key === 'Escape' && !els.lightbox.classList.contains('hidden')) PS.closeLightbox();
  });
  document.addEventListener('keyup', (ev) => {
    if (
      state.quickEdit.open
      && (ev.key === 'c' || ev.key === 'C')
      && state.quickEdit.compareOriginalActive
    ) {
      hideQuickEditOriginalCompare();
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (ev.key !== 'Alt') return;
    if (!PS.canShowGalleryExif() || PS.isTypingTarget(document.activeElement)) return;
    ev.preventDefault();
    ev.stopPropagation();
  });
  document.addEventListener('click', (ev) => {
    // 不能用某个 .sort-dropdown 元素去 contains()：getElementById 只认文档里第一个
    // 匹配项，第二份下拉会被误判为"点击在外部"而刚打开就被关掉。
    // 改成按 class 向上找，与具体是哪一个节点无关。
    const clickedSortDropdown = ev.target && ev.target.closest ? ev.target.closest('.sort-dropdown') : null;
    if (state.sortOpen && !clickedSortDropdown) PS.setSortOpen(false);
    if (state.quickEdit.histogramMenuOpen && state.quickEdit.el) {
      const menuWrap = ev.target && ev.target.closest ? ev.target.closest('.quick-edit-histogram-rgb-wrap') : null;
      if (!menuWrap || !state.quickEdit.el.contains(menuWrap)) setQuickEditHistogramMenuOpen(false);
    }
    const clickedFilterCombo = ev.target && ev.target.closest ? ev.target.closest('.filter-combo') : null;
    if (state.filterPop && !clickedFilterCombo) PS.closeFilterCombos(state.filterPop);
    if (state.filterOpen && state.filterPop && !state.filterPop.contains(ev.target) && !els.filterTrigger.contains(ev.target)) {
      PS.closeFilterPop();
    }
    if (state.filterMenu && !state.filterMenu.classList.contains('hidden') && !state.filterMenu.contains(ev.target) && !els.filterTrigger.contains(ev.target)) {
      PS.closeFilterMenu();
    }
    if (state.categoryPicker && state.categoryPicker.el && !state.categoryPicker.el.classList.contains('hidden') && !state.categoryPicker.el.contains(ev.target)) {
      PS.closeCategoryPicker();
    }
    const colorChoice = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-text-color-choice]') : null;
    if (colorChoice && PS.quickEditFrameTextColorPanel && PS.quickEditFrameTextColorPanel.contains(colorChoice)) {
      const layerId = String(PS.quickEditFrameTextColorPanel.dataset.layerId || '');
      const color = quickEditNormalizeHexColor(colorChoice.dataset.quickEditFrameTextColorChoice);
      if (layerId && color) {
        updateQuickEditFrameTextLayer(layerId, { color }, { skipRender: true });
        syncQuickEditFrameTextColorControl(layerId, color);
      }
      hideQuickEditFrameTextColorPanel();
      return;
    }
    if (ev.target && ev.target.closest && ev.target.closest('[data-quick-edit-frame-text-color-close]')) {
      hideQuickEditFrameTextColorPanel();
      return;
    }
    const tokenCopy = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-text-token-copy]') : null;
    if (tokenCopy && PS.quickEditFrameTextTokenPanel && PS.quickEditFrameTextTokenPanel.contains(tokenCopy)) {
      copyQuickEditFrameTextToken(tokenCopy.dataset.quickEditFrameTextTokenCopy);
      return;
    }
    const tokenInput = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-text-token-value]') : null;
    if (tokenInput && PS.quickEditFrameTextTokenPanel && PS.quickEditFrameTextTokenPanel.contains(tokenInput)) {
      tokenInput.select();
      return;
    }
    if (ev.target && ev.target.closest && ev.target.closest('[data-quick-edit-frame-text-token-close]')) {
      hideQuickEditFrameTextTokenPanel();
      return;
    }
    const colorTrigger = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-text-color-trigger]') : null;
    if (PS.quickEditFrameTextColorPanel && !PS.quickEditFrameTextColorPanel.classList.contains('hidden') && !PS.quickEditFrameTextColorPanel.contains(ev.target) && !colorTrigger) {
      hideQuickEditFrameTextColorPanel();
    }
    const tokenTrigger = ev.target && ev.target.closest ? ev.target.closest('[data-quick-edit-frame-text-token]') : null;
    if (PS.quickEditFrameTextTokenPanel && !PS.quickEditFrameTextTokenPanel.classList.contains('hidden') && !PS.quickEditFrameTextTokenPanel.contains(ev.target) && !tokenTrigger) {
      hideQuickEditFrameTextTokenPanel();
    }
    if (!state.contextMenu || state.contextMenu.classList.contains('hidden')) return;
    if (state.contextMenu.contains(ev.target)) return;
    PS.hideContextMenu();
  });
  initializeBatchControllers();
  PS.bindNoteTooltip();
  // P3：图表 tooltip 绑定随统计屏渲染代码一起删除

  function nextRefreshDelay() {
    if (state.scanRunning || state.exifRunning) return 850;
    if (Date.now() - state.lastScrollAt < 900) return 1800;
    return 3200;
  }

  function scheduleRefresh(delay) {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => {
      PS.refreshState().finally(() => scheduleRefresh(nextRefreshDelay()));
    }, delay);
  }

  function startStatePolling() {
    if (state.refreshTimer) return;
    scheduleRefresh(0);
  }

  let started = false;
  function startApp() {
    if (started) return true;
    if (!startupApiReady()) return false;
    started = true;
    console.info('PicScanner app build', APP_BUILD);
    call('get_startup_state').then((data) => {
      const sources = (data && data.sources) || {};
      PS.applyAppConfig(sources.config);
      // P3：来源列表改由 Vue 渲染。这里复用 loadSources() 走同一条 get_sources 链路，
      // 避免启动态与后续刷新分叉出两套渲染逻辑。
      loadSources();
      const scan = (data && data.scan) || {};
      if (!PS.enterCachedWorkspace(scan)) {
        show(els.sourceScreen);
      }
      startStatePolling();
      setInterval(() => {
        if (!state.noMoreDates && state.dates.length === 0) PS.loadOlderDates();
      }, 1200);
    }).catch((err) => {
      showSourceStartupError(err, '应用启动失败');
    });
    return true;
  }

  window.addEventListener('pywebviewready', startApp);
  window.addEventListener('dragenter', PS.blockInternalFileDrop, true);
  window.addEventListener('dragover', PS.blockInternalFileDrop, true);
  window.addEventListener('drop', PS.blockInternalFileDrop, true);
  window.addEventListener('resize', () => {
    requestAnimationFrame(PS.clampLightboxInfoPosition);
    requestAnimationFrame(PS.clampCompareInfoPositions);
    requestAnimationFrame(() => {
      refreshQuickEditImageDisplayBasis();
      updateQuickEditCropOverlay();
    });
    PS.setLightboxNavHover('');
  });

  PS.playWorkspaceEnter = playWorkspaceEnter;
  PS.playSourceEnter = playSourceEnter;
  PS.resetGallery = resetGallery;
  PS.showSourceChooser = showSourceChooser;
  PS.showQuickEditSaveConfirm = showQuickEditSaveConfirm;
  PS.closeQuickEdit = closeQuickEdit;
  PS.openQuickEdit = openQuickEdit;
  PS.resolveAnchoredZoomView = resolveAnchoredZoomView;
  PS.setQuickEditCollapsedSections = setQuickEditCollapsedSections;
  PS.quickEditCollapsedSections = quickEditCollapsedSections;
  PS.normalizeQuickEditParams = normalizeQuickEditParams;
  PS.quickEditUsesRawDevelopPipeline = quickEditUsesRawDevelopPipeline;
  function refreshQuickEditAfterSourceStageChange() {
    if (!state.quickEdit.open) return;
    invalidateQuickEditRenderedPreview({ clearTimers: true });
    applyQuickEditPreview();
    scheduleQuickEditHistogramRender(0);
  }

  PS.quickEditIsRawDevelopParamKey = quickEditIsRawDevelopParamKey;
  PS.invalidateQuickEditRenderedPreview = invalidateQuickEditRenderedPreview;
  PS.syncQuickEditControls = syncQuickEditControls;
  PS.applyQuickEditPreview = applyQuickEditPreview;
  PS.captureQuickEditObservation = captureQuickEditObservation;
  PS.scheduleQuickEditRawDevelopPreview = scheduleQuickEditRawDevelopPreview;
  PS.scheduleQuickEditHistogramRender = scheduleQuickEditHistogramRender;
  PS.refreshQuickEditAfterSourceStageChange = refreshQuickEditAfterSourceStageChange;
  PS.setQuickEditPanelTab = setQuickEditPanelTab;
  PS.applyQuickEditSplitTonePreset = applyQuickEditSplitTonePreset;
  PS.quickEditValueText = quickEditValueText;
  PS.normalizeQuickEditTemperature = normalizeQuickEditTemperature;
  PS.cancelQuickEditPicking = cancelQuickEditPicking;
  PS.joinClean = joinClean;
  PS.escapeHtml = escapeHtml;
  PS.saveLastViewedDate = saveLastViewedDate;
  PS.viewedPositionFromScroll = viewedPositionFromScroll;
  PS.restoreLastViewedPosition = restoreLastViewedPosition;
  PS.tryRestorePendingDate = tryRestorePendingDate;
  PS.setActiveDate = setActiveDate;
  PS.setVisibleDates = setVisibleDates;
  PS.setDateFocus = setDateFocus;
  PS.updateDatePill = updateDatePill;

  PS.batchSelectionShortcutsAvailable = batchSelectionShortcutsAvailable;

  document.addEventListener('DOMContentLoaded', () => {
    startApp();
    let checks = 0;
    const timer = setInterval(() => {
      checks += 1;
      startApp();
      if (started || checks >= 120) {
        clearInterval(timer);
        if (!started) {
          const missing = missingStartupApiMethods();
          showSourceStartupError(
            new Error('业务桥接未完整注入，缺少方法: ' + missing.join(', ')),
            '应用启动失败',
          );
        }
      }
    }, 100);
  });
  setTimeout(startApp, 0);

})();
