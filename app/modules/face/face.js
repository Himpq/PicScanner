/* PicScanner 人脸修颜模块（嵌入式：在快速修图界面内叠加曲线 + 替换右侧面板）。
 * 不自建画布——QE 负责渲染（方向/缩放/管线），模块只画曲线叠加层 + 处理拖拽交互。
 * 变形通过源阶段流入 QE 预览/保存/批量。
 */
(function () {
  if (!window.PicScannerModules) return;

  var HIT_DIST = 18;
  var BRUSH_R = 0.06;          // 手动推拉笔刷半径（更局部，避免大面积波推）
  var MAX_TOTAL = 0.06;        // 单点累计位移上限（推到即止，不再叠加）
  var CURVE_COLOR = 'rgba(0,220,255,0.55)';
  var CURVE_ACTIVE_COLOR = 'rgba(0,255,180,0.9)';

  // 左/右/下颌曲线互不共享关键点 → 推一侧不会影响另一侧
  var CURVES = [
    { key: 'left', label: '左脸', indices: [234, 93, 132, 58, 172, 136, 150, 149, 176] },
    { key: 'right', label: '右脸', indices: [454, 323, 361, 288, 397, 365, 379, 378, 400] },
    { key: 'jaw', label: '下颌', indices: [148, 152, 377] },
  ];

  // 瘦脸滑条作用点（两侧脸颊中段），向鼻尖方向水平收拢
  var SLIM_POINTS = [132, 172, 361, 397];
  var SLIM_MAX = 0.05;
  var SLIM_R = 0.10;

  // 纯函数：由 landmarks + 瘦脸值生成对称瘦脸 controls（slider ∈ [-1,1]）
  function slimControlsFor(landmarks, slim) {
    if (!landmarks || !slim) return [];
    var nose = landmarks[1] || [0.5, 0.5];
    var out = [];
    for (var i = 0; i < SLIM_POINTS.length; i++) {
      var lm = landmarks[SLIM_POINTS[i]];
      if (!lm) continue;
      var toward = nose[0] >= lm[0] ? 1 : -1;
      out.push({ fx: lm[0], fy: lm[1], dx: toward * slim * SLIM_MAX, dy: 0, r: SLIM_R });
    }
    return out;
  }

  // 手动 controls + 瘦脸 controls = 实际送入 warp 的 controls
  function effectiveControls(face) {
    var c = ((face && face.controls) || []).slice();
    return c.concat(slimControlsFor(face && face.landmarks, (face && face.slim) || 0));
  }

  // ------------------------------------------------------------------
  // warp worker（源阶段 apply 用，QE 预览/保存/批量调用）
  // ------------------------------------------------------------------
  var WARP_WORKER_SOURCE = [
    'function warpPixels(data,w,h,controls){',
    '  var out=new Uint8ClampedArray(data.length);',
    '  if(!controls.length){out.set(data);return out;}',
    '  var cell=Math.max(8,Math.min(32,Math.round(Math.max(w,h)/64)));',
    '  var gw=Math.ceil(w/cell)+1,gh=Math.ceil(h/cell)+1;',
    '  var fX=new Float32Array(gw*gh),fY=new Float32Array(gw*gh);',
    '  for(var gy=0;gy<gh;gy++){var ny=gy*cell;',
    '    for(var gx=0;gx<gw;gx++){var nx=gx*cell,dx=0,dy=0;',
    '      for(var ci=0;ci<controls.length;ci++){var c=controls[ci];',
    '        var ex=nx-c.fx,ey=ny-c.fy,d2=(ex*ex+ey*ey)/(c.r*c.r);',
    '        if(d2<1){var wgt=(1-d2)*(1-d2);dx+=wgt*c.dx;dy+=wgt*c.dy;}}',
    '      var fi=gy*gw+gx;fX[fi]=dx;fY[fi]=dy;}}',
    '  var gw1=gw-1,gh1=gh-1,fv=[0,0];',
    '  function sf(x,y){var gx=x/cell,gy2=y/cell,x0=gx|0,y0=gy2|0;',
    '    if(x0<0)x0=0;if(y0<0)y0=0;if(x0>gw1-1)x0=gw1-1;if(y0>gh1-1)y0=gh1-1;',
    '    var wx=gx-x0,wy=gy2-y0;if(wx<0)wx=0;if(wy<0)wy=0;',
    '    var i00=y0*gw+x0,i10=i00+1,i01=i00+gw,i11=i01+1;',
    '    fv[0]=(fX[i00]*(1-wx)+fX[i10]*wx)*(1-wy)+(fX[i01]*(1-wx)+fX[i11]*wx)*wy;',
    '    fv[1]=(fY[i00]*(1-wx)+fY[i10]*wx)*(1-wy)+(fY[i01]*(1-wx)+fY[i11]*wx)*wy;}',
    '  var wm1=w-1,hm1=h-1;',
    '  for(var y=0;y<h;y++)for(var x=0;x<w;x++){',
    '    var sx=x,sy=y;',
    '    for(var it=0;it<2;it++){sf(sx,sy);sx=x-fv[0];sy=y-fv[1];}',
    '    if(sx<0)sx=0;else if(sx>wm1)sx=wm1;',
    '    if(sy<0)sy=0;else if(sy>hm1)sy=hm1;',
    '    var ax=sx|0,ay=sy|0,bx=ax<wm1?ax+1:ax,by=ay<hm1?ay+1:ay;',
    '    var wx2=sx-ax,wy2=sy-ay;',
    '    var p00=(ay*w+ax)*4,p10=(ay*w+bx)*4,p01=(by*w+ax)*4,p11=(by*w+bx)*4;',
    '    var di=(y*w+x)*4;',
    '    for(var ch=0;ch<3;ch++){',
    '      var top=data[p00+ch]*(1-wx2)+data[p10+ch]*wx2;',
    '      var bot=data[p01+ch]*(1-wx2)+data[p11+ch]*wx2;',
    '      out[di+ch]=top*(1-wy2)+bot*wy2;}',
    '    out[di+3]=255;}',
    '  return out;}',
    'self.onmessage=function(ev){',
    '  var msg=ev.data||{},token=msg.token,bitmap=msg.bitmap;',
    '  Promise.resolve().then(async function(){',
    '    var fullW=bitmap.width,fullH=bitmap.height;',
    '    var maxSide=Number(msg.maxSide||0);',
    '    var scale=maxSide>0?Math.min(1,maxSide/Math.max(fullW,fullH)):1;',
    '    var W=Math.max(1,Math.round(fullW*scale)),H=Math.max(1,Math.round(fullH*scale));',
    '    var canvas=new OffscreenCanvas(W,H),ctx=canvas.getContext("2d");',
    '    ctx.drawImage(bitmap,0,0,W,H);bitmap.close();',
    '    var imgData=ctx.getImageData(0,0,W,H);',
    '    var raw=msg.controls||[],controls=[];',
    '    for(var i=0;i<raw.length;i++){var c=raw[i];',
    '      controls.push({fx:c.fx*W,fy:c.fy*H,dx:c.dx*W,dy:c.dy*H,r:c.r*Math.max(W,H)});}',
    '    var warped=warpPixels(imgData.data,W,H,controls);',
    '    ctx.putImageData(new ImageData(warped,W,H),0,0);',
    '    var outBmp=await createImageBitmap(canvas);',
    '    self.postMessage({token:token,bitmap:outBmp,width:fullW,height:fullH,orientationApplied:false},[outBmp]);',
    '  }).catch(function(err){',
    '    try{if(bitmap&&bitmap.close)bitmap.close();}catch(e){}',
    '    self.postMessage({token:token,error:String(err&&err.message||err)});',
    '  });',
    '};',
  ].join('\n');

  var warpWorker = null, warpToken = 0, warpPending = new Map();

  function getWarpWorker() {
    if (warpWorker) return warpWorker;
    warpWorker = new Worker(URL.createObjectURL(new Blob([WARP_WORKER_SOURCE], { type: 'text/javascript' })));
    warpWorker.onmessage = function (ev) {
      var msg = ev.data || {}, p = warpPending.get(msg.token);
      if (!p) { if (msg.bitmap && msg.bitmap.close) msg.bitmap.close(); return; }
      warpPending.delete(msg.token);
      if (msg.error) p.reject(new Error(msg.error)); else p.resolve(msg);
    };
    warpWorker.onerror = function (err) {
      var m = String((err && err.message) || 'Worker 异常');
      warpPending.forEach(function (p) { p.reject(new Error(m)); });
      warpPending.clear();
    };
    return warpWorker;
  }

  function applyWarp(bitmap, entry, opts) {
    var face = (entry && entry.face) || {};
    var token = ++warpToken;
    return new Promise(function (resolve, reject) {
      warpPending.set(token, { resolve: resolve, reject: reject });
      try {
        getWarpWorker().postMessage({
          token: token, bitmap: bitmap,
          controls: effectiveControls(face),
          maxSide: Number((opts && opts.maxSide) || 0),
        }, [bitmap]);
      } catch (err) {
        warpPending.delete(token);
        if (bitmap && bitmap.close) bitmap.close();
        reject(err);
      }
    });
  }

  // ------------------------------------------------------------------
  // 源阶段注册
  // ------------------------------------------------------------------
  window.PicScannerModules.registerSourceStage({
    key: 'face',
    hasStage: function (entry) {
      var f = entry && entry.face;
      if (!f || !f.enabled) return false;
      return !!((f.controls && f.controls.length) || f.slim);
    },
    apply: function (bitmap, entry, opts) { return applyWarp(bitmap, entry, opts); },
    signature: function (entry) {
      var f = entry && entry.face;
      if (!f || !f.enabled) return '';
      var ctrls = effectiveControls(f);
      if (!ctrls.length) return '';
      var s = 0;
      for (var i = 0; i < ctrls.length; i++) s += Math.abs(ctrls[i].dx) + Math.abs(ctrls[i].dy);
      return s < 0.001 ? '' : ctrls.length + '/' + s.toFixed(4) + '/' + (f.lmKey || '');
    },
  });

  // ------------------------------------------------------------------
  // 模块 UI（嵌入式：overlay + 右侧面板）
  // ------------------------------------------------------------------
  function mount(ctx, root) {
    var photo = ctx.photo;
    var overlay = ctx.overlay;

    if (!photo || !overlay) {
      root.textContent = '缺少照片或画布';
      return { unmount: function () {} };
    }

    var S = {
      landmarks: null, lmKey: '', imgW: 0, imgH: 0,
      controls: [],
      slim: 0,
      currentStroke: null,
      destroyed: false, detecting: false,
      hoverCurve: null, dragging: false,
      dragStartX: 0, dragStartY: 0, dragFx: 0, dragFy: 0,
      dragBase: { dx: 0, dy: 0 },
      invalidateTimer: null,
    };

    function currentEntry() { return ctx.store.getWarp(photo.id); }

    function committedControls() {
      return S.controls.concat(slimControlsFor(S.landmarks, S.slim));
    }

    function buildControls() {
      var list = committedControls();
      if (S.currentStroke) list.push(S.currentStroke);
      return list;
    }

    function writeEntryAndInvalidate() {
      var entry = currentEntry() || { face: {} };
      entry.face = {
        enabled: true, controls: S.controls.slice(), slim: S.slim,
        landmarks: S.landmarks || [], width: S.imgW, height: S.imgH,
        lmKey: S.lmKey,
      };
      ctx.store.setWarp(photo.id, entry);
      clearTimeout(S.invalidateTimer);
      S.invalidateTimer = setTimeout(function () { ctx.services.invalidateQuickEdit(); }, 80);
    }

    // ------------------------------------------------------------------
    // overlay 定位 + 曲线绘制
    // ------------------------------------------------------------------
    // overlay 与 QE 图片放在同一 grid 单元，匹配图片布局尺寸并复制其旋转，
    // 这样缩放/平移（作用在 visual-layer 上）会自动带着 overlay 一起变换，不会错位。
    function syncOverlay() {
      var img = document.querySelector('[data-quick-edit-img]');
      if (!img || !img.offsetWidth) return false;
      var w = img.offsetWidth, h = img.offsetHeight;
      overlay.style.gridArea = '1 / 1';
      overlay.style.width = w + 'px';
      overlay.style.height = h + 'px';
      overlay.style.transform = img.style.transform || 'none';
      overlay.style.transformOrigin = 'center center';
      overlay.style.pointerEvents = 'auto';
      overlay.style.zIndex = '4';
      var dpr = window.devicePixelRatio || 1;
      overlay.width = Math.round(w * dpr);
      overlay.height = Math.round(h * dpr);
      return true;
    }

    function drawCurves() {
      if (!S.landmarks || S.destroyed) return;
      syncOverlay();
      var cctx = overlay.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      var W = overlay.width, H = overlay.height;
      cctx.clearRect(0, 0, W, H);
      cctx.save();
      cctx.scale(dpr, dpr);
      var w = W / dpr, h = H / dpr;
      var ctrls = buildControls();
      cctx.lineWidth = 2.5;
      cctx.lineJoin = 'round';
      cctx.lineCap = 'round';
      for (var ci = 0; ci < CURVES.length; ci++) {
        var curve = CURVES[ci];
        var pts = [];
        for (var i = 0; i < curve.indices.length; i++) {
          var lm = S.landmarks[curve.indices[i]];
          if (!lm) continue;
          var fp = forwardMap(lm[0], lm[1], ctrls, w, h);
          pts.push({ x: fp.x * w, y: fp.y * h });
        }
        if (pts.length < 2) continue;
        var active = S.hoverCurve === curve.key;
        cctx.strokeStyle = active ? CURVE_ACTIVE_COLOR : CURVE_COLOR;
        cctx.beginPath();
        cctx.moveTo(pts[0].x, pts[0].y);
        for (var j = 1; j < pts.length - 1; j++) {
          var mx = (pts[j].x + pts[j + 1].x) / 2, my = (pts[j].y + pts[j + 1].y) / 2;
          cctx.quadraticCurveTo(pts[j].x, pts[j].y, mx, my);
        }
        cctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        cctx.stroke();
      }
      cctx.restore();
    }

    // 与 worker 完全相同的 (1-d²)² 衰减场
    function fieldAt(nx, ny, ctrls, w, h) {
      var dx = 0, dy = 0, maxDim = Math.max(w, h);
      for (var i = 0; i < ctrls.length; i++) {
        var c = ctrls[i];
        var ex = (nx - c.fx) * w, ey = (ny - c.fy) * h;
        var r = c.r * maxDim;
        var d2 = (ex * ex + ey * ey) / (r * r);
        if (d2 < 1) {
          var wgt = (1 - d2) * (1 - d2);
          dx += wgt * c.dx;
          dy += wgt * c.dy;
        }
      }
      return { dx: dx, dy: dy };
    }

    // 正向映射：源点 L 在变形后图像中实际出现的位置 P（迭代求解 P = L + field(P)）。
    // worker 用反向映射 P→L，曲线必须用正向映射才能贴住渲染后的脸缘。
    function forwardMap(nx, ny, ctrls, w, h) {
      var px = nx, py = ny;
      for (var it = 0; it < 3; it++) {
        var f = fieldAt(px, py, ctrls, w, h);
        px = nx + f.dx;
        py = ny + f.dy;
      }
      return { x: px, y: py };
    }

    // ------------------------------------------------------------------
    // 交互
    // ------------------------------------------------------------------
    function overlayCoords(ev) {
      var rect = overlay.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    }

    function distToSeg(px, py, ax, ay, bx, by) {
      var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      var cx = ax + t * dx, cy = ay + t * dy;
      return { dist: Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy)), t: t };
    }

    function hitTest(mx, my) {
      if (!S.landmarks) return null;
      var rect = overlay.getBoundingClientRect();
      var w = rect.width, h = rect.height;
      var ctrls = buildControls();
      var best = null, bestDist = HIT_DIST;
      for (var ci = 0; ci < CURVES.length; ci++) {
        var curve = CURVES[ci];
        var pts = [];
        for (var i = 0; i < curve.indices.length; i++) {
          var lm = S.landmarks[curve.indices[i]];
          if (!lm) continue;
          var fp = forwardMap(lm[0], lm[1], ctrls, w, h);
          pts.push({ x: fp.x * w, y: fp.y * h, lm: lm });
        }
        for (var j = 0; j < pts.length - 1; j++) {
          var r = distToSeg(mx, my, pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y);
          if (r.dist < bestDist) {
            bestDist = r.dist;
            var near = pts[Math.round(j + r.t)] || pts[j];
            best = { curve: curve, lm: near.lm };
          }
        }
      }
      return best;
    }

    overlay.addEventListener('pointermove', function (ev) {
      var pos = overlayCoords(ev);
      if (S.dragging) {
        var rect = overlay.getBoundingClientRect();
        var ddx = (pos.x - S.dragStartX) / rect.width;
        var ddy = (pos.y - S.dragStartY) / rect.height;
        var tx = S.dragBase.dx + ddx, ty = S.dragBase.dy + ddy;
        var mag = Math.sqrt(tx * tx + ty * ty);
        if (mag > MAX_TOTAL) { tx = tx / mag * MAX_TOTAL; ty = ty / mag * MAX_TOTAL; }
        S.currentStroke = {
          fx: S.dragFx, fy: S.dragFy,
          dx: tx - S.dragBase.dx, dy: ty - S.dragBase.dy, r: BRUSH_R,
        };
        writeEntryAndInvalidate();
        drawCurves();
        return;
      }
      var hit = hitTest(pos.x, pos.y);
      var prev = S.hoverCurve;
      S.hoverCurve = hit ? hit.curve.key : null;
      overlay.style.cursor = hit ? 'grab' : 'default';
      if (S.hoverCurve !== prev) drawCurves();
    });

    overlay.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      var pos = overlayCoords(ev);
      var hit = hitTest(pos.x, pos.y);
      if (!hit) return;
      ev.preventDefault();
      ev.stopPropagation();
      overlay.setPointerCapture(ev.pointerId);
      var rect = overlay.getBoundingClientRect();
      S.dragging = true;
      S.dragStartX = pos.x;
      S.dragStartY = pos.y;
      S.dragFx = hit.lm[0];
      S.dragFy = hit.lm[1];
      S.dragBase = fieldAt(hit.lm[0], hit.lm[1], committedControls(), rect.width, rect.height);
      overlay.style.cursor = 'grabbing';
    });

    overlay.addEventListener('pointerup', function () {
      if (!S.dragging) return;
      S.dragging = false;
      if (S.currentStroke && (Math.abs(S.currentStroke.dx) > 0.0005 || Math.abs(S.currentStroke.dy) > 0.0005)) {
        S.controls.push(S.currentStroke);
      }
      S.currentStroke = null;
      overlay.style.cursor = 'grab';
      writeEntryAndInvalidate();
      drawCurves();
    });

    overlay.addEventListener('pointerleave', function () {
      if (!S.dragging) {
        S.hoverCurve = null;
        overlay.style.cursor = 'default';
        drawCurves();
      }
    });

    // ------------------------------------------------------------------
    // 右侧面板（对齐 调参 页的 group 结构）
    // ------------------------------------------------------------------
    function group(titleText) {
      var g = document.createElement('div');
      g.className = 'quick-edit-group';
      var head = document.createElement('div');
      head.className = 'quick-edit-group-head';
      var t = document.createElement('div');
      t.className = 'quick-edit-group-title';
      t.textContent = titleText;
      head.appendChild(t);
      g.appendChild(head);
      root.appendChild(g);
      return { el: g, head: head };
    }

    // 人脸检测：首次自动进行，也可在原图更新后手动刷新。
    var gDetect = group('人脸检测');
    var statusEl = document.createElement('span');
    statusEl.className = 'face-status';
    statusEl.textContent = '检测中…';
    gDetect.head.appendChild(statusEl);
    var detectHint = document.createElement('div');
    detectHint.className = 'face-hint';
    detectHint.textContent = '打开照片后自动检测人脸，拖动脸部轮廓线即可调整脸型。';
    gDetect.el.appendChild(detectHint);
    var redetectBtn = document.createElement('button');
    redetectBtn.type = 'button';
    redetectBtn.className = 'ghost-btn face-redetect-btn';
    redetectBtn.textContent = '重新检测';
    gDetect.el.appendChild(redetectBtn);

    // 瘦脸滑条：默认居中，左右对称加减
    var gSlim = group('瘦脸');
    var slimVal = document.createElement('b');
    slimVal.className = 'face-slim-value';
    slimVal.textContent = '0';
    gSlim.head.appendChild(slimVal);
    var slimRow = document.createElement('div');
    slimRow.className = 'quick-edit-control';
    var slimRange = document.createElement('input');
    slimRange.type = 'range';
    slimRange.min = '-100';
    slimRange.max = '100';
    slimRange.step = '1';
    slimRange.value = '0';
    slimRange.className = 'face-slim-range';
    slimRow.appendChild(slimRange);
    gSlim.el.appendChild(slimRow);

    function formatSlim(v) { return (v > 0 ? '+' : '') + v; }
    function applySlim(v) {
      S.slim = v / 100;
      slimVal.textContent = formatSlim(v);
      writeEntryAndInvalidate();
      drawCurves();
    }
    slimRange.addEventListener('input', function () { applySlim(Number(slimRange.value) || 0); });

    // 功能栏
    var gFunc = group('功能');
    var funcRow = document.createElement('div');
    funcRow.className = 'face-func-row';
    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'ghost-btn';
    resetBtn.textContent = '重置变形';
    resetBtn.addEventListener('click', function () {
      S.controls = [];
      S.currentStroke = null;
      S.slim = 0;
      slimRange.value = '0';
      slimVal.textContent = '0';
      writeEntryAndInvalidate();
      drawCurves();
    });
    var exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'ghost-btn';
    exportBtn.textContent = '导出变形图';
    exportBtn.addEventListener('click', function () { exportWarped(); });
    funcRow.appendChild(resetBtn);
    funcRow.appendChild(exportBtn);
    gFunc.el.appendChild(funcRow);

    // ------------------------------------------------------------------
    // 检测（自动）
    // ------------------------------------------------------------------
    async function detect(force) {
      if (S.detecting) return;
      S.detecting = true;
      redetectBtn.disabled = true;
      statusEl.textContent = '检测中…';
      try {
        var res = await ctx.call('detect', photo.id, !!force);
        if (S.destroyed) return;
        if (!res || !res.success) {
          statusEl.textContent = '检测失败';
          ctx.services.showToast((res && res.message) || '检测失败', 'error');
          return;
        }
        if (!res.faces || !res.faces.length) {
          statusEl.textContent = '未检测到人脸';
          ctx.services.showToast('没有检测到人脸', 'error');
          return;
        }
        S.landmarks = res.faces[0];
        S.imgW = res.width;
        S.imgH = res.height;
        S.lmKey = res.width + 'x' + res.height + ':' + (S.landmarks[1] ? S.landmarks[1].join(',') : '');
        S.controls = [];
        S.currentStroke = null;
        statusEl.textContent = '已检测到人脸';
        writeEntryAndInvalidate();
        drawCurves();
      } catch (err) {
        statusEl.textContent = '检测失败';
        ctx.services.showToast('检测失败: ' + ((err && err.message) || err), 'error');
      } finally {
        S.detecting = false;
        redetectBtn.disabled = false;
      }
    }
    redetectBtn.addEventListener('click', function () { detect(true); });

    // ------------------------------------------------------------------
    // 导出
    // ------------------------------------------------------------------
    async function exportWarped() {
      var entry = currentEntry();
      if (!entry || !window.PicScannerModules.sourceStagesActive(entry)) {
        ctx.services.showToast('先检测并拖动曲线再导出', 'error');
        return;
      }
      exportBtn.disabled = true;
      try {
        var url = String(photo.original_url || photo.lightbox_url || '');
        if (!url) throw new Error('缺少原图路径');
        var img = new Image();
        await new Promise(function (res, rej) { img.onload = res; img.onerror = rej; img.src = url; });
        var bitmap = await createImageBitmap(img);
        var result = await applyWarp(bitmap, entry, { maxSide: 0 });
        var out = new OffscreenCanvas(result.bitmap.width, result.bitmap.height);
        out.getContext('2d').drawImage(result.bitmap, 0, 0);
        result.bitmap.close();
        var blob = await out.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
        var reader = new FileReader();
        var dataUrl = await new Promise(function (res) { reader.onload = function () { res(reader.result); }; reader.readAsDataURL(blob); });
        var res2 = await ctx.call('save_warped', dataUrl, photo.path || '');
        ctx.services.showToast(res2 && res2.success ? (res2.message || '导出成功') : ((res2 && res2.message) || '导出失败'), res2 && res2.success ? 'success' : 'error');
      } catch (err) {
        ctx.services.showToast('导出失败: ' + ((err && err.message) || err), 'error');
      } finally {
        exportBtn.disabled = false;
      }
    }

    // ------------------------------------------------------------------
    // 初始化：自动检测 + 重绘曲线（QE 渲染时同步 overlay）
    // ------------------------------------------------------------------
    var existing = currentEntry();
    if (existing && existing.face && existing.face.landmarks && existing.face.landmarks.length) {
      S.landmarks = existing.face.landmarks;
      S.imgW = existing.face.width || 0;
      S.imgH = existing.face.height || 0;
      S.lmKey = existing.face.lmKey || '';
      S.controls = Array.isArray(existing.face.controls) ? existing.face.controls.slice() : [];
      S.slim = Number(existing.face.slim) || 0;
      var sv = Math.round(S.slim * 100);
      slimRange.value = String(sv);
      slimVal.textContent = formatSlim(sv);
      statusEl.textContent = '已检测到人脸';
      setTimeout(drawCurves, 200);
    } else {
      detect();
    }

    // rAF 监测图片布局尺寸/旋转变化（窗口缩放、旋转调整）。
    // 灯箱缩放/平移作用在 visual-layer 上，overlay 同 grid 单元自动跟随，无需重同步。
    var lastKey = '';
    var rafId = 0;
    function tick() {
      if (S.destroyed) return;
      var img = document.querySelector('[data-quick-edit-img]');
      var key = '';
      if (img && img.offsetWidth) {
        key = img.offsetWidth + 'x' + img.offsetHeight + '|' + (img.style.transform || '');
      }
      if (key && key !== lastKey) {
        lastKey = key;
        drawCurves();
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return {
      unmount: function () {
        S.destroyed = true;
        clearTimeout(S.invalidateTimer);
        cancelAnimationFrame(rafId);
      },
    };
  }

  var activeHandle = null;
  window.PicScannerModules.register({
    key: 'face',
    name: '人脸修颜',
    mount: function (ctx, root) {
      if (activeHandle && activeHandle.unmount) activeHandle.unmount();
      activeHandle = mount(ctx, root) || {};
    },
    unmount: function () {
      if (activeHandle && activeHandle.unmount) activeHandle.unmount();
      activeHandle = null;
    },
  });
})();
