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
      screen: document.getElementById('collections-screen'),
      closeBtn: document.getElementById('close-collections'),
      grid: document.getElementById('collections-grid'),
      empty: document.getElementById('collections-empty'),
      count: document.getElementById('collections-count'),
      generateBtn: document.getElementById('collections-generate'),
      refreshBtn: document.getElementById('collections-refresh'),
      status: document.getElementById('collections-status'),
    };
  }
  function getDetailEls(){
    return {
      screen: document.getElementById('collection-detail-screen'),
      closeBtn: document.getElementById('close-collection-detail'),
      grid: document.getElementById('collection-detail-grid'),
      empty: document.getElementById('collection-detail-empty'),
      title: document.getElementById('collection-detail-title'),
      subtitle: document.getElementById('collection-detail-subtitle'),
      count: document.getElementById('collection-detail-count'),
      status: document.getElementById('collection-detail-status'),
    };
  }

  function currentSourceId(){
    return (state.currentSourceId || '').trim();
  }

  function setStatus(msg){
    const c = getEls();
    if(c.status) c.status.textContent = msg || '';
  }
  function setDetailStatus(msg){
    const d = getDetailEls();
    if(d.status) d.status.textContent = msg || '';
  }

  function render(){
    const c = getEls();
    if(!c.grid) return;
    const cols = state.collections || [];
    c.grid.innerHTML = '';
    if(!cols.length){
      if(c.empty) show(c.empty);
      return;
    }
    if(c.empty) hide(c.empty);
    for(const col of cols){
      const card = document.createElement('div');
      card.className = 'collection-card';
      const title = escapeHtml(col.title || '未命名');
      const sub = escapeHtml(col.subtitle || '');
      const typeLabel = col.type === 'geo' ? '地理' : '语义';
      const cnt = col.photo_count || (col.photo_ids||[]).length;
      card.innerHTML = ''
        + '<div class="collection-head">'
        +   '<h3>'+title+'<span class="badge">'+typeLabel+' · '+cnt+'张</span></h3>'
        +   '<div class="sub">'+sub+'</div>'
        + '</div>';

      const mosaic = document.createElement('div');
      const photos = (col.photos || []).slice(0,7);
      const n = photos.length;
      mosaic.className = 'mosaic' + (n===1?' single':'') + (n===2?' count-2':'');
      if(!photos.length){
        const ph = document.createElement('div');
        ph.style.cssText='display:grid;place-items:center;color:var(--muted);font-size:12px;min-height:184px';
        ph.textContent='暂无预览';
        mosaic.appendChild(ph);
      } else {
        photos.forEach((p, idx)=>{
          const item = document.createElement('div');
          item.className = 'mosaic-item';
          item.dataset.photoId = String(p.id);
          item.dataset.collectionId = String(col.id);
          const img = document.createElement('img');
          img.loading = 'lazy';
          img.alt = p.filename || '';
          img.src = p.preview_url || '';
          // 无预览时用占位渐变
          if(!p.preview_url){
            img.style.background = 'linear-gradient(135deg, #1a1a1f, #0a0a0c)';
          }
          img.onerror = function(){ this.style.display='none'; };
          item.appendChild(img);
          // 最后一张若还有剩余，叠加 +N
          if(idx===6 && cnt>7){
            const more = document.createElement('div');
            more.className = 'mosaic-more';
            more.textContent = '+' + (cnt-7);
            item.appendChild(more);
          }
          // 点击进入详情页（而非直接灯箱）
          item.addEventListener('click', ()=> openCollectionDetail(col));
          mosaic.appendChild(item);
        });
      }
      card.appendChild(mosaic);
      const foot = document.createElement('div');
      foot.className = 'collection-foot';
      foot.innerHTML = '<button class="ghost-btn small" data-action="open">查看全部 '+cnt+' 张</button>'
        + '<span style="margin-left:auto;color:var(--muted);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">'+escapeHtml(col.time_start? (col.time_start+' ~ '+(col.time_end||'')) : '')+'</span>';
      foot.querySelector('[data-action="open"]').addEventListener('click', ()=> openCollectionDetail(col));
      // 卡片整体也可点击进入详情（避免与内部点击冲突，冒泡处理）
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e)=>{
        // 若点击的是按钮本身，已处理，避免重复
        if(e.target.closest && e.target.closest('[data-action="open"]')) return;
        if(e.target.closest && e.target.closest('.mosaic-item')) return;
        openCollectionDetail(col);
      });
      c.grid.appendChild(card);
    }
    if(c.count) c.count.textContent = cols.length + ' 个集锦';
  }

  function cleanSubtitleForDetail(sub, cnt){
    let s = String(sub||'').trim();
    if(!s) return '';
    // 去重：若副标题已含“12张”则剥离，避免与右上角计数重复
    s = s.replace(/^\s*\d+\s*张\s*[·・\-—]?\s*/,'').replace(/\s*[·・]\s*\d+\s*张\s*$/,'').replace(/\s*\d+\s*张\s*/,'').trim();
    // 若剥离后为空，回退显示时间或类型
    if(!s && cnt) return '';
    return s;
  }
  function renderCollectionDetail(col){
    const d = getDetailEls();
    if(!d.grid) return;
    const photos = col.photos || [];
    const cnt = col.photo_count || (col.photo_ids||[]).length || photos.length;
    if(d.title) d.title.textContent = col.title || '未命名';
    const cleanSub = cleanSubtitleForDetail(col.subtitle, cnt);
    // 副标题若被剥离且有时间则显示时间，否则显示清理后的副标题
    let subText = cleanSub;
    if(!subText && col.time_start) subText = col.time_start + (col.time_end && col.time_end!==col.time_start ? ' ~ '+col.time_end : '');
    else if(!subText && col.type) subText = col.type==='geo' ? '地理聚类' : '语义聚类';
    if(d.subtitle){
      d.subtitle.textContent = subText || '';
      d.subtitle.style.display = subText ? '' : 'none';
    }
    if(d.count) d.count.textContent = cnt ? cnt + ' 张' : '';
    d.grid.innerHTML = '';
    if(!photos.length){
      if(d.empty) show(d.empty);
      return;
    }
    if(d.empty) hide(d.empty);
    const n = photos.length;
    // 复用 mosaic 规则，稍大：mosaic--detail
    d.grid.className = 'mosaic mosaic--detail' + (n===1?' single':'') + (n===2?' count-2':'');
    photos.forEach((p)=>{
      const item = document.createElement('div');
      item.className = 'mosaic-item';
      item.dataset.photoId = String(p.id);
      item.dataset.collectionId = String(col.id);
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = p.filename || '';
      img.src = p.preview_url || p.thumbnail_url || '';
      if(!p.preview_url && !p.thumbnail_url){
        img.style.background = 'linear-gradient(135deg, #1a1a1f, #0a0a0c)';
        img.style.minHeight = '100%';
      }
      img.onerror = function(){ this.style.display='none'; };
      item.appendChild(img);
      item.addEventListener('click', ()=> openCollectionPhoto(col, p.id));
      d.grid.appendChild(item);
    });
  }

  function isAnyLightboxOpen(){
    try{
      const lb = document.getElementById('lightbox');
      if(lb && !lb.classList.contains('hidden') && lb.offsetParent !== null) return true;
      if(lb && !lb.classList.contains('hidden')) return true;
      const vueLb = document.getElementById('vue-lightbox');
      if(vueLb){
        const shell = vueLb.querySelector('.ps-lightbox-shell');
        if(shell){
          // vue 壳存在即视为打开（offsetParent 可能为 null 时仍算打开，因 v-if 已控制）
          return true;
        }
        if(vueLb.querySelector('.lightbox')) return true;
        if(vueLb.children.length>0 && vueLb.style.display!=='none'){
          const hasImg = vueLb.querySelector('img');
          if(hasImg) return true;
        }
      }
      if(document.querySelector('.ps-lightbox-shell')) return true;
      if(document.querySelector('.lightbox:not(.hidden) #lightbox-img')) return true;
    }catch{}
    try{ if(window.__lightboxStore && window.__lightboxStore.open) return true; }catch{}
    try{
      if(PS && PS.state && PS.state.lightbox && PS.state.lightbox.photo){
        if(window.__lightboxStore && window.__lightboxStore.open) return true;
        const lb2 = document.getElementById('lightbox');
        if(lb2 && !lb2.classList.contains('hidden')) return true;
        // 兜底：只要有 photo 且存在任意 lightbox 元素
        if(document.querySelector('.ps-lightbox-shell') || document.querySelector('#vue-lightbox img')) return true;
      }
    }catch{}
    return false;
  }

  function openCollectionPhoto(col, photoId){
    const ids = col.photo_ids || [];
    const photos = col.photos || [];
    let target = photos.find(p=> String(p.id)===String(photoId));
    if(!target){
      target = { id: photoId, preview_url: '', lightbox_url:'', original_url:'', path: '' };
    }
    const ordered = ids.map(id=> {
      const p = photos.find(x=> String(x.id)===String(id)) || { id: id, preview_url:'', lightbox_url:'', original_url:'', path:'' };
      return {
        id: Number(p.id),
        preview_url: p.preview_url || p.thumbnail_url || '',
        lightbox_url: p.lightbox_url || p.original_url || '',
        original_url: p.original_url || p.lightbox_url || '',
        thumbnail_url: p.thumbnail_url || p.preview_url || '',
        path: p.path || '',
        filename: p.filename || '',
        width: p.width, height: p.height, orientation: p.orientation,
        previewable: true,
        date_key: p.date_key || '',
        datetime_original: p.datetime_original || '',
        make: p.make || '', model: p.model || '', lens_model: p.lens_model || '',
        f_number: p.f_number, exposure_time: p.exposure_time || '', exposure_seconds: p.exposure_seconds,
        iso: p.iso, focal_length: p.focal_length, focal_length_35mm: p.focal_length_35mm,
        aperture_bucket: p.aperture_bucket || '', focal_bucket: p.focal_bucket || '', iso_bucket: p.iso_bucket || '',
        gps_lat: p.gps_lat, gps_lon: p.gps_lon, gps_place: p.gps_place || ''
      };
    });
    window.__collectionsLightboxList = ordered;
    const idx = ordered.findIndex(p=> String(p.id)===String(photoId));
    const psPhoto = {
      id: Number(target.id),
      preview_url: target.preview_url || target.thumbnail_url || '',
      thumbnail_url: target.thumbnail_url || target.preview_url || '',
      lightbox_url: target.lightbox_url || target.original_url || '',
      original_url: target.original_url || target.lightbox_url || '',
      previewable: true,
      filename: target.filename || '',
      path: target.path || '',
      width: target.width, height: target.height, orientation: target.orientation,
      date_key: target.date_key || '', datetime_original: target.datetime_original || '',
      make: target.make || '', model: target.model || '', lens_model: target.lens_model || '',
      f_number: target.f_number, exposure_time: target.exposure_time || '', exposure_seconds: target.exposure_seconds,
      iso: target.iso, focal_length: target.focal_length, focal_length_35mm: target.focal_length_35mm,
      aperture_bucket: target.aperture_bucket || '', focal_bucket: target.focal_bucket || '', iso_bucket: target.iso_bucket || '',
      gps_lat: target.gps_lat, gps_lon: target.gps_lon, gps_place: target.gps_place || ''
    };
    PS.__collectionsContext = { collectionId: col.id, list: ordered, index: idx>=0?idx:0 };
    try{ PS.openLightbox(psPhoto); }catch(e){ console.warn(e); showToast('灯箱打开失败'); }
    patchLightboxNav();
  }

  function patchLightboxNav(){
    if(PS.__collectionsPatched) return;
    const handlerPrev = (e)=>{
      const ctx = PS.__collectionsContext;
      if(!ctx || !ctx.list) return;
      if(!isAnyLightboxOpen()) return;
      e.preventDefault(); e.stopImmediatePropagation();
      ctx.index = (ctx.index -1 + ctx.list.length) % ctx.list.length;
      const p = ctx.list[ctx.index];
      PS.openLightbox({ id: p.id, preview_url: p.preview_url, thumbnail_url: p.thumbnail_url||p.preview_url, lightbox_url: p.lightbox_url||p.original_url||'', original_url: p.original_url||p.lightbox_url||'', previewable:true, filename:p.filename, path:p.path, width:p.width, height:p.height, orientation:p.orientation, date_key:p.date_key, datetime_original:p.datetime_original, make:p.make, model:p.model, lens_model:p.lens_model, f_number:p.f_number, exposure_time:p.exposure_time, exposure_seconds:p.exposure_seconds, iso:p.iso, focal_length:p.focal_length, focal_length_35mm:p.focal_length_35mm, aperture_bucket:p.aperture_bucket, focal_bucket:p.focal_bucket, iso_bucket:p.iso_bucket, gps_lat:p.gps_lat, gps_lon:p.gps_lon, gps_place:p.gps_place });
    };
    const handlerNext = (e)=>{
      const ctx = PS.__collectionsContext;
      if(!ctx || !ctx.list) return;
      if(!isAnyLightboxOpen()) return;
      e.preventDefault(); e.stopImmediatePropagation();
      ctx.index = (ctx.index +1) % ctx.list.length;
      const p = ctx.list[ctx.index];
      PS.openLightbox({ id: p.id, preview_url: p.preview_url, thumbnail_url: p.thumbnail_url||p.preview_url, lightbox_url: p.lightbox_url||p.original_url||'', original_url: p.original_url||p.lightbox_url||'', previewable:true, filename:p.filename, path:p.path, width:p.width, height:p.height, orientation:p.orientation, date_key:p.date_key, datetime_original:p.datetime_original, make:p.make, model:p.model, lens_model:p.lens_model, f_number:p.f_number, exposure_time:p.exposure_time, exposure_seconds:p.exposure_seconds, iso:p.iso, focal_length:p.focal_length, focal_length_35mm:p.focal_length_35mm, aperture_bucket:p.aperture_bucket, focal_bucket:p.focal_bucket, iso_bucket:p.iso_bucket, gps_lat:p.gps_lat, gps_lon:p.gps_lon, gps_place:p.gps_place });
    };
    // vanilla 按钮（若存在）+ 委托监听 vue 工具栏
    const origPrev = document.getElementById('lightbox-prev');
    const origNext = document.getElementById('lightbox-next');
    if(origPrev) origPrev.addEventListener('click', handlerPrev, true);
    if(origNext) origNext.addEventListener('click', handlerNext, true);
    // 全局捕获，覆盖 vue 侧的按钮（.lightbox 内的 prev/next）
    document.addEventListener('click', (e)=>{
      const t=e.target;
      if(!(t instanceof Element)) return;
      // vue 侧按钮通常无 id，靠 aria-label/类名判断
      const isPrev = t.closest && (t.closest('[aria-label="上一张"]') || t.closest('.lightbox-prev') || t.closest('[data-prev]'));
      const isNext = t.closest && (t.closest('[aria-label="下一张"]') || t.closest('.lightbox-next') || t.closest('[data-next]'));
      if(isPrev) handlerPrev(e);
      if(isNext) handlerNext(e);
    }, true);
    // 键盘左右也劫持（当集锦上下文存在时，用集锦列表翻页）
    document.addEventListener('keydown', (e)=>{
      const ctx = PS.__collectionsContext;
      if(!ctx || !ctx.list) return;
      if(!isAnyLightboxOpen()) return;
      if(e.key==='ArrowLeft'){ handlerPrev(e); }
      if(e.key==='ArrowRight'){ handlerNext(e); }
    }, true);
    // 额外劫持 Vue store 的 prev/next，确保集锦上下文内翻页走集锦列表而非图库
    try {
      const st = window.__lightboxStore;
      if (st && !st.__collectionsWrapped) {
        const origNextStore = st.nextPhoto ? st.nextPhoto.bind(st) : null;
        const origPrevStore = st.prevPhoto ? st.prevPhoto.bind(st) : null;
        st.nextPhoto = () => {
          const ctx2 = PS.__collectionsContext;
          if (ctx2 && ctx2.list && isAnyLightboxOpen()) return handlerNext({ preventDefault(){}, stopImmediatePropagation(){} });
          return origNextStore ? origNextStore() : null;
        };
        st.prevPhoto = () => {
          const ctx2 = PS.__collectionsContext;
          if (ctx2 && ctx2.list && isAnyLightboxOpen()) return handlerPrev({ preventDefault(){}, stopImmediatePropagation(){} });
          return origPrevStore ? origPrevStore() : null;
        };
        st.__collectionsWrapped = true;
      } else if (!st) {
        // store 尚未就绪，延迟重试一次
        setTimeout(()=>{
          try{
            const st2 = window.__lightboxStore;
            if(st2 && !st2.__collectionsWrapped){
              const oN = st2.nextPhoto.bind(st2), oP = st2.prevPhoto.bind(st2);
              st2.nextPhoto = ()=>{ const c=PS.__collectionsContext; if(c&&c.list&&isAnyLightboxOpen()) return handlerNext({preventDefault(){},stopImmediatePropagation(){}}); return oN(); };
              st2.prevPhoto = ()=>{ const c=PS.__collectionsContext; if(c&&c.list&&isAnyLightboxOpen()) return handlerPrev({preventDefault(){},stopImmediatePropagation(){}}); return oP(); };
              st2.__collectionsWrapped = true;
            }
          }catch{}
        }, 800);
      }
    } catch {}
    PS.__collectionsPatched = true;
  }

  function openCollectionDetail(col){
    // col 可能是列表中的简略对象
    const colId = col && col.id ? String(col.id) : String(col || '');
    if(!colId){ showToast('集锦不存在'); return; }
    const d = getDetailEls();
    if(!d.screen){ return; }
    // 若已在详情页且是同一集锦，直接返回
    if(state.collectionDetailOpen && state.collectionDetail && String(state.collectionDetail.id)===colId) return;
    // 先用列表中的简略信息快速占位
    const stub = (typeof col === 'object' && col) ? col : null;
    state.collectionDetail = stub ? Object.assign({}, stub) : { id: colId, title: '加载中…', subtitle: '' , photo_ids: [], photos: [] };
    state.collectionDetailOpen = true;
    // 展示详情页（盖在列表之上）
    d.screen.classList.remove('leaving');
    show(d.screen);
    requestAnimationFrame(()=> d.screen.classList.add('entering'));
    setTimeout(()=> d.screen.classList.remove('entering'), 360);
    const stubCnt = stub ? (stub.photo_count || (stub.photo_ids||[]).length || 0) : 0;
    if(d.title) d.title.textContent = stub ? (stub.title || '未命名') : '加载中…';
    const stubClean = stub ? cleanSubtitleForDetail(stub.subtitle, stubCnt) : '';
    let stubSub = stubClean;
    if(!stubSub && stub && stub.time_start) stubSub = stub.time_start + (stub.time_end && stub.time_end!==stub.time_start ? ' ~ '+stub.time_end : '');
    if(d.subtitle){ d.subtitle.textContent = stubSub || ''; d.subtitle.style.display = stubSub ? '' : 'none'; }
    if(d.count) d.count.textContent = stubCnt ? stubCnt + ' 张' : '';
    setDetailStatus('加载中…');
    if(d.grid) d.grid.innerHTML = '';
    if(d.empty) hide(d.empty);

    call('module_api','collections','get', colId).then(res=>{
      if(!res || !res.success || !res.collection){
        setDetailStatus(res && res.message ? res.message : '加载失败');
        showToast(res && res.message ? res.message : '加载失败');
        return;
      }
      const data = res.collection;
      // 组装完整 col：photo_details 已带 preview/lightbox
      const details = data.photo_details || [];
      const ids = data.photo_ids || details.map(p=> p.id);
      const fullCol = {
        id: String(data.id || colId),
        title: data.title || (stub && stub.title) || '未命名',
        subtitle: data.subtitle || (stub && stub.subtitle) || '',
        type: data.type || (stub && stub.type) || 'semantic',
        photo_ids: ids.map(v=> Number(v)),
        photos: details.map(p=> ({
          id: Number(p.id),
          preview_url: p.preview_url || p.thumbnail_url || '',
          thumbnail_url: p.thumbnail_url || p.preview_url || '',
          lightbox_url: p.lightbox_url || p.original_url || '',
          original_url: p.original_url || p.lightbox_url || '',
          path: p.path || '',
          filename: p.filename || '',
          width: p.width, height: p.height, orientation: p.orientation,
          date_key: p.date_key || '', datetime_original: p.datetime_original || '',
          make: p.make || '', model: p.model || '', lens_model: p.lens_model || '',
          f_number: p.f_number, exposure_time: p.exposure_time || '', exposure_seconds: p.exposure_seconds,
          iso: p.iso, focal_length: p.focal_length, focal_length_35mm: p.focal_length_35mm,
          aperture_bucket: p.aperture_bucket || '', focal_bucket: p.focal_bucket || '', iso_bucket: p.iso_bucket || '',
          gps_lat: p.gps_lat, gps_lon: p.gps_lon, gps_place: p.gps_place || '',
          previewable: true
        })),
        photo_count: (data.photo_ids||[]).length || details.length,
        time_start: data.time_start || (stub && stub.time_start) || '',
        time_end: data.time_end || (stub && stub.time_end) || ''
      };
      state.collectionDetail = fullCol;
      setDetailStatus('');
      renderCollectionDetail(fullCol);
    }).catch(err=>{
      setDetailStatus('加载异常: '+(err && err.message || err));
      showToast('详情加载失败');
    });
  }

  function closeCollectionDetail(){
    const d = getDetailEls();
    if(!d.screen || d.screen.classList.contains('hidden')) return;
    state.collectionDetailOpen = false;
    d.screen.classList.remove('entering');
    d.screen.classList.add('leaving');
    setTimeout(()=>{ hide(d.screen); d.screen.classList.remove('leaving'); }, 130);
    // 不清除 PS.__collectionsContext，保留灯箱上下文直到灯箱关闭；若灯箱未开则可清
    if(!isAnyLightboxOpen()) PS.__collectionsContext = null;
  }

  function fetchCollections(){
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
    fetchCollections();
  }

  function closeScreen(){
    const c = getEls();
    // 先关详情
    closeCollectionDetail();
    if(!c.screen || c.screen.classList.contains('hidden')) return;
    state.collectionsOpen = false;
    c.screen.classList.remove('entering');
    c.screen.classList.add('leaving');
    setTimeout(()=>{ hide(c.screen); c.screen.classList.remove('leaving'); }, 130);
    PS.__collectionsContext = null;
  }

  // 暴露给全局
  PS.openCollections = openScreen;
  PS.closeCollections = closeScreen;
  PS.fetchCollections = fetchCollections;
  PS.generateCollections = generateCollections;
  PS.openCollectionDetail = openCollectionDetail;
  PS.closeCollectionDetail = closeCollectionDetail;
  PS.openCollectionPhoto = openCollectionPhoto;

  // 事件绑定（等待 DOM 就绪）
  function bind(){
    const c = getEls();
    const d = getDetailEls();
    if(c.closeBtn) c.closeBtn.addEventListener('click', closeScreen);
    if(c.refreshBtn) c.refreshBtn.addEventListener('click', fetchCollections);
    if(c.generateBtn) c.generateBtn.addEventListener('click', generateCollections);
    if(d.closeBtn) d.closeBtn.addEventListener('click', closeCollectionDetail);
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
          // 若详情页开着，也刷新详情（保持最新）
          if(state.collectionDetailOpen && state.collectionDetail){
            openCollectionDetail(state.collectionDetail);
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
          PS.__collectionsContext = null;
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
          PS.__collectionsContext = null;
        }catch{}
        return orig2.apply(this,a);
      };
    }
  }

  // 兜底：若 app_core 仍为旧缓存（无插件 tab），运行时补丁
  function ensurePluginsTab(){
    const PS = window.PS;
    if(!PS || !PS.SETTINGS_TABS) return false;
    if(PS.SETTINGS_TABS.some(t=>t.key==='plugins')) return true;
    PS.SETTINGS_TABS.splice(3,0,{key:'plugins', label:'插件', hint:'已装载模块与状态'});
    // 若设置已打开，强制重绘导航
    const nav = document.getElementById('settings-nav');
    if(nav && !nav.querySelector('[data-settings-tab="plugins"]')){
      const btn=document.createElement('button');
      btn.type='button'; btn.dataset.settingsTab='plugins';
      btn.innerHTML='<span class="settings-nav-label">插件</span>';
      btn.addEventListener('click', ()=>{
        if(PS.state) PS.state.settingsTab='plugins';
        // 优先走 Vue，未命中则走 vanilla 兜底
        const body=document.getElementById('settings-body');
        if(window.PicScannerVue && window.PicScannerVue.mount && window.PicScannerVue.mount('plugins', body)) return;
        // vanilla 兜底：直接渲染插件列表
        if(body){
          body.innerHTML='<div style="padding:12px;color:var(--muted)">读取中...</div>';
          const call = (PS.call || (window.pywebview&&window.pywebview.api? (n,...a)=>window.pywebview.api[n](...a):null));
          if(call) call('get_modules').then(res=>{
            if(!res||!res.success) throw new Error(res&&res.message||'获取失败');
            const mods=res.modules||[];
            body.innerHTML='';
            const wrap=document.createElement('div'); wrap.className='settings-stack';
            const panel=document.createElement('section'); panel.className='settings-panel';
            panel.innerHTML='<div class="settings-panel-head"><div><h3>已装载插件</h3></div></div><div class="settings-panel-body" id="plugins-vanilla-list"></div>';
            wrap.appendChild(panel); body.appendChild(wrap);
            const list=panel.querySelector('#plugins-vanilla-list');
            if(!mods.length){ list.textContent='暂无插件'; return; }
            mods.forEach(m=>{
              const card=document.createElement('div'); card.className='plugin-card';
              const letter = PS.escapeHtml(String(m.name||m.key||'?').slice(0,1).toUpperCase());
              card.innerHTML='<div class="plugin-icon">'+letter+'</div>'
                +'<div class="plugin-main"><div class="plugin-title"><span class="plugin-name">'+PS.escapeHtml(m.name||m.key)+'</span>'
                +'<span class="plugin-meta">'+PS.escapeHtml(m.key)+' · v'+PS.escapeHtml(m.version||'')+'</span></div>'
                +'<div class="plugin-desc">'+PS.escapeHtml(m.description||'—')+'</div>'
                +'<div class="plugin-foot">'+(m.frontend_url?'有前端':'纯后端')+'</div></div>';
              list.appendChild(card);
            });
          }).catch(e=>{ body.innerHTML='<div class="settings-empty" style="color:var(--danger)">'+PS.escapeHtml(String(e.message||e))+'</div>'; });
        }
      });
      // 插入到 存储 之后、快捷键 之前
      let insertBefore=null;
      nav.querySelectorAll('button').forEach(b=>{ if(b.dataset.settingsTab==='shortcuts') insertBefore=b; });
      if(insertBefore) nav.insertBefore(btn, insertBefore);
      else nav.appendChild(btn);
    }
    return true;
  }
  let pt=0; const pi=setInterval(()=>{ if(ensurePluginsTab() || ++pt>40) clearInterval(pi); }, 300);

  // 兜底2：旧缓存的 app_gallery 无 renderPluginsSettings 时，任何插件 tab 切到空体都强制 vanilla 渲染
  function renderVanillaPluginsInto(body){
    if(!body) return;
    if(body.querySelector('#plugins-vanilla-list')) return;
    const PS = window.PS;
    body.innerHTML='<div style="padding:12px;color:var(--muted)">读取中...</div>';
    const call = (PS && PS.call) ? PS.call.bind(PS) : (window.pywebview&&window.pywebview.api? (n,...a)=>window.pywebview.api[n](...a):null);
    if(!call){ body.innerHTML='<div class="settings-empty">bridge 未就绪</div>'; return; }
    call('get_modules').then(res=>{
      if(!res||!res.success) throw new Error(res&&res.message||'获取失败');
      const mods=res.modules||[];
      body.innerHTML='';
      const wrap=document.createElement('div'); wrap.className='settings-stack';
      const panel=document.createElement('section'); panel.className='settings-panel';
      panel.innerHTML='<div class="settings-panel-head"><div><h3>已装载插件</h3><p style="margin:4px 0 0;color:var(--muted);font-size:12px;">经 get_modules 查询</p></div></div><div class="settings-panel-body" id="plugins-vanilla-list"></div>';
      wrap.appendChild(panel); body.appendChild(wrap);
      const list=panel.querySelector('#plugins-vanilla-list');
      if(!mods.length){ list.textContent='暂无插件'; return; }
      mods.forEach(m=>{
        const card=document.createElement('div'); card.className='plugin-card';
        const letter = PS.escapeHtml(String(m.name||m.key||'?').slice(0,1).toUpperCase());
        card.innerHTML='<div class="plugin-icon">'+letter+'</div>'
          +'<div class="plugin-main"><div class="plugin-title"><span class="plugin-name">'+PS.escapeHtml(m.name||m.key)+'</span>'
          +'<span class="plugin-meta">'+PS.escapeHtml(m.key)+' · v'+PS.escapeHtml(m.version||'')+'</span></div>'
          +'<div class="plugin-desc">'+PS.escapeHtml(m.description||'—')+'</div>'
          +'<div class="plugin-foot">'+(m.frontend_url?'有前端':'纯后端')+'</div></div>';
        list.appendChild(card);
      });
    }).catch(e=>{ body.innerHTML='<div class="settings-empty" style="color:var(--danger)">'+ (window.PS?window.PS.escapeHtml(String(e.message||e)):String(e)) +'</div>'; });
  }
  function setupPluginsBodyObserver(){
    const body=document.getElementById('settings-body');
    const nav=document.getElementById('settings-nav');
    if(!body||!nav) return false;
    const obs=new MutationObserver(()=>{
      const active=nav.querySelector('[data-settings-tab="plugins"].active');
      if(!active) return;
      // 空体判定：无内容 / 仅 data-v-app / 暂无设置项
      const isEmpty = body.children.length===0 || body.textContent.trim()==='' || (body.hasAttribute('data-v-app') && body.textContent.trim()==='') || (body.querySelector('.settings-empty') && body.querySelector('.settings-empty').textContent.includes('暂无'));
      if(isEmpty && !body.querySelector('#plugins-vanilla-list')){
        // 清掉 Vue 残留的 data-v-app 标记，避免误判
        body.removeAttribute('data-v-app');
        renderVanillaPluginsInto(body);
      }
    });
    obs.observe(body, {childList:true, subtree:true, attributes:true, attributeFilter:['data-v-app','class']});
    obs.observe(nav, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
    // 轮询兜底（MutationObserver 在旧 WebView 可能不触发属性变化）
    setInterval(()=>{
      const act=nav.querySelector('[data-settings-tab="plugins"].active');
      const b=document.getElementById('settings-body');
      if(act && b){
        const empty = b.children.length===0 || b.textContent.trim()==='' || b.querySelector('.settings-empty');
        if(empty && !b.querySelector('#plugins-vanilla-list')) renderVanillaPluginsInto(b);
      }
    }, 600);
    return true;
  }
  let po=0; const pii=setInterval(()=>{ if(setupPluginsBodyObserver() || ++po>40) clearInterval(pii); }, 400);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>{ bind(); patchOtherScreens(); });
  else { bind(); patchOtherScreens(); }
})();
