/* semantic_search — 在 #exif-block 下方注入「向量扫描」等待块，手动触发 */
(function () {
  const mount = () => {
    if (document.getElementById('semantic-block')) return true;
    const exif = document.getElementById('exif-block');
    if (!exif) return false;
    const wrap = document.createElement('div');
    wrap.id = 'semantic-block';
    wrap.className = 'progress-block';
    wrap.innerHTML = `
      <div class="progress-top">
        <span id="semantic-status" class="progress-label">等待向量扫描</span>
        <button id="run-semantic" class="ghost-btn task-btn">扫描向量</button>
      </div>
      <div class="progress-meter">
        <div class="progress-track"><div id="semantic-progress-bar"></div></div>
        <span id="semantic-count" class="progress-count">0 / 0</span>
      </div>
      <div id="semantic-message" class="progress-msg"></div>
    `;
    exif.insertAdjacentElement('afterend', wrap);
    // 复用 exif 进度条样式
    const style = document.createElement('style');
    style.textContent = '#semantic-progress-bar{width:0%;height:100%;background:rgba(255,255,255,0.55);transition:width .24s ease}';
    document.head.appendChild(style);
    const btn = document.getElementById('run-semantic');
    btn && btn.addEventListener('click', onRun);
    refreshStatus();
    return true;
  };

  const resetBtn = () => {
    const btn = document.getElementById('run-semantic');
    if (!btn) return;
    btn.textContent = '扫描向量';
    btn.dataset.running = '0';
    btn.classList.remove('danger');
  };

  const onRun = () => {
    const btn = document.getElementById('run-semantic');
    const PS = window.PS;
    if (btn && btn.dataset.running === '1') {
      (PS && PS.call ? PS.call('module_api', 'semantic_search', 'cancel_index') : window.pywebview.api.module_api('semantic_search', 'cancel_index')).then(()=>{}).catch(()=>{});
      return;
    }
    const pState = (window.PS && window.PS.state) || {};
    const root = pState.currentRootPath || '';
    const sid = pState.currentSourceId || '';
    if (!root && !sid) {
      (window.PS && window.PS.showToast ? window.PS.showToast : (m)=>alert(m))('请先选择来源', 'error');
      return;
    }
    if (btn) { btn.textContent = '停止向量扫描'; btn.dataset.running = '1'; btn.classList.add('danger'); }
    const sEl = document.getElementById('semantic-status');
    const cEl = document.getElementById('semantic-count');
    const mEl = document.getElementById('semantic-message');
    if(sEl) sEl.textContent = '正在比对已有索引…';
    if(cEl) cEl.textContent = '准备中…';
    if(mEl) mEl.textContent = '';
    const bar0=document.getElementById('semantic-progress-bar'); if(bar0) bar0.style.width='4%';
    const call = (window.PS && window.PS.call) ? (a,b,c,d)=>window.PS.call(a,b,c,d) : (a,b,c,d)=>window.pywebview.api.module_api(b,c,d);
    call('module_api', 'semantic_search', 'build_index', sid, root).then((res) => {
      if (!res || !res.success) {
        (window.PS && window.PS.showToast ? window.PS.showToast : alert)(res && res.message ? res.message : '启动失败', 'error');
        resetBtn();
      }
    }).catch((e) => { console.warn(e); resetBtn(); });
  };

  const onBackendEvent = (payload) => {
    const ev = payload && payload.event;
    if (ev !== 'semantic_index_progress' && ev !== 'semantic_index_done') return;
    const d = (payload && payload.data) || {};
    const bar = document.getElementById('semantic-progress-bar');
    const status = document.getElementById('semantic-status');
    const count = document.getElementById('semantic-count');
    const msg = document.getElementById('semantic-message');
    if (ev === 'semantic_index_progress') {
      const done = Number(d.done || 0), total = Number(d.total || 0);
      if (bar) bar.style.width = total > 0 ? (done / total * 100).toFixed(1) + '%' : '0%';
      if (count) count.textContent = total ? (done + ' / ' + total) : (d.phase==='loading_model' ? '加载模型中…' : '准备中…');
      if (d.phase === 'scanning_db' && status) status.textContent = '正在比对已有索引…';
      if (d.phase === 'loading_model' && status) status.textContent = '正在加载模型…';
      if (d.phase === 'indexing' && status) status.textContent = '正在向量扫描';
      if (d.phase === 'done' && status) { status.textContent = '向量扫描完成'; resetBtn(); if (msg) msg.textContent = `完成 ${done}/${total}`; }
      if (d.phase === 'stopped' && status) { status.textContent = '向量扫描已停止'; resetBtn(); }
      if (d.phase === 'failed' && status) { status.textContent = '向量扫描失败'; resetBtn(); if (msg) msg.textContent = d.error || ''; }
    }
    if (ev === 'semantic_index_done') {
      const s = document.getElementById('semantic-status');
      if (s) s.textContent = '向量扫描完成';
      resetBtn();
      refreshStatus();
    }
  };

  const refreshStatus = () => {
    const sid = (window.PS && window.PS.state && window.PS.state.currentSourceId) || '';
    const el = document.getElementById('semantic-count');
    if (!sid) { if (el) el.textContent = '未选择来源'; return; }
    const call = (window.PS && window.PS.call) ? (a,b,c,d)=>window.PS.call(a,b,c,d) : (a,b,c,d)=>window.pywebview.api.module_api(b,c,d);
    call('module_api', 'semantic_search', 'index_status', sid).then((res) => {
      if (el && res && res.success) el.textContent = `已索引 ${res.total || 0} 条`;
    }).catch(()=>{});
  };
  let _lastSid = '';
  const pollSource = () => {
    const cur = (window.PS && window.PS.state && window.PS.state.currentSourceId) || '';
    if (cur !== _lastSid) { _lastSid = cur; refreshStatus(); }
  };

  const tryMount = () => { if (!mount()) setTimeout(tryMount, 600); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount);
  else tryMount();
  window.addEventListener('pywebviewready', tryMount);
  setTimeout(tryMount, 900);

  // 接入后端事件总线 + 来源切换轮询
  const hookEvents = () => {
    const mods = window.PicScannerModules;
    if (mods && mods.onBackendEvent) { mods.onBackendEvent(onBackendEvent); return true; }
    return false;
  };
  if (!hookEvents()) setTimeout(hookEvents, 1200);
  setInterval(pollSource, 1200);

  // ---- Ctrl+F 直钩：直劫 pywebview.api.search_photos（PS.call 已被 gallery 闭包缓存，劫 PS.call 劫不到） ----
  // 修复版：不再同步等待语义（原版 await doSem 会堵塞正常的 Ctrl+F 8~10s，尤其首字 'z','wa' 等碎片查询也会触发，且并发搜索会重复加载模型）。
  // 现改为：立即返回关键词结果，语义在后台防抖静默追加；且 Vue 的 gallery.js 已接管语义追加，此处仅作为 legacy 兜底。
  const hijackSearch = () => {
    const api = window.pywebview && window.pywebview.api;
    if(!api || !api.search_photos || api._semanticHijacked) return false;
    const _origSearch = api.search_photos.bind(api);
    const PS = window.PS;
    api._semanticHijacked = true;
    let _hijackSeq = 0;
    let _hijackTimer = null;
    api.search_photos = async (...args)=>{
      const res = await _origSearch(...args); // {success, items, photos, count} —— 立即返回，不等语义
      try{
        const q = String(args[0]||'').trim();
        // Vue 已接管语义追加时，hijack 不再重复追加，避免 double
        const vueHandles = (() => {
          try { return !!(window.__galleryDoSearchSeq && window.__gallerySearchQuery); } catch(e){ return false; }
        })();
        if(vueHandles) return res;
        if(q.length<2 || !res || !res.success) return res;
        const sid = String(args[2]|| (PS&&PS.state&&PS.state.currentSourceId) || '').trim();
        const filters = args[5]||null;
        const curSeq = ++_hijackSeq;
        clearTimeout(_hijackTimer);
        _hijackTimer = setTimeout(async ()=>{
          if(curSeq !== _hijackSeq) return;
          try{
            const call = (PS&&PS.call) ? PS.call.bind(PS) : (m,...a)=>api.module_api(m,...a);
            let r = await call('module_api','semantic_search','search',q,8,sid,filters);
            if((!r || !r.success || !r.results || !r.results.length) && sid){
              if(curSeq !== _hijackSeq) return;
              r = await call('module_api','semantic_search','search',q,8,'',filters);
            }
            if(curSeq !== _hijackSeq) return;
            if(!r || !r.success || !Array.isArray(r.results) || !r.results.length) return;
            // 尝试推入 Vue store（若存在），否则仅日志
            const tryPushToVue = () => {
              try{
                const w = window;
                // gallery store 暴露的 helper
                if(w.__gallerySearchQuery && w.__gallerySearchQuery() !== q) return false;
                // 直接通过 DOM 事件通知或 store 操作：触发自定义事件让 Vue 监听
                window.dispatchEvent(new CustomEvent('semantic-append', {detail:{query:q, results:r.results}}));
                return true;
              }catch(e){ return false; }
            };
            if(!tryPushToVue()){
              console.log('[semantic] Ctrl+F 语义命中', r.results.length, '(legacy 无 Vue store，已跳过合并)');
            } else {
              console.log('[semantic] Ctrl+F 后台语义', r.results.length);
            }
          }catch(e){ console.warn('[semantic] Ctrl+F hijack bg', e); }
        }, 320);
      }catch(e){ console.warn('[semantic] Ctrl+F hijack', e); }
      return res;
    };
    // 同步也劫 PS.call 供其他路径（同样非阻塞）
    if(PS && PS.call && !PS._semanticHijacked){
      const _origCall = PS.call.bind(PS);
      PS._semanticHijacked = true;
      PS.call = async (method,...args)=>{
        if(method==='search_photos') return api.search_photos(...args);
        return _origCall(method,...args);
      };
    }
    console.log('[semantic] Ctrl+F hijack ready (pywebview.api) [non-blocking]');
    return true;
  };
  if(!hijackSearch()) setTimeout(hijackSearch, 800);
  setTimeout(hijackSearch, 1500);
  setTimeout(hijackSearch, 2500);
  // 兜底：监听后台语义追加事件，推入 Vue store
  window.addEventListener('semantic-append', (ev)=>{
    try{
      const d = ev && ev.detail; if(!d) return;
      const q = String(d.query||''); const results = Array.isArray(d.results)?d.results:[];
      if(!q || !results.length) return;
      // 若 Vue store 可访问，直接合并
      const tryVue = () => {
        // 动态拿 pinia store：通过全局暴露的 __galleryStore 若有
        const store = window.__galleryStore;
        if(store && Array.isArray(store.searchResults)){
          if(String(store.searchQuery||'') !== q) return;
          const base = store.searchResults || [];
          const seen=new Set(base.map(x=>String(x.id||x.item_key||x.path)));
          let added=0; const merged=[...base];
          for(const x of results){
            const key=String(x.id||x.item_key||x.path); if(seen.has(key)) continue; seen.add(key);
            merged.push(Object.assign({type:'photo',search_label:'语义',search_title:q,search_match:'语义 '+(Number(x.score).toFixed(2)),preview_url:x.preview_url||x.path||'',path:x.path||'',filename:(x.path||'').split(/[\\/]/).pop()||''}, x));
            if(++added>=5) break;
          }
          if(added){ store.searchResults = merged; store.searchStatus = '找到 '+merged.length+' 个结果 (含'+added+'条语义)'; }
          return true;
        }
        return false;
      };
      if(!tryVue()) console.log('[semantic] semantic-append 无 store 接管', q);
    }catch(e){ console.warn('[semantic] semantic-append', e); }
  });
})();
