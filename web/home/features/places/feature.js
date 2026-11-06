(function () {
  'use strict';

  if (window.CuyPlaces) return;

  const DEFAULT_PLACES = ['house', 'garden', 'park', 'farm', 'market'];
  let currentSceneId = null;

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

  function getOrder(st) {
    if (window.CuyScenes && typeof window.CuyScenes.order === 'function') {
      return window.CuyScenes.order(st);
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
    const tod = (window.CuyScenes && typeof window.CuyScenes.timeOfDay === 'function')
      ? window.CuyScenes.timeOfDay()
      : 'day';
    const sceneDef = (window.CuyScenes && typeof window.CuyScenes.def === 'function')
      ? window.CuyScenes.def(currentSceneId, tod)
      : { id: currentSceneId, size: [240, 130], walk: [10, 80, 230, 125] };

    if (window.CanvasPig && typeof window.CanvasPig.setScene === 'function') {
      window.CanvasPig.setScene(sceneDef);
    }

    const things = (window.CuyScenes && typeof window.CuyScenes.placedThings === 'function')
      ? window.CuyScenes.placedThings(st, currentSceneId)
      : [];
    if (window.CanvasPig && typeof window.CanvasPig.setThings === 'function') {
      window.CanvasPig.setThings(things, true);
    }

    // 3. Pig visibility
    const firstPig = getFirstPigId(st);
    const pigScene = (window.CuyScenes && typeof window.CuyScenes.pigScene === 'function')
      ? window.CuyScenes.pigScene(st, firstPig)
      : 'salon';
    const isPigHere = (currentSceneId === pigScene);

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
        window.CanvasPig.setPigVisible(isPigHere);
      }
    }
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
    },
    applyScene
  };

  window.CuyPlaces = CuyPlaces;

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
