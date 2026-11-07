(function () {
  'use strict';

  let currentContainer = null;
  let currentApi = null;
  let timerInterval = null;
  const localReadyIn = {};

  function setAllowClip() {
    try {
      const selectors = ['#foodDrawer', '#modalBackdrop', '.onboard-view', '#nameView', '#introView', '#letter'];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.setAttribute('data-allow-clip', 'true'));
      });
    } catch (e) {}
  }

  function formatTrickTitle(id, rawTitle) {
    if (rawTitle) return rawTitle;
    switch (id) {
      case 'spin': return 'Spin';
      case 'stand_up': return 'Stand Up';
      case 'popcorn': return 'Popcorn Jump';
      case 'hurdle_jump': return 'Hurdle Jump';
      default: return id.replace('_', ' ');
    }
  }

  function getTrickDesc(id) {
    switch (id) {
      case 'spin': return 'A graceful 360° spin in place.';
      case 'stand_up': return 'Reaching high on two paws!';
      case 'popcorn': return 'An energetic happy popcorn jump.';
      case 'hurdle_jump': return 'Jumping over a wooden hurdle!';
      default: return '';
    }
  }

  function sendTrick(id) {
    if (window.bridge && typeof window.bridge.send === 'function') {
      window.bridge.send({ type: 'trick', id: id });
    } else if (currentApi && typeof currentApi.send === 'function') {
      currentApi.send({ type: 'trick', id: id });
    }
  }

  function render(container, state) {
    setAllowClip();
    const bondLevel = state?.bond?.level || 1;
    const rawTricks = state?.tricks || [];

    // Ensure all 4 canonical tricks exist in display
    const canonical = [
      { id: 'spin', unlockLevel: 2 },
      { id: 'stand_up', unlockLevel: 3 },
      { id: 'popcorn', unlockLevel: 4 },
      { id: 'hurdle_jump', unlockLevel: 5 }
    ];

    const tricks = canonical.map(c => {
      const existing = rawTricks.find(t => t.id === c.id);
      if (existing) {
        return {
          id: c.id,
          title: existing.title || formatTrickTitle(c.id),
          unlocked: Boolean(existing.unlocked || bondLevel >= (existing.unlockLevel || c.unlockLevel)),
          unlockLevel: existing.unlockLevel || c.unlockLevel,
          readyIn: typeof existing.readyIn === 'number' ? existing.readyIn : 0
        };
      }
      return {
        id: c.id,
        title: formatTrickTitle(c.id),
        unlocked: bondLevel >= c.unlockLevel,
        unlockLevel: c.unlockLevel,
        readyIn: 0
      };
    });

    // Update local countdown cache
    tricks.forEach(t => {
      if (typeof t.readyIn === 'number') {
        localReadyIn[t.id] = t.readyIn;
      }
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tricks-container';

    const header = document.createElement('div');
    header.className = 'tricks-header';
    header.innerHTML = `
      <div class="tricks-header-title">Tricks &amp; Talents</div>
      <div class="tricks-bond-badge">
        <span class="pixel-icon icon-clover"></span>
        <span>Bond level: <b>${bondLevel}</b></span>
      </div>
    `;
    wrapper.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'tricks-grid';

    tricks.forEach(t => {
      const card = document.createElement('div');
      card.className = `trick-card ${t.unlocked ? 'unlocked' : 'locked'}`;

      const iconMap = {
        spin: '<span class="pixel-icon icon-trick-spin x2"></span>',
        stand_up: '<span class="pixel-icon icon-trick-stand-up x2"></span>',
        popcorn: '<span class="pixel-icon icon-trick-popcorn x2"></span>',
        hurdle_jump: '<span class="pixel-icon icon-trick-hurdle x2"></span>',
        hurdle: '<span class="pixel-icon icon-trick-hurdle x2"></span>'
      };

      const title = formatTrickTitle(t.id, t.title);
      const desc = getTrickDesc(t.id);
      const currentCooldown = localReadyIn[t.id] || 0;

      let actionHtml = '';
      if (t.unlocked) {
        const isCooling = currentCooldown > 0;
        actionHtml = `
          <button type="button" class="trick-btn" data-trick-id="${t.id}" ${isCooling ? 'disabled' : ''}>
            ${isCooling ? `Ready in ${currentCooldown}s` : 'Perform'}
          </button>
        `;
      } else {
        actionHtml = `
          <div class="trick-lock-note">
            <span class="pixel-icon icon-padlock"></span>
            <span>Unlocks at bond lvl ${t.unlockLevel}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="trick-card-top">
          <div class="trick-icon">${iconMap[t.id] || '<span class="pixel-icon icon-sparkle x2"></span>'}</div>
          <div class="trick-info">
            <div class="trick-title">${title}</div>
            <div class="trick-desc">${desc}</div>
          </div>
        </div>
        <div class="trick-card-bottom">
          ${actionHtml}
        </div>
      `;

      grid.appendChild(card);
    });

    wrapper.appendChild(grid);
    container.innerHTML = '';
    container.appendChild(wrapper);

    // Bind perform buttons
    container.querySelectorAll('button[data-trick-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-trick-id');
        if (window.Sound) window.Sound.click();
        sendTrick(id);
      });
    });
  }

  function startCooldownTicker() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      let needsRefresh = false;
      Object.keys(localReadyIn).forEach(k => {
        if (localReadyIn[k] > 0) {
          localReadyIn[k]--;
          needsRefresh = true;
        }
      });

      if (needsRefresh && currentContainer) {
        currentContainer.querySelectorAll('button[data-trick-id]').forEach(btn => {
          const id = btn.getAttribute('data-trick-id');
          const cd = localReadyIn[id] || 0;
          if (cd > 0) {
            btn.disabled = true;
            btn.textContent = `Ready in ${cd}s`;
          } else {
            btn.disabled = false;
            btn.textContent = 'Perform';
          }
        });
      }
    }, 1000);
  }

  window.CuyHome.registerFeature({
    id: 'tricks',
    title: 'Tricks',
    icon: 'icon-m-tricks',
    order: 8,

    open(container, api) {
      currentContainer = container;
      currentApi = api;
      const state = api.getState();
      render(container, state);
      startCooldownTicker();
      setAllowClip();
    },

    close() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      currentContainer = null;
      currentApi = null;
      setAllowClip();
    },

    onState(state) {
      if (currentContainer && currentApi && currentContainer.isConnected) {
        render(currentContainer, state);
      }
      setAllowClip();
    }
  });
})();
