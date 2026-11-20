// Market view (W20-06): buy and sell with quotes, daily cap bar, stall banner and item icons.
// State `market`; messages market_buy, market_sell, market_quote (answer: market_quote_result), market_stall.
// The orders and specials panel (W20-07) is loaded from orders.js and mounted into #market-extras.
(function () {
  'use strict';

  const CAT_TABS = [
    { id: 'seeds', label: 'Seeds',        categories: ['seed', 'seeds'] },
    { id: 'food',  label: 'Food',         categories: ['food', 'pantry', 'treat', 'treats'] },
    { id: 'toys',  label: 'Toys & Decor', categories: ['toy', 'toys', 'decor', 'home', 'craft'] }
  ];
  const SIDEBAR_TABS = [
    { id: 'seeds',  label: 'Seeds',        categories: ['seed', 'seeds'] },
    { id: 'food',   label: 'Food',         categories: ['food', 'pantry', 'treat', 'treats'] },
    { id: 'toys',   label: 'Toys & Decor', categories: ['toy', 'toys', 'decor', 'home', 'craft'] },
    { id: 'orders', label: 'Orders',       categories: null },
    { id: 'sell',   label: 'Sell',         categories: null }
  ];
  const CRAFT_SUBS = {
    toys:  ['toy', 'toys'],
    decor: ['decor', 'home', 'craft']
  };
  const STALLS = {
    seeds: {
      key: 'seeds',
      icon: 'sprout',
      title: 'Seed Stall — Farm Seeds & Crops',
      subtitle: 'Farm Seeds & Crops',
      defaultMode: 'buy',
      defaultCat: 'seeds',
      specialtyCat: 'seeds'
    },
    food: {
      key: 'food',
      icon: 'carrot',
      title: 'Food Stall — Fresh Veggies & Treats',
      subtitle: 'Fresh Veggies & Treats',
      defaultMode: 'buy',
      defaultCat: 'food',
      specialtyCat: 'food'
    },
    toys: {
      key: 'toys',
      icon: 'toy',
      title: 'Craft Stall — Toys & Decor',
      subtitle: 'Toys & Decor',
      defaultMode: 'buy',
      defaultCat: 'toys',
      specialtyCat: 'toys'
    },
    orders: {
      key: 'orders',
      icon: 'orders',
      title: 'Market Orders — Crop Requests',
      subtitle: 'Deliver crops for clovers',
      defaultMode: 'orders',
      defaultCat: 'seeds',
      specialtyCat: null
    },
    sell: {
      key: 'sell',
      icon: 'sell',
      title: 'My Stall — Sell from Bag',
      subtitle: 'Bag & stall upgrades',
      defaultMode: 'sell',
      defaultCat: 'seeds',
      specialtyCat: null
    }
  };
  const QUOTE_DELAY = 150;
  const MAX_COUNT = 10;

  const S = {
    container: null,
    api: null,
    tab: 'seeds',
    craftSub: 'auto',
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

  function send(msg) {
    const api = getApi();
    if (api && api.send) api.send(msg);
  }

  function getApi() {
    return S.api || (window.CuyHome && window.CuyHome.api) || null;
  }

  function nowMs() {
    return (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
  }

  function prettyName(itemId) {
    const clean = String(itemId || '').replace(/_/g, ' ').trim();
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Item';
  }

  function lookupCount(col, itemId) {
    if (!col || !itemId) return null;
    if (Array.isArray(col)) {
      const hit = col.find(x => x && (x.itemId === itemId || x.id === itemId));
      if (!hit) return null;
      const keys = ['owned', 'count', 'qty', 'quantity', 'amount', 'have', 'inBag'];
      for (let i = 0; i < keys.length; i++) {
        if (typeof hit[keys[i]] === 'number') return hit[keys[i]];
      }
      return null;
    }
    if (typeof col === 'object') {
      const v = col[itemId];
      if (typeof v === 'number') return v;
      if (v && typeof v === 'object') {
        const keys = ['owned', 'count', 'qty', 'quantity', 'amount', 'have', 'inBag'];
        for (let i = 0; i < keys.length; i++) {
          if (typeof v[keys[i]] === 'number') return v[keys[i]];
        }
      }
    }
    return null;
  }

  function ownedCount(st, itemId, rowObj) {
    if (rowObj && typeof rowObj === 'object') {
      const keys = ['owned', 'inBag', 'have'];
      for (let i = 0; i < keys.length; i++) {
        if (typeof rowObj[keys[i]] === 'number') return rowObj[keys[i]];
      }
    }
    if (!st || !itemId) return 0;
    const sources = [
      st.inventory,
      st.bag,
      st.items,
      st.market && st.market.inventory,
      st.market && st.market.bag,
      st.care && st.care.inventory,
      st.care && st.care.bag,
      st.farm && st.farm.inventory,
      st.market && st.market.sellable
    ];
    for (let i = 0; i < sources.length; i++) {
      const n = lookupCount(sources[i], itemId);
      if (typeof n === 'number') return n;
    }
    return 0;
  }

  function catMatches(item, categories) {
    if (!item || !categories) return false;
    const cat = String(item.category || '').trim().toLowerCase();
    return categories.indexOf(cat) !== -1;
  }

  function resolveCraftSub(st, requestedSub) {
    if (requestedSub === 'toys' || requestedSub === 'decor') return requestedSub;
    const list = (st && st.market && st.market.buyable) || [];
    if (list.some(b => catMatches(b, CRAFT_SUBS.toys))) return 'toys';
    if (list.some(b => catMatches(b, CRAFT_SUBS.decor))) return 'decor';
    return 'toys';
  }

  function stallIconSvg(key) {
    if (key === 'carrot') {
      return '<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">' +
        '<rect x="9" y="2" width="3" height="2" fill="#3d943c"/>' +
        '<rect x="11" y="1" width="2" height="2" fill="#7cd458"/>' +
        '<rect x="10" y="4" width="4" height="2" fill="#3d943c"/>' +
        '<rect x="7" y="4" width="3" height="3" fill="#ff9b3d"/>' +
        '<rect x="6" y="6" width="4" height="3" fill="#e86f1c"/>' +
        '<rect x="4" y="8" width="4" height="3" fill="#e86f1c"/>' +
        '<rect x="8" y="8" width="1" height="2" fill="#b84b10"/>' +
        '<rect x="3" y="11" width="3" height="2" fill="#e86f1c"/>' +
        '<rect x="2" y="13" width="2" height="2" fill="#b84b10"/>' +
        '</svg>';
    }
    if (key === 'toy') {
      return '<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">' +
        '<rect x="5" y="2" width="6" height="1" fill="#a8325f"/>' +
        '<rect x="3" y="3" width="10" height="2" fill="#e85a90"/>' +
        '<rect x="2" y="5" width="12" height="6" fill="#e85a90"/>' +
        '<rect x="3" y="11" width="10" height="2" fill="#a8325f"/>' +
        '<rect x="5" y="13" width="6" height="1" fill="#a8325f"/>' +
        '<rect x="4" y="4" width="3" height="2" fill="#ff9ec4"/>' +
        '<rect x="4" y="7" width="8" height="2" fill="#fff0c2"/>' +
        '<rect x="7" y="4" width="2" height="8" fill="#fff0c2"/>' +
        '</svg>';
    }
    if (key === 'orders') {
      return '<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">' +
        '<rect x="2" y="2" width="12" height="13" fill="#744a28"/>' +
        '<rect x="3" y="3" width="10" height="11" fill="#f4e7cb"/>' +
        '<rect x="6" y="1" width="4" height="2" fill="#3b2416"/>' +
        '<rect x="5" y="5" width="6" height="1" fill="#5e3d24"/>' +
        '<rect x="5" y="7" width="6" height="1" fill="#5e3d24"/>' +
        '<rect x="5" y="9" width="4" height="1" fill="#5e3d24"/>' +
        '<rect x="9" y="10" width="3" height="3" fill="#52b748"/>' +
        '</svg>';
    }
    if (key === 'sell') {
      return '<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">' +
        '<rect x="5" y="2" width="6" height="2" fill="#744a28"/>' +
        '<rect x="6" y="4" width="4" height="1" fill="#f4e7cb"/>' +
        '<rect x="4" y="5" width="8" height="8" fill="#9c6b3f"/>' +
        '<rect x="3" y="7" width="10" height="5" fill="#9c6b3f"/>' +
        '<rect x="4" y="12" width="8" height="2" fill="#744a28"/>' +
        '<rect x="6" y="7" width="4" height="4" fill="#52b748"/>' +
        '</svg>';
    }
    return '<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">' +
      '<rect x="3" y="12" width="10" height="3" fill="#4e301b"/>' +
      '<rect x="7" y="6" width="2" height="6" fill="#2f7d32"/>' +
      '<rect x="3" y="4" width="4" height="3" fill="#52b748"/>' +
      '<rect x="4" y="3" width="2" height="1" fill="#9be068"/>' +
      '<rect x="9" y="3" width="4" height="3" fill="#52b748"/>' +
      '<rect x="10" y="2" width="2" height="1" fill="#9be068"/>' +
      '</svg>';
  }

  const P = {
    el: null,
    tab: 'seeds',
    mode: 'buy',
    cat: 'seeds',
    craftSub: 'auto',
    stallKey: 'seeds',
    stallId: null,
    anchorRect: null,
    openedAt: 0,
    unsubQuote: null,
    unsubState: null,
    onKeyDown: null,
    onDocDown: null,
    docDownTimer: null,
    hotspotSubscribed: false
  };

  function resolveStall(stallIdOrCategory) {
    const s = String(stallIdOrCategory || '').trim().toLowerCase();
    if (
      s === 'orders' || s === 'order' || s === 'order_board' ||
      s === 'stall:orders' || s === 'stall_orders' || s === 'fx:market:order_board' ||
      s.endsWith('order_board') || s.endsWith('stall_orders') || s.endsWith(':orders')
    ) {
      return { stall: STALLS.orders, craftSub: 'auto' };
    }
    if (
      s === 'sell' || s === 'own' || s === 'stall:own' || s === 'stall_own' ||
      s.endsWith('stall_own') || s.endsWith(':own')
    ) {
      return { stall: STALLS.sell, craftSub: 'auto' };
    }
    if (
      s === 'food' || s === 'pantry' ||
      s === 'stall:center' || s === 'stall_center' || s === 'stall:food' || s === 'stall:pantry' ||
      s.endsWith('stall_center') || s.endsWith('stall_food') || s.endsWith('stall_pantry') ||
      s.endsWith(':center') || s.endsWith(':food') || s.endsWith(':pantry')
    ) {
      return { stall: STALLS.food, craftSub: 'auto' };
    }
    if (
      s === 'decor' || s === 'home' || s === 'stall:decor' || s === 'stall:home' ||
      s.endsWith('stall_decor') || s.endsWith('stall_home') || s.endsWith(':decor') || s.endsWith(':home')
    ) {
      return { stall: STALLS.toys, craftSub: 'decor' };
    }
    if (
      s === 'toys' || s === 'toy' || s === 'craft' ||
      s === 'stall:right' || s === 'stall_right' || s === 'stall:craft' || s === 'stall:toys' ||
      s.endsWith('stall_right') || s.endsWith('stall_craft') || s.endsWith('stall_toys') ||
      s.endsWith(':right') || s.endsWith(':craft') || s.endsWith(':toys')
    ) {
      const explicitToys = s === 'toys' || s === 'toy' || s.endsWith(':toys') || s.endsWith('stall_toys');
      return { stall: STALLS.toys, craftSub: explicitToys ? 'toys' : 'auto' };
    }
    return { stall: STALLS.seeds, craftSub: 'auto' };
  }

  function isMarketScene() {
    if (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function') {
      const cur = window.CuyPlaces.getCurrentPlace();
      if (cur) return cur === 'market';
    }
    const api = getApi();
    const st = api && api.getState ? api.getState() : null;
    return !!(st && st.places && st.places.current === 'market');
  }

  function ensureQuoteSub() {
    if (P.unsubQuote) return;
    const api = getApi();
    if (!api || !api.onMessage) return;
    P.unsubQuote = api.onMessage('market_quote_result', (msg) => {
      S.quotes[msg.itemId] = { count: msg.count, total: msg.total, unitPrice: msg.unitPrice };
      const text = msg.count > 0 ? msg.total + ' clovers' : 'No room today';
      [S.container, P.el].forEach(root => {
        const el = root && root.querySelector(`[data-total="${CSS.escape(msg.itemId)}"]`);
        if (el) el.textContent = text;
      });
    });
  }

  function ensureStateSub() {
    if (P.unsubState) return;
    const api = getApi();
    if (!api || !api.onState) return;
    P.unsubState = api.onState(() => {
      ensureHotspotHook();
      if (P.el && P.el.isConnected) {
        if (P.stallId && window.CanvasPig && typeof window.CanvasPig.getHotspots === 'function') {
          const list = window.CanvasPig.getHotspots() || [];
          const hit = list.find(h => h && (h.uid === P.stallId || h.id === P.stallId));
          if (hit && hit.rect) P.anchorRect = hit.rect;
        }
        renderPanel();
      }
    });
  }

  function handleHotspot(hs) {
    if (!hs) return;
    const uid = String(hs.uid || '');
    const hid = String(hs.id || '');
    const id = uid || hid;
    const pat = /^stall[:_]|^fx:market:(stall_|order_board)|^order_board$|^orders$/i;
    const isStall = hs.kind === 'stall' || hs.kind === 'orders' || pat.test(uid) || pat.test(hid);
    if (!isStall || !isMarketScene()) return;
    openPanel(hid || uid || hs.label, hs.rect, id || hs.label);
  }

  function ensureHotspotHook() {
    if (P.hotspotSubscribed) return;
    if (window.CanvasPig && typeof window.CanvasPig.onHotspot === 'function') {
      P.hotspotSubscribed = true;
      window.CanvasPig.onHotspot(handleHotspot);
    }
  }

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

  function craftToggleHtml(activeSub) {
    return `<div class="stall-subtabs" role="group" aria-label="Toys and Decor filter">
      <button type="button" class="stall-subtab${activeSub === 'toys' ? ' is-current' : ''}" data-subcat="toys" aria-pressed="${activeSub === 'toys'}">Toys</button>
      <button type="button" class="stall-subtab${activeSub === 'decor' ? ' is-current' : ''}" data-subcat="decor" aria-pressed="${activeSub === 'decor'}">Decor</button>
    </div>`;
  }

  function buyRows(st, categories) {
    const allowed = Array.isArray(categories) ? categories : [String(categories || '')];
    const list = (st.market.buyable || []).filter(b => catMatches(b, allowed));
    if (!list.length) return '<p class="market-empty">Nothing here today.</p>';
    return `<ul class="market-list">${list.map(b => {
      const n = countOf(b.itemId);
      const inBag = ownedCount(st, b.itemId, b);
      return `<li class="market-row market-row-buy">
        <span class="pixel-icon ${iconClass(b.itemId)}" aria-hidden="true"></span>
        <span class="market-name">${esc(b.name)} <span class="market-meta market-in-bag">In bag: ${inBag}</span></span>
        <span class="market-price">${b.price} ea</span>
        ${stepper('buy', b.itemId, n)}
        <button type="button" class="market-btn" data-buy="${esc(b.itemId)}">Buy ${n * b.price}</button>
      </li>`;
    }).join('')}</ul>`;
  }

  function buyViewHtml(st, catId, craftSub) {
    if (catId === 'toys') {
      const activeSub = resolveCraftSub(st, craftSub);
      return craftToggleHtml(activeSub) + buyRows(st, CRAFT_SUBS[activeSub]);
    }
    const tabDef = CAT_TABS.find(t => t.id === catId) || CAT_TABS[0];
    return buyRows(st, tabDef.categories);
  }

  function orderRows(st, includeSellButton) {
    const orders = (st && st.market && Array.isArray(st.market.orders)) ? st.market.orders : [];
    const sellFoot = includeSellButton
      ? `<div class="market-orders-foot"><button type="button" class="market-sell-link" data-switch-mode="sell">Sell from bag</button></div>`
      : '';
    if (!orders.length) {
      return `<p class="market-empty">No market orders right now.</p>${sellFoot}`;
    }
    const rows = orders.map((o, idx) => {
      if (!o) return '';
      const orderIndex = typeof o.orderIndex === 'number' ? o.orderIndex : (typeof o.index === 'number' ? o.index : idx);
      const itemId = String(o.itemId || o.item || o.cropId || '');
      const name = o.name || o.itemName || prettyName(itemId || 'Order');
      const need = Math.max(1, Number(
        o.need != null ? o.need :
          (o.count != null ? o.count :
            (o.required != null ? o.required :
              (o.amount != null ? o.amount :
                (o.qty != null ? o.qty : 1))))
      ));
      const have = ownedCount(st, itemId, o);
      const reward = Number(
        o.reward != null ? o.reward :
          (o.clovers != null ? o.clovers :
            (o.payout != null ? o.payout : 0))
      );
      const done = Boolean(o.filled || o.done || o.completed || o.claimed);
      const canDeliver = !done && have >= need;
      const who = o.requester || o.from || o.client || '';
      return `<li class="market-order-row${done ? ' is-done' : ''}">
        ${itemId ? `<span class="pixel-icon ${iconClass(itemId)}" aria-hidden="true"></span>` : ''}
        <span class="market-order-info">
          <span class="market-card-name">${esc(name)} ×${need}${who ? ' <span class="market-meta">· ' + esc(who) + '</span>' : ''}</span>
          <span class="market-meta market-in-bag">In bag: ${have}/${need}</span>
        </span>
        <span class="market-order-reward"><span class="pixel-icon icon-clover" aria-hidden="true"></span> +${reward}</span>
        <button type="button" class="market-btn market-deliver-btn" data-fill-order="${orderIndex}" ${canDeliver ? '' : 'disabled'}>${done ? 'Delivered' : 'Deliver'}</button>
      </li>`;
    }).join('');
    return `<ul class="market-list market-orders-list">${rows}</ul>${sellFoot}`;
  }

  function sellRows(st) {
    const m = st.market;
    const list = m.sellable || [];
    if (!list.length) return '<p class="market-empty">Nothing to sell yet.</p>';
    const closed = m.capLeft <= 0;
    return `<ul class="market-list">${list.map(s => {
      const n = countOf(s.itemId);
      const inBag = ownedCount(st, s.itemId, s);
      const q = S.quotes[s.itemId];
      const total = q && q.count > 0 ? q.total : null;
      const pct = Math.round(Math.max(0, Math.min(1, s.demand)) * 100);
      const canSell = inBag > 0 && !closed;
      return `<li class="market-row market-row-sell">
        <span class="pixel-icon ${iconClass(s.itemId)}" aria-hidden="true"></span>
        <span class="market-name">${esc(s.name)} <span class="market-meta"><span class="market-in-bag">In bag: ${inBag}</span> · ${s.unitNow} ea</span></span>
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
    container.dataset.place = 'market';
    container.setAttribute('data-place', 'market');
    const st = S.api.getState();
    const marketPlace = ((st && st.places && st.places.places) || []).find(p => p.id === 'market');
    if (marketPlace && marketPlace.unlocked === false) {
      container.innerHTML = `<div class="market-panel market-locked" data-place="market">
        <p class="market-locked-text">The market is still closed. ${marketPlace.unlockCost ? 'Open for ' + marketPlace.unlockCost + ' clovers' : 'Locked'}</p>
      </div>`;
      return;
    }
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

    const tabs = SIDEBAR_TABS.map(t => `<button type="button" role="tab" class="market-tab${t.id === S.tab ? ' is-current' : ''}" aria-selected="${t.id === S.tab}" data-tab="${t.id}">${esc(t.label)}</button>`).join('');
    let body = '';
    if (S.tab === 'sell') {
      body = sellRows(st);
    } else if (S.tab === 'orders') {
      body = orderRows(st, true);
    } else {
      body = buyViewHtml(st, S.tab, S.craftSub);
    }

    S.period = lightPeriod();
    ensureLights();
    loadAtlas();

    container.innerHTML = `
      <div class="market-panel" data-place="market" style="position:relative">
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

    bindMarketEvents(container, st, S.tab);

    container.querySelectorAll('.market-tab').forEach(btn => {
      btn.addEventListener('click', () => { S.tab = btn.dataset.tab; render(); });
    });
    container.querySelectorAll('[data-subcat]').forEach(btn => {
      btn.addEventListener('click', () => { S.craftSub = btn.dataset.subcat; render(); });
    });
    container.querySelectorAll('[data-switch-mode]').forEach(btn => {
      btn.addEventListener('click', () => { S.tab = btn.dataset.switchMode; render(); });
    });

    const extras = container.querySelector('#market-extras');
    if (window.MarketExtras && extras) {
      window.MarketExtras.render(st, extras);
    } else {
      loadExtras();
    }
  }

  function bindMarketEvents(root, st, activeTab) {
    const m = (st && st.market) || {};
    root.querySelectorAll('.market-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const next = Math.min(MAX_COUNT, Math.max(1, countOf(id) + Number(btn.dataset.step)));
        S.counts[id] = next;
        const out = root.querySelector(`[data-count="${CSS.escape(id)}"]`);
        if (out) out.textContent = String(next);
        if (activeTab === 'sell') {
          requestQuote(id);
        } else {
          const buy = root.querySelector(`[data-buy="${CSS.escape(id)}"]`);
          const price = (m.buyable || []).find(b => b.itemId === id);
          if (buy && price) buy.textContent = 'Buy ' + (next * price.price);
        }
      });
    });
    root.querySelectorAll('[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'market_buy', itemId: btn.dataset.buy, count: countOf(btn.dataset.buy) }));
    });
    root.querySelectorAll('[data-sell]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.sell;
        send({ type: 'market_sell', itemId: id, count: countOf(id) });
        delete S.quotes[id];
      });
    });
    root.querySelectorAll('[data-fill-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        send({ type: 'market_fill_order', orderIndex: Number(btn.dataset.fillOrder) });
      });
    });
    const stallBtn = root.querySelector('[data-stall]');
    if (stallBtn) stallBtn.addEventListener('click', () => send({ type: 'market_stall' }));

    if (activeTab === 'sell') {
      (m.sellable || []).forEach(s => { if (!S.quotes[s.itemId] && s.owned > 0) requestQuote(s.itemId); });
    }
  }

  function resolveAnchorClientRect(anchorRect) {
    const vw = window.innerWidth || 400;
    const vh = window.innerHeight || 620;
    if (!anchorRect) {
      return { left: Math.round(vw / 2), top: Math.round(vh / 2), right: Math.round(vw / 2), bottom: Math.round(vh / 2) };
    }
    if (Array.isArray(anchorRect) && anchorRect.length >= 4) {
      const [x0, y0, x1, y1] = anchorRect.map(Number);
      const canvas = document.querySelector('#sceneCanvas, canvas.scene-canvas, #pigCanvas, canvas');
      const cr = canvas ? canvas.getBoundingClientRect() : null;
      if (cr && cr.width > 0 && cr.height > 0) {
        const sceneW = 256;
        const sceneH = 144;
        return {
          left: cr.left + (x0 / sceneW) * cr.width,
          top: cr.top + (y0 / sceneH) * cr.height,
          right: cr.left + (x1 / sceneW) * cr.width,
          bottom: cr.top + (y1 / sceneH) * cr.height
        };
      }
      return { left: x0, top: y0, right: x1, bottom: y1 };
    }
    const left = Number(anchorRect.left != null ? anchorRect.left : (anchorRect.x || 0));
    const top = Number(anchorRect.top != null ? anchorRect.top : (anchorRect.y || 0));
    const right = Number(anchorRect.right != null ? anchorRect.right : left + (anchorRect.width || anchorRect.w || 0));
    const bottom = Number(anchorRect.bottom != null ? anchorRect.bottom : top + (anchorRect.height || anchorRect.h || 0));
    return { left, top, right, bottom };
  }

  function positionPanel() {
    if (!P.el) return;
    const margin = 8;
    const gap = 8;
    const vw = window.innerWidth || 400;
    const vh = window.innerHeight || 620;
    const pw = P.el.offsetWidth || 280;
    const ph = P.el.offsetHeight || 220;
    const ar = resolveAnchorClientRect(P.anchorRect);

    let left = ar.right + gap;
    if (left + pw > vw - margin) {
      const altLeft = ar.left - pw - gap;
      left = altLeft >= margin ? altLeft : vw - pw - margin;
    }
    let top = ar.top;
    if (top + ph > vh - margin) {
      top = vh - ph - margin;
    }
    left = Math.round(Math.max(margin, Math.min(left, Math.max(margin, vw - pw - margin))));
    top = Math.round(Math.max(margin, Math.min(top, Math.max(margin, vh - ph - margin))));
    P.el.style.left = left + 'px';
    P.el.style.top = top + 'px';
  }

  function renderPanel() {
    if (!P.el) return;
    const api = getApi();
    const st = api && api.getState ? api.getState() : null;
    const stall = STALLS[P.stallKey] || STALLS.seeds;
    P.el.dataset.stall = stall.key;
    P.el.dataset.mode = P.mode;
    P.tab = P.mode === 'buy' ? P.cat : P.mode;

    const marketPlace = ((st && st.places && st.places.places) || []).find(p => p.id === 'market');
    let bodyHtml = '';
    if (marketPlace && marketPlace.unlocked === false) {
      bodyHtml = `<p class="market-locked-text">The market is still closed. ${marketPlace.unlockCost ? 'Open for ' + marketPlace.unlockCost + ' clovers' : 'Locked'}</p>`;
    } else if (!st || !st.market) {
      bodyHtml = '<p class="market-empty">Opening the market…</p>';
    } else if (P.mode === 'sell') {
      const m = st.market;
      const cap = Math.max(1, m.cap || 1);
      const capPct = Math.round(Math.max(0, Math.min(1, m.capLeft / cap)) * 100);
      const capText = m.capLeft > 0
        ? `The market will buy ${m.capLeft} more clovers' worth today`
        : 'The market has enough for today';
      const stallInfo = m.stall || { level: 1, nextCost: null };
      const canStall = stallInfo.nextCost !== null && stallInfo.nextCost !== undefined && st.clovers >= stallInfo.nextCost;
      bodyHtml = `
        <div class="market-top">
          <span class="market-stall">Stall level ${stallInfo.level}
            <button type="button" class="market-btn" data-stall="1" ${canStall ? '' : 'disabled'}>${stallInfo.nextCost ? 'Upgrade · ' + stallInfo.nextCost : 'Max'}</button></span>
        </div>
        <div class="market-cap" aria-label="Daily cap">
          <p class="market-cap-text">${esc(capText)}</p>
          <div class="market-cap-bar"><span class="market-cap-fill" style="width:${capPct}%"></span></div>
        </div>
        ${sellRows(st)}`;
    } else if (P.mode === 'orders') {
      bodyHtml = orderRows(st, true);
    } else {
      bodyHtml = buyViewHtml(st, P.cat, P.craftSub);
    }

    const clovers = st ? (st.clovers || 0) : 0;
    const modesHtml = [
      { id: 'buy', label: 'Buy', extra: '' },
      { id: 'sell', label: 'Sell', extra: ' data-panel-tab="sell"' },
      { id: 'orders', label: 'Orders', extra: ' data-panel-tab="orders"' }
    ].map(m => {
      const cur = P.mode === m.id;
      return `<button type="button" role="tab" class="market-tab stall-mode-tab${cur ? ' is-current' : ''}" aria-selected="${cur}" data-mode="${m.id}"${m.extra}>${m.label}</button>`;
    }).join('');

    const tabsHtml = CAT_TABS.map(t => {
      const cur = P.mode === 'buy' && P.cat === t.id;
      const spec = stall.specialtyCat === t.id;
      return `<button type="button" role="tab" class="market-tab stall-cat-tab${cur ? ' is-current' : ''}${spec ? ' is-specialty' : ''}" aria-selected="${cur}" data-panel-tab="${t.id}" data-cat="${t.id}" data-specialty="${spec ? 'true' : 'false'}">${esc(t.label)}</button>`;
    }).join('');

    P.el.innerHTML = `
      <div class="market-scene-head">
        <span class="stall-sign-icon pixel-icon icon-${esc(stall.icon)}" data-stall-icon="${esc(stall.key)}" aria-hidden="true">${stallIconSvg(stall.key)}</span>
        <div class="market-scene-heading">
          <span class="market-scene-title">${esc(stall.title)}</span>
          <span class="market-scene-subtitle">${esc(stall.subtitle)}</span>
        </div>
        <span class="market-clovers"><span class="pixel-icon icon-clover" aria-hidden="true"></span> ${clovers}</span>
        <button type="button" class="ui-close market-scene-close stall-close-btn" aria-label="Close stall panel"></button>
      </div>
      <div class="stall-modes" role="tablist" aria-label="Stall mode">${modesHtml}</div>
      <div class="market-tabs" role="tablist" aria-label="Market categories">${tabsHtml}</div>
      <div class="market-scene-body">${bodyHtml}</div>`;

    const closeBtn = P.el.querySelector('.market-scene-close');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    P.el.querySelectorAll('.stall-mode-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        P.mode = btn.dataset.mode || 'buy';
        renderPanel();
      });
    });
    P.el.querySelectorAll('.stall-cat-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        P.mode = 'buy';
        P.cat = btn.dataset.cat || btn.dataset.panelTab || 'seeds';
        renderPanel();
      });
    });
    P.el.querySelectorAll('[data-subcat]').forEach(btn => {
      btn.addEventListener('click', () => {
        P.craftSub = btn.dataset.subcat || 'toys';
        renderPanel();
      });
    });
    P.el.querySelectorAll('[data-switch-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        P.mode = btn.dataset.switchMode || 'sell';
        renderPanel();
      });
    });

    if (st && st.market) bindMarketEvents(P.el, st, P.mode === 'sell' ? 'sell' : (P.mode === 'orders' ? 'orders' : P.cat));
    positionPanel();
  }

  function closePanel() {
    if (P.docDownTimer) { clearTimeout(P.docDownTimer); P.docDownTimer = null; }
    if (P.onKeyDown) { document.removeEventListener('keydown', P.onKeyDown); P.onKeyDown = null; }
    if (P.onDocDown) { document.removeEventListener('pointerdown', P.onDocDown, { capture: true }); P.onDocDown = null; }
    if (P.el && P.el.parentNode) P.el.parentNode.removeChild(P.el);
    P.el = null;
  }

  function openPanel(stallIdOrCategory, anchorRect, stallUid) {
    closePanel();
    ensureQuoteSub();
    ensureStateSub();
    const resolved = resolveStall(stallIdOrCategory);
    P.stallKey = resolved.stall.key;
    P.mode = resolved.stall.defaultMode;
    P.cat = resolved.stall.defaultCat;
    P.craftSub = resolved.craftSub;
    P.tab = P.mode === 'buy' ? P.cat : P.mode;
    P.stallId = stallUid || (typeof stallIdOrCategory === 'string' ? stallIdOrCategory : null);
    P.anchorRect = anchorRect || null;
    P.openedAt = nowMs();

    const el = document.createElement('section');
    el.id = 'marketStallPanel';
    el.className = 'feature-market market-scene-panel ui-panel-wood';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Market stall');
    document.body.appendChild(el);
    P.el = el;

    renderPanel();

    P.onKeyDown = (e) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', P.onKeyDown);

    P.onDocDown = (e) => {
      if (!P.el) return;
      if (nowMs() - P.openedAt <= 80) return;
      if (P.el.contains(e.target)) return;
      closePanel();
    };
    document.addEventListener('pointerdown', P.onDocDown, { capture: true });
  }

  window.CuyMarket = { openPanel, closePanel };

  ensureHotspotHook();
  ensureStateSub();

  window.CuyHome.registerFeature({
    id: 'market',
    title: 'Market',
    icon: 'icon-place-market',
    order: 70,
    open(container, api) {
      S.container = container;
      S.api = api;
      if (window.CuyPlaces) window.CuyPlaces.setCurrentPlace('market');
      S.tab = 'seeds';
      S.craftSub = 'auto';
      S.quotes = {};
      if (S.lightTimer) clearInterval(S.lightTimer);
      S.lightTimer = setInterval(lightTick, LIGHT_PERIOD_MS);
      ensureQuoteSub();
      ensureHotspotHook();
      render();
    },
    close() {
      S.container = null;
      if (S.lightTimer) { clearInterval(S.lightTimer); S.lightTimer = null; }
      Object.keys(S.quoteTimers).forEach(k => clearTimeout(S.quoteTimers[k]));
    },
    onState() {
      ensureHotspotHook();
      if (P.el && !isMarketScene()) closePanel();
      if (S.container && S.container.isConnected) render();
    }
  });
})();
