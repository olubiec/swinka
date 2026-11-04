'use strict';
// Tests web/home/lib/lights.js against the real assets/data/lights.json and style_palette.json.
// Pure Node.js, no dependencies, no network, deterministic (fixed hours, no clock reads).
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const Lights = require(path.join(ROOT, 'web', 'home', 'lib', 'lights.js'));

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

const lights = readJson('assets/data/lights.json');
const stylePalette = readJson('assets/data/style_palette.json');

// Palette colours: every #rrggbb in the ramps and the outline.
function paletteColours(palette) {
  const out = [];
  const collect = (value) => {
    if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) out.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(palette.ramps);
  collect(palette.outline);
  return out;
}
const palette = paletteColours(stylePalette);

const NOON = 12;
const EVENING = 19;
const MORNING = 8;
const NIGHT = 23;

function on(placed, place, period, toggles) {
  const entries = Lights.activeSources(lights, place, [placed], period, toggles || {});
  return entries.length === 1 && entries[0].on;
}

// periodOf: every hour maps to one of the four periods, with the planned boundaries.
const periodsSeen = new Set();
for (let hour = 0; hour < 24; hour++) {
  const period = Lights.periodOf(hour);
  assert.ok(Lights.PERIODS.includes(period), `hour ${hour} gave ${period}`);
  periodsSeen.add(period);
}
assert.strictEqual(periodsSeen.size, 4, 'all four periods must occur');
assert.strictEqual(Lights.periodOf(MORNING), 'morning');
assert.strictEqual(Lights.periodOf(NOON), 'day');
assert.strictEqual(Lights.periodOf(EVENING), 'evening');
assert.strictEqual(Lights.periodOf(NIGHT), 'night');
assert.strictEqual(Lights.periodOf(new Date(2026, 0, 15, 12, 0, 0)), 'day', 'Date input uses local hour');

// ambientFor: every period resolves to the data; unknown period falls back to day.
for (const period of Lights.PERIODS) {
  const ambient = Lights.ambientFor(lights, period);
  assert.deepStrictEqual(ambient.color, lights.ambient[period].color, `${period} colour`);
  assert.strictEqual(ambient.level, lights.ambient[period].level, `${period} level`);
}
assert.strictEqual(Lights.ambientFor(lights, 'midnight-party').level, lights.ambient.day.level);

// activeSources: a lamp is off at noon and on in the evening.
assert.strictEqual(on({ id: 'lamp_floor' }, 'indoor', 'day'), false, 'lamp off at noon');
assert.strictEqual(on({ id: 'lamp_floor' }, 'indoor', 'evening'), true, 'lamp on in the evening');
assert.strictEqual(on({ id: 'lamp_floor' }, 'indoor', 'night'), true, 'lamp on at night');
assert.strictEqual(on({ id: 'lamp_floor' }, 'indoor', 'day', { lamp_floor: true }), true, 'manual toggle on at noon');
assert.strictEqual(on({ id: 'lamp_floor' }, 'indoor', 'evening', { lamp_floor: false }), false, 'manual toggle off in the evening');

// lamp_street follows auto_at = evening (outdoor).
assert.strictEqual(lights.sources.lamp_street.auto_at, 'evening', 'data check: lamp_street auto_at');
assert.strictEqual(on({ id: 'lamp_street' }, 'outdoor', 'morning'), false, 'street lamp off in the morning');
assert.strictEqual(on({ id: 'lamp_street' }, 'outdoor', 'day'), false, 'street lamp off at noon');
assert.strictEqual(on({ id: 'lamp_street' }, 'outdoor', 'evening'), true, 'street lamp on from evening');
assert.strictEqual(on({ id: 'lamp_street' }, 'outdoor', 'night'), true, 'street lamp on at night');

// place filtering: a fireplace is indoor only, so it is not returned for the garden.
assert.strictEqual(lights.sources.fireplace.place, 'indoor', 'data check: fireplace place');
assert.strictEqual(
  Lights.activeSources(lights, 'outdoor', [{ id: 'fireplace', x: 1, y: 1 }], 'evening', {}).length,
  0,
  'fireplace not returned for the garden'
);
assert.strictEqual(
  Lights.activeSources(lights, 'indoor', [{ id: 'fireplace', x: 1, y: 1 }], 'evening', {}).length,
  1,
  'fireplace returned for a room'
);
// place 'both' always matches.
assert.strictEqual(lights.sources.candle.place, 'both', 'data check: candle place');
assert.strictEqual(Lights.activeSources(lights, 'outdoor', [{ id: 'candle', x: 0, y: 0 }], 'day', {}).length, 1);
assert.strictEqual(Lights.activeSources(lights, 'indoor', [{ id: 'candle', x: 0, y: 0 }], 'day', {}).length, 1);
// Unknown ids are skipped and each placed item gives one entry with its position and data.
const mixed = Lights.activeSources(
  lights,
  'indoor',
  [{ id: 'no_such_item', x: 0, y: 0 }, { id: 'lamp_arc', x: 3, y: 4 }],
  'evening',
  {}
);
assert.strictEqual(mixed.length, 1);
assert.strictEqual(mixed[0].x, 3);
assert.strictEqual(mixed[0].y, 4);
assert.strictEqual(mixed[0].radiusCells, lights.sources.lamp_arc.radius_cells);
assert.strictEqual(mixed[0].on_file, lights.sources.lamp_arc.on_file);

// tint: multiplies and clamps to 0-255.
const warm = Lights.ambientFor(lights, 'evening');
const tinted = Lights.tint([200, 100, 50], warm);
tinted.forEach((v) => assert.ok(v >= 0 && v <= 255, `tint channel ${v} in range`));
assert.deepStrictEqual(Lights.tint([255, 255, 255], { color: [2, 2, 2], level: 1 }), [255, 255, 255], 'clamp high');
assert.deepStrictEqual(Lights.tint([10, 10, 10], { color: [0, 0, 0], level: 1 }), [0, 0, 0], 'multiply to zero');

// nearest: returns a palette member, and an exact palette colour maps to itself.
assert.ok(palette.length > 0, 'palette has colours');
const pick = Lights.nearest([250, 12, 9], palette);
assert.ok(palette.includes(pick), 'nearest returns a palette member');
const exact = palette[0];
const exactRgb = exact.slice(1).match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16));
assert.strictEqual(Lights.nearest(exactRgb, palette), exact, 'exact palette colour maps to itself');

console.log('LIGHTS OK');
