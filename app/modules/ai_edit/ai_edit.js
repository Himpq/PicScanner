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
    var visionEnabled = false;
    var runSeq = 0;
    var currentRunId = '';
    var currentRunCard = null;
    var cancelRequested = false;

    // 恢复该照片的历史会话
    var savedEntry = ctx.store.getWarp(photo.id);
    if (savedEntry && savedEntry.aiEdit && Array.isArray(savedEntry.aiEdit.conversation)) {
      conversation = savedEntry.aiEdit.conversation;
      activeParams = savedEntry.aiEdit.activeParams || {};
    }
    if (Object.keys(activeParams).length && PS.state && PS.state.quickEdit) {
      var restoredParams = PS.normalizeQuickEditParams(PS.state.quickEdit.params || {});
      Object.keys(activeParams).forEach(function (key) {
        restoredParams[key] = activeParams[key];
      });
      PS.state.quickEdit.params = PS.normalizeQuickEditParams(restoredParams);
      PS.syncQuickEditControls();
      PS.applyQuickEditPreview({ interactive: false });
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

    // ─── 预设 chips ──────────────────────────────────────────
    PRESETS.forEach(function (p) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ai-edit-preset';
      chip.textContent = p.name;
      chip.addEventListener('click', function () {
        if (!busy) userSend(p.prompt);
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
        var ready = !!(res && res.ready);
        visionEnabled = !!cfg.is_vision;
        statusDot.classList.toggle('ok', ready && visionEnabled);
        statusDot.classList.toggle('bad', !ready || !visionEnabled);
        if (ready && visionEnabled) {
          var model = cfg.model || '已配置';
          statusText.textContent = model + ' · 视觉 Agent 就绪';
        } else if (ready) {
          statusText.textContent = '已配置，但需要启用视觉模型';
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

    // ─── 对话与 Agent 活动渲染 ────────────────────────────────
    function esc(s) { return PS.escapeHtml ? PS.escapeHtml(String(s)) : String(s); }

    function scrollChatToBottom() { chatEl.scrollTop = chatEl.scrollHeight; }

    function addMsg(role, text) {
      var wrap = document.createElement('div');
      wrap.className = 'ai-edit-msg ai-edit-msg-' + role;
      var bubble = document.createElement('div');
      bubble.className = 'ai-edit-bubble';
      bubble.innerHTML = esc(text).replace(/\n/g, '<br>');
      wrap.appendChild(bubble);
      chatEl.appendChild(wrap);
      scrollChatToBottom();
      return wrap;
    }

    function addAgentActivity(label, kind) {
      if (!currentRunCard) return;
      var item = document.createElement('div');
      item.className = 'ai-edit-agent-step ai-edit-agent-step-' + String(kind || 'info');
      item.textContent = label;
      currentRunCard.activity.appendChild(item);
      scrollChatToBottom();
    }

    function addAgentTools(tools) {
      if (!currentRunCard || !tools.length) return;
      var row = document.createElement('div');
      row.className = 'ai-edit-tools';
      tools.forEach(function (t) {
        var chip = document.createElement('span');
        chip.className = 'ai-edit-tool-chip';
        chip.textContent = t.name || '参数工具';
        chip.title = JSON.stringify(t.arguments || {});
        row.appendChild(chip);
      });
      currentRunCard.activity.appendChild(row);
      scrollChatToBottom();
    }

    function beginAgentRun(goal) {
      var wrap = document.createElement('div');
      wrap.className = 'ai-edit-agent-run ai-edit-agent-running';
      var header = document.createElement('div');
      header.className = 'ai-edit-agent-header';
      header.innerHTML = '<span class="ai-edit-agent-pulse"></span><span class="ai-edit-agent-title">自动优化</span><span class="ai-edit-agent-goal"></span>';
      header.querySelector('.ai-edit-agent-goal').textContent = goal;
      var activity = document.createElement('div');
      activity.className = 'ai-edit-agent-activity';
      var bubble = document.createElement('div');
      bubble.className = 'ai-edit-bubble ai-edit-agent-reply';
      bubble.textContent = '正在启动 Agent…';
      wrap.appendChild(header);
      wrap.appendChild(activity);
      wrap.appendChild(bubble);
      chatEl.appendChild(wrap);
      scrollChatToBottom();
      currentRunCard = { wrap: wrap, activity: activity, bubble: bubble, draft: '' };
      addAgentActivity('等待视觉模型分析当前画面', 'info');
      return currentRunCard;
    }

    function onAgentDelta(text) {
      if (!currentRunCard || !text) return;
      currentRunCard.draft += text;
      currentRunCard.bubble.innerHTML = esc(currentRunCard.draft).replace(/\n/g, '<br>');
      scrollChatToBottom();
    }

    function finishAgentRun(res, errorText) {
      if (!currentRunCard) return;
      currentRunCard.wrap.classList.remove('ai-edit-agent-running');
      currentRunCard.wrap.classList.add(errorText ? 'ai-edit-agent-failed' : 'ai-edit-agent-complete');
      currentRunCard.bubble.innerHTML = esc(errorText || (res && res.reply) || '自动优化完成').replace(/\n/g, '<br>');
      var stopReason = res && res.stop_reason;
      var doneLabel = stopReason === 'iteration_limit'
        ? '已完成：达到自动优化轮次上限'
        : '已完成：目标画面达到当前判断标准';
      addAgentActivity(errorText ? '运行失败' : doneLabel, errorText ? 'error' : 'done');
      scrollChatToBottom();
    }

    // 后端 Agent 事件分发（Python 侧经 evaluate_js 推送）
    function handleBackendEvent(payload) {
      if (!payload || payload.event !== 'ai_edit_agent') return;
      var data = payload.data || {};
      if (!currentRunId || data.run_id !== currentRunId) return;
      if (data.type === 'delta') onAgentDelta(String(data.text || ''));
      else if (data.type === 'tools') addAgentTools(Array.isArray(data.tools) ? data.tools : []);
      else if (data.type === 'phase') {
        addAgentActivity(String(data.label || 'Agent 正在工作'), String(data.phase || 'info'));
        if (data.phase === 'rendering') {
          addAgentActivity('等待主编辑器完成真实预览', 'render');
        }
      } else if (data.type === 'cancelled') {
        addAgentActivity(String(data.label || '已停止自动优化'), 'error');
      }
    }

    function renderEmpty() {
      chatEl.innerHTML =
        '<div class="ai-edit-empty">' +
          '<div class="ai-edit-empty-icon">' + tuneSvg() + '</div>' +
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

    // ─── 自动 Agent 运行 ──────────────────────────────────────
    function setBusy(value) {
      busy = !!value;
      inputEl.disabled = busy;
      sendBtn.classList.toggle('busy', busy);
      sendBtn.title = busy ? '停止自动优化' : '发送';
      sendBtn.innerHTML = busy ? stopSvg() : sendSvg();
      presetsEl.querySelectorAll('button').forEach(function (button) {
        button.disabled = busy;
      });
    }

    function settleAgent() {
      setBusy(false);
      currentRunId = '';
      currentRunCard = null;
      cancelRequested = false;
    }

    function failAgent(error) {
      var message = error && error.message ? error.message : String(error || 'Agent 运行失败');
      console.error('[AiEditAgent] 前端运行失败', {
        runId: currentRunId,
        photoId: photo.id,
        error: error,
      });
      finishAgentRun(null, message);
      settleAgent();
    }

    function applyAgentResult(res) {
      if (Array.isArray(res.messages) && res.status === 'completed') {
        conversation = res.messages;
      }
      activeParams = (res.active_params && typeof res.active_params === 'object')
        ? res.active_params
        : {};
      if (res.params_snapshot && typeof res.params_snapshot === 'object') {
        var current = PS.normalizeQuickEditParams(PS.state.quickEdit.params || {});
        Object.keys(res.params_snapshot).forEach(function (key) {
          current[key] = res.params_snapshot[key];
        });
        PS.state.quickEdit.params = PS.normalizeQuickEditParams(current);
        PS.syncQuickEditControls();
        PS.applyQuickEditPreview({ interactive: false });
      }
      renderParamsStrip();
      persist();
    }

    function handleAgentResponse(res) {
      if (destroyed || !currentRunId) return;
      if (!res || !res.success) {
        failAgent(new Error((res && res.error) || 'Agent 请求失败'));
        return;
      }
      if (res.run_id && res.run_id !== currentRunId) {
        failAgent(new Error('Agent 返回了不匹配的运行 ID'));
        return;
      }
      if (res.status === 'cancelled') {
        finishAgentRun(null, '已停止自动优化');
        settleAgent();
        return;
      }

      applyAgentResult(res);
      if (res.status === 'awaiting_observation') {
        if (!res.changed) {
          failAgent(new Error('Agent 状态要求观察，但本轮没有产生参数变化'));
          return;
        }
        if (currentRunCard) {
          currentRunCard.draft = '';
          currentRunCard.bubble.textContent = '正在生成真实观察画面…';
        }
        ctx.services.captureQuickEditObservation({ maxSide: 1024, timeoutMs: 12000 }).then(function (dataUrl) {
          if (destroyed || cancelRequested || !currentRunId) return null;
          addAgentActivity('真实预览已回传，继续视觉复查', 'observe');
          return ctx.call('continue_agent_run', currentRunId, dataUrl);
        }).then(function (next) {
          if (next) handleAgentResponse(next);
        }).catch(failAgent);
        return;
      }
      if (res.status !== 'completed') {
        failAgent(new Error('Agent 返回未知状态: ' + String(res.status || '')));
        return;
      }

      finishAgentRun(res, '');
      settleAgent();
    }

    function userSend(text) {
      text = (text == null ? '' : String(text)).trim();
      if (!text || busy) return;
      if (!visionEnabled) {
        ctx.services.showToast('自动循环优化需要先启用视觉模型', 'error');
        configPanel.classList.remove('hidden');
        return;
      }
      var empty = chatEl.querySelector('.ai-edit-empty');
      if (empty) chatEl.innerHTML = '';
      addMsg('user', text);
      currentRunId = 'ai-' + String(photo.id) + '-' + Date.now() + '-' + (++runSeq);
      cancelRequested = false;
      beginAgentRun(text);
      setBusy(true);

      var initialParams = PS.normalizeQuickEditParams(PS.state.quickEdit.params || {});
      ctx.services.captureQuickEditObservation({ maxSide: 1024, timeoutMs: 12000 }).then(function (dataUrl) {
        if (destroyed || cancelRequested || !currentRunId) return null;
        addAgentActivity('当前真实画面已读取', 'observe');
        return ctx.call(
          'start_agent_run',
          currentRunId,
          text,
          conversation,
          String(photo.id),
          initialParams,
          photo.path || '',
          dataUrl
        );
      }).then(function (res) {
        if (res) handleAgentResponse(res);
      }).catch(failAgent);
    }

    sendBtn.addEventListener('click', function () {
      if (busy) {
        cancelRequested = true;
        addAgentActivity('正在停止当前运行…', 'error');
        ctx.call('cancel_agent_run', currentRunId).catch(function (err) {
          console.warn('[AiEditAgent] 取消请求失败', err);
        });
        finishAgentRun(null, '已停止自动优化');
        settleAgent();
        return;
      }
      var t = inputEl.value;
      inputEl.value = '';
      userSend(t);
    });
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var t = inputEl.value;
        inputEl.value = '';
        userSend(t);
      }
    });

    // ─── 初始化 ──────────────────────────────────────────────
    var offBackendEvent = window.PicScannerModules.onBackendEvent(handleBackendEvent);
    renderHistory();
    refreshStatus();

    return {
      unmount: function () {
        destroyed = true;
        if (currentRunId) {
          cancelRequested = true;
          ctx.call('cancel_agent_run', currentRunId).catch(function (err) {
            console.warn('[AiEditAgent] 卸载时取消运行失败', err);
          });
        }
        currentRunId = '';
        currentRunCard = null;
        if (offBackendEvent) offBackendEvent();
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
  function stopSvg() {
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
  }
  function tuneSvg() {
    return '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.2"/><circle cx="15.5" cy="12" r="2.2"/><circle cx="7" cy="17" r="2.2"/></svg>';
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
