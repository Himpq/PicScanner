(function (PS) {
  const state = PS.state;
  const els = PS.els;
  const lightboxHomeParent = PS.lightboxHomeParent;
  const lightboxHomeNextSibling = PS.lightboxHomeNextSibling;
  const call = PS.call;
  const show = PS.show;
  const hide = PS.hide;
  const text = PS.text;
  const clamp = PS.clamp;
  const joinClean = PS.joinClean;
  const escapeHtml = PS.escapeHtml;
  const LIGHTBOX_MIN_ZOOM = PS.LIGHTBOX_MIN_ZOOM;
  const LIGHTBOX_MAX_ZOOM = PS.LIGHTBOX_MAX_ZOOM;
  const LIGHTBOX_ZOOM_STEP = PS.LIGHTBOX_ZOOM_STEP;
  const LIGHTBOX_NAV_HOVER_WIDTH = PS.LIGHTBOX_NAV_HOVER_WIDTH;
  const LIGHTBOX_INFO_MIN_WIDTH = PS.LIGHTBOX_INFO_MIN_WIDTH;
  const LIGHTBOX_INFO_MAX_WIDTH = PS.LIGHTBOX_INFO_MAX_WIDTH;
  const LIGHTBOX_INFO_MIN_HEIGHT = PS.LIGHTBOX_INFO_MIN_HEIGHT;
  const LIGHTBOX_INFO_MAX_HEIGHT = PS.LIGHTBOX_INFO_MAX_HEIGHT;

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
    const photoId = PS.comparePhotoId(photo);
    const merged = Object.assign({}, photoId ? (state.photoCache.get(photoId) || {}) : {}, pane.photo || {}, photo);
    pane.photo = merged;
    if (photoId) {
      state.photoCache.set(photoId, merged);
      const selectedIndex = PS.compareSelectedIndex(photoId);
      if (selectedIndex >= 0) state.compare.selected[selectedIndex] = merged;
    }
    updateCompareInfoPanel(index);
    return merged;
  }

  function loadCompareExif(index, photo) {
    const photoId = PS.comparePhotoId(photo);
    if (!photoId) return;
    const applyPhoto = (full) => {
      if (!state.compare.lightbox) return;
      const pane = state.compare.panes[index];
      if (!pane || PS.comparePhotoId(pane.photo) !== photoId) return;
      const merged = mergeComparePanePhoto(index, full);
      if (merged) {
        state.exifCache.set(photoId, merged);
        updateCompareView();
        PS.updateCompareCardHighlights();
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
      if (PS.comparePhotoId(pane.photo) === photoId) {
        mergeComparePanePhoto(index, merged);
      }
    });
    const card = els.gallery.querySelector('[data-photo-id="' + photoId + '"]');
    if (card) PS.updatePhotoCardMeta(card, merged, true);
    return merged;
  }

  function warmLightboxCache(photo) {
    const photoId = PS.comparePhotoId(photo);
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
    const photoId = PS.comparePhotoId(photo);
    const cachedPhoto = state.photoCache.get(photoId) || photo;
    const localUrl = lightboxLocalUrl(photo, cachedPhoto);
    const url = lightboxSourceUrl(photo, cachedPhoto);
    const previewUrl = photo.preview_url || cachedPhoto.preview_url || '';
    const previewable = !!(photo.previewable || cachedPhoto.previewable);
    const isCurrent = () => (
      state.compare.lightbox
      && token === pane.loadToken
      && pane.photo
      && PS.comparePhotoId(pane.photo) === photoId
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
        PS.renderComparePanel();
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
    // 缩小时向灯箱中心收缩，不以鼠标位置为锚点
    const effectiveAnchor = ratio < 1 ? null : anchorEvent;
    let anchorRatioX = 0;
    let anchorRatioY = 0;
    if (effectiveAnchor) {
      const sourceEl = comparePaneEl(index);
      const sourceRect = sourceEl ? sourceEl.getBoundingClientRect() : els.lightboxStage.getBoundingClientRect();
      const sourceLocalX = effectiveAnchor.clientX - sourceRect.left - sourceRect.width / 2;
      const sourceLocalY = effectiveAnchor.clientY - sourceRect.top - sourceRect.height / 2;
      anchorRatioX = sourceRect.width ? sourceLocalX / (sourceRect.width / 2) : 0;
      anchorRatioY = sourceRect.height ? sourceLocalY / (sourceRect.height / 2) : 0;
    }
    const applyOne = (pane, paneIndex) => {
      const before = pane.zoom || 1;
      const after = clamp(before * ratio, LIGHTBOX_MIN_ZOOM, LIGHTBOX_MAX_ZOOM);
      const actualRatio = after / before;
      if (effectiveAnchor) {
        const el = comparePaneEl(paneIndex);
        const rect = el ? el.getBoundingClientRect() : els.lightboxStage.getBoundingClientRect();
        const localX = anchorRatioX * rect.width / 2;
        const localY = anchorRatioY * rect.height / 2;
        pane.panX = localX - (localX - pane.panX) * actualRatio;
        pane.panY = localY - (localY - pane.panY) * actualRatio;
      } else {
        // 无锚点（含缩小回中）：缩小时用更快的衰减增强向中心的拉力
        const panDecay = actualRatio < 1 ? actualRatio * actualRatio : actualRatio;
        pane.panX *= panDecay;
        pane.panY *= panDecay;
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
    const photos = state.compare.selected.map(PS.currentComparePhoto).filter(PS.comparePhotoReady);
    if (photos.length < 2) return;
    state.compare.selected = [photos[0], photos[1]];
    PS.closeSearchPanel();
    clearTimeout(PS.hoverTimer);
    PS.hoverCard = null;
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
    PS.updateCompareCardHighlights();
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
    if (window.PicScannerVue && window.PicScannerVue.mountLightboxInfo) {
      window.PicScannerVue.mountLightboxInfo(els.lightboxInfoBody, photo);
    } else {
      els.lightboxInfoBody.innerHTML = lightboxShotSummaryHtml(photo) +
        '<div class="lightbox-info-details"><div class="exif-grid">' +
        lightboxInfoRows(photo).map((row) => '<span>' + escapeHtml(row[0]) + '</span><span>' + escapeHtml(text(row[1], '未知')) + '</span>').join('') +
        '</div></div>';
    }
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
    const clean = PS.normalizeLightboxInfoSize(size);
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
        resizeLightboxInfoToVisibleContent(true);
        return;
      }
      expandLightboxInfoToDetails();
    });
  }

  function resizeLightboxInfoToVisibleContent(allowShrink) {
    if (!els.lightboxInfo || !els.lightboxInfoBody || !els.lightboxInfoHead) return;
    if (els.lightboxInfo.classList.contains('hidden')) return;
    const headHeight = Math.ceil(els.lightboxInfoHead.getBoundingClientRect().height || 34);
    const bodyHeight = Math.ceil(els.lightboxInfoBody.scrollHeight || els.lightboxInfoBody.getBoundingClientRect().height || 0);
    const borderHeight = Math.max(0, els.lightboxInfo.offsetHeight - els.lightboxInfo.clientHeight);
    const maxHeight = Math.min(LIGHTBOX_INFO_MAX_HEIGHT, window.innerHeight - 90);
    const targetHeight = Math.round(clamp(headHeight + bodyHeight + borderHeight, LIGHTBOX_INFO_MIN_HEIGHT, maxHeight));
    const currentHeight = els.lightboxInfo.getBoundingClientRect().height;
    if ((allowShrink && Math.abs(targetHeight - currentHeight) > 1) || targetHeight > currentHeight + 1) {
      els.lightboxInfo.style.height = targetHeight + 'px';
    }
    clampLightboxInfoPosition();
  }

  function expandLightboxInfoToDetails() {
    resizeLightboxInfoToVisibleContent(false);
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
    const oldZoom = Number(box.zoom || 1);
    const zoomingOut = Number.isFinite(Number(nextZoom)) && Number(nextZoom) < oldZoom;
    const view = PS.resolveAnchoredZoomView({
      currentZoom: oldZoom,
      nextZoom,
      minZoom: LIGHTBOX_MIN_ZOOM,
      maxZoom: LIGHTBOX_MAX_ZOOM,
      panX: box.panX,
      panY: box.panY,
      anchorEvent: zoomingOut ? null : anchorEvent,
      anchorCenter: zoomingOut,
      centerPullExponent: zoomingOut ? 2 : 1,
      stage: els.lightboxStage,
      resetAtOrBelowZoom: 1,
    });
    if (Math.abs(view.zoom - oldZoom) < 0.0001) return;
    box.zoom = view.zoom;
    box.panX = view.panX;
    box.panY = view.panY;
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
    const embedded = state.lightbox.embedded;
    const titlebar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--titlebar-h')) || 36;
    const maxWidth = embedded
      ? Math.max(1, Number(els.lightboxStage.clientWidth || 0) - 32)
      : Math.max(1, window.innerWidth - 56);
    const maxHeight = embedded
      ? Math.max(1, Number(els.lightboxStage.clientHeight || 0) - 32)
      : Math.max(1, window.innerHeight - titlebar - 116);
    const fit = Math.min(maxWidth / rawWidth, maxHeight / rawHeight);
    const scale = embedded || (options && options.allowUpscale) ? fit : Math.min(1, fit);
    els.lightboxImg.style.width = Math.max(1, rawWidth * scale).toFixed(2) + 'px';
    els.lightboxImg.style.height = Math.max(1, rawHeight * scale).toFixed(2) + 'px';
  }

  function loadLightboxImage(photo) {
    const token = ++state.lightbox.loadToken;
    const transientPreview = !!(photo && photo.batch_preview);
    const cachedPhoto = transientPreview ? photo : (state.photoCache.get(Number(photo.id || 0)) || photo);
    const localUrl = lightboxLocalUrl(photo, cachedPhoto);
    const url = lightboxSourceUrl(photo, cachedPhoto);
    const thumbnailUrl = transientPreview ? '' : (photo.preview_url || cachedPhoto.preview_url || '');
    const previewUrl = thumbnailUrl && thumbnailUrl !== url
      ? thumbnailUrl
      : '';
    const photoId = Number(photo.id || 0);
    const previewable = !!(photo.previewable || cachedPhoto.previewable);
    const keepCurrentImage = state.lightbox.embedded && transientPreview;
    const isCurrent = () => (
      token === state.lightbox.loadToken
      && state.lightbox.photo
      && Number(state.lightbox.photo.id || 0) === photoId
    );
    els.lightboxImg.onload = null;
    els.lightboxImg.onerror = null;
    els.lightboxImg.alt = keepCurrentImage ? '' : (photo.filename || '');
    if (!keepCurrentImage) els.lightboxImg.removeAttribute('src');
    if (!transientPreview && url && !localUrl) warmLightboxCache(cachedPhoto);
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
          if (img && !PS.imageHasSource(img)) img.src = merged.preview_url;
          PS.updatePhotoCardMeta(card, merged, true);
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
    } else if (keepCurrentImage) {
      els.lightbox.classList.remove('loading', 'previewing');
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
    const photoId = PS.comparePhotoId(pane && pane.photo);
    if (!photoId) return -1;
    return cards.findIndex((card) => Number(card.dataset.photoId || 0) === photoId);
  }

  function compareNavigableTargetIndex(paneIndex, direction, cards) {
    const start = compareLightboxCardIndex(paneIndex, cards);
    if (start < 0) return -1;
    const otherPane = paneIndex === 0 ? 1 : 0;
    const occupiedId = PS.comparePhotoId(state.compare.panes[otherPane] && state.compare.panes[otherPane].photo);
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
    if (!PS.comparePhotoReady(photo)) {
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
    PS.updateCompareCardHighlights();
  }

  function updateLightboxNavButtons() {
    if (!els.lightboxPrev || !els.lightboxNext) return;
    if (state.lightbox.embedded) {
      els.lightboxPrev.disabled = true;
      els.lightboxNext.disabled = true;
      return;
    }
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
    if (state.lightbox.embedded) return;
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

  function attachBatchLightbox(host) {
    if (!host) throw new Error('批量处理灯箱缺少挂载容器');
    if (state.lightbox.embedded && els.lightbox.parentNode === host) return;
    if (!els.lightbox.classList.contains('hidden')) closeLightbox();
    state.lightbox.embedded = true;
    els.lightbox.classList.add('embedded');
    host.appendChild(els.lightbox);
    show(els.lightbox);
    setLightboxInfoVisible(false, { save: false });
    updateLightboxNavButtons();
  }

  function showBatchLightboxPreview(photo, sourceUrl) {
    if (!state.lightbox.embedded) throw new Error('批量处理灯箱尚未挂载');
    const src = String(sourceUrl || '');
    if (!photo || !src) {
      state.lightbox.loadToken += 1;
      state.lightbox.photo = null;
      els.lightboxImg.removeAttribute('src');
      els.lightboxImg.style.width = '';
      els.lightboxImg.style.height = '';
      els.lightbox.classList.remove('loading', 'previewing');
      updateLightboxView();
      return;
    }
    const previewPhoto = Object.assign({}, photo, {
      lightbox_url: src,
      original_url: src,
      preview_url: '',
      previewable: true,
      width: 0,
      height: 0,
      orientation: '',
      batch_preview: true,
    });
    state.lightbox.photo = previewPhoto;
    state.lightbox.zoom = 1;
    state.lightbox.panX = 0;
    state.lightbox.panY = 0;
    state.lightbox.dragging = false;
    state.lightbox.dragMoved = false;
    state.lightbox.suppressCloseUntil = 0;
    show(els.lightbox);
    setLightboxInfoVisible(false, { save: false });
    updateLightboxView();
    loadLightboxImage(previewPhoto);
    updateLightboxNavButtons();
  }

  function setBatchLightboxBusy(loading) {
    els.lightbox.classList.toggle('batch-rendering', state.lightbox.embedded && !!loading);
  }

  function detachBatchLightbox() {
    if (!state.lightbox.embedded) return;
    state.lightbox.embedded = false;
    els.lightbox.classList.remove('embedded', 'batch-rendering');
    closeLightbox();
    const anchor = lightboxHomeNextSibling && lightboxHomeNextSibling.parentNode === lightboxHomeParent
      ? lightboxHomeNextSibling
      : null;
    lightboxHomeParent.insertBefore(els.lightbox, anchor);
  }

  function openLightbox(photo, options) {
    if (!photo || !(photo.original_url || photo.lightbox_url || photo.preview_url || photo.previewable)) return;
    PS.closeSearchPanel();
    clearTimeout(PS.hoverTimer);
    PS.hoverCard = null;
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
    if (state.lightbox.embedded) return;
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
    PS.updateCompareCardHighlights();
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
      return res.photo;
    });
    els.exifPop.innerHTML = '<div class="exif-title">读取 EXIF...</div>';
    positionExif(ev);
    show(els.exifPop);
    ready.then((full) => {
      if (PS.hoverCard !== card || !card.isConnected) return;
      const current = state.photoCache.get(photoId) || {};
      const merged = Object.assign({}, current, full, {
        favorite: !!current.favorite,
        note: String(current.note || ''),
        category: String(current.category || ''),
      });
      state.exifCache.set(photoId, merged);
      state.photoCache.set(photoId, merged);
      PS.updatePhotoCardMeta(card, merged, true);
      els.exifPop.innerHTML = exifHtml(merged);
      positionExif(ev);
    }).catch((err) => {
      if (PS.hoverCard !== card || !card.isConnected) return;
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


  PS.formatZoomValue = formatZoomValue;
  PS.currentLightboxZoom = currentLightboxZoom;
  PS.parseZoomInput = parseZoomInput;
  PS.applyZoomInput = applyZoomInput;
  PS.formatMmValue = formatMmValue;
  PS.lightboxFocalText = lightboxFocalText;
  PS.isApscFocal = isApscFocal;
  PS.lightboxApscFocalText = lightboxApscFocalText;
  PS.comparePaneEl = comparePaneEl;
  PS.compareImgEl = compareImgEl;
  PS.compareInfoEl = compareInfoEl;
  PS.compareInfoBodyEl = compareInfoBodyEl;
  PS.defaultCompareInfoPosition = defaultCompareInfoPosition;
  PS.compareInfoPosition = compareInfoPosition;
  PS.compareInfoHtml = compareInfoHtml;
  PS.updateCompareInfoPanel = updateCompareInfoPanel;
  PS.updateCompareInfoPanels = updateCompareInfoPanels;
  PS.clampCompareInfoPosition = clampCompareInfoPosition;
  PS.clampCompareInfoPositions = clampCompareInfoPositions;
  PS.setCompareInfoVisible = setCompareInfoVisible;
  PS.mergeComparePanePhoto = mergeComparePanePhoto;
  PS.loadCompareExif = loadCompareExif;
  PS.lightboxLocalUrl = lightboxLocalUrl;
  PS.lightboxSourceUrl = lightboxSourceUrl;
  PS.mergeLightboxCachePhoto = mergeLightboxCachePhoto;
  PS.warmLightboxCache = warmLightboxCache;
  PS.comparePaneFromEvent = comparePaneFromEvent;
  PS.resetComparePane = resetComparePane;
  PS.updateCompareView = updateCompareView;
  PS.loadCompareImage = loadCompareImage;
  PS.applyCompareZoom = applyCompareZoom;
  PS.openCompareLightbox = openCompareLightbox;
  PS.updateLightboxView = updateLightboxView;
  PS.lightboxInfoRows = lightboxInfoRows;
  PS.formatPixelDimensions = formatPixelDimensions;
  PS.formatStandardDateTime = formatStandardDateTime;
  PS.lightboxShotSummary = lightboxShotSummary;
  PS.lightboxShotSummaryHtml = lightboxShotSummaryHtml;
  PS.updateLightboxInfo = updateLightboxInfo;
  PS.setLightboxInfoVisible = setLightboxInfoVisible;
  PS.setLightboxInfoDetailsCollapsed = setLightboxInfoDetailsCollapsed;
  PS.applyLightboxInfoSize = applyLightboxInfoSize;
  PS.currentLightboxInfoSize = currentLightboxInfoSize;
  PS.saveLightboxInfoSize = saveLightboxInfoSize;
  PS.scheduleLightboxInfoLayout = scheduleLightboxInfoLayout;
  PS.resizeLightboxInfoToVisibleContent = resizeLightboxInfoToVisibleContent;
  PS.expandLightboxInfoToDetails = expandLightboxInfoToDetails;
  PS.clampLightboxInfoPosition = clampLightboxInfoPosition;
  PS.defaultLightboxInfoPosition = defaultLightboxInfoPosition;
  PS.restoreLightboxInfoPosition = restoreLightboxInfoPosition;
  PS.saveLightboxInfoPosition = saveLightboxInfoPosition;
  PS.setLightboxNavHover = setLightboxNavHover;
  PS.updateLightboxNavHover = updateLightboxNavHover;
  PS.onLightboxInfoPointerDown = onLightboxInfoPointerDown;
  PS.onLightboxInfoResizePointerDown = onLightboxInfoResizePointerDown;
  PS.onLightboxInfoPointerMove = onLightboxInfoPointerMove;
  PS.resizeLightboxInfoFromPointer = resizeLightboxInfoFromPointer;
  PS.endLightboxInfoDrag = endLightboxInfoDrag;
  PS.onCompareInfoPointerDown = onCompareInfoPointerDown;
  PS.onCompareInfoPointerMove = onCompareInfoPointerMove;
  PS.endCompareInfoDrag = endCompareInfoDrag;
  PS.setLightboxZoom = setLightboxZoom;
  PS.orientationSwapsSize = orientationSwapsSize;
  PS.lightboxImageBasis = lightboxImageBasis;
  PS.applyLightboxImageDisplaySize = applyLightboxImageDisplaySize;
  PS.loadLightboxImage = loadLightboxImage;
  PS.lightboxOpenableCards = lightboxOpenableCards;
  PS.currentLightboxCardIndex = currentLightboxCardIndex;
  PS.compareLightboxCardIndex = compareLightboxCardIndex;
  PS.compareNavigableTargetIndex = compareNavigableTargetIndex;
  PS.navigateCompareLightbox = navigateCompareLightbox;
  PS.updateLightboxNavButtons = updateLightboxNavButtons;
  PS.navigateLightbox = navigateLightbox;
  PS.attachBatchLightbox = attachBatchLightbox;
  PS.showBatchLightboxPreview = showBatchLightboxPreview;
  PS.setBatchLightboxBusy = setBatchLightboxBusy;
  PS.detachBatchLightbox = detachBatchLightbox;
  PS.openLightbox = openLightbox;
  PS.closeLightbox = closeLightbox;
  PS.onLightboxWheel = onLightboxWheel;
  PS.onLightboxDoubleClick = onLightboxDoubleClick;
  PS.onLightboxPointerDown = onLightboxPointerDown;
  PS.onLightboxPointerMove = onLightboxPointerMove;
  PS.endLightboxDrag = endLightboxDrag;
  PS.showExif = showExif;
  PS.positionExif = positionExif;
  PS.exifHtml = exifHtml;
  PS.formatFocal = formatFocal;
})(window.PS);
