(function (root) {
  'use strict';

  let containerNode = null;
  let featureApi = null;
  let activeGuideTab = 'desktop';
  let updateTourStep = 0;
  let updateTourDismissedThisSession = false;
  let activeHintId = null;
  let activeSpotlightEl = null;
  let hooksBound = false;
  let lastObservedPlace = null;
  let gramophoneHooked = false;

  function getState() {
    if (featureApi && typeof featureApi.getState === 'function') {
      return featureApi.getState();
    }
    return root.bridge ? root.bridge.currentState || root.bridge.getState() : null;
  }

  function sendMsg(msg) {
    if (featureApi && typeof featureApi.send === 'function') {
      featureApi.send(msg);
      return;
    }
    if (root.bridge && typeof root.bridge.send === 'function') {
      root.bridge.send(msg);
    }
  }

  function hasAvailableAdoptionOffer(state) {
    const offers = state && state.pigs && Array.isArray(state.pigs.offers)
      ? state.pigs.offers
      : (state && Array.isArray(state.offers) ? state.offers : []);
    return offers.some(function (o) { return o && o.unlocked && !o.adopted; });
  }

  function getAdoptionCopy(state) {
    if (hasAvailableAdoptionOffer(state)) {
      return 'An adoption offer is currently available in My Pigs! Open it to review the details and welcome a new pig.';
    }
    return 'Manage your pigs and their profiles here. New adoption offers may appear over time — the game will notify you when a pig is looking for a home.';
  }

  function getUpdateCards(state) {
    return [
      {
        title: 'Welcome back! A Bigger World',
        items: [
          'Home has expanded: use the Places bar (< Living room >) at the top to switch between rooms and unlock new areas.',
          'You can unlock the Garden, Farm, Park, and visit the Market — each area has its own look and activities.'
        ]
      },
      {
        title: 'Grid Room Editor & Desktop Props',
        items: [
          'Click Edit in the Places bar to arrange furniture, lamps (which light up in the evening and at night), wallpapers, and floors on a grid with Undo/Redo.',
          'Higher Comfort slows down mood decay. Selected items can also be placed directly onto your Windows desktop as props.'
        ]
      },
      {
        title: 'Market, Farm & Garden',
        items: [
          'Shop now opens the Market with Food, Seeds, and Craft & Decor stalls, daily Orders, and your own Sell stall.',
          'Unlock the Garden for walks and a fenced Run, and unlock the Farm to grow crops and orchard trees.'
        ]
      },
      {
        title: 'Herd, Music & Extras',
        items: [
          'My Pigs now supports multiple pigs, individual rooms, and wandering settings.',
          getAdoptionCopy(state),
          'Look out for a new minigame in Games, a music gramophone in Home, and optional live weather in Settings (off by default).'
        ]
      }
    ];
  }

  function getHintCatalog(state) {
    return {
      places: {
        title: 'Places & World',
        target: '#placesBar',
        pos: 'bottom',
        items: [
          'Use < and > (or Left/Right arrows) to switch between rooms and unlocked outdoor areas.',
          'Locked areas show a padlock and clover cost. Some places require unlocking another area first.',
          'Click interactive objects inside scenes (lamps, stalls, plots, gramophone) to use them.'
        ]
      },
      editor: {
        title: 'Room Editor & Comfort',
        target: '#placesEditBtn',
        pos: 'top',
        items: [
          'Top rows are wall slots (frames, shelves, curtains); lower rows are floor/ground slots.',
          'Pick an item from storage to place it, or select a placed item to move, flip, or store it.',
          'Use Undo/Redo, wallpapers, floors, and lamps. Higher Comfort slows mood decay; selected items can also become desktop props.'
        ]
      },
      market: {
        title: 'Market & Stalls',
        target: '#btnShop',
        pos: 'top',
        items: [
          'Browse Food, Seeds, and Craft & Decor stalls to stock up on veggies, seeds, toys, and furniture.',
          'Check Orders for daily requests that pay clovers, or use My Stall to sell surplus farm crops (up to a daily limit).'
        ]
      },
      garden: {
        title: 'Garden, Park & Run',
        target: '#placesBar',
        pos: 'bottom',
        items: [
          'Decorate outdoor areas using Edit, just like rooms.',
          'When Comfort is high enough, you can take your pig for a Walk to boost mood.',
          'In the Garden, enclose an area with fences and a gate to create a Run.'
        ]
      },
      farm: {
        title: 'Farm & Orchard',
        target: '#placesBar',
        pos: 'bottom',
        items: [
          'Click empty lawn plots to convert them into crop beds or orchard tree spots for clovers.',
          'Plant seeds, water beds so they stay moist while growing, and harvest ripe crops.',
          'Feed harvested veggies to your pig, fulfill Market Orders, or sell extras at your stall.'
        ]
      },
      pigs: {
        title: 'My Pigs & Herd',
        target: null,
        pos: 'bottom',
        items: [
          'View each pig\'s age, life stage, and profile.',
          'With multiple pigs, each gets its own room (or shares a bedroom), and you can toggle wandering.',
          getAdoptionCopy(state)
        ]
      },
      games: {
        title: 'Minigames',
        target: '#btnMinigames',
        pos: 'top',
        items: [
          'Play minigames to boost Mood and earn clovers based on your score.',
          'Clover rewards apply up to a daily limit — after that, you can still play for fun and high scores.'
        ]
      },
      more: {
        title: 'More Tools',
        target: '#btnMore',
        pos: 'top',
        items: [
          'Daily gift rewards streaks; Album records behaviors you spot; Diary writes an evening summary.',
          'Achievements grant clovers for milestones; Care calendar tracks routines and weight; Vet clinic treats illness if needs drop too low.',
          'Colouring lets you paint pixel art, and Settings controls audio, monitor, optional live weather, and this Guide.'
        ]
      },
      music: {
        title: 'Gramophone & Music',
        target: null,
        pos: 'bottom',
        items: [
          'Use the music player to play background tracks in Home.',
          'You can browse your record shelf and unlock more tracks as you play.'
        ]
      }
    };
  }

  function getGuideSections(state) {
    return [
      {
        id: 'desktop',
        label: 'Desktop',
        title: 'Desktop & System Tray',
        items: [
          'Your pig walks along the Windows taskbar and on top of open windows.',
          'Hover over the pig to see a quick status bubble; click to pet it; drag and drop to move it.',
          'While Home is open, the pig stays inside — drag it out of the Home window to let it roam on your screen.',
          'Left-click the tray icon by the clock to open/close Home. Right-click for Feed, Call, Tricks, Sounds, Size, Start with Windows, and Quit.'
        ]
      },
      {
        id: 'needs',
        label: 'Needs',
        title: 'Needs, Health & Care',
        items: [
          '6 Needs: Fullness, Vitamin C, Energy, Mood, Cleanliness, and Teeth. Together they determine overall Health.',
          'Feed: hay is always free (watch the hay rack bar); veggies and treats come from your bag and add variety.',
          'Clean: clean the cage in Home and click droppings on your desktop to earn clovers.',
          'Call summons the pig. Caring builds Bond level, which unlocks new interactions and tricks.',
          'Vet clinic (in More) provides checkups and medicine if your pig gets sick. Keeping needs high helps prevent illness.'
        ]
      },
      {
        id: 'places',
        label: 'Places',
        title: 'Places, Comfort & Outdoors',
        items: [
          'Use the Places bar (< Living room >) or Left/Right arrow keys to switch between rooms and outdoor places.',
          'Locked places show a padlock and clover cost; some require unlocking another place first.',
          'Comfort from decorations slows down Mood decay.',
          'Garden and Park support Walks when Comfort is high enough, and the Garden supports a fenced Run with a gate.'
        ]
      },
      {
        id: 'editor',
        label: 'Editor',
        title: 'Room Editor & Desktop Props',
        items: [
          'Click Edit in the Places bar to open the grid editor.',
          'Top rows are wall slots (pictures, shelves, curtains); lower rows are floor/ground slots.',
          'Place items from storage, or select placed items to move, flip, or store them back.',
          'Use Undo/Redo, change wallpapers and floors, and place lamps (which turn on automatically in the evening/night).',
          'Selected items can also be placed on your Windows desktop as persistent props.'
        ]
      },
      {
        id: 'farm_market',
        label: 'Farm & Market',
        title: 'Farm & Market',
        items: [
          'Shop opens the Market: Food Stall (veggies/treats), Seed Stall (seeds/saplings), Craft & Decor (furniture/toys).',
          'Market Orders offer daily clover rewards for delivering requested items.',
          'My Stall lets you sell harvested crops up to a daily clover cap, with bag and stall upgrades.',
          'On the Farm, convert lawn plots into crop beds or orchard tree spots, sow seeds, keep beds watered, and harvest.'
        ]
      },
      {
        id: 'pigs',
        label: 'My Pigs',
        title: 'My Pigs & Adoption',
        items: [
          'My Pigs (in More) shows each pig\'s name, age, life stage, and profile.',
          'When you have multiple pigs, each has its own room (or shares a bedroom), and you can toggle room wandering.',
          getAdoptionCopy(state)
        ]
      },
      {
        id: 'games_music',
        label: 'Games & Music',
        title: 'Minigames, Music & Tricks',
        items: [
          'Games opens retro minigames that boost Mood and award clovers based on your score (up to a daily reward limit).',
          'Click the gramophone in Home to open the music player and record shelf.',
          'Tricks unlock as your Bond level grows and can be triggered from the tray right-click menu.'
        ]
      },
      {
        id: 'more',
        label: 'More',
        title: 'More Tools & Settings',
        items: [
          'Daily gift: claim daily clover streaks. Album: behaviors you have spotted. Diary: evening summary of the day.',
          'Achievements: claim clover rewards for milestones. Care calendar: routines, desktop reminders, and weight chart.',
          'Colouring: pixel-art coloring book with unlockable palettes.',
          'Settings: volume, quiet hours, pet size, autostart, monitor picker, updates, and optional Live Weather (off by default; requires your consent).'
        ]
      }
    ];
  }

  function clearSpotlight() {
    if (activeSpotlightEl) {
      activeSpotlightEl.classList.remove('tut-spotlight');
      activeSpotlightEl = null;
    }
  }

  function hideHintBanner() {
    clearSpotlight();
    const banner = document.getElementById('tutHintBanner');
    if (banner) banner.hidden = true;
    activeHintId = null;
  }

  function dismissHint(hintId) {
    hideHintBanner();
    if (hintId) {
      sendMsg({ type: 'tutorial.markHint', hintId: hintId });
    }
  }

  function ensureHintBanner() {
    let banner = document.getElementById('tutHintBanner');
    if (banner) return banner;
    const device = document.getElementById('gameDevice');
    if (!device) return null;

    banner = document.createElement('aside');
    banner.id = 'tutHintBanner';
    banner.className = 'tut-hint-banner';
    banner.hidden = true;
    banner.setAttribute('role', 'status');
    banner.innerHTML = [
      '<div class="tut-hint-head">',
      '  <div class="tut-hint-title"><span class="pixel-icon icon-x-info" aria-hidden="true"></span><span id="tutHintTitle"></span></div>',
      '  <button type="button" class="tut-btn-link" id="tutHintCloseBtn" aria-label="Dismiss hint">✕</button>',
      '</div>',
      '<ul class="tut-hint-list" id="tutHintList"></ul>',
      '<div class="tut-hint-foot">',
      '  <button type="button" class="tut-btn tut-btn-primary" id="tutHintGotItBtn">Got it</button>',
      '</div>'
    ].join('');
    device.appendChild(banner);

    banner.querySelector('#tutHintGotItBtn').addEventListener('click', function () {
      if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
      dismissHint(activeHintId);
    });
    banner.querySelector('#tutHintCloseBtn').addEventListener('click', function () {
      dismissHint(activeHintId);
    });
    return banner;
  }

  function isOnboardingBlocking() {
    const ids = ['welcome', 'intro', 'letter'];
    for (let i = 0; i < ids.length; i++) {
      const el = document.getElementById(ids[i]);
      if (el && !el.hidden) return true;
    }
    const tour = document.getElementById('tutUpdateOverlay');
    if (tour && !tour.hidden) return true;
    return false;
  }

  function hasSeenHint(state, hintId) {
    const tut = state && state.tutorial;
    if (!tut || !Array.isArray(tut.seenHints)) return false;
    return tut.seenHints.indexOf(hintId) !== -1;
  }

  function maybeShowHint(hintId) {
    const state = getState();
    if (!state || state.needsNaming) return;
    if (isOnboardingBlocking()) return;
    if (!state.tutorial) return;
    if (state.tutorial.mode === 'fresh') return;
    if (state.tutorial.mode === 'update' && !updateTourDismissedThisSession) {
      // Wait until the active tour finishes before showing contextual hints
      return;
    }
    if (hasSeenHint(state, hintId)) return;

    const catalog = getHintCatalog(state);
    const def = catalog[hintId];
    if (!def) return;

    const banner = ensureHintBanner();
    if (!banner) return;

    clearSpotlight();
    activeHintId = hintId;
    banner.classList.toggle('pos-top', def.pos === 'top');

    const titleEl = banner.querySelector('#tutHintTitle');
    const listEl = banner.querySelector('#tutHintList');
    if (titleEl) titleEl.textContent = def.title;
    if (listEl) {
      listEl.innerHTML = def.items.map(function (t) {
        return '<li>' + escapeHtml(t) + '</li>';
      }).join('');
    }

    if (def.target) {
      const targetEl = document.querySelector(def.target);
      if (targetEl && targetEl.offsetParent !== null) {
        targetEl.classList.add('tut-spotlight');
        activeSpotlightEl = targetEl;
      }
    }

    banner.hidden = false;
  }

  function ensureUpdateOverlay() {
    let overlay = document.getElementById('tutUpdateOverlay');
    if (overlay) return overlay;
    const device = document.getElementById('gameDevice');
    if (!device) return null;

    overlay = document.createElement('section');
    overlay.id = 'tutUpdateOverlay';
    overlay.className = 'tut-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-label', 'Update guide');
    overlay.innerHTML = [
      '<div class="tut-tour-card">',
      '  <div class="tut-tour-header">',
      '    <span class="tut-tour-badge">WHAT\'S NEW</span>',
      '    <span class="tut-tour-step" id="tutUpdateStepLabel">1 / 4</span>',
      '  </div>',
      '  <h2 class="tut-tour-title" id="tutUpdateTitle"></h2>',
      '  <div class="tut-tour-body" id="tutUpdateBody"></div>',
      '  <div class="tut-tour-actions">',
      '    <button type="button" class="tut-btn-link" id="tutUpdateSkipBtn">Skip</button>',
      '    <div class="tut-tour-nav">',
      '      <button type="button" class="tut-btn" id="tutUpdateBackBtn">Back</button>',
      '      <button type="button" class="tut-btn tut-btn-primary" id="tutUpdateNextBtn">Next</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    device.appendChild(overlay);

    overlay.querySelector('#tutUpdateSkipBtn').addEventListener('click', function () {
      if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
      completeUpdateTour();
    });
    overlay.querySelector('#tutUpdateBackBtn').addEventListener('click', function () {
      if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
      if (updateTourStep > 0) {
        updateTourStep--;
        renderUpdateTour();
      }
    });
    overlay.querySelector('#tutUpdateNextBtn').addEventListener('click', function () {
      if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
      const cards = getUpdateCards(getState());
      if (updateTourStep < cards.length - 1) {
        updateTourStep++;
        renderUpdateTour();
      } else {
        completeUpdateTour();
      }
    });

    return overlay;
  }

  function renderUpdateTour() {
    const overlay = ensureUpdateOverlay();
    if (!overlay) return;
    const state = getState();
    const cards = getUpdateCards(state);
    if (updateTourStep < 0) updateTourStep = 0;
    if (updateTourStep >= cards.length) updateTourStep = cards.length - 1;
    const card = cards[updateTourStep];

    const stepEl = overlay.querySelector('#tutUpdateStepLabel');
    const titleEl = overlay.querySelector('#tutUpdateTitle');
    const bodyEl = overlay.querySelector('#tutUpdateBody');
    const backBtn = overlay.querySelector('#tutUpdateBackBtn');
    const nextBtn = overlay.querySelector('#tutUpdateNextBtn');

    if (stepEl) stepEl.textContent = (updateTourStep + 1) + ' / ' + cards.length;
    if (titleEl) titleEl.textContent = card.title;
    if (bodyEl) {
      bodyEl.innerHTML = '<ul>' + card.items.map(function (t) {
        return '<li>' + escapeHtml(t) + '</li>';
      }).join('') + '</ul>';
    }
    if (backBtn) backBtn.hidden = (updateTourStep === 0);
    if (nextBtn) nextBtn.textContent = (updateTourStep === cards.length - 1) ? 'Got it' : 'Next';
    overlay.hidden = false;
  }

  function completeUpdateTour() {
    updateTourDismissedThisSession = true;
    const overlay = document.getElementById('tutUpdateOverlay');
    if (overlay) overlay.hidden = true;
    sendMsg({ type: 'tutorial.completeTour', mode: 'update' });
  }

  function startUpdateTour() {
    updateTourDismissedThisSession = false;
    updateTourStep = 0;
    renderUpdateTour();
  }

  function isPlaceLocked(place, state) {
    if (!place || place === 'salon' || place === 'dorm' || String(place).indexOf('pig:') === 0) return false;
    const places = state && state.places && Array.isArray(state.places.places) ? state.places.places : [];
    const found = places.find(function (p) { return p && p.id === place; });
    if (found && typeof found.locked === 'boolean') return found.locked;
    if (state && state.places && Array.isArray(state.places.unlocked)) {
      return state.places.unlocked.indexOf(place) === -1;
    }
    return false;
  }

  function showHintForPlace(place) {
    if (!place) return;
    const state = getState();
    if (isPlaceLocked(place, state)) {
      maybeShowHint('places');
    } else if (place === 'farm') {
      maybeShowHint('farm');
    } else if (place === 'garden' || place === 'park') {
      maybeShowHint('garden');
    } else if (place === 'market') {
      maybeShowHint('market');
    } else {
      maybeShowHint('places');
    }
  }

  function checkPlaceChange(force) {
    const place = root.CuyPlaces && typeof root.CuyPlaces.getCurrentPlace === 'function'
      ? root.CuyPlaces.getCurrentPlace()
      : null;
    if (!place) return;
    if (lastObservedPlace === null && !force) {
      lastObservedPlace = place;
      return;
    }
    if (force || place !== lastObservedPlace) {
      lastObservedPlace = place;
      showHintForPlace(place);
    }
  }

  function ensureDynamicHooks() {
    if (root.CuyHome && typeof root.CuyHome.openFeature === 'function' && !root.CuyHome._tutWrapped) {
      root.CuyHome._tutWrapped = true;
      const origOpen = root.CuyHome.openFeature.bind(root.CuyHome);
      root.CuyHome.openFeature = function (id, arg, opts) {
        const res = origOpen(id, arg, opts);
        if (id === 'pigs') setTimeout(function () { maybeShowHint('pigs'); }, 120);
        else if (id === 'market') setTimeout(function () { maybeShowHint('market'); }, 120);
        else if (id === 'farm') setTimeout(function () { maybeShowHint('farm'); }, 120);
        else if (id === 'garden') setTimeout(function () { maybeShowHint('garden'); }, 120);
        else if (id === 'music') setTimeout(function () { maybeShowHint('music'); }, 120);
        return res;
      };
    }

    if (root.CuyEdit && typeof root.CuyEdit.toggle === 'function' && !root.CuyEdit._tutWrapped) {
      root.CuyEdit._tutWrapped = true;
      const origToggle = root.CuyEdit.toggle.bind(root.CuyEdit);
      root.CuyEdit.toggle = function () {
        const res = origToggle.apply(root.CuyEdit, arguments);
        const isOpen = typeof root.CuyEdit.isOpen === 'function' ? root.CuyEdit.isOpen() : true;
        if (isOpen) {
          setTimeout(function () { maybeShowHint('editor'); }, 80);
        }
        return res;
      };
    }

    if (root.CuyMusicPlayer) {
      ['toggle', 'show'].forEach(function (fnName) {
        if (typeof root.CuyMusicPlayer[fnName] === 'function' && !root.CuyMusicPlayer['_tut_' + fnName]) {
          root.CuyMusicPlayer['_tut_' + fnName] = true;
          const origFn = root.CuyMusicPlayer[fnName].bind(root.CuyMusicPlayer);
          root.CuyMusicPlayer[fnName] = function () {
            const res = origFn.apply(root.CuyMusicPlayer, arguments);
            setTimeout(function () { maybeShowHint('music'); }, 120);
            return res;
          };
        }
      });
    }

    if (!gramophoneHooked && root.CanvasPig && typeof root.CanvasPig.onHotspot === 'function') {
      const hasInst = !!(root.CanvasPig.instance || (root.CuyPig && root.CuyPig.mainInstance) || (root.PigCanvas && root.PigCanvas.instance));
      if (hasInst) {
        gramophoneHooked = true;
        root.CanvasPig.onHotspot(function (hs) {
          if (hs && hs.kind === 'gramophone') {
            setTimeout(function () { maybeShowHint('music'); }, 150);
          }
        });
      }
    }

    const titleEl = document.getElementById('placesBarTitle');
    if (titleEl && !titleEl._tutObserved && typeof MutationObserver !== 'undefined') {
      titleEl._tutObserved = true;
      const obs = new MutationObserver(function () {
        setTimeout(function () { checkPlaceChange(false); }, 60);
      });
      obs.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
  }

  function bindContextualHooks() {
    ensureDynamicHooks();
    if (hooksBound) return;
    hooksBound = true;

    if (lastObservedPlace === null && root.CuyPlaces && typeof root.CuyPlaces.getCurrentPlace === 'function') {
      lastObservedPlace = root.CuyPlaces.getCurrentPlace();
    }

    document.addEventListener('click', function (e) {
      const target = e.target && e.target.closest ? e.target.closest('button, [data-open-feature]') : null;
      if (!target) return;

      const id = target.id || '';
      if (id === 'placesPrevBtn' || id === 'placesNextBtn' || id === 'stageEdgeLeft' || id === 'stageEdgeRight') {
        setTimeout(function () { checkPlaceChange(true); }, 80);
      } else if (id === 'placesEditBtn') {
        setTimeout(function () { maybeShowHint('editor'); }, 80);
      } else if (id === 'btnShop') {
        setTimeout(function () { maybeShowHint('market'); }, 120);
      } else if (id === 'btnMinigames') {
        setTimeout(function () { maybeShowHint('games'); }, 120);
      } else if (id === 'btnMore') {
        setTimeout(function () { maybeShowHint('more'); }, 120);
      } else if (target.dataset && target.dataset.openFeature === 'pigs') {
        setTimeout(function () { maybeShowHint('pigs'); }, 120);
      }
    }, true);

    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && activeHintId) {
        dismissHint(activeHintId);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement && document.activeElement.isContentEditable)) return;
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop && backdrop.classList.contains('active')) return;
        setTimeout(function () { checkPlaceChange(true); }, 80);
      }
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderGuide(container, state) {
    const sections = getGuideSections(state);
    if (!sections.some(function (s) { return s.id === activeGuideTab; })) {
      activeGuideTab = sections[0].id;
    }
    const current = sections.find(function (s) { return s.id === activeGuideTab; }) || sections[0];

    const tabsHtml = sections.map(function (s) {
      const cls = 'tut-guide-tab' + (s.id === current.id ? ' active' : '');
      return '<button type="button" class="' + cls + '" data-tut-tab="' + s.id + '">' + escapeHtml(s.label) + '</button>';
    }).join('');

    const itemsHtml = current.items.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('');

    container.innerHTML = [
      '<div class="tut-guide-wrap">',
      '  <div class="tut-guide-tabs" role="tablist">' + tabsHtml + '</div>',
      '  <div class="tut-guide-card">',
      '    <h3>' + escapeHtml(current.title) + '</h3>',
      '    <ul>' + itemsHtml + '</ul>',
      '  </div>',
      '  <div class="tut-guide-footer">',
      '    <button type="button" class="tut-btn" id="tutReplayIntroBtn">Replay Intro</button>',
      '    <button type="button" class="tut-btn" id="tutReplayUpdateBtn">What\'s New Tour</button>',
      '    <button type="button" class="tut-btn" id="tutResetHintsBtn">Reset Hints</button>',
      '  </div>',
      '</div>'
    ].join('');

    container.querySelectorAll('[data-tut-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        activeGuideTab = btn.dataset.tutTab;
        renderGuide(container, getState());
      });
    });

    const replayIntroBtn = container.querySelector('#tutReplayIntroBtn');
    if (replayIntroBtn) {
      replayIntroBtn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        if (root.CuyHome && typeof root.CuyHome.closeFeature === 'function') {
          root.CuyHome.closeFeature();
        }
        if (typeof root.CuyTutorialStartIntro === 'function') {
          root.CuyTutorialStartIntro();
        }
      });
    }

    const replayUpdateBtn = container.querySelector('#tutReplayUpdateBtn');
    if (replayUpdateBtn) {
      replayUpdateBtn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        if (root.CuyHome && typeof root.CuyHome.closeFeature === 'function') {
          root.CuyHome.closeFeature();
        }
        startUpdateTour();
      });
    }

    const resetHintsBtn = container.querySelector('#tutResetHintsBtn');
    if (resetHintsBtn) {
      resetHintsBtn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        sendMsg({ type: 'tutorial.resetHints' });
        if (root.bridge && typeof root.bridge.dispatchMessage === 'function') {
          root.bridge.dispatchMessage({ type: 'toast', text: 'Contextual hints reset!' });
        }
      });
    }
  }

  function handleStateUpdate(state) {
    bindContextualHooks();
    if (!state || state.needsNaming) return;

    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalOpen = modalBackdrop && modalBackdrop.classList.contains('active');
    const tut = state.tutorial;

    if (tut && tut.mode === 'update' && !updateTourDismissedThisSession && !modalOpen && !isOnboardingBlocking()) {
      startUpdateTour();
    }

    if (containerNode) {
      renderGuide(containerNode, state);
    }
  }

  root.CuyTutorial = {
    showHint: maybeShowHint,
    startUpdateTour: startUpdateTour
  };

  if (root.CuyHome && typeof root.CuyHome.registerFeature === 'function') {
    root.CuyHome.registerFeature({
      id: 'tutorial',
      title: 'Guide',
      icon: 'icon-album-book',
      order: 85,
      alwaysOnState: true,
      open: function (container, api) {
        containerNode = container;
        featureApi = api;
        hideHintBanner();
        renderGuide(container, getState());
      },
      close: function () {
        containerNode = null;
      },
      onState: function (state) {
        handleStateUpdate(state);
      }
    });
  }
})(typeof window !== 'undefined' ? window : this);
