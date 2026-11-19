(function () {
  'use strict';

  // Ensure scenes.js is loaded in browser
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && !window.CuyScenes) {
    const s = document.createElement('script');
    s.src = 'features/places/scenes.js';
    document.head.appendChild(s);
  }

  // Hardcoded outdoor defaults matching R46.md sec 3 / R30.md sec 2
  // (outdoor_defaults.json is authored in parallel by PK-P46a; compare after merge in PK-P46t2)
  const OUTDOOR_SEED = {
    garden: {
      cols: 16,
      rows: 9,
      items: [
        { id: 'bench', itemId: 'bench_wood', x: 9, y: 6 },
        { id: 'fountain', itemId: 'bird_bath', x: 4, y: 7 },
        { id: 'flower_bed_left', itemId: 'flowerbed_tulip', x: 1, y: 7 },
        { id: 'flower_bed_right', itemId: 'flowerbed_daisy', x: 12, y: 7 },
        { id: 'tree_left', itemId: 'tree_small', x: 12, y: 2 },
        { id: 'tree_right', itemId: 'tree_small', x: 14, y: 2 },
        { id: 'hedge', itemId: 'hedge', x: 11, y: 4 },
        { id: 'burrow', itemId: 'willow_tunnel', x: 1, y: 4 }
      ]
    },
    park: {
      cols: 24,
      rows: 12,
      items: [
        { id: 'gazebo', itemId: 'gazebo', x: 4, y: 2 },
        { id: 'bench_left', itemId: 'bench_park', x: 7, y: 8 },
        { id: 'bench_right', itemId: 'bench_park', x: 21, y: 9 },
        { id: 'bridge', itemId: 'bridge_wood', x: 10, y: 5 },
        { id: 'tree_1', itemId: 'tree_big', x: 0, y: 1 },
        { id: 'tree_2', itemId: 'tree_big', x: 13, y: 1 },
        { id: 'tree_3', itemId: 'tree_big', x: 16, y: 1 },
        { id: 'tree_4', itemId: 'tree_big', x: 20, y: 1 },
        { id: 'lamp_left', itemId: 'lamp_post', x: 1, y: 7 },
        { id: 'lamp_mid', itemId: 'lamp_post', x: 17, y: 7 },
        { id: 'lamp_right', itemId: 'lamp_post', x: 21, y: 10 }
      ]
    },
    farm: {
      cols: 16,
      rows: 9,
      items: [
        { id: 'barn', itemId: 'barn_hay', x: 11, y: 1 },
        { id: 'fence_left', itemId: 'fence_farm', x: 0, y: 4 },
        { id: 'fence_right', itemId: 'fence_farm', x: 15, y: 4 },
        { id: 'plot:0', itemId: 'plot_empty', x: 2, y: 5 },
        { id: 'plot:1', itemId: 'plot_empty', x: 5, y: 5 },
        { id: 'plot:2', itemId: 'plot_empty', x: 8, y: 5 },
        { id: 'plot:3', itemId: 'plot_empty', x: 11, y: 5 }
      ]
    },
    market: {
      cols: 16,
      rows: 9,
      items: [
        { id: 'stall_left', itemId: 'stall_basic', x: 1, y: 5 },
        { id: 'stall_center', itemId: 'stall_big', x: 6, y: 5 },
        { id: 'stall_right', itemId: 'stall_basic', x: 12, y: 5 },
        { id: 'notice_board', itemId: 'order_board', x: 4, y: 6 },
        { id: 'sign_right', itemId: 'signpost', x: 15, y: 6 }
      ]
    }
  };

  function createOutdoorLayouts() {
    const layouts = {};
    Object.keys(OUTDOOR_SEED).forEach(sceneId => {
      const def = OUTDOOR_SEED[sceneId];
      layouts[sceneId] = {
        name: '',
        cols: def.cols,
        rows: def.rows,
        wallRows: 0,
        wallpaper: '',
        floor: '',
        items: def.items.map(it => ({
          uid: 'fx:' + sceneId + ':' + it.id,
          itemId: it.itemId,
          x: it.x,
          y: it.y,
          flip: false,
          variant: 0
        }))
      };
    });
    return layouts;
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
      },
      rooms: {
        layouts: createOutdoorLayouts()
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
        if (!st.rooms) st.rooms = {};
        if (!st.rooms.layouts) st.rooms.layouts = {};
        const outdoor = createOutdoorLayouts();
        Object.keys(outdoor).forEach(k => {
          if (!st.rooms.layouts[k]) st.rooms.layouts[k] = outdoor[k];
        });
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
          loc = { pigId: pigId, scene: to, pinned: false };
          st.places.pigLocations.push(loc);
          const pig1Loc = st.places.pigLocations.find(p => (p.pigId || p.PigId) === 'pig_1');
          if (pig1Loc) {
            pig1Loc.scene = to;
            if (pig1Loc.Scene !== undefined) pig1Loc.Scene = to;
          }
        } else {
          loc.scene = to;
          if (loc.Scene !== undefined) loc.Scene = to;
        }

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
