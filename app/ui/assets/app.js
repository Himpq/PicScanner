(function () {
  const state = {
    selectedSource: null,
    sourcePage: 'connected',
    dates: [],
    dateCounts: new Map(),
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
    settingsTab: 'basic',
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
      committedPanX: 0,
      committedPanY: 0,
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
      lut: null,
      luts: [],
      collapsedSections: { tone: false, color: false, detail: false, hsl: false, lut: false },
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
      previewObjectUrl: '',
      zoomTimer: null,
      history: [],
      viewZoom: 1,
      shadeTimer: null,
      histogramRenderTimer: null,
      loadToken: 0,
      pairChoice: null,
      pairChoiceModal: null,
      pairChoiceToken: 0,
      exitConfirm: null,
      saveConfirm: null,
      saveOptions: { path: '', quality: 100, format: 'jpg', sizeMode: 'original', sizePreset: 'original', sizeWidth: 2048, sizeHeight: 1365, sizeLongEdge: 2048 },
      saveProgress: null,
      saveToken: 0,
      saveSaving: false,
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
  const APP_BUILD = 'quick-edit-panel-preview-20260705-1';
  const FAVORITE_CATEGORY = '__picscanner_favorite_filter__';
  const DATE_RAIL_LOAD_LIMIT = 5000;
  const INITIAL_PHOTO_LIMIT = 40;
  const PHOTO_LOAD_BATCH = 20;
  const GALLERY_ITEM_SIZE_WHEEL_SCALE = 0.12;
  const SEARCH_DEBOUNCE_MS = 180;
  const QUICK_EDIT_CROP_MIN_SIZE = 12;
  const QUICK_EDIT_MIN_ZOOM = 1;
  const QUICK_EDIT_MAX_ZOOM = LIGHTBOX_MAX_ZOOM;
  const QUICK_EDIT_ZOOM_STEP = LIGHTBOX_ZOOM_STEP;
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
    temperature: QUICK_EDIT_TEMPERATURE_NEUTRAL_K,
    tint: 0,
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
  const QUICK_EDIT_SAVE_OPTIONS_KEY = 'PicScannerQuickEditSaveOptions';
  const QUICK_EDIT_SAVE_FORMATS = [
    { key: 'jpg', label: 'JPEG', detail: '体积小，适合分享和通用查看' },
    { key: 'png', label: 'PNG', detail: '无损压缩，适合图形和再次编辑' },
    { key: 'webp', label: 'WebP', detail: '更高压缩率，适合网页交付' },
    { key: 'tif16', label: 'TIFF 16-bit', detail: '保留 RAW 显影位深，仅 RAW 可用', rawOnly: true },
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
    { key: 'basic', label: '总览', hint: '当前图库与任务' },
    { key: 'interface', label: '界面', hint: '缩略图与参数面板' },
    { key: 'export', label: '导出', hint: '目录与命名模板' },
    { key: 'storage', label: '存储', hint: '已登记来源' },
    { key: 'shortcuts', label: '快捷键', hint: '查看现有键位' },
    { key: 'about', label: '关于', hint: '版本与项目' },
  ];

  const STATS_COLORS = ['#8fa2d8', '#67b99a', '#d3ad4e', '#66b3cf', '#d88976', '#ad8ad7'];

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

  function scanStatusLabel(status) {
    return STATUS_LABELS[status] || status || '等待扫描';
  }

  const els = {
    sourceScreen: document.getElementById('source-screen'),
    workspace: document.getElementById('workspace'),
    sourcePageTabs: document.getElementById('source-page-tabs'),
    sourceConnectedCount: document.getElementById('source-connected-count'),
    sourceHistoryCount: document.getElementById('source-history-count'),
    driveList: document.getElementById('drive-list'),
    folderList: document.getElementById('folder-list'),
    folderWrap: document.getElementById('folder-wrap'),
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
    settingsTitle: document.getElementById('settings-title'),
    settingsBody: document.getElementById('settings-body'),
    statsScreen: document.getElementById('stats-screen'),
    closeStats: document.getElementById('close-stats'),
    statsSource: document.getElementById('stats-source'),
    statsStorageList: document.getElementById('stats-storage-list'),
    statsSummary: document.getElementById('stats-summary'),
    statsInsights: document.getElementById('stats-insights'),
    hourChart: document.getElementById('hour-chart'),
    monthChart: document.getElementById('month-chart'),
    lensChart: document.getElementById('lens-chart'),
    focalChart: document.getElementById('focal-chart'),
    cameraChart: document.getElementById('camera-chart'),
    apertureChart: document.getElementById('aperture-chart'),
    isoChart: document.getElementById('iso-chart'),
    shutterChart: document.getElementById('shutter-chart'),
  };

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

  function showSourceChooser() {
    if (state.quickEdit.saveSaving) {
      showQuickEditSaveConfirm();
      return;
    }
    closeQuickEdit({ silent: true });
    closeSearchPanel();
    closeSettingsPage({ animate: false });
    closeStatsPage({ animate: false });
    closeExportConfirm();
    hide(els.confirmModal);
    hide(els.workspace);
    show(els.sourceScreen);
    playSourceEnter();
    loadSources();
  }

  function text(value, empty) {
    if (value === null || value === undefined || value === '') return empty || '—';
    return String(value);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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

  function setSourcePage(page) {
    const next = page === 'history' ? 'history' : 'connected';
    state.sourcePage = next;
    if (els.sourcePageTabs) {
      els.sourcePageTabs.querySelectorAll('[data-source-page-tab]').forEach((btn) => {
        const active = btn.dataset.sourcePageTab === next;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    els.sourceScreen.querySelectorAll('[data-source-page]').forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.sourcePage !== next);
    });
  }

  function sourceEmpty(textValue) {
    const item = document.createElement('div');
    item.className = 'source-empty';
    item.textContent = textValue;
    return item;
  }

  function updateSourcePageCounts(connectedCount, historyCount) {
    if (els.sourceConnectedCount) els.sourceConnectedCount.textContent = String(Math.max(0, Number(connectedCount || 0)));
    if (els.sourceHistoryCount) els.sourceHistoryCount.textContent = String(Math.max(0, Number(historyCount || 0)));
  }

  function sourceSummaryText(item) {
    if (item.unavailable) return item.unavailable_message || '来源未插入或已更换';
    const summary = item.summary || {};
    if (summary.has_cache) {
      return '已扫描 ' + (summary.visible_files || summary.total_files || 0) + ' 张';
    }
    if (item.exists === false) return '目录不可用';
    return item.subtitle || item.path;
  }

  function selectSource(item) {
    state.selectedSource = item;
    enterSourceWorkspace(item);
  }

  function sourceCard(item, extraClass) {
    const btn = document.createElement('button');
    btn.className = 'source-item' + (extraClass ? ' ' + extraClass : '');
    if (item.kind === 'add') {
      btn.innerHTML = '<div><div class="plus">+</div><div class="source-title">添加文件夹</div><div class="source-sub">选择后会记忆到本机</div></div>';
      btn.addEventListener('click', chooseFolder);
      return btn;
    }
    const summary = item.summary || {};
    const coverUrl = summary.cover_url || '';
    if (coverUrl) btn.classList.add('has-cover');
    if (item.unavailable) {
      btn.classList.add('unavailable');
      btn.disabled = true;
      btn.title = item.unavailable_message || '来源未插入或已更换';
    }
    btn.innerHTML = [
      '<div class="source-cover"></div>',
      '<div class="source-content">',
      '<div class="source-kicker"></div>',
      '<div class="source-title"></div>',
      '<div class="source-sub"></div>',
      '</div>',
    ].join('');
    if (coverUrl) btn.querySelector('.source-cover').style.backgroundImage = 'url("' + coverUrl + '")';
    btn.querySelector('.source-kicker').textContent = item.kind === 'drive' ? '磁盘' : (item.kind === 'history' ? '历史' : '目录');
    btn.querySelector('.source-title').textContent = item.title || item.path;
    btn.querySelector('.source-sub').textContent = sourceSummaryText(item);
    if (!item.unavailable) btn.addEventListener('click', () => selectSource(item));
    return btn;
  }

  function renderSources(data) {
    const drives = data && Array.isArray(data.drives) ? data.drives : [];
    const folders = data && Array.isArray(data.remembered_folders) ? data.remembered_folders : [];
    updateSourcePageCounts(drives.length, folders.length);

    els.driveList.innerHTML = '';
    if (!drives.length) els.driveList.appendChild(sourceEmpty('没有检测到已连接设备'));
    drives.forEach((item) => els.driveList.appendChild(sourceCard(item)));
    els.driveList.appendChild(sourceCard({ kind: 'add' }, 'add'));

    els.folderList.innerHTML = '';
    els.folderWrap.style.display = '';
    if (!folders.length) {
      els.folderList.appendChild(sourceEmpty('还没有历史记录'));
    } else {
      folders.forEach((item) => els.folderList.appendChild(sourceCard(item)));
    }
    setSourcePage(state.sourcePage);
  }

  function loadSources() {
    call('get_sources').then((data) => {
      applyAppConfig(data && data.config);
      renderSources(data);
    }).catch((err) => {
      updateSourcePageCounts(0, 0);
      els.driveList.innerHTML = '';
      const item = document.createElement('div');
      item.className = 'source-item';
      item.textContent = String(err);
      els.driveList.appendChild(item);
      els.folderList.innerHTML = '';
      els.folderList.appendChild(sourceEmpty('来源读取失败'));
      setSourcePage(state.sourcePage);
    });
  }

  function chooseFolder() {
    call('choose_folder').then((res) => {
      if (!res || !res.success) {
        if (!res || !res.cancelled) console.warn(res && res.message);
        return loadSources();
      }
      loadSources();
      selectSource({
        kind: 'folder',
        path: res.path,
        title: res.title || res.path,
        subtitle: res.path,
        summary: res.summary || {},
      });
    }).catch(console.error);
  }

  function resetGallery() {
    state.dates = [];
    state.dateCounts = new Map();
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
    state.previewQueue = [];
    state.previewActive = 0;
    state.previewTicking = false;
    state.previewSessionId += 1;
    state.renderBufferTicking = false;
    state.renderBufferLoading = false;
    state.placeholderFillTicking = false;
    state.pendingRestoreDate = '';
    state.pendingRestoreOffset = 0;
    state.restoringDate = false;
    state.lastViewedDateSaved = '';
    state.suppressLastViewedSaveUntil = 0;
    clearTimeout(state.saveViewedDateTimer);
    state.saveViewedDateTimer = null;
    if (imageObserver) imageObserver.disconnect();
    if (dateSectionObserver) dateSectionObserver.disconnect();
    if (moreObserver) moreObserver.disconnect();
    els.gallery.innerHTML = '';
    els.dateRail.innerHTML = '';
  }

  function beginScan() {
    if (!state.selectedSource) return;
    hide(els.confirmModal);
    hide(els.sourceScreen);
    show(els.workspace);
    playWorkspaceEnter();
    els.currentSource.textContent = state.selectedSource.path;
    state.currentRootPath = state.selectedSource.path;
    state.currentSourceId = state.selectedSource.source_id || (state.selectedSource.summary && state.selectedSource.summary.source_id) || '';
    state.scanRunning = true;
    state.scanStoppedByUser = false;
    resetSourceFilterContext();
    resetGallery();
    call('start_scan', state.selectedSource.path).then((res) => {
      if (res && res.source_id) {
        state.currentSourceId = res.source_id;
        loadCategories();
      }
      if (!res.success) {
        els.scanMessage.textContent = res.message || '扫描启动失败';
        state.scanRunning = false;
      }
      setTimeout(() => {
        refreshState();
        loadOlderDates();
      }, 250);
    }).catch((err) => {
      els.scanMessage.textContent = String(err);
    });
  }

  function renderStatsGroup(el, rows) {
    el.innerHTML = '';
    (rows || []).slice(0, 8).forEach((row) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = '<span></span><b></b>';
      chip.querySelector('span').textContent = row.name || '?';
      chip.querySelector('b').textContent = row.count || 0;
      el.appendChild(chip);
    });
  }

  function currentSortOption() {
    const option = SORT_OPTIONS.find((item) => item.key === state.sortKey);
    if (!option) throw new Error('未知排序方式: ' + state.sortKey);
    return option;
  }

  function setSortOpen(open) {
    state.sortOpen = !!open;
    els.sortMenu.classList.toggle('hidden', !state.sortOpen);
    els.sortTrigger.setAttribute('aria-expanded', state.sortOpen ? 'true' : 'false');
  }

  function renderSortMenu() {
    els.sortMenu.innerHTML = '';
    SORT_OPTIONS.forEach((option) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sort-option';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', option.key === state.sortKey ? 'true' : 'false');
      btn.dataset.sortKey = option.key;
      btn.textContent = option.label;
      btn.addEventListener('click', () => applySort(option.key));
      els.sortMenu.appendChild(btn);
    });
    els.sortLabel.textContent = currentSortOption().label;
  }

  function applySort(sortKey) {
    if (!SORT_OPTIONS.some((item) => item.key === sortKey)) throw new Error('未知排序方式: ' + sortKey);
    setSortOpen(false);
    if (sortKey === state.sortKey) return;
    state.sortKey = sortKey;
    renderSortMenu();
    resetGallery();
    els.galleryScroll.scrollTo({ top: 0 });
    loadOlderDates({ allowScanRequest: false }).then(() => {
      scheduleRenderBufferCheck();
      scheduleVisiblePreviewCheck();
    });
  }

  function clampItemSize(value) {
    return clamp(Number(value) || 168, 112, 280);
  }

  function scheduleGalleryItemSizeSave() {
    clearTimeout(state.itemSizeSaveTimer);
    state.itemSizeSaveTimer = setTimeout(() => {
      call('set_gallery_item_size', state.galleryItemSize).catch(console.warn);
    }, 260);
  }

  function applyGalleryItemSize(size, options) {
    state.galleryItemSizeRaw = clampItemSize(size);
    if (!options || options.preserveTarget !== true) {
      state.galleryItemSizeTarget = state.galleryItemSizeRaw;
    }
    state.galleryItemSize = Math.round(state.galleryItemSizeRaw);
    document.documentElement.style.setProperty('--photo-min-size', state.galleryItemSizeRaw.toFixed(2) + 'px');
    if (!options || options.save !== false) {
      scheduleGalleryItemSizeSave();
    }
  }

  function normalizeLightboxInfoPosition(position) {
    if (!position || typeof position !== 'object') return null;
    const x = Number(position.x);
    const y = Number(position.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return null;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function normalizeLightboxInfoSize(size) {
    if (!size || typeof size !== 'object') return null;
    const width = Number(size.width);
    const height = Number(size.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return {
      width: Math.round(clamp(width, LIGHTBOX_INFO_MIN_WIDTH, LIGHTBOX_INFO_MAX_WIDTH)),
      height: Math.round(clamp(height, LIGHTBOX_INFO_MIN_HEIGHT, LIGHTBOX_INFO_MAX_HEIGHT)),
    };
  }

  function normalizeExportPreset(preset) {
    const raw = preset && typeof preset === 'object' ? preset : {};
    const template = String(raw.template || '').trim() || '{origin_name}';
    return {
      enabled: raw.enabled === true,
      destination: String(raw.destination || '').trim(),
      template,
    };
  }

  function applyAppConfig(config) {
    if (!config || typeof config !== 'object') return;
    if (Object.prototype.hasOwnProperty.call(config, 'gallery_item_size')) {
      applyGalleryItemSize(config.gallery_item_size, { save: false });
    }
    if (Object.prototype.hasOwnProperty.call(config, 'export_preset')) {
      state.exportPreset = normalizeExportPreset(config.export_preset);
    }
    if (Object.prototype.hasOwnProperty.call(config, 'lightbox_info_visible')) {
      state.lightboxInfoPreferredVisible = config.lightbox_info_visible !== false;
    }
    if (Object.prototype.hasOwnProperty.call(config, 'lightbox_info_position')) {
      const position = normalizeLightboxInfoPosition(config.lightbox_info_position);
      if (position) {
        state.lightboxInfoPreferredPosition = position;
        state.lightbox.infoX = position.x;
        state.lightbox.infoY = position.y;
      } else if (config.lightbox_info_position != null) {
        console.warn('[PicScanner] 参数面板位置配置格式错误', config.lightbox_info_position);
      }
    }
    if (Object.prototype.hasOwnProperty.call(config, 'lightbox_info_size')) {
      const size = normalizeLightboxInfoSize(config.lightbox_info_size);
      if (size) {
        state.lightboxInfoPreferredSize = size;
        applyLightboxInfoSize(size);
      } else if (config.lightbox_info_size != null) {
        console.warn('[PicScanner] 参数面板尺寸配置格式错误', config.lightbox_info_size);
      }
    }
    if (Object.prototype.hasOwnProperty.call(config, 'lightbox_info_details_collapsed')) {
      setLightboxInfoDetailsCollapsed(config.lightbox_info_details_collapsed === true, { save: false });
    }
    if (Object.prototype.hasOwnProperty.call(config, 'quick_edit_collapsed_sections')) {
      setQuickEditCollapsedSections(config.quick_edit_collapsed_sections, { save: false });
    }
  }

  function normalizeFilter(filter) {
    const raw = filter || {};
    const clean = {};
    if (raw.favorite) clean.favorite = true;
    const lens = String(raw.lens || '').trim();
    if (lens) clean.lens = lens;
    const focal = String(raw.focal_bucket || '').trim();
    if (focal) clean.focal_bucket = focal;
    const start = String(raw.start_date || '').trim();
    if (start) clean.start_date = start;
    const end = String(raw.end_date || '').trim();
    if (end) clean.end_date = end;
    return clean;
  }

  function filterPayload() {
    const filter = normalizeFilter(state.activeFilter);
    if (state.activeCategory === FAVORITE_CATEGORY) {
      filter.favorite = true;
    } else if (state.activeCategory !== null) {
      filter.category = String(state.activeCategory || '');
    }
    return Object.keys(filter).length ? filter : null;
  }

  function viewedCategoryKey(categoryName) {
    if (categoryName === FAVORITE_CATEGORY) return '__favorite__';
    return categoryName === null ? '__all__' : 'category:' + String(categoryName || '');
  }

  function applySourceViewedDates(sourceState) {
    state.sourceLastViewedDate = String((sourceState && sourceState.last_viewed_date) || '').trim();
    state.sourceLastViewedOffset = Math.max(0, Number((sourceState && sourceState.last_viewed_offset) || 0));
    state.categoryLastViewedDates = new Map();
    const dates = sourceState && sourceState.category_last_viewed_dates;
    if (!dates || typeof dates !== 'object') return;
    Object.keys(dates).forEach((name) => {
      const value = dates[name];
      const dateKey = String(value && typeof value === 'object' ? value.date : value || '').trim();
      const offset = Math.max(0, Number(value && typeof value === 'object' ? value.offset : 0));
      if (dateKey) state.categoryLastViewedDates.set(String(name || ''), { date: dateKey, offset });
    });
  }

  function viewedPositionForCategory(categoryName, sourceState) {
    if (categoryName === null) {
      return {
        date: String((sourceState && sourceState.last_viewed_date) || state.sourceLastViewedDate || '').trim(),
        offset: Math.max(0, Number((sourceState && sourceState.last_viewed_offset) || state.sourceLastViewedOffset || 0)),
      };
    }
    return state.categoryLastViewedDates.get(String(categoryName || '')) || { date: '', offset: 0 };
  }

  function hasActiveFilter() {
    return Object.keys(normalizeFilter(state.activeFilter)).length > 0;
  }

  function updateFilterButton() {
    if (!els.filterTrigger) return;
    const active = hasActiveFilter();
    els.filterTrigger.classList.toggle('active', active);
    els.filterTrigger.textContent = active ? '筛选中' : '筛选';
  }

  function applyFilter(filter) {
    state.activeFilter = normalizeFilter(filter);
    updateFilterButton();
    closeFilterPop();
    closeFilterMenu();
    resetGallery();
    els.galleryScroll.scrollTo({ top: 0 });
    loadOlderDates({ allowScanRequest: false }).then(() => {
      schedulePlaceholderPhotoFill();
      scheduleVisiblePreviewCheck();
    });
  }

  function clearActiveFilter() {
    state.activeFilter = {};
    updateFilterButton();
    closeFilterPop();
    closeFilterMenu();
    resetGallery();
    els.galleryScroll.scrollTo({ top: 0 });
    loadOlderDates({ allowScanRequest: false }).then(() => {
      schedulePlaceholderPhotoFill();
      scheduleVisiblePreviewCheck();
    });
  }

  function resetSourceFilterContext() {
    state.activeFilter = {};
    state.filterDraft = {};
    state.filterOptions = null;
    state.activeCategory = null;
    state.categories = [];
    state.favoriteCount = 0;
    state.categoryLastViewedDates = new Map();
    state.compare.selected = [null, null];
    state.compare.open = false;
    if (state.compare.panel) state.compare.panel.classList.add('hidden');
    updateFilterButton();
    renderCategoryList();
    renderComparePanel();
    closeFilterPop();
    closeFilterMenu();
    closeCategoryPicker();
  }

  function categoryLabel(category) {
    return String((category && (category.label || category.name)) || '未分类');
  }

  function categoryBadgeText(categoryName) {
    const label = String(categoryName || '').trim();
    return label ? label.slice(0, 1) : '';
  }

  function renderCategoryList() {
    if (!els.categoryList) return;
    els.categoryList.innerHTML = '';
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'category-item';
    all.classList.toggle('active', state.activeCategory === null);
    all.innerHTML = '<span>全部照片</span><b></b>';
    all.querySelector('b').textContent = '';
    all.addEventListener('click', () => setActiveCategory(null));
    all.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      els.scanMessage.textContent = '全部照片不允许批量导出';
    });
    els.categoryList.appendChild(all);

    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.className = 'category-item category-favorite';
    favorite.classList.toggle('active', state.activeCategory === FAVORITE_CATEGORY);
    favorite.innerHTML = '<span>收藏</span><b></b>';
    favorite.querySelector('b').textContent = Number(state.favoriteCount || 0);
    favorite.addEventListener('click', () => setActiveCategory(FAVORITE_CATEGORY));
    favorite.addEventListener('contextmenu', (ev) => showCategoryExportMenu(ev, {
      exportType: 'favorite',
      label: '收藏',
      categoryName: '',
    }));
    els.categoryList.appendChild(favorite);

    (state.categories || []).forEach((category) => {
      const name = String(category.name || '');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-item';
      btn.classList.toggle('active', state.activeCategory === name);
      btn.innerHTML = '<span></span><b></b>';
      btn.querySelector('span').textContent = categoryLabel(category);
      btn.querySelector('b').textContent = Number(category.count || 0);
      btn.addEventListener('click', () => setActiveCategory(name));
      btn.addEventListener('contextmenu', (ev) => showCategoryExportMenu(ev, {
        exportType: 'category',
        label: categoryLabel(category),
        categoryName: name,
      }));
      els.categoryList.appendChild(btn);
    });
  }

  function loadCategories() {
    if (!state.currentSourceId) {
      state.categories = [];
      state.favoriteCount = 0;
      renderCategoryList();
      return Promise.resolve([]);
    }
    return call('list_categories', state.currentSourceId).then((res) => {
      if (!res || !res.success) throw new Error(res && res.message ? res.message : '读取分类失败');
      state.categories = res.categories || [];
      state.favoriteCount = Number(res.favorite_count || 0);
      renderCategoryList();
      return state.categories;
    }).catch((err) => {
      console.warn(err);
      return state.categories;
    });
  }

  function refreshGalleryForCategory() {
    updateFilterButton();
    renderCategoryList();
    resetGallery();
    els.galleryScroll.scrollTo({ top: 0 });
    restoreLastViewedPosition(viewedPositionForCategory(state.activeCategory));
    loadOlderDates({ allowScanRequest: false }).then(() => {
      schedulePlaceholderPhotoFill();
      scheduleVisiblePreviewCheck();
    });
  }

  function setActiveCategory(categoryName) {
    const next = categoryName === null ? null : String(categoryName || '');
    if (state.activeCategory === next) return;
    saveLastViewedDate(state.activeDate, { category: state.activeCategory, immediate: true });
    state.activeCategory = next;
    refreshGalleryForCategory();
  }

  function addCategoryFromSidebar() {
    if (!requireSourceIdForMark()) return;
    openTextInput({
      title: '新增分类',
      message: '添加一个全局分类名称。',
      placeholder: '分类名称',
    }).then((name) => {
      if (name === null) return;
      const clean = String(name || '').trim();
      if (!clean) return;
      call('add_category', state.currentSourceId, clean).then((res) => {
        if (!res || !res.success) {
          els.scanMessage.textContent = res && res.message ? res.message : '新增分类失败';
          return;
        }
        state.categories = res.categories || [];
        state.favoriteCount = Number(res.favorite_count || 0);
        renderCategoryList();
      }).catch((err) => {
        els.scanMessage.textContent = String(err);
      });
    });
  }

  function showCategoryExportMenu(ev, target) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!target || !target.exportType) return;
    showContextMenu(ev.clientX || 0, ev.clientY || 0, [
      {
        label: '导出',
        action: () => beginCategoryExport(target),
      },
    ]);
  }

  function currentExportPreset() {
    return normalizeExportPreset(state.exportPreset);
  }

  function beginCategoryExport(target) {
    if (!requireSourceIdForMark()) return;
    const exportType = String(target.exportType || '');
    if (exportType !== 'category' && exportType !== 'favorite') {
      els.scanMessage.textContent = '全部照片不允许批量导出';
      return;
    }
    const categoryName = String(target.categoryName || '');
    const label = String(target.label || (exportType === 'favorite' ? '收藏' : (categoryName || '未分类')));
    const preset = currentExportPreset();
    const usePreset = preset.enabled;
    const folderReady = usePreset && preset.destination
      ? Promise.resolve({ success: true, path: preset.destination, title: preset.destination, preset: true })
      : call('choose_export_folder');
    folderReady.then((folder) => {
      if (!folder || !folder.success) {
        if (!folder || !folder.cancelled) {
          els.scanMessage.textContent = folder && folder.message ? folder.message : '选择导出目录失败';
        }
        return null;
      }
      if (usePreset && !preset.destination && folder.path) {
        state.exportPreset = normalizeExportPreset(Object.assign({}, preset, { destination: folder.path }));
        call('set_export_preset', state.exportPreset).catch(console.warn);
      }
      return call('get_export_summary', state.currentSourceId, exportType, categoryName).then((summary) => {
        if (!summary || !summary.success) {
          els.scanMessage.textContent = summary && summary.message ? summary.message : '读取导出数量失败';
          return;
        }
        const count = Number(summary.count || 0);
        if (count <= 0) {
          els.scanMessage.textContent = label + '没有可导出的图片';
          return;
        }
        openExportConfirm({
          sourceId: state.currentSourceId,
          exportType,
          categoryName,
          label: summary.label || label,
          count,
          destination: folder.path,
          namingTemplate: usePreset ? preset.template : '',
          preset: usePreset,
        });
      });
    }).catch((err) => {
      els.scanMessage.textContent = '导出准备失败：' + String(err && err.message ? err.message : err);
    });
  }

  function openExportConfirm(payload) {
    state.pendingExport = payload;
    if (!els.exportConfirmModal) return;
    els.exportConfirmTitle.textContent = '导出“' + payload.label + '”？';
    const template = String(payload.namingTemplate || '').trim();
    els.exportConfirmText.textContent = '将复制 ' + Number(payload.count || 0) + ' 张图片到：' +
      payload.destination + '。' +
      (template
        ? '命名模板：' + template + '。后缀会沿用原照片后缀。'
        : '会保留原目录层级；同名相对路径文件会被覆盖。');
    els.confirmExport.disabled = false;
    els.cancelExport.disabled = false;
    els.confirmExport.textContent = '确认导出';
    show(els.exportConfirmModal);
  }

  function closeExportConfirm() {
    state.pendingExport = null;
    if (!els.exportConfirmModal) return;
    hide(els.exportConfirmModal);
    if (els.confirmExport) {
      els.confirmExport.disabled = false;
      els.confirmExport.textContent = '确认导出';
    }
    if (els.cancelExport) els.cancelExport.disabled = false;
  }

  function confirmPendingExport() {
    const pending = state.pendingExport;
    if (!pending) return;
    els.confirmExport.disabled = true;
    els.cancelExport.disabled = true;
    els.confirmExport.textContent = '导出中...';
    call(
      'export_photos',
      pending.sourceId,
      pending.exportType,
      pending.destination,
      pending.categoryName,
      pending.namingTemplate || ''
    ).then((res) => {
      if (res && res.success) {
        closeExportConfirm();
        els.scanMessage.textContent = res.message || '导出完成';
        return;
      }
      const message = res && res.message ? res.message : '导出失败';
      els.exportConfirmText.textContent = message;
      els.scanMessage.textContent = message;
    }).catch((err) => {
      const message = '导出失败：' + String(err && err.message ? err.message : err);
      els.exportConfirmText.textContent = message;
      els.scanMessage.textContent = message;
    }).finally(() => {
      if (state.pendingExport === pending && els.confirmExport) {
        els.confirmExport.disabled = false;
        els.cancelExport.disabled = false;
        els.confirmExport.textContent = '再次尝试';
      }
    });
  }

  function ensureFilterPop() {
    if (state.filterPop) return state.filterPop;
    const pop = document.createElement('div');
    pop.className = 'filter-pop hidden';
    document.body.appendChild(pop);
    state.filterPop = pop;
    return pop;
  }

  function closeFilterPop() {
    state.filterOpen = false;
    if (state.filterPop) state.filterPop.classList.add('hidden');
  }

  function closeFilterMenu() {
    if (state.filterMenu) state.filterMenu.classList.add('hidden');
  }

  function filterOptionButtons(rows, emptyLabel) {
    const options = ['<button class="filter-option" type="button" data-value="">' + escapeHtml(emptyLabel) + '</button>'];
    (rows || []).forEach((row) => {
      const name = String(row.name || '').trim() || '?';
      options.push(
        '<button class="filter-option" type="button" data-value="' + escapeHtml(name) + '">' +
        escapeHtml(name + ' (' + Number(row.count || 0) + ')') +
        '</button>'
      );
    });
    return options.join('');
  }

  function filterComboHtml(id, label, emptyLabel, rows) {
    return [
      '<div class="filter-row">',
      '<label>' + escapeHtml(label) + '</label>',
      '<div id="' + id + '" class="filter-combo" data-value="">',
      '<button class="filter-combo-trigger" type="button"><span></span><b>v</b></button>',
      '<div class="filter-combo-menu hidden">',
      filterOptionButtons(rows, emptyLabel),
      '</div>',
      '</div>',
      '</div>',
    ].join('');
  }

  function closeFilterCombos(root) {
    (root || document).querySelectorAll('.filter-combo.open').forEach((combo) => {
      combo.classList.remove('open');
      const menu = combo.querySelector('.filter-combo-menu');
      if (menu) menu.classList.add('hidden');
    });
  }

  function setFilterComboValue(combo, value) {
    if (!combo) return;
    const clean = String(value || '');
    const option = Array.from(combo.querySelectorAll('.filter-option'))
      .find((item) => String(item.dataset.value || '') === clean) || combo.querySelector('.filter-option');
    combo.dataset.value = option ? String(option.dataset.value || '') : '';
    combo.querySelectorAll('.filter-option').forEach((item) => {
      item.classList.toggle('selected', String(item.dataset.value || '') === combo.dataset.value);
    });
    const label = combo.querySelector('.filter-combo-trigger span');
    if (label && option) label.textContent = option.textContent || '';
  }

  function filterComboValue(root, id) {
    const combo = root.querySelector('#' + id);
    return combo ? String(combo.dataset.value || '') : '';
  }

  function bindFilterCombos(root) {
    root.querySelectorAll('.filter-combo').forEach((combo) => {
      combo.querySelector('.filter-combo-trigger').addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const open = combo.classList.contains('open');
        closeFilterCombos(root);
        if (!open) {
          combo.classList.add('open');
          combo.querySelector('.filter-combo-menu').classList.remove('hidden');
        }
      });
      combo.querySelectorAll('.filter-option').forEach((option) => {
        option.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setFilterComboValue(combo, option.dataset.value || '');
          closeFilterCombos(root);
        });
      });
    });
  }

  function renderFilterPop(options) {
    const pop = ensureFilterPop();
    const draft = Object.assign({}, state.filterDraft);
    const lenses = (options && options.lenses) || [];
    const focals = (options && options.focal_buckets) || [];
    const range = (options && options.date_range) || {};
    pop.innerHTML = [
      '<div class="filter-form">',
      '<label class="filter-check"><input id="filter-favorite" type="checkbox"> 已收藏</label>',
      filterComboHtml('filter-lens', '镜头', '全部镜头', lenses),
      filterComboHtml('filter-focal', '焦段范围', '全部焦段', focals),
      '<div class="filter-row"><label>开始日期</label><input id="filter-start" type="date" min="' + escapeHtml(range.earliest || '') + '" max="' + escapeHtml(range.latest || '') + '"></div>',
      '<div class="filter-row"><label>结束日期</label><input id="filter-end" type="date" min="' + escapeHtml(range.earliest || '') + '" max="' + escapeHtml(range.latest || '') + '"></div>',
      '<div class="filter-actions"><button id="filter-cancel" class="ghost-btn" type="button">取消</button><button id="filter-apply" class="primary-btn" type="button">应用</button></div>',
      '</div>',
    ].join('');
    pop.querySelector('#filter-favorite').checked = !!draft.favorite;
    bindFilterCombos(pop);
    setFilterComboValue(pop.querySelector('#filter-lens'), draft.lens || '');
    setFilterComboValue(pop.querySelector('#filter-focal'), draft.focal_bucket || '');
    pop.querySelector('#filter-start').value = draft.start_date || '';
    pop.querySelector('#filter-end').value = draft.end_date || '';
    pop.querySelector('#filter-cancel').addEventListener('click', closeFilterPop);
    pop.querySelector('#filter-apply').addEventListener('click', () => {
      const next = normalizeFilter({
        favorite: pop.querySelector('#filter-favorite').checked,
        lens: filterComboValue(pop, 'filter-lens'),
        focal_bucket: filterComboValue(pop, 'filter-focal'),
        start_date: pop.querySelector('#filter-start').value,
        end_date: pop.querySelector('#filter-end').value,
      });
      state.filterDraft = Object.assign({}, next);
      applyFilter(next);
    });
  }

  function openFilterPop() {
    closeFilterMenu();
    const pop = ensureFilterPop();
    const rect = els.filterTrigger.getBoundingClientRect();
    pop.style.left = Math.min(rect.left, window.innerWidth - 356) + 'px';
    pop.style.top = (rect.bottom + 8) + 'px';
    state.filterOpen = true;
    pop.classList.remove('hidden');
    const ready = state.filterOptions
      ? Promise.resolve(state.filterOptions)
      : call('get_filter_options', state.currentRootPath || null, state.currentSourceId || null).then((res) => {
        if (!res || !res.success) throw new Error(res && res.message ? res.message : '读取筛选项失败');
        state.filterOptions = res.options || {};
        return state.filterOptions;
      });
    pop.textContent = '读取中...';
    ready.then(renderFilterPop).catch((err) => {
      pop.textContent = String(err);
    });
  }

  function ensureFilterMenu() {
    if (state.filterMenu) return state.filterMenu;
    const menu = document.createElement('div');
    menu.className = 'filter-menu hidden';
    document.body.appendChild(menu);
    state.filterMenu = menu;
    return menu;
  }

  function openFilterMenu(x, y) {
    closeFilterPop();
    const menu = ensureFilterMenu();
    menu.innerHTML = '<button type="button">筛选 已收藏</button>';
    menu.querySelector('button').addEventListener('click', () => {
      const favoriteOnly = { favorite: true };
      state.filterDraft = Object.assign({}, favoriteOnly);
      applyFilter(favoriteOnly);
      closeFilterMenu();
    });
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - 170)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - 44)) + 'px';
    menu.classList.remove('hidden');
  }

  function onFilterTriggerClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    setSortOpen(false);
    closeFilterMenu();
    if (hasActiveFilter()) {
      clearActiveFilter();
      return;
    }
    if (state.filterOpen) closeFilterPop();
    else openFilterPop();
  }

  function onFilterTriggerContextMenu(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    setSortOpen(false);
    openFilterMenu(ev.clientX, ev.clientY);
  }

  function currentSettingsTab() {
    const tab = SETTINGS_TABS.find((item) => item.key === state.settingsTab);
    if (!tab) throw new Error('未知设置栏目: ' + state.settingsTab);
    return tab;
  }

  function renderSettingsNav() {
    els.settingsNav.innerHTML = '';
    SETTINGS_TABS.forEach((tab, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.settingsTab = tab.key;
      const marker = document.createElement('b');
      marker.textContent = String(index + 1).padStart(2, '0');
      const label = document.createElement('span');
      label.textContent = tab.label;
      const hint = document.createElement('small');
      hint.textContent = tab.hint || '';
      btn.appendChild(marker);
      btn.appendChild(label);
      btn.appendChild(hint);
      btn.classList.toggle('active', tab.key === state.settingsTab);
      btn.addEventListener('click', () => setSettingsTab(tab.key));
      els.settingsNav.appendChild(btn);
    });
  }

  function openSettingsPage(options) {
    const opts = options || {};
    const fromSource = opts.fromSource || (els.sourceScreen && !els.sourceScreen.classList.contains('hidden'));
    if (state.quickEdit.saveSaving) {
      showQuickEditSaveConfirm();
      return;
    }
    state.settingsReturnTarget = fromSource ? 'source' : 'workspace';
    state.settingsOpen = true;
    closeQuickEdit({ silent: true });
    closeSearchPanel();
    closeStatsPage({ animate: false });
    setSortOpen(false);
    hideContextMenu();
    hideNoteTooltip();
    if (fromSource) {
      hide(els.sourceScreen);
      show(els.workspace);
    }
    renderSettingsNav();
    renderSettingsBody();
    els.settingsScreen.classList.remove('leaving');
    show(els.settingsScreen);
    els.settingsScreen.classList.add('entering');
    clearTimeout(els.settingsScreen._enterTimer);
    clearTimeout(els.settingsScreen._leaveTimer);
    els.settingsScreen._enterTimer = setTimeout(() => {
      els.settingsScreen.classList.remove('entering');
    }, 420);
  }

  function closePanelScreen(el, options) {
    if (!el) return;
    const animate = !options || options.animate !== false;
    clearTimeout(el._enterTimer);
    clearTimeout(el._leaveTimer);
    el.classList.remove('entering');
    if (!animate || el.classList.contains('hidden')) {
      hide(el);
      el.classList.remove('leaving');
      return;
    }
    el.classList.add('leaving');
    el._leaveTimer = setTimeout(() => {
      hide(el);
      el.classList.remove('leaving');
    }, 150);
  }

  function closeSettingsPage(options) {
    const opts = options && !options.currentTarget ? options : {};
    const returnToSource = state.settingsReturnTarget === 'source' && opts.returnToSource !== false;
    state.settingsOpen = false;
    closePanelScreen(els.settingsScreen, opts);
    state.settingsReturnTarget = 'workspace';
    if (!returnToSource) return;
    const restoreSource = () => {
      if (state.settingsOpen) return;
      hide(els.workspace);
      show(els.sourceScreen);
      playSourceEnter();
    };
    if (opts.animate === false || els.settingsScreen.classList.contains('hidden')) {
      restoreSource();
      return;
    }
    setTimeout(restoreSource, 160);
  }

  function setSettingsTab(tabKey) {
    if (!SETTINGS_TABS.some((item) => item.key === tabKey)) throw new Error('未知设置栏目: ' + tabKey);
    state.settingsTab = tabKey;
    renderSettingsNav();
    renderSettingsBody();
  }

  function renderSettingsBody() {
    const tab = currentSettingsTab();
    els.settingsTitle.textContent = tab.label;
    els.settingsBody.innerHTML = '';
    if (tab.key === 'basic') {
      renderBasicSettings();
      return;
    }
    if (tab.key === 'interface') {
      renderInterfaceSettings();
      return;
    }
    if (tab.key === 'storage') {
      renderStorageSettings();
      return;
    }
    if (tab.key === 'export') {
      renderExportSettings();
      return;
    }
    if (tab.key === 'shortcuts') {
      renderShortcutsSettings();
      return;
    }
    if (tab.key === 'about') {
      renderAboutSettings();
      return;
    }
    const empty = document.createElement('div');
    empty.className = 'settings-empty';
    empty.textContent = '暂无设置项';
    els.settingsBody.appendChild(empty);
  }

  function settingsStack() {
    const wrap = document.createElement('div');
    wrap.className = 'settings-stack';
    return wrap;
  }

  function createSettingsPanel(title, subtitle) {
    const panel = document.createElement('section');
    panel.className = 'settings-panel';
    const head = document.createElement('div');
    head.className = 'settings-panel-head';
    const textWrap = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const p = document.createElement('p');
    p.textContent = subtitle || '';
    textWrap.appendChild(h3);
    if (subtitle) textWrap.appendChild(p);
    head.appendChild(textWrap);
    const body = document.createElement('div');
    body.className = 'settings-panel-body';
    panel.appendChild(head);
    panel.appendChild(body);
    return { panel, body, head };
  }

  function loadedPhotoTotal() {
    return state.dates.reduce((sum, item) => sum + Number(item.count || 0), 0);
  }

  function activeScopeLabel() {
    if (!state.activeCategory) return '全部照片';
    if (state.activeCategory === FAVORITE_CATEGORY) return '收藏照片';
    return '分类：' + state.activeCategory;
  }

  function settingsAction(label, detail, onClick, options) {
    const opts = options || {};
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = opts.primary ? 'settings-action primary' : 'settings-action';
    btn.disabled = !!opts.disabled;
    const title = document.createElement('span');
    title.textContent = label;
    const small = document.createElement('small');
    small.textContent = detail || '';
    btn.appendChild(title);
    if (detail) btn.appendChild(small);
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      onClick();
      setTimeout(() => {
        if (state.settingsOpen && state.settingsTab === 'basic') renderSettingsBody();
      }, 320);
    });
    return btn;
  }

  function renderSettingsMetric(label, value, meta) {
    const item = document.createElement('div');
    item.className = 'settings-metric';
    const small = document.createElement('small');
    small.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = meta || '';
    item.appendChild(small);
    item.appendChild(strong);
    if (meta) item.appendChild(span);
    return item;
  }

  function renderSettingsRows(body, rows) {
    const list = document.createElement('div');
    list.className = 'settings-rows';
    rows.forEach((row) => {
      const item = document.createElement('div');
      item.className = 'settings-row-item';
      const left = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = row.title;
      const detail = document.createElement('small');
      detail.textContent = row.detail || '';
      left.appendChild(title);
      if (row.detail) left.appendChild(detail);
      const value = document.createElement('span');
      value.textContent = row.value || '';
      item.appendChild(left);
      item.appendChild(value);
      list.appendChild(item);
    });
    body.appendChild(list);
  }

  function renderBasicSettings() {
    const wrap = settingsStack();
    const hero = document.createElement('section');
    hero.className = 'settings-hero';

    const info = document.createElement('div');
    info.className = 'settings-hero-copy';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'settings-eyebrow';
    eyebrow.textContent = '当前图库';
    const title = document.createElement('h3');
    title.textContent = state.currentRootPath ? '正在浏览的照片来源' : '还没有打开图库';
    const path = document.createElement('p');
    path.textContent = state.currentRootPath || '从来源页选择一个文件夹后，这里会显示扫描和 EXIF 状态。';
    const scope = document.createElement('small');
    scope.textContent = state.currentRootPath ? activeScopeLabel() + (state.currentSourceId ? ' · 来源 ' + state.currentSourceId : '') : '等待选择来源';
    info.appendChild(eyebrow);
    info.appendChild(title);
    info.appendChild(path);
    info.appendChild(scope);

    const actions = document.createElement('div');
    actions.className = 'settings-hero-actions';
    actions.appendChild(settingsAction(
      state.scanRunning ? '停止扫描' : (state.scanComplete ? '检查新增图片' : '扫描图库'),
      state.currentRootPath ? '更新当前来源' : '需要先选择图库',
      () => {
        toggleScanAll();
        showToast(state.scanRunning ? '已请求停止扫描' : '已请求开始扫描');
      },
      { primary: true, disabled: !state.currentRootPath },
    ));
    actions.appendChild(settingsAction(
      state.exifRunning ? '停止 EXIF' : '读取 EXIF',
      state.currentRootPath ? '补全拍摄参数' : '需要先选择图库',
      () => {
        toggleExifRead();
        showToast(state.exifRunning ? '已请求停止 EXIF 读取' : '已请求读取 EXIF');
      },
      { disabled: !state.currentRootPath },
    ));
    actions.appendChild(settingsAction(
      '统计视图',
      '查看拍摄习惯',
      openStatsPage,
      { disabled: !state.currentRootPath },
    ));
    actions.appendChild(settingsAction('更换来源', '回到来源页', showSourceChooser));

    hero.appendChild(info);
    hero.appendChild(actions);
    wrap.appendChild(hero);

    const metrics = document.createElement('section');
    metrics.className = 'settings-metrics';
    metrics.appendChild(renderSettingsMetric('扫描状态', els.scanStatus.textContent || '等待扫描', els.scanCount.textContent || '0 / 0'));
    metrics.appendChild(renderSettingsMetric('EXIF 状态', els.exifStatus.textContent || '等待 EXIF', els.exifCount.textContent || '0 / 0'));
    metrics.appendChild(renderSettingsMetric('已载入', compactNumber(state.dates.length) + ' 天', compactNumber(loadedPhotoTotal()) + ' 张照片'));
    metrics.appendChild(renderSettingsMetric('照片墙密度', state.galleryItemSize + ' px', 'Ctrl + 滚轮也可调整'));
    wrap.appendChild(metrics);

    const preset = currentExportPreset();
    const quickSections = quickEditCollapsedSections();
    const snapshot = createSettingsPanel('偏好快照', '常用开关集中看一眼，具体调整在对应栏目里。');
    renderSettingsRows(snapshot.body, [
      {
        title: '导出预设',
        detail: preset.destination || '尚未指定固定目录',
        value: preset.enabled ? '已启用' : '导出时询问',
      },
      {
        title: '灯箱参数面板',
        detail: state.lightboxInfoDetailsCollapsed ? '详细参数默认折叠' : '详细参数默认展开',
        value: state.lightboxInfoPreferredVisible ? '默认显示' : '默认隐藏',
      },
      {
        title: '快速调整面板',
        detail: '影调 ' + (quickSections.tone ? '折叠' : '展开')
          + ' · 饱和度&色温 ' + (quickSections.color ? '折叠' : '展开')
          + ' · HSL ' + (quickSections.hsl ? '折叠' : '展开')
          + ' · LUT ' + (quickSections.lut ? '折叠' : '展开'),
        value: '已记忆',
      },
    ]);
    wrap.appendChild(snapshot.panel);
    els.settingsBody.appendChild(wrap);
  }

  function appendSettingsSwitch(body, title, detail, checked, onChange) {
    const label = document.createElement('label');
    label.className = 'settings-switch-row';
    const textWrap = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = title;
    const small = document.createElement('small');
    small.textContent = detail || '';
    textWrap.appendChild(strong);
    if (detail) textWrap.appendChild(small);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!checked;
    const control = document.createElement('i');
    control.setAttribute('aria-hidden', 'true');
    label.appendChild(textWrap);
    label.appendChild(input);
    label.appendChild(control);
    input.addEventListener('change', () => onChange(input.checked));
    body.appendChild(label);
    return input;
  }

  function renderInterfaceSettings() {
    const wrap = settingsStack();

    const gallery = createSettingsPanel('照片墙密度', '调整缩略图基础尺寸，适合在大量照片和精挑细看之间切换。');
    const rangeRow = document.createElement('div');
    rangeRow.className = 'settings-range-row';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '112';
    range.max = '280';
    range.step = '1';
    range.value = String(state.galleryItemSize);
    const readout = document.createElement('output');
    readout.value = String(state.galleryItemSize);
    readout.textContent = state.galleryItemSize + ' px';
    range.addEventListener('input', () => {
      applyGalleryItemSize(range.value);
      readout.value = String(state.galleryItemSize);
      readout.textContent = state.galleryItemSize + ' px';
    });
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'ghost-btn';
    reset.textContent = '重置';
    reset.addEventListener('click', () => {
      range.value = '168';
      applyGalleryItemSize(168);
      readout.value = String(state.galleryItemSize);
      readout.textContent = state.galleryItemSize + ' px';
    });
    rangeRow.appendChild(range);
    rangeRow.appendChild(readout);
    rangeRow.appendChild(reset);
    gallery.body.appendChild(rangeRow);
    wrap.appendChild(gallery.panel);

    const lightbox = createSettingsPanel('照片参数面板', '控制灯箱里参数面板的默认显示方式；位置和尺寸仍可在灯箱中拖拽记忆。');
    appendSettingsSwitch(
      lightbox.body,
      '打开灯箱时显示参数',
      '关闭后仍可用灯箱右上角 i 按钮临时打开。',
      state.lightboxInfoPreferredVisible,
      (checked) => setLightboxInfoVisible(checked),
    );
    appendSettingsSwitch(
      lightbox.body,
      '详细参数默认折叠',
      '只保留快门、光圈、ISO 等摘要，展开后看完整 EXIF。',
      state.lightboxInfoDetailsCollapsed,
      (checked) => setLightboxInfoDetailsCollapsed(checked),
    );
    const layout = document.createElement('div');
    layout.className = 'settings-inline-tools';
    const layoutText = document.createElement('span');
    const sizeText = state.lightboxInfoPreferredSize
      ? state.lightboxInfoPreferredSize.width + ' × ' + state.lightboxInfoPreferredSize.height
      : '自动尺寸';
    layoutText.textContent = '面板尺寸：' + sizeText;
    const resetPosition = document.createElement('button');
    resetPosition.type = 'button';
    resetPosition.className = 'ghost-btn';
    resetPosition.textContent = '恢复默认位置';
    resetPosition.addEventListener('click', () => {
      const position = defaultLightboxInfoPosition();
      state.lightboxInfoPreferredPosition = position;
      state.lightbox.infoX = position.x;
      state.lightbox.infoY = position.y;
      clampLightboxInfoPosition();
      call('set_lightbox_info_position', position).then((res) => {
        if (!res || !res.success) throw new Error(res && res.message ? res.message : '参数面板位置保存失败');
        showToast('参数面板位置已重置');
      }).catch((err) => showToast(String(err && err.message ? err.message : err), 'error'));
    });
    layout.appendChild(layoutText);
    layout.appendChild(resetPosition);
    lightbox.body.appendChild(layout);
    wrap.appendChild(lightbox.panel);

    const quick = createSettingsPanel('快速调整面板', '记住复杂工具区的折叠状态，让打开 Q 调整时更贴近你的工作流。');
    const sections = quickEditCollapsedSections();
    appendSettingsSwitch(
      quick.body,
      '影调区默认折叠',
      '适合主要处理色彩或细节时减少面板高度。',
      sections.tone,
      (checked) => setQuickEditCollapsedSections(Object.assign({}, quickEditCollapsedSections(), { tone: checked })),
    );
    appendSettingsSwitch(
      quick.body,
      '饱和度&色温区默认折叠',
      '适合只处理明暗层次时减少干扰。',
      sections.color,
      (checked) => setQuickEditCollapsedSections(Object.assign({}, quickEditCollapsedSections(), { color: checked })),
    );
    appendSettingsSwitch(
      quick.body,
      'HSL 区默认折叠',
      '适合只做基础曝光、色温、曲线时减少干扰。',
      sections.hsl,
      (checked) => setQuickEditCollapsedSections(Object.assign({}, quickEditCollapsedSections(), { hsl: checked })),
    );
    appendSettingsSwitch(
      quick.body,
      'LUT 区默认折叠',
      'LUT 库很大时可以让快速调整界面更清爽。',
      sections.lut,
      (checked) => setQuickEditCollapsedSections(Object.assign({}, quickEditCollapsedSections(), { lut: checked })),
    );
    wrap.appendChild(quick.panel);
    els.settingsBody.appendChild(wrap);
  }

  function renderShortcutsSettings() {
    const wrap = settingsStack();
    const intro = createSettingsPanel('快捷键', '这里只展示现有键位，本次不提供键位修改。');
    const groups = [
      {
        title: '图库',
        items: [
          { keys: ['Ctrl', 'F'], text: '搜索照片' },
          { keys: ['Ctrl', '滚轮'], text: '调整照片墙缩略图' },
          { keys: ['Alt'], text: '立即显示悬停照片参数' },
          { keys: ['C'], text: '打开或关闭对比选图' },
          { keys: ['F'], text: '收藏或取消收藏悬停照片' },
          { keys: ['E'], text: '编辑悬停照片笔记' },
          { keys: ['R'], text: '编辑当前日期笔记' },
          { keys: ['S'], text: '设置悬停照片分类' },
        ],
      },
      {
        title: '快速调整',
        items: [
          { keys: ['Q'], text: '在图库选择照片快速调整' },
          { keys: ['灯箱', 'Q'], text: '调整当前照片' },
          { keys: ['Ctrl', 'S'], text: '保存调整结果' },
          { keys: ['Ctrl', 'Z'], text: '撤销调整' },
          { keys: ['Esc'], text: '退出快速调整或关闭弹层' },
        ],
      },
      {
        title: '灯箱',
        items: [
          { keys: ['滚轮'], text: '缩放图片' },
          { keys: ['←'], text: '上一张' },
          { keys: ['→'], text: '下一张' },
          { keys: ['i'], text: '显示或隐藏参数面板按钮' },
        ],
      },
    ];
    groups.forEach((group) => {
      const block = document.createElement('section');
      block.className = 'settings-shortcut-group';
      const title = document.createElement('h3');
      title.textContent = group.title;
      block.appendChild(title);
      group.items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'settings-shortcut-row';
        const keys = document.createElement('span');
        keys.className = 'settings-shortcut-keys';
        item.keys.forEach((key) => {
          const kbd = document.createElement('kbd');
          kbd.textContent = key;
          keys.appendChild(kbd);
        });
        const textEl = document.createElement('span');
        textEl.textContent = item.text;
        row.appendChild(keys);
        row.appendChild(textEl);
        block.appendChild(row);
      });
      intro.body.appendChild(block);
    });
    wrap.appendChild(intro.panel);
    els.settingsBody.appendChild(wrap);
  }

  function renderAboutSettings() {
    const panel = document.createElement('div');
    panel.className = 'about-panel settings-about-panel';
    panel.innerHTML = [
      '<div class="about-title"><span>PicScanner</span><span class="about-version">v1.0.1</span></div>',
      '<div class="about-author">Himpq developed with Codex</div>',
      '<div class="about-meta"><span>构建</span><b>' + escapeHtml(APP_BUILD) + '</b></div>',
      '<button id="open-project-url" class="about-link" type="button"></button>',
    ].join('');
    panel.querySelector('#open-project-url').textContent = PROJECT_URL;
    panel.querySelector('#open-project-url').addEventListener('click', () => {
      call('open_external_url', PROJECT_URL).catch(console.warn);
    });
    els.settingsBody.appendChild(panel);
  }

  function exportPresetPayload(overrides) {
    return normalizeExportPreset(Object.assign({}, state.exportPreset, overrides || {}));
  }

  function saveExportPreset(overrides, statusEl) {
    const preset = exportPresetPayload(overrides);
    state.exportPreset = preset;
    if (statusEl) statusEl.textContent = '保存中...';
    return call('set_export_preset', preset).then((res) => {
      if (!res || !res.success) throw new Error(res && res.message ? res.message : '导出预设保存失败');
      state.exportPreset = normalizeExportPreset(res.preset);
      if (statusEl) statusEl.textContent = '已保存';
      return state.exportPreset;
    }).catch((err) => {
      if (statusEl) statusEl.textContent = String(err && err.message ? err.message : err);
      throw err;
    });
  }

  function renderExportSettings() {
    const preset = currentExportPreset();
    const wrap = document.createElement('div');
    wrap.className = 'export-settings';
    wrap.innerHTML = [
      '<section class="export-card">',
      '<label class="export-switch"><input id="export-preset-enabled" type="checkbox"> <span>启用导出预设</span></label>',
      '<div class="export-row">',
      '<label>自动导出目录</label>',
      '<div class="export-path-row">',
      '<div id="export-preset-path" class="export-path"></div>',
      '<button id="export-preset-folder" class="ghost-btn" type="button">选择目录</button>',
      '<button id="export-preset-clear" class="ghost-btn" type="button">清空</button>',
      '</div>',
      '</div>',
      '<div class="export-row">',
      '<label for="export-preset-template">命名模板</label>',
      '<input id="export-preset-template" class="export-template-input" type="text" spellcheck="false">',
      '</div>',
      '<div class="export-token-list">',
      '<code>{origin_name}</code><code>{date}</code><code>{Y}</code><code>{M}</code><code>{D}</code><code>{len_name}</code><code>{aperture}</code><code>{iso}</code><code>{shutter}</code>',
      '</div>',
      '<div id="export-preset-status" class="export-status"></div>',
      '</section>',
    ].join('');
    els.settingsBody.appendChild(wrap);

    const enabled = wrap.querySelector('#export-preset-enabled');
    const path = wrap.querySelector('#export-preset-path');
    const choose = wrap.querySelector('#export-preset-folder');
    const clear = wrap.querySelector('#export-preset-clear');
    const input = wrap.querySelector('#export-preset-template');
    const status = wrap.querySelector('#export-preset-status');

    enabled.checked = !!preset.enabled;
    path.textContent = preset.destination || '未设置';
    path.classList.toggle('empty', !preset.destination);
    input.value = preset.template || '{origin_name}';
    status.textContent = preset.enabled
      ? (preset.destination ? '点击导出时会直接使用该目录和模板，不再询问目录' : '启用后未设置目录时仍会询问导出目录')
      : '导出时会询问目录，并保留原目录层级';

    enabled.addEventListener('change', () => {
      saveExportPreset({ enabled: enabled.checked }, status).catch(console.warn);
    });
    input.addEventListener('blur', () => {
      saveExportPreset({ template: input.value || '{origin_name}' }, status).then((next) => {
        input.value = next.template;
      }).catch(console.warn);
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        input.blur();
      }
    });
    choose.addEventListener('click', () => {
      status.textContent = '选择目录...';
      call('choose_export_folder').then((folder) => {
        if (!folder || !folder.success) {
          status.textContent = folder && folder.cancelled ? '已取消' : (folder && folder.message ? folder.message : '选择目录失败');
          return;
        }
        return saveExportPreset({ destination: folder.path, enabled: true, template: input.value || '{origin_name}' }, status).then((next) => {
          enabled.checked = !!next.enabled;
          path.textContent = next.destination || '未设置';
          path.classList.toggle('empty', !next.destination);
        });
      }).catch((err) => {
        status.textContent = String(err && err.message ? err.message : err);
      });
    });
    clear.addEventListener('click', () => {
      saveExportPreset({ destination: '' }, status).then((next) => {
        path.textContent = next.destination || '未设置';
        path.classList.toggle('empty', !next.destination);
      }).catch(console.warn);
    });
  }

  function renderStorageSettings() {
    const list = document.createElement('div');
    list.className = 'storage-list';
    list.textContent = '读取中...';
    els.settingsBody.appendChild(list);
    call('list_storage_sources').then((res) => {
      if (!res || !res.success) throw new Error(res && res.message ? res.message : '读取存储列表失败');
      renderStorageRows(list, res.sources || []);
    }).catch((err) => {
      list.className = 'settings-empty';
      list.textContent = String(err);
    });
  }

  function renderStorageRows(list, sources, options) {
    const compact = !!(options && options.compact);
    const hideSourceId = !!(options && options.hideSourceId);
    const currentRootPath = String((options && options.currentRootPath) || '').toLowerCase();
    list.textContent = '';
    if (!sources.length) {
      list.className = 'settings-empty';
      list.textContent = '暂无已扫描来源';
      return;
    }
    list.className = compact ? 'storage-list compact' : 'storage-list';
    sources.forEach((source) => {
      const row = document.createElement('article');
      row.className = 'storage-row';
      if (currentRootPath && String(source.root_path || '').toLowerCase() === currentRootPath) {
        row.classList.add('active');
      }

      const cover = document.createElement('div');
      cover.className = 'storage-cover';
      const id = document.createElement('div');
      id.className = 'storage-id';
      id.textContent = 'ID ' + text(source.id, '--');
      cover.appendChild(id);
      if (source.cover_url) {
        const img = document.createElement('img');
        img.src = source.cover_url;
        img.alt = '';
        cover.appendChild(img);
      }

      const info = document.createElement('div');
      info.className = 'storage-info';
      const sourceId = document.createElement('div');
      sourceId.className = 'storage-source-id';
      sourceId.textContent = source.source_id || '';
      const path = document.createElement('div');
      path.className = 'storage-path';
      path.textContent = source.root_path || '';
      const counts = document.createElement('div');
      counts.className = 'storage-counts';
      counts.textContent = '已扫描 ' + Number(source.scanned_count || 0) + ' · 登记 ' + Number(source.registered_count || 0);
      if (!hideSourceId) info.appendChild(sourceId);
      info.appendChild(path);
      info.appendChild(counts);

      row.appendChild(cover);
      row.appendChild(info);
      list.appendChild(row);
    });
  }

  function openStatsPage() {
    if (state.quickEdit.saveSaving) {
      showQuickEditSaveConfirm();
      return;
    }
    state.statsOpen = true;
    closeQuickEdit({ silent: true });
    closeSearchPanel();
    closeSettingsPage({ animate: false });
    setSortOpen(false);
    hideContextMenu();
    hideNoteTooltip();
    els.statsSource.textContent = state.currentRootPath || '';
    els.statsScreen.classList.remove('leaving');
    show(els.statsScreen);
    els.statsScreen.classList.add('entering');
    clearTimeout(els.statsScreen._enterTimer);
    clearTimeout(els.statsScreen._leaveTimer);
    els.statsScreen._enterTimer = setTimeout(() => {
      els.statsScreen.classList.remove('entering');
    }, 420);
    renderStatsWindow();
  }

  function closeStatsPage(options) {
    state.statsOpen = false;
    hideChartTooltip();
    closePanelScreen(els.statsScreen, options);
  }

  function renderStatsWindow() {
    els.statsStorageList.className = 'storage-list compact';
    els.statsStorageList.textContent = '读取中...';
    els.statsSummary.innerHTML = '';
    els.statsInsights.innerHTML = '';
    [
      els.hourChart,
      els.monthChart,
      els.lensChart,
      els.focalChart,
      els.cameraChart,
      els.apertureChart,
      els.isoChart,
      els.shutterChart,
    ].forEach(renderEmptyChart);
    call('get_statistics_detail', state.currentRootPath || null, state.currentSourceId || null).then((res) => {
      if (!res || !res.success) throw new Error(res && res.message ? res.message : '读取统计信息失败');
      renderStorageRows(els.statsStorageList, res.sources || [], {
        compact: true,
        hideSourceId: true,
        currentRootPath: state.currentRootPath || '',
      });
      const stats = res.statistics || {};
      renderStatsSummary(stats);
      renderStatsInsights(stats);
      renderRankChart(els.focalChart, sortFocalBuckets(stats.by_focal_bucket || []), { limit: 8, ordered: true });
      renderRankChart(els.lensChart, stats.by_lens || [], { limit: 8 });
      renderHourChart(els.hourChart, stats.by_hour || []);
      renderMonthChart(els.monthChart, stats.by_month || []);
      renderRankChart(els.cameraChart, stats.by_model || [], { limit: 5 });
      renderDistributionChart(els.apertureChart, sortApertureBuckets(stats.by_aperture || []), { limit: 7 });
      renderDistributionChart(els.isoChart, sortIsoBuckets(stats.by_iso_bucket || []), { limit: 7 });
      renderDistributionChart(els.shutterChart, sortShutterBuckets(stats.by_shutter || []), { limit: 7 });
    }).catch((err) => {
      els.statsStorageList.className = 'settings-empty';
      els.statsStorageList.textContent = String(err);
      els.statsSummary.innerHTML = '';
      els.statsInsights.innerHTML = '';
      [
        els.hourChart,
        els.monthChart,
        els.lensChart,
        els.focalChart,
        els.cameraChart,
        els.apertureChart,
        els.isoChart,
        els.shutterChart,
      ].forEach(renderEmptyChart);
    });
  }

  function compactNumber(value) {
    const n = Number(value || 0);
    if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '万';
    return String(n);
  }

  function topChartRow(rows) {
    const data = chartRows(rows || [], 1);
    return data.length ? data[0] : null;
  }

  function rowPercent(row, total) {
    return rowPercentValue(row, total) + '%';
  }

  function rowPercentValue(row, total) {
    const base = Number(total || 0);
    if (!row || base <= 0) return 0;
    return Math.round(Number(row.count || 0) / base * 100);
  }

  function statsColor(index) {
    return STATS_COLORS[Math.abs(Number(index || 0)) % STATS_COLORS.length];
  }

  function renderStatsSummary(stats) {
    const total = Number(stats.total_files || 0);
    const complete = Number(stats.exif_complete || 0);
    const pending = Number(stats.exif_pending || 0);
    const completePct = total > 0 ? Math.round(complete / total * 100) : 0;
    const focal = topChartRow(stats.by_focal_bucket);
    const lens = topChartRow(stats.by_lens);
    const aperture = topChartRow(stats.by_aperture);
    const iso = topChartRow(stats.by_iso_bucket);
    const cards = [
      { label: '照片总数', value: compactNumber(total), meta: '当前图库', accent: statsColor(0) },
      { label: 'EXIF 完成', value: completePct + '%', meta: compactNumber(complete) + ' 已读 / ' + compactNumber(pending) + ' 待读', progress: completePct, accent: statsColor(1) },
      { label: '常用焦段', value: focal ? focal.name : '未知', meta: focal ? rowPercent(focal, complete) : '暂无数据', progress: focal ? rowPercentValue(focal, complete) : 0, accent: statsColor(2) },
      { label: '常用镜头', value: lens ? lens.name : '未知', meta: lens ? rowPercent(lens, complete) : '暂无数据', progress: lens ? rowPercentValue(lens, complete) : 0, accent: statsColor(3) },
      { label: '常用光圈', value: aperture ? aperture.name : '未知', meta: aperture ? rowPercent(aperture, complete) : '暂无数据', progress: aperture ? rowPercentValue(aperture, complete) : 0, accent: statsColor(4) },
      { label: '常用 ISO', value: iso ? iso.name : '未知', meta: iso ? rowPercent(iso, complete) : '暂无数据', progress: iso ? rowPercentValue(iso, complete) : 0, accent: statsColor(5) },
    ];
    els.statsSummary.innerHTML = cards.map((card) => (
      '<div class="stats-summary-card" style="--stats-accent:' + card.accent + '">' +
      '<span>' + escapeHtml(card.label) + '</span>' +
      '<strong>' + escapeHtml(card.value) + '</strong>' +
      '<em>' + escapeHtml(card.meta) + '</em>' +
      (typeof card.progress === 'number'
        ? '<div class="stats-summary-meter"><div style="width:' + clamp(card.progress, 0, 100) + '%"></div></div>'
        : '') +
      '</div>'
    )).join('');
  }

  function renderStatsInsights(stats) {
    const complete = Number(stats.exif_complete || 0);
    const focal = topChartRow(stats.by_focal_bucket);
    const lens = topChartRow(stats.by_lens);
    const hour = topChartRow(stats.by_hour);
    const pieces = [];
    if (focal) pieces.push('主要焦段集中在 ' + focal.name + '，占已读 EXIF 的 ' + rowPercent(focal, complete));
    if (lens) pieces.push('最常用镜头是 ' + lens.name + '，共 ' + compactNumber(lens.count) + ' 张');
    if (hour) pieces.push('拍摄高峰在 ' + hour.name + ' 左右');
    if (!pieces.length) pieces.push('读取 EXIF 后会生成拍摄习惯洞察');
    els.statsInsights.innerHTML = pieces.map((item, index) => (
      '<div class="stats-insight" style="--stats-accent:' + statsColor(index + 1) + '">' +
      '<span aria-hidden="true"></span><p>' + escapeHtml(item) + '</p>' +
      '</div>'
    )).join('');
  }

  function renderEmptyChart(target) {
    target.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'chart-empty';
    empty.textContent = '暂无数据';
    target.appendChild(empty);
  }

  function cleanChartName(name) {
    const value = String(name || '').trim();
    if (!value || value === '?' || value === '----') return '未知';
    return value;
  }

  function chartRows(rows, limit) {
    return (rows || [])
      .map((row) => ({ name: cleanChartName(row.name), count: Number(row.count || 0) }))
      .filter((row) => row.count > 0)
      .slice(0, limit || rows.length);
  }

  function renderRankChart(target, rows, options) {
    const data = chartRows(rows, (options && options.limit) || 8);
    if (!data.length) {
      renderEmptyChart(target);
      return;
    }
    const total = chartRows(rows || []).reduce((sum, row) => sum + row.count, 0);
    const max = data.reduce((best, row) => Math.max(best, row.count), 1);
    target.innerHTML = '<div class="rank-chart">' + data.map((row, index) => {
      const percent = total > 0 ? Math.round(row.count / total * 100) : 0;
      const width = Math.max(4, row.count / max * 100);
      const color = statsColor(index);
      const tip = escapeHtml(row.name + ' · ' + row.count + ' 张');
      return '<div class="rank-row" data-chart-tip="' + tip + '">' +
        '<div class="rank-index">' + String(index + 1).padStart(2, '0') + '</div>' +
        '<div class="rank-main"><div class="rank-head"><b>' + escapeHtml(row.name) + '</b><span>' + row.count + ' 张 · ' + percent + '%</span></div>' +
        '<div class="rank-track"><div style="width:' + width.toFixed(1) + '%;background:' + color + '"></div></div></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function renderDistributionChart(target, rows, options) {
    const data = chartRows(rows, (options && options.limit) || 7);
    if (!data.length) {
      renderEmptyChart(target);
      return;
    }
    const max = data.reduce((best, row) => Math.max(best, row.count), 1);
    target.innerHTML = '<div class="distribution-chart">' + data.map((row, index) => {
      const width = Math.max(4, row.count / max * 100);
      const color = statsColor(index + 2);
      const tip = escapeHtml(row.name + ' · ' + row.count + ' 张');
      return '<div class="distribution-row" data-chart-tip="' + tip + '">' +
        '<span>' + escapeHtml(row.name) + '</span>' +
        '<div class="distribution-track"><div style="width:' + width.toFixed(1) + '%;background:' + color + '"></div></div>' +
        '<em>' + row.count + '</em>' +
        '</div>';
    }).join('') + '</div>';
  }

  function renderHourChart(target, rows) {
    const lookup = new Map((rows || []).map((row) => [String(row.name || '').slice(0, 2), Number(row.count || 0)]));
    const data = Array.from({ length: 24 }, (_, hour) => {
      const key = String(hour).padStart(2, '0');
      return { name: key + ':00', count: lookup.get(key) || 0 };
    });
    if (!data.some((row) => row.count > 0)) {
      renderEmptyChart(target);
      return;
    }
    const max = data.reduce((best, row) => Math.max(best, row.count), 1);
    target.innerHTML = '<div class="hour-rhythm">' + data.map((row) => {
      const height = Math.max(6, row.count / max * 100);
      const hour = row.name.slice(0, 2);
      const color = statsColor(Math.floor(Number(hour) / 4));
      const showLabel = ['00', '06', '12', '18', '23'].includes(hour);
      return '<div class="hour-cell" data-chart-tip="' + escapeHtml(row.name + ' · ' + row.count + ' 张') + '">' +
        '<div class="hour-bar"><div style="height:' + height.toFixed(1) + '%;background:' + color + '"></div></div>' +
        '<span>' + (showLabel ? hour : '') + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  function renderMonthChart(target, rows) {
    const data = chartRows(rows, 36);
    if (!data.length) {
      renderEmptyChart(target);
      return;
    }
    target.innerHTML = '<div class="month-chart">' + data.map((row, index) => {
      const color = statsColor(index);
      const label = row.name.slice(2).replace('-', '/');
      return '<div class="month-cell" style="border-bottom-color:' + color + '" data-chart-tip="' + escapeHtml(row.name + ' · ' + row.count + ' 张') + '">' +
        '<span>' + escapeHtml(label) + '</span><b>' + row.count + '</b>' +
        '</div>';
    }).join('') + '</div>';
  }

  function renderDonutChart(target, rows) {
    const data = chartRows(rows, 8);
    if (!data.length) {
      renderEmptyChart(target);
      return;
    }
    const total = data.reduce((sum, row) => sum + row.count, 0);
    const circumference = 2 * Math.PI * 64;
    let offset = 0;
    const colors = ['#8ea8ff', '#62d6aa', '#6ed6ff', '#c39bff', '#9ad36a', '#7db5ff', '#b7c7ff', '#6fcfbd'];
    const segments = data.map((row, index) => {
      const length = row.count / total * circumference;
      const dash = length.toFixed(2) + ' ' + (circumference - length).toFixed(2);
      const segment = '<circle class="donut-segment" data-chart-tip="' + escapeHtml(row.name + ' · ' + row.count + ' 张') + '" cx="92" cy="92" r="64" stroke="' + colors[index % colors.length] + '" stroke-dasharray="' + dash + '" stroke-dashoffset="' + (-offset).toFixed(2) + '"></circle>';
      offset += length;
      return segment;
    }).join('');
    const legend = data.map((row, index) => {
      const percent = Math.round(row.count / total * 100);
      return '<div class="chart-legend-row" data-chart-tip="' + escapeHtml(row.name + ' · ' + row.count + ' 张') + '"><span style="--swatch:' + colors[index % colors.length] + '"></span><b>' + escapeHtml(row.name) + '</b><em>' + percent + '%</em></div>';
    }).join('');
    target.innerHTML = '<div class="donut-chart"><svg viewBox="0 0 184 184" role="img">' +
      '<circle class="donut-base" cx="92" cy="92" r="64"></circle>' + segments +
      '<text class="donut-total" x="92" y="88">' + total + '</text><text class="donut-caption" x="92" y="108">张</text>' +
      '</svg><div class="chart-legend">' + legend + '</div></div>';
  }

  function focalBucketOrder(name) {
    const value = String(name || '');
    if (value.includes('?')) return 9999;
    if (value.startsWith('>')) return 9000 + Number(value.match(/\d+/)?.[0] || 0);
    if (value.startsWith('<')) return -Number(value.match(/\d+/)?.[0] || 0);
    return Number(value.match(/\d+/)?.[0] || 999);
  }

  function sortFocalBuckets(rows) {
    return (rows || []).slice().sort((a, b) => focalBucketOrder(a.name) - focalBucketOrder(b.name));
  }

  function sortNamedBuckets(rows) {
    return (rows || []).slice().sort((a, b) => cleanChartName(a.name).localeCompare(cleanChartName(b.name), 'zh-Hans-CN'));
  }

  function sortApertureBuckets(rows) {
    return (rows || []).slice().sort((a, b) => {
      const left = Number(String(a.name || '').match(/[\d.]+/)?.[0] || 999);
      const right = Number(String(b.name || '').match(/[\d.]+/)?.[0] || 999);
      return left - right;
    });
  }

  function sortIsoBuckets(rows) {
    return (rows || []).slice().sort((a, b) => {
      const left = Number(String(a.name || '').match(/\d+/)?.[0] || 999999);
      const right = Number(String(b.name || '').match(/\d+/)?.[0] || 999999);
      return left - right;
    });
  }

  function sortShutterBuckets(rows) {
    const order = ['<1/1000s', '1/1000-1/250s', '1/250-1/60s', '1/60-1/15s', '1/15-1/4s', '1/4-1s', '1s+', '?'];
    return (rows || []).slice().sort((a, b) => {
      const left = order.indexOf(String(a.name || ''));
      const right = order.indexOf(String(b.name || ''));
      return (left < 0 ? 999 : left) - (right < 0 ? 999 : right);
    });
  }

  function renderColumnChart(target, rows, limit) {
    const data = chartRows(rows, limit || 6);
    if (!data.length) {
      renderEmptyChart(target);
      return;
    }
    const max = data.reduce((best, row) => Math.max(best, row.count), 1);
    const bars = data.map((row) => {
      const height = Math.max(4, row.count / max * 100);
      const label = escapeHtml(row.name.replace(/\\s*\\(.+\\)/, ''));
      return '<div class="bucket-column" data-chart-tip="' + escapeHtml(row.name + ' · ' + row.count + ' 张') + '"><div class="bucket-value">' + row.count + '</div><div class="bucket-track"><div style="height:' + height.toFixed(1) + '%"></div></div><div class="bucket-label">' + label + '</div></div>';
    }).join('');
    target.innerHTML = '<div class="bucket-chart">' + bars + '</div>';
  }

  let chartTooltip = null;

  function ensureChartTooltip() {
    if (chartTooltip) return chartTooltip;
    chartTooltip = document.createElement('div');
    chartTooltip.className = 'chart-tooltip hidden';
    document.body.appendChild(chartTooltip);
    return chartTooltip;
  }

  function positionChartTooltip(ev) {
    if (!chartTooltip || chartTooltip.classList.contains('hidden')) return;
    const pad = 12;
    const rect = chartTooltip.getBoundingClientRect();
    let x = ev.clientX + 14;
    let y = ev.clientY + 14;
    if (x + rect.width > window.innerWidth - pad) x = ev.clientX - rect.width - 14;
    if (y + rect.height > window.innerHeight - pad) y = ev.clientY - rect.height - 14;
    chartTooltip.style.left = Math.max(pad, x) + 'px';
    chartTooltip.style.top = Math.max(pad + 36, y) + 'px';
  }

  function bindChartTooltip() {
    els.statsScreen.addEventListener('mousemove', (ev) => {
      const node = ev.target && ev.target.closest ? ev.target.closest('[data-chart-tip]') : null;
      if (!node || !els.statsScreen.contains(node)) {
        hideChartTooltip();
        return;
      }
      const tip = ensureChartTooltip();
      tip.textContent = node.dataset.chartTip || '';
      tip.classList.remove('hidden');
      positionChartTooltip(ev);
    });
    els.statsScreen.addEventListener('mouseleave', hideChartTooltip);
  }

  function hideChartTooltip() {
    if (chartTooltip) chartTooltip.classList.add('hidden');
  }

  function statsSignature(stats) {
    const tr = stats.time_range || {};
    return [
      stats.total_files || 0,
      stats.exif_complete || 0,
      stats.exif_pending || 0,
      stats.exif_failed || 0,
      tr.earliest || '',
      tr.latest || '',
    ].join('|');
  }

  function dateBootstrapKey(data, scanStatus) {
    return [
      state.currentSourceId || '',
      Number(data.cached_visible_files || 0),
      scanStatus || '',
      state.sortKey || '',
      JSON.stringify(filterPayload() || {}),
    ].join('|');
  }

  function ensureDateListAfterScanData(data, scanStatus) {
    if (state.dates.length || state.loadingDates) return;
    const cachedVisible = Number(data.cached_visible_files || 0);
    const totalFiles = Number((data.statistics || {}).total_files || 0);
    if (cachedVisible <= 0 && totalFiles <= 0) return;
    const key = dateBootstrapKey(data, scanStatus);
    if (state.lastDateBootstrapKey === key) return;
    state.lastDateBootstrapKey = key;
    state.noMoreDates = false;
    state.dateCursor = null;
    loadOlderDates({ allowScanRequest: false });
  }

  function applyScanData(data) {
      const st = data.state || {};
      const stats = data.statistics || {};
      const scanStatus = st.scan_status || st.status || 'idle';
      const exifStatus = st.exif_status || 'idle';
      if (Object.prototype.hasOwnProperty.call(st, 'source_id')) state.currentSourceId = st.source_id || '';
      state.scanRunning = !!st.scan_running || scanStatus === 'discovering' || scanStatus === 'stopping';
      state.exifRunning = !!st.exif_running || exifStatus === 'reading_exif' || exifStatus === 'stopping';
      state.scanComplete = !!st.scan_complete || scanStatus === 'done';
      ensureDateListAfterScanData(data, scanStatus);

      const scanDone = Number(st.scan_processed_files || 0);
      const scanTarget = Number(st.scan_target_files || 0);
      const scanDiscovered = Number(st.scan_discovered_files || st.discovered_files || stats.total_files || 0);
      const scanTotal = scanTarget || scanDiscovered;
      const scanPct = scanTarget > 0 ? Math.max(0, Math.min(100, scanDone / scanTarget * 100)) : (state.scanComplete ? 100 : 0);
      els.progressBar.style.width = scanPct.toFixed(1) + '%';
      els.scanStatus.textContent = scanStatusLabel(scanStatus);
      els.scanCount.textContent = scanTarget ? (scanDone + ' / ' + scanTarget) : (scanDiscovered + ' / ' + scanTotal);
      els.scanMessage.textContent = st.scan_message || st.message || '';

      const exifDone = Number(st.exif_processed_files || 0);
      const exifTotal = Number(st.exif_total_files || stats.exif_pending || 0);
      const exifPct = exifTotal > 0 ? Math.max(0, Math.min(100, exifDone / exifTotal * 100)) : 0;
      els.exifProgressBar.style.width = exifPct.toFixed(1) + '%';
      els.exifStatus.textContent = scanStatusLabel(exifStatus);
      els.exifCount.textContent = exifDone + ' / ' + exifTotal;
      els.exifMessage.textContent = st.exif_message || '';

      els.scanAll.textContent = state.scanRunning ? '停止扫描' : (state.scanComplete ? '检查新增图片' : '扫描所有图片');
      els.scanAll.classList.toggle('danger', state.scanRunning);
      els.readExif.textContent = state.exifRunning ? '停止读取 EXIF' : '读取 EXIF 统计';
      els.readExif.classList.toggle('danger', state.exifRunning);
      const signature = statsSignature(stats);
      const statsChanged = signature !== state.lastStatsSignature;
      if (Date.now() - state.lastScrollAt < 260) return;
      if (statsChanged) {
        const tr = stats.time_range || {};
        els.timeRange.textContent = tr.earliest && tr.latest ? (tr.earliest + ' → ' + tr.latest) : '';
        state.lastStatsSignature = signature;
        loadCategories();
      }
      if (state.scanRunning || (statsChanged && Date.now() - state.lastVisibleRefreshAt > 2400)) {
        maybeRefreshVisibleDates();
      }
  }

  function refreshState() {
    if (state.refreshInFlight) return Promise.resolve();
    state.refreshInFlight = true;
    const rootPath = state.currentRootPath || '';
    return call('get_scan_state', rootPath || null, state.currentSourceId || null)
      .then((data) => {
        if (rootPath === (state.currentRootPath || '')) applyScanData(data);
      })
      .catch(console.warn)
      .finally(() => {
        state.refreshInFlight = false;
      });
  }

  function enterCachedWorkspace(scanData) {
    const visibleCount = Number(scanData.cached_visible_files || 0);
    const stats = scanData.statistics || {};
    const total = Number(stats.total_files || 0);
    if (visibleCount <= 0 && total <= 0) return false;
    const session = scanData.session || {};
    hide(els.sourceScreen);
    show(els.workspace);
    playWorkspaceEnter();
    resetSourceFilterContext();
    resetGallery();
    state.currentRootPath = session.root_path || '';
    state.currentSourceId = session.source_id || (scanData.state && scanData.state.source_id) || '';
    state.scanStoppedByUser = session.status === 'stopped';
    els.currentSource.textContent = state.currentRootPath;
    applyScanData(scanData);
    loadCategories();
    loadOlderDates();
    applySourceViewedDates(scanData.source_state || {});
    restoreLastViewedPosition(viewedPositionForCategory(state.activeCategory, scanData.source_state || {}));
    return true;
  }

  function enterSourceWorkspace(source) {
    state.currentRootPath = source.path || '';
    state.currentSourceId = source.source_id || (source.summary && source.summary.source_id) || '';
    if (state.currentRootPath) call('set_last_source', state.currentRootPath).catch(console.warn);
    state.scanComplete = false;
    state.scanStoppedByUser = false;
    hide(els.confirmModal);
    hide(els.sourceScreen);
    show(els.workspace);
    playWorkspaceEnter();
    resetSourceFilterContext();
    resetGallery();
    els.currentSource.textContent = state.currentRootPath;
    const rootPath = state.currentRootPath;
    call('get_scan_state', rootPath, state.currentSourceId || null).then((scanData) => {
      if (rootPath !== state.currentRootPath) return;
      if (scanData.state && scanData.state.source_id) state.currentSourceId = scanData.state.source_id;
      applyScanData(scanData);
      loadCategories();
      loadOlderDates();
      const sourceState = scanData.source_state || {};
      if (!sourceState.last_viewed_date && source.summary && source.summary.last_viewed_date) {
        sourceState.last_viewed_date = source.summary.last_viewed_date;
      }
      applySourceViewedDates(sourceState);
      restoreLastViewedPosition(viewedPositionForCategory(state.activeCategory, sourceState));
      const summary = source.summary || {};
      if (summary.session_status === 'stopped') state.scanStoppedByUser = true;
      const cachedVisible = Number(scanData.cached_visible_files || 0);
      if (!state.scanComplete && (cachedVisible <= 0 || !summary.has_cache || summary.session_status !== 'done')) requestMoreScan();
    }).catch((err) => {
      els.scanMessage.textContent = String(err);
    });
  }

  function refreshDatesAfterScanBatch() {
    refreshState();
    state.noMoreDates = false;
    maybeRefreshVisibleDates(true);
    loadOlderDates({ allowScanRequest: false });
    scheduleVisiblePreviewCheck();
  }

  function requestMoreScan(options) {
    const fromUserGesture = !!(options && options.userGesture);
    if (!state.currentRootPath || state.scanRunning || state.scanRequesting || state.scanComplete) return Promise.resolve(false);
    if (state.scanStoppedByUser && !fromUserGesture) return Promise.resolve(false);
    const now = Date.now();
    if (now - state.lastMoreScanAt < MORE_SCAN_COOLDOWN_MS) return Promise.resolve(false);
    if (fromUserGesture) state.scanStoppedByUser = false;
    state.lastMoreScanAt = now;
    state.scanRequesting = true;
    state.scanRunning = true;
    els.olderSentinel.textContent = '继续扫描图片...';
    return call('start_scan', state.currentRootPath, 10).then((res) => {
      if (res && res.source_id) {
        state.currentSourceId = res.source_id;
        loadCategories();
      }
      if (!res || !res.success) {
        state.scanRunning = false;
        els.scanMessage.textContent = res && res.message ? res.message : '扫描启动失败';
        return false;
      }
      setTimeout(refreshDatesAfterScanBatch, 260);
      setTimeout(refreshDatesAfterScanBatch, 950);
      return true;
    }).catch((err) => {
      state.scanRunning = false;
      els.scanMessage.textContent = String(err);
      return false;
    }).finally(() => {
      state.scanRequesting = false;
    });
  }

  function isNearGalleryBottom(margin) {
    const el = els.galleryScroll;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - margin;
  }

  function requestMoreScanFromWheel(ev) {
    if (ev.deltaY <= 0 || state.bottomWheelTicking) return;
    state.bottomWheelTicking = true;
    requestAnimationFrame(() => {
      state.bottomWheelTicking = false;
      if (isNearGalleryBottom(80)) requestMoreScan({ userGesture: true });
    });
  }

  function onGalleryWheel(ev) {
    if (ev.ctrlKey) {
      zoomGalleryItemsFromWheel(ev);
      return;
    }
    if (ev.altKey) {
      scrollGalleryFromAltWheel(ev);
      requestMoreScanFromWheel(ev);
      return;
    }
    requestMoreScanFromWheel(ev);
  }

  function scrollGalleryFromAltWheel(ev) {
    if (!els.galleryScroll.contains(ev.target)) return;
    if (!Number.isFinite(ev.deltaY) || ev.deltaY === 0) return;
    const unit = ev.deltaMode === 1 ? 40 : (ev.deltaMode === 2 ? els.galleryScroll.clientHeight : 1);
    ev.preventDefault();
    ev.stopPropagation();
    els.galleryScroll.scrollTop += ev.deltaY * unit;
  }

  function zoomGalleryItemsFromWheel(ev) {
    if (!els.workspace || els.workspace.classList.contains('hidden')) return;
    if (state.settingsOpen || state.statsOpen || !els.lightbox.classList.contains('hidden')) return;
    if (!els.galleryScroll.contains(ev.target)) return;
    if (!Number.isFinite(ev.deltaY) || ev.deltaY === 0) return;
    ev.preventDefault();
    ev.stopPropagation();

    if (!state.galleryZoomActive) {
      state.galleryZoomActive = true;
      closeFilterPop();
      closeFilterMenu();
      hideContextMenu();
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const galleryRect = els.gallery.getBoundingClientRect();
      state.galleryZoomAnchor = target && target.closest ? target.closest('.photo-card') : null;
      state.galleryZoomBaseSize = state.galleryItemSizeRaw;
      state.galleryItemSizeTarget = state.galleryItemSizeRaw;
      els.gallery.style.setProperty('--gallery-zoom-origin-x', clamp(ev.clientX - galleryRect.left, 0, galleryRect.width || 0).toFixed(2) + 'px');
      els.gallery.style.setProperty('--gallery-zoom-origin-y', clamp(ev.clientY - galleryRect.top, 0, galleryRect.height || 0).toFixed(2) + 'px');
      els.gallery.style.setProperty('--gallery-zoom-preview', '1');
      els.gallery.classList.add('zooming');
    }

    const delta = normalizedWheelDelta(ev);
    state.galleryItemSizeTarget = clampItemSize(state.galleryItemSizeTarget - delta * GALLERY_ITEM_SIZE_WHEEL_SCALE);
    scheduleGalleryZoomFrame();
    clearTimeout(state.galleryZoomCleanupTimer);
    state.galleryZoomCleanupTimer = setTimeout(finishGalleryZoom, 180);
  }

  function normalizedWheelDelta(ev) {
    let delta = Number(ev.deltaY || 0);
    if (ev.deltaMode === 1) delta *= 16;
    else if (ev.deltaMode === 2) delta *= els.galleryScroll.clientHeight || 480;
    return delta;
  }

  function scheduleGalleryZoomFrame() {
    if (state.galleryZoomTicking) return;
    state.galleryZoomTicking = true;
    requestAnimationFrame(applyGalleryZoomFrame);
  }

  function applyGalleryZoomFrame() {
    const baseSize = Math.max(1, Number(state.galleryZoomBaseSize || state.galleryItemSizeRaw || 168));
    const scale = clamp(state.galleryItemSizeTarget / baseSize, 0.4, 2.8);
    els.gallery.style.setProperty('--gallery-zoom-preview', scale.toFixed(4));
    state.galleryZoomTicking = false;
  }

  function finishGalleryZoom() {
    if (state.galleryZoomTicking) {
      clearTimeout(state.galleryZoomCleanupTimer);
      state.galleryZoomCleanupTimer = setTimeout(finishGalleryZoom, 80);
      return;
    }
    const anchor = state.galleryZoomAnchor;
    const beforeTop = anchor && anchor.isConnected ? anchor.getBoundingClientRect().top : 0;
    state.galleryZoomActive = false;
    els.gallery.classList.remove('zooming');
    els.gallery.style.removeProperty('--gallery-zoom-preview');
    els.gallery.style.removeProperty('--gallery-zoom-origin-x');
    els.gallery.style.removeProperty('--gallery-zoom-origin-y');
    applyGalleryItemSize(state.galleryItemSizeTarget, { save: false, preserveTarget: true });
    if (anchor && anchor.isConnected) {
      els.galleryScroll.scrollTop += anchor.getBoundingClientRect().top - beforeTop;
    }
    state.galleryZoomAnchor = null;
    scheduleGalleryItemSizeSave();
    updateAllDateReserves();
    scheduleDateHighlight();
    schedulePlaceholderPhotoFill();
    scheduleVisiblePreviewCheck();
  }

  function toggleScanAll() {
    if (!state.currentRootPath) return;
    if (state.scanRunning) {
      state.scanStoppedByUser = true;
      els.scanMessage.textContent = '正在停止扫描...';
      call('stop_scan').then(refreshState).catch(console.warn);
      return;
    }
    state.scanStoppedByUser = false;
    state.noMoreDates = false;
    call('scan_all', state.currentRootPath).then((res) => {
      if (res && res.source_id) {
        state.currentSourceId = res.source_id;
        loadCategories();
      }
      if (!res || !res.success) {
        els.scanMessage.textContent = res && res.message ? res.message : '扫描启动失败';
      }
      refreshState();
    }).catch((err) => {
      els.scanMessage.textContent = String(err);
    });
  }

  function toggleExifRead() {
    if (!state.currentRootPath) return;
    if (state.exifRunning) {
      call('stop_exif').then(refreshState).catch(console.warn);
      return;
    }
    call('start_exif', state.currentRootPath, state.currentSourceId || null).then((res) => {
      if (!res || !res.success) {
        els.exifMessage.textContent = res && res.message ? res.message : 'EXIF 读取启动失败';
      }
      refreshState();
    }).catch((err) => {
      els.exifMessage.textContent = String(err);
    });
  }

  function elementNearGalleryViewport(el, margin) {
    const root = els.galleryScroll.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return rect.bottom >= root.top - margin &&
      rect.top <= root.bottom + margin &&
      rect.right >= root.left - margin &&
      rect.left <= root.right + margin;
  }

  function maybeRefreshVisibleDates(force) {
    if (!state.dates.length || state.loadingDates) return Promise.resolve(false);
    const now = Date.now();
    if (!force && !state.scanRunning && now - state.lastVisibleRefreshAt < 2400) return Promise.resolve(false);
    state.lastVisibleRefreshAt = now;
    return call('list_dates', null, Math.max(10, state.dates.length), state.currentRootPath || null, state.currentSourceId || null, state.sortKey, filterPayload()).then((data) => {
      const incoming = data.dates || [];
      const known = new Set(state.dates.map((x) => x.date_key));
      incoming.forEach((d) => {
        if (!known.has(d.date_key)) {
          addDateSection(d);
        }
      });
      state.dateCursor = state.dates.length ? state.dates[state.dates.length - 1].date_key : null;
      updateDateCounts(incoming);
      return true;
    }).catch(() => false);
  }

  function updateDateCounts(dates) {
    (dates || []).forEach((d) => {
      const dateKey = d.date_key;
      if (!dateKey) return;
      if (Object.prototype.hasOwnProperty.call(d, 'note')) setDateNote(dateKey, d.note || '');
      const hadCount = state.dateCounts.has(dateKey);
      const previousCount = state.dateCounts.get(dateKey) || 0;
      const nextCount = Number(d.count || 0);
      if (Object.prototype.hasOwnProperty.call(d, 'cover_url')) {
        setDateCover(dateKey, d.cover_url || '');
      }
      state.dateCounts.set(dateKey, nextCount);
      const header = els.gallery.querySelector('[data-date-header="' + dateKey + '"] > span');
      if (header) header.textContent = nextCount + ' 张 · EXIF ' + (d.exif_count || 0);
      const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
      if (pill) {
        renderDateLabel(pill, dateKey);
        applyDateCover(pill, dateKey);
      }
      const section = document.getElementById('date-' + dateKey);
      if (section) renderPhotoPlaceholders(section, dateKey, nextCount);
      updateDateReserve(dateKey);
      if (hadCount && nextCount > previousCount) refreshDateMoreAvailability(dateKey, nextCount);
    });
  }

  function renderDateLabel(target, dateKey) {
    target.innerHTML = '';
    const note = state.dateNotes.get(dateKey) || '';
    const isPill = target.classList.contains('date-pill');
    const wrap = document.createElement('span');
    wrap.className = 'date-label-stack';
    const label = document.createElement('span');
    label.className = 'date-label-text';
    label.textContent = isPill ? dateKey.slice(5) : dateKey;
    wrap.appendChild(label);
    if (note && isPill) {
      const noteText = document.createElement('span');
      noteText.className = 'date-note-text';
      noteText.textContent = note;
      wrap.appendChild(noteText);
      target.title = note;
    } else {
      target.removeAttribute('title');
    }
    target.appendChild(wrap);
  }

  function setDateCover(dateKey, coverUrl) {
    if (!dateKey) return;
    const clean = String(coverUrl || '').trim();
    if (clean) state.dateCovers.set(dateKey, clean);
    else state.dateCovers.delete(dateKey);
    const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
    if (pill) applyDateCover(pill, dateKey);
  }

  function applyDateCover(pill, dateKey) {
    if (!pill) return;
    const coverUrl = state.dateCovers.get(dateKey) || '';
    pill.classList.toggle('has-cover', !!coverUrl);
    if (coverUrl) {
      pill.style.setProperty('--date-cover', 'url("' + coverUrl.replace(/"/g, '\\"') + '")');
    } else {
      pill.style.removeProperty('--date-cover');
    }
  }

  function setDateNote(dateKey, note) {
    if (!dateKey) return;
    const clean = String(note || '');
    if (clean) state.dateNotes.set(dateKey, clean);
    else state.dateNotes.delete(dateKey);
    const header = els.gallery.querySelector('[data-date-header="' + dateKey + '"] strong');
    if (header) renderDateLabel(header, dateKey);
    const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
    if (pill) renderDateLabel(pill, dateKey);
  }

  function refreshDateMoreAvailability(dateKey, totalCount) {
    const section = document.getElementById('date-' + dateKey);
    if (!section || section.dataset.loadingPhotos === '1') return;
    const loadedCount = state.photoOffsets.get(dateKey) || 0;
    updateDateReserve(dateKey);
    if (loadedCount >= totalCount) return;
    const more = section.querySelector('.date-more');
    if (!more) return;
    more.textContent = '滚动到这里会继续加载';
    observeDateMore(more, dateKey);
    if (elementNearGalleryViewport(more, 360)) loadPhotosForDate(dateKey);
  }

  function loadOlderDates(options) {
    const allowScanRequest = !options || options.allowScanRequest !== false;
    if (state.loadingDates || state.noMoreDates) return Promise.resolve(false);
    state.loadingDates = true;
    const requestedLimit = state.dateCursor ? 8 : DATE_RAIL_LOAD_LIMIT;
    return call('list_dates', state.dateCursor, requestedLimit, state.currentRootPath || null, state.currentSourceId || null, state.sortKey, filterPayload()).then((data) => {
      const dates = data.dates || [];
      if (!dates.length) {
        if (state.scanRunning) {
          els.olderSentinel.textContent = '等待发现图片...';
        } else if (state.scanStoppedByUser) {
          els.olderSentinel.textContent = '扫描已停止，点击扫描所有图片继续';
        } else if (!state.scanComplete) {
          els.olderSentinel.textContent = '继续扫描图片...';
          if (allowScanRequest) requestMoreScan();
        } else {
          state.noMoreDates = true;
          els.olderSentinel.textContent = '没有更早日期';
        }
        return false;
      }
      dates.forEach(addDateSection);
      state.dateCursor = state.dates.length ? state.dates[state.dates.length - 1].date_key : null;
      if (!state.activeDate && dates[0] && !state.pendingRestoreDate) setActiveDate(dates[0].date_key);
      setTimeout(tryRestorePendingDate, 0);
      scheduleRenderBufferCheck();
      return true;
    }).catch((err) => {
      console.warn(err);
      return false;
    }).finally(() => {
      state.loadingDates = false;
      if (state.pendingRestoreDate) setTimeout(tryRestorePendingDate, 0);
    });
  }

  function compareDatesForCurrentSort(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    if (state.sortKey === 'datetime_asc') return left.localeCompare(right);
    return right.localeCompare(left);
  }

  function addDateSection(date) {
    const existing = document.getElementById('date-' + date.date_key);
    if (existing) {
      updateDateCounts([date]);
      return;
    }
    const section = document.createElement('section');
    section.className = 'date-section';
    section.id = 'date-' + date.date_key;
    section.dataset.date = date.date_key;
    section.innerHTML = [
      '<div class="date-header" data-date-header="' + date.date_key + '"><strong></strong><span></span></div>',
      '<div class="photo-grid"></div>',
      '<div class="date-more">继续检查这一天...</div>',
    ].join('');
    if (date.note) state.dateNotes.set(date.date_key, String(date.note));
    if (date.cover_url) state.dateCovers.set(date.date_key, String(date.cover_url));
    renderDateLabel(section.querySelector('strong'), date.date_key);
    section.querySelector('[data-date-header] > span').textContent = date.count + ' 张 · EXIF ' + (date.exif_count || 0);
    section.querySelector('.date-header').addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      showDateContextMenu(ev.clientX, ev.clientY, date.date_key);
    });
    state.dateCounts.set(date.date_key, Number(date.count || 0));
    renderPhotoPlaceholders(section, date.date_key, Number(date.count || 0));
    const beforeSection = Array.from(els.gallery.querySelectorAll('.date-section'))
      .find((node) => compareDatesForCurrentSort(node.dataset.date || '', date.date_key) > 0);
    if (beforeSection) els.gallery.insertBefore(section, beforeSection);
    else els.gallery.appendChild(section);

    const pill = document.createElement('button');
    pill.className = 'date-pill';
    pill.dataset.datePill = date.date_key;
    renderDateLabel(pill, date.date_key);
    applyDateCover(pill, date.date_key);
    pill.addEventListener('click', () => {
      jumpToDate(date.date_key);
    });
    pill.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      showDateContextMenu(ev.clientX, ev.clientY, date.date_key);
    });
    const beforePill = Array.from(els.dateRail.querySelectorAll('.date-pill'))
      .find((node) => compareDatesForCurrentSort(node.dataset.datePill || '', date.date_key) > 0);
    if (beforePill) els.dateRail.insertBefore(pill, beforePill);
    else els.dateRail.appendChild(pill);

    if (!state.dates.some((x) => x.date_key === date.date_key)) {
      state.dates.push(date);
      state.dates.sort((a, b) => compareDatesForCurrentSort(a.date_key, b.date_key));
    }

    observeDateSection(section, date.date_key);
    updateDateReserve(date.date_key);
    scheduleDateHighlight();
  }

  function renderPhotoPlaceholders(section, dateKey, count) {
    const grid = section.querySelector('.photo-grid');
    if (!grid) return;
    const existing = grid.children.length;
    const target = Math.max(0, Number(count || 0));
    if (existing >= target) return;
    const fragment = document.createDocumentFragment();
    for (let index = existing; index < target; index += 1) {
      const card = document.createElement('article');
      card.className = 'photo-card photo-placeholder';
      card.dataset.dateKey = dateKey;
      card.dataset.placeholderIndex = String(index);
      const fill = document.createElement('div');
      fill.className = 'placeholder-fill';
      card.appendChild(fill);
      fragment.appendChild(card);
    }
    grid.appendChild(fragment);
  }

  function updateDateReserve(dateKey) {
    const section = document.getElementById('date-' + dateKey);
    if (!section) return;
    const more = section.querySelector('.date-more');
    section.style.paddingBottom = '';
    if (more) more.dataset.reserve = '0';
  }

  function updateAllDateReserves() {
    state.dates.forEach((date) => updateDateReserve(date.date_key));
  }

  function schedulePlaceholderPhotoFill() {
    if (state.placeholderFillTicking) return;
    state.placeholderFillTicking = true;
    requestAnimationFrame(fillVisiblePlaceholders);
  }

  function fillVisiblePlaceholders() {
    state.placeholderFillTicking = false;
    if (state.loadingDates) return;
    const sections = Array.from(els.gallery.querySelectorAll('.date-section'));
    const root = els.galleryScroll.getBoundingClientRect();
    for (const section of sections) {
      const dateKey = section.dataset.date || '';
      if (!dateKey || section.dataset.loadingPhotos === '1') continue;
      const total = state.dateCounts.get(dateKey) || 0;
      const loaded = state.photoOffsets.get(dateKey) || 0;
      if (!total || loaded >= total) continue;
      const placeholders = Array.from(section.querySelectorAll('.photo-placeholder'));
      let targetIndex = -1;
      for (const placeholder of placeholders) {
        const rect = placeholder.getBoundingClientRect();
        if (rect.bottom < root.top - 500 || rect.top > root.bottom + 900) continue;
        targetIndex = Math.max(targetIndex, Number(placeholder.dataset.placeholderIndex || -1));
      }
      if (targetIndex < loaded) continue;
      const targetLoaded = Math.min(total, targetIndex + RENDER_AHEAD_PHOTOS + 1);
      const limit = Math.max(PHOTO_LOAD_BATCH, targetLoaded - loaded);
      loadPhotosForDate(dateKey, { limit });
      return;
    }
  }

  function jumpToDate(dateKey, offset) {
    const section = document.getElementById('date-' + dateKey);
    if (!section) {
      loadOlderDates({ allowScanRequest: false }).then(() => {
        const next = document.getElementById('date-' + dateKey);
        if (next) jumpToDate(dateKey, offset);
      });
      return;
    }
    updateAllDateReserves();
    setActiveDate(dateKey);
    const cleanOffset = Math.max(0, Number(offset || 0));
    const scrollToSection = () => {
      els.galleryScroll.scrollTo({ top: Math.max(0, section.offsetTop + cleanOffset), behavior: 'auto' });
      scheduleDateHighlight();
      schedulePlaceholderPhotoFill();
      scheduleVisiblePreviewCheck();
    };
    scrollToSection();
    loadPhotosForDate(dateKey).finally(() => {
      requestAnimationFrame(scrollToSection);
    });
  }

  function loadPhotosForDate(dateKey, options) {
    const offset = state.photoOffsets.get(dateKey) || 0;
    const section = document.getElementById('date-' + dateKey);
    if (!section) return Promise.resolve(false);
    if (section.dataset.loadingPhotos === '1') return Promise.resolve(false);
    const total = state.dateCounts.get(dateKey) || 0;
    if (total > 0 && offset >= total) return Promise.resolve(false);
    section.dataset.loadingPhotos = '1';
    const more = section.querySelector('.date-more');
    more.textContent = '加载中...';
    const requestedLimit = Math.max(1, Number(options && options.limit) || (offset === 0 ? INITIAL_PHOTO_LIMIT : PHOTO_LOAD_BATCH));
    return call('list_photos', dateKey, offset, requestedLimit, state.currentRootPath || null, state.currentSourceId || null, state.sortKey, filterPayload()).then((data) => {
      const photos = data.photos || [];
      const grid = section.querySelector('.photo-grid');
      requestAnimationFrame(() => {
        photos.forEach((photo, index) => {
          const card = photoCard(photo);
          const target = grid.children[offset + index];
          if (target) grid.replaceChild(card, target);
          else grid.appendChild(card);
        });
        updateDateReserve(dateKey);
        observeImages();
        scheduleRenderBufferCheck();
        schedulePlaceholderPhotoFill();
        scheduleVisiblePreviewCheck();
        scheduleDateHighlight();
        updateLightboxNavButtons();
      });
      state.photoOffsets.set(dateKey, offset + photos.length);
      updateDateReserve(dateKey);
      schedulePlaceholderPhotoFill();
      const nextOffset = offset + photos.length;
      const knownTotal = state.dateCounts.get(dateKey) || total;
      const complete = !photos.length || (knownTotal > 0 && nextOffset >= knownTotal) || photos.length < requestedLimit;
      more.textContent = complete ? '这一天已加载完' : '滚动到这里会继续加载';
      if (!complete) observeDateMore(more, dateKey);
      return photos.length > 0;
    }).catch((err) => {
      more.textContent = String(err);
      return false;
    }).finally(() => {
      section.dataset.loadingPhotos = '0';
    });
  }

  let imageObserver = null;
  let dateSectionObserver = null;
  let quickEditPanController = null;
  let quickEditCurvePanel = null;
  let quickEditPreviewWorker = null;
  let quickEditPreviewWorkerObjectUrl = '';
  function observeDateSection(section, dateKey) {
    if (!dateSectionObserver) {
      dateSectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          dateSectionObserver.unobserve(el);
          const key = el.dataset.date;
          if (key) loadPhotosForDate(key);
        });
      }, { root: els.galleryScroll, rootMargin: '620px 0px' });
    }
    section.dataset.date = dateKey;
    dateSectionObserver.observe(section);
  }

  function observeImages() {
    if (!imageObserver) {
      imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          imageObserver.unobserve(img);
          const photoId = Number(img.dataset.photoId || 0);
          enqueuePreview(img, photoId);
        });
      }, { root: els.galleryScroll, rootMargin: '220px 0px' });
    }
    els.gallery.querySelectorAll('img[data-photo-id]:not([data-observed])').forEach((img) => {
      img.dataset.observed = '1';
      imageObserver.observe(img);
    });
    scheduleVisiblePreviewCheck();
  }

  function imageHasSource(img) {
    return !!img.getAttribute('src');
  }

  function imageNearViewport(img, margin) {
    const root = els.galleryScroll.getBoundingClientRect();
    const card = img.closest('.photo-card');
    const rect = (card || img).getBoundingClientRect();
    return rect.bottom >= root.top - margin &&
      rect.top <= root.bottom + margin &&
      rect.right >= root.left - margin &&
      rect.left <= root.right + margin;
  }

  function requestVisiblePreviews() {
    state.previewTicking = false;
    const root = els.galleryScroll.getBoundingClientRect();
    const cards = Array.from(els.gallery.querySelectorAll('.photo-card'));
    let topIndex = -1;
    let bottomIndex = -1;
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom > root.top && topIndex < 0) topIndex = index;
      if (rect.top < root.bottom && rect.bottom > root.top) bottomIndex = index;
    });
    if (topIndex < 0) topIndex = 0;
    const maxIndex = bottomIndex < 0 ? RENDER_AHEAD_PHOTOS - 1 : bottomIndex + RENDER_AHEAD_PHOTOS;
    cards.slice(topIndex, maxIndex + 1).forEach((card, offset) => {
      const img = card.querySelector('img[data-photo-id]');
      if (!img) return;
      if (imageHasSource(img) || img.dataset.loadingPreview === '1') return;
      const absoluteIndex = topIndex + offset;
      enqueuePreview(img, Number(img.dataset.photoId || 0), { priority: bottomIndex >= 0 && absoluteIndex <= bottomIndex });
    });
  }

  function scheduleVisiblePreviewCheck() {
    if (state.previewTicking) return;
    state.previewTicking = true;
    requestAnimationFrame(requestVisiblePreviews);
  }

  function scheduleRenderBufferCheck() {
    if (state.renderBufferTicking) return;
    state.renderBufferTicking = true;
    requestAnimationFrame(ensureRenderBuffer);
  }

  function tailLoadableDateKey() {
    const sections = Array.from(els.gallery.querySelectorAll('.date-section'));
    for (let i = sections.length - 1; i >= 0; i--) {
      const dateKey = sections[i].dataset.date || '';
      const total = state.dateCounts.get(dateKey) || 0;
      const loaded = state.photoOffsets.get(dateKey) || 0;
      if (!total || loaded < total) return dateKey;
    }
    return '';
  }

  function ensureRenderBuffer() {
    state.renderBufferTicking = false;
    if (state.renderBufferLoading || state.loadingDates) return;
    const cards = Array.from(els.gallery.querySelectorAll('.photo-card'));
    if (!cards.length) return;
    const root = els.galleryScroll.getBoundingClientRect();
    let bottomIndex = -1;
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      if (rect.top < root.bottom && rect.bottom > root.top) bottomIndex = index;
    });
    if (bottomIndex < 0) return;
    const renderedAhead = cards.length - bottomIndex - 1;
    if (renderedAhead >= RENDER_AHEAD_PHOTOS) return;
    const need = RENDER_AHEAD_PHOTOS - renderedAhead;
    const dateKey = tailLoadableDateKey();
    if (dateKey) {
      state.renderBufferLoading = true;
      loadPhotosForDate(dateKey, { limit: need }).finally(() => {
        state.renderBufferLoading = false;
        scheduleRenderBufferCheck();
      });
      return;
    }
    if (!state.noMoreDates) {
      state.renderBufferLoading = true;
      loadOlderDates({ allowScanRequest: false }).then(() => {
        const nextDateKey = tailLoadableDateKey();
        if (nextDateKey) return loadPhotosForDate(nextDateKey, { limit: need });
        return false;
      }).finally(() => {
        state.renderBufferLoading = false;
        scheduleRenderBufferCheck();
      });
    }
  }

  function enqueuePreview(img, photoId, options) {
    if (!photoId || img.dataset.loadingPreview === '1' || imageHasSource(img)) return;
    const priority = !!(options && options.priority);
    if (img.dataset.queuedPreview === '1') {
      if (priority) promoteQueuedPreview(img);
      return;
    }
    img.dataset.queuedPreview = '1';
    const item = { img, photoId, priority, sessionId: state.previewSessionId };
    if (priority) insertPriorityPreview(item);
    else state.previewQueue.push(item);
    drainPreviewQueue();
  }

  function promoteQueuedPreview(img) {
    const index = state.previewQueue.findIndex((item) => item.img === img);
    if (index < 0) return;
    const item = state.previewQueue.splice(index, 1)[0];
    item.priority = true;
    insertPriorityPreview(item);
  }

  function insertPriorityPreview(item) {
    const firstNormal = state.previewQueue.findIndex((queued) => !queued.priority);
    if (firstNormal < 0) state.previewQueue.push(item);
    else state.previewQueue.splice(firstNormal, 0, item);
  }

  function drainPreviewQueue() {
    while (state.previewActive < PREVIEW_CONCURRENCY && state.previewQueue.length) {
      const item = state.previewQueue.shift();
      if (item.sessionId !== state.previewSessionId) continue;
      if (!item.img.isConnected || imageHasSource(item.img)) {
        item.img.dataset.queuedPreview = '0';
        continue;
      }
      state.previewActive += 1;
      item.img.dataset.queuedPreview = '0';
      item.img.dataset.loadingPreview = '1';
      call('get_photo_preview', item.photoId).then((res) => {
        if (item.sessionId !== state.previewSessionId || !item.img.isConnected) return;
        if (!res || !res.success || !res.photo || !res.photo.preview_url) {
          item.img.dataset.loadingPreview = '0';
          item.img.dataset.previewFailed = '1';
          const failedCard = item.img.closest('.photo-card');
          if (failedCard) {
            updatePhotoCardMeta(
              failedCard,
              Object.assign({}, state.photoCache.get(item.photoId), { preview_failed: true }),
              false
            );
          }
          return;
        }
        state.photoCache.set(item.photoId, Object.assign({}, state.photoCache.get(item.photoId), res.photo));
        const card = item.img.closest('.photo-card');
        if (card) updatePhotoCardMeta(card, res.photo, true);
        item.img.src = res.photo.preview_url;
      }).catch(() => {
        if (item.sessionId !== state.previewSessionId || !item.img.isConnected) return;
        item.img.dataset.loadingPreview = '0';
        item.img.dataset.previewFailed = '1';
        const failedCard = item.img.closest('.photo-card');
        if (failedCard) {
          updatePhotoCardMeta(
            failedCard,
            Object.assign({}, state.photoCache.get(item.photoId), { preview_failed: true }),
            false
          );
        }
      }).finally(() => {
        if (item.sessionId !== state.previewSessionId) return;
        state.previewActive = Math.max(0, state.previewActive - 1);
        drainPreviewQueue();
        scheduleVisiblePreviewCheck();
      });
    }
  }

  const moreObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      moreObserver.unobserve(el);
      const dateKey = el.dataset.dateKey;
      if (dateKey) loadPhotosForDate(dateKey);
    });
  }, { root: els.galleryScroll, rootMargin: '320px 0px' });

  function observeDateMore(el, dateKey) {
    el.dataset.dateKey = dateKey;
    moreObserver.observe(el);
  }

  function photoStatusText(photo, previewLoaded) {
    if (photo.lens_model || photo.model) return photo.lens_model || photo.model;
    if (photo.exif_status === 'complete') return 'EXIF';
    if (photo.exif_status === 'failed') return 'EXIF 失败';
    if (photo.preview_failed) return '预览失败';
    if (photo.previewable || photo.original_url || photo.preview_url) return previewLoaded ? '预览' : '加载中';
    return '';
  }

  function updatePhotoCardMeta(card, photo, previewLoaded) {
    const meta = card.querySelector('.photo-meta');
    if (!meta) return;
    meta.children[0].textContent = photo.format_label || photo.format || '';
    meta.children[1].textContent = photoStatusText(photo, previewLoaded);
    applyPhotoMarkToCard(card, photo);
  }

  function applyPhotoMarkToCard(card, photo) {
    if (!card || !photo) return;
    const note = String(photo.note || '');
    const category = String(photo.category || '').trim();
    card.classList.toggle('favorite', !!photo.favorite);
    card.classList.toggle('has-note', !!note);
    card.classList.toggle('has-category', !!category);
    card.removeAttribute('title');
    let categoryBadge = card.querySelector('.photo-category-badge');
    if (category) {
      if (!categoryBadge) {
        categoryBadge = document.createElement('div');
        categoryBadge.className = 'photo-category-badge';
        card.appendChild(categoryBadge);
      }
      categoryBadge.textContent = categoryBadgeText(category);
      categoryBadge.title = category;
    } else if (categoryBadge) {
      categoryBadge.remove();
    }
    let icon = card.querySelector('.photo-note-icon');
    if (note) {
      if (!icon) {
        icon = document.createElement('div');
        icon.className = 'note-icon photo-note-icon';
        icon.textContent = '✎';
        icon.tabIndex = 0;
        card.appendChild(icon);
      }
      icon.dataset.note = note;
    } else if (icon) {
      icon.remove();
    }
  }

  let suppressPhotoClickUntil = 0;

  function resetNativeDragCursor() {
    call('reset_drag_cursor').catch(() => {});
  }

  function bindPhotoDrag(card, img, photo) {
    let dragStart = null;
    card.draggable = false;
    img.draggable = false;
    card.addEventListener('dragstart', (ev) => ev.preventDefault());
    card.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0 || !photo.original_url) return;
      dragStart = { x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId };
    });
    card.addEventListener('pointermove', (ev) => {
      if (!dragStart || dragStart.pointerId !== ev.pointerId) return;
      const dx = ev.clientX - dragStart.x;
      const dy = ev.clientY - dragStart.y;
      if (Math.hypot(dx, dy) < 8) return;
      const current = state.photoCache.get(Number(photo.id)) || photo;
      dragStart = null;
      if (!current || !current.original_url || !current.path) return;
      ev.preventDefault();
      suppressPhotoClickUntil = Date.now() + 700;
      state.nativePhotoDragging = true;
      clearTimeout(hoverTimer);
      hoverCard = null;
      hide(els.exifPop);
      hideNoteTooltip();
      card.classList.add('dragging');
      resetNativeDragCursor();
      call('start_photo_drag', Number(current.id || photo.id)).catch((err) => {
        console.warn(err);
      }).finally(() => {
        suppressPhotoClickUntil = Date.now() + 350;
        resetNativeDragCursor();
        setTimeout(resetNativeDragCursor, 120);
        setTimeout(resetNativeDragCursor, 900);
        setTimeout(() => {
          state.nativePhotoDragging = false;
          resetNativeDragCursor();
        }, 2500);
        card.classList.remove('dragging');
      });
    });
    card.addEventListener('pointerup', () => { dragStart = null; });
    card.addEventListener('pointercancel', () => { dragStart = null; });
  }

  function comparePhotoId(photo) {
    return Number(photo && photo.id || 0);
  }

  function comparePhotoReady(photo) {
    return !!(photo && (photo.original_url || photo.lightbox_url || photo.preview_url || photo.previewable));
  }

  function currentComparePhoto(photo) {
    const id = comparePhotoId(photo);
    return (id && state.photoCache.get(id)) || photo || null;
  }

  function compareSelectedIndex(photoOrId) {
    const id = Number(typeof photoOrId === 'object' ? comparePhotoId(photoOrId) : photoOrId);
    if (!id) return -1;
    return state.compare.selected.findIndex((item) => comparePhotoId(item) === id);
  }

  function compareSelectedCount() {
    return state.compare.selected.filter(Boolean).length;
  }

  function ensureComparePanel() {
    if (state.compare.panel && state.compare.panel.isConnected) return state.compare.panel;
    const panel = document.createElement('section');
    panel.className = 'compare-picker hidden';
    panel.innerHTML = [
      '<div class="compare-picker-head">',
      '<strong>对比</strong>',
      '<button class="compare-picker-close" type="button" title="关闭">×</button>',
      '</div>',
      '<div class="compare-picker-slots">',
      '<button class="compare-slot" type="button" data-compare-slot="0"><span>第一张</span></button>',
      '<button class="compare-slot" type="button" data-compare-slot="1"><span>第二张</span></button>',
      '</div>',
      '<button class="primary-btn compare-enter" type="button">进入对比</button>',
    ].join('');
    panel.querySelector('.compare-picker-close').addEventListener('click', () => closeComparePanel());
    panel.querySelectorAll('[data-compare-slot]').forEach((slot) => {
      slot.addEventListener('click', () => {
        const index = Number(slot.dataset.compareSlot || -1);
        if (!state.compare.selected[index]) return;
        state.compare.selected[index] = null;
        renderComparePanel();
      });
    });
    panel.querySelector('.compare-enter').addEventListener('click', () => {
      if (compareSelectedCount() >= 2) openCompareLightbox();
    });
    document.body.appendChild(panel);
    state.compare.panel = panel;
    return panel;
  }

  function renderComparePanel() {
    const panel = ensureComparePanel();
    panel.querySelectorAll('[data-compare-slot]').forEach((slot) => {
      const index = Number(slot.dataset.compareSlot || 0);
      const photo = currentComparePhoto(state.compare.selected[index]);
      slot.textContent = '';
      slot.classList.toggle('filled', !!photo);
      if (photo) {
        const img = document.createElement('img');
        img.src = photo.preview_url || photo.original_url || photo.lightbox_url || '';
        img.alt = '';
        const label = document.createElement('span');
        label.textContent = photo.filename || photo.relative_path || ('第 ' + (index + 1) + ' 张');
        if (img.src) slot.appendChild(img);
        slot.appendChild(label);
      } else {
        const empty = document.createElement('span');
        empty.textContent = index === 0 ? '第一张' : '第二张';
        slot.appendChild(empty);
      }
    });
    const enter = panel.querySelector('.compare-enter');
    enter.disabled = compareSelectedCount() < 2;
    updateCompareCardHighlights();
  }

  function openComparePanel() {
    cancelQuickEditPicking();
    state.compare.open = true;
    closeCategoryPicker();
    hideContextMenu();
    const panel = ensureComparePanel();
    renderComparePanel();
    panel.classList.remove('hidden');
  }

  function closeComparePanel() {
    state.compare.open = false;
    if (state.compare.panel) state.compare.panel.classList.add('hidden');
    updateCompareCardHighlights();
  }

  function toggleComparePanel() {
    if (state.compare.open) closeComparePanel();
    else openComparePanel();
  }

  function clearCompareSelection() {
    state.compare.selected = [null, null];
    renderComparePanel();
  }

  function toggleComparePhoto(photo) {
    const current = currentComparePhoto(photo);
    if (!comparePhotoReady(current)) return false;
    openComparePanel();
    const selectedIndex = compareSelectedIndex(current);
    if (selectedIndex >= 0) {
      state.compare.selected[selectedIndex] = null;
      renderComparePanel();
      return true;
    }
    const emptyIndex = state.compare.selected.findIndex((item) => !item);
    if (emptyIndex < 0) {
      showToast('已选择两张，先移除一张');
      return true;
    }
    state.compare.selected[emptyIndex] = current;
    renderComparePanel();
    if (compareSelectedCount() >= 2) openCompareLightbox();
    return true;
  }

  function updateCompareCardState(card) {
    if (!card) return;
    const index = compareSelectedIndex(Number(card.dataset.photoId || 0));
    const visible = index >= 0 && (state.compare.open || state.compare.lightbox);
    card.classList.toggle('compare-selected', visible);
    card.classList.toggle('compare-slot-1', visible && index === 0);
    card.classList.toggle('compare-slot-2', visible && index === 1);
    let badge = card.querySelector('.photo-compare-badge');
    if (visible) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'photo-compare-badge';
        card.appendChild(badge);
      }
      badge.textContent = String(index + 1);
    } else if (badge) {
      badge.remove();
    }
  }

  function updateCompareCardHighlights() {
    els.gallery.querySelectorAll('.photo-card').forEach(updateCompareCardState);
  }

  function photoCard(photo) {
    const card = document.createElement('article');
    card.className = 'photo-card';
    card.dataset.photoId = photo.id;
    card.dataset.filename = photo.filename || '';
    state.photoCache.set(Number(photo.id), photo);
    const canPreview = !!(photo.previewable || photo.original_url || photo.preview_url);
    if (canPreview) {
      card.classList.add('openable');
      card.addEventListener('click', (ev) => {
        if (Date.now() < suppressPhotoClickUntil) return;
        if (state.quickEdit.picking) {
          ev.preventDefault();
          ev.stopPropagation();
          openQuickEdit(state.photoCache.get(Number(photo.id)) || photo);
          return;
        }
        if (state.compare.open) {
          ev.preventDefault();
          ev.stopPropagation();
          toggleComparePhoto(state.photoCache.get(Number(photo.id)) || photo);
          return;
        }
        openLightbox(photo);
      });
    }
    if (canPreview) {
      const img = document.createElement('img');
      img.alt = photo.filename || '';
      img.loading = 'eager';
      img.decoding = 'async';
      img.dataset.photoId = photo.id;
      bindPhotoDrag(card, img, photo);
      img.addEventListener('load', () => {
        img.classList.add('loaded');
        card.classList.add('preview-loaded');
        card.classList.remove('preview-error');
        img.dataset.loadingPreview = '0';
        updatePhotoCardMeta(card, state.photoCache.get(Number(photo.id)) || photo, true);
      });
      img.addEventListener('error', () => {
        img.classList.remove('loaded');
        card.classList.remove('preview-loaded');
        card.classList.add('preview-error');
        img.dataset.loadingPreview = '0';
        img.dataset.previewFailed = '1';
        updatePhotoCardMeta(card, Object.assign({}, state.photoCache.get(Number(photo.id)) || photo, { preview_failed: true }), false);
      });
      if (photo.preview_url) {
        img.dataset.loadingPreview = '1';
        img.src = photo.preview_url;
      }
      card.appendChild(img);
    } else {
      const raw = document.createElement('div');
      raw.className = 'raw-placeholder';
      raw.textContent = photo.format || 'RAW';
      card.appendChild(raw);
    }
    const meta = document.createElement('div');
    meta.className = 'photo-meta';
    meta.innerHTML = '<span class="badge"></span><span class="badge"></span>';
    card.appendChild(meta);
    updatePhotoCardMeta(card, photo, false);
    card.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      showPhotoContextMenu(ev.clientX, ev.clientY, card);
    });
    updateCompareCardState(card);
    return card;
  }

  let hoverTimer = null;
  let hoverCard = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let noteTooltip = null;

  function cardFromEvent(ev) {
    return ev.target && ev.target.closest ? ev.target.closest('.photo-card') : null;
  }

  function rememberPointer(ev) {
    if (!Number.isFinite(ev.clientX) || !Number.isFinite(ev.clientY)) return;
    lastPointerX = ev.clientX;
    lastPointerY = ev.clientY;
  }

  function cardFromLastPointer() {
    const target = document.elementFromPoint(lastPointerX, lastPointerY);
    return target && target.closest ? target.closest('.photo-card') : null;
  }

  function activePointerCard() {
    if (hoverCard && hoverCard.isConnected) return hoverCard;
    const card = cardFromLastPointer();
    return card && card.isConnected ? card : null;
  }

  function canShowGalleryExif() {
    return !!els.workspace
      && !els.workspace.classList.contains('hidden')
      && !state.nativePhotoDragging
      && !state.settingsOpen
      && !state.statsOpen
      && !state.searchOpen
      && !state.quickEdit.open
      && !state.quickEdit.picking
      && els.lightbox.classList.contains('hidden');
  }

  function pointerEventForExif(ev) {
    if (ev && Number.isFinite(ev.clientX) && Number.isFinite(ev.clientY)) return ev;
    return { clientX: lastPointerX, clientY: lastPointerY };
  }

  function showExifForCard(card, ev) {
    if (!card || !card.isConnected || !els.gallery.contains(card)) return false;
    const photo = state.photoCache.get(Number(card.dataset.photoId));
    if (!photo) return false;
    showExif(card, photo, pointerEventForExif(ev));
    return true;
  }

  function showAltExifFromPointer(ev) {
    if (!canShowGalleryExif()) return false;
    const card = activePointerCard();
    if (!card) return false;
    hoverCard = card;
    clearTimeout(hoverTimer);
    return showExifForCard(card, ev);
  }

  function bindGalleryHover() {
    els.gallery.addEventListener('mouseover', (ev) => {
      rememberPointer(ev);
      if (!canShowGalleryExif()) return;
      const card = cardFromEvent(ev);
      if (!card || card === hoverCard || card.contains(ev.relatedTarget)) return;
      hoverCard = card;
      clearTimeout(hoverTimer);
      if (ev.altKey) {
        showExifForCard(card, ev);
        return;
      }
      hoverTimer = setTimeout(() => showExifForCard(card, ev), 560);
    });
    els.gallery.addEventListener('mousemove', (ev) => {
      rememberPointer(ev);
      if (!canShowGalleryExif()) return;
      if (!hoverCard || !hoverCard.contains(ev.target)) return;
      if (ev.altKey && els.exifPop.classList.contains('hidden')) {
        showExifForCard(hoverCard, ev);
      }
      positionExif(ev);
    });
    els.gallery.addEventListener('mouseout', (ev) => {
      if (!hoverCard || hoverCard.contains(ev.relatedTarget)) return;
      hoverCard = null;
      clearTimeout(hoverTimer);
      hide(els.exifPop);
    });
  }

  function blockInternalFileDrop(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'none';
    state.nativePhotoDragging = false;
    clearTimeout(hoverTimer);
    hoverCard = null;
    hide(els.exifPop);
    hideNoteTooltip();
    resetNativeDragCursor();
    setTimeout(resetNativeDragCursor, 120);
  }

  function ensureNoteTooltip() {
    if (noteTooltip) return noteTooltip;
    noteTooltip = document.createElement('div');
    noteTooltip.className = 'note-tooltip hidden';
    document.body.appendChild(noteTooltip);
    return noteTooltip;
  }

  function positionNoteTooltip(icon) {
    const tooltip = ensureNoteTooltip();
    const rect = icon.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const pad = 10;
    let left = rect.right + 10;
    let top = rect.top + rect.height / 2 - tipRect.height / 2;
    if (left + tipRect.width > window.innerWidth - pad) left = rect.left - tipRect.width - 10;
    top = Math.max(pad + 36, Math.min(top, window.innerHeight - tipRect.height - pad));
    tooltip.style.left = Math.max(pad, left) + 'px';
    tooltip.style.top = top + 'px';
  }

  function showNoteTooltip(icon) {
    const note = icon && icon.dataset ? String(icon.dataset.note || '') : '';
    if (!note) return;
    const tooltip = ensureNoteTooltip();
    tooltip.textContent = note;
    tooltip.classList.remove('hidden');
    requestAnimationFrame(() => positionNoteTooltip(icon));
  }

  function hideNoteTooltip() {
    if (noteTooltip) noteTooltip.classList.add('hidden');
  }

  function bindNoteTooltip() {
    document.addEventListener('mouseover', (ev) => {
      const icon = ev.target && ev.target.closest ? ev.target.closest('.note-icon[data-note]') : null;
      if (!icon || icon.contains(ev.relatedTarget)) return;
      showNoteTooltip(icon);
    });
    document.addEventListener('mouseout', (ev) => {
      const icon = ev.target && ev.target.closest ? ev.target.closest('.note-icon[data-note]') : null;
      if (!icon || icon.contains(ev.relatedTarget)) return;
      hideNoteTooltip();
    });
    document.addEventListener('focusin', (ev) => {
      const icon = ev.target && ev.target.closest ? ev.target.closest('.note-icon[data-note]') : null;
      if (icon) showNoteTooltip(icon);
    });
    document.addEventListener('focusout', (ev) => {
      const icon = ev.target && ev.target.closest ? ev.target.closest('.note-icon[data-note]') : null;
      if (icon) hideNoteTooltip();
    });
  }

  function ensureContextMenu() {
    if (state.contextMenu) return state.contextMenu;
    const menu = document.createElement('div');
    menu.className = 'context-menu hidden';
    document.body.appendChild(menu);
    state.contextMenu = menu;
    return menu;
  }

  function hideContextMenu() {
    if (state.contextMenu) state.contextMenu.classList.add('hidden');
  }

  function showContextMenu(x, y, items) {
    const menu = ensureContextMenu();
    menu.innerHTML = '';
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        hideContextMenu();
        item.action();
      });
      menu.appendChild(btn);
    });
    menu.classList.remove('hidden');
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const left = Math.min(x, window.innerWidth - rect.width - 8);
      const top = Math.min(y, window.innerHeight - rect.height - 8);
      menu.style.left = Math.max(8, left) + 'px';
      menu.style.top = Math.max(8, top) + 'px';
    });
  }

  function requireSourceIdForMark() {
    if (state.currentSourceId) return true;
    els.scanMessage.textContent = '当前来源尚未建立 .picscanner，请先扫描一次';
    return false;
  }

  function updatePhotoMark(filename, mark) {
    const cleanName = String(filename || '');
    state.photoCache.forEach((photo, id) => {
      if (String(photo.filename || '') !== cleanName) return;
      const next = Object.assign({}, photo, {
        favorite: !!mark.favorite,
        note: String(mark.note || ''),
        category: String(mark.category || ''),
      });
      state.photoCache.set(id, next);
    });
    if (state.lightbox.photo && String(state.lightbox.photo.filename || '') === cleanName) {
      state.lightbox.photo = Object.assign({}, state.lightbox.photo, {
        favorite: !!mark.favorite,
        note: String(mark.note || ''),
        category: String(mark.category || ''),
      });
    }
    els.gallery.querySelectorAll('.photo-card').forEach((card) => {
      if (String(card.dataset.filename || '') !== cleanName) return;
      const photo = state.photoCache.get(Number(card.dataset.photoId || 0)) || {};
      applyPhotoMarkToCard(card, photo);
      updatePhotoCardMeta(card, photo, !!card.querySelector('img.loaded'));
    });
  }

  function setPhotoFavorite(photo, favorite) {
    if (!photo || !requireSourceIdForMark()) return Promise.resolve(false);
    const filename = String(photo.filename || '');
    if (!filename) return Promise.resolve(false);
    return call('set_item_mark', state.currentSourceId, 'photo', filename, !!favorite, null).then((res) => {
      if (res && res.success) {
        const mark = res.mark || {};
        updatePhotoMark(filename, mark);
        const updated = Object.assign({}, photo, {
          favorite: !!mark.favorite,
          note: String(mark.note || ''),
          category: String(mark.category || ''),
        });
        showToast(updated.favorite ? '已收藏' : '已取消收藏');
        loadCategories();
        const keepUnfavoritedInFavoritePage = state.activeCategory === FAVORITE_CATEGORY && !updated.favorite;
        if (!keepUnfavoritedInFavoritePage && !photoMatchesActiveCategory(updated)) {
          refreshGalleryForCategory();
        }
        return true;
      }
      showToast('收藏保存失败', 'error');
      return false;
    }).catch((err) => {
      console.warn(err);
      showToast('收藏保存失败', 'error');
      return false;
    });
  }

  function photoMatchesActiveCategory(photo) {
    if (state.activeCategory === null) return true;
    if (state.activeCategory === FAVORITE_CATEGORY) return !!(photo && photo.favorite);
    const category = String(photo && photo.category || '').trim();
    return state.activeCategory === '' ? !category : category === state.activeCategory;
  }

  function setPhotoCategory(photo, categoryName) {
    if (!photo || !requireSourceIdForMark()) return Promise.resolve(false);
    const filename = String(photo.filename || '');
    if (!filename) {
      console.warn('分类保存失败：照片缺少文件名', photo);
      els.scanMessage.textContent = '分类保存失败：照片缺少文件名';
      showToast('分类保存失败', 'error');
      return Promise.resolve(false);
    }
    const nextCategory = String(categoryName || '').trim();
    const sourceId = String(photo.source_id || state.currentSourceId || '');
    return call('set_photo_category', sourceId, filename, nextCategory).then((res) => {
      if (!res || !res.success) {
        const message = res && res.message ? res.message : '分类保存失败';
        console.warn('分类保存失败', { sourceId, filename, category: nextCategory, response: res });
        els.scanMessage.textContent = message;
        showToast(message, 'error');
        return false;
      }
      const mark = res.mark || {};
      updatePhotoMark(filename, mark);
      const savedCategory = String(mark.category || '').trim();
      const updated = Object.assign({}, photo, {
        favorite: !!mark.favorite,
        note: String(mark.note || ''),
        category: savedCategory,
      });
      showToast(savedCategory ? '已加入分类：' + savedCategory : '已移出分类');
      loadCategories();
      if (!photoMatchesActiveCategory(updated)) {
        refreshGalleryForCategory();
      }
      return true;
    }).catch((err) => {
      console.warn(err);
      els.scanMessage.textContent = '分类保存失败：' + String(err && err.message ? err.message : err);
      showToast('分类保存失败', 'error');
      return false;
    });
  }

  function editPhotoNote(photo) {
    if (!photo || !requireSourceIdForMark()) return false;
    const filename = String(photo.filename || '');
    if (!filename) return false;
    openTextInput({
      title: '照片笔记',
      message: filename,
      value: photo.note || '',
      placeholder: '输入这张照片的笔记',
      multiline: true,
    }).then((next) => {
      if (next === null) return;
      call('set_item_mark', state.currentSourceId, 'photo', filename, null, next).then((res) => {
        if (res && res.success) updatePhotoMark(filename, res.mark || {});
      }).catch(console.warn);
    });
    return true;
  }

  function showPhotoContextMenu(x, y, card) {
    const photo = state.photoCache.get(Number(card.dataset.photoId || 0));
    if (!photo) return;
    showContextMenu(x, y, [
      {
        label: photo.favorite ? '取消收藏' : '收藏',
        action: () => {
          setPhotoFavorite(photo, !photo.favorite);
        },
      },
      {
        label: '笔记',
        action: () => {
          editPhotoNote(photo);
        },
      },
    ]);
  }

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = String(target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  function canShowSearchPanel() {
    return (
      els.workspace
      && !els.workspace.classList.contains('hidden')
      && !state.settingsOpen
      && !state.statsOpen
      && els.lightbox.classList.contains('hidden')
    );
  }

  function openSearchPanel() {
    if (!canShowSearchPanel()) return false;
    state.searchOpen = true;
    hideContextMenu();
    closeCategoryPicker();
    setSortOpen(false);
    closeFilterMenu();
    closeFilterPop();
    show(els.searchPanel);
    requestAnimationFrame(() => {
      els.searchInput.focus();
      els.searchInput.select();
    });
    scheduleSearch();
    return true;
  }

  function closeSearchPanel() {
    if (!state.searchOpen) return;
    state.searchOpen = false;
    clearTimeout(state.searchTimer);
    hide(els.searchPanel);
    els.searchInput.blur();
  }

  function toggleSearchPanel() {
    if (state.searchOpen) {
      closeSearchPanel();
      return true;
    }
    return openSearchPanel();
  }

  function selectSearchResult(result) {
    if (!result) return;
    els.searchPanel.querySelectorAll('.search-result.active').forEach((item) => {
      item.classList.remove('active');
    });
    result.classList.add('active');
  }

  function setSearchScope(scope) {
    const clean = String(scope || 'all').trim() || 'all';
    state.searchScope = clean;
    els.searchPanel.querySelectorAll('[data-search-scope]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.searchScope === clean);
    });
    scheduleSearch({ immediate: true });
  }

  function renderSearchMessage(message) {
    state.searchResults.clear();
    els.searchResults.innerHTML = '<div class="search-empty">' + escapeHtml(message) + '</div>';
  }

  function searchSubtitle(item) {
    if (item.type === 'date') {
      const countText = Number(item.count || 0) + ' 张照片 · EXIF ' + Number(item.exif_count || 0);
      if (item.search_field === 'date_note') {
        return joinClean([item.date_key, countText], ' · ');
      }
      return countText;
    }
    const title = searchResultTitle(item);
    const filename = String(item.filename || item.relative_path || '').trim();
    const filenameContext = title && filename && title !== filename ? filename : '';
    return joinClean([
      filenameContext,
      item.date_key,
      item.model,
      item.lens_model,
      item.exposure_time,
      item.f_number ? 'f/' + item.f_number : '',
      item.iso ? 'ISO ' + item.iso : '',
    ], ' · ');
  }

  function searchMeta(item) {
    if (item.search_label) return String(item.search_label);
    if (item.type === 'date') return '日期';
    if (item.favorite) return '收藏';
    return item.format_label || item.format || (item.is_raw ? 'RAW' : '');
  }

  function searchResultKey(item) {
    if (item.type === 'date') return 'date:' + String(item.date_key || '');
    return 'photo:' + String(item.id || '');
  }

  function searchResultTitle(item) {
    const hit = String(item && item.search_title || '').trim();
    if (hit) return hit;
    if (item && item.type === 'date') return item.date_key || '未命名日期';
    return (item && (item.filename || item.relative_path)) || '未命名照片';
  }

  function appendHighlightedSearchText(target, text, query) {
    const value = String(text || '');
    const terms = String(query || '').trim().split(/\s+/)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    if (!value || !terms.length) {
      target.textContent = value;
      return;
    }
    const lower = value.toLowerCase();
    const loweredTerms = terms.map((term) => term.toLowerCase());
    let cursor = 0;
    while (cursor < value.length) {
      let matchIndex = -1;
      let matchLength = 0;
      loweredTerms.forEach((term) => {
        const index = lower.indexOf(term, cursor);
        if (index < 0) return;
        if (matchIndex < 0 || index < matchIndex || (index === matchIndex && term.length > matchLength)) {
          matchIndex = index;
          matchLength = term.length;
        }
      });
      if (matchIndex < 0) {
        target.appendChild(document.createTextNode(value.slice(cursor)));
        break;
      }
      if (matchIndex > cursor) {
        target.appendChild(document.createTextNode(value.slice(cursor, matchIndex)));
      }
      const mark = document.createElement('mark');
      mark.textContent = value.slice(matchIndex, matchIndex + matchLength);
      target.appendChild(mark);
      cursor = matchIndex + matchLength;
    }
  }

  function renderSearchResults(items, query) {
    state.searchResults.clear();
    els.searchResults.textContent = '';
    const count = items.length;
    els.searchStatus.textContent = count ? '找到 ' + count + ' 个结果' : '没有找到 "' + query + '"';
    if (!count) {
      renderSearchMessage('换个关键词或搜索范围试试');
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
      const key = searchResultKey(item);
      state.searchResults.set(key, item);
      const btn = document.createElement('button');
      btn.className = 'search-result' + (index === 0 ? ' active' : '');
      btn.type = 'button';
      btn.dataset.searchKey = key;

      const thumb = document.createElement('span');
      thumb.className = 'search-thumb' + (item.type === 'date' ? ' date' : '');
      const imageUrl = item.type === 'date' ? item.cover_url : item.preview_url;
      if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '';
        thumb.appendChild(img);
      }

      const main = document.createElement('span');
      main.className = 'search-result-main';
      const title = document.createElement('strong');
      if (item.search_title) title.className = 'search-hit-title';
      appendHighlightedSearchText(title, searchResultTitle(item), query);
      const subtitle = document.createElement('span');
      subtitle.textContent = searchSubtitle(item) || item.relative_path || item.path || '';
      main.appendChild(title);
      if (subtitle.textContent) main.appendChild(subtitle);

      const meta = document.createElement('span');
      meta.className = 'search-result-meta';
      meta.textContent = searchMeta(item);

      btn.appendChild(thumb);
      btn.appendChild(main);
      btn.appendChild(meta);
      fragment.appendChild(btn);
    });
    els.searchResults.appendChild(fragment);
  }

  function runSearch() {
    if (!state.searchOpen) return;
    const query = String(els.searchInput.value || '').trim();
    const seq = ++state.searchSeq;
    if (!query) {
      els.searchStatus.textContent = '输入关键词搜索当前来源';
      renderSearchMessage('可以搜索文件名、日期、相机、镜头、参数、备注或分类');
      return;
    }
    els.searchStatus.textContent = '搜索中...';
    state.searchResults.clear();
    call(
      'search_photos',
      query,
      state.currentRootPath || null,
      state.currentSourceId || null,
      state.searchScope,
      40,
      filterPayload(),
      state.sortKey
    ).then((res) => {
      if (seq !== state.searchSeq) return;
      if (!res || !res.success) throw new Error(res && res.message ? res.message : '搜索失败');
      renderSearchResults(res.items || res.photos || [], query);
    }).catch((err) => {
      if (seq !== state.searchSeq) return;
      els.searchStatus.textContent = '搜索失败';
      renderSearchMessage(String(err));
      console.warn('[PicScanner] 搜索失败', err);
    });
  }

  function scheduleSearch(options) {
    clearTimeout(state.searchTimer);
    if (options && options.immediate) {
      runSearch();
      return;
    }
    state.searchTimer = setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
  }

  function ensureDateSection(dateKey) {
    const section = document.getElementById('date-' + dateKey);
    if (section) return Promise.resolve(section);
    return loadOlderDates({ allowScanRequest: false }).then((loaded) => {
      const next = document.getElementById('date-' + dateKey);
      if (next) return next;
      if (!loaded || state.noMoreDates) return null;
      return ensureDateSection(dateKey);
    });
  }

  function ensurePhotoLoadedAt(dateKey, targetIndex) {
    const index = Number(targetIndex);
    if (!Number.isFinite(index) || index < 0) return loadPhotosForDate(dateKey);
    const loaded = state.photoOffsets.get(dateKey) || 0;
    if (loaded > index) return Promise.resolve(true);
    return loadPhotosForDate(dateKey, { limit: index + 1 - loaded }).then(() => {
      return (state.photoOffsets.get(dateKey) || 0) > index;
    });
  }

  function markSearchTargetCard(card) {
    if (!card) return;
    card.classList.add('search-target');
    clearTimeout(card._searchTargetTimer);
    card._searchTargetTimer = setTimeout(() => {
      card.classList.remove('search-target');
    }, 1500);
  }

  function jumpToSearchPhoto(photo) {
    if (!photo || !photo.date_key) return;
    state.photoCache.set(Number(photo.id), photo);
    ensureDateSection(photo.date_key).then((section) => {
      if (!section) return;
      setActiveDate(photo.date_key);
      return ensurePhotoLoadedAt(photo.date_key, photo.search_offset).then(() => {
        requestAnimationFrame(() => {
          const card = els.gallery.querySelector('[data-photo-id="' + Number(photo.id || 0) + '"]');
          if (!card) {
            jumpToDate(photo.date_key);
            return;
          }
          card.scrollIntoView({ block: 'center', inline: 'nearest' });
          markSearchTargetCard(card);
          scheduleDateHighlight();
          scheduleVisiblePreviewCheck();
        });
      });
    });
  }

  function openSearchResult(item) {
    if (!item) return;
    closeSearchPanel();
    if (item.type === 'date') {
      if (item.date_key) jumpToDate(item.date_key);
      return;
    }
    jumpToSearchPhoto(item);
  }

  function favoriteHoveredPhoto() {
    const card = activePointerCard();
    if (!card || !els.lightbox.classList.contains('hidden')) return false;
    const photo = state.photoCache.get(Number(card.dataset.photoId || 0));
    if (!photo) return false;
    setPhotoFavorite(photo, !photo.favorite);
    return true;
  }

  function editHoveredPhotoNote() {
    const card = activePointerCard();
    if (!card || !els.lightbox.classList.contains('hidden')) return false;
    const photo = state.photoCache.get(Number(card.dataset.photoId || 0));
    return editPhotoNote(photo);
  }

  function editActiveDateNote() {
    if (!state.activeDate || !els.lightbox.classList.contains('hidden')) return false;
    return editDateNote(state.activeDate);
  }

  function ensureCategoryPicker() {
    if (state.categoryPicker && state.categoryPicker.el) return state.categoryPicker.el;
    const el = document.createElement('div');
    el.className = 'category-picker hidden';
    el.setAttribute('role', 'listbox');
    document.body.appendChild(el);
    state.categoryPicker = { el, photoId: 0, photo: null, anchorCard: null, index: 0 };
    bindCategoryPickerPointer(el);
    return el;
  }

  function isCategoryPickerOpen() {
    return !!(state.categoryPicker && state.categoryPicker.el && !state.categoryPicker.el.classList.contains('hidden'));
  }

  function categoryPickerRowFromEvent(ev) {
    return ev.target && ev.target.closest ? ev.target.closest('.category-picker-row[data-index]') : null;
  }

  function selectCategoryPickerRow(row, ev) {
    const picker = state.categoryPicker;
    if (!picker || !row || !picker.el || !picker.el.contains(row)) return false;
    const index = Number(row.dataset.index);
    if (!Number.isInteger(index)) return false;
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    picker.index = index;
    return applyCategoryPickerSelection();
  }

  function bindCategoryPickerPointer(el) {
    const onPick = (ev) => {
      if (ev.button !== undefined && ev.button !== 0) return;
      selectCategoryPickerRow(categoryPickerRowFromEvent(ev), ev);
    };
    el.addEventListener('pointerdown', onPick, true);
    el.addEventListener('mousedown', onPick, true);
    el.addEventListener('click', onPick, true);
  }

  function closeCategoryPicker() {
    if (!state.categoryPicker || !state.categoryPicker.el) return;
    state.categoryPicker.el.classList.add('hidden');
  }

  function renderCategoryPicker() {
    const picker = state.categoryPicker;
    if (!picker || !picker.el) return;
    const categories = state.categories || [];
    picker.index = clamp(picker.index, 0, Math.max(0, categories.length - 1));
    picker.el.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'category-picker-title';
    title.textContent = '选择分类';
    picker.el.appendChild(title);
    categories.forEach((category, index) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'category-picker-row';
      row.dataset.index = String(index);
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', index === picker.index ? 'true' : 'false');
      row.classList.toggle('active', index === picker.index);
      row.innerHTML = '<span></span><b></b>';
      row.querySelector('span').textContent = categoryLabel(category);
      row.querySelector('b').textContent = category.name ? categoryBadgeText(category.name) : '无';
      picker.el.appendChild(row);
    });
  }

  function positionCategoryPicker(card) {
    const picker = ensureCategoryPicker();
    const rect = card.getBoundingClientRect();
    picker.classList.remove('hidden');
    const pickerRect = picker.getBoundingClientRect();
    const pad = 10;
    const left = Math.max(pad, Math.min(rect.left, window.innerWidth - pickerRect.width - pad));
    const top = Math.max(pad + 36, Math.min(rect.top, window.innerHeight - pickerRect.height - pad));
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
  }

  function openCategoryPickerForHover() {
    const card = activePointerCard();
    if (!card || !els.lightbox.classList.contains('hidden')) return false;
    const photo = state.photoCache.get(Number(card.dataset.photoId || 0));
    if (!photo) return false;
    if (!state.categories.length) {
      loadCategories().then(() => {
        if (state.categories.length) openCategoryPickerForHover();
      });
      return true;
    }
    const picker = ensureCategoryPicker();
    picker.photoId = Number(photo.id || 0);
    picker.photo = photo;
    picker.anchorCard = card;
    const current = String(photo.category || '');
    const index = state.categories.findIndex((category) => String(category.name || '') === current);
    picker.index = index >= 0 ? index : 0;
    renderCategoryPicker();
    positionCategoryPicker(card);
    return true;
  }

  function moveCategoryPicker(delta) {
    if (!state.categoryPicker || !state.categoryPicker.el || state.categoryPicker.el.classList.contains('hidden')) return false;
    const count = state.categories.length;
    if (!count) return true;
    state.categoryPicker.index = (state.categoryPicker.index + delta + count) % count;
    renderCategoryPicker();
    return true;
  }

  function handleCategoryPickerKey(ev) {
    if (!isCategoryPickerOpen()) return false;
    if (ev.key === 'w' || ev.key === 'W') {
      ev.preventDefault();
      ev.stopPropagation();
      moveCategoryPicker(-1);
      return true;
    }
    if (ev.key === 's' || ev.key === 'S') {
      ev.preventDefault();
      ev.stopPropagation();
      moveCategoryPicker(1);
      return true;
    }
    if (ev.key === ' ' || ev.key === 'Spacebar' || ev.code === 'Space') {
      ev.preventDefault();
      ev.stopPropagation();
      applyCategoryPickerSelection();
      return true;
    }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      closeCategoryPicker();
      return true;
    }
    return false;
  }

  function photoFromPickerCard(card) {
    if (!card || !card.isConnected) return null;
    return state.photoCache.get(Number(card.dataset.photoId || 0)) || null;
  }

  function categoryPickerPhoto(picker) {
    if (!picker) return null;
    return state.photoCache.get(Number(picker.photoId || 0)) ||
      picker.photo ||
      photoFromPickerCard(picker.anchorCard) ||
      photoFromPickerCard(cardUnderCategoryPicker(picker)) ||
      photoFromPickerCard(hoverCard);
  }

  function cardUnderCategoryPicker(picker) {
    if (!picker || !picker.el || picker.el.classList.contains('hidden')) return null;
    const rect = picker.el.getBoundingClientRect();
    const x = Math.max(0, Math.min(window.innerWidth - 1, rect.left + Math.min(12, rect.width / 2)));
    const y = Math.max(0, Math.min(window.innerHeight - 1, rect.top + Math.min(12, rect.height / 2)));
    const stack = document.elementsFromPoint(x, y);
    for (const node of stack) {
      const card = node && node.closest ? node.closest('.photo-card') : null;
      if (card && card.isConnected) return card;
    }
    return null;
  }

  function applyCategoryPickerSelection() {
    const picker = state.categoryPicker;
    if (!picker || !picker.el || picker.el.classList.contains('hidden')) return false;
    const category = state.categories[picker.index];
    const photo = categoryPickerPhoto(picker);
    if (!category || !photo) {
      console.warn('分类确认失败：缺少分类或照片', {
        categoryIndex: picker.index,
        photoId: picker.photoId,
        hasCategory: !!category,
        hasPhoto: !!photo,
        hasAnchorCard: !!(picker.anchorCard && picker.anchorCard.isConnected),
        hasHoverCard: !!(hoverCard && hoverCard.isConnected),
      });
      return false;
    }
    console.info('分类确认', {
      build: APP_BUILD,
      photoId: picker.photoId,
      filename: photo.filename || '',
      sourceId: photo.source_id || state.currentSourceId || '',
      category: category.name || '',
    });
    closeCategoryPicker();
    setPhotoCategory(photo, category.name || '');
    return true;
  }

  function showDateContextMenu(x, y, dateKey) {
    showContextMenu(x, y, [
      {
        label: '笔记',
        action: () => {
          editDateNote(dateKey);
        },
      },
    ]);
  }

  function editDateNote(dateKey) {
    const cleanDate = String(dateKey || '').trim();
    if (!cleanDate || !requireSourceIdForMark()) return false;
    openTextInput({
      title: '日期笔记',
      message: cleanDate,
      value: state.dateNotes.get(cleanDate) || '',
      placeholder: '输入这一天的笔记',
      multiline: true,
    }).then((next) => {
      if (next === null) return;
      call('set_item_mark', state.currentSourceId, 'date', cleanDate, null, next).then((res) => {
        if (res && res.success) setDateNote(cleanDate, (res.mark && res.mark.note) || '');
      }).catch(console.warn);
    });
    return true;
  }

  function formatZoomValue(zoom) {
    return zoom.toFixed(2) + '×';
  }

  function currentLightboxZoom() {
    if (state.compare.lightbox) {
      const pane = state.compare.panes[state.compare.activePane] || state.compare.panes[0];
      return pane.zoom || 1;
    }
    return state.lightbox.zoom || 1;
  }

  function parseZoomInput(value) {
    const raw = String(value || '').trim().toLowerCase().replace('×', 'x');
    if (!raw) return null;
    const isPercent = raw.endsWith('%');
    const cleaned = raw.replace(/[x%]/g, '').trim();
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return isPercent ? parsed / 100 : parsed;
  }

  function applyZoomInput() {
    const parsed = parseZoomInput(els.lightboxZoom.value);
    if (parsed === null) {
      els.lightboxZoom.value = formatZoomValue(currentLightboxZoom());
      return;
    }
    setLightboxZoom(parsed);
    els.lightboxZoom.value = formatZoomValue(currentLightboxZoom());
  }

  function formatMmValue(value) {
    const rounded = Math.round(Number(value) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function lightboxFocalText(photo, zoom) {
    const base = Number(photo && photo.focal_length_35mm);
    if (!Number.isFinite(base) || base <= 0) return '等效 --';
    return '等效 ' + formatMmValue(base * zoom) + 'mm';
  }

  function isApscFocal(photo) {
    const focal = Number(photo && photo.focal_length);
    const equivalent = Number(photo && photo.focal_length_35mm);
    if (!Number.isFinite(focal) || !Number.isFinite(equivalent) || focal <= 0 || equivalent <= 0) return false;
    const crop = equivalent / focal;
    return crop >= 1.35 && crop <= 1.75;
  }

  function lightboxApscFocalText(photo, zoom) {
    if (!isApscFocal(photo)) return '';
    return 'APS-C ' + formatMmValue(Number(photo.focal_length) * zoom) + 'mm';
  }

  function comparePaneEl(index) {
    return els.lightboxCompare ? els.lightboxCompare.querySelector('[data-compare-pane="' + index + '"]') : null;
  }

  function compareImgEl(index) {
    return index === 0 ? els.compareImgA : els.compareImgB;
  }

  function compareInfoEl(index) {
    return els.lightboxCompare ? els.lightboxCompare.querySelector('[data-compare-info="' + index + '"]') : null;
  }

  function compareInfoBodyEl(index) {
    return els.lightboxCompare ? els.lightboxCompare.querySelector('[data-compare-info-body="' + index + '"]') : null;
  }

  function defaultCompareInfoPosition() {
    return { x: 18, y: 18 };
  }

  function compareInfoPosition(index) {
    if (!state.compare.infoPositions[index]) {
      state.compare.infoPositions[index] = defaultCompareInfoPosition();
    }
    return state.compare.infoPositions[index];
  }

  function compareInfoHtml(photo) {
    return lightboxShotSummaryHtml(photo) +
      '<div class="exif-grid">' +
      lightboxInfoRows(photo).map((row) => '<span>' + escapeHtml(row[0]) + '</span><span>' + escapeHtml(text(row[1])) + '</span>').join('') +
      '</div>';
  }

  function updateCompareInfoPanel(index) {
    const body = compareInfoBodyEl(index);
    if (!body) return;
    const pane = state.compare.panes[index];
    body.innerHTML = compareInfoHtml(pane && pane.photo);
    if (state.compare.infoVisible) requestAnimationFrame(() => clampCompareInfoPosition(index));
  }

  function updateCompareInfoPanels() {
    state.compare.panes.forEach((_pane, index) => updateCompareInfoPanel(index));
  }

  function clampCompareInfoPosition(index) {
    if (!state.compare.infoVisible) return;
    const panel = compareInfoEl(index);
    const pane = comparePaneEl(index);
    if (!panel || !pane || panel.classList.contains('hidden')) return;
    const pad = 12;
    const position = compareInfoPosition(index);
    const maxX = Math.max(pad, pane.clientWidth - panel.offsetWidth - pad);
    const maxY = Math.max(pad, pane.clientHeight - panel.offsetHeight - pad);
    position.x = clamp(position.x, pad, maxX);
    position.y = clamp(position.y, pad, maxY);
    panel.style.left = position.x + 'px';
    panel.style.top = position.y + 'px';
  }

  function clampCompareInfoPositions() {
    state.compare.panes.forEach((_pane, index) => clampCompareInfoPosition(index));
  }

  function setCompareInfoVisible(visible) {
    state.compare.infoVisible = !!visible;
    state.compare.panes.forEach((_pane, index) => {
      const panel = compareInfoEl(index);
      if (panel) panel.classList.toggle('hidden', !state.compare.infoVisible);
    });
    if (els.compareInfoToggle) {
      els.compareInfoToggle.classList.toggle('active', state.compare.infoVisible);
      els.compareInfoToggle.setAttribute('aria-pressed', state.compare.infoVisible ? 'true' : 'false');
      els.compareInfoToggle.title = state.compare.infoVisible ? '隐藏参数' : '显示参数';
    }
    if (state.compare.infoVisible) {
      updateCompareInfoPanels();
      requestAnimationFrame(clampCompareInfoPositions);
    }
  }

  function mergeComparePanePhoto(index, photo) {
    const pane = state.compare.panes[index];
    if (!pane || !photo) return null;
    const photoId = comparePhotoId(photo);
    const merged = Object.assign({}, photoId ? (state.photoCache.get(photoId) || {}) : {}, pane.photo || {}, photo);
    pane.photo = merged;
    if (photoId) {
      state.photoCache.set(photoId, merged);
      const selectedIndex = compareSelectedIndex(photoId);
      if (selectedIndex >= 0) state.compare.selected[selectedIndex] = merged;
    }
    updateCompareInfoPanel(index);
    return merged;
  }

  function loadCompareExif(index, photo) {
    const photoId = comparePhotoId(photo);
    if (!photoId) return;
    const applyPhoto = (full) => {
      if (!state.compare.lightbox) return;
      const pane = state.compare.panes[index];
      if (!pane || comparePhotoId(pane.photo) !== photoId) return;
      const merged = mergeComparePanePhoto(index, full);
      if (merged) {
        state.exifCache.set(photoId, merged);
        updateCompareView();
        updateCompareCardHighlights();
      }
    };
    const cached = state.exifCache.get(photoId);
    if (cached) {
      applyPhoto(cached);
      return;
    }
    call('get_photo_exif', photoId).then((res) => {
      if (!res || !res.success || !res.photo) return;
      applyPhoto(res.photo);
    }).catch(console.warn);
  }

  function lightboxLocalUrl(photo, cachedPhoto) {
    return (photo && photo.lightbox_url) || (cachedPhoto && cachedPhoto.lightbox_url) || '';
  }

  function lightboxSourceUrl(photo, cachedPhoto) {
    return lightboxLocalUrl(photo, cachedPhoto)
      || (photo && photo.original_url)
      || (cachedPhoto && cachedPhoto.original_url)
      || '';
  }

  function mergeLightboxCachePhoto(photoId, nextPhoto) {
    const current = state.photoCache.get(photoId) || {};
    const merged = Object.assign({}, current, nextPhoto || {});
    state.photoCache.set(photoId, merged);
    if (state.lightbox.photo && Number(state.lightbox.photo.id || 0) === photoId) {
      state.lightbox.photo = Object.assign({}, state.lightbox.photo, merged);
      updateLightboxInfo(state.lightbox.photo);
    }
    state.compare.panes.forEach((pane, index) => {
      if (comparePhotoId(pane.photo) === photoId) {
        mergeComparePanePhoto(index, merged);
      }
    });
    const card = els.gallery.querySelector('[data-photo-id="' + photoId + '"]');
    if (card) updatePhotoCardMeta(card, merged, true);
    return merged;
  }

  function warmLightboxCache(photo) {
    const photoId = comparePhotoId(photo);
    if (!photoId) return;
    const cachedPhoto = state.photoCache.get(photoId) || photo;
    if (!cachedPhoto || !cachedPhoto.previewable || cachedPhoto.lightbox_url) return;
    if (state.lightboxCachePending.has(photoId)) return;
    state.lightboxCachePending.add(photoId);
    call('get_photo_lightbox_preview', photoId).then((res) => {
      if (!res || !res.success || !res.photo || !res.photo.lightbox_url) {
        console.warn('[PicScanner] 灯箱本地缓存生成失败', {
          photoId,
          filename: cachedPhoto.filename || '',
          path: cachedPhoto.path || '',
          response: res,
        });
        return;
      }
      mergeLightboxCachePhoto(photoId, res.photo);
    }).catch((err) => {
      console.warn('[PicScanner] 灯箱本地缓存生成异常', {
        photoId,
        filename: cachedPhoto.filename || '',
        path: cachedPhoto.path || '',
        error: err,
      });
    }).finally(() => {
      state.lightboxCachePending.delete(photoId);
    });
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
      temperature: normalizeQuickEditTemperature(raw.temperature),
      tint: clamp(Number(raw.tint || 0), -100, 100),
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
    const x = baseRect.x + extraRect.x * baseRect.w / 100;
    const y = baseRect.y + extraRect.y * baseRect.h / 100;
    const w = baseRect.w * extraRect.w / 100;
    const h = baseRect.h * extraRect.h / 100;
    return {
      cropLeft: x,
      cropTop: y,
      cropRight: 100 - x - w,
      cropBottom: 100 - y - h,
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
        temperature: combineQuickEditTemperature(cleanBase.temperature, cleanExtra.temperature),
        tint: cleanBase.tint + cleanExtra.tint,
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
      x: Number(state.quickEdit.committedPanX || 0) + Number(state.quickEdit.panX || 0),
      y: Number(state.quickEdit.committedPanY || 0) + Number(state.quickEdit.panY || 0),
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
    ) return (number > 0 ? '+' : '') + Math.round(number) + '%';
    if (key === 'sharpening' || key === 'grain') return Math.round(number) + '%';
    if (key === 'temperature') return Math.round(normalizeQuickEditTemperature(number)) + ' K';
    if (key === 'tint') return (number > 0 ? '+' : '') + Math.round(number);
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

  function quickEditActiveLuts() {
    return (state.quickEdit.luts || [])
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
    const packed = quickEditHslToPackedRgb(hsl.h, clamp(hsl.s * factor, 0, 1), hsl.l);
    return packed;
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
    const temperature = quickEditTemperatureStrength(clean.temperature);
    const tint = clean.tint / 100;
    const redGain = 1 + temperature * 0.18 + Math.max(0, tint) * 0.08;
    const greenGain = 1 - Math.abs(temperature) * 0.035 - tint * 0.16;
    const blueGain = 1 - temperature * 0.18 + Math.max(0, tint) * 0.08;
    const curveNeutral = isQuickEditCurveNeutral(clean);
    const hslAdjustments = quickEditActiveHslAdjustments(clean);
    const hslActive = hslAdjustments.length > 0;
    const useSaturationMatrix = Math.abs(globalSaturation - 1) > 0.0001;
    const useContrast = !!contrast;
    const useWhiteBlackLevels = !!(whites || blacks);
    const useDehaze = !!dehaze;
    const useToneControls = !!(highlights || shadows);
    const useVibrance = !!vibrance;
    const curveMap = curveNeutral ? null : quickEditCurveMap(clean);
    const activeLuts = quickEditActiveLuts();
    if (
      !hslActive
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
        const lutColor = quickEditBlendLutColor(r, g, b, activeLuts);
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
      const mixed = hslActive ? quickEditApplyHslMixer(vibrantR, vibrantG, vibrantB, hslAdjustments) : vibrant;
      const mixedR = mixed & 255;
      const mixedG = (mixed >> 8) & 255;
      const mixedB = (mixed >> 16) & 255;
      const lutColor = quickEditBlendLutColor(mixedR, mixedG, mixedB, activeLuts);
      const lutR = lutColor & 255;
      const lutG = (lutColor >> 8) & 255;
      const lutB = (lutColor >> 16) & 255;
      pixels[i] = curveMap ? curveMap[lutR] : lutR;
      pixels[i + 1] = curveMap ? curveMap[lutG] : lutG;
      pixels[i + 2] = curveMap ? curveMap[lutB] : lutB;
    }
    applyQuickEditDetailEffects(pixels, width, height, clean);
  }

  function quickEditSourceUrl(photo, cachedPhoto) {
    return lightboxSourceUrl(photo, cachedPhoto);
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
    const basis = lightboxImageBasis(state.quickEdit.photo, rawWidth, rawHeight);
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
    if (!quickEditUsesPhotoImageBasis() || !orientationSwapsSize(state.quickEdit.photo && state.quickEdit.photo.orientation)) {
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
    const scale = Math.min(1, maxWidth / rawWidth, maxHeight / rawHeight);
    return {
      width: Math.max(1, rawWidth * scale),
      height: Math.max(1, rawHeight * scale),
    };
  }

  function setQuickEditImageDisplayBasis(img, width, height) {
    if (!img) return;
    const w = Number(width || 0);
    const h = Number(height || 0);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 1 || h <= 1) {
      img.style.removeProperty('width');
      img.style.removeProperty('height');
      img.style.removeProperty('aspect-ratio');
      return;
    }
    const fit = quickEditDisplayFitSize(w, h);
    img.style.width = fit.width.toFixed(2) + 'px';
    img.style.height = fit.height.toFixed(2) + 'px';
    img.style.aspectRatio = Math.round(w) + ' / ' + Math.round(h);
  }

  function refreshQuickEditImageDisplayBasis() {
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    if (!img || !imageHasSource(img)) return;
    const basis = quickEditImageBasis(img.naturalWidth || img.width, img.naturalHeight || img.height);
    setQuickEditImageDisplayBasis(img, basis.width, basis.height);
    refreshQuickEditPanController();
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
      if (!opts.preserveDisplayBasis) setQuickEditImageDisplayBasis(img, 0, 0);
      if (!deferDisplay) img.src = state.quickEdit.sourceSrc;
    }
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

  function setQuickEditRawPreviewLoading(loading) {
    state.quickEdit.rawPreviewLoading = !!loading;
    setQuickEditLoading(loading);
    if (state.quickEdit.photo) renderQuickEditMeta(state.quickEdit.photo, loading ? 'raw-developing' : 'ready');
  }

  function scheduleQuickEditRawDevelopPreview(options) {
    if (!state.quickEdit.open || !quickEditIsRawPhoto()) return;
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
    const clean = quickEditPixelParamsForCurrentSource(params);
    const signature = {
      contrast: clean.contrast,
      highlights: clean.highlights,
      shadows: clean.shadows,
      whites: clean.whites,
      blacks: clean.blacks,
      dehaze: clean.dehaze,
      vibrance: clean.vibrance,
      clarity: clean.clarity,
      sharpening: clean.sharpening,
      grain: clean.grain,
      temperature: clean.temperature,
      tint: clean.tint,
      luts: quickEditEnabledLuts().map((lut) => ({
        id: quickEditLutKey(lut),
        strength: quickEditNormalizeLutStrength(lut.strength, lut),
      })),
    };
    QUICK_EDIT_HSL_COLORS.forEach((color) => {
      signature['hsl_' + color.key + '_hue'] = clean['hsl_' + color.key + '_hue'];
      signature['hsl_' + color.key + '_saturation'] = clean['hsl_' + color.key + '_saturation'];
      signature['hsl_' + color.key + '_luminance'] = clean['hsl_' + color.key + '_luminance'];
    });
    return JSON.stringify(signature);
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
      || clean.temperature !== QUICK_EDIT_TEMPERATURE_NEUTRAL_K
      || clean.tint
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
      refresh: '<svg ' + attrs + '><path d="M20 11a8 8 0 0 0-14.5-4.7L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.7L20 16"/><path d="M20 20v-4h-4"/></svg>',
      plus: '<svg ' + attrs + '><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
      library: '<svg ' + attrs + '><path d="M4 19.5V5a2 2 0 0 1 2-2h11"/><path d="M8 7h12v14H8z"/><path d="M12 11h4"/></svg>',
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

  function quickEditWorkerParams(params, options) {
    const opts = options || {};
    const clean = opts.prepared ? normalizeQuickEditParams(params) : quickEditPixelParamsForCurrentSource(params);
    const luts = quickEditEnabledLuts()
      .filter((lut) => lut && lut.data && lut.size && Number(lut.strength || 0) > 0)
      .map((lut) => ({
        size: Number(lut.size || 0),
        strength: quickEditNormalizeLutStrength(lut.strength, lut),
        domainMin: Array.isArray(lut.domainMin) ? lut.domainMin.slice(0, 3) : [0, 0, 0],
        domainMax: Array.isArray(lut.domainMax) ? lut.domainMax.slice(0, 3) : [1, 1, 1],
        data: lut.data,
      }));
    return Object.assign({}, clean, { luts });
  }

  function quickEditPreviewWorkerUrl() {
    const source = String(window.PicScannerQuickEditWorkerSource || '');
    if (source) {
      if (!quickEditPreviewWorkerObjectUrl) {
        quickEditPreviewWorkerObjectUrl = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
      }
      return quickEditPreviewWorkerObjectUrl;
    }
    return new URL('assets/quick_edit_worker.js?v=' + encodeURIComponent(APP_BUILD), window.location.href).href;
  }

  function cancelQuickEditPreviewWorker() {
    if (!quickEditPreviewWorker) return;
    quickEditPreviewWorker.terminate();
    quickEditPreviewWorker = null;
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
    if (quickEditPreviewWorker) return quickEditPreviewWorker;
    quickEditPreviewWorker = new Worker(quickEditPreviewWorkerUrl());
    quickEditPreviewWorker.onmessage = onQuickEditPreviewWorkerMessage;
    quickEditPreviewWorker.onerror = (err) => {
      console.warn('[PicScanner] 快速调整异步渲染 Worker 异常', {
        url: quickEditPreviewWorkerUrl(),
        error: err,
      });
      showToast('快速调整异步渲染启动失败，详情见控制台', 'error');
      clearQuickEditPendingPreviewRender();
      setQuickEditPreviewRendering(false);
      cancelQuickEditPreviewWorker();
    };
    return quickEditPreviewWorker;
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
    setQuickEditPreviewRendering(false);
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
    const scheduledOriginal = !flushedQueuedRender
      && !messageKey.includes('|original|')
      && scheduleQuickEditOriginalPreviewRender(renderSignature, originalTargetMaxSide);
    if (scheduledOriginal && messageKey.includes('|interactive|')) {
      clearTimeout(state.quickEdit.previewSettleTimer);
      state.quickEdit.previewSettleTimer = null;
    }
    setQuickEditImageDisplayBasis(
      img,
      message.displayWidth || message.sourceWidth,
      message.displayHeight || message.sourceHeight,
    );
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
      const decodeMs = quickEditPerfNow() - decodeStart;
      quickEditPerfLog('worker:post', {
        key: job.key,
        token: job.token,
        maxSide: job.maxSide,
        decodeMs: Number(decodeMs.toFixed(2)),
        source: (source.naturalWidth || source.width) + 'x' + (source.naturalHeight || source.height),
      });
      const message = {
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
        bitmap,
      };
      try {
        worker.postMessage(message, [bitmap]);
      } catch (err) {
        if (bitmap && typeof bitmap.close === 'function') bitmap.close();
        throw err;
      }
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

  function quickEditRenderSignature(sourceSrc, pixelSignature) {
    return String(sourceSrc || '') + '|' + String(pixelSignature || '');
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
    const sourceMaxSide = Math.max(1, Number(message && message.sourceWidth || 1), Number(message && message.sourceHeight || 1));
    const displayMaxSide = Math.max(
      1,
      Number(message && (message.displayWidth || message.sourceWidth) || 1),
      Number(message && (message.displayHeight || message.sourceHeight) || 1),
    );
    return Math.min(sourceMaxSide, displayMaxSide);
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
    const params = quickEditAdvancedPixelParams(quickEditEffectiveParams());
    const signature = quickEditPixelSignature(params);
    const renderSignature = quickEditRenderSignature(sourceSrc, signature);
    state.quickEdit.previewRenderRequestSignature = renderSignature;
    if (isQuickEditAdvancedPixelNeutral(params)) {
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
    if (quickEditPanController) {
      quickEditPanController.refresh();
      return quickEditPanController;
    }
    quickEditPanController = requirePicModification().createQuickEditPanController({
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
        return !!(img && imageHasSource(img));
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
    return quickEditPanController;
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

  function quickEditRawDevelopParams(params) {
    const clean = normalizeQuickEditParams(params || quickEditEffectiveParams());
    const mod = quickEditRawModule();
    if (mod && typeof mod.normalizeParams === 'function') return mod.normalizeParams(clean);
    return {
      exposure: clamp(Number(clean.exposure || 0), QUICK_EDIT_EXPOSURE_MIN_EV, QUICK_EDIT_EXPOSURE_MAX_EV),
      temperature: normalizeQuickEditTemperature(clean.temperature),
      tint: clamp(Number(clean.tint || 0), -100, 100),
      rawHighlightRecovery: clamp(Number(clean.rawHighlightRecovery || 0), 0, 100),
      rawNoiseReduction: clamp(Number(clean.rawNoiseReduction || 0), 0, 100),
      curvePoints: quickEditCurvePoints(clean),
    };
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
      && imageHasSource(img)
      && Number(img.offsetWidth || 0) > 1
      && Number(img.offsetHeight || 0) > 1
    ) {
      const frame = quickEditBakeFrame(stage, img);
      if (frame && frame.w > 1 && frame.h > 1) {
        const basis = quickEditImageBasis(img.naturalWidth || img.width, img.naturalHeight || img.height);
        const sourceScale = Math.max(
          Number(basis.width || img.naturalWidth || img.width || 1) / Math.max(1, Number(img.offsetWidth || 1)),
          Number(basis.height || img.naturalHeight || img.height || 1) / Math.max(1, Number(img.offsetHeight || 1)),
        );
        return quickEditPositiveSaveDimensions(
          Math.round(frame.w * sourceScale),
          Math.round(frame.h * sourceScale),
        );
      }
    }
    const basis = lightboxImageBasis(
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
    return '导出 ' + quickEditSaveOutputDetail(opts.sizeWidth, opts.sizeHeight);
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
      + '[data-quick-edit-save-size-height]',
    ).forEach((control) => {
      if (control.matches && control.matches('[data-quick-edit-save-format]')) {
        control.disabled = saving || !quickEditSaveSupportsFormat(control.dataset.quickEditSaveFormat || '');
      } else if (control.matches && control.matches('[data-quick-edit-save-quality], [data-quick-edit-save-quality-preset]')) {
        control.disabled = saving || tiff16;
      } else if (control.matches && control.matches('[data-quick-edit-save-size-preset], [data-quick-edit-save-size-width], [data-quick-edit-save-size-height]')) {
        control.disabled = saving || tiff16;
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
      '<b aria-hidden="true">⌄</b>',
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
    state.quickEdit.saveOptions = quickEditSaveOptions(Object.assign({}, memory, current, {
      path: current.path || memory.path || quickEditDefaultSavePath(),
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
    if (!stage || !img || !imageHasSource(img) || !img.naturalWidth || !img.naturalHeight) {
      throw new Error('当前预览图还没有加载完成');
    }

    setQuickEditSaveProgress('加载原图', 6, '正在读取原始图片');
    const sourceImg = await loadQuickEditImage(sourceSrc);
    const frame = quickEditBakeFrame(stage, img);
    if (!frame || frame.w <= 1 || frame.h <= 1) {
      throw new Error('当前取景框尺寸无效');
    }

    const params = options.pixelParams ? normalizeQuickEditParams(options.pixelParams) : quickEditEffectiveParams();
    const pan = quickEditEffectivePan();
    const angleRadians = (params.rotation + params.straighten) * Math.PI / 180;
    const stageRect = stage.getBoundingClientRect();
    const baseWidth = img.offsetWidth;
    const baseHeight = img.offsetHeight;
    const sourceBasis = Number(options.sourceBasisWidth || 0) > 0 && Number(options.sourceBasisHeight || 0) > 0
      ? { width: Number(options.sourceBasisWidth || 0), height: Number(options.sourceBasisHeight || 0) }
      : quickEditImageBasis(sourceImg.naturalWidth || sourceImg.width, sourceImg.naturalHeight || sourceImg.height);
    const sourceScale = Math.max(
      Number(sourceBasis.width || sourceImg.naturalWidth || sourceImg.width || 1) / Math.max(1, baseWidth),
      Number(sourceBasis.height || sourceImg.naturalHeight || sourceImg.height || 1) / Math.max(1, baseHeight),
    );
    const outputScale = quickEditSaveOutputScale(frame, sourceScale, options);
    const outputWidth = Math.max(1, Math.round(frame.w * outputScale));
    const outputHeight = Math.max(1, Math.round(frame.h * outputScale));
    const outputDetail = quickEditSaveOutputDetail(outputWidth, outputHeight);
    const token = Number(state.quickEdit.saveToken || 0);
    const key = token + '|' + format + '|' + outputDetail;
    const isCurrent = () => (
      state.quickEdit.saveSaving
      && token === Number(state.quickEdit.saveToken || 0)
    );

    setQuickEditSaveProgress('解码原图', 12, outputDetail);
    const decodeStart = quickEditPerfNow();
    const bitmap = await createImageBitmap(sourceImg);
    const decodeMs = quickEditPerfNow() - decodeStart;
    if (!isCurrent()) {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      throw new Error('保存任务已失效');
    }

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
          zoom: state.quickEdit.viewZoom,
          angleRadians,
          orientation: options.orientation === undefined
            ? (quickEditUsesPhotoImageBasis() ? String(state.quickEdit.photo && state.quickEdit.photo.orientation || '') : '')
            : String(options.orientation || ''),
          applyOrientation: options.applyOrientation === undefined
            ? quickEditSourceNeedsOrientationTransform(sourceImg, sourceBasis)
            : !!options.applyOrientation,
          perfEnabled: quickEditPerfEnabled(),
          params: quickEditWorkerParams(params, { prepared: !!options.pixelParams }),
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
      pixelParams: quickEditPixelParamsForRawDevelopedSource(quickEditEffectiveParams()),
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

      const rendered = quickEditIsRawPhoto()
        ? await renderQuickEditRawFinalBlobInWorker(options)
        : await renderQuickEditFinalBlobInWorker(options);
      if (!rendered || !rendered.blob) throw new Error('保存渲染没有返回图片数据');
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
    if (quickEditPanController) quickEditPanController.refresh();
  }

  function cancelQuickEditPan() {
    if (quickEditPanController) quickEditPanController.cancel();
  }

  function ensureQuickEditCurvePanel() {
    if (quickEditCurvePanel) return quickEditCurvePanel;
    quickEditCurvePanel = requirePicModification().createCurvePanel({
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
        applyQuickEditPreview({ skipColorRender: true });
        if (quickEditIsRawPhoto()) scheduleQuickEditRawDevelopPreview({ interactive: true });
        else applyQuickEditPreview({ interactive: true });
        scheduleQuickEditHistogramRender(180);
      },
    });
    return quickEditCurvePanel;
  }

  function hideQuickEditCurvePanel() {
    if (quickEditCurvePanel) quickEditCurvePanel.hide();
  }

  function syncQuickEditCurvePanel() {
    if (quickEditCurvePanel) quickEditCurvePanel.sync();
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
    const sections = Object.assign({ tone: false, color: false, detail: false, hsl: false, lut: false }, state.quickEdit.collapsedSections || {});
    state.quickEdit.collapsedSections = sections;
    return sections;
  }

  function normalizeQuickEditCollapsedSections(value) {
    const raw = value && typeof value === 'object' ? value : {};
    return {
      tone: raw.tone === true,
      color: raw.color === true,
      detail: raw.detail === true,
      hsl: raw.hsl === true,
      lut: raw.lut === true,
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
    if (!['tone', 'color', 'detail', 'hsl', 'lut'].includes(key)) return;
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
  }

  function ensureQuickEdit() {
    if (state.quickEdit.el && state.quickEdit.el.isConnected) return state.quickEdit.el;
    const el = document.createElement('section');
    el.className = 'quick-edit-screen hidden';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '快速调整');
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
      '<img class="quick-edit-img" alt="" data-quick-edit-img />',
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
      '</div>',
      '<aside class="quick-edit-side">',
      '<div class="quick-edit-side-head">',
      '<div class="section-title">快速调整</div>',
      '<div class="quick-edit-side-title">临时预览</div>',
      '</div>',
      '<div class="quick-edit-group">',
      '<div class="quick-edit-group-head">',
      '<div class="quick-edit-group-title">直方图</div>',
      '<div class="quick-edit-histogram-tabs" role="tablist" aria-label="直方图模式">',
      '<button class="quick-edit-histogram-tab active" type="button" data-quick-edit-histogram-mode="white" aria-pressed="true">W</button>',
      '<div class="quick-edit-histogram-rgb-wrap">',
      '<button class="quick-edit-histogram-tab" type="button" data-quick-edit-histogram-mode="rgb" aria-pressed="false"><span data-quick-edit-rgb-label>RGB</span></button>',
      '<button class="quick-edit-histogram-menu-trigger" type="button" data-quick-edit-rgb-menu-trigger title="选择 RGB 通道" aria-label="选择 RGB 通道">⌄</button>',
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
      '<div class="quick-edit-group quick-edit-collapsible" data-quick-edit-section="hsl">',
      '<button class="quick-edit-section-toggle" type="button" data-quick-edit-section-toggle="hsl" aria-expanded="true">',
      '<span><b>HSL 混合器</b><em data-quick-edit-hsl-active>红色</em></span>',
      '<i aria-hidden="true">' + quickEditIconSvg('chevron') + '</i>',
      '</button>',
      '<div class="quick-edit-section-body" data-quick-edit-section-body="hsl">',
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
      '</aside>',
      '</div>',
      '</section>',
    ].join('');
    document.body.appendChild(el);
    state.quickEdit.el = el;

    el.querySelector('[data-quick-edit-close]').addEventListener('click', () => closeQuickEdit());
    const stage = el.querySelector('[data-quick-edit-stage]');
    if (stage) {
      stage.addEventListener('wheel', onQuickEditWheel, { passive: false });
      ensureQuickEditPanController(stage);
    }
    const previewImg = el.querySelector('[data-quick-edit-img]');
    if (previewImg) {
      previewImg.addEventListener('load', () => requestAnimationFrame(() => {
        const source = state.quickEdit.sourceImage || previewImg;
        const basis = quickEditImageBasis(
          source.naturalWidth || source.width,
          source.naturalHeight || source.height,
        );
        setQuickEditImageDisplayBasis(
          previewImg,
          basis.width,
          basis.height,
        );
        ensureQuickEditCenteredCropFrame(false);
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
      state.quickEdit.committedPanX = 0;
      state.quickEdit.committedPanY = 0;
      state.quickEdit.panX = 0;
      state.quickEdit.panY = 0;
      state.quickEdit.cropFrame = null;
      state.quickEdit.activeTools = { crop: false, rotate: false };
      state.quickEdit.histogramMode = 'white';
      state.quickEdit.histogramMenuOpen = false;
      state.quickEdit.histogramData = null;
      state.quickEdit.hslColor = 'red';
      state.quickEdit.lut = null;
      state.quickEdit.luts = [];
      state.quickEdit.lutDraft = null;
      state.quickEdit.lutDrafts = [];
      state.quickEdit.lutDraftLoadingId = '';
      state.quickEdit.history = [];
      state.quickEdit.viewZoom = 1;
      resetQuickEditRawPreviewState();
      invalidateQuickEditRenderedPreview({ clearTimers: true });
      syncQuickEditControls();
      applyQuickEditPreview();
      if (quickEditIsRawPhoto()) scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
      scheduleQuickEditHistogramRender(0);
      scheduleQuickEditCropShade();
    });
    el.querySelector('[data-quick-edit-reset-current]').addEventListener('click', () => {
      resetQuickEditCurrentChanges();
    });
    el.querySelector('[data-quick-edit-save-current]').addEventListener('click', () => {
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
        syncQuickEditControls();
      });
    });
    const lutOpen = el.querySelector('[data-quick-edit-lut-open]');
    const lutActiveList = el.querySelector('[data-quick-edit-lut-active-list]');
    const lutFileInput = el.querySelector('[data-quick-edit-lut-file]');
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
      input.addEventListener('input', () => {
        const key = String(input.dataset.quickEditRange || '');
        if (!key) return;
        const next = normalizeQuickEditParams(state.quickEdit.params);
        next[key] = Number(input.value || 0);
        state.quickEdit.params = normalizeQuickEditParams(next);
        const rawDevelop = quickEditIsRawPhoto() && quickEditIsRawDevelopParamKey(key);
        const cssOnly = !rawDevelop && (key === 'exposure' || key === 'saturation');
        if (!cssOnly || rawDevelop) invalidateQuickEditRenderedPreview({ clearTimers: true });
        syncQuickEditControls();
        if (rawDevelop) {
          applyQuickEditPreview({ skipColorRender: true });
          scheduleQuickEditRawDevelopPreview({ interactive: true });
        } else {
          applyQuickEditPreview(cssOnly ? { skipColorRender: true } : { interactive: true });
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
        if (quickEditIsRawPhoto()) {
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
        if (quickEditIsRawPhoto()) {
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
      clearQuickEditCropShade();
    }
    if (!tools.rotate) {
      state.quickEdit.rotationDrag = null;
    }
    syncQuickEditControls();
    applyQuickEditPreview({ skipColorRender: true });
    if (tool === 'crop' && nextActive) {
      requestAnimationFrame(() => ensureQuickEditCenteredCropFrame(false));
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
    syncQuickEditControls();
    applyQuickEditPreview();
    if (quickEditIsRawPhoto()) scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
    if (isQuickEditCropToolActive()) {
      state.quickEdit.cropFrame = null;
      requestAnimationFrame(() => ensureQuickEditCenteredCropFrame(true));
    }
    scheduleQuickEditCropShade();
    showToast('已重置本轮调整');
  }

  function resetQuickEditPreviewAdjustments(options) {
    const opts = options || {};
    cancelQuickEditPan();
    state.quickEdit.params = quickEditDefaultParams();
    state.quickEdit.committedParams = null;
    state.quickEdit.committedPanX = 0;
    state.quickEdit.committedPanY = 0;
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

  function quickEditBakeFrame(stage, img) {
    const stageRect = stage.getBoundingClientRect();
    if (isQuickEditCropToolActive()) {
      const frame = quickEditCropFrameRect();
      if (frame) return frame;
    }
    const imgRect = img.getBoundingClientRect();
    return {
      x: imgRect.left - stageRect.left,
      y: imgRect.top - stageRect.top,
      w: imgRect.width,
      h: imgRect.height,
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
    const sourceSrc = String(saveOptions.sourceSrc || state.quickEdit.sourceSrc || (img && imageHasSource(img) ? img.src : ''));
    if (saveOptions.fullResolution && !sourceSrc) {
      throw new Error('当前图片缺少原图路径，无法保存原图质量版本');
    }
    if (!stage || !img || !sourceSrc || !imageHasSource(img) || !img.naturalWidth || !img.naturalHeight) {
      throw new Error('当前预览图还没有加载完成');
    }
    const sourceImg = await loadQuickEditImage(sourceSrc);
    const frame = quickEditBakeFrame(stage, img);
    if (!frame || frame.w <= 1 || frame.h <= 1) {
      throw new Error('当前取景框尺寸无效');
    }
    const params = quickEditEffectiveParams();
    const pan = quickEditEffectivePan();
    const angle = (params.rotation + params.straighten) * Math.PI / 180;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    const stageRect = stage.getBoundingClientRect();
    const baseWidth = img.offsetWidth;
    const baseHeight = img.offsetHeight;
    const sourceBasis = quickEditImageBasis(sourceImg.naturalWidth || sourceImg.width, sourceImg.naturalHeight || sourceImg.height);
    const sourceScale = Math.max(
      Number(sourceBasis.width || sourceImg.naturalWidth || sourceImg.width || 1) / Math.max(1, baseWidth),
      Number(sourceBasis.height || sourceImg.naturalHeight || sourceImg.height || 1) / Math.max(1, baseHeight),
    );
    const maxSide = 2400;
    const outputScale = saveOptions.fullResolution
      ? sourceScale
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
    imageCtx.scale(state.quickEdit.viewZoom, state.quickEdit.viewZoom);
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
      src: img && imageHasSource(img) ? img.src : '',
      sourceSrc: state.quickEdit.sourceSrc || (img && imageHasSource(img) ? img.src : ''),
      params: normalizeQuickEditParams(state.quickEdit.params),
      committedParams: normalizeQuickEditParams(state.quickEdit.committedParams || quickEditDefaultParams()),
      committedPanX: Number(state.quickEdit.committedPanX || 0),
      committedPanY: Number(state.quickEdit.committedPanY || 0),
      panX: Number(state.quickEdit.panX || 0),
      panY: Number(state.quickEdit.panY || 0),
      cropFrame: state.quickEdit.cropFrame ? Object.assign({}, state.quickEdit.cropFrame) : null,
      activeTools: Object.assign({ crop: false, rotate: false }, state.quickEdit.activeTools || {}),
      viewZoom: Number(state.quickEdit.viewZoom || 1),
      histogramMode: state.quickEdit.histogramMode || 'white',
      luts: quickEditEnabledLuts().map((lut) => Object.assign({}, lut)),
    };
  }

  function restoreQuickEditState(snapshot) {
    if (!snapshot) return false;
    const el = ensureQuickEdit();
    const img = el.querySelector('[data-quick-edit-img]');
    state.quickEdit.params = normalizeQuickEditParams(snapshot.params);
    state.quickEdit.committedParams = normalizeQuickEditParams(snapshot.committedParams);
    state.quickEdit.committedPanX = Number(snapshot.committedPanX || 0);
    state.quickEdit.committedPanY = Number(snapshot.committedPanY || 0);
    state.quickEdit.panX = Number(snapshot.panX || 0);
    state.quickEdit.panY = Number(snapshot.panY || 0);
    state.quickEdit.cropFrame = snapshot.cropFrame ? Object.assign({}, snapshot.cropFrame) : null;
    state.quickEdit.activeTools = Object.assign({ crop: false, rotate: false }, snapshot.activeTools || {});
    state.quickEdit.viewZoom = Number(snapshot.viewZoom || 1);
    state.quickEdit.histogramMode = snapshot.histogramMode || 'white';
    quickEditSetLuts(snapshot.luts || (snapshot.lut ? [snapshot.lut] : []));
    state.quickEdit.cropDrag = null;
    state.quickEdit.rotationDrag = null;
    invalidateQuickEditRenderedPreview({ clearTimers: true });
    clearQuickEditCropShade();
    if (img && (snapshot.sourceSrc || snapshot.src)) setQuickEditImageSource(img, snapshot.sourceSrc || snapshot.src);
    syncQuickEditControls();
    applyQuickEditPreview();
    if (quickEditIsRawPhoto()) scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
    updateQuickEditCropOverlay();
    scheduleQuickEditHistogramRender(0);
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

  function quickEditGeometryChanged() {
    return Math.abs(Number(state.quickEdit.committedPanX || 0)) > 0.01
      || Math.abs(Number(state.quickEdit.committedPanY || 0)) > 0.01
      || Math.abs(Number(state.quickEdit.panX || 0)) > 0.01
      || Math.abs(Number(state.quickEdit.panY || 0)) > 0.01
      || Math.abs(Number(state.quickEdit.viewZoom || 1) - 1) > 0.0001;
  }

  function hasQuickEditUnsavedChanges() {
    return quickEditParamsChanged()
      || quickEditCommittedParamsChanged()
      || quickEditGeometryChanged()
      || quickEditEnabledLuts().length > 0
      || !!state.quickEdit.cropFrame
      || (Array.isArray(state.quickEdit.history) && state.quickEdit.history.length > 0);
  }

  async function saveQuickEditCurrentChanges() {
    let bakedUrl = '';
    let before = null;
    try {
      before = snapshotQuickEditState();
      bakedUrl = await bakeQuickEditPreviewToImage({ format: 'jpg', quality: 95 });
    } catch (err) {
      console.warn('[PicScanner] 快速调整应用失败', err);
      showToast('无法应用当前调整，详情见控制台', 'error');
      return;
    }
    if (before && before.src) {
      state.quickEdit.history.push(before);
      if (state.quickEdit.history.length > 24) state.quickEdit.history.shift();
    }
    const el = ensureQuickEdit();
    const img = el.querySelector('[data-quick-edit-img]');
    resetQuickEditPreviewAdjustments({ keepHistogramMode: true });
    syncQuickEditControls();
    if (img) setQuickEditImageSource(img, bakedUrl);
    applyQuickEditPreview();
    updateQuickEditCropOverlay();
    scheduleQuickEditHistogramRender(0);
    showToast('已应用到临时预览');
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
    if (!isQuickEditCropToolActive()) return QUICK_EDIT_MIN_ZOOM;
    const el = state.quickEdit.el;
    const img = el ? el.querySelector('[data-quick-edit-img]') : null;
    const frame = quickEditCropFrameRect();
    if (!img || !frame || img.offsetWidth <= 1 || img.offsetHeight <= 1) return QUICK_EDIT_MIN_ZOOM;
    return Math.max(
      QUICK_EDIT_MIN_ZOOM,
      frame.w / Math.max(1, img.offsetWidth),
      frame.h / Math.max(1, img.offsetHeight),
    );
  }

  function setQuickEditZoom(nextZoom, anchorEvent) {
    if (!state.quickEdit.open) return;
    const oldZoom = Number(state.quickEdit.viewZoom || 1);
    const zoom = clamp(Number(nextZoom || 1), quickEditMinimumZoomForCropFrame(), QUICK_EDIT_MAX_ZOOM);
    if (Math.abs(zoom - oldZoom) < 0.0001) return;
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    if (anchorEvent && stage) {
      const rect = stage.getBoundingClientRect();
      const localX = anchorEvent.clientX - rect.left - rect.width / 2;
      const localY = anchorEvent.clientY - rect.top - rect.height / 2;
      const ratio = zoom / Math.max(0.0001, oldZoom);
      state.quickEdit.panX = localX - (localX - Number(state.quickEdit.panX || 0)) * ratio;
      state.quickEdit.panY = localY - (localY - Number(state.quickEdit.panY || 0)) * ratio;
    } else if (zoom <= 1 && !isQuickEditCropToolActive()) {
      state.quickEdit.panX = 0;
      state.quickEdit.panY = 0;
    }
    state.quickEdit.viewZoom = zoom;
    if (state.quickEdit.viewZoom <= 1 && !isQuickEditCropToolActive()) {
      state.quickEdit.panX = 0;
      state.quickEdit.panY = 0;
    }
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
    const factor = ev.deltaY < 0 ? QUICK_EDIT_ZOOM_STEP : 1 / QUICK_EDIT_ZOOM_STEP;
    setQuickEditZoom(state.quickEdit.viewZoom * factor, ev);
  }

  function setQuickEditRotation(value) {
    const next = normalizeQuickEditParams(state.quickEdit.params);
    next.rotation = normalizeQuickEditRotation(value);
    next.straighten = 0;
    state.quickEdit.params = normalizeQuickEditParams(next);
    syncQuickEditControls();
    applyQuickEditPreview({ skipColorRender: true });
    requestAnimationFrame(() => {
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
      startRotation: normalizeQuickEditParams(state.quickEdit.params).rotation,
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
    scheduleQuickEditCropShade();
    ev.stopPropagation();
  }

  function onQuickEditRotationWheel(ev) {
    if (!state.quickEdit.open) return;
    ev.preventDefault();
    ev.stopPropagation();
    const current = normalizeQuickEditParams(state.quickEdit.params).rotation;
    setQuickEditRotation(current + (ev.deltaY < 0 ? 1 : -1));
  }

  function onQuickEditRotationKeydown(ev) {
    if (!state.quickEdit.open) return;
    const current = normalizeQuickEditParams(state.quickEdit.params).rotation;
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
      saveCurrent.disabled = rawActive;
      saveCurrent.classList.toggle('disabled', rawActive);
      saveCurrent.title = rawActive ? 'RAW 显影请直接导出保存' : '保存更改';
      saveCurrent.setAttribute('aria-disabled', rawActive ? 'true' : 'false');
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

  function quickEditStageRect() {
    const el = state.quickEdit.el;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return null;
    return rect;
  }

  function quickEditCropFrameRect() {
    const stageRect = quickEditStageRect();
    if (!stageRect) return null;
    const frame = state.quickEdit.cropFrame || {};
    const maxW = Math.max(120, stageRect.width - 48);
    const maxH = Math.max(120, stageRect.height - 48);
    const width = clamp(Number(frame.width || stageRect.width * 0.72), QUICK_EDIT_CROP_MIN_SIZE * 8, maxW);
    const height = clamp(Number(frame.height || stageRect.height * 0.62), QUICK_EDIT_CROP_MIN_SIZE * 8, maxH);
    const offsetX = clamp(Number(frame.offsetX || 0), -(stageRect.width - width) / 2, (stageRect.width - width) / 2);
    const offsetY = clamp(Number(frame.offsetY || 0), -(stageRect.height - height) / 2, (stageRect.height - height) / 2);
    return {
      x: (stageRect.width - width) / 2 + offsetX,
      y: (stageRect.height - height) / 2 + offsetY,
      w: width,
      h: height,
      offsetX,
      offsetY,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
    };
  }

  function ensureQuickEditCenteredCropFrame(force) {
    if (!state.quickEdit.open || !isQuickEditCropToolActive()) return;
    if (!force && state.quickEdit.cropFrame) return;
    const stageRect = quickEditStageRect();
    if (!stageRect) return;
    state.quickEdit.cropFrame = {
      width: Math.max(120, stageRect.width * 0.72),
      height: Math.max(120, stageRect.height * 0.62),
      offsetX: 0,
      offsetY: 0,
    };
    state.quickEdit.viewZoom = Math.max(state.quickEdit.viewZoom, quickEditMinimumZoomForCropFrame());
    const pan = clampQuickEditPan(state.quickEdit.panX, state.quickEdit.panY);
    state.quickEdit.panX = pan.x;
    state.quickEdit.panY = pan.y;
    updateQuickEditCropOverlay();
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
    if (!stage || !img || !overlay || !box || !imageHasSource(img)) {
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
    applyQuickEditPixelAdjustments(data, quickEditWorkerParams(params), sampleWidth, sampleHeight);
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
    return String(sourceSrc || '') + '|'
      + quickEditPixelSignature(params) + '|'
      + JSON.stringify({
        exposure: clean.exposure,
        saturation: clean.saturation,
        curvePoints: clean.curvePoints,
      });
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
    const sourceSrc = state.quickEdit.sourceSrc || (img && imageHasSource(img) ? img.src : '');
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
      const source = await loadQuickEditSourceImage(sourceSrc);
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
    const raw = rect || {};
    const maxW = Math.max(120, stageRect.width - 48);
    const maxH = Math.max(120, stageRect.height - 48);
    const width = clamp(Number(raw.w || raw.width || 0), QUICK_EDIT_CROP_MIN_SIZE * 8, maxW);
    const height = clamp(Number(raw.h || raw.height || 0), QUICK_EDIT_CROP_MIN_SIZE * 8, maxH);
    const x = clamp(Number(raw.x || 0), 24, stageRect.width - 24 - width);
    const y = clamp(Number(raw.y || 0), 24, stageRect.height - 24 - height);
    const next = {
      width,
      height,
      offsetX: x - (stageRect.width - width) / 2,
      offsetY: y - (stageRect.height - height) / 2,
    };
    state.quickEdit.cropFrame = next;
    state.quickEdit.viewZoom = Math.max(state.quickEdit.viewZoom, quickEditMinimumZoomForCropFrame());
    const pan = clampQuickEditPan(state.quickEdit.panX, state.quickEdit.panY);
    state.quickEdit.panX = pan.x;
    state.quickEdit.panY = pan.y;
    applyQuickEditPreview({ skipColorRender: true });
    updateQuickEditCropOverlay();
    scheduleQuickEditCropShade();
  }

  function centerQuickEditCropFrameWithAnimation() {
    const frame = quickEditCropFrameRect();
    const stageRect = quickEditStageRect();
    if (!frame || !stageRect) return;
    const currentCenterX = frame.x + frame.w / 2;
    const currentCenterY = frame.y + frame.h / 2;
    const targetX = clamp(stageRect.width / 2, frame.w / 2 + 24, stageRect.width - frame.w / 2 - 24);
    const targetY = clamp(stageRect.height / 2, frame.h / 2 + 24, stageRect.height - frame.h / 2 - 24);
    const dx = targetX - currentCenterX;
    const dy = targetY - currentCenterY;
    const el = state.quickEdit.el;
    const overlay = el ? el.querySelector('[data-quick-edit-crop-overlay]') : null;
    const stage = el ? el.querySelector('[data-quick-edit-stage]') : null;
    if (overlay) overlay.classList.add('centering');
    if (stage) stage.classList.add('settling');
    state.quickEdit.cropFrame = {
      width: frame.w,
      height: frame.h,
      offsetX: 0,
      offsetY: 0,
    };
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
    const stageRect = stage ? stage.getBoundingClientRect() : null;
    const imgRect = img ? img.getBoundingClientRect() : null;
    const frame = quickEditCropFrameRect();
    if (!stageRect || !imgRect || !frame) return raw;
    const committedX = Number(state.quickEdit.committedPanX || 0);
    const committedY = Number(state.quickEdit.committedPanY || 0);
    const currentPan = quickEditEffectivePan();
    const effectiveX = committedX + Number(x || 0);
    const effectiveY = committedY + Number(y || 0);
    const baseLeft = imgRect.left - stageRect.left - currentPan.x;
    const baseTop = imgRect.top - stageRect.top - currentPan.y;
    const imageWidth = Math.max(1, imgRect.width);
    const imageHeight = Math.max(1, imgRect.height);
    const minX = frame.x + frame.w - baseLeft - imageWidth;
    const maxX = frame.x - baseLeft;
    const minY = frame.y + frame.h - baseTop - imageHeight;
    const maxY = frame.y - baseTop;
    return {
      x: clamp(effectiveX, Math.min(minX, maxX), Math.max(minX, maxX)) - committedX,
      y: clamp(effectiveY, Math.min(minY, maxY), Math.max(minY, maxY)) - committedY,
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
    state.quickEdit.cropDrag = {
      mode,
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      overlayWidth: overlayRect.width,
      overlayHeight: overlayRect.height,
      startRect: quickEditCropFrameRect(),
      startPanX: state.quickEdit.panX,
      startPanY: state.quickEdit.panY,
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

  function resizedQuickEditCropFrame(startRect, mode, dx, dy) {
    const margin = 24;
    const min = QUICK_EDIT_CROP_MIN_SIZE * 8;
    let left = startRect.x;
    let top = startRect.y;
    let right = startRect.x + startRect.w;
    let bottom = startRect.y + startRect.h;

    if (mode === 'image') {
      return { x: left, y: top, w: startRect.w, h: startRect.h };
    }

    if (mode.includes('w')) left = clamp(left + dx, margin, right - min);
    if (mode.includes('e')) right = clamp(right + dx, left + min, startRect.stageWidth - margin);
    if (mode.includes('n')) top = clamp(top + dy, margin, bottom - min);
    if (mode.includes('s')) bottom = clamp(bottom + dy, top + min, startRect.stageHeight - margin);
    return {
      x: left,
      y: top,
      w: right - left,
      h: bottom - top,
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
    const nextFrame = resizedQuickEditCropFrame(
      drag.startRect,
      drag.mode,
      ev.clientX - drag.startX,
      ev.clientY - drag.startY,
    );
    setQuickEditCropFrameRect(nextFrame);
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

  function applyQuickEditPreview(options) {
    const opts = options || {};
    const el = ensureQuickEdit();
    const img = el.querySelector('[data-quick-edit-img]');
    if (!img) return;
    const params = quickEditEffectiveParams();
    const pan = quickEditEffectivePan();
    const angle = params.rotation + params.straighten;
    img.style.transform = 'translate(' + pan.x.toFixed(2) + 'px, ' + pan.y.toFixed(2) + 'px) scale(' + state.quickEdit.viewZoom.toFixed(4) + ') rotate(' + angle.toFixed(2) + 'deg)';
    img.style.filter = quickEditPreviewFilter(params);
    if (!opts.skipColorRender) {
      const interactive = !!opts.interactive && quickEditShouldUseLowResolutionInteractive(params);
      scheduleQuickEditPreviewRender({
        interactive,
        delayMs: opts.interactive && !interactive ? 45 : undefined,
      });
    }
    if (!opts.skipOverlay) requestAnimationFrame(updateQuickEditCropOverlay);
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
    if (url) {
      setQuickEditImageSource(img, url);
      setQuickEditLoading(false);
      renderQuickEditMeta(cachedPhoto, 'ready');
      applyQuickEditPreview();
      if (quickEditIsRawPhoto(cachedPhoto)) {
        scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
      }
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
      const merged = mergeLightboxCachePhoto(photoId, Object.assign({}, cachedPhoto, res.photo));
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
  }

  function closeQuickEdit(options) {
    const opts = options || {};
    if (state.quickEdit.saveSaving) {
      showToast('正在保存，完成前不能退出修图界面', 'error');
      return;
    }
    cancelQuickEditPicking();
    if (!state.quickEdit.open && (!state.quickEdit.el || state.quickEdit.el.classList.contains('hidden'))) return;
    if (!opts.force && !opts.silent && hasQuickEditUnsavedChanges()) {
      showQuickEditExitConfirm();
      return;
    }
    hideQuickEditExitConfirm();
    hideQuickEditSaveConfirm();
    hideQuickEditLutModal();
    cancelQuickEditPan();
    hideQuickEditCurvePanel();
    state.quickEdit.open = false;
    state.quickEdit.photo = null;
    state.quickEdit.params = null;
    state.quickEdit.committedParams = null;
    state.quickEdit.committedPanX = 0;
    state.quickEdit.committedPanY = 0;
    state.quickEdit.panX = 0;
    state.quickEdit.panY = 0;
    state.quickEdit.cropFrame = null;
    state.quickEdit.activeTools = { crop: false, rotate: false };
    state.quickEdit.histogramMode = 'white';
    state.quickEdit.histogramMenuOpen = false;
    state.quickEdit.histogramData = null;
    state.quickEdit.hslColor = 'red';
    state.quickEdit.lut = null;
    state.quickEdit.luts = [];
    state.quickEdit.lutDraft = null;
    state.quickEdit.lutDrafts = [];
    state.quickEdit.lutDraftLoadingId = '';
    state.quickEdit.exitConfirm = state.quickEdit.exitConfirm || null;
    state.quickEdit.saveConfirm = state.quickEdit.saveConfirm || null;
    state.quickEdit.saveProgress = null;
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
    state.quickEdit.loadToken += 1;
    clearQuickEditCropShade();
    const el = ensureQuickEdit();
    const img = el.querySelector('[data-quick-edit-img]');
    if (img) {
      img.removeAttribute('src');
      img.removeAttribute('style');
      img.alt = '';
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
    closeSearchPanel();
    closeCategoryPicker();
    setSortOpen(false);
    closeFilterMenu();
    closeFilterPop();
    hideContextMenu();
    hideNoteTooltip();
    const el = ensureQuickEdit();
    state.quickEdit.open = true;
    state.quickEdit.photo = current;
    state.quickEdit.params = quickEditDefaultParams();
    state.quickEdit.committedParams = null;
    state.quickEdit.committedPanX = 0;
    state.quickEdit.committedPanY = 0;
    state.quickEdit.panX = 0;
    state.quickEdit.panY = 0;
    state.quickEdit.cropFrame = null;
    state.quickEdit.activeTools = { crop: false, rotate: false };
    state.quickEdit.histogramMode = 'white';
    state.quickEdit.histogramMenuOpen = false;
    state.quickEdit.histogramData = null;
    state.quickEdit.hslColor = 'red';
    state.quickEdit.lut = null;
    state.quickEdit.luts = [];
    state.quickEdit.lutDraft = null;
    state.quickEdit.lutDrafts = [];
    state.quickEdit.lutDraftLoadingId = '';
    hideQuickEditSaveConfirm();
    state.quickEdit.saveProgress = null;
    state.quickEdit.history = [];
    state.quickEdit.cropDrag = null;
    state.quickEdit.rotationDrag = null;
    state.quickEdit.viewZoom = 1;
    resetQuickEditRawPreviewState();
    syncQuickEditControls();
    if (!state.quickEdit.lutLibraryLoaded && !state.quickEdit.lutLibraryLoading) {
      refreshQuickEditLutLibrary({ silent: true });
    }
    renderQuickEditMeta(current, 'loading');
    show(el);
    refreshQuickEditPanController();
    applyQuickEditPreview();
    loadQuickEditPreview(current);
    scheduleQuickEditCropShade();
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
    closeSearchPanel();
    closeCategoryPicker();
    setSortOpen(false);
    closeFilterMenu();
    closeFilterPop();
    hideContextMenu();
    hideNoteTooltip();
    if (els.gallery) els.gallery.classList.add('quick-edit-picking');
    showToast('选择一张照片进行快速调整');
    return true;
  }

  function handleQuickEditShortcut(ev) {
    if ((ev.key !== 'q' && ev.key !== 'Q') || ev.ctrlKey || ev.metaKey || ev.altKey) return false;
    if (!els.lightbox.classList.contains('hidden')) {
      if (state.compare.lightbox) {
        showToast('对比模式暂不支持快速调整');
        return true;
      }
      if (!state.lightbox.photo) {
        showToast('当前没有可调整照片', 'error');
        return true;
      }
      return openQuickEdit(state.lightbox.photo);
    }
    return beginQuickEditPicking();
  }

  function comparePaneFromEvent(ev) {
    const pane = ev.target && ev.target.closest ? ev.target.closest('[data-compare-pane]') : null;
    if (!pane || !els.lightboxCompare || !els.lightboxCompare.contains(pane)) return -1;
    const index = Number(pane.dataset.comparePane);
    return Number.isInteger(index) && index >= 0 && index < state.compare.panes.length ? index : -1;
  }

  function resetComparePane(index, photo) {
    const pane = state.compare.panes[index];
    pane.photo = photo;
    pane.zoom = 1;
    pane.panX = 0;
    pane.panY = 0;
    pane.dragging = false;
    pane.dragMoved = false;
    pane.loadToken += 1;
    const img = compareImgEl(index);
    if (img) {
      img.src = '';
      img.alt = photo && photo.filename ? photo.filename : '';
      img.style.transform = '';
      img.classList.remove('dragging');
    }
    updateCompareInfoPanel(index);
  }

  function updateCompareView() {
    if (!state.compare.lightbox) return;
    state.compare.panes.forEach((pane, index) => {
      const img = compareImgEl(index);
      const el = comparePaneEl(index);
      if (img) {
        img.style.transform = 'translate(' + pane.panX.toFixed(2) + 'px, ' + pane.panY.toFixed(2) + 'px) scale(' + pane.zoom.toFixed(4) + ')';
      }
      if (el) el.classList.toggle('active', index === state.compare.activePane);
    });
    if (els.compareZoomA) els.compareZoomA.textContent = '左 ' + formatZoomValue(state.compare.panes[0].zoom || 1);
    if (els.compareZoomB) els.compareZoomB.textContent = '右 ' + formatZoomValue(state.compare.panes[1].zoom || 1);
    const active = state.compare.panes[state.compare.activePane] || state.compare.panes[0];
    if (document.activeElement !== els.lightboxZoom) {
      els.lightboxZoom.value = formatZoomValue(active.zoom || 1);
    }
    const activePhoto = active.photo || null;
    const apscText = lightboxApscFocalText(activePhoto, active.zoom || 1);
    els.lightboxApscFocal.textContent = apscText || 'APS-C --';
    els.lightboxApscFocal.classList.toggle('hidden', !apscText);
    els.lightboxFocal.textContent = lightboxFocalText(activePhoto, active.zoom || 1);
    if (els.compareLock) {
      els.compareLock.classList.toggle('active', !!state.compare.locked);
      els.compareLock.setAttribute('aria-pressed', state.compare.locked ? 'true' : 'false');
      els.compareLock.title = state.compare.locked ? '已锁定同步' : '未锁定同步';
    }
  }

  function loadCompareImage(index, photo) {
    const pane = state.compare.panes[index];
    const img = compareImgEl(index);
    const el = comparePaneEl(index);
    if (!pane || !img || !photo) return;
    const token = ++pane.loadToken;
    const photoId = comparePhotoId(photo);
    const cachedPhoto = state.photoCache.get(photoId) || photo;
    const localUrl = lightboxLocalUrl(photo, cachedPhoto);
    const url = lightboxSourceUrl(photo, cachedPhoto);
    const previewUrl = photo.preview_url || cachedPhoto.preview_url || '';
    const previewable = !!(photo.previewable || cachedPhoto.previewable);
    const isCurrent = () => (
      state.compare.lightbox
      && token === pane.loadToken
      && pane.photo
      && comparePhotoId(pane.photo) === photoId
    );
    img.alt = photo.filename || '';
    img.src = '';
    if (previewUrl) img.src = previewUrl;
    if (url && !localUrl) warmLightboxCache(cachedPhoto);
    if (el) el.classList.toggle('loading', !url && previewable);
    if (!url && previewable && photoId) {
      call('get_photo_lightbox_preview', photoId).then((res) => {
        if (!isCurrent()) return;
        const loadedUrl = res && res.photo ? (res.photo.lightbox_url || res.photo.original_url || '') : '';
        if (!res || !res.success || !res.photo || !loadedUrl) throw new Error(res && res.message ? res.message : '无法生成高清预览');
        const merged = Object.assign({}, cachedPhoto, res.photo);
        state.photoCache.set(photoId, merged);
        mergeComparePanePhoto(index, merged);
        renderComparePanel();
        loadCompareImage(index, merged);
      }).catch((err) => {
        if (!isCurrent()) return;
        if (el) el.classList.remove('loading');
        console.warn('[PicScanner] 对比高清预览生成失败', err);
      });
      return;
    }
    if (!url) {
      if (el) el.classList.remove('loading');
      return;
    }
    if (el) el.classList.add('loading');
    const preloader = new Image();
    preloader.decoding = 'async';
    preloader.onload = () => {
      const decoded = preloader.decode ? preloader.decode() : Promise.resolve();
      decoded.then(() => {
        if (!isCurrent()) return;
        img.src = url;
        if (el) el.classList.remove('loading');
      }).catch((err) => {
        if (!isCurrent()) return;
        if (el) el.classList.remove('loading');
        console.warn('[PicScanner] 对比图片解码失败', err);
      });
    };
    preloader.onerror = () => {
      if (!isCurrent()) return;
      if (el) el.classList.remove('loading');
      console.warn('[PicScanner] 对比图片加载失败', { photoId, filename: photo.filename || '', url });
    };
    preloader.src = url;
  }

  function applyCompareZoom(index, nextZoom, anchorEvent) {
    const source = state.compare.panes[index];
    if (!source) return;
    const oldZoom = source.zoom || 1;
    const zoom = clamp(nextZoom, LIGHTBOX_MIN_ZOOM, LIGHTBOX_MAX_ZOOM);
    if (Math.abs(zoom - oldZoom) < 0.0001) return;
    const ratio = zoom / oldZoom;
    let anchorRatioX = 0;
    let anchorRatioY = 0;
    if (anchorEvent) {
      const sourceEl = comparePaneEl(index);
      const sourceRect = sourceEl ? sourceEl.getBoundingClientRect() : els.lightboxStage.getBoundingClientRect();
      const sourceLocalX = anchorEvent.clientX - sourceRect.left - sourceRect.width / 2;
      const sourceLocalY = anchorEvent.clientY - sourceRect.top - sourceRect.height / 2;
      anchorRatioX = sourceRect.width ? sourceLocalX / (sourceRect.width / 2) : 0;
      anchorRatioY = sourceRect.height ? sourceLocalY / (sourceRect.height / 2) : 0;
    }
    const applyOne = (pane, paneIndex) => {
      const before = pane.zoom || 1;
      const after = clamp(before * ratio, LIGHTBOX_MIN_ZOOM, LIGHTBOX_MAX_ZOOM);
      const actualRatio = after / before;
      if (anchorEvent) {
        const el = comparePaneEl(paneIndex);
        const rect = el ? el.getBoundingClientRect() : els.lightboxStage.getBoundingClientRect();
        const localX = anchorRatioX * rect.width / 2;
        const localY = anchorRatioY * rect.height / 2;
        pane.panX = localX - (localX - pane.panX) * actualRatio;
        pane.panY = localY - (localY - pane.panY) * actualRatio;
      } else {
        pane.panX *= actualRatio;
        pane.panY *= actualRatio;
      }
      pane.zoom = after;
      if (pane.zoom <= 1) {
        pane.panX = 0;
        pane.panY = 0;
      }
    };
    applyOne(source, index);
    if (state.compare.locked) {
      state.compare.panes.forEach((pane, paneIndex) => {
        if (paneIndex !== index) applyOne(pane, paneIndex);
      });
    }
    updateCompareView();
  }

  function openCompareLightbox() {
    const photos = state.compare.selected.map(currentComparePhoto).filter(comparePhotoReady);
    if (photos.length < 2) return;
    state.compare.selected = [photos[0], photos[1]];
    closeSearchPanel();
    clearTimeout(hoverTimer);
    hoverCard = null;
    hide(els.exifPop);
    state.compare.lightbox = true;
    state.compare.activePane = 0;
    state.compare.infoDragging = -1;
    state.lightbox.photo = null;
    state.lightbox.suppressCloseUntil = 0;
    setLightboxNavHover('');
    show(els.lightbox);
    els.lightbox.classList.add('compare-mode');
    els.lightboxCompare.classList.remove('hidden');
    if (els.compareToolbar) els.compareToolbar.classList.remove('hidden');
    setLightboxInfoVisible(false, { save: false });
    setCompareInfoVisible(false);
    resetComparePane(0, photos[0]);
    resetComparePane(1, photos[1]);
    loadCompareImage(0, photos[0]);
    loadCompareImage(1, photos[1]);
    loadCompareExif(0, photos[0]);
    loadCompareExif(1, photos[1]);
    updateCompareView();
    updateLightboxNavButtons();
    updateCompareCardHighlights();
  }

  function updateLightboxView() {
    if (state.compare.lightbox) {
      updateCompareView();
      return;
    }
    const box = state.lightbox;
    els.lightboxImg.style.transform = 'translate(' + box.panX.toFixed(2) + 'px, ' + box.panY.toFixed(2) + 'px) scale(' + box.zoom.toFixed(4) + ')';
    if (document.activeElement !== els.lightboxZoom) {
      els.lightboxZoom.value = formatZoomValue(box.zoom);
    }
    const apscText = lightboxApscFocalText(box.photo, box.zoom);
    els.lightboxApscFocal.textContent = apscText || 'APS-C --';
    els.lightboxApscFocal.classList.toggle('hidden', !apscText);
    els.lightboxFocal.textContent = lightboxFocalText(box.photo, box.zoom);
  }

  function lightboxInfoRows(photo) {
    if (!photo) return [];
    return [
      ['文件', photo.filename],
      ['机身', joinClean([photo.make, photo.model], ' ')],
      ['镜头', photo.lens_model],
      ['尺寸', formatPixelDimensions(photo)],
      ['格式', joinClean([photo.format, photo.size_text], ' · ')],
    ];
  }

  function formatPixelDimensions(photo) {
    const width = Number(photo && photo.width);
    const height = Number(photo && photo.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return '';
    const pixels = width * height;
    const unitText = pixels >= 100000000
      ? Math.round(pixels / 100000000) + '亿像素'
      : Math.round(pixels / 10000) + '万像素';
    return Math.round(width) + ' × ' + Math.round(height) + ' (' + unitText + ')';
  }

  function formatStandardDateTime(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return raw;
    return match[1] + '-' + match[2] + '-' + match[3] + ' ' + match[4] + ':' + match[5] + ':' + (match[6] || '00');
  }

  function lightboxShotSummary(photo) {
    if (!photo) return { primary: [], secondary: [], date: '' };
    const exposure = String(photo.exposure_time || '').trim();
    const shutter = exposure && /(?:s|秒)$/i.test(exposure) ? exposure : (exposure ? exposure + 's' : '');
    const aperture = photo.f_number ? 'F' + photo.f_number : '';
    const iso = photo.iso ? 'ISO' + photo.iso : '';
    const focal = photo.focal_length ? formatMmValue(photo.focal_length) + 'mm' : '';
    return {
      primary: [shutter, aperture].filter(Boolean),
      secondary: [iso, focal].filter(Boolean),
      date: formatStandardDateTime(photo.datetime_original),
    };
  }

  function lightboxShotSummaryHtml(photo) {
    const summary = lightboxShotSummary(photo);
    const primaryItems = summary.primary.length ? summary.primary : ['未知'];
    const primary = primaryItems.map((item) => '<span>' + escapeHtml(item) + '</span>').join('');
    const secondary = summary.secondary.map((item) => '<span>' + escapeHtml(item) + '</span>').join('');
    return '<div class="lightbox-shot-summary">' +
      '<div class="shot-primary">' + primary + '</div>' +
      ((secondary || summary.date) ? '<div class="shot-secondary"><div class="shot-secondary-left">' + secondary + '</div><time>' + escapeHtml(summary.date) + '</time></div>' : '') +
      '</div>';
  }

  function updateLightboxInfo(photo) {
    els.lightboxInfoBody.innerHTML = lightboxShotSummaryHtml(photo) +
      '<div class="lightbox-info-details"><div class="exif-grid">' +
      lightboxInfoRows(photo).map((row) => '<span>' + escapeHtml(row[0]) + '</span><span>' + escapeHtml(text(row[1], '未知')) + '</span>').join('') +
      '</div></div>';
    scheduleLightboxInfoLayout();
  }

  function setLightboxInfoVisible(visible, options) {
    state.lightbox.infoVisible = !!visible;
    if (!options || options.save !== false) {
      state.lightboxInfoPreferredVisible = state.lightbox.infoVisible;
      call('set_lightbox_info_visible', state.lightboxInfoPreferredVisible).catch(console.warn);
    }
    els.lightboxInfo.classList.toggle('hidden', !state.lightbox.infoVisible);
    els.lightboxInfoToggle.classList.toggle('active', state.lightbox.infoVisible);
    els.lightboxInfoToggle.setAttribute('aria-pressed', state.lightbox.infoVisible ? 'true' : 'false');
    els.lightboxInfoToggle.title = state.lightbox.infoVisible ? '隐藏参数' : '显示参数';
    scheduleLightboxInfoLayout();
  }

  function setLightboxInfoDetailsCollapsed(collapsed, options) {
    state.lightboxInfoDetailsCollapsed = !!collapsed;
    els.lightboxInfo.classList.toggle('details-collapsed', state.lightboxInfoDetailsCollapsed);
    if (els.lightboxInfoDetailsToggle) {
      els.lightboxInfoDetailsToggle.setAttribute('aria-expanded', state.lightboxInfoDetailsCollapsed ? 'false' : 'true');
      els.lightboxInfoDetailsToggle.setAttribute('aria-label', state.lightboxInfoDetailsCollapsed ? '展开详细参数' : '折叠详细参数');
      els.lightboxInfoDetailsToggle.title = state.lightboxInfoDetailsCollapsed ? '展开详细参数' : '折叠详细参数';
    }
    if (!options || options.save !== false) {
      call('set_lightbox_info_details_collapsed', state.lightboxInfoDetailsCollapsed).catch(console.warn);
    }
    scheduleLightboxInfoLayout();
  }

  function applyLightboxInfoSize(size) {
    const clean = normalizeLightboxInfoSize(size);
    if (!clean) return;
    els.lightboxInfo.style.width = clean.width + 'px';
    els.lightboxInfo.style.height = clean.height + 'px';
  }

  function currentLightboxInfoSize() {
    const rect = els.lightboxInfo.getBoundingClientRect();
    return {
      width: Math.round(clamp(rect.width, LIGHTBOX_INFO_MIN_WIDTH, LIGHTBOX_INFO_MAX_WIDTH)),
      height: Math.round(clamp(rect.height, LIGHTBOX_INFO_MIN_HEIGHT, LIGHTBOX_INFO_MAX_HEIGHT)),
    };
  }

  function saveLightboxInfoSize() {
    const size = currentLightboxInfoSize();
    state.lightboxInfoPreferredSize = size;
    call('set_lightbox_info_size', size).then((res) => {
      if (!res || !res.success) console.warn('[PicScanner] 参数面板尺寸保存失败', res);
    }).catch(console.warn);
  }

  function scheduleLightboxInfoLayout() {
    if (!state.lightbox.infoVisible) return;
    if (els.lightbox.classList.contains('hidden')) return;
    requestAnimationFrame(() => {
      if (!state.lightbox.infoVisible) return;
      if (els.lightbox.classList.contains('hidden')) return;
      if (state.lightboxInfoDetailsCollapsed) {
        clampLightboxInfoPosition();
        return;
      }
      expandLightboxInfoToDetails();
    });
  }

  function expandLightboxInfoToDetails() {
    if (!els.lightboxInfo || !els.lightboxInfoBody || !els.lightboxInfoHead) return;
    if (els.lightboxInfo.classList.contains('hidden')) return;
    const headHeight = Math.ceil(els.lightboxInfoHead.getBoundingClientRect().height || 34);
    const bodyHeight = Math.ceil(els.lightboxInfoBody.scrollHeight || els.lightboxInfoBody.getBoundingClientRect().height || 0);
    const borderHeight = Math.max(0, els.lightboxInfo.offsetHeight - els.lightboxInfo.clientHeight);
    const maxHeight = Math.min(LIGHTBOX_INFO_MAX_HEIGHT, window.innerHeight - 90);
    const targetHeight = Math.round(clamp(headHeight + bodyHeight + borderHeight, LIGHTBOX_INFO_MIN_HEIGHT, maxHeight));
    const currentHeight = els.lightboxInfo.getBoundingClientRect().height;
    if (targetHeight > currentHeight + 1) {
      els.lightboxInfo.style.height = targetHeight + 'px';
    }
    clampLightboxInfoPosition();
  }

  function clampLightboxInfoPosition() {
    if (!state.lightbox.infoVisible) return;
    const pad = 12;
    const rect = els.lightboxInfo.getBoundingClientRect();
    const minX = pad;
    const minY = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--titlebar-h')) || 36) + pad;
    const maxX = Math.max(minX, window.innerWidth - rect.width - pad);
    const maxY = Math.max(minY, window.innerHeight - rect.height - 68);
    state.lightbox.infoX = clamp(state.lightbox.infoX, minX, maxX);
    state.lightbox.infoY = clamp(state.lightbox.infoY, minY, maxY);
    els.lightboxInfo.style.left = state.lightbox.infoX + 'px';
    els.lightboxInfo.style.top = state.lightbox.infoY + 'px';
  }

  function defaultLightboxInfoPosition() {
    return {
      x: 18,
      y: (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--titlebar-h')) || 36) + 18,
    };
  }

  function restoreLightboxInfoPosition() {
    if (state.lightboxInfoPreferredSize) applyLightboxInfoSize(state.lightboxInfoPreferredSize);
    const position = state.lightboxInfoPreferredPosition || defaultLightboxInfoPosition();
    state.lightbox.infoX = position.x;
    state.lightbox.infoY = position.y;
    requestAnimationFrame(clampLightboxInfoPosition);
  }

  function saveLightboxInfoPosition() {
    const position = {
      x: Math.round(state.lightbox.infoX),
      y: Math.round(state.lightbox.infoY),
    };
    state.lightboxInfoPreferredPosition = position;
    call('set_lightbox_info_position', position).then((res) => {
      if (!res || !res.success) console.warn('[PicScanner] 参数面板位置保存失败', res);
    }).catch(console.warn);
  }

  function setLightboxNavHover(side) {
    const next = side === 'left' || side === 'right' ? side : '';
    if (state.lightbox.navHoverSide === next) return;
    state.lightbox.navHoverSide = next;
    els.lightbox.classList.toggle('nav-left-hover', next === 'left');
    els.lightbox.classList.toggle('nav-right-hover', next === 'right');
  }

  function updateLightboxNavHover(ev) {
    if (els.lightbox.classList.contains('hidden')) return;
    const rect = els.lightbox.getBoundingClientRect();
    const localX = ev.clientX - rect.left;
    const zoneWidth = Math.min(LIGHTBOX_NAV_HOVER_WIDTH, rect.width / 2);
    if (localX <= zoneWidth) {
      setLightboxNavHover('left');
    } else if (localX >= rect.width - zoneWidth) {
      setLightboxNavHover('right');
    } else {
      setLightboxNavHover('');
    }
  }

  function onLightboxInfoPointerDown(ev) {
    if (!state.lightbox.infoVisible) return;
    if (ev.button !== 0) return;
    state.lightbox.infoDragging = true;
    state.lightbox.infoDragX = ev.clientX;
    state.lightbox.infoDragY = ev.clientY;
    els.lightboxInfo.classList.add('dragging');
    els.lightboxInfo.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    ev.stopPropagation();
  }

  function onLightboxInfoResizePointerDown(ev) {
    if (!state.lightbox.infoVisible || ev.button !== 0) return;
    const handle = ev.target && ev.target.closest ? ev.target.closest('[data-lightbox-info-resize]') : null;
    if (!handle || !els.lightboxInfo.contains(handle)) return;
    const rect = els.lightboxInfo.getBoundingClientRect();
    state.lightbox.infoResizing = true;
    state.lightbox.infoResizeEdge = String(handle.dataset.lightboxInfoResize || '');
    state.lightbox.infoResizeStartX = ev.clientX;
    state.lightbox.infoResizeStartY = ev.clientY;
    state.lightbox.infoResizeStartWidth = rect.width;
    state.lightbox.infoResizeStartHeight = rect.height;
    state.lightbox.infoResizeStartLeft = state.lightbox.infoX;
    state.lightbox.infoResizeStartTop = state.lightbox.infoY;
    els.lightboxInfo.classList.add('resizing');
    els.lightboxInfo.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    ev.stopPropagation();
  }

  function onLightboxInfoPointerMove(ev) {
    if (state.lightbox.infoResizing) {
      resizeLightboxInfoFromPointer(ev);
      return;
    }
    if (!state.lightbox.infoDragging) return;
    state.lightbox.infoX += ev.clientX - state.lightbox.infoDragX;
    state.lightbox.infoY += ev.clientY - state.lightbox.infoDragY;
    state.lightbox.infoDragX = ev.clientX;
    state.lightbox.infoDragY = ev.clientY;
    clampLightboxInfoPosition();
    ev.preventDefault();
    ev.stopPropagation();
  }

  function resizeLightboxInfoFromPointer(ev) {
    const edge = state.lightbox.infoResizeEdge || '';
    const dx = ev.clientX - state.lightbox.infoResizeStartX;
    const dy = ev.clientY - state.lightbox.infoResizeStartY;
    let width = state.lightbox.infoResizeStartWidth;
    let height = state.lightbox.infoResizeStartHeight;
    let left = state.lightbox.infoResizeStartLeft;
    let top = state.lightbox.infoResizeStartTop;

    if (edge.includes('e')) width += dx;
    if (edge.includes('s')) height += dy;
    if (edge.includes('w')) {
      width -= dx;
      left += dx;
    }
    if (edge.includes('n')) {
      height -= dy;
      top += dy;
    }

    const cleanWidth = clamp(width, LIGHTBOX_INFO_MIN_WIDTH, Math.min(LIGHTBOX_INFO_MAX_WIDTH, window.innerWidth - 24));
    const cleanHeight = clamp(height, LIGHTBOX_INFO_MIN_HEIGHT, Math.min(LIGHTBOX_INFO_MAX_HEIGHT, window.innerHeight - 90));
    if (edge.includes('w')) left += width - cleanWidth;
    if (edge.includes('n')) top += height - cleanHeight;

    state.lightbox.infoX = left;
    state.lightbox.infoY = top;
    els.lightboxInfo.style.width = Math.round(cleanWidth) + 'px';
    els.lightboxInfo.style.height = Math.round(cleanHeight) + 'px';
    clampLightboxInfoPosition();
    ev.preventDefault();
    ev.stopPropagation();
  }

  function endLightboxInfoDrag(ev) {
    if (state.lightbox.infoResizing) {
      state.lightbox.infoResizing = false;
      state.lightbox.infoResizeEdge = '';
      els.lightboxInfo.classList.remove('resizing');
      state.lightbox.suppressCloseUntil = Date.now() + 260;
      try {
        els.lightboxInfo.releasePointerCapture(ev.pointerId);
      } catch (err) {
        // Pointer capture may already be released by the browser.
      }
      saveLightboxInfoSize();
      saveLightboxInfoPosition();
      ev.stopPropagation();
      return;
    }
    if (!state.lightbox.infoDragging) return;
    state.lightbox.infoDragging = false;
    els.lightboxInfo.classList.remove('dragging');
    state.lightbox.suppressCloseUntil = Date.now() + 260;
    try {
      els.lightboxInfo.releasePointerCapture(ev.pointerId);
    } catch (err) {
      // Pointer capture may already be released by the browser.
    }
    saveLightboxInfoPosition();
    ev.stopPropagation();
  }

  function onCompareInfoPointerDown(ev) {
    if (!state.compare.infoVisible || ev.button !== 0) return;
    const panel = ev.currentTarget.closest('[data-compare-info]');
    if (!panel) return;
    const index = Number(panel.dataset.compareInfo);
    if (!Number.isInteger(index) || index < 0 || index >= state.compare.panes.length) return;
    state.compare.infoDragging = index;
    state.compare.infoDragX = ev.clientX;
    state.compare.infoDragY = ev.clientY;
    panel.classList.add('dragging');
    panel.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    ev.stopPropagation();
  }

  function onCompareInfoPointerMove(ev) {
    const index = state.compare.infoDragging;
    if (index < 0) return;
    const position = compareInfoPosition(index);
    position.x += ev.clientX - state.compare.infoDragX;
    position.y += ev.clientY - state.compare.infoDragY;
    state.compare.infoDragX = ev.clientX;
    state.compare.infoDragY = ev.clientY;
    clampCompareInfoPosition(index);
    ev.preventDefault();
    ev.stopPropagation();
  }

  function endCompareInfoDrag(ev) {
    const index = state.compare.infoDragging;
    if (index < 0) return;
    state.compare.infoDragging = -1;
    const panel = compareInfoEl(index);
    if (panel) {
      panel.classList.remove('dragging');
      try {
        panel.releasePointerCapture(ev.pointerId);
      } catch (err) {
        // Pointer capture may already be released by the browser.
      }
    }
    state.lightbox.suppressCloseUntil = Date.now() + 260;
    ev.stopPropagation();
  }

  function setLightboxZoom(nextZoom, anchorEvent) {
    if (state.compare.lightbox) {
      applyCompareZoom(state.compare.activePane || 0, nextZoom, anchorEvent);
      return;
    }
    const box = state.lightbox;
    const oldZoom = box.zoom;
    const zoom = clamp(nextZoom, LIGHTBOX_MIN_ZOOM, LIGHTBOX_MAX_ZOOM);
    if (Math.abs(zoom - oldZoom) < 0.0001) return;

    if (anchorEvent) {
      const rect = els.lightboxStage.getBoundingClientRect();
      const localX = anchorEvent.clientX - rect.left - rect.width / 2;
      const localY = anchorEvent.clientY - rect.top - rect.height / 2;
      const ratio = zoom / oldZoom;
      box.panX = localX - (localX - box.panX) * ratio;
      box.panY = localY - (localY - box.panY) * ratio;
    } else if (zoom <= 1) {
      box.panX = 0;
      box.panY = 0;
    }

    box.zoom = zoom;
    if (box.zoom <= 1) {
      box.panX = 0;
      box.panY = 0;
    }
    updateLightboxView();
  }

  function orientationSwapsSize(orientation) {
    const value = String(orientation || '').toLowerCase();
    return ['5', '6', '7', '8'].includes(value) || value.includes('90') || value.includes('270');
  }

  function lightboxImageBasis(photo, fallbackWidth, fallbackHeight) {
    let width = Number(photo && photo.width);
    let height = Number(photo && photo.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      width = Number(fallbackWidth || 0);
      height = Number(fallbackHeight || 0);
    } else if (orientationSwapsSize(photo.orientation)) {
      const nextWidth = height;
      height = width;
      width = nextWidth;
    }
    return { width, height };
  }

  function applyLightboxImageDisplaySize(width, height, options) {
    const rawWidth = Number(width || 0);
    const rawHeight = Number(height || 0);
    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawWidth <= 0 || rawHeight <= 0) {
      els.lightboxImg.style.width = '';
      els.lightboxImg.style.height = '';
      return;
    }
    const titlebar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--titlebar-h')) || 36;
    const maxWidth = Math.max(1, window.innerWidth - 56);
    const maxHeight = Math.max(1, window.innerHeight - titlebar - 116);
    const fit = Math.min(maxWidth / rawWidth, maxHeight / rawHeight);
    const scale = options && options.allowUpscale ? fit : Math.min(1, fit);
    els.lightboxImg.style.width = Math.max(1, rawWidth * scale).toFixed(2) + 'px';
    els.lightboxImg.style.height = Math.max(1, rawHeight * scale).toFixed(2) + 'px';
  }

  function loadLightboxImage(photo) {
    const token = ++state.lightbox.loadToken;
    const cachedPhoto = state.photoCache.get(Number(photo.id || 0)) || photo;
    const localUrl = lightboxLocalUrl(photo, cachedPhoto);
    const url = lightboxSourceUrl(photo, cachedPhoto);
    const thumbnailUrl = photo.preview_url || cachedPhoto.preview_url || '';
    const previewUrl = thumbnailUrl && thumbnailUrl !== url
      ? thumbnailUrl
      : '';
    const photoId = Number(photo.id || 0);
    const previewable = !!(photo.previewable || cachedPhoto.previewable);
    const isCurrent = () => (
      token === state.lightbox.loadToken
      && state.lightbox.photo
      && Number(state.lightbox.photo.id || 0) === photoId
    );
    els.lightboxImg.onload = null;
    els.lightboxImg.onerror = null;
    els.lightboxImg.alt = photo.filename || '';
    els.lightboxImg.removeAttribute('src');
    if (url && !localUrl) warmLightboxCache(cachedPhoto);
    if (!url && previewable && photoId) {
      els.lightbox.classList.add('loading');
      els.lightbox.classList.remove('previewing');
      call('get_photo_lightbox_preview', photoId).then((res) => {
        if (!isCurrent()) return;
        const loadedUrl = res && res.photo ? (res.photo.lightbox_url || res.photo.original_url || '') : '';
        if (!res || !res.success || !res.photo || !loadedUrl) {
          throw new Error(res && res.message ? res.message : '无法生成高清预览');
        }
        const merged = Object.assign({}, cachedPhoto, res.photo);
        state.photoCache.set(photoId, merged);
        state.lightbox.photo = merged;
        const card = els.gallery.querySelector('[data-photo-id="' + photoId + '"]');
        if (card) {
          const img = card.querySelector('img[data-photo-id]');
          if (img && !imageHasSource(img)) img.src = merged.preview_url;
          updatePhotoCardMeta(card, merged, true);
        }
        loadLightboxImage(merged);
      }).catch((err) => {
        if (!isCurrent()) return;
        els.lightbox.classList.remove('loading');
        els.lightbox.classList.remove('previewing');
        console.warn('[PicScanner] 高清预览生成失败', {
          photoId,
          filename: photo.filename || '',
          path: photo.path || '',
          error: err,
        });
      });
      return;
    }
    if (!url) {
      els.lightbox.classList.remove('loading');
      els.lightbox.classList.remove('previewing');
      return;
    }
    if (previewUrl) {
      els.lightbox.classList.remove('loading');
      els.lightbox.classList.add('previewing');
    } else {
      els.lightbox.classList.add('loading');
      els.lightbox.classList.remove('previewing');
      els.lightboxImg.style.width = '';
      els.lightboxImg.style.height = '';
    }
    let originalRevealed = false;
    const revealLoadedImage = () => {
      if (!isCurrent()) return;
      originalRevealed = true;
      const basis = lightboxImageBasis(photo, preloader.naturalWidth, preloader.naturalHeight);
      applyLightboxImageDisplaySize(basis.width, basis.height);
      els.lightboxImg.src = url;
      els.lightbox.classList.remove('loading');
      els.lightbox.classList.remove('previewing');
    };

    const showPreviewImage = () => {
      if (!previewUrl) return;
      const preview = new Image();
      preview.decoding = 'async';
      preview.onload = () => {
        const decoded = preview.decode ? preview.decode() : Promise.resolve();
        decoded.then(() => {
          if (!isCurrent() || originalRevealed) return;
          const basis = lightboxImageBasis(photo, preview.naturalWidth, preview.naturalHeight);
          applyLightboxImageDisplaySize(
            basis.width,
            basis.height,
            { allowUpscale: !Number(photo.width) || !Number(photo.height) }
          );
          els.lightboxImg.src = previewUrl;
        }).catch((err) => {
          if (!isCurrent()) return;
          console.warn('[PicScanner] 缩略图解码失败', err);
        });
      };
      preview.onerror = () => {
        if (!isCurrent()) return;
        els.lightbox.classList.add('loading');
        els.lightbox.classList.remove('previewing');
        console.warn('[PicScanner] 缩略图加载失败: ' + previewUrl);
      };
      preview.src = previewUrl;
    };

    const preloader = new Image();
    preloader.decoding = 'async';
    preloader.onload = () => {
      const decoded = preloader.decode ? preloader.decode() : Promise.resolve();
      decoded.then(() => {
        revealLoadedImage();
      }).catch((err) => {
        if (!isCurrent()) return;
        console.warn('[PicScanner] 图片解码失败', err);
      });
    };
    preloader.onerror = () => {
      if (!isCurrent()) return;
      els.lightbox.classList.remove('loading');
      els.lightbox.classList.remove('previewing');
      console.warn('[PicScanner] 高清图片加载失败', {
        photoId,
        filename: photo.filename || '',
        url,
      });
    };
    preloader.src = url;
    showPreviewImage();
  }

  function lightboxOpenableCards() {
    return Array.from(els.gallery.querySelectorAll('.photo-card.openable')).filter((card) => {
      const photo = state.photoCache.get(Number(card.dataset.photoId || 0));
      return photo && (photo.original_url || photo.lightbox_url || photo.preview_url || photo.previewable);
    });
  }

  function currentLightboxCardIndex(cards) {
    const photoId = Number(state.lightbox.photo && state.lightbox.photo.id || 0);
    if (!photoId) return -1;
    return cards.findIndex((card) => Number(card.dataset.photoId || 0) === photoId);
  }

  function compareLightboxCardIndex(paneIndex, cards) {
    const pane = state.compare.panes[paneIndex];
    const photoId = comparePhotoId(pane && pane.photo);
    if (!photoId) return -1;
    return cards.findIndex((card) => Number(card.dataset.photoId || 0) === photoId);
  }

  function compareNavigableTargetIndex(paneIndex, direction, cards) {
    const start = compareLightboxCardIndex(paneIndex, cards);
    if (start < 0) return -1;
    const otherPane = paneIndex === 0 ? 1 : 0;
    const occupiedId = comparePhotoId(state.compare.panes[otherPane] && state.compare.panes[otherPane].photo);
    let targetIndex = start + direction;
    while (targetIndex >= 0 && targetIndex < cards.length) {
      const targetId = Number(cards[targetIndex].dataset.photoId || 0);
      if (!occupiedId || targetId !== occupiedId) return targetIndex;
      targetIndex += direction;
    }
    return -1;
  }

  function navigateCompareLightbox(direction) {
    if (!state.compare.lightbox) return;
    const paneIndex = state.compare.activePane || 0;
    const cards = lightboxOpenableCards();
    const targetIndex = compareNavigableTargetIndex(paneIndex, direction, cards);
    const target = targetIndex >= 0 ? cards[targetIndex] : null;
    if (!target) {
      updateLightboxNavButtons();
      return;
    }
    const photo = state.photoCache.get(Number(target.dataset.photoId || 0));
    if (!comparePhotoReady(photo)) {
      updateLightboxNavButtons();
      return;
    }
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    state.compare.selected[paneIndex] = photo;
    resetComparePane(paneIndex, photo);
    loadCompareImage(paneIndex, photo);
    loadCompareExif(paneIndex, photo);
    updateCompareView();
    updateLightboxNavButtons();
    updateCompareCardHighlights();
  }

  function updateLightboxNavButtons() {
    if (!els.lightboxPrev || !els.lightboxNext) return;
    if (state.compare.lightbox) {
      const cards = lightboxOpenableCards();
      const paneIndex = state.compare.activePane || 0;
      els.lightboxPrev.disabled = compareNavigableTargetIndex(paneIndex, -1, cards) < 0;
      els.lightboxNext.disabled = compareNavigableTargetIndex(paneIndex, 1, cards) < 0;
      return;
    }
    if (els.lightbox.classList.contains('hidden') || !state.lightbox.photo) {
      els.lightboxPrev.disabled = true;
      els.lightboxNext.disabled = true;
      return;
    }
    const cards = lightboxOpenableCards();
    const index = currentLightboxCardIndex(cards);
    els.lightboxPrev.disabled = index <= 0;
    els.lightboxNext.disabled = index < 0 || index >= cards.length - 1;
  }

  function navigateLightbox(direction) {
    if (els.lightbox.classList.contains('hidden')) return;
    if (state.compare.lightbox) {
      navigateCompareLightbox(direction);
      return;
    }
    const cards = lightboxOpenableCards();
    const index = currentLightboxCardIndex(cards);
    const target = cards[index + direction];
    if (!target) {
      updateLightboxNavButtons();
      return;
    }
    const photo = state.photoCache.get(Number(target.dataset.photoId || 0));
    if (!photo || !(photo.original_url || photo.lightbox_url || photo.preview_url || photo.previewable)) {
      updateLightboxNavButtons();
      return;
    }
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    openLightbox(photo, { preserveNavHover: true });
  }

  function openLightbox(photo, options) {
    if (!photo || !(photo.original_url || photo.lightbox_url || photo.preview_url || photo.previewable)) return;
    closeSearchPanel();
    clearTimeout(hoverTimer);
    hoverCard = null;
    hide(els.exifPop);
    state.lightbox.photo = photo;
    state.lightbox.zoom = 1;
    state.lightbox.panX = 0;
    state.lightbox.panY = 0;
    state.lightbox.dragging = false;
    state.lightbox.dragMoved = false;
    state.lightbox.suppressCloseUntil = 0;
    state.lightbox.infoVisible = state.lightboxInfoPreferredVisible;
    state.lightbox.infoDragging = false;
    state.lightbox.infoResizing = false;
    if (!options || !options.preserveNavHover) setLightboxNavHover('');
    show(els.lightbox);
    setLightboxInfoVisible(state.lightboxInfoPreferredVisible, { save: false });
    setLightboxInfoDetailsCollapsed(state.lightboxInfoDetailsCollapsed, { save: false });
    updateLightboxInfo(photo);
    restoreLightboxInfoPosition();
    updateLightboxView();
    loadLightboxImage(photo);
    updateLightboxNavButtons();

    const cached = state.exifCache.get(photo.id);
    if (cached) {
      state.lightbox.photo = cached;
      updateLightboxInfo(cached);
      updateLightboxView();
      updateLightboxNavButtons();
      return;
    }
    call('get_photo_exif', photo.id).then((res) => {
      if (!res || !res.success || !state.lightbox.photo || state.lightbox.photo.id !== photo.id) return;
      state.exifCache.set(photo.id, res.photo);
      state.photoCache.set(Number(photo.id), res.photo);
      state.lightbox.photo = res.photo;
      updateLightboxInfo(res.photo);
      updateLightboxView();
      updateLightboxNavButtons();
    }).catch(console.warn);
  }

  function closeLightbox() {
    hide(els.lightbox);
    state.compare.lightbox = false;
    state.compare.infoDragging = -1;
    state.compare.panes.forEach((pane, index) => {
      pane.loadToken += 1;
      pane.dragging = false;
      const img = compareImgEl(index);
      if (img) {
        img.src = '';
        img.classList.remove('dragging');
      }
      const el = comparePaneEl(index);
      if (el) el.classList.remove('loading', 'active');
    });
    els.lightbox.classList.remove('compare-mode');
    if (els.lightboxCompare) els.lightboxCompare.classList.add('hidden');
    if (els.compareToolbar) els.compareToolbar.classList.add('hidden');
    setCompareInfoVisible(false);
    state.lightbox.loadToken += 1;
    els.lightboxImg.onload = null;
    els.lightboxImg.onerror = null;
    els.lightboxImg.src = '';
    els.lightboxImg.style.width = '';
    els.lightboxImg.style.height = '';
    els.lightbox.classList.remove('loading');
    els.lightbox.classList.remove('previewing');
    state.lightbox.photo = null;
    state.lightbox.dragging = false;
    state.lightbox.infoDragging = false;
    state.lightbox.infoResizing = false;
    els.lightboxImg.classList.remove('dragging');
    els.lightboxInfo.classList.remove('dragging', 'resizing');
    setLightboxNavHover('');
    setLightboxInfoVisible(false, { save: false });
    updateLightboxNavButtons();
    updateCompareCardHighlights();
  }

  function onLightboxWheel(ev) {
    if (els.lightbox.classList.contains('hidden')) return;
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? LIGHTBOX_ZOOM_STEP : 1 / LIGHTBOX_ZOOM_STEP;
    if (state.compare.lightbox) {
      const index = comparePaneFromEvent(ev);
      if (index >= 0) {
        state.compare.activePane = index;
        updateLightboxNavButtons();
        applyCompareZoom(index, (state.compare.panes[index].zoom || 1) * factor, ev);
      }
      return;
    }
    setLightboxZoom(state.lightbox.zoom * factor, ev);
  }

  function onLightboxDoubleClick(ev) {
    if (els.lightbox.classList.contains('hidden')) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (state.compare.lightbox) {
      const index = comparePaneFromEvent(ev);
      if (index >= 0) {
        const pane = state.compare.panes[index];
        state.compare.activePane = index;
        updateLightboxNavButtons();
        applyCompareZoom(index, pane.zoom > 1 ? 1 : 2, ev);
      }
      return;
    }
    setLightboxZoom(state.lightbox.zoom > 1 ? 1 : 2, ev);
  }

  function onLightboxPointerDown(ev) {
    if (state.compare.lightbox) {
      const index = comparePaneFromEvent(ev);
      if (index < 0 || ev.button !== 0) return;
      state.compare.activePane = index;
      updateCompareView();
      updateLightboxNavButtons();
      const pane = state.compare.panes[index];
      pane.dragging = true;
      pane.dragX = ev.clientX;
      pane.dragY = ev.clientY;
      pane.dragStartX = ev.clientX;
      pane.dragStartY = ev.clientY;
      pane.dragMoved = false;
      const img = compareImgEl(index);
      if (img) img.classList.add('dragging');
      els.lightboxStage.setPointerCapture(ev.pointerId);
      ev.preventDefault();
      return;
    }
    if (state.lightbox.zoom <= 1 || ev.button !== 0) return;
    state.lightbox.dragging = true;
    state.lightbox.dragX = ev.clientX;
    state.lightbox.dragY = ev.clientY;
    state.lightbox.dragStartX = ev.clientX;
    state.lightbox.dragStartY = ev.clientY;
    state.lightbox.dragMoved = false;
    els.lightboxImg.classList.add('dragging');
    els.lightboxStage.setPointerCapture(ev.pointerId);
  }

  function onLightboxPointerMove(ev) {
    if (state.compare.lightbox) {
      const index = state.compare.panes.findIndex((pane) => pane.dragging);
      if (index < 0) return;
      const pane = state.compare.panes[index];
      const dx = ev.clientX - pane.dragX;
      const dy = ev.clientY - pane.dragY;
      const totalDx = ev.clientX - pane.dragStartX;
      const totalDy = ev.clientY - pane.dragStartY;
      if (Math.hypot(totalDx, totalDy) > 4) pane.dragMoved = true;
      pane.dragX = ev.clientX;
      pane.dragY = ev.clientY;
      const applyDrag = (targetPane) => {
        targetPane.panX += dx;
        targetPane.panY += dy;
      };
      applyDrag(pane);
      if (state.compare.locked) {
        state.compare.panes.forEach((targetPane, paneIndex) => {
          if (paneIndex !== index) applyDrag(targetPane);
        });
      }
      updateCompareView();
      ev.preventDefault();
      return;
    }
    if (!state.lightbox.dragging) return;
    const dx = ev.clientX - state.lightbox.dragX;
    const dy = ev.clientY - state.lightbox.dragY;
    const totalDx = ev.clientX - state.lightbox.dragStartX;
    const totalDy = ev.clientY - state.lightbox.dragStartY;
    if (Math.hypot(totalDx, totalDy) > 4) {
      state.lightbox.dragMoved = true;
    }
    state.lightbox.dragX = ev.clientX;
    state.lightbox.dragY = ev.clientY;
    state.lightbox.panX += dx;
    state.lightbox.panY += dy;
    updateLightboxView();
  }

  function endLightboxDrag(ev) {
    if (state.compare.lightbox) {
      const index = state.compare.panes.findIndex((pane) => pane.dragging);
      if (index < 0) return;
      const pane = state.compare.panes[index];
      pane.dragging = false;
      if (pane.dragMoved) state.lightbox.suppressCloseUntil = Date.now() + 260;
      state.compare.panes.forEach((_pane, paneIndex) => {
        const img = compareImgEl(paneIndex);
        if (img) img.classList.remove('dragging');
      });
      try {
        els.lightboxStage.releasePointerCapture(ev.pointerId);
      } catch (err) {
        // Pointer capture may already be released by the browser.
      }
      return;
    }
    if (!state.lightbox.dragging) return;
    state.lightbox.dragging = false;
    if (state.lightbox.dragMoved) {
      state.lightbox.suppressCloseUntil = Date.now() + 260;
    }
    els.lightboxImg.classList.remove('dragging');
    try {
      els.lightboxStage.releasePointerCapture(ev.pointerId);
    } catch (err) {
      // Pointer capture may already be released by the browser.
    }
  }

  function showExif(card, photo, ev) {
    const photoId = Number(photo.id);
    const cached = state.exifCache.get(photo.id);
    const ready = cached ? Promise.resolve(cached) : call('get_photo_exif', photo.id).then((res) => {
      if (!res.success) throw new Error(res.message || 'EXIF 读取失败');
      state.exifCache.set(photo.id, res.photo);
      return res.photo;
    });
    els.exifPop.innerHTML = '<div class="exif-title">读取 EXIF...</div>';
    positionExif(ev);
    show(els.exifPop);
    ready.then((full) => {
      if (hoverCard !== card || !card.isConnected) return;
      const merged = Object.assign({}, state.photoCache.get(photoId) || {}, full);
      state.photoCache.set(photoId, merged);
      updatePhotoCardMeta(card, merged, true);
      els.exifPop.innerHTML = exifHtml(merged);
      positionExif(ev);
    }).catch((err) => {
      if (hoverCard !== card || !card.isConnected) return;
      els.exifPop.innerHTML = '<div class="exif-title">' + escapeHtml(String(err)) + '</div>';
    });
  }

  function positionExif(ev) {
    if (els.exifPop.classList.contains('hidden')) return;
    const pad = 14;
    const w = 292;
    const h = Math.min(360, els.exifPop.offsetHeight || 220);
    let x = (ev.clientX || 0) + 18;
    let y = (ev.clientY || 0) + 18;
    if (x + w > window.innerWidth - pad) x = (ev.clientX || 0) - w - 18;
    if (y + h > window.innerHeight - pad) y = window.innerHeight - h - pad;
    els.exifPop.style.left = Math.max(pad, x) + 'px';
    els.exifPop.style.top = Math.max(pad + 36, y) + 'px';
  }

  function exifHtml(p) {
    const rows = [
      ['文件', p.filename],
      ['格式', p.format + ' · ' + p.size_text],
      ['时间', p.datetime_original],
      ['机身', joinClean([p.make, p.model], ' ')],
      ['镜头', p.lens_model],
      ['焦段', formatFocal(p)],
      ['光圈', p.f_number ? 'F' + p.f_number : '—'],
      ['快门', p.exposure_time],
      ['ISO', p.iso],
      ['尺寸', p.width && p.height ? p.width + ' × ' + p.height : '—'],
      ['测光', p.metering_mode],
      ['白平衡', p.white_balance],
      ['状态', p.exif_status === 'failed' ? p.exif_error : p.exif_status],
    ];
    return '<div class="exif-title">' + escapeHtml(p.filename || '') + '</div>' +
      '<div class="exif-grid">' +
      rows.map((r) => '<span>' + escapeHtml(r[0]) + '</span><span>' + escapeHtml(text(r[1])) + '</span>').join('') +
      '</div>';
  }

  function formatFocal(p) {
    const a = p.focal_length ? p.focal_length + 'mm' : '';
    const b = p.focal_length_35mm ? p.focal_length_35mm + 'mm 等效' : '';
    return joinClean([a, b], ' / ');
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

  const olderObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) loadOlderDates();
    });
  }, { root: els.galleryScroll, rootMargin: '700px 0px' });

  function saveLastViewedDate(dateKey, options) {
    const category = options && Object.prototype.hasOwnProperty.call(options, 'category') ? options.category : state.activeCategory;
    const immediate = !!(options && options.immediate);
    const position = viewedPositionFromScroll(dateKey);
    const cleanDate = position.date;
    const offset = position.offset;
    const saveKey = viewedCategoryKey(category) + '|' + cleanDate + '|' + offset;
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

  function viewedOffsetForDate(dateKey) {
    const section = document.getElementById('date-' + dateKey);
    if (!section) return 0;
    return Math.max(0, Math.round(els.galleryScroll.scrollTop - section.offsetTop));
  }

  function viewedPositionFromScroll(fallbackDate) {
    const fallback = String(fallbackDate || '').trim();
    const anchor = els.galleryScroll.scrollTop + 4;
    const sections = Array.from(els.gallery.querySelectorAll('.date-section'));
    for (const section of sections) {
      const date = String(section.dataset.date || '');
      if (!date) continue;
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      if (anchor >= top && anchor < bottom) {
        return { date, offset: Math.max(0, Math.round(els.galleryScroll.scrollTop - top)) };
      }
    }
    return { date: fallback, offset: viewedOffsetForDate(fallback) };
  }

  function restoreLastViewedPosition(position) {
    const dateKey = String((position && position.date) || '').trim();
    if (!dateKey) return;
    const offset = Math.max(0, Number((position && position.offset) || 0));
    clearTimeout(state.saveViewedDateTimer);
    state.saveViewedDateTimer = null;
    state.pendingRestoreDate = String(dateKey);
    state.pendingRestoreOffset = offset;
    state.lastViewedDateSaved = viewedCategoryKey(state.activeCategory) + '|' + String(dateKey) + '|' + offset;
    state.suppressLastViewedSaveUntil = Date.now() + 2500;
    tryRestorePendingDate();
  }

  function tryRestorePendingDate() {
    const dateKey = state.pendingRestoreDate;
    const offset = state.pendingRestoreOffset;
    if (!dateKey || state.restoringDate || state.loadingDates) return;
    const section = document.getElementById('date-' + dateKey);
    if (section) {
      state.pendingRestoreDate = '';
      state.pendingRestoreOffset = 0;
      jumpToDate(dateKey, offset);
      state.suppressLastViewedSaveUntil = Date.now() + 800;
      return;
    }
    if (state.noMoreDates) {
      state.pendingRestoreDate = '';
      state.pendingRestoreOffset = 0;
      return;
    }
    state.restoringDate = true;
    loadOlderDates({ allowScanRequest: false }).then((loaded) => {
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

  function scheduleDateHighlight() {
    if (state.scrollTicking) return;
    state.scrollTicking = true;
    requestAnimationFrame(() => {
      state.scrollTicking = false;
      updateDateHighlight();
    });
  }

  function updateDateHighlight() {
    const sections = Array.from(els.gallery.querySelectorAll('.date-section'));
    if (!sections.length) return;

    const viewTop = els.galleryScroll.scrollTop;
    const viewBottom = viewTop + els.galleryScroll.clientHeight;
    const viewHeight = Math.max(1, els.galleryScroll.clientHeight);
    const anchorY = viewTop + els.galleryScroll.clientHeight / 2;
    const centerBandHalf = Math.max(72, viewHeight * 0.22);
    const centerTop = anchorY - centerBandHalf;
    const centerBottom = anchorY + centerBandHalf;
    const centerBandHeight = Math.max(1, centerBottom - centerTop);
    let best = null;
    let bestDistance = Infinity;
    const visible = [];
    const focusByDate = new Map();

    sections.forEach((section) => {
      const date = section.dataset.date;
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      const overlap = Math.min(bottom, viewBottom) - Math.max(top, viewTop);
      if (overlap > 12 && date) {
        visible.push(date);
        const centerOverlap = Math.min(bottom, centerBottom) - Math.max(top, centerTop);
        const focus = clamp(centerOverlap / centerBandHeight, 0, 1);
        focusByDate.set(date, focus);
      }
      if (top <= anchorY && bottom >= anchorY) {
        best = date;
        bestDistance = 0;
        return;
      }
      const distance = Math.min(Math.abs(top - anchorY), Math.abs(bottom - anchorY));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = date;
      }
    });

    setVisibleDates(visible);
    setDateFocus(focusByDate);
    if (best) setActiveDate(best);
  }

  function onGalleryScroll() {
    state.lastScrollAt = Date.now();
    hideContextMenu();
    hideNoteTooltip();
    scheduleDateHighlight();
    scheduleRenderBufferCheck();
    schedulePlaceholderPhotoFill();
    scheduleVisiblePreviewCheck();
  }

  renderSortMenu();

  els.refreshSources.addEventListener('click', loadSources);
  if (els.sourcePageTabs) {
    els.sourcePageTabs.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest('[data-source-page-tab]') : null;
      if (!btn || !els.sourcePageTabs.contains(btn)) return;
      setSourcePage(btn.dataset.sourcePageTab);
    });
  }
  els.cancelScan.addEventListener('click', () => hide(els.confirmModal));
  els.confirmScan.addEventListener('click', beginScan);
  els.cancelExport.addEventListener('click', closeExportConfirm);
  els.confirmExport.addEventListener('click', confirmPendingExport);
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
  els.sourceOpenSettings.addEventListener('click', () => openSettingsPage({ fromSource: true }));
  els.openSettings.addEventListener('click', () => openSettingsPage());
  els.closeSettings.addEventListener('click', () => closeSettingsPage());
  els.openStats.addEventListener('click', openStatsPage);
  els.closeStats.addEventListener('click', closeStatsPage);
  els.addCategory.addEventListener('click', addCategoryFromSidebar);
  els.scanAll.addEventListener('click', toggleScanAll);
  els.readExif.addEventListener('click', toggleExifRead);
  els.sortTrigger.addEventListener('click', (ev) => {
    ev.stopPropagation();
    setSortOpen(!state.sortOpen);
  });
  els.filterTrigger.addEventListener('click', onFilterTriggerClick);
  els.filterTrigger.addEventListener('contextmenu', onFilterTriggerContextMenu);
  els.galleryScroll.addEventListener('scroll', onGalleryScroll, { passive: true });
  els.galleryScroll.addEventListener('wheel', onGalleryWheel, { passive: false });
  document.addEventListener('wheel', (ev) => {
    if (ev.ctrlKey) zoomGalleryItemsFromWheel(ev);
  }, { passive: false, capture: true });
  els.lightboxClose.addEventListener('click', closeLightbox);
  els.lightbox.addEventListener('click', (ev) => {
    if (state.compare.lightbox) return;
    if (Date.now() < state.lightbox.suppressCloseUntil) return;
    if (state.lightbox.zoom > 1) return;
    if (ev.target === els.lightbox || ev.target === els.lightboxStage) closeLightbox();
  });
  els.lightbox.addEventListener('mousemove', updateLightboxNavHover);
  els.lightbox.addEventListener('mouseleave', () => setLightboxNavHover(''));
  els.lightboxStage.addEventListener('wheel', onLightboxWheel, { passive: false });
  els.lightboxStage.addEventListener('dblclick', onLightboxDoubleClick);
  els.lightboxStage.addEventListener('pointerdown', onLightboxPointerDown);
  els.lightboxStage.addEventListener('pointermove', onLightboxPointerMove);
  els.lightboxStage.addEventListener('pointerup', endLightboxDrag);
  els.lightboxStage.addEventListener('pointercancel', endLightboxDrag);
  els.lightboxInfoHead.addEventListener('pointerdown', onLightboxInfoPointerDown);
  els.lightboxInfo.addEventListener('pointerdown', onLightboxInfoResizePointerDown);
  els.lightboxInfoDetailsToggle.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  els.lightboxInfoDetailsToggle.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setLightboxInfoDetailsCollapsed(!state.lightboxInfoDetailsCollapsed);
  });
  els.lightboxInfoClose.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  els.lightboxInfoClose.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setLightboxInfoVisible(false);
  });
  els.lightboxInfo.addEventListener('pointermove', onLightboxInfoPointerMove);
  els.lightboxInfo.addEventListener('pointerup', endLightboxInfoDrag);
  els.lightboxInfo.addEventListener('pointercancel', endLightboxInfoDrag);
  els.lightboxInfoToggle.addEventListener('click', () => setLightboxInfoVisible(!state.lightbox.infoVisible));
  if (els.compareInfoToggle) {
    els.compareInfoToggle.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      setCompareInfoVisible(!state.compare.infoVisible);
    });
  }
  if (els.lightboxCompare) {
    els.lightboxCompare.querySelectorAll('[data-compare-info-head]').forEach((head) => {
      head.addEventListener('pointerdown', onCompareInfoPointerDown);
    });
    els.lightboxCompare.querySelectorAll('[data-compare-info-close]').forEach((btn) => {
      btn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setCompareInfoVisible(false);
      });
    });
    els.lightboxCompare.querySelectorAll('[data-compare-info]').forEach((panel) => {
      panel.addEventListener('pointermove', onCompareInfoPointerMove);
      panel.addEventListener('pointerup', endCompareInfoDrag);
      panel.addEventListener('pointercancel', endCompareInfoDrag);
    });
  }
  if (els.compareLock) {
    els.compareLock.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      state.compare.locked = !state.compare.locked;
      updateCompareView();
    });
  }
  els.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
  els.lightboxNext.addEventListener('click', () => navigateLightbox(1));
  els.lightboxZoomOut.addEventListener('click', () => setLightboxZoom(currentLightboxZoom() / LIGHTBOX_ZOOM_STEP));
  els.lightboxZoomIn.addEventListener('click', () => setLightboxZoom(currentLightboxZoom() * LIGHTBOX_ZOOM_STEP));
  els.lightboxZoom.addEventListener('focus', () => els.lightboxZoom.select());
  els.lightboxZoom.addEventListener('blur', applyZoomInput);
  els.lightboxZoom.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      ev.stopPropagation();
      applyZoomInput();
      els.lightboxZoom.blur();
    } else if (ev.key === 'Escape') {
      ev.stopPropagation();
      els.lightboxZoom.value = formatZoomValue(currentLightboxZoom());
      els.lightboxZoom.blur();
    }
  });
  els.searchClose.addEventListener('click', closeSearchPanel);
  els.searchInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      closeSearchPanel();
    }
  });
  els.searchInput.addEventListener('input', scheduleSearch);
  els.searchPanel.querySelectorAll('[data-search-scope]').forEach((btn) => {
    btn.addEventListener('click', () => setSearchScope(btn.dataset.searchScope));
  });
  els.searchPanel.addEventListener('click', (ev) => {
    const result = ev.target && ev.target.closest ? ev.target.closest('.search-result') : null;
    if (!result) return;
    selectSearchResult(result);
    const item = state.searchResults.get(String(result.dataset.searchKey || ''));
    if (item) openSearchResult(item);
  });
  window.addEventListener('keydown', handleCategoryPickerKey, true);
  window.addEventListener('beforeunload', (ev) => {
    if (!state.quickEdit.saveSaving) return undefined;
    ev.preventDefault();
    ev.returnValue = '';
    return '';
  });
  document.addEventListener('click', (ev) => {
    if (!state.quickEdit.saveSaving) return;
    const target = ev.target;
    const closeControl = target && target.closest
      ? target.closest('.wvu-close, .wvu-btb-btn.close, [data-act="close"]')
      : null;
    if (!closeControl) return;
    ev.preventDefault();
    ev.stopPropagation();
    showToast('正在保存，完成前不能退出程序', 'error');
  }, true);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Alt') {
      if (!ev.repeat) showAltExifFromPointer(ev);
      if (canShowGalleryExif() && !isTypingTarget(document.activeElement)) {
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
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'f') {
      if (toggleSearchPanel()) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      return;
    }
    if (state.quickEdit.open && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
      showQuickEditSaveConfirm();
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (handleCategoryPickerKey(ev)) return;
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
      if (quickEditCurvePanel && quickEditCurvePanel.isOpen()) {
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
    if (state.quickEdit.open) return;
    if (ev.key === 'Escape' && state.compare.open && !state.compare.lightbox) {
      closeComparePanel();
      ev.preventDefault();
      return;
    }
    if (isTypingTarget(document.activeElement)) return;
    if (handleQuickEditShortcut(ev)) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (ev.key === 'Escape' && state.searchOpen) {
      closeSearchPanel();
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Escape' && state.pendingExport) {
      closeExportConfirm();
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Escape' && state.settingsOpen) {
      closeSettingsPage();
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Escape' && state.statsOpen) {
      closeStatsPage();
      ev.preventDefault();
      return;
    }
    if (state.settingsOpen || state.statsOpen) return;
    if (!els.lightbox.classList.contains('hidden') && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
      ev.preventDefault();
      navigateLightbox(ev.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if ((ev.key === 'c' || ev.key === 'C') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (!els.lightbox.classList.contains('hidden')) return;
      toggleComparePanel();
      ev.preventDefault();
      hideContextMenu();
      return;
    }
    if ((ev.key === 'f' || ev.key === 'F') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (favoriteHoveredPhoto()) {
        ev.preventDefault();
        hideContextMenu();
      }
      return;
    }
    if ((ev.key === 'e' || ev.key === 'E') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (editHoveredPhotoNote()) {
        ev.preventDefault();
        hideContextMenu();
      }
      return;
    }
    if ((ev.key === 'r' || ev.key === 'R') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (editActiveDateNote()) {
        ev.preventDefault();
        hideContextMenu();
      }
      return;
    }
    if ((ev.key === 's' || ev.key === 'S') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (openCategoryPickerForHover()) {
        ev.preventDefault();
        hideContextMenu();
      }
      return;
    }
    if (ev.key === 'Escape') setSortOpen(false);
    if (ev.key === 'Escape') hideContextMenu();
    if (ev.key === 'Escape' && !els.lightbox.classList.contains('hidden')) closeLightbox();
  });
  document.addEventListener('keyup', (ev) => {
    if (ev.key !== 'Alt') return;
    if (!canShowGalleryExif() || isTypingTarget(document.activeElement)) return;
    ev.preventDefault();
    ev.stopPropagation();
  });
  document.addEventListener('click', (ev) => {
    if (state.sortOpen && !els.sortDropdown.contains(ev.target)) setSortOpen(false);
    if (state.quickEdit.histogramMenuOpen && state.quickEdit.el) {
      const menuWrap = ev.target && ev.target.closest ? ev.target.closest('.quick-edit-histogram-rgb-wrap') : null;
      if (!menuWrap || !state.quickEdit.el.contains(menuWrap)) setQuickEditHistogramMenuOpen(false);
    }
    const clickedFilterCombo = ev.target && ev.target.closest ? ev.target.closest('.filter-combo') : null;
    if (state.filterPop && !clickedFilterCombo) closeFilterCombos(state.filterPop);
    if (state.filterOpen && state.filterPop && !state.filterPop.contains(ev.target) && !els.filterTrigger.contains(ev.target)) {
      closeFilterPop();
    }
    if (state.filterMenu && !state.filterMenu.classList.contains('hidden') && !state.filterMenu.contains(ev.target) && !els.filterTrigger.contains(ev.target)) {
      closeFilterMenu();
    }
    if (state.categoryPicker && state.categoryPicker.el && !state.categoryPicker.el.classList.contains('hidden') && !state.categoryPicker.el.contains(ev.target)) {
      closeCategoryPicker();
    }
    if (!state.contextMenu || state.contextMenu.classList.contains('hidden')) return;
    if (state.contextMenu.contains(ev.target)) return;
    hideContextMenu();
  });
  bindGalleryHover();
  bindNoteTooltip();
  bindChartTooltip();

  function nextRefreshDelay() {
    if (state.scanRunning || state.exifRunning) return 850;
    if (Date.now() - state.lastScrollAt < 900) return 1800;
    return 3200;
  }

  function scheduleRefresh(delay) {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => {
      refreshState().finally(() => scheduleRefresh(nextRefreshDelay()));
    }, delay);
  }

  function startStatePolling() {
    if (state.refreshTimer) return;
    scheduleRefresh(0);
  }

  let started = false;
  function startApp() {
    if (started) return;
    if (!api()) return;
    started = true;
    console.info('PicScanner app build', APP_BUILD);
    call('get_startup_state').then((data) => {
      const sources = (data && data.sources) || {};
      applyAppConfig(sources.config);
      renderSources(sources);
      const scan = (data && data.scan) || {};
      if (!enterCachedWorkspace(scan)) {
        show(els.sourceScreen);
      }
    }).catch(() => {
      loadSources();
      show(els.sourceScreen);
    });
    startStatePolling();
    setInterval(() => {
      if (!state.noMoreDates && state.dates.length === 0) loadOlderDates();
    }, 1200);
  }

  window.addEventListener('pywebviewready', startApp);
  window.addEventListener('dragenter', blockInternalFileDrop, true);
  window.addEventListener('dragover', blockInternalFileDrop, true);
  window.addEventListener('drop', blockInternalFileDrop, true);
  window.addEventListener('resize', () => {
    updateAllDateReserves();
    scheduleDateHighlight();
    schedulePlaceholderPhotoFill();
    requestAnimationFrame(clampLightboxInfoPosition);
    requestAnimationFrame(clampCompareInfoPositions);
    requestAnimationFrame(() => {
      refreshQuickEditImageDisplayBasis();
      updateQuickEditCropOverlay();
    });
    setLightboxNavHover('');
  });
  document.addEventListener('DOMContentLoaded', () => {
    startApp();
    let checks = 0;
    const timer = setInterval(() => {
      checks += 1;
      startApp();
      if (started || checks >= 120) clearInterval(timer);
    }, 100);
  });
  setTimeout(startApp, 0);

  olderObserver.observe(els.olderSentinel);
})();
