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
const dm = market.demand;
need(dm && dm.drop_per_unit > 0 && dm.drop_per_unit <= 0.2 && dm.recover_per_day > 0 && dm.recover_per_day <= 0.5 && dm.floor > 0 && dm.floor < 1, 'demand parameters invalid');
need(dm && dm.recover_per_day / dm.drop_per_unit >= 0.5 && dm.recover_per_day / dm.drop_per_unit <= 4, 'sustainable units per crop per day (recover/drop) out of 0.5..4');
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

// ---- pig rooms ----
const pigRooms = read('assets/data/pig_rooms.json');
const decorIds = new Set(read('assets/data/items_decor.json').items.map(d => d.id));
need(pigRooms.template.levels[0].cost === 0, 'pig room level 1 must be free');
for (const lv of [pigRooms.template.levels, pigRooms.dorm.levels]) for (let i = 1; i < lv.length; i++) need(lv[i].cols >= lv[i - 1].cols && lv[i].rows >= lv[i - 1].rows && lv[i].cost > 0, 'room levels must grow');
need(pigRooms.comfort.own >= pigRooms.comfort.common && pigRooms.comfort.common >= pigRooms.comfort.others && pigRooms.comfort.others >= 0 && pigRooms.comfort.own <= 1, 'comfort weights must be 1 >= own >= common >= others >= 0');
for (const t of [...Object.values(pigRooms.themes), ...pigRooms.default_themes]) {
  need(decorIds.has(t.wallpaper) && decorIds.has(t.floor), 'theme skin not in items_decor.json: ' + t.wallpaper + '/' + t.floor);
  for (const s of t.starter) need(wids.has(s) && world.items.find(w => w.id === s).place.includes('house'), 'theme starter not a house item: ' + s);
  need(t.starter.length === 3, 'a theme has 3 starter items');
}
for (const [pid, t] of Object.entries(pigRooms.themes)) {
  need(np.pigs.some(p => p.id === pid), 'theme for unknown pig ' + pid);
  const sg = world.items.find(w => w.id === t.signature);
  need(sg && sg.free && sg.price === 0 && sg.signature_of === pid, pid + ': signature item must exist, be free and point back at the pig');
}
need(np.pigs.every(p => pigRooms.themes[p.id]), 'every named pig needs a theme');
need(pigRooms.dorm.requires_pigs >= 2 && pigRooms.dorm.max_residents <= 6, 'dorm limits');

// ---- home economy ----
const he = read('assets/data/home_economy.json');
need(he.resale.allowed === false, 'decorations must not be resellable');
need(he.variants.unlock_percent > 0 && he.variants.unlock_percent <= 50, 'variant percent out of 1..50');
for (const b of he.run.blockers) need(wids.has(b), 'run blocker is not a placeable: ' + b);
need(wids.has(he.run.gate_item) && he.run.blockers.includes(he.run.gate_item), 'run gate must be a placeable and a blocker');
need(he.run.min_cells >= he.run.cells_per_pig * 2, 'run must hold at least two pigs');
need(he.run.mood_per_hour * he.run.max_hours_per_day >= he.run.mood_cap_per_day, 'run mood cap unreachable');
need(he.run.mood_cap_per_day <= 10, 'run mood cap too generous');
need(he.props.max_on_desktop >= 1 && he.props.max_on_desktop <= 12, 'desktop props limit');
const invIds = new Set();
for (const f of ['items.json', 'items_shop.json']) { const d = read('assets/data/' + f); for (const i of (d.items || d)) invIds.add(i.id); }
for (const w of world.items) if (w.prop_of) need(invIds.has(w.prop_of) && w.price === 0 && w.free, w.id + ': prop_of must name an inventory item and be free');

need(world.items.filter(w => w.recolor).length >= 8, 'at least 8 recolourable items');
for (const w of world.items) if (w.recolor) need(w.price > 0 || w.free, w.id + ': recolour on an item with no price info');

// ---- theme tiles and prop art (tiles.json keeps tiles under "tiles") ----
const tiles = read('assets/world/tiles.json');
for (const t of [...Object.values(pigRooms.themes), ...pigRooms.default_themes]) {
  for (const key of ['wall_tile', 'floor_tile']) {
    const tile = t[key] && tiles.tiles[t[key]];
    if (tile) need(fs.existsSync(path.join(root, 'assets/world', tile.file)), 'theme tile has no file: ' + t[key] + ' (' + tile.file + ')');
  }
}
// Props without an atlas entry are a warning (art still to come), not an error.
const atlas = read('assets/world/atlas.json');
const missingArt = world.items.filter(w => w.prop_of && !(atlas.items && atlas.items[w.id])).map(w => w.id);
if (missingArt.length) console.warn('warning missing_art (prop_of without atlas entry): ' + JSON.stringify(missingArt));
console.log('placeable price sum: ' + sink);

if (problems.length) { console.error(problems.filter(Boolean).join('\n')); console.error(problems.filter(Boolean).length + ' problems'); process.exit(1); }
console.log('data-check: ok (' + np.pigs.length + ' pigs, ' + farm.crops.length + ' crops, ' + world.items.length + ' placeables, ' + Object.keys(pigRooms.themes).length + ' pig room themes)');
