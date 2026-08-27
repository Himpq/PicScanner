<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useGalleryStore } from '../../stores/gallery.js';

const store = useGalleryStore();
const dates = computed(() => store.dates);

// 双轨期：照片渲染仍由 legacy 的 photoCard / IntersectionObserver 负责，
// 此组件仅提供容器与空状态，逐步接管时再替换为虚拟列表。
const galleryEl = ref(null);
let observer = null;

function observeLegacy() {
  const PS = window.PS;
  if (!PS) return;
  // 触发 legacy 的可见性检查与懒加载
  if (typeof PS.scheduleVisiblePreviewCheck === 'function') PS.scheduleVisiblePreviewCheck();
  if (typeof PS.schedulePlaceholderPhotoFill === 'function') PS.schedulePlaceholderPhotoFill();
}

onMounted(() => {
  store.hydrateFromLegacy();
  // 监听滚动以触发 legacy 的加载
  const scrollEl = document.getElementById('gallery-scroll');
  if (scrollEl) {
    const onScroll = () => observeLegacy();
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    window.__photoGridScrollHandler = onScroll;
  }
  // 若已在 workspace，直接触发一次加载
  if (!dates.value.length) store.fetchDates().catch(() => {});
  observeLegacy();
});

onBeforeUnmount(() => {
  const scrollEl = document.getElementById('gallery-scroll');
  if (scrollEl && window.__photoGridScrollHandler) {
    scrollEl.removeEventListener('scroll', window.__photoGridScrollHandler);
    delete window.__photoGridScrollHandler;
  }
});

watch(dates, () => {
  // 允许 legacy 的 addDateSection 已插入 DOM，保持同步
});
</script>

<template>
  <div ref="galleryEl" class="ps-photo-grid-host">
    <!-- 双轨期：真实照片墙仍由 #gallery（legacy）渲染，本容器仅在 Vue 独立挂载时使用 -->
    <div v-if="!dates.length" class="gallery-empty">
      <p>暂无照片</p>
      <small>扫描完成后照片会按日期分组显示于此。Vue 岛已就绪，渲染仍由 legacy 承载，数据由 Pinia 镜像。</small>
    </div>
    <div v-else class="gallery-vue-placeholder">
      <section v-for="d in dates" :key="d.date_key" class="date-section vue-date-section" :id="'date-' + d.date_key" :data-date="d.date_key">
        <div class="date-header"><strong>{{ d.date_key }}</strong><span>{{ (store.dateCounts.get(d.date_key) || d.count || 0) }} 张</span></div>
        <div class="photo-grid">
          <!-- 占位：legacy 的 photoCard 会在 #gallery 中渲染，此处仅示意结构，样式复用全局 -->
          <div class="photo-card photo-placeholder" v-for="i in Math.min(4, Number(store.dateCounts.get(d.date_key) || 0))" :key="i">
            <div class="placeholder-fill"></div>
          </div>
        </div>
        <div class="date-more">滚动到这里会继续加载（由 legacy 驱动）</div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.gallery-empty { padding: 24px; color: var(--muted, #9aa0a6); text-align:center; }
.gallery-empty small { display:block; margin-top:8px; font-size:12px; line-height:1.6; max-width:520px; margin-left:auto; margin-right:auto; }
.vue-date-section { margin-bottom: 16px; }
</style>
