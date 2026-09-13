<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useStatsStore } from '../../stores/stats.js';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  rows: { type: Array, default: () => [] },
  type: { type: String, default: 'bar' },
  horizontal: { type: Boolean, default: true },
  height: { type: Number, default: 220 },
  showPercent: { type: Boolean, default: true },
  singleColor: { type: Boolean, default: false },
  labelInterval: { type: [Number, String], default: 'auto' },
  ariaLabel: { type: String, default: '统计图表' },
});

const store = useStatsStore();
const chartEl = ref(null);
const rows = computed(() => (props.rows || [])
  .map((row) => ({
    name: String(row.name || '未知'),
    count: Number(row.count || 0),
  }))
  .filter((row) => Number.isFinite(row.count) && row.count >= 0));
let chart = null;
let resizeObserver = null;
let themeObserver = null;

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCount(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function readTheme() {
  const styles = chartEl.value ? getComputedStyle(chartEl.value) : null;
  const read = (name, fallback) => styles?.getPropertyValue(name).trim() || fallback;
  return {
    text: read('--text', styles?.color || '#f4f4f5'),
    muted: read('--muted', styles?.color || '#9aa0a6'),
    line: read('--line', 'rgba(255,255,255,0.08)'),
    panel: read('--panel', 'transparent'),
  };
}

function colorFor(index) {
  return props.singleColor ? store.statsColor(0) : store.statsColor(index);
}

function truncateLabel(value, maxLength = 18) {
  const text = String(value || '未知');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function tooltipFormatter(params) {
  const item = Array.isArray(params) ? params[0] : params;
  const data = item?.data || {};
  const value = Number(item?.value ?? data.value ?? 0);
  const total = rows.value.reduce((sum, row) => sum + row.count, 0);
  const percent = total > 0 ? ` · ${(value / total * 100).toFixed(1)}%` : '';
  return `${escapeHtml(item?.name || data.name || '')}<br/><strong>${formatCount(value)} 张</strong>${props.showPercent ? percent : ''}`;
}

function buildOption() {
  const theme = readTheme();
  const categories = rows.value.map((row) => row.name);
  const values = rows.value.map((row, index) => ({
    value: row.count,
    itemStyle: { color: colorFor(index) },
  }));
  const isLine = props.type === 'line';
  const horizontal = props.horizontal && !isLine;
  const axisLabel = {
    color: theme.muted,
    fontSize: 11,
    hideOverlap: true,
  };
  const valueAxis = {
    type: 'value',
    min: 0,
    axisLabel,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: theme.line, width: 1 } },
  };
  const categoryAxis = {
    type: 'category',
    data: categories,
    axisLabel: {
      ...axisLabel,
      interval: props.labelInterval,
      formatter: (value) => truncateLabel(value, horizontal ? 18 : 14),
    },
    axisLine: { lineStyle: { color: theme.line } },
    axisTick: { show: false },
  };
  if (horizontal) {
    categoryAxis.axisLabel = {
      ...categoryAxis.axisLabel,
      width: 120,
      overflow: 'truncate',
      align: 'right',
      margin: 10,
    };
  }
  const series = isLine
    ? {
      type: 'line',
      data: values.map((item) => item.value),
      smooth: 0.25,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color: colorFor(0) },
      itemStyle: { color: colorFor(0) },
      areaStyle: { color: colorFor(0), opacity: 0.12 },
      emphasis: { focus: 'series', scale: true },
    }
    : {
      type: 'bar',
      data: values,
      barMaxWidth: horizontal ? 22 : 28,
      barCategoryGap: horizontal ? '28%' : '36%',
      label: {
        show: true,
        position: horizontal ? 'right' : 'top',
        color: theme.muted,
        fontSize: 11,
        formatter: ({ value }) => formatCount(value),
      },
      emphasis: { focus: 'series' },
    };

  return {
    animation: true,
    animationDuration: 420,
    animationDurationUpdate: 300,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: isLine ? 'axis' : 'item',
      renderMode: 'html',
      appendToBody: true,
      confine: false,
      enterable: true,
      backgroundColor: theme.panel,
      borderColor: theme.line,
      textStyle: { color: theme.text, fontSize: 12 },
      formatter: tooltipFormatter,
      extraCssText: 'max-width:240px;white-space:normal;word-break:break-word;z-index:9999;',
    },
    grid: horizontal
      ? { left: 136, right: 38, top: 8, bottom: 8, containLabel: false }
      : { left: 12, right: 18, top: 12, bottom: 26, containLabel: true },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? { ...categoryAxis, inverse: true } : valueAxis,
    series: [series],
  };
}

function renderChart() {
  if (!chartEl.value || chartEl.value.clientWidth < 1 || chartEl.value.clientHeight < 1) return;
  if (!chart) chart = echarts.init(chartEl.value, null, { renderer: 'canvas' });
  chart.setOption(buildOption(), { notMerge: true, lazyUpdate: false });
  chart.resize();
}

function resizeChart() {
  if (!chartEl.value || chartEl.value.clientWidth < 1 || chartEl.value.clientHeight < 1) return;
  if (!chart) renderChart();
  else chart.resize();
}

function observeTheme() {
  if (typeof MutationObserver === 'undefined') return;
  themeObserver = new MutationObserver(() => nextTick(renderChart));
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  if (document.body) themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
}

function disposeChart() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  if (chart) {
    chart.dispose();
    chart = null;
  }
}

watch(rows, () => nextTick(renderChart), { deep: true });

onMounted(() => {
  nextTick(renderChart);
  if (typeof ResizeObserver !== 'undefined' && chartEl.value) {
    resizeObserver = new ResizeObserver(resizeChart);
    resizeObserver.observe(chartEl.value);
  }
  observeTheme();
});

onBeforeUnmount(disposeChart);
</script>

<template>
  <div
    ref="chartEl"
    class="stats-echart"
    :style="{ height: `${height}px` }"
    role="img"
    :aria-label="ariaLabel"
  ></div>
</template>

<style scoped>
.stats-echart { width: 100%; min-width: 0; }
</style>
