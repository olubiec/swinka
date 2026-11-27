(function (root) {
  'use strict';

  const CuyAdoptionPopup = {
    _isOpen: false,

    isVisible() {
      return this._isOpen;
    },

    show() {
      this._isOpen = true;
      this._shownThisSession = true;
      const bridge = root.bridge || (typeof window !== 'undefined' ? window.bridge : null);
      if (bridge && typeof bridge.send === 'function') {
        bridge.send({ type: 'mark_tutorial_seen', key: 'adoption_starter' });
      }
      const modalBackdrop = document.getElementById('modalBackdrop');
      const modalTitle = document.getElementById('modalTitle');
      const modalBody = document.getElementById('modalBody');

      const kukiLook = {
        breed: 'rosette_normal',
        paletteId: 'two_tone.ginger',
        coat: 'two_tone.ginger',
        namedId: 'kuki',
        named: 'kuki',
        stage: 'adult',
        spriteKey: 'sprites/pigs/kuki/adult/spritesheet.png'
      };

      const nedLook = {
        breed: 'teddy_chubby',
        paletteId: 'bicolor_head.chocolate',
        coat: 'bicolor_head.chocolate',
        namedId: 'ned',
        named: 'ned',
        stage: 'adult',
        spriteKey: 'sprites/pigs/ned/adult/spritesheet.png'
      };

      function getPortraitHtml(look, id, name) {
        if (root.CuyPig && typeof root.CuyPig.renderPortrait === 'function') {
          const cvs = root.CuyPig.renderPortrait(look, 'adult', 64);
          if (cvs) {
            const imgId = 'adoption-portrait-' + id;
            cvs._onUpdates = cvs._onUpdates || [];
            cvs._onUpdates.push((updatedCvs) => {
              const el = document.getElementById(imgId);
              if (el) el.src = updatedCvs.toDataURL();
            });
            return `<img id="${imgId}" class="pig-portrait size-64" src="${cvs.toDataURL()}" width="64" height="64" alt="${name}">`;
          }
        }
        return `<img class="pig-portrait size-64" src="../../assets/sprites/portraits/${id}.png" width="64" height="64" alt="${name}" onerror="this.outerHTML='<span class=\\'pixel-icon icon-pig-head\\'></span>'">`;
      }

      const html = `
        <div class="adoption-popup-content" style="text-align: center; padding: 12px;">
          <h2 class="adoption-popup-title" style="margin: 0 0 16px 0; font-family: var(--ui-font); font-size: var(--ui-fs-l); color: var(--ui-ink-gold);">Two pigs are waiting for adoption</h2>
          <div class="adoption-popup-pigs" style="display: flex; justify-content: center; gap: 16px; margin-bottom: 20px;">
            <div class="adoption-pig-card pig-card" style="padding: 10px; width: 140px; background: var(--ui-linen-2); border: 2px solid var(--ui-wood-0); border-radius: 4px;">
              <div class="pig-card-portrait" style="margin: 0 auto 8px auto; width: 64px; height: 64px;">
                ${getPortraitHtml(kukiLook, 'kuki', 'Kuki')}
              </div>
              <div class="pig-card-name" style="font-family: var(--ui-font); font-size: var(--ui-fs-m); font-weight: bold; color: var(--ui-text); margin-bottom: 4px;">Kuki</div>
              <div class="pig-card-blurb" style="font-size: var(--ui-fs-s); color: var(--ui-text-soft);">Friendly and calm. Gets along with everybody.</div>
            </div>
            <div class="adoption-pig-card pig-card" style="padding: 10px; width: 140px; background: var(--ui-linen-2); border: 2px solid var(--ui-wood-0); border-radius: 4px;">
              <div class="pig-card-portrait" style="margin: 0 auto 8px auto; width: 64px; height: 64px;">
                ${getPortraitHtml(nedLook, 'ned', 'Ned')}
              </div>
              <div class="pig-card-name" style="font-family: var(--ui-font); font-size: var(--ui-fs-m); font-weight: bold; color: var(--ui-text); margin-bottom: 4px;">Ned</div>
              <div class="pig-card-blurb" style="font-size: var(--ui-fs-s); color: var(--ui-text-soft);">Lazy, curious and always hungry.</div>
            </div>
          </div>
          <div class="adoption-popup-actions">
            <button type="button" class="game-btn btn-accept-adoption" id="btnAcceptAdoption" style="padding: 8px 24px; font-size: var(--ui-fs-m);" aria-label="Accept">Accept</button>
          </div>
        </div>
      `;

      if (modalBackdrop && modalTitle && modalBody) {
        modalTitle.textContent = 'Two pigs are waiting for adoption';
        modalBody.className = 'modal-body adoption-popup-body';
        modalBody.innerHTML = html;
        modalBackdrop.classList.add('active');

        const btnAccept = modalBody.querySelector('#btnAcceptAdoption');
        if (btnAccept) {
          btnAccept.addEventListener('click', () => {
            this.accept();
          });
        }
      } else {
        // Fallback custom overlay
        let overlay = document.getElementById('adoptionPopupOverlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'adoptionPopupOverlay';
          overlay.className = 'modal-backdrop active';
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.background = 'rgba(0,0,0,0.6)';
          overlay.style.display = 'flex';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.zIndex = '99999';
          document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
          <div class="modal-card" style="background: var(--ui-linen-1); border: 3px solid var(--ui-wood-0); padding: 16px; border-radius: 6px; max-width: 360px;">
            <div class="modal-header" style="display:flex; justify-content:space-between; margin-bottom:12px;">
              <span id="modalTitle" style="font-family:var(--ui-font); font-weight:bold;">Two pigs are waiting for adoption</span>
              <button type="button" id="modalCloseBtn" style="background:none; border:none; cursor:pointer;">✕</button>
            </div>
            <div class="modal-body">${html}</div>
          </div>
        `;
        overlay.classList.add('active');
        overlay.style.display = 'flex';
        const btnAccept = overlay.querySelector('#btnAcceptAdoption');
        if (btnAccept) {
          btnAccept.addEventListener('click', () => {
            this.accept();
          });
        }
        const btnClose = overlay.querySelector('#modalCloseBtn');
        if (btnClose) {
          btnClose.addEventListener('click', () => {
            this.close();
          });
        }
      }
    },

    close() {
      this._isOpen = false;
      const modalBackdrop = document.getElementById('modalBackdrop');
      if (modalBackdrop && modalBackdrop.classList.contains('active')) {
        const title = document.getElementById('modalTitle');
        if (title && title.textContent === 'Two pigs are waiting for adoption') {
          modalBackdrop.classList.remove('active');
          const body = document.getElementById('modalBody');
          if (body) body.innerHTML = '';
        }
      }
      const overlay = document.getElementById('adoptionPopupOverlay');
      if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
      }
    },

    accept() {
      const bridge = root.bridge || (typeof window !== 'undefined' ? window.bridge : null);
      if (bridge && typeof bridge.send === 'function') {
        bridge.send({ type: 'adopt_starter_pair' });
      }

      // Browser mock update
      if (!window.chrome || !window.chrome.webview) {
        if (bridge && bridge.currentState) {
          const cur = bridge.currentState;
          cur.adoptionGateOpen = true;
          cur.adoptionOfferAccepted = true;
          if (!Array.isArray(cur.roster)) cur.roster = [];

          if (!cur.roster.some(p => p && (p.id === 'kuki' || p.namedId === 'kuki'))) {
            cur.roster.push({
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
            });
          }

          if (!cur.roster.some(p => p && (p.id === 'ned' || p.namedId === 'ned'))) {
            cur.roster.push({
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
            });
          }

          if (typeof bridge.broadcastState === 'function') {
            bridge.broadcastState();
          }
        }
      }

      this.close();
    }
  };

  root.CuyAdoptionPopup = CuyAdoptionPopup;
  if (typeof window !== 'undefined') {
    window.CuyAdoptionPopup = CuyAdoptionPopup;
  }

  // Event wiring
  function initEvents() {
    const bridge = root.bridge || (typeof window !== 'undefined' ? window.bridge : null);
    if (bridge && typeof bridge.onMessage === 'function') {
      bridge.onMessage('adoption_available', () => {
        CuyAdoptionPopup.show();
      });
      bridge.onMessage('adoption_offer', () => {
        CuyAdoptionPopup.show();
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('adoption_available', () => {
        CuyAdoptionPopup.show();
      });
      window.addEventListener('adoption-available', () => {
        CuyAdoptionPopup.show();
      });
    }

    if (bridge && typeof bridge.onState === 'function') {
      bridge.onState((state) => {
        const seenList = Array.isArray(state && state.seenTutorials) ? state.seenTutorials : [];
        const alreadySeen = seenList.includes('adoption_starter') || CuyAdoptionPopup._shownThisSession;
        if (state && state.adoptionOfferAvailable && !state.adoptionOfferAccepted && !state.adoptionGateOpen && !alreadySeen) {
          if (!CuyAdoptionPopup.isVisible()) {
            CuyAdoptionPopup.show();
          }
        }
        if (typeof document !== 'undefined') {
          const elPetName = document.getElementById('petName');
          if (elPetName && state) {
            const active = (state.roster && (state.roster.find(p => p && (p.id === (state.activePigIds && state.activePigIds[0]))) || state.roster[0])) || null;
            const isNamed = active && (active.namedId || active.id === 'kuki' || active.id === 'ned');
            if (isNamed) {
              elPetName.removeAttribute('role');
              elPetName.removeAttribute('tabindex');
              elPetName.removeAttribute('title');
              elPetName.style.cursor = 'default';
              elPetName.style.pointerEvents = 'none';
            } else {
              elPetName.setAttribute('role', 'button');
              elPetName.setAttribute('tabindex', '0');
              elPetName.setAttribute('title', 'Click to rename');
              elPetName.style.cursor = '';
              elPetName.style.pointerEvents = '';
            }
          }
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
  } else {
    initEvents();
  }

})(typeof window !== 'undefined' ? window : this);
