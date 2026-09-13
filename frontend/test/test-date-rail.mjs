import assert from 'node:assert/strict';
import { activeDateAtTop } from '../src/gallery/dateRail.js';

const sections = [
  { dateKey: '2026-09-12', top: 0, height: 200 },
  { dateKey: '2026-09-11', top: 228, height: 200 },
  { dateKey: '2026-09-10', top: 456, height: 1600 },
];
// A short date stays active even when the viewport center lies in an older date.
assert.equal(activeDateAtTop(sections, 228), '2026-09-11');
assert.equal(activeDateAtTop(sections, 0), '2026-09-12');
// Crossing a date header, in either direction, is the only transition boundary.
assert.equal(activeDateAtTop(sections, 455.9), '2026-09-11');
assert.equal(activeDateAtTop(sections, 456), '2026-09-10');
assert.equal(activeDateAtTop(sections, 428), '2026-09-11');
assert.equal(activeDateAtTop(sections, 1800), '2026-09-10');
assert.equal(activeDateAtTop(sections, -18), '2026-09-12');
assert.equal(activeDateAtTop([], 0), null);
process.stdout.write('date rail tests passed\n');
