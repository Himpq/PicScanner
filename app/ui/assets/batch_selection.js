(function () {
  function create(options) {
    const config = options || {};
    const gallery = config.gallery;
    if (!gallery) throw new Error('批量选择缺少图库容器');

    const selected = new Map();
    let sourceId = '';
    const bar = document.createElement('div');
    bar.className = 'batch-selection-bar hidden';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = [
      '<div class="batch-selection-count"><b data-batch-selection-count>0</b><span>张已选择</span></div>',
      '<div class="batch-selection-actions">',
      '<button class="batch-selection-run" type="button" data-batch-selection-run><kbd>H</kbd><span>修图</span></button>',
      '<button class="batch-selection-clear" type="button" data-batch-selection-clear><kbd>Esc</kbd><span>清空</span></button>',
      '</div>',
    ].join('');
    document.body.appendChild(bar);

    function isTypingTarget(target) {
      if (!target) return false;
      const tag = String(target.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || target.isContentEditable;
    }

    function selectedIndex(photoId) {
      const id = Number(photoId || 0);
      let index = 0;
      for (const key of selected.keys()) {
        if (key === id) return index;
        index += 1;
      }
      return -1;
    }

    function updateCard(card) {
      if (!card) return;
      const index = selectedIndex(card.dataset.photoId);
      const active = index >= 0;
      card.classList.toggle('batch-selected', active);
      card.setAttribute('aria-selected', active ? 'true' : 'false');
      let badge = card.querySelector('.photo-batch-badge');
      if (active) {
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'photo-batch-badge';
          card.appendChild(badge);
        }
        badge.innerHTML = '<span aria-hidden="true">✓</span><b>' + String(index + 1) + '</b>';
      } else if (badge) {
        badge.remove();
      }
    }

    function sync() {
      gallery.querySelectorAll('.photo-card').forEach(updateCard);
      const count = selected.size;
      const countEl = bar.querySelector('[data-batch-selection-count]');
      if (countEl) countEl.textContent = String(count);
      bar.classList.toggle('hidden', count === 0);
      document.body.classList.toggle('batch-selection-active', count > 0);
      if (typeof config.onChange === 'function') config.onChange(snapshot());
    }

    function snapshot() {
      return Array.from(selected.values()).map((photo) => Object.assign({}, photo));
    }

    function clear() {
      if (!selected.size) return false;
      selected.clear();
      sync();
      return true;
    }

    function toggle(photo) {
      const id = Number(photo && photo.id || 0);
      if (!id) return false;
      const currentSource = String(typeof config.getSourceId === 'function' ? config.getSourceId() || '' : '');
      if (!sourceId) sourceId = currentSource;
      if (sourceId && currentSource && sourceId !== currentSource) {
        clear();
        sourceId = currentSource;
      }
      if (selected.has(id)) selected.delete(id);
      else selected.set(id, Object.assign({}, photo));
      sync();
      return true;
    }

    function openProcessing() {
      if (!selected.size || typeof config.onProcess !== 'function') return false;
      config.onProcess(snapshot());
      return true;
    }

    bar.querySelector('[data-batch-selection-run]').addEventListener('click', openProcessing);
    bar.querySelector('[data-batch-selection-clear]').addEventListener('click', clear);

    return {
      handlePhotoClick(ev, photo) {
        if (!ev || (!ev.ctrlKey && !ev.metaKey) || ev.altKey) return false;
        ev.preventDefault();
        ev.stopPropagation();
        toggle(photo);
        return true;
      },
      handleKeydown(ev) {
        if (!ev || isTypingTarget(document.activeElement)) return false;
        if (typeof config.canUseShortcuts === 'function' && !config.canUseShortcuts()) return false;
        if (ev.key === 'Escape' && selected.size) {
          clear();
          ev.preventDefault();
          ev.stopPropagation();
          return true;
        }
        if ((ev.key === 'h' || ev.key === 'H') && !ev.ctrlKey && !ev.metaKey && !ev.altKey && selected.size) {
          if (!ev.repeat) openProcessing();
          ev.preventDefault();
          ev.stopPropagation();
          return true;
        }
        return false;
      },
      decorateCard(card) {
        updateCard(card);
      },
      setSource(nextSourceId) {
        const next = String(nextSourceId || '');
        if (sourceId && next && sourceId !== next) clear();
        sourceId = next;
      },
      clear,
      snapshot,
      count() {
        return selected.size;
      },
      hasRaw() {
        return snapshot().some((photo) => !!photo.is_raw);
      },
    };
  }

  window.PicScannerBatchSelection = { create };
})();
