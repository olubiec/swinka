'use strict';

var assert = require('assert');
var path = require('path');

var PlayTargets = require(path.resolve(__dirname, '../../web/home/lib/play-targets.js'));

// STUB grid-16: 256x144 room on 16px cells (16 cols x 9 rows)
function makeGrid16(blockedCells) {
  var blocked = new Set();
  (blockedCells || []).forEach(function (c) {
    blocked.add(c[0] + ',' + c[1]);
  });

  function toCell(v) {
    return Math.floor(v / 16);
  }

  function inBounds(cx, cy) {
    return cx >= 0 && cx < 16 && cy >= 0 && cy < 9;
  }

  function isFree(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    var cx = toCell(x);
    var cy = toCell(y);
    return inBounds(cx, cy) && !blocked.has(cx + ',' + cy);
  }

  function findPath(sx, sy, tx, ty) {
    if (!isFree(sx, sy) || !isFree(tx, ty)) return null;
    var scx = toCell(sx);
    var scy = toCell(sy);
    var tcx = toCell(tx);
    var tcy = toCell(ty);
    if (scx === tcx && scy === tcy) return [{ x: tx, y: ty }];

    var queue = [[scx, scy]];
    var cameFrom = new Map();
    var startKey = scx + ',' + scy;
    cameFrom.set(startKey, null);
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (queue.length > 0) {
      var cur = queue.shift();
      var cx = cur[0];
      var cy = cur[1];
      if (cx === tcx && cy === tcy) {
        var cells = [];
        var k = tcx + ',' + tcy;
        while (k && k !== startKey) {
          var parts = k.split(',');
          cells.unshift({
            x: Number(parts[0]) * 16 + 8,
            y: Number(parts[1]) * 16 + 8
          });
          k = cameFrom.get(k);
        }
        if (cells.length > 0) {
          cells[cells.length - 1] = { x: tx, y: ty };
        }
        return cells;
      }
      for (var i = 0; i < dirs.length; i++) {
        var nx = cx + dirs[i][0];
        var ny = cy + dirs[i][1];
        var nk = nx + ',' + ny;
        if (inBounds(nx, ny) && !blocked.has(nk) && !cameFrom.has(nk)) {
          cameFrom.set(nk, cx + ',' + cy);
          queue.push([nx, ny]);
        }
      }
    }
    return null;
  }

  return { isFree: isFree, findPath: findPath };
}

var results = [];
function runTest(id, name, fn) {
  try {
    fn();
    results.push({ id: id, name: name, ok: true });
    console.log('PASS ' + id + ' ' + name);
  } catch (err) {
    results.push({ id: id, name: name, ok: false, error: err && err.message ? err.message : String(err) });
    console.error('FAIL ' + id + ' ' + name + ': ' + (err && err.stack ? err.stack : err));
  }
}

runTest('T1', 'tunnel-entry-spot', function () {
  var spots = PlayTargets.interactionSpots({ itemId: 'prop_tunnel', x: 128, y: 80, w: 32 });
  assert.strictEqual(spots.length, 2);
  // halfW = 16, offset = 12 => 128 - 16 - 12 = 100, 128 + 16 + 12 = 156
  assert.deepStrictEqual(spots[0], { x: 100, y: 80, facing: 1, side: 'left' });
  assert.deepStrictEqual(spots[1], { x: 156, y: 80, facing: -1, side: 'right' });

  var flipped = PlayTargets.interactionSpots({ itemId: 'willow_tunnel', x: 128, y: 80, flip: true }, { w: 48 });
  assert.strictEqual(flipped.length, 2);
  // halfW = 24, offset = 12 => right first, then left
  assert.deepStrictEqual(flipped[0], { x: 164, y: 80, facing: -1, side: 'right' });
  assert.deepStrictEqual(flipped[1], { x: 92, y: 80, facing: 1, side: 'left' });
});

runTest('T2', 'ball-approach-side', function () {
  var spots = PlayTargets.interactionSpots({ itemId: 'prop_ball', x: 120, y: 88 });
  assert.strictEqual(spots.length, 2);
  // default ball w = 16, halfW = 8, offset = 10 => 120 - 8 - 10 = 102, 120 + 8 + 10 = 138
  assert.deepStrictEqual(spots[0], { x: 102, y: 88, facing: 1, side: 'left' });
  assert.deepStrictEqual(spots[1], { x: 138, y: 88, facing: -1, side: 'right' });

  assert.strictEqual(PlayTargets.kindOf({ itemId: 'prop_hay_ball', x: 40, y: 40 }), 'ball');
  assert.strictEqual(PlayTargets.kindOf({ id: 'ball', x: 40, y: 40 }), 'ball');
});

runTest('T3', 'reachable-chosen', function () {
  var grid = makeGrid16([]);
  var things = [{ id: 'u_tunnel', itemId: 'prop_tunnel', x: 120, y: 88, w: 32 }];
  var picked = PlayTargets.pickReachable(things, { x: 24, y: 88 }, grid.isFree, grid.findPath, function () { return 0; });
  assert.ok(picked, 'expected a reachable toy');
  assert.strictEqual(picked.thingUid, 'u_tunnel');
  assert.strictEqual(picked.itemId, 'prop_tunnel');
  assert.strictEqual(picked.kind, 'tunnel');
  assert.deepStrictEqual(picked.spot, { x: 92, y: 88, facing: 1, side: 'left' });
  assert.ok(Array.isArray(picked.path) && picked.path.length > 0);
});

runTest('T4', 'blocked-returns-null', function () {
  // Toy at cell (10, 5) -> x=168, y=88. Left spot x=140 (cell 8,5), right spot x=196 (cell 12,5)
  // Build furniture wall around the toy
  var blocked = [];
  for (var cy = 0; cy < 9; cy++) {
    blocked.push([7, cy]);
  }
  blocked.push([8, 5], [12, 5]);
  var grid = makeGrid16(blocked);
  var things = [{ id: 'u_ball', itemId: 'prop_ball', x: 168, y: 88 }];
  var picked = PlayTargets.pickReachable(things, { x: 24, y: 88 }, grid.isFree, grid.findPath);
  assert.strictEqual(picked, null);
});

runTest('T5', 'two-toys-nearest-reachable', function () {
  // Far toy is walled off behind x=10; near toy at cell (4,5) x=72, y=88 is reachable
  var blocked = [];
  for (var cy = 0; cy < 9; cy++) {
    blocked.push([10, cy]);
  }
  var grid = makeGrid16(blocked);
  var things = [
    { id: 'far_blocked_ball', itemId: 'prop_ball', x: 200, y: 88 },
    { id: 'near_tunnel', itemId: 'tunnel', x: 72, y: 88, w: 32 }
  ];
  var picked = PlayTargets.pickReachable(things, { x: 24, y: 88 }, grid.isFree, grid.findPath);
  assert.ok(picked);
  assert.strictEqual(picked.thingUid, 'near_tunnel');
  assert.strictEqual(picked.kind, 'tunnel');
});

runTest('T6', 'no-toy-null', function () {
  var grid = makeGrid16([]);
  assert.strictEqual(PlayTargets.pickReachable([], { x: 24, y: 88 }, grid.isFree, grid.findPath), null);
  assert.strictEqual(
    PlayTargets.pickReachable([{ id: 'r1', itemId: 'rug', x: 80, y: 80, flat: true }], { x: 24, y: 88 }, grid.isFree, grid.findPath),
    null
  );
  assert.strictEqual(
    PlayTargets.pickReachable([{ id: 't_flat', itemId: 'prop_tunnel', x: 80, y: 80, flat: true }], { x: 24, y: 88 }, grid.isFree, grid.findPath),
    null
  );
});

runTest('T7', 'path-through-free-cells-only', function () {
  // Vertical obstacle at col 4, rows 2..7; pig at (24, 88), toy at (120, 88)
  var blocked = [];
  for (var cy = 2; cy <= 7; cy++) {
    blocked.push([4, cy]);
  }
  var grid = makeGrid16(blocked);
  var things = [{ id: 'u_ball', itemId: 'ball', x: 120, y: 88 }];
  var picked = PlayTargets.pickReachable(things, { x: 24, y: 88 }, grid.isFree, grid.findPath);
  assert.ok(picked);
  assert.ok(picked.path.length > 0);
  picked.path.forEach(function (pt) {
    assert.strictEqual(grid.isFree(pt.x, pt.y), true, 'path point must be free: ' + JSON.stringify(pt));
  });
});

runTest('T8', 'deterministic-with-rng', function () {
  var grid = makeGrid16([]);
  var things = [
    { id: 't1', itemId: 'prop_tunnel', x: 88, y: 56 },
    { id: 'b1', itemId: 'prop_ball', x: 168, y: 88 }
  ];
  var first = PlayTargets.pickReachable(things, { x: 24, y: 88 }, grid.isFree, grid.findPath, function () { return 0.1; });
  var firstRepeat = PlayTargets.pickReachable(things, { x: 24, y: 88 }, grid.isFree, grid.findPath, function () { return 0.1; });
  var second = PlayTargets.pickReachable(things, { x: 24, y: 88 }, grid.isFree, grid.findPath, function () { return 0.9; });
  assert.ok(first && second);
  assert.strictEqual(first.thingUid, 't1');
  assert.strictEqual(firstRepeat.thingUid, 't1');
  assert.strictEqual(second.thingUid, 'b1');
});

runTest('T9', 'bad-input', function () {
  var grid = makeGrid16([]);
  assert.strictEqual(PlayTargets.kindOf(null), null);
  assert.strictEqual(PlayTargets.kindOf({ itemId: 'tunnel', x: NaN, y: 50 }), null);
  assert.deepStrictEqual(PlayTargets.interactionSpots(null), []);
  assert.deepStrictEqual(PlayTargets.interactionSpots({ itemId: 'ball', x: Infinity, y: 50 }), []);
  assert.strictEqual(PlayTargets.pickReachable(null, { x: 10, y: 10 }, grid.isFree, grid.findPath), null);
  assert.strictEqual(PlayTargets.pickReachable([], { x: NaN, y: 10 }, grid.isFree, grid.findPath), null);
  assert.strictEqual(PlayTargets.pickReachable([{ id: 't', itemId: 'tunnel', x: 80, y: 80 }], { x: 10, y: 10 }, null, grid.findPath), null);
  assert.strictEqual(PlayTargets.pickReachable([{ id: 't', itemId: 'tunnel', x: 80, y: 80 }], { x: 10, y: 10 }, grid.isFree, null), null);
});

runTest('T10', 'unknown-toy-id-ignored', function () {
  var grid = makeGrid16([]);
  var things = [
    { id: 'u1', itemId: 'toy_basket', x: 80, y: 80 },
    { id: 'u2', itemId: 'lamp_mushroom', x: 120, y: 80 },
    { id: 'u3', itemId: 'sofa', x: 160, y: 80 }
  ];
  assert.strictEqual(PlayTargets.kindOf(things[0]), null);
  assert.strictEqual(PlayTargets.kindOf(things[1]), null);
  assert.strictEqual(PlayTargets.kindOf(things[2]), null);
  assert.strictEqual(PlayTargets.pickReachable(things, { x: 24, y: 88 }, grid.isFree, grid.findPath), null);
});

var failed = results.filter(function (r) { return !r.ok; });
if (failed.length > 0) {
  console.error('SUMMARY: ' + failed.length + ' failed out of ' + results.length);
  process.exit(1);
}
console.log('SUMMARY: all ' + results.length + ' tests passed');
