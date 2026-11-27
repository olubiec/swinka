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
  const DRAWER_TABS = [
    { id: 'specials', label: 'Specials' },
    { id: 'food',     label: 'Food',         categories: ['food', 'pantry', 'treat', 'treats', 'vegetable', 'chew_stick'] },
    { id: 'care',     label: 'Care',         categories: ['care', 'medicine', 'vitamins'] },
    { id: 'seeds',    label: 'Seeds',        categories: ['seed', 'seeds', 'sapling'] },
    { id: 'toys',     label: 'Toys & Decor', categories: ['toy', 'toys', 'equipment', 'decor', 'home', 'craft', 'furniture'] },
    { id: 'orders',   label: 'Orders' },
    { id: 'sell',     label: 'Sell' }
  ];
  const CRAFT_SUBS = {
    toys:  ['toy', 'toys'],
    decor: ['decor', 'home', 'craft']
  };
  const CRAFT_FILTER_TABS = [
    { id: 'all',       label: 'All' },
    { id: 'toys',      label: 'Toys' },
    { id: 'furniture', label: 'Furniture' },
    { id: 'lights',    label: 'Lights' },
    { id: 'plants',    label: 'Plants' },
    { id: 'decor',     label: 'Decor' }
  ];
  const LIGHT_IDS = new Set([
    'lamp_floor', 'lamp_mushroom', 'lamp_arc', 'lantern_paper', 'lamp_salt',
    'lamp_lava', 'fireplace', 'candle', 'fairy_lights', 'window', 'torch',
    'lamp_oil', 'lantern', 'lamp_street', 'brazier', 'lamp_post', 'lantern_garden'
  ]);
  const PLANT_PREFIXES = ['plant_', 'flower_', 'tree_', 'flowerbed_', 'bush_'];
  const PLANT_EXACT = ['hanging_planter', 'hedge', 'arch_rose'];
  const FURNITURE_PREFIXES = ['sofa_', 'bench_', 'table_', 'chair_', 'bed_', 'fence_'];
  const FURNITURE_EXACT = [
    'sofa_cosy', 'armchair', 'bookshelf', 'side_table', 'cushion_big', 'hay_bar_wood',
    'cosy_nook', 'bench_wood', 'bench_park', 'pouf_boucle', 'stump_seat', 'picnic_blanket',
    'gazebo', 'bridge_wood', 'fence_wood', 'fence_farm', 'gate_garden', 'pigloo_garden',
    'sandbox_pig', 'hay_basket', 'toy_basket'
  ];
  const STALLS = {
    seeds: {
      key: 'seeds',
      icon: 'sprout',
      title: 'Seed Stall',
      subtitle: 'Farm Seeds & Crops',
      defaultMode: 'buy',
      defaultCat: 'seeds',
      specialtyCat: 'seeds',
      tabs: ['seeds']
    },
    food: {
      key: 'food',
      icon: 'carrot',
      title: 'Food Stall',
      subtitle: 'Fresh Veggies & Treats',
      defaultMode: 'buy',
      defaultCat: 'food',
      specialtyCat: 'food',
      tabs: ['food', 'care', 'specials']
    },
    toys: {
      key: 'toys',
      icon: 'toy',
      title: 'Craft & Decor',
      subtitle: 'Toys & Decor',
      defaultMode: 'buy',
      defaultCat: 'toys',
      specialtyCat: 'toys',
      tabs: ['toys']
    },
    orders: {
      key: 'orders',
      icon: 'orders',
      title: 'Market Orders',
      subtitle: 'Deliver crops for clovers',
      defaultMode: 'orders',
      defaultCat: 'seeds',
      specialtyCat: null,
      tabs: ['orders']
    },
    sell: {
      key: 'sell',
      icon: 'sell',
      title: 'My Stall',
      subtitle: 'Bag & stall upgrades',
      defaultMode: 'sell',
      defaultCat: 'seeds',
      specialtyCat: null,
      tabs: ['sell']
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
    const resolveAsset = (rel) => (S.api && typeof S.api.assetUrl === 'function')
      ? S.api.assetUrl(rel)
      : ('../../assets/' + rel.replace(/^\/+/, ''));
    lightsRequested = true;
    fetch(resolveAsset('data/lights.json'))
      .then(r => (r.ok ? r.json() : null))
      .then(j => { lightsData = j; render(); })
      .catch(() => { lightsData = null; });
  }

  function loadAtlas() {
    if (atlasRequested) return;
    const resolveAsset = (rel) => (S.api && typeof S.api.assetUrl === 'function')
      ? S.api.assetUrl(rel)
      : ('../../assets/' + rel.replace(/^\/+/, ''));
    atlasRequested = true;
    fetch(resolveAsset('world/atlas.json'))
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

  const MARKET_ICON_FALLBACKS = {
    plant_fern: 'plant',
    plant_cactus: 'cucumber',
    plant_flowers: 'dandelion',
    picture_pig: 'pig',
    picture_sunset: 'weather-clear',
    picture_carrot: 'carrot',
    lamp_star: 'star',
    lamp_mushroom: 'lamp-mushroom'
  };
  const MARKET_SWATCH_COLORS = {
    wallpaper_mint: '#bfe3c9',
    wallpaper_peach: '#f9dcc4',
    wallpaper_sky: '#a0d1f7',
    wallpaper_lilac: '#d9c8ef',
    wallpaper_night: '#2e3557',
    floor_wood_light: '#d4ae7f',
    floor_tiles_checker: '#444444',
    floor_grass: '#6ab84b',
    floor_carpet_red: '#c73a45',
    rug_round_pink: '#f2a2c0',
    rug_stripes: '#8ec5d6',
    rug_heart: '#f75c7b'
  };

  function iconClass(itemId) {
    const id = String(itemId || '');
    if (id.startsWith('seed_')) {
      return 'icon-' + id.slice(5).replace(/_/g, '-');
    }
    if (id.startsWith('sapling_')) {
      return 'icon-' + id.slice(8).replace(/_/g, '-');
    }
    if (MARKET_ICON_FALLBACKS[id]) {
      return 'icon-' + MARKET_ICON_FALLBACKS[id];
    }
    return 'icon-' + id.replace(/_/g, '-');
  }

  function resolveMarketItemIconHtml(itemId, name, sizeClass) {
    const api = getApi();
    const id = String(itemId || '');
    if (window.CuyWorldItems && typeof window.CuyWorldItems.find === 'function') {
      const w = window.CuyWorldItems.find(id);
      if (w && w.file && api && api.assetUrl) {
        return `<img class="edit-card-icon" src="${esc(api.assetUrl('world/' + w.file))}" alt="${esc(name)}" draggable="false">`;
      }
    }
    if (atlas && atlas.items && atlas.items[id] && atlas.items[id].file && api && api.assetUrl) {
      return `<img class="edit-card-icon" src="${esc(api.assetUrl('world/' + atlas.items[id].file))}" alt="${esc(name)}" draggable="false">`;
    }
    if (MARKET_SWATCH_COLORS[id]) {
      const sz = sizeClass === 'x2' ? 22 : 14;
      return `<span class="item-icon-swatch" style="display:inline-block;width:${sz}px;height:${sz}px;background:${MARKET_SWATCH_COLORS[id]};border:2px solid #2b211a;border-radius:3px;vertical-align:middle;" aria-hidden="true"></span>`;
    }
    const cls = iconClass(id);
    const szCls = sizeClass ? (' ' + sizeClass) : '';
    return `<span class="pixel-icon ${cls}${szCls}" aria-hidden="true"></span>`;
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
    craftFilter: 'all',
    stallKey: null,
    stallId: null,
    anchorRect: null,
    openedAt: 0,
    lastStateSig: null,
    unsubQuote: null,
    unsubState: null,
    onKeyDown: null,
    onDocDown: null,
    docDownTimer: null,
    hotspotSubscribed: false
  };

  function categorizeCraftItem(item) {
    if (!item || typeof item !== 'object') return 'decor';
    const cat = String(item.category || '').trim().toLowerCase();
    if (cat === 'toy' || cat === 'toys' || cat === 'equipment') return 'toys';
    const id = String(item.itemId || item.id || '').toLowerCase();
    if (window.EditFilters && typeof window.EditFilters.categorize === 'function') {
      return String(window.EditFilters.categorize({
        id: id,
        itemId: id,
        layer: item.layer,
        place: item.place,
        category: item.subCategory
      })).toLowerCase();
    }
    if (id.indexOf('lamp_') === 0 || LIGHT_IDS.has(id)) return 'lights';
    if (PLANT_PREFIXES.some(p => id.indexOf(p) === 0) || PLANT_EXACT.indexOf(id) >= 0) return 'plants';
    if (item.layer !== 'wall' && item.layer !== 'ground' &&
        (FURNITURE_EXACT.indexOf(id) >= 0 || FURNITURE_PREFIXES.some(p => id.indexOf(p) === 0))) {
      return 'furniture';
    }
    return 'decor';
  }

  function marketStateSig(st) {
    if (!st) return '';
    const marketPlace = ((st.places && st.places.places) || []).find(p => p && p.id === 'market');
    return JSON.stringify({
      c: st.clovers,
      m: st.market,
      inv: st.inventory,
      bag: st.bag,
      ro: st.rooms && st.rooms.owned,
      pl: marketPlace ? marketPlace.unlocked : null
    });
  }

  function isExplicitStallId(stallIdOrCategory, stallUid) {
    if (stallUid) return true;
    const s = String(stallIdOrCategory || '').trim().toLowerCase();
    return /^(?:fx:market:|stall[:_]|own_stall$|order_board$)/.test(s);
  }

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
      s === 'sell' || s === 'own' || s === 'own_stall' || s === 'stall:own' || s === 'stall_own' ||
      s === 'fx:market:own_stall' || s.endsWith('own_stall') || s.endsWith('stall_own') || s.endsWith(':own')
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
    P.unsubState = api.onState((st) => {
      ensureHotspotHook();
      if (P.el && P.el.isConnected) {
        if (P.stallId && window.CanvasPig && typeof window.CanvasPig.getHotspots === 'function') {
          const list = window.CanvasPig.getHotspots() || [];
          const hit = list.find(h => h && (h.uid === P.stallId || h.id === P.stallId));
          if (hit && hit.rect) P.anchorRect = hit.rect;
        }
        const curState = st || (api.getState ? api.getState() : null);
        const sig = marketStateSig(curState);
        if (sig !== P.lastStateSig) {
          renderPanel();
        }
      }
    });
  }

  function handleHotspot(hs) {
    if (!hs) return;
    const uid = String(hs.uid || '');
    const hid = String(hs.id || '');
    const id = uid || hid;
    const pat = /^stall[:_]|^fx:market:(stall_|order_board|own_stall)|^own_stall$|^order_board$|^orders$/i;
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
        ${resolveMarketItemIconHtml(b.itemId, b.name, '')}
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

    const prevScrollTop = container.scrollTop || 0;
    const prevScrollLeft = container.scrollLeft || 0;

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
    container.scrollTop = prevScrollTop;
    container.scrollLeft = prevScrollLeft;
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
        send({ type: 'market_order', index: Number(btn.dataset.fillOrder) });
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

  function resolveDrawerCardIconHtml(itemId, name) {
    return resolveMarketItemIconHtml(itemId, name, 'x2');
  }

  function syncMarketBodyClasses(collapsed) {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.add('cuy-market-open');
    document.body.classList.toggle('cuy-market-collapsed', !!collapsed);
  }

  function renderDrawerCards(st, activeTab, query, craftFilter) {
    const m = (st && st.market) || {};
    const clovers = Number((st && st.clovers) || 0);
    const q = String(query || '').trim().toLowerCase();
    const matchesQuery = (name, id) => !q || String(name || '').toLowerCase().includes(q) || String(id || '').toLowerCase().includes(q);

    if (activeTab === 'specials') {
      const specials = (m.specials || []).filter(s => s && matchesQuery(s.name, s.itemId));
      if (!specials.length) return '<div class="edit-drawer-empty">No specials available</div>';
      return specials.map(s => {
        const idx = typeof s.index === 'number' ? s.index : 0;
        const price = Number(s.price || 0);
        const was = Number(s.was || 0);
        const canAfford = clovers >= price;
        const name = s.name || prettyName(s.itemId);
        const disabledAttr = canAfford ? '' : ` disabled aria-disabled="true" title="Need ${price - clovers} more clovers"`;
        const wasHtml = was > price ? `<span class="market-card-was">${was}</span>` : '';
        return `<div class="edit-card ui-panel-wood" data-id="${esc(s.itemId)}" role="listitem" tabindex="0">
          <div class="edit-card-icon-wrap">${resolveDrawerCardIconHtml(s.itemId, name)}</div>
          <div class="edit-card-name" title="${esc(name)}">${esc(name)}</div>
          <button type="button" class="ui-btn edit-card-buy" data-drawer-special="${idx}"${disabledAttr}>
            Buy ${price} <span class="pixel-icon icon-clover" aria-hidden="true"></span>${wasHtml}
          </button>
        </div>`;
      }).join('');
    }

    if (activeTab === 'orders') {
      const orders = (m.orders || []).filter(o => o && matchesQuery(o.name || o.cropId, o.cropId));
      if (!orders.length) return '<div class="edit-drawer-empty">No market orders right now</div>';
      return orders.map((o, idx) => {
        const orderIndex = typeof o.orderIndex === 'number' ? o.orderIndex : (typeof o.index === 'number' ? o.index : idx);
        const itemId = String(o.itemId || o.item || o.cropId || '');
        const name = o.name || o.itemName || prettyName(itemId || 'Order');
        const need = Math.max(1, Number(o.need != null ? o.need : (o.count != null ? o.count : 1)));
        const have = ownedCount(st, itemId, o);
        const reward = Number(o.reward != null ? o.reward : 0);
        const done = Boolean(o.filled || o.done || o.completed || o.claimed);
        const canDeliver = !done && have >= need;
        const label = done ? 'Done' : `+${reward} <span class="pixel-icon icon-clover" aria-hidden="true"></span>`;
        return `<div class="edit-card ui-panel-wood${done ? ' is-dimmed' : ''}" data-id="${esc(itemId)}" role="listitem" tabindex="0">
          <div class="edit-card-icon-wrap">${resolveDrawerCardIconHtml(itemId, name)}</div>
          <div class="edit-card-name" title="${esc(name)} ×${need}">${esc(name)} ×${need}</div>
          <div class="market-card-meta">${have}/${need}</div>
          <button type="button" class="ui-btn edit-card-buy" data-drawer-order="${orderIndex}"${canDeliver ? '' : ' disabled aria-disabled="true"'}>${label}</button>
        </div>`;
      }).join('');
    }

    if (activeTab === 'sell') {
      const sellable = (m.sellable || []).filter(s => s && matchesQuery(s.name, s.itemId));
      if (!sellable.length) return '<div class="edit-drawer-empty">Nothing to sell yet</div>';
      const closed = (m.capLeft || 0) <= 0;
      return sellable.map(s => {
        const inBag = ownedCount(st, s.itemId, s);
        const canSell = inBag > 0 && !closed;
        const unitNow = Number(s.unitNow || 0);
        const name = s.name || prettyName(s.itemId);
        return `<div class="edit-card ui-panel-wood${inBag <= 0 ? ' is-dimmed' : ''}" data-id="${esc(s.itemId)}" role="listitem" tabindex="0">
          <div class="edit-card-icon-wrap">${resolveDrawerCardIconHtml(s.itemId, name)}</div>
          <div class="edit-card-name" title="${esc(name)}">${esc(name)}</div>
          <div class="market-card-meta">Bag: ${inBag}</div>
          <button type="button" class="ui-btn edit-card-buy" data-drawer-sell="${esc(s.itemId)}"${canSell ? '' : ' disabled aria-disabled="true"'}>
            Sell ${unitNow} <span class="pixel-icon icon-clover" aria-hidden="true"></span>
          </button>
        </div>`;
      }).join('');
    }

    const tabDef = DRAWER_TABS.find(t => t.id === activeTab) || DRAWER_TABS[1];
    const allowed = tabDef.categories || [];
    const cf = String(craftFilter || 'all').toLowerCase();
    const list = (m.buyable || []).filter(b => {
      if (!b || !catMatches(b, allowed) || !matchesQuery(b.name, b.itemId)) return false;
      if (activeTab === 'toys' && cf && cf !== 'all') {
        return categorizeCraftItem(b) === cf;
      }
      return true;
    });
    if (!list.length) return '<div class="edit-drawer-empty">Nothing here today</div>';
    return list.map(b => {
      const price = Number(b.price || 0);
      const owned = ownedCount(st, b.itemId, b);
      const isOneTimeOwned = Boolean(b.oneTime && owned > 0);
      const atDailyLimit = typeof b.dailyLimit === 'number' && typeof b.boughtToday === 'number' && b.boughtToday >= b.dailyLimit;
      const canAfford = clovers >= price;
      const canBuy = !isOneTimeOwned && !atDailyLimit && canAfford;
      const name = b.name || prettyName(b.itemId);
      const btnText = isOneTimeOwned ? 'Owned' : (atDailyLimit ? 'Limit' : `Buy ${price} <span class="pixel-icon icon-clover" aria-hidden="true"></span>`);
      const titleAttr = !canAfford && !isOneTimeOwned && !atDailyLimit ? ` title="Need ${price - clovers} more clovers"` : '';
      return `<div class="edit-card ui-panel-wood" data-id="${esc(b.itemId)}" role="listitem" tabindex="0">
        <div class="edit-card-icon-wrap">${resolveDrawerCardIconHtml(b.itemId, name)}</div>
        <div class="edit-card-name" title="${esc(name)}">${esc(name)}</div>
        <button type="button" class="ui-btn edit-card-buy" data-drawer-buy="${esc(b.itemId)}"${canBuy ? '' : ' disabled aria-disabled="true"'}${titleAttr}>${btnText}</button>
      </div>`;
    }).join('');
  }

  function renderPanel() {
    if (!P.el) return;
    const api = getApi();
    const st = api && api.getState ? api.getState() : null;
    P.lastStateSig = marketStateSig(st);

    const prevScrollTop = P.el.scrollTop || 0;
    const prevStrip = P.el.querySelector('#marketDrawerStrip');
    const prevStripLeft = prevStrip ? prevStrip.scrollLeft : 0;
    const prevContent = P.el.querySelector('#marketDrawerContent');
    const prevContentLeft = prevContent ? prevContent.scrollLeft : 0;
    const prevContentTop = prevContent ? prevContent.scrollTop : 0;
    const prevSearch = P.el.querySelector('#marketDrawerSearch');
    const wasSearchFocused = !!(prevSearch && document.activeElement === prevSearch);
    const selStart = wasSearchFocused ? prevSearch.selectionStart : null;
    const selEnd = wasSearchFocused ? prevSearch.selectionEnd : null;

    const stallDef = P.stallKey && STALLS[P.stallKey] ? STALLS[P.stallKey] : null;
    const allowedTabIds = stallDef ? stallDef.tabs : null;
    const visibleTabs = allowedTabIds
      ? DRAWER_TABS.filter(t => allowedTabIds.indexOf(t.id) !== -1)
      : DRAWER_TABS;
    let activeTab = P.tab || (visibleTabs[0] && visibleTabs[0].id) || 'food';
    if (visibleTabs.length && !visibleTabs.some(t => t.id === activeTab)) {
      activeTab = visibleTabs[0].id;
      P.tab = activeTab;
    }

    const clovers = st ? Number(st.clovers || 0) : 0;
    const m = st && st.market ? st.market : null;
    const marketPlace = ((st && st.places && st.places.places) || []).find(p => p && p.id === 'market');
    const isLocked = Boolean(marketPlace && marketPlace.unlocked === false);
    const stallInfo = (m && m.stall) || { level: 1, nextCost: -1 };
    const hasNext = typeof stallInfo.nextCost === 'number' && stallInfo.nextCost >= 0;
    const canStall = hasNext && clovers >= stallInfo.nextCost;

    const activeCraftFilter = P.craftFilter || 'all';
    const isCraftStallOnly = P.stallKey === 'toys';
    let tabsHtml = '';
    if (isCraftStallOnly) {
      tabsHtml = CRAFT_FILTER_TABS.map(f => {
        const cur = activeCraftFilter === f.id;
        return `<button type="button" role="tab" class="edit-drawer-tab${cur ? ' is-active' : ''}" aria-selected="${cur}" data-craft-filter="${f.id}">${esc(f.label)}</button>`;
      }).join('');
    } else {
      tabsHtml = visibleTabs.map(t => {
        const cur = activeTab === t.id;
        return `<button type="button" role="tab" class="edit-drawer-tab${cur ? ' is-active' : ''}" aria-selected="${cur}" data-market-tab="${t.id}">${esc(t.label)}</button>`;
      }).join('');
    }

    const subfiltersHtml = (!isCraftStallOnly && activeTab === 'toys')
      ? `<div class="market-subfilters" role="group" aria-label="Toys and Decor categories">${CRAFT_FILTER_TABS.map(f => {
          const cur = activeCraftFilter === f.id;
          return `<button type="button" class="edit-drawer-tab${cur ? ' is-active' : ''}" aria-pressed="${cur}" data-craft-filter="${f.id}">${esc(f.label)}</button>`;
        }).join('')}</div>`
      : '';

    const capHtml = (activeTab === 'sell' && m)
      ? `<div class="market-drawer-cap">${m.capLeft > 0 ? `Market will buy ${m.capLeft} more clovers today (${m.capLeft}/${m.cap})` : 'Daily sales cap reached'}</div>`
      : '';

    let stripHtml = '';
    if (isLocked) {
      stripHtml = `<div class="edit-drawer-empty">Market is locked${marketPlace.unlockCost ? ` (${marketPlace.unlockCost} clovers)` : ''}</div>`;
    } else if (!m) {
      stripHtml = '<div class="edit-drawer-empty">Opening the market…</div>';
    } else {
      stripHtml = renderDrawerCards(st, activeTab, P.query || '', activeCraftFilter);
    }

    const showUpgrade = !stallDef || stallDef.key === 'sell';
    const upgradeHtml = showUpgrade
      ? (hasNext
          ? `<button type="button" class="ui-btn edit-upgrade-btn" id="marketStallUpgradeBtn" data-stall="1"${canStall ? '' : ' disabled aria-disabled="true"'}>Upgrade (${stallInfo.nextCost} <span class="pixel-icon icon-clover" aria-hidden="true"></span>)</button>`
          : `<button type="button" class="ui-btn edit-upgrade-btn" id="marketStallUpgradeBtn" disabled aria-disabled="true">Stall Max</button>`)
      : '';
    const drawerTitle = stallDef ? stallDef.title : 'Market';

    P.el.className = 'feature-market edit-drawer market-drawer ui-panel-wood' + (P.collapsed ? ' is-collapsed' : '');
    P.el.innerHTML = `
      <div class="edit-drawer-header">
        <div class="edit-drawer-header-left">
          <span class="edit-drawer-title" id="marketDrawerTitle">${esc(drawerTitle)}</span>
          <span class="edit-drawer-level" id="marketDrawerClovers"><span class="pixel-icon icon-clover" aria-hidden="true"></span> ${clovers}</span>
          <span class="edit-drawer-level" id="marketDrawerStall">Stall Lv.${stallInfo.level || 1}</span>
        </div>
        <div class="edit-drawer-header-actions">
          ${upgradeHtml}
          <button type="button" class="edit-drawer-collapse" id="marketDrawerCollapse" aria-label="${P.collapsed ? 'Expand market' : 'Collapse market'}" title="${P.collapsed ? 'Expand market' : 'Collapse market'}" aria-expanded="${P.collapsed ? 'false' : 'true'}">${P.collapsed ? '&#x25B4;' : '&#x25BE;'}</button>
          <button type="button" class="ui-close edit-drawer-close" id="marketDrawerClose" aria-label="Close market"></button>
        </div>
      </div>
      <div class="edit-drawer-filters" id="marketDrawerFilters">
        <div class="edit-drawer-filters-bar">
          <div class="edit-drawer-tabs" role="tablist" aria-label="Market categories">${tabsHtml}</div>
          <input type="search" id="marketDrawerSearch" class="edit-drawer-search" placeholder="Search items..." aria-label="Search market items" value="${esc(P.query || '')}">
        </div>
        ${subfiltersHtml}
      </div>
      ${capHtml}
      <div class="edit-drawer-content" id="marketDrawerContent" role="region" aria-label="Market items">
        <div class="edit-drawer-strip" id="marketDrawerStrip" role="list">${stripHtml}</div>
      </div>`;

    syncMarketBodyClasses(P.collapsed);

    const closeBtn = P.el.querySelector('#marketDrawerClose');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    const colBtn = P.el.querySelector('#marketDrawerCollapse');
    if (colBtn) {
      colBtn.addEventListener('click', () => {
        P.collapsed = !P.collapsed;
        renderPanel();
      });
    }

    const stallBtn = P.el.querySelector('#marketStallUpgradeBtn');
    if (stallBtn) {
      stallBtn.addEventListener('click', () => {
        if (!stallBtn.disabled) send({ type: 'market_stall' });
      });
    }

    P.el.querySelectorAll('[data-market-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        P.tab = btn.dataset.marketTab || 'food';
        renderPanel();
      });
    });

    P.el.querySelectorAll('[data-craft-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        P.craftFilter = btn.dataset.craftFilter || 'all';
        renderPanel();
      });
    });

    const searchInput = P.el.querySelector('#marketDrawerSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        P.query = searchInput.value || '';
        const strip = P.el && P.el.querySelector('#marketDrawerStrip');
        if (strip && m) {
          const sl = strip.scrollLeft;
          strip.innerHTML = renderDrawerCards(st, P.tab || 'food', P.query, P.craftFilter || 'all');
          bindDrawerCardEvents(strip);
          strip.scrollLeft = sl;
        }
      });
    }

    const strip = P.el.querySelector('#marketDrawerStrip');
    if (strip) bindDrawerCardEvents(strip);

    P.el.scrollTop = prevScrollTop;
    if (strip) strip.scrollLeft = prevStripLeft;
    const newContent = P.el.querySelector('#marketDrawerContent');
    if (newContent) {
      newContent.scrollLeft = prevContentLeft;
      newContent.scrollTop = prevContentTop;
    }
    if (wasSearchFocused && searchInput) {
      searchInput.focus();
      if (selStart !== null && selEnd !== null && typeof searchInput.setSelectionRange === 'function') {
        try { searchInput.setSelectionRange(selStart, selEnd); } catch (e) {}
      }
    }
  }

  function bindDrawerCardEvents(strip) {
    strip.querySelectorAll('[data-drawer-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        send({ type: 'market_buy', itemId: btn.dataset.drawerBuy, count: 1 });
      });
    });
    strip.querySelectorAll('[data-drawer-special]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        send({ type: 'market_special', index: Number(btn.dataset.drawerSpecial) });
      });
    });
    strip.querySelectorAll('[data-drawer-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        send({ type: 'market_order', index: Number(btn.dataset.drawerOrder) });
      });
    });
    strip.querySelectorAll('[data-drawer-sell]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        send({ type: 'market_sell', itemId: btn.dataset.drawerSell, count: 1 });
      });
    });
  }

  function closePanel() {
    if (P.docDownTimer) { clearTimeout(P.docDownTimer); P.docDownTimer = null; }
    if (P.onKeyDown) { document.removeEventListener('keydown', P.onKeyDown); P.onKeyDown = null; }
    if (P.onDocDown) { document.removeEventListener('pointerdown', P.onDocDown, { capture: true }); P.onDocDown = null; }
    if (P.el && P.el.parentNode) P.el.parentNode.removeChild(P.el);
    P.el = null;
    P.lastStateSig = null;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('cuy-market-open', 'cuy-market-collapsed');
    }
  }

  function openPanel(stallIdOrCategory, anchorRect, stallUid) {
    closePanel();
    if (window.CuyEdit && typeof window.CuyEdit.close === 'function') {
      try { window.CuyEdit.close(); } catch (e) {}
    }
    ensureQuoteSub();
    ensureStateSub();
    loadAtlas();

    const s = String(stallIdOrCategory || '').trim().toLowerCase();
    const explicitStall = isExplicitStallId(stallIdOrCategory, stallUid);
    if (explicitStall) {
      const resolved = resolveStall(stallUid || stallIdOrCategory);
      P.stallKey = resolved.stall.key;
      P.tab = resolved.stall.defaultCat || resolved.stall.defaultMode || 'food';
      if (resolved.stall.key === 'orders') P.tab = 'orders';
      else if (resolved.stall.key === 'sell') P.tab = 'sell';
      P.craftFilter = resolved.craftSub === 'decor' ? 'decor' : (resolved.craftSub === 'toys' ? 'toys' : 'all');
    } else {
      let initialTab = 'food';
      if (s === 'specials' || s === 'special') initialTab = 'specials';
      else if (s === 'care' || s === 'medicine' || s === 'vitamins') initialTab = 'care';
      else if (s === 'orders' || s === 'order' || s.includes('order')) initialTab = 'orders';
      else if (s === 'sell' || s === 'own' || s.includes('stall_own') || s.includes('own_stall')) initialTab = 'sell';
      else if (s === 'seeds' || s.includes('seed') || s.includes('left')) initialTab = 'seeds';
      else if (s === 'toys' || s === 'decor' || s === 'home' || s.includes('craft') || s.includes('right')) initialTab = 'toys';
      else if (s === 'food' || s.includes('food') || s.includes('center') || s.includes('pantry')) initialTab = 'food';
      P.stallKey = null;
      P.tab = initialTab;
      P.craftFilter = (s === 'decor' || s === 'home') ? 'decor' : 'all';
    }

    P.collapsed = false;
    P.query = '';
    P.stallId = stallUid || (typeof stallIdOrCategory === 'string' ? stallIdOrCategory : null);
    P.anchorRect = anchorRect || null;
    P.openedAt = nowMs();

    const host = document.getElementById('gameDevice') || document.body;
    const el = document.createElement('aside');
    el.id = 'marketDrawer';
    el.className = 'feature-market edit-drawer market-drawer ui-panel-wood';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Market');
    el.setAttribute('data-allow-clip', 'true');
    host.appendChild(el);
    P.el = el;

    renderPanel();

    P.onKeyDown = (e) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', P.onKeyDown);
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
