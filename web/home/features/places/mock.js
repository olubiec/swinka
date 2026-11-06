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
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CuyScenesMock;
  }
})();
