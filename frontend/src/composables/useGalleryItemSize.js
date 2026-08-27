import { computed } from 'vue';
import { useGalleryStore } from '../stores/gallery.js';

// 桥接 galleryItemSize 的读写，便于后续替换 PS.applyGalleryItemSize
export function useGalleryItemSize() {
  const gallery = useGalleryStore();
  const size = computed({
    get: () => gallery.galleryItemSize,
    set: (v) => {
      gallery.galleryItemSize = v;
      const PS = window.PS;
      if (PS && typeof PS.applyGalleryItemSize === 'function') {
        PS.applyGalleryItemSize(v);
      }
    },
  });
  function apply(sizeValue) {
    size.value = sizeValue;
  }
  function reset() {
    apply(168);
  }
  return { size, apply, reset };
}
