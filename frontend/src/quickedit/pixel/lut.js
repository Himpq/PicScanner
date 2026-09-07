// P5-3 · QuickEdit 像素基元 —— LUT 三线性插值与混合（纯函数，无 DOM）
// 函数体自 app.js 原样搬入。

import { clamp, quickEditClampByte } from './color.js';

export function quickEditPrepareLut(lut) {
  const size = lut.size;
  const domainMin = lut.domainMin || [0, 0, 0];
  const domainMax = lut.domainMax || [1, 1, 1];
  const key = [
    size,
    Number(domainMin[0] || 0), Number(domainMin[1] || 0), Number(domainMin[2] || 0),
    Number(domainMax[0] || 1), Number(domainMax[1] || 1), Number(domainMax[2] || 1),
  ].join('|');
  if (lut._quickEditPrepared && lut._quickEditPrepared.key === key) return lut._quickEditPrepared;
  const buildAxis = (axis) => {
    const min = Number(domainMin[axis] || 0);
    const max = Number(domainMax[axis] || 1);
    const span = Math.max(0.000001, max - min);
    const low = new Uint16Array(256);
    const high = new Uint16Array(256);
    const mix = new Float32Array(256);
    for (let value = 0; value < 256; value += 1) {
      const mapped = clamp(((value / 255) - min) / span, 0, 1) * (size - 1);
      const base = Math.floor(mapped);
      low[value] = base;
      high[value] = Math.min(size - 1, base + 1);
      mix[value] = mapped - base;
    }
    return { low, high, mix };
  };
  const red = buildAxis(0);
  const green = buildAxis(1);
  const blue = buildAxis(2);
  lut._quickEditPrepared = {
    key,
    size,
    data: lut.data,
    r0: red.low,
    r1: red.high,
    rt: red.mix,
    g0: green.low,
    g1: green.high,
    gt: green.mix,
    b0: blue.low,
    b1: blue.high,
    bt: blue.mix,
  };
  return lut._quickEditPrepared;
}

export function quickEditLerpLutChannel(data, i000, i001, i010, i011, i100, i101, i110, i111, channel, rt, gt, bt) {
  const c000 = data[i000 + channel] || 0;
  const c001 = data[i001 + channel] || 0;
  const c010 = data[i010 + channel] || 0;
  const c011 = data[i011 + channel] || 0;
  const c100 = data[i100 + channel] || 0;
  const c101 = data[i101 + channel] || 0;
  const c110 = data[i110 + channel] || 0;
  const c111 = data[i111 + channel] || 0;
  const c00 = c000 + (c100 - c000) * rt;
  const c01 = c001 + (c101 - c001) * rt;
  const c10 = c010 + (c110 - c010) * rt;
  const c11 = c011 + (c111 - c011) * rt;
  const c0 = c00 + (c10 - c00) * gt;
  const c1 = c01 + (c11 - c01) * gt;
  return c0 + (c1 - c0) * bt;
}

export function quickEditApplyLut(r, g, b, lut) {
  const data = lut.data;
  const size = lut.size;
  const r0 = lut.r0[r];
  const g0 = lut.g0[g];
  const b0 = lut.b0[b];
  const r1 = lut.r1[r];
  const g1 = lut.g1[g];
  const b1 = lut.b1[b];
  const rt = lut.rt[r];
  const gt = lut.gt[g];
  const bt = lut.bt[b];
  const i000 = ((b0 * size + g0) * size + r0) * 3;
  const i001 = ((b1 * size + g0) * size + r0) * 3;
  const i010 = ((b0 * size + g1) * size + r0) * 3;
  const i011 = ((b1 * size + g1) * size + r0) * 3;
  const i100 = ((b0 * size + g0) * size + r1) * 3;
  const i101 = ((b1 * size + g0) * size + r1) * 3;
  const i110 = ((b0 * size + g1) * size + r1) * 3;
  const i111 = ((b1 * size + g1) * size + r1) * 3;
  const outR = quickEditClampByte(quickEditLerpLutChannel(data, i000, i001, i010, i011, i100, i101, i110, i111, 0, rt, gt, bt) * 255);
  const outG = quickEditClampByte(quickEditLerpLutChannel(data, i000, i001, i010, i011, i100, i101, i110, i111, 1, rt, gt, bt) * 255);
  const outB = quickEditClampByte(quickEditLerpLutChannel(data, i000, i001, i010, i011, i100, i101, i110, i111, 2, rt, gt, bt) * 255);
  return outR | (outG << 8) | (outB << 16);
}

export function quickEditBlendLutColor(r, g, b, activeLuts) {
  if (!activeLuts || !activeLuts.length) return r | (g << 8) | (b << 16);
  let nextR = r;
  let nextG = g;
  let nextB = b;
  activeLuts.forEach((activeLut) => {
    const mapped = quickEditApplyLut(nextR, nextG, nextB, activeLut.lut);
    const strength = activeLut.strength;
    const mappedR = mapped & 255;
    const mappedG = (mapped >> 8) & 255;
    const mappedB = (mapped >> 16) & 255;
    nextR = quickEditClampByte(nextR + (mappedR - nextR) * strength);
    nextG = quickEditClampByte(nextG + (mappedG - nextG) * strength);
    nextB = quickEditClampByte(nextB + (mappedB - nextB) * strength);
  });
  return nextR | (nextG << 8) | (nextB << 16);
}
