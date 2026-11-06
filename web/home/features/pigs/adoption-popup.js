// Adoption popup: "Two pigs are waiting for adoption" (Kuki and Ned). Shown when state.adoption.pending is true.
// Also holds the pure helpers that hide Kuki and Ned until the offer is accepted.
(function (root) {
  'use strict';

  const DEFAULT_GATE = ['kuki', 'ned'];

  function gateIds(state) {
    const a = state && state.adoption;
    return (a && Array.isArray(a.gateIds) && a.gateIds.length) ? a.gateIds : DEFAULT_GATE;
  }

  // The gate is only active when the state carries an `adoption` block that is not accepted yet.
  function gateClosed(state) {
    return !!(state && state.adoption && !state.adoption.accepted);
  }

  function isGateMember(state, id) {
    return !!id && gateIds(state).indexOf(id) >= 0;
  }

  function visibleRoster(state) {
    const roster = (state && Array.isArray(state.roster)) ? state.roster : [];
    if (!gateClosed(state)) return roster;
    return roster.filter(p => p && !isGateMember(state, p.namedId || p.id));
  }

  function visibleOffers(state, offers) {
    const list = Array.isArray(offers) ? offers : [];
    if (!gateClosed(state)) return list;
    return list.filter(o => o && !isGateMember(state, o.id));
  }

  // Random adoption picker: never returns Kuki or Ned while the gate is closed.
  function pickRandomAdoptee(state, candidates, rng) {
    const pool = (candidates || []).filter(c => c && !(gateClosed(state) && isGateMember(state, c.namedId || c.id)));
    if (pool.length === 0) return null;
    const r = typeof rng === 'function' ? rng() : Math.random();
    return pool[Math.min(pool.length - 1, Math.floor(r * pool.length))];
  }

  function ensureStyle() {
    if (document.getElementById('adoptionPopupStyle')) return;
    const st = document.createElement('style');
    st.id = 'adoptionPopupStyle';
    st.textContent =
      '.adoption-popup{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:16px}' +
      '.adoption-popup-box{max-width:360px;width:100%;background:var(--panel-bg,#fff8e7);color:var(--text,#3b2a1a);border:3px solid var(--border,#3b2a1a);padding:16px;text-align:center}' +
      '.adoption-popup-pigs{display:flex;gap:16px;justify-content:center;margin:12px 0}' +
      '.adoption-pig{display:flex;flex-direction:column;align-items:center;gap:4px}' +
      '.adoption-pig img{image-rendering:pixelated}' +
      '.adoption-popup-actions{display:flex;gap:8px;justify-content:center}';
    document.head.appendChild(st);
  }

  let dismissed = false;
  let sent = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function portraitHtml(p) {
    const look = p.look || { breed: p.breed, paletteId: p.paletteId };
    if (root.CuyPig && typeof root.CuyPig.renderPortrait === 'function') {
      const cvs = root.CuyPig.renderPortrait(look, p.stage || 'junior', 64);
      if (cvs) return '<img class="pig-portrait size-64" src="' + cvs.toDataURL() + '" width="64" height="64" alt="">';
    }
    return '<span class="pixel-icon icon-pig-head x2"></span>';
  }

  function hide() {
    const el = document.getElementById('adoptionPopup');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function show(state) {
    if (document.getElementById('adoptionPopup')) return;
    ensureStyle();
    const pigs = (state.adoption.pigs || []).slice(0, 2);
    const el = document.createElement('div');
    el.id = 'adoptionPopup';
    el.className = 'adoption-popup';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'adoptionPopupTitle');
    el.innerHTML =
      '<div class="adoption-popup-box">' +
        '<h2 id="adoptionPopupTitle">Two pigs are waiting for adoption</h2>' +
        '<div class="adoption-popup-pigs">' +
          pigs.map(p => '<div class="adoption-pig" data-pig-id="' + esc(p.id) + '">' + portraitHtml(p) + '<b>' + esc(p.name) + '</b></div>').join('') +
        '</div>' +
        '<div class="adoption-popup-actions">' +
          '<button type="button" class="game-btn adoption-accept">Accept</button>' +
          '<button type="button" class="game-btn adoption-later">Later</button>' +
        '</div>' +
      '</div>';
    el.querySelector('.adoption-accept').addEventListener('click', (e) => {
      if (sent) return;
      sent = true;
      e.currentTarget.disabled = true;
      if (root.bridge && typeof root.bridge.send === 'function') root.bridge.send({ type: 'adoption_accept' });
    });
    el.querySelector('.adoption-later').addEventListener('click', () => { dismissed = true; hide(); });
    document.body.appendChild(el);
  }

  function onState(state) {
    const a = state && state.adoption;
    if (a && a.pending && !a.accepted) {
      if (!dismissed) show(state);
    } else {
      sent = false;
      dismissed = false;
      hide();
    }
  }

  root.CuyAdoption = { isGateMember, visibleRoster, visibleOffers, pickRandomAdoptee, onState };

  function init() {
    if (root.bridge && typeof root.bridge.onState === 'function') root.bridge.onState(onState);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }
})(typeof window !== 'undefined' ? window : this);
