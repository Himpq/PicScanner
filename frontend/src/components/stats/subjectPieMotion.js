// Interpolate group shares at a constant total so angular motion is independent
// of the number of classified photos. Both rings use the same group totals.
export function subjectGroupValues(mainValue, smallValue, progress, smallShare) {
  const p = Math.max(0, Math.min(1, progress));
  const total = mainValue + smallValue;
  const small = smallValue + (total * smallShare - smallValue) * p;
  return { main: total - small, small };
}

export function subjectMotionEase(ratio, expanding) {
  const t = Math.max(0, Math.min(1, ratio));
  return expanding
    ? 1 - (1 - t) ** 3
    : t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}
