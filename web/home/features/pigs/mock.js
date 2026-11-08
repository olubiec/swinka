(function (root) {
  'use strict';

  const bridge = root.bridge || (typeof window !== 'undefined' ? window.bridge : null);
  if (!bridge) return;

  function buildLook(pig, stage) {
    if (root.CuyLook && typeof root.CuyLook.resolve === 'function') {
      return root.CuyLook.resolve(pig, stage);
    }
    const normStage = stage || (pig && pig.stage) || 'adult';
    const namedId = pig && (pig.namedId || (pig.id && ['kuki', 'ned', 'glen', 'james', 'racuch'].includes(String(pig.id).toLowerCase()) ? String(pig.id).toLowerCase() : null));
    const breed = (pig && pig.breed) || 'smooth';
    const coat = (pig && (pig.paletteId || pig.coat)) || 'tricolor';
    let spriteKey;
    if (namedId) {
      spriteKey = 'sprites/pigs/' + namedId + '/' + normStage + '/spritesheet.png';
    } else if (breed === 'smooth' || breed === 'smooth_normal') {
      spriteKey = 'sprites/' + normStage + '/spritesheet.png';
    } else {
      spriteKey = 'sprites/breeds/' + breed + '/' + normStage + '/spritesheet.png';
    }
    return {
      spriteKey: spriteKey,
      breed: breed,
      coat: coat,
      stage: normStage,
      named: namedId
    };
  }

  if (bridge.registerMockState) {
    bridge.registerMockState('pigs', function (st) {
      if (!st) return;
      if (!Array.isArray(st.roster)) st.roster = [];

      const starterPig = {
        id: 'starter',
        name: 'Cuy',
        breed: 'smooth',
        paletteId: 'tricolor',
        namedId: null,
        stage: 'adult',
        ageYears: 2.0,
        memorial: false,
        blurb: 'A happy, curious little friend.',
        traits: ['cuddly'],
        discoveredTraits: ['cuddly'],
        look: {
          spriteKey: 'sprites/adult/spritesheet.png',
          breed: 'smooth',
          coat: 'blaze_only.ginger',
          stage: 'adult',
          named: null
        }
      };

      const kukiPig = {
        id: 'kuki',
        name: 'Kuki',
        breed: 'rosette_normal',
        paletteId: 'two_tone.ginger',
        namedId: 'kuki',
        stage: 'adult',
        ageYears: 1.5,
        memorial: false,
        blurb: 'Friendly and calm. Gets along with everybody.',
        traits: [],
        look: {
          spriteKey: 'sprites/pigs/kuki/adult/spritesheet.png',
          breed: 'rosette_normal',
          coat: 'two_tone.ginger',
          stage: 'adult',
          named: 'kuki'
        }
      };

      const nedPig = {
        id: 'ned',
        name: 'Ned',
        breed: 'teddy_chubby',
        paletteId: 'bicolor_head.chocolate',
        namedId: 'ned',
        stage: 'adult',
        ageYears: 0.3,
        memorial: false,
        blurb: 'Lazy, curious and always hungry.',
        traits: ['sleepyhead', 'glutton', 'explorer'],
        look: {
          spriteKey: 'sprites/pigs/ned/adult/spritesheet.png',
          breed: 'teddy_chubby',
          coat: 'bicolor_head.chocolate',
          stage: 'adult',
          named: 'ned'
        }
      };

      const jamesPig = {
        id: 'james',
        name: 'James',
        breed: 'teddy_normal',
        paletteId: 'roan.slate',
        namedId: 'james',
        stage: 'adult',
        ageYears: 2.1,
        memorial: false,
        blurb: 'Loud and jumpy, but strong.',
        traits: ['vocal', 'skittish'],
        look: {
          spriteKey: 'sprites/pigs/james/adult/spritesheet.png',
          breed: 'teddy_normal',
          coat: 'roan.slate',
          stage: 'adult',
          named: 'james'
        }
      };

      const mockPigs = [starterPig, kukiPig, nedPig, jamesPig];

      // Update or insert mock pigs into roster
      mockPigs.forEach(p => {
        let existing = st.roster.find(r => r && (r.id === p.id || (p.namedId && r.namedId === p.namedId)));
        if (!existing) {
          existing = Object.assign({}, p);
          st.roster.push(existing);
        } else {
          if (!existing.namedId && p.namedId) existing.namedId = p.namedId;
          if (!existing.breed) existing.breed = p.breed;
          if (!existing.paletteId) existing.paletteId = p.paletteId;
          if (!existing.stage) existing.stage = p.stage;
          existing.look = p.look;
        }
      });

      // Ensure every pig in roster has look
      st.roster.forEach(pig => {
        if (!pig.look) {
          pig.look = buildLook(pig);
        }
      });

      if (!Array.isArray(st.activePigIds) || st.activePigIds.length === 0) {
        st.activePigIds = ['starter', 'kuki'];
      }

      // Also ensure offers have look
      if (Array.isArray(st.offers)) {
        st.offers.forEach(o => {
          if (o && !o.look) o.look = buildLook(o);
        });
      }

      // Ensure rooms.pigRooms have look
      if (st.rooms && Array.isArray(st.rooms.pigRooms)) {
        st.rooms.pigRooms.forEach(r => {
          const matchingPig = st.roster.find(p => p && (p.id === r.pigId || p.namedId === r.pigId));
          if (matchingPig && matchingPig.look) {
            r.look = matchingPig.look;
          } else if (!r.look) {
            r.look = buildLook({ id: r.pigId, namedId: r.pigId, stage: 'adult' });
          }
        });
      }
    });
  }
})(typeof window !== 'undefined' ? window : this);
