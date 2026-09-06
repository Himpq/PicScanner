// PhotoGrid 与预览队列共享的图片 URL 契约。
// 列表接口可能只返回 thumbnail_url，预览接口则通常返回 preview_url；
// 两者都属于已经可直接展示的图片，不应再次入队生成预览。
const PREVIEW_URL_FIELDS = ['thumbnail_url', 'preview_url', 'lightbox_url', 'original_url'];

export function getPhotoPreviewUrl(photo) {
  if (!photo || typeof photo !== 'object') return '';
  for (const field of PREVIEW_URL_FIELDS) {
    const value = String(photo[field] || '').trim();
    if (value) return value;
  }
  return '';
}
