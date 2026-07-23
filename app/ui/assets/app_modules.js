/* PicScanner 模块框架前端：模块注册表、工具栏下拉、全屏工作区宿主、源阶段管线。
 * 依赖 app_core.js 的 window.PS。模块 JS 由本文件按 get_modules() 结果动态注入，
 * 模块通过 window.PicScannerModules.register / registerSourceStage 自注册。
 */
(function () {
  const PS = window.PS;

  const moduleDefs = new Map();
  const moduleMeta = new Map();
  const sourceStages = [];

  let screenEl = null;
  let moduleTabEl = null;
  let activeKey = '';
  let activeDef = null;
  let menuOpen = false;
  let capturedPhoto = null;

  function els() {
    return {
      dropdown: document.querySelector('[data-qe-module-dropdown]'),
      trigger: document.querySelector('[data-qe-module-trigger]'),
      menu: document.querySelector('[data-qe-module-menu]'),
    };
  }

  function currentPhoto() {
    return (PS.state.lightbox && PS.state.lightbox.photo) || capturedPhoto || null;
  }

  function getEntry(photoId) {
    const id = Number(photoId || 0);
    return PS.state.sourceStages.get(id) || null;
  }

  function setEntry(photoId, entry) {
    const id = Number(photoId || 0);
    if (!id) return;
    if (entry) PS.state.sourceStages.set(id, entry);
    else PS.state.sourceStages.delete(id);
  }

  function stagesActive(entry) {
    if (!entry) return false;
    return sourceStages.some((stage) => {
      try { return !!stage.hasStage(entry); } catch { return false; }
    });
  }

  async function applySourceStages(bitmap, entry, opts) {
    let current = bitmap;
    let result = { bitmap: current, width: 0, height: 0, orientationApplied: false };
    for (const stage of sourceStages) {
      let active = false;
      try { active = !!stage.hasStage(entry); } catch { active = false; }
      if (!active) continue;
      const out = await stage.apply(current, entry, opts || {});
      if (out && out.bitmap) {
        if (current && current !== bitmap && current.close) current.close();
        current = out.bitmap;
        result = out;
      }
    }
    result.bitmap = current;
    return result;
  }

  function sourceSignature(entry) {
    if (!entry) return '';
    const parts = [];
    for (const stage of sourceStages) {
      if (!stage.signature) continue;
      try {
        const sig = stage.signature(entry);
        if (sig) parts.push(stage.key + ':' + sig);
      } catch { /* 忽略坏签名 */ }
    }
    return parts.join('|');
  }

  function buildCtx(key, panelEl, overlay) {
    return {
      call: (method, ...args) => PS.call('module_api', key, method, ...args),
      get photo() { return currentPhoto(); },
      overlay,
      panelEl,
      services: {
        showToast: (msg, kind) => PS.showToast(msg, kind),
        openQuickEdit: (photo) => {
          closeModule();
          PS.openQuickEdit(photo || currentPhoto());
        },
        closeModule: () => closeModule(),
        invalidateQuickEdit: () => {
          if (PS.refreshQuickEditAfterSourceStageChange) PS.refreshQuickEditAfterSourceStageChange();
        },
      },
      store: { getWarp: getEntry, setWarp: setEntry },
      PS,
    };
  }

  function openModule(key) {
    const def = moduleDefs.get(key);
    if (!def) {
      PS.showToast('模块尚未就绪', 'error');
      return;
    }
    capturedPhoto = (PS.state.lightbox && PS.state.lightbox.photo)
      || (PS.state.quickEdit && PS.state.quickEdit.photo)
      || null;
    if (!capturedPhoto) {
      PS.showToast('请先打开一张照片', 'error');
      return;
    }
    closeModule();
    if (!PS.state.quickEdit || !PS.state.quickEdit.open) {
      PS.openQuickEdit(capturedPhoto);
    }
    setMenuOpen(false);

    const qeEl = PS.state.quickEdit && PS.state.quickEdit.el;
    if (!qeEl) { PS.showToast('快速修图未就绪', 'error'); return; }

    const meta = moduleMeta.get(key);
    const moduleName = (meta && meta.name) || key;

    // 模块页：与其他 page 同级，挂在 .quick-edit-side 下
    const side = qeEl.querySelector('.quick-edit-side');
    const pageEl = document.createElement('div');
    pageEl.className = 'quick-edit-panel-page qe-module-page';
    pageEl.dataset.quickEditPanelPage = 'module';
    const contentEl = document.createElement('div');
    contentEl.className = 'qe-module-content';
    pageEl.appendChild(contentEl);
    if (side) side.appendChild(pageEl);

    // 模块标签：插入到标签栏 spacer 之前，保留 调参/相框
    const tabsEl = qeEl.querySelector('.quick-edit-panel-tabs');
    const tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    tabBtn.className = 'quick-edit-panel-tab qe-module-tab';
    tabBtn.dataset.quickEditPanelTab = 'module';
    tabBtn.setAttribute('aria-pressed', 'false');
    const tabLabel = document.createElement('span');
    tabLabel.className = 'qe-module-tab-label';
    tabLabel.textContent = moduleName;
    tabBtn.appendChild(tabLabel);
    const tabClose = document.createElement('span');
    tabClose.className = 'qe-module-tab-close';
    tabClose.textContent = '×';
    tabClose.title = '关闭模块';
    tabBtn.appendChild(tabClose);
    tabBtn.addEventListener('click', (ev) => {
      if (ev.target.closest('.qe-module-tab-close')) { closeModule(); return; }
      if (PS.setQuickEditPanelTab) PS.setQuickEditPanelTab('module');
    });
    if (tabsEl) {
      const spacer = tabsEl.querySelector('.qe-module-spacer');
      if (spacer) tabsEl.insertBefore(tabBtn, spacer);
      else tabsEl.appendChild(tabBtn);
    }

    const visualLayer = qeEl.querySelector('[data-quick-edit-visual-layer]');
    let overlay = null;
    if (visualLayer) {
      overlay = document.createElement('canvas');
      overlay.className = 'qe-module-overlay';
      visualLayer.appendChild(overlay);
    }

    activeKey = key;
    activeDef = def;
    PS.state.openModuleKey = key;
    screenEl = pageEl;
    moduleTabEl = tabBtn;

    const ctx = buildCtx(key, contentEl, overlay);
    try {
      def.mount(ctx, contentEl);
    } catch (err) {
      console.error('[PicScannerModules] 模块挂载失败:', key, err);
      PS.showToast('模块启动失败', 'error');
      closeModule();
      return;
    }
    if (PS.setQuickEditPanelTab) PS.setQuickEditPanelTab('module');
  }

  function closeModule() {
    if (!activeDef) return;
    const def = activeDef;
    activeDef = null;
    activeKey = '';
    PS.state.openModuleKey = '';
    try { if (def.unmount) def.unmount(); } catch (err) {
      console.error('[PicScannerModules] 模块卸载失败:', err);
    }
    if (screenEl) {
      screenEl.remove();
      screenEl = null;
    }
    if (moduleTabEl) {
      moduleTabEl.remove();
      moduleTabEl = null;
    }
    const overlay = document.querySelector('.qe-module-overlay');
    if (overlay) overlay.remove();
    if (PS.setQuickEditPanelTab) PS.setQuickEditPanelTab('adjust');
  }

  function setMenuOpen(open) {
    const { trigger, menu } = els();
    menuOpen = !!open;
    if (menuOpen) renderDropdown();
    if (menu) menu.classList.toggle('hidden', !menuOpen);
    if (trigger) trigger.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
  }

  function renderDropdown() {
    const { dropdown, menu } = els();
    if (!dropdown || !menu) return;
    const items = [...moduleMeta.values()].filter((meta) => moduleDefs.has(meta.key));
    dropdown.classList.toggle('hidden', items.length === 0);
    menu.innerHTML = '';
    items.forEach((meta) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'module-option';
      btn.setAttribute('role', 'menuitem');
      btn.dataset.moduleKey = meta.key;
      const name = document.createElement('b');
      name.textContent = meta.name;
      btn.appendChild(name);
      if (meta.description) {
        const em = document.createElement('em');
        em.textContent = meta.description;
        btn.appendChild(em);
      }
      btn.addEventListener('click', () => { setMenuOpen(false); openModule(meta.key); });
      menu.appendChild(btn);
    });
  }

  function bindDropdown() {
    document.addEventListener('click', (ev) => {
      const trigger = ev.target.closest('[data-qe-module-trigger]');
      if (trigger) {
        ev.stopPropagation();
        setMenuOpen(!menuOpen);
        return;
      }
      if (!menuOpen) return;
      const { dropdown } = els();
      if (dropdown && dropdown.contains(ev.target)) return;
      setMenuOpen(false);
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (menuOpen) { setMenuOpen(false); return; }
        if (activeKey) closeModule();
      }
    });
  }

  function injectModuleScript(url, key) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('[PicScannerModules] 模块前端加载失败:', key, url);
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  async function bootstrap() {
    bindDropdown();
    let res;
    try {
      res = await PS.call('get_modules');
    } catch (err) {
      console.warn('[PicScannerModules] get_modules 失败:', err);
      return;
    }
    const modules = (res && Array.isArray(res.modules)) ? res.modules : [];
    for (const meta of modules) {
      if (meta && meta.key) moduleMeta.set(meta.key, meta);
    }
    for (const meta of modules) {
      if (!meta || !meta.key || !meta.frontend_url) continue;
      await injectModuleScript(meta.frontend_url, meta.key);
    }
    renderDropdown();
  }

  window.PicScannerModules = {
    register(def) {
      if (!def || !def.key) return;
      moduleDefs.set(def.key, def);
      renderDropdown();
    },
    registerSourceStage(stage) {
      if (!stage || !stage.key || typeof stage.apply !== 'function') return;
      sourceStages.push(stage);
    },
    getModuleSourceEntry: getEntry,
    setModuleSourceEntry: setEntry,
    sourceStagesActive: stagesActive,
    applySourceStages,
    sourceSignature,
    openModule,
    closeModule,
    currentPhoto,
    bootstrap,
    renderDropdown,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.pywebview && window.pywebview.api) bootstrap();
    });
  } else if (window.pywebview && window.pywebview.api) {
    bootstrap();
  }
  window.addEventListener('pywebviewready', () => bootstrap());
})();
