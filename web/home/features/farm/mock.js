// Browser mock for the farm and orchard (W20-08).
// Mirrors state `farm` and the messages farm_*, orchard_* from FarmFeature.
// Crops grow on Date.now(); the mock decides ripeness, the page only counts down.
(function () {
  'use strict';
  const bridge = window.bridge;
  if (!bridge || !bridge.registerMockState || !bridge.registerMockHandler) return;

  const WORLD = /[?&]world=1(?!\d)/.test(window.location.search);

  // growSeconds is the mock's own pace (the C# side uses growMinutes).
  const CROPS = [
    { id: 'parsley', name: 'Parsley', unlockHarvests: 0,  growSeconds: 40,  yield: 2, sellPrice: 6,  seedPrice: 8 },
    { id: 'carrot',  name: 'Carrot',  unlockHarvests: 5,  growSeconds: 60,  yield: 3, sellPrice: 9,  seedPrice: 12 },
    { id: 'basil',   name: 'Basil',   unlockHarvests: 15, growSeconds: 90,  yield: 3, sellPrice: 14, seedPrice: 20 },
    { id: 'kale',    name: 'Kale',    unlockHarvests: 30, growSeconds: 120, yield: 4, sellPrice: 20, seedPrice: 30 }
  ];
  const ORCHARD_CROP = { id: 'apple', name: 'Apple', growSeconds: 60, maxStock: 5 };
  const PACK_SIZE = 2;
  const MAX_PLOTS = 12;
  const WATER_SPEEDUP = 0.2; // watering cuts the remaining time by 20%

  function cropDef(id) { return CROPS.find((c) => c.id === id) || null; }

  function initialFarm() {
    return {
      plotsOwned: 4,
      plots: [],
      orchardSlots: 1,
      orchard: [],
      canLevel: 1,
      sprinkler: false,
      packCount: 0,
      harvests: 0
    };
  }

  function ensureFarm(st) {
    if (!st.farmMock) st.farmMock = initialFarm();
    const m = st.farmMock;
    while (m.plots.length < m.plotsOwned) m.plots.push({ cropId: null, plantedAt: 0, readyAt: 0, watered: false });
    while (m.orchard.length < m.orchardSlots) m.orchard.push({ cropId: null, plantedAt: 0, stock: 0, nextAt: 0 });
    if (!st.inventory) st.inventory = {};
    if (st.inventory.seed_parsley === undefined) st.inventory.seed_parsley = 3;
    if (st.inventory.sapling_apple === undefined) st.inventory.sapling_apple = 1;
    if (WORLD) {
      st.clovers = Math.max(st.clovers || 0, 5000);
      m.harvests = Math.max(m.harvests, 30);
    }
    derive(st);
    return m;
  }

  function plotState(p, now) {
    if (!p.cropId) return { state: 'empty', secondsLeft: 0 };
    const left = Math.max(0, Math.ceil((p.readyAt - now) / 1000));
    if (left <= 0) return { state: 'ripe', secondsLeft: 0 };
    return { state: 'growing', secondsLeft: left };
  }

  // Rebuilds the public `farm` state from the mock's own store.
  function derive(st) {
    const m = st.farmMock;
    const now = Date.now();
    const placeOpen = !!(st.places && (st.places.places || []).find((p) => p.id === 'farm' && p.unlocked));
    const plots = m.plots.slice(0, m.plotsOwned).map((p, i) => {
      const ps = plotState(p, now);
      const def = cropDef(p.cropId);
      return { index: i, cropId: p.cropId || null, state: ps.state, watered: !!p.watered && ps.state === 'growing', secondsLeft: ps.secondsLeft, yield: def ? def.yield : 0 };
    });
    const orchard = m.orchard.map((o, slot) => {
      if (o.cropId) {
        // stock grows one apple per growSeconds, up to maxStock
        if (o.stock < ORCHARD_CROP.maxStock && now >= o.nextAt) {
          const gained = Math.min(ORCHARD_CROP.maxStock - o.stock, Math.floor((now - o.nextAt) / (ORCHARD_CROP.growSeconds * 1000)) + 1);
          o.stock += gained;
          o.nextAt += gained * ORCHARD_CROP.growSeconds * 1000;
          if (o.stock >= ORCHARD_CROP.maxStock) o.nextAt = 0;
        }
      }
      return { slot, cropId: o.cropId || null, stock: o.stock, secondsToNext: o.cropId && o.stock < ORCHARD_CROP.maxStock ? Math.max(0, Math.ceil((o.nextAt - now) / 1000)) : 0 };
    });
    const crops = CROPS.map((c) => {
      const unlocked = m.harvests >= c.unlockHarvests;
      return {
        id: c.id, name: c.name, icon: 'icon-crop-' + c.id, kind: 'vegetable', unlocked: unlocked,
        seedItem: 'seed_' + c.id, seedOwned: (st.inventory['seed_' + c.id] || 0), growMinutes: Math.round(c.growSeconds / 60 * 10) / 10,
        yield: c.yield, sellPrice: c.sellPrice, unlockHarvests: c.unlockHarvests
      };
    });
    st.farm = {
      unlocked: placeOpen || m.plotsOwned > 4 || m.harvests > 0,
      plots: plots,
      orchard: orchard,
      crops: crops,
      tools: { canId: 'can_' + m.canLevel, plotsPerWater: m.canLevel, sprinkler: m.sprinkler },
      upgrades: {
        nextPackCost: m.plotsOwned >= MAX_PLOTS ? null : 150 * (m.packCount + 1),
        nextOrchardCost: 200 * m.orchardSlots,
        nextCanCost: m.canLevel >= 3 ? null : 120 * m.canLevel,
        sprinklerCost: m.sprinkler ? null : 500
      },
      harvests: m.harvests
    };
    return st.farm;
  }

  function pay(st, cost) {
    if (cost === null || cost === undefined) return false;
    if (WORLD) return true;
    if (st.clovers < cost) return false;
    st.clovers -= cost;
    return true;
  }

  function harvestPlot(st, i) {
    const m = st.farmMock;
    const p = m.plots[i];
    if (!p || !p.cropId) return false;
    const def = cropDef(p.cropId);
    if (!def || Date.now() < p.readyAt) return false;
    st.inventory[def.id] = (st.inventory[def.id] || 0) + def.yield;
    m.harvests += 1;
    p.cropId = null; p.plantedAt = 0; p.readyAt = 0; p.watered = false;
    return true;
  }

  bridge.registerMockState('farm', function (st) { ensureFarm(st); });

  bridge.registerMockHandler('farm_plant', function (st, action) {
    const m = ensureFarm(st);
    const def = cropDef(action.cropId);
    const p = m.plots[action.plot];
    if (!def || !p || p.cropId) return;
    if (m.harvests < def.unlockHarvests) { this.dispatchMessage({ type: 'toast', text: def.name + ' opens after ' + def.unlockHarvests + ' harvests' }); return; }
    const seed = 'seed_' + def.id;
    if (!st.inventory[seed]) { this.dispatchMessage({ type: 'toast', text: 'You have no ' + def.name + ' seeds' }); return; }
    st.inventory[seed] -= 1;
    const now = Date.now();
    p.cropId = def.id; p.plantedAt = now; p.readyAt = now + def.growSeconds * 1000; p.watered = false;
    derive(st);
  });

  bridge.registerMockHandler('farm_water', function (st, action) {
    const m = ensureFarm(st);
    const p = m.plots[action.plot];
    const def = p && cropDef(p.cropId);
    if (!def || p.watered || Date.now() >= p.readyAt) return;
    const now = Date.now();
    p.watered = true;
    p.readyAt = now + Math.max(0, (p.readyAt - now) * (1 - WATER_SPEEDUP));
    derive(st);
  });

  bridge.registerMockHandler('farm_harvest', function (st, action) {
    ensureFarm(st);
    if (harvestPlot(st, action.plot)) derive(st);
  });

  bridge.registerMockHandler('farm_harvest_all', function (st) {
    const m = ensureFarm(st);
    let n = 0;
    m.plots.forEach((_, i) => { if (harvestPlot(st, i)) n++; });
    if (n === 0) this.dispatchMessage({ type: 'toast', text: 'Nothing is ripe yet' });
    derive(st);
  });

  bridge.registerMockHandler('farm_buy', function (st, action) {
    const m = ensureFarm(st);
    const what = action.what || action.id;
    if (what === 'pack') {
      if (m.plotsOwned >= MAX_PLOTS) return;
      if (!pay(st, 150 * (m.packCount + 1))) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
      m.packCount += 1; m.plotsOwned = Math.min(MAX_PLOTS, m.plotsOwned + PACK_SIZE);
    } else if (what === 'orchard') {
      if (!pay(st, 200 * m.orchardSlots)) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
      m.orchardSlots += 1;
    } else if (what === 'can') {
      if (m.canLevel >= 3) return;
      if (!pay(st, 120 * m.canLevel)) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
      m.canLevel += 1;
    } else if (what === 'sprinkler') {
      if (m.sprinkler) return;
      if (!pay(st, 500)) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
      m.sprinkler = true;
    } else {
      return;
    }
    derive(st);
  });

  bridge.registerMockHandler('orchard_plant', function (st, action) {
    const m = ensureFarm(st);
    const o = m.orchard[action.slot];
    if (!o || o.cropId) return;
    if (!st.inventory.sapling_apple) { this.dispatchMessage({ type: 'toast', text: 'You have no apple saplings' }); return; }
    st.inventory.sapling_apple -= 1;
    o.cropId = ORCHARD_CROP.id; o.plantedAt = Date.now(); o.stock = 0; o.nextAt = Date.now() + ORCHARD_CROP.growSeconds * 1000;
    derive(st);
  });

  bridge.registerMockHandler('orchard_harvest', function (st, action) {
    const m = ensureFarm(st);
    const o = m.orchard[action.slot];
    if (!o || !o.cropId || o.stock <= 0) return;
    st.inventory[ORCHARD_CROP.id] = (st.inventory[ORCHARD_CROP.id] || 0) + o.stock;
    o.stock = 0; o.nextAt = Date.now() + ORCHARD_CROP.growSeconds * 1000;
    derive(st);
  });

  // Ripeness changes with time, not with a message: push a state when a plot becomes ripe.
  setInterval(function () {
    const st = bridge.currentState;
    if (!st || !st.farmMock) return;
    const before = JSON.stringify(st.farm && st.farm.plots);
    derive(st);
    if (JSON.stringify(st.farm.plots) !== before && typeof bridge.broadcastState === 'function') {
      bridge.broadcastState();
    }
  }, 1000);

  window.CuyFarmMock = { CROPS: CROPS, ORCHARD_CROP: ORCHARD_CROP, WORLD: WORLD };
})();
