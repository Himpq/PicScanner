// P1 · 真源反转 —— 让 Pinia 成为唯一真源，彻底结束双轨轮询。
//
// 设计要点：
//   1) 标量字段：用 Object.defineProperty 把 legacy 的 state.x 双向代理到 Pinia。
//      legacy 里 state.sortKey = 'x' 直接写进 Pinia，state.sortKey 读的也是 Pinia。
//      legacy 业务代码一行都不用改。
//
//   2) 集合字段（dates / dateCounts / ...）：legacy 仍是 owner（两边结构不同，
//      不能简单换成 Pinia 的），但给它套一层 notifying proxy —— 任何原地改动
//      或整体替换都会触发一次 rAF 合并的单向同步（legacy → Pinia）。
//      单向，所以不存在回环。
//
//   3) PS.notifyVue(reason)：给 legacy 的控制器级改动（批量选择、灯箱开关等）
//      留的显式通知口子，同样走 rAF 合并。
//
//   4) 全程 try/catch + isSsotActive() 开关。若安装失败，各岛屿回退到原轮询，
//      行为与改动前完全一致。

import { useGalleryStore } from '../stores/gallery.js';
import { logWarn } from '../utils/log.js';

const MUTATORS = new Set([
  'set', 'add', 'delete', 'clear',
  'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin',
]);

// 方法包装缓存：photoCache 这类热路径 Map 每次取方法都新建闭包会产生明显分配开销
const wrapperCache = new WeakMap();

function wrapMethod(fn, target, prop, notify) {
  let byProp = wrapperCache.get(target);
  if (!byProp) {
    byProp = new Map();
    wrapperCache.set(target, byProp);
  }
  const hit = byProp.get(prop);
  if (hit) return hit;
  const wrapped = function (...args) {
    const result = fn.apply(target, args);
    if (MUTATORS.has(prop)) notify();
    return result;
  };
  byProp.set(prop, wrapped);
  return wrapped;
}

function makeNotifying(target, notify) {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) return target;
  return new Proxy(target, {
    get(t, prop) {
      const value = t[prop];
      if (typeof value !== 'function') return value;
      return wrapMethod(value, t, prop, notify);
    },
    set(t, prop, value) {
      const ok = Reflect.set(t, prop, value);
      if (ok) notify();
      return ok;
    },
    deleteProperty(t, prop) {
      const ok = Reflect.deleteProperty(t, prop);
      if (ok) notify();
      return ok;
    },
  });
}

// ---------- 同步调度：所有来源共用一个 rAF 合并器 ----------
let scheduled = false;
const syncers = [];

export function registerLegacySyncer(fn) {
  if (typeof fn === 'function') syncers.push(fn);
}

function flush() {
  scheduled = false;
  for (let i = 0; i < syncers.length; i += 1) {
    try {
      syncers[i]();
    } catch (e) {
      logWarn('[PicScannerVue] legacy syncer failed', e);
    }
  }
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush);
  else setTimeout(flush, 16);
}

// ---------- 字段清单 ----------

// 双向代理到 Pinia 的标量 / 简单字段（这些是双轨期两边反复互抄的元凶）
const SCALAR_FIELDS = [
  'sortKey', 'sortOpen', 'filterOpen', 'activeFilter', 'filterOptions',
  'searchOpen', 'searchScope',
  'categories', 'favoriteCount', 'hiddenCount', 'activeCategory',
  'galleryItemSize', 'galleryItemSizeRaw',
  'currentRootPath', 'currentSourceId',
  'activeDate', 'dateCursor', 'noMoreDates', 'loadingDates',
];

// 由 legacy 持有、改动时单向同步到 Pinia 的集合字段
const COLLECTION_FIELDS = [
  'dates', 'dateCounts', 'dateCovers', 'dateNotes', 'visibleDates', 'dateFocus',
];

let active = false;

export function isSsotActive() {
  return active;
}

// 供 legacy 调用的显式通知口子：PS.notifyVue()
// app_core.js 会先预置一个空实现，让 legacy 的调用点在 Vue 未就绪时也不报错；
// 本函数无条件覆盖成真正的同步触发器（此时 window.PS 必定已存在）。
export function installNotifyHook() {
  const PS = window.PS;
  if (!PS) return false;
  PS.notifyVue = function notifyVue() {
    scheduleSync();
  };
  return true;
}

function proxyScalars(state, store) {
  SCALAR_FIELDS.forEach((key) => {
    if (!(key in state)) return;
    const seed = state[key];
    // 用 legacy 的初值播种 Pinia，避免首帧读到 store 默认值
    try {
      if (seed !== undefined && seed !== null) store[key] = seed;
    } catch {}
    Object.defineProperty(state, key, {
      get() {
        return store[key];
      },
      set(v) {
        store[key] = v;
      },
      enumerable: true,
      configurable: true,
    });
  });
}

function proxyCollections(state) {
  COLLECTION_FIELDS.forEach((key) => {
    if (!(key in state)) return;
    let proxy = makeNotifying(state[key], scheduleSync);
    Object.defineProperty(state, key, {
      get() {
        return proxy;
      },
      set(v) {
        // resetGallery() 会整体替换（app.js:243-261），必须重新包一层，
        // 否则替换后就退化成普通容器，再也收不到变更通知
        proxy = makeNotifying(v, scheduleSync);
        scheduleSync();
      },
      enumerable: true,
      configurable: true,
    });
  });
}

const installed = new WeakSet();

export function installLegacyStateProxy(pinia, { galleryStore } = {}) {
  const PS = (typeof window !== 'undefined' && window.PS) ? window.PS : null;
  if (!PS || !PS.state) return false;
  if (installed.has(PS.state)) return active;

  try {
    const store = (galleryStore || useGalleryStore)(pinia);
    proxyCollections(PS.state);
    proxyScalars(PS.state, store);
    installNotifyHook();
    installed.add(PS.state);
    active = true;
    return true;
  } catch (e) {
    logWarn('[PicScannerVue] 真源代理安装失败，回退轮询模式', e);
    active = false;
    return false;
  }
}
