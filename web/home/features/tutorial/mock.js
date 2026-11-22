(function (root) {
  'use strict';

  const bridge = root.bridge;
  if (!bridge || !bridge.isMock) return;

  function ensureTutorialState(state) {
    if (!state) return null;
    if (!state.tutorial || typeof state.tutorial !== 'object') {
      state.tutorial = {
        versionSeen: state.needsNaming ? 0 : 2,
        currentVersion: 2,
        mode: state.needsNaming ? 'fresh' : 'done',
        seenHints: []
      };
    }
    if (!Array.isArray(state.tutorial.seenHints)) {
      state.tutorial.seenHints = [];
    }
    if (typeof state.tutorial.currentVersion !== 'number') {
      state.tutorial.currentVersion = 2;
    }
    if (typeof state.tutorial.versionSeen !== 'number') {
      state.tutorial.versionSeen = 0;
    }
    if (!state.tutorial.mode) {
      state.tutorial.mode = state.tutorial.versionSeen >= state.tutorial.currentVersion
        ? 'done'
        : (state.needsNaming ? 'fresh' : 'update');
    }
    return state.tutorial;
  }

  bridge.registerMockState('tutorial', function (state) {
    ensureTutorialState(state);
  });

  bridge.registerMockHandler('tutorial.completeTour', function (state, msg) {
    const tut = ensureTutorialState(state);
    if (!tut) return;
    tut.versionSeen = tut.currentVersion;
    tut.mode = 'done';
    if (msg && msg.mode === 'update') {
      ['games', 'more'].forEach((id) => {
        if (tut.seenHints.indexOf(id) === -1) tut.seenHints.push(id);
      });
    }
    return true;
  });

  bridge.registerMockHandler('tutorial.markHint', function (state, msg) {
    const tut = ensureTutorialState(state);
    if (!tut || !msg || typeof msg.hintId !== 'string') return;
    const id = msg.hintId.trim().toLowerCase();
    if (id && tut.seenHints.indexOf(id) === -1) {
      tut.seenHints.push(id);
    }
    return true;
  });

  bridge.registerMockHandler('tutorial.resetHints', function (state, msg) {
    const tut = ensureTutorialState(state);
    if (!tut) return;
    tut.seenHints = [];
    return true;
  });

  bridge.registerMockHandler('tutorial.replayTour', function (state, msg) {
    const tut = ensureTutorialState(state);
    if (!tut) return;
    tut.versionSeen = 0;
    tut.mode = (msg && msg.mode === 'update') ? 'update' : 'fresh';
    return true;
  });
})(typeof window !== 'undefined' ? window : this);
