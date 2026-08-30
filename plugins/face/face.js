/* PicScanner 人脸修颜模块（嵌入式：在快速修图界面内叠加曲线 + 替换右侧面板）。
 * 不自建画布——QE 负责渲染（方向/缩放/管线），模块只画曲线叠加层 + 处理拖拽交互。
 * 变形通过源阶段流入 QE 预览/保存/批量。
 */
(function () {
  if (!window.PicScannerModules) return;

  var HIT_DIST = 12;
  var MIN_BRUSH_R = 0.01;
  var MAX_BRUSH_R = 0.32;
  var MAX_TOTAL = 0.14;
  var SEGMENT_WEIGHTS = [0.18, 0.55, 1, 0.55, 0.18];
  var CURVE_WIDTH = 1.35;
  var CURVE_TENSION = 0.72;
  var CURVE_COLOR = 'rgba(0,220,255,0.72)';
  var CURVE_ACTIVE_COLOR = 'rgba(0,255,180,0.95)';

  // 左/右/下颌曲线互不共享关键点 → 推一侧不会影响另一侧
  var CURVES = [
    { key: 'left', label: '左脸', indices: [234, 93, 132, 58, 172, 136, 150, 149, 176] },
    { key: 'right', label: '右脸', indices: [454, 323, 361, 288, 397, 365, 379, 378, 400] },
    { key: 'jaw', label: '下颌', indices: [148, 152, 377] },
  ];

  // 瘦脸滑条作用点（两侧脸颊中段），向鼻尖方向水平收拢
  var SLIM_POINTS = [132, 172, 361, 397];
  var SLIM_MAX = 0.06;
  var SLIM_R = 0.12;

  // 人脸宽度（相对图片长边），用于按脸的实际大小缩放各五官变形的半径与位移，
  // 避免脸不占满画面时影响范围相对脸过大而"拖动整张脸"。
  function faceScaleFor(landmarks) {
    var left = landmarks && landmarks[234];
    var right = landmarks && landmarks[454];
    if (!left || !right) return 0.5;
    var dx = right[0] - left[0], dy = right[1] - left[1];
    var scale = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0.08, Math.min(1.5, scale));
  }

  // 纯函数：由 landmarks + 瘦脸值生成对称瘦脸 controls（slider ∈ [-1,1]）
  function slimControlsFor(landmarks, slim, faceScale) {
    if (!landmarks || !slim) return [];
    var nose = landmarks[1] || [0.5, 0.5];
    var out = [];
    for (var i = 0; i < SLIM_POINTS.length; i++) {
      var lm = landmarks[SLIM_POINTS[i]];
      if (!lm) continue;
      var toward = nose[0] >= lm[0] ? 1 : -1;
      out.push({ fx: lm[0], fy: lm[1], dx: toward * slim * SLIM_MAX * faceScale, dy: 0, r: SLIM_R * faceScale });
    }
    return out;
  }

  function towardNoseControls(landmarks, indices, amount, maxMove, radius, faceScale) {
    if (!landmarks || !amount) return [];
    var nose = landmarks[1] || [0.5, 0.5];
    var out = [];
    for (var i = 0; i < indices.length; i++) {
      var lm = landmarks[indices[i]];
      if (!lm) continue;
      var toward = nose[0] >= lm[0] ? 1 : -1;
      out.push({ fx: lm[0], fy: lm[1], dx: toward * amount * maxMove * faceScale, dy: 0, r: radius * faceScale });
    }
    return out;
  }

  function eyeControlsFor(landmarks, amount, faceScale) {
    if (!landmarks || !amount) return [];
    var eyes = [[33, 160, 158, 133, 153, 144], [263, 387, 385, 362, 380, 373]];
    var out = [];
    for (var e = 0; e < eyes.length; e++) {
      var points = eyes[e].map(function (index) { return landmarks[index]; }).filter(Boolean);
      if (points.length < 4) continue;
      var cx = 0, cy = 0;
      for (var i = 0; i < points.length; i++) { cx += points[i][0]; cy += points[i][1]; }
      cx /= points.length; cy /= points.length;
      for (var j = 0; j < points.length; j++) {
        var point = points[j];
        out.push({ fx: point[0], fy: point[1], dx: (point[0] - cx) * amount * 0.46, dy: (point[1] - cy) * amount * 0.46, r: 0.085 * faceScale });
      }
    }
    return out;
  }

  function mouthControlsFor(landmarks, amount, faceScale) {
    if (!landmarks || !amount) return [];
    var out = [];
    [61, 291].forEach(function (index) {
      var lm = landmarks[index];
      if (lm) out.push({ fx: lm[0], fy: lm[1], dx: 0, dy: -amount * 0.05 * faceScale, r: 0.085 * faceScale });
    });
    return out;
  }

  function featureControls(face) {
    var landmarks = face && face.landmarks;
    var controls = [];
    var faceScale = faceScaleFor(landmarks);
    var isProfile = !!(face && face.isProfile);
    // 瘦脸/下颌依赖左右关键点对称，侧脸时远侧关键点塌到近侧轮廓、
    // "朝向鼻尖"方向判断失效，跳过以避免单向涂抹。
    if (!isProfile) {
      controls = controls.concat(slimControlsFor(landmarks, Number(face && face.slim) || 0, faceScale));
      controls = controls.concat(towardNoseControls(landmarks, [172, 136, 397, 365], Number(face && face.jaw) || 0, 0.055, 0.11, faceScale));
    }
    // 鼻翼：正脸两侧对称变形；侧脸只变形可见侧翼（见 noseWingControlsFor）。
    controls = controls.concat(noseWingControlsFor(landmarks, Number(face && face.nose) || 0, faceScale, isProfile, face && face.width, face && face.height));
    controls = controls.concat(eyeControlsFor(landmarks, Number(face && face.eye) || 0, faceScale));
    controls = controls.concat(mouthControlsFor(landmarks, Number(face && face.mouth) || 0, faceScale));
    var chin = landmarks && landmarks[152];
    var chinAmount = Number(face && face.chin) || 0;
    if (chin && chinAmount) controls.push({ fx: chin[0], fy: chin[1], dx: 0, dy: chinAmount * 0.07 * faceScale, r: 0.13 * faceScale });
    return controls;
  }

  // 侧脸可见侧判定：比较鼻梁(168)到左/右脸缘(234/454)的距离，
  // 转过去的一侧被透视压缩、距离变短，距离长的一侧即面向镜头的可见侧。
  // 返回 'left'/'right'（主体的左/右），关键点缺失时返回 null。
  function profileVisibleSide(landmarks, imgW, imgH) {
    var nb = landmarks[168], le = landmarks[234], re = landmarks[454];
    if (!nb || !le || !re) return null;
    var w = imgW || 1, h = imgH || 1;
    function dist(a, b) {
      var dx = (a[0] - b[0]) * w, dy = (a[1] - b[1]) * h;
      return Math.sqrt(dx * dx + dy * dy);
    }
    return dist(nb, le) >= dist(nb, re) ? 'left' : 'right';
  }

  function noseWingControlsFor(landmarks, amount, faceScale, isProfile, imgW, imgH) {
    if (!landmarks || !amount) return [];
    // 用鼻梁中线点（168）而非鼻尖判定左右，鼻尖在俯仰时 x 会漂，中线更稳。
    var midline = landmarks[168] || landmarks[1] || [0.5, 0.5];
    var out = [];
    // 翼缘外缘 102/331 与翼底 64/294 各布一个控制点，整片鼻翼均匀内收。
    // 权重刻意接近（0.9/1.0）：翼底权重明显更高会把鼻孔夹成细缝、翼底捏出凹痕。
    // 力度 0.03 → 最大档约收窄鼻宽 19%，超过 ~20% 皮肤挤压就会出现涂抹感、
    // 显得"夹过"，故不再加大。半径 0.06 略大于两点间距（约 0.043），翼缘中段
    // 平滑过渡不产生接缝。
    var leftWing = [[102, 0.9], [64, 1.0]];
    var rightWing = [[331, 0.9], [294, 1.0]];
    var sides;
    if (isProfile) {
      // 侧脸：远侧翼关键点已塌到近侧轮廓、坐标不可信，只变形可见侧翼。
      // 真实侧脸验证过：可见侧翼缘稳定位于鼻梁外侧，"朝鼻梁"方向判定成立。
      var visible = profileVisibleSide(landmarks, imgW, imgH);
      if (!visible) return [];
      sides = [visible === 'left' ? leftWing : rightWing];
    } else {
      sides = [leftWing, rightWing];
    }
    var maxMove = 0.03 * faceScale;
    var radius = 0.06 * faceScale;
    sides.forEach(function (side) {
      side.forEach(function (spec) {
        var point = landmarks[spec[0]];
        if (!point) return;
        var towardCenter = midline[0] >= point[0] ? 1 : -1;
        out.push({ fx: point[0], fy: point[1], dx: towardCenter * amount * maxMove * spec[1], dy: 0, r: radius });
      });
    });
    return out;
  }

  // 手动轮廓段形变 + 参数化精修 = 实际送入 warp 的 controls
  function effectiveControls(face) {
    var c = ((face && face.controls) || []).slice();
    return c.concat(featureControls(face));
  }

  // ------------------------------------------------------------------
  // warp worker（源阶段 apply 用，QE 预览/保存/批量调用）
  // ------------------------------------------------------------------
  var WARP_WORKER_SOURCE = [
    'function clampi(v,lo,hi){return v<lo?lo:(v>hi?hi:v);}',
    'function boxBlurH(s,d,w,h,r){var div=2*r+1;',
    '  for(var y=0;y<h;y++){var row=y*w,sum=0;',
    '    for(var i=-r;i<=r;i++)sum+=s[row+clampi(i,0,w-1)];',
    '    for(var x=0;x<w;x++){d[row+x]=sum/div;',
    '      sum+=s[row+clampi(x+r+1,0,w-1)]-s[row+clampi(x-r,0,w-1)];}}}',
    'function boxBlurV(s,d,w,h,r){var div=2*r+1;',
    '  for(var x=0;x<w;x++){var sum=0;',
    '    for(var i=-r;i<=r;i++)sum+=s[clampi(i,0,h-1)*w+x];',
    '    for(var y=0;y<h;y++){d[y*w+x]=sum/div;',
    '      sum+=s[clampi(y+r+1,0,h-1)*w+x]-s[clampi(y-r,0,h-1)*w+x];}}}',
    'function gaussBlur(ch,w,h,r){var ri=Math.max(1,Math.round(r));',
    '  var a=ch,b=new Float32Array(ch.length);',
    '  for(var p=0;p<3;p++){boxBlurH(a,b,w,h,ri);boxBlurV(b,a,w,h,ri);}return a;}',
    'function maxFH(s,d,w,h,r){for(var y=0;y<h;y++){var row=y*w;',
    '  for(var x=0;x<w;x++){var m=0;',
    '    for(var i=-r;i<=r;i++){var v=s[row+clampi(x+i,0,w-1)];if(v>m)m=v;}d[row+x]=m;}}}',
    'function maxFV(s,d,w,h,r){for(var x=0;x<w;x++){',
    '  for(var y=0;y<h;y++){var m=0;',
    '    for(var i=-r;i<=r;i++){var v=s[clampi(y+i,0,h-1)*w+x];if(v>m)m=v;}d[y*w+x]=m;}}}',
    'function sampleMask(mk,mw,mh,nx,ny){',
    '  var fx=nx*(mw-1),fy=ny*(mh-1),x0=fx|0,y0=fy|0;',
    '  var x1=x0<mw-1?x0+1:x0,y1=y0<mh-1?y0+1:y0;',
    '  var wx=fx-x0,wy=fy-y0;',
    '  return ((mk[y0*mw+x0]*(1-wx)+mk[y0*mw+x1]*wx)*(1-wy)',
    '    +(mk[y1*mw+x0]*(1-wx)+mk[y1*mw+x1]*wx)*wy)/255;}',
    'function smoothWhitenSkin(data,w,h,mk,mw,mh,smooth,whiten,maxSide){',
    '  if(!mk)return;var n=w*h;',
    '  var R=new Float32Array(n),G=new Float32Array(n),B=new Float32Array(n);',
    '  for(var i=0;i<n;i++){R[i]=data[i*4];G[i]=data[i*4+1];B[i]=data[i*4+2];}',
    '  var oR=new Float32Array(R),oG=new Float32Array(G),oB=new Float32Array(B);',
    '  if(smooth>0){',
    '    var hiRes=maxSide===0||Math.max(w,h)>1800;',
    '    var CAP=hiRes?Math.min(1600,Math.max(800,Math.ceil(Math.max(w,h)/2))):640;',
    '    var sc=Math.min(1,CAP/Math.max(w,h));',
    '    var pw=Math.max(2,Math.round(w*sc)),ph=Math.max(2,Math.round(h*sc)),pn=pw*ph;',
    '    var dR=new Float32Array(pn),dG=new Float32Array(pn),dB=new Float32Array(pn);',
    '    var fx2=pw-1,fy2=ph-1,gx2=w-1,gy2=h-1;',
    '    for(var py=0;py<ph;py++){',
    '      var sy=py/fy2*gy2,y0=sy|0,y1=y0<gy2?y0+1:y0,wy=sy-y0;',
    '      for(var px=0;px<pw;px++){',
    '        var sx=px/fx2*gx2,x0=sx|0,x1=x0<gx2?x0+1:x0,wx=sx-x0;',
    '        var a=y0*w+x0,b=y0*w+x1,c=y1*w+x0,d2=y1*w+x1,di=py*pw+px;',
    '        dR[di]=(R[a]*(1-wx)+R[b]*wx)*(1-wy)+(R[c]*(1-wx)+R[d2]*wx)*wy;',
    '        dG[di]=(G[a]*(1-wx)+G[b]*wx)*(1-wy)+(G[c]*(1-wx)+G[d2]*wx)*wy;',
    '        dB[di]=(B[a]*(1-wx)+B[b]*wx)*(1-wy)+(B[c]*(1-wx)+B[d2]*wx)*wy;}}',
    '    var dY=new Float32Array(pn);',
    '    for(var i=0;i<pn;i++)dY[i]=dR[i]*0.299+dG[i]*0.587+dB[i]*0.114;',
    '    var r=Math.min(12,Math.max(3,Math.round(Math.max(pw,ph)*(0.005+smooth*0.007))));',
    '    var thr=15,win=[];',
    '    for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){if(dx*dx+dy*dy<=r*r)win.push(dx,dy);}',
    '    var wl=win.length;',
    '    var sR=new Float32Array(dR),sG=new Float32Array(dG),sB=new Float32Array(dB);',
    '    for(var py=0;py<ph;py++)for(var px=0;px<pw;px++){',
    '      var di=py*pw+px;',
    '      var m=sampleMask(mk,mw,mh,px/fx2,py/fy2);if(m<=0)continue;',
    '      var yc=dY[di],aR=0,aG=0,aB=0,cnt=0;',
    '      for(var k=0;k<wl;k+=2){',
    '        var nx=px+win[k],ny=py+win[k+1];',
    '        if(nx<0)nx=0;else if(nx>=pw)nx=pw-1;',
    '        if(ny<0)ny=0;else if(ny>=ph)ny=ph-1;',
    '        var j=ny*pw+nx,dv=dY[j]-yc;if(dv<0)dv=-dv;',
    '        if(dv<thr){aR+=dR[j];aG+=dG[j];aB+=dB[j];cnt++;}}',
    '      if(cnt>0){var bd=m*smooth;',
    '        sR[di]=dR[di]+(aR/cnt-dR[di])*bd;sG[di]=dG[di]+(aG/cnt-dG[di])*bd;sB[di]=dB[di]+(aB/cnt-dB[di])*bd;}}',
    '    for(var y=0;y<h;y++){',
    '      var sy=y/gy2*fy2,y0=sy|0,y1=y0<fy2?y0+1:y0,wy=sy-y0;',
    '      for(var x=0;x<w;x++){',
    '        var i=y*w+x;',
    '        var m=sampleMask(mk,mw,mh,x/gx2,y/gy2);if(m<=0)continue;',
    '        var sx=x/gx2*fx2,x0=sx|0,x1=x0<fx2?x0+1:x0,wx=sx-x0;',
    '        var a=y0*pw+x0,b=y0*pw+x1,c=y1*pw+x0,d2=y1*pw+x1;',
    '        oR[i]=(sR[a]*(1-wx)+sR[b]*wx)*(1-wy)+(sR[c]*(1-wx)+sR[d2]*wx)*wy;',
    '        oG[i]=(sG[a]*(1-wx)+sG[b]*wx)*(1-wy)+(sG[c]*(1-wx)+sG[d2]*wx)*wy;',
    '        oB[i]=(sB[a]*(1-wx)+sB[b]*wx)*(1-wy)+(sB[c]*(1-wx)+sB[d2]*wx)*wy;}}',
    '  }',
    '  if(whiten>0){for(var y=0;y<h;y++)for(var x=0;x<w;x++){var i=y*w+x;',
    '    var m=sampleMask(mk,mw,mh,x/(w-1),y/(h-1));if(m<=0)continue;',
    '    var ew=m*whiten;',
    '    var Y2=oR[i]*0.299+oG[i]*0.587+oB[i]*0.114;',
    '    var ds=ew*0.45;',
    '    oR[i]+=(Y2-oR[i])*ds;oG[i]+=(Y2-oG[i])*ds;oB[i]+=(Y2-oB[i])*ds;',
    '    var gm=1-ew*0.32;',
    '    oR[i]=255*Math.pow(oR[i]/255,gm);',
    '    oG[i]=255*Math.pow(oG[i]/255,gm);',
    '    oB[i]=255*Math.pow(oB[i]/255,gm);',
    '    var cl=ew*0.12;',
    '    oR[i]*=1-cl*0.40;oG[i]*=1-cl*0.20;oB[i]*=1+cl*0.10;}}',
    '  for(var i=0;i<n;i++){data[i*4]=oR[i];data[i*4+1]=oG[i];data[i*4+2]=oB[i];}',
    '}',
    'function applyLipColor(data,w,h,mk,mw,mh,lip){',
    '  for(var y=0;y<h;y++)for(var x=0;x<w;x++){var i=y*w+x;',
    '    var m=sampleMask(mk,mw,mh,x/(w-1),y/(h-1));if(m<=0)continue;',
    '    var lp=m*lip,di=i*4;',
    '    var R=data[di],G=data[di+1],B=data[di+2];',
    '    data[di]=R+(255-R)*lp*0.28;',
    '    data[di+1]=G*(1-lp*0.38);',
    '    data[di+2]=B*(1-lp*0.34);}',
    '}',
    'function applySkinTone(data,w,h,mk,mw,mh,skintone){',
    '  for(var y=0;y<h;y++)for(var x=0;x<w;x++){var i=y*w+x;',
    '    var m=sampleMask(mk,mw,mh,x/(w-1),y/(h-1));if(m<=0)continue;',
    '    var st=m*skintone,di=i*4;',
    '    data[di]*=1+st*0.12;',
    '    data[di+1]*=1+st*0.05;',
    '    data[di+2]*=1-st*0.14;}',
    '}',
    'function warpPixels(data,w,h,controls){',
    '  var out=new Uint8ClampedArray(data.length);',
    '  if(!controls.length){out.set(data);return out;}',
    '  var cell=Math.max(8,Math.min(16,Math.round(Math.max(w,h)/64)));',
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
    '    var smooth=Number(msg.smooth||0),whiten=Number(msg.whiten||0);',
    '    if((smooth>0||whiten>0)&&msg.skinMask){',
    '      smoothWhitenSkin(imgData.data,W,H,msg.skinMask,msg.skinMaskW,msg.skinMaskH,smooth,whiten,maxSide);}',
    '    var lip=Number(msg.lip||0),skintone=Number(msg.skintone||0);',
    '    if(lip>0&&msg.lipMask){',
    '      applyLipColor(imgData.data,W,H,msg.lipMask,msg.lipMaskW,msg.lipMaskH,lip);}',
    '    if(skintone!==0&&msg.bodyMask){',
    '      applySkinTone(imgData.data,W,H,msg.bodyMask,msg.bodyMaskW,msg.bodyMaskH,skintone);}',
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

  // ------------------------------------------------------------------
  // 皮肤掩膜解码与缓存（磨皮/美白用）
  // ------------------------------------------------------------------
  var skinMaskCache = new Map();

  function decodeSkinMask(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var blob = new Blob([bytes], { type: 'image/png' });
    return createImageBitmap(blob).then(function (bmp) {
      // close() 后 ImageBitmap 的 width/height 归零，必须先取尺寸再关闭。
      var w = bmp.width, h = bmp.height;
      var c = new OffscreenCanvas(w, h);
      var cx = c.getContext('2d');
      cx.drawImage(bmp, 0, 0);
      var rgba = cx.getImageData(0, 0, w, h).data;
      var gray = new Uint8Array(w * h);
      for (var i = 0; i < gray.length; i++) gray[i] = rgba[i * 4];
      bmp.close();
      return { data: gray, w: w, h: h };
    });
  }

  function getSkinMask(b64) {
    if (!b64) return Promise.resolve(null);
    if (skinMaskCache.has(b64)) return Promise.resolve(skinMaskCache.get(b64));
    return decodeSkinMask(b64).then(function (m) {
      skinMaskCache.set(b64, m);
      return m;
    }).catch(function () { return null; });
  }

  function applyWarp(bitmap, entry, opts) {
    var face = (entry && entry.face) || {};
    var token = ++warpToken;
    return Promise.all([
      getSkinMask(face.skinMask),
      getSkinMask(face.lipMask),
      getSkinMask(face.bodySkinMask),
    ]).then(function (masks) {
      var skinM = masks[0], lipM = masks[1], bodyM = masks[2];
      return new Promise(function (resolve, reject) {
        warpPending.set(token, { resolve: resolve, reject: reject });
        try {
          getWarpWorker().postMessage({
            token: token, bitmap: bitmap,
            controls: effectiveControls(face),
            maxSide: Number((opts && opts.maxSide) || 0),
            smooth: Number(face.smooth || 0),
            whiten: Number(face.whiten || 0),
            lip: Number(face.lip || 0),
            skintone: Number(face.skintone || 0),
            skinMask: skinM ? skinM.data : null,
            skinMaskW: skinM ? skinM.w : 0,
            skinMaskH: skinM ? skinM.h : 0,
            lipMask: lipM ? lipM.data : null,
            lipMaskW: lipM ? lipM.w : 0,
            lipMaskH: lipM ? lipM.h : 0,
            bodyMask: bodyM ? bodyM.data : null,
            bodyMaskW: bodyM ? bodyM.w : 0,
            bodyMaskH: bodyM ? bodyM.h : 0,
          }, [bitmap]);
        } catch (err) {
          warpPending.delete(token);
          if (bitmap && bitmap.close) bitmap.close();
          reject(err);
        }
      });
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
      if (effectiveControls(f).length > 0) return true;
      if ((Number(f.smooth) > 0 || Number(f.whiten) > 0) && !!f.skinMask) return true;
      if (Number(f.lip) > 0 && !!f.lipMask) return true;
      if (Number(f.skintone) !== 0 && !!f.bodySkinMask) return true;
      return false;
    },
    apply: function (bitmap, entry, opts) { return applyWarp(bitmap, entry, opts); },
    signature: function (entry) {
      var f = entry && entry.face;
      if (!f || !f.enabled) return '';
      var ctrls = effectiveControls(f);
      var s = 0;
      for (var i = 0; i < ctrls.length; i++) s += Math.abs(ctrls[i].dx) + Math.abs(ctrls[i].dy);
      var smooth = Number(f.smooth || 0), whiten = Number(f.whiten || 0);
      var lip = Number(f.lip || 0), skintone = Number(f.skintone || 0);
      var hasWarp = ctrls.length > 0 && s >= 0.001;
      var hasSkin = (smooth > 0 || whiten > 0) && !!f.skinMask;
      var hasLip = lip > 0 && !!f.lipMask;
      var hasTone = skintone !== 0 && !!f.bodySkinMask;
      if (!hasWarp && !hasSkin && !hasLip && !hasTone) return '';
      return ctrls.length + '/' + s.toFixed(4) + '/' + (f.lmKey || '')
        + '/sm' + smooth.toFixed(3) + '/wh' + whiten.toFixed(3)
        + '/lip' + lip.toFixed(3) + '/st' + skintone.toFixed(3);
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
      landmarks: null, outlines: null, lmKey: '', imgW: 0, imgH: 0,
      controls: [], isProfile: false,
      undoStack: [], redoStack: [],
      slim: 0, jaw: 0, chin: 0, eye: 0, nose: 0, mouth: 0,
      smooth: 0, whiten: 0, skinMask: '',
      lip: 0, skintone: 0, lipMask: '', bodySkinMask: '',
      brush: 80, strength: 1,
      currentStroke: null,
      destroyed: false, detecting: false,
      hoverCurve: null, dragging: false, curvesHidden: false,
      brushAdjusting: false,
      dragStartX: 0, dragStartY: 0, dragAnchors: null, brushPreview: null,
      dragBrushRadius: MIN_BRUSH_R,
      dragTotal: { dx: 0, dy: 0 },
      invalidateTimer: null,
    };

    function currentEntry() { return ctx.store.getWarp(photo.id); }

    function committedControls() {
      return S.controls.concat(featureControls(S));
    }

    function buildControls() {
      var list = committedControls();
      if (S.currentStroke && S.currentStroke.length) list = list.concat(S.currentStroke);
      return list;
    }

    function curvePoints(curve, ctrls, w, h) {
      var outline = S.outlines && S.outlines[curve.key];
      var pts = [];
      for (var i = 0; i < curve.indices.length; i++) {
        var lm = S.landmarks[curve.indices[i]];
        if (!lm) continue;
        var guide = outline && outline[i] ? outline[i] : lm;
        var fp = forwardMap(guide[0], guide[1], ctrls, w, h);
        // 显示线已由后端拟合时，笔刷锚点也必须落在拟合点，不能回到原始误检关键点。
        pts.push({ x: fp.x * w, y: fp.y * h, lm: guide, guide: guide });
      }
      return pts;
    }

    function writeEntryAndInvalidate() {
      var entry = currentEntry() || { face: {} };
      var storedControls = S.controls.slice();
      if (S.currentStroke && S.currentStroke.length) storedControls = storedControls.concat(S.currentStroke);
      entry.face = {
        enabled: true, controls: storedControls, slim: S.slim, jaw: S.jaw, chin: S.chin,
        eye: S.eye, nose: S.nose, mouth: S.mouth, brush: S.brush, strength: S.strength,
        smooth: S.smooth, whiten: S.whiten, skinMask: S.skinMask,
        lip: S.lip, skintone: S.skintone, lipMask: S.lipMask, bodySkinMask: S.bodySkinMask,
        landmarks: S.landmarks || [], outlines: S.outlines || null, width: S.imgW, height: S.imgH,
        lmKey: S.lmKey, isProfile: S.isProfile,
      };
      ctx.store.setWarp(photo.id, entry);
      clearTimeout(S.invalidateTimer);
      S.invalidateTimer = setTimeout(function () { ctx.services.invalidateQuickEdit(); }, 80);
    }

    // ------------------------------------------------------------------
    // 撤销 / 重做（Ctrl+Z / Ctrl+Shift+Z）
    // ------------------------------------------------------------------
    var UNDO_LIMIT = 60;
    function stateSnapshot() {
      return {
        controls: S.controls.slice(),
        slim: S.slim, jaw: S.jaw, chin: S.chin, eye: S.eye, nose: S.nose, mouth: S.mouth,
        smooth: S.smooth, whiten: S.whiten,
        lip: S.lip, skintone: S.skintone,
      };
    }
    function snapshotKey(snap) {
      return snap.controls.length + '|' + snap.slim + '|' + snap.jaw + '|' + snap.chin
        + '|' + snap.eye + '|' + snap.nose + '|' + snap.mouth
        + '|' + snap.smooth + '|' + snap.whiten
        + '|' + snap.lip + '|' + snap.skintone;
    }
    function pushUndo() {
      var snap = stateSnapshot();
      var top = S.undoStack[S.undoStack.length - 1];
      if (top && snapshotKey(top) === snapshotKey(snap)) return;
      S.undoStack.push(snap);
      if (S.undoStack.length > UNDO_LIMIT) S.undoStack.shift();
      S.redoStack.length = 0;
    }
    function applySnapshot(snap) {
      S.controls = snap.controls.slice();
      S.slim = snap.slim; S.jaw = snap.jaw; S.chin = snap.chin;
      S.eye = snap.eye; S.nose = snap.nose; S.mouth = snap.mouth;
      S.smooth = snap.smooth; S.whiten = snap.whiten;
      S.lip = snap.lip; S.skintone = snap.skintone;
      S.currentStroke = null;
      syncFeatureInputs();
      writeEntryAndInvalidate();
      drawCurves();
    }
    function undo() {
      if (!S.undoStack.length) return;
      S.redoStack.push(stateSnapshot());
      applySnapshot(S.undoStack.pop());
    }
    function redo() {
      if (!S.redoStack.length) return;
      S.undoStack.push(stateSnapshot());
      applySnapshot(S.redoStack.pop());
    }
    function onUndoKey(ev) {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
      var key = String(ev.key || '').toLowerCase();
      var target = ev.target;
      var tag = target && target.tagName;
      if (tag === 'TEXTAREA' || (tag === 'INPUT' && target.type !== 'range')) return;
      if (key === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) redo(); else undo();
      } else if (key === 'y' && !ev.shiftKey) {
        ev.preventDefault();
        redo();
      }
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
      if (S.curvesHidden) return;
      cctx.save();
      cctx.scale(dpr, dpr);
      var w = W / dpr, h = H / dpr;
      var ctrls = buildControls();
      cctx.lineWidth = CURVE_WIDTH;
      cctx.lineJoin = 'round';
      cctx.lineCap = 'round';
      for (var ci = 0; ci < CURVES.length; ci++) {
        var curve = CURVES[ci];
        var pts = curvePoints(curve, ctrls, w, h);
        if (pts.length < 2) continue;
        var active = S.hoverCurve === curve.key;
        cctx.strokeStyle = active ? CURVE_ACTIVE_COLOR : CURVE_COLOR;
        cctx.beginPath();
        cctx.moveTo(pts[0].x, pts[0].y);
        for (var j = 0; j < pts.length - 1; j++) {
          var prev = pts[Math.max(0, j - 1)];
          var start = pts[j];
          var end = pts[j + 1];
          var next = pts[Math.min(pts.length - 1, j + 2)];
          // Catmull-Rom 转 Bezier：路径经过每个实际脸缘点，且切线连续。
          cctx.bezierCurveTo(
            start.x + (end.x - prev.x) * CURVE_TENSION / 6,
            start.y + (end.y - prev.y) * CURVE_TENSION / 6,
            end.x - (next.x - start.x) * CURVE_TENSION / 6,
            end.y - (next.y - start.y) * CURVE_TENSION / 6,
            end.x, end.y
          );
        }
        cctx.stroke();
      }
      if (S.brushPreview) {
        cctx.save();
        cctx.lineWidth = 1;
        cctx.setLineDash([4, 4]);
        cctx.strokeStyle = 'rgba(0,220,255,0.72)';
        cctx.fillStyle = 'rgba(0,220,255,0.045)';
        cctx.beginPath();
        cctx.arc(S.brushPreview.x, S.brushPreview.y, S.brushPreview.radius, 0, Math.PI * 2);
        cctx.fill();
        cctx.stroke();
        cctx.restore();
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
    function localSize() {
      var dpr = window.devicePixelRatio || 1;
      return { w: overlay.width / dpr, h: overlay.height / dpr };
    }

    function overlayRotationRadians() {
      var match = /rotate\(\s*(-?[\d.]+)deg\s*\)/.exec(overlay.style.transform || '');
      return match ? parseFloat(match[1]) * Math.PI / 180 : 0;
    }

    // 屏幕坐标 → canvas 本地坐标。overlay 同时受 visual-layer 的缩放和自身
    // rotate 影响，getBoundingClientRect 返回的是变换后的外接框，必须反变换
    // 才能得到与曲线绘制一致的本地坐标。
    function overlayCoords(ev) {
      var rect = overlay.getBoundingClientRect();
      var size = localSize();
      if (!rect.width || !rect.height || !size.w || !size.h) return { x: -1e4, y: -1e4 };
      var angle = overlayRotationRadians();
      var cos = Math.cos(angle), sin = Math.sin(angle);
      var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      var dx = ev.clientX - cx, dy = ev.clientY - cy;
      var boxW = size.w * Math.abs(cos) + size.h * Math.abs(sin);
      var scale = rect.width / boxW;
      if (!isFinite(scale) || scale <= 0) scale = 1;
      var lx = (dx * cos + dy * sin) / scale;
      var ly = (-dx * sin + dy * cos) / scale;
      return { x: lx + size.w / 2, y: ly + size.h / 2 };
    }

    function distToSeg(px, py, ax, ay, bx, by) {
      var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      var cx = ax + t * dx, cy = ay + t * dy;
      return { dist: Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy)), t: t };
    }

    // 按与 drawCurves 完全相同的贝塞尔参数把曲线密集采样成折线，
    // 使命中区域贴合所绘曲线（下颌曲线仅 3 个关键点，用弦线命中偏离很大）。
    function curvePolyline(pts) {
      var poly = [];
      if (pts.length < 2) return poly;
      var steps = 8;
      for (var j = 0; j < pts.length - 1; j++) {
        var prev = pts[Math.max(0, j - 1)];
        var start = pts[j];
        var end = pts[j + 1];
        var next = pts[Math.min(pts.length - 1, j + 2)];
        var p1x = start.x + (end.x - prev.x) * CURVE_TENSION / 6;
        var p1y = start.y + (end.y - prev.y) * CURVE_TENSION / 6;
        var p2x = end.x - (next.x - start.x) * CURVE_TENSION / 6;
        var p2y = end.y - (next.y - start.y) * CURVE_TENSION / 6;
        for (var s = (j === 0 ? 0 : 1); s <= steps; s++) {
          var t = s / steps, u = 1 - t;
          poly.push({
            x: u * u * u * start.x + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * end.x,
            y: u * u * u * start.y + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t * end.y,
            ci: j + t,
          });
        }
      }
      return poly;
    }

    function screenScale() {
      var rect = overlay.getBoundingClientRect();
      var size = localSize();
      if (!rect.width || !size.w || !size.h) return 1;
      var angle = overlayRotationRadians();
      var boxW = size.w * Math.abs(Math.cos(angle)) + size.h * Math.abs(Math.sin(angle));
      return boxW > 0 ? rect.width / boxW : 1;
    }

    function hitTest(mx, my) {
      if (!S.landmarks) return null;
      var size = localSize();
      var w = size.w, h = size.h;
      var ctrls = buildControls();
      // HIT_DIST 按屏幕像素定义，换算到本地坐标，命中手感不随缩放变化。
      var best = null, bestDist = HIT_DIST / screenScale();
      for (var ci = 0; ci < CURVES.length; ci++) {
        var curve = CURVES[ci];
        var pts = curvePoints(curve, ctrls, w, h);
        if (pts.length < 2) continue;
        var poly = curvePolyline(pts);
        for (var j = 0; j < poly.length - 1; j++) {
          var r = distToSeg(mx, my, poly[j].x, poly[j].y, poly[j + 1].x, poly[j + 1].y);
          if (r.dist < bestDist) {
            bestDist = r.dist;
            var pointIndex = Math.round(poly[j].ci + (poly[j + 1].ci - poly[j].ci) * r.t);
            if (pointIndex < 0) pointIndex = 0;
            if (pointIndex >= curve.indices.length) pointIndex = curve.indices.length - 1;
            best = { curve: curve, pointIndex: pointIndex };
          }
        }
      }
      return best;
    }

    function setCurvesHidden(hidden) {
      if (S.curvesHidden === hidden || S.destroyed) return;
      S.curvesHidden = hidden;
      if (!S.dragging) overlay.style.cursor = hidden ? 'default' : (S.hoverCurve ? 'grab' : 'default');
      drawCurves();
    }

    function onKeyDown(ev) {
      if (ev.key !== 'Control') return;
      // Ctrl+滚轮调整笔刷范围期间保持内容可见，不被"单按 Ctrl 隐藏"覆盖。
      if (S.brushAdjusting) return;
      setCurvesHidden(true);
    }

    function onKeyUp(ev) {
      if (ev.key !== 'Control') return;
      var wasAdjusting = S.brushAdjusting;
      S.brushAdjusting = false;
      if (wasAdjusting && S.brushPreview) {
        // 松开 Ctrl 时清掉调整遗留的笔刷预览圆，否则会停在原地；
        // 此时 curvesHidden 已是 false，setCurvesHidden 不会重绘，需显式重绘。
        S.brushPreview = null;
        drawCurves();
      }
      setCurvesHidden(false);
    }

    function onWindowBlur() {
      var wasAdjusting = S.brushAdjusting;
      S.brushAdjusting = false;
      if (wasAdjusting && S.brushPreview) {
        S.brushPreview = null;
        drawCurves();
      }
      setCurvesHidden(false);
    }

    function segmentAnchors(curve, pointIndex) {
      var outline = S.outlines && S.outlines[curve.key];
      var anchors = [];
      for (var offset = -2; offset <= 2; offset++) {
        var index = pointIndex + offset;
        if (index < 0 || index >= curve.indices.length) continue;
        var landmark = S.landmarks[curve.indices[index]];
        var guide = outline && outline[index] ? outline[index] : landmark;
        if (guide) anchors.push({ fx: guide[0], fy: guide[1], weight: SEGMENT_WEIGHTS[offset + 2] });
      }
      return anchors;
    }

    function segmentControls(anchors, dx, dy, radius) {
      // 折线修复：沿曲线密采样使弧连续，但能量归一避免 10px→100px 放大
      if (anchors.length <= 2) {
        return anchors.map(function (a) { return { fx: a.fx, fy: a.fy, dx: dx * a.weight, dy: dy * a.weight, r: radius }; });
      }
      var origSum = 0; for (var k = 0; k < anchors.length; k++) origSum += anchors[k].weight;
      var dense = [];
      var steps = 2; // 5点→9点，足够平滑且不过度叠加
      for (var i = 0; i < anchors.length - 1; i++) {
        var a0 = anchors[Math.max(0, i - 1)], a1 = anchors[i], a2 = anchors[i + 1], a3 = anchors[Math.min(anchors.length - 1, i + 2)];
        for (var s = 0; s < steps; s++) {
          var t = s / steps;
          var fx = 0.5 * ((2 * a1.fx) + (-a0.fx + a2.fx) * t + (2 * a0.fx - 5 * a1.fx + 4 * a2.fx - a3.fx) * t * t + (-a0.fx + 3 * a1.fx - 3 * a2.fx + a3.fx) * t * t * t);
          var fy = 0.5 * ((2 * a1.fy) + (-a0.fy + a2.fy) * t + (2 * a0.fy - 5 * a1.fy + 4 * a2.fy - a3.fy) * t * t + (-a0.fy + 3 * a1.fy - 3 * a2.fy + a3.fy) * t * t * t);
          var centerDist = Math.abs(i + t - (anchors.length - 1) / 2);
          var w = Math.exp(-0.65 * centerDist * centerDist);
          var baseW = (a1.weight + a2.weight) / 2;
          var weight = w * 0.82 + baseW * 0.18;
          dense.push({ fx: fx, fy: fy, w: weight, r: radius });
        }
      }
      dense.push({ fx: anchors[anchors.length - 1].fx, fy: anchors[anchors.length - 1].fy, w: anchors[anchors.length - 1].weight, r: radius });
      var denseSum = 0; for (var j = 0; j < dense.length; j++) denseSum += dense[j].w;
      var scale = denseSum > 1e-6 ? origSum / denseSum : 1;
      return dense.map(function (d) { return { fx: d.fx, fy: d.fy, dx: dx * d.w * scale, dy: dy * d.w * scale, r: d.r }; });
    }

    function brushRadiusNormalized() {
      var size = localSize();
      var maxDimension = Math.max(size.w, size.h);
      return Math.max(MIN_BRUSH_R, Math.min(MAX_BRUSH_R, S.brush / 2 / maxDimension));
    }

    function setBrushPreview(localPos) {
      var size = localSize();
      var maxDimension = Math.max(size.w, size.h);
      S.brushPreview = {
        x: localPos.x,
        y: localPos.y,
        radius: brushRadiusNormalized() * maxDimension,
      };
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('keydown', onUndoKey);
    window.addEventListener('blur', onWindowBlur);

    overlay.addEventListener('pointermove', function (ev) {
      var pos = overlayCoords(ev);
      if (S.dragging) {
        var size = localSize();
        var ddx = (pos.x - S.dragStartX) / size.w * S.strength;
        var ddy = (pos.y - S.dragStartY) / size.h * S.strength;
        // 两侧脸缘主要沿法线推拉，保留少量纵向自由度避免手感僵硬。
        if (S.dragCurve === 'left' || S.dragCurve === 'right') ddy *= 0.55;
        var tx = ddx, ty = ddy;
        var mag = Math.sqrt(tx * tx + ty * ty);
        var maxTotal = Math.min(0.22, MAX_TOTAL * Math.max(1, S.strength));
        if (mag > maxTotal) { tx = tx / mag * maxTotal; ty = ty / mag * maxTotal; }
        if (Math.abs(tx - S.dragTotal.dx) < 0.0002 && Math.abs(ty - S.dragTotal.dy) < 0.0002) return;
        S.dragTotal = { dx: tx, dy: ty };
        S.currentStroke = segmentControls(S.dragAnchors, tx, ty, S.dragBrushRadius);
        setBrushPreview(pos);
        writeEntryAndInvalidate();
        drawCurves();
        return;
      }
      var hit = hitTest(pos.x, pos.y);
      var prev = S.hoverCurve;
      S.hoverCurve = hit ? hit.curve.key : null;
      // 调整笔刷范围期间让预览圆跟随光标，便于直观看到范围大小。
      if (hit || S.brushAdjusting) setBrushPreview(pos); else S.brushPreview = null;
      overlay.style.cursor = hit ? 'grab' : 'default';
      if (S.hoverCurve !== prev || S.brushPreview) drawCurves();
    });

    overlay.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      var pos = overlayCoords(ev);
      var hit = hitTest(pos.x, pos.y);
      if (!hit) return;
      ev.preventDefault();
      ev.stopPropagation();
      overlay.setPointerCapture(ev.pointerId);
      S.dragging = true;
      S.dragStartX = pos.x;
      S.dragStartY = pos.y;
      S.dragTotal = { dx: 0, dy: 0 };
      S.dragCurve = hit.curve.key;
      S.dragAnchors = segmentAnchors(hit.curve, hit.pointIndex);
      S.dragBrushRadius = brushRadiusNormalized();
      setBrushPreview(pos);
      S.currentStroke = [];
      overlay.style.cursor = 'grabbing';
    });

    overlay.addEventListener('pointerup', function () {
      if (!S.dragging) return;
      S.dragging = false;
      if (S.currentStroke && S.currentStroke.length) {
        pushUndo();
        S.controls = S.controls.concat(S.currentStroke);
      }
      S.currentStroke = null;
      S.dragAnchors = null;
      overlay.style.cursor = 'grab';
      writeEntryAndInvalidate();
      drawCurves();
    });

    overlay.addEventListener('pointerleave', function () {
      if (!S.dragging) {
        S.hoverCurve = null;
        S.brushPreview = null;
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
    detectHint.textContent = '打开照片后自动检测人脸，拖动脸部轮廓线即可调整脸型，Ctrl+Z 撤销、Ctrl+Shift+Z 重做。';
    gDetect.el.appendChild(detectHint);
    var redetectBtn = document.createElement('button');
    redetectBtn.type = 'button';
    redetectBtn.className = 'ghost-btn face-redetect-btn';
    redetectBtn.textContent = '重新检测';
    gDetect.el.appendChild(redetectBtn);

    var FEATURE_CONFIGS = [
      { key: 'slim', label: '脸颊', min: -100, max: 100, className: 'face-slim-range' },
      { key: 'jaw', label: '下颌', min: -100, max: 100, className: 'face-bidir-range' },
      { key: 'chin', label: '下巴', min: -100, max: 100, className: 'face-bidir-range' },
      { key: 'eye', label: '大眼', min: 0, max: 100, className: 'face-unidir-range' },
      { key: 'nose', label: '鼻翼', min: -100, max: 100, className: 'face-bidir-range' },
      { key: 'mouth', label: '嘴角', min: -100, max: 100, className: 'face-bidir-range' },
      { key: 'lip', label: '唇色', min: 0, max: 100, className: 'face-lip-range' },
    ];
    // 肤质类（磨皮/美白/肤色）是像素级滤镜而非液化控制点，但复用同一套滑条机制。
    var SKIN_CONFIGS = [
      { key: 'smooth', label: '磨皮', min: 0, max: 100, className: 'face-unidir-range' },
      { key: 'whiten', label: '美白', min: 0, max: 100, className: 'face-whiten-range' },
      { key: 'skintone', label: '肤色', min: -100, max: 100, className: 'face-skintone-range' },
    ];
    var featureInputs = {};
    var featureValues = {};

    function formatFeatureValue(value) { return value > 0 ? '+' + value : String(value); }
    function setFeature(key, value) {
      S[key] = value / 100;
      if (featureValues[key]) featureValues[key].textContent = formatFeatureValue(value);
      writeEntryAndInvalidate();
      drawCurves();
    }
    function syncFeatureInputs() {
      FEATURE_CONFIGS.concat(SKIN_CONFIGS).forEach(function (config) {
        var value = Math.round((Number(S[config.key]) || 0) * 100);
        if (featureInputs[config.key]) featureInputs[config.key].value = String(value);
        if (featureValues[config.key]) featureValues[config.key].textContent = formatFeatureValue(value);
      });
    }
    function addFeatureControl(container, config) {
      var control = document.createElement('label');
      control.className = 'face-feature-control';
      var row = document.createElement('span');
      row.className = 'face-feature-head';
      var name = document.createElement('span');
      name.textContent = config.label;
      var value = document.createElement('b');
      value.textContent = '0';
      row.appendChild(name);
      row.appendChild(value);
      var input = document.createElement('input');
      input.type = 'range';
      input.min = String(config.min);
      input.max = String(config.max);
      input.step = '1';
      input.value = '0';
      input.className = 'face-feature-range' + (config.className ? ' ' + config.className : '');
      input.addEventListener('pointerdown', function () { pushUndo(); });
      input.addEventListener('keydown', function (ev) {
        if (ev.key.indexOf('Arrow') === 0 || ev.key === 'Home' || ev.key === 'End'
          || ev.key === 'PageUp' || ev.key === 'PageDown') pushUndo();
      });
      input.addEventListener('input', function () { setFeature(config.key, Number(input.value) || 0); });
      control.appendChild(row);
      control.appendChild(input);
      container.appendChild(control);
      featureInputs[config.key] = input;
      featureValues[config.key] = value;
    }
    function addFeatureGroup(titleText, configs) {
      var featureGroup = group(titleText);
      var grid = document.createElement('div');
      grid.className = 'face-feature-grid';
      configs.forEach(function (config) { addFeatureControl(grid, config); });
      featureGroup.el.appendChild(grid);
    }

    addFeatureGroup('脸型', FEATURE_CONFIGS.slice(0, 3));
    addFeatureGroup('五官', FEATURE_CONFIGS.slice(3));
    addFeatureGroup('肤质', SKIN_CONFIGS);

    var gBrush = group('轮廓塑形');
    var brushControl = document.createElement('label');
    brushControl.className = 'face-feature-control';
    var brushHead = document.createElement('span');
    brushHead.className = 'face-feature-head';
    var brushName = document.createElement('span');
    brushName.textContent = '范围';
    var brushValue = document.createElement('b');
    brushValue.textContent = S.brush + ' px';
    brushHead.appendChild(brushName);
    brushHead.appendChild(brushValue);
    var brushInput = document.createElement('input');
    brushInput.type = 'range';
    brushInput.min = '16';
    brushInput.max = '360';
    brushInput.step = '1';
    brushInput.value = String(S.brush);
    brushInput.className = 'face-feature-range face-brush-range';
    brushInput.addEventListener('input', function () {
      S.brush = Number(brushInput.value) || 80;
      brushValue.textContent = S.brush + ' px';
      writeEntryAndInvalidate();
      if (S.brushPreview) setBrushPreview({ x: S.brushPreview.x, y: S.brushPreview.y });
      drawCurves();
    });
    brushControl.appendChild(brushHead);
    brushControl.appendChild(brushInput);
    gBrush.el.appendChild(brushControl);

    // Ctrl+滚轮调整笔刷"范围"。普通滚轮不拦截，继续冒泡给 QE 缩放；
    // Ctrl+滚轮则拦截（preventDefault+stopPropagation），避免被 QE 当成缩放。
    // 进入调整即显示曲线并保持（brushAdjusting），覆盖"单按 Ctrl 隐藏内容"，
    // 直到松开 Ctrl（onKeyUp 复位）——这样调整全程能看到笔刷预览圆。
    overlay.addEventListener('wheel', function (ev) {
      if (!ev.ctrlKey || ev.metaKey || ev.altKey) return;
      ev.preventDefault();
      ev.stopPropagation();
      var delta = Number(ev.deltaY || 0);
      if (!delta) return;
      S.brushAdjusting = true;
      setCurvesHidden(false);
      S.brush = Math.max(16, Math.min(360, S.brush + (delta < 0 ? 8 : -8)));
      brushInput.value = String(S.brush);
      brushValue.textContent = S.brush + ' px';
      writeEntryAndInvalidate();
      setBrushPreview(overlayCoords(ev));
      drawCurves();
    }, { passive: false });

    var strengthControl = document.createElement('label');
    strengthControl.className = 'face-feature-control';
    var strengthHead = document.createElement('span');
    strengthHead.className = 'face-feature-head';
    var strengthName = document.createElement('span');
    strengthName.textContent = '塑形强度';
    var strengthValue = document.createElement('b');
    strengthValue.textContent = '100%';
    strengthHead.appendChild(strengthName);
    strengthHead.appendChild(strengthValue);
    var strengthInput = document.createElement('input');
    strengthInput.type = 'range';
    strengthInput.min = '25';
    strengthInput.max = '200';
    strengthInput.step = '1';
    strengthInput.value = '100';
    strengthInput.className = 'face-feature-range';
    strengthInput.addEventListener('input', function () {
      S.strength = (Number(strengthInput.value) || 100) / 100;
      strengthValue.textContent = Math.round(S.strength * 100) + '%';
      writeEntryAndInvalidate();
    });
    strengthControl.appendChild(strengthHead);
    strengthControl.appendChild(strengthInput);
    gBrush.el.appendChild(strengthControl);

    // 功能栏
    var gFunc = group('功能');
    var funcRow = document.createElement('div');
    funcRow.className = 'face-func-row';
    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'ghost-btn';
    resetBtn.textContent = '重置变形';
    resetBtn.addEventListener('click', function () {
      pushUndo();
      S.controls = [];
      S.currentStroke = null;
      FEATURE_CONFIGS.concat(SKIN_CONFIGS).forEach(function (config) { S[config.key] = 0; });
      syncFeatureInputs();
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
        S.outlines = (res.outlines && res.outlines[0]) || null;
        S.imgW = res.width;
        S.imgH = res.height;
        S.isProfile = !!(res.profiles && res.profiles[0]);
        S.skinMask = res.skin_mask || '';
        S.lipMask = res.lip_mask || '';
        S.bodySkinMask = res.body_skin_mask || '';
        S.lmKey = res.width + 'x' + res.height + ':' + (S.landmarks[1] ? S.landmarks[1].join(',') : '');
        S.controls = [];
        S.currentStroke = null;
        S.undoStack.length = 0;
        S.redoStack.length = 0;
        statusEl.textContent = S.isProfile ? '检测到侧脸，对称调整已停用' : '已检测到人脸';
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
      S.outlines = existing.face.outlines || null;
      S.imgW = existing.face.width || 0;
      S.imgH = existing.face.height || 0;
      S.lmKey = existing.face.lmKey || '';
      S.isProfile = !!existing.face.isProfile;
      S.controls = Array.isArray(existing.face.controls) ? existing.face.controls.slice() : [];
      FEATURE_CONFIGS.forEach(function (config) { S[config.key] = Number(existing.face[config.key]) || 0; });
      S.smooth = Number(existing.face.smooth) || 0;
      S.whiten = Number(existing.face.whiten) || 0;
      S.skinMask = existing.face.skinMask || '';
      S.lip = Number(existing.face.lip) || 0;
      S.skintone = Number(existing.face.skintone) || 0;
      S.lipMask = existing.face.lipMask || '';
      S.bodySkinMask = existing.face.bodySkinMask || '';
      S.brush = Math.max(16, Math.min(360, Number(existing.face.brush) || 80));
      brushInput.value = String(S.brush);
      brushValue.textContent = S.brush + ' px';
      S.strength = Math.max(0.25, Math.min(2, Number(existing.face.strength) || 1));
      strengthInput.value = String(Math.round(S.strength * 100));
      strengthValue.textContent = Math.round(S.strength * 100) + '%';
      syncFeatureInputs();
      statusEl.textContent = S.isProfile ? '检测到侧脸，对称调整已停用' : '已检测到人脸';
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
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('keydown', onUndoKey);
        window.removeEventListener('blur', onWindowBlur);
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
