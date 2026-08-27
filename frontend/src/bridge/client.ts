// bridge/client.ts — PR1 typed wrapper，零运行时变更，仅提供类型门禁
// 保持与 app/backend/api.py 的 PicScannerApi 方法一一对应
// 用法： import { call } from '@/bridge/client'; await call('list_dates', cursor, limit, root, sourceId, sort, filter)

import { call as rawCall, getApi } from './index.js';

// ---- 核心 DTO ----
export type SortKey = 'datetime_desc' | 'datetime_asc' | 'filename_asc' | 'filename_desc' | 'size_desc' | 'size_asc';
export type FilterPayload = {
  favorite?: boolean;
  hidden?: boolean;
  lens?: string;
  focal_bucket?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
} | null;

// 后端 PicScannerApi 方法表（按 call('name', ...) 实际出现顺序收敛）
export interface PicScannerApi {
  // 启动/来源
  get_startup_state(): Promise<{ success: boolean; sources: any[]; scan_state: any }>;
  get_sources(): Promise<{ success: boolean; sources: any[] }>;
  list_storage_sources(): Promise<{ success: boolean; sources: any[] }>;
  get_scan_state(rootPath: string | null, sourceId: string | null): Promise<{ success: boolean; state: any; dates?: any[] }>;
  choose_folder(): Promise<{ success: boolean; path?: string }>;
  choose_export_folder(): Promise<string | { success: boolean; path?: string }>;
  // 画廊
  list_dates(cursor: string | null, limit: number, rootPath: string | null, sourceId: string | null, sortKey: SortKey, filter: FilterPayload): Promise<{ success: boolean; dates: any[] }>;
  list_photos(dateKey: string, offset: number, limit: number, rootPath: string | null, sourceId: string | null, sortKey: SortKey, filter: FilterPayload): Promise<{ success: boolean; photos: any[] }>;
  list_categories(sourceId: string): Promise<{ success: boolean; categories: any[]; favorite_count: number; hidden_count: number }>;
  add_category(sourceId: string, name: string): Promise<{ success: boolean }>;
  set_item_mark(sourceId: string, kind: 'photo' | 'date', key: string, favorite?: boolean | null, hidden?: boolean | null, note?: string | null, category?: string | null): Promise<{ success: boolean; photo?: any }>;
  set_photo_category(sourceId: string, filename: string, category: string): Promise<{ success: boolean }>;
  get_filter_options(rootPath: string | null, sourceId: string | null): Promise<{ success: boolean; options: any }>;
  // 单图
  get_photo_exif(photoId: number): Promise<{ success: boolean; photo: any }>;
  get_photo_preview(photoId: number): Promise<{ success: boolean; photo: any }>;
  get_photo_lightbox_preview(photoId: number): Promise<{ success: boolean; photo: any; lightbox_url?: string }>;
  get_batch_photo(photoId: number): Promise<any>;
  // 扫描/EXIF
  scan_all(rootPath: string): Promise<{ success: boolean; source_id?: string }>;
  start_scan(rootPath: string, batch?: number): Promise<any>;
  stop_scan(): Promise<any>;
  start_exif(rootPath: string, sourceId: string | null): Promise<any>;
  stop_exif(): Promise<any>;
  // 视图
  set_gallery_item_size(size: number): Promise<any>;
  set_last_viewed_date(sourceId: string, dateKey: string, category: string | null, offset: number): Promise<any>;
  set_last_source(path: string): Promise<any>;
  set_export_preset(preset: any): Promise<any>;
  get_export_preset(): Promise<{ success: boolean; preset: any }>;
  get_export_summary(sourceId: string, type: string, name: string): Promise<any>;
  // 灯箱信息面板
  set_lightbox_info_visible(v: boolean): Promise<any>;
  set_lightbox_info_position(pos: { x: number; y: number }): Promise<any>;
  set_lightbox_info_size(size: { width: number; height: number }): Promise<any>;
  set_lightbox_info_details_collapsed(v: boolean): Promise<any>;
  // 拖拽/日志/其他
  reset_drag_cursor(): Promise<any>;
  start_photo_drag(photoId: number): Promise<any>;
  open_external_url(url: string): Promise<any>;
  log(msg: string): Promise<any>;
  // 模块/快修（透传）
  module_api(key: string, method: string, ...args: any[]): Promise<any>;
  get_modules(): Promise<any>;
  // 统计
  get_statistics_detail(rootPath: string | null, sourceId: string | null): Promise<{ success: boolean; detail: any }>;
  // 兼容兜底
  [k: string]: (...args: any[]) => Promise<any>;
}

type ApiMethods = PicScannerApi;

export function call<K extends keyof ApiMethods>(
  name: K,
  ...args: Parameters<ApiMethods[K]>
): ReturnType<ApiMethods[K]> {
  // 复用现有 index.js 的 rawCall（含 mock/bridgeReady 逻辑）
  return rawCall(name as string, ...args) as ReturnType<ApiMethods[K]>;
}

export function isReady(): boolean {
  return !!getApi();
}

// 显式导出常用方法的 typed 快捷，避免字符串拼写错
export const api = {
  listDates: (cursor: string | null, limit: number, root: string | null, sid: string | null, sort: SortKey, filter: FilterPayload) =>
    call('list_dates', cursor, limit, root, sid, sort, filter),
  listPhotos: (dateKey: string, offset: number, limit: number, root: string | null, sid: string | null, sort: SortKey, filter: FilterPayload) =>
    call('list_photos', dateKey, offset, limit, root, sid, sort, filter),
};
