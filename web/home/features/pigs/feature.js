(function (root) {
  'use strict';
  if (!root.CuyHome) return;

  function render(container, api, state) {
    const clovers = (state && state.clovers) || 0;
    const roster = (state && state.roster) || [
      { id: 'pig_default', name: (state && state.pet && state.pet.name) || 'Cuy', breed: 'smooth', paletteId: 'tricolor', traits: ['cuddly'], discoveredTraits: ['cuddly'] }
    ];
    const activeIds = (state && state.activePigIds) || [roster[0]?.id || 'pig_default'];

    let html = `
      <div class="feature-pigs-container">
        <div class="pigs-header">
          <div class="pigs-stats">
            <span><span class="pixel-icon icon-clover"></span> Clovers: <b>${clovers}</b></span>
            <span>Active on desk: <b>${activeIds.length}/2</b></span>
          </div>
          <button type="button" class="game-btn btn-adopt-pig" id="btnAdoptPig" ${clovers < 80 ? 'disabled' : ''}>
            Adopt (80 <span class="pixel-icon icon-clover"></span>)
          </button>
        </div>

        <div class="pigs-grid">
    `;

    roster.forEach(pig => {
      const isActive = activeIds.includes(pig.id);
      const traitsList = (pig.traits || []).map(t => {
        const isDiscovered = (pig.discoveredTraits || []).includes(t);
        return `<span class="pig-trait-badge ${isDiscovered ? 'discovered' : 'secret'}">${isDiscovered ? `<span class="pixel-icon icon-trait-${t}"></span> ${t}` : '???'}</span>`;
      }).join(' ');

      html += `
        <div class="pig-card ${isActive ? 'pig-active' : ''}" data-pig-id="${pig.id}">
          <div class="pig-card-header">
            <span class="pig-card-name">${pig.name}</span>
            <span class="pig-card-breed"><span class="pixel-icon icon-coat-${pig.paletteId || 'tricolor'}"></span> ${pig.breed || 'smooth'} · ${pig.paletteId || 'tricolor'}</span>
          </div>
          <div class="pig-card-portrait">
            <canvas class="pig-card-canvas" data-breed="${pig.breed || 'smooth'}" data-palette="${pig.paletteId || 'tricolor'}" aria-label="${pig.name}"></canvas>
          </div>
          <div class="pig-card-traits">
            ${traitsList || '<span class="pig-trait-badge secret">???</span>'}
          </div>
          <div class="pig-card-actions">
            <button type="button" class="game-btn btn-toggle-active" data-toggle-id="${pig.id}">
              ${isActive ? 'Rest in Cage' : 'Bring to Desk'}
            </button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Portraits: idle frame of each pig (its breed, the current life stage and its coat palette)
    const stageKey = (state && state.stageKey) || 'adult';
    container.querySelectorAll('.pig-card-canvas').forEach(cv => {
      root.CuySprites.drawPortrait(cv, cv.dataset.breed, stageKey, cv.dataset.palette, 2);
    });

    // Handle Adopt
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
  }

  root.CuyHome.registerFeature({
    id: 'pigs',
    title: 'My Pigs',
    icon: 'icon-heart',
    order: 4,
    open(container, api) {
      render(container, api, api.getState());
    },
    onState(state, container, api) {
      if (container && container.offsetParent !== null) {
        render(container, api, state);
      }
    }
  });

})(typeof window !== 'undefined' ? window : this);

