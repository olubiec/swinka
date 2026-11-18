// Pure Node unit tests for PK-P43ab (CuyHotspots engine: X1..X10).
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const CuyHotspots = require(path.resolve(__dirname, '../../web/home/lib/hotspots.js'));
const sceneHotspotsPath = path.resolve(__dirname, '../../assets/data/scene_hotspots.json');
const staticData = JSON.parse(fs.readFileSync(sceneHotspotsPath, 'utf8'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS ' + name);
  } catch (err) {
    failed += 1;
    console.error('FAIL ' + name + ': ' + (err && err.stack ? err.stack : err));
  }
}

// X1: merge-static-and-instances (instance wins on id collision)
test('X1 merge-static-and-instances', function () {
  const customStatic = {
    version: 1,
    scenes: {
      market: [
        { id: 'stall:seeds', kind: 'stall', rect: [1, 1, 10, 10], label: 'Old seeds' },
        { id: 'sign', kind: 'decor', rect: [200, 100, 220, 120], label: 'Sign' }
      ]
    }
  };
  const instances = [
    { uid: 'fx:market:stall_seeds', itemId: 'stall_big', x: 100, y: 80, anchorX: 16, anchorY: 24, sw: 32, sh: 24, label: 'Seeds' },
    { uid: 'fx:market:lamp_1', itemId: 'lamp_post', x: 50, y: 60, anchorX: 8, anchorY: 16, sw: 16, sh: 16, label: 'Lamp' }
  ];
  const list = CuyHotspots.fromScene('market', customStatic, instances, {});
  const seeds = list.find(function (h) { return h.id === 'stall:seeds'; });
  const sign = list.find(function (h) { return h.id === 'sign'; });
  const lamp = list.find(function (h) { return h.id === 'fx:market:lamp_1'; });

  assert.ok(seeds, 'stall:seeds should exist');
  assert.strictEqual(seeds.kind, 'stall');
  assert.deepStrictEqual(seeds.rect, [84, 56, 116, 80]);
  assert.strictEqual(seeds.uid, 'fx:market:stall_seeds');
  assert.ok(sign, 'non-colliding static hotspot should be kept');
  assert.ok(lamp && lamp.kind === 'lamp', 'lamp instance should be included');
});

// X2: hit-order (higher y1 wins; tie-breaker: smaller area)
test('X2 hit-order', function () {
  const list = [
    { id: 'back', kind: 'decor', rect: [10, 10, 60, 50], label: 'Back' },
    { id: 'front_big', kind: 'decor', rect: [10, 20, 70, 70], label: 'Front big' },
    { id: 'front_small', kind: 'stall', rect: [20, 40, 40, 70], label: 'Front small' }
  ];
  // Point (25, 45) hits all three: front_big & front_small tie at y1=70, smaller area wins
  const hit1 = CuyHotspots.hit(list, 25, 45);
  assert.strictEqual(hit1.id, 'front_small');

  // Point (15, 30) hits back (y1=50) and front_big (y1=70): higher y1 wins
  const hit2 = CuyHotspots.hit(list, 15, 30);
  assert.strictEqual(hit2.id, 'front_big');

  // Point outside all
  assert.strictEqual(CuyHotspots.hit(list, 200, 100), null);
});

// X3: arbitrate
test('X3 arbitrate', function () {
  assert.strictEqual(CuyHotspots.arbitrate({ overPig: false, editMode: false, dragging: false }), 'hotspot');
  assert.strictEqual(CuyHotspots.arbitrate({ overPig: true, editMode: false, dragging: false }), 'pig');
  assert.strictEqual(CuyHotspots.arbitrate({ overPig: true, editMode: false, dragging: true }), 'drag');
  assert.strictEqual(CuyHotspots.arbitrate({ overPig: true, editMode: true, dragging: true }), 'edit');
});

// X4: edit-disables
test('X4 edit-disables', function () {
  assert.strictEqual(CuyHotspots.arbitrate({ overPig: false, editMode: true, dragging: false }), 'edit');
  assert.notStrictEqual(CuyHotspots.arbitrate({ overPig: false, editMode: true, dragging: false }), 'hotspot');
});

// X5: on-kind-fires-once (single click = 1 event, second within 250ms ignored)
test('X5 on-kind-fires-once', function () {
  let now = 1000;
  const tracker = CuyHotspots.createTracker({ cooldownMs: 250, now: function () { return now; } });
  const calls = [];
  const unsub = tracker.on('stall', function (h) { calls.push(h.id); });

  const hs1 = { id: 'stall:seeds', kind: 'stall', rect: [10, 10, 40, 40], label: 'Seeds' };
  const hs2 = { id: 'stall:pantry', kind: 'stall', rect: [50, 10, 80, 40], label: 'Pantry' };

  assert.strictEqual(tracker.trigger(hs1, 1000), true);
  assert.strictEqual(tracker.trigger(hs1, 1100), false);
  assert.strictEqual(tracker.trigger(hs1, 1249), false);
  assert.strictEqual(tracker.trigger(hs2, 1249), true);
  assert.strictEqual(tracker.trigger(hs1, 1250), true);

  assert.deepStrictEqual(calls, ['stall:seeds', 'stall:pantry', 'stall:seeds']);
  unsub();
  assert.strictEqual(tracker.trigger(hs1, 2000), true);
  assert.strictEqual(calls.length, 3);
});

// X6: dynamic-follows-instance
test('X6 dynamic-follows-instance', function () {
  const instBefore = [
    { uid: 'fx:market:stall_pantry', itemId: 'stall_basic', x: 40, y: 60, anchorX: 16, anchorY: 24, sw: 32, sh: 24, label: 'Pantry' }
  ];
  const listBefore = CuyHotspots.fromScene('market', staticData, instBefore, {});
  assert.ok(CuyHotspots.hit(listBefore, 40, 50), 'old point should hit before move');

  const instAfter = [
    { uid: 'fx:market:stall_pantry', itemId: 'stall_basic', x: 160, y: 90, anchorX: 16, anchorY: 24, sw: 32, sh: 24, label: 'Pantry' }
  ];
  const listAfter = CuyHotspots.fromScene('market', staticData, instAfter, {});
  assert.strictEqual(CuyHotspots.hit(listAfter, 40, 50), null, 'old point must not hit after move');
  const moved = CuyHotspots.hit(listAfter, 160, 80);
  assert.ok(moved && moved.id === 'stall:pantry', 'new point should hit after move');
});

// X7: label-clamped-inside-scene
test('X7 label-clamped-inside-scene', function () {
  const edges = [
    [0, 0, 16, 16],
    [240, 0, 256, 16],
    [0, 128, 16, 144],
    [240, 128, 256, 144],
    [-20, -10, 5, 5],
    [250, 140, 280, 160]
  ];
  edges.forEach(function (r) {
    const out = CuyHotspots.clampLabelRect(r, 60, 16, 256, 144);
    assert.ok(out.x >= 0 && out.x + 60 <= 256, 'x out of bounds: ' + JSON.stringify(out));
    assert.ok(out.y >= 0 && out.y + 16 <= 144, 'y out of bounds: ' + JSON.stringify(out));
  });
});

// X8: keyboard-order (y then x; Enter activates)
test('X8 keyboard-order', function () {
  const unsorted = [
    { id: 'c', kind: 'plot', rect: [80, 60, 96, 76], label: 'C' },
    { id: 'b', kind: 'plot', rect: [40, 20, 56, 36], label: 'B' },
    { id: 'a', kind: 'plot', rect: [10, 20, 26, 36], label: 'A' },
    { id: 'd', kind: 'plot', rect: [20, 90, 36, 106], label: 'D' }
  ];
  const sorted = CuyHotspots.sortKeyboard(unsorted);
  assert.deepStrictEqual(sorted.map(function (h) { return h.id; }), ['a', 'b', 'c', 'd']);
  assert.strictEqual(unsorted[0].id, 'c', 'input array must not be mutated');

  const tracker = CuyHotspots.createTracker({ cooldownMs: 250 });
  let activated = null;
  tracker.on('plot', function (h) { activated = h.id; });
  // Simulate Enter on first item in keyboard order
  tracker.trigger(sorted[0], 5000);
  assert.strictEqual(activated, 'a');
});

// X9: rooms-empty-no-cost
test('X9 rooms-empty-no-cost', function () {
  const r1 = CuyHotspots.fromScene('room', staticData, [], {});
  const r2 = CuyHotspots.fromScene('salon', staticData, [], {});
  const r3 = CuyHotspots.fromScene('pig:buddy', staticData, null, null);
  assert.strictEqual(r1.length, 0);
  assert.strictEqual(r1, r2);
  assert.strictEqual(r2, r3);
  assert.strictEqual(Object.isFrozen(r1), true);
});

// X10: bad-input (never throws)
test('X10 bad-input', function () {
  assert.doesNotThrow(function () {
    CuyHotspots.fromScene(null, null, null, null);
    CuyHotspots.fromScene('farm', { scenes: null }, [null, { uid: 'fx:farm:plot:0' }], null);
    assert.strictEqual(CuyHotspots.hit(null, NaN, 10), null);
    assert.strictEqual(CuyHotspots.hit([
      null,
      { id: 'missing_rect' },
      { id: 'neg', rect: [-10, -10, -2, -2] },
      { id: 'inv', rect: [20, 20, 10, 10] },
      { id: 'nan', rect: [NaN, 0, 10, 10] }
    ], 5, 5), null);
    CuyHotspots.arbitrate(null);
    CuyHotspots.clampLabelRect(null, 40, 12);
    CuyHotspots.sortKeyboard(null);
    const t = CuyHotspots.createTracker();
    t.setHover(null);
    t.trigger(null);
    t.trigger({});
  });
});

console.log('Summary: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
