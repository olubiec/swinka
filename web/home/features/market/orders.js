// Market orders board and daily specials (W20-07).
// Mounted by feature.js into #market-extras on each state push. Text is escaped; every button is a real <button>.
(function () {
  'use strict';

  const HARVESTS_FOR_BOARD = 30;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function cropName(id) {
    const s = String(id || '');
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }

  function iconClass(itemId) {
    return 'icon-' + String(itemId || '').replace(/_/g, '-');
  }

  function send(msg) {
    if (window.CuyHome && window.CuyHome.api && window.CuyHome.api.send) window.CuyHome.api.send(msg);
  }

  function specialCard(s) {
    return `<article class="market-card">
      <span class="pixel-icon ${iconClass(s.itemId)}" aria-hidden="true"></span>
      <span class="market-card-name">${esc(s.name)}</span>
      <span class="market-was"><s>${s.was}</s></span>
      <span class="market-now">${s.price} clovers</span>
      <button type="button" class="market-btn" data-special="${s.index}" aria-label="Buy ${esc(s.name)} for ${s.price}">Buy</button>
    </article>`;
  }

  function orderCard(o, state) {
    const m = state.market;
    const owned = (state.inventory && state.inventory[o.cropId]) || 0;
    const needed = o.count;
    const room = (m.capLeft || 0) >= o.reward;
    const enabled = !o.done && owned >= needed && room;
    const text = `Bring ${needed} ${cropName(o.cropId).toLowerCase()} · reward ${o.reward}`;
    const status = o.done ? 'Delivered' : (owned >= needed ? (room ? 'Ready to deliver' : 'The market has enough for today') : `${owned} of ${needed}`);
    return `<article class="market-card market-order${o.done ? ' is-done' : ''}">
      <span class="pixel-icon ${iconClass(o.cropId)}" aria-hidden="true"></span>
      <span class="market-card-name">${esc(text)}</span>
      <progress class="market-progress" max="${needed}" value="${Math.min(owned, needed)}" aria-label="Progress: ${owned} of ${needed}"></progress>
      <span class="market-card-status">${esc(status)}</span>
      <button type="button" class="market-btn" data-order="${o.index}" ${enabled ? '' : 'disabled'}>Deliver</button>
    </article>`;
  }

  function render(state, container) {
    if (!container || !state || !state.market) return;
    const m = state.market;
    const specials = m.specials || [];
    const orders = m.orders || [];
    const harvests = state.farm ? (state.farm.harvests || 0) : 0;

    const specialsHtml = specials.length
      ? `<div class="market-cards">${specials.map(specialCard).join('')}</div>`
      : '<p class="market-empty">No specials today.</p>';

    const boardHtml = orders.length
      ? `<div class="market-cards">${orders.map(o => orderCard(o, state)).join('')}</div>`
      : `<p class="market-empty">Harvest ${HARVESTS_FOR_BOARD} crops to open the order board. ${Math.min(harvests, HARVESTS_FOR_BOARD)}/${HARVESTS_FOR_BOARD}</p>`;

    container.innerHTML = `
      <section class="market-specials" aria-label="Daily specials">
        <h3 class="market-section-title">Daily specials</h3>
        ${specialsHtml}
      </section>
      <section class="market-board" aria-label="Orders">
        <h3 class="market-section-title">Orders</h3>
        ${boardHtml}
      </section>`;

    container.querySelectorAll('[data-special]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'market_special', index: Number(btn.dataset.special) }));
    });
    container.querySelectorAll('[data-order]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'market_order', index: Number(btn.dataset.order) }));
    });
  }

  window.MarketExtras = { render: render };
})();
