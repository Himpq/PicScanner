<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useLightboxStore } from '../../stores/lightbox.js';
import { useGalleryStore } from '../../stores/gallery.js';

const store = useLightboxStore();
const gallery = useGalleryStore();
const photo = computed(() => store.photo);
const zoom = computed(() => store.zoom);
const panX = computed(() => store.panX);
const panY = computed(() => store.panY);

const stageRef = ref(null);
const imgRef = ref(null);
const previewUrl = ref('');
const hdUrl = ref('');
const displayW = ref('');
const displayH = ref('');
let loadToken = 0;
let dragStart = null; // {x,y,panX,panY,pointerId}
let rafPan = 0;
let pendingPan = null;

// 从 PS 复用的锚点缩放逻辑（简化版，不依赖 PS.resolveAnchoredZoomView）
function resolveZoomView(oldPan, oldZoom, nextZoom, anchor) {
  const ratio = nextZoom / oldZoom;
  if (!anchor || !stageRef.value) return { panX: oldPan.x * ratio, panY: oldPan.y * ratio, zoom: nextZoom };
  const rect = stageRef.value.getBoundingClientRect();
  const cx = rect.width / 2, cy = rect.height / 2;
  const ax = anchor.clientX - rect.left - cx;
  const ay = anchor.clientY - rect.top - cy;
  // 锚点保持不动：pan' = anchor - (anchor - pan)*ratio
  return {
    panX: ax - (ax - oldPan.x) * ratio,
    panY: ay - (ay - oldPan.y) * ratio,
    zoom: nextZoom,
  };
}

// 与 legacy app_lightbox.js 的 applyLightboxImageDisplaySize 对齐。
//
// allowUpscale 是原版就有的参数（本组件第一版复刻时漏了，写死成"永不放大"）：
//   - 显示缩略图阶段必须传 true —— 缩略图只有几百像素，不放大就会以原始小尺寸
//     显示在舞台中央，然后等高清解码完才"跳"一下变大。
//     这正是"灯箱先显示缩略图、没放大到原图尺寸"的症状。
//   - EXIF 宽高缺失时也要放大（此时只能靠缩略图的 natural 尺寸反推）
//   - 高清就位后不放太（保持 1:1，避免小图被拉糊）
function applyDisplaySize(photoObj, naturalW, naturalH, options) {
  const p = photoObj || photo.value;
  if (!p) { displayW.value=''; displayH.value=''; return; }
  let w = Number(p.width) || naturalW || 0;
  let h = Number(p.height) || naturalH || 0;
  // orientation 90/270 交换
  const ori = String(p.orientation||'').toLowerCase();
  if (['5','6','7','8'].includes(ori) || ori.includes('90') || ori.includes('270')) { const t=w; w=h; h=t; }
  if (!w || !h) { displayW.value=''; displayH.value=''; return; }
  const titlebar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--titlebar-h')) || 36;
  const maxW = Math.max(1, (stageRef.value?.clientWidth || window.innerWidth - 56));
  const maxH = Math.max(1, (stageRef.value?.clientHeight || window.innerHeight - titlebar - 116));
  const fit = Math.min(maxW / w, maxH / h);
  const scale = options && options.allowUpscale ? fit : Math.min(1, fit);
  displayW.value = Math.max(1, w * scale).toFixed(2) + 'px';
  displayH.value = Math.max(1, h * scale).toFixed(2) + 'px';
}

function warmHdCache(p) {
  if (!p || !p.previewable || p.lightbox_url) return;
  const id = Number(p.id||0);
  if (!id) return;
  // 标记去重由 store 层做，这里直接调
  const PS = window.PS;
  const call = PS && PS.call ? PS.call.bind(PS) : (window.pywebview?.api ? (m,...a)=>window.pywebview.api[m](...a) : null);
  if (!call) return;
  // 用已有的 warmLightboxCache 逻辑：get_photo_lightbox_preview
  call('get_photo_lightbox_preview', id).then(res=>{
    if (!res || !res.success || !res.photo || !res.photo.lightbox_url) return;
    const full = Object.assign({}, p, res.photo);
    // 回填 gallery store 与 lightbox
    if (gallery && gallery.photoCache) {
      const dk = String(p.date_key||'');
      if (dk) {
        const arr = gallery.photoCache.get(dk) || [];
        const idx = arr.findIndex(x=> String(x.id)===String(id));
        if (idx>=0) { arr[idx]=Object.assign({}, arr[idx], full); gallery.photoCache.set(dk, [...arr]); gallery.photoCache = new Map(gallery.photoCache); }
      }
    }
    const PS2 = window.PS;
    if (PS2 && PS2.state && PS2.state.photoCache) try{ PS2.state.photoCache.set(id, Object.assign({}, PS2.state.photoCache.get(id)||{}, full)); }catch{}
    if (store.photo && Number(store.photo.id)===id) store.photo = Object.assign({}, store.photo, full);
    // 若当前仍是该图，更新 hdUrl
    if (Number(photo.value?.id)===id) {
      hdUrl.value = full.lightbox_url || full.original_url || '';
      // 预载高清 — 完成后清除 loading/previewing
      if (hdUrl.value) { const pre=new Image(); pre.decoding='async'; pre.onload=()=>{ if(Number(photo.value?.id)===id){ const v=pre.decode?pre.decode():Promise.resolve(); v.then(()=>{ store.loading=false; store.previewing=false; if(imgRef.value){ imgRef.value.src=hdUrl.value; applyDisplaySize(full, pre.naturalWidth, pre.naturalHeight); }}).catch(()=>{ store.loading=false; }); } else { store.loading=false; }}; pre.onerror=()=>{ store.loading=false; }; pre.src=hdUrl.value; }
    }
  }).catch(()=>{});
}

function loadForPhoto(p) {
  const token = ++loadToken;
  const isCurrent = () => token===loadToken && photo.value && Number(photo.value.id)===Number(p.id);
  previewUrl.value = '';
  hdUrl.value = '';
  displayW.value=''; displayH.value='';
  // 严格复刻原版 loading/previewing 时序：缩略图优先秒显，原图加载期间显示 spinner
  store.loading = true;
  store.previewing = false;
  if (!p) { store.loading = false; return; }
  const PS = window.PS;
  const cached = (PS && PS.state && PS.state.photoCache && PS.state.photoCache.get(Number(p.id))) || p;
  // 缩略优先
  let thumb = p.thumbnail_url || p.preview_url || cached.thumbnail_url || cached.preview_url || '';
  if (!thumb) {
    try { const cardImg=document.querySelector('[data-photo-id="'+(p.id||0)+'"] img'); if(cardImg && cardImg.src) thumb=cardImg.src; } catch {}
  }
  const hd = p.lightbox_url || p.original_url || cached.lightbox_url || cached.original_url || '';
  previewUrl.value = thumb && thumb!==hd ? thumb : '';
  hdUrl.value = hd;
  // 有 EXIF 宽高就立刻按它定显示尺寸并放大到舞台，不等缩略图解码。
  // 少了这一步，缩略图会先以它自己的几百像素显示在舞台中央，
  // 等高清解码完再"跳"一下变大 —— 就是"缩略图没放大到原图尺寸"的观感。
  if (previewUrl.value && Number(p.width) > 0 && Number(p.height) > 0) {
    applyDisplaySize(p, 0, 0, { allowUpscale: true });
  }
  // 初始状态：有缩略则 previewing+loading，无缩略则 loading
  if (previewUrl.value) { store.previewing = true; store.loading = true; }
  else if (hd) { store.loading = true; }
  else if ((p.previewable || cached.previewable) && Number(p.id)) { store.loading = true; }
  // 先显示缩略
  if (previewUrl.value) {
    // 设缩略后异步校正尺寸
    nextTick(()=>{
      const pre=new Image(); pre.decoding='async'; pre.onload=()=>{ if(!isCurrent()) return; const v=pre.decode?pre.decode():Promise.resolve(); v.then(()=>{ if(!isCurrent()) return; applyDisplaySize(p, pre.naturalWidth, pre.naturalHeight, { allowUpscale: !Number(p.width) || !Number(p.height) }); }).catch(()=>{}); }; pre.src=previewUrl.value;
    });
  } else {
    // 无缩略时若可预览则后台生成缩略 — 成功后同步置 previewing
    if ((p.previewable || cached.previewable) && Number(p.id)) {
      const call2 = PS && PS.call ? PS.call.bind(PS) : (window.pywebview?.api ? (m,...a)=>window.pywebview.api[m](...a):null);
      if (call2) call2('get_photo_preview', Number(p.id)).then(res=>{ if(!isCurrent()) return; const t=res && res.success && res.photo && res.photo.preview_url; if(t){ previewUrl.value=t; store.previewing=true; nextTick(()=>{ const pre=new Image(); pre.decoding='async'; pre.onload=()=>{ if(!isCurrent()) return; const v=pre.decode?pre.decode():Promise.resolve(); v.then(()=> applyDisplaySize(p, pre.naturalWidth, pre.naturalHeight, { allowUpscale: !Number(p.width) || !Number(p.height) })).catch(()=>{}); }; pre.src=t; }); }}).catch(()=>{ if(isCurrent() && !hdUrl.value) store.loading=false; });
    }
  }
  // 高清：若无 hd 但可预览则后台生成
  if (!hdUrl.value && (p.previewable || cached.previewable) && Number(p.id)) {
    warmHdCache(cached);
  }
  // 预载高清（缩略显示后）— 加载完成即清除 loading/previewing，复刻原版 els.lightbox.classList.remove('loading')
  if (hd) {
    const pre=new Image(); pre.decoding='async';
    pre.onload=()=>{ if(!isCurrent()) return; const v=pre.decode?pre.decode():Promise.resolve(); v.then(()=>{ if(!isCurrent()) return; store.loading=false; store.previewing=false; if(imgRef.value){ imgRef.value.src=hd; applyDisplaySize(p, pre.naturalWidth, pre.naturalHeight); }}).catch(()=>{ if(isCurrent()){ store.loading=false; store.previewing=false; }}); };
    pre.onerror=()=>{ if(isCurrent()){ store.loading=false; store.previewing=false; }};
    // 若有缩略则延迟半帧再拉高清，避免抢带宽
    if (previewUrl.value) setTimeout(()=>{ if(isCurrent()) pre.src=hd; }, 120); else pre.src=hd;
  } else if (!previewUrl.value && !((p.previewable || cached.previewable) && Number(p.id))) {
    // 既无缩略也无高清且不可预览，直接结束 loading
    store.loading = false; store.previewing = false;
  }
}

watch(photo, (p)=>{ if(p) loadForPhoto(p); else { previewUrl.value=''; hdUrl.value=''; } }, { immediate:true });

function onWheel(e) {
  e.preventDefault();
  e.stopPropagation();
  const dir = e.deltaY < 0 ? 1 : -1;
  const step = 1.2;
  const cur = store.zoom || 1;
  let next = dir > 0 ? cur * step : cur / step;
  const min=0.25, max=12;
  next = Math.max(min, Math.min(max, next));
  if (Math.abs(next - cur) < 0.0001) return;
  const anchor = e; // 放大以鼠标为锚点，缩小回中（resolveZoomView 内部处理）
  const zoomingOut = next < cur;
  const view = zoomingOut ? resolveZoomView({x: store.panX, y: store.panY}, cur, next, null) : resolveZoomView({x: store.panX, y: store.panY}, cur, next, anchor);
  store.panX = view.panX; store.panY = view.panY;
  if (next <= 1) { store.panX=0; store.panY=0; }
  store.setZoom(view.zoom);
}

function schedulePan(x, y) {
  pendingPan = {x, y};
  if (rafPan) return;
  rafPan = requestAnimationFrame(()=>{
    rafPan=0;
    if (!pendingPan) return;
    store.panX = pendingPan.x;
    store.panY = pendingPan.y;
    pendingPan=null;
    store.syncToLegacy && store.syncToLegacy();
  });
}

function onPointerDown(e) {
  if (e.button!==0) return;
  const PS = window.PS;
  // 若灯箱内信息面板正在拖拽则忽略
  if (e.target && e.target.closest && e.target.closest('.lightbox-info')) return;
  dragStart = { x:e.clientX, y:e.clientY, panX: store.panX, panY: store.panY, pointerId: e.pointerId };
  store.dragging = true;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  e.preventDefault();
}
function onPointerMove(e) {
  if (!dragStart) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  // 缩放为 1 时不允许拖动
  if ((store.zoom||1) <= 1 && Math.hypot(dx,dy) < 8) return;
  schedulePan(dragStart.panX + dx, dragStart.panY + dy);
}
function onPointerUp(e) {
  if (!dragStart) return;
  dragStart = null;
  store.dragging = false;
  if (pendingPan) { store.panX=pendingPan.x; store.panY=pendingPan.y; pendingPan=null; }
  if (rafPan) { cancelAnimationFrame(rafPan); rafPan=0; }
  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  store.syncToLegacy && store.syncToLegacy();
}
function onPointerCancel(e){ onPointerUp(e); }

onMounted(() => {
  // 注意：这里不能 hydrateFromLegacy —— legacy #lightbox 在 Vue 真源模式下处于 hidden，
  // hydrate 会把 store.open 覆盖回 false，导致灯箱刚打开就自动关闭（已修复于 lightbox store）。
});
onBeforeUnmount(()=>{ if(rafPan) cancelAnimationFrame(rafPan); });

const imgSrc = computed(()=>{
  // 优先高清（若已就绪），否则缩略
  // hdUrl 已在 loadForPhoto 中异步覆盖 imgRef.src，这里计算初始 src
  return previewUrl.value || hdUrl.value || (photo.value && (photo.value.lightbox_url || photo.value.preview_url || photo.value.thumbnail_url)) || '';
});
</script>

<template>
  <div ref="stageRef" class="lightbox-stage"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <img
      v-if="imgSrc"
      ref="imgRef"
      class="lightbox-img"
      :src="imgSrc"
      :alt="photo && photo.filename ? photo.filename : ''"
      :style="{
        transform: 'translate(' + panX.toFixed(2) + 'px,' + panY.toFixed(2) + 'px) scale(' + zoom.toFixed(4) + ')',
        width: displayW || undefined,
        height: displayH || undefined
      }"
      draggable="false"
    />
    <div v-else class="lightbox-empty">未选择照片</div>
  </div>
</template>

<style scoped>
/* 完全复用 style.css 的 .lightbox-stage / .lightbox-img，不再自定义背景与 flex，避免与原版不一致 */
.lightbox-empty { color:var(--muted,#9aa0a6); font-size:14px; position:absolute; inset:0; display:grid; place-items:center; }
</style>
