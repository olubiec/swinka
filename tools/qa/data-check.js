#!/usr/bin/env node
// Data sanity checks for the named pigs and the world (house, garden, park, farm, market).
// Run from the repo root: node tools/qa/data-check.js   (exit code 1 on any problem)
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const problems = [];
const bad = (m) => problems.push(m);
const need = (c, m) => { if (!c) bad(m); };

// ---- items ----
const items = {};
for (const f of ['items.json', 'items_shop.json', 'items_decor.json', 'items_farm.json']) {
  const file = 'assets/data/' + f;
  if (!fs.existsSync(path.join(root, file))) { bad('missing ' + file); continue; }
  for (const it of read(file).items) {
    need(!items[it.id], 'duplicate item id ' + it.id);
    items[it.id] = it;
  }
}

// ---- named pigs ----
const np = read('assets/data/pigs_named.json');
const breeds = read('assets/sprites/breeds.json');
const pal = read('assets/sprites/palettes.json').palettes;
const pigIds = new Set();
const lim = np.modifier_limits;
const def = np.legend_years_default;
need(def && def.min >= 4.5 && def.min < def.max, 'legend_years_default invalid');
for (const p of np.pigs) {
  need(!pigIds.has(p.id), 'duplicate pig ' + p.id);
  pigIds.add(p.id);
  need(breeds.breeds[p.look.breed] !== undefined, p.id + ': shape ' + p.look.breed + ' unknown');
  need(pal[p.look.palette_id] !== undefined, p.id + ': palette ' + p.look.palette_id + ' unknown');
  for (const st of ['baby', 'junior', 'adult', 'senior', 'legend'])
    need(fs.existsSync(path.join(root, 'assets/sprites/pigs', p.id, st, 'spritesheet.png')), p.id + ': missing baked sheet ' + st);
  for (const k of Object.keys(np.modifier_keys)) {
    const v = p.modifiers[k];
    need(typeof v === 'number' && v >= lim.min && v <= lim.max, p.id + ': modifier ' + k + ' out of range');
  }
  if (p.legend_years) need(p.legend_years.min >= 4.5 && p.legend_years.min < p.legend_years.max, p.id + ': legend_years invalid');
  need(p.offer && p.offer.after_days >= 0 && p.offer.cost >= 0, p.id + ': offer invalid');
  for (const [k, n] of Object.entries(np.welcome.items)) need(items[k] && n > 0, 'welcome item ' + k);
}
for (const g of np.offer_groups) for (const id of g.pigs) need(pigIds.has(id), 'offer group ' + g.id + ' names unknown pig ' + id);
const kuki = np.pigs.find(p => p.id === 'kuki'), ned = np.pigs.find(p => p.id === 'ned');
need(kuki && ned && kuki.legend_years.min < ned.legend_years.min && kuki.legend_years.max < ned.legend_years.max, 'Kuki must reach Legend earlier than Ned (ranges)');

// ---- farm ----
const farm = read('assets/data/farm.json');
const market = read('assets/data/market.json');
const wig = market.price_wiggle_percent / 100;
const cropIds = new Set();
let lastUnlock = -1;
for (const c of farm.crops) {
  need(!cropIds.has(c.id), 'duplicate crop ' + c.id); cropIds.add(c.id);
  const it = items[c.item], seed = items[c.seed_item];
  need(it, c.id + ': item ' + c.item + ' missing');
  need(seed && seed.price === c.seed_price, c.id + ': seed item missing or price differs');
  need(c.grow_minutes >= 30 && c.grow_minutes <= 1440, c.id + ': grow_minutes out of 30..1440');
  need(c.yield >= 1 && c.yield <= 4, c.id + ': yield');
  if (it) need(c.sell_price * (1 + wig) < it.price * (1 - wig), c.id + ': sell price too close to buy price (buy/sell loop)');
  need(farm.forbidden_foods.indexOf(c.item) < 0, c.id + ': forbidden food');
  const profit = c.yield * c.sell_price - (c.kind === 'annual' ? c.seed_price : 0);
  need(profit > 0 && profit <= 20, c.id + ': profit per cycle ' + profit + ' out of 1..20');
  if (c.kind === 'annual') { need(c.unlock_harvests >= lastUnlock, c.id + ': annual unlock order'); lastUnlock = c.unlock_harvests; }
}
for (const k of Object.keys(items)) need(farm.forbidden_foods.indexOf(k) < 0 || items[k].category === 'warning', 'forbidden food in the catalog: ' + k);
for (const [k, n] of Object.entries(farm.starter_seeds)) need(items[k] && n > 0, 'starter seed ' + k);
need(farm.start_plots + farm.plot_packs.reduce((a, p) => a + p.plots, 0) === 24, 'plots must total 24');

// ---- market ----
need(market.daily_sales_cap_clovers > 0 && market.daily_sales_cap_clovers <= 60, 'sales cap out of 1..60');
let prev = 0;
for (const s of market.over_quota_steps) { need(s.until_units > prev && s.factor > 0 && s.factor < 1, 'over_quota_steps'); prev = s.until_units; }
need(market.price_wiggle_percent <= 20, 'wiggle too large');

// ---- places and placeables ----
const places = read('assets/data/places.json');
const world = read('assets/data/world_items.json');
const placeIds = new Set(places.places.map(p => p.id));
const maxCells = {};
for (const p of places.places) {
  const lv = p.levels || (p.rooms ? p.rooms.flatMap(r => r.levels) : []);
  maxCells[p.id] = lv.reduce((m, l) => Math.max(m, l.cols * l.rows), 0);
  for (const r of (p.requires || [])) need(placeIds.has(r), p.id + ': requires unknown ' + r);
}
const wids = new Set();
for (const w of world.items) {
  need(!wids.has(w.id), 'duplicate placeable ' + w.id); wids.add(w.id);
  need(w.price >= 0 && w.w >= 1 && w.h >= 1 && world.layers.includes(w.layer), w.id + ': invalid fields');
  for (const pl of w.place) need(placeIds.has(pl), w.id + ': unknown place ' + pl);
  need(w.w * w.h <= 15, w.id + ': footprint too large');
  need(w.comfort >= 0 && w.comfort <= 10, w.id + ': comfort out of 0..10');
}
need(world.items.some(w => w.id === 'memory_corner' && w.price === 0), 'memory_corner must exist and be free');
let sink = 0;
for (const w of world.items) sink += w.price;
need(sink > 3000, 'placeable catalog too small to be a long-term sink');

if (problems.length) { console.error(problems.filter(Boolean).join('\n')); console.error(problems.filter(Boolean).length + ' problems'); process.exit(1); }
console.log('data-check: ok (' + np.pigs.length + ' pigs, ' + farm.crops.length + ' crops, ' + world.items.length + ' placeables)');
