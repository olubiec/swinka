'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DrawBudget = require(path.resolve(__dirname, '../../web/home/lib/draw-budget.js'));
const WorldSounds = require(path.resolve(__dirname, '../../web/home/lib/world-sounds.js'));
const LIMITS_PATH = path.resolve(__dirname, '../../assets/data/draw_limits.json');
const DISK_LIMITS = JSON.parse(fs.readFileSync(LIMITS_PATH, 'utf8'));

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS ' + name);
  } catch (err) {
    failed += 1;
    console.error('FAIL ' + name + ': ' + (err && err.stack ? err.stack : err));
  }
}

function makeStubSound(opts) {
  // STUB Sound: simulates web/home/sound.js Sound.isMuted + Sound.play(name)
  const calls = [];
  return {
    isMuted: Boolean(opts && opts.isMuted),
    calls: calls,
    play(cue) {
      if (this.isMuted) return false;
      calls.push(cue);
      return true;
    }
  };
}

const VIEWPORT = { x: 0, y: 0, width: 256, height: 144 };
const FOCUS = { x: 128, y: 72 };

run('D1 under-budget-draws-all', () => {
  DrawBudget.setLimits(DISK_LIMITS);
  const items = [];
  for (let i = 0; i < 20; i += 1) {
    items.push({ id: 'item_' + i, layer: 'floor', x: 16 + (i % 8) * 24, y: 48 + Math.floor(i / 8) * 24, w: 16, h: 16 });
  }
  const out = DrawBudget.selectItems(items, VIEWPORT, FOCUS);
  assert.strictEqual(out.length, 20);
  assert.deepStrictEqual(out.map((x) => x.id), items.map((x) => x.id));

  // Offscreen outside cullMarginPx (32) is culled
  const offscreen = { id: 'far_off', layer: 'decor', x: -100, y: -100, w: 16, h: 16 };
  assert.strictEqual(DrawBudget.isVisible(offscreen, VIEWPORT), false);
  const nearEdge = { id: 'edge_ok', layer: 'decor', x: -20, y: 40, w: 16, h: 16 };
  assert.strictEqual(DrawBudget.isVisible(nearEdge, VIEWPORT), true);
});

run('D2 over-budget-drops-farthest-decor', () => {
  DrawBudget.setLimits(DISK_LIMITS);
  const items = [];
  // 40 floor items near center + 20 decor items at increasing distance => 60 total > maxItems (48)
  for (let i = 0; i < 40; i += 1) {
    items.push({ id: 'floor_' + i, layer: 'floor', x: 120 + (i % 5), y: 70 + (i % 4), w: 16, h: 16 });
  }
  for (let i = 0; i < 20; i += 1) {
    items.push({ id: 'decor_' + i, layer: 'decor', x: 128 + i * 5, y: 72, w: 16, h: 16 });
  }
  const selected = DrawBudget.selectItems(items, VIEWPORT, FOCUS);
  assert.strictEqual(selected.length, 48);
  const keptDecor = selected.filter((x) => x.layer === 'decor');
  assert.strictEqual(keptDecor.length, 8);
  // Closest 8 decor items (decor_0..decor_7) are kept, farthest dropped
  assert.deepStrictEqual(keptDecor.map((x) => x.id), ['decor_0', 'decor_1', 'decor_2', 'decor_3', 'decor_4', 'decor_5', 'decor_6', 'decor_7']);
});

run('D3 never-drops-pig-or-interactive', () => {
  DrawBudget.setLimits(DISK_LIMITS);
  const items = [];
  items.push({ id: 'pig_main', isPig: true, layer: 'decor', x: 250, y: 140, w: 32, h: 24 });
  items.push({ id: 'hay_rack', interactive: true, layer: 'decor', x: 248, y: 138, w: 16, h: 16 });
  items.push({ id: 'door_fix', layer: 'fixture', x: 246, y: 136, w: 16, h: 16 });
  items.push({ id: 'ghost_preview', isGhost: true, layer: 'decor', x: 244, y: 134, w: 16, h: 16 });

  for (let i = 0; i < 60; i += 1) {
    items.push({ id: 'decor_' + i, layer: 'decor', x: 128, y: 72, w: 16, h: 16 });
  }
  const selected = DrawBudget.selectItems(items, VIEWPORT, FOCUS);
  const ids = new Set(selected.map((x) => x.id));
  assert.strictEqual(ids.has('pig_main'), true);
  assert.strictEqual(ids.has('hay_rack'), true);
  assert.strictEqual(ids.has('door_fix'), true);
  assert.strictEqual(ids.has('ghost_preview'), true);
  assert.strictEqual(selected.length, 48);
});

run('D4 frame-cost-monotonic', () => {
  DrawBudget.setLimits(DISK_LIMITS);
  const low = DrawBudget.frameCost({ items: 10, animated: 4, particles: 4, lights: 1 });
  const mid = DrawBudget.frameCost({ items: 24, animated: 12, particles: 16, lights: 4 });
  const high = DrawBudget.frameCost({ items: 48, animated: 24, particles: 32, lights: 8 });
  const over = DrawBudget.frameCost({ items: 60, animated: 24, particles: 32, lights: 8 });

  assert.strictEqual(low.score < mid.score, true);
  assert.strictEqual(mid.score < high.score, true);
  assert.strictEqual(high.score, 100);
  assert.strictEqual(high.overBudget, false);
  assert.strictEqual(over.score > 100, true);
  assert.strictEqual(over.overBudget, true);

  // Hidden tab fps throttling check (30 fps = 33.33ms)
  const hBlocked = DrawBudget.shouldDrawFrame(1010, 1000, true);
  assert.strictEqual(hBlocked.draw, false);
  assert.strictEqual(Math.round(hBlocked.minIntervalMs * 100) / 100, 33.33);
  const hAllowed = DrawBudget.shouldDrawFrame(1034, 1000, true);
  assert.strictEqual(hAllowed.draw, true);
  assert.strictEqual(DrawBudget.shouldDrawFrame(1005, 1000, false).draw, true);
});

run('D5 limits-from-data', () => {
  const custom = Object.assign({}, DISK_LIMITS, { maxItems: 5, maxAnimated: 3, maxParticles: 4, maxLights: 2 });
  DrawBudget.setLimits(custom);
  assert.strictEqual(DrawBudget.getLimits().maxItems, 5);

  const items = [];
  for (let i = 0; i < 10; i += 1) {
    items.push({ id: 'd_' + i, layer: 'decor', x: 100 + i, y: 70, w: 16, h: 16, animated: true });
  }
  assert.strictEqual(DrawBudget.selectItems(items, VIEWPORT, FOCUS).length, 5);
  assert.strictEqual(DrawBudget.capAnimated(items, FOCUS).size, 3);
  assert.strictEqual(DrawBudget.capLights(items.map((x, idx) => ({ id: idx, x: 100 + idx, y: 70, on: true })), FOCUS).length, 2);

  // Restore disk limits
  DrawBudget.setLimits(DISK_LIMITS);
  assert.strictEqual(DrawBudget.selectItems(items, VIEWPORT, FOCUS).length, 10);
});

run('D6 particles-capped', () => {
  DrawBudget.setLimits(DISK_LIMITS);
  const particles = [];
  for (let i = 0; i < 60; i += 1) {
    particles.push({ id: i });
  }
  const capped = DrawBudget.capParticles(particles);
  assert.strictEqual(capped.length, 32);
  // Keeps most recent 32 (slice(-32))
  assert.strictEqual(capped[0].id, 28);
  assert.strictEqual(capped[31].id, 59);
});

run('W1 every-event-has-sound-or-silent', () => {
  WorldSounds.resetThrottle();
  WorldSounds.setSuppressed(false);
  const stub = makeStubSound({ isMuted: false });
  const events = Object.keys(WorldSounds.EVENT_MAP);
  assert.strictEqual(events.length >= 17, true);

  events.forEach((ev, idx) => {
    const entry = WorldSounds.EVENT_MAP[ev];
    assert.strictEqual(typeof entry.cue, 'string');
    assert.strictEqual(entry.cue.length > 0, true);
    if (entry.file !== null) {
      const wavPath = path.resolve(__dirname, '../../', entry.file);
      assert.strictEqual(fs.existsSync(wavPath), true, 'Missing audio file: ' + entry.file);
    }
    const res = WorldSounds.play(ev, { nowMs: 10000 + idx * 2000, sound: stub });
    assert.strictEqual(res.played, true);
    assert.strictEqual(res.cue, entry.cue);
  });
  assert.strictEqual(stub.calls.length, events.length);
});

run('W2 muted-plays-nothing', () => {
  WorldSounds.resetThrottle();
  const mutedStub = makeStubSound({ isMuted: true });
  const r1 = WorldSounds.play('room_place', { nowMs: 1000, sound: mutedStub });
  assert.strictEqual(r1.played, false);
  assert.strictEqual(mutedStub.calls.length, 0);

  const liveStub = makeStubSound({ isMuted: false });
  const r2 = WorldSounds.play('room_place', { nowMs: 2000, sound: liveStub, settings: { soundSuppressed: true, volume: 0.7 } });
  assert.strictEqual(r2.played, false);

  const r3 = WorldSounds.play('room_place', { nowMs: 3000, sound: liveStub, settings: { soundSuppressed: false, volume: 0 } });
  assert.strictEqual(r3.played, false);

  WorldSounds.setSuppressed(true);
  const r4 = WorldSounds.play('room_place', { nowMs: 4000, sound: liveStub, settings: { soundSuppressed: false, volume: 0.8 } });
  assert.strictEqual(r4.played, false);
  WorldSounds.setSuppressed(false);
  assert.strictEqual(liveStub.calls.length, 0);
});

run('W3 repeat-throttled', () => {
  WorldSounds.resetThrottle();
  WorldSounds.setSuppressed(false);
  const stub = makeStubSound({ isMuted: false });

  // edit_error has minIntervalMs: 120
  assert.strictEqual(WorldSounds.play('edit_error', { nowMs: 1000, sound: stub }).played, true);
  assert.strictEqual(WorldSounds.play('edit_error', { nowMs: 1050, sound: stub }).played, false);
  assert.strictEqual(WorldSounds.play('edit_error', { nowMs: 1119, sound: stub }).played, false);
  assert.strictEqual(WorldSounds.play('edit_error', { nowMs: 1120, sound: stub }).played, true);

  // walk_grass has minIntervalMs: 320
  assert.strictEqual(WorldSounds.play('walk_grass', { nowMs: 2000, sound: stub }).played, true);
  assert.strictEqual(WorldSounds.canPlay('walk_grass', 2200, { sound: stub }), false);
  assert.strictEqual(WorldSounds.play('walk_grass', { nowMs: 2320, sound: stub }).played, true);
  assert.strictEqual(stub.calls.length, 4);
});

run('W4 unknown-event-ignored', () => {
  WorldSounds.resetThrottle();
  const stub = makeStubSound({ isMuted: false });
  const res = WorldSounds.play('nonexistent_event_xyz', { nowMs: 5000, sound: stub });
  assert.strictEqual(res.played, false);
  assert.strictEqual(res.reason, 'unknown_event');
  assert.strictEqual(WorldSounds.canPlay('nonexistent_event_xyz', 5000, { sound: stub }), false);
  assert.strictEqual(stub.calls.length, 0);
});

run('W5 bad-input', () => {
  DrawBudget.setLimits(null);
  assert.strictEqual(DrawBudget.getLimits().maxItems, 48);
  assert.strictEqual(DrawBudget.isVisible(null, VIEWPORT), false);
  assert.strictEqual(DrawBudget.isVisible({ x: 10, y: 10 }, null), false);
  assert.deepStrictEqual(DrawBudget.selectItems(null, VIEWPORT), []);
  assert.deepStrictEqual(DrawBudget.capParticles(null), []);
  assert.deepStrictEqual(DrawBudget.capLights(null), []);
  assert.strictEqual(DrawBudget.capAnimated(null).size, 0);
  const fc = DrawBudget.frameCost(null);
  assert.strictEqual(fc.score, 0);
  assert.strictEqual(fc.overBudget, false);

  const badPlay1 = WorldSounds.play(null);
  const badPlay2 = WorldSounds.play(123);
  const badPlay3 = WorldSounds.play('');
  assert.strictEqual(badPlay1.played, false);
  assert.strictEqual(badPlay2.played, false);
  assert.strictEqual(badPlay3.played, false);
  assert.strictEqual(WorldSounds.canPlay(null), false);
});

console.log('STUB Sound used for W1-W5');
console.log('Summary: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
