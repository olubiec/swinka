(function (root) {
  'use strict';
  if (!root.CuyHome) return;

  let activeContainer = null;
  let activeApi = null;

  function renderPigPortrait(id) {
    if (id) {
      return `<img class="pig-portrait" src="../../assets/sprites/portraits/${id}.png" width="32" height="32" alt="" onerror="this.onerror=null; this.outerHTML='<span class=\\'pixel-icon icon-pig\\'></span>';">`;
    }
    return `<span class="pixel-icon icon-pig"></span>`;
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

      html += `
        <div class="pig-card ${isActive ? 'pig-active' : ''} ${isMemorial ? 'pig-memorial' : ''}" data-pig-id="${pig.id}">
          <div class="pig-card-header">
            <span class="pig-card-name">${pig.name}</span>
            <div class="pig-card-meta">
              <span class="pig-stage-badge"><span class="pixel-icon icon-stage-${stageName}"></span> ${stageName}</span>
              <span class="pig-card-age">${ageText}</span>
            </div>
            ${pig.breed ? `<span class="pig-card-breed">${pig.breed}</span>` : ''}
          </div>
          <div class="pig-card-portrait">
            ${renderPigPortrait(pig.namedId)}
          </div>
          ${traitsOrBlurbHtml}
          <div class="pig-card-actions">
            <button type="button" class="game-btn btn-toggle-active" data-toggle-id="${pig.id}" aria-label="${isActive ? 'Rest ' + pig.name + ' in cage' : 'Bring ' + pig.name + ' to desk'}">
              ${isActive ? 'Rest in Cage' : 'Bring to Desk'}
            </button>
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
                  ${renderPigPortrait(p.id)}
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
              ${renderPigPortrait(offer.id)}
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
              ${renderPigPortrait(offer.id)}
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
        html += `
          <div class="pig-card pig-offer-card offer-locked" data-offer-id="${offer.id}">
            <div class="pig-card-header">
              <span class="pig-card-name">${offer.name}</span>
            </div>
            <div class="pig-card-portrait">
              ${renderPigPortrait(offer.id)}
            </div>
            <div class="pig-card-blurb">${offer.blurb || ''}</div>
            <div class="offer-locked-info">
              <span class="pixel-icon icon-padlock"></span>
              <span>${offer.daysLeft} days left</span>
            </div>
            <div class="pig-card-actions">
              <button type="button" class="game-btn btn-locked" disabled aria-label="Locked: ${offer.daysLeft} days left">
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

  root.CuyHome.registerFeature({
    id: 'pigs',
    title: 'My Pigs',
    icon: 'icon-heart',
    order: 4,
    open(container, api) {
      activeContainer = container;
      activeApi = api;
      render(container, api, api.getState());
    },
    close() {
      activeContainer = null;
      activeApi = null;
    },
    onState(state) {
      if (activeContainer && activeApi && activeContainer.offsetParent !== null) {
        render(activeContainer, activeApi, state);
      }
    }
  });

})(typeof window !== 'undefined' ? window : this);
