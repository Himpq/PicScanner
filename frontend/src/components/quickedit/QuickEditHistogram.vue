<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useQuickEditStore } from '../../stores/quickEdit.js';

const store = useQuickEditStore();
const canvasRef = ref(null);

function draw() {
  const PS = window.PS;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // 双轨：优先用 legacy 的 histogramData 绘制
  const data = PS && PS.state && PS.state.quickEdit && PS.state.quickEdit.histogramData;
  ctx.clearRect(0,0,canvas.width, canvas.height);
  if (!data || !data.white) {
    ctx.fillStyle = '#2a2a2e';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('直方图由 legacy 驱动', canvas.width/2, canvas.height/2);
    return;
  }
  // 简化绘制：white 通道
  const hist = data.white || [];
  ctx.fillStyle = '#1a1a1e';
  ctx.fillRect(0,0,canvas.width, canvas.height);
  ctx.strokeStyle = '#e0a45a';
  ctx.beginPath();
  hist.forEach((v, i) => {
    const x = (i / hist.length) * canvas.width;
    const y = canvas.height - (v / Math.max(...hist,1)) * canvas.height;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
}

onMounted(() => {
  draw();
  const t = setInterval(draw, 400);
  window.__qeHistTimer = t;
});
onBeforeUnmount(() => {
  if (window.__qeHistTimer) { clearInterval(window.__qeHistTimer); delete window.__qeHistTimer; }
});
watch(() => store.photo, draw);
</script>

<template>
  <div class="qe-histogram">
    <div class="qe-histogram-head"><span>直方图</span><small>白 · 红 · 绿 · 蓝</small></div>
    <canvas ref="canvasRef" width="320" height="80" class="qe-histogram-canvas"></canvas>
  </div>
</template>

<style scoped>
.qe-histogram { border:1px solid var(--border,#2a2a2a); border-radius:8px; overflow:hidden; background: #0d0d10; }
.qe-histogram-head { display:flex; justify-content:space-between; padding:6px 8px; font-size:11px; color: var(--muted,#9aa0a6); border-bottom:1px solid rgba(255,255,255,0.06); }
.qe-histogram-canvas { width:100%; display:block; }
</style>
