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

  // P3 统计屏迁移时漏删的死函数：全仓库零调用（统计屏已由 StatsScreen.vue 渲染），
  // 原用于往 #stats-* 的容器里塞 .chip 小卡片。

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
    loadOlderDates({ allowScanRequest: false });
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
    loadOlderDates({ allowScanRequest: false });
  }

  function clearActiveFilter() {
    state.activeFilter = {};
    updateFilterButton();
    closeFilterPop();
    closeFilterMenu();
    PS.resetGallery();
    loadOlderDates({ allowScanRequest: false });
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
    PS.restoreLastViewedPosition(viewedPositionForCategory(state.activeCategory));
    loadOlderDates({ allowScanRequest: false });
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

  // P4 收口：滚轮缩放/Alt 滚轮/滚到底续扫的 legacy 路径已随引擎链删除。
  // Vue PhotoGrid 自带 Ctrl+滚轮缩放与滚动续扫（maybeLoadMore → PS.loadOlderDates）。

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
      const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
      if (pill) {
        renderDateLabel(pill, dateKey);
        applyDateCover(pill, dateKey);
      }
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
    const pill = els.dateRail.querySelector('[data-date-pill="' + dateKey + '"]');
    if (pill) renderDateLabel(pill, dateKey);
  }

  function loadOlderDates(options) {
    const allowScanRequest = !options || options.allowScanRequest !== false;
    if (state.loadingDates || state.noMoreDates) return Promise.resolve(false);
    state.loadingDates = true;
    const requestedLimit = state.dateCursor ? 8 : DATE_RAIL_LOAD_LIMIT;
    return call('list_dates', state.dateCursor, requestedLimit, state.currentRootPath || null, state.currentSourceId || null, state.sortKey, filterPayload()).then((data) => {
      const dates = data.dates || [];
      if (!dates.length) {
        if (!state.scanRunning && !state.scanStoppedByUser && !state.scanComplete && allowScanRequest) {
          // 库未扫完：触发一轮增量扫描，扫描批次回来后 refreshDatesAfterScanBatch 会再拉日期
          requestMoreScan();
        } else if (state.scanComplete) {
          state.noMoreDates = true;
        }
        return false;
      }
      dates.forEach(addDateSection);
      state.dateCursor = state.dates.length ? state.dates[state.dates.length - 1].date_key : null;
      if (!state.activeDate && dates[0] && !state.pendingRestoreDate) PS.setActiveDate(dates[0].date_key);
      setTimeout(PS.tryRestorePendingDate, 0);
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

  // P4 收口：legacy 画廊分区 DOM 已随引擎链删除，这里只做数据登记 + 日期胶囊渲染。
  // 照片列表与分区头（张数/EXIF）由 Vue PhotoGrid 的 windowing 渲染。
  function addDateSection(date) {
    if (state.dateCounts.has(date.date_key)) {
      updateDateCounts([date]);
      return;
    }
    if (date.note) state.dateNotes.set(date.date_key, String(date.note));
    if (date.cover_url) state.dateCovers.set(date.date_key, String(date.cover_url));
    state.dateCounts.set(date.date_key, Number(date.count || 0));
    state.dateExifCounts.set(date.date_key, Number(date.exif_count || 0));

    const pill = document.createElement('button');
    pill.className = 'date-pill';
    pill.dataset.datePill = date.date_key;
    renderDateLabel(pill, date.date_key);
    applyDateCover(pill, date.date_key);
    pill.addEventListener('click', () => {
      // 经 PS 调用：PhotoGrid 劫持 PS.jumpToDate，点击才能滚 Vue 画布。
      PS.jumpToDate(date.date_key);
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
  }

  // P4 收口：占位卡渲染 / 可视填充 / 渲染缓冲 / 分区高度预留 / IntersectionObserver
  // 这套「从 DOM 反推数据」的引擎链已删除，照片渲染归 Vue PhotoGrid（两级 windowing）。

  // P4 收口：滚动定位归 Vue PhotoGrid（劫持 PS.jumpToDate → vueJumpToDate）。
  // 这个闭包只剩委托职责——劫持未挂上的窗口期把调用转给 Vue 实现；
  // 委托前先确认 PS.jumpToDate 不是自己，避免 flag 关闭（无 Vue 网格）时死递归。
  function jumpToDate(dateKey, offset) {
    if (window.PS && PS.jumpToDate && PS.jumpToDate !== jumpToDate) {
      return PS.jumpToDate(dateKey, offset);
    }
    return Promise.resolve(false);
  }

  // P4 收口：legacy 的逐日期照片加载/预览队列/IntersectionObserver 全部删除，
  // 照片拉取归 store.fetchPhotosForDate，预览归 usePreviewQueue。

  PS.quickEditFrameAssetCache = new Map();

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

  // P4 收口：对比高亮由 PhotoCard 的响应式类（compare-selected/compare-slot-N）
  // 驱动，PhotoGrid 包装对比入口后 syncCompareLocal 同步。灯箱仍有 4 处调用
  // PS.updateCompareCardHighlights —— 保留为空操作维持契约。
  function updateCompareCardHighlights() {}

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
    // P4：卡片来自 activePointerCard()（PS.hoverCard / elementFromPoint），
    // Vue 网格的卡片不在 #gallery 里，只校验 isConnected。
    if (!card || !card.isConnected) return false;
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

  // P4 收口：bindGalleryHover 绑在 #gallery 上（Vue 模式下该容器为空）。
  // Vue PhotoGrid 自己做 hover 委托并同步 PS.hoverCard，F/笔记/W-S-Space
  // 经 activePointerCard() 照常工作，这里不再有可绑定的目标。

  function resetNativeDragCursor() {
    call('reset_drag_cursor').catch(() => {});
  }

  // 通用小工具：灯箱/快修仍在用（判断 img 是否已有 src）
  function imageHasSource(img) {
    return !!img.getAttribute('src');
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
    // P4：把标记同步进 Vue store（PhotoGrid 卡片的响应式数据源）。
    // 不补这一步的话，Vue 卡片要等预览管线 patchPhoto 回填整个照片对象时
    // 才"顺便"看到新标记，表现为收藏/隐藏/笔记/分类延迟出现。
    // legacy 模式下 store 没有按日期照片数组，此调用为 no-op。
    if (window.PicScannerVue && typeof window.PicScannerVue.onLegacyPhotoMarksChanged === 'function') {
      try { window.PicScannerVue.onLegacyPhotoMarksChanged(cleanName); } catch {}
    }
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

  // P4 · vanilla 搜索面板整套已删除（296 行 / 19 个函数）
  //
  // 原先这里是一整个搜索子系统：canShowSearchPanel / openSearchPanel /
  // selectSearchResult / setSearchScope / renderSearchMessage / searchSubtitle /
  // searchMeta / searchResultKey / searchResultTitle / appendHighlightedSearchText /
  // renderSearchResults / runSearch / scheduleSearch / ensureDateSection /
  // ensurePhotoLoadedAt / markSearchTargetCard / jumpToSearchPhoto / openSearchResult。
  //
  // 它们服务的 #search-panel 属于已删除的 #vanilla-toolbar，事件永远不会触发。
  // Vue 工具栏（GalleryToolbar.vue）有完整实现：输入走 store.doSearch、
  // 结果渲染走 store.searchResults、点击跳转走组件自己的 openSearchResult
  // （滚动到目标并写 PS.state.activeDate，不经过 legacy）。
  //
  // 唯一保留的是下面的 closeSearchPanel：它有 12 处外部调用
  // （打开设置 / 统计 / 灯箱 / 集锦时顺手关掉搜索面板），
  // 而 state.searchOpen 经真源代理会关掉 Vue 的搜索面板 —— 这是真集成点，不能删。

  function closeSearchPanel() {
    if (!state.searchOpen) return;
    state.searchOpen = false;
    clearTimeout(state.searchTimer);
    // 原先还做 hide(els.searchPanel) 与 els.searchInput.blur()，
    // 那个面板已随 vanilla 工具栏删除；显隐由 Vue 侧 state.searchOpen 驱动。
  }

  // 下面三个是「从搜索结果跳到具体照片」的能力，Vue 工具栏要调用它们。
  //
  // 上一轮删 vanilla 搜索面板时误把它们一起删了，导致 Vue 侧的跳转退化成
  // "只滚到日期分区" —— 因为分区内的照片是 legacy 虚拟化渲染的，
  // Vue store 的 fetchPhotosForDate 只更新 Pinia、不会创建任何 .photo-card，
  // 于是 querySelector 永远找不到目标卡片。
  //
  // 结论：**凡是操作 #gallery 内部 DOM 的逻辑都归 legacy**，
  // Vue 只有数据、没有虚拟化信息，不能自己实现跳转。

  // P4 收口：ensureDateSection / ensurePhotoLoadedAt / jumpToSearchPhoto 的
  // legacy 实现已随引擎链删除（分区/卡片 DOM 不复存在）。
  // Vue 工具栏的搜索跳转走 PS.jumpToSearchPhoto —— PhotoGrid 劫持后是
  // vueJumpToSearchPhoto（自己 ensure 日期与照片加载）。这里保留委托桩，
  // 供劫持未挂载的窗口期与 typeof 守卫使用。
  function jumpToSearchPhoto(photo) {
    if (window.PS && PS.jumpToSearchPhoto && PS.jumpToSearchPhoto !== jumpToSearchPhoto) {
      return PS.jumpToSearchPhoto(photo);
    }
    return Promise.resolve(false);
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
  PS.toggleScanAll = toggleScanAll;
  PS.toggleExifRead = toggleExifRead;
  PS.maybeRefreshVisibleDates = maybeRefreshVisibleDates;
  PS.loadOlderDates = loadOlderDates;
  PS.addDateSection = addDateSection;
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
  PS.closeSearchPanel = closeSearchPanel;
  PS.jumpToSearchPhoto = jumpToSearchPhoto;
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
  PS.updateDateCounts = updateDateCounts;
  PS.setDateCover = setDateCover;
  PS.setDateNote = setDateNote;
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
  PS.imageHasSource = imageHasSource;
  PS.comparePhotoId = comparePhotoId;
  PS.comparePhotoReady = comparePhotoReady;
  PS.currentComparePhoto = currentComparePhoto;
  PS.compareSelectedIndex = compareSelectedIndex;
  PS.renderComparePanel = renderComparePanel;
  PS.closeComparePanel = closeComparePanel;
  PS.updateCompareCardHighlights = updateCompareCardHighlights;
  PS.hideNoteTooltip = hideNoteTooltip;
})(window.PS);
