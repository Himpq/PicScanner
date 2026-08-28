/**
 * usePreviewQueue — 等价于 legacy app_gallery.js 的 enqueuePreview / drainPreviewQueue
 * 精简为 Vue 数据驱动：不再依赖 <img> DOM，而是按 photoId 调度 get_photo_preview，
 * 成功后回填到 Pinia (photoCache) 与 legacy PS.state.photoCache，提升复用。
 *
 * 特性：
 * - 并发 PREVIEW_CONCURRENCY (默认 4)
 * - 优先级：可视区优先插队
 * - 去重：同一 photoId 不重复入队，已失败的不重试（除非 session 切换）
 * - sessionId：来源切换时递增，丢弃旧会话队列
 * - 日志走 Python Terminal（via PS.call log），不 console.log
 */
import { ref } from 'vue';
import { call } from '../bridge/index.js';
import { PREVIEW_CONCURRENCY } from '../constants.js';

export function usePreviewQueue(options = {}) {
  const concurrency = Number(options.concurrency ?? PREVIEW_CONCURRENCY) || 4;
  const getStore = options.getStore; // () => galleryStore

  const queue = ref([]); // [{photoId, dateKey, priority, sessionId}]
  const active = ref(0);
  const sessionId = ref(0);
  const pending = new Set(); // photoId string
  const failed = new Set(); // photoId string that got preview_error

  function log(...args) {
    try {
      const PS = (typeof window !== 'undefined' && window.PS) ? window.PS : null;
      if (PS && typeof PS.call === 'function') {
        // 复用后端 log 接口，静默失败
        PS.call('log', '[previewQueue] ' + args.join(' ')).catch(()=>{});
      }
    } catch {}
  }

  function bumpSession() {
    sessionId.value += 1;
    queue.value = [];
    pending.clear();
    // failed 保留，避免对同一坏图反复重试；但跨来源时可清空
    // 来源切换时调用方应自行决定是否 clearFailed
    active.value = 0;
  }

  function clearFailed() {
    failed.clear();
  }

  function isPending(photoId) {
    return pending.has(String(photoId));
  }

  function isFailed(photoId) {
    return failed.has(String(photoId));
  }

  function promoteQueuedPreview(photoId) {
    const idStr = String(photoId);
    const idx = queue.value.findIndex((it) => String(it.photoId) === idStr);
    if (idx < 0) return;
    const item = queue.value.splice(idx, 1)[0];
    item.priority = true;
    // 插到优先区末尾（第一个非优先之前）
    const firstNormal = queue.value.findIndex((q) => !q.priority);
    if (firstNormal < 0) queue.value.push(item);
    else queue.value.splice(firstNormal, 0, item);
  }

  function insertPriority(item) {
    const firstNormal = queue.value.findIndex((q) => !q.priority);
    if (firstNormal < 0) queue.value.push(item);
    else queue.value.splice(firstNormal, 0, item);
  }

  function enqueuePreview(photo, opts = {}) {
    // photo: {id, previewable, preview_url, thumbnail_url ...}
    const pid = Number(photo && (photo.id ?? photo.photo_id));
    if (!pid) return false;
    const idStr = String(pid);
    const previewUrl = photo.thumbnail_url || photo.preview_url || photo.lightbox_url || '';
    // 已有图或已失败/队列中则跳过
    if (previewUrl) return false;
    if (!photo.previewable && !photo.preview_url && !photo.is_raw) {
      // 非 previewable 且非 RAW，无需排队；RAW 会显示占位
      // 但 raw 若 previewable=false 也应显示 RAW 文字，不入队
      if (!photo.previewable) return false;
    }
    if (photo.preview_failed || isFailed(pid)) return false;
    if (isPending(pid)) {
      if (opts.priority) promoteQueuedPreview(pid);
      return false;
    }
    const priority = !!opts.priority;
    const item = { photoId: pid, dateKey: String(photo.date_key || ''), priority, sessionId: sessionId.value };
    if (priority) insertPriority(item);
    else queue.value.push(item);
    pending.add(idStr);
    drain();
    return true;
  }

  function drain() {
    while (active.value < concurrency && queue.value.length) {
      const item = queue.value.shift();
      if (!item) break;
      if (item.sessionId !== sessionId.value) {
        pending.delete(String(item.photoId));
        continue;
      }
      // 二次校验：若此时已有 preview_url，则跳过
      try {
        const store = getStore ? getStore() : null;
        if (store) {
          const arr = store.photoCache.get(item.dateKey);
          if (arr) {
            const found = arr.find((p) => Number(p.id ?? p.photo_id) === Number(item.photoId));
            if (found && (found.thumbnail_url || found.preview_url || found.lightbox_url)) {
              pending.delete(String(item.photoId));
              continue;
            }
          }
        }
      } catch {}
      active.value += 1;
      const pid = item.photoId;
      call('get_photo_preview', pid).then((res) => {
        if (item.sessionId !== sessionId.value) return;
        if (!res || !res.success || !res.photo || !res.photo.preview_url) {
          failed.add(String(pid));
          // 标记失败，刷新 store 中的 photo 以便 UI 显示错误态
          try {
            const store = getStore ? getStore() : null;
            if (store && typeof store.patchPhoto === 'function') {
              store.patchPhoto(pid, { preview_failed: true, preview_error: (res && res.message) || 'preview_failed' });
            }
            const PS = window.PS;
            if (PS && PS.state && PS.state.photoCache) {
              const prev = PS.state.photoCache.get(Number(pid)) || {};
              PS.state.photoCache.set(Number(pid), Object.assign({}, prev, { preview_failed: true }));
            }
          } catch {}
          return;
        }
        // 成功：回填
        try {
          const store = getStore ? getStore() : null;
          if (store && typeof store.patchPhoto === 'function') {
            store.patchPhoto(pid, res.photo);
          }
          const PS = window.PS;
          if (PS && PS.state && PS.state.photoCache) {
            PS.state.photoCache.set(Number(pid), Object.assign({}, PS.state.photoCache.get(Number(pid)) || {}, res.photo));
          }
        } catch {}
      }).catch(() => {
        if (item.sessionId !== sessionId.value) return;
        failed.add(String(pid));
        try {
          const store = getStore ? getStore() : null;
          if (store && typeof store.patchPhoto === 'function') {
            store.patchPhoto(pid, { preview_failed: true });
          }
        } catch {}
      }).finally(() => {
        pending.delete(String(pid));
        if (item.sessionId !== sessionId.value) return;
        active.value = Math.max(0, active.value - 1);
        // 触发下一次调度
        drain();
      });
    }
  }

  // 供外部批量入队（visible slice 优化）
  function enqueueMany(photos, priority = false) {
    let added = 0;
    for (const p of photos) {
      if (enqueuePreview(p, { priority })) added++;
    }
    return added;
  }

  return {
    queue,
    active,
    sessionId,
    pending,
    failed,
    bumpSession,
    clearFailed,
    isPending,
    isFailed,
    enqueuePreview,
    enqueueMany,
    drain,
  };
}
