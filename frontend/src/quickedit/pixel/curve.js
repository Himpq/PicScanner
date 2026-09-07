// P5-3 · QuickEdit 像素基元 —— 曲线插值（纯函数，无 DOM）
//
// 输入点必须已经由调用方归一化为按 x 升序排列的 { x, y } 数组，
// 其中 x/y 的范围是 0..100。主线程和 Worker 只负责各自的参数适配。

import { clamp } from './color.js';

export function quickEditCurveOutput(points, input) {
  const x = clamp(Number(input || 0), 0, 1) * 100;
  let index = 0;
  while (index < points.length - 2 && x > points[index + 1].x) index += 1;
  const p0 = points[Math.max(0, index - 1)];
  const p1 = points[index];
  const p2 = points[Math.min(points.length - 1, index + 1)];
  const p3 = points[Math.min(points.length - 1, index + 2)];
  const span = Math.max(0.0001, p2.x - p1.x);
  const t = clamp((x - p1.x) / span, 0, 1);
  const t2 = t * t;
  const t3 = t2 * t;
  const slope1 = (p2.y - p0.y) / Math.max(0.0001, p2.x - p0.x) * span;
  const slope2 = (p3.y - p1.y) / Math.max(0.0001, p3.x - p1.x) * span;
  const y = (2 * t3 - 3 * t2 + 1) * p1.y
    + (t3 - 2 * t2 + t) * slope1
    + (-2 * t3 + 3 * t2) * p2.y
    + (t3 - t2) * slope2;
  return clamp(y / 100, 0, 1);
}

export function quickEditCurveMap(points) {
  const map = new Array(256);
  for (let i = 0; i < 256; i += 1) {
    map[i] = Math.round(quickEditCurveOutput(points, i / 255) * 255);
  }
  return map;
}
