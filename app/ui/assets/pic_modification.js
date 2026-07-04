(function () {
  'use strict';

  function asPoint(point) {
    return {
      x: Number(point && point.x || 0),
      y: Number(point && point.y || 0),
    };
  }

  function createQuickEditPanController(config) {
    const options = config || {};
    const stage = options.stage;
    if (!stage) throw new Error('Quick edit pan stage is required');
    if (typeof options.getPan !== 'function') throw new Error('Quick edit pan getter is required');
    if (typeof options.setPan !== 'function') throw new Error('Quick edit pan setter is required');
    if (typeof options.applyPreview !== 'function') throw new Error('Quick edit preview applier is required');

    let drag = null;

    function canPan() {
      return !!(
        (!options.isOpen || options.isOpen())
        && (!options.isToolIdle || options.isToolIdle())
        && (!options.hasImage || options.hasImage())
      );
    }

    function refresh() {
      const enabled = canPan();
      stage.classList.toggle('can-pan', enabled);
      if (!enabled) cancel();
    }

    function onPointerDown(ev) {
      if (ev.button !== 0 || !canPan()) return;
      drag = {
        pointerId: ev.pointerId,
        x: ev.clientX,
        y: ev.clientY,
        startX: ev.clientX,
        startY: ev.clientY,
      };
      stage.classList.add('panning');
      try {
        stage.setPointerCapture(ev.pointerId);
      } catch (err) {
        // Pointer capture can fail if the pointer is already released.
      }
      ev.preventDefault();
      ev.stopPropagation();
    }

    function onPointerMove(ev) {
      if (!drag || drag.pointerId !== ev.pointerId) {
        refresh();
        return;
      }
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      drag.x = ev.clientX;
      drag.y = ev.clientY;
      if (dx || dy) {
        const pan = asPoint(options.getPan());
        options.setPan(pan.x + dx, pan.y + dy);
        options.applyPreview();
      }
      ev.preventDefault();
      ev.stopPropagation();
    }

    function endPointer(ev) {
      if (!drag || drag.pointerId !== ev.pointerId) return;
      drag = null;
      stage.classList.remove('panning');
      try {
        stage.releasePointerCapture(ev.pointerId);
      } catch (err) {
        // Pointer capture may already be released by the browser.
      }
      refresh();
      ev.preventDefault();
      ev.stopPropagation();
    }

    function cancel() {
      drag = null;
      stage.classList.remove('panning');
    }

    function destroy() {
      cancel();
      stage.classList.remove('can-pan');
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', endPointer);
      stage.removeEventListener('pointercancel', endPointer);
      stage.removeEventListener('pointerleave', refresh);
      stage.removeEventListener('pointerenter', refresh);
    }

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('pointerleave', refresh);
    stage.addEventListener('pointerenter', refresh);
    refresh();

    return {
      cancel,
      destroy,
      refresh,
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function defaultCurvePoints() {
    return [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ];
  }

  function cleanCurvePoints(points) {
    const source = Array.isArray(points) && points.length >= 2 ? points : defaultCurvePoints();
    const clean = [];
    source.forEach((point) => {
      const x = Number(point && point.x);
      const y = Number(point && point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      clean.push({
        x: clamp(x, 0, 100),
        y: clamp(y, 0, 100),
      });
    });
    clean.sort((a, b) => a.x - b.x);
    const merged = [];
    clean.forEach((point) => {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.x - point.x) < 0.5) {
        last.x = point.x;
        last.y = point.y;
      } else {
        merged.push(Object.assign({}, point));
      }
    });
    const first = merged[0] || { x: 0, y: 0 };
    const last = merged[merged.length - 1] || { x: 100, y: 100 };
    const interior = merged
      .filter((point) => point.x > 0.5 && point.x < 99.5)
      .map((point) => ({
        x: clamp(point.x, 1, 99),
        y: clamp(point.y, 0, 100),
      }));
    return [
      { x: 0, y: clamp(first.x <= 0.5 ? first.y : 0, 0, 100) },
      ...interior,
      { x: 100, y: clamp(last.x >= 99.5 ? last.y : 100, 0, 100) },
    ];
  }

  function curveY(points, xPercent) {
    const clean = cleanCurvePoints(points);
    const x = clamp(Number(xPercent || 0), 0, 100);
    let index = 0;
    while (index < clean.length - 2 && x > clean[index + 1].x) index += 1;
    const p0 = clean[Math.max(0, index - 1)];
    const p1 = clean[index];
    const p2 = clean[Math.min(clean.length - 1, index + 1)];
    const p3 = clean[Math.min(clean.length - 1, index + 2)];
    const span = Math.max(0.0001, p2.x - p1.x);
    const t = clamp((x - p1.x) / span, 0, 1);
    const t2 = t * t;
    const t3 = t2 * t;
    const slope1 = (p2.y - p0.y) / Math.max(0.0001, p2.x - p0.x) * span;
    const slope2 = (p3.y - p1.y) / Math.max(0.0001, p3.x - p1.x) * span;
    const y = (2 * t3 - 3 * t2 + 1) * p1.y
      + (t3 - 2 * t2 + t) * slope1
      + (-2 * t3 + 3 * t2) * p2.y
      + (t3 - t2) * slope2;
    return clamp(y, 0, 100);
  }

  function createCurvePanel(config) {
    const options = config || {};
    if (typeof options.getPoints !== 'function') throw new Error('Curve points getter is required');
    if (typeof options.setPoints !== 'function') throw new Error('Curve points setter is required');

    const panel = document.createElement('div');
    panel.className = 'quick-edit-curve-panel hidden';
    panel.tabIndex = -1;
    panel.innerHTML = [
      '<div class="quick-edit-curve-head">',
      '<span>曲线</span>',
      '<div class="quick-edit-curve-head-actions">',
      '<button class="icon-btn quick-edit-curve-head-btn" type="button" data-curve-reset title="重置曲线" aria-label="重置曲线">↺</button>',
      '<button class="icon-btn quick-edit-curve-close" type="button" data-curve-close title="关闭" aria-label="关闭">×</button>',
      '</div>',
      '</div>',
      '<canvas class="quick-edit-curve-canvas" width="256" height="176" data-curve-canvas></canvas>',
      '<div class="quick-edit-curve-values">',
      '<div><span>输入</span><b data-curve-input>0</b></div>',
      '<div><span>输出</span><b data-curve-output>0</b></div>',
      '<div><span>点数</span><b data-curve-count>2</b></div>',
      '</div>',
      '<div class="quick-edit-curve-actions">',
      '<span>右键控制点删除</span>',
      '</div>',
    ].join('');
    document.body.appendChild(panel);

    const canvas = panel.querySelector('[data-curve-canvas]');
    const ctx = canvas.getContext('2d');
    let open = false;
    let activeIndex = -1;
    let dragging = false;
    let currentAnchor = null;

    function resolveContainer(anchor) {
      if (typeof options.getContainer === 'function') {
        const custom = options.getContainer(anchor);
        if (custom && typeof custom.appendChild === 'function') return custom;
      }
      if (anchor && typeof anchor.closest === 'function') {
        const side = anchor.closest('.quick-edit-side');
        if (side) return side;
      }
      return document.body;
    }

    function containsNode(root, target) {
      return !!(root && target && root.contains(target));
    }

    function containerViewportRect(container) {
      if (container === document.body) {
        return {
          left: 0,
          top: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
        };
      }
      const rect = container.getBoundingClientRect();
      return {
        left: rect.left + (container.clientLeft || 0),
        top: rect.top + (container.clientTop || 0),
        right: rect.right,
        bottom: rect.bottom,
      };
    }

    function containerScroll(container) {
      if (container === document.body) {
        return {
          left: window.scrollX || document.documentElement.scrollLeft || 0,
          top: window.scrollY || document.documentElement.scrollTop || 0,
        };
      }
      return {
        left: container.scrollLeft || 0,
        top: container.scrollTop || 0,
      };
    }

    function positionPanel(anchor) {
      const safeAnchor = anchor && anchor.isConnected ? anchor : null;
      const container = resolveContainer(safeAnchor);
      if (panel.parentNode !== container) container.appendChild(panel);

      const anchorRect = safeAnchor ? safeAnchor.getBoundingClientRect() : null;
      const containerRect = containerViewportRect(container);
      const scroll = containerScroll(container);
      const width = panel.offsetWidth || 292;
      const height = panel.offsetHeight || 292;
      const minLeft = containerRect.left + 12;
      const maxLeft = Math.max(minLeft, containerRect.right - width - 12);
      const minTop = containerRect.top + 12;
      const maxTop = Math.max(minTop, containerRect.bottom - height - 12);
      const desiredLeft = anchorRect
        ? anchorRect.left + anchorRect.width / 2 - width / 2
        : containerRect.right - width - 24;
      let desiredTop = anchorRect ? anchorRect.bottom + 10 : containerRect.top + 96;

      if (anchorRect && desiredTop + height > containerRect.bottom - 12) {
        const topAboveAnchor = anchorRect.top - height - 10;
        if (topAboveAnchor >= minTop) desiredTop = topAboveAnchor;
      }

      const left = clamp(desiredLeft, minLeft, maxLeft);
      const top = clamp(desiredTop, minTop, maxTop);
      panel.style.left = (left - containerRect.left + scroll.left).toFixed(0) + 'px';
      panel.style.top = (top - containerRect.top + scroll.top).toFixed(0) + 'px';
    }

    function graphRect() {
      return { x: 18, y: 14, w: canvas.width - 36, h: canvas.height - 32 };
    }

    function canvasPoint(spec, rect) {
      return {
        x: rect.x + spec.x / 100 * rect.w,
        y: rect.y + (100 - spec.y) / 100 * rect.h,
      };
    }

    function histogramDisplayValues(values) {
      const source = Array.isArray(values) ? values : [];
      const smoothed = new Array(256).fill(0);
      for (let i = 0; i < 256; i += 1) {
        const prev2 = source[Math.max(0, i - 2)] || 0;
        const prev1 = source[Math.max(0, i - 1)] || 0;
        const current = source[i] || 0;
        const next1 = source[Math.min(255, i + 1)] || 0;
        const next2 = source[Math.min(255, i + 2)] || 0;
        smoothed[i] = (prev2 + prev1 * 2 + current * 3 + next1 * 2 + next2) / 9;
      }
      return smoothed;
    }

    function histogramDisplayMax(series) {
      const values = [];
      series.forEach((items) => {
        if (!Array.isArray(items)) return;
        for (let i = 1; i < 255; i += 1) {
          const value = Number(items[i] || 0);
          if (value > 0) values.push(value);
        }
      });
      if (!values.length) return 1;
      values.sort((a, b) => a - b);
      const index = Math.min(values.length - 1, Math.floor(values.length * 0.985));
      return Math.max(1, values[index] * 1.12);
    }

    function drawHistogramBackground(rect) {
      if (typeof options.getHistogram !== 'function') return;
      const histogram = options.getHistogram();
      if (!histogram || !ctx) return;
      const mode = histogram.mode === 'rgb' ? 'rgb' : 'white';
      const channels = Array.isArray(histogram.channels) && histogram.channels.length
        ? histogram.channels
        : ['red', 'green', 'blue'];
      const colors = {
        red: '#ff6b6b',
        green: '#62d6aa',
        blue: '#8ea8ff',
        white: '#f4f4f5',
      };
      const keys = mode === 'rgb' ? channels : ['white'];
      const displaySeries = {};
      keys.forEach((key) => {
        displaySeries[key] = histogramDisplayValues(histogram[key]);
      });
      const max = histogramDisplayMax(keys.map((key) => displaySeries[key]));
      keys.forEach((key) => {
        const values = displaySeries[key];
        if (!values) return;
        ctx.beginPath();
        for (let i = 0; i < 256; i += 1) {
          const x = rect.x + i / 255 * rect.w;
          const y = rect.y + rect.h - Math.sqrt(Math.min(1, values[i] / max)) * (rect.h - 8) - 4;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = colors[key] || colors.white;
        ctx.globalAlpha = mode === 'rgb' ? 0.28 : 0.24;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }

    function eventGraphPoint(ev) {
      const rect = graphRect();
      const box = canvas.getBoundingClientRect();
      const localX = (ev.clientX - box.left) * canvas.width / Math.max(1, box.width);
      const localY = (ev.clientY - box.top) * canvas.height / Math.max(1, box.height);
      return {
        x: clamp((localX - rect.x) / Math.max(1, rect.w) * 100, 0, 100),
        y: clamp(100 - (localY - rect.y) / Math.max(1, rect.h) * 100, 0, 100),
      };
    }

    function nearestPointIndex(ev, points) {
      const rect = graphRect();
      const box = canvas.getBoundingClientRect();
      const localX = (ev.clientX - box.left) * canvas.width / Math.max(1, box.width);
      const localY = (ev.clientY - box.top) * canvas.height / Math.max(1, box.height);
      let bestIndex = -1;
      let bestDistance = Infinity;
      points.forEach((point, index) => {
        const p = canvasPoint(point, rect);
        const distance = Math.hypot(localX - p.x, localY - p.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      return bestDistance <= 12 ? bestIndex : -1;
    }

    function selectedPoint(points) {
      const clean = cleanCurvePoints(points);
      if (activeIndex < 0 || activeIndex >= clean.length) return clean[0];
      return clean[activeIndex];
    }

    function draw() {
      if (!ctx) return;
      const points = cleanCurvePoints(options.getPoints());
      if (activeIndex >= points.length) activeIndex = points.length - 1;
      const rect = graphRect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#070708';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawHistogramBackground(rect);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i += 1) {
        const x = rect.x + rect.w * i / 4 + 0.5;
        const y = rect.y + rect.h * i / 4 + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, rect.y);
        ctx.lineTo(x, rect.y + rect.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rect.x, y);
        ctx.lineTo(rect.x + rect.w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y + rect.h);
      ctx.lineTo(rect.x + rect.w, rect.y);
      ctx.stroke();
      ctx.strokeStyle = '#ffb817';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= 100; x += 1) {
        const px = rect.x + x / 100 * rect.w;
        const py = rect.y + (100 - curveY(points, x)) / 100 * rect.h;
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      points.forEach((spec, index) => {
        const p = canvasPoint(spec, rect);
        ctx.beginPath();
        ctx.arc(p.x, p.y, index === activeIndex ? 6 : 5, 0, Math.PI * 2);
        ctx.fillStyle = index === activeIndex ? '#fff' : '#ffb817';
        ctx.fill();
        ctx.strokeStyle = '#050505';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      const selected = selectedPoint(points);
      const input = panel.querySelector('[data-curve-input]');
      const output = panel.querySelector('[data-curve-output]');
      const count = panel.querySelector('[data-curve-count]');
      if (input) input.textContent = String(Math.round(selected.x));
      if (output) output.textContent = String(Math.round(selected.y));
      if (count) count.textContent = String(points.length);
    }

    function commitPoints(points) {
      options.setPoints(cleanCurvePoints(points));
      if (typeof options.onChange === 'function') options.onChange();
      draw();
    }

    function updateActivePoint(ev) {
      const points = cleanCurvePoints(options.getPoints());
      if (activeIndex < 0) activeIndex = 0;
      const next = eventGraphPoint(ev);
      const previous = points[activeIndex - 1];
      const following = points[activeIndex + 1];
      if (activeIndex <= 0) {
        points[0] = { x: 0, y: next.y };
      } else if (activeIndex >= points.length - 1) {
        points[points.length - 1] = { x: 100, y: next.y };
      } else {
        points[activeIndex] = {
          x: clamp(next.x, previous.x + 1, following.x - 1),
          y: next.y,
        };
      }
      commitPoints(points);
    }

    function onPointerDown(ev) {
      if (ev.button !== 0) return;
      let points = cleanCurvePoints(options.getPoints());
      const hitIndex = nearestPointIndex(ev, points);
      if (hitIndex >= 0) {
        activeIndex = hitIndex;
      } else {
        const next = eventGraphPoint(ev);
        if (next.x <= 0.5) activeIndex = 0;
        else if (next.x >= 99.5) activeIndex = points.length - 1;
        else {
          points = cleanCurvePoints(points.concat([{ x: next.x, y: next.y }]));
          activeIndex = points.findIndex((point) => Math.abs(point.x - next.x) < 0.5);
          if (activeIndex < 0) activeIndex = nearestPointIndex(ev, points);
          commitPoints(points);
        }
      }
      dragging = true;
      updateActivePoint(ev);
      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch (err) {
        // Pointer capture can fail if the pointer is already released.
      }
      ev.preventDefault();
      ev.stopPropagation();
    }

    function onPointerMove(ev) {
      if (!dragging || activeIndex < 0) return;
      updateActivePoint(ev);
      ev.preventDefault();
      ev.stopPropagation();
    }

    function endPointer(ev) {
      if (!dragging) return;
      dragging = false;
      draw();
      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch (err) {
        // Pointer capture may already be released by the browser.
      }
      ev.preventDefault();
      ev.stopPropagation();
    }

    function show(anchor) {
      open = true;
      if (anchor) currentAnchor = anchor;
      panel.classList.remove('hidden');
      positionPanel(currentAnchor);
      panel.focus({ preventScroll: true });
      draw();
    }

    function hide() {
      open = false;
      dragging = false;
      currentAnchor = null;
      panel.classList.add('hidden');
    }

    function onDocumentPointerDown(ev) {
      if (!open) return;
      const target = ev.target;
      if (containsNode(panel, target) || containsNode(currentAnchor, target)) return;
      hide();
    }

    function deleteActivePoint() {
      deletePointAt(activeIndex);
    }

    function deletePointAt(index) {
      const points = cleanCurvePoints(options.getPoints());
      if (index <= 0 || index >= points.length - 1) return;
      points.splice(index, 1);
      activeIndex = clamp(index, 0, points.length - 1);
      commitPoints(points);
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('contextmenu', (ev) => {
      const points = cleanCurvePoints(options.getPoints());
      const index = nearestPointIndex(ev, points);
      if (index > 0 && index < points.length - 1) {
        activeIndex = index;
        deletePointAt(index);
      }
      ev.preventDefault();
      ev.stopPropagation();
    });
    panel.querySelector('[data-curve-close]').addEventListener('click', () => hide());
    panel.querySelector('[data-curve-reset]').addEventListener('click', () => {
      activeIndex = -1;
      commitPoints(defaultCurvePoints());
    });
    panel.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Backspace' && ev.key !== 'Delete') return;
      deleteActivePoint();
      ev.preventDefault();
      ev.stopPropagation();
    });
    document.addEventListener('pointerdown', onDocumentPointerDown, true);
    window.addEventListener('resize', () => {
      if (open) positionPanel(currentAnchor);
    });

    return {
      hide,
      isOpen: () => open,
      show,
      sync: draw,
      toggle: (anchor) => {
        if (open) hide();
        else show(anchor);
      },
    };
  }

  window.PicModification = Object.assign({}, window.PicModification, {
    createQuickEditPanController,
    createCurvePanel,
  });
}());
