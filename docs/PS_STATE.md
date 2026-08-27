# PS.state — 现状与总体迁移计划（PR1→PR3 已落地）

> 基线：`app/ui/assets/app_core.js` `window.PS.state` 约 400 字段，全局可变单例（`456ddb7` 冻结）。`PR1` 已文档化，`PR2/3` 已同仓原位岛化，`main` 当前 `b65aa8f`。

## 现状（截至 b65aa8f）

### 已落地
- **PR1 `edd866a` 地基：** `frontend/src/tokens.css`（`:root` 7 令牌抽离）、`frontend/src/bridge/client.ts`（30+ `pywebview.api` typed，`list_dates/list_photos` 收敛）、本文档
- **PR2 `1313687+a4d7c34+b65aa8f` DateRail 原位岛：** `#vanilla-date-rail` + `#vue-date-rail` 并存，`?vue_date=1` 切换，`islands/DateRailIsland.vue` 73 行复用 `date-pill/has-cover/visible/focus-center`，`stores/gallery` 补 `dateCovers/dateNotes/visibleDates/dateFocus`，`margin/padding-bottom` 黑边已修
- **PR3 `f94377e` CategoryPanel 原位岛：** `#vanilla-category-panel` + `#vue-category-panel` 并存，`?vue_category=1` 切换，`islands/CategoryPanelIsland.vue` 复用 `category-item/active`
- **热修：** `cc64199` 灯箱缩略图秒显（`thumbnail_url` 兜底 `gallery img.src`，`previewing+loading` 共存）、`e3a92b1` 工作区 `grid` 触底、`5354475` F12 原生 `OpenDevToolsWindow`

### 仍在 PS.state 屎山（待绞杀）
```
# 画廊/日期/照片 — 已镜像至 Pinia，未真源化
dates, dateCounts, dateCovers, dateNotes, visibleDates, dateFocus, activeDate
photoCache: Map<id→photo>, photoOffsets, exifCache, lightboxCachePending
→ 真源化卡点：list_dates 空参/filterPayload 曾致 3000→0，需 Pinia 侧显式校验

# 扫描/EXIF — 仍 vanilla
scanRunning, exifRunning, scanComplete, sortKey/filterOpen/searchOpen, filterPop

# 分类/批量 — 已镜像，闭包 gallery 仍旧
categories, favoriteCount, activeCategory, batchSelectionController(闭包 gallery), galleryItemSize

# 灯箱/对比 — 仍 vanilla
lightbox{photo,zoom,pan}, compare{selected,locked}, lightboxInfoPreferred*

# 快修 — 最深，~200 字段，暂不动
quickEdit{open, photo, params, history, previewRenderKey, rawPreviewCache, ...}

# 设置/统计/来源 — 仍 vanilla
settingsOpen, statsOpen, settingsTab, sourceStages, currentRootPath/currentSourceId
```

### 双轨状态
- `main` 默认 `vanilla` 可用，`?vue_date=1&vue_category=1` 灰度 `Vue`，`toggleVueDateRail/toggleVueCategory` 控制 `localStorage`，失败自动回退 `vanilla`。
- `Pinia` 仅 `hydrateFromLegacy()` 只读镜像，未拦截 `loadOlderDates/addDateSection`，`3000` 索引链仍走 `PS`。

## 总体迁移计划 — 同仓绞杀，不另立山头

**原则：** 同仓 `main` 渐进，每 PR 一岛独立可 `revert`，实时可用；禁止 `ps-*` 重命名，模板必须复用原 `class/id` 使 `style.css 167KB` 零漂移；`tokens.css` 单一真源；`bridge/client.ts` 为唯一 `pywebview` 入口。

| PR | 岛 | 动屎山 | 验收门禁 |
|---|---|---|---|
| **PR1** ✅ | 地基 | `tokens`/`bridge`/`PS.state` 文档化 | 零 UI，`tsc --noEmit` |
| **PR2** ✅ | `DateRail` 右侧日期 | `stores/gallery` 4 字段 | `?vue_date=1` 像素对比 `has-cover` |
| **PR3** ✅ | `CategoryPanel` 左侧分类 | `setActiveCategory` 双写 | `?vue_category=1` `active` 琥珀 |
| **PR4** | `PhotoGrid` 照片墙 | `photoCache/offsets` 真源化，`@tanstack/virtual` 替换 `IntersectionObserver`，补 `RAW/JPG/has-note/batch-selected` | `Ctrl+多选/F/E/S` 复测，3000 首屏 <100ms |
| **PR5** | `Toolbar` 工具栏 | `search/sort/filter` 三弹层接管 `filterPayload` | `Ctrl+F/Wheel` 灰度 |
| **PR6** | `Lightbox` 灯箱 | `stores/lightbox` 真源，删 `app_lightbox 1.6k` | `ARW 1.3s` 缩略→原图平滑 |

**每 PR 固定：** `index.html` 预留 `#vue-xxx` 空岛 + `hidden`，`main.js mountXxxIsland` + `?vue_xxx` 开关，`playwright` 6 张基线 `>0.5%` 阻断，`stash@{0}` 作废仅当边界用例参考。

**下一步：** `PR4 PhotoGrid`（3 天，动 `photoCache` 核心，需先补 `list_photos` 空参用例）。
