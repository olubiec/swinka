(function () {
  'use strict';

  var mockRunState = {
    available: true,
    valid: true,
    reason: 'ok',
    cells: [
      [4, 3], [5, 3], [6, 3], [7, 3],
      [4, 4], [5, 4], [6, 4], [7, 4],
      [4, 5], [5, 5], [6, 5], [7, 5]
    ],
    capacity: 2,
    out: [],
    candidates: [
      { pigId: 'starter', name: 'Cuy', portrait: null, out: false, memorial: false },
      { pigId: 'kuki', name: 'Kuki', portrait: null, out: false, memorial: false }
    ],
    verdict: { ok: true, code: 'Ok', message: 'Ready for the garden run' }
  };

  function syncCandidates() {
    var outSet = new Set(mockRunState.out.map(function (o) { return o.pigId; }));
    mockRunState.candidates.forEach(function (c) {
      c.out = outSet.has(c.pigId);
    });
  }

  function handleOut(msg) {
    var pigId = msg && msg.pigId;
    if (!pigId || !mockRunState.valid || !mockRunState.verdict.ok) return;
    if (mockRunState.out.some(function (o) { return o.pigId === pigId; })) return;
    if (mockRunState.out.length >= mockRunState.capacity) return;
    var cand = mockRunState.candidates.find(function (c) { return c.pigId === pigId && !c.memorial; });
    if (!cand) return;
    mockRunState.out.push({ pigId: pigId, since: new Date().toISOString(), hoursToday: 0 });
    syncCandidates();
  }

  function handleIn(msg) {
    var pigId = msg && msg.pigId;
    if (!pigId) return;
    mockRunState.out = mockRunState.out.filter(function (o) { return o.pigId !== pigId; });
    syncCandidates();
  }

  if (window.bridge && typeof window.bridge.registerMockState === 'function') {
    window.bridge.registerMockState('run', function () {
      syncCandidates();
      return JSON.parse(JSON.stringify(mockRunState));
    });
  }

  if (window.bridge && typeof window.bridge.registerMockHandler === 'function') {
    window.bridge.registerMockHandler('run.out', handleOut);
    window.bridge.registerMockHandler('run_out', handleOut);
    window.bridge.registerMockHandler('run.in', handleIn);
    window.bridge.registerMockHandler('run_in', handleIn);
  }
})();
