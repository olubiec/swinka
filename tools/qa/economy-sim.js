#!/usr/bin/env node
// Economy simulator for the world (farm, market, places, decor) on top of the existing income.
// Run from the repo root: node tools/qa/economy-sim.js [--days 365] [--runs 20] [--verbose] [--check]
// Reads assets/data/{farm,market,places,world_items,items,items_shop,items_farm,items_decor}.json.
// Not the game: a model of player behaviour to compare balance variants. Numbers: docs/WORLD.md section 6.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', '..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(root, 'assets/data', f), 'utf8'));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? Number(args[i + 1]) : true); };
const DAYS = opt('days', 365), RUNS = opt('runs', 20);

const base = { farm: J('farm.json'), market: J('market.json'), places: J('places.json'), world: J('world_items.json'), pigRooms: J('pig_rooms.json'), homeEco: J('home_economy.json'), pigsNamed: J('pigs_named.json') };
const items = {};
for (const f of ['items.json', 'items_shop.json', 'items_farm.json']) for (const i of J(f).items) items[i.id] = i;
const decorOld = J('items_decor.json').items;

// Existing daily income (clovers earned from minigames, gift, care...) from docs/economy-report.md (60 days).
const PROFILES = {
  casual:  { income: 94.5,  visits: [20 * 60],                         water: 0.4, playProb: 0.85, daysFarmAware: 1 },
  regular: { income: 143.7, visits: [9 * 60, 20 * 60],                 water: 0.7, playProb: 0.95, daysFarmAware: 1 },
  heavy:   { income: 257.8, visits: [8 * 60, 13 * 60, 19 * 60, 22 * 60], water: 0.95, playProb: 1.0, daysFarmAware: 1 },
  // the worst case for the economy: plays the farm perfectly, sells everything, never skips a visit
  exploit: { income: 143.7, visits: [7 * 60, 11 * 60, 15 * 60, 19 * 60, 23 * 60], water: 1.0, playProb: 1.0, optimizer: true },
  // best realistic play: six visits a day, waters everything, plants the crop with the best price-times-demand per hour, sells everything it can
  smart:   { income: 143.7, visits: [7 * 60, 10 * 60, 13 * 60, 16 * 60, 19 * 60, 22 * 60], water: 1.0, playProb: 1.0, optimizer: true, smart: true },
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---- variant mutators (each returns a modified clone of the base data) ----
const setD = (d, drop, rec, floor) => { d.market.demand.drop_per_unit = drop; d.market.demand.recover_per_day = rec; if (floor !== undefined) d.market.demand.floor = floor; return d; };
const VARIANTS = {
  'baseline': (d) => d,
  'cap25': (d) => { d.market.daily_sales_cap_clovers = 25; return d; },
  'cap60': (d) => { d.market.daily_sales_cap_clovers = 60; return d; },
  'cap100 (demand only)': (d) => { d.market.daily_sales_cap_clovers = 100; return d; },
  'legacy quota 6/6, cap 40': (d) => { delete d.market.demand; d.market.full_price_units_per_item = 6; return d; },
  'demand drop .15': (d) => setD(d, 0.15, 0.10),
  'demand drop .05': (d) => setD(d, 0.05, 0.10),
  'demand recover .05': (d) => setD(d, 0.10, 0.05),
  'demand recover .20': (d) => setD(d, 0.10, 0.20),
  'demand floor .15': (d) => setD(d, 0.10, 0.10, 0.15),
  'grow x2': (d) => { for (const c of d.farm.crops) c.grow_minutes *= 2; return d; },
  'grow x0.5': (d) => { for (const c of d.farm.crops) c.grow_minutes = Math.max(30, c.grow_minutes / 2); return d; },
  'places x1.33': (d) => { for (const p of d.places.places) { if (p.cost) p.cost = Math.round(p.cost * 1.33); } return d; },
  'all prices x1.5': (d) => { for (const p of d.world.items) p.price = Math.round(p.price * 1.5); for (const p of d.places.places) { if (p.cost) p.cost = Math.round(p.cost * 1.5); } return d; },
  'no orders': (d) => { d.market.orders.per_day = 0; return d; },
  'orders 3 x1.5': (d) => { d.market.orders.per_day = 3; d.market.orders.reward_factor = 1.5; return d; },
  'no wiggle': (d) => { d.market.price_wiggle_percent = 0; return d; },
  // pig rooms: every adopted pig has a room (levels 2 and 3, a furnished set of house items); pigs arrive on the offers timeline
  'pigrooms': (d) => { d.pigrooms = true; return d; },
  // the same rooms, with players who do not over-plant (optimistic income): the content must still last
  'pigrooms sane': (d) => { d.pigrooms = true; d.sane = true; return d; },
  'baseline sane': (d) => { d.sane = true; return d; },
  // everything: pig rooms + shared bedroom (3+ pigs) + item colours + the garden run
  'full': (d) => { d.pigrooms = true; d.dorm = true; d.colours = true; d.run = true; return d; },
  'full sane': (d) => { d.pigrooms = true; d.dorm = true; d.colours = true; d.run = true; d.sane = true; return d; },
};

function buildShopList(d) {
  const list = [];
  const P = (id) => d.places.places.find((p) => p.id === id);
  const lv = (x, name) => (x.levels || []).slice(1).forEach((l, i) => list.push({ k: name + ':L' + (i + 2), cost: l.cost, kind: 'level', place: name }));
  const push = (k, cost, kind, extra) => list.push(Object.assign({ k, cost, kind }, extra || {}));
  push('garden', P('garden').cost, 'place');
  push('farm', P('farm').cost, 'place');
  const packs = d.farm.plot_packs;
  push('pack1', packs[0].cost, 'pack', { plots: 4 });
  push('orchard1', d.farm.orchard_slots[0].cost, 'orchard');
  push('bedroom', P('house').rooms[1].cost, 'room');
  push('house:L2', P('house').rooms[0].levels[1].cost, 'level');
  push('pack2', packs[1].cost, 'pack', { plots: 4 });
  push('park', P('park').cost, 'place');
  push('playroom', P('house').rooms[2].cost, 'room');
  push('orchard2', d.farm.orchard_slots[1].cost, 'orchard');
  push('pack3', packs[2].cost, 'pack', { plots: 4 });
  push('garden:L2', P('garden').levels[1].cost, 'level');
  push('house:L3', P('house').rooms[0].levels[2].cost, 'level');
  push('orchard3', d.farm.orchard_slots[2].cost, 'orchard');
  push('pack4', packs[3].cost, 'pack', { plots: 4 });
  push('bedroom:L2', P('house').rooms[1].levels[1].cost, 'level');
  push('playroom:L2', P('house').rooms[2].levels[1].cost, 'level');
  push('orchard4', d.farm.orchard_slots[3].cost, 'orchard');
  push('pack5', packs[4].cost, 'pack', { plots: 4 });
  push('park:L2', P('park').levels[1].cost, 'level');
  push('big_stall', d.market.stall_upgrades[0].cost, 'stall');
  for (const c of d.farm.crops.filter((c) => c.kind === 'perennial')) push('sapling_' + c.id, c.seed_price, 'sapling', { crop: c.id });
  if (d.pigrooms) {
    const pr = d.pigRooms, lvls = pr.template.levels;
    const pigs = d.pigsNamed.pigs.map((p) => p.id);
    const at = (key, arr) => { const i = list.findIndex((x) => x.k === key); list.splice(i + 1, 0, ...arr); };
    const L = (pig, n) => ({ k: 'pigroom:' + pig + ':L' + n, cost: lvls[n - 1].cost, kind: 'pigroom', pig });
    at('pack2', pigs.slice(0, 2).map((p) => L(p, 2)));
    at('playroom', pigs.slice(2).map((p) => L(p, 2)));
    at('park:L2', pigs.map((p) => L(p, 3)));
    if (d.dorm) {
      const dl = pr.dorm.levels;
      at('pigroom:ned:L2', [{ k: 'dorm', cost: pr.dorm.unlock_cost, kind: 'dorm', needPigs: 3 }]);
      at('garden:L2', [{ k: 'dorm:L2', cost: dl[1].cost, kind: 'dorm', req: 'dorm' }]);
      at('big_stall', [{ k: 'dorm:L3', cost: dl[2].cost, kind: 'dorm', req: 'dorm' }]);
    }
    if (d.run) at('garden', [{ k: 'run:gate', cost: d.world.items.find((i) => i.id === 'gate_garden').price, kind: 'run', req: 'garden' }, { k: 'run:fence', cost: 16 * d.world.items.find((i) => i.id === 'fence_wood').price, kind: 'run', req: 'garden' }]);
  }
  const rest0 = [...d.world.items.filter((i) => i.price > 0 && i.id !== 'gate_garden').map((i) => ({ k: i.id, cost: i.price, kind: 'item' })), ...decorOld.map((i) => ({ k: i.id, cost: i.price, kind: 'item' }))].sort((a, b) => a.cost - b.cost);
  const rest = rest0;
  if (d.pigrooms) {
    // furnishing: one copy of every purchasable house item per pig room (a room holds at most one set of this size), bought when the pig exists
    const furn = d.world.items.filter((i) => i.place.includes('house') && i.price > 0 && !i.signature_of && !i.prop_of);
    for (const pig of d.pigsNamed.pigs.map((p) => p.id)) for (const i of furn) rest.push({ k: 'furn:' + pig + ':' + i.id, cost: i.price, kind: 'item', pig });
    if (d.dorm) for (const i of furn) rest.push({ k: 'furn:dorm:' + i.id, cost: i.price, kind: 'item', req: 'dorm' });
  }
  if (d.colours) {
    const pct = d.homeEco.variants.unlock_percent / 100, mn = d.homeEco.variants.min_price;
    for (const i of d.world.items.filter((i) => i.recolor && i.price > 0)) rest.push({ k: 'colour:' + i.id, cost: 3 * Math.max(mn, Math.ceil(i.price * pct)), kind: 'item', colourOf: i.id });
  }
  rest.sort((a, b) => a.cost - b.cost);
  return { structural: list, items: rest };
}

function simulate(d, prof, seed, o) {
  const R = rng(seed), M = d.market;
  const shop = buildShopList(d);
  const owned = new Set(), clovers = { v: 30 }; let decorWallet = 0;
  // pigs: the two starters are free at day 0, the others are offers (days from pigs_named.json) that cost 100 clovers
  const adopted = new Set(d.pigrooms ? d.pigsNamed.pigs.filter((p) => p.offer.cost === 0).map((p) => p.id) : []);
  const offers = d.pigrooms ? d.pigsNamed.pigs.filter((p) => p.offer.cost > 0) : [];
  const upkeep = o.pigUpkeep ?? 3; // clovers per day for each pig beyond the first two (food, hay, vet), assumption
  let plots = 0, orchardSlots = 0, hasFarm = false, stallBonus = 0;
  const plotState = []; // {crop, plantedAt, watered}
  const orchard = [];   // {crop, nextAt, stock}
  const inv = {};       // item -> count
  let harvests = 0, totalSpent = 0, totalContent = 0;
  const contentTotal = shop.structural.reduce((a, b) => a + b.cost, 0) + shop.items.reduce((a, b) => a + b.cost, 0);
  const milestones = { 0.25: null, 0.5: null, 0.75: null, 1: null, garden: null, farm: null, park: null, allPlaces: null, firstRoomL2: null, allRoomL3: null, dorm: null };
  const dem = {}; const stats = { farmSales: 0, orderSales: 0, capDays: 0, capHit: 0, foodSaved: 0, baseIncome: 0, seedCost: 0, capDaysArr: [], earnedByDay: [] };
  const crops = d.farm.crops;
  const cropBy = {}; crops.forEach((c) => (cropBy[c.id] = c));
  const buyPrice = (id) => items[id].price;
  const wig = M.price_wiggle_percent / 100;
  const priceOf = (id, day) => { const w = wig ? (Math.sin((day + 1) * 12.9898 + id.length * 78.233 + id.charCodeAt(0)) * 43758.5453) % 1 : 0; return cropBy[id].sell_price * (1 + (Math.abs(w) * 2 - 1) * wig); };
  const unlocked = () => crops.filter((c) => c.unlock_harvests <= harvests);
  const plantable = () => unlocked().filter((c) => c.kind === 'annual');

  for (let day = 0; day < DAYS; day++) {
    if (M.demand) for (const id of Object.keys(dem)) dem[id] = Math.min(1, dem[id] + M.demand.recover_per_day);
    const play = R() < prof.playProb;
    let capLeft = M.daily_sales_cap_clovers; const sold = {}; let dayFarm = 0;
    const gain = play ? prof.income * (0.75 + R() * 0.5) : 0;
    clovers.v += gain; stats.baseIncome += gain;
    // existing shop habits: part of the income goes to things that exist today (toys, food, vet), not to the world content
    const otherSpend = play ? gain * (o.otherShare ?? 0.2) : 0; clovers.v -= otherSpend;
    for (const of of offers) if (!adopted.has(of.id) && day >= of.offer.after_days && clovers.v >= of.offer.cost + 30) { clovers.v -= of.offer.cost; adopted.add(of.id); }
    if (play && adopted.size > 2) clovers.v -= (adopted.size - 2) * upkeep;
    // orders for the day
    const orders = [];
    if (M.orders.per_day > 0 && harvests >= M.orders.unlock_harvests) {
      for (let i = 0; i < M.orders.per_day; i++) { const u = unlocked().filter((c) => c.kind === 'annual'); if (u.length) orders.push({ crop: u[Math.floor(R() * u.length)].id, n: 2 }); }
    }
    let ateToday = 0;
    for (let vi = 0; vi < prof.visits.length && play; vi++) {
      const t = day * 1440 + prof.visits[vi];
      if (hasFarm) {
        // harvest
        for (let i = 0; i < plotState.length; i++) {
          const p = plotState[i]; if (!p) continue;
          const c = cropBy[p.crop], need = c.grow_minutes * (p.watered ? 1 - d.farm.water.time_cut_percent / 100 : 1);
          if (t - p.plantedAt >= need) { const y = c.yield + (R() < d.farm.great_harvest.chance_percent / 100 ? 1 : 0); inv[c.item] = (inv[c.item] || 0) + y; harvests++; plotState[i] = null; }
        }
        for (const o2 of orchard) { while (o2.nextAt <= t && o2.stock < cropBy[o2.crop].max_stock) { o2.stock += cropBy[o2.crop].yield; o2.nextAt += cropBy[o2.crop].grow_minutes; } if (o2.stock > 0 && o2.nextAt <= t) o2.nextAt = t; if (o2.stock >= 1) { inv[cropBy[o2.crop].item] = (inv[cropBy[o2.crop].item] || 0) + o2.stock; harvests += 1; o2.stock = 0; o2.nextAt = Math.max(o2.nextAt, t) ; } }
      }
      // feed the pig: two vegetables per day (first visit), own harvest first, else the shop
      if (vi === 0) {
        for (let k = 0; k < 2; k++) {
          const own = ['kale', 'parsley', 'bell_pepper', 'cucumber', 'dandelion', 'cilantro', 'basil', 'romaine_lettuce', 'zucchini'].find((id) => inv[id] > 0);
          if (own) { inv[own]--; stats.foodSaved += buyPrice(own); } else { clovers.v -= 9; }
          ateToday++;
        }
      }
      if (hasFarm) {
        // orders first (they pay 1.4x and count towards the cap)
        for (const od of orders) { if (od.done) continue; if ((inv[cropBy[od.crop].item] || 0) >= od.n) { const base2 = cropBy[od.crop].sell_price * od.n * M.orders.reward_factor; const pay = Math.min(base2, capLeft); if (pay <= 0) continue; inv[cropBy[od.crop].item] -= od.n; clovers.v += pay; capLeft -= pay; od.done = true; stats.orderSales += pay; dayFarm += pay; } }
        // sell the surplus (keep 4 of everything for feeding and orders; the exploiter keeps nothing)
        const keep = prof.optimizer ? 0 : 4;
        const sellable = Object.keys(inv).filter((id) => cropBy[id] && inv[id] > keep).sort((a, b) => priceOf(b, day) - priceOf(a, day));
        for (const id of sellable) {
          while (inv[id] > keep && capLeft > 0) {
            const D = M.demand; let f = 1;
            if (D) { f = dem[id] ?? 1; } else { const u = (sold[id] || 0) + 1; f = u <= M.full_price_units_per_item ? 1 : (u <= 2 * M.full_price_units_per_item ? 0.5 : 0.25); }
            const price = priceOf(id, day) * f; const pay = Math.min(price, capLeft); // fractional: Core floors the total of a whole sale, never a single unit
            inv[id]--; sold[id] = (sold[id] || 0) + 1; if (D) dem[id] = Math.max(D.floor, f - D.drop_per_unit); clovers.v += pay; capLeft -= pay; dayFarm += pay;
          }
        }
        // replant
        const pc = plantable();
        for (let i = 0; i < plots; i++) {
          if (plotState[i]) continue; if (!pc.length) break;
          // a sensible player does not keep planting when the barn is full (the market only buys ~30 clovers a day); the baseline keeps its published behaviour
          if (d.sane && Object.keys(inv).reduce((a, id) => a + (cropBy[id] ? inv[id] : 0), 0) >= 14) break;
          let c;
          if (prof.smart) c = pc.slice().sort((a, b) => (b.yield * b.sell_price * (b.item in dem ? dem[b.item] : 1) - b.seed_price) / b.grow_minutes - (a.yield * a.sell_price * (a.item in dem ? dem[a.item] : 1) - a.seed_price) / a.grow_minutes)[0];
          else if (prof.optimizer) c = pc.slice().sort((a, b) => (b.yield * b.sell_price - b.seed_price) / b.grow_minutes - (a.yield * a.sell_price - a.seed_price) / a.grow_minutes)[0];
          else c = pc[Math.floor(R() * pc.length)];
          if (clovers.v < c.seed_price) break;
          clovers.v -= c.seed_price; stats.seedCost += c.seed_price; plotState[i] = { crop: c.id, plantedAt: t, watered: R() < prof.water };
        }
      }
    }
    stats.farmSales += dayFarm; stats.capDaysArr.push(dayFarm);
    if (dayFarm >= M.daily_sales_cap_clovers - 1) stats.capDays++;
    // shopping. Two wallets: 30% of the day's income goes to a decor wallet (small items bought as it allows),
    // the rest saves up for the next structural goal (places, rooms, plots, orchard) in a fixed order.
    const dayIncome = Math.max(0, gain + dayFarm - otherSpend);
    const toDecor = dayIncome * (o.decorShare ?? 0.3); clovers.v -= toDecor; decorWallet += toDecor;
    const buy = (s) => {
      owned.add(s.k); totalSpent += s.cost;
      if (s.k === 'farm') { hasFarm = true; plots = d.farm.start_plots; }
      if (s.kind === 'pack') plots += s.plots;
      if (s.kind === 'orchard') orchardSlots++;
      if (s.kind === 'sapling') orchard.push({ crop: s.crop, nextAt: day * 1440 + prof.visits[0] + cropBy[s.crop].grow_minutes, stock: 0 });
      for (const m of ['garden', 'farm', 'park']) if (s.k === m && !milestones[m]) milestones[m] = day + 1;
      if (s.kind === 'pigroom' && s.k.endsWith(':L2') && !milestones.firstRoomL2) milestones.firstRoomL2 = day + 1;
      if (s.k === 'dorm' && !milestones.dorm) milestones.dorm = day + 1;
      if (d.pigrooms && !milestones.allRoomL3 && d.pigsNamed.pigs.every((p) => owned.has('pigroom:' + p.id + ':L3'))) milestones.allRoomL3 = day + 1;
      const frac = totalSpent / contentTotal; for (const q of [0.25, 0.5, 0.75, 1]) if (!milestones[q] && frac >= q - 1e-9) milestones[q] = day + 1;
    };
    for (let guard = 0; guard < 8; guard++) {
      const s = shop.structural.find((x) => !owned.has(x.k) && !((x.kind === 'pack' || x.kind === 'orchard') && !hasFarm) && !(x.kind === 'sapling' && orchardSlots <= orchard.length) && !((x.k === 'farm' || x.k === 'park') && !owned.has('garden')) && !(x.pig && !adopted.has(x.pig)) && !(x.req && !owned.has(x.req)) && !(x.needPigs && adopted.size < x.needPigs));
      if (!s || clovers.v < s.cost + 30) break;
      clovers.v -= s.cost; buy(s);
    }
    for (let guard = 0; guard < 8; guard++) {
      const s = shop.items.find((x) => !owned.has(x.k) && x.cost <= decorWallet && !(x.pig && !adopted.has(x.pig)) && !(x.req && !owned.has(x.req)));
      if (!s) break;
      decorWallet -= s.cost; buy(s);
    }
    // when nothing is left to buy with the decor wallet, the money goes back to the main purse (only in the pig room variants; the baseline keeps its published numbers)
    if (d.pigrooms && decorWallet > 0 && !shop.items.some((x) => !owned.has(x.k) && !(x.pig && !adopted.has(x.pig)) && !(x.req && !owned.has(x.req)))) { clovers.v += decorWallet; decorWallet = 0; }
    if (!milestones.allPlaces && owned.has('garden') && owned.has('farm') && owned.has('park') && owned.has('bedroom') && owned.has('playroom')) milestones.allPlaces = day + 1;
    stats.earnedByDay.push(gain + dayFarm);
  }
  stats.avgFarmSales = stats.farmSales / DAYS; stats.capShare = stats.capDays / DAYS; stats.farmShare = stats.farmSales / (stats.farmSales + stats.baseIncome);
  return { milestones, stats, owned: owned.size, contentTotal, spent: totalSpent };
}

function runVariant(name, other) {
  const d = VARIANTS[name](clone(base));
  const out = {};
  for (const [pn, prof] of Object.entries(PROFILES)) {
    const agg = { m: { 0.25: [], 0.5: [], 1: [], garden: [], farm: [], park: [], allPlaces: [], firstRoomL2: [], allRoomL3: [], dorm: [] }, farmSales: 0, farmShare: 0, capShare: 0, saved: 0, benefit: 0, spent: 0, sold: 0 };
    for (let r = 0; r < RUNS; r++) {
      const res = simulate(d, prof, 1000 + r * 7919 + pn.length, other || {});
      for (const k of Object.keys(agg.m)) agg.m[k].push(res.milestones[k] ?? Infinity);
      agg.farmSales += res.stats.avgFarmSales; agg.farmShare += res.stats.farmShare; agg.capShare += res.stats.capShare; agg.saved += res.stats.foodSaved / DAYS; agg.benefit += (res.stats.farmSales + res.stats.foodSaved) / (res.stats.farmSales + res.stats.foodSaved + res.stats.baseIncome); agg.spent += res.spent / res.contentTotal; agg.total = res.contentTotal;
    }
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); const v = s[Math.floor(s.length / 2)]; return v === Infinity ? '>' + DAYS : v; };
    out[pn] = { garden: med(agg.m.garden), farm: med(agg.m.farm), park: med(agg.m.park), places: med(agg.m.allPlaces), c50: med(agg.m[0.5]), c25: med(agg.m[0.25]), c100: med(agg.m[1]), firstRoomL2: med(agg.m.firstRoomL2), allRoomL3: med(agg.m.allRoomL3), dorm: med(agg.m.dorm), contentTotal: 0, farmSales: agg.farmSales / RUNS, farmShare: agg.farmShare / RUNS, capShare: agg.capShare / RUNS, saved: agg.saved / RUNS, benefit: agg.benefit / RUNS, done: agg.spent / RUNS, contentTotal: agg.total };
  }
  return out;
}

if (require.main === module) {
  const only = args.includes('--variant') ? args[args.indexOf('--variant') + 1] : null;
  const names = only ? [only] : Object.keys(VARIANTS);
  const results = {};
  for (const n of names) {
    results[n] = runVariant(n);
    console.log('\n== ' + n + ' (' + RUNS + ' runs, ' + DAYS + ' days)');
    const extra = /^(pigrooms|full)/.test(n);
    console.log('profile  garden farm park allPlaces 50%  100%   sales/day saved/day  benefit%   cap days  content bought');
    for (const [pn, r] of Object.entries(results[n])) console.log(pn.padEnd(8), String(r.garden).padStart(6), String(r.farm).padStart(4), String(r.park).padStart(4), String(r.places).padStart(9), String(r.c50).padStart(4), String(r.c100).padStart(5), r.farmSales.toFixed(1).padStart(9), r.saved.toFixed(1).padStart(9), (r.benefit * 100).toFixed(0).padStart(8) + '%', (r.capShare * 100).toFixed(0).padStart(8) + '%', (r.done * 100).toFixed(0).padStart(12) + '%' + (extra ? '   25%:' + r.c25 + ' firstRoomL2:' + r.firstRoomL2 + ' allRoomL3:' + r.allRoomL3 + ' dorm:' + r.dorm + ' total:' + r.contentTotal : ''));
  }
  if (args.includes('--sweep')) {
    console.log('\n== sweep: how much of the income goes to other shops (existing items) and how much to decor');
    for (const [label, other] of [['other 10%', { otherShare: 0.1 }], ['other 35%', { otherShare: 0.35 }], ['decor 15%', { decorShare: 0.15 }], ['decor 50%', { decorShare: 0.5 }]]) {
      const r = runVariant('baseline', other);
      console.log(label.padEnd(10), ['casual', 'regular', 'heavy'].map((p) => p + ': garden ' + r[p].garden + ', park ' + r[p].park + ', 50% ' + r[p].c50).join(' | '));
    }
  }
  if (args.includes('--check') && only && /^(pigrooms|full)/.test(only)) {
    // Home extras (pig rooms, shared bedroom, colours, run). Two player models: the stress model (default planting, players over-plant and starve their budget)
    // and the 'sane' model. Pacing is judged on 'sane', "not stuck" on the stress model. Numbers: docs/PIG_ROOMS.md section 10.
    const kind = only.startsWith('full') ? 'full' : 'pigrooms';
    const sane = runVariant(kind + ' sane'), stress = runVariant(kind), b0 = runVariant('baseline');
    const probs = [], chk = (c, m) => { if (!c) probs.push(m); };
    const num = (v) => (typeof v === 'number' ? v : Infinity);
    for (const p of ['casual', 'regular']) chk(String(sane[p].c100).startsWith('>'), p + ': buys all content within a year (sane model)');
    chk(num(sane.heavy.c100) >= 300, 'heavy buys all content before day 300 (sane model)');
    chk(num(sane.regular.c50) >= 180 && num(sane.regular.c50) <= 330, 'regular reaches half of the content outside days 180-330 (sane): ' + sane.regular.c50);
    chk(num(sane.casual.c50) >= 300, 'casual reaches half of the content before day 300 (sane)');
    chk(num(sane.heavy.c50) >= 100, 'heavy reaches half of the content before day 100 (sane)');
    chk(num(sane.regular.firstRoomL2) <= 100, 'regular buys the first pig room level 2 after day 100 (sane): ' + sane.regular.firstRoomL2);
    chk(num(sane.regular.park) >= 40 && num(sane.regular.park) <= 130, 'regular buys the park outside days 40-130 (sane): ' + sane.regular.park);
    if (kind === 'full') {
      chk(num(sane.regular.dorm) <= 200 && num(sane.casual.dorm) <= 300, 'the shared bedroom comes too late (regular <= 200, casual <= 300, sane)');
      chk(num(sane.regular.dorm) >= 105, 'the shared bedroom is bought before three pigs exist');
    }
    for (const p of ['casual', 'regular', 'heavy']) chk(String(stress[p].c100).startsWith('>'), p + ': buys all content within a year (stress model)');
    chk(num(stress.regular.garden) >= 5 && num(stress.regular.garden) <= 12, 'regular garden outside days 5-12 (stress)');
    chk(num(stress.regular.farm) >= 10 && num(stress.regular.farm) <= 30, 'regular farm outside days 10-30 (stress)');
    chk(num(stress.regular.firstRoomL2) <= 120, 'regular first pig room level 2 after day 120 (stress): ' + stress.regular.firstRoomL2);
    const extraSink = stress.regular.contentTotal - b0.regular.contentTotal;
    chk(extraSink >= 15000 && extraSink <= 30000, 'new sinks ' + Math.round(extraSink) + ' outside 15000-30000');
    console.log('new sinks vs baseline: ' + Math.round(extraSink) + ' clovers (total content ' + Math.round(stress.regular.contentTotal) + ')');
    console.log(probs.length ? '\nCHECK FAILED:\n' + probs.join('\n') : '\nCHECK OK');
    process.exit(probs.length ? 1 : 0);
  }
  if (args.includes('--check')) {
    const b = results.baseline || runVariant('baseline');
    const probs = [];
    const chk = (c, m) => { if (!c) probs.push(m); };
    const cap = base.market.daily_sales_cap_clovers;
    for (const p of ['exploit', 'smart']) chk(b[p].farmSales <= cap + 0.01, p + ': farm sales above the cap');
    chk(b.smart.benefit <= 0.25, 'smart player: farm benefit above 25% of all income');
    chk(b.regular.c50 >= 150, 'regular reaches half of the content before day 150');
    chk(b.casual.c50 >= 200, 'casual reaches half of the content before day 200');
    chk(b.heavy.c50 >= 90, 'heavy reaches half of the content before day 90');
    for (const p of ['casual', 'regular', 'heavy']) chk(String(b[p].c100).startsWith('>'), p + ' buys all content within a year');
    chk(b.regular.benefit <= 0.30 && b.casual.benefit <= 0.35 && b.heavy.benefit <= 0.20, 'farm benefit share too high (regular <= 30%, casual <= 35%, heavy <= 20%)');
    chk(b.regular.garden >= 5 && b.regular.garden <= 12, 'regular buys the garden outside days 5-12');
    chk(b.regular.farm >= 10 && b.regular.farm <= 30, 'regular buys the farm outside days 10-30');
    chk(b.regular.park >= 60, 'regular buys the park before day 60');
    console.log(probs.length ? '\nCHECK FAILED:\n' + probs.join('\n') : '\nCHECK OK');
    process.exit(probs.length ? 1 : 0);
  }
}
module.exports = { simulate, runVariant, VARIANTS };
