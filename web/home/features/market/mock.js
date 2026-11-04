// Browser mock for the market (W20-08).
// Mirrors state `market` and the messages market_* from MarketFeature.
// Demand lives in memory: it drops 0.1 per unit sold and recovers on reload.
// capLeft is the clovers' worth the market still buys today; it resets when the date changes.
(function () {
  'use strict';
  const bridge = window.bridge;
  if (!bridge || !bridge.registerMockState || !bridge.registerMockHandler) return;

  const WORLD = /[?&]world=1(?!\d)/.test(window.location.search);
  const DEMAND_STEP = 0.1;
  const DEMAND_MIN = 0.3;
  const BASE_CAP = 30;
  const CAP_PER_LEVEL = 15;
  const HARVESTS_FOR_BOARD = 30;

  const SELLABLE = [
    { itemId: 'parsley', name: 'Parsley', base: 6 },
    { itemId: 'carrot',  name: 'Carrot',  base: 9 },
    { itemId: 'basil',   name: 'Basil',   base: 14 },
    { itemId: 'kale',    name: 'Kale',    base: 20 },
    { itemId: 'apple',   name: 'Apple',   base: 8 }
  ];
  const BUYABLE = [
    { itemId: 'seed_parsley', name: 'Parsley seeds', category: 'seed', price: 8 },
    { itemId: 'seed_carrot',  name: 'Carrot seeds',  category: 'seed', price: 12 },
    { itemId: 'seed_basil',   name: 'Basil seeds',   category: 'seed', price: 20 },
    { itemId: 'seed_kale',    name: 'Kale seeds',    category: 'seed', price: 30 },
    { itemId: 'hay',          name: 'Hay',           category: 'pantry', price: 5 },
    { itemId: 'carrot_treat', name: 'Carrot treat',  category: 'pantry', price: 7 }
  ];
  const DECOR_ITEMS = [
    { itemId: 'lamp_floor', name: 'Floor lamp', category: 'decor' },
    { itemId: 'fence_wood', name: 'Wood fence', category: 'decor' },
    { itemId: 'bench_wood', name: 'Wood bench', category: 'decor' }
  ];
  const SPECIALS = [
    { itemId: 'seed_kale',    name: 'Kale seeds',   was: 30, price: 24 },
    { itemId: 'hay',          name: 'Hay',          was: 5,  price: 3 },
    { itemId: 'carrot_treat', name: 'Carrot treat', was: 7,  price: 5 }
  ];
  const ORDERS = [
    { cropId: 'parsley', count: 2, reward: 9 },
    { cropId: 'carrot',  count: 3, reward: 20 }
  ];

  // Demand per crop, in memory only (recovers on reload).
  const demand = {};
  function demandOf(itemId) { return demand[itemId] === undefined ? 1.0 : demand[itemId]; }
  function capFor(level) { return BASE_CAP + CAP_PER_LEVEL * (level - 1); }
  function todayKey() { return new Date().toDateString(); }

  function ensureMarket(st) {
    if (!st.market) st.market = { capLeft: BASE_CAP, cap: BASE_CAP, stall: { level: 1, nextCost: 150 }, capDay: todayKey() };
    const m = st.market;
    if (!m.stall) m.stall = { level: 1, nextCost: 150 };
    m.cap = capFor(m.stall.level);
    m.stall.nextCost = 150 * m.stall.level;
    if (m.capDay !== todayKey()) { m.capLeft = m.cap; m.capDay = todayKey(); }
    if (typeof m.capLeft !== 'number') m.capLeft = m.cap;
    if (!st.inventory) st.inventory = {};
    if (typeof st.clovers !== 'number') st.clovers = 48;
    if (WORLD) st.clovers = Math.max(st.clovers, 5000);
    derive(st);
    return m;
  }

  function unitPrice(base, d) { return Math.max(1, Math.round(base * d)); }

  function derive(st) {
    const m = st.market;
    const harvests = st.farmMock ? st.farmMock.harvests : 0;
    const decor = DECOR_ITEMS.map((d) => {
      const price = (window.CuyRoomsMock && window.CuyRoomsMock.CATALOG.find((c) => c.id === d.itemId) || {}).price || 40;
      return { itemId: d.itemId, name: d.name, category: d.category, price: price };
    });
    m.sellable = SELLABLE.map((s) => ({
      itemId: s.itemId, name: s.name, owned: st.inventory[s.itemId] || 0,
      unitNow: unitPrice(s.base, demandOf(s.itemId)), demand: Math.round(demandOf(s.itemId) * 100) / 100
    }));
    m.buyable = BUYABLE.concat(decor);
    m.specials = SPECIALS.map((s, i) => ({ index: i, itemId: s.itemId, name: s.name, price: s.price, was: s.was }));
    m.orders = harvests >= HARVESTS_FOR_BOARD
      ? ORDERS.map((o, i) => ({ index: i, cropId: o.cropId, count: o.count, reward: o.reward, done: !!(m.doneOrders && m.doneOrders[i]) }))
      : [];
    m.clovers = st.clovers;
    return m;
  }

  // Simulates selling `count` units without changing anything; returns { units, total }.
  function simulate(sellBase, itemDemand, count, capLeft) {
    let units = 0; let total = 0; let d = itemDemand;
    while (units < count) {
      const p = unitPrice(sellBase, d);
      if (total + p > capLeft) break;
      total += p; units += 1;
      d = Math.max(DEMAND_MIN, d - DEMAND_STEP);
    }
    return { units: units, total: total, demandAfter: d };
  }

  function sellDef(itemId) { return SELLABLE.find((s) => s.itemId === itemId) || null; }

  bridge.registerMockState('market', function (st) { ensureMarket(st); });

  bridge.registerMockHandler('market_quote', function (st, action) {
    const m = ensureMarket(st);
    const def = sellDef(action.itemId);
    if (!def) return;
    const count = Math.max(1, action.count | 0);
    const q = simulate(def.base, demandOf(def.itemId), count, m.capLeft);
    this.dispatchMessage({
      type: 'market_quote_result', itemId: def.itemId, count: q.units, total: q.total,
      unitPrice: q.units > 0 ? Math.round(q.total / q.units) : unitPrice(def.base, demandOf(def.itemId))
    });
  });

  bridge.registerMockHandler('market_sell', function (st, action) {
    const m = ensureMarket(st);
    const def = sellDef(action.itemId);
    if (!def) return;
    const owned = st.inventory[def.itemId] || 0;
    const want = Math.min(Math.max(1, action.count | 0), owned);
    if (owned <= 0) { this.dispatchMessage({ type: 'toast', text: 'You have none of that to sell' }); return; }
    if (m.capLeft <= 0) { this.dispatchMessage({ type: 'toast', text: 'The market has enough for today' }); return; }
    const q = simulate(def.base, demandOf(def.itemId), want, m.capLeft);
    if (q.units === 0) { this.dispatchMessage({ type: 'toast', text: 'The market has enough for today' }); return; }
    demand[def.itemId] = q.demandAfter;
    st.inventory[def.itemId] = owned - q.units;
    st.clovers += q.total;
    m.capLeft -= q.total;
    derive(st);
  });

  bridge.registerMockHandler('market_buy', function (st, action) {
    ensureMarket(st);
    const count = Math.max(1, action.count | 0);
    const item = BUYABLE.find((b) => b.itemId === action.itemId) || DECOR_ITEMS.find((d) => d.itemId === action.itemId);
    if (!item) return;
    const price = item.price || 40;
    const total = price * count;
    if (!WORLD && st.clovers < total) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
    st.clovers -= total;
    if (item.category === 'decor') {
      if (!st.rooms) st.rooms = { layouts: {}, owned: {}, catalog: [], comfort: {}, skins: { wallpapers: [], floors: [] } };
      st.rooms.owned = st.rooms.owned || {};
      st.rooms.owned[item.itemId] = (st.rooms.owned[item.itemId] || 0) + count;
    } else {
      st.inventory[item.itemId] = (st.inventory[item.itemId] || 0) + count;
    }
    derive(st);
  });

  bridge.registerMockHandler('market_special', function (st, action) {
    ensureMarket(st);
    const s = SPECIALS[action.index];
    if (!s) return;
    if (!WORLD && st.clovers < s.price) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
    st.clovers -= s.price;
    st.inventory[s.itemId] = (st.inventory[s.itemId] || 0) + 1;
    derive(st);
  });

  bridge.registerMockHandler('market_order', function (st, action) {
    const m = ensureMarket(st);
    const o = ORDERS[action.index];
    if (!o) return;
    m.doneOrders = m.doneOrders || {};
    if (m.doneOrders[action.index]) return;
    const owned = st.inventory[o.cropId] || 0;
    if (owned < o.count) { this.dispatchMessage({ type: 'toast', text: 'Not enough ' + o.cropId + ' yet' }); return; }
    if (m.capLeft < o.reward) { this.dispatchMessage({ type: 'toast', text: 'The market has enough for today' }); return; }
    st.inventory[o.cropId] = owned - o.count;
    st.clovers += o.reward;
    m.capLeft -= o.reward;
    m.doneOrders[action.index] = true;
    derive(st);
  });

  bridge.registerMockHandler('market_stall', function (st) {
    const m = ensureMarket(st);
    const cost = m.stall.nextCost;
    if (m.stall.level >= 3) return;
    if (!WORLD && st.clovers < cost) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
    st.clovers -= cost;
    m.stall.level += 1;
    derive(st);
  });

  window.CuyMarketMock = { SELLABLE: SELLABLE, WORLD: WORLD };
})();
