// P4 PhotoGrid 真机验收脚本（需要应用已启动，WebView2 CDP 端口 9222）
// 用法：node check-photogrid-live.mjs
// 在真实库上逐项验证：引擎激活 / 节点数 / 滚动联动 / 日期栏点击 / 徽标 / Q 高亮 / 深度 windowing
const PORT = 9222;
const results = [];
function report(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (detail ? ' —— ' + detail : ''));
}

const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = list.find((t) => t.type === 'page' && /index\.html/.test(t.url));
if (!page) { console.error('未找到页面目标：', list.map((t) => t.url)); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
await new Promise((r) => { ws.onopen = r; });
const send = (method, params = {}) => new Promise((res) => {
  const i = ++msgId;
  pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) {
    throw new Error('evaluate failed: ' + (r.result.exceptionDetails.exception?.description || JSON.stringify(r.result.exceptionDetails)));
  }
  return r.result ? r.result.result?.value : undefined;
}

// ---- 0) 等待 Vue 就绪 ----
let ready = false;
for (let i = 0; i < 40; i += 1) {
  ready = await evaluate('!!window.PicScannerVue && !!window.PS');
  if (ready) break;
  await sleep(500);
}
report('Vue/PS 就绪', ready);

// ---- 1) PhotoGrid 激活 ----
let active = await evaluate('PicScannerVue.isPhotoGridActive()');
if (String(active) !== 'true') {
  const flag = await evaluate(`localStorage.getItem('vue_photogrid')`);
  await evaluate(`localStorage.setItem('vue_photogrid','1'); location.reload()`);
  await sleep(4000);
  active = await evaluate('PicScannerVue.isPhotoGridActive()');
}
report('PhotoGrid 已激活', String(active) === 'true', 'vue_photogrid=' + (await evaluate(`localStorage.getItem('vue_photogrid')`)));

// ---- 2) legacy 容器已隐藏 ----
const legacyHidden = await evaluate(`document.getElementById('gallery-scroll').classList.contains('hidden')`);
report('legacy #gallery-scroll 已隐藏', legacyHidden === true);

// ---- 3) 进入工作区（无来源则点第一张来源卡）----
let sid = await evaluate(`(window.PS.state.currentSourceId || '')`);
if (!sid) {
  await evaluate(`(document.querySelector('#source-screen .source-card') || document.querySelector('#source-screen [data-source-id]') || document.querySelector('#source-screen button'))?.click()`);
  await sleep(3000);
  sid = await evaluate(`(window.PS.state.currentSourceId || '')`);
}
report('已进入工作区', !!sid, 'source=' + sid);
if (!sid) { console.log('无法进入工作区，中止'); process.exit(1); }

// 等日期列表加载
for (let i = 0; i < 30; i += 1) {
  const n = await evaluate(`window.PS.state.dates.length`);
  if (n > 3) break;
  await sleep(500);
}
const dateCount = await evaluate(`window.PS.state.dates.length`);
report('日期列表已加载', dateCount > 3, dateCount + ' 个日期分组');
await sleep(1500); // 等首轮照片填充

// ---- 4) 单帧节点数被 windowing 压住 ----
const cards = await evaluate(`document.querySelectorAll('#vue-photogrid .photo-card').length`);
report('单帧卡片数被压住(<500)', cards < 500, cards + ' 张');

// ---- 5) 滚动联动：activeDate 跟随、不锁死 ----
const firstDate = await evaluate(`window.PS.state.dates[0].date_key`);
const lastDate = await evaluate(`window.PS.state.dates[window.PS.state.dates.length-1].date_key`);
await evaluate(`(() => { const el = document.getElementById('vue-photogrid'); el.scrollTop = el.scrollHeight * 0.5; return el.scrollTop; })()`);
await sleep(500);
const midActive = await evaluate(`window.PS.state.activeDate`);
await evaluate(`(() => { const el = document.getElementById('vue-photogrid'); el.scrollTop = 0; return el.scrollTop; })()`);
await sleep(500);
const topActive = await evaluate(`window.PS.state.activeDate`);
const topIdx = await evaluate(`window.PS.state.dates.findIndex(d => d.date_key === window.PS.state.activeDate)`);
// 顶部数个日期都是小分区（高度不足半屏），视口中心锚点本来就落在第几个日期上——
// 只要求回到列表开头附近（前 8 个内），且绝不仍在列表尾部
report('滚动回顶部后 activeDate 回到列表开头', topIdx >= 0 && topIdx < 8, `top=${topActive} (第 ${topIdx + 1} 个), mid=${midActive}`);
report('activeDate 不是锁死在最后一位', midActive !== lastDate || topActive !== lastDate, '');

// ---- 6) 日期胶囊点击 → 跳转 + 高亮 ----
const pillInfo = await evaluate(`(() => {
  const pills = document.querySelectorAll('#vanilla-date-rail .date-pill');
  if (!pills.length) return null;
  const p = pills[Math.floor(pills.length * 0.6)];
  return { date: p.dataset.datePill, before: document.getElementById('vue-photogrid').scrollTop };
})()`);
if (pillInfo) {
  await evaluate(`document.querySelectorAll('#vanilla-date-rail .date-pill')[Math.floor(document.querySelectorAll('#vanilla-date-rail .date-pill').length * 0.6)].click()`);
  await sleep(1500);
  const afterActive = await evaluate(`window.PS.state.activeDate`);
  const afterScroll = await evaluate(`document.getElementById('vue-photogrid').scrollTop`);
  const activePill = await evaluate(`(document.querySelector('#vanilla-date-rail .date-pill.active') || {}).dataset ? document.querySelector('#vanilla-date-rail .date-pill.active').dataset.datePill : null`);
  report('点击胶囊后画廊发生跳转', Math.abs(afterScroll - pillInfo.before) > 50, `scrollTop ${pillInfo.before} -> ${afterScroll}`);
  report('activeDate 等于点击的日期', afterActive === pillInfo.date, `want ${pillInfo.date}, got ${afterActive}`);
  report('轨道高亮等于点击的日期', activePill === pillInfo.date, `got ${activePill}`);
} else {
  report('找到日期胶囊', false, 'rail 里没有 .date-pill');
}

// ---- 7) 分类徽标只显示首字符 ----
const badges = await evaluate(`Array.from(document.querySelectorAll('#vue-photogrid .photo-category-badge')).map(b => ({ t: b.textContent, title: b.title })).slice(0, 12)`);
const badgeOk = badges.length === 0 || badges.every((b) => b.t.length === 1 && b.title.length >= b.t.length);
report('分类徽标首字符截断', badgeOk, JSON.stringify(badges.slice(0, 4)));

// ---- 8) Q 选图高亮开/关 ----
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }))`);
await sleep(250);
const pickingOn = await evaluate(`!!document.querySelector('.photogrid-canvas.quick-edit-picking')`);
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }))`);
await sleep(250);
const pickingOff = await evaluate(`!document.querySelector('.photogrid-canvas.quick-edit-picking')`);
report('Q 进入选图高亮', pickingOn);
report('再按 Q 取消高亮', pickingOff);

// ---- 9) 深度滚动 windowing 仍有界 ----
await evaluate(`(() => { const el = document.getElementById('vue-photogrid'); el.scrollTop = el.scrollHeight * 0.85; return 0; })()`);
await sleep(700);
const deepCards = await evaluate(`document.querySelectorAll('#vue-photogrid .photo-card').length`);
report('深滚动后卡片数仍有界(<500)', deepCards < 500, deepCards + ' 张');

// ---- 10) Ctrl+滚轮缩放（放大后还原）----
const sizeBefore = await evaluate(`window.PS.state.galleryItemSize`);
await evaluate(`(() => { const el = document.getElementById('vue-photogrid'); const r = el.getBoundingClientRect(); el.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -360, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); return 0; })()`);
await sleep(600);
const sizeAfter = await evaluate(`window.PS.state.galleryItemSize`);
await evaluate(`(() => { const el = document.getElementById('vue-photogrid'); const r = el.getBoundingClientRect(); el.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: 360, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); return 0; })()`);
await sleep(400);
const sizeRestored = await evaluate(`window.PS.state.galleryItemSize`);
report('Ctrl+滚轮缩放生效并还原', sizeAfter !== sizeBefore && Math.abs(sizeRestored - sizeBefore) <= 24, `${sizeBefore} -> ${sizeAfter} -> ${sizeRestored}`);

// ---- 汇总 ----
const failed = results.filter((r) => !r.ok);
console.log('');
console.log(`真机验收：${results.length - failed.length}/${results.length} 项通过` + (failed.length ? '，失败：' + failed.map((f) => f.name).join('；') : ''));
ws.close();
process.exit(failed.length ? 1 : 0);
