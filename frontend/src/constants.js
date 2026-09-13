// 从 app_core.js 抽离的常量，Vue 与 IIFE 共用。保持与 PS 全局同源。
export const LIGHTBOX_MIN_ZOOM = 0.25;
export const LIGHTBOX_MAX_ZOOM = 12;
export const LIGHTBOX_ZOOM_STEP = 1.2;
export const LIGHTBOX_NAV_HOVER_WIDTH = 112;
export const LIGHTBOX_INFO_MIN_WIDTH = 260;
export const LIGHTBOX_INFO_MAX_WIDTH = 620;
export const LIGHTBOX_INFO_MIN_HEIGHT = 120;
export const LIGHTBOX_INFO_MAX_HEIGHT = 760;
export const PREVIEW_CONCURRENCY = 4;
export const MORE_SCAN_COOLDOWN_MS = 650;
export const RENDER_AHEAD_PHOTOS = 20;
export const APP_BUILD = 'frame-text-edge-20260718-17';
export const FAVORITE_CATEGORY = '__picscanner_favorite_filter__';
export const HIDDEN_CATEGORY = '__picscanner_hidden_filter__';
export const DATE_RAIL_LOAD_LIMIT = 5000;
export const INITIAL_PHOTO_LIMIT = 40;
export const PHOTO_LOAD_BATCH = 20;
export const GALLERY_ITEM_SIZE_WHEEL_SCALE = 0.12;
export const SEARCH_DEBOUNCE_MS = 180;
export const QUICK_EDIT_CROP_MIN_SIZE = 0.001;
export const QUICK_EDIT_CROP_MIN_FRAME_PX = 48;
export const QUICK_EDIT_CROP_STAGE_MARGIN = 24;
export const QUICK_EDIT_MIN_ZOOM = 0.5;
export const QUICK_EDIT_MAX_ZOOM = LIGHTBOX_MAX_ZOOM;
export const QUICK_EDIT_SHADE_DELAY_MS = 500;
export const QUICK_EDIT_ROTATION_PX_PER_DEGREE = 8;
export const QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE = 720;
export const QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE = 1800;
export const QUICK_EDIT_SETTLED_PREVIEW_HARD_MAX_SIDE = QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE;
export const QUICK_EDIT_PREVIEW_RENDER_BUCKETS = [QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE];
export const QUICK_EDIT_ORIGINAL_PREVIEW_DELAY_MS = 650;
export const QUICK_EDIT_RAW_ORIGINAL_PREVIEW_DELAY_MS = 650;
export const QUICK_EDIT_ZOOM_SETTLE_RENDER_DELAY_MS = 220;
export const QUICK_EDIT_EXPOSURE_MIN_EV = -5;
export const QUICK_EDIT_EXPOSURE_MAX_EV = 5;
export const QUICK_EDIT_TEMPERATURE_MIN_K = 2000;
export const QUICK_EDIT_TEMPERATURE_NEUTRAL_K = 6500;
export const QUICK_EDIT_TEMPERATURE_MAX_K = 10000;
export const QUICK_EDIT_TEMPERATURE_STEP_K = 50;
export const QUICK_EDIT_DEFAULT_CURVE_POINTS = [
  { x: 0, y: 0 },
  { x: 100, y: 100 },
];
export const QUICK_EDIT_HSL_COLORS = [
  { key: 'red', label: 'R', name: '红色', hue: 0, color: '#ff6b6b' },
  { key: 'orange', label: 'O', name: '橙色', hue: 30, color: '#ff9f43' },
  { key: 'yellow', label: 'Y', name: '黄色', hue: 60, color: '#f8d94a' },
  { key: 'green', label: 'G', name: '绿色', hue: 120, color: '#62d66f' },
  { key: 'aqua', label: 'A', name: '青色', hue: 180, color: '#4dd7c8' },
  { key: 'blue', label: 'B', name: '蓝色', hue: 230, color: '#6f92ff' },
  { key: 'purple', label: 'P', name: '紫色', hue: 275, color: '#b47cff' },
  { key: 'magenta', label: 'M', name: '品红', hue: 320, color: '#ff6fc7' },
];
export const QUICK_EDIT_DEFAULT_PARAMS = {
  cropTop: 0,
  cropRight: 0,
  cropBottom: 0,
  cropLeft: 0,
  rotation: 0,
  straighten: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  dehaze: 0,
  saturation: 0,
  vibrance: 0,
  sharpening: 0,
  clarity: 0,
  grain: 0,
  vignette: 0,
  vignetteFeather: 58,
  blackWhite: 0,
  bwRed: 0,
  bwYellow: 0,
  bwGreen: 0,
  bwAqua: 0,
  bwBlue: 0,
  bwMagenta: 0,
  temperature: QUICK_EDIT_TEMPERATURE_NEUTRAL_K,
  tint: 0,
  splitToneShadowsHue: 220,
  splitToneShadowsStrength: 0,
  splitToneMidtonesHue: 35,
  splitToneMidtonesStrength: 0,
  splitToneHighlightsHue: 45,
  splitToneHighlightsStrength: 0,
  splitToneBalance: 0,
  rawHighlightRecovery: 0,
  rawNoiseReduction: 0,
  lutStrength: 100,
  curveBlack: 0,
  curveMid: 50,
  curveWhite: 100,
  curvePoints: QUICK_EDIT_DEFAULT_CURVE_POINTS,
};
QUICK_EDIT_HSL_COLORS.forEach((color) => {
  QUICK_EDIT_DEFAULT_PARAMS['hsl_' + color.key + '_hue'] = 0;
  QUICK_EDIT_DEFAULT_PARAMS['hsl_' + color.key + '_saturation'] = 0;
  QUICK_EDIT_DEFAULT_PARAMS['hsl_' + color.key + '_luminance'] = 0;
});
export const QUICK_EDIT_SPLIT_TONE_PRESETS = [
  { key: 'tealOrange', label: '青橙', shadowsHue: 205, shadowsStrength: 26, midtonesHue: 35, midtonesStrength: 8, highlightsHue: 42, highlightsStrength: 22, balance: 10 },
  { key: 'warmFilm', label: '暖胶片', shadowsHue: 225, shadowsStrength: 12, midtonesHue: 38, midtonesStrength: 14, highlightsHue: 48, highlightsStrength: 28, balance: 18 },
  { key: 'coolNight', label: '冷夜', shadowsHue: 225, shadowsStrength: 32, midtonesHue: 205, midtonesStrength: 14, highlightsHue: 48, highlightsStrength: 8, balance: -18 },
  { key: 'retroGreen', label: '复古绿', shadowsHue: 155, shadowsStrength: 22, midtonesHue: 55, midtonesStrength: 10, highlightsHue: 43, highlightsStrength: 20, balance: 0 },
];
export const QUICK_EDIT_SAVE_OPTIONS_KEY = 'PicScannerQuickEditSaveOptions';
export const QUICK_EDIT_SAVE_FORMATS = [
  { key: 'jpg', label: 'JPEG', detail: '体积小，适合分享和通用查看' },
  { key: 'png', label: 'PNG', detail: '无损压缩，适合图形和再次编辑' },
  { key: 'webp', label: 'WebP', detail: '更高压缩率，适合网页交付' },
  { key: 'tif16', label: 'TIFF 16-bit', detail: '保留 RAW 显影位深，仅 RAW 可用', rawOnly: true },
];
export const QUICK_EDIT_FRAME_TEXT_COLORS = [
  { color: '#222222', label: '深灰' },
  { color: '#f5f5f2', label: '米白' },
  { color: '#ffffff', label: '白色' },
  { color: '#ffb817', label: '暖黄' },
  { color: '#d94f45', label: '红色' },
  { color: '#4fa3ff', label: '蓝色' },
];
export const QUICK_EDIT_FRAME_TEXT_TOKENS = [
  { token: '{filename}', label: '文件名' },
  { token: '{origin_name}', label: '原始文件名' },
  { token: '{date}', label: '拍摄日期' },
  { token: '{Y}', label: '年份' },
  { token: '{M}', label: '月份' },
  { token: '{D}', label: '日期' },
  { token: '{camera}', label: '相机' },
  { token: '{model}', label: '机身型号' },
  { token: '{lens}', label: '镜头' },
  { token: '{shutter_speed}', label: '快门' },
  { token: '{aperture}', label: '光圈' },
  { token: '{iso}', label: 'ISO' },
  { token: '{focal_length}', label: '焦距' },
  { token: '{focal_length_35mm}', label: '等效焦距' },
  { token: '{format}', label: '格式' },
];
export const QUICK_EDIT_DEFAULT_SAVE_QUALITY = 100;
export const QUICK_EDIT_SAVE_QUALITY_PRESETS = [
  { key: 'draft', label: '预览', value: 70 },
  { key: 'standard', label: '标准', value: 85 },
  { key: 'high', label: '高质量', value: 95 },
  { key: 'max', label: '最高', value: 100 },
];
export const QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT = 2048;
export const QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MIN = 256;
export const QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX = 12000;

export const SORT_OPTIONS = [
  { key: 'datetime_desc', label: '拍摄时间 新到旧' },
  { key: 'datetime_asc', label: '拍摄时间 旧到新' },
  { key: 'filename_asc', label: '文件名 A 到 Z' },
  { key: 'filename_desc', label: '文件名 Z 到 A' },
  { key: 'size_desc', label: '文件大小 大到小' },
  { key: 'size_asc', label: '文件大小 小到大' },
];

export const SETTINGS_TABS = [
  { key: 'interface', label: '界面', hint: '缩略图与参数面板' },
  { key: 'map', label: '地图', hint: '天地图密钥与照片位置' },
  { key: 'export', label: '导出', hint: '目录与命名模板' },
  { key: 'storage', label: '存储', hint: '已登记来源' },
  { key: 'plugins', label: '插件', hint: '已装载模块与状态' },
  { key: 'shortcuts', label: '快捷键', hint: '查看现有键位' },
  { key: 'about', label: '关于', hint: '版本与项目' },
];

export const PROJECT_URL = 'https://github.com/Himpq/PicScanner';

export const STATUS_LABELS = {
  idle: '等待扫描',
  discovering: '发现图片中',
  scanning: '扫描中',
  stopping: '停止中',
  stopped: '已停止',
  paused: '可继续扫描',
  done: '扫描完成',
  failed: '扫描失败',
  reading_exif: '读取 EXIF',
};

export const EXIF_STATUS_LABELS = {
  idle: '等待 EXIF',
  reading_exif: '读取 EXIF',
  stopping: '停止中',
  stopped: '已停止',
  done: '读取完成',
  failed: '读取失败',
};

export const STARTUP_API_METHODS = ['get_startup_state', 'get_sources', 'get_scan_state'];

export function scanStatusLabel(status) {
  return STATUS_LABELS[status] || status || '等待扫描';
}
export function exifStatusLabel(status) {
  return EXIF_STATUS_LABELS[status] || status || '等待 EXIF';
}

// 同步到 window.PS 以保持老 IIFE 兼容（双轨期）
export function syncToLegacyPS() {
  const PS = window.PS;
  if (!PS) return;
  Object.assign(PS, {
    LIGHTBOX_MIN_ZOOM,
    LIGHTBOX_MAX_ZOOM,
    LIGHTBOX_ZOOM_STEP,
    LIGHTBOX_NAV_HOVER_WIDTH,
    LIGHTBOX_INFO_MIN_WIDTH,
    LIGHTBOX_INFO_MAX_WIDTH,
    LIGHTBOX_INFO_MIN_HEIGHT,
    LIGHTBOX_INFO_MAX_HEIGHT,
    PREVIEW_CONCURRENCY,
    MORE_SCAN_COOLDOWN_MS,
    RENDER_AHEAD_PHOTOS,
    APP_BUILD,
    FAVORITE_CATEGORY,
    HIDDEN_CATEGORY,
    DATE_RAIL_LOAD_LIMIT,
    INITIAL_PHOTO_LIMIT,
    PHOTO_LOAD_BATCH,
    GALLERY_ITEM_SIZE_WHEEL_SCALE,
    SEARCH_DEBOUNCE_MS,
    QUICK_EDIT_CROP_MIN_SIZE,
    QUICK_EDIT_CROP_MIN_FRAME_PX,
    QUICK_EDIT_CROP_STAGE_MARGIN,
    QUICK_EDIT_MIN_ZOOM,
    QUICK_EDIT_MAX_ZOOM,
    QUICK_EDIT_SHADE_DELAY_MS,
    QUICK_EDIT_ROTATION_PX_PER_DEGREE,
    QUICK_EDIT_INTERACTIVE_PREVIEW_MAX_SIDE,
    QUICK_EDIT_SETTLED_PREVIEW_MAX_SIDE,
    QUICK_EDIT_SETTLED_PREVIEW_HARD_MAX_SIDE,
    QUICK_EDIT_PREVIEW_RENDER_BUCKETS,
    QUICK_EDIT_ORIGINAL_PREVIEW_DELAY_MS,
    QUICK_EDIT_RAW_ORIGINAL_PREVIEW_DELAY_MS,
    QUICK_EDIT_ZOOM_SETTLE_RENDER_DELAY_MS,
    QUICK_EDIT_EXPOSURE_MIN_EV,
    QUICK_EDIT_EXPOSURE_MAX_EV,
    QUICK_EDIT_TEMPERATURE_MIN_K,
    QUICK_EDIT_TEMPERATURE_NEUTRAL_K,
    QUICK_EDIT_TEMPERATURE_MAX_K,
    QUICK_EDIT_TEMPERATURE_STEP_K,
    QUICK_EDIT_DEFAULT_CURVE_POINTS,
    QUICK_EDIT_HSL_COLORS,
    QUICK_EDIT_DEFAULT_PARAMS,
    QUICK_EDIT_SPLIT_TONE_PRESETS,
    QUICK_EDIT_SAVE_OPTIONS_KEY,
    QUICK_EDIT_SAVE_FORMATS,
    QUICK_EDIT_FRAME_TEXT_COLORS,
    QUICK_EDIT_FRAME_TEXT_TOKENS,
    QUICK_EDIT_DEFAULT_SAVE_QUALITY,
    QUICK_EDIT_SAVE_QUALITY_PRESETS,
    QUICK_EDIT_SAVE_SIZE_LONG_EDGE_DEFAULT,
    QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MIN,
    QUICK_EDIT_SAVE_SIZE_LONG_EDGE_MAX,
    SORT_OPTIONS,
    SETTINGS_TABS,
    PROJECT_URL,
    STATUS_LABELS,
    EXIF_STATUS_LABELS,
  });
  PS.scanStatusLabel = scanStatusLabel;
  PS.exifStatusLabel = exifStatusLabel;
}
