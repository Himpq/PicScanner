(function () {
  const FORMAT_OPTIONS = [
    { id: 'jpg', name: 'JPEG', detail: '体积小，适合分享和通用查看' },
    { id: 'png', name: 'PNG', detail: '无损压缩，适合再次编辑' },
    { id: 'tiff', name: 'TIFF', detail: '无损成片，适合归档和后期' },
  ];
  const QUALITY_PRESETS = [
    { label: '预览', value: 70 },
    { label: '标准', value: 85 },
    { label: '高质量', value: 95 },
    { label: '最高', value: 100 },
  ];

  function icon(name) {
    const attrs = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
    if (name === 'chevron') return '<svg ' + attrs + '><path d="m6 9 6 6 6-6"/></svg>';
    if (name === 'back') return '<svg ' + attrs + '><path d="m15 18-6-6 6-6"/></svg>';
    if (name === 'close') return '<svg ' + attrs + '><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';
    return '';
  }

  function abortError() {
    const err = new Error('批量任务已取消');
    err.name = 'AbortError';
    return err;
  }

  function isAbortError(err) {
    return !!err && (err.name === 'AbortError' || String(err.message || '').includes('已取消'));
  }

  function qualityDescription(value) {
    const quality = Math.min(100, Math.max(1, Number(value || 100)));
    if (quality >= 98) return '最高保真，文件体积最大';
    if (quality >= 90) return '高质量，适合成片保存';
    if (quality >= 80) return '标准质量，体积和画质均衡';
    return '预览质量，适合快速分享';
  }

  function blobToDataUrl(blob, signal) {
    if (signal && signal.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      let settled = false;
      const cleanup = () => {
        reader.onload = null;
        reader.onerror = null;
        reader.onabort = null;
        if (signal) signal.removeEventListener('abort', onAbort);
      };
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };
      const onAbort = () => {
        try { reader.abort(); } catch (_err) {}
        finish(reject, abortError());
      };
      reader.onload = () => finish(resolve, String(reader.result || ''));
      reader.onerror = () => finish(reject, new Error('批量图片数据读取失败'));
      reader.onabort = () => finish(reject, abortError());
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      reader.readAsDataURL(blob);
    });
  }

  function create(options) {
    const config = options || {};
    if (typeof config.call !== 'function') throw new Error('批量处理缺少后端调用器');
    if (!config.renderer || typeof config.renderer.render !== 'function') throw new Error('批量处理缺少渲染器');
    if (typeof config.attachLightbox !== 'function' || typeof config.showLightboxPreview !== 'function' || typeof config.detachLightbox !== 'function') {
      throw new Error('批量处理缺少可复用灯箱组件');
    }

    const state = {
      screen: null,
      photos: [],
      adjustmentPresets: [],
      framePresets: [],
      adjustmentId: '',
      frameId: '',
      format: 'jpg',
      quality: 100,
      destination: '',
      namingTemplate: '{origin_name}_edited',
      preserveExif: false,
      loadingPresets: false,
      validating: false,
      presetError: '',
      running: false,
      cancelled: false,
      abortController: null,
      results: [],
      processed: 0,
      success: 0,
      failed: 0,
      previewToken: 0,
      previewTimer: null,
      previewAbortController: null,
      previewObjectUrl: '',
      previewSource: '',
      previewPhoto: null,
      previewIndex: 0,
      previewCache: new Map(),
      activePage: 'adjust',
      editSessions: new Map(),
    };

    function showToast(message, type) {
      if (typeof config.showToast === 'function') config.showToast(message, type);
    }

    function isTypingTarget(target) {
      if (!target) return false;
      const tag = String(target.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || target.isContentEditable;
    }

    function selectedAdjustment() {
      return state.adjustmentPresets.find((item) => item.id === state.adjustmentId) || null;
    }

    function selectedFrame() {
      return state.framePresets.find((item) => item.id === state.frameId) || null;
    }

    function selectedFormat() {
      return FORMAT_OPTIONS.find((item) => item.id === state.format) || FORMAT_OPTIONS[0];
    }

    function ensureScreen() {
      if (state.screen && state.screen.isConnected) return state.screen;
      const screen = document.createElement('section');
      screen.className = 'batch-processing-modal hidden';
      screen.setAttribute('role', 'dialog');
      screen.setAttribute('aria-modal', 'true');
      screen.setAttribute('aria-label', '批量处理');
      screen.innerHTML = [
        '<div class="batch-processing-card">',
        '<div class="batch-processing-toolbar">',
        '<button class="ghost-btn back-btn" type="button" data-batch-close>' + icon('back') + '<span>返回</span></button>',
        '<div class="batch-processing-toolbar-title"><b>批量修图</b><span data-batch-subtitle>尚未选择图片</span></div>',
        '<div class="toolbar-spacer"></div>',
        '<div class="batch-processing-toolbar-count" data-batch-toolbar-count>0 张</div>',
        '</div>',
        '<div class="batch-processing-content">',
        '<section class="batch-processing-preview">',
        '<div class="batch-preview-stage" data-batch-preview-stage>',
        '<div class="batch-preview-lightbox-host" data-batch-lightbox-host></div>',
        '</div>',
        '<div class="batch-preview-filmstrip">',
        '<div class="batch-preview-filmstrip-head"><b data-batch-preview-filename>尚未选择图片</b><span data-batch-preview-detail></span><em data-batch-preview-status>等待配置</em></div>',
        '<div class="batch-preview-thumbnails" data-batch-preview-thumbnails></div>',
        '</div>',
        '</section>',
        '<aside class="batch-processing-side">',
        '<div class="batch-processing-side-head">',
        '<div class="section-title">批量修图</div>',
        '<div class="batch-processing-side-summary"><b data-batch-summary-title>等待配置</b><span data-batch-summary-detail></span></div>',
        '</div>',
        '<nav class="batch-settings-tabs" data-batch-settings-tabs role="tablist" aria-label="批量修图页面">',
        '<button type="button" role="tab" data-batch-tab="adjust" aria-selected="true">调参</button>',
        '<button type="button" role="tab" data-batch-tab="frame" aria-selected="false">相框</button>',
        '<button type="button" role="tab" data-batch-tab="sync" aria-selected="false">同步</button>',
        '<button type="button" role="tab" data-batch-tab="output" aria-selected="false">输出设置</button>',
        '</nav>',
        '<div class="batch-processing-side-scroll">',
        '<div class="batch-processing-config" data-batch-config>',
        '<section class="batch-processing-page" data-batch-page="adjust">',
        '<div class="batch-processing-field"><div class="batch-field-heading"><b>调整预设</b><span>应用修图界面保存的影调、色彩与细节参数</span></div><div class="batch-picker quick-edit-save-format-select" data-batch-picker="adjustment"><button class="quick-edit-save-format-trigger" type="button" data-batch-picker-trigger aria-expanded="false"><span data-batch-picker-label>无调整预设</span><small data-batch-picker-detail>不改变影调与色彩</small><b>' + icon('chevron') + '</b></button><div class="quick-edit-save-format-menu hidden" data-batch-picker-menu role="menu"></div></div></div>',
        '<p class="batch-processing-message" data-batch-preset-message></p>',
        '</section>',
        '<section class="batch-processing-page hidden" data-batch-page="frame">',
        '<div class="batch-processing-field"><div class="batch-field-heading"><b>相框预设</b><span>在调整结果外合成相框、文字和图片标识</span></div><div class="batch-picker quick-edit-save-format-select" data-batch-picker="frame"><button class="quick-edit-save-format-trigger" type="button" data-batch-picker-trigger aria-expanded="false"><span data-batch-picker-label>无相框</span><small data-batch-picker-detail>不添加相框和文字</small><b>' + icon('chevron') + '</b></button><div class="quick-edit-save-format-menu hidden" data-batch-picker-menu role="menu"></div></div></div>',
        '</section>',
        '<section class="batch-processing-page hidden" data-batch-page="sync" aria-label="同步"></section>',
        '<section class="batch-processing-page hidden" data-batch-page="output">',
        '<div class="batch-output-group">',
        '<div class="batch-output-group-title"><b>格式与画质</b><span>文件类型和压缩质量</span></div>',
        '<div class="batch-processing-field"><span>保存格式</span><div class="batch-picker quick-edit-save-format-select" data-batch-picker="format"><button class="quick-edit-save-format-trigger" type="button" data-batch-picker-trigger aria-expanded="false"><span data-batch-picker-label>JPEG</span><small data-batch-picker-detail>体积小，适合分享和通用查看</small><b>' + icon('chevron') + '</b></button><div class="quick-edit-save-format-menu hidden" data-batch-picker-menu role="menu"></div></div></div>',
        '<label class="quick-edit-save-field quick-edit-save-quality batch-quality-field">',
        '<span class="quick-edit-save-label">JPEG 画质</span>',
        '<div class="quick-edit-save-quality-readout"><b data-batch-quality-value>100</b><span data-batch-quality-detail>最高保真，文件体积最大</span></div>',
        '<input type="range" min="1" max="100" step="1" value="100" data-batch-quality />',
        '<div class="quick-edit-save-quality-presets" role="group" aria-label="批量 JPEG 画质预设">',
        QUALITY_PRESETS.map((preset) => '<button type="button" data-batch-quality-preset="' + preset.value + '" aria-pressed="false">' + preset.label + '</button>').join(''),
        '</div>',
        '</label>',
        '</div>',
        '<div class="batch-output-group">',
        '<div class="batch-output-group-title"><b>保存与命名</b><span>输出目录、文件名和可用变量</span></div>',
        '<div class="batch-processing-field">',
        '<span>保存目录</span>',
        '<div class="quick-edit-save-path-row"><div class="quick-edit-save-path empty" data-batch-destination>未选择保存目录</div><button class="ghost-btn quick-edit-save-path-btn" type="button" data-batch-choose-folder>选择路径</button></div>',
        '</div>',
        '<label class="batch-processing-field"><span>命名模板</span><input class="batch-processing-input" type="text" data-batch-naming value="{origin_name}_edited" spellcheck="false" /></label>',
        '<div class="batch-processing-tokens"><code>{origin_name}</code><code>{date}</code><code>{Y}</code><code>{M}</code><code>{D}</code><code>{camera}</code><code>{lens_name}</code><code>{iso}</code></div>',
        '</div>',
        '<div class="batch-output-group">',
        '<div class="batch-output-group-title"><b>元数据</b><span>控制成片是否保留原始拍摄信息</span></div>',
        '<label class="batch-metadata-toggle" data-batch-exif-toggle>',
        '<input type="checkbox" data-batch-preserve-exif aria-label="完整复制原始 EXIF" />',
        '<div><b>完整复制原始 EXIF</b><em data-batch-exif-note>同时复制 IPTC、XMP、ICC、注释和缩略图</em></div>',
        '</label>',
        '</div>',
        '</section>',
        '</div>',
        '<div class="batch-processing-progress hidden" data-batch-progress>',
        '<div class="batch-progress-current"><b data-batch-current-file>准备开始</b><span data-batch-current-stage></span></div>',
        '<div class="batch-progress-track"><span data-batch-progress-bar></span></div>',
        '<div class="batch-progress-counts"><span data-batch-progress-total>0 / 0</span><span data-batch-progress-success>成功 0</span><span data-batch-progress-failed>失败 0</span></div>',
        '<div class="batch-result-list" data-batch-result-list></div>',
        '</div>',
        '</div>',
        '<div class="batch-processing-side-actions">',
        '<button class="ghost-btn" type="button" data-batch-secondary>关闭</button>',
        '<button class="danger-btn hidden" type="button" data-batch-cancel>取消任务</button>',
        '<button class="primary-btn" type="button" data-batch-start>开始处理</button>',
        '</div>',
        '</aside>',
        '</div>',
        '</div>',
      ].join('');
      document.body.appendChild(screen);
      state.screen = screen;

      screen.querySelector('[data-batch-close]').addEventListener('click', close);
      screen.querySelector('[data-batch-secondary]').addEventListener('click', close);
      screen.querySelector('[data-batch-cancel]').addEventListener('click', cancel);
      screen.querySelector('[data-batch-start]').addEventListener('click', start);
      screen.querySelector('[data-batch-choose-folder]').addEventListener('click', chooseFolder);
      screen.querySelectorAll('[data-batch-tab]').forEach((button) => {
        button.addEventListener('click', () => setActivePage(button.dataset.batchTab));
      });
      screen.querySelector('[data-batch-naming]').addEventListener('input', (ev) => {
        state.namingTemplate = String(ev.target.value || '');
        syncSummary();
      });
      screen.querySelector('[data-batch-quality]').addEventListener('input', (ev) => {
        state.quality = Number(ev.target.value || 100);
        syncControls();
      });
      screen.querySelector('[data-batch-preserve-exif]').addEventListener('change', (ev) => {
        state.preserveExif = !!ev.target.checked;
        const sideScroll = screen.querySelector('.batch-processing-side-scroll');
        console.info('[PicScannerBatch] preserve EXIF changed', {
          enabled: state.preserveExif,
          format: state.format,
          sideScrollTop: sideScroll ? sideScroll.scrollTop : null,
          windowScrollY: window.scrollY,
        });
        syncSummary();
      });
      screen.querySelectorAll('[data-batch-quality-preset]').forEach((button) => {
        button.addEventListener('click', () => {
          if (state.running) return;
          state.quality = Number(button.dataset.batchQualityPreset || 100);
          syncControls();
        });
      });
      screen.querySelectorAll('[data-batch-picker]').forEach((picker) => {
        const trigger = picker.querySelector('[data-batch-picker-trigger]');
        trigger.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (state.running) return;
          const menu = picker.querySelector('[data-batch-picker-menu]');
          const open = menu.classList.contains('hidden');
          closePickers();
          menu.classList.toggle('hidden', !open);
          trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        picker.querySelector('[data-batch-picker-menu]').addEventListener('click', (ev) => {
          const item = ev.target && ev.target.closest ? ev.target.closest('[data-batch-picker-value]') : null;
          if (!item) return;
          const type = picker.dataset.batchPicker;
          const value = String(item.dataset.batchPickerValue || '');
          if (type === 'adjustment') state.adjustmentId = value;
          else if (type === 'frame') state.frameId = value;
          else state.format = value || 'jpg';
          state.presetError = '';
          closePickers();
          syncControls();
          if (type === 'adjustment' || type === 'frame') scheduleSamplePreview(80);
        });
      });
      document.addEventListener('click', (ev) => {
        if (!state.screen || state.screen.classList.contains('hidden')) return;
        if (ev.target && ev.target.closest && ev.target.closest('[data-batch-picker]')) return;
        closePickers();
      });
      return screen;
    }

    function closePickers() {
      if (!state.screen) return;
      state.screen.querySelectorAll('[data-batch-picker]').forEach((picker) => {
        const trigger = picker.querySelector('[data-batch-picker-trigger]');
        const menu = picker.querySelector('[data-batch-picker-menu]');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (menu) menu.classList.add('hidden');
      });
    }

    function pickerItems(type) {
      if (type === 'adjustment') {
        return [{ id: '', name: '无调整预设', detail: '不改变影调与色彩' }].concat(state.adjustmentPresets);
      }
      if (type === 'frame') {
        return [{ id: '', name: '无相框', detail: '不添加相框和文字' }].concat(state.framePresets);
      }
      return FORMAT_OPTIONS;
    }

    function pickerSelection(type) {
      if (type === 'adjustment') return state.adjustmentId;
      if (type === 'frame') return state.frameId;
      return state.format;
    }

    function renderPicker(type) {
      const screen = ensureScreen();
      const picker = screen.querySelector('[data-batch-picker="' + type + '"]');
      if (!picker) return;
      const items = pickerItems(type);
      const selectedId = pickerSelection(type);
      const selected = items.find((item) => item.id === selectedId) || items[0];
      picker.querySelector('[data-batch-picker-label]').textContent = selected.name;
      picker.querySelector('[data-batch-picker-detail]').textContent = selected.detail || '';
      const menu = picker.querySelector('[data-batch-picker-menu]');
      menu.innerHTML = '';
      items.forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'menuitemradio');
        button.dataset.batchPickerValue = item.id;
        button.className = item.id === selectedId ? 'active' : '';
        button.setAttribute('aria-pressed', item.id === selectedId ? 'true' : 'false');
        const name = document.createElement('span');
        name.textContent = item.name;
        const detail = document.createElement('small');
        detail.textContent = item.detail || '';
        button.appendChild(name);
        button.appendChild(detail);
        menu.appendChild(button);
      });
    }

    function metadataAvailable() {
      return state.format === 'jpg' || state.format === 'tiff';
    }

    function syncControls() {
      const screen = ensureScreen();
      renderPicker('adjustment');
      renderPicker('frame');
      renderPicker('format');
      const qualityField = screen.querySelector('.batch-quality-field');
      const quality = screen.querySelector('[data-batch-quality]');
      const qualityValue = screen.querySelector('[data-batch-quality-value]');
      const qualityDetail = screen.querySelector('[data-batch-quality-detail]');
      qualityField.classList.toggle('hidden', state.format !== 'jpg');
      quality.value = String(state.quality);
      quality.disabled = state.running || state.format !== 'jpg';
      qualityValue.textContent = String(Math.round(state.quality));
      qualityDetail.textContent = qualityDescription(state.quality);
      screen.querySelectorAll('[data-batch-quality-preset]').forEach((button) => {
        const active = Number(button.dataset.batchQualityPreset || 0) === Number(state.quality);
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.disabled = state.running;
      });

      const metadata = screen.querySelector('[data-batch-preserve-exif]');
      const metadataWrap = screen.querySelector('[data-batch-exif-toggle]');
      const metadataNote = screen.querySelector('[data-batch-exif-note]');
      const available = metadataAvailable() && !state.running;
      if (!metadataAvailable()) state.preserveExif = false;
      metadata.checked = state.preserveExif;
      metadata.disabled = !available;
      metadataWrap.classList.toggle('disabled', !available);
      metadataNote.textContent = metadataAvailable()
        ? '从 RAW/JPEG 原文件复制 EXIF、IPTC、XMP、ICC、注释和缩略图，只修正成片方向与尺寸'
        : 'PNG 无法保证完整承载原始 EXIF，请选择 JPEG 或 TIFF';

      screen.querySelectorAll('[data-batch-picker-trigger], [data-batch-naming], [data-batch-choose-folder]').forEach((control) => {
        control.disabled = state.running;
      });
      const message = screen.querySelector('[data-batch-preset-message]');
      if (message) {
        message.textContent = state.presetError || (state.loadingPresets ? '正在读取预设' : '');
        message.classList.toggle('error', !!state.presetError);
      }
      syncPreviewThumbnailSelection();
      syncSummary();
    }

    function syncSummary() {
      if (!state.screen) return;
      const adjustment = selectedAdjustment();
      const frame = selectedFrame();
      const format = selectedFormat();
      state.screen.querySelector('[data-batch-summary-title]').textContent = state.photos.length + ' 张图片';
      state.screen.querySelector('[data-batch-summary-detail]').textContent = [
        adjustment ? adjustment.name : '无调整',
        frame ? frame.name : '无相框',
        format.name,
      ].join(' · ');
      const destination = state.screen.querySelector('[data-batch-destination]');
      destination.textContent = state.destination || '未选择保存目录';
      destination.classList.toggle('empty', !state.destination);
      const startButton = state.screen.querySelector('[data-batch-start]');
      startButton.disabled = state.running
        || state.validating
        || state.loadingPresets
        || !!state.presetError
        || !state.photos.length
        || !state.destination
        || !String(state.namingTemplate || '').trim();
    }

    function revokePreviewObjectUrl() {
      if (!state.previewObjectUrl) return;
      URL.revokeObjectURL(state.previewObjectUrl);
      state.previewObjectUrl = '';
      if (state.previewSource && state.previewSource.startsWith('blob:')) state.previewSource = '';
    }

    function samplePreviewCacheKey(photo) {
      const current = photo || state.photos[state.previewIndex] || {};
      return [Number(current.id || 0), state.adjustmentId || '-', state.frameId || '-'].join('|');
    }

    function clearSamplePreviewCache() {
      state.previewCache.forEach((entry) => {
        if (entry && entry.url) URL.revokeObjectURL(entry.url);
      });
      state.previewCache.clear();
    }

    function cacheSamplePreview(photo, url) {
      const key = samplePreviewCacheKey(photo);
      const current = state.previewCache.get(key);
      if (current && current.url && current.url !== url) URL.revokeObjectURL(current.url);
      state.previewCache.delete(key);
      state.previewCache.set(key, { url, photo: Object.assign({}, photo) });
      while (state.previewCache.size > 24) {
        const oldestKey = state.previewCache.keys().next().value;
        const oldest = state.previewCache.get(oldestKey);
        if (oldest && oldest.url) URL.revokeObjectURL(oldest.url);
        state.previewCache.delete(oldestKey);
      }
      syncPreviewThumbnailSelection();
    }

    function showCachedSample(photo) {
      const entry = state.previewCache.get(samplePreviewCacheKey(photo));
      if (!entry || !entry.url) return false;
      state.previewCache.delete(samplePreviewCacheKey(photo));
      state.previewCache.set(samplePreviewCacheKey(photo), entry);
      setPreviewPhoto(entry.photo, '已使用渲染缓存');
      setPreviewSource(entry.url);
      return true;
    }

    function setPreviewSource(src, objectUrl) {
      if (objectUrl) {
        revokePreviewObjectUrl();
        state.previewObjectUrl = objectUrl;
      } else {
        revokePreviewObjectUrl();
      }
      state.previewSource = String(src || '');
      config.showLightboxPreview(state.previewPhoto || state.photos[state.previewIndex] || null, state.previewSource);
    }

    function setPreviewLoading(loading, status) {
      const screen = ensureScreen();
      if (typeof config.setLightboxBusy === 'function') config.setLightboxBusy(!!loading);
      if (status !== undefined) screen.querySelector('[data-batch-preview-status]').textContent = String(status || '');
    }

    function setPreviewPhoto(photo, status) {
      const current = photo || {};
      const screen = ensureScreen();
      state.previewPhoto = photo || null;
      screen.querySelector('[data-batch-preview-filename]').textContent = current.filename || '未知图片';
      screen.querySelector('[data-batch-preview-detail]').textContent = [
        current.format_label || current.format || '',
        current.width && current.height ? current.width + ' × ' + current.height : '',
      ].filter(Boolean).join(' · ');
      if (status !== undefined) screen.querySelector('[data-batch-preview-status]').textContent = String(status || '');
    }

    function setActivePage(page) {
      const allowed = new Set(['adjust', 'frame', 'sync', 'output']);
      const next = allowed.has(page) ? page : 'adjust';
      state.activePage = next;
      const screen = ensureScreen();
      closePickers();
      screen.querySelectorAll('[data-batch-tab]').forEach((button) => {
        const active = button.dataset.batchTab === next;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      screen.querySelectorAll('[data-batch-page]').forEach((panel) => {
        panel.classList.toggle('hidden', panel.dataset.batchPage !== next);
      });
      const scroll = screen.querySelector('.batch-processing-side-scroll');
      if (scroll) scroll.scrollTop = 0;
    }

    function renderPreviewThumbnails() {
      const screen = ensureScreen();
      const list = screen.querySelector('[data-batch-preview-thumbnails]');
      list.innerHTML = '';
      state.photos.forEach((photo, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'batch-preview-thumbnail';
        button.dataset.batchPreviewIndex = String(index);
        button.title = photo.filename || ('图片 ' + (index + 1));
        const source = photo.preview_url || photo.lightbox_url || photo.original_url || '';
        if (source) {
          const image = document.createElement('img');
          image.src = source;
          image.alt = photo.filename || '';
          image.loading = 'eager';
          image.decoding = 'async';
          button.appendChild(image);
        } else {
          const placeholder = document.createElement('span');
          placeholder.textContent = String(photo.format_label || photo.format || '图片').toUpperCase();
          button.appendChild(placeholder);
        }
        const order = document.createElement('b');
        order.textContent = String(index + 1);
        button.appendChild(order);
        button.addEventListener('click', () => selectPreviewPhoto(index));
        list.appendChild(button);
      });
      syncPreviewThumbnailSelection();
    }

    function syncPreviewThumbnailSelection() {
      if (!state.screen) return;
      state.screen.querySelectorAll('[data-batch-preview-index]').forEach((button) => {
        const index = Number(button.dataset.batchPreviewIndex);
        const active = index === state.previewIndex;
        const photo = state.photos[index] || null;
        button.classList.toggle('active', active);
        button.classList.toggle('rendered', !!photo && state.previewCache.has(samplePreviewCacheKey(photo)));
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.disabled = state.running;
      });
    }

    function selectPreviewPhoto(index) {
      if (state.running) return;
      const next = Math.min(state.photos.length - 1, Math.max(0, Number(index || 0)));
      if (!state.photos[next]) return;
      state.previewIndex = next;
      cancelSamplePreview();
      syncPreviewThumbnailSelection();
      if (!showInitialSample()) scheduleSamplePreview(40);
    }

    function showInitialSample() {
      const photo = state.photos[state.previewIndex] || null;
      if (!photo) {
        setPreviewSource('');
        return false;
      }
      if (showCachedSample(photo)) return true;
      setPreviewPhoto(photo, '原始预览');
      setPreviewSource(photo.lightbox_url || photo.preview_url || photo.original_url || '');
      return false;
    }

    function cancelSamplePreview() {
      clearTimeout(state.previewTimer);
      state.previewTimer = null;
      state.previewToken += 1;
      if (state.previewAbortController) state.previewAbortController.abort();
      state.previewAbortController = null;
      setPreviewLoading(false);
    }

    function scheduleSamplePreview(delay) {
      cancelSamplePreview();
      if (state.running || !state.photos.length || !state.screen || state.screen.classList.contains('hidden')) return;
      if (showCachedSample(state.photos[state.previewIndex])) return;
      state.previewTimer = setTimeout(renderSamplePreview, Math.max(0, Number(delay || 0)));
    }

    async function renderSamplePreview() {
      if (state.running || !state.photos.length) return;
      const selectedPhoto = state.photos[state.previewIndex];
      if (showCachedSample(selectedPhoto)) return;
      const token = ++state.previewToken;
      const controller = new AbortController();
      state.previewAbortController = controller;
      setPreviewLoading(true, '准备样板');
      try {
        const photoRes = await config.call('get_batch_photo', Number(selectedPhoto.id));
        if (!photoRes || !photoRes.success || !photoRes.photo) {
          throw new Error(photoRes && photoRes.message ? photoRes.message : '样板图片读取失败');
        }
        let renderPhoto = photoRes.photo;
        if (!renderPhoto.is_raw) {
          const previewRes = await config.call('get_photo_lightbox_preview', Number(renderPhoto.id));
          if (!previewRes || !previewRes.success || !previewRes.photo || !previewRes.photo.lightbox_url) {
            throw new Error(previewRes && previewRes.message ? previewRes.message : '样板高清预览读取失败');
          }
          renderPhoto = Object.assign({}, renderPhoto, {
            original_url: String(previewRes.photo.lightbox_url || ''),
            width: 0,
            height: 0,
            orientation: '',
          });
        }
        const prepared = await Promise.all([
          config.prepareAdjustmentPreset(state.adjustmentId),
          config.prepareFramePreset(state.frameId),
        ]);
        let rendered = await config.renderer.render(renderPhoto, prepared[0], {
          format: 'png',
          quality: 100,
          preview: true,
          maxSide: 1600,
          signal: controller.signal,
          onProgress: (stage) => setPreviewLoading(true, stage),
        });
        if (prepared[1]) {
          rendered = await config.applyFrame(rendered, { format: 'png', quality: 100 }, prepared[1].frame, {
            photo: photoRes.photo,
            mime: 'image/png',
            onProgress: (stage) => setPreviewLoading(true, stage),
          });
        }
        if (token !== state.previewToken || controller.signal.aborted) return;
        const url = URL.createObjectURL(rendered.blob);
        const previewPhoto = Object.assign({}, photoRes.photo, {
          width: Number(rendered.outputWidth || photoRes.photo.width || 0),
          height: Number(rendered.outputHeight || photoRes.photo.height || 0),
          orientation: '',
        });
        cacheSamplePreview(previewPhoto, url);
        setPreviewPhoto(previewPhoto, '样板已更新');
        setPreviewSource(url);
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted || token !== state.previewToken) return;
        state.presetError = String((err && err.message) || err || '样板渲染失败');
        setPreviewPhoto(selectedPhoto, '样板渲染失败');
        syncControls();
      } finally {
        if (token === state.previewToken) {
          state.previewAbortController = null;
          setPreviewLoading(false);
        }
      }
    }

    async function loadPresets() {
      state.loadingPresets = true;
      state.presetError = '';
      syncControls();
      try {
        const results = await Promise.all([
          config.listAdjustmentPresets(),
          config.listFramePresets(),
        ]);
        state.adjustmentPresets = Array.isArray(results[0]) ? results[0] : [];
        state.framePresets = Array.isArray(results[1]) ? results[1] : [];
        if (state.adjustmentId && !selectedAdjustment()) state.adjustmentId = '';
        if (state.frameId && !selectedFrame()) state.frameId = '';
      } catch (err) {
        state.presetError = String((err && err.message) || err || '预设读取失败');
      } finally {
        state.loadingPresets = false;
        syncControls();
        scheduleSamplePreview(40);
      }
    }

    async function chooseFolder() {
      if (state.running) return;
      try {
        const res = await config.call('choose_export_folder');
        if (!res || !res.success) {
          if (!res || !res.cancelled) showToast(res && res.message ? res.message : '目录选择失败', 'error');
          return;
        }
        state.destination = String(res.path || '');
        syncSummary();
      } catch (err) {
        showToast(String((err && err.message) || '目录选择失败'), 'error');
      }
    }

    function resetRunState() {
      const screen = ensureScreen();
      state.cancelled = false;
      state.results = [];
      state.processed = 0;
      state.success = 0;
      state.failed = 0;
      screen.querySelector('[data-batch-config]').classList.remove('hidden');
      screen.querySelector('[data-batch-settings-tabs]').classList.remove('hidden');
      screen.querySelector('[data-batch-progress]').classList.add('hidden');
      screen.querySelector('[data-batch-result-list]').innerHTML = '';
      screen.querySelector('[data-batch-progress-bar]').style.width = '0%';
      screen.querySelector('[data-batch-cancel]').textContent = '取消任务';
      screen.querySelector('[data-batch-cancel]').disabled = false;
      screen.querySelector('[data-batch-cancel]').classList.add('hidden');
      screen.querySelector('[data-batch-start]').classList.remove('hidden');
      screen.querySelector('[data-batch-secondary]').classList.remove('hidden');
      screen.querySelector('[data-batch-secondary]').textContent = '关闭';
      screen.querySelector('[data-batch-close]').disabled = false;
    }

    function open(photos, openOptions) {
      if (state.running) return;
      state.photos = (Array.isArray(photos) ? photos : []).filter((photo) => Number(photo && photo.id || 0));
      state.editSessions = openOptions && openOptions.sessions instanceof Map ? new Map(openOptions.sessions) : new Map();
      if (!state.photos.length) return;
      state.previewIndex = 0;
      const screen = ensureScreen();
      resetRunState();
      screen.querySelector('[data-batch-subtitle]').textContent = '顺序处理所选图片';
      screen.querySelector('[data-batch-toolbar-count]').textContent = state.photos.length + ' 张';
      screen.querySelector('[data-batch-naming]').value = state.namingTemplate;
      screen.classList.remove('hidden');
      config.attachLightbox(screen.querySelector('[data-batch-lightbox-host]'));
      setActivePage(openOptions && openOptions.activePage ? openOptions.activePage : 'adjust');
      renderPreviewThumbnails();
      showInitialSample();
      syncControls();
      loadPresets();
    }

    function close() {
      if (!state.screen || state.running) return false;
      closePickers();
      cancelSamplePreview();
      config.detachLightbox();
      revokePreviewObjectUrl();
      clearSamplePreviewCache();
      state.screen.classList.add('hidden');
      return true;
    }

    function cancel() {
      if (!state.running || !state.abortController) return;
      state.cancelled = true;
      state.abortController.abort();
      const button = state.screen.querySelector('[data-batch-cancel]');
      button.disabled = true;
      button.textContent = '正在取消';
    }

    function setItemProgress(index, stage, percent, detail) {
      const screen = ensureScreen();
      const total = Math.max(1, state.photos.length);
      const ratio = Math.min(1, Math.max(0, Number(percent || 0) / 100));
      const overall = ((index + ratio) / total) * 100;
      screen.querySelector('[data-batch-progress-bar]').style.width = overall.toFixed(2) + '%';
      screen.querySelector('[data-batch-current-stage]').textContent = [stage, detail].filter(Boolean).join(' · ');
      screen.querySelector('[data-batch-preview-status]').textContent = String(stage || '处理中');
    }

    function syncProgress() {
      if (!state.screen) return;
      state.screen.querySelector('[data-batch-progress-total]').textContent = state.processed + ' / ' + state.photos.length;
      state.screen.querySelector('[data-batch-progress-success]').textContent = '成功 ' + state.success;
      state.screen.querySelector('[data-batch-progress-failed]').textContent = '失败 ' + state.failed;
    }

    function renderResults() {
      const list = ensureScreen().querySelector('[data-batch-result-list]');
      list.innerHTML = '';
      state.results.forEach((result) => {
        const row = document.createElement('div');
        row.className = 'batch-result-item ' + (result.success ? 'success' : 'failed');
        const stateText = document.createElement('b');
        stateText.textContent = result.success ? '成功' : '失败';
        const content = document.createElement('span');
        const filename = document.createElement('strong');
        filename.textContent = result.filename || '未知图片';
        const detail = document.createElement('em');
        detail.textContent = result.success ? result.path : result.message;
        content.appendChild(filename);
        content.appendChild(detail);
        row.appendChild(stateText);
        row.appendChild(content);
        list.appendChild(row);
      });
    }

    function recordResult(photo, result) {
      const success = !!(result && result.success);
      state.results.push({
        success,
        filename: String(photo && photo.filename || result && result.filename || ''),
        path: String(result && result.path || ''),
        message: String(result && result.message || (success ? '处理完成' : '处理失败')),
      });
      state.processed += 1;
      if (success) state.success += 1;
      else state.failed += 1;
      syncProgress();
      renderResults();
    }

    async function validateOutputSettings() {
      state.validating = true;
      syncSummary();
      try {
        const validation = await config.call(
          'validate_batch_output_settings',
          state.destination,
          state.format,
          state.namingTemplate,
        );
        if (!validation || !validation.success) {
          throw new Error(validation && validation.message ? validation.message : '批量输出设置无效');
        }
        state.destination = String(validation.destination || state.destination);
        state.namingTemplate = String(validation.naming_template || state.namingTemplate);
        return true;
      } catch (err) {
        showToast(String((err && err.message) || err || '批量输出设置验证失败'), 'error');
        return false;
      } finally {
        state.validating = false;
        syncSummary();
      }
    }

    async function start() {
      if (state.running || state.validating) return;
      if (!state.destination || !String(state.namingTemplate || '').trim()) {
        showToast('请先填写保存目录和命名模板', 'error');
        return;
      }
      if (!(await validateOutputSettings())) return;

      state.running = true;
      state.cancelled = false;
      state.abortController = new AbortController();
      const signal = state.abortController.signal;
      const screen = ensureScreen();
      cancelSamplePreview();
      screen.querySelector('[data-batch-config]').classList.add('hidden');
      screen.querySelector('[data-batch-settings-tabs]').classList.add('hidden');
      screen.querySelector('[data-batch-progress]').classList.remove('hidden');
      screen.querySelector('[data-batch-start]').classList.add('hidden');
      screen.querySelector('[data-batch-cancel]').classList.remove('hidden');
      screen.querySelector('[data-batch-secondary]').classList.add('hidden');
      screen.querySelector('[data-batch-close]').disabled = true;
      syncControls();

      console.info('[PicScannerBatch] start', {
        count: state.photos.length,
        independentSessions: state.editSessions.size,
        format: state.format,
        destination: state.destination,
        completeMetadata: state.preserveExif,
      });

      for (let index = 0; index < state.photos.length; index += 1) {
        if (signal.aborted) break;
        const selectedPhoto = state.photos[index];
        state.previewIndex = index;
        syncPreviewThumbnailSelection();
        screen.querySelector('[data-batch-current-file]').textContent = selectedPhoto.filename || ('图片 ' + selectedPhoto.id);
        setPreviewPhoto(selectedPhoto, '读取图片');
        setPreviewSource(selectedPhoto.lightbox_url || selectedPhoto.preview_url || selectedPhoto.original_url || '');
        setItemProgress(index, '读取图片', 1, '');
        try {
          const editSession = state.editSessions.get(Number(selectedPhoto.id)) || null;
          const adjustment = editSession && typeof config.prepareAdjustmentSession === 'function'
            ? await config.prepareAdjustmentSession(editSession)
            : await config.prepareAdjustmentPreset(state.adjustmentId);
          const frame = editSession && typeof config.prepareFrameSession === 'function'
            ? await config.prepareFrameSession(editSession)
            : await config.prepareFramePreset(state.frameId);
          const photoRes = await config.call('get_batch_photo', Number(selectedPhoto.id));
          if (!photoRes || !photoRes.success || !photoRes.photo) {
            throw new Error(photoRes && photoRes.message ? photoRes.message : '图片信息读取失败');
          }
          const photo = photoRes.photo;
          let rendered = await config.renderer.render(photo, adjustment, {
            format: state.format,
            quality: state.quality,
            session: editSession,
            signal,
            onProgress: (stage, percent, detail) => setItemProgress(index, stage, percent, detail),
          });
          if (frame) {
            rendered = await config.applyFrame(rendered, {
              format: state.format,
              quality: state.quality,
            }, frame.frame, {
              photo,
              mime: state.format === 'jpg' ? 'image/jpeg' : 'image/png',
              onProgress: (stage, percent, detail) => setItemProgress(index, stage, percent, detail),
            });
          }
          if (!rendered || !rendered.blob) throw new Error('批量渲染没有返回图片数据');
          const previewUrl = URL.createObjectURL(rendered.blob);
          setPreviewPhoto(Object.assign({}, photo, {
            width: Number(rendered.outputWidth || photo.width || 0),
            height: Number(rendered.outputHeight || photo.height || 0),
            orientation: '',
          }), '准备写入');
          setPreviewSource(previewUrl, previewUrl);
          setItemProgress(index, '整理图片数据', 92, rendered.mime || '');
          const dataUrl = await blobToDataUrl(rendered.blob, signal);
          setItemProgress(index, '写入文件', 97, '');
          const saveRes = await config.call(
            'save_batch_processed_image',
            dataUrl,
            state.destination,
            Number(photo.id),
            state.format,
            state.quality,
            state.preserveExif,
            state.namingTemplate,
          );
          if (!saveRes || !saveRes.success) {
            throw new Error(saveRes && saveRes.message ? saveRes.message : '批量文件保存失败');
          }
          recordResult(photo, saveRes);
          console.info('[PicScannerBatch] item complete', { photoId: photo.id, output: saveRes.path });
        } catch (err) {
          if (isAbortError(err) || signal.aborted) break;
          const message = String((err && err.message) || err || '处理失败');
          recordResult(selectedPhoto, { success: false, message });
          setPreviewPhoto(selectedPhoto, '处理失败');
          console.error('[PicScannerBatch] item failed', {
            photoId: selectedPhoto.id,
            filename: selectedPhoto.filename,
            error: message,
          });
        }
      }

      state.running = false;
      state.abortController = null;
      syncPreviewThumbnailSelection();
      screen.querySelector('[data-batch-progress-bar]').style.width = '100%';
      screen.querySelector('[data-batch-current-file]').textContent = state.cancelled ? '任务已取消' : '批量处理完成';
      const unprocessed = Math.max(0, state.photos.length - state.processed);
      const finalText = state.cancelled
        ? ('成功 ' + state.success + ' · 失败 ' + state.failed + ' · 未处理 ' + unprocessed)
        : ('成功 ' + state.success + ' · 失败 ' + state.failed);
      screen.querySelector('[data-batch-current-stage]').textContent = finalText;
      screen.querySelector('[data-batch-preview-status]').textContent = finalText;
      screen.querySelector('[data-batch-cancel]').classList.add('hidden');
      screen.querySelector('[data-batch-secondary]').classList.remove('hidden');
      screen.querySelector('[data-batch-secondary]').textContent = '关闭';
      screen.querySelector('[data-batch-close]').disabled = false;
      console.info('[PicScannerBatch] finished', {
        cancelled: state.cancelled,
        success: state.success,
        failed: state.failed,
        unprocessed,
      });
      showToast(state.cancelled ? '批量任务已取消' : ('批量处理完成：成功 ' + state.success + '，失败 ' + state.failed), state.failed ? 'error' : 'info');
    }

    return {
      open,
      close,
      cancel,
      handleKeydown(ev) {
        if (!state.screen || state.screen.classList.contains('hidden')) return false;
        if (!state.running && !isTypingTarget(document.activeElement) && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
          const direction = ev.key === 'ArrowLeft' ? -1 : 1;
          const next = Math.min(state.photos.length - 1, Math.max(0, state.previewIndex + direction));
          if (next !== state.previewIndex) selectPreviewPhoto(next);
          ev.preventDefault();
          ev.stopPropagation();
          return true;
        }
        if (ev.key !== 'Escape') return false;
        if (!state.running) close();
        ev.preventDefault();
        ev.stopPropagation();
        return true;
      },
      isOpen() {
        return !!state.screen && !state.screen.classList.contains('hidden');
      },
      isRunning() {
        return state.running;
      },
    };
  }

  window.PicScannerBatchProcessing = { create };
})();
