// 排序/分类委托的回归测试（无浏览器）
//
// 修的是两个真实 bug：
//
// 1) 「选了排序但照片墙不动」—— P1 真源代理引入的回归。
//    Vue 侧先写 sortKey.value，再委托 PS.applySort(key)；
//    legacy 的守卫 `if (sortKey === state.sortKey) return;` 经代理读到的
//    就是那个新值，于是永远命中，resetGallery / loadOlderDates 从不执行。
//
// 2) 「排序下拉点不开」—— 页面上有两份 .sort-dropdown
//    （#vanilla-toolbar 一份、Vue 工具栏一份），legacy 的全局点击关闭器
//    用 els.sortDropdown.contains(ev.target) 判定，只会拿到 vanilla 那份，
//    于是点 Vue 的下拉时判定为"点击在外部"，开了就被立刻关掉。
//
// 这里用最小桩件复现两条链路，验证修复后的行为。
import assert from 'node:assert/strict';

// ---------- 桩件：模拟 PS.state 被代理后的读写语义 ----------
function makeProxiedState(initial) {
  const pinia = { ...initial };          // 模拟 Pinia 的 ref
  const state = {};                      // 模拟 PS.state
  for (const k of Object.keys(initial)) {
    Object.defineProperty(state, k, {
      get: () => pinia[k],
      set: (v) => { pinia[k] = v; },
      enumerable: true, configurable: true,
    });
  }
  return { state, pinia };
}

// ---------- 桩件：legacy 的 applySort（修复后版本）----------
function makeLegacySort(state, calls) {
  let appliedSortKey = null;
  return function applySort(sortKey) {
    if (sortKey === appliedSortKey) return false;   // 守卫：跟"上次应用过的值"比
    appliedSortKey = sortKey;
    state.sortKey = sortKey;
    calls.push('resetGallery');
    calls.push('loadOlderDates');
    return true;
  };
}

// ---------- 桩件：legacy 的 setActiveCategory（修复后版本）----------
function makeLegacyCategory(state, calls) {
  let appliedCategory = null;
  return function setActiveCategory(name) {
    const next = name === null ? null : String(name || '');
    if (next === appliedCategory) return false;
    appliedCategory = next;
    state.activeCategory = next;
    calls.push('refreshGalleryForCategory');
    return true;
  };
}

// ---------- 桩件：Vue store 的 applySort（修复后版本）----------
function makeStoreApplySort(pinia, PS) {
  return function applySort(key) {
    if (key === pinia.sortKey) return false;
    if (PS && typeof PS.applySort === 'function') {
      try {
        PS.applySort(key);
      } catch {
        return false;
      }
      pinia.sortKey = key;
      return true;
    }
    pinia.sortKey = key;
    return true;
  };
}

// ================= 1) 排序委托：修复后应触发 resetGallery =============
{
  const { state, pinia } = makeProxiedState({ sortKey: 'datetime_desc' });
  const calls = [];
  const PS = { state, applySort: makeLegacySort(state, calls) };
  const applySort = makeStoreApplySort(pinia, PS);

  const ok = applySort('datetime_asc');
  assert.equal(ok, true, 'applySort 应成功');
  assert.ok(calls.includes('resetGallery'), '应触发 resetGallery（修复前永远不触发）');
  assert.ok(calls.includes('loadOlderDates'), '应触发 loadOlderDates');
  assert.equal(pinia.sortKey, 'datetime_asc', 'Pinia 的 sortKey 应更新');
  assert.equal(state.sortKey, 'datetime_asc', 'legacy 读到的 state.sortKey 应同步');

  // 幂等：重复应用同一排序不应再触发
  calls.length = 0;
  applySort('datetime_asc');
  assert.equal(calls.length, 0, '重复应用同一排序应是 no-op');

  console.log('  排序委托：resetGallery / loadOlderDates 被正确触发，重复应用幂等');
}

// ============ 2) 修复前的写法必须仍然被判定为坏（反向验证）============
{
  const { state, pinia } = makeProxiedState({ sortKey: 'datetime_desc' });
  const calls = [];
  // 这是修复「前」的 legacy 守卫：拿入参跟被代理的 state 比
  const PS = {
    state,
    applySort(sortKey) {
      if (sortKey === state.sortKey) return false;   // ← 旧守卫
      state.sortKey = sortKey;
      calls.push('resetGallery');
      return true;
    },
  };
  // 这是修复「前」的 Vue 侧：先赋值再委托
  pinia.sortKey = 'datetime_asc';                     // ← 提前写
  PS.applySort('datetime_asc');
  assert.equal(calls.length, 0, '修复前的写法确实不触发 resetGallery —— 这就是那个 bug');

  console.log('  反向验证：修复前的「先赋值再委托 + 跟 state 比」确实不触发刷新');
}

// ============ 3) 用修复后的 legacy 守卫，即使调用方先赋值也能工作 ============
{
  const { state, pinia } = makeProxiedState({ sortKey: 'datetime_desc' });
  const calls = [];
  const PS = { state, applySort: makeLegacySort(state, calls) };
  // 模拟某个第三方先写了 Pinia（这正是代理会做的事）
  pinia.sortKey = 'filename_asc';
  PS.applySort('filename_asc');
  assert.ok(calls.includes('resetGallery'),
    'legacy 守卫改为跟「上次应用值」比之后，调用方先赋值也应正确触发');
  console.log('  健壮性：legacy 守卫不再依赖调用方的赋值时序');
}

// ============ 4) 分类切换：同样的坑，同样的修法 ============
{
  const { state, pinia } = makeProxiedState({ activeCategory: null });
  const calls = [];
  const PS = { state, setActiveCategory: makeLegacyCategory(state, calls) };

  function setActiveCategory(name) {
    const next = name === null ? null : String(name || '');
    if (pinia.activeCategory === next) return false;
    PS.setActiveCategory(next);
    pinia.activeCategory = next;
    return true;
  }

  setActiveCategory('风景');
  assert.ok(calls.includes('refreshGalleryForCategory'), '切换分类应刷新画廊');
  assert.equal(pinia.activeCategory, '风景');

  calls.length = 0;
  setActiveCategory('风景');
  assert.equal(calls.length, 0, '重复切换到同一分类应是 no-op');

  console.log('  分类切换：refreshGalleryForCategory 正确触发，重复切换幂等');
}

// ============ 5) 排序下拉：两份 .sort-dropdown 下的关闭判定 ============
{
  // 模拟 DOM：vanilla 下拉在前、Vue 下拉在后（index.html 的真实顺序）
  const mk = (id, cls, children = []) => ({ id, cls, children, contains: null });
  const vanillaTrigger = mk('sort-trigger', 'sort-trigger');
  const vanillaDropdown = mk('sort-dropdown', 'sort-dropdown', [vanillaTrigger]);
  const vueTrigger = mk('', 'sort-trigger');
  const vueDropdown = mk('', 'sort-dropdown', [vueTrigger]);
  // 建立 parent 链，供 closest 向上找
  const link = (parent) => { for (const c of parent.children) c.parent = parent; };
  link(vanillaDropdown); link(vueDropdown);

  const closest = (node, sel) => {
    const want = sel.replace('.', '');
    let cur = node;
    while (cur) { if (cur.cls.split(' ').includes(want)) return cur; cur = cur.parent; }
    return null;
  };

  // getElementById 只返回第一个（vanilla 那份）
  const all = [vanillaDropdown, vueDropdown];
  const getElementById = (id) => all.find((n) => n.id === id) || null;
  const els = { sortDropdown: getElementById('sort-dropdown') };
  assert.equal(els.sortDropdown, vanillaDropdown, 'getElementById 应命中 vanilla 那份');

  // 修复前：els.sortDropdown.contains(vueTrigger) === false → 误关
  const contains = (parent, node) => {
    let cur = node;
    while (cur) { if (cur === parent) return true; cur = cur.parent; }
    return false;
  };
  assert.equal(contains(els.sortDropdown, vueTrigger), false,
    '修复前的判定会认为"点击在下拉外部"');
  // 修复后：closest('.sort-dropdown') 能命中 Vue 自己的那份
  assert.equal(closest(vueTrigger, '.sort-dropdown'), vueDropdown,
    '修复后应命中 Vue 自己的下拉');
  assert.equal(closest(vanillaTrigger, '.sort-dropdown'), vanillaDropdown,
    'vanilla 那份同样能命中');

  console.log('  排序下拉：closest(.sort-dropdown) 对两份下拉都有效（修复前只有 vanilla 那份被认）');
}

console.log('排序/分类委托回归：全部 5 组断言通过');
