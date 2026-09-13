<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { subjectGroupValues, subjectMotionEase } from './subjectPieMotion.js';
import SubjectPhotoCollection from './SubjectPhotoCollection.vue';
import { useStatsStore } from '../../stores/stats.js';

echarts.use([PieChart, LegendComponent, TooltipComponent, CanvasRenderer]);

const store = useStatsStore();
const chartEl = ref(null);
let chart = null;
let resizeObserver = null;
const selectedLabel = ref(null);
let displayProgress = 0;
let transitionFrame = 0;
let transitionToken = 0;
const data = computed(() => store.visualStats || {});
const coverage = computed(() => data.value.coverage || {});
const labels = computed(() => data.value.labels || []);
const otherExpanded = ref(false);
const centerHover = ref(false);
const chartPalette = ['#e0a45a', '#79a9d1', '#8ebf9b', '#c88b9f', '#9a91c7', '#c7a76b', '#6ea6a6', '#b57e61', '#8d9b6d', '#b58fa8', '#7f9aaf', '#c18c76', '#8aa58d', '#9b91ad', '#777b86'];
const OTHER_KEY = '__other__';
const EXPANDED_SMALL_SHARE = 0.65;
const groupedModel = computed(() => {
  const rows = labels.value
    .filter((row) => Number(row.count || 0) > 0)
    .map((row) => ({
      key: String(row.key || ''),
      name: String(row.label || '未命名'),
      value: Number(row.count || 0),
      percent: Number(row.percent || 0),
      source: row,
    }))
    .sort((a, b) => b.value - a.value);
  const smallCount = rows.filter((row) => row.percent < 10).length;
  let cutoff = rows.length;
  let accumulated = 0;
  for (let index = 0; index < rows.length; index += 1) {
    accumulated += rows[index].percent;
    if (accumulated >= 70) {
      cutoff = index + 1;
      break;
    }
  }
  const main = rows.slice(0, cutoff);
  const remainder = rows.slice(cutoff);
  const shouldGroup = smallCount >= 2 && remainder.length >= 2 && main.length > 0;
  const otherValue = remainder.reduce((sum, row) => sum + row.value, 0);
  const otherPercent = remainder.reduce((sum, row) => sum + row.percent, 0);
  return {
    rows,
    main,
    remainder,
    shouldGroup,
    otherValue,
    otherPercent,
    mainValue: main.reduce((sum, row) => sum + row.value, 0),
  };
});
function buildChartRows(progress = displayProgress) {
  const model = groupedModel.value;
  const focusProgress = model.shouldGroup ? Math.max(0, Math.min(1, Number(progress || 0))) : 0;
  const groupValues = subjectGroupValues(model.mainValue, model.otherValue, focusProgress, EXPANDED_SMALL_SHARE);
  const remainderKeys = new Set(model.remainder.map((row) => row.key));
  const colorMap = new Map(model.rows.map((row, index) => [row.key, chartPalette[index % chartPalette.length]]));
  const rows = model.rows.map((row) => {
    const isSmall = remainderKeys.has(row.key);
    const groupTotal = isSmall ? model.otherValue : model.mainValue;
    const displayGroupValue = isSmall ? groupValues.small : groupValues.main;
    const displayValue = groupTotal > 0 ? row.value / groupTotal * displayGroupValue : 0;
    return { ...row, isSmall, displayValue };
  });
  const displayTotal = rows.reduce((sum, row) => sum + row.displayValue, 0);
  return rows.map((row) => ({
    ...row,
    rawValue: row.value,
    rawPercent: row.percent,
    value: row.displayValue,
    displayPercent: displayTotal ? (row.displayValue / displayTotal) * 100 : 0,
    color: colorMap.get(row.key),
    labelVisible: row.displayValue > 0,
  }));
}

function buildGroupRows(progress = displayProgress) {
  const model = groupedModel.value;
  if (!model.shouldGroup) return [];
  const focusProgress = Math.max(0, Math.min(1, Number(progress || 0)));
  const total = model.mainValue + model.otherValue;
  const groupValues = subjectGroupValues(model.mainValue, model.otherValue, focusProgress, EXPANDED_SMALL_SHARE);
  return [
    {
      id: 'main-group',
      key: '__main_group__',
      name: '主要题材',
      value: groupValues.main,
      rawValue: model.mainValue,
      rawPercent: total ? (model.mainValue / total) * 100 : 0,
      color: 'rgba(255,255,255,.11)',
      isSmallGroup: false,
    },
    {
      id: 'small-group',
      key: OTHER_KEY,
      name: '小类题材',
      value: groupValues.small,
      rawValue: model.otherValue,
      rawPercent: total ? (model.otherValue / total) * 100 : 0,
      color: 'rgba(224,164,90,.34)',
      isSmallGroup: true,
    },
  ];
}

const chartRows = computed(() => buildChartRows(displayProgress));
const totalClassified = computed(() => Number(data.value.total_classified || 0));
const running = computed(() => !!coverage.value.running || store.visualLoading);

function formatCount(value) {
  const number = Number(value || 0);
  return Math.abs(number - Math.round(number)) < 0.05 ? String(Math.round(number)) : number.toFixed(1);
}

function analyze(force = false) {
  store.runVisualAnalysis(force).catch(() => {});
}

function animateOtherView(target) {
  if (!chart) {
    displayProgress = target;
    nextTick(renderChart);
    return;
  }
  if (transitionFrame) cancelAnimationFrame(transitionFrame);
  const token = ++transitionToken;
  const start = displayProgress;
  const startedAt = performance.now();
  const duration = target > start ? 360 : 720;
  const frame = (now) => {
    if (token !== transitionToken || !chart) return;
    const ratio = Math.min(1, Math.max(0, (now - startedAt) / duration));
    const eased = subjectMotionEase(ratio, target > start);
    displayProgress = start + (target - start) * eased;
    chart.setOption(option(displayProgress), { notMerge: false, lazyUpdate: true, silent: true });
    if (ratio < 1) {
      transitionFrame = requestAnimationFrame(frame);
    } else {
      transitionFrame = 0;
      displayProgress = target;
      chart.setOption(option(displayProgress), { notMerge: false, lazyUpdate: true, silent: true });
    }
  };
  transitionFrame = requestAnimationFrame(frame);
}

function toggleOtherView() {
  if (!groupedModel.value.shouldGroup) return;
  const target = otherExpanded.value ? 0 : 1;
  otherExpanded.value = target === 1;
  clearSamples();
  animateOtherView(target);
}

async function selectChartSlice(params) {
  const key = String(params?.data?.key || '');
  if (params?.seriesIndex === 1 && key === OTHER_KEY && groupedModel.value.shouldGroup) {
    toggleOtherView();
    return;
  }
  const row = labels.value.find((item) => String(item.key) === key);
  if (!row) return;
  selectedLabel.value = row;
}

function clearSamples() {
  selectedLabel.value = null;
}

function option(progress = displayProgress) {
  const rows = buildChartRows(progress);
  const groups = buildGroupRows(progress);
  const lookup = new Map(rows.map((row) => [row.name, row]));
  return {
    animation: false,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#18181c',
      borderColor: 'rgba(255,255,255,.16)',
      textStyle: { color: '#f4f4f4', fontSize: 12 },
      formatter(params) {
        const row = params.data || {};
        if (params.seriesIndex === 1) {
          const hint = row.isSmallGroup ? '<br/><span style="color:#e0a45a">点击后展开到 65% : 35%</span>' : '';
          return `${row.name}<br/>约 ${formatCount(row.rawValue)} 张等效照片（${Number(row.rawPercent || 0).toFixed(1)}%）${hint}`;
        }
        return `${params.name}<br/>约 ${formatCount(row.rawValue)} 张等效照片（${Number(row.rawPercent || 0).toFixed(1)}%）`;
      },
    },
    legend: {
      type: 'scroll',
      data: rows.map((row) => row.name),
      orient: 'vertical',
      right: 0,
      top: 'middle',
      width: '40%',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 9,
      textStyle: { color: '#c9c9ce', fontSize: 12 },
      formatter(name) {
        const row = lookup.get(name);
        if (!row) return name;
        return `${name}  约${formatCount(row.rawValue)}张 · ${row.rawPercent.toFixed(1)}%`;
      },
    },
    series: [{
      id: 'subject-pie',
      name: '拍摄题材',
      type: 'pie',
      radius: ['48%', '74%'],
      center: ['31%', '50%'],
      minAngle: 0,
      minShowLabelAngle: 0,
      avoidLabelOverlap: true,
      itemStyle: {
        borderColor: '#121216',
        borderWidth: 2,
        borderRadius: 4,
      },
      label: {
        position: 'outside',
        distanceToLabelLine: 3,
        bleedMargin: 4,
        color: '#ececf0',
        fontSize: 11,
        formatter(params) {
          return params.data?.labelVisible ? params.name : '';
        },
      },
      labelLine: { length: 8, length2: 6, lineStyle: { color: 'rgba(255,255,255,.35)' } },
      emphasis: {
        scale: true,
        scaleSize: 5,
        label: { fontSize: 13, fontWeight: 600 },
      },
      data: rows.map((row) => ({
        id: row.key,
        ...row,
        itemStyle: { color: row.color },
        label: { show: row.labelVisible },
        labelLine: { show: row.labelVisible },
      })),
    }, {
      id: 'subject-groups',
      name: '题材范围',
      type: 'pie',
      radius: ['36%', '46%'],
      center: ['31%', '50%'],
      z: 2,
      silent: false,
      avoidLabelOverlap: false,
      itemStyle: {
        borderColor: '#121216',
        borderWidth: 2,
        borderRadius: 4,
      },
      label: { show: false },
      labelLine: { show: false },
      emphasis: {
        scale: true,
        scaleSize: 4,
        itemStyle: { borderColor: '#ececf0', borderWidth: 2 },
      },
      data: groups.map((row) => ({
        id: row.id,
        ...row,
        itemStyle: { color: row.color },
      })),
    }],
    media: [{
      query: { maxWidth: 700 },
      option: {
        legend: {
          orient: 'horizontal',
          left: 'center',
          right: 'auto',
          top: 'auto',
          bottom: 6,
          width: '92%',
          itemGap: 7,
        },
        series: [
          { center: ['50%', '37%'], radius: ['34%', '56%'] },
          { center: ['50%', '37%'], radius: ['25%', '32%'] },
        ],
      },
    }],
  };
}

function renderChart() {
  if (!chartEl.value || !chartRows.value.length) {
    if (chart) {
      chart.dispose();
      chart = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    return;
  }
  if (chart && typeof chart.getDom === 'function' && chart.getDom() !== chartEl.value) {
    chart.dispose();
    chart = null;
  }
  if (!chart) chart = echarts.init(chartEl.value, null, { renderer: 'canvas' });
  chart.setOption(option(), { notMerge: false, lazyUpdate: false });
  chart.off('click', selectChartSlice);
  chart.on('click', selectChartSlice);
  chart.resize();
  if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => chart && chart.resize());
    resizeObserver.observe(chartEl.value);
  }
}

function disposeChart() {
  transitionToken += 1;
  if (transitionFrame) {
    cancelAnimationFrame(transitionFrame);
    transitionFrame = 0;
  }
  if (chart) {
    chart.off('click', selectChartSlice);
    chart.dispose();
    chart = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
}

watch(chartRows, () => nextTick(renderChart), { deep: true });
watch(labels, (rows) => {
  if (!groupedModel.value.shouldGroup) {
    otherExpanded.value = false;
    displayProgress = 0;
  }
  if (!selectedLabel.value || rows.some((row) => row.key === selectedLabel.value.key)) return;
  clearSamples();
}, { deep: true });

onMounted(() => {
  nextTick(renderChart);
});

onBeforeUnmount(disposeChart);
</script>

<template>
  <div class="visual-stats-layout">
    <section class="stats-panel visual-stats-coverage">
      <div class="visual-stats-head">
        <div>
          <h2>题材统计</h2>
        </div>
        <button class="ghost-btn small" type="button" :disabled="running" @click="analyze(false)">
          {{ running ? '分析中…' : (labels.length ? '重新分析' : '生成统计') }}
        </button>
      </div>

      <div class="visual-stats-metrics">
        <div><strong>{{ Number(coverage.total_eligible || 0) }}</strong><span>可统计照片</span></div>
        <div><strong>{{ Number(coverage.vector_count || 0) }}</strong><span>已有向量</span></div>
        <div><strong>{{ Number(coverage.classified_count || data.total_classified || 0) }}</strong><span>参与统计</span></div>
        <div><strong>{{ Number(data.uncertain_count || 0) }}</strong><span>待确认</span></div>
      </div>

      <div v-if="store.visualError" class="chart-empty">{{ store.visualError }}</div>
      <div v-else-if="!labels.length" class="chart-empty">
        请先完成语义索引，再点击“生成统计”。索引失败的照片会单独显示，不会静默消失。
      </div>
      <div v-else class="visual-chart-wrap">
        <div ref="chartEl" class="visual-chart" aria-label="拍摄题材比例饼图"></div>
        <button
          v-if="groupedModel.shouldGroup"
          class="visual-chart-center visual-chart-center-button"
          :class="{ 'is-hovered': centerHover }"
          type="button"
          :aria-label="otherExpanded ? '收起小类题材' : '放大小类题材'"
          @click="toggleOtherView"
          @mouseenter="centerHover = true"
          @mouseleave="centerHover = false"
        >
          <strong>{{ totalClassified }}</strong>
          <span v-if="centerHover">{{ otherExpanded ? '点击收起小类' : '点击小类放大' }}</span>
          <span v-else>{{ otherExpanded ? '小类已放大' : '参与统计' }}</span>
        </button>
        <div v-else class="visual-chart-center" aria-hidden="true">
          <strong>{{ totalClassified }}</strong>
          <span>参与统计</span>
        </div>
      </div>

      <SubjectPhotoCollection v-if="selectedLabel" :key="`${data.source_id}:${selectedLabel.key}`"
        :source-id="data.source_id" :label-key="selectedLabel.key" :label="selectedLabel.label"
        @close="clearSamples" />

      <div v-if="coverage.index_missing_count" class="visual-stats-note">
        {{ coverage.index_missing_count }} 张照片还没有可用向量；这部分未被归入任何题材。
      </div>
      <div v-if="coverage.stale_count" class="visual-stats-note">
        有 {{ coverage.stale_count }} 张照片的题材结果需要重新分析。
      </div>
    </section>
  </div>
</template>

<style scoped>
.visual-stats-layout { display: grid; gap: 16px; }
.visual-stats-head { display: flex; align-items: flex-start; gap: 16px; justify-content: space-between; }
.visual-stats-head h2 { margin: 0 0 6px; }
.visual-stats-head p { margin: 0; color: var(--muted, #9aa0a6); font-size: 12px; line-height: 1.6; }
.visual-stats-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
.visual-stats-metrics div { padding: 10px 12px; border: 1px solid rgba(255,255,255,.08); border-radius: 6px; }
.visual-stats-metrics strong, .visual-stats-metrics span { display: block; }
.visual-stats-metrics strong { font-size: 18px; color: var(--text, #f4f4f4); }
.visual-stats-metrics span { margin-top: 3px; color: var(--muted, #9aa0a6); font-size: 11px; }
.visual-chart-wrap { position: relative; min-height: 340px; border-top: 1px solid rgba(255,255,255,.06); border-bottom: 1px solid rgba(255,255,255,.06); }
.visual-chart { width: 100%; height: 340px; }
.visual-chart-center { position: absolute; left: 31%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.visual-chart-center-button { min-width: 118px; padding: 10px 12px; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; pointer-events: auto; }
.visual-chart-center-button.is-hovered strong { color: #e0a45a; }
.visual-chart-center-button.is-hovered span { color: #e0a45a; }
.visual-chart-center strong { color: var(--text, #f4f4f4); font-size: 26px; line-height: 1.1; }
.visual-chart-center span { margin-top: 4px; color: var(--muted, #9aa0a6); font-size: 11px; }
.visual-stats-note { margin-top: 12px; color: var(--muted, #9aa0a6); font-size: 12px; line-height: 1.6; }
@media (max-width: 700px) {
  .visual-stats-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .visual-chart-wrap { min-height: 460px; }
  .visual-chart { height: 460px; }
  .visual-chart-center { left: 50%; top: 37%; }
}
@media (max-width: 460px) {
}
</style>
