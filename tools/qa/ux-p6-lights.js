'use strict';
// Tests PK-P6c: toggle:false guard, outdoor night auto-on, campfire/torch data, PNG IHDR frame checks.
// Pure Node.js, no dependencies, deterministic.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const Lights = require(path.join(ROOT, 'web', 'home', 'lib', 'lights.js'));

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function readPngSize(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = '89504e470d0a1a0a';
  assert.strictEqual(buf.subarray(0, 8).toString('hex'), sig, `invalid PNG signature: ${filePath}`);
  assert.strictEqual(buf.subarray(12, 16).toString('ascii'), 'IHDR', `missing IHDR: ${filePath}`);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20)
  };
}

function paletteColours(palette) {
  const out = [];
  const collect = (v) => {
    if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) out.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect(palette.ramps);
  collect(palette.outline);
  return out;
}

const lights = readJson('assets/data/lights.json');
const stylePalette = readJson('assets/data/style_palette.json');
const palette = paletteColours(stylePalette);

// L1: window-ignores-manual (toggle:false)
assert.strictEqual(typeof Lights.autoOn, 'function', 'Lights.autoOn must be exported');
assert.strictEqual(lights.sources.window.toggle, false, 'window must have toggle:false');
for (const period of Lights.PERIODS) {
  const expected = Lights.autoOn(lights.sources.window, period);
  for (const manualVal of [true, false]) {
    const res = Lights.activeSources(
      lights,
      'indoor',
      [{ id: 'window', uid: 'win_1', itemId: 'window_sun', x: 2, y: 1, on: manualVal }],
      period,
      { win_1: manualVal, window: manualVal, window_sun: manualVal }
    );
    assert.strictEqual(res.length, 1, `window returned in ${period}`);
    assert.strictEqual(res[0].toggle, false, 'window activeSource.toggle is false');
    assert.strictEqual(
      res[0].on,
      expected,
      `L1: window ignores manual=${manualVal} in ${period}`
    );
  }
}

// L2: outdoor-auto-dusk
const outdoorIds = ['torch', 'lantern_garden', 'lamp_oil', 'brazier', 'campfire', 'campfire_small'];
const pNoon = Lights.periodOf(12);
const p20 = Lights.periodOf(20);
const p23 = Lights.periodOf(23);
assert.strictEqual(pNoon, 'day');
assert.strictEqual(p20, 'evening');
assert.strictEqual(p23, 'night');

for (const id of outdoorIds) {
  const dayRes = Lights.activeSources(lights, 'outdoor', [{ id, x: 4, y: 4 }], pNoon, {});
  const eveRes = Lights.activeSources(lights, 'outdoor', [{ id, x: 4, y: 4 }], p20, {});
  const nightRes = Lights.activeSources(lights, 'outdoor', [{ id, x: 4, y: 4 }], p23, {});
  assert.strictEqual(dayRes.length, 1, `L2: ${id} present in outdoor at 12:00`);
  assert.strictEqual(dayRes[0].on, false, `L2: ${id} off at 12:00`);
  assert.strictEqual(eveRes[0].on, true, `L2: ${id} on at 20:00`);
  assert.strictEqual(nightRes[0].on, true, `L2: ${id} on at 23:00`);
}

// L3: indoor-manual-unchanged
for (const indoorId of ['lamp_floor', 'lamp_arc']) {
  const onAtNoon = Lights.activeSources(lights, 'indoor', [{ id: indoorId, x: 1, y: 1 }], pNoon, { [indoorId]: true });
  const offAtEve = Lights.activeSources(lights, 'indoor', [{ id: indoorId, x: 1, y: 1 }], p20, { [indoorId]: false });
  const offAtNight = Lights.activeSources(lights, 'indoor', [{ id: indoorId, x: 1, y: 1 }], p23, { [indoorId]: false });
  assert.strictEqual(onAtNoon[0].on, true, `L3: ${indoorId} manual on at noon`);
  assert.strictEqual(offAtEve[0].on, false, `L3: ${indoorId} manual off at 20:00`);
  assert.strictEqual(offAtNight[0].on, false, `L3: ${indoorId} manual off at 23:00`);
}

// L4: data-valid
for (const [key, src] of Object.entries(lights.sources)) {
  const frames = src.frames == null ? 1 : src.frames;
  assert.ok(Number.isFinite(frames) && frames >= 1, `L4: ${key}.frames >= 1`);
  if (frames > 1) {
    assert.ok(Number.isFinite(src.fps) && src.fps > 0, `L4: ${key}.fps > 0 when frames > 1`);
  }
  assert.ok(Number.isFinite(src.radius_cells) && src.radius_cells > 0, `L4: ${key}.radius_cells > 0`);
  if (src.color !== 'ambient') {
    assert.ok(Array.isArray(src.color) && src.color.length === 3, `L4: ${key}.color is [r,g,b]`);
    const rgb255 = src.color.map((c) => {
      assert.ok(Number.isFinite(c) && c >= 0 && c <= 1, `L4: ${key}.color channel in [0,1]`);
      return Math.round(c * 255);
    });
    const nearest = Lights.nearest(rgb255, palette);
    assert.ok(palette.includes(nearest), `L4: ${key}.color maps to style_palette.json`);
  }
  if (src.on_file) {
    const onPath = path.join(ROOT, 'assets', 'world', src.on_file);
    if (fs.existsSync(onPath)) {
      const { width, height } = readPngSize(onPath);
      assert.ok(width > 0 && height > 0, `L4: ${key} on_file non-empty`);
      assert.strictEqual(width % frames, 0, `L4: ${key} width ${width} divisible by frames ${frames}`);
    }
  }
}

// L5: campfire-complete
const cf = lights.sources.campfire;
const cfs = lights.sources.campfire_small;
assert.ok(cf, 'L5: campfire entry exists');
assert.strictEqual(cf.base_file, 'garden/campfire_base.png', 'L5: campfire base_file');
assert.strictEqual(cf.on_file, 'garden/campfire_flame.png', 'L5: campfire on_file');
assert.strictEqual(cf.frames, 6, 'L5: campfire frames');
assert.strictEqual(cf.fps, 8, 'L5: campfire fps');
assert.deepStrictEqual(cf.flame_anchor, [16, 17], 'L5: campfire flame_anchor');
assert.ok(cfs, 'L5: campfire_small entry exists');
assert.strictEqual(cfs.base_file, 'garden/campfire_base.png', 'L5: campfire_small base_file');
assert.strictEqual(cfs.on_file, 'garden/campfire_flame_small.png', 'L5: campfire_small on_file');
assert.strictEqual(cfs.frames, 4, 'L5: campfire_small frames');
assert.strictEqual(cfs.fps, 6, 'L5: campfire_small fps');
assert.deepStrictEqual(cfs.flame_anchor, [16, 17], 'L5: campfire_small flame_anchor');

// L6: deterministic
const samplePlaced = Object.keys(lights.sources).map((id, i) => ({ id, x: i, y: i + 1 }));
const runA = Lights.activeSources(lights, 'outdoor', samplePlaced, p20, { torch: false });
const runB = Lights.activeSources(lights, 'outdoor', samplePlaced, p20, { torch: false });
assert.deepStrictEqual(runA, runB, 'L6: activeSources deterministic');
assert.strictEqual(Lights.periodOf(20), Lights.periodOf(20), 'L6: periodOf deterministic');

// L7: no-nan across all hours 0..23 and all sources
for (let h = 0; h < 24; h++) {
  const p = Lights.periodOf(h);
  assert.ok(typeof p === 'string' && Lights.PERIODS.includes(p), `L7: hour ${h} valid period`);
  const amb = Lights.ambientFor(lights, p);
  assert.ok(Number.isFinite(amb.level), `L7: ambient.level finite at ${h}`);
  amb.color.forEach((c) => assert.ok(Number.isFinite(c), `L7: ambient.color finite at ${h}`));
  for (const place of Lights.PLACE_KINDS) {
    const out = Lights.activeSources(lights, place, samplePlaced, p, {});
    for (const s of out) {
      assert.strictEqual(typeof s.on, 'boolean', `L7: ${s.id}.on boolean`);
      assert.strictEqual(typeof s.toggle, 'boolean', `L7: ${s.id}.toggle boolean`);
      assert.ok(Number.isFinite(s.radius) && s.radius > 0, `L7: ${s.id}.radius finite`);
      assert.ok(Number.isFinite(s.radiusCells) && s.radiusCells > 0, `L7: ${s.id}.radiusCells finite`);
      assert.ok(Number.isFinite(s.strength), `L7: ${s.id}.strength finite`);
      assert.ok(Number.isFinite(s.flicker), `L7: ${s.id}.flicker finite`);
      if (s.frames !== undefined) assert.ok(Number.isFinite(s.frames), `L7: ${s.id}.frames finite`);
      if (s.fps !== undefined) assert.ok(Number.isFinite(s.fps), `L7: ${s.id}.fps finite`);
    }
  }
}

console.log('UX-P6-LIGHTS OK (L1-L7)');
