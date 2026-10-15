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
    btnClean: document.getElementById('btnClean'),
    btnCall: document.getElementById('btnCall'),
    btnShop: document.getElementById('btnShop'),
    btnMinigames: document.getElementById('btnMinigames'),
    btnAlbum: document.getElementById('btnAlbum'),

    // Food drawer
    foodDrawer: document.getElementById('foodDrawer'),
    foodBtns: document.querySelectorAll('.food-item-btn'),
    foodQtyBellPepper: document.getElementById('foodQtyBellPepper'),
    foodQtyCarrot: document.getElementById('foodQtyCarrot'),
    foodQtyPellets: document.getElementById('foodQtyPellets'),

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

  // App initialisation
  function init() {
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
    }

    // Hook up the bridge listener (works both in WebView2 and in the mock)
    if (window.bridge) {
      window.bridge.onState(updateStateUI);
    }

    bindButtons();
    bindOnboarding();
    updateSoundButtonUI();
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

  function submitName() {
    const input = document.getElementById('nameInput');
    const error = document.getElementById('nameError');
    const name = (input.value || '').trim().replace(/\s+/g, ' ');
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
      elements.stageBadge.textContent = getStageIcon(stageKey) + ' ' + stageName;
      elements.stageBadge.className = `stage-badge stage-${stageKey}`;
    }

    // Bond
    if (elements.bondIndicator && state.bond) {
      elements.bondIndicator.textContent = `❤️ Bond: Lv. ${state.bond.level}`;
    }

    // Clovers (currency)
    if (elements.cloverCount) {
      elements.cloverCount.textContent = state.clovers ?? 0;
    }

    // Overall health
    if (elements.healthPercent && state.needs?.health !== undefined) {
      elements.healthPercent.textContent = `${Math.round(state.needs.health)}%`;
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
      if (elements.foodQtyBellPepper) elements.foodQtyBellPepper.textContent = `x${state.inventory.bell_pepper || 0}`;
      if (elements.foodQtyCarrot) elements.foodQtyCarrot.textContent = `x${state.inventory.carrot || 0}`;
      if (elements.foodQtyPellets) elements.foodQtyPellets.textContent = `x${state.inventory.pellets || 0}`;
    }

    // Update the canvas
    if (canvasPig) {
      canvasPig.updateState(state);
    }
  }

  function getStageIcon(key) {
    switch (key) {
      case 'baby': return '🌿';
      case 'junior': return '🌾';
      case 'adult': return '🥕';
      case 'senior': return '👑';
      case 'legend': return '⭐';
      default: return '🐾';
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

  // UI button handlers
  function bindButtons() {
    // 1. FEED — opens the slide-out food drawer
    elements.btnFeed?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      const isActive = elements.foodDrawer.classList.toggle('active');
      if (isActive && canvasPig) {
        canvasPig.playAnim('beg', 2000);
        canvasPig.showBubble('Bell pepper please! Wheee!', 2000);
      }
    });

    // Clicking a food item in the drawer
    elements.foodBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const food = btn.dataset.food;
        const state = window.bridge ? window.bridge.getState() : null;

        if (food !== 'hay' && state?.inventory && (state.inventory[food] || 0) <= 0) {
          if (window.Sound) window.Sound.click();
          if (canvasPig) canvasPig.showBubble(`No ${food} left! Buy some in the shop!`, 2200);
          return;
        }

        if (window.Sound) window.Sound.crunch();
        if (canvasPig) {
          canvasPig.playAnim(food === 'hay' ? 'eat' : 'eat_treat', 3500);
          canvasPig.showBubble('Yum! Crunch crunch!', 2500);
          canvasPig.spawnCrunch(canvasPig.pigX + 40, canvasPig.pigY + 50);
        }

        if (window.bridge) {
          window.bridge.send({ type: 'feed', item: food });
        }

        elements.foodDrawer.classList.remove('active');
      });
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
        canvasPig.showBubble('All clean and fresh! ✨', 2500);
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
        canvasPig.showBubble('WHEEEE! I\'m here! ❤️', 2800);
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
      openShopModal();
    });

    // 5. GAMES — opens the retro minigames dialog
    elements.btnMinigames?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      openMinigamesModal();
    });

    // 6. ALBUM — opens the retro behaviour sticker dialog
    elements.btnAlbum?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      if (window.bridge) window.bridge.send({ type: 'album' });
      openAlbumModal();
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
    elements.modalCloseBtn?.addEventListener('click', closeModal);
    elements.modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === elements.modalBackdrop) closeModal();
    });

    // Escape: closes an open dialog or the Home window
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elements.modalBackdrop && elements.modalBackdrop.classList.contains('active')) {
          closeModal();
        } else if (window.bridge && window.bridge.isWebView2) {
          window.bridge.send({ type: 'settings', action: 'close' });
        }
      }
    });
  }

  function updateSoundButtonUI() {
    if (!elements.btnSound || !window.Sound) return;
    elements.btnSound.textContent = window.Sound.isMuted ? '🔇' : '🔊';
    elements.btnSound.title = window.Sound.isMuted ? 'Turn sounds on' : 'Mute sounds';
  }

  // --- MODALE ---

  function openModal(title, contentHtml) {
    if (!elements.modalBackdrop) return;
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = contentHtml;
    elements.modalBackdrop.classList.add('active');
  }

  function closeModal() {
    if (!elements.modalBackdrop) return;
    if (window.Minigry && window.Minigry.activeGame && !window.Minigry.isPaused) {
      window.Minigry.pause();
    }
    elements.modalBackdrop.classList.remove('active');
  }

  // Shop dialog
  function openShopModal() {
    const state = window.bridge ? window.bridge.getState() : null;
    const clovers = state?.clovers || 0;

    // Prices must match assets/data/items.json (the game always charges the price from that file).
    const items = [
      { id: 'pellets',     name: 'Pellets',     price: 5,   icon: 'icon-pellets',     desc: 'A filling extra' },
      { id: 'cucumber',    name: 'Cucumber',    price: 5,   icon: 'icon-cucumber',    desc: 'Refreshing, a mood boost' },
      { id: 'parsley',     name: 'Parsley',     price: 8,   icon: 'icon-parsley',     desc: 'Lots of vitamin C' },
      { id: 'carrot',      name: 'Carrot',      price: 8,   icon: 'icon-carrot',      desc: 'Sweet treat for a good mood' },
      { id: 'kale',        name: 'Kale',        price: 10,  icon: 'icon-kale',        desc: 'A big leaf to tug at' },
      { id: 'bell_pepper', name: 'Bell pepper', price: 12,  icon: 'icon-bell-pepper', desc: 'Best source of vitamin C' },
      { id: 'chew_stick',  name: 'Chew stick',  price: 20,  icon: 'icon-chew-stick',  desc: 'Wears down the teeth' },
      { id: 'ball',        name: 'Ball',        price: 60,  icon: 'icon-ball',        desc: 'For playing', once: true },
      { id: 'tunnel',      name: 'Tunnel',      price: 150, icon: 'icon-tunnel',      desc: 'For play and zoomies', once: true },
      { id: 'house',       name: 'House',       price: 250, icon: 'icon-house',       desc: 'A comfy hideout', once: true }
    ];

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:#2b1712; color:#eedb7c; padding:6px 10px; border-radius:4px;">
        <span>Your clovers:</span>
        <b style="font-size:15px;"><span class="pixel-icon icon-clover"></span> ${clovers} 🍀</b>
      </div>
      <div class="shop-grid">
    `;

    items.forEach(it => {
      const owned = !!(it.once && state?.inventory && (state.inventory[it.id] || 0) > 0);
      const canAfford = clovers >= it.price && !owned;
      html += `
        <div class="shop-item">
          <div class="pixel-icon x1_5 ${it.icon}"></div>
          <b>${it.name}</b>
          <small style="color:#6e6a5c;">${it.desc}</small>
          <span style="font-weight:700; color:#c99a2e;">${it.price} 🍀</span>
          <button class="shop-item-btn" data-buy="${it.id}" ${!canAfford ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            ${owned ? 'Owned' : 'Buy'}
          </button>
        </div>
      `;
    });

    html += `</div>`;
    openModal('🏪 Pig Shop', html);

    // Handle a purchase
    elements.modalBody.querySelectorAll('button[data-buy]').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = b.dataset.buy;
        if (window.bridge) {
          window.bridge.send({ type: 'buy', itemId: id });
        }
        if (window.Sound) window.Sound.fanfare();
        if (canvasPig) canvasPig.showBubble(`Bought: ${id}!`, 2000);
        openShopModal(); // refresh the view
      });
    });
  }

  // Modal Minigier
  function openMinigamesModal() {
    openModal('🎮 Games', '');
    if (window.Minigry && elements.modalBody) {
      window.Minigry.renderSelectScreen(elements.modalBody);
    }
  }

  // Sticker album dialog
  function openAlbumModal() {
    const stickers = [
      { name: 'Sitting', id: 'idle', unlocked: true },
      { name: 'Sniffing', id: 'sniff', unlocked: true },
      { name: 'Popcorning', id: 'popcorn', unlocked: true },
      { name: 'Eating hay', id: 'eat', unlocked: true },
      { name: 'Crunching', id: 'eat_treat', unlocked: true },
      { name: 'Purring', id: 'purr_pet', unlocked: true },
      { name: 'Wheeking', id: 'wheek', unlocked: true },
      { name: 'Sleeping', id: 'sleep', unlocked: true },
      { name: 'Dancing', id: 'dance', unlocked: false },
      { name: 'Running away', id: 'flee', unlocked: false },
      { name: 'Agility', id: 'hurdle', unlocked: false },
      { name: 'Birthday', id: 'party', unlocked: false }
    ];

    const unlockedCount = stickers.filter(s => s.unlocked).length;

    let html = `
      <div style="background:#2b1712; color:#fffdf8; padding:5px 8px; border-radius:4px; font-weight:700;">
        Sticker collection: ${unlockedCount} / ${stickers.length}
      </div>
      <div class="album-grid">
    `;

    stickers.forEach(st => {
      html += `
        <div class="album-card ${st.unlocked ? '' : 'album-locked'}">
          <span style="font-size:20px;">${st.unlocked ? '🐹' : '❓'}</span>
          <b>${st.unlocked ? st.name : '???'}</b>
          <small style="color:#6e6a5c;">${st.unlocked ? 'Found!' : 'Not yet'}</small>
        </div>
      `;
    });

    html += `</div>`;
    openModal('📖 Behaviour Album', html);
  }

  // Developer test dialog / mock tester
  function openDevTestModal() {
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
            <button class="test-btn" id="testAddClovers">+50 🍀</button>
          </div>
        </div>

        <div class="test-row" style="margin-top:8px;">
          <button class="test-btn" id="testReset" style="background:#e8564c; width:100%;">Reset to defaults</button>
        </div>
      </div>
    `;

    openModal('⚙️ Test Panel (mock)', html);

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
