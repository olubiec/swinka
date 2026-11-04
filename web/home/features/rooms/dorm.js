// Shared bedroom panel (W26-06): unlock the room, choose residents, move in or out, bigger room.
// Mounted by features/rooms/feature.js above the room canvas: window.DormPanel.mount(container, { state, send }).
// State: st.dorm = { unlocked, unlockCost, level, maxLevel, nextLevelCost, residents: [pigId], candidates: [{ pigId, name, portrait, memorial }], bondBonus, storedNotice }.
// Messages: dorm_unlock, dorm_move_in { pigIds }, dorm_move_out { pigId }, dorm_upgrade.
// The server decides everything; this panel only shows the state and sends the choices.
(function () {
  'use strict';

  const DEFAULT_UNLOCK_COST = 1500;
  const bound = new WeakSet();
  const ctxOf = new WeakMap();

  // Chips picked for the next "Move in together". Starts as the current residents and is reset when they change.
  let picked = {};
  let pickedSig = null;

  // Stylesheet next to this script (features/rooms/dorm.css), added once.
  (function addStyle() {
    const src = document.currentScript && document.currentScript.src;
    const href = src ? src.replace(/dorm\.js(\?.*)?$/, 'dorm.css') : 'features/rooms/dorm.css';
    if (document.querySelector('link[data-dorm-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-dorm-css', '');
    document.head.appendChild(link);
  })();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function dormOf(st) { return (st && st.dorm) || {}; }

  function residentsOf(d) { return Array.isArray(d.residents) ? d.residents : []; }

  function candidatesOf(d) { return Array.isArray(d.candidates) ? d.candidates : []; }

  function syncPicked(residents) {
    const sig = residents.slice().sort().join(',');
    if (sig === pickedSig) return;
    pickedSig = sig;
    picked = {};
    residents.forEach((id) => { picked[id] = true; });
  }

  function pickedIds() {
    return Object.keys(picked).filter(id => picked[id]);
  }

  function portraitHtml(c) {
    if (!c || !c.portrait) return '';
    return `<img class="dorm-portrait" src="../../assets/sprites/portraits/${esc(c.portrait)}.png" width="24" height="24" alt="" onerror="this.style.visibility='hidden'">`;
  }

  function candleHtml(c) {
    return c && c.memorial ? '<span class="pixel-icon icon-candle" aria-hidden="true"></span>' : '';
  }

  function nameOf(d, id) {
    const c = candidatesOf(d).find(x => x.pigId === id);
    return c && c.name ? c.name : String(id);
  }

  function renderLocked(container, ctx, d, clovers) {
    const cost = d.unlockCost != null ? d.unlockCost : DEFAULT_UNLOCK_COST;
    const enoughPigs = candidatesOf(d).length >= 2;
    const missing = Math.max(0, cost - clovers);
    let reason = '';
    if (!enoughPigs) reason = 'You need two pigs first.';
    else if (missing > 0) reason = missing + ' more clovers needed.';
    container.innerHTML = `
      <section class="dorm dorm-locked" aria-label="Shared bedroom">
        <h3 class="dorm-title">Shared bedroom - ${cost} clovers - needs two pigs</h3>
        <button type="button" class="game-btn dorm-unlock" data-dorm-unlock ${reason ? 'disabled' : ''}>Unlock the shared bedroom</button>
        ${reason ? `<p class="dorm-reason">${esc(reason)}</p>` : ''}
      </section>`;
  }

  function renderUnlocked(container, ctx, d, clovers) {
    const residents = residentsOf(d);
    const candidates = candidatesOf(d);
    syncPicked(residents);

    const chips = candidates.map((c) => {
      const on = !!picked[c.pigId];
      return `<button type="button" class="dorm-chip${on ? ' is-on' : ''}" data-dorm-chip data-pig="${esc(c.pigId)}" aria-pressed="${on}">` +
        `${portraitHtml(c)}${candleHtml(c)}<span class="dorm-chip-name">${esc(c.name || c.pigId)}</span></button>`;
    }).join('') || '<p class="dorm-reason">No adopted pigs yet.</p>';

    const selected = pickedIds();
    const sameAsResidents = selected.length === residents.length && selected.every(id => residents.indexOf(id) >= 0);
    const moveDisabled = selected.length === 0 || sameAsResidents;

    const moveOut = residents.map((id) => {
      const c = candidates.find(x => x.pigId === id) || null;
      return `<li class="dorm-resident">${portraitHtml(c)}${candleHtml(c)}<span class="dorm-resident-name">${esc(nameOf(d, id))}</span>` +
        `<button type="button" class="game-btn dorm-move-out" data-dorm-move-out data-pig="${esc(id)}">Move out</button></li>`;
    }).join('');

    const cost = d.nextLevelCost;
    let levelHtml = '';
    if (cost != null) {
      const missing = Math.max(0, cost - clovers);
      levelHtml = `<div class="dorm-level">
          <button type="button" class="game-btn dorm-upgrade" data-dorm-upgrade ${missing > 0 ? 'disabled' : ''}>Bigger shared bedroom - ${cost} clovers</button>
          ${missing > 0 ? `<span class="dorm-reason">${missing} more clovers needed</span>` : ''}
        </div>`;
    }

    container.innerHTML = `
      <section class="dorm" aria-label="Shared bedroom">
        <h3 class="dorm-title">Shared bedroom</h3>
        <div class="dorm-chips" role="group" aria-label="Pigs for the shared bedroom">${chips}</div>
        <button type="button" class="game-btn dorm-move-in" data-dorm-move-in ${moveDisabled ? 'disabled' : ''}>Move in together</button>
        ${residents.length ? `<ul class="dorm-residents" aria-label="Living here">${moveOut}</ul>` : '<p class="dorm-reason">Nobody lives here yet.</p>'}
        ${d.bondBonus > 0 ? '<p class="dorm-bond">Friends who sleep together get along a little better</p>' : ''}
        ${d.storedNotice ? `<p class="dorm-notice" role="status">${esc(d.storedNotice)}</p>` : ''}
        ${levelHtml}
      </section>`;
  }

  function render(container, ctx) {
    const st = ctx.state || {};
    const d = dormOf(st);
    const clovers = typeof st.clovers === 'number' ? st.clovers : 0;
    if (!d.unlocked) renderLocked(container, ctx, d, clovers);
    else renderUnlocked(container, ctx, d, clovers);
  }

  function send(ctx, msg) {
    if (ctx && typeof ctx.send === 'function') ctx.send(msg);
  }

  function onClick(e) {
    const box = e.currentTarget;
    const ctx = ctxOf.get(box);
    const btn = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!ctx || !btn || !box.contains(btn)) return;
    if (btn.hasAttribute('data-dorm-unlock')) { send(ctx, { type: 'dorm_unlock' }); return; }
    if (btn.hasAttribute('data-dorm-upgrade')) { send(ctx, { type: 'dorm_upgrade' }); return; }
    if (btn.hasAttribute('data-dorm-move-in')) {
      const ids = pickedIds();
      if (ids.length) send(ctx, { type: 'dorm_move_in', pigIds: ids });
      return;
    }
    if (btn.hasAttribute('data-dorm-move-out')) {
      send(ctx, { type: 'dorm_move_out', pigId: btn.getAttribute('data-pig') });
      return;
    }
    if (btn.hasAttribute('data-dorm-chip')) {
      const id = btn.getAttribute('data-pig');
      picked[id] = !picked[id];
      render(box, ctx);
    }
  }

  function mount(container, ctx) {
    if (!container) return;
    if (!bound.has(container)) {
      container.addEventListener('click', onClick);
      bound.add(container);
    }
    ctxOf.set(container, ctx || {});
    render(container, ctx || {});
  }

  window.DormPanel = { mount: mount };
})();
