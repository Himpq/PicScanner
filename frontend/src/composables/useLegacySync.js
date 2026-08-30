import { onMounted, onBeforeUnmount } from 'vue';

// P1：取代原先每个岛屿各自 setInterval(hydrateFromLegacy) 的写法。
//
// 真源代理生效后，legacy 侧的状态改动有两条路径推给 Vue：
//   - 集合字段改动（dates / dateCounts / ...）→ notifying proxy
//   - 控制器级改动（批量选择、灯箱开关、快速调整、模块）→ PS.notifyVue()
// 两者都汇入同一个 rAF 合并器，所以这里不再需要轮询。
//
// 仅当代理安装失败（isSsotActive() 为 false）时才起定时器兜底，
// 行为与改动前完全一致。
function ssotActive() {
  try {
    const PV = (typeof window !== 'undefined') ? window.PicScannerVue : null;
    return !!(PV && typeof PV.isSsotActive === 'function' && PV.isSsotActive());
  } catch {
    return false;
  }
}

export function useLegacySync(syncFn, intervalMs) {
  let timer = null;
  onMounted(() => {
    syncFn();
    if (!intervalMs || intervalMs <= 0) return;
    if (ssotActive()) return;
    timer = setInterval(syncFn, intervalMs);
  });
  onBeforeUnmount(() => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });
}

export { ssotActive };
