(function (PS) {
  const state = PS.state;
  const els = PS.els;
  const api = PS.api;
  const call = PS.call;
  const show = PS.show;
  const hide = PS.hide;
  const showToast = PS.showToast;
  const openTextInput = PS.openTextInput;
  const text = PS.text;
  const clamp = PS.clamp;
  const scanStatusLabel = PS.scanStatusLabel;
  const exifStatusLabel = PS.exifStatusLabel;
  const quickEditPerfLog = PS.quickEditPerfLog;
  const quickEditPerfNow = PS.quickEditPerfNow;
  const quickEditPerfEnabled = PS.quickEditPerfEnabled;
  const SORT_OPTIONS = PS.SORT_OPTIONS;
  const SETTINGS_TABS = PS.SETTINGS_TABS;
  const PROJECT_URL = PS.PROJECT_URL;
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
  const HIDDEN_CATEGORY = PS.HIDDEN_CATEGORY;
  const DATE_RAIL_LOAD_LIMIT = PS.DATE_RAIL_LOAD_LIMIT;
  const INITIAL_PHOTO_LIMIT = PS.INITIAL_PHOTO_LIMIT;
  const PHOTO_LOAD_BATCH = PS.PHOTO_LOAD_BATCH;
  const GALLERY_ITEM_SIZE_WHEEL_SCALE = PS.GALLERY_ITEM_SIZE_WHEEL_SCALE;
  const SEARCH_DEBOUNCE_MS = PS.SEARCH_DEBOUNCE_MS;

  function syncBatchSelectionSource() {
    if (PS.batchSelectionController) PS.batchSelectionController.setSource(state.currentSourceId || '');
  }

  function beginScan() {
    if (!state.selectedSource) return;
    hide(els.confirmModal);
    hide(els.sourceScreen);
    show(els.workspace);
    PS.playWorkspaceEnter();
    els.currentSource.textContent = state.selectedSource.path;
    state.currentRootPath = state.selectedSource.path;
    state.currentSourceId = state.selectedSource.source_id || (state.selectedSource.summary && state.selectedSource.summary.source_id) || '';
    syncBatchSelectionSource();
    state.scanRunning = true;
    state.scanStoppedByUser = false;
    resetSourceFilterContext();
    PS.resetGallery();
    call('start_scan', state.selectedSource.path).then((res) => {
      if (res && res.source_id) {
        state.currentSourceId = res.source_id;
        syncBatchSelectionSource();
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

  // P1 真源代理之后，state.sortKey 读的是 Pinia 的值。
  // 「拿入参跟 state 比」的幂等守卫因此被打破：调用方只要先写了 Pinia
  // （或经代理写了 state.sortKey），`sortKey === state.sortKey` 就永远成立，
  // 下面的 resetGallery / loadOlderDates 再也不执行 —— 表现为「点了排序没反应」。
  //
  // 改法：守卫改为跟 legacy 自己「上次真正应用过的值」比，不依赖 state 的读写时序。
  // 这样无论调用方先赋值还是后赋值，行为都正确。
  let appliedSortKey = null;

  function applySort(sortKey) {
    if (!SORT_OPTIONS.some((item) => item.key === sortKey)) throw new Error('未知排序方式: ' + sortKey);
    setSortOpen(false);
    if (sortKey === appliedSortKey) return;
    appliedSortKey = sortKey;
    state.sortKey = sortKey;
    renderSortMenu();
    PS.resetGallery();
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
    if (state.dates && state.dates.length) updateAllDateReserves();
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
        PS.applyLightboxInfoSize(size);
      } else if (config.lightbox_info_size != null) {
        console.warn('[PicScanner] 参数面板尺寸配置格式错误', config.lightbox_info_size);
      }
    }
    if (Object.prototype.hasOwnProperty.call(config, 'lightbox_info_details_collapsed')) {
      PS.setLightboxInfoDetailsCollapsed(config.lightbox_info_details_collapsed === true, { save: false });
    }
    if (Object.prototype.hasOwnProperty.call(config, 'quick_edit_collapsed_sections')) {
      PS.setQuickEditCollapsedSections(config.quick_edit_collapsed_sections, { save: false });
    }
  }

  function normalizeFilter(filter) {
    const raw = filter || {};
    const clean = {};
    if (raw.favorite) clean.favorite = true;
    if (raw.hidden) clean.hidden = true;
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
    if (state.activeCategory === HIDDEN_CATEGORY) {
      filter.hidden = true;
    } else if (state.activeCategory === FAVORITE_CATEGORY) {
      filter.favorite = true;
    } else if (state.activeCategory !== null) {
      filter.category = String(state.activeCategory || '');
    }
    return Object.keys(filter).length ? filter : null;
  }

  function viewedCategoryKey(categoryName) {
    if (categoryName === FAVORITE_CATEGORY) return '__favorite__';
    if (categoryName === HIDDEN_CATEGORY) return '__hidden__';
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
    PS.resetGallery();
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
    PS.resetGallery();
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

    const hidden = document.createElement('button');
    hidden.type = 'button';
    hidden.className = 'category-item category-hidden';
    hidden.classList.toggle('active', state.activeCategory === HIDDEN_CATEGORY);
    hidden.innerHTML = '<span>隐藏</span><b></b>';
    hidden.querySelector('b').textContent = Number(state.hiddenCount || 0);
    hidden.addEventListener('click', () => setActiveCategory(HIDDEN_CATEGORY));
    hidden.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    });
    els.categoryList.appendChild(hidden);

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
      state.hiddenCount = 0;
      renderCategoryList();
      return Promise.resolve([]);
    }
    return call('list_categories', state.currentSourceId).then((res) => {
      if (!res || !res.success) throw new Error(res && res.message ? res.message : '读取分类失败');
      state.categories = res.categories || [];
      state.favoriteCount = Number(res.favorite_count || 0);
      state.hiddenCount = Number(res.hidden_count || 0);
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
    PS.resetGallery();
    els.galleryScroll.scrollTo({ top: 0 });
    PS.restoreLastViewedPosition(viewedPositionForCategory(state.activeCategory));
    loadOlderDates({ allowScanRequest: false }).then(() => {
      schedulePlaceholderPhotoFill();
      scheduleVisiblePreviewCheck();
    });
  }

  // 同 applySort：代理之后不能再拿入参跟 state.activeCategory 比，
  // 否则 Vue 侧先赋值再委托时守卫永远命中，切换分类不会刷新画廊。
  let appliedCategory = null;

  function setActiveCategory(categoryName) {
    const next = categoryName === null ? null : String(categoryName || '');
    if (next === appliedCategory) return;
    appliedCategory = next;
    PS.saveLastViewedDate(state.activeDate, { category: state.activeCategory, immediate: true });
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
    const options = ['<button class="filter-option" type="button" data-value="">' + PS.escapeHtml(emptyLabel) + '</button>'];
    (rows || []).forEach((row) => {
      const name = String(row.name || '').trim() || '?';
      options.push(
        '<button class="filter-option" type="button" data-value="' + PS.escapeHtml(name) + '">' +
        PS.escapeHtml(name + ' (' + Number(row.count || 0) + ')') +
        '</button>'
      );
    });
    return options.join('');
  }

  function filterComboHtml(id, label, emptyLabel, rows) {
    return [
      '<div class="filter-row">',
      '<label>' + PS.escapeHtml(label) + '</label>',
      '<div id="' + id + '" class="filter-combo" data-value="">',
      '<button class="filter-combo-trigger" type="button"><span></span><svg class="filter-caret" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>',
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
      '<div class="filter-row"><label>开始日期</label><input id="filter-start" type="date" min="' + PS.escapeHtml(range.earliest || '') + '" max="' + PS.escapeHtml(range.latest || '') + '"></div>',
      '<div class="filter-row"><label>结束日期</label><input id="filter-end" type="date" min="' + PS.escapeHtml(range.earliest || '') + '" max="' + PS.escapeHtml(range.latest || '') + '"></div>',
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
    const W = 340;
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - W - 8)) + 'px';
    pop.style.top = (rect.bottom + 8) + 'px';
    pop.style.transform = 'none';
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

  // P3：currentSettingsTab 随设置屏渲染代码一起删除（标签切换改由 Vue store 负责）

  function openSettingsPage(options) {
    const opts = options || {};
    const fromSource = opts.fromSource || (els.sourceScreen && !els.sourceScreen.classList.contains('hidden'));
    if (state.quickEdit.saveSaving) {
      PS.showQuickEditSaveConfirm();
      return;
    }
    state.settingsReturnTarget = fromSource ? 'source' : 'workspace';
    state.settingsOpen = true;
    PS.closeQuickEdit({ silent: true });
    closeSearchPanel();
    closeStatsPage({ animate: false });
    setSortOpen(false);
    hideContextMenu();
    hideNoteTooltip();
    if (fromSource) {
      hide(els.sourceScreen);
      show(els.workspace);
    }
    // P3：顶栏 / 标签 / 内容全部由 Vue 渲染，这里只负责显隐动画与通知 Vue 打开
    const bridge = window.PicScannerVue && window.PicScannerVue.settings;
    if (bridge && typeof bridge.open === 'function') bridge.open();
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
    // P3：通知 Vue 收起（内容由 Vue 渲染）
    const bridge = window.PicScannerVue && window.PicScannerVue.settings;
    if (bridge && typeof bridge.close === 'function') bridge.close();
    closePanelScreen(els.settingsScreen, opts);
    state.settingsReturnTarget = 'workspace';
    if (!returnToSource) return;
    const restoreSource = () => {
      if (state.settingsOpen) return;
      hide(els.workspace);
      show(els.sourceScreen);
      PS.playSourceEnter();
    };
    if (opts.animate === false || els.settingsScreen.classList.contains('hidden')) {
      restoreSource();
      return;
    }
    // 立即切回来源，避免“图库闪一下”：让设置页的 leaving 动画在来源页之上播放，而非先闪出图库
    restoreSource();
  }

  // P3 · 设置屏渲染代码已删除
  //
  // 原先从 setSettingsTab 一直到 renderPluginsSettings 共 572 行：
  //   renderSettingsNav / renderSettingsBody / setSettingsTab / currentSettingsTab /
  //   settingsStack / createSettingsPanel / appendSettingsSwitch /
  //   renderInterfaceSettings / renderShortcutsSettings / renderAboutSettings /
  //   renderExportSettings / exportPresetPayload / saveExportPreset /
  //   renderStorageSettings / renderStorageRows / renderPluginsSettings
  //
  // 其中 loadPhotoTotal 与 activeScopeLabel 只被导出、从无调用，一并清掉。
  //
  // 设置屏整体改由 frontend/src/islands/SettingsScreen.vue 渲染：
  // 外壳（顶栏 + 标签 + 滚动区）+ 6 个 settings/*.vue 面板。
  // legacy 侧只保留 openSettingsPage / closeSettingsPage 的显隐动画。
  //
  // 注意：closePanelScreen 保留在上方，closeStatsPage / closeSettingsPage 都要用。


  function openStatsPage() {
    if (state.quickEdit.saveSaving) {
      PS.showQuickEditSaveConfirm();
      return;
    }
    state.statsOpen = true;
    PS.closeQuickEdit({ silent: true });
    closeSearchPanel();
    closeSettingsPage({ animate: false });
    setSortOpen(false);
    hideContextMenu();
    hideNoteTooltip();
    els.statsScreen.classList.remove('leaving');
    show(els.statsScreen);
    els.statsScreen.classList.add('entering');
    clearTimeout(els.statsScreen._enterTimer);
    clearTimeout(els.statsScreen._leaveTimer);
    els.statsScreen._enterTimer = setTimeout(() => {
      els.statsScreen.classList.remove('entering');
    }, 420);
    // P3：内容由 Vue 渲染，这里只负责显隐动画与触发取数
    const bridge = window.PicScannerVue && window.PicScannerVue.stats;
    if (bridge && typeof bridge.open === 'function') bridge.open();
  }

  function closeStatsPage(options) {
    state.statsOpen = false;
    // P3：不再需要收起图表 tooltip（图表已随统计屏内容移入 Vue）
    const bridge = window.PicScannerVue && window.PicScannerVue.stats;
    if (bridge && typeof bridge.close === 'function') bridge.close();
    closePanelScreen(els.statsScreen, options);
  }

  // P3 · 统计屏渲染代码已删除
  //
  // 原先这里有 27 个函数、约 310 行：renderStatsWindow / renderStatsSummary /
  // renderRankChart / renderDistributionChart / renderHourChart / renderMonthChart /
  // renderColumnChart / renderEmptyChart / chartRows / compactNumber / statsColor /
  // rowPercent / topChartRow / cleanChartName / bindChartTooltip / hideChartTooltip /
  // positionChartTooltip / ensureChartTooltip / setStatsTab / sortFocalBuckets ...
  //
  // 内容改由 frontend/src/islands/StatsScreen.vue 与 components/stats/*.vue 渲染，
  // 数据来自 stores/stats.js 的 get_statistics_detail。
  // legacy 侧只保留外层 #stats-screen 的显隐动画（openStatsPage / closeStatsPage）。
  //
  // 注意：statsSignature 保留在下方 —— 它被 refreshState() 复用来判断侧边栏
  // 扫描统计是否变化（与统计屏无关，不能一起删）。

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
      if (Object.prototype.hasOwnProperty.call(st, 'source_id')) {
        state.currentSourceId = st.source_id || '';
        syncBatchSelectionSource();
      }
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
      els.exifStatus.textContent = exifStatusLabel(exifStatus);
      els.exifCount.textContent = exifDone + ' / ' + exifTotal;
      els.exifMessage.textContent = st.exif_message || '';

      els.scanAll.textContent = state.scanRunning ? '停止扫描' : (state.scanComplete ? '检查新增图片' : '扫描所有图片');
      els.scanAll.classList.toggle('danger', state.scanRunning);
      els.readExif.textContent = state.exifRunning ? '停止读取 EXIF' : '读取 EXIF 统计';
      els.readExif.classList.toggle('danger', state.exifRunning);
      els.scanBlock.classList.toggle('step-active', state.scanRunning);
      els.scanBlock.classList.toggle('step-done', !!state.scanComplete);
      els.exifBlock.classList.toggle('step-active', state.exifRunning);
      els.exifBlock.classList.toggle('step-done', exifStatus === 'done');
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
    PS.playWorkspaceEnter();
    resetSourceFilterContext();
    PS.resetGallery();
    state.currentRootPath = session.root_path || '';
    state.currentSourceId = session.source_id || (scanData.state && scanData.state.source_id) || '';
    syncBatchSelectionSource();
    state.scanStoppedByUser = session.status === 'stopped';
    els.currentSource.textContent = state.currentRootPath;
    applyScanData(scanData);
    loadCategories();
    loadOlderDates();
    applySourceViewedDates(scanData.source_state || {});
    PS.restoreLastViewedPosition(viewedPositionForCategory(state.activeCategory, scanData.source_state || {}));
    return true;
  }

  function enterSourceWorkspace(source) {
    state.currentRootPath = source.path || '';
    state.currentSourceId = source.source_id || (source.summary && source.summary.source_id) || '';
    syncBatchSelectionSource();
    if (state.currentRootPath) call('set_last_source', state.currentRootPath).catch(console.warn);
    state.scanComplete = false;
    state.scanStoppedByUser = false;
    hide(els.confirmModal);
    hide(els.sourceScreen);
    show(els.workspace);
    PS.playWorkspaceEnter();
    resetSourceFilterContext();
    PS.resetGallery();
    els.currentSource.textContent = state.currentRootPath;
    const rootPath = state.currentRootPath;
    call('get_scan_state', rootPath, state.currentSourceId || null).then((scanData) => {
      if (rootPath !== state.currentRootPath) return;
      if (scanData.state && scanData.state.source_id) {
        state.currentSourceId = scanData.state.source_id;
        syncBatchSelectionSource();
      }
      applyScanData(scanData);
      loadCategories();
      loadOlderDates();
      const sourceState = scanData.source_state || {};
      if (!sourceState.last_viewed_date && source.summary && source.summary.last_viewed_date) {
        sourceState.last_viewed_date = source.summary.last_viewed_date;
      }
      if (!Number(sourceState.last_viewed_offset) && source.summary && source.summary.last_viewed_offset) {
        sourceState.last_viewed_offset = source.summary.last_viewed_offset;
      }
      applySourceViewedDates(sourceState);
      PS.restoreLastViewedPosition(viewedPositionForCategory(state.activeCategory, sourceState));
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
        syncBatchSelectionSource();
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
    PS.scheduleDateHighlight();
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
        syncBatchSelectionSource();
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
      const previousExifCount = state.dateExifCounts.get(dateKey) || 0;
      const nextExifCount = Object.prototype.hasOwnProperty.call(d, 'exif_count')
        ? Number(d.exif_count || 0)
        : previousExifCount;
      if (Object.prototype.hasOwnProperty.call(d, 'cover_url')) {
        setDateCover(dateKey, d.cover_url || '');
      }
      state.dateCounts.set(dateKey, nextCount);
      state.dateExifCounts.set(dateKey, nextExifCount);
      const header = els.gallery.querySelector('[data-date-header="' + dateKey + '"] > span');
      if (header) header.textContent = nextCount + ' 张 · EXIF ' + nextExifCount;
      const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
      if (pill) {
        renderDateLabel(pill, dateKey);
        applyDateCover(pill, dateKey);
      }
      const section = document.getElementById('date-' + dateKey);
      const countChanged = hadCount && nextCount !== previousCount;
      const timeOrderChanged = hadCount &&
        (state.sortKey === 'datetime_desc' || state.sortKey === 'datetime_asc') &&
        nextExifCount !== previousExifCount;
      if (section && (countChanged || timeOrderChanged)) invalidateDatePhotoOrder(dateKey);
      else if (section) renderPhotoPlaceholders(section, dateKey, nextCount);
      updateDateReserve(dateKey);
      if (hadCount && nextCount > previousCount) refreshDateMoreAvailability(dateKey, nextCount);
    });
  }

  function invalidateDatePhotoOrder(dateKey) {
    const section = document.getElementById('date-' + dateKey);
    if (!section) return;
    section.dataset.photoOrderVersion = String(Number(section.dataset.photoOrderVersion || 0) + 1);
    section.dataset.photoOrderDirty = '1';
    if (section.dataset.loadingPhotos === '1') return;

    const grid = section.querySelector('.photo-grid');
    if (!grid) return;
    grid.replaceChildren();
    state.photoOffsets.set(dateKey, 0);
    section.dataset.photoOrderDirty = '0';
    renderPhotoPlaceholders(section, dateKey, state.dateCounts.get(dateKey) || 0);
    updateDateReserve(dateKey);
    schedulePlaceholderPhotoFill();
    scheduleVisiblePreviewCheck();
    PS.updateLightboxNavButtons();
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
    if (!clean) {
      state.dateCovers.delete(dateKey);
      const pill0 = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
      if (pill0) applyDateCover(pill0, dateKey);
      return;
    }
    // 预检：确保封面可加载，避免 Sony 视频等不可预览图被当封面
    const test = new Image();
    test.onload = () => {
      state.dateCovers.set(dateKey, clean);
      const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
      if (pill) applyDateCover(pill, dateKey);
    };
    test.onerror = () => {
      state.dateCovers.delete(dateKey);
      const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
      if (pill) applyDateCover(pill, dateKey);
    };
    test.src = clean;
    // 乐观设置，失败会自动回退
    state.dateCovers.set(dateKey, clean);
    const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
    if (pill) applyDateCover(pill, dateKey);
  }

  function applyDateCover(pill, dateKey) {
    if (!pill) return;
    const coverUrl = state.dateCovers.get(dateKey) || '';
    // 若该封面对应的照片在 usePreviewQueue 已标记失败，则不展示
    try {
      const failed = window.__previewFailedSet;
      if (failed && coverUrl && failed.has(coverUrl)) {
        pill.classList.remove('has-cover');
        pill.style.removeProperty('--date-cover');
        return;
      }
    } catch {}
    pill.classList.toggle('has-cover', !!coverUrl);
    if (coverUrl) {
      pill.style.setProperty('--date-cover', 'url("' + coverUrl.replace(/"/g, '\\"') + '")');
      // 额外 onerror 兜底：若 CSS 背景加载失败，下次不再使用
      const img = new Image();
      img.onerror = () => {
        if (state.dateCovers.get(dateKey) === coverUrl) {
          state.dateCovers.delete(dateKey);
          pill.classList.remove('has-cover');
          pill.style.removeProperty('--date-cover');
        }
      };
      img.src = coverUrl;
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
      if (!state.activeDate && dates[0] && !state.pendingRestoreDate) PS.setActiveDate(dates[0].date_key);
      setTimeout(PS.tryRestorePendingDate, 0);
      scheduleRenderBufferCheck();
      return true;
    }).catch((err) => {
      console.warn(err);
      return false;
    }).finally(() => {
      state.loadingDates = false;
      if (state.pendingRestoreDate) setTimeout(PS.tryRestorePendingDate, 0);
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
    state.dateExifCounts.set(date.date_key, Number(date.exif_count || 0));
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
    PS.scheduleDateHighlight();
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

  function numericCssPx(value, fallback) {
    const n = Number.parseFloat(String(value || ''));
    return Number.isFinite(n) ? n : fallback;
  }

  function galleryContentWidth() {
    const rawWidth = Math.max(1, Number(els.gallery && els.gallery.clientWidth || 0));
    if (!els.gallery) return rawWidth;
    const style = window.getComputedStyle(els.gallery);
    const left = numericCssPx(style.paddingLeft, 0);
    const right = numericCssPx(style.paddingRight, 0);
    return Math.max(1, rawWidth - left - right);
  }

  // P2 · 纯函数高度模型
  //
  // 布局常量，与 frontend/src/gallery/layout.js 及 style.css 三者必须一致：
  //   .photo-grid  gap: 10px
  //   .date-header height: 36px
  //   .date-more   margin-top: 12px + height: 34px = 46px
  // 命名带 _FALLBACK 是因为正常路径下应优先取 layout 模块导出的同名常量，
  // 只有 Vue 包加载失败时才用这里的字面量兜底。
  const PHOTO_GRID_GAP_FALLBACK = 10;
  const DATE_HEADER_HEIGHT_FALLBACK = 36;
  const DATE_MORE_HEIGHT_FALLBACK = 46;

  // 旧实现是「测量 DOM 反推高度」：读 getComputedStyle 的 columnGap/rowGap、
  // 读 header.offsetHeight、读 more.offsetHeight + marginTop。这有三个问题：
  //   1) 每次调用都会触发样式重算，滚动时是热点
  //   2) 高度依赖"已经渲染出来的 DOM"，与 Vue 的数据→DOM 方向相反
  //   3) 与未来的 Vue PhotoGrid 无法共用公式，必然漂移
  //
  // 新实现改为纯计算：高度 = f(照片总数, 条目尺寸, 容器宽度, 常量)。
  // 公式来自 frontend/src/gallery/layout.js，legacy 与 Vue 共用同一份。
  function sharedLayout() {
    return (window.PicScannerVue && window.PicScannerVue.layout) || null;
  }

  function dateSectionIntrinsicHeight(section, dateKey) {
    const grid = section ? section.querySelector('.photo-grid') : null;
    const more = section ? section.querySelector('.date-more') : null;
    // dateCounts 是权威值；grid.children.length 仅为占位符渲染期的下限保护
    // （读 children.length 只是查 DOM 结构，不触发布局，开销可忽略）
    const total = Math.max(
      0,
      Number(state.dateCounts.get(dateKey) || 0),
      grid ? grid.children.length : 0,
    );
    const itemSize = Math.max(1, Number(state.galleryItemSizeRaw || state.galleryItemSize || 168));
    const gridWidth = Math.max(1, Number(grid && grid.clientWidth || section && section.clientWidth || galleryContentWidth()));
    const moreHeight = more ? DATE_MORE_HEIGHT_FALLBACK : 0;

    const L = sharedLayout();
    if (L && typeof L.dateSectionHeight === 'function') {
      return L.dateSectionHeight({
        count: total,
        itemSize,
        gridWidth,
        moreHeight,
        headerHeight: DATE_HEADER_HEIGHT_FALLBACK,
      }).height;
    }
    // 兜底：Vue 包未加载时退化为等价的内联公式（不再读 DOM 几何）
    const columns = Math.max(1, Math.floor((gridWidth + PHOTO_GRID_GAP_FALLBACK) / (itemSize + PHOTO_GRID_GAP_FALLBACK)));
    const rows = total > 0 ? Math.ceil(total / columns) : 0;
    const gridHeight = rows > 0 ? rows * itemSize + Math.max(0, rows - 1) * PHOTO_GRID_GAP_FALLBACK : 0;
    return Math.max(80, Math.ceil(DATE_HEADER_HEIGHT_FALLBACK + gridHeight + moreHeight));
  }

  function updateDateReserve(dateKey) {
    const section = document.getElementById('date-' + dateKey);
    if (!section) return;
    const more = section.querySelector('.date-more');
    section.style.paddingBottom = '';
    section.style.setProperty('--date-section-intrinsic-size', dateSectionIntrinsicHeight(section, dateKey) + 'px');
    if (more) more.dataset.reserve = '0';
  }

  function updateAllDateReserves() {
    state.dates.forEach((date) => updateDateReserve(date.date_key));
  }

  function holdDateSectionLayout(section) {
    if (!section) return () => {};
    section.classList.add('restoring-layout');
    void section.offsetHeight;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setTimeout(() => {
        section.classList.remove('restoring-layout');
      }, 900);
    };
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
    PS.setActiveDate(dateKey);
    const cleanOffset = Math.max(0, Number(offset || 0));
    const releaseLayout = cleanOffset > 0 ? holdDateSectionLayout(section) : null;
    const scrollToSection = () => {
      if (cleanOffset > 0) {
        section.classList.add('restoring-layout');
        void section.offsetHeight;
      }
      els.galleryScroll.scrollTo({ top: Math.max(0, section.offsetTop + cleanOffset), behavior: 'auto' });
      PS.scheduleDateHighlight();
      schedulePlaceholderPhotoFill();
      scheduleVisiblePreviewCheck();
    };
    scrollToSection();
    loadPhotosForDate(dateKey).finally(() => {
      requestAnimationFrame(() => {
        scrollToSection();
        requestAnimationFrame(() => {
          scrollToSection();
          if (releaseLayout) releaseLayout();
        });
      });
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
    const photoOrderVersion = Number(section.dataset.photoOrderVersion || 0);
    const more = section.querySelector('.date-more');
    more.textContent = '加载中...';
    const requestedLimit = Math.max(1, Number(options && options.limit) || (offset === 0 ? INITIAL_PHOTO_LIMIT : PHOTO_LOAD_BATCH));
    return call('list_photos', dateKey, offset, requestedLimit, state.currentRootPath || null, state.currentSourceId || null, state.sortKey, filterPayload()).then((data) => {
      const photos = data.photos || [];
      const grid = section.querySelector('.photo-grid');
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          if (Number(section.dataset.photoOrderVersion || 0) !== photoOrderVersion) {
            resolve(false);
            return;
          }
          photos.forEach((photo, index) => {
            const card = photoCard(photo);
            const target = grid.children[offset + index];
            if (target) grid.replaceChild(card, target);
            else grid.appendChild(card);
          });
          state.photoOffsets.set(dateKey, offset + photos.length);
          updateDateReserve(dateKey);
          schedulePlaceholderPhotoFill();
          const nextOffset = offset + photos.length;
          const knownTotal = state.dateCounts.get(dateKey) || total;
          const complete = !photos.length || (knownTotal > 0 && nextOffset >= knownTotal) || photos.length < requestedLimit;
          more.textContent = complete ? '这一天已加载完' : '滚动到这里会继续加载';
          if (!complete) observeDateMore(more, dateKey);
          observeImages();
          scheduleRenderBufferCheck();
          scheduleVisiblePreviewCheck();
          PS.scheduleDateHighlight();
          PS.updateLightboxNavButtons();
          resolve(photos.length > 0);
        });
      });
    }).catch((err) => {
      more.textContent = String(err);
      return false;
    }).finally(() => {
      section.dataset.loadingPhotos = '0';
      if (section.dataset.photoOrderDirty === '1') invalidateDatePhotoOrder(dateKey);
    });
  }

  PS.quickEditFrameAssetCache = new Map();
  function observeDateSection(section, dateKey) {
    if (!PS.dateSectionObserver) {
      PS.dateSectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          PS.dateSectionObserver.unobserve(el);
          const key = el.dataset.date;
          if (key) loadPhotosForDate(key);
        });
      }, { root: els.galleryScroll, rootMargin: '620px 0px' });
    }
    section.dataset.date = dateKey;
    PS.dateSectionObserver.observe(section);
  }

  function observeImages() {
    if (!PS.imageObserver) {
      PS.imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          PS.imageObserver.unobserve(img);
          const photoId = Number(img.dataset.photoId || 0);
          enqueuePreview(img, photoId);
        });
      }, { root: els.galleryScroll, rootMargin: '220px 0px' });
    }
    els.gallery.querySelectorAll('img[data-photo-id]:not([data-observed])').forEach((img) => {
      img.dataset.observed = '1';
      PS.imageObserver.observe(img);
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

  PS.moreObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      PS.moreObserver.unobserve(el);
      const dateKey = el.dataset.dateKey;
      if (dateKey) loadPhotosForDate(dateKey);
    });
  }, { root: els.galleryScroll, rootMargin: '320px 0px' });

  function observeDateMore(el, dateKey) {
    el.dataset.dateKey = dateKey;
    PS.moreObserver.observe(el);
  }

  function updatePhotoCardMeta(card, photo, previewLoaded) {
    const meta = card.querySelector('.photo-meta');
    if (!meta) return;
    meta.children[0].textContent = photo.format_label || photo.format || '';
    // 右下角状态/EXIF 角标不再显示（用户要求移除缩略图上的镜头名与 EXIF 标记）
    if (meta.children[1]) {
      meta.children[1].textContent = '';
      meta.children[1].style.display = 'none';
    }
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
      clearTimeout(PS.hoverTimer);
      PS.hoverCard = null;
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
      if (compareSelectedCount() >= 2) PS.openCompareLightbox();
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
    PS.cancelQuickEditPicking();
    state.compare.open = true;
    state.compare.lightbox = false;
    closeCategoryPicker();
    hideContextMenu();
    const panel = ensureComparePanel();
    renderComparePanel();
    panel.classList.remove('hidden');
  }

  function closeComparePanel() {
    state.compare.open = false;
    state.compare.lightbox = false;
    if (state.compare.panel) state.compare.panel.classList.add('hidden');
    updateCompareCardHighlights();
  }

  function toggleComparePanel() {
    if (state.compare.lightbox) { PS.closeLightbox(); return; }
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
    if (compareSelectedCount() >= 2) PS.openCompareLightbox();
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
        const currentPhoto = state.photoCache.get(Number(photo.id)) || photo;
        if (state.quickEdit.picking) {
          ev.preventDefault();
          ev.stopPropagation();
          PS.openQuickEdit(currentPhoto);
          return;
        }
        if (PS.batchSelectionController && PS.batchSelectionController.handlePhotoClick(ev, currentPhoto)) {
          return;
        }
        if (state.compare.open) {
          ev.preventDefault();
          ev.stopPropagation();
          toggleComparePhoto(currentPhoto);
          return;
        }
        PS.openLightbox(currentPhoto);
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
    if (PS.batchSelectionController) PS.batchSelectionController.decorateCard(card);
    return card;
  }

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
    if (PS.hoverCard && PS.hoverCard.isConnected) return PS.hoverCard;
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
    PS.showExif(card, photo, pointerEventForExif(ev));
    return true;
  }

  function showAltExifFromPointer(ev) {
    if (!canShowGalleryExif()) return false;
    const card = activePointerCard();
    if (!card) return false;
    PS.hoverCard = card;
    clearTimeout(PS.hoverTimer);
    return showExifForCard(card, ev);
  }

  function bindGalleryHover() {
    els.gallery.addEventListener('mouseover', (ev) => {
      rememberPointer(ev);
      if (!canShowGalleryExif()) return;
      const card = cardFromEvent(ev);
      if (!card || card === PS.hoverCard || card.contains(ev.relatedTarget)) return;
      PS.hoverCard = card;
      clearTimeout(PS.hoverTimer);
      if (ev.altKey) {
        showExifForCard(card, ev);
        return;
      }
      PS.hoverTimer = setTimeout(() => showExifForCard(card, ev), 560);
    });
    els.gallery.addEventListener('mousemove', (ev) => {
      rememberPointer(ev);
      if (!canShowGalleryExif()) return;
      if (!PS.hoverCard || !PS.hoverCard.contains(ev.target)) return;
      if (ev.altKey && els.exifPop.classList.contains('hidden')) {
        showExifForCard(PS.hoverCard, ev);
      }
      PS.positionExif(ev);
    });
    els.gallery.addEventListener('mouseout', (ev) => {
      if (!PS.hoverCard || PS.hoverCard.contains(ev.relatedTarget)) return;
      PS.hoverCard = null;
      clearTimeout(PS.hoverTimer);
      hide(els.exifPop);
    });
  }

  function blockInternalFileDrop(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'none';
    state.nativePhotoDragging = false;
    clearTimeout(PS.hoverTimer);
    PS.hoverCard = null;
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
        hidden: !!mark.hidden,
        note: String(mark.note || ''),
        category: String(mark.category || ''),
      });
      state.photoCache.set(id, next);
    });
    state.exifCache.forEach((photo, id) => {
      if (String(photo.filename || '') !== cleanName) return;
      state.exifCache.set(id, Object.assign({}, photo, {
        favorite: !!mark.favorite,
        hidden: !!mark.hidden,
        note: String(mark.note || ''),
        category: String(mark.category || ''),
      }));
    });
    if (state.lightbox.photo && String(state.lightbox.photo.filename || '') === cleanName) {
      state.lightbox.photo = Object.assign({}, state.lightbox.photo, {
        favorite: !!mark.favorite,
        hidden: !!mark.hidden,
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

  function setPhotoHidden(photo, hidden) {
    if (!photo || !requireSourceIdForMark()) return Promise.resolve(false);
    const filename = String(photo.filename || '');
    if (!filename) return Promise.resolve(false);
    return call('set_item_mark', state.currentSourceId, 'photo', filename, null, null, null, !!hidden).then((res) => {
      if (res && res.success) {
        const mark = res.mark || {};
        updatePhotoMark(filename, mark);
        const updated = Object.assign({}, photo, {
          favorite: !!mark.favorite,
          hidden: !!mark.hidden,
          note: String(mark.note || ''),
          category: String(mark.category || ''),
        });
        showToast(updated.hidden ? '已隐藏' : '已取消隐藏');
        loadCategories();
        if (!photoMatchesActiveCategory(updated)) {
          refreshGalleryForCategory();
        }
        return true;
      }
      showToast('隐藏状态保存失败', 'error');
      return false;
    }).catch((err) => {
      console.warn(err);
      showToast('隐藏状态保存失败', 'error');
      return false;
    });
  }

  function photoMatchesActiveCategory(photo) {
    if (photo && photo.hidden) return state.activeCategory === HIDDEN_CATEGORY;
    if (state.activeCategory === HIDDEN_CATEGORY) return false;
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
        label: photo.hidden ? '移出隐藏' : '隐藏',
        action: () => {
          setPhotoHidden(photo, !photo.hidden);
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
    els.searchResults.innerHTML = '<div class="search-empty">' + PS.escapeHtml(message) + '</div>';
  }

  function searchSubtitle(item) {
    if (item.type === 'date') {
      const countText = Number(item.count || 0) + ' 张照片 · EXIF ' + Number(item.exif_count || 0);
      if (item.search_field === 'date_note') {
        return PS.joinClean([item.date_key, countText], ' · ');
      }
      return countText;
    }
    const title = searchResultTitle(item);
    const filename = String(item.filename || item.relative_path || '').trim();
    const filenameContext = title && filename && title !== filename ? filename : '';
    return PS.joinClean([
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
      PS.setActiveDate(photo.date_key);
      return ensurePhotoLoadedAt(photo.date_key, photo.search_offset).then(() => {
        requestAnimationFrame(() => {
          const card = els.gallery.querySelector('[data-photo-id="' + Number(photo.id || 0) + '"]');
          if (!card) {
            jumpToDate(photo.date_key);
            return;
          }
          card.scrollIntoView({ block: 'center', inline: 'nearest' });
          markSearchTargetCard(card);
          PS.scheduleDateHighlight();
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
    if (state.quickEdit.picking) return false;
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
      photoFromPickerCard(PS.hoverCard);
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
        hasHoverCard: !!(PS.hoverCard && PS.hoverCard.isConnected),
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

  PS.syncBatchSelectionSource = syncBatchSelectionSource;
  PS.beginScan = beginScan;
  PS.applyScanData = applyScanData;
  PS.refreshState = refreshState;
  PS.enterCachedWorkspace = enterCachedWorkspace;
  PS.enterSourceWorkspace = enterSourceWorkspace;
  PS.refreshDatesAfterScanBatch = refreshDatesAfterScanBatch;
  PS.requestMoreScan = requestMoreScan;
  PS.requestMoreScanFromWheel = requestMoreScanFromWheel;
  PS.onGalleryWheel = onGalleryWheel;
  PS.toggleScanAll = toggleScanAll;
  PS.toggleExifRead = toggleExifRead;
  PS.maybeRefreshVisibleDates = maybeRefreshVisibleDates;
  PS.loadOlderDates = loadOlderDates;
  PS.addDateSection = addDateSection;
  PS.loadPhotosForDate = loadPhotosForDate;
  PS.observeImages = observeImages;
  PS.requestVisiblePreviews = requestVisiblePreviews;
  PS.ensureRenderBuffer = ensureRenderBuffer;
  PS.photoCard = photoCard;
  PS.bindPhotoDrag = bindPhotoDrag;
  PS.bindGalleryHover = bindGalleryHover;
  PS.blockInternalFileDrop = blockInternalFileDrop;
  PS.bindNoteTooltip = bindNoteTooltip;
  PS.ensureContextMenu = ensureContextMenu;
  PS.hideContextMenu = hideContextMenu;
  PS.showPhotoContextMenu = showPhotoContextMenu;
  PS.showDateContextMenu = showDateContextMenu;
  PS.updatePhotoMark = updatePhotoMark;
  PS.setPhotoFavorite = setPhotoFavorite;
  PS.setPhotoHidden = setPhotoHidden;
  PS.setPhotoCategory = setPhotoCategory;
  PS.editPhotoNote = editPhotoNote;
  PS.favoriteHoveredPhoto = favoriteHoveredPhoto;
  PS.editHoveredPhotoNote = editHoveredPhotoNote;
  PS.editActiveDateNote = editActiveDateNote;
  PS.editDateNote = editDateNote;
  PS.openSearchPanel = openSearchPanel;
  PS.closeSearchPanel = closeSearchPanel;
  PS.toggleSearchPanel = toggleSearchPanel;
  PS.runSearch = runSearch;
  PS.setSearchScope = setSearchScope;
  PS.openCategoryPickerForHover = openCategoryPickerForHover;
  PS.closeCategoryPicker = closeCategoryPicker;
  PS.handleCategoryPickerKey = handleCategoryPickerKey;
  PS.applyCategoryPickerSelection = applyCategoryPickerSelection;
  PS.renderCategoryList = renderCategoryList;
  PS.loadCategories = loadCategories;
  PS.setActiveCategory = setActiveCategory;
  PS.addCategoryFromSidebar = addCategoryFromSidebar;
  PS.refreshGalleryForCategory = refreshGalleryForCategory;
  PS.applySort = applySort;
  PS.renderSortMenu = renderSortMenu;
  PS.setSortOpen = setSortOpen;
  PS.currentSortOption = currentSortOption;
  PS.applyFilter = applyFilter;
  PS.clearActiveFilter = clearActiveFilter;
  PS.hasActiveFilter = hasActiveFilter;
  PS.normalizeFilter = normalizeFilter;
  PS.filterPayload = filterPayload;
  PS.updateFilterButton = updateFilterButton;
  PS.openFilterPop = openFilterPop;
  PS.closeFilterPop = closeFilterPop;
  PS.closeFilterMenu = closeFilterMenu;
  PS.onFilterTriggerClick = onFilterTriggerClick;
  PS.onFilterTriggerContextMenu = onFilterTriggerContextMenu;
  PS.applyAppConfig = applyAppConfig;
  PS.applyGalleryItemSize = applyGalleryItemSize;
  PS.clampItemSize = clampItemSize;
  PS.scheduleGalleryItemSizeSave = scheduleGalleryItemSizeSave;
  PS.openSettingsPage = openSettingsPage;
  PS.closeSettingsPage = closeSettingsPage;
  PS.openStatsPage = openStatsPage;
  PS.closeStatsPage = closeStatsPage;
  PS.ensureDateSection = ensureDateSection;
  PS.jumpToDate = jumpToDate;
  PS.ensureComparePanel = ensureComparePanel;
  PS.toggleComparePanel = toggleComparePanel;
  PS.toggleComparePhoto = toggleComparePhoto;
  PS.clearCompareSelection = clearCompareSelection;
  PS.compareSelectedCount = compareSelectedCount;
  PS.showExifForCard = showExifForCard;
  PS.showAltExifFromPointer = showAltExifFromPointer;
  PS.canShowGalleryExif = canShowGalleryExif;
  PS.rememberPointer = rememberPointer;
  PS.cardFromLastPointer = cardFromLastPointer;
  PS.activePointerCard = activePointerCard;
  PS.isTypingTarget = isTypingTarget;
  PS.canShowSearchPanel = canShowSearchPanel;
  PS.updateDateCounts = updateDateCounts;
  PS.invalidateDatePhotoOrder = invalidateDatePhotoOrder;
  PS.setDateCover = setDateCover;
  PS.setDateNote = setDateNote;
  PS.refreshDateMoreAvailability = refreshDateMoreAvailability;
  PS.galleryContentWidth = galleryContentWidth;
  PS.schedulePlaceholderPhotoFill = schedulePlaceholderPhotoFill;
  PS.scheduleVisiblePreviewCheck = scheduleVisiblePreviewCheck;
  PS.scheduleRenderBufferCheck = scheduleRenderBufferCheck;
  PS.scheduleGalleryZoomFrame = scheduleGalleryZoomFrame;
  PS.finishGalleryZoom = finishGalleryZoom;
  PS.closePanelScreen = closePanelScreen;
  PS.currentExportPreset = currentExportPreset;
  PS.showCategoryExportMenu = showCategoryExportMenu;
  PS.beginCategoryExport = beginCategoryExport;
  PS.openExportConfirm = openExportConfirm;
  PS.closeExportConfirm = closeExportConfirm;
  PS.confirmPendingExport = confirmPendingExport;
  PS.normalizeLightboxInfoSize = normalizeLightboxInfoSize;
  PS.viewedCategoryKey = viewedCategoryKey;
  PS.closeFilterCombos = closeFilterCombos;
  PS.zoomGalleryItemsFromWheel = zoomGalleryItemsFromWheel;
  PS.updateAllDateReserves = updateAllDateReserves;
  PS.imageHasSource = imageHasSource;
  PS.updatePhotoCardMeta = updatePhotoCardMeta;
  PS.comparePhotoId = comparePhotoId;
  PS.comparePhotoReady = comparePhotoReady;
  PS.currentComparePhoto = currentComparePhoto;
  PS.compareSelectedIndex = compareSelectedIndex;
  PS.renderComparePanel = renderComparePanel;
  PS.closeComparePanel = closeComparePanel;
  PS.updateCompareCardHighlights = updateCompareCardHighlights;
  PS.hideNoteTooltip = hideNoteTooltip;
  PS.selectSearchResult = selectSearchResult;
  PS.scheduleSearch = scheduleSearch;
  PS.openSearchResult = openSearchResult;
})(window.PS);
