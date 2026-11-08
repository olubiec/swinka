(function (root) {
  'use strict';

  function formatRemaining(ms) {
    let num;
    try {
      num = Number(ms);
    } catch (e) {
      return 'Ready';
    }
    if (!Number.isFinite(num) || num <= 0) {
      return 'Ready';
    }
    const totalMs = Math.floor(num);
    const totalMinutes = Math.floor(totalMs / 60000);
    if (totalMinutes < 1) {
      return '<1m';
    }
    const totalHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (totalHours < 1) {
      return `${minutes}m`;
    }
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days < 1) {
      return `${hours}h ${minutes}m`;
    }
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (root) {
    root.CuyPigs = root.CuyPigs || {};
    root.CuyPigs.formatRemaining = formatRemaining;
  }

  // Ensure CuyLook is defined if loaded before canvas-pig.js
  root.CuyLook = root.CuyLook || {};
  if (typeof root.CuyLook.spriteFor !== 'function') {
    const KNOWN_NAMED_PIGS = new Set(['kuki', 'ned', 'james', 'glen', 'racuch']);
    const VALID_STAGES = new Set(['baby', 'junior', 'adult', 'senior', 'legend']);

    function normStage(stage) {
      if (!stage || typeof stage !== 'string') return 'adult';
      stage = stage.trim().toLowerCase();
      return VALID_STAGES.has(stage) ? stage : 'adult';
    }

    function normBreed(breed) {
      if (!breed || typeof breed !== 'string') return 'smooth';
      breed = breed.trim().toLowerCase();
      switch (breed) {
        case 'smooth':
        case 'smooth_normal':
          return 'smooth';
        case 'chubby':
        case 'smooth_chubby':
          return 'smooth_chubby';
        case 'skinny':
        case 'smooth_lean':
          return 'smooth_lean';
        case 'rosette':
        case 'rosette_normal':
          return 'rosette_normal';
        case 'rosette_lean':
          return 'rosette_lean';
        case 'peruvian':
        case 'peruvian_normal':
          return 'peruvian_normal';
        case 'teddy':
        case 'teddy_normal':
          return 'teddy_normal';
        case 'teddy_chubby':
          return 'teddy_chubby';
        default:
          return 'smooth';
      }
    }

    function resolveLook(pig, stageOverride) {
      if (!pig) {
        const s = normStage(stageOverride);
        return {
          spriteKey: 'sprites/' + s + '/spritesheet.png',
          breed: 'smooth',
          coat: 'tricolor',
          stage: s,
          named: null
        };
      }

      if (typeof pig === 'string') {
        const clean = pig.replace(/^pig:/, '').trim().toLowerCase();
        if (clean === 'more' || clean === 'more-tile') {
          const state = (root.bridge && root.bridge.currentState) || (root.bridge && typeof root.bridge.getState === 'function' && root.bridge.getState());
          const active = (state && state.roster && (state.roster.find(p => p && (p.id === (state.activePigIds && state.activePigIds[0]))) || state.roster[0])) || null;
          return resolveLook(active, stageOverride);
        }
        if (KNOWN_NAMED_PIGS.has(clean)) {
          let b = 'smooth', c = 'tricolor';
          if (clean === 'kuki') { b = 'rosette_normal'; c = 'two_tone.ginger'; }
          else if (clean === 'ned') { b = 'teddy_chubby'; c = 'bicolor_head.chocolate'; }
          else if (clean === 'james') { b = 'teddy_normal'; c = 'roan.slate'; }
          else if (clean === 'glen') { b = 'rosette_lean'; c = 'self.black'; }
          else if (clean === 'racuch') { b = 'smooth_chubby'; c = 'saddle.ginger'; }
          const s = normStage(stageOverride);
          return {
            spriteKey: 'sprites/pigs/' + clean + '/' + s + '/spritesheet.png',
            breed: b,
            coat: c,
            stage: s,
            named: clean
          };
        }
        if (clean === 'starter' || clean === 'cuy' || clean === 'pig_default') {
          const s = normStage(stageOverride);
          return {
            spriteKey: 'sprites/' + s + '/spritesheet.png',
            breed: 'smooth',
            coat: 'blaze_only.ginger',
            stage: s,
            named: null
          };
        }
        const b = normBreed(clean);
        const s = normStage(stageOverride);
        return {
          spriteKey: b === 'smooth' ? 'sprites/' + s + '/spritesheet.png' : 'sprites/breeds/' + b + '/' + s + '/spritesheet.png',
          breed: b,
          coat: 'tricolor',
          stage: s,
          named: null
        };
      }

      if (pig.nodeType === 1) {
        if (pig.dataset) {
          if (pig.dataset.spriteKey) return { spriteKey: pig.dataset.spriteKey };
          if (pig.dataset.room) return resolveLook(pig.dataset.room, stageOverride);
          if (pig.dataset.pigId) return resolveLook(pig.dataset.pigId, stageOverride);
          if (pig.dataset.openFeature === 'pigs') return resolveLook('more', stageOverride);
        }
      }

      if (pig.look && pig.look.spriteKey) {
        const s = normStage(stageOverride || pig.look.stage || pig.stage);
        const named = pig.look.named || (pig.look.spriteKey.includes('sprites/pigs/') ? pig.look.spriteKey.split('/')[2] : null);
        let coat = pig.look.coat || pig.look.paletteId || pig.paletteId || 'blaze_only.ginger';
        if (!coat || coat === 'tricolor') coat = 'blaze_only.ginger';
        return {
          spriteKey: pig.look.spriteKey,
          breed: pig.look.breed || normBreed(pig.breed),
          coat: coat,
          stage: s,
          named: named
        };
      }

      if (pig.spriteKey) {
        let coat = pig.coat || pig.paletteId || 'blaze_only.ginger';
        if (!coat || coat === 'tricolor') coat = 'blaze_only.ginger';
        return {
          spriteKey: pig.spriteKey,
          breed: pig.breed || 'smooth',
          coat: coat,
          stage: normStage(stageOverride || pig.stage),
          named: pig.named || null
        };
      }

      // Fallback for old state without look
      const s = normStage(stageOverride || pig.stage || (pig.look && pig.look.stage));
      const b = normBreed(pig.breed || (pig.look && pig.look.breed));
      let coat = pig.paletteId || (pig.look && pig.look.paletteId) || pig.coat || 'blaze_only.ginger';
      if (!coat || coat === 'tricolor') coat = 'blaze_only.ginger';

      let rawNamed = pig.namedId || (pig.look && pig.look.namedId);
      if (!rawNamed && pig.id && KNOWN_NAMED_PIGS.has(String(pig.id).toLowerCase())) {
        rawNamed = String(pig.id).toLowerCase();
      }
      const named = (rawNamed && KNOWN_NAMED_PIGS.has(String(rawNamed).toLowerCase())) ? String(rawNamed).toLowerCase() : null;

      let spriteKey;
      if (named) {
        spriteKey = 'sprites/pigs/' + named + '/' + s + '/spritesheet.png';
      } else if (b === 'smooth') {
        spriteKey = 'sprites/' + s + '/spritesheet.png';
      } else {
        spriteKey = 'sprites/breeds/' + b + '/' + s + '/spritesheet.png';
      }

      return {
        spriteKey: spriteKey,
        breed: b,
        coat: coat,
        stage: s,
        named: named
      };
    }

    function spriteFor(pig, stageOverride) {
      const desc = resolveLook(pig, stageOverride);
      return desc ? desc.spriteKey : null;
    }

    root.CuyLook.resolve = resolveLook;
    root.CuyLook.spriteFor = spriteFor;
    if (typeof window !== 'undefined') {
      window.CuyLook = root.CuyLook;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = formatRemaining;
    module.exports.formatRemaining = formatRemaining;
    module.exports.CuyLook = root.CuyLook;
    module.exports.spriteFor = root.CuyLook.spriteFor;
  }

  if (!root || !root.CuyHome) return;

  let activeContainer = null;
  let activeApi = null;
  let refreshTimer = null;
  let lastState = null;

  function getOfferRemainingMs(offer) {
    if (!offer) return 0;
    let baseMs = 0;
    if (typeof offer.remainingMs === 'number') {
      baseMs = offer.remainingMs;
    } else if (typeof offer.daysLeft === 'number') {
      baseMs = offer.daysLeft * 86400000;
    } else {
      return 0;
    }
    if (!offer._receivedAt) {
      offer._receivedAt = Date.now();
    }
    const elapsed = Math.max(0, Date.now() - offer._receivedAt);
    return Math.max(0, baseMs - elapsed);
  }

  const KNOWN_NAMED_PNGS = new Set(['kuki', 'ned', 'james', 'glen', 'racuch']);

  function renderPigPortrait(pig, size) {
    const sz = size === 64 ? 64 : 32;
    if (!pig) {
      return `<span class="pixel-icon icon-pig-head"></span>`;
    }

    const spriteKey = (root.CuyLook && root.CuyLook.spriteFor) ? root.CuyLook.spriteFor(pig) : null;
    let look = null;
    let stage = 'adult';
    let id = null;

    if (root.CuyLook && root.CuyLook.resolve) {
      const desc = root.CuyLook.resolve(pig, (pig && pig.stage) || 'adult');
      if (desc) {
        look = {
          spriteKey: desc.spriteKey,
          breed: desc.breed,
          paletteId: desc.coat,
          coat: desc.coat,
          namedId: desc.named,
          stage: desc.stage
        };
        stage = desc.stage;
        id = desc.named;
      }
    } else {
      if (typeof pig === 'string') {
        id = pig;
        const offers = getFallbackOffers();
        const match = offers.find(o => o.id === pig);
        if (match) {
          look = match.look;
          stage = match.stage || 'adult';
        }
      } else if (typeof pig === 'object') {
        id = pig.namedId || pig.id;
        stage = pig.stage || 'adult';
        if (pig.look && (pig.look.breed || pig.look.paletteId)) {
          look = pig.look;
        } else if (pig.breed || pig.paletteId) {
          look = { breed: pig.breed, paletteId: pig.paletteId };
        }
      }
    }

    if (look && root.CuyPig && typeof root.CuyPig.renderPortrait === 'function') {
      const cvs = root.CuyPig.renderPortrait(look, stage, sz);
      if (cvs) {
        const dataUrl = cvs.toDataURL();
        const portraitId = 'portrait_' + Math.random().toString(36).substr(2, 9);
        cvs._onUpdate = (c) => {
          const el = document.getElementById(portraitId);
          if (el) el.src = c.toDataURL();
        };
        const attrSpriteKey = spriteKey ? ` data-sprite-key="${spriteKey}"` : '';
        return `<img id="${portraitId}" class="pig-portrait${sz === 64 ? ' size-64' : ''}"${attrSpriteKey} src="${dataUrl}" width="${sz}" height="${sz}" alt="">`;
      }
    }

    if (id && KNOWN_NAMED_PNGS.has(id)) {
      const attrSpriteKey = spriteKey ? ` data-sprite-key="${spriteKey}"` : '';
      return `<img class="pig-portrait${sz === 64 ? ' size-64' : ''}"${attrSpriteKey} src="../../assets/sprites/portraits/${id}.png" width="${sz}" height="${sz}" alt="" onerror="this.onerror=null; this.outerHTML='<span class=\\'pixel-icon icon-pig-head\\'></span>';">`;
    }

    return `<span class="pixel-icon icon-pig-head"></span>`;
  }

  function getFallbackOffers(roster) {
    const isAdopted = (id) => (roster || []).some(p => p && p.namedId === id);
    return [
      {
        id: 'kuki',
        name: 'Kuki',
        unlocked: true,
        daysLeft: 0,
        cost: 0,
        group: 'starter',
        adopted: isAdopted('kuki'),
        look: { breed: 'rosette_normal', paletteId: 'two_tone.ginger' },
        blurb: 'Friendly and calm. Gets along with everybody.',
        traits: []
      },
      {
        id: 'ned',
        name: 'Ned',
        unlocked: true,
        daysLeft: 0,
        cost: 0,
        group: 'starter',
        adopted: isAdopted('ned'),
        look: { breed: 'teddy_chubby', paletteId: 'bicolor_head.chocolate' },
        blurb: 'Lazy, curious and always hungry.',
        traits: ['sleepyhead', 'glutton', 'explorer']
      },
      {
        id: 'james',
        name: 'James',
        unlocked: false,
        daysLeft: 90,
        cost: 100,
        group: null,
        adopted: isAdopted('james'),
        look: { breed: 'teddy_normal', paletteId: 'roan.slate' },
        blurb: 'Loud and jumpy, but strong.',
        traits: ['vocal', 'skittish']
      },
      {
        id: 'glen',
        name: 'Glen',
        unlocked: false,
        daysLeft: 105,
        cost: 100,
        group: null,
        adopted: isAdopted('glen'),
        look: { breed: 'rosette_lean', paletteId: 'self.black' },
        blurb: 'Quiet and cuddly. Eats little and rarely rushes.',
        traits: ['cuddly']
      },
      {
        id: 'racuch',
        name: 'Racuch',
        unlocked: false,
        daysLeft: 130,
        cost: 100,
        group: null,
        adopted: isAdopted('racuch'),
        look: { breed: 'smooth_chubby', paletteId: 'saddle.ginger' },
        blurb: 'Round, cheerful and always on the move.',
        traits: ['popcorning', 'glutton']
      }
    ];
  }

  // The pig's own room (W25-06): joined by pigId. Null when rooms.pigRooms is missing.
  function roomForPig(state, pig) {
    const rooms = state && state.rooms;
    if (!rooms || !Array.isArray(rooms.pigRooms) || !pig || !pig.namedId) return null;
    return rooms.pigRooms.find(r => r && r.pigId === pig.namedId) || null;
  }

  function escAttr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function isGardenUnlocked(state) {
    const places = (state && state.places && state.places.places) || [];
    const garden = places.find(p => p && p.id === 'garden');
    return !!(garden && garden.unlocked);
  }

  function render(container, api, state) {
    const clovers = (state && state.clovers) || 0;
    const gardenUnlocked = isGardenUnlocked(state);
    const defaultRoster = [
      {
        id: 'pig_default',
        name: (state && state.pet && state.pet.name) || (state && state.name) || 'Cuy',
        breed: 'smooth',
        paletteId: 'tricolor',
        namedId: null,
        ageYears: 2.3,
        stage: (state && state.stageKey) || 'adult',
        memorial: false,
        blurb: 'A happy, curious little friend.',
        traits: ['cuddly'],
        discoveredTraits: ['cuddly']
      }
    ];

    const roster = (state && state.roster && state.roster.length > 0) ? state.roster : defaultRoster;
    const activeIds = (state && state.activePigIds) || [roster[0]?.id || 'pig_default'];
    const offers = (state && state.offers && state.offers.length > 0) ? state.offers : getFallbackOffers(roster);

    let html = `
      <div class="feature-pigs-container">
        <div class="pigs-header">
          <div class="pigs-stats">
            <span><span class="pixel-icon icon-clover"></span> Clovers: <b>${clovers}</b></span>
            <span>Active on desk: <b>${activeIds.length}/2</b></span>
          </div>
          <button type="button" class="game-btn btn-adopt-pig" id="btnAdoptPig" ${clovers < 80 ? 'disabled' : ''} aria-label="Adopt random pig for 80 clovers">
            Adopt (80 <span class="pixel-icon icon-clover"></span>)
          </button>
        </div>

        <div class="pigs-section-header">
          <span class="pixel-icon icon-heart"></span> My Pigs
        </div>

        <div class="pigs-grid">
    `;

    roster.forEach(pig => {
      const isActive = activeIds.includes(pig.id);
      const isMemorial = !!pig.memorial;
      const stageName = pig.stage || (state && state.stageKey) || 'adult';
      const ageVal = typeof pig.ageYears === 'number' ? pig.ageYears.toFixed(1) : (pig.ageYears || '0.0');
      const ageText = `${ageVal} years`;

      const hasTraits = Array.isArray(pig.traits) && pig.traits.length > 0;
      let traitsOrBlurbHtml = '';
      if (hasTraits) {
        const traitsBadges = pig.traits.map(t => {
          const isDiscovered = (pig.discoveredTraits || []).includes(t);
          return `<span class="pig-trait-badge ${isDiscovered ? 'discovered' : 'secret'}">${isDiscovered ? `<span class="pixel-icon icon-trait-${t}"></span> ${t}` : '???'}</span>`;
        }).join(' ');
        traitsOrBlurbHtml = `<div class="pig-card-traits">${traitsBadges}</div>`;
        if (pig.blurb) {
          traitsOrBlurbHtml += `<div class="pig-card-blurb">${pig.blurb}</div>`;
        }
      } else {
        // Pigs without traits show the blurb instead
        traitsOrBlurbHtml = `<div class="pig-card-blurb">${pig.blurb || ''}</div>`;
      }

      let memorialSectionHtml = '';
      if (isMemorial) {
        memorialSectionHtml = `
          <div class="pig-memorial-status">
            <span class="pixel-icon icon-candle"></span> Forever in the family
          </div>
          <button type="button" class="game-btn btn-memorial-toggle" data-pig-id="${pig.id}" data-action="off" aria-label="Toggle memorial for ${pig.name}">
            Return from Memorial
          </button>
          ${gardenUnlocked ? `<button type="button" class="game-btn btn-memory-corner" aria-label="Visit the memory corner for ${pig.name}">Visit the memory corner</button>` : ''}
        `;
      } else {
        memorialSectionHtml = `
          <div class="pig-memorial-wrap">
            <button type="button" class="game-btn btn-memorial-toggle" data-pig-id="${pig.id}" data-action="ask" aria-label="Move ${pig.name} to memorial">
              Memorial
            </button>
            <div class="memorial-confirm-row" id="memorialConfirm_${pig.id}" style="display: none;">
              <span class="memorial-confirm-msg">Forever in the family?</span>
              <div class="memorial-confirm-buttons">
                <button type="button" class="game-btn btn-confirm-yes" data-pig-id="${pig.id}" aria-label="Confirm memorial for ${pig.name}">Confirm</button>
                <button type="button" class="game-btn btn-confirm-no" data-pig-id="${pig.id}" aria-label="Cancel">Cancel</button>
              </div>
            </div>
          </div>
        `;
      }

      const room = roomForPig(state, pig);
      const roomLinkHtml = room
        ? `<button type="button" class="game-btn btn-visit-room" data-room-id="${escAttr(room.roomId)}" aria-label="${isMemorial || room.memorial ? 'Visit the memory room of ' : 'Visit the room of '}${escAttr(pig.name)}">${isMemorial || room.memorial ? 'Visit the memory room' : 'Visit my room'}</button>`
        : '';

      const pigSpriteKey = (root.CuyLook && root.CuyLook.spriteFor) ? root.CuyLook.spriteFor(pig) : '';
      html += `
        <div class="pig-card ${isActive ? 'pig-active' : ''} ${isMemorial ? 'pig-memorial' : ''}" data-pig-id="${pig.id}" data-sprite-key="${pigSpriteKey}">
          <div class="pig-card-header">
            <span class="pig-card-name">${pig.name}</span>
            <div class="pig-card-meta">
              <span class="pig-stage-badge"><span class="pixel-icon icon-stage-${stageName}"></span> ${stageName}</span>
              <span class="pig-card-age">${ageText}</span>
            </div>
            ${pig.breed ? `<span class="pig-card-breed">${pig.breed}</span>` : ''}
          </div>
          <div class="pig-card-portrait" data-sprite-key="${pigSpriteKey}">
            ${renderPigPortrait(pig)}
          </div>
          ${traitsOrBlurbHtml}
          <div class="pig-card-actions">
            <button type="button" class="game-btn btn-toggle-active" data-toggle-id="${pig.id}" aria-label="${isActive ? 'Rest ' + pig.name + ' in cage' : 'Bring ' + pig.name + ' to desk'}">
              ${isActive ? 'Rest in Cage' : 'Bring to Desk'}
            </button>
            ${roomLinkHtml}
            ${(!isMemorial && gardenUnlocked) ? `<button type="button" class="game-btn btn-walk-garden" data-pig-id="${pig.id}" aria-label="Take ${pig.name} for a walk in the garden">Go for a walk</button>` : ''}
            ${memorialSectionHtml}
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="pigs-section-header">
          <span class="pixel-icon icon-gift-offer"></span> Adoption Offers
        </div>

        <div class="pigs-offers-grid">
    `;

    // Process starter group if both are unadopted
    const starterOffers = offers.filter(o => o.group === 'starter');
    const starterBothUnadopted = starterOffers.length > 1 && starterOffers.every(o => !o.adopted);

    if (starterBothUnadopted) {
      const namesJoined = starterOffers.map(p => p.name).join(' and ');
      html += `
        <div class="pig-card pig-offer-group-card" data-group-id="starter">
          <div class="offer-group-header">
            <span class="pixel-icon icon-pair-pigs"></span> Starter Pair (${namesJoined})
          </div>
          <div class="offer-group-pigs">
            ${starterOffers.map(p => `
              <div class="offer-group-pig">
                <div class="pig-card-portrait">
                  ${renderPigPortrait(p)}
                </div>
                <span class="offer-pig-name">${p.name}</span>
                ${(p.traits && p.traits.length > 0) ? `
                  <div class="pig-card-traits">
                    ${p.traits.map(t => `<span class="pig-trait-badge discovered"><span class="pixel-icon icon-trait-${t}"></span> ${t}</span>`).join(' ')}
                  </div>
                ` : ''}
                <div class="pig-card-blurb">${p.blurb || ''}</div>
              </div>
            `).join('')}
          </div>
          <div class="pig-card-actions">
            <button type="button" class="game-btn btn-adopt-group" data-group-id="starter" aria-label="Adopt both ${namesJoined}">
              Adopt both
            </button>
          </div>
        </div>
      `;
    }

    // Other offers (or all offers if starterBothUnadopted is false)
    offers.forEach(offer => {
      if (starterBothUnadopted && offer.group === 'starter') {
        return; // Already rendered in group
      }

      if (offer.adopted) {
        html += `
          <div class="pig-card pig-offer-card offer-adopted" data-offer-id="${offer.id}">
            <div class="pig-card-header">
              <span class="pig-card-name">${offer.name}</span>
            </div>
            <div class="pig-card-portrait">
              ${renderPigPortrait(offer)}
            </div>
            <div class="pig-card-blurb">${offer.blurb || ''}</div>
            <div class="pig-card-actions">
              <span class="offer-adopted-badge"><span class="pixel-icon icon-check"></span> Adopted</span>
            </div>
          </div>
        `;
      } else if (offer.unlocked) {
        const canAfford = clovers >= (offer.cost || 0);
        const costLabel = offer.cost > 0 ? offer.cost : 'free';
        html += `
          <div class="pig-card pig-offer-card" data-offer-id="${offer.id}">
            <div class="pig-card-header">
              <span class="pig-card-name">${offer.name}</span>
            </div>
            <div class="pig-card-portrait">
              ${renderPigPortrait(offer)}
            </div>
            ${(offer.traits && offer.traits.length > 0) ? `
              <div class="pig-card-traits">
                ${offer.traits.map(t => `<span class="pig-trait-badge discovered"><span class="pixel-icon icon-trait-${t}"></span> ${t}</span>`).join(' ')}
              </div>
            ` : ''}
            <div class="pig-card-blurb">${offer.blurb || ''}</div>
            <div class="pig-card-actions">
              <button type="button" class="game-btn btn-adopt-named" data-offer-id="${offer.id}" ${canAfford ? '' : 'disabled'} aria-label="Adopt ${offer.name} (${costLabel})">
                Adopt (${costLabel})
              </button>
              <button type="button" class="game-btn btn-adopt-memory" data-offer-id="${offer.id}" aria-label="Adopt ${offer.name} in memory (free)">
                Adopt in memory (free)
              </button>
            </div>
          </div>
        `;
      } else {
        const remainingMs = getOfferRemainingMs(offer);
        const remainingText = formatRemaining(remainingMs);
        html += `
          <div class="pig-card pig-offer-card offer-locked" data-offer-id="${offer.id}">
            <div class="pig-card-header">
              <span class="pig-card-name">${offer.name}</span>
            </div>
            <div class="pig-card-portrait">
              ${renderPigPortrait(offer)}
            </div>
            <div class="pig-card-blurb">${offer.blurb || ''}</div>
            <div class="offer-locked-info">
              <span class="pixel-icon icon-padlock"></span>
              <span>${remainingText}</span>
            </div>
            <div class="pig-card-actions">
              <button type="button" class="game-btn btn-locked" disabled aria-label="Locked: ${remainingText}">
                <span class="pixel-icon icon-padlock"></span> Locked
              </button>
            </div>
          </div>
        `;
      }
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Handle Adopt Pig (random)
    const btnAdopt = container.querySelector('#btnAdoptPig');
    if (btnAdopt) {
      btnAdopt.addEventListener('click', () => {
        if (root.Sound) root.Sound.popcorn();
        api.send({ type: 'adopt_pig' });
        // Mock fallback
        if (!window.chrome || !window.chrome.webview) {
          if (window.bridge && window.bridge.currentState) {
            const cur = window.bridge.currentState;
            if ((cur.clovers || 0) >= 80) {
              cur.clovers -= 80;
              if (!cur.roster) cur.roster = [...roster];
              const names = ['Piko', 'Milo', 'Luna', 'Koko', 'Buba', 'Zuzu'];
              const breeds = ['smooth', 'rosette', 'peruvian', 'chubby', 'skinny'];
              const palettes = ['tricolor', 'dutch', 'agouti', 'albino', 'cinnamon'];
              const traits = ['cuddly', 'glutton', 'explorer', 'popcorning', 'vocal'];
              const newPig = {
                id: 'pig_' + Date.now(),
                name: names[Math.floor(Math.random() * names.length)],
                breed: breeds[Math.floor(Math.random() * breeds.length)],
                paletteId: palettes[Math.floor(Math.random() * palettes.length)],
                namedId: null,
                ageYears: 0.1,
                stage: 'baby',
                memorial: false,
                blurb: 'A happy, curious little friend.',
                traits: [traits[Math.floor(Math.random() * traits.length)]],
                discoveredTraits: []
              };
              cur.roster.push(newPig);
              window.bridge.broadcastState();
              if (window.bridge.dispatchMessage) {
                window.bridge.dispatchMessage({ type: 'toast', text: `Welcome ${newPig.name} to the family!` });
              }
            }
          }
        }
      });
    }

    // Handle Toggle Active
    container.querySelectorAll('.btn-toggle-active').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleId;
        if (root.Sound) root.Sound.click();
        api.send({ type: 'toggle_pig_active', pigId: id });
        // Mock fallback
        if (!window.chrome || !window.chrome.webview) {
          if (window.bridge && window.bridge.currentState) {
            const cur = window.bridge.currentState;
            let act = cur.activePigIds || [...activeIds];
            if (act.includes(id)) {
              if (act.length > 1) act = act.filter(x => x !== id);
            } else {
              if (act.length >= 2) act.shift();
              act.push(id);
            }
            cur.activePigIds = act;
            window.bridge.broadcastState();
          }
        }
      });
    });

    // Handle Memorial Toggles
    container.querySelectorAll('.btn-memorial-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const pigId = btn.dataset.pigId;
        const action = btn.dataset.action;
        if (action === 'ask') {
          const confirmRow = container.querySelector(`#memorialConfirm_${pigId}`);
          if (confirmRow) {
            confirmRow.style.display = 'flex';
            btn.style.display = 'none';
          }
        } else if (action === 'off') {
          if (root.Sound) root.Sound.click();
          api.send({ type: 'set_memorial', pigId: pigId, on: false });
          // Mock fallback
          if (!window.chrome || !window.chrome.webview) {
            if (window.bridge && window.bridge.currentState) {
              const cur = window.bridge.currentState;
              const p = (cur.roster || []).find(x => x.id === pigId);
              if (p) p.memorial = false;
              window.bridge.broadcastState();
            }
          }
        }
      });
    });

    // Handle Memorial Confirmation
    container.querySelectorAll('.btn-confirm-yes').forEach(btn => {
      btn.addEventListener('click', () => {
        const pigId = btn.dataset.pigId;
        if (root.Sound) root.Sound.click();
        api.send({ type: 'set_memorial', pigId: pigId, on: true });
        // Mock fallback
        if (!window.chrome || !window.chrome.webview) {
          if (window.bridge && window.bridge.currentState) {
            const cur = window.bridge.currentState;
            const p = (cur.roster || []).find(x => x.id === pigId);
            if (p) p.memorial = true;
            window.bridge.broadcastState();
            if (window.bridge.dispatchMessage) {
              window.bridge.dispatchMessage({ type: 'toast', text: 'Forever in the family' });
            }
          }
        }
      });
    });

    container.querySelectorAll('.btn-confirm-no').forEach(btn => {
      btn.addEventListener('click', () => {
        const pigId = btn.dataset.pigId;
        const confirmRow = container.querySelector(`#memorialConfirm_${pigId}`);
        const askBtn = container.querySelector(`.btn-memorial-toggle[data-pig-id="${pigId}"][data-action="ask"]`);
        if (confirmRow) confirmRow.style.display = 'none';
        if (askBtn) askBtn.style.display = 'block';
      });
    });

    // Handle Adopt Named (standard)
    container.querySelectorAll('.btn-adopt-named').forEach(btn => {
      btn.addEventListener('click', () => {
        const offerId = btn.dataset.offerId;
        if (root.Sound) root.Sound.popcorn();
        api.send({ type: 'adopt_named', id: offerId, memorial: false });
        // Mock fallback
        if (!window.chrome || !window.chrome.webview) {
          if (window.bridge && window.bridge.currentState) {
            const cur = window.bridge.currentState;
            const off = (cur.offers || offers).find(o => o.id === offerId);
            const cost = off ? (off.cost || 0) : 0;
            if ((cur.clovers || 0) >= cost) {
              cur.clovers -= cost;
              if (off) off.adopted = true;
              if (!cur.roster) cur.roster = [...roster];
              const newPig = {
                id: 'pig_' + offerId,
                name: off ? off.name : offerId,
                breed: off?.look?.breed || 'smooth',
                paletteId: off?.look?.paletteId || 'tricolor',
                namedId: offerId,
                ageYears: 1.0,
                stage: 'adult',
                memorial: false,
                blurb: off?.blurb || '',
                traits: off?.traits ? [...off.traits] : [],
                discoveredTraits: off?.traits ? [...off.traits] : []
              };
              cur.roster.push(newPig);
              window.bridge.broadcastState();
              if (window.bridge.dispatchMessage) {
                window.bridge.dispatchMessage({ type: 'toast', text: `Welcome ${newPig.name} to the family!` });
              }
            }
          }
        }
      });
    });

    // Handle Adopt Named in Memory
    container.querySelectorAll('.btn-adopt-memory').forEach(btn => {
      btn.addEventListener('click', () => {
        const offerId = btn.dataset.offerId;
        if (root.Sound) root.Sound.click();
        api.send({ type: 'adopt_named', id: offerId, memorial: true });
        // Mock fallback
        if (!window.chrome || !window.chrome.webview) {
          if (window.bridge && window.bridge.currentState) {
            const cur = window.bridge.currentState;
            const off = (cur.offers || offers).find(o => o.id === offerId);
            if (off) off.adopted = true;
            if (!cur.roster) cur.roster = [...roster];
            const newPig = {
              id: 'pig_' + offerId,
              name: off ? off.name : offerId,
              breed: off?.look?.breed || 'smooth',
              paletteId: off?.look?.paletteId || 'tricolor',
              namedId: offerId,
              ageYears: 1.0,
              stage: 'adult',
              memorial: true,
              blurb: off?.blurb || '',
              traits: off?.traits ? [...off.traits] : [],
              discoveredTraits: off?.traits ? [...off.traits] : []
            };
            cur.roster.push(newPig);
            window.bridge.broadcastState();
            if (window.bridge.dispatchMessage) {
              window.bridge.dispatchMessage({ type: 'toast', text: 'Forever in the family' });
            }
          }
        }
      });
    });

    // Handle Walk in the garden
    container.querySelectorAll('.btn-walk-garden').forEach(btn => {
      btn.addEventListener('click', () => {
        if (root.Sound) root.Sound.click();
        api.send({ type: 'walk', place: 'garden' });
      });
    });

    // Handle Visit my room (opens the rooms feature on that pig's tab)
    container.querySelectorAll('.btn-visit-room').forEach(btn => {
      btn.addEventListener('click', () => {
        if (root.Sound) root.Sound.click();
        if (root.CuyHome && typeof root.CuyHome.openFeature === 'function') {
          root.CuyHome.openFeature('rooms', { room: btn.dataset.roomId });
        }
      });
    });

    // Handle memory corner link (opens the garden feature)
    container.querySelectorAll('.btn-memory-corner').forEach(btn => {
      btn.addEventListener('click', () => {
        if (root.Sound) root.Sound.click();
        if (window.CuyHome && typeof window.CuyHome.openFeature === 'function') {
          window.CuyHome.openFeature('garden');
        }
      });
    });

    // Handle Adopt Group
    container.querySelectorAll('.btn-adopt-group').forEach(btn => {
      btn.addEventListener('click', () => {
        const groupId = btn.dataset.groupId;
        if (root.Sound) root.Sound.popcorn();
        api.send({ type: 'adopt_group', id: groupId });
        // Mock fallback
        if (!window.chrome || !window.chrome.webview) {
          if (window.bridge && window.bridge.currentState) {
            const cur = window.bridge.currentState;
            const groupList = (cur.offers || offers).filter(o => o.group === groupId && !o.adopted);
            if (!cur.roster) cur.roster = [...roster];
            groupList.forEach(off => {
              off.adopted = true;
              cur.roster.push({
                id: 'pig_' + off.id,
                name: off.name,
                breed: off?.look?.breed || 'smooth',
                paletteId: off?.look?.paletteId || 'tricolor',
                namedId: off.id,
                ageYears: 0.1,
                stage: 'baby',
                memorial: false,
                blurb: off.blurb || '',
                traits: off.traits ? [...off.traits] : [],
                discoveredTraits: off.traits ? [...off.traits] : []
              });
            });
            window.bridge.broadcastState();
            if (window.bridge.dispatchMessage) {
              const names = groupList.map(o => o.name).join(' and ');
              window.bridge.dispatchMessage({ type: 'toast', text: `Welcome ${names} to the family!` });
            }
          }
        }
      });
    });
  }

  function startRefreshTimer() {
    stopRefreshTimer();
    refreshTimer = setInterval(() => {
      if (activeContainer && activeApi && activeContainer.offsetParent !== null) {
        const st = (activeApi.getState ? activeApi.getState() : null) || lastState;
        render(activeContainer, activeApi, st);
      }
    }, 30000);
  }

  function stopRefreshTimer() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  const pigsFeatureDef = {
    id: 'pigs',
    title: 'My Pigs',
    icon: 'icon-pair-pigs',
    order: 4,
    get spriteKey() {
      const active = (lastState && lastState.roster && (lastState.roster.find(p => p && (p.id === (lastState.activePigIds && lastState.activePigIds[0]))) || lastState.roster[0])) || null;
      return (root.CuyLook && root.CuyLook.spriteFor) ? root.CuyLook.spriteFor(active) : null;
    },
    open(container, api) {
      activeContainer = container;
      activeApi = api;
      lastState = api && api.getState ? api.getState() : null;
      if (lastState && Array.isArray(lastState.offers)) {
        lastState.offers.forEach(o => {
          if (o) o._receivedAt = Date.now();
        });
      }
      render(container, api, lastState);
      startRefreshTimer();
    },
    close() {
      stopRefreshTimer();
      activeContainer = null;
      activeApi = null;
    },
    onState(state) {
      lastState = state;
      if (state && Array.isArray(state.offers)) {
        state.offers.forEach(o => {
          if (o) o._receivedAt = Date.now();
        });
      }
      const active = (state && state.roster && (state.roster.find(p => p && (p.id === (state.activePigIds && state.activePigIds[0]))) || state.roster[0])) || null;
      if (root.CuyLook && root.CuyLook.spriteFor && active) {
        this.spriteKey = root.CuyLook.spriteFor(active);
      }
      if (activeContainer && activeApi && activeContainer.offsetParent !== null) {
        render(activeContainer, activeApi, state);
      }
      if (typeof document !== 'undefined') {
        const moreBtn = document.querySelector('button[data-open-feature="pigs"]');
        if (moreBtn && this.spriteKey) {
          moreBtn.dataset.spriteKey = this.spriteKey;
        }
      }
    }
  };

  root.CuyHome.registerFeature(pigsFeatureDef);

  if (typeof document !== 'undefined') {
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        const tile = document.querySelector('#modalBody button[data-open-feature="pigs"]');
        if (tile && pigsFeatureDef.spriteKey && tile.dataset.spriteKey !== pigsFeatureDef.spriteKey) {
          tile.dataset.spriteKey = pigsFeatureDef.spriteKey;
        }
      });
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          observer.observe(document.body, { childList: true, subtree: true });
        });
      }
    }

    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target && (target.id === 'btnMore' || target.closest('#btnMore'))) {
        setTimeout(() => {
          const tile = document.querySelector('button[data-open-feature="pigs"]');
          if (tile && pigsFeatureDef.spriteKey) {
            tile.dataset.spriteKey = pigsFeatureDef.spriteKey;
          }
        }, 50);
      }
    });
  }

})(typeof window !== 'undefined' ? window : this);
