// 统计分桶排序验证
// 用例直接取自 data/picscanner.db 的真实桶名（后端按 count 降序返回，前端必须重排）
import assert from 'node:assert/strict';
import {
  sortFocalBuckets, sortApertureBuckets, sortIsoBuckets, sortShutterBuckets, shutterExposure,
} from '../src/stats/bucketSort.js';

const names = (rows) => rows.map((r) => r.name);

// --- 焦段：由广到长，未知沉底 ---
assert.deepEqual(names(sortFocalBuckets([
  { name: '70-135mm (中长焦)', count: 4130 },
  { name: '35-70mm (标准)', count: 2272 },
  { name: '24-35mm (广角)', count: 2036 },
  { name: '?', count: 2017 },
  { name: '>200mm (超长焦)', count: 1201 },
  { name: '135-200mm (长焦)', count: 453 },
])), ['24-35mm (广角)', '35-70mm (标准)', '70-135mm (中长焦)', '135-200mm (长焦)', '>200mm (超长焦)', '?']);

// --- 光圈：F 值升序，未知沉底 ---
assert.deepEqual(names(sortApertureBuckets([
  { name: 'F2.8-4.0', count: 3681 },
  { name: 'F4.0-5.6', count: 2928 },
  { name: '?', count: 1990 },
  { name: 'F5.6-8.0', count: 1313 },
  { name: 'F1.4-2.0', count: 1169 },
  { name: 'F8.0-13.0', count: 757 },
  { name: 'F2.0-2.8', count: 215 },
  { name: 'F13+', count: 56 },
])), ['F1.4-2.0', 'F2.0-2.8', 'F2.8-4.0', 'F4.0-5.6', 'F5.6-8.0', 'F8.0-13.0', 'F13+', '?']);

// --- ISO：数值升序，未知沉底 ---
// 这是原先的 bug 点：Number('ISO ≤100') 会得到 NaN，所有行并列，顺序全乱
assert.deepEqual(names(sortIsoBuckets([
  { name: 'ISO ≤6400', count: 170 },
  { name: '?', count: 957 },
  { name: 'ISO ≤3200', count: 649 },
  { name: 'ISO ≤1600', count: 960 },
  { name: 'ISO ≤100', count: 5555 },
  { name: 'ISO ≥25600', count: 19 },
  { name: 'ISO ≤400', count: 1260 },
  { name: 'ISO ≤25600', count: 19 },
  { name: 'ISO ≤12800', count: 42 },
])), ['ISO ≤100', 'ISO ≤400', 'ISO ≤1600', 'ISO ≤3200', 'ISO ≤6400', 'ISO ≤12800', 'ISO ≤25600', 'ISO ≥25600', '?']);

// --- 快门：由快到慢，未知沉底 ---
// 原先 Vue 版直接 return rows，完全没排序
assert.deepEqual(names(sortShutterBuckets([
  { name: '1/250-1/60s', count: 5867 },
  { name: '1/60-1/15s', count: 1644 },
  { name: '1/1000-1/250s', count: 1614 },
  { name: '<1/1000s', count: 1264 },
  { name: '?', count: 957 },
  { name: '1/15-1/4s', count: 327 },
  { name: '1s+', count: 250 },
  { name: '1/4-1s', count: 186 },
])), ['<1/1000s', '1/1000-1/250s', '1/250-1/60s', '1/60-1/15s', '1/15-1/4s', '1/4-1s', '1s+', '?']);

// --- 曝光时间折算 ---
assert.ok(shutterExposure('<1/1000s') < shutterExposure('1/1000-1/250s'), '< 前缀应更快');
assert.ok(Math.abs(shutterExposure('1/250-1/60s') - 1 / 250) < 1e-9);
assert.ok(Math.abs(shutterExposure('1s+') - 1) < 1e-9);
assert.equal(shutterExposure('?'), Infinity);
assert.equal(shutterExposure(''), Infinity);

// --- 边界：空输入与不可解析名称不应抛错 ---
assert.deepEqual(sortShutterBuckets([]), []);
assert.deepEqual(sortIsoBuckets(null), []);
assert.equal(sortFocalBuckets([{ name: '?' }]).length, 1);
// 纯中文无数字的桶不会崩，排在可解析项之后
assert.deepEqual(names(sortApertureBuckets([{ name: '定焦' }, { name: 'F2.8' }])), ['F2.8', '定焦']);

// --- 不应修改原数组 ---
const original = [{ name: 'ISO ≤3200' }, { name: 'ISO ≤100' }];
sortIsoBuckets(original);
assert.deepEqual(names(original), ['ISO ≤3200', 'ISO ≤100'], '排序必须是纯函数，不能原地改');

console.log('统计分桶排序：全部 6 组断言通过');
