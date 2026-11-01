(function () {
  'use strict';

  let currentContainer = null;
  let currentApi = null;

  function setAllowClip() {
    try {
      const selectors = ['#foodDrawer', '#modalBackdrop', '.onboard-view', '#nameView', '#introView', '#letter'];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.setAttribute('data-allow-clip', 'true'));
      });
    } catch (e) {}
  }

  function render(container, state) {
    setAllowClip();
    const list = state.achievements || [];
    const earnedCount = list.filter(a => a.earned).length;
    const totalCount = list.length;
    const cloversEarned = list.filter(a => a.earned).reduce((sum, a) => sum + (a.reward || 0), 0);

    const wrapper = document.createElement('div');
    wrapper.className = 'achievements-container';

    // Header: "N / M earned" and the clovers earned from them
    const header = document.createElement('div');
    header.className = 'achievements-header';
    header.innerHTML = `
      <div class="achievements-stat">
        <span class="pixel-icon icon-trophy"></span>
        <span class="achievements-stat-text">${earnedCount} / ${totalCount} earned</span>
      </div>
      <div class="achievements-clovers">
        <span class="pixel-icon icon-clover"></span>
        <span class="achievements-clovers-text">+${cloversEarned}</span>
      </div>
    `;
    wrapper.appendChild(header);

    // Card grid
    const grid = document.createElement('div');
    grid.className = 'achievements-grid';

    list.forEach(item => {
      const card = document.createElement('div');
      const isEarned = Boolean(item.earned);
      const isHidden = Boolean(item.hidden && !isEarned);

      card.className = `achievement-card ${isEarned ? 'earned' : 'locked'}${isHidden ? ' hidden' : ''}`;

      const iconName = item.category ? `icon-badge-${item.category.replace('_', '-')}` : 'icon-trophy';

      let title = item.title;
      let text = item.text || '';
      let metaHtml = '';

      if (isHidden) {
        title = '???';
        text = '';
      }

      if (isEarned) {
        const dateStr = item.date ? item.date.slice(0, 10) : '';
        metaHtml = `
          <div class="achievement-meta">
            <span class="achievement-reward">+${item.reward} <span class="pixel-icon icon-clover"></span></span>
            ${dateStr ? `<span class="achievement-date">${dateStr}</span>` : ''}
          </div>
        `;
      } else if (!isHidden) {
        metaHtml = `
          <div class="achievement-meta locked">
            <span class="achievement-reward">+${item.reward} <span class="pixel-icon icon-clover"></span></span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="achievement-icon-wrap">
          <span class="pixel-icon ${iconName}"></span>
        </div>
        <div class="achievement-info">
          <div class="achievement-title">${title}</div>
          ${text ? `<div class="achievement-text">${text}</div>` : ''}
          ${metaHtml}
        </div>
      `;
      grid.appendChild(card);
    });

    wrapper.appendChild(grid);
    container.innerHTML = '';
    container.appendChild(wrapper);
  }

  window.CuyHome.registerFeature({
    id: 'achievements',
    title: 'Achievements',
    icon: 'icon-trophy',
    order: 7,

    open(container, api) {
      currentContainer = container;
      currentApi = api;
      const state = api.getState();
      render(container, state);
      setAllowClip();
    },

    close() {
      setAllowClip();
    },

    onState(state) {
      if (currentContainer && currentApi) {
        render(currentContainer, state);
      }
      setAllowClip();
    }
  });
})();
