// Market view (W20-06): buy and sell with quotes, daily cap bar, stall banner and item icons.
// State `market`; messages market_buy, market_sell, market_quote (answer: market_quote_result), market_stall.
// The orders and specials panel (W20-07) is loaded from orders.js and mounted into #market-extras.
(function () {
  'use strict';

  const TABS = [
    { id: 'seeds',  label: 'Seeds & tools',   category: 'seed' },
    { id: 'home',   label: 'Home & garden',   category: 'decor' },
    { id: 'pantry', label: 'Pantry',          category: 'pantry' },
    { id: 'sell',   label: 'Sell',            category: null }
  ];
  const QUOTE_DELAY = 150;
  const MAX_COUNT = 10;

  const S = {
    container: null,
    api: null,
    tab: 'seeds',
    counts: {},      // itemId -> stepper value
    quotes: {},      // itemId -> { count, total, unitPrice } from market_quote_result
    quoteTimers: {},
    unsubQuote: null,
    extrasReady: false,
    extrasRequested: false,
    period: null,    // time of day of the last render
    lightTimer: null
  };

  // Light and time of day (W32-04): ambient tint on the market panel and the posters from the atlas.
  // Engine: lib/lights.js (window.Lights); data: assets/data/lights.json. A missing lib, file or image means no tint, no error.
  const LIGHT_PERIOD_MS = 60000;
  const POSTERS = ['poster_1', 'poster_2', 'poster_3'];
  let lightsData = null;
  let lightsRequested = false;
  let atlas = null;
  let atlasRequested = false;

  function rgbCss(rgb, alpha) {
    return 'rgba(' + Math.round(rgb[0]) + ', ' + Math.round(rgb[1]) + ', ' + Math.round(rgb[2]) + ', ' + (alpha == null ? 1 : alpha) + ')';
  }

  function lightPeriod() {
    return window.Lights ? window.Lights.periodOf(new Date()) : null;
  }

  // Loads lib/lights.js once (dynamic script, the page does not list it) and the light data once.
  function ensureLights() {
    if (!window.Lights && !document.querySelector('script[data-cuy-lights]')) {
      const s = document.createElement('script');
      s.src = 'lib/lights.js';
      s.dataset.cuyLights = '1';
      s.onload = () => render();
      document.head.appendChild(s);
    }
    if (lightsRequested) return;
    lightsRequested = true;
    fetch(S.api.assetUrl('data/lights.json'))
      .then(r => (r.ok ? r.json() : null))
      .then(j => { lightsData = j; render(); })
      .catch(() => { lightsData = null; });
  }

  function loadAtlas() {
    if (atlasRequested) return;
    atlasRequested = true;
    fetch(S.api.assetUrl('world/atlas.json'))
      .then(r => (r.ok ? r.json() : null))
      .then(j => { atlas = j && j.items ? j : null; render(); })
      .catch(() => { atlas = null; });
  }

  // Ambient tint over the whole panel (multiply, no pointer events). Empty when the light data is missing.
  function tintHtml() {
    if (!window.Lights || !lightsData) return '';
    const L = window.Lights;
    const amb = L.ambientFor(lightsData, lightPeriod());
    return `<div class="market-tint" aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;background:${rgbCss(L.tint([255, 255, 255], amb))}"></div>`;
  }

  // Posters poster_1..3 from the atlas, only the ones the atlas has.
  function postersHtml() {
    if (!atlas || !atlas.items) return '';
    const imgs = POSTERS.map(id => atlas.items[id]).filter(e => e && e.file && e.size)
      .map(e => `<img class="market-poster" src="${esc(S.api.assetUrl('world/' + e.file))}" width="${e.size[0] * 2}" height="${e.size[1] * 2}" alt="" style="image-rendering:pixelated" onerror="this.style.display='none'">`);
    return imgs.length ? `<div class="market-posters" style="display:flex;gap:8px;justify-content:center">${imgs.join('')}</div>` : '';
  }

  // Once a minute the period is checked and the market is rendered again when it changed.
  function lightTick() {
    if (!S.container || !S.container.isConnected) return;
    if (lightPeriod() !== S.period) render();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function iconClass(itemId) {
    return 'icon-' + String(itemId).replace(/_/g, '-');
  }

  function countOf(itemId) {
    const n = S.counts[itemId];
    return typeof n === 'number' ? n : 1;
  }

  function send(msg) { if (S.api && S.api.send) S.api.send(msg); }

  function loadExtras() {
    if (window.MarketExtras) { S.extrasReady = true; return; }
    if (S.extrasRequested) return;
    S.extrasRequested = true;
    const script = document.createElement('script');
    script.src = 'features/market/orders.js';
    script.onload = () => { S.extrasReady = !!window.MarketExtras; render(); };
    document.body.appendChild(script);
  }

  function requestQuote(itemId) {
    clearTimeout(S.quoteTimers[itemId]);
    S.quoteTimers[itemId] = setTimeout(() => {
      send({ type: 'market_quote', itemId: itemId, count: countOf(itemId) });
    }, QUOTE_DELAY);
  }

  function stepper(kind, id, value) {
    return `<span class="market-stepper" role="group" aria-label="Count">
      <button type="button" class="market-step" data-step="-1" data-id="${esc(id)}" aria-label="Less">−</button>
      <span class="market-count" data-count="${esc(id)}" aria-live="polite">${value}</span>
      <button type="button" class="market-step" data-step="1" data-id="${esc(id)}" aria-label="More">+</button></span>`;
  }

  function buyRows(st, category) {
    const list = (st.market.buyable || []).filter(b => b.category === category);
    if (!list.length) return '<p class="market-empty">Nothing here today.</p>';
    return `<ul class="market-list">${list.map(b => {
      const n = countOf(b.itemId);
      return `<li class="market-row">
        <span class="pixel-icon ${iconClass(b.itemId)}" aria-hidden="true"></span>
        <span class="market-name">${esc(b.name)}</span>
        <span class="market-price">${b.price} ea</span>
        ${stepper('buy', b.itemId, n)}
        <button type="button" class="market-btn" data-buy="${esc(b.itemId)}">Buy ${n * b.price}</button>
      </li>`;
    }).join('')}</ul>`;
  }

  function sellRows(st) {
    const m = st.market;
    const list = m.sellable || [];
    if (!list.length) return '<p class="market-empty">Nothing to sell yet.</p>';
    const closed = m.capLeft <= 0;
    return `<ul class="market-list">${list.map(s => {
      const n = countOf(s.itemId);
      const q = S.quotes[s.itemId];
      const total = q && q.count > 0 ? q.total : null;
      const pct = Math.round(Math.max(0, Math.min(1, s.demand)) * 100);
      const canSell = s.owned > 0 && !closed;
      return `<li class="market-row market-row-sell">
        <span class="pixel-icon ${iconClass(s.itemId)}" aria-hidden="true"></span>
        <span class="market-name">${esc(s.name)} <span class="market-meta">${s.owned} owned · ${s.unitNow} ea</span></span>
        <span class="market-demand" role="meter" aria-label="Demand for ${esc(s.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
          <span class="market-demand-fill" style="width:${pct}%"></span></span>
        ${stepper('sell', s.itemId, n)}
        <span class="market-total" data-total="${esc(s.itemId)}">${total === null ? '…' : total + ' clovers'}</span>
        <button type="button" class="market-btn" data-sell="${esc(s.itemId)}" ${canSell ? '' : 'disabled'}>Sell</button>
      </li>`;
    }).join('')}</ul>`;
  }

  function render() {
    const container = S.container;
    if (!container) return;
    const st = S.api.getState();
    if (!st || !st.market) {
      container.innerHTML = '<p class="market-empty">Opening the market…</p>';
      return;
    }
    const m = st.market;
    const cap = Math.max(1, m.cap || 1);
    const capPct = Math.round(Math.max(0, Math.min(1, m.capLeft / cap)) * 100);
    const capText = m.capLeft > 0
      ? `The market will buy ${m.capLeft} more clovers' worth today`
      : 'The market has enough for today';
    const stall = m.stall || { level: 1, nextCost: null };
    const canStall = stall.nextCost !== null && stall.nextCost !== undefined && st.clovers >= stall.nextCost;

    const tabs = TABS.map(t => `<button type="button" role="tab" class="market-tab${t.id === S.tab ? ' is-current' : ''}" aria-selected="${t.id === S.tab}" data-tab="${t.id}">${esc(t.label)}</button>`).join('');
    const body = S.tab === 'sell' ? sellRows(st) : buyRows(st, TABS.find(t => t.id === S.tab).category);

    S.period = lightPeriod();
    ensureLights();
    loadAtlas();

    container.innerHTML = `
      <div class="market-panel" style="position:relative">
        ${tintHtml()}
        <img class="market-stall-banner" src="${esc(S.api.assetUrl('world/market/stall_basic.png'))}" alt="" />
        ${postersHtml()}
        <div class="market-top">
          <span class="market-clovers"><span class="pixel-icon icon-clover" aria-hidden="true"></span> ${st.clovers || 0}</span>
          <span class="market-stall">Stall level ${stall.level}
            <button type="button" class="market-btn" data-stall="1" ${canStall ? '' : 'disabled'}>${stall.nextCost ? 'Upgrade · ' + stall.nextCost : 'Max'}</button></span>
        </div>
        <div class="market-cap" aria-label="Daily cap">
          <p class="market-cap-text">${esc(capText)}</p>
          <div class="market-cap-bar"><span class="market-cap-fill" style="width:${capPct}%"></span></div>
        </div>
        <div class="market-tabs" role="tablist" aria-label="Market sections">${tabs}</div>
        <div class="market-body" role="tabpanel">${body}</div>
        <section id="market-extras" class="market-extras"></section>
      </div>`;

    container.querySelectorAll('.market-tab').forEach(btn => {
      btn.addEventListener('click', () => { S.tab = btn.dataset.tab; render(); });
    });
    container.querySelectorAll('.market-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const next = Math.min(MAX_COUNT, Math.max(1, countOf(id) + Number(btn.dataset.step)));
        S.counts[id] = next;
        const out = container.querySelector(`[data-count="${CSS.escape(id)}"]`);
        if (out) out.textContent = String(next);
        if (S.tab === 'sell') {
          requestQuote(id);
        } else {
          const buy = container.querySelector(`[data-buy="${CSS.escape(id)}"]`);
          const price = (st.market.buyable || []).find(b => b.itemId === id);
          if (buy && price) buy.textContent = 'Buy ' + (next * price.price);
        }
      });
    });
    container.querySelectorAll('[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'market_buy', itemId: btn.dataset.buy, count: countOf(btn.dataset.buy) }));
    });
    container.querySelectorAll('[data-sell]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.sell;
        send({ type: 'market_sell', itemId: id, count: countOf(id) });
        delete S.quotes[id];
      });
    });
    const stallBtn = container.querySelector('[data-stall]');
    if (stallBtn) stallBtn.addEventListener('click', () => send({ type: 'market_stall' }));

    // Quotes for the sell tab: ask once per visible item with a count
    if (S.tab === 'sell') {
      (m.sellable || []).forEach(s => { if (!S.quotes[s.itemId] && s.owned > 0) requestQuote(s.itemId); });
    }

    const extras = container.querySelector('#market-extras');
    if (window.MarketExtras && extras) {
      window.MarketExtras.render(st, extras);
    } else {
      loadExtras();
    }
  }

  window.CuyHome.registerFeature({
    id: 'market',
    title: 'Market',
    icon: 'icon-carrot',
    order: 70,
    open(container, api) {
      S.container = container;
      S.api = api;
      S.tab = 'seeds';
      S.quotes = {};
      if (S.lightTimer) clearInterval(S.lightTimer);
      S.lightTimer = setInterval(lightTick, LIGHT_PERIOD_MS);
      if (S.unsubQuote) S.unsubQuote();
      S.unsubQuote = api.onMessage('market_quote_result', (msg) => {
        S.quotes[msg.itemId] = { count: msg.count, total: msg.total, unitPrice: msg.unitPrice };
        const el = S.container && S.container.querySelector(`[data-total="${CSS.escape(msg.itemId)}"]`);
        if (el) el.textContent = msg.count > 0 ? msg.total + ' clovers' : 'No room today';
      });
      render();
    },
    close() {
      S.container = null;
      if (S.lightTimer) { clearInterval(S.lightTimer); S.lightTimer = null; }
      if (S.unsubQuote) { S.unsubQuote(); S.unsubQuote = null; }
      Object.keys(S.quoteTimers).forEach(k => clearTimeout(S.quoteTimers[k]));
    },
    onState() {
      if (S.container && S.container.isConnected) render();
    }
  });
})();
