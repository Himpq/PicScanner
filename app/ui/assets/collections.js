(function(){
  'use strict';
  const PS = window.PS;
  const state = PS.state;
  const els = PS.els;
  const call = PS.call;
  const show = PS.show;
  const hide = PS.hide;
  const escapeHtml = PS.escapeHtml;
  const showToast = PS.showToast;

  // 扩展 state
  state.collectionsOpen = false;
  state.collections = [];
  state.collectionsLoading = false;
  state.collectionDetail = null;
  state.collectionDetailOpen = false;

  // DOM refs (建在 index.html 中)
  function getEls(){
    return {
      // P3：列表屏内容已移入 Vue，close-collections / collections-grid /
      // collections-empty / collections-count / collections-generate /
      // collections-refresh / collections-status 都随 DOM 一起删除了。
      // 只保留外层容器（显隐动画仍由 legacy 驱动）。
      screen: document.getElementById('collections-screen'),
    };
  }
  function getDetailEls(){
    return {
      // P3：详情屏内容已移入 Vue，close-collection-detail / collection-detail-grid /
      // collection-detail-empty / -title / -subtitle / -count / -status 都随 DOM 一起删除了。
      // 只保留外层容器（显隐动画仍由 legacy 驱动）。
      screen: document.getElementById('collection-detail-screen'),
    };
  }

  function currentSourceId(){
    return (state.currentSourceId || '').trim();
  }

  function setStatus(msg){
    // P3：#collections-status 已随列表屏移入 Vue，状态文字改由 store 显示
    const bridge = window.PicScannerVue && window.PicScannerVue.collections;
    if(bridge && typeof bridge.setStatus === 'function'){
      bridge.setStatus(msg || '');
      return;
    }
    const c = getEls();
    if(c.status) c.status.textContent = msg || '';
  }
  function setDetailStatus(msg){
    // P3：#collection-detail-status 已随详情屏移入 Vue，状态文字改由 store 显示
    const bridge = window.PicScannerVue && window.PicScannerVue.collections;
    if(bridge && typeof bridge.setDetailStatus === 'function'){
      bridge.setDetailStatus(msg || '');
    }
  }

  // P3 · 集锦列表改由 Vue 渲染
  //
  // 原先这里是一个 78 行的 DOM 构建函数：拼 .collection-card / .collection-head /
  // .mosaic / .mosaic-item / .collection-foot，并逐个 addEventListener 打开详情。
  // 现在由 frontend/src/islands/CollectionsScreen.vue 渲染，
  // 数据来自 stores/collections.js（module_api -> collections.list）。
  //
  // 保留 render() 这个名字是因为模块内部多处调用；Vue 就绪时它只做一件事：
  // 把 legacy 的 state.collections 同步给 store（详情页等 legacy 逻辑仍会改这个 state）。
  function render(){
    const bridge = window.PicScannerVue && window.PicScannerVue.collections;
    if(bridge && typeof bridge.sync === 'function'){
      bridge.sync(state.collections || []);
      return;
    }
    // Vue 未就绪时 #collections-grid 已不存在，无 DOM 可渲染
  }

  // P3 · 集锦详情屏与灯箱导航已迁移
  //
  // 原先这里有 5 个函数共约 230 行：
  //   cleanSubtitleForDetail / renderCollectionDetail（45 行 DOM 构建）/
  //   openCollectionPhoto（52 行字段映射）/ patchLightboxNav（78 行 DOM 劫持）
  //   —— 以及 openCollectionDetail 里的取数与组装。
  //
  // 现在：
  //   详情内容  -> frontend/src/islands/CollectionDetailScreen.vue
  //   取数组装  -> stores/collections.js 的 openDetail / fetchDetail / assemble
  //   灯箱翻页  -> stores/lightbox.js 的 navList（setNavList + stepPhoto），
  //                取代了 patchLightboxNav 那套 document 捕获 + 包装 store 方法 + 轮询重试
  //
  // legacy 只保留 isAnyLightboxOpen（bind 的 ESC 判定还要用）
  // 与 openCollectionDetail / closeCollectionDetail 的容器显隐动画。

  function isAnyLightboxOpen(){
    try{ if(window.__lightboxStore && window.__lightboxStore.open) return true; }catch{}
    try{
      const lb = document.getElementById('lightbox');
      if(lb && !lb.classList.contains('hidden')) return true;
      const vueLb = document.getElementById('vue-lightbox');
      if(vueLb && vueLb.querySelector('.ps-lightbox-shell')) return true;
      if(document.querySelector('.ps-lightbox-shell')) return true;
    }catch{}
    return false;
  }

  function openCollectionDetail(col){
    // col 可能是列表中的简略对象
    const colId = col && col.id ? String(col.id) : String(col || '');
    if(!colId){ showToast('集锦不存在'); return; }
    const d = getDetailEls();
    if(!d.screen){ return; }
    // 若已在详情页且是同一集锦，直接返回
    if(state.collectionDetailOpen && state.collectionDetail && String(state.collectionDetail.id)===colId) return;
    const stub = (typeof col === 'object' && col) ? col : null;
    state.collectionDetail = stub ? Object.assign({}, stub) : { id: colId, title: '加载中…', subtitle: '' , photo_ids: [], photos: [] };
    state.collectionDetailOpen = true;
    // 容器显隐与动画仍在 legacy（.entering 动画直接作用在 topbar / scroll 上）
    d.screen.classList.remove('leaving');
    show(d.screen);
    requestAnimationFrame(()=> d.screen.classList.add('entering'));
    setTimeout(()=> d.screen.classList.remove('entering'), 360);
    // 内容取数与渲染交给 Vue
    const bridge = window.PicScannerVue && window.PicScannerVue.collections;
    if(bridge && typeof bridge.openDetail === 'function'){ bridge.openDetail(col); return; }
    setDetailStatus('集锦详情不可用');
  }

  function closeCollectionDetail(){
    const d = getDetailEls();
    if(!d.screen || d.screen.classList.contains('hidden')) return;
    state.collectionDetailOpen = false;
    const bridge = window.PicScannerVue && window.PicScannerVue.collections;
    if(bridge && typeof bridge.closeDetail === 'function') bridge.closeDetail();
    d.screen.classList.remove('entering');
    d.screen.classList.add('leaving');
    setTimeout(()=>{ hide(d.screen); d.screen.classList.remove('leaving'); }, 130);
    // 不清理灯箱的 navList：灯箱还开着时集锦翻页上下文要留着，
    // 由 lightbox store 在 open 变 false 时自行清空。
  }

  function fetchCollections(){
    // P3：优先走 Vue store，取完再把结果同步回 legacy 的 state
    const bridge = window.PicScannerVue && window.PicScannerVue.collections;
    if(bridge && typeof bridge.fetch === 'function'){
      return bridge.fetch().then((list)=>{
        state.collections = list || [];
        return list || [];
      });
    }
    const sid = currentSourceId();
    if(!sid){
      setStatus('请先选择来源');
      state.collections = [];
      render();
      return Promise.resolve();
    }
    state.collectionsLoading = true;
    setStatus('加载中…');
    return call('module_api', 'collections', 'list', sid, 24).then(res=>{
      state.collectionsLoading = false;
      if(!res || !res.success){
        setStatus(res && res.message ? res.message : '加载失败');
        state.collections = [];
        render();
        return;
      }
      state.collections = res.collections || [];
      setStatus(state.collections.length ? '' : '暂无集锦，点击“生成集锦”试试');
      render();
    }).catch(err=>{
      state.collectionsLoading = false;
      setStatus('加载异常: '+(err && err.message || err));
      state.collections = [];
      render();
    });
  }

  function generateCollections(){
    const sid = currentSourceId();
    if(!sid){ showToast('请先选择来源'); return; }
    const btn = getEls().generateBtn;
    if(btn){ btn.disabled=true; btn.textContent='生成中…'; }
    setStatus('正在聚类（可能需数秒，含标题生成）…');
    // 默认 append + 去重：replace=false
    call('module_api','collections','generate', sid, 'auto', true, '', 12, false).then(res=>{
      if(btn){ btn.disabled=false; btn.textContent='生成集锦'; }
      if(!res || !res.success){
        showToast(res && res.message ? res.message : '生成失败');
        setStatus(res && res.message || '生成失败');
        return;
      }
      const inserted = (res.inserted!=null ? res.inserted : res.count) || 0;
      const skipped = res.skipped || 0;
      const total = res.total || (inserted + skipped);
      if(inserted>0 && skipped>0){
        showToast('已追加 '+inserted+' 个集锦（去重跳过 '+skipped+' 个）');
        setStatus('已追加 '+inserted+' 个，去重跳过 '+skipped+' 个');
      } else if(inserted>0){
        showToast('已追加 '+inserted+' 个集锦');
        setStatus(inserted===total ? '' : '已追加 '+inserted+' 个');
      } else if(skipped>0){
        showToast('无新增，去重跳过 '+skipped+' 个重复集锦');
        setStatus('无新增（全部 '+skipped+' 个已存在，Jaccard≥0.85判重）');
      } else {
        showToast('已生成 '+ (res.count||0) +' 个集锦');
        setStatus('');
      }
      fetchCollections();
    }).catch(err=>{
      if(btn){ btn.disabled=false; btn.textContent='生成集锦'; }
      showToast('生成异常');
      setStatus(String(err && err.message || err));
    });
  }

  function openScreen(){
    const c = getEls();
    if(!c.screen) return;
    PS.closeSearchPanel && PS.closeSearchPanel();
    // 关闭其他面板
    if(PS.closeSettingsPage) { try{ PS.closeSettingsPage({animate:false}); }catch{} }
    if(PS.closeStatsPage) { try{ PS.closeStatsPage({animate:false}); }catch{} }
    // 若详情页开着，先关详情
    closeCollectionDetail();
    state.collectionsOpen = true;
    c.screen.classList.remove('leaving');
    show(c.screen);
    requestAnimationFrame(()=> c.screen.classList.add('entering'));
    setTimeout(()=> c.screen.classList.remove('entering'), 360);
    // P3：列表内容由 Vue 渲染，这里通知它打开并取数（bridge.open 内部会 fetch）
    const bridge = window.PicScannerVue && window.PicScannerVue.collections;
    if(bridge && typeof bridge.open === 'function') bridge.open();
    else fetchCollections();
  }

  function closeScreen(){
    const c = getEls();
    // 先关详情
    closeCollectionDetail();
    if(!c.screen || c.screen.classList.contains('hidden')) return;
    state.collectionsOpen = false;
    const bridge = window.PicScannerVue && window.PicScannerVue.collections;
    if(bridge && typeof bridge.close === 'function') bridge.close();
    c.screen.classList.remove('entering');
    c.screen.classList.add('leaving');
    setTimeout(()=>{ hide(c.screen); c.screen.classList.remove('leaving'); }, 130);
    // P3：集锦灯箱上下文改由 lightbox store 的 navList 持有，灯箱一关就自动清空
  }

  // 暴露给全局
  PS.openCollections = openScreen;
  PS.closeCollections = closeScreen;
  PS.fetchCollections = fetchCollections;
  PS.generateCollections = generateCollections;
  PS.openCollectionDetail = openCollectionDetail;
  PS.closeCollectionDetail = closeCollectionDetail;

  // 事件绑定（等待 DOM 就绪）
  function bind(){
    const c = getEls();
    if(c.closeBtn) c.closeBtn.addEventListener('click', closeScreen);
    if(c.refreshBtn) c.refreshBtn.addEventListener('click', fetchCollections);
    if(c.generateBtn) c.generateBtn.addEventListener('click', generateCollections);
    // 工具栏按钮（若存在）
    const tb = document.getElementById('open-collections');
    if(tb) tb.addEventListener('click', openScreen);
    // Vue 工具栏动态注入（免重建 vite）
    function ensureVueButton(){
      let vueTb = document.querySelector('#vue-toolbar .toolbar');
      if(!vueTb) vueTb = document.querySelector('#vue-toolbar');
      if(!vueTb) return false;
      // 若已存在“集锦”按钮（无论 id），则不再注入
      if(vueTb.textContent && vueTb.textContent.includes('集锦')) return true;
      if(vueTb.querySelector('#open-collections-vue')) return true;
      const btn = document.createElement('button');
      btn.id = 'open-collections-vue';
      btn.className = 'ghost-btn';
      btn.textContent = '集锦';
      btn.title = '集锦';
      btn.addEventListener('click', openScreen);
      const allBtns = vueTb.querySelectorAll('button');
      let insertBefore = null;
      for(const b of allBtns){ if((b.textContent||'').includes('统计')){ insertBefore=b; break; } }
      if(insertBefore) vueTb.insertBefore(btn, insertBefore);
      else {
        const spacer = vueTb.querySelector('.toolbar-spacer');
        if(spacer) vueTb.insertBefore(btn, spacer);
        else vueTb.appendChild(btn);
      }
      return true;
    }
    // 轮询至 Vue 挂载完成
    let tries=0;
    const iv=setInterval(()=>{ if(ensureVueButton() || ++tries>40) clearInterval(iv); }, 300);
    // ESC 关闭：灯箱优先，详情次之，列表最后；用 capture 确保在 app.js 之前判定，避免同一按键“灯箱+详情一起关”
    document.addEventListener('keydown', (e)=>{
      if(e.key!=='Escape') return;
      if(isAnyLightboxOpen()) return;
      if(state.collectionDetailOpen){
        e.preventDefault(); e.stopImmediatePropagation();
        closeCollectionDetail();
        return;
      }
      if(state.collectionsOpen){
        e.preventDefault(); e.stopImmediatePropagation();
        closeScreen();
      }
    }, true);
    // 监听集锦更新推送
    if(window.PicScannerModules && window.PicScannerModules._onBackendEvent){
      const orig = window.PicScannerModules._onBackendEvent;
      window.PicScannerModules._onBackendEvent = function(payload){
        try{ orig(payload); }catch{}
        if(payload && payload.event==='collections_updated'){
          if(state.collectionsOpen) fetchCollections();
          // 若详情页开着，也刷新详情（保持最新）。
          // P3：详情的完整数据在 Vue store 里，refreshDetail 直接重取，
          // 不再用 legacy 的 stub 走 openCollectionDetail（那会被“同一集锦直接返回”的守卫挡掉）。
          if(state.collectionDetailOpen){
            const bridge = window.PicScannerVue && window.PicScannerVue.collections;
            if(bridge && typeof bridge.refreshDetail === 'function') bridge.refreshDetail();
          }
        }
      };
    }
  }

  // 若设置/统计被打开，自动收起集锦与详情（立即隐藏，避免 z-index 遮挡导致“点不动”或黑屏）
  function patchOtherScreens(){
    if(PS.openSettingsPage && !PS._collectionsSettingsPatched){
      const orig = PS.openSettingsPage;
      PS._collectionsSettingsPatched = true;
      PS.openSettingsPage = function(...a){
        try{
          const d = getDetailEls();
          const c = getEls();
          if(d.screen && !d.screen.classList.contains('hidden')){ hide(d.screen); d.screen.classList.remove('leaving','entering'); state.collectionDetailOpen=false; }
          if(c.screen && !c.screen.classList.contains('hidden')){ hide(c.screen); c.screen.classList.remove('leaving','entering'); state.collectionsOpen=false; }
          // P3：容器被强制收起时也要通知 Vue，否则 store 里的 open/detailOpen 会残留 true。
          // 灯箱若开着，其 navList 由 lightbox store 自行管理，这里不动。
          const bridge = window.PicScannerVue && window.PicScannerVue.collections;
          if(bridge){
            if(typeof bridge.closeDetail === 'function') bridge.closeDetail();
            if(typeof bridge.close === 'function') bridge.close();
          }
        }catch{}
        return orig.apply(this,a);
      };
    }
    if(PS.openStatsPage && !PS._collectionsStatsPatched){
      const orig2 = PS.openStatsPage;
      PS._collectionsStatsPatched = true;
      PS.openStatsPage = function(...a){
        try{
          const d = getDetailEls();
          const c = getEls();
          if(d.screen && !d.screen.classList.contains('hidden')){ hide(d.screen); d.screen.classList.remove('leaving','entering'); state.collectionDetailOpen=false; }
          if(c.screen && !c.screen.classList.contains('hidden')){ hide(c.screen); c.screen.classList.remove('leaving','entering'); state.collectionsOpen=false; }
          // P3：容器被强制收起时也要通知 Vue，否则 store 里的 open/detailOpen 会残留 true。
          // 灯箱若开着，其 navList 由 lightbox store 自行管理，这里不动。
          const bridge = window.PicScannerVue && window.PicScannerVue.collections;
          if(bridge){
            if(typeof bridge.closeDetail === 'function') bridge.closeDetail();
            if(typeof bridge.close === 'function') bridge.close();
          }
        }catch{}
        return orig2.apply(this,a);
      };
    }
  }

  // P3 · 插件设置页的两个运行时补丁已删除
  //
  // 原先这里有：
  //   1) ensurePluginsTab() —— 若 app_core 的 SETTINGS_TABS 缺 plugins 就运行时补一个，
  //      并挂一个 300ms × 40 次（12 秒）的启动轮询
  //   2) renderVanillaPluginsInto() / setupPluginsBodyObserver() —— 监听 #settings-body
  //      在插件页为空时用 vanilla 兜底渲染，带一个 400ms × 40 次 + 600ms 常驻轮询
  //
  // 设置屏整体迁移到 Vue 后：
  //   - SETTINGS_TABS 本来就含 plugins，ensurePluginsTab 在开头就 return true，是死代码
  //   - #settings-nav 与 #settings-body 已从 index.html 移除，
  //     setupPluginsBodyObserver 的 `if(!body||!nav) return false` 恒成立，也是死代码
  // 剩下的是两个永不生效、只在启动时空转 12~16 秒的轮询，故一并删除。
  //
  // 插件页由 frontend/src/settings/PluginsSettings.vue 渲染。

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>{ bind(); patchOtherScreens(); });
  else { bind(); patchOtherScreens(); }
})();
