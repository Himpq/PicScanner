import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/components/stats/SubjectPhotoCollection.vue', import.meta.url), 'utf8');
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/gm, '');
const requests = [];
const props = { sourceId: 'source', labelKey: 'architecture', label: 'Architecture' };
let reset;
let dispose;
const context = vm.createContext({
  useLightboxStore: () => ({ setNavList() {}, openLightbox() {} }),
  defineProps: () => props, defineEmits: () => {}, ref: value => ({ value }),
  nextTick: () => Promise.resolve(),
  watch: (_, callback) => { reset = callback; },
  onBeforeUnmount: callback => { dispose = callback; },
  logWarn: () => {},
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  call: (...args) => new Promise(resolve => requests.push({ args, resolve })),
});
vm.runInContext(script + '\nglobalThis.state = { items, loading, error, loadMore };', context);
const tick = () => new Promise(resolve => setImmediate(resolve));
const first = reset();
await tick();
props.labelKey = 'portrait';
const second = reset();
await tick();
requests[0].resolve({ success: true, total: 1, next_after: 1, has_more: false, items: [{ photo_id: 1 }] });
await first;
assert.equal(context.state.items.value.length, 0, 'stale page must not enter new results');
requests[1].resolve({ success: true, total: 1, next_after: 2, has_more: false, items: [{ photo_id: 2 }] });
await tick();
assert.equal(requests[2].args[0], 'get_photo_preview');
requests[2].resolve({ success: false, message: 'Preview failed' });
await second;
assert.equal(context.state.items.value.length, 1, 'failed previews must keep their photo');
assert.equal(context.state.items.value[0].photo_id, 2);
assert.equal(context.state.items.value[0].error, 'Preview failed');
await context.state.loadMore();
assert.equal(requests.length, 3, 'exhausted pages must not reload');
dispose();
process.stdout.write('subject collection request isolation tests passed\n');
