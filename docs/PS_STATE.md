# PS.state — 屎山全景（PR1 文档化）

> 来源：`app/ui/assets/app_core.js` `const state = { ... }` 冻结快照（456ddb7），约 400 字段，`window.PS.state` 全局可变单例。PR1 仅文档化，不改运行时，后续由 `Pinia` 逐域替换。

## 1. 画廊/日期/照片（核心，3000→0 重灾区）
```
selectedSource, dates: Date[], dateCounts: Map<dateKey→count>, dateExifCounts, dateNotes, dateCovers
dateCursor, loadingDates, noMoreDates, lastDateBootstrapKey
photoOffsets: Map<dateKey→offset>, exifCache, photoCache: Map<id→photo>, lightboxCachePending: Set
activeDate, visibleDates: Set, dateFocus: Map<dateKey→0..1>
photoCache ↔ Pinia photoCache 双写点：frontend/src/stores/gallery.js fetchPhotosForDate
```

## 2. 扫描/EXIF 任务
```
scanRunning, exifRunning, scanComplete, scanStoppedByUser, scanRequesting
lastMoreScanAt, bottomWheelTicking, scrollTicking, lastScrollAt, lastVisibleRefreshAt
sortKey, sortOpen, filterOpen, activeFilter, filterDraft, filterOptions, filterPop
searchOpen, searchScope, searchTimer, searchSeq, searchResults: Map
```

## 3. 分类/批量
```
categories, favoriteCount, hiddenCount, activeCategory, categoryLastViewedDates, categoryPicker
galleryItemSize, galleryItemSizeRaw, galleryItemSizeTarget, itemSizeSaveTimer
batchSelection: selectedPhotos: Map<id→photo>, batchSelectionController (闭包 gallery)
batchProcessing: isOpen, selected
```

## 4. 灯箱/对比
```
lightbox: { photo, zoom, panX/Y, dragging, infoVisible, infoX/Y, navHoverSide, loadToken, embedded }
compare: { open, selected:[photo?,photo?], locked, activePane, lightbox, infoVisible, panes[2]{photo,zoom,pan} }
lightboxInfoPreferredVisible/Position/Size, quickEditInfoDetailsCollapsed
```

## 5. 快速修图（最深屎山，~200 字段）
```
quickEdit: { open, photo, params: Record<string,number>, viewZoom, collapsedSections,
  luts, framePresets, lutLibrary, presets, history: [], previewRenderKey, rawPreviewCache: Map,
  displayBasis, shadeTimer, histogramRenderTimer, loadToken, saveConfirm, batchMode, ... }
quickEditUsesRawDevelopPipeline(), normalizeQuickEditParams(), applyQuickEditPreview()
```

## 6. 设置/统计/来源
```
settingsOpen, statsOpen, settingsTab: 'interface'|'export'|'storage'|'shortcuts'|'about'
sourceStages: Map, openModuleKey, previewQueue, currentRootPath, currentSourceId
pendingRestoreDate, restoringDate, sourceLastViewedDate
```

## 7. 替换路线（PR2 起）
- `gallery` 域 → `stores/gallery.ts`（已建 `dateCovers/visibleDates/dateFocus`，下一步接管 `list_dates` 空参/过滤）
- `lightbox/compare` → `stores/lightbox.ts`
- `batch` → `stores/batch.ts`（重建时传入新 `gallery`，不再闭包旧 DOM）
- `quickEdit` 最后动，需先抽 `quick_edit_worker` 为 `composable`

> 任何新代码禁止直接 `PS.state.xxx =`，经 `bridge/client.ts` `call()` + `Pinia` 单向数据流。
