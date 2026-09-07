// P5-3 共享像素数学回归：主线程和 Worker 共用的纯函数必须保持可独立执行。
import assert from 'node:assert/strict';
import { quickEditCurveMap, quickEditCurveOutput } from '../src/quickedit/pixel/curve.js';
import { QUICK_EDIT_HSL_COLORS, quickEditApplyHslMixer } from '../src/quickedit/pixel/hsl.js';

const identity = [
  { x: 0, y: 0 },
  { x: 100, y: 100 },
];
assert.equal(quickEditCurveOutput(identity, 0), 0, '曲线起点应保持为 0');
assert.equal(quickEditCurveOutput(identity, 0.5), 0.5, '默认曲线中点应保持为 0.5');
assert.equal(quickEditCurveOutput(identity, 1), 1, '曲线终点应保持为 1');
const identityMap = quickEditCurveMap(identity);
assert.equal(identityMap[0], 0, '默认曲线 LUT 起点应保持为 0');
assert.equal(identityMap[255], 255, '默认曲线 LUT 终点应保持为 255');

const lifted = [
  { x: 0, y: 0 },
  { x: 50, y: 75 },
  { x: 100, y: 100 },
];
assert(quickEditCurveOutput(lifted, 0.5) > 0.7, '非线性曲线应改变中间调');
assert.notDeepEqual(quickEditCurveMap(lifted), identityMap, '非线性曲线 LUT 不应与默认曲线相同');

assert.equal(QUICK_EDIT_HSL_COLORS.length, 8, 'HSL 应暴露完整八色常量');
const packedGray = 128 | (128 << 8) | (128 << 16);
assert.equal(quickEditApplyHslMixer(128, 128, 128, []), packedGray, '无 HSL 调整时应保持像素不变');

console.log('quickedit pixel shared math: ok');
