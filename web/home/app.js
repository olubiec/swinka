/**
 * app.js — Main controller of the Cuy Home interface.
 * Ties together the bridge (bridge.js), the canvas animation (canvas-pig.js), sounds (sound.js)
 * and the dynamic needs screen, bars, buttons and dialogs.
 */

(function () {
  'use strict';

  // DOM element references
  let canvasPig = null;
  const elements = {
    petName: document.getElementById('petName'),
    petAge: document.getElementById('petAge'),
    stageBadge: document.getElementById('stageBadge'),
    bondIndicator: document.getElementById('bondIndicator'),
    cloverCount: document.getElementById('cloverCount'),
    healthPercent: document.getElementById('healthPercent'),
    
    // Need bars
    bars: {
      fullness:    { fill: document.getElementById('barFullness'),    val: document.getElementById('valFullness') },
      vitaminC:    { fill: document.getElementById('barVitaminC'),    val: document.getElementById('valVitaminC') },
      energy:      { fill: document.getElementById('barEnergy'),      val: document.getElementById('valEnergy') },
      mood:        { fill: document.getElementById('barMood'),        val: document.getElementById('valMood') },
      cleanliness: { fill: document.getElementById('barCleanliness'), val: document.getElementById('valCleanliness') },
      teeth:       { fill: document.getElementById('barTeeth'),       val: document.getElementById('valTeeth') }
    },

    // Action buttons
    btnFeed: document.getElementById('btnFeed'),
    hayRackMini: document.getElementById('hayRackMini'),
    hayRackMiniFill: document.getElementById('hayRackMiniFill'),
    btnClean: document.getElementById('btnClean'),
    btnCall: document.getElementById('btnCall'),
    btnShop: document.getElementById('btnShop'),
    btnMinigames: document.getElementById('btnMinigames'),
    btnMore: document.getElementById('btnMore'),

    // Food drawer
    foodDrawer: document.getElementById('foodDrawer'),
    foodGrid: document.getElementById('foodGrid'),
    foodEmpty: document.getElementById('foodEmpty'),
    foodDrawerClose: document.getElementById('foodDrawerClose'),

    // Top controls
    btnSound: document.getElementById('btnSound'),
    btnDevTest: document.getElementById('btnDevTest'),
    btnClose: document.getElementById('btnClose'),

    // Modale
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalCloseBtn: document.getElementById('modalCloseBtn')
  };

  // Simple toast UI
  function showToast(text) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalToast';
      Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#2b1712',
        color: '#eedb7c',
        padding: '8px 16px',
        borderRadius: '8px',
        border: '2px solid #523023',
        fontFamily: '"Pixelify Sans", sans-serif',
        fontSize: '14px',
        zIndex: '10000',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out'
      });
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.opacity = '1';

    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
      toast.style.opacity = '0';
    }, 2500);
  }

  // UI assets (9-slice frames and --ui-* variables) from lib/ui-assets.js.
  // The script is inserted here when index.html does not list it.
  function applyUiAssets() {
    const apply = () => {
      try {
        window.UiAssets.apply(document.documentElement);
      } catch (err) {
        console.error('[app] UI assets not applied', err);
      }
    };
    if (window.UiAssets) { apply(); return; }
    const script = document.createElement('script');
    script.src = 'lib/ui-assets.js';
    script.onload = apply;
    script.onerror = () => console.error('[app] Failed to load lib/ui-assets.js');
    document.head.appendChild(script);
  }

  // Home pig light (docs/SWIATLO_SWINEK.md): the ambient of the local hour from assets/data/lights.json, refreshed once a minute.
  let pigLightData = null;
  function refreshPigLight() {
    if (!canvasPig || !pigLightData || !window.Lights) return;
    const period = window.Lights.periodOf(new Date());
    canvasPig.setLightScene({ ambient: window.Lights.ambientFor(pigLightData, period), sources: [] });
  }
  function initPigLight() {
    const isWebView = !!(window.chrome && window.chrome.webview);
    const base = isWebView ? 'https://cuy.assets/' : '../../assets/';
    fetch(base + 'data/lights.json')
      .then(r => (r.ok ? r.json() : null))
      .then(j => { pigLightData = j; refreshPigLight(); })
      .catch(() => { pigLightData = null; });
    setInterval(refreshPigLight, 60000);
  }

  // App initialisation
  function init() {
    applyUiAssets();

    // Set the icon sheet from assets depending on WebView2 / a normal browser
    const isWebView = !!(window.chrome && window.chrome.webview);
    const iconsUrl = isWebView ? 'https://cuy.assets/icons/icons_16.png' : '../../assets/icons/icons_16.png';
    document.documentElement.style.setProperty('--icons-sheet', `url('${iconsUrl}')`);

    // The test panel is only for development in a normal browser.
    if (isWebView && elements.btnDevTest) elements.btnDevTest.style.display = 'none';

    // Initialise the pig canvas
    const canvasEl = document.getElementById('pigCanvas');
    if (canvasEl && window.PigCanvas) {
      canvasPig = new window.PigCanvas(canvasEl);
      initPigLight();
    }

    // bridge.js failed to load: say so instead of leaving every action silently dead.
    if (window.__cuyBridgeFailed || !window.bridge) {
      const notice = document.createElement('div');
      notice.setAttribute('role', 'alert');
      notice.textContent = 'Nie udało się załadować gry. Akcje są wyłączone. Odśwież stronę.';
      notice.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;padding:10px 12px;background:#47281c;color:#fbf0d9;border-radius:6px;z-index:9999;text-align:center;';
      document.body.appendChild(notice);
    }
    // Hook up the bridge listener (works both in WebView2 and in the mock)
    if (window.bridge) {
      window.bridge.onState(updateStateUI);
      if (window.CuyHome && window.CuyHome.api) {
        window.CuyHome.api.onMessage('toast', m => showToast(m.text));
      }
    }

    bindButtons();
    bindOnboarding();
    updateSoundButtonUI();
    buildPlacesBar();
  }

  // ---- First run: welcome -> intro -> gift letter ----
  const onboard = { introActive: false, introStep: 0, letterClosed: false, nameSent: false, renaming: false };

  function showOnly(id) {
    ['welcome', 'intro', 'letter'].forEach((v) => {
      const el = document.getElementById(v);
      if (el) el.hidden = (v !== id);
    });
  }

  function updateOnboarding(state) {
    if (onboard.renaming) {
      showOnly('welcome');
    } else if (state.needsNaming && !onboard.nameSent) {
      if (document.getElementById('welcome')?.hidden) {
        showOnly('welcome');
        document.getElementById('nameInput')?.focus();
      }
    } else if (onboard.introActive) {
      showOnly('intro');
    } else if (state.giftNote && !onboard.letterClosed) {
      const text = document.getElementById('letterText');
      if (text && text.textContent !== state.giftNote) text.textContent = state.giftNote;
      showOnly('letter');
    } else {
      showOnly(null);
    }
  }

  // Admin console: Ctrl+Shift+A -> "unlockall" or "clovers 5000"
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a')) return;
    const text = (window.prompt('Admin: unlockall | clovers <n> | age baby|junior|adult|senior|legend|<pig days>') || '').trim().toLowerCase();
    const a = /^age\s+([\w.]+)$/.exec(text);
    if (a) { window.bridge.send({ type: 'admin', cmd: 'age', arg: a[1] }); return; }
    const m = /^(unlockall|clovers)(?:\s+(\d+))?$/.exec(text);
    if (m) window.bridge.send({ type: 'admin', cmd: m[1], amount: m[2] ? parseInt(m[2], 10) : 0 });
  });

  function submitName() {
    const input = document.getElementById('nameInput');
    const error = document.getElementById('nameError');
    const name = (input.value || '').trim().replace(/\s+/g, ' ');
    if (name.toLowerCase() === '/admin') {
      window.bridge.send({ type: 'admin', cmd: 'unlockall' });
      input.value = '';
      return;
    }
    if (!name || !/^[\p{L}\p{N} ]+$/u.test(name)) {
      error.hidden = false;
      return;
    }
    error.hidden = true;
    if (onboard.renaming) {
      // Rename from the Home header: no intro, just save the name.
      onboard.renaming = false;
      window.bridge.send({ type: 'setName', name: name });
      const state = window.bridge.currentState;
      if (state) updateOnboarding(state); else showOnly(null);
      return;
    }
    onboard.nameSent = true;
    onboard.introActive = true;
    onboard.introStep = 0;
    showIntroStep();
    window.bridge.send({ type: 'setName', name: name });
  }

  function showIntroStep() {
    const introCount = document.querySelectorAll('.intro-card').length;
    for (let i = 0; i < introCount; i++) {
      const card = document.getElementById('introCard' + i);
      if (card) card.hidden = (i !== onboard.introStep);
    }
    const btn = document.getElementById('btnIntroNext');
    if (btn) btn.textContent = onboard.introStep === introCount - 1 ? 'Start' : 'Next';
    showOnly('intro');
  }

  function setWelcomeMode(rename) {
    const title = document.getElementById('welcomeTitle');
    const text = document.getElementById('welcomeText');
    const go = document.getElementById('btnNameGo');
    const cancel = document.getElementById('btnNameCancel');
    if (title) title.textContent = rename ? 'New name' : 'Welcome!';
    if (text) text.textContent = rename ? 'What should your guinea pig be called?' : 'Your guinea pig has arrived. What will you call it?';
    if (go) go.textContent = rename ? 'Save' : "Let's go";
    if (cancel) cancel.hidden = !rename;
  }

  function startRename() {
    const state = window.bridge ? window.bridge.currentState : null;
    if (state && state.needsNaming) return; // first-run naming is already on screen
    onboard.renaming = true;
    setWelcomeMode(true);
    const input = document.getElementById('nameInput');
    if (input) input.value = (state && state.name) || '';
    document.getElementById('nameError').hidden = true;
    showOnly('welcome');
    input?.focus();
    input?.select();
  }

  // Closes Home so the pig comes out onto the desktop (end of the first-run flow).
  function closeHomeAfterOnboarding() {
    if (window.bridge && window.bridge.isWebView2) {
      setTimeout(() => window.bridge.send({ type: 'settings', action: 'close' }), 400);
    }
  }

  function finishIntro() {
    onboard.introActive = false;
    setWelcomeMode(false);
    const state = window.bridge.currentState;
    if (state) updateOnboarding(state); else showOnly(null);
    // No gift letter waiting: the tutorial is over, the pig goes out to the taskbar.
    if (!(state && state.giftNote && !onboard.letterClosed)) closeHomeAfterOnboarding();
  }

  function bindOnboarding() {
    document.getElementById('petName')?.addEventListener('click', startRename);
    document.getElementById('petName')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startRename();
    });
    document.getElementById('btnNameCancel')?.addEventListener('click', () => {
      onboard.renaming = false;
      setWelcomeMode(false);
      const state = window.bridge.currentState;
      if (state) updateOnboarding(state); else showOnly(null);
    });
    document.getElementById('btnIntroSkip')?.addEventListener('click', finishIntro);
    document.getElementById('btnNameGo')?.addEventListener('click', submitName);
    document.getElementById('nameInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitName();
    });
    document.getElementById('btnIntroNext')?.addEventListener('click', () => {
      if (onboard.introStep < document.querySelectorAll('.intro-card').length - 1) {
        onboard.introStep++;
        showIntroStep();
      } else {
        finishIntro();
      }
    });
    document.getElementById('btnLetterClose')?.addEventListener('click', () => {
      onboard.letterClosed = true;
      showOnly(null);
      window.bridge.send({ type: 'giftNoteShown' });
      closeHomeAfterOnboarding();
    });
  }

    // Update the UI on every game state change
  function updateStateUI(state) {
    if (!state) return;
    loadFeatures(state);
    renderPlacesBar(state);
    if (window.CuyPlaces && typeof window.CuyPlaces.updateStageNav === 'function') {
      window.CuyPlaces.updateStageNav();
    }

    // Broadcast state to currently open feature (or background listeners)
    window.CuyHome.listFeatures().forEach(feat => {
      if (feat.onState) {
        const isActive = (window.CuyHome && window.CuyHome.currentFeatureId === feat.id);
        const isAlways = Boolean(feat.alwaysOnState || feat.id === 'daily' || feat.id === 'decor' || feat.id === 'places');
        if (isActive || isAlways) {
          try {
            feat.onState(state);
          } catch (err) {
            console.error('[feature ' + feat.id + '] onState', err);
          }
        }
      }
    });

    updateOnboarding(state);

    // Pig profile
    if (elements.petName) elements.petName.textContent = state.name || 'Cuy';
    if (elements.petAge) {
      elements.petAge.textContent = state.age?.text ? `Age: ${state.age.text}` : 'Age: 1 day';
    }

    // Life stage
    if (elements.stageBadge) {
      const stageName = state.stageName || 'Baby';
      const stageKey = state.stageKey || 'adult';
      elements.stageBadge.innerHTML = getStageIcon(stageKey) + ' ' + stageName;
      elements.stageBadge.className = `stage-badge stage-${stageKey}`;
    }

    // Bond
    if (elements.bondIndicator && state.bond) {
      const b = state.bond;
      const next = state.bondNext;
      let pct = 100;
      let subText = 'all unlocked';
      if (next && typeof next.pointsToNext === 'number') {
        const total = (b.points || 0) + next.pointsToNext;
        pct = total > 0 ? Math.min(100, Math.max(0, Math.round(((b.points || 0) / total) * 100))) : 0;
        subText = `next: ${next.title || next.id} (${next.pointsToNext} pts)`;
      }
      elements.bondIndicator.innerHTML = `
        <div class="bond-header"><span class="pixel-icon icon-heart"></span> Bond: Lv. ${b.level}</div>
        <div class="bond-bar-track"><div class="bond-bar-fill" style="width: ${pct}%"></div></div>
        <div class="bond-sub">${subText}</div>
      `;
    }

    // Clovers (currency)
    if (elements.cloverCount) {
      elements.cloverCount.textContent = state.clovers ?? 0;
    }

    // Hay rack indicator on Feed button
    if (elements.hayRackMini && elements.hayRackMiniFill) {
      if (state.hayRack && typeof state.hayRack.value === 'number' && state.hayRack.max > 0) {
        elements.hayRackMini.style.display = 'block';
        const frac = Math.max(0, Math.min(1, state.hayRack.value / state.hayRack.max));
        const pct = Math.round(frac * 100);
        elements.hayRackMiniFill.style.width = pct + '%';
        if (frac < 0.25) {
          elements.hayRackMiniFill.classList.add('low');
          elements.hayRackMini.title = 'Hay rack is almost empty';
        } else {
          elements.hayRackMiniFill.classList.remove('low');
          elements.hayRackMini.title = `Hay rack: ${state.hayRack.value}/${state.hayRack.max}`;
        }
      } else {
        elements.hayRackMini.style.display = 'none';
      }
    }

    // Overall health
    if (elements.healthPercent) {
      let hp = state.needs?.health;
      if (state.vet && state.vet.healthDisplay !== undefined) hp = state.vet.healthDisplay;
      else if (state.healthDisplay !== undefined) hp = state.healthDisplay;

      if (hp !== undefined) {
        elements.healthPercent.textContent = `${Math.round(hp)}%`;
      }
    }

    // The 6 need bars with level-dependent colours
    if (state.needs) {
      updateNeedBar('fullness', state.needs.fullness);
      updateNeedBar('vitaminC', state.needs.vitaminC);
      updateNeedBar('energy', state.needs.energy);
      updateNeedBar('mood', state.needs.mood);
      updateNeedBar('cleanliness', state.needs.cleanliness);
      updateNeedBar('teeth', state.needs.teeth);
    }

    // Inventory in the food drawer
    if (state.inventory) {
      if (elements.foodDrawer?.classList.contains('active')) renderFoodDrawer(state);
    }

    // Update the canvas
    if (canvasPig) {
      canvasPig.updateState(state);
    }
  }

  function getStageIcon(key) {
    switch (key) {
      case 'baby': return '<span class="pixel-icon icon-stage-baby"></span>';
      case 'junior': return '<span class="pixel-icon icon-stage-junior"></span>';
      case 'adult': return '<span class="pixel-icon icon-stage-adult"></span>';
      case 'senior': return '<span class="pixel-icon icon-stage-senior"></span>';
      case 'legend': return '<span class="pixel-icon icon-stage-legend"></span>';
      default: return '<span class="pixel-icon icon-stage-baby"></span>';
    }
  }

  // Update a single need bar:
  // Colour by level: >65% green, 35-65% yellow, <35% red (warning)
  function updateNeedBar(key, rawValue) {
    const bar = elements.bars[key];
    if (!bar || !bar.fill) return;

    const val = Math.max(0, Math.min(100, Math.round(rawValue || 0)));
    bar.fill.style.width = `${val}%`;
    if (bar.val) bar.val.textContent = `${val}%`;

    bar.fill.classList.remove('level-high', 'level-mid', 'level-low');
    if (val >= 65) {
      bar.fill.classList.add('level-high');
    } else if (val >= 35) {
      bar.fill.classList.add('level-mid');
    } else {
      bar.fill.classList.add('level-low');
    }
  }

  // ---- Food drawer ----
  // Food that can be given from Home (same ids and order as assets/data/items.json).
  const FOODS = [
    { id: 'hay',           name: 'Hay',           icon: 'icon-hay' },
    { id: 'pellets',       name: 'Pellets',       icon: 'icon-pellets' },
    { id: 'bell_pepper',   name: 'Bell pepper',   icon: 'icon-bell-pepper' },
    { id: 'parsley',       name: 'Parsley',       icon: 'icon-parsley' },
    { id: 'kale',          name: 'Kale',          icon: 'icon-kale' },
    { id: 'cucumber',      name: 'Cucumber',      icon: 'icon-cucumber' },
    { id: 'carrot',        name: 'Carrot',        icon: 'icon-carrot' },
    { id: 'chew_stick',    name: 'Chew stick',    icon: 'icon-chew-stick' },
    { id: 'dandelion',     name: 'Dandelion',     icon: 'icon-dandelion' },
    { id: 'apple',         name: 'Apple',         icon: 'icon-apple' },
    { id: 'strawberry',    name: 'Strawberry',    icon: 'icon-strawberry' },
    { id: 'vitamin_drops', name: 'Vitamin drops', icon: 'icon-vitamin-drops' }
  ];

  function closeFoodDrawer() {
    elements.foodDrawer?.classList.remove('active');
  }

  function renderFoodDrawer(state) {
    if (!elements.foodGrid) return;
    const inv = (state && state.inventory) || {};
    const list = FOODS.filter((f) => f.id === 'hay' || (inv[f.id] || 0) > 0);
    elements.foodGrid.innerHTML = list.map((f) => `
      <button class="food-item-btn" type="button" data-food="${f.id}">
        <span class="pixel-icon x1_5 ${f.icon}" aria-hidden="true"></span>
        <span>${f.name}</span>
        <span class="food-qty">${f.id === 'hay' ? 'free' : 'x' + inv[f.id]}</span>
      </button>`).join('');
    if (elements.foodEmpty) elements.foodEmpty.hidden = list.length > 1;
    elements.foodGrid.querySelectorAll('.food-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => giveFood(btn.dataset.food));
    });
  }

  function giveFood(food) {
    const state = window.bridge ? window.bridge.getState() : null;
    const fullness = state?.needs?.fullness;
    if (typeof fullness === 'number' && fullness >= 95) {
      // The game refuses food when the pig is full; say so here too.
      if (canvasPig) canvasPig.showBubble("I'm full!", 1800);
      closeFoodDrawer();
      return;
    }
    if (window.Sound) window.Sound.crunch();
    if (canvasPig) {
      canvasPig.playAnim(food === 'hay' ? 'eat' : 'eat_treat', 3500);
      canvasPig.showBubble('Yum! Crunch crunch!', 2500);
      canvasPig.spawnCrunch(canvasPig.pigX + 40, canvasPig.pigY + 50);
    }
    if (window.bridge) window.bridge.send({ type: 'feed', item: food });
    closeFoodDrawer();
  }

  // UI button handlers
  function bindButtons() {
    // 1. FEED — opens the food drawer above the buttons (× / Feed again / Esc closes it)
    elements.btnFeed?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      if (elements.foodDrawer.classList.contains('active')) {
        closeFoodDrawer();
        return;
      }
      renderFoodDrawer(window.bridge ? window.bridge.getState() : null);
      elements.foodDrawer.classList.add('active');
      if (canvasPig) {
        canvasPig.playAnim('beg', 2000);
        canvasPig.showBubble('Something tasty? Wheek!', 2000);
      }
    });
    elements.foodDrawerClose?.addEventListener('click', closeFoodDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeFoodDrawer();
    });

    // 2. CLEAN — cleans the cage and poops, +1 clover
    elements.btnClean?.addEventListener('click', () => {
      const cleanState = window.bridge ? window.bridge.getState() : null;
      const hasPoops = !cleanState || (cleanState.poops || 0) > 0;
      if (!hasPoops) {
        // Nothing to clean: no reward (the game ignores it too).
        if (canvasPig) canvasPig.showBubble('Already clean!', 1800);
        return;
      }
      if (window.Sound) window.Sound.sweep();
      if (canvasPig) {
        canvasPig.playAnim('happy', 2500);
        canvasPig.showBubble('All clean and fresh!', 2500);
        canvasPig.spawnHeart(canvasPig.pigX + 32, canvasPig.pigY + 20);
      }

      if (window.bridge) {
        window.bridge.send({ type: 'clean' });
      }
    });

    // 3. CALL — the pig answers with a happy wheek and runs over
    elements.btnCall?.addEventListener('click', () => {
      if (window.Sound) window.Sound.wheek();
      if (canvasPig) {
        canvasPig.playAnim('greet', 3000);
        canvasPig.showBubble('WHEEEE! I\'m here!', 2800);
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            canvasPig.spawnHeart(canvasPig.pigX + 20 + Math.random() * 25, canvasPig.pigY + 15);
          }, i * 200);
        }
      }

      if (window.bridge) {
        window.bridge.send({ type: 'call' });
      }
    });

    // 4. SHOP — opens the retro shop dialog
    elements.btnShop?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      if (window.CuyHome) window.CuyHome.openFeature('shop');
    });

    // 5. GAMES — opens the retro minigames dialog
    elements.btnMinigames?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      openMinigamesModal();
    });

    // 6. ALBUM — opens the retro behaviour sticker dialog
    elements.btnMore?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      openMoreModal();
    });

    // Sound on/off
    elements.btnSound?.addEventListener('click', () => {
      if (window.Sound) {
        window.Sound.isMuted = !window.Sound.isMuted;
        if (!window.Sound.isMuted) window.Sound.click();
        updateSoundButtonUI();
      }
    });

    // Test panel (mock / dev)
    elements.btnDevTest?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      openDevTestModal();
    });

    // Close the window (in WebView2) or hide it
    if (elements.btnClose) {
      elements.btnClose.classList.add('ui-close');
      elements.btnClose.setAttribute('aria-label', 'Close');
      elements.btnClose.textContent = '';
    }
    elements.btnClose?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      if (window.Minigry && window.Minigry.activeGame) {
        window.Minigry.pause();
      }
      if (window.bridge && window.bridge.isWebView2) {
        window.bridge.send({ type: 'settings', action: 'close' });
      } else {
        if (canvasPig) canvasPig.showBubble('See you soon! Bye!', 2000);
      }
    });

    // Close the dialog
    if (elements.modalCloseBtn) {
      elements.modalCloseBtn.classList.add('ui-close');
      elements.modalCloseBtn.setAttribute('aria-label', 'Close');
      elements.modalCloseBtn.textContent = '';
    }
    elements.modalCloseBtn?.addEventListener('click', closeModal);
    elements.modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === elements.modalBackdrop) closeModal();
    });

    const foodClose = document.getElementById('foodDrawerClose');
    if (foodClose) {
      foodClose.classList.add('ui-close');
      foodClose.setAttribute('aria-label', 'Close');
      foodClose.textContent = '';
    }

    function sanitizeUiControls() {
      const controls = document.querySelectorAll(
        '.ui-close, .ui-back, .ui-arrow-left, .ui-arrow-right, .modal-close-btn, .modal-back, #modalCloseBtn, #btnClose, #foodDrawerClose, #placesPrevBtn, #placesNextBtn'
      );
      controls.forEach((btn) => {
        if (btn.childNodes.length > 0 && btn.textContent !== '') {
          btn.textContent = '';
        }
      });
    }
    sanitizeUiControls();

    // Escape: closes an open dialog or the Home window
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // A feature (e.g. the Rooms plan) already used this Escape for its own overlay.
        if (e.defaultPrevented) return;
        if (elements.modalBackdrop && elements.modalBackdrop.classList.contains('active')) {
          closeModal();
        } else if (window.bridge && window.bridge.isWebView2) {
          window.bridge.send({ type: 'settings', action: 'close' });
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement && document.activeElement.isContentEditable)) return;
        if (elements.modalBackdrop && elements.modalBackdrop.classList.contains('active')) return;
        if (e.key === 'ArrowLeft') {
          if (window.CuyPlaces && typeof window.CuyPlaces.prev === 'function') {
            window.CuyPlaces.prev();
          }
        } else if (e.key === 'ArrowRight') {
          if (window.CuyPlaces && typeof window.CuyPlaces.next === 'function') {
            window.CuyPlaces.next();
          }
        }
      }
    });
  }

  function updateSoundButtonUI() {
    if (!elements.btnSound || !window.Sound) return;
    elements.btnSound.innerHTML = window.Sound.isMuted ? '<span class="pixel-icon icon-sound-off"></span>' : '<span class="pixel-icon icon-sound-on"></span>';
    elements.btnSound.title = window.Sound.isMuted ? 'Turn sounds on' : 'Mute sounds';
  }


  // --- PLACES BAR (PK-P36a): Main window scene switching bar ---
  function buildPlacesBar() {
    let bar = document.getElementById('placesBar');
    if (!bar) {
      const stage = document.querySelector('.stage-viewport');
      if (!stage) return;
      bar = document.createElement('div');
      bar.id = 'placesBar';
      bar.className = 'places-bar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'Scene navigation');
      bar.innerHTML = '<button type="button" class="ui-arrow-left" id="placesPrevBtn" aria-label="Previous place"></button>' +
        '<div class="places-bar-title" id="placesBarTitle">Salon</div>' +
        '<button type="button" class="ui-arrow-right" id="placesNextBtn" aria-label="Next place"></button>';
      stage.parentNode.insertBefore(bar, stage);

      const hint = document.createElement('div');
      hint.id = 'placesLockedHint';
      hint.className = 'places-locked-hint';
      hint.hidden = true;
      hint.innerHTML = '<span class="pixel-icon icon-padlock" aria-hidden="true"></span><span class="places-hint-text" id="placesHintText"></span>';
      stage.parentNode.insertBefore(hint, stage);

      const chips = document.getElementById('placesPresenceChips') || document.createElement('div');
      chips.id = 'placesPresenceChips';
      chips.className = 'places-presence-chips';
      chips.hidden = true;
      if (chips.parentNode !== stage) stage.appendChild(chips);
    }

    const prevBtn = document.getElementById('placesPrevBtn');
    if (prevBtn && !prevBtn._bound) {
      prevBtn._bound = true;
      prevBtn.addEventListener('click', () => {
        if (window.CuyPlaces && typeof window.CuyPlaces.prev === 'function') {
          window.CuyPlaces.prev();
        }
      });
    }

    const nextBtn = document.getElementById('placesNextBtn');
    if (nextBtn && !nextBtn._bound) {
      nextBtn._bound = true;
      nextBtn.addEventListener('click', () => {
        if (window.CuyPlaces && typeof window.CuyPlaces.next === 'function') {
          window.CuyPlaces.next();
        }
      });
    }
  }

  function renderPlacesBar(state) {
    buildPlacesBar();
    if (window.CuyPlaces && typeof window.CuyPlaces.updateStageNav === 'function') {
      window.CuyPlaces.updateStageNav(state);
    }
  }

  function removeBackBtn() {
    const existing = document.querySelector('.modal-back');
    if (existing) existing.remove();
  }

  function showBackBtn() {
    removeBackBtn();
    const header = elements.modalTitle ? elements.modalTitle.parentElement : null;
    if (!header) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-back modal-back';
    btn.setAttribute('aria-label', 'Back');
    btn.textContent = '';
    btn.addEventListener('click', () => {
      removeBackBtn();
      window.CuyHome.closeFeature({ keepBackdrop: true });
      openMoreModal();
    });
    header.insertBefore(btn, elements.modalTitle);
  }

  // --- FEATURES MODULE SYSTEM ---
  window.CuyHome = {
    features: [],
    registerFeature(def) {
      this.features.push(def);
      this.features.sort((a, b) => (a.order || 99) - (b.order || 99));
    },
    listFeatures() {
      return this.features.filter(f => f && f.id !== 'rooms' && f.id !== 'garden');
    },
    openFeature(id, arg, opts) {
      if (arg && typeof arg === 'object' && !opts && ('from' in arg)) {
        opts = arg;
        arg = undefined;
      }
      if (id === 'rooms' || id === 'garden') {
        this.closeFeature();
        if (typeof closeModal === 'function') closeModal();
        if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
          window.CuyPlaces.openPlace(id === 'rooms' ? (arg || 'salon') : 'garden');
        }
        return;
      }
      this.closeFeature({ keepBackdrop: true });
      const feat = this.features.find(f => f.id === id);
      if (!feat) return;
      openModal(feat.title, '');
      if (opts && opts.from === 'more') {
        showBackBtn();
      } else {
        removeBackBtn();
      }
      if (elements.modalBody) {
        elements.modalBody.className = 'modal-body feature-' + id;
        try {
          feat.open(elements.modalBody, this.api, arg);
        } catch (err) {
          console.error('[feature ' + id + ']', err);
        }
      }
      this.currentFeatureId = id;
    },
    closeFeature(opts) {
      if (this.currentFeatureId) {
        const feat = this.features.find(f => f.id === this.currentFeatureId);
        if (feat && feat.close) {
          try { feat.close(); } catch (e) { console.error('[feature ' + this.currentFeatureId + '] close', e); }
        }
        this.currentFeatureId = null;
      }
      if (!opts || !opts.keepBackdrop) {
        if (elements.modalBackdrop) elements.modalBackdrop.classList.remove('active');
      }
      if (elements.modalBody) {
        elements.modalBody.className = 'modal-body';
        elements.modalBody.innerHTML = '';
        elements.modalBody.removeAttribute('data-place');
      }
    },
    api: {
      send(msg) { if (window.bridge) window.bridge.send(msg); },
      getState() { return window.bridge ? window.bridge.getState() : null; },
      onState(cb) { return window.bridge ? window.bridge.onState(cb) : () => {}; },
      onMessage(type, cb) { return window.bridge ? window.bridge.onMessage(type, cb) : () => {}; },
      showBubble(text, ms) { if (canvasPig) canvasPig.showBubble(text, ms); },
      playAnim(name, ms) { if (canvasPig) canvasPig.playAnim(name, ms); },
      sound: typeof window !== 'undefined' ? window.Sound : null,
      assetUrl(rel) {
        const isWebView = !!(window.chrome && window.chrome.webview);
        return isWebView ? 'https://cuy.assets/' + rel : '../../assets/' + rel;
      }
    }
  };

  // --- RETIRE ROOMS / GARDEN (PK-P40d) ---
  function upgradePlace(id) {
    if (window.bridge && typeof window.bridge.send === 'function') {
      window.bridge.send({ type: 'place_upgrade', id: id });
    }
  }

  function unlockPlace(id) {
    if (window.bridge && typeof window.bridge.send === 'function') {
      window.bridge.send({ type: 'place_unlock', id: id });
    }
  }

  function wrapCuyPlaces(target) {
    if (!target || typeof target !== 'object') target = {};
    if (!target.upgrade) target.upgrade = upgradePlace;
    if (!target.unlock) target.unlock = unlockPlace;
    if (target.openPlace) {
      if (!target.openPlace._retireWrapped) {
        const origOpen = target.openPlace;
        target.openPlace = function (placeId, roomArg) {
          if (window.CuyHome && typeof window.CuyHome.closeFeature === 'function') {
            window.CuyHome.closeFeature();
          }
          if (typeof closeModal === 'function') {
            closeModal();
          }
          return origOpen.apply(this, arguments);
        };
        target.openPlace._retireWrapped = true;
      }
    } else {
      target.openPlace = function (placeId, roomArg) {
        if (window.CuyHome && typeof window.CuyHome.closeFeature === 'function') {
          window.CuyHome.closeFeature();
        }
        if (typeof closeModal === 'function') {
          closeModal();
        }
      };
      target.openPlace._retireWrapped = true;
    }
    return target;
  }

  let _cuyPlacesInstance = wrapCuyPlaces(window.CuyPlaces || {});
  try {
    Object.defineProperty(window, 'CuyPlaces', {
      configurable: true,
      enumerable: true,
      get() {
        return _cuyPlacesInstance;
      },
      set(val) {
        _cuyPlacesInstance = wrapCuyPlaces(val);
      }
    });
  } catch (e) {
    window.CuyPlaces = _cuyPlacesInstance;
  }

  function openMoreModal() {
    removeBackBtn();
    if (window.CuyHome) window.CuyHome.closeFeature({ keepBackdrop: true });
    let html = `<div class="album-grid">`;

    // Always include Album first
    html += `
      <button class="shop-item" data-open-feature="album" style="justify-content:center;">
        <span class="pixel-icon icon-house x2"></span>
        <span class="shop-name">Album</span>
      </button>
      <div class="ui-sep-h" aria-hidden="true"></div>
    `;

    // Then registered features
    window.CuyHome.listFeatures().forEach(feat => {
      if (!feat || feat.id === 'rooms' || feat.id === 'garden') return;
      let iconHtml = '';
      if (feat.icon) {
        if (feat.icon.startsWith('icon-')) {
          iconHtml = `<span class="pixel-icon ${feat.icon} x2"></span>`;
        } else {
          iconHtml = `<span style="font-size:32px;line-height:1">${feat.icon}</span>`;
        }
      }
      html += `
        <button class="shop-item" data-open-feature="${feat.id}" style="justify-content:center;">
          ${iconHtml}
          <span class="shop-name">${feat.title}</span>
        </button>
      `;
    });

    html += `</div>`;
    openModal('More', html);

    // Bind clicks
    if (elements.modalBody) {
      elements.modalBody.querySelectorAll('button[data-open-feature]').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.openFeature;
          if (id === 'album') {
            if (window.bridge) window.bridge.send({ type: 'album' });
            openAlbumModal({ from: 'more' });
          } else {
            window.CuyHome.openFeature(id, null, { from: 'more' });
          }
        });
      });
    }
  }

  function loadFeatures(state) {
    if (window.CuyHome._featuresLoaded) return;
    window.CuyHome._featuresLoaded = true;

    let featureList = [];
    const isWebView = !!(window.chrome && window.chrome.webview);

    const loadFromList = (list) => {
      list.forEach(id => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'features/' + id + '/feature.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'features/' + id + '/feature.js';
        document.body.appendChild(script);
        if (window.bridge && window.bridge.isMock) {
          const mockScript = document.createElement('script');
          mockScript.src = 'features/' + id + '/mock.js';
          mockScript.onerror = () => {};
          document.body.appendChild(mockScript);
        }
      });
    };

    if (isWebView && state && state.features) {
      loadFromList(state.features);
    } else {
      fetch('features/index.json')
        .then(res => res.json())
        .then(list => loadFromList(list))
        .catch(err => console.error('Error loading features/index.json:', err));
    }
  }

  // --- MODALE ---

  let modalOpener = null;

  function modalFocusables() {
    if (!elements.modalBackdrop) return [];
    return Array.from(elements.modalBackdrop.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null || el === document.activeElement);
  }

  function focusModal() {
    const first = modalFocusables()[0] || elements.modalCloseBtn;
    if (first && typeof first.focus === 'function') first.focus();
  }

  // Keeps Tab inside the open dialog (focus trap).
  function trapModalFocus(e) {
    if (e.key !== 'Tab' || !elements.modalBackdrop?.classList.contains('active')) return;
    const items = modalFocusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const inside = elements.modalBackdrop.contains(document.activeElement);
    if (e.shiftKey && (!inside || document.activeElement === first)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal(title, contentHtml) {
    if (!elements.modalBackdrop) return;
    const wasOpen = elements.modalBackdrop.classList.contains('active');
    if (!wasOpen) modalOpener = document.activeElement;
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = contentHtml;
    if (elements.modalCloseBtn) elements.modalCloseBtn.textContent = '';
    elements.modalBackdrop.classList.add('active');
    focusModal();
  }

  function closeModal() {
    if (!elements.modalBackdrop) return;
    removeBackBtn();
    if (window.Minigry) {
      try {
        if (typeof window.Minigry.leave === 'function') {
          window.Minigry.leave();
        } else if (window.Minigry.activeGame && !window.Minigry.isPaused) {
          window.Minigry.pause();
        }
      } catch (e) {}
    }
    if (window.NyanAudio && typeof window.NyanAudio.stopMusic === 'function') {
      try { window.NyanAudio.stopMusic(); } catch (e) {}
    }
    if (window.CuyMusic && (!window.Minigry || !window.Minigry.getHomeMusicState || !window.Minigry.getHomeMusicState()?.playing)) {
      if (typeof window.CuyMusic.stop === 'function') {
        try { window.CuyMusic.stop(100); } catch (e) {}
      }
    }
    if (window.CuyHome) window.CuyHome.closeFeature();
    elements.modalBackdrop.classList.remove('active');
    // Return focus to whatever opened the dialog, if it is still on the page.
    if (modalOpener && document.body.contains(modalOpener) && typeof modalOpener.focus === 'function') {
      modalOpener.focus();
    }
    modalOpener = null;
  }

  window.addEventListener('keydown', trapModalFocus);

  // Shop dialog

  // Modal Minigier
  function openMinigamesModal() {
    if (window.CuyHome) window.CuyHome.closeFeature({ keepBackdrop: true });
    openModal('Games', '');
    if (window.Minigry && elements.modalBody) {
      window.Minigry.renderSelectScreen(elements.modalBody);
    }
  }

  // Sticker album dialog
  // Behaviour album: a sticker for every behaviour the pig has shown (state.album = animation names seen).
  const STICKERS = [
      { id: 'idle', name: 'Sitting', row: 0, frame: 2 },
      { id: 'sniff', name: 'Sniffing', row: 1, frame: 2 },
      { id: 'walk', name: 'Walking', row: 2, frame: 2 },
      { id: 'run', name: 'Zoomies', row: 3, frame: 2 },
      { id: 'popcorn', name: 'Popcorning', row: 4, frame: 2 },
      { id: 'eat', name: 'Eating hay', row: 5, frame: 2 },
      { id: 'eat_treat', name: 'Crunching a treat', row: 6, frame: 2 },
      { id: 'drink', name: 'Drinking', row: 26, frame: 2 },
      { id: 'scratch', name: 'Scratching', row: 7, frame: 2 },
      { id: 'yawn', name: 'Yawning', row: 12, frame: 2 },
      { id: 'doze', name: 'Dozing', row: 10, frame: 2 },
      { id: 'sleep', name: 'Sleeping', row: 9, frame: 2 },
      { id: 'purr_pet', name: 'Purring', row: 40, frame: 2 },
      { id: 'wheek', name: 'Wheeking', row: 15, frame: 2 },
      { id: 'greet', name: 'Greeting', row: 44, frame: 2 },
      { id: 'happy', name: 'Happy', row: 17, frame: 2 },
      { id: 'beg', name: 'Begging', row: 32, frame: 2 },
      { id: 'chin_rub', name: 'Chin rub', row: 29, frame: 2 },
      { id: 'dig_hay', name: 'Digging in hay', row: 28, frame: 2 },
      { id: 'chew_stick', name: 'Chewing', row: 27, frame: 2 },
      { id: 'rumble', name: 'Rumblestrutting', row: 42, frame: 2 },
      { id: 'startle', name: 'Startled', row: 13, frame: 2 },
      { id: 'chatter', name: 'Grumpy', row: 41, frame: 2 },
      { id: 'peek', name: 'Peeking', row: 24, frame: 2 },
      { id: 'dance', name: 'Dancing', row: 16, frame: 2 },
      { id: 'flee', name: 'Running away', row: 43, frame: 2 },
      { id: 'hurdle', name: 'Jumping', row: 47, frame: 2 },
      { id: 'sleep_house', name: 'Napping in the house', row: 39, frame: 2 },
      { id: 'party', name: 'Birthday party', row: 58, frame: 2 }
  ];

  function formatShortDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    const m = parseInt(parts[1], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return parseInt(parts[2], 10) + ' ' + (months[m - 1] || '');
  }

  function openAlbumModal(opts) {
    if (window.CuyHome) window.CuyHome.closeFeature({ keepBackdrop: true });
    const state = window.bridge ? window.bridge.getState() : null;
    const seen = new Set();
    const seenDates = {};
    if (state && state.album) {
      state.album.forEach(item => {
        if (typeof item === 'string') {
          seen.add(item);
        } else if (item && item.key) {
          seen.add(item.key);
          if (item.firstSeen) seenDates[item.key] = item.firstSeen;
        }
      });
    } else {
      seen.add('idle');
      seen.add('sniff');
    }
    if (state && state.albumDates) {
      Object.assign(seenDates, state.albumDates);
    }
    // Album sprites use the active pig's stage, breed and coat palette.
    const stage = (state && state.stageKey) || 'baby';
    const look = window.CuySprites.activePig(state);
    const palSheet = window.CuySprites.sheet(look.breed, stage, look.paletteId);
    const sheet = palSheet ? palSheet.toDataURL() : window.CuySprites.path(look.breed, stage);
    const unlockedCount = STICKERS.filter((st) => seen.has(st.id)).length;

    let html = `
      <div style="background:#2b1712; color:#fffdf8; padding:5px 8px; border-radius:4px; font-weight:700;">
        Collected ${unlockedCount} / ${STICKERS.length}
      </div>
      <div class="album-grid">
    `;
    STICKERS.forEach((st) => {
      const ok = seen.has(st.id);
      const dateStr = seenDates[st.id];
      const shortDate = formatShortDate(dateStr);
      let subText = 'Not seen yet';
      if (ok) {
        subText = shortDate ? `First seen: ${shortDate}` : 'Seen';
      }

      html += `
        <div class="album-card ${ok ? '' : 'album-locked'}">
          <span class="album-sprite" style="background-image:url('${sheet}'); background-position:${-st.frame * 48}px ${-st.row * 48}px;"></span>
          <b>${ok ? st.name : '???'}</b>
          <small style="color:#6e6a5c;">${subText}</small>
        </div>
      `;
    });
    html += `</div>`;
    openModal('Behaviour Album', html);
    if (opts && opts.from === 'more') {
      showBackBtn();
    } else {
      removeBackBtn();
    }
  }

  // Developer test dialog / mock tester
  function openDevTestModal() {
    if (window.CuyHome) window.CuyHome.closeFeature({ keepBackdrop: true });
    let html = `
      <div class="test-panel-content">
        <p style="color:#6e6a5c; font-size:12px;">Test tools for checking the stage, age and bar colours:</p>
        
        <div class="test-row">
          <label>Set all needs to:</label>
          <div style="display:flex; gap:4px;">
            <button class="test-btn" id="testLow">20% (red)</button>
            <button class="test-btn" id="testMid">50% (yellow)</button>
            <button class="test-btn" id="testHigh">90% (green)</button>
          </div>
        </div>

        <div class="test-row">
          <label>Change life stage:</label>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            <button class="test-btn" data-stage="baby">Baby</button>
            <button class="test-btn" data-stage="junior">Junior</button>
            <button class="test-btn" data-stage="adult">Adult</button>
            <button class="test-btn" data-stage="senior">Senior</button>
            <button class="test-btn" data-stage="legend">Legend</button>
          </div>
        </div>

        <div class="test-row">
          <label>Clovers:</label>
          <div style="display:flex; gap:4px;">
            <button class="test-btn" id="testAddClovers">+50 <span class="pixel-icon icon-clover"></span></button>
          </div>
        </div>

        <div class="test-row" style="margin-top:8px;">
          <button class="test-btn" id="testReset" style="background:#e8564c; width:100%;">Reset to defaults</button>
        </div>
      </div>
    `;

    openModal('Test Panel (mock)', html);

    // Test click handlers
    document.getElementById('testLow')?.addEventListener('click', () => {
      ['fullness', 'vitaminC', 'energy', 'mood', 'cleanliness', 'teeth'].forEach(k => {
        window.bridge.mockSetNeed(k, 20);
      });
      closeModal();
    });

    document.getElementById('testMid')?.addEventListener('click', () => {
      ['fullness', 'vitaminC', 'energy', 'mood', 'cleanliness', 'teeth'].forEach(k => {
        window.bridge.mockSetNeed(k, 50);
      });
      closeModal();
    });

    document.getElementById('testHigh')?.addEventListener('click', () => {
      ['fullness', 'vitaminC', 'energy', 'mood', 'cleanliness', 'teeth'].forEach(k => {
        window.bridge.mockSetNeed(k, 95);
      });
      closeModal();
    });

    elements.modalBody.querySelectorAll('button[data-stage]').forEach(b => {
      b.addEventListener('click', () => {
        const s = b.dataset.stage;
        let days = 588;
        if (s === 'baby') days = 5;
        else if (s === 'junior') days = 40;
        else if (s === 'adult') days = 450;
        else if (s === 'senior') days = 1600;
        else if (s === 'legend') days = 3100;

        window.bridge.mockSetPigDays(days);
        closeModal();
      });
    });

    document.getElementById('testAddClovers')?.addEventListener('click', () => {
      const cur = window.bridge.getState();
      if (cur) {
        cur.clovers = (cur.clovers || 0) + 50;
        window.bridge.currentState = cur;
        window.bridge.saveMockState();
        window.bridge.broadcastState();
      }
      closeModal();
    });

    document.getElementById('testReset')?.addEventListener('click', () => {
      window.bridge.mockReset();
      closeModal();
    });
  }

  // Start the app once the DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
