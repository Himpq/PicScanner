(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PicScannerQuickEditGeometry = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : Number(fallback || 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeCrop(rect, minimumPercent) {
    const minimum = clamp(finite(minimumPercent, 0.001), 0.000001, 100);
    const source = rect || {};
    const x = clamp(finite(source.x), 0, 100 - minimum);
    const y = clamp(finite(source.y), 0, 100 - minimum);
    const width = clamp(finite(source.w, 100), minimum, 100 - x);
    const height = clamp(finite(source.h, 100), minimum, 100 - y);
    return { x, y, w: width, h: height };
  }

  function composeCrop(baseRect, selectionRect, minimumPercent) {
    const base = normalizeCrop(baseRect, minimumPercent);
    const selection = normalizeCrop(selectionRect, minimumPercent);
    return normalizeCrop({
      x: base.x + selection.x * base.w / 100,
      y: base.y + selection.y * base.h / 100,
      w: base.w * selection.w / 100,
      h: base.h * selection.h / 100,
    }, Math.max(0.000001, finite(minimumPercent, 0.001) * base.w / 100));
  }

  function selectionFromFrames(baseFrame, selectionFrame, minimumPercent) {
    const base = baseFrame || {};
    const selection = selectionFrame || {};
    const baseX = finite(base.x);
    const baseY = finite(base.y);
    const baseWidth = Math.max(0.000001, finite(base.w || base.width, 1));
    const baseHeight = Math.max(0.000001, finite(base.h || base.height, 1));
    const left = clamp(finite(selection.x), baseX, baseX + baseWidth);
    const top = clamp(finite(selection.y), baseY, baseY + baseHeight);
    const right = clamp(finite(selection.x) + finite(selection.w || selection.width), baseX, baseX + baseWidth);
    const bottom = clamp(finite(selection.y) + finite(selection.h || selection.height), baseY, baseY + baseHeight);
    if (right <= left || bottom <= top) return null;
    return normalizeCrop({
      x: (left - baseX) / baseWidth * 100,
      y: (top - baseY) / baseHeight * 100,
      w: (right - left) / baseWidth * 100,
      h: (bottom - top) / baseHeight * 100,
    }, minimumPercent);
  }

  function outputCenterOffset(fullWidth, fullHeight, cropRect) {
    const crop = normalizeCrop(cropRect, 0.000001);
    return {
      x: (crop.x + crop.w / 2 - 50) / 100 * Math.max(0.000001, finite(fullWidth, 1)),
      y: (crop.y + crop.h / 2 - 50) / 100 * Math.max(0.000001, finite(fullHeight, 1)),
    };
  }

  function transformedGeometry(options) {
    const opts = options || {};
    const stageWidth = Math.max(0.000001, finite(opts.stageWidth, 1));
    const stageHeight = Math.max(0.000001, finite(opts.stageHeight, 1));
    const fullWidth = Math.max(0.000001, finite(opts.fullWidth, 1));
    const fullHeight = Math.max(0.000001, finite(opts.fullHeight, 1));
    const zoom = Math.max(0.000001, finite(opts.zoom, 1));
    const panX = finite(opts.panX);
    const panY = finite(opts.panY);
    const offset = opts.recenter === false
      ? { x: 0, y: 0 }
      : outputCenterOffset(fullWidth, fullHeight, opts.crop);
    const width = fullWidth * zoom;
    const height = fullHeight * zoom;
    const centerX = stageWidth / 2 + panX - offset.x * zoom;
    const centerY = stageHeight / 2 + panY - offset.y * zoom;
    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      w: width,
      h: height,
      centerX,
      centerY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  }

  function screenDeltaToPercent(delta, screenBasis) {
    return finite(delta) / Math.max(0.000001, finite(screenBasis, 1)) * 100;
  }

  function constrainedAxis(value, minimum, maximum) {
    const min = finite(minimum);
    const max = finite(maximum);
    if (min <= max) return clamp(finite(value), min, max);
    return (min + max) / 2;
  }

  const IMAGE_LAYER_ANCHORS = Object.freeze([
    'top-left', 'top-center', 'top-right',
    'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right',
  ]);

  function normalizeImageLayerAnchor(value) {
    const anchor = String(value || '');
    return IMAGE_LAYER_ANCHORS.includes(anchor) ? anchor : '';
  }

  function imageLayerAnchorPoint(anchor, contentWidth, contentHeight) {
    const normalized = normalizeImageLayerAnchor(anchor) || 'center';
    const horizontal = normalized.endsWith('-left') ? 'left' : (normalized.endsWith('-right') ? 'right' : 'center');
    const vertical = normalized.startsWith('top-') ? 'top' : (normalized.startsWith('bottom-') ? 'bottom' : 'center');
    return {
      x: horizontal === 'left' ? 0 : (horizontal === 'right' ? contentWidth : contentWidth / 2),
      y: vertical === 'top' ? 0 : (vertical === 'bottom' ? contentHeight : contentHeight / 2),
    };
  }

  function closestImageLayerAnchor(x, y, contentWidth, contentHeight) {
    const width = Math.max(0.000001, finite(contentWidth, 1));
    const height = Math.max(0.000001, finite(contentHeight, 1));
    let closest = 'center';
    let closestDistance = Number.POSITIVE_INFINITY;
    IMAGE_LAYER_ANCHORS.forEach((anchor) => {
      const point = imageLayerAnchorPoint(anchor, width, height);
      const distance = Math.pow(finite(x) - point.x, 2) + Math.pow(finite(y) - point.y, 2);
      if (distance < closestDistance) {
        closest = anchor;
        closestDistance = distance;
      }
    });
    return closest;
  }

  function imageLayerOffsetsForPoint(options) {
    const opts = options || {};
    const contentWidth = Math.max(0.000001, finite(opts.contentWidth, 1));
    const contentHeight = Math.max(0.000001, finite(opts.contentHeight, 1));
    const anchor = normalizeImageLayerAnchor(opts.anchor) || 'center';
    const point = imageLayerAnchorPoint(anchor, contentWidth, contentHeight);
    const basis = Math.min(contentWidth, contentHeight);
    return {
      anchor,
      offsetXPercent: (finite(opts.x) - point.x) / basis * 100,
      offsetYPercent: (finite(opts.y) - point.y) / basis * 100,
    };
  }

  function imageLayerPlacement(options) {
    const opts = options || {};
    const contentWidth = Math.max(0.000001, finite(opts.contentWidth, 1));
    const contentHeight = Math.max(0.000001, finite(opts.contentHeight, 1));
    const outerLeft = finite(opts.outerLeft);
    const outerTop = finite(opts.outerTop);
    const outerRight = finite(opts.outerRight, contentWidth);
    const outerBottom = finite(opts.outerBottom, contentHeight);
    const anchor = normalizeImageLayerAnchor(opts.anchor) || 'center';
    const anchorPoint = imageLayerAnchorPoint(anchor, contentWidth, contentHeight);
    const contentBasis = Math.min(contentWidth, contentHeight);
    const sizePercent = Math.max(0.000001, finite(opts.sizePercent, 18));
    const aspectRatio = Math.max(0.000001, finite(opts.aspectRatio, 1));
    let width = Math.max(0.000001, Math.min(contentWidth, contentHeight) * sizePercent / 100);
    let height = width / aspectRatio;
    const rotationDegrees = finite(opts.rotationDegrees);
    const rotation = rotationDegrees * Math.PI / 180;
    const cos = Math.abs(Math.cos(rotation));
    const sin = Math.abs(Math.sin(rotation));
    let boundsWidth = cos * width + sin * height;
    let boundsHeight = sin * width + cos * height;
    const outerWidth = Math.max(0.000001, outerRight - outerLeft);
    const outerHeight = Math.max(0.000001, outerBottom - outerTop);
    const fitScale = Math.min(1, outerWidth / boundsWidth, outerHeight / boundsHeight);
    width *= fitScale;
    height *= fitScale;
    boundsWidth *= fitScale;
    boundsHeight *= fitScale;
    const rawX = anchorPoint.x + contentBasis * finite(opts.offsetXPercent) / 100;
    const rawY = anchorPoint.y + contentBasis * finite(opts.offsetYPercent) / 100;
    const x = constrainedAxis(rawX, outerLeft + boundsWidth / 2, outerRight - boundsWidth / 2);
    const y = constrainedAxis(rawY, outerTop + boundsHeight / 2, outerBottom - boundsHeight / 2);
    const offsets = imageLayerOffsetsForPoint({ x, y, contentWidth, contentHeight, anchor });
    return {
      x,
      y,
      width,
      height,
      boundsWidth,
      boundsHeight,
      fitScale,
      rotation,
      rotationDegrees,
      anchor: offsets.anchor,
      offsetXPercent: offsets.offsetXPercent,
      offsetYPercent: offsets.offsetYPercent,
      contentWidth,
      contentHeight,
    };
  }

  return Object.freeze({
    normalizeCrop,
    composeCrop,
    selectionFromFrames,
    outputCenterOffset,
    transformedGeometry,
    screenDeltaToPercent,
    normalizeImageLayerAnchor,
    closestImageLayerAnchor,
    imageLayerOffsetsForPoint,
    imageLayerPlacement,
  });
});
