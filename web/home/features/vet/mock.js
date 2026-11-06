(function() {
  'use strict';

  const bridge = window.bridge;
  if (!bridge || !bridge.registerMockHandler) return;

  if (bridge.registerMockState) {
    bridge.registerMockState('vet', function(st) {
      if (!st.vet) {
        st.vet = {
          isSick: false,
          checkupPrice: 30,
          lastCheckup: null,
          conditions: [],
          history: [],
          symptoms: []
        };
      }
    });
  }

  bridge.registerMockHandler('vet_checkup', function(st, action) {
    const price = (st.vet && typeof st.vet.checkupPrice === 'number') ? st.vet.checkupPrice : 30;
    if ((st.clovers || 0) < price) {
      this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' });
      return;
    }

    st.clovers -= price;

    let found = 0;
    let newlyKnown = 0;

    if (st.vet && Array.isArray(st.vet.conditions)) {
      found = st.vet.conditions.length;
      st.vet.conditions.forEach(cond => {
        if (!cond.known) {
          newlyKnown++;
          cond.known = true;
        }
      });
      st.vet.isSick = st.vet.conditions.length > 0;
      st.vet.lastCheckup = new Date().toISOString().slice(0, 16);
    }

    this.dispatchMessage({
      type: 'vet_checkup_result',
      found: found,
      newlyKnown: newlyKnown
    });
  });

  bridge.registerMockHandler('vet_treat', function(st, action) {
    if (!st.vet || !Array.isArray(st.vet.conditions)) return;
    const cond = st.vet.conditions.find(c => c.id === action.conditionId);
    if (!cond || !cond.known || cond.treated) return;
    const price = cond.price || 0;
    if ((st.clovers || 0) < price) {
      this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' });
      return;
    }
    st.clovers -= price;
    cond.treated = true;
  });

  bridge.registerMockHandler('vet_dose', function(st, action) {
    if (!st.vet || !Array.isArray(st.vet.conditions)) return;
    const cond = st.vet.conditions.find(c => c.id === action.conditionId);
    if (!cond || !cond.treated) return;
    if (cond.courseDaysLeft > 0) {
      cond.courseDaysLeft--;
      cond.doseDueToday = false;
    }
  });
})();
