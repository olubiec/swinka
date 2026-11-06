// Browser mock for the adoption gate (PK-P4b). Mirrors state `adoption` and the message adoption_accept.
// A fresh mock state starts with one ordinary pig; Kuki and Ned wait behind the gate.
(function () {
  'use strict';
  const bridge = window.bridge;
  if (!bridge || !bridge.registerMockState || !bridge.registerMockHandler) return;

  const GATE = ['kuki', 'ned'];
  const STARTER_LOOK = { breed: 'smooth', paletteId: 'tricolor' };

  function withLook(p) {
    if (p.look && p.look.breed) return p;
    p.look = p.namedId ? { breed: p.breed, paletteId: p.paletteId } : { breed: STARTER_LOOK.breed, paletteId: STARTER_LOOK.paletteId };
    return p;
  }

  bridge.registerMockState('pigs-adoption', function (st) {
    if (!Array.isArray(st.roster)) return;
    if (!st.adoptionMock) {
      st.adoptionMock = true;
      const held = st.roster.filter(p => p && GATE.indexOf(p.namedId || p.id) >= 0);
      st.roster = st.roster.filter(p => p && GATE.indexOf(p.namedId || p.id) < 0);
      if (st.roster.length === 0) {
        st.roster.push({
          id: 'pig_starter', name: 'Cuy', breed: STARTER_LOOK.breed, paletteId: STARTER_LOOK.paletteId,
          traits: ['cuddly'], discoveredTraits: ['cuddly'], namedId: null, ageYears: 0.2, stage: 'junior',
          memorial: false, blurb: ''
        });
      }
      st.activePigIds = [st.roster[0].id];
      st.adoption = {
        pending: false,
        accepted: false,
        gateIds: GATE.slice(),
        pigs: held.map(p => withLook(JSON.parse(JSON.stringify(p))))
      };
    }
    st.roster.forEach(withLook);
  });

  // Mock event "adoption available": the offer becomes pending.
  bridge.registerMockHandler('mock_adoption_available', function (st) {
    if (st.adoption && !st.adoption.accepted) st.adoption.pending = true;
  });

  bridge.registerMockHandler('adoption_accept', function (st) {
    const a = st.adoption;
    if (!a || !a.pending || a.accepted) return;
    a.pigs.forEach(p => {
      if (!st.roster.some(r => r.id === p.id)) st.roster.push(JSON.parse(JSON.stringify(p)));
    });
    a.pending = false;
    a.accepted = true;
    this.dispatchMessage({ type: 'toast', text: 'Welcome ' + a.pigs.map(p => p.name).join(' and ') + ' to the family!' });
  });
})();
