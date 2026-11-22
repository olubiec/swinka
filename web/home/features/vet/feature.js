(function() {
  'use strict';

  const FACTS = [
    "Guinea pigs need vitamin C every day, just like us!",
    "Unlimited hay is essential to wear down their growing teeth.",
    "Weekly weighing helps spot health issues early."
  ];

  let currentFactIndex = 0;
  let factInterval = null;
  let pigAnimInterval = null;
  let lastCheckupResult = null;
  let activeContainer = null;
  let activeApi = null;
  let selectedPigId = null;
  let unregisterCallbacks = [];

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showVetToast(container, text) {
    if (!container || !text) return;
    const toastContainer = container.querySelector('#vet-toast-container');
    if (toastContainer) {
      const toast = document.createElement('div');
      toast.className = 'feature-vet-toast';
      toast.textContent = text;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 2500);
    }
  }

  function stopPigAnimation() {
    if (pigAnimInterval) {
      clearInterval(pigAnimInterval);
      pigAnimInterval = null;
    }
  }

  function getPigsList(state) {
    if (!state) return [];
    const raw = Array.isArray(state.roster) && state.roster.length > 0
      ? state.roster
      : (Array.isArray(state.pigs) ? state.pigs : []);
    const living = raw.filter(p => p && !p.memorial);
    if (living.length > 0) return living;

    const fallbackId = (Array.isArray(state.activePigIds) && state.activePigIds[0]) || 'pig_default';
    return [{
      id: fallbackId,
      name: state.name || 'Cuy',
      breed: state.breed || 'smooth',
      paletteId: state.paletteId || 'tricolor',
      stage: state.stageKey || 'adult',
      namedId: state.namedId || null
    }];
  }

  function getPrimaryVetPigId(state, pigs) {
    if (state && state.vet && state.vet.pigId) return state.vet.pigId;
    if (state && Array.isArray(state.activePigIds) && state.activePigIds[0]) return state.activePigIds[0];
    return (pigs && pigs[0] && pigs[0].id) || null;
  }

  function hasGlobalSickness(state) {
    if (!state) return false;
    if (state.vet && (state.vet.isSick || (Array.isArray(state.vet.conditions) && state.vet.conditions.length > 0))) {
      return true;
    }
    if (state.health && Array.isArray(state.health.active) && state.health.active.length > 0) {
      return true;
    }
    return false;
  }

  function isPigSick(state, pig, pigs) {
    if (!pig) return false;
    if (pig.isSick === true) return true;
    if (pig.vet && (pig.vet.isSick || (Array.isArray(pig.vet.conditions) && pig.vet.conditions.length > 0))) {
      return true;
    }
    if (pig.health && Array.isArray(pig.health.active) && pig.health.active.length > 0) {
      return true;
    }
    const primaryId = getPrimaryVetPigId(state, pigs);
    if ((pig.id === primaryId || (pigs && pigs.length <= 1)) && hasGlobalSickness(state)) {
      return true;
    }
    return false;
  }

  function getPigVetState(state, pig, pigs) {
    const defaultPrice = (state && state.vet && typeof state.vet.checkupPrice === 'number')
      ? state.vet.checkupPrice
      : 30;
    if (pig && pig.vet) return pig.vet;
    if (pig && pig.health && Array.isArray(pig.health.active) && pig.health.active.length > 0) {
      return {
        isSick: true,
        checkupPrice: defaultPrice,
        lastCheckup: pig.health.lastCheckup || null,
        conditions: pig.health.active,
        history: pig.health.history || [],
        symptoms: []
      };
    }
    const primaryId = getPrimaryVetPigId(state, pigs);
    if (state && state.vet && (!pig || pig.id === primaryId || (pigs && pigs.length <= 1))) {
      return state.vet;
    }
    if (state && state.health && Array.isArray(state.health.active) && state.health.active.length > 0 &&
        (!pig || pig.id === primaryId || (pigs && pigs.length <= 1))) {
      return {
        isSick: true,
        checkupPrice: defaultPrice,
        lastCheckup: null,
        conditions: state.health.active,
        history: state.health.history || [],
        symptoms: []
      };
    }
    return {
      isSick: false,
      checkupPrice: defaultPrice,
      lastCheckup: null,
      conditions: [],
      history: [],
      symptoms: []
    };
  }

  function selectDefaultPigId(state, pigs) {
    if (!pigs || pigs.length === 0) return null;
    const sickPig = pigs.find(p => isPigSick(state, p, pigs));
    if (sickPig) return sickPig.id;

    const activeIds = (state && Array.isArray(state.activePigIds)) ? state.activePigIds : [];
    for (let i = 0; i < activeIds.length; i++) {
      const match = pigs.find(p => p.id === activeIds[i]);
      if (match) return match.id;
    }
    return pigs[0].id;
  }

  function startPigCanvasAnimation(canvas, pig, isSick, state) {
    stopPigAnimation();
    if (!canvas || !pig) return;
    const S = window.CuySprites;
    if (!S) return;

    const look = pig.look || {};
    const breed = S.normBreed(pig.breed || look.breed || 'smooth');
    const stage = S.normStage(pig.stage || look.stage || (state && state.stageKey) || 'adult');
    const paletteId = pig.paletteId || look.paletteId || 'tricolor';
    const namedId = pig.namedId || look.namedId || null;

    // Pre-kick image loads so sheet() resolves quickly
    if (namedId && S.namedImage) S.namedImage(namedId, stage);
    if (S.image) S.image(breed, stage);

    const row = isSick ? 35 : 17;
    const frameCount = 8;
    let frame = 0;
    const ctx = canvas.getContext('2d');

    function drawFrame() {
      if (!canvas.isConnected) {
        stopPigAnimation();
        return;
      }
      const s = S.sheet(breed, stage, paletteId, namedId);
      if (!s) return;

      let sy = row * 64;
      if (sy + 64 > s.height) sy = 0;
      let sx = (frame % frameCount) * 64;
      if (sx + 64 > s.width) sx = 0;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(s, sx, sy, 64, 64, 0, 0, canvas.width, canvas.height);
      frame = (frame + 1) % frameCount;
    }

    drawFrame();
    pigAnimInterval = setInterval(drawFrame, isSick ? 190 : 140);
  }

  function ensureAlertBanner() {
    let banner = document.getElementById('vetAlertBanner');
    if (banner) return banner;

    const host = document.getElementById('topBar')
      || document.querySelector('.game-header')
      || document.getElementById('gameDevice');
    if (!host) return null;

    banner = document.createElement('button');
    banner.type = 'button';
    banner.id = 'vetAlertBanner';
    banner.className = 'vet-alert-banner';
    banner.hidden = true;
    banner.style.display = 'none';
    banner.setAttribute('aria-live', 'polite');

    banner.addEventListener('click', () => {
      const st = (activeApi && activeApi.getState)
        ? activeApi.getState()
        : (window.CuyHome && window.CuyHome.api && window.CuyHome.api.getState ? window.CuyHome.api.getState() : null);
      if (st) {
        const pigs = getPigsList(st);
        const sick = pigs.find(p => isPigSick(st, p, pigs));
        if (sick) selectedPigId = sick.id;
      }
      if (window.CuyHome && typeof window.CuyHome.openFeature === 'function') {
        window.CuyHome.openFeature('vet');
      }
    });

    if (host.classList && host.classList.contains('game-header') && host.parentNode) {
      host.parentNode.insertBefore(banner, host.nextSibling);
    } else if (host.id === 'topBar' && host.parentNode) {
      host.parentNode.insertBefore(banner, host.nextSibling);
    } else {
      host.insertBefore(banner, host.firstChild);
    }
    return banner;
  }

  function updateVetAlertBanner(state) {
    const banner = ensureAlertBanner();
    if (!banner) return;

    if (!state) {
      banner.hidden = true;
      banner.style.display = 'none';
      return;
    }

    const pigs = getPigsList(state);
    const sickPigs = pigs.filter(p => isPigSick(state, p, pigs));

    if (sickPigs.length === 0 && hasGlobalSickness(state)) {
      sickPigs.push({ id: 'pig_default', name: state.name || 'Your pig' });
    }

    if (sickPigs.length === 0) {
      banner.hidden = true;
      banner.style.display = 'none';
      return;
    }

    const firstName = sickPigs[0].name || 'Your pig';
    const text = sickPigs.length === 1
      ? `${firstName} needs a vet!`
      : `${firstName} & ${sickPigs.length - 1} more need a vet!`;

    banner.innerHTML = `
      <span class="vet-alert-banner-left">
        <span class="pixel-icon icon-vet" aria-hidden="true"></span>
        <span class="vet-alert-banner-text">${escapeHtml(text)}</span>
      </span>
      <span class="vet-alert-banner-cta">Check up &rarr;</span>
    `;
    banner.hidden = false;
    banner.style.display = 'flex';
  }

  function render(container, api, state) {
    if (!state) return;

    const pigs = getPigsList(state);
    if (!selectedPigId || !pigs.some(p => p.id === selectedPigId)) {
      selectedPigId = selectDefaultPigId(state, pigs);
    }
    const selectedPig = pigs.find(p => p.id === selectedPigId) || pigs[0];

    let vetState = getPigVetState(state, selectedPig, pigs);
    let isDemo = false;

    if (!state.vet && !(selectedPig && (selectedPig.vet || selectedPig.health))) {
      isDemo = true;
      vetState = {
        isSick: true,
        checkupPrice: 30,
        lastCheckup: null,
        conditions: [
          {
            id: 'scurvy',
            name: 'Scurvy (vitamin C deficiency)',
            known: true,
            severity: 0.6,
            treated: true,
            courseDays: 3,
            courseDaysLeft: 2,
            doseDueToday: true,
            info: 'Caused by lack of vitamin C.',
            cureHint: 'Vitamin C above 60'
          },
          {
            id: 'unknown_demo',
            name: 'Something is wrong',
            known: false,
            severity: 0.3,
            treated: false,
            price: 50,
            info: ''
          }
        ],
        history: [
          { id: 'mites', name: 'Mites', start: '2026-09-30', end: '2026-10-03' }
        ],
        symptoms: ['Tired', 'Not eating treats']
      };
    }

    const clovers = state.clovers || 0;
    const canAffordCheckup = clovers >= (vetState.checkupPrice || 0);
    const pigIsSick = Boolean(vetState.isSick);

    let html = `
      <div class="feature-vet">
        <div class="feature-vet-selector">
          <label class="feature-vet-selector-label" for="vetPigSelect">
            <span class="pixel-icon icon-pig-head" aria-hidden="true"></span>
            <span>Patient</span>
          </label>
          <select id="vetPigSelect" class="feature-vet-pig-select" aria-label="Select pig for vet checkup">
            ${pigs.map(p => {
              const sick = isPigSick(state, p, pigs);
              const badge = sick ? ' [Sick]' : '';
              return `<option value="${escapeHtml(p.id)}" ${selectedPig && p.id === selectedPig.id ? 'selected' : ''}>${escapeHtml(p.name || 'Cuy')}${badge}</option>`;
            }).join('')}
          </select>
          <span class="feature-vet-patient-pill ${pigIsSick ? 'is-sick' : 'is-healthy'}">
            ${pigIsSick ? 'Needs care' : 'Healthy'}
          </span>
        </div>

        <div class="feature-vet-illustration ${pigIsSick ? 'is-sick' : 'is-healthy'}">
          <div class="feature-vet-cross" aria-hidden="true">
            <span class="pixel-icon x1_5 icon-vet"></span>
          </div>
          <div class="feature-vet-pig-stage">
            <canvas class="feature-vet-pig-canvas" id="vetPigCanvas" width="96" height="96"></canvas>
            <div class="feature-vet-pig-mood ${pigIsSick ? 'is-sick' : 'is-healthy'}" aria-hidden="true">
              ${pigIsSick ? '!' : '<span class="pixel-icon icon-heart"></span>'}
            </div>
          </div>
          <div class="feature-vet-desk" aria-hidden="true"></div>
        </div>

        <div class="feature-vet-status">
          ${pigIsSick ? `
            <div class="feature-vet-symptoms">
              ${vetState.symptoms && vetState.symptoms.length > 0
                ? vetState.symptoms.map(s => `<span class="feature-vet-tag">${escapeHtml(s)}</span>`).join('')
                : '<span class="feature-vet-tag">Unwell</span>'}
              ${isDemo ? '<span class="feature-vet-tag" style="background:#ddd; border-color:#999;">(demo)</span>' : ''}
            </div>
          ` : `
            <div class="feature-vet-healthy">${escapeHtml((selectedPig && selectedPig.name) || 'Your pig')} looks healthy!</div>
          `}
        </div>

        <div class="feature-vet-checkup" style="margin: 10px 0; text-align: center;">
          <button class="game-btn" id="btn-vet-checkup" ${canAffordCheckup ? '' : 'disabled'}>
            <span class="pixel-icon icon-clover"></span> Check-up – ${vetState.checkupPrice}
          </button>
          ${!canAffordCheckup ? `<div class="feature-vet-error" style="color:var(--ui-brick-2, #c33); font-size:12px; margin-top:4px;">Not enough clovers</div>` : ''}
          ${lastCheckupResult ? `
            <div class="vet-checkup-result" style="margin-top:8px; font-weight:bold; color:var(--ui-moss-3, #2a7);">
              ${lastCheckupResult.found === 0 ? 'No problems found.' : `Found ${lastCheckupResult.found} problem(s)`}
            </div>
          ` : ''}
        </div>

        <div class="feature-vet-conditions">
    `;

    if (pigIsSick && vetState.conditions && vetState.conditions.length > 0) {
      vetState.conditions.forEach(cond => {
        const severityColor = getSeverityColor(cond.severity);
        const severityPct = Math.min(100, Math.max(0, cond.severity * 100));

        html += `
          <div class="feature-vet-card ${cond.known ? '' : 'feature-vet-unknown'}">
            <div class="feature-vet-card-title">${escapeHtml(cond.name)}</div>
        `;

        if (cond.known) {
          html += `
            <div class="feature-vet-severity">
              <div class="feature-vet-severity-bar" style="width: ${severityPct}%; background-color: ${severityColor};"></div>
            </div>
            ${cond.info ? `<div class="feature-vet-card-info">${escapeHtml(cond.info)}</div>` : ''}
            ${cond.cureHint ? `<div class="feature-vet-cure-hint">${escapeHtml(cond.cureHint)}</div>` : ''}

            <div class="feature-vet-card-actions">
          `;

          if (!cond.treated) {
            const canAffordTreatment = clovers >= (cond.price || 0);
            html += `
              <button class="game-btn" data-action="treat" data-id="${escapeHtml(cond.id)}" ${canAffordTreatment ? '' : 'disabled'}>
                <span class="pixel-icon icon-clover"></span> Treat – ${cond.price}
              </button>
              ${!canAffordTreatment ? `<div class="feature-vet-error">Not enough clovers</div>` : ''}
            `;
          } else if (cond.courseDays > 0) {
            const currentDay = cond.courseDays - cond.courseDaysLeft + (cond.doseDueToday ? 0 : 1);
            html += `<div class="feature-vet-medicine-status">Medicine: day ${currentDay} of ${cond.courseDays}</div>`;
            if (cond.doseDueToday) {
              html += `<button class="game-btn" data-action="dose" data-id="${escapeHtml(cond.id)}"><span class="pixel-icon icon-medicine"></span> Give today's dose</button>`;
            } else {
              html += `<div class="feature-vet-dose-done">Next dose tomorrow <span class="pixel-icon icon-check"></span></div>`;
            }
          } else {
            html += `<div class="feature-vet-medicine-status">Treated! Follow the hint above.</div>`;
          }
          html += `</div>`;
        } else {
          html += `
            <div class="feature-vet-card-info">
               ${vetState.symptoms && vetState.symptoms.length > 0 ? 'Symptoms: ' + escapeHtml(vetState.symptoms.join(', ')) : 'The vet needs to examine your pig.'}
            </div>
          `;
        }

        html += `</div>`;
      });
    }
    html += `</div>`;

    if (vetState.history && vetState.history.length > 0) {
      html += `
        <details class="feature-vet-history">
          <summary>Medical History</summary>
          <ul class="feature-vet-history-list">
            ${vetState.history.map(h => `<li>${escapeHtml(h.name)} (${escapeHtml(h.start)} to ${escapeHtml(h.end || 'present')})</li>`).join('')}
          </ul>
        </details>
      `;
    }

    html += `
        <div class="feature-vet-tips">
          <div class="feature-vet-tips-title">Good to know</div>
          <div class="feature-vet-tips-text" id="vet-fact">${FACTS[currentFactIndex]}</div>
        </div>

        <div class="feature-vet-toast-container" id="vet-toast-container"></div>
      </div>
    `;

    container.innerHTML = html;

    const pigCanvas = container.querySelector('#vetPigCanvas');
    startPigCanvasAnimation(pigCanvas, selectedPig, pigIsSick, state);

    const pigSelect = container.querySelector('#vetPigSelect');
    if (pigSelect) {
      pigSelect.addEventListener('change', (e) => {
        selectedPigId = e.target.value;
        lastCheckupResult = null;
        render(container, api, api.getState());
      });
    }

    const currentPigId = selectedPig ? selectedPig.id : undefined;

    const btnCheckup = container.querySelector('#btn-vet-checkup');
    if (btnCheckup) {
      btnCheckup.addEventListener('click', () => {
        const canAfford = (state.clovers || 0) >= (vetState.checkupPrice || 0);
        api.send({ type: 'vet_checkup', pigId: currentPigId });
        if (!canAfford) {
          showVetToast(container, 'Not enough clovers');
        }
      });
    }

    container.querySelectorAll('button[data-action="treat"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        api.send({ type: 'vet_treat', conditionId: e.target.closest('button').dataset.id, pigId: currentPigId });
      });
    });

    container.querySelectorAll('button[data-action="dose"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        api.send({ type: 'vet_dose', conditionId: e.target.closest('button').dataset.id, pigId: currentPigId });
      });
    });
  }

  function getSeverityColor(severity) {
    if (severity < 0.3) return 'var(--ui-moss-3)';
    if (severity < 0.7) return 'var(--ui-flame-2)';
    return 'var(--ui-brick-2)';
  }

  window.CuyHome.registerFeature({
    id: 'vet',
    title: 'Vet clinic',
    icon: 'icon-vet',
    order: 15,
    alwaysOnState: true,
    open(container, api) {
      activeContainer = container;
      activeApi = api;
      lastCheckupResult = null;
      const st = api.getState();
      const pigs = getPigsList(st);
      if (!selectedPigId || !pigs.some(p => p.id === selectedPigId)) {
        selectedPigId = selectDefaultPigId(st, pigs);
      }
      render(container, api, st);

      factInterval = setInterval(() => {
        currentFactIndex = (currentFactIndex + 1) % FACTS.length;
        const factEl = container.querySelector('#vet-fact');
        if (factEl) {
          factEl.style.opacity = '0';
          setTimeout(() => {
            if (factEl) {
              factEl.textContent = FACTS[currentFactIndex];
              factEl.style.opacity = '1';
            }
          }, 300);
        }
      }, 5000);

      const offToast = api.onMessage('toast', (msg) => {
        if (msg && msg.text && activeContainer) {
          showVetToast(activeContainer, msg.text);
        }
      });
      unregisterCallbacks.push(offToast);

      const offCheckup = api.onMessage('vet_checkup_result', (msg) => {
        lastCheckupResult = msg;
        if (activeContainer && activeApi) {
          render(activeContainer, activeApi, activeApi.getState());
        }
      });
      unregisterCallbacks.push(offCheckup);
    },
    close() {
      stopPigAnimation();
      if (factInterval) {
        clearInterval(factInterval);
        factInterval = null;
      }
      unregisterCallbacks.forEach(fn => {
        try { fn(); } catch (e) {}
      });
      unregisterCallbacks = [];
      lastCheckupResult = null;
      activeContainer = null;
      activeApi = null;
      this._lastSig = null;
    },
    onState(state, container, api) {
      updateVetAlertBanner(state);

      const c = container || activeContainer;
      const a = api || activeApi;
      if (c && c.offsetParent !== null) {
        const sig = JSON.stringify((state && state.vet) || null)
          + '|' + ((state && state.clovers) || 0)
          + '|' + JSON.stringify((state && state.roster) ? state.roster.map(p => [p && p.id, p && p.name, p && p.stage, p && p.breed, p && p.paletteId]) : null)
          + '|' + (selectedPigId || '');
        if (sig !== this._lastSig) {
          this._lastSig = sig;
          render(c, a, state);
        }
      }
    }
  });

  if (window.CuyHome && window.CuyHome.api && typeof window.CuyHome.api.getState === 'function') {
    updateVetAlertBanner(window.CuyHome.api.getState());
  }
})();
