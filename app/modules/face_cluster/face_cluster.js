/* face_cluster — EXIF下方第二块：人脸聚类（左侧注入保留） */
(function () {
  function pyLog(msg){
    try{
      const PS = window.PS;
      const text = String(msg);
      if(PS && PS.call) PS.call('module_api','face_cluster','log', text).catch(()=>{});
      else if(window.pywebview && window.pywebview.api && window.pywebview.api.module_api) window.pywebview.api.module_api('face_cluster','log', text).catch(()=>{});
    }catch(e){}
  }
  const mount = () => {
    if (document.getElementById("face-cluster-block")) return true;
    const anchor = document.getElementById("semantic-block") || document.getElementById("exif-block");
    if (!anchor) return false;
    const wrap = document.createElement("div");
    wrap.id = "face-cluster-block";
    wrap.className = "progress-block";
    wrap.innerHTML = "<div class=\"progress-top\"><span id=\"face-cluster-status\" class=\"progress-label\">等待人脸扫描</span><button id=\"run-face-cluster\" class=\"ghost-btn task-btn\">扫描人脸</button></div><div class=\"progress-meter\"><div class=\"progress-track\"><div id=\"face-cluster-bar\" style=\"width:0%;height:100%;background:rgba(120,200,255,0.55);transition:width .24s ease\"></div></div><span id=\"face-cluster-count\" class=\"progress-count\">0 脸</span></div><div id=\"face-cluster-message\" class=\"progress-msg\" style=\"font-size:12px;opacity:0.85\"></div>";
    anchor.insertAdjacentElement("afterend", wrap);
    const btn = document.getElementById("run-face-cluster");
    btn && btn.addEventListener("click", onRun);
    const statusEl = document.getElementById("face-cluster-status");
    if (statusEl) {
      statusEl.style.cursor = "pointer";
      statusEl.title = "点击打开人脸筛选占位页";
      statusEl.addEventListener("click", openFacePlaceholder);
    }
    ensureFacePlaceholder();
    refreshStatus();
    return true;
  };
  const resetBtn = () => {
    const btn = document.getElementById("run-face-cluster");
    if (!btn) return;
    btn.textContent = "扫描人脸";
    btn.dataset.running = "0";
    btn.classList.remove("danger");
  };
  const onRun = () => {
    const btn = document.getElementById("run-face-cluster");
    const PS = window.PS;
    if (btn && btn.dataset.running === "1") {
      (PS && PS.call ? PS.call("module_api", "face_cluster", "cancel_index") : window.pywebview.api.module_api("face_cluster", "cancel_index")).then(()=>{}).catch(()=>{});
      return;
    }
    const pState = (window.PS && window.PS.state) || {};
    const root = pState.currentRootPath || "";
    const sid = pState.currentSourceId || "";
    if (!root && !sid) {
      (window.PS && window.PS.showToast ? window.PS.showToast : (m)=>alert(m))("请先选择来源", "error");
      return;
    }
    if (btn) { btn.textContent = "停止扫描"; btn.dataset.running = "1"; btn.classList.add("danger"); }
    const sEl = document.getElementById("face-cluster-status");
    const cEl = document.getElementById("face-cluster-count");
    if(sEl) sEl.textContent = "正在比对…";
    if(cEl) cEl.textContent = "准备中…";
    const bar0=document.getElementById("face-cluster-bar"); if(bar0) bar0.style.width="4%";
    const call = (window.PS && window.PS.call) ? (a,b,c,d)=>window.PS.call(a,b,c,d) : (a,b,c,d)=>window.pywebview.api.module_api(b,c,d);
    call("module_api", "face_cluster", "build_index", sid, root).then((res) => {
      if (!res || !res.success) {
        (window.PS && window.PS.showToast ? window.PS.showToast : alert)(res && res.message ? res.message : "启动失败", "error");
        resetBtn();
      }
    }).catch((e) => { pyLog('face build_index failed: ' + e); resetBtn(); });
  };
  const onBackendEvent = (payload) => {
    const ev = payload && payload.event;
    if (ev !== "face_index_progress" && ev !== "face_index_done") return;
    const d = (payload && payload.data) || {};
    const bar = document.getElementById("face-cluster-bar");
    const status = document.getElementById("face-cluster-status");
    const count = document.getElementById("face-cluster-count");
    const msg = document.getElementById("face-cluster-message");
    if (ev === "face_index_progress") {
      const done = Number(d.done || 0), total = Number(d.total || 0);
      if (bar) bar.style.width = total > 0 ? (done / total * 100).toFixed(1) + "%" : "0%";
      if (count) count.textContent = total ? (done + " / " + total + " 图") : (d.phase==="loading_model" ? "加载模型…" : "准备中…");
      if (d.phase === "scanning_db" && status) status.textContent = "正在比对已有索引…";
      if (d.phase === "loading_model" && status) status.textContent = "正在加载人脸模型…";
      if (d.phase === "indexing" && status) status.textContent = "正在检测人脸";
      if (d.phase === "done" && status) { status.textContent = "人脸扫描完成"; resetBtn(); if (msg) msg.textContent = "完成 " + done + "/" + total + " 图，" + (d.faces||0) + " 张脸" + (d.elapsed?" 用时"+Number(d.elapsed).toFixed(1)+"s":""); refreshStatus(); }
      if (d.phase === "stopped" && status) { status.textContent = "已停止"; resetBtn(); }
      if (d.phase === "failed" && status) { status.textContent = "失败"; resetBtn(); if (msg) msg.textContent = d.error || ""; }
    }
    if (ev === "face_index_done") {
      const s = document.getElementById("face-cluster-status");
      if (s) s.textContent = "人脸扫描完成";
      resetBtn();
      refreshStatus();
    }
  };
  const refreshStatus = () => {
    const sid = (window.PS && window.PS.state && window.PS.state.currentSourceId) || "";
    const el = document.getElementById("face-cluster-count");
    if (!sid) { if (el) el.textContent = "未选择来源"; return; }
    const call = (window.PS && window.PS.call) ? (a,b,c,d)=>window.PS.call(a,b,c,d) : (a,b,c,d)=>window.pywebview.api.module_api(b,c,d);
    call("module_api", "face_cluster", "index_status", sid).then((res) => {
      if (el && res && res.success) el.textContent = "已索引 " + (res.total || 0) + " 脸 · " + (res.mode||"");
    }).catch(()=>{});
  };
  let _lastSid = "";
  const pollSource = () => {
    const cur = (window.PS && window.PS.state && window.PS.state.currentSourceId) || "";
    if (cur !== _lastSid) { _lastSid = cur; refreshStatus(); }
  };
  function ensureFacePlaceholder(){
    if (document.getElementById("face-placeholder-screen")) return;
    const ws = document.getElementById("workspace");
    if (!ws) return;
    const sec = document.createElement("section");
    sec.id = "face-placeholder-screen";
    sec.className = "settings-screen hidden";
    sec.innerHTML = '<div class="settings-topbar"><button id="close-face-placeholder" class="ghost-btn back-btn"><span aria-hidden="true">←</span><span>返回图库</span></button><div style="margin-left:12px;font-weight:700">人脸筛选</div><div id="face-ph-status" style="margin-left:auto;opacity:0.6;font-size:12px">占位页 · 参考设置页</div><button id="face-ph-refresh" class="ghost-btn" style="margin-left:8px">刷新</button></div><div class="settings-scroll"><div class="settings-body" style="padding:16px;display:flex;gap:16px;min-height:0"><div style="width:260px;border:1px solid var(--line);border-radius:10px;background:#070708;padding:12px;overflow:auto"><div style="font-weight:600">人物</div><div id="face-ph-persons" style="margin-top:8px;display:flex;flex-direction:column;gap:6px"><div style="opacity:0.6">加载中...</div></div></div><div style="flex:1;border:1px solid var(--line);border-radius:10px;padding:12px;overflow:auto"><div id="face-ph-grid" class="photo-grid" style="--photo-min-size:168px"></div><div id="face-ph-empty" style="opacity:0.5;padding:20px;text-align:center;display:none">暂无人物，先在左侧点“扫描人脸”</div></div></div></div>';
    ws.appendChild(sec);
    const back = sec.querySelector("#close-face-placeholder");
    back && back.addEventListener("click", closeFacePlaceholder);
    const ref = sec.querySelector("#face-ph-refresh");
    ref && ref.addEventListener("click", loadFacePlaceholderData);
  }
  function openFacePlaceholder(){
    ensureFacePlaceholder();
    const el = document.getElementById("face-placeholder-screen");
    if (!el) return;
    el.classList.remove("hidden");
    el.classList.add("entering");
    setTimeout(()=> el.classList.remove("entering"), 420);
    loadFacePlaceholderData();
  }
  function loadFacePlaceholderData(){
    const status = document.getElementById("face-ph-status");
    const listEl = document.getElementById("face-ph-persons");
    const gridEl = document.getElementById("face-ph-grid");
    const emptyEl = document.getElementById("face-ph-empty");
    if (!listEl || !gridEl) return;
    const sid = (window.PS && window.PS.state && window.PS.state.currentSourceId) || "";
    if (status) status.textContent = "加载中...";
    const call = (window.PS && window.PS.call) ? (a,b,c,d,e)=>window.PS.call(a,b,c,d,e) : (a,b,c,d,e)=>window.pywebview.api.module_api(b,c,d,e);
    const fetchClusters = (s)=> call("module_api","face_cluster","clusters", s, null, 50);
    fetchClusters(sid).then((res)=>{
      // 若当前来源无人物，回退全库
      if ((!res || !res.success || !res.clusters || !res.clusters.length) && sid) {
        if (status) status.textContent = "当前来源无人物，尝试全库...";
        return fetchClusters("").then((r2)=>{
          if (r2 && r2.success && r2.clusters && r2.clusters.length) return r2;
          return res;
        });
      }
      return res;
    }).then((res)=>{
      if (!res || !res.success || !res.clusters || !res.clusters.length){
        if (status) status.textContent = "暂无人物";
        listEl.innerHTML = '<div style="opacity:0.6">暂无人物<br><small>先在左侧点“扫描人脸”</small></div>';
        gridEl.innerHTML = ""; if (emptyEl) emptyEl.style.display="block"; return;
      }
      const clusters = res.clusters;
      if (status) status.textContent = `共 ${res.total_faces||0} 脸 · ${clusters.length} 人`;
      pyLog(`face clusters loaded: ${clusters.length} persons, first preview=${(clusters[0].faces[0]?.preview_url||'').slice(0,100)}`);
      if (emptyEl) emptyEl.style.display="none";
      let activeIdx = 0;
      const renderList = ()=>{
        try{
          listEl.innerHTML = "";
          clusters.forEach((cl, idx)=>{
            const el = document.createElement("div");
            el.style.cssText = "padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;gap:10px;align-items:center;border:1px solid transparent;" + (idx===activeIdx ? "background:rgba(120,200,255,0.14);border-color:rgba(120,200,255,0.28)" : "");
            el.innerHTML = '<div style="width:32px;height:32px;border-radius:50%;background:#4fa3ff;display:grid;place-items:center">'+(idx+1)+'</div><div><div>人物 '+(idx+1)+'</div><div style="opacity:0.6;font-size:11px">'+cl.size+' 张</div></div>';
            el.onclick = ()=>{ activeIdx=idx; renderList(); renderGrid(); };
            listEl.appendChild(el);
          });
        }catch(e){ pyLog('face renderList failed: ' + e); }
      };
      const renderGrid = ()=>{
        try{
          gridEl.innerHTML = "";
          const faces = (clusters[activeIdx] && clusters[activeIdx].faces) || [];
          const slice = faces.slice(0, 24);
          pyLog(`face renderGrid: cluster ${activeIdx} total ${faces.length} -> show ${slice.length}`);
          if (!faces.length) { gridEl.innerHTML = '<div style="opacity:0.5;padding:20px">该人物暂无照片</div>'; return; }
          slice.forEach((f)=>{
            const card = document.createElement("div");
            card.className = "photo-card";
            const img = document.createElement("img");
            let src = f.preview_url || f.photo_path || f.path || "";
            img.loading="lazy"; img.src = src;
            img.style.cssText="width:100%;height:100%;object-fit:cover;display:block;";
            img.onerror=()=>{ pyLog('face img load failed: ' + src.slice(0,100)); card.classList.add('preview-error'); };
            img.onload=()=>{ card.classList.add('preview-loaded'); img.classList.add('loaded'); };
            card.appendChild(img);
            gridEl.appendChild(card);
          });
          if (faces.length > slice.length) {
            const more = document.createElement("div");
            more.style.cssText="grid-column:1 / -1;opacity:0.6;padding:8px;text-align:center;font-size:12px";
            more.textContent = `仅显示前 ${slice.length} 张，共 ${faces.length} 张（后续分页）`;
            gridEl.appendChild(more);
          }
        }catch(e){ pyLog('face renderGrid failed: ' + e); }
      };
      renderList(); renderGrid();
    }).catch((e)=>{ pyLog('face placeholder load failed: ' + e); if(status) status.textContent="加载失败"; });
  }
  function closeFacePlaceholder(){
    const el = document.getElementById("face-placeholder-screen");
    if (!el) return;
    el.classList.add("leaving");
    setTimeout(()=>{ el.classList.add("hidden"); el.classList.remove("leaving"); }, 180);
  }
  // 暴露给全局便于调试
  window.PS = window.PS || {};
  window.PS.openFacePlaceholder = openFacePlaceholder;
  window.PS.closeFacePlaceholder = closeFacePlaceholder;

  const tryMount = () => { if (!mount()) setTimeout(tryMount, 600); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryMount);
  else tryMount();
  window.addEventListener("pywebviewready", tryMount);
  setTimeout(tryMount, 900);
  setTimeout(tryMount, 1800);
  const hookEvents = () => {
    const mods = window.PicScannerModules;
    if (mods && mods.onBackendEvent) { mods.onBackendEvent(onBackendEvent); return true; }
    return false;
  };
  if (!hookEvents()) setTimeout(hookEvents, 1200);
  setInterval(pollSource, 1600);
})();
