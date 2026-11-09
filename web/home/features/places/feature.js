(function () {
  'use strict';

  if (window.CuyPlaces) return;

  const DEFAULT_PLACES = ['house', 'garden', 'park', 'farm', 'market'];
  let currentSceneId = null;
  let previousPigLocations = null;
  let exitDisabledUntil = 0;

  function getState() {
    return (window.CuyHome && window.CuyHome.api && window.CuyHome.api.getState()) ||
      (window.bridge && window.bridge.getState && window.bridge.getState()) || null;
  }

  function getFirstPigId(st) {
    if (!st) return 'pig_1';
    if (Array.isArray(st.activePigIds) && st.activePigIds[0]) return st.activePigIds[0];
    if (st.places && Array.isArray(st.places.pigLocations) && st.places.pigLocations[0]) {
      return st.places.pigLocations[0].pigId || st.places.pigLocations[0].PigId;
    }
    if (Array.isArray(st.pigLocations) && st.pigLocations[0]) {
      return st.pigLocations[0].pigId || st.pigLocations[0].PigId;
    }
    if (Array.isArray(st.roster) && st.roster[0]) {
      return st.roster[0].id || st.roster[0].pigId;
    }
    return st.id || st.pigId || 'pig_1';
  }

  function getPigLocations(st) {
    if (!st) st = getState();
    if (!st) return [];
    if (st.places && Array.isArray(st.places.pigLocations)) {
      return st.places.pigLocations;
    }
    if (Array.isArray(st.pigLocations)) {
      return st.pigLocations;
    }
    return [];
  }

  function getPigName(pigId, st) {
    if (!st) st = getState();
    if (st) {
      if (Array.isArray(st.roster)) {
        const found = st.roster.find(p => p && (p.id === pigId || p.pigId === pigId));
        if (found && (found.name || found.petName)) return found.name || found.petName;
      }
      if (Array.isArray(st.rooms && st.rooms.pigRooms)) {
        const pr = st.rooms.pigRooms.find(r => r && (r.pigId === pigId || ('pig:' + r.pigId) === pigId));
        if (pr && (pr.name || pr.displayName)) return pr.name || pr.displayName;
      }
      if (Array.isArray(st.places && st.places.order)) {
        const ordItem = st.places.order.find(s => s && (s.id === ('pig:' + pigId) || s.id === pigId));
        if (ordItem && ordItem.title) {
          const m = ordItem.title.match(/^(.+?)\s+Room$/i);
          if (m) return m[1];
        }
      }
      if (st.name && (!pigId || pigId === 'pig_1' || pigId === st.id)) {
        return st.name;
      }
    }
    if (pigId === 'pig_2') return 'Pop';
    if (pigId === 'pig_3') return 'Pua';
    return 'Cuy';
  }

  function getOrder(st) {
    if (!st) st = getState();
    if (window.CuyScenes && typeof window.CuyScenes.order === 'function') {
      return window.CuyScenes.order(st);
    }
    if (st && st.places && Array.isArray(st.places.order)) {
      return st.places.order;
    }
    return [
      { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
      { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
      { id: 'park', title: 'Park', locked: false, unlockHint: '' },
      { id: 'farm', title: 'Farm', locked: false, unlockHint: '' },
      { id: 'market', title: 'Market', locked: false, unlockHint: '' }
    ];
  }

  function getSceneTitle(sceneId, st) {
    if (!st) st = getState();
    const ord = getOrder(st);
    const item = ord.find(s => s.id === sceneId);
    if (st && st.rooms) {
      if (st.rooms.layouts && st.rooms.layouts[sceneId] && st.rooms.layouts[sceneId].name) {
        return st.rooms.layouts[sceneId].name;
      }
      if (Array.isArray(st.rooms.pigRooms)) {
        const pr = st.rooms.pigRooms.find(r => r && (r.roomId === sceneId || ('pig:' + r.pigId) === sceneId));
        if (pr && (pr.displayName || pr.name)) {
          return pr.displayName || pr.name;
        }
      }
    }
    if (item && item.title) return item.title;
    if (window.CuyScenes && typeof window.CuyScenes.def === 'function') {
      const d = window.CuyScenes.def(sceneId);
      if (d && d.title) return d.title;
    }
    return sceneId ? (sceneId.charAt(0).toUpperCase() + sceneId.slice(1)) : '';
  }

  function computeNeighbourScene(currentScene, direction, st) {
    const ord = getOrder(st);
    if (!ord || ord.length === 0) return null;

    const idx = ord.findIndex(s => s.id === currentScene);
    if (idx !== -1) {
      const step = direction === 'left' ? -1 : 1;
      const targetIdx = (idx + step + ord.length) % ord.length;
      return ord[targetIdx];
    }

    if (direction === 'left') {
      return ord.find(s => s.id === 'market') || ord[ord.length - 1];
    } else {
      return ord.find(s => s.id === 'garden') || ord[0];
    }
  }

  function updatePresenceChips(st) {
    if (!st) st = getState();
    let container = document.getElementById('placesPresenceChips');
    if (!container) {
      const stage = document.querySelector('.stage-viewport');
      if (stage && stage.parentNode) {
        container = document.createElement('div');
        container.id = 'placesPresenceChips';
        container.className = 'places-presence-chips';
        stage.parentNode.insertBefore(container, stage);
      }
    }
    if (!container) return;

    const pigLocs = getPigLocations(st);
    if (pigLocs.length === 0) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }

    // Filter pigs that are NOT in the current scene
    const elsewherePigs = pigLocs.filter(p => {
      const sc = p.scene || p.sceneId || p.Scene || p.SceneId || 'salon';
      return sc !== currentSceneId;
    });

    if (elsewherePigs.length === 0) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }

    container.innerHTML = '';
    container.hidden = false;

    const multiplePigs = (pigLocs.length >= 2);

    elsewherePigs.forEach(p => {
      const pigId = p.pigId || p.PigId || 'pig_1';
      const sceneId = p.scene || p.sceneId || p.Scene || p.SceneId || 'salon';
      const sceneTitle = getSceneTitle(sceneId, st);
      const pigName = getPigName(pigId, st);

      const chip = document.createElement('div');
      chip.className = 'places-presence-chip currency-badge ui-panel-wood';

      const label = document.createElement('span');
      label.className = 'chip-text';
      if (multiplePigs) {
        label.textContent = pigName + ' is in ' + sceneTitle;
      } else {
        label.textContent = 'Cuy is in ' + sceneTitle;
      }
      chip.appendChild(label);

      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'chip-go-btn ui-btn';
      goBtn.textContent = 'Go there';
      goBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyScene(sceneId, getState());
      });
      chip.appendChild(goBtn);

      container.appendChild(chip);
    });
  }

  function handlePigExit(ev) {
    const st = getState();
    const pigLocs = getPigLocations(st);
    const activePigId = getFirstPigId(st);

    const pigInScene = pigLocs.find(p => (p.scene || p.sceneId || p.Scene || p.SceneId || 'salon') === currentSceneId);
    const pigEntry = pigInScene || pigLocs.find(p => (p.pigId || p.PigId) === activePigId) || pigLocs[0];
    if (pigEntry && pigEntry.pinned) {
      return;
    }

    const direction = (ev && ev.to === 'left') ? 'left' : 'right';
    const targetScene = computeNeighbourScene(currentSceneId, direction, st);

    if (!targetScene || targetScene.locked) {
      exitDisabledUntil = Date.now() + 60000;
      if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
        window.CanvasPig.setPigVisible(true);
      }
      if (window.CanvasPig && typeof window.CanvasPig.setExitsEnabled === 'function') {
        window.CanvasPig.setExitsEnabled(false);
      }
      return;
    }

    const pigId = (pigEntry && (pigEntry.pigId || pigEntry.PigId)) || activePigId;
    if (window.bridge && typeof window.bridge.send === 'function') {
      window.bridge.send({
        type: 'places.pigMove',
        pigId: pigId,
        to: targetScene.id
      });
    }
  }

  function bindCanvasExits() {
    if (window.CanvasPig) {
      window.CanvasPig.onPigExit = handlePigExit;
    }
    const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
    if (inst) {
      inst.onPigExit = handlePigExit;
    }
    if (typeof window !== 'undefined') {
      window.onPigExit = handlePigExit;
    }
  }

  function checkArrivals(st) {
    if (!st) st = getState();
    const currentLocs = getPigLocations(st);

    if (!previousPigLocations) {
      previousPigLocations = JSON.parse(JSON.stringify(currentLocs));
      return;
    }

    const ord = getOrder(st);

    for (const cur of currentLocs) {
      const pigId = cur.pigId || cur.PigId;
      const prev = previousPigLocations.find(p => (p.pigId || p.PigId) === pigId);
      const curScene = cur.scene || cur.sceneId || cur.Scene || cur.SceneId;
      const prevScene = prev ? (prev.scene || prev.sceneId || prev.Scene || prev.SceneId) : null;

      if (prevScene && curScene !== prevScene && curScene === currentSceneId) {
        // Pig arrived at currently viewed scene!
        let enterSide = 'left';
        if (ord && ord.length > 0) {
          const idxCur = ord.findIndex(s => s.id === curScene);
          const idxPrev = ord.findIndex(s => s.id === prevScene);
          if (idxCur !== -1 && idxPrev !== -1) {
            const rightNeighbour = (idxCur + 1) % ord.length;
            if (idxPrev === rightNeighbour) {
              enterSide = 'right';
            } else {
              enterSide = 'left';
            }
          }
        }

        if (window.CanvasPig && typeof window.CanvasPig.enterFrom === 'function') {
          window.CanvasPig.enterFrom(enterSide);
        }
      }
    }

    previousPigLocations = JSON.parse(JSON.stringify(currentLocs));
  }

  function applyScene(sceneId, st) {
    if (!st) st = getState();
    if (!sceneId) {
      const firstPig = getFirstPigId(st);
      sceneId = (window.CuyScenes && typeof window.CuyScenes.pigScene === 'function')
        ? window.CuyScenes.pigScene(st, firstPig)
        : 'salon';
    }
    currentSceneId = sceneId;

    const ord = getOrder(st);
    const item = ord.find(s => s.id === currentSceneId) || { id: currentSceneId, title: currentSceneId, locked: false };
    const isLocked = !!item.locked;

    // 1. Update title in the bar
    const titleEl = document.getElementById('placesBarTitle');
    if (titleEl) {
      titleEl.textContent = getSceneTitle(currentSceneId, st);
    }

    // 2. Set CanvasPig scene & things
    const currentInstScene = (window.CuyPig && window.CuyPig.mainInstance && window.CuyPig.mainInstance.sceneId) || null;
    const tod = (window.CuyScenes && typeof window.CuyScenes.timeOfDay === 'function')
      ? window.CuyScenes.timeOfDay()
      : 'day';
    const sceneDef = (window.CuyScenes && typeof window.CuyScenes.def === 'function')
      ? window.CuyScenes.def(currentSceneId, tod)
      : { id: currentSceneId, size: [240, 130], walk: [10, 80, 230, 125] };

    if (currentInstScene !== currentSceneId) {
      if (window.CanvasPig && typeof window.CanvasPig.setScene === 'function') {
        window.CanvasPig.setScene(sceneDef);
      }
    }

    const things = (window.CuyScenes && typeof window.CuyScenes.placedThings === 'function')
      ? window.CuyScenes.placedThings(st, currentSceneId)
      : [];
    if (window.CanvasPig && typeof window.CanvasPig.setThings === 'function') {
      window.CanvasPig.setThings(things, true);
    }

    // 3. Pig visibility and exits
    const pigLocs = getPigLocations(st);
    const pigInThisScene = pigLocs.find(p => (p.scene || p.sceneId || p.Scene || p.SceneId || 'salon') === currentSceneId);
    const firstPig = getFirstPigId(st);
    const firstPigLoc = pigLocs.find(p => (p.pigId || p.PigId) === firstPig) || pigLocs[0];
    const isPigPinned = pigInThisScene ? !!pigInThisScene.pinned : (firstPigLoc ? !!firstPigLoc.pinned : false);

    const isAnyPigHere = pigLocs.length > 0
      ? pigLocs.some(p => (p.scene || p.sceneId || p.Scene || p.SceneId || 'salon') === currentSceneId)
      : (currentSceneId === 'salon');

    bindCanvasExits();

    if (window.CanvasPig && typeof window.CanvasPig.setExitsEnabled === 'function') {
      const now = Date.now();
      const exitsAllowed = isAnyPigHere && !isPigPinned && (now >= exitDisabledUntil);
      window.CanvasPig.setExitsEnabled(exitsAllowed);
    }

    // 4. Locked overlay and hint
    const hintBar = document.getElementById('placesLockedHint');
    const hintText = document.getElementById('placesHintText');

    if (isLocked) {
      if (hintBar) hintBar.hidden = false;
      if (hintText) hintText.textContent = item.unlockHint || 'Locked';

      if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
        window.CanvasPig.setPigVisible(false);
      }

      if (window.CuyRoom && typeof window.CuyRoom.addLayer === 'function') {
        window.CuyRoom.addLayer('p36_locked_overlay', 25, (ctx) => {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = 'rgb(87, 98, 150)';
          ctx.fillRect(0, 0, 240, 130);
          ctx.restore();
        });
      }
    } else {
      if (hintBar) hintBar.hidden = true;
      if (hintText) hintText.textContent = '';

      if (window.CuyRoom && typeof window.CuyRoom.removeLayer === 'function') {
        window.CuyRoom.removeLayer('p36_locked_overlay');
      }

      if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
        window.CanvasPig.setPigVisible(isAnyPigHere);
      }
    }

    // 5. Update presence chips
    updatePresenceChips(st);
  }

  function next() {
    const st = getState();
    if (!currentSceneId) {
      const firstPig = getFirstPigId(st);
      currentSceneId = (window.CuyScenes && typeof window.CuyScenes.pigScene === 'function')
        ? window.CuyScenes.pigScene(st, firstPig)
        : 'salon';
    }
    let nextId;
    if (window.CuyScenes && typeof window.CuyScenes.neighbor === 'function') {
      nextId = window.CuyScenes.neighbor(currentSceneId, 1, st);
    } else {
      const ord = getOrder(st);
      const idx = ord.findIndex(s => s.id === currentSceneId);
      nextId = ord[(idx + 1) % ord.length].id;
    }
    applyScene(nextId, st);
  }

  function prev() {
    const st = getState();
    if (!currentSceneId) {
      const firstPig = getFirstPigId(st);
      currentSceneId = (window.CuyScenes && typeof window.CuyScenes.pigScene === 'function')
        ? window.CuyScenes.pigScene(st, firstPig)
        : 'salon';
    }
    let prevId;
    if (window.CuyScenes && typeof window.CuyScenes.neighbor === 'function') {
      prevId = window.CuyScenes.neighbor(currentSceneId, -1, st);
    } else {
      const ord = getOrder(st);
      const idx = ord.findIndex(s => s.id === currentSceneId);
      prevId = ord[(idx - 1 + ord.length) % ord.length].id;
    }
    applyScene(prevId, st);
  }

  function getPlacesList(st) {
    if (!st) st = getState();
    if (st && st.places && Array.isArray(st.places.places) && st.places.places.length > 0) {
      const fromState = st.places.places.map(p => typeof p === 'string' ? p : p.id);
      const hasDefaults = DEFAULT_PLACES.some(id => fromState.includes(id));
      if (hasDefaults) {
        const ordered = [];
        DEFAULT_PLACES.forEach(id => {
          if (fromState.includes(id)) ordered.push(id);
        });
        fromState.forEach(id => {
          if (!ordered.includes(id)) ordered.push(id);
        });
        return ordered;
      }
      return fromState;
    }
    return DEFAULT_PLACES.slice();
  }

  function getHouseRooms(st) {
    if (!st) st = getState();
    const rooms = ['salon'];
    if (st && st.rooms) {
      if (st.rooms.layouts) {
        Object.keys(st.rooms.layouts).forEach(k => {
          if (k !== 'salon' && k !== 'garden' && k !== 'park' && k !== 'dorm' && !k.startsWith('pig:') && !rooms.includes(k)) {
            rooms.push(k);
          }
        });
      }
      if (Array.isArray(st.rooms.pigRooms)) {
        st.rooms.pigRooms.forEach(r => {
          if (r && r.adopted !== false && r.roomId && !rooms.includes(r.roomId)) {
            rooms.push(r.roomId);
          }
        });
      }
      if (st.rooms.dorm || (st.rooms.layouts && st.rooms.layouts.dorm)) {
        if (!rooms.includes('dorm')) rooms.push('dorm');
      }
    }
    return rooms;
  }

  const CuyPlaces = {
    getCurrentPlace() {
      return currentSceneId || 'salon';
    },
    setCurrentPlace(placeId) {
      if (placeId) applyScene(placeId, getState());
    },
    getCurrentHouseRoom() {
      return (currentSceneId && (currentSceneId === 'salon' || currentSceneId === 'dorm' || currentSceneId.startsWith('pig:'))) ? currentSceneId : 'salon';
    },
    setCurrentHouseRoom(roomId) {
      if (roomId) applyScene(roomId, getState());
    },
    getPlacesList,
    getHouseRooms,
    openPlace(placeId, roomArg) {
      const target = (placeId === 'house' ? (roomArg || 'salon') : (placeId || 'salon'));
      applyScene(target, getState());
    },
    next,
    prev,
    renderArrowsHtml(placeId) {
      return '';
    },
    bindArrows(container) {},
    updateStageNav(st) {
      applyScene(currentSceneId, st || getState());
      checkArrivals(st);
    },
    applyScene
  };

  window.CuyPlaces = CuyPlaces;

  if (typeof window !== 'undefined') {
    bindCanvasExits();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindCanvasExits);
    }
  }

  if (window.CuyHome && window.CuyHome.registerFeature) {
    window.CuyHome.registerFeature({
      id: 'places',
      title: 'Places',
      icon: 'icon-house',
      order: 35,
      open(container, api, arg) {
        CuyPlaces.openPlace(arg || CuyPlaces.getCurrentPlace() || 'salon');
      },
      onState(st) {
        CuyPlaces.updateStageNav(st);
      }
    });
  }
})();
