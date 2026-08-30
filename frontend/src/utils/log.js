// 前端日志出口（AGENTS.md「日志规范」）
//
// 规范：不要用 WebView 控制台输出调试日志，统一转发到 Python Terminal，
// 便于在后端统一查看。前端通过 PS.call('log', ...) 转发。
//
// 原先 usePreviewQueue.js 里有一份一模一样的私有 log()，但整个前端没人复用，
// 于是各模块各写各的 console.log —— 搜索热路径上甚至直接 dump 完整响应对象。
// 这里抽成共享出口，所有前端日志都走它。
//
// 设计要点：
// - 全同步，不返回 Promise，调用方无需 await
// - 转发失败一律静默：日志不该让业务路径抛错
// - PS 不可用时（单测 / SSR）退化为 console，避免日志凭空消失

const PREFIX = '[vue]';

function emit(level, tag, args) {
  const text = [PREFIX, tag, ...args]
    .map((a) => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    })
    .join(' ');
  const line = level === 'error' || level === 'warn' ? level.toUpperCase() + ' ' + text : text;
  const PS = (typeof window !== 'undefined' && window.PS) ? window.PS : null;
  if (PS && typeof PS.call === 'function') {
    try {
      const p = PS.call('log', line);
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return;
    } catch {}
  }
  // 后端不可达（单测、SSR、PS 未就绪）时退回控制台，而不是丢掉
  try {
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } catch {}
}

export function log(tag, ...args) {
  emit('info', tag, args);
}

export function logWarn(tag, ...args) {
  emit('warn', tag, args);
}

export function logError(tag, ...args) {
  emit('error', tag, args);
}

export default log;
