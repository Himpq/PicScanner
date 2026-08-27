(function () {
  'use strict';

  const state = {
    selectedSource: null,
    dates: [],
    dateCounts: new Map(),
    dateExifCounts: new Map(),
    dateNotes: new Map(),
    dateCovers: new Map(),
    dateCursor: null,
    loadingDates: false,
    noMoreDates: false,
    lastDateBootstrapKey: '',
    photoOffsets: new Map(),
    exifCache: new Map(),
    photoCache: new Map(),
    lightboxCachePending: new Set(),
    activeDate: null,
    visibleDates: new Set(),
    dateFocus: new Map(),
    scanRunning: false,
    exifRunning: false,
    scanComplete: false,
    scanStoppedByUser: false,
    scanRequesting: false,
    lastMoreScanAt: 0,
    bottomWheelTicking: false,
    scrollTicking: false,
    lastScrollAt: 0,
    lastVisibleRefreshAt: 0,
    lastStatsSignature: '',
    refreshTimer: null,
    refreshInFlight: false,
    sortKey: 'datetime_desc',
    sortOpen: false,
    filterOpen: false,
    activeFilter: {},
    filterDraft: {},
    filterOptions: null,
    filterPop: null,
    filterMenu: null,
    searchOpen: false,
    searchScope: 'all',
    searchTimer: null,
    searchSeq: 0,
    searchResults: new Map(),
    categories: [],
    favoriteCount: 0,
    hiddenCount: 0,
    activeCategory: null,
    categoryLastViewedDates: new Map(),
    categoryPicker: null,
    galleryItemSize: 168,
    galleryItemSizeRaw: 168,
    galleryItemSizeTarget: 168,
    itemSizeSaveTimer: null,
    galleryZoomTicking: false,
    galleryZoomAnchor: null,
    galleryZoomBaseSize: 168,
    galleryZoomCleanupTimer: null,
    galleryZoomActive: false,
    exportPreset: {
      enabled: false,
      destination: '',
      template: '{origin_name}',
    },
    lightboxInfoPreferredVisible: true,
    lightboxInfoPreferredPosition: null,
    lightboxInfoPreferredSize: null,
    lightboxInfoDetailsCollapsed: false,
    settingsOpen: false,
    settingsReturnTarget: 'workspace',
    statsOpen: false,
    settingsTab: 'interface',
    sourceStages: new Map(),
    openModuleKey: '',
    previewQueue: [],
    previewActive: 0,
    previewTicking: false,
    previewSessionId: 0,
    renderBufferTicking: false,
    renderBufferLoading: false,
    placeholderFillTicking: false,
    nativePhotoDragging: false,
    pendingExport: null,
    inputDialog: null,
    toastEl: null,
    toastTimer: null,
    quickEditPerfBridgeDisabled: false,
    compare: {
      open: false,
      panel: null,
      selected: [null, null],
      locked: true,
      activePane: 0,
      lightbox: false,
      infoVisible: false,
      infoDragging: -1,
      infoDragX: 0,
      infoDragY: 0,
      infoPositions: [{ x: 18, y: 18 }, { x: 18, y: 18 }],
      panes: [
        { photo: null, zoom: 1, panX: 0, panY: 0, dragging: false, dragX: 0, dragY: 0, dragStartX: 0, dragStartY: 0, dragMoved: false, loadToken: 0 },
        { photo: null, zoom: 1, panX: 0, panY: 0, dragging: false, dragX: 0, dragY: 0, dragStartX: 0, dragStartY: 0, dragMoved: false, loadToken: 0 },
      ],
    },
    currentRootPath: '',
    currentSourceId: '',
    pendingRestoreDate: '',
    pendingRestoreOffset: 0,
    restoringDate: false,
    sourceLastViewedDate: '',
    sourceLastViewedOffset: 0,
    lastViewedDateSaved: '',
    suppressLastViewedSaveUntil: 0,
    saveViewedDateTimer: null,
    contextMenu: null,
    quickEdit: {
      open: false,
      picking: false,
      el: null,
      photo: null,
      params: null,
      committedParams: null,
      committedStages: [],
      panX: 0,
      panY: 0,
      cropFrame: null,
      activeTools: { crop: false, rotate: false },
      cropDrag: null,
      rotationDrag: null,
      histogramMode: 'white',
      histogramChannels: { red: true, green: true, blue: true },
      histogramMenuOpen: false,
      histogramData: null,
      histogramRenderToken: 0,
      hslColor: 'red',
      hslPickerActive: false,
      panelTab: 'adjust',
      framePreset: 'none',
      frameInsets: { top: 5, right: 5, bottom: 5, left: 5 },
      frameTextLayers: [],
      frameTextDrag: null,
      frameImageLayers: [],
      frameImageDrag: null,
      framePresets: [],
      framePresetsLoaded: false,
      framePresetsLoading: false,
      framePresetsMessage: '',
      framePresetModal: null,
      framePresetDeleteConfirm: null,
      framePresetOverwriteConfirm: null,
      framePresetOverwritingId: '',
      framePresetSelectedId: '',
      framePresetHoverId: '',
      frameAssetModal: null,
      frameAssets: [],
      frameAssetsLoaded: false,
      frameAssetsLoading: false,
      frameAssetsMessage: '',
      frameAssetSelectedId: '',
      lut: null,
      luts: [],
      collapsedSections: { tone: false, color: false, detail: false, effects: false, blackWhite: false, splitTone: false, hsl: false, lut: false, framePresets: false, frameAdjust: false, frameText: false },
      lutLibrary: [],
      lutLibraryLoaded: false,
      lutLibraryLoading: false,
      lutLibraryMessage: '',
      lutModal: null,
      lutDraft: null,
      lutDrafts: [],
      lutDraftLoadingId: '',
      sourceSrc: '',
      previewRenderKey: '',
      previewRenderRequestSignature: '',
      previewRenderPendingKey: '',
      previewRenderPendingSignature: '',
      previewRenderPendingMaxSide: 0,
      previewRenderQueuedSignature: '',
      previewRenderQueuedOptions: null,
      previewRenderedSignature: '',
      previewRenderedMaxSide: 0,
      previewRenderTimer: null,
      previewSettleTimer: null,
      previewOriginalTimer: null,
      previewOriginalSignature: '',
      previewRenderToken: 0,
      previewRendering: false,
      sourceImageSrc: '',
      sourceImage: null,
      sourceImagePromise: null,
      rawPreviewToken: 0,
      rawPreviewTimer: null,
      rawPreviewSignature: '',
      rawPreviewLoading: false,
      rawPreviewOriginalTimer: null,
      rawPreviewOriginalSignature: '',
      rawPreviewUrl: '',
      rawPreviewWidth: 0,
      rawPreviewHeight: 0,
      rawPreviewPendingMaxSide: 0,
      rawPreviewRenderedMaxSide: 0,
      rawPreviewDesiredSignature: '',
      rawPreviewInFlight: false,
      rawPreviewInFlightSignature: '',
      rawPreviewQueuedSignature: '',
      rawPreviewQueuedOptions: null,
      rawPreviewCache: new Map(),
      presets: [],
      presetsLoaded: false,
      presetsLoading: false,
      presetsMessage: '',
      presetModal: null,
      presetApplyConfirm: null,
      presetOverwriteConfirm: null,
      presetApplyingId: '',
      presetOverwritingId: '',
      presetSelectedId: '',
      presetHoverId: '',
      compareOriginalActive: false,
      previewObjectUrl: '',
      zoomTimer: null,
      history: [],
      viewZoom: 1,
      displayBasisReady: false,
      displayBasisWidth: 0,
      displayBasisHeight: 0,
      shadeTimer: null,
      histogramRenderTimer: null,
      loadToken: 0,
      pairChoice: null,
      pairChoiceModal: null,
      pairChoiceToken: 0,
      exitConfirm: null,
      saveConfirm: null,
      saveOptions: { path: '', quality: 100, format: 'jpg', sizeMode: 'original', sizePreset: 'original', sizeWidth: 2048, sizeHeight: 1365, sizeLongEdge: 2048, includeFrame: false, preserveExif: false },
      saveProgress: null,
      saveToken: 0,
      saveSaving: false,
      batchMode: false,
      batchPhotos: [],
      batchIndex: 0,
      batchSessions: new Map(),
      batchSwitching: false,
      bakedSource: false,
    },
    lightbox: {
      photo: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      dragging: false,
      dragX: 0,
      dragY: 0,
      dragStartX: 0,
      dragStartY: 0,
      dragMoved: false,
      suppressCloseUntil: 0,
      infoX: 18,
      infoY: 18,
      infoVisible: true,
      infoDragging: false,
      infoResizing: false,
      infoResizeEdge: '',
      infoDragX: 0,
      infoDragY: 0,
      infoResizeStartX: 0,
      infoResizeStartY: 0,
      infoResizeStartWidth: 310,
      infoResizeStartHeight: 0,
      infoResizeStartLeft: 18,
      infoResizeStartTop: 18,
      navHoverSide: '',
      embedded: false,
      loadToken: 0,
    },
  };

  const LIGHTBOX_MIN_ZOOM = 0.25;
  const LIGHTBOX_MAX_ZOOM = 12;
  const LIGHTBOX_ZOOM_STEP = 1.2;
  const LIGHTBOX_NAV_HOVER_WIDTH = 112;
  const LIGHTBOX_INFO_MIN_WIDTH = 260;
  const LIGHTBOX_INFO_MAX_WIDTH = 620;
  const LIGHTBOX_INFO_MIN_HEIGHT = 120;
  const LIGHTBOX_INFO_MAX_HEIGHT = 760;
  const PREVIEW_CONCURRENCY = 4;
  const MORE_SCAN_COOLDOWN_MS = 650;
  const RENDER_AHEAD_PHOTOS = 20;
  const APP_BUILD = 'frame-text-edge-20260718-17';
  const FAVORITE_CATEGORY = '__picscanner_favorite_filter__';
  const HIDDEN_CATEGORY = '__picscanner_hidden_filter__';
  const DATE_RAIL_LOAD_LIMIT = 5000;
  const INITIAL_PHOTO_LIMIT = 40;
  const PHOTO_LOAD_BATCH = 20;
  const GALLERY_ITEM_SIZE_WHEEL_SCALE = 0.12;
  const SEARCH_DEBOUNCE_MS = 180;
  const QUICK_EDIT_CROP_MIN_SIZE = 0.001;
  const QUICK_EDIT_CROP_MIN_FRAME_PX = 48;
  const QUICK_EDIT_CROP_STAGE_MARGIN = 24;
  const QUICK_EDIT_MIN_ZOOM = 0.5;
  const QUICK_EDIT_MAX_ZOOM = LIGHTBOX_MAX_ZOOM;
  const QUICK_EDIT_SHADE_DELAY_MS = 500;
  const QUICK_EDIT_ROTATION_PX_PER_DEGREE = 8;
  const QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE = 720;
  const QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE = 1800;
  const QUICK_EDIT_SETTLED_PREVIEW_HARD_MAX_SIDE = QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE;
  const QUICK_EDIT_PREVIEW_RENDER_BUCKETS = [QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE];
  const QUICK_EDIT_ORIGINAL_PREVIEW_DELAY_MS = 650;
  const QUICK_EDIT_RAW_ORIGINAL_PREVIEW_DELAY_MS = 650;
  const QUICK_EDIT_ZOOM_SETTLE_RENDER_DELAY_MS = 220;
  const QUICK_EDIT_EXPOSURE_MIN_EV = -5;
  const QUICK_EDIT_EXPOSURE_MAX_EV = 5;
  const QUICK_EDIT_TEMPERATURE_MIN_K = 2000;
  const QUICK_EDIT_TEMPERATURE_NEUTRAL_K = 6500;
  const QUICK_EDIT_TEMPERATURE_MAX_K = 10000;
  const QUICK_EDIT_TEMPERATURE_STEP_K = 50;
  const QUICK_EDIT_DEFAULT_CURVE_POINTS = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ];
  const QUICK_EDIT_HSL_COLORS = [
    { key: 'red', label: 'R', name: '红色', hue: 0, color: '#ff6b6b' },
    { key: 'orange', label: 'O', name: '橙色', hue: 30, color: '#ff9f43' },
    { key: 'yellow', label: 'Y', name: '黄色', hue: 60, color: '#f8d94a' },
    { key: 'green', label: 'G', name: '绿色', hue: 120, color: '#62d66f' },
    { key: 'aqua', label: 'A', name: '青色', hue: 180, color: '#4dd7c8' },
    { key: 'blue', label: 'B', name: '蓝色', hue: 230, color: '#6f92ff' },
    { key: 'purple', label: 'P', name: '紫色', hue: 275, color: '#b47cff' },
    { key: 'magenta', label: 'M', name: '品红', hue: 320, color: '#ff6fc7' },
  ];
  const QUICK_EDIT_DEFAULT_PARAMS = {
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0,
    cropLeft: 0,
    rotation: 0,
    straighten: 0,
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    dehaze: 0,
    saturation: 0,
    vibrance: 0,
    sharpening: 0,
    clarity: 0,
    grain: 0,
    vignette: 0,
    vignetteFeather: 58,
    blackWhite: 0,
    bwRed: 0,
    bwYellow: 0,
    bwGreen: 0,
    bwAqua: 0,
    bwBlue: 0,
    bwMagenta: 0,
    temperature: QUICK_EDIT_TEMPERATURE_NEUTRAL_K,
    tint: 0,
    splitToneShadowsHue: 220,
    splitToneShadowsStrength: 0,
    splitToneMidtonesHue: 35,
    splitToneMidtonesStrength: 0,
    splitToneHighlightsHue: 45,
    splitToneHighlightsStrength: 0,
    splitToneBalance: 0,
    rawHighlightRecovery: 0,
    rawNoiseReduction: 0,
    lutStrength: 100,
    curveBlack: 0,
    curveMid: 50,
    curveWhite: 100,
    curvePoints: QUICK_EDIT_DEFAULT_CURVE_POINTS,
  };
  QUICK_EDIT_HSL_COLORS.forEach((color) => {
    QUICK_EDIT_DEFAULT_PARAMS['hsl_' + color.key + '_hue'] = 0;
    QUICK_EDIT_DEFAULT_PARAMS['hsl_' + color.key + '_saturation'] = 0;
    QUICK_EDIT_DEFAULT_PARAMS['hsl_' + color.key + '_luminance'] = 0;
  });
  const QUICK_EDIT_SPLIT_TONE_PRESETS = [
    { key: 'tealOrange', label: '青橙', shadowsHue: 205, shadowsStrength: 26, midtonesHue: 35, midtonesStrength: 8, highlightsHue: 42, highlightsStrength: 22, balance: 10 },
    { key: 'warmFilm', label: '暖胶片', shadowsHue: 225, shadowsStrength: 12, midtonesHue: 38, midtonesStrength: 14, highlightsHue: 48, highlightsStrength: 28, balance: 18 },
    { key: 'coolNight', label: '冷夜', shadowsHue: 225, shadowsStrength: 32, midtonesHue: 205, midtonesStrength: 14, highlightsHue: 48, highlightsStrength: 8, balance: -18 },
    { key: 'retroGreen', label: '复古绿', shadowsHue: 155, shadowsStrength: 22, midtonesHue: 55, midtonesStrength: 10, highlightsHue: 43, highlightsStrength: 20, balance: 0 },
  ];
  const QUICK_EDIT_SAVE_OPTIONS_KEY = 'PicScannerQuickEditSaveOptions';
  const QUICK_EDIT_SAVE_FORMATS = [
    { key: 'jpg', label: 'JPEG', detail: '体积小，适合分享和通用查看' },
    { key: 'png', label: 'PNG', detail: '无损压缩，适合图形和再次编辑' },
    { key: 'webp', label: 'WebP', detail: '更高压缩率，适合网页交付' },
    { key: 'tif16', label: 'TIFF 16-bit', detail: '保留 RAW 显影位深，仅 RAW 可用', rawOnly: true },
  ];
  const QUICK_EDIT_FRAME_TEXT_COLORS = [
    { color: '#222222', label: '深灰' },
    { color: '#f5f5f2', label: '米白' },
    { color: '#ffffff', label: '白色' },
    { color: '#ffb817', label: '暖黄' },
    { color: '#d94f45', label: '红色' },
    { color: '#4fa3ff', label: '蓝色' },
  ];
  const QUICK_EDIT_FRAME_TEXT_TOKENS = [
    { token: '{filename}', label: '文件名' },
    { token: '{origin_name}', label: '原始文件名' },
    { token: '{date}', label: '拍摄日期' },
    { token: '{Y}', label: '年份' },
    { token: '{M}', label: '月份' },
    { token: '{D}', label: '日期' },
    { token: '{camera}', label: '相机' },
    { token: '{model}', label: '机身型号' },
    { token: '{lens}', label: '镜头' },
    { token: '{shutter_speed}', label: '快门' },
    { token: '{aperture}', label: '光圈' },
    { token: '{iso}', label: 'ISO' },
    { token: '{focal_length}', label: '焦距' },
    { token: '{focal_length_35mm}', label: '等效焦距' },
    { token: '{format}', label: '格式' },
  ];
  const QUICK_EDIT_DEFAULT_SAVE_QUALITY = 100;
  const QUICK_EDIT_SAVE_QUALITY_PRESETS = [
    { key: 'draft', label: '预览', value: 70 },
    { key: 'standard', label: '标准', value: 85 },
    { key: 'high', label: '高质量', value: 95 },
    { key: 'max', label: '最高', value: 100 },
  ];
  const QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT = 2048;
  const QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MIN = 256;
  const QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX = 12000;

  function quickEditPerfEnabled() {
    try {
      const stored = window.localStorage ? window.localStorage.getItem('PicScannerQuickEditPerf') : null;
      if (stored === '0') return false;
      if (stored === '1') return true;
    } catch (err) {
      // localStorage may be unavailable in restricted WebView contexts.
    }
    return window.PicScannerQuickEditPerf !== false;
  }

  function quickEditPerfNow() {
    return window.performance && typeof window.performance.now === 'function'
      ? window.performance.now()
      : Date.now();
  }

  function quickEditPerfLog(label, payload) {
    if (!quickEditPerfEnabled()) return;
    const data = payload || {};
    console.info('[PicScanner][QuickEditPerf] ' + label, data);
    if (label === 'schedule') return;
    if (state.quickEditPerfBridgeDisabled) return;
    const bridge = api();
    if (!bridge || typeof bridge.log_quick_edit_perf !== 'function') {
      state.quickEditPerfBridgeDisabled = true;
      return;
    }
    Promise.resolve(bridge.log_quick_edit_perf(label, data)).catch((err) => {
      state.quickEditPerfBridgeDisabled = true;
      console.warn('[PicScanner] Python 快速调整性能日志不可用', err);
    });
  }

  const SORT_OPTIONS = [
    { key: 'datetime_desc', label: '拍摄时间 新到旧' },
    { key: 'datetime_asc', label: '拍摄时间 旧到新' },
    { key: 'filename_asc', label: '文件名 A 到 Z' },
    { key: 'filename_desc', label: '文件名 Z 到 A' },
    { key: 'size_desc', label: '文件大小 大到小' },
    { key: 'size_asc', label: '文件大小 小到大' },
  ];

  const SETTINGS_TABS = [
    { key: 'interface', label: '界面', hint: '缩略图与参数面板' },
    { key: 'export', label: '导出', hint: '目录与命名模板' },
    { key: 'storage', label: '存储', hint: '已登记来源' },
    { key: 'shortcuts', label: '快捷键', hint: '查看现有键位' },
    { key: 'about', label: '关于', hint: '版本与项目' },
  ];

  const PROJECT_URL = 'https://github.com/Himpq/PicScanner';

  const STATUS_LABELS = {
    idle: '等待扫描',
    discovering: '发现图片中',
    scanning: '扫描中',
    stopping: '停止中',
    stopped: '已停止',
    paused: '可继续扫描',
    done: '扫描完成',
    failed: '扫描失败',
    reading_exif: '读取 EXIF',
  };

  const EXIF_STATUS_LABELS = {
    idle: '等待 EXIF',
    reading_exif: '读取 EXIF',
    stopping: '停止中',
    stopped: '已停止',
    done: '读取完成',
    failed: '读取失败',
  };

  function scanStatusLabel(status) {
    return STATUS_LABELS[status] || status || '等待扫描';
  }

  function exifStatusLabel(status) {
    return EXIF_STATUS_LABELS[status] || status || '等待 EXIF';
  }

  const els = {
    sourceScreen: document.getElementById('source-screen'),
    workspace: document.getElementById('workspace'),
    sourceConnectedCount: document.getElementById('source-connected-count'),
    driveList: document.getElementById('drive-list'),
    sourceOpenSettings: document.getElementById('source-open-settings'),
    refreshSources: document.getElementById('refresh-sources'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmPath: document.getElementById('confirm-path'),
    confirmScan: document.getElementById('confirm-scan'),
    cancelScan: document.getElementById('cancel-scan'),
    exportConfirmModal: document.getElementById('export-confirm-modal'),
    exportConfirmTitle: document.getElementById('export-confirm-title'),
    exportConfirmText: document.getElementById('export-confirm-text'),
    confirmExport: document.getElementById('confirm-export'),
    cancelExport: document.getElementById('cancel-export'),
    inputModal: document.getElementById('input-modal'),
    inputModalTitle: document.getElementById('input-modal-title'),
    inputModalMessage: document.getElementById('input-modal-message'),
    inputModalInput: document.getElementById('input-modal-input'),
    inputModalTextarea: document.getElementById('input-modal-textarea'),
    inputModalCancel: document.getElementById('input-modal-cancel'),
    inputModalConfirm: document.getElementById('input-modal-confirm'),
    currentSource: document.getElementById('current-source'),
    scanBlock: document.getElementById('scan-block'),
    exifBlock: document.getElementById('exif-block'),
    progressBar: document.getElementById('progress-bar'),
    exifProgressBar: document.getElementById('exif-progress-bar'),
    scanStatus: document.getElementById('scan-status'),
    scanCount: document.getElementById('scan-count'),
    scanMessage: document.getElementById('scan-message'),
    exifStatus: document.getElementById('exif-status'),
    exifCount: document.getElementById('exif-count'),
    exifMessage: document.getElementById('exif-message'),
    addCategory: document.getElementById('add-category'),
    categoryList: document.getElementById('category-list'),
    timeRange: document.getElementById('time-range'),
    changeSource: document.getElementById('change-source'),
    openSettings: document.getElementById('open-settings'),
    openStats: document.getElementById('open-stats'),
    filterTrigger: document.getElementById('filter-trigger'),
    scanAll: document.getElementById('scan-all'),
    readExif: document.getElementById('read-exif'),
    sortDropdown: document.getElementById('sort-dropdown'),
    sortTrigger: document.getElementById('sort-trigger'),
    sortLabel: document.getElementById('sort-label'),
    sortMenu: document.getElementById('sort-menu'),
    searchPanel: document.getElementById('search-panel'),
    searchInput: document.getElementById('search-input'),
    searchClose: document.getElementById('search-close'),
    searchStatus: document.getElementById('search-status'),
    searchResults: document.getElementById('search-results'),
    galleryScroll: document.getElementById('gallery-scroll'),
    gallery: document.getElementById('gallery'),
    olderSentinel: document.getElementById('older-sentinel'),
    dateRail: document.getElementById('date-rail-list'),
    exifPop: document.getElementById('exif-pop'),
    lightbox: document.getElementById('lightbox'),
    lightboxStage: document.getElementById('lightbox-stage'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxCompare: document.getElementById('lightbox-compare'),
    compareImgA: document.getElementById('compare-img-a'),
    compareImgB: document.getElementById('compare-img-b'),
    compareToolbar: document.getElementById('compare-toolbar'),
    compareZoomA: document.getElementById('compare-zoom-a'),
    compareZoomB: document.getElementById('compare-zoom-b'),
    compareLock: document.getElementById('compare-lock'),
    compareInfoToggle: document.getElementById('compare-info-toggle'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxInfo: document.getElementById('lightbox-info'),
    lightboxInfoHead: document.getElementById('lightbox-info-head'),
    lightboxInfoDetailsToggle: document.getElementById('lightbox-info-details-toggle'),
    lightboxInfoClose: document.getElementById('lightbox-info-close'),
    lightboxInfoBody: document.getElementById('lightbox-info-body'),
    lightboxInfoToggle: document.getElementById('lightbox-info-toggle'),
    lightboxPrev: document.getElementById('lightbox-prev'),
    lightboxNext: document.getElementById('lightbox-next'),
    lightboxZoomOut: document.getElementById('lightbox-zoom-out'),
    lightboxZoomIn: document.getElementById('lightbox-zoom-in'),
    lightboxZoom: document.getElementById('lightbox-zoom'),
    lightboxApscFocal: document.getElementById('lightbox-apsc-focal'),
    lightboxFocal: document.getElementById('lightbox-focal'),
    settingsScreen: document.getElementById('settings-screen'),
    closeSettings: document.getElementById('close-settings'),
    settingsNav: document.getElementById('settings-nav'),
    settingsBody: document.getElementById('settings-body'),
    statsScreen: document.getElementById('stats-screen'),
    closeStats: document.getElementById('close-stats'),
    statsSource: document.getElementById('stats-source'),
    statsStorageList: document.getElementById('stats-storage-list'),
    statsTabs: document.getElementById('stats-tabs'),
    statsSummary: document.getElementById('stats-summary'),
    hourChart: document.getElementById('hour-chart'),
    monthChart: document.getElementById('month-chart'),
    lensChart: document.getElementById('lens-chart'),
    focalChart: document.getElementById('focal-chart'),
    cameraChart: document.getElementById('camera-chart'),
    apertureChart: document.getElementById('aperture-chart'),
    isoChart: document.getElementById('iso-chart'),
    shutterChart: document.getElementById('shutter-chart'),
  };
  const lightboxHomeParent = els.lightbox.parentNode;
  const lightboxHomeNextSibling = els.lightbox.nextSibling;

  function api() {
    return (window.pywebview && window.pywebview.api) ? window.pywebview.api : null;
  }

  function call(name, ...args) {
    const a = api();
    if (!a || !a[name]) {
      return Promise.reject(new Error('pywebview bridge not ready: ' + name));
    }
    return a[name](...args);
  }

  function quickEditGeometryApi() {
    const geometry = window.PicScannerQuickEditGeometry;
    if (!geometry) throw new Error('快速修图几何模块未加载');
    return geometry;
  }

  const STARTUP_API_METHODS = ['get_startup_state', 'get_sources', 'get_scan_state'];

  function missingStartupApiMethods() {
    const bridge = api();
    return STARTUP_API_METHODS.filter((name) => !bridge || typeof bridge[name] !== 'function');
  }

  function startupApiReady() {
    return missingStartupApiMethods().length === 0;
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function finishTextInput(value) {
    if (!state.inputDialog) return;
    const dialog = state.inputDialog;
    state.inputDialog = null;
    hide(els.inputModal);
    els.inputModalInput.value = '';
    els.inputModalTextarea.value = '';
    dialog.resolve(value);
  }

  function activeInputModalField() {
    return els.inputModalTextarea.classList.contains('hidden')
      ? els.inputModalInput
      : els.inputModalTextarea;
  }

  function openTextInput(options) {
    const config = options || {};
    if (state.inputDialog) finishTextInput(null);
    els.inputModalTitle.textContent = String(config.title || '输入内容');
    const message = String(config.message || '');
    els.inputModalMessage.textContent = message;
    els.inputModalMessage.classList.toggle('hidden', !message);
    const multiline = !!config.multiline;
    els.inputModalInput.classList.toggle('hidden', multiline);
    els.inputModalTextarea.classList.toggle('hidden', !multiline);
    const field = multiline ? els.inputModalTextarea : els.inputModalInput;
    field.value = String(config.value || '');
    field.placeholder = String(config.placeholder || '');
    document.body.appendChild(els.inputModal);
    show(els.inputModal);
    requestAnimationFrame(() => {
      field.focus();
      field.select();
    });
    return new Promise((resolve) => {
      state.inputDialog = { resolve };
    });
  }

  function confirmTextInput() {
    if (!state.inputDialog) return;
    finishTextInput(activeInputModalField().value);
  }

  function cancelTextInput() {
    finishTextInput(null);
  }

  function ensureToast() {
    if (state.toastEl && state.toastEl.isConnected) return state.toastEl;
    const toast = document.createElement('div');
    toast.className = 'app-toast hidden';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    state.toastEl = toast;
    return toast;
  }

  function showToast(message, type) {
    const clean = String(message || '').trim();
    if (!clean) return;
    const toast = ensureToast();
    toast.textContent = clean;
    toast.dataset.type = type || 'info';
    toast.classList.remove('hidden', 'show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      state.toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
      }, 180);
    }, 1600);
  }

  function text(value, empty) {
    if (value === null || value === undefined || value === '') return empty || '—';
    return String(value);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function joinClean(items, sep) {
    return items.filter((x) => x !== null && x !== undefined && x !== '').join(sep);
  }

  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.PS = {
    state,
    els,
    lightboxHomeParent,
    lightboxHomeNextSibling,
    api,
    call,
    quickEditGeometryApi,
    missingStartupApiMethods,
    startupApiReady,
    show,
    hide,
    finishTextInput,
    activeInputModalField,
    openTextInput,
    confirmTextInput,
    cancelTextInput,
    ensureToast,
    showToast,
    text,
    clamp,
    joinClean,
    escapeHtml,
    scanStatusLabel,
    exifStatusLabel,
    quickEditPerfEnabled,
    quickEditPerfNow,
    quickEditPerfLog,
    SORT_OPTIONS,
    SETTINGS_TABS,
    PROJECT_URL,
    STATUS_LABELS,
    EXIF_STATUS_LABELS,
    LIGHTBOX_MIN_ZOOM,
    LIGHTBOX_MAX_ZOOM,
    LIGHTBOX_ZOOM_STEP,
    LIGHTBOX_NAV_HOVER_WIDTH,
    LIGHTBOX_INFO_MIN_WIDTH,
    LIGHTBOX_INFO_MAX_WIDTH,
    LIGHTBOX_INFO_MIN_HEIGHT,
    LIGHTBOX_INFO_MAX_HEIGHT,
    PREVIEW_CONCURRENCY,
    MORE_SCAN_COOLDOWN_MS,
    RENDER_AHEAD_PHOTOS,
    APP_BUILD,
    FAVORITE_CATEGORY,
    HIDDEN_CATEGORY,
    DATE_RAIL_LOAD_LIMIT,
    INITIAL_PHOTO_LIMIT,
    PHOTO_LOAD_BATCH,
    GALLERY_ITEM_SIZE_WHEEL_SCALE,
    SEARCH_DEBOUNCE_MS,
    QUICK_EDIT_CROP_MIN_SIZE,
    QUICK_EDIT_CROP_MIN_FRAME_PX,
    QUICK_EDIT_CROP_STAGE_MARGIN,
    QUICK_EDIT_MIN_ZOOM,
    QUICK_EDIT_MAX_ZOOM,
    QUICK_EDIT_SHADE_DELAY_MS,
    QUICK_EDIT_ROTATION_PX_PER_DEGREE,
    QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE,
    QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE,
    QUICK_EDIT_SETTLED_PREVIEW_HARD_MAX_SIDE,
    QUICK_EDIT_PREVIEW_RENDER_BUCKETS,
    QUICK_EDIT_ORIGINAL_PREVIEW_DELAY_MS,
    QUICK_EDIT_RAW_ORIGINAL_PREVIEW_DELAY_MS,
    QUICK_EDIT_ZOOM_SETTLE_RENDER_DELAY_MS,
    QUICK_EDIT_EXPOSURE_MIN_EV,
    QUICK_EDIT_EXPOSURE_MAX_EV,
    QUICK_EDIT_TEMPERATURE_MIN_K,
    QUICK_EDIT_TEMPERATURE_NEUTRAL_K,
    QUICK_EDIT_TEMPERATURE_MAX_K,
    QUICK_EDIT_TEMPERATURE_STEP_K,
    QUICK_EDIT_DEFAULT_CURVE_POINTS,
    QUICK_EDIT_HSL_COLORS,
    QUICK_EDIT_DEFAULT_PARAMS,
    QUICK_EDIT_SPLIT_TONE_PRESETS,
    QUICK_EDIT_SAVE_OPTIONS_KEY,
    QUICK_EDIT_SAVE_FORMATS,
    QUICK_EDIT_FRAME_TEXT_COLORS,
    QUICK_EDIT_FRAME_TEXT_TOKENS,
    QUICK_EDIT_DEFAULT_SAVE_QUALITY,
    QUICK_EDIT_SAVE_QUALITY_PRESETS,
    QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT,
    QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MIN,
    QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX,
  };

  // 双轨同步（P2）：window.PS 刚定义完成。Vue 包（picscanner-vue.js）先于本文件加载，
  // 但其模块求值期 window.PS 尚不存在，main.js 内的 syncToLegacyPS 是 no-op。
  // 此处主动把 Vue 侧（constants.js / bridge）的权威常量与 bridgeCall 写入 window.PS，
  // 让双向桥接真正生效。若将来 app_core 内联常量被删除，这一行仍是唯一保险。
  if (window.PicScannerVue && typeof window.PicScannerVue.resyncToLegacyPS === 'function') {
    window.PicScannerVue.resyncToLegacyPS();
  }

  // F12 — 临时仅日志，不调 Python，避免死锁定位
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'F12' || ev.keyCode === 123) {
      ev.preventDefault();
      ev.stopPropagation();
      try { console.log('[F12] pressed, pywebview=' + !!(window.pywebview && window.pywebview.api)); } catch {}
      try { if (typeof call === 'function') call('log', '[F12] pressed').catch(()=>{}); } catch {}
      // 暂不调 open_devtools，避免窗口未响应；需 DevTools 请右键→检查或 Ctrl+Shift+I
    }
  });
})();
