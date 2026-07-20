(function () {
  'use strict';

  let modal = null;

  function appendText(parent, tag, className, value) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = String(value || '');
    parent.appendChild(element);
    return element;
  }

  function close() {
    if (modal) modal.classList.add('hidden');
  }

  function ensureModal() {
    if (modal && modal.isConnected) return modal;
    modal = document.createElement('div');
    modal.className = 'modal source-conflict-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'source-conflict-title');

    const card = document.createElement('div');
    card.className = 'modal-card source-conflict-card';
    appendText(card, 'h2', '', '来源标记冲突');
    card.querySelector('h2').id = 'source-conflict-title';
    card.querySelector('h2').dataset.sourceConflictTitle = '';
    appendText(
      card,
      'p',
      'source-conflict-intro',
      '同一个来源 ID 出现在多个位置。为避免合并到错误图库，这些来源已从首页隐藏。'
    ).dataset.sourceConflictIntro = '';
    const list = document.createElement('div');
    list.className = 'source-conflict-list';
    list.dataset.sourceConflictList = '';
    card.appendChild(list);
    appendText(
      card,
      'p',
      'source-conflict-action',
      '确认哪个路径是正确来源后，请在资源管理器中手动删除其他路径下的 .picscanner 文件，然后刷新来源。请勿删除正确来源的标记文件。'
    ).dataset.sourceConflictAction = '';
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary-btn';
    button.textContent = '我知道了';
    button.addEventListener('click', close);
    actions.appendChild(button);
    card.appendChild(actions);
    modal.appendChild(card);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    document.body.appendChild(modal);
    return modal;
  }

  function appendConflict(list, conflict) {
    const item = document.createElement('section');
    item.className = 'source-conflict-item';
    appendText(item, 'div', 'source-conflict-label', '重复来源 ID');
    appendText(item, 'code', 'source-conflict-id', conflict.source_id || '未知');
    const paths = document.createElement('div');
    paths.className = 'source-conflict-paths';
    (conflict.marker_paths || []).forEach((path) => appendText(paths, 'code', '', path));
    item.appendChild(paths);
    list.appendChild(item);
  }

  function appendError(list, error) {
    const item = document.createElement('section');
    item.className = 'source-conflict-item source-marker-error';
    appendText(item, 'div', 'source-conflict-label', '标记读取失败');
    appendText(item, 'code', 'source-conflict-id', error.path || '未知路径');
    appendText(item, 'p', 'source-conflict-error', error.message || '无法读取 .picscanner');
    list.appendChild(item);
  }

  function show(conflicts, errors) {
    const conflictItems = Array.isArray(conflicts) ? conflicts : [];
    const errorItems = Array.isArray(errors) ? errors : [];
    if (!conflictItems.length && !errorItems.length) {
      close();
      return;
    }
    const element = ensureModal();
    const list = element.querySelector('[data-source-conflict-list]');
    const title = element.querySelector('[data-source-conflict-title]');
    const intro = element.querySelector('[data-source-conflict-intro]');
    const action = element.querySelector('[data-source-conflict-action]');
    if (conflictItems.length) {
      title.textContent = '来源标记冲突';
      intro.textContent = '同一个来源 ID 出现在多个位置。为避免合并到错误图库，这些来源已从首页隐藏。';
      action.textContent = '确认哪个路径是正确来源后，请在资源管理器中手动删除其他路径下的 .picscanner 文件，然后刷新来源。请勿删除正确来源的标记文件。';
    } else {
      title.textContent = '来源标记读取失败';
      intro.textContent = '以下 .picscanner 文件存在但无法读取，对应来源已从首页隐藏。';
      action.textContent = '请检查标记文件内容，或手动删除损坏的 .picscanner 文件后重新扫描该来源。';
    }
    list.textContent = '';
    conflictItems.forEach((item) => appendConflict(list, item || {}));
    errorItems.forEach((item) => appendError(list, item || {}));
    element.classList.remove('hidden');
    requestAnimationFrame(() => {
      const button = element.querySelector('.primary-btn');
      if (button) button.focus();
    });
  }

  window.PicScannerSourceConflicts = { show, close };
})();
