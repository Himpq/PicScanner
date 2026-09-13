import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../app/ui/assets/app.js', import.meta.url), 'utf8');
const start = source.indexOf('    // Consume lightbox keys');
const end = source.indexOf('    if (state.settingsOpen || state.statsOpen) return;', start);
const handler = source.slice(start, end);
for (const vue of [false, true]) {
  for (const key of ['Escape', 'ArrowLeft', 'ArrowRight']) {
    const calls = [];
    const context = {
      ev: { key, preventDefault() {}, stopPropagation() { calls.push('consume'); } },
      isLbOpenForGuard: true,
      state: { statsOpen: true },
      window: { __lightboxStore: { open: vue, prevPhoto() { calls.push('prev'); }, nextPhoto() { calls.push('next'); } } },
      PS: { closeLightbox() { calls.push('close'); }, closeStatsPage() { calls.push('stats'); }, navigateLightbox(dir) { calls.push(dir < 0 ? 'prev' : 'next'); } },
    };
    vm.runInNewContext(`(function () { ${handler} })()`, context);
    assert.deepEqual(calls, ['consume', key === 'Escape' ? 'close' : key === 'ArrowLeft' ? 'prev' : 'next']);
  }
}
process.stdout.write('stats lightbox keyboard tests passed\n');
