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
  const hijackSearch = () => {
    const api = window.pywebview && window.pywebview.api;
    if(!api || !api.search_photos || api._semanticHijacked) return false;
    const _origSearch = api.search_photos.bind(api);
    const PS = window.PS;
    api._semanticHijacked = true;
    api.search_photos = async (...args)=>{
      const res = await _origSearch(...args); // {success, items, photos, count}
      try{
        const q = String(args[0]||'').trim();
        if(q.length>=1 && res && res.success){
          const sid = String(args[2]|| (PS&&PS.state&&PS.state.currentSourceId) || '').trim();
          const filters = args[5]||null;
          const doSem = async (s)=> {
            const call = (PS&&PS.call) ? PS.call.bind(PS) : (m,...a)=>api.module_api(m,...a);
            return await call('module_api','semantic_search','search',q,8,s,filters);
          };
          let r = await doSem(sid);
          if((!r || !r.success || !r.results || !r.results.length) && sid){
            r = await doSem('');
          }
          if(r && r.success && Array.isArray(r.results) && r.results.length){
            const base = Array.isArray(res.items) ? res.items : [];
            const seen=new Set(base.map(x=>String(x.id||x.item_key||x.path)));
            let added=0;
            for(const x of r.results){
              const key = String(x.id||x.item_key||x.path);
              if(seen.has(key)) continue;
              seen.add(key);
              base.push(Object.assign({
                type:'photo',
                search_label:'语义',
                search_title: q,
                search_match:'语义 '+(Number(x.score).toFixed(2)),
                preview_url: x.preview_url || x.path || '',
                path: x.path||'',
                filename: (x.path||'').split(/[\\/]/).pop()||'',
              }, x));
              if(++added>=5) break;
            }
            res.items = base;
            res.count = base.length;
            if(Array.isArray(res.photos)) res.photos = base.filter(b=>b.type!=='date');
            console.log('[semantic] Ctrl+F 追加语义', r.results.length, '→', added);
          } else {
            console.log('[semantic] Ctrl+F 语义无命中', q);
          }
        }
      }catch(e){ console.warn('[semantic] Ctrl+F hijack', e); }
      return res;
    };
    // 同步也劫 PS.call 供其他路径
    if(PS && PS.call && !PS._semanticHijacked){
      const _origCall = PS.call.bind(PS);
      PS._semanticHijacked = true;
      PS.call = async (method,...args)=>{
        if(method==='search_photos') return api.search_photos(...args);
        return _origCall(method,...args);
      };
    }
    console.log('[semantic] Ctrl+F hijack ready (pywebview.api)');
    return true;
  };
  if(!hijackSearch()) setTimeout(hijackSearch, 800);
  setTimeout(hijackSearch, 1500);
  setTimeout(hijackSearch, 2500);
})();
