'use strict';

var assert = require('assert');
var path = require('path');

var ROOT = path.resolve(__dirname, '..', '..');
var RestSpots = require(path.join(ROOT, 'web', 'home', 'lib', 'rest-spots.js'));

function makeRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeScene(overrides) {
  var walk = (overrides && overrides.walk) || [16, 80, 240, 136];
  var blockers = (overrides && overrides.blockers) || [];
  return Object.assign({
    id: 'salon',
    kind: 'room',
    walk: walk,
    blockers: blockers,
    tilePx: 16,
    isFree: function (x, y) {
      if (x < walk[0] || x > walk[2] || y < walk[1] || y > walk[3]) return false;
      for (var i = 0; i < blockers.length; i++) {
        var r = blockers[i];
        if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return false;
      }
      return true;
    }
  }, overrides || {});
}

// S1: house-first (pigloo_garden, sig_james_hideout, cosy_nook -> sleep_house)
function testS1HouseFirst() {
  var scene = makeScene();
  var houses = ['pigloo_garden', 'sig_james_hideout', 'cosy_nook'];
  for (var i = 0; i < houses.length; i++) {
    var things = [
      { id: 'cushion_big', itemId: 'cushion_big', x: 50, y: 110, w: 1, h: 1, comfort: 3 },
      { id: 'armchair', itemId: 'armchair', x: 90, y: 110, w: 2, h: 2, comfort: 4 },
      { id: houses[i], itemId: houses[i], x: 160, y: 112, w: 2, h: 2, comfort: 5 }
    ];
    var res = RestSpots.pick({ kind: 'sleep', scene: scene, things: things, rng: makeRng(1) });
    assert.ok(res, 'S1 expected spot for ' + houses[i]);
    assert.strictEqual(res.spotType, 'house', 'S1 must prefer house over bed/cushion');
    assert.strictEqual(res.anim, 'sleep_house', 'S1 house anim must be sleep_house');
    assert.strictEqual(res.thingId, houses[i]);
    assert.ok(res.gx >= scene.walk[0] && res.gx <= scene.walk[2]);
    assert.ok(res.gy >= scene.walk[1] && res.gy <= scene.walk[3]);
    assert.strictEqual(scene.isFree(res.gx, res.gy), true);
  }
}

// S2: bed-then-cushion (sig_glen_knit_bed/sofa_cosy/armchair > cushion_big/pouf_boucle)
function testS2BedThenCushion() {
  var scene = makeScene();
  var things = [
    { id: 'pouf_1', itemId: 'pouf_boucle', x: 60, y: 100, w: 1, h: 1, comfort: 0 },
    { id: 'cushion_1', itemId: 'cushion_big', x: 90, y: 100, w: 1, h: 1, comfort: 3 },
    { id: 'armchair_1', itemId: 'armchair', x: 150, y: 110, w: 2, h: 2, comfort: 4 }
  ];
  var r1 = RestSpots.pick({ kind: 'sleep', scene: scene, things: things, rng: makeRng(2) });
  assert.strictEqual(r1.spotType, 'bed');
  assert.strictEqual(r1.thingId, 'armchair_1');
  assert.strictEqual(r1.anim, 'sleep');

  var rNap = RestSpots.pick({ kind: 'nap', scene: scene, things: things, rng: makeRng(2) });
  assert.strictEqual(rNap.anim, 'doze');

  // Second pig skips taken armchair and chooses cushion_big (higher comfort than pouf)
  var r2 = RestSpots.pick({
    kind: 'sleep',
    scene: scene,
    things: things,
    taken: [{ gx: r1.gx, gy: r1.gy, thingId: r1.thingId }],
    rng: makeRng(2)
  });
  assert.strictEqual(r2.spotType, 'cushion');
  assert.strictEqual(r2.thingId, 'cushion_1');
}

// S3: floor-corner-fallback
function testS3FloorCornerFallback() {
  var scene = makeScene();
  var res = RestSpots.pick({ kind: 'sleep', scene: scene, things: [], rng: makeRng(3) });
  assert.ok(res, 'S3 floor fallback should return a point');
  assert.strictEqual(res.spotType, 'floor');
  assert.strictEqual(res.anim, 'sleep');
  assert.strictEqual(res.thingId, null);
  assert.strictEqual(scene.isFree(res.gx, res.gy), true);
}

// S4: none-returns-null
function testS4NoneReturnsNull() {
  var blockedScene = makeScene({
    isFree: function () { return false; }
  });
  assert.strictEqual(RestSpots.pick({ kind: 'sleep', scene: blockedScene, things: [] }), null);
  var noWalkScene = { id: 'broken', kind: 'room', walk: [] };
  assert.strictEqual(RestSpots.pick({ kind: 'sleep', scene: noWalkScene, things: [] }), null);
}

// S5: taken-skipped
function testS5TakenSkipped() {
  var scene = makeScene();
  var things = [
    { uid: 'h1', itemId: 'cosy_nook', x: 80, y: 110, w: 2, h: 2, comfort: 5 },
    { uid: 'h2', itemId: 'sig_james_hideout', x: 180, y: 110, w: 2, h: 2, comfort: 4 }
  ];
  var p1 = RestSpots.pick({ kind: 'sleep', scene: scene, things: things, rng: makeRng(5) });
  assert.strictEqual(p1.thingId, 'h1');
  var p2 = RestSpots.pick({
    kind: 'sleep',
    scene: scene,
    things: things,
    taken: [{ gx: p1.gx, gy: p1.gy, thingId: p1.thingId }],
    rng: makeRng(5)
  });
  assert.strictEqual(p2.thingId, 'h2');
  assert.notStrictEqual(p2.gx, p1.gx);
}

// S6: pair-adjacent (sleep_together)
function testS6PairAdjacent() {
  var scene = makeScene();
  var things = [
    { uid: 'sofa1', itemId: 'sofa_cosy', x: 120, y: 110, w: 3, h: 2, comfort: 6 }
  ];
  var res = RestSpots.pick({ kind: 'sleep_together', scene: scene, things: things, rng: makeRng(6) });
  assert.ok(res && res.pair, 'S6 must return main spot + pair');
  assert.strictEqual(res.anim, 'sleep_together');
  assert.strictEqual(res.pair.anim, 'sleep_together');
  assert.strictEqual(res.pair.faceLeft, !res.faceLeft);
  assert.ok(Math.abs(res.pair.gx - res.gx) >= 18, 'S6 pair separation must be >= 18px');
  assert.strictEqual(scene.isFree(res.gx, res.gy), true);
  assert.strictEqual(scene.isFree(res.pair.gx, res.pair.gy), true);

  // Narrow walk (<20px wide) cannot fit pair -> null
  var narrowScene = makeScene({ walk: [100, 90, 115, 110] });
  assert.strictEqual(RestSpots.pick({ kind: 'sleep_together', scene: narrowScene, things: [] }), null);
}

// S7: blocked-cells-never-chosen
function testS7BlockedCellsNeverChosen() {
  var scene = makeScene({
    walk: [16, 80, 240, 136],
    blockers: [
      [16, 80, 40, 100],   // blocks top-left corner
      [150, 95, 190, 125]  // blocks armchair & sofa area
    ]
  });
  var things = [
    { id: 'armchair', itemId: 'armchair', x: 170, y: 110, w: 2, h: 2, comfort: 4 }
  ];
  var res = RestSpots.pick({ kind: 'sleep', scene: scene, things: things, rng: makeRng(7) });
  assert.ok(res, 'S7 should fall back to free spot when armchair is inside blocker');
  assert.strictEqual(scene.isFree(res.gx, res.gy), true, 'S7 chosen spot must pass isFree');
  assert.strictEqual(res.spotType, 'floor', 'S7 blocked furniture must be skipped');
}

// S8: inside-scene-bounds
function testS8InsideSceneBounds() {
  var scenes = [
    makeScene({ id: 'salon', walk: [16, 72, 176, 104] }),
    makeScene({ id: 'bedroom', walk: [12, 84, 244, 136] }),
    makeScene({ id: 'kitchen', walk: [10, 88, 246, 138] }),
    makeScene({ id: 'garden', walk: [8, 86, 248, 138] }),
    makeScene({ id: 'park', walk: [10, 96, 374, 184] }),
    makeScene({ id: 'farm', walk: [12, 82, 244, 138] }),
    makeScene({ id: 'market', walk: [14, 90, 242, 136] })
  ];
  var extremeThings = [
    { id: 'cosy_nook', itemId: 'cosy_nook', x: -50, y: 20, w: 2, h: 2, comfort: 5 },
    { id: 'sofa_cosy', itemId: 'sofa_cosy', x: 999, y: 999, w: 3, h: 2, comfort: 6 }
  ];
  for (var i = 0; i < scenes.length; i++) {
    var sc = scenes[i];
    var r = RestSpots.pick({
      kind: 'sleep',
      scene: sc,
      things: extremeThings,
      pigPos: { x: -100, y: 500 },
      rng: makeRng(8 + i)
    });
    assert.ok(r, 'S8 expected valid spot for ' + sc.id);
    assert.ok(r.gx >= sc.walk[0] && r.gx <= sc.walk[2], sc.id + ' gx out of walk bounds');
    assert.ok(r.gy >= sc.walk[1] && r.gy <= sc.walk[3], sc.id + ' gy out of walk bounds');
    assert.strictEqual(sc.isFree(r.gx, r.gy), true);
  }
}

// S9: deterministic
function testS9Deterministic() {
  var scene = makeScene();
  var things = [
    { uid: 'a', itemId: 'armchair', x: 80, y: 110, w: 2, h: 2, comfort: 4 },
    { uid: 'b', itemId: 'sig_glen_knit_bed', x: 160, y: 110, w: 2, h: 2, comfort: 4 }
  ];
  var r1 = RestSpots.pick({ kind: 'sleep', scene: scene, things: things, rng: makeRng(77) });
  var r2 = RestSpots.pick({ kind: 'sleep', scene: scene, things: things, rng: makeRng(77) });
  assert.deepStrictEqual(r1, r2, 'S9 identical rng must return identical spot');
}

// S10: bad-input
function testS10BadInput() {
  assert.doesNotThrow(function () {
    assert.strictEqual(RestSpots.pick(), null);
    assert.strictEqual(RestSpots.pick(null), null);
    assert.strictEqual(RestSpots.pick({}), null);
    assert.strictEqual(RestSpots.pick({ scene: { walk: null } }), null);
    assert.strictEqual(RestSpots.pick({ scene: { walk: [100, 100, 50, 50] } }), null);
    var res = RestSpots.pick({
      kind: 'unknown_kind',
      scene: makeScene(),
      things: [null, {}, { itemId: 'unknown_item', x: NaN, y: 100 }],
      taken: [null, { gx: NaN }],
      pigPos: { x: NaN, y: Infinity }
    });
    assert.ok(res && res.spotType === 'floor');
  }, 'S10 bad inputs must not throw');
}

testS1HouseFirst();
testS2BedThenCushion();
testS3FloorCornerFallback();
testS4NoneReturnsNull();
testS5TakenSkipped();
testS6PairAdjacent();
testS7BlockedCellsNeverChosen();
testS8InsideSceneBounds();
testS9Deterministic();
testS10BadInput();

console.log('ux-p111-rest-spots: PASS (10/10 tests S1..S10)');
