// P4 store 单测（无浏览器）—�?Vue PhotoGrid 的数据层契约
//
// 覆盖四件事：
//   1. patchPhoto 原地合并：同一�?photo 对象引用被就地修改（旧实�?new Map 全量
//      重建，是预览回填热路�?O(N) 分配的来源），且 Vue computed 因此重算
//   2. 双写契约：store 拉取/回填的照片必须同步进 legacy 的扁平缓�?//      PS.state.photoCache（灯箱翻�?/ EXIF 弹层 / 右键菜单都从那里读）
//   3. resetPhotoData：排�?筛�?切源重置时清照片数据、保留日期列�?//   4. syncPhotoMarkFromLegacy：legacy 标记写入口的变更能合并回按日期数�?import assert from 'node:assert/strict';
import { computed, nextTick } from 'vue';
import { createPinia } from 'pinia';

// --- 浏览器环境桩（store 的依赖均惰性访�?window，先�?import 设置即可�?--
const flatCache = new Map(); // PS.state.photoCache：扁�?Map<id, photo>
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

// ============ 1) fetchPhotosForDate：拉�?+ 双写扁平缓存 ============
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
  assert.equal(got, true, '拉取应成�?);
  const arr = store.photosForDate('2025-03-21');
  assert.equal(arr.length, 3, '照片应进入按日期数组');
  assert.equal(store.photoOffsets.get('2025-03-21'), 3, 'offset 应推�?);
  assert.equal(flatCache.get(1).filename, 'a.jpg', '照片应双写进 legacy 扁平缓存（灯�?EXIF/右键依赖它）');
  assert.equal(flatCache.get(3).id, 3, '扁平缓存应以 Number id 为键');
  console.log('  拉取�? 张照片入 store 数组，offset=3，扁平缓存同步双�?);
}

// ============ 2) patchPhoto 原地合并 + computed 重算 ============
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
  assert.equal(reads, 1, 'computed 应求值一�?);

  const ok = store.patchPhoto(1, { preview_url: 'file:///a.jpg' });
  assert.equal(ok, true, 'patch 应命�?);
  await nextTick();

  assert.equal(arr[0], before, '必须是同一个对象引用（原地合并），而不是替�?);
  assert.equal(before.preview_url, 'file:///a.jpg', '字段已就地更�?);
  assert.equal(flatCache.get(1).preview_url, 'file:///a.jpg', '扁平缓存同步合并');
  assert.equal(preview.value, 'file:///a.jpg');
  assert.equal(reads, 2, '原地改属性应触发 computed 重算（不需要整 Map 重建�?);

  assert.equal(store.patchPhoto(999, { preview_url: 'x' }), false, '不存在的 id 应返�?false');
  console.log('  patchPhoto：原地合并（引用不变）、computed 重算、扁平缓存双�?);
}

// ============ 3) resetPhotoData：清照片数据、保留日�?============
{
  store.dates = [{ date_key: '2025-03-21' }];
  store.resetPhotoData();
  assert.equal(store.photosForDate('2025-03-21').length, 0, '照片数组应清�?);
  assert.equal(store.photoOffsets.get('2025-03-21'), undefined, 'offset 应清�?);
  assert.equal(store.dates.length, 1, '日期列表应保�?);
  assert.equal(flatCache.size, 3, 'resetPhotoData 不动 legacy 扁平缓存（那�?legacy 的领地）');
  console.log('  resetPhotoData：照�?offset 清空，dates 保留');
}

// ============ 4) syncPhotoMarkFromLegacy：标记变更合并回数组 ============
{
  // 重建场景：reset 后重新拉�?  await store.fetchPhotosForDate('2025-03-21');
  const arr = store.photosForDate('2025-03-21');
  const target = arr[1]; // b.jpg, id=2

  // legacy �?updatePhotoMark 会先更新扁平缓存，再触发钩子
  flatCache.set(2, Object.assign({}, flatCache.get(2), {
    favorite: true, hidden: false, note: '好片', category: '人物',
  }));
  const touched = store.syncPhotoMarkFromLegacy('b.jpg');
  assert.equal(touched, 1, '应恰好命�?1 �?);
  assert.equal(target, arr[1], '仍是同一引用');
  assert.equal(target.favorite, true, '收藏应合并进 store');
  assert.equal(target.note, '好片', '笔记应合并进 store');
  assert.equal(target.category, '人物', '分类应合并进 store');

  // 未涉及的文件名不受影�?  const untouched = arr[0];
  store.syncPhotoMarkFromLegacy('b.jpg');
  assert.equal(untouched.favorite, false, '其它照片的标记不应被改动');

  // 空文件名 = 全量合并（防御路径）
  flatCache.set(1, Object.assign({}, flatCache.get(1), { favorite: true }));
  store.syncPhotoMarkFromLegacy('');
  assert.equal(arr[0].favorite, true, '空文件名应走全量合并');
  console.log('  标记同步：按 filename 精确合并，引用不变，空名全量兜底');
}

// ============ 5) hydrateFromLegacy：EXIF 计数同步（分区头「N �?· EXIF M」）============
{
  PS.state.dateExifCounts = new Map([['2025-03-21', 7], ['2025-03-22', 0]]);
  PS.state.dateCounts = new Map([['2025-03-21', 8], ['2025-03-22', 2]]);
  PS.state.dates = [{ date_key: '2025-03-21' }, { date_key: '2025-03-22' }];
  store.hydrateFromLegacy();
  assert.equal(store.dateExifCounts.get('2025-03-21'), 7, 'dateExifCounts 应随 hydrate 同步');
  assert.equal(store.dateCounts.get('2025-03-22'), 2, 'dateCounts 同步不受影响');
  assert.deepEqual(store.dates.map((d) => d.date_key), ['2025-03-21', '2025-03-22']);
  console.log('  hydrate：dateExifCounts / dateCounts / dates 同步正常');
}

console.log('P4 store 单测：全�?5 组断言通过');
