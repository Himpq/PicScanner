(function () {
  const state = {
    selectedSource: null,
    dates: [],
    dateCounts: new Map(),
    dateCursor: null,
    loadingDates: false,
    noMoreDates: false,
    photoOffsets: new Map(),
    exifCache: new Map(),
    photoCache: new Map(),
    activeDate: null,
    visibleDates: new Set(),
    scanRunning: false,
    exifRunning: false,
    scanComplete: false,
    scanRequesting: false,
    lastMoreScanAt: 0,
    scrollTicking: false,
    lastScrollAt: 0,
    lastVisibleRefreshAt: 0,
    lastStatsSignature: '',
    refreshTimer: null,
    refreshInFlight: false,
    previewQueue: [],
    previewActive: 0,
    previewTicking: false,
    currentRootPath: '',
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
    },
  };

  const LIGHTBOX_MIN_ZOOM = 0.25;
  const LIGHTBOX_MAX_ZOOM = 12;
  const LIGHTBOX_ZOOM_STEP = 1.2;
  const PREVIEW_CONCURRENCY = 2;
  const MORE_SCAN_COOLDOWN_MS = 1800;

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
    driveList: document.getElementById('drive-list'),
    folderList: document.getElementById('folder-list'),
    folderWrap: document.getElementById('folder-wrap'),
    refreshSources: document.getElementById('refresh-sources'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmPath: document.getElementById('confirm-path'),
    confirmScan: document.getElementById('confirm-scan'),
    cancelScan: document.getElementById('cancel-scan'),
    currentSource: document.getElementById('current-source'),
    progressBar: document.getElementById('progress-bar'),
    exifProgressBar: document.getElementById('exif-progress-bar'),
    scanStatus: document.getElementById('scan-status'),
    scanCount: document.getElementById('scan-count'),
    scanMessage: document.getElementById('scan-message'),
    exifStatus: document.getElementById('exif-status'),
    exifCount: document.getElementById('exif-count'),
    exifMessage: document.getElementById('exif-message'),
    statTotal: document.getElementById('stat-total'),
    statExif: document.getElementById('stat-exif'),
    statPending: document.getElementById('stat-pending'),
    statFailed: document.getElementById('stat-failed'),
    lensStats: document.getElementById('lens-stats'),
    focalStats: document.getElementById('focal-stats'),
    timeRange: document.getElementById('time-range'),
    changeSource: document.getElementById('change-source'),
    scanAll: document.getElementById('scan-all'),
    readExif: document.getElementById('read-exif'),
    galleryScroll: document.getElementById('gallery-scroll'),
    gallery: document.getElementById('gallery'),
    olderSentinel: document.getElementById('older-sentinel'),
    dateRail: document.getElementById('date-rail-list'),
    exifPop: document.getElementById('exif-pop'),
    lightbox: document.getElementById('lightbox'),
    lightboxStage: document.getElementById('lightbox-stage'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxZoomOut: document.getElementById('lightbox-zoom-out'),
    lightboxZoomIn: document.getElementById('lightbox-zoom-in'),
    lightboxZoom: document.getElementById('lightbox-zoom'),
    lightboxApscFocal: document.getElementById('lightbox-apsc-focal'),
    lightboxFocal: document.getElementById('lightbox-focal'),
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

  function showSourceChooser() {
    hide(els.confirmModal);
    hide(els.workspace);
    show(els.sourceScreen);
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

  function sourceSummaryText(item) {
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
    btn.innerHTML = [
      '<div class="source-cover"></div>',
      '<div class="source-content">',
      '<div class="source-kicker"></div>',
      '<div class="source-title"></div>',
      '<div class="source-sub"></div>',
      '</div>',
    ].join('');
    if (coverUrl) btn.querySelector('.source-cover').style.backgroundImage = 'url("' + coverUrl + '")';
    btn.querySelector('.source-kicker').textContent = item.kind === 'drive' ? '磁盘' : '目录';
    btn.querySelector('.source-title').textContent = item.title || item.path;
    btn.querySelector('.source-sub').textContent = sourceSummaryText(item);
    btn.addEventListener('click', () => selectSource(item));
    return btn;
  }

  function renderSources(data) {
    els.driveList.innerHTML = '';
    (data.drives || []).forEach((item) => els.driveList.appendChild(sourceCard(item)));
    els.driveList.appendChild(sourceCard({ kind: 'add' }, 'add'));

    els.folderList.innerHTML = '';
    const folders = data.remembered_folders || [];
    els.folderWrap.style.display = folders.length ? '' : 'none';
    folders.forEach((item) => els.folderList.appendChild(sourceCard(item)));
  }

  function loadSources() {
    call('get_sources').then(renderSources).catch((err) => {
      els.driveList.innerHTML = '';
      const item = document.createElement('div');
      item.className = 'source-item';
      item.textContent = String(err);
      els.driveList.appendChild(item);
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
    state.dateCursor = null;
    state.loadingDates = false;
    state.noMoreDates = false;
    state.scanRequesting = false;
    state.lastMoreScanAt = 0;
    state.photoOffsets = new Map();
    state.exifCache = new Map();
    state.photoCache = new Map();
    state.activeDate = null;
    state.visibleDates = new Set();
    state.lastVisibleRefreshAt = 0;
    state.lastStatsSignature = '';
    state.previewQueue = [];
    state.previewActive = 0;
    state.previewTicking = false;
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
    state.scanRunning = true;
    resetGallery();
    call('start_scan', state.selectedSource.path).then((res) => {
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

  function applyScanData(data) {
      const st = data.state || {};
      const stats = data.statistics || {};
      const scanStatus = st.scan_status || st.status || 'idle';
      const exifStatus = st.exif_status || 'idle';
      state.scanRunning = !!st.scan_running || scanStatus === 'discovering' || scanStatus === 'stopping';
      state.exifRunning = !!st.exif_running || exifStatus === 'reading_exif' || exifStatus === 'stopping';
      state.scanComplete = !!st.scan_complete || scanStatus === 'done';

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

      els.scanAll.textContent = state.scanRunning ? '停止扫描' : '扫描所有图片';
      els.scanAll.classList.toggle('danger', state.scanRunning);
      els.readExif.textContent = state.exifRunning ? '停止读取 EXIF' : '读取 EXIF 统计';
      els.readExif.classList.toggle('danger', state.exifRunning);
      const signature = statsSignature(stats);
      const statsChanged = signature !== state.lastStatsSignature;
      if (statsChanged) {
        els.statTotal.textContent = stats.total_files || 0;
        els.statExif.textContent = stats.exif_complete || 0;
        els.statPending.textContent = stats.exif_pending || 0;
        els.statFailed.textContent = stats.exif_failed || 0;
      }
      if (Date.now() - state.lastScrollAt < 260) return;
      if (statsChanged) {
        renderStatsGroup(els.lensStats, stats.by_lens || []);
        renderStatsGroup(els.focalStats, stats.by_focal_bucket || []);
        const tr = stats.time_range || {};
        els.timeRange.textContent = tr.earliest && tr.latest ? (tr.earliest + ' → ' + tr.latest) : '';
        state.lastStatsSignature = signature;
      }
      if (state.scanRunning || (statsChanged && Date.now() - state.lastVisibleRefreshAt > 2400)) {
        maybeRefreshVisibleDates();
      }
  }

  function refreshState() {
    if (state.refreshInFlight) return Promise.resolve();
    state.refreshInFlight = true;
    const rootPath = state.currentRootPath || '';
    return call('get_scan_state', rootPath || null)
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
    resetGallery();
    state.currentRootPath = session.root_path || '';
    els.currentSource.textContent = state.currentRootPath;
    applyScanData(scanData);
    loadOlderDates();
    return true;
  }

  function enterSourceWorkspace(source) {
    state.currentRootPath = source.path || '';
    state.scanComplete = false;
    hide(els.confirmModal);
    hide(els.sourceScreen);
    show(els.workspace);
    playWorkspaceEnter();
    resetGallery();
    els.currentSource.textContent = state.currentRootPath;
    const rootPath = state.currentRootPath;
    call('get_scan_state', rootPath).then((scanData) => {
      if (rootPath !== state.currentRootPath) return;
      applyScanData(scanData);
      loadOlderDates();
      const summary = source.summary || {};
      if (!state.scanComplete && (!summary.has_cache || summary.session_status !== 'done')) requestMoreScan();
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

  function requestMoreScan() {
    if (!state.currentRootPath || state.scanRunning || state.scanRequesting || state.scanComplete) return Promise.resolve(false);
    const now = Date.now();
    if (now - state.lastMoreScanAt < MORE_SCAN_COOLDOWN_MS) return Promise.resolve(false);
    state.lastMoreScanAt = now;
    state.scanRequesting = true;
    state.scanRunning = true;
    els.olderSentinel.textContent = '继续扫描图片...';
    return call('start_scan', state.currentRootPath, 10).then((res) => {
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
    if (ev.deltaY <= 0 || !isNearGalleryBottom(80)) return;
    requestMoreScan();
  }

  function toggleScanAll() {
    if (!state.currentRootPath) return;
    if (state.scanRunning) {
      call('stop_scan').then(refreshState).catch(console.warn);
      return;
    }
    call('scan_all', state.currentRootPath).then((res) => {
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
    call('start_exif', state.currentRootPath).then((res) => {
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
    return call('list_dates', null, Math.max(10, state.dates.length), state.currentRootPath || null).then((data) => {
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
      const hadCount = state.dateCounts.has(dateKey);
      const previousCount = state.dateCounts.get(dateKey) || 0;
      const nextCount = Number(d.count || 0);
      state.dateCounts.set(dateKey, nextCount);
      const header = els.gallery.querySelector('[data-date-header="' + dateKey + '"] span');
      if (header) header.textContent = nextCount + ' 张 · EXIF ' + (d.exif_count || 0);
      const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
      if (pill) pill.textContent = dateKey.slice(5);
      if (hadCount && nextCount > previousCount) refreshDateMoreAvailability(dateKey, nextCount);
    });
  }

  function refreshDateMoreAvailability(dateKey, totalCount) {
    const section = document.getElementById('date-' + dateKey);
    if (!section || section.dataset.loadingPhotos === '1') return;
    const loadedCount = state.photoOffsets.get(dateKey) || 0;
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
    return call('list_dates', state.dateCursor, 8, state.currentRootPath || null).then((data) => {
      const dates = data.dates || [];
      if (!dates.length) {
        if (state.scanRunning) {
          els.olderSentinel.textContent = '等待发现图片...';
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
      if (!state.activeDate && dates[0]) setActiveDate(dates[0].date_key);
      return true;
    }).catch((err) => {
      console.warn(err);
      return false;
    }).finally(() => {
      state.loadingDates = false;
    });
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
    section.querySelector('strong').textContent = date.date_key;
    section.querySelector('span').textContent = date.count + ' 张 · EXIF ' + (date.exif_count || 0);
    state.dateCounts.set(date.date_key, Number(date.count || 0));
    const beforeSection = Array.from(els.gallery.querySelectorAll('.date-section'))
      .find((node) => String(node.dataset.date || '') < String(date.date_key));
    if (beforeSection) els.gallery.insertBefore(section, beforeSection);
    else els.gallery.appendChild(section);

    const pill = document.createElement('button');
    pill.className = 'date-pill';
    pill.dataset.datePill = date.date_key;
    pill.textContent = date.date_key.slice(5);
    pill.addEventListener('click', () => {
      els.galleryScroll.scrollTo({ top: Math.max(0, section.offsetTop - 4), behavior: 'smooth' });
    });
    const beforePill = Array.from(els.dateRail.querySelectorAll('.date-pill'))
      .find((node) => String(node.dataset.datePill || '') < String(date.date_key));
    if (beforePill) els.dateRail.insertBefore(pill, beforePill);
    else els.dateRail.appendChild(pill);

    if (!state.dates.some((x) => x.date_key === date.date_key)) {
      state.dates.push(date);
      state.dates.sort((a, b) => String(b.date_key).localeCompare(String(a.date_key)));
    }

    observeDateSection(section, date.date_key);
    scheduleDateHighlight();
  }

  function loadPhotosForDate(dateKey) {
    const offset = state.photoOffsets.get(dateKey) || 0;
    const section = document.getElementById('date-' + dateKey);
    if (!section) return;
    if (section.dataset.loadingPhotos === '1') return;
    section.dataset.loadingPhotos = '1';
    const more = section.querySelector('.date-more');
    more.textContent = '加载中...';
    call('list_photos', dateKey, offset, 30, state.currentRootPath || null).then((data) => {
      const photos = data.photos || [];
      const grid = section.querySelector('.photo-grid');
      const fragment = document.createDocumentFragment();
      photos.forEach((photo) => fragment.appendChild(photoCard(photo)));
      requestAnimationFrame(() => {
        grid.appendChild(fragment);
        observeImages();
        scheduleVisiblePreviewCheck();
        scheduleDateHighlight();
      });
      state.photoOffsets.set(dateKey, offset + photos.length);
      more.textContent = photos.length ? '滚动到这里会继续加载' : '这一天已加载完';
      if (photos.length) observeDateMore(more, dateKey);
    }).catch((err) => {
      more.textContent = String(err);
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
    const margin = 240;
    const imgs = els.gallery.querySelectorAll('img[data-photo-id]');
    imgs.forEach((img) => {
      if (imageHasSource(img) || img.dataset.loadingPreview === '1' || img.dataset.queuedPreview === '1') return;
      if (!imageNearViewport(img, margin)) return;
      enqueuePreview(img, Number(img.dataset.photoId || 0));
    });
  }

  function scheduleVisiblePreviewCheck() {
    if (state.previewTicking) return;
    state.previewTicking = true;
    requestAnimationFrame(requestVisiblePreviews);
  }

  function enqueuePreview(img, photoId) {
    if (!photoId || img.dataset.loadingPreview === '1' || img.dataset.queuedPreview === '1' || imageHasSource(img)) return;
    img.dataset.queuedPreview = '1';
    state.previewQueue.push({ img, photoId });
    drainPreviewQueue();
  }

  function drainPreviewQueue() {
    while (state.previewActive < PREVIEW_CONCURRENCY && state.previewQueue.length) {
      const item = state.previewQueue.shift();
      if (!item.img.isConnected || imageHasSource(item.img)) {
        item.img.dataset.queuedPreview = '0';
        continue;
      }
      state.previewActive += 1;
      item.img.dataset.queuedPreview = '0';
      item.img.dataset.loadingPreview = '1';
      call('get_photo_preview', item.photoId).then((res) => {
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
    if (photo.original_url) return previewLoaded ? '预览' : '加载中';
    return '';
  }

  function updatePhotoCardMeta(card, photo, previewLoaded) {
    const meta = card.querySelector('.photo-meta');
    if (!meta) return;
    meta.children[0].textContent = photo.format || '';
    meta.children[1].textContent = photoStatusText(photo, previewLoaded);
  }

  function photoCard(photo) {
    const card = document.createElement('article');
    card.className = 'photo-card';
    card.dataset.photoId = photo.id;
    state.photoCache.set(Number(photo.id), photo);
    if (photo.original_url) {
      card.classList.add('openable');
      card.addEventListener('click', () => openLightbox(photo));
    }
    if (photo.original_url) {
      const img = document.createElement('img');
      img.alt = photo.filename || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.dataset.photoId = photo.id;
      img.addEventListener('load', () => {
        img.classList.add('loaded');
        updatePhotoCardMeta(card, state.photoCache.get(Number(photo.id)) || photo, true);
      });
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
    return card;
  }

  let hoverTimer = null;
  let hoverCard = null;

  function cardFromEvent(ev) {
    return ev.target && ev.target.closest ? ev.target.closest('.photo-card') : null;
  }

  function bindGalleryHover() {
    els.gallery.addEventListener('mouseover', (ev) => {
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

  function formatZoomValue(zoom) {
    return zoom.toFixed(2) + '×';
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
      els.lightboxZoom.value = formatZoomValue(state.lightbox.zoom);
      return;
    }
    setLightboxZoom(parsed);
    els.lightboxZoom.value = formatZoomValue(state.lightbox.zoom);
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

  function updateLightboxView() {
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

  function setLightboxZoom(nextZoom, anchorEvent) {
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

  function openLightbox(photo) {
    if (!photo || !photo.original_url) return;
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
    els.lightboxImg.src = photo.original_url;
    els.lightboxImg.alt = photo.filename || '';
    show(els.lightbox);
    updateLightboxView();

    const cached = state.exifCache.get(photo.id);
    if (cached) {
      state.lightbox.photo = cached;
      updateLightboxView();
      return;
    }
    call('get_photo_exif', photo.id).then((res) => {
      if (!res || !res.success || !state.lightbox.photo || state.lightbox.photo.id !== photo.id) return;
      state.exifCache.set(photo.id, res.photo);
      state.photoCache.set(Number(photo.id), res.photo);
      state.lightbox.photo = res.photo;
      updateLightboxView();
    }).catch(console.warn);
  }

  function closeLightbox() {
    hide(els.lightbox);
    els.lightboxImg.src = '';
    state.lightbox.photo = null;
    state.lightbox.dragging = false;
    els.lightboxImg.classList.remove('dragging');
  }

  function onLightboxWheel(ev) {
    if (els.lightbox.classList.contains('hidden')) return;
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? LIGHTBOX_ZOOM_STEP : 1 / LIGHTBOX_ZOOM_STEP;
    setLightboxZoom(state.lightbox.zoom * factor, ev);
  }

  function onLightboxPointerDown(ev) {
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
      updatePhotoCardMeta(card, full, true);
      els.exifPop.innerHTML = exifHtml(full);
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

  function setActiveDate(dateKey) {
    if (!dateKey) return;
    const previous = state.activeDate;
    const changed = previous !== dateKey;
    state.activeDate = dateKey;
    if (previous) updateDatePill(previous);
    updateDatePill(dateKey);
    if (changed) {
      const active = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
      if (active) active.scrollIntoView({ block: 'nearest' });
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

  function updateDatePill(dateKey) {
    const btn = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
    if (!btn) return;
    btn.classList.toggle('active', state.activeDate === dateKey);
    btn.classList.toggle('visible', state.visibleDates.has(dateKey));
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
    const anchorY = viewTop + 72;
    let best = null;
    let bestDistance = Infinity;
    const visible = [];

    sections.forEach((section) => {
      const date = section.dataset.date;
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      const overlap = Math.min(bottom, viewBottom) - Math.max(top, viewTop);
      if (overlap > 12 && date) {
        visible.push(date);
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
    if (best) setActiveDate(best);
  }

  function onGalleryScroll() {
    state.lastScrollAt = Date.now();
    scheduleDateHighlight();
    scheduleVisiblePreviewCheck();
  }

  els.refreshSources.addEventListener('click', loadSources);
  els.cancelScan.addEventListener('click', () => hide(els.confirmModal));
  els.confirmScan.addEventListener('click', beginScan);
  els.changeSource.addEventListener('click', showSourceChooser);
  els.scanAll.addEventListener('click', toggleScanAll);
  els.readExif.addEventListener('click', toggleExifRead);
  els.galleryScroll.addEventListener('scroll', onGalleryScroll, { passive: true });
  els.galleryScroll.addEventListener('wheel', requestMoreScanFromWheel, { passive: true });
  els.lightboxClose.addEventListener('click', closeLightbox);
  els.lightbox.addEventListener('click', (ev) => {
    if (Date.now() < state.lightbox.suppressCloseUntil) return;
    if (ev.target === els.lightbox || ev.target === els.lightboxStage) closeLightbox();
  });
  els.lightboxStage.addEventListener('wheel', onLightboxWheel, { passive: false });
  els.lightboxStage.addEventListener('pointerdown', onLightboxPointerDown);
  els.lightboxStage.addEventListener('pointermove', onLightboxPointerMove);
  els.lightboxStage.addEventListener('pointerup', endLightboxDrag);
  els.lightboxStage.addEventListener('pointercancel', endLightboxDrag);
  els.lightboxZoomOut.addEventListener('click', () => setLightboxZoom(state.lightbox.zoom / LIGHTBOX_ZOOM_STEP));
  els.lightboxZoomIn.addEventListener('click', () => setLightboxZoom(state.lightbox.zoom * LIGHTBOX_ZOOM_STEP));
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
      els.lightboxZoom.value = formatZoomValue(state.lightbox.zoom);
      els.lightboxZoom.blur();
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (document.activeElement === els.lightboxZoom) return;
    if (ev.key === 'Escape' && !els.lightbox.classList.contains('hidden')) closeLightbox();
  });
  bindGalleryHover();

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
    call('get_startup_state').then((data) => {
      const sources = (data && data.sources) || {};
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
