(function () {
  'use strict';

  // Ensure scenes.js is loaded in browser
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && !window.CuyScenes) {
    const s = document.createElement('script');
    s.src = 'features/places/scenes.js';
    document.head.appendChild(s);
  }

  function createState(variant) {
    const isSeven = variant === 'seven';
    const isAllUnlocked = variant === 'all_unlocked';

    let orderList;
    if (isSeven) {
      orderList = [
        { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
        { id: 'pig:pig_1', title: 'Pip Room', locked: false, unlockHint: '' },
        { id: 'dorm', title: 'Dormitory', locked: false, unlockHint: '' },
        { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
        { id: 'park', title: 'Park', locked: true, unlockHint: 'Unlock Garden first' },
        { id: 'farm', title: 'Farm', locked: true, unlockHint: 'Unlock Park first' },
        { id: 'market', title: 'Market', locked: true, unlockHint: 'Unlock Farm first' }
      ];
    } else {
      // 3 pig rooms + dorm + 4 places (+ salon)
      orderList = [
        { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
        { id: 'pig:pig_1', title: 'Pip Room', locked: false, unlockHint: '' },
        { id: 'pig:pig_2', title: 'Pop Room', locked: false, unlockHint: '' },
        { id: 'pig:pig_3', title: 'Pua Room', locked: false, unlockHint: '' },
        { id: 'dorm', title: 'Dormitory', locked: false, unlockHint: '' },
        { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
        { id: 'park', title: 'Park', locked: !isAllUnlocked, unlockHint: 'Unlock Garden first' },
        { id: 'farm', title: 'Farm', locked: !isAllUnlocked, unlockHint: 'Unlock Park first' },
        { id: 'market', title: 'Market', locked: !isAllUnlocked, unlockHint: 'Unlock Farm first' }
      ];
    }

    return {
      places: {
        order: orderList,
        pigLocations: [
          { pigId: 'pig_1', scene: 'salon', pinned: false }
        ]
      }
    };
  }

  const CuyScenesMock = {
    state: createState
  };

  if (typeof window !== 'undefined') {
    window.CuyScenesMock = CuyScenesMock;

    if (window.bridge && typeof window.bridge.registerMockState === 'function') {
      window.bridge.registerMockState('places_order', function (st) {
        if (!st.places) st.places = {};
        if (!st.places.order) {
          const m = createState();
          st.places.order = m.places.order;
        }
        if (!st.places.pigLocations) {
          const m = createState();
          st.places.pigLocations = m.places.pigLocations;
        }
      });
    }

    if (window.bridge && typeof window.bridge.registerMockHandler === 'function') {
      const handlePigMove = function (st, action) {
        if (!action || !action.to) return;
        const pigId = action.pigId || action.pig_id || 'pig_1';
        const to = action.to;

        if (!st.places) st.places = {};
        if (!Array.isArray(st.places.order)) {
          st.places.order = createState().places.order;
        }
        if (!Array.isArray(st.places.pigLocations)) {
          st.places.pigLocations = createState().places.pigLocations;
        }

        const ring = st.places.order;
        const targetEntry = ring.find(s => s.id === to);
        if (!targetEntry || targetEntry.locked) {
          return;
        }

        let loc = st.places.pigLocations.find(p => (p.pigId || p.PigId) === pigId);
        if (!loc) {
          loc = { pigId: pigId, scene: 'salon', pinned: false };
          st.places.pigLocations.push(loc);
        }

        const fromScene = loc.scene || loc.Scene || 'salon';
        const idxA = ring.findIndex(s => s.id === fromScene);
        const idxB = ring.findIndex(s => s.id === to);

        if (idxA !== -1 && idxB !== -1) {
          const prev = (idxA - 1 + ring.length) % ring.length;
          const next = (idxA + 1) % ring.length;
          const isAdjacent = (idxB === prev || idxB === next);
          if (!isAdjacent) return;
        }

        loc.scene = to;
        if (loc.Scene !== undefined) loc.Scene = to;
        if (Array.isArray(st.pigLocations)) {
          let locRoot = st.pigLocations.find(p => (p.pigId || p.PigId) === pigId);
          if (locRoot) {
            locRoot.scene = to;
            if (locRoot.Scene !== undefined) locRoot.Scene = to;
          }
        }
      };

      window.bridge.registerMockHandler('places.pigMove', handlePigMove);
      window.bridge.registerMockHandler('places_pig_move', handlePigMove);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CuyScenesMock;
  }
})();
