// P4 store 契约单测（Vue PhotoGrid 的数据面）
//
// 覆盖五件事：
//   1. fetchPhotosForDate —— 分页拉取、offset 推进、双写 legacy 扁平缓存
//   2. patchPhoto 原地合并 —— photo 对象引用不变（不再 new Map 整体重建），
//      这是预览回填热路径去 O(N) 分配的关键，依赖它的 Vue computed 只重算一次
//   3. resetPhotoData —— 排序/筛选切换时清掉 store 照片数据，dates 保留
//   4. syncPhotoMarkFromLegacy —— legacy 的标记变更（收藏/笔记/分类）能按
//      filename 合并回 store，卡片才能响应式更新
//   5. hydrateFromLegacy —— dateExifCounts / dateCounts / dates 的同步
import assert from 'node:assert/strict';
import { computed, nextTick } from 'vue';
import { createPinia } from 'pinia';

// --- 隔离环境：store 依赖 window.PS / window.pywebview，import 前先就位 ---
const flatCache = new Map(); // PS.state.photoCache 的扁平 Map<id, photo>
const apiResponses = {};
const PS = {
  state: {
    dates: [], dateCounts: new Map(), dateExifCounts: new Map(), dateCovers: new Map(),
    dateNotes: new Map(), visibleDates: new Set(), dateFocus: new Map(),
    photoCache: flatCache, photoOffsets: new Map(), photoLoading: new Set(),
    currentRootPath: 'F:\\Photos', currentSourceId: 'src-1',
    sortKey: 'datetime_desc', searchScope: 'all', activeFilter: {},
    categories: [], favoriteCount: 0, hiddenCount: 0, activeCategory: null,
    galleryItemSize: 168, galleryItemSizeRaw: 168,
    loadingDates: false, noMoreDates: false, activeDate: null, dateCursor: null,
  },
};
globalThis.window = {
  PS,
  pywebview: {
    api: new Proxy({}, {
      get: (_t, prop) => (...args) => {
        if (apiResponses[prop]) return Promise.resolve(apiResponses[prop](...args));
        return Promise.resolve({ success: true });
      },
    }),
  },
};

const { useGalleryStore } = await import('../src/stores/gallery.js');

const pinia = createPinia();
const store = useGalleryStore(pinia);

// ============ 1) fetchPhotosForDate：分页拉取 + 双写扁平缓存 ============
{
  apiResponses.list_photos = () => Promise.resolve({
    success: true,
    photos: [
      { id: 1, filename: 'a.jpg', preview_url: '', previewable: true, favorite: false, hidden: false, note: '', category: '' },
      { id: 2, filename: 'b.jpg', preview_url: 'file:///b.jpg', previewable: true, favorite: false, hidden: false, note: '', category: '' },
      { id: 3, filename: 'c.jpg', preview_url: '', previewable: true, favorite: false, hidden: false, note: '', category: '' },
    ],
  });
  const got = await store.fetchPhotosForDate('2025-03-21');
  assert.equal(got, true, '首屏拉取应成功');
  const arr = store.photosForDate('2025-03-21');
  assert.equal(arr.length, 3, '照片应进入 store 缓存');
  assert.equal(store.photoOffsets.get('2025-03-21'), 3, 'offset 应推进');
  assert.equal(flatCache.get(1).filename, 'a.jpg', '双写进 legacy 扁平缓存（灯箱/EXIF/右键从那读）');
  assert.equal(flatCache.get(3).id, 3, '扁平缓存按 Number id 写入');
  console.log('  拉取：分页进 store 缓存，offset=3，并双写 legacy 扁平缓存');
}

// ============ 2) patchPhoto 原地合并 + computed 只重算一次 ============
{
  const arr = store.photosForDate('2025-03-21');
  const before = arr[0];
  assert.equal(before.preview_url, '', 'patch 前无预览');

  let reads = 0;
  const preview = computed(() => {
    reads += 1;
    return store.photosForDate('2025-03-21')[0].preview_url;
  });
  assert.equal(preview.value, '');
  assert.equal(reads, 1, 'computed 首次求值');

  const ok = store.patchPhoto(1, { preview_url: 'file:///a.jpg' });
  assert.equal(ok, true, 'patch 应命中');
  await nextTick();

  assert.equal(arr[0], before, '原地合并：对象引用不变，不重建数组');
  assert.equal(before.preview_url, 'file:///a.jpg', '属性已被合并');
  assert.equal(flatCache.get(1).preview_url, 'file:///a.jpg', '双写同步到 legacy 扁平缓存');
  assert.equal(preview.value, 'file:///a.jpg');
  assert.equal(reads, 2, '回填只应让 computed 重算一次（旧实现整 Map 重建会连锁重算）');

  assert.equal(store.patchPhoto(999, { preview_url: 'x' }), false, '不存在的 id 返回 false');
  console.log('  patchPhoto：原地合并不换引用，computed 仅重算一次，双写扁平缓存');
}

// ============ 3) resetPhotoData：清照片数据，dates 保留 ============
{
  store.dates = [{ date_key: '2025-03-21' }];
  store.resetPhotoData();
  assert.equal(store.photosForDate('2025-03-21').length, 0, '照片缓存应被清空');
  assert.equal(store.photoOffsets.get('2025-03-21'), undefined, 'offset 应被清空');
  assert.equal(store.dates.length, 1, '日期列表应保留');
  assert.equal(flatCache.size, 3, 'resetPhotoData 不动 legacy 扁平缓存（legacy 自行管理）');
  console.log('  resetPhotoData：清 offset 与缓存，dates 保留');
}

// ============ 4) syncPhotoMarkFromLegacy：标记按 filename 合并回 store ============
{
  // reset 后重新拉取
  await store.fetchPhotosForDate('2025-03-21');
  const arr = store.photosForDate('2025-03-21');
  const target = arr[1]; // b.jpg, id=2

  // 模拟 legacy updatePhotoMark 写扁平缓存（收藏 + 笔记 + 分类）
  flatCache.set(2, Object.assign({}, flatCache.get(2), {
    favorite: true, hidden: false, note: '好', category: '人物',
  }));
  const touched = store.syncPhotoMarkFromLegacy('b.jpg');
  assert.equal(touched, 1, '按 filename 只命中 1 张');
  assert.equal(target, arr[1], '合并不替换对象引用');
  assert.equal(target.favorite, true, '收藏合并进 store');
  assert.equal(target.note, '好', '笔记合并进 store');
  assert.equal(target.category, '人物', '分类合并进 store');

  // 其他照片不应被误伤
  const untouched = arr[0];
  store.syncPhotoMarkFromLegacy('b.jpg');
  assert.equal(untouched.favorite, false, '其他照片不受影响');

  // 空 filename = 同步全部（批量操作后的合并入口）
  flatCache.set(1, Object.assign({}, flatCache.get(1), { favorite: true }));
  store.syncPhotoMarkFromLegacy('');
  assert.equal(arr[0].favorite, true, '空 filename 时全量合并');
  console.log('  标记合并：按 filename 精确命中，空名全量同步，引用不变');
}

// ============ 5) hydrateFromLegacy：EXIF 计数等分区头字段同步 ============
{
  PS.state.dateExifCounts = new Map([['2025-03-21', 7], ['2025-03-22', 0]]);
  PS.state.dateCounts = new Map([['2025-03-21', 8], ['2025-03-22', 2]]);
  PS.state.dates = [{ date_key: '2025-03-21' }, { date_key: '2025-03-22' }];
  store.hydrateFromLegacy();
  assert.equal(store.dateExifCounts.get('2025-03-21'), 7, 'dateExifCounts 应随 hydrate 同步');
  assert.equal(store.dateCounts.get('2025-03-22'), 2, 'dateCounts 应随 hydrate 同步');
  assert.deepEqual(store.dates.map((d) => d.date_key), ['2025-03-21', '2025-03-22']);
  console.log('  hydrate：dateExifCounts / dateCounts / dates 同步正确');
}

console.log('P4 store 契约：全部 5 组断言通过');
