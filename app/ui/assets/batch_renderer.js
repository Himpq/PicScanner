(function () {
  let workerObjectUrl = '';
  let sequence = 0;

  function abortError() {
    const err = new Error('批量任务已取消');
    err.name = 'AbortError';
    return err;
  }

  function throwIfAborted(signal) {
    if (signal && signal.aborted) throw abortError();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value || 0)));
  }

  function transportMime(format) {
    if (format === 'jpg') return 'image/jpeg';
    return 'image/png';
  }

  function workerUrl() {
    const source = String(window.PicScannerQuickEditWorkerSource || '');
    if (!source) throw new Error('批量渲染缺少快速调整 Worker 源码');
    if (!workerObjectUrl) {
      workerObjectUrl = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
    }
    return workerObjectUrl;
  }

  function loadImage(src, signal) {
    const url = String(src || '');
    if (!url) return Promise.reject(new Error('批量图片缺少可渲染源'));
    return new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const cleanup = () => {
        image.onload = null;
        image.onerror = null;
        if (signal) signal.removeEventListener('abort', onAbort);
      };
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };
      const onAbort = () => finish(reject, abortError());
      image.decoding = 'async';
      image.onload = () => finish(resolve, image);
      image.onerror = () => finish(reject, new Error('批量图片解码失败'));
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      image.src = url;
    });
  }

  function renderWithWorker(config) {
    const signal = config.signal || null;
    throwIfAborted(signal);
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerUrl());
      const token = ++sequence;
      const key = 'batch|' + token + '|' + config.photoId;
      let settled = false;
      const cleanup = () => {
        worker.onmessage = null;
        worker.onerror = null;
        if (signal) signal.removeEventListener('abort', onAbort);
        worker.terminate();
      };
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };
      const onAbort = () => finish(reject, abortError());
      worker.onmessage = (ev) => {
        const message = ev && ev.data ? ev.data : {};
        if (Number(message.token || 0) !== token || String(message.key || '') !== key) return;
        if (message.type === 'save-progress') {
          if (typeof config.onProgress === 'function') {
            config.onProgress(message.stage || '渲染', clamp(message.percent, 0, 88), message.detail || '');
          }
          return;
        }
        if (message.type === 'error') {
          finish(reject, new Error(message.message || '批量渲染失败'));
          return;
        }
        if (message.type !== 'save-rendered') return;
        finish(resolve, {
          blob: message.blob,
          mime: message.mime || config.mime,
          outputWidth: Number(message.outputWidth || config.outputWidth),
          outputHeight: Number(message.outputHeight || config.outputHeight),
        });
      };
      worker.onerror = (err) => finish(reject, new Error((err && err.message) || '批量渲染 Worker 异常'));
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      try {
        worker.postMessage({
          type: 'save',
          token,
          key,
          sourceSrc: config.sourceSrc,
          format: config.format,
          mime: config.mime,
          quality: config.quality,
          decodeMs: config.decodeMs,
          outputScale: 1,
          outputWidth: config.outputWidth,
          outputHeight: config.outputHeight,
          frame: config.frame,
          baseWidth: config.baseWidth,
          baseHeight: config.baseHeight,
          baseLeft: config.baseLeft,
          baseTop: config.baseTop,
          pan: config.pan,
          zoom: config.zoom,
          angleRadians: config.angleRadians,
          orientation: config.orientation,
          applyOrientation: config.applyOrientation,
          perfEnabled: false,
          params: config.params || {},
          bitmap: config.bitmap,
        }, [config.bitmap]);
      } catch (err) {
        if (config.bitmap && typeof config.bitmap.close === 'function') config.bitmap.close();
        finish(reject, err);
      }
    });
  }

  function create(options) {
    const config = options || {};
    if (typeof config.call !== 'function') throw new Error('批量渲染缺少后端调用器');
    if (typeof config.resolveGeometry !== 'function') throw new Error('批量渲染缺少方向解析器');

    return {
      async render(photo, preset, renderOptions) {
        const opts = renderOptions || {};
        const session = opts.session || {};
        const signal = opts.signal || null;
        const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : function () {};
        const preview = !!opts.preview;
        const maxSide = preview ? Math.max(320, Number(opts.maxSide || 1600)) : 0;
        throwIfAborted(signal);
        if (!photo || !Number(photo.id || 0)) throw new Error('批量图片信息不完整');
        if (!preset || !preset.workerParams || !preset.rawWorkerParams) throw new Error('批量调整预设尚未准备完成');

        let sourceSrc = String((session.bakedSource && session.sourceSrc) || photo.original_url || '');
        let sourcePhoto = photo;
        let params = preset.workerParams;
        if (photo.is_raw && !session.bakedSource) {
          onProgress('RAW 显影', 3, photo.filename || '');
          const developed = await config.call(
            'develop_quick_edit_raw_preview',
            Number(photo.id),
            preset.rawDevelopParams,
            maxSide,
            preview,
          );
          throwIfAborted(signal);
          if (!developed || !developed.success || !developed.url) {
            throw new Error(developed && developed.message ? developed.message : 'RAW 全尺寸显影失败');
          }
          sourceSrc = String(developed.url || '');
          sourcePhoto = Object.assign({}, photo, {
            width: Number(developed.width || photo.width || 0),
            height: Number(developed.height || photo.height || 0),
            orientation: '',
          });
          params = preset.rawWorkerParams;
        }

        onProgress('加载图片', 7, photo.filename || '');
        const image = await loadImage(sourceSrc, signal);
        throwIfAborted(signal);
        const sessionSource = !!session.bakedSource && !!session.sourceSrc;
        const geometry = sessionSource
          ? { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, orientation: '', applyOrientation: false }
          : config.resolveGeometry(sourcePhoto, image, { developedRaw: !!photo.is_raw });
        let outputWidth = Math.max(1, Math.round(Number(geometry && geometry.width || image.naturalWidth || image.width || 1)));
        let outputHeight = Math.max(1, Math.round(Number(geometry && geometry.height || image.naturalHeight || image.height || 1)));
        if (maxSide > 0 && Math.max(outputWidth, outputHeight) > maxSide) {
          const scale = maxSide / Math.max(outputWidth, outputHeight);
          outputWidth = Math.max(1, Math.round(outputWidth * scale));
          outputHeight = Math.max(1, Math.round(outputHeight * scale));
        }
        const sessionParams = session.effectiveParams || session.params || {};
        if (session.activeTools && session.activeTools.crop && session.cropFrame) {
          console.error('[PicScannerBatchGeometry] uncommitted crop rejected', {
            photoId: Number(photo.id),
            cropFrame: session.cropFrame,
          });
          throw new Error('当前图片的裁切尚未确认，请先点击功能区的应用按钮');
        }
        const cropLeft = clamp(sessionParams.cropLeft, 0, 100) / 100;
        const cropRight = clamp(sessionParams.cropRight, 0, 100 - cropLeft * 100) / 100;
        const cropTop = clamp(sessionParams.cropTop, 0, 100) / 100;
        const cropBottom = clamp(sessionParams.cropBottom, 0, 100 - cropTop * 100) / 100;
        const baseWidth = outputWidth;
        const baseHeight = outputHeight;
        const zoom = 1;
        const angleRadians = (Number(sessionParams.rotation || 0) + Number(sessionParams.straighten || 0)) * Math.PI / 180;
        const cos = Math.abs(Math.cos(angleRadians));
        const sin = Math.abs(Math.sin(angleRadians));
        const pan = {
          x: 0,
          y: 0,
        };
        const rotatedWidth = cos * baseWidth * zoom + sin * baseHeight * zoom;
        const rotatedHeight = sin * baseWidth * zoom + cos * baseHeight * zoom;
        const rotatedLeft = baseWidth / 2 + pan.x - rotatedWidth / 2;
        const rotatedTop = baseHeight / 2 + pan.y - rotatedHeight / 2;
        const frame = {
          x: rotatedLeft + rotatedWidth * cropLeft,
          y: rotatedTop + rotatedHeight * cropTop,
          w: Math.max(1, rotatedWidth * (1 - cropLeft - cropRight)),
          h: Math.max(1, rotatedHeight * (1 - cropTop - cropBottom)),
        };
        outputWidth = Math.max(1, Math.round(frame.w));
        outputHeight = Math.max(1, Math.round(frame.h));
        const decodeStart = performance.now();
        const bitmap = await createImageBitmap(image);
        const decodeMs = performance.now() - decodeStart;
        throwIfAborted(signal);

        console.info('[PicScannerBatchGeometry] render', {
          photoId: Number(photo.id),
          crop: frame,
          rotation: Number(sessionParams.rotation || 0),
          straighten: Number(sessionParams.straighten || 0),
          zoom,
          bakedSource: !!session.bakedSource,
        });

        return renderWithWorker({
          photoId: Number(photo.id),
          sourceSrc,
          format: String(opts.format || 'jpg'),
          mime: transportMime(String(opts.format || 'jpg')),
          quality: clamp(Number(opts.quality || 92) / 100, 0.01, 1),
          outputWidth,
          outputHeight,
          frame,
          baseWidth,
          baseHeight,
          baseLeft: 0,
          baseTop: 0,
          pan,
          zoom,
          angleRadians,
          orientation: String(geometry && geometry.orientation || ''),
          applyOrientation: !!(geometry && geometry.applyOrientation),
          decodeMs,
          params,
          bitmap,
          signal,
          onProgress,
        });
      },
    };
  }

  window.PicScannerBatchRenderer = { create };
})();
