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
  const APP_BUILD = 'favorite-retain-nav-hover-20260622-1';
  const FAVORITE_CATEGORY = '__picscanner_favorite_filter__';
  const DATE_RAIL_LOAD_LIMIT = 5000;
  const INITIAL_PHOTO_LIMIT = 40;
  const PHOTO_LOAD_BATCH = 20;
  const GALLERY_ITEM_SIZE_WHEEL_SCALE = 0.12;
  const SEARCH_DEBOUNCE_MS = 180;

  const SORT_OPTIONS = [
    { key: 'datetime_desc', label: '拍摄时间 新到旧' },
    { key: 'datetime_asc', label: '拍摄时间 旧到新' },
    { key: 'filename_asc', label: '文件名 A 到 Z' },
    { key: 'filename_desc', label: '文件名 Z 到 A' },
    { key: 'size_desc', label: '文件大小 大到小' },
    { key: 'size_asc', label: '文件大小 小到大' },
  ];

  const SETTINGS_TABS = [
    { key: 'basic', label: '基础' },
    { key: 'interface', label: '界面' },
    { key: 'export', label: '导出' },
    { key: 'storage', label: '存储' },
    { key: 'shortcuts', label: '快捷键' },
    { key: 'about', label: '关于' },
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
    SETTINGS_TABS.forEach((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = tab.label;
      btn.classList.toggle('active', tab.key === state.settingsTab);
      btn.addEventListener('click', () => setSettingsTab(tab.key));
      els.settingsNav.appendChild(btn);
    });
  }

  function openSettingsPage(options) {
    const opts = options || {};
    const fromSource = opts.fromSource || (els.sourceScreen && !els.sourceScreen.classList.contains('hidden'));
    state.settingsReturnTarget = fromSource ? 'source' : 'workspace';
    state.settingsOpen = true;
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

  function renderShortcutsSettings() {
    const wrap = document.createElement('div');
    wrap.className = 'settings-empty';
    wrap.textContent = 'F：收藏或取消收藏鼠标 hover 的照片';
    els.settingsBody.appendChild(wrap);
  }

  function renderAboutSettings() {
    const panel = document.createElement('div');
    panel.className = 'about-panel';
    panel.innerHTML = [
      '<div class="about-title"><span>PicScanner</span><span class="about-version">v1.0.1</span></div>',
      '<div class="about-author">Himpq developed with Codex</div>',
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
    state.statsOpen = true;
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
    if (!ev.ctrlKey) {
      requestMoreScanFromWheel(ev);
      return;
    }
    zoomGalleryItemsFromWheel(ev);
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

  function bindGalleryHover() {
    els.gallery.addEventListener('mouseover', (ev) => {
      rememberPointer(ev);
      if (state.nativePhotoDragging) return;
      if (!els.lightbox.classList.contains('hidden')) return;
      const card = cardFromEvent(ev);
      if (!card || card === hoverCard || card.contains(ev.relatedTarget)) return;
      hoverCard = card;
      clearTimeout(hoverTimer);
      const photo = state.photoCache.get(Number(card.dataset.photoId));
      if (!photo) return;
      hoverTimer = setTimeout(() => showExif(card, photo, ev), 560);
    });
    els.gallery.addEventListener('mousemove', (ev) => {
      rememberPointer(ev);
      if (state.nativePhotoDragging) return;
      if (!hoverCard || !hoverCard.contains(ev.target)) return;
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
    if (state.lightbox.infoVisible) requestAnimationFrame(clampLightboxInfoPosition);
  }

  function setLightboxInfoDetailsCollapsed(collapsed, options) {
    state.lightboxInfoDetailsCollapsed = !!collapsed;
    els.lightboxInfo.classList.toggle('details-collapsed', state.lightboxInfoDetailsCollapsed);
    if (els.lightboxInfoDetailsToggle) {
      els.lightboxInfoDetailsToggle.setAttribute('aria-pressed', state.lightboxInfoDetailsCollapsed ? 'true' : 'false');
      els.lightboxInfoDetailsToggle.title = state.lightboxInfoDetailsCollapsed ? '展开详细参数' : '折叠详细参数';
    }
    if (!options || options.save !== false) {
      call('set_lightbox_info_details_collapsed', state.lightboxInfoDetailsCollapsed).catch(console.warn);
    }
    requestAnimationFrame(clampLightboxInfoPosition);
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
      const merged = Object.assign({}, state.photoCache.get(Number(photo.id)) || {}, full);
      state.photoCache.set(Number(photo.id), merged);
      updatePhotoCardMeta(card, merged, true);
      els.exifPop.innerHTML = exifHtml(merged);
      positionExif(ev);
    }).catch((err) => {
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
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'f') {
      if (toggleSearchPanel()) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      return;
    }
    if (handleCategoryPickerKey(ev)) return;
    if (isTypingTarget(document.activeElement)) return;
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
  document.addEventListener('click', (ev) => {
    if (state.sortOpen && !els.sortDropdown.contains(ev.target)) setSortOpen(false);
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
