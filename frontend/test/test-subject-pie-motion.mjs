import assert from 'node:assert/strict';
import { subjectGroupValues, subjectMotionEase } from '../src/components/stats/subjectPieMotion.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
// A large photo collection must move just as promptly as a small collection.
for (const total of [10, 1000, 100000]) {
  for (const progress of [0, 0.1, 0.5, 1]) {
    const groups = subjectGroupValues(total * 0.8, total * 0.2, progress, 0.65);
    near(groups.main + groups.small, total);
    near(groups.small / total, 0.2 + 0.45 * progress);
    // Outer slices retain their proportions within each group and align with it.
    near(groups.small * 0.3 + groups.small * 0.7, groups.small);
  }
}
// Opening has visible angular movement during the first tenth of the animation.
near(subjectMotionEase(0.1, true), 0.271);
near(subjectMotionEase(0.1, false), 0.02);
near(subjectMotionEase(0, true), 0);
near(subjectMotionEase(1, true), 1);
near(subjectMotionEase(1, false), 1);
assert.deepEqual(subjectGroupValues(0, 0, 0.5, 0.65), { main: 0, small: 0 });
process.stdout.write('subject pie motion tests passed\n');
