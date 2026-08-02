/* AI修图模块前端：聊天式修图界面。
 * 挂载进快速修图右侧栏（框架自动创建 page/tab/overlay）。
 * 依赖：window.PicScannerModules（app_modules.js）、window.PS（app_core.js）。
 */
(function () {
  'use strict';
  if (!window.PicScannerModules) return;

  var MODULE_KEY = 'ai_edit';

  // 风格预设（与 prompts/knowledge.py 的 STYLE_PRESETS 对应）
  var PRESETS = [
    { name: '日系清新', prompt: '请应用日系清新风格' },
    { name: '电影感', prompt: '请应用电影感青橙色调风格' },
    { name: '高对比黑白', prompt: '请应用高对比黑白风格' },
    { name: '胶片褪色', prompt: '请应用胶片褪色风格' },
    { name: '风光通透', prompt: '请应用风光通透风格' },
    { name: '人像柔光', prompt: '请应用人像柔光风格' },
  ];

  var activeHandle = null;

  function mount(ctx, root) {
    var photo = ctx.photo;
    var PS = ctx.PS;
    if (!photo) {
      root.textContent = '缺少照片';
      return { unmount: function () {} };
    }

    // ─── 状态 ────────────────────────────────────────────────
    var conversation = [];      // 多轮上下文（不含 system）
    var activeParams = {};      // AI 已调整的参数（非默认）
    var busy = false;
    var destroyed = false;
    var visionEnabled = false;  // 是否视觉模型（决定是否截图回传）
    var currentImageDataUrl = null;  // 最近一次编辑后的预览截图（喂给模型）
    var autoCheckCount = 0;     // 当前自动复查轮次计数
    var MAX_AUTO_CHECK = 3;     // 自动复查上限（防跑偏）
    var AUTO_CHECK_PROMPT = '请查看当前照片的最新效果，检查刚才的调整是否合适。如果还有问题请继续调整参数；如果已经满意，请简要总结所做的调整，不要再调用任何工具。';

    // 恢复该照片的历史会话
    var savedEntry = ctx.store.getWarp(photo.id);
    if (savedEntry && savedEntry.aiEdit && Array.isArray(savedEntry.aiEdit.conversation)) {
      conversation = savedEntry.aiEdit.conversation;
      activeParams = savedEntry.aiEdit.activeParams || {};
    }

    root.classList.add('ai-edit-root');

    // ─── DOM 构建 ────────────────────────────────────────────
    root.innerHTML =
      '<div class="ai-edit-status">' +
        '<span class="ai-edit-status-dot"></span>' +
        '<span class="ai-edit-status-text">检测配置…</span>' +
        '<button type="button" class="ai-edit-config-btn" title="LLM 配置">' + gearSvg() + '</button>' +
      '</div>' +
      '<div class="ai-edit-config-panel hidden">' +
        '<label class="ai-edit-config-field"><span>API 地址</span><input type="text" data-cfg="api_base" placeholder="https://api.openai.com/v1"></label>' +
        '<label class="ai-edit-config-field"><span>API 密钥</span><input type="password" data-cfg="api_key" placeholder="sk-…"></label>' +
        '<label class="ai-edit-config-field"><span>模型</span><input type="text" data-cfg="model" placeholder="gpt-4o"></label>' +
        '<label class="ai-edit-vision-toggle">' +
          '<input type="checkbox" data-cfg="is_vision">' +
          '<span>视觉模型（随消息传入照片）</span>' +
        '</label>' +
        '<div class="ai-edit-config-actions">' +
          '<button type="button" class="primary-btn ai-edit-config-save">保存</button>' +
        '</div>' +
      '</div>' +
      '<div class="ai-edit-presets"></div>' +
      '<div class="ai-edit-chat"></div>' +
      '<div class="ai-edit-params hidden"></div>' +
      '<div class="ai-edit-input-row">' +
        '<textarea class="ai-edit-input" rows="2" placeholder="描述你的修图需求，如：调暖一点，天空压暗"></textarea>' +
        '<button type="button" class="ai-edit-send" title="发送">' + sendSvg() + '</button>' +
      '</div>' +
      '<div class="ai-edit-actions">' +
        '<button type="button" class="primary-btn ai-edit-apply">应用到照片</button>' +
        '<button type="button" class="ghost-btn ai-edit-reset">重置</button>' +
      '</div>';

    var statusDot = root.querySelector('.ai-edit-status-dot');
    var statusText = root.querySelector('.ai-edit-status-text');
    var configBtn = root.querySelector('.ai-edit-config-btn');
    var configPanel = root.querySelector('.ai-edit-config-panel');
    var presetsEl = root.querySelector('.ai-edit-presets');
    var chatEl = root.querySelector('.ai-edit-chat');
    var paramsEl = root.querySelector('.ai-edit-params');
    var inputEl = root.querySelector('.ai-edit-input');
    var sendBtn = root.querySelector('.ai-edit-send');
    var applyBtn = root.querySelector('.ai-edit-apply');
    var resetBtn = root.querySelector('.ai-edit-reset');

    // ─── 预设 chips ──────────────────────────────────────────
    PRESETS.forEach(function (p) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ai-edit-preset';
      chip.textContent = p.name;
      chip.addEventListener('click', function () {
        if (!busy) send(p.prompt);
      });
      presetsEl.appendChild(chip);
    });

    // ─── 配置状态 ────────────────────────────────────────────
    function refreshStatus() {
      Promise.all([
        ctx.call('validate_config'),
        PS.call('get_module_config', MODULE_KEY),
      ]).then(function (results) {
        if (destroyed) return;
        var res = results[0];
        var cfg = (results[1] && results[1].config) || {};
        var ready = res && res.ready;
        visionEnabled = !!cfg.is_vision;
        statusDot.classList.toggle('ok', !!ready);
        statusDot.classList.toggle('bad', !ready);
        if (ready) {
          var model = cfg.model || '已配置';
          statusText.textContent = model + (visionEnabled ? ' · 视觉' : '');
        } else {
          statusText.textContent = '未配置 LLM';
        }
      });
    }

    configBtn.addEventListener('click', function () {
      var willOpen = configPanel.classList.contains('hidden');
      configPanel.classList.toggle('hidden');
      if (willOpen) {
        // 打开时载入当前配置
        PS.call('get_module_config', MODULE_KEY).then(function (res) {
          var cfg = (res && res.config) || {};
          configPanel.querySelectorAll('input[data-cfg]').forEach(function (inp) {
            if (inp.type === 'checkbox') {
              inp.checked = !!cfg[inp.dataset.cfg];
            } else {
              inp.value = cfg[inp.dataset.cfg] == null ? '' : cfg[inp.dataset.cfg];
            }
          });
        });
      }
    });

    configPanel.querySelector('.ai-edit-config-save').addEventListener('click', function () {
      var fields = configPanel.querySelectorAll('input[data-cfg]');
      var pending = [];
      fields.forEach(function (inp) {
        var val = (inp.type === 'checkbox') ? inp.checked : inp.value.trim();
        pending.push(PS.call('set_module_config', MODULE_KEY, inp.dataset.cfg, val));
      });
      Promise.all(pending).then(function () {
        configPanel.classList.add('hidden');
        refreshStatus();
        ctx.services.showToast('LLM 配置已保存', 'success');
      });
    });

    // ─── 聊天渲染 ────────────────────────────────────────────
    function esc(s) { return PS.escapeHtml ? PS.escapeHtml(String(s)) : String(s); }

    function addMsg(role, text, tools, auto) {
      var wrap = document.createElement('div');
      wrap.className = 'ai-edit-msg ai-edit-msg-' + role + (auto ? ' ai-edit-msg-auto' : '');
      var bubble = document.createElement('div');
      bubble.className = 'ai-edit-bubble';
      bubble.innerHTML = (auto ? '<span class="ai-edit-auto-tag">自动复查</span>' : '') +
        esc(text).replace(/\n/g, '<br>');
      wrap.appendChild(bubble);

      if (tools && tools.length) {
        var toolRow = document.createElement('div');
        toolRow.className = 'ai-edit-tools';
        tools.forEach(function (t) {
          var chip = document.createElement('span');
          chip.className = 'ai-edit-tool-chip';
          chip.textContent = t.name;
          chip.title = JSON.stringify(t.arguments);
          toolRow.appendChild(chip);
        });
        wrap.appendChild(toolRow);
      }

      chatEl.appendChild(wrap);
      chatEl.scrollTop = chatEl.scrollHeight;
      return wrap;
    }

    function addThinking() {
      var wrap = document.createElement('div');
      wrap.className = 'ai-edit-msg ai-edit-msg-ai ai-edit-thinking';
      wrap.innerHTML = '<div class="ai-edit-bubble"><span class="ai-edit-dot"></span><span class="ai-edit-dot"></span><span class="ai-edit-dot"></span></div>';
      chatEl.appendChild(wrap);
      chatEl.scrollTop = chatEl.scrollHeight;
      return wrap;
    }

    function renderEmpty() {
      chatEl.innerHTML =
        '<div class="ai-edit-empty">' +
          '<div class="ai-edit-empty-icon">' + sparkSvg() + '</div>' +
          '<div class="ai-edit-empty-title">AI 修图</div>' +
          '<div class="ai-edit-empty-hint">描述想要的效果，或点选上方风格预设</div>' +
        '</div>';
    }

    function renderHistory() {
      chatEl.innerHTML = '';
      var hasAny = false;
      conversation.forEach(function (m) {
        if (m.role === 'user') { addMsg('user', m.content); hasAny = true; }
        else if (m.role === 'assistant' && m.content) { addMsg('ai', m.content); hasAny = true; }
      });
      if (!hasAny) renderEmpty();
      renderParamsStrip();
    }

    function renderParamsStrip() {
      var keys = Object.keys(activeParams);
      if (!keys.length) { paramsEl.classList.add('hidden'); return; }
      paramsEl.classList.remove('hidden');
      paramsEl.innerHTML = '<span class="ai-edit-params-label">已调 ' + keys.length + ' 项</span>' +
        keys.map(function (k) {
          return '<span class="ai-edit-param-chip">' + esc(k) + ' ' + esc(fmtVal(activeParams[k])) + '</span>';
        }).join('');
    }

    function fmtVal(v) {
      if (Array.isArray(v)) return '曲线';
      if (typeof v === 'number') return (Math.round(v * 10) / 10);
      return v;
    }

    // ─── 持久化会话 ──────────────────────────────────────────
    function persist() {
      var entry = ctx.store.getWarp(photo.id) || {};
      entry.aiEdit = { conversation: conversation, activeParams: activeParams };
      ctx.store.setWarp(photo.id, entry);
    }

    // ─── 发送 ────────────────────────────────────────────────
    function send(text, isAutoCheck) {
      text = (text == null ? '' : String(text)).trim();
      if (!text || busy) return;
      if (!isAutoCheck) autoCheckCount = 0;  // 用户主动发起时重置复查计数
      busy = true;
      sendBtn.classList.add('busy');

      // 清空空状态
      var empty = chatEl.querySelector('.ai-edit-empty');
      if (empty) chatEl.innerHTML = '';

      addMsg('user', text, null, !!isAutoCheck);
      var thinking = addThinking();

      var prevSig = JSON.stringify(activeParams);

      ctx.call('chat', text, conversation, photo.path || '', visionEnabled ? currentImageDataUrl : null).then(function (res) {
        if (destroyed) return;
        thinking.remove();
        busy = false;
        sendBtn.classList.remove('busy');

        if (!res || !res.success) {
          addMsg('ai', (res && res.error) || '请求失败');
          return;
        }

        addMsg('ai', res.reply || '（无回复）', res.tool_calls);

        // 更新多轮上下文（去掉开头的 system）
        if (Array.isArray(res.messages)) {
          conversation = res.messages.filter(function (m) { return m.role !== 'system'; });
        }
        if (res.active_params) activeParams = res.active_params;

        renderParamsStrip();
        persist();

        // 本轮参数是否真的变化（区分"调参"与"只查询/只总结"）
        var changed = JSON.stringify(activeParams) !== prevSig;

        if (changed && Object.keys(activeParams).length) {
          applyParamsToQuickEdit();
          if (visionEnabled) {
            // 等截图完成再决定是否自动复查（保证下一轮拿到最新图）
            captureAfterRender().then(function () { maybeAutoCheck(); });
          } else {
            maybeAutoCheck();
          }
        }
      }).catch(function (err) {
        if (destroyed) return;
        thinking.remove();
        busy = false;
        sendBtn.classList.remove('busy');
        addMsg('ai', '调用失败：' + (err && err.message ? err.message : err));
      });
    }

    // 自动复查：视觉开启 + 本轮有改动 + 未超上限 → 自动续发一轮让模型检查
    function maybeAutoCheck() {
      if (destroyed || busy) return;
      if (!visionEnabled) return;
      if (autoCheckCount >= MAX_AUTO_CHECK) return;
      autoCheckCount++;
      send(AUTO_CHECK_PROMPT, true);
    }

    sendBtn.addEventListener('click', function () {
      var t = inputEl.value;
      inputEl.value = '';
      send(t);
    });
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var t = inputEl.value;
        inputEl.value = '';
        send(t);
      }
    });

    // ─── 应用与截图（闭环）──────────────────────────────────
    // 把 activeParams 合并进快速修图并触发预览重绘
    function applyParamsToQuickEdit() {
      if (!PS.state || !PS.state.quickEdit) return false;
      var keys = Object.keys(activeParams);
      if (!keys.length) return false;
      var base = PS.normalizeQuickEditParams(PS.state.quickEdit.params || {});
      var merged = Object.assign({}, base);
      keys.forEach(function (k) { merged[k] = activeParams[k]; });
      PS.state.quickEdit.params = PS.normalizeQuickEditParams(merged);
      if (PS.syncQuickEditControls) PS.syncQuickEditControls();
      if (PS.applyQuickEditPreview) PS.applyQuickEditPreview({ interactive: true });
      return true;
    }

    // 等待预览 img 完成下一次重绘（load 事件），带超时兜底
    function waitForPreviewRender() {
      return new Promise(function (resolve) {
        var img = document.querySelector('[data-quick-edit-img]');
        if (!img) { resolve(); return; }
        var done = false;
        var timer = setTimeout(function () {
          if (!done) { done = true; resolve(); }
        }, 1800);
        img.addEventListener('load', function onLoad() {
          if (done) return;
          done = true;
          clearTimeout(timer);
          img.removeEventListener('load', onLoad);
          resolve();
        });
      });
    }

    // 把当前预览 img 画到 canvas 取 data URL（预览分辨率，即用户所见）
    function captureEditedPreview() {
      try {
        var img = document.querySelector('[data-quick-edit-img]');
        if (!img || !img.naturalWidth || !img.naturalHeight) return null;
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        return null;
      }
    }

    // 应用后等待重绘完成再截图，更新 currentImageDataUrl（返回 Promise）
    function captureAfterRender() {
      return waitForPreviewRender().then(function () {
        if (destroyed) return;
        var url = captureEditedPreview();
        if (url) currentImageDataUrl = url;
      });
    }

    applyBtn.addEventListener('click', function () {
      if (!applyParamsToQuickEdit()) {
        ctx.services.showToast('暂无可应用的调整', 'error');
        return;
      }
      if (visionEnabled) captureAfterRender();
      ctx.services.showToast('已应用 ' + Object.keys(activeParams).length + ' 项调整', 'success');
    });

    // ─── 重置 ────────────────────────────────────────────────
    resetBtn.addEventListener('click', function () {
      ctx.call('reset_session').then(function () {
        activeParams = {};
        currentImageDataUrl = null;
        renderParamsStrip();
        persist();
        ctx.services.showToast('已重置', 'success');
      });
    });

    // ─── 初始化 ──────────────────────────────────────────────
    renderHistory();
    refreshStatus();

    return {
      unmount: function () {
        destroyed = true;
      },
    };
  }

  // ─── SVG 图标 ──────────────────────────────────────────────
  function gearSvg() {
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  }
  function sendSvg() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  }
  function sparkSvg() {
    return '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/></svg>';
  }

  // ─── 注册 ──────────────────────────────────────────────────
  window.PicScannerModules.register({
    key: MODULE_KEY,
    name: 'AI修图',
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
