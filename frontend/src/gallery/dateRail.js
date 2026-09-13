// The active date follows the viewport's top edge, matching date navigation.
// A section owns its trailing gap until the next date header reaches the top.
export function activeDateAtTop(sections, scrollTop) {
  if (!sections.length) return null;
  const y = Math.max(0, scrollTop);
  let lo = 0;
  let hi = sections.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sections[mid].top <= y) lo = mid + 1;
    else hi = mid;
  }
  return sections[Math.max(0, lo - 1)].dateKey;
}
