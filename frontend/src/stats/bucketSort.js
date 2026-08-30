// 统计分桶排序
//
// 后端 get_statistics_detail 返回的分桶是按 count 降序的，不是按业务顺序。
// 例如 by_shutter 返回 ['1/250-1/60s', '1/60-1/15s', '1/1000-1/250s', '<1/1000s', ...]，
// 直接画出来横轴就是乱的，所以前端必须重排。
//
// 两条通用规则：
//   1) 未知桶（'?' / 空 / '未知'）永远排在最后，不能因为解析出 NaN 就跑到最前
//   2) 其余按业务含义升序：焦段由广到长、光圈由大到小（F 值升序）、
//      ISO 由低到高、快门由快到慢

const UNKNOWN_TOKENS = new Set(['?', '？', '', '未知', 'unknown', 'none', 'null']);

function isUnknown(name) {
  return UNKNOWN_TOKENS.has(String(name == null ? '' : name).trim().toLowerCase());
}

// 统一排序：未知桶沉底，其余按 key 升序。
// key 可以是数字，也可以是数组（用于多级排序，如 ISO 先比数值再比 ≤/≥）
function compareKey(ka, kb) {
  if (Array.isArray(ka) || Array.isArray(kb)) {
    const a = Array.isArray(ka) ? ka : [ka];
    const b = Array.isArray(kb) ? kb : [kb];
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i += 1) {
      const c = compareKey(a[i], b[i]);
      if (c !== 0) return c;
    }
    return 0;
  }
  if (ka === kb) return 0;
  // Infinity（不可解析）视为最大，排最后
  return ka < kb ? -1 : 1;
}

function byKey(rows, keyOf) {
  return [...(rows || [])].sort((a, b) => {
    const ua = isUnknown(a && a.name);
    const ub = isUnknown(b && b.name);
    if (ua !== ub) return ua ? 1 : -1;
    if (ua && ub) return 0;
    return compareKey(keyOf(a), keyOf(b));
  });
}

function firstNumber(name) {
  const m = String(name || '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : Infinity;
}

// 焦段：24-35mm (广角) < 35-70mm (标准) < 70-135mm < 135-200mm < >200mm
export function sortFocalBuckets(rows) {
  return byKey(rows, (r) => firstNumber(r && r.name));
}

// 光圈：F1.4-2.0 < F2.0-2.8 < F2.8-4.0 < ... < F13+
export function sortApertureBuckets(rows) {
  return byKey(rows, (r) => firstNumber(r && r.name));
}

// ISO：ISO ≤100 < ISO ≤200 < ... < ISO ≤25600 < ISO ≥25600
export function sortIsoBuckets(rows) {
  return byKey(rows, (r) => {
    const s = String((r && r.name) || '');
    // 'ISO ≤25600' 与 'ISO ≥25600' 数值相同，带 ≥ 的是更高一档，排后面
    return [firstNumber(s), /[≥>=]/.test(s) ? 1 : 0];
  });
}

// 快门：把桶名折算成曝光秒数，按"由快到慢"升序
//   <1/1000s        -> 1/2000 = 0.0005   （带 < 表示更快，分母翻倍）
//   1/1000-1/250s   -> 1/1000 = 0.001
//   1/250-1/60s     -> 1/250  = 0.004
//   1/60-1/15s      -> 1/60   = 0.0167
//   1/15-1/4s       -> 1/15   = 0.0667
//   1/4-1s          -> 1/4    = 0.25
//   1s+             -> 1
export function shutterExposure(name) {
  const s = String(name == null ? '' : name).trim();
  if (isUnknown(s)) return Infinity;
  const frac = s.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (frac) {
    const denom = Number(frac[2]);
    if (!denom) return Infinity;
    // '<1/1000s' 比 '1/1000-1/250s' 更快，分母翻倍让曝光时间更小
    return 1 / (s.startsWith('<') || s.startsWith('＜') ? denom * 2 : denom);
  }
  const plain = s.match(/(\d+(?:\.\d+)?)\s*(?:s|秒)/i);
  if (plain) return Number(plain[1]);
  return Infinity;
}

export function sortShutterBuckets(rows) {
  return byKey(rows, (r) => shutterExposure(r && r.name));
}

export { isUnknown };
