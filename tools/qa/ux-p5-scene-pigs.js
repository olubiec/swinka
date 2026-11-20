// Pure Node QA tests for web/home/lib/scene-pigs.js (PK-P5a).
// Run: node tools/qa/ux-p5-scene-pigs.js
'use strict';

const assert = require('assert');
const path = require('path');

const ScenePigs = require(path.resolve(__dirname, '../../web/home/lib/scene-pigs.js'));

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function runTest(name, fn) {
  fn();
  console.log('PASS', name);
}

// S1: zero-one-two-three-four
runTest('S1 zero-one-two-three-four', () => {
  const sp = ScenePigs.create({ rng: makeRng(1) });
  assert.strictEqual(sp.entries().length, 0);
  sp.step(100);
  assert.strictEqual(sp.entries().length, 0);

  for (let count = 1; count <= 4; count++) {
    const list = [];
    for (let i = 1; i <= count; i++) {
      list.push({ id: 'pig' + i, look: { breed: 'abyssinian' }, pinned: false, stage: 'adult' });
    }
    sp.sync(list);
    assert.strictEqual(sp.entries().length, count);
    assert.strictEqual(sp.debug().count, count);
  }
});

// S2: min-gap (after 600 steps of 100 ms, no two pigs closer than minGap)
runTest('S2 min-gap', () => {
  const minGap = 22;
  const sp = ScenePigs.create({
    rng: makeRng(42),
    bounds: [10, 96, 230, 126],
    minGap: minGap,
    speed: 70
  });
  sp.sync([
    { id: 'a', look: 'kuki', pinned: false, stage: 'adult' },
    { id: 'b', look: 'ned', pinned: false, stage: 'adult' },
    { id: 'c', look: 'miso', pinned: false, stage: 'junior' }
  ]);
  for (let i = 0; i < 600; i++) {
    sp.step(100);
    const list = sp.entries();
    for (let j = 0; j < list.length; j++) {
      for (let k = j + 1; k < list.length; k++) {
        const d = Math.hypot(list[j].x - list[k].x, list[j].y - list[k].y);
        assert.ok(d >= minGap - 1e-6, `step ${i}: dist(${list[j].id},${list[k].id})=${d} < ${minGap}`);
      }
    }
  }
});

// S3: pinned-stays
runTest('S3 pinned-stays', () => {
  const sp = ScenePigs.create({
    rng: makeRng(7),
    bounds: [10, 96, 230, 126],
    minGap: 22,
    speed: 70
  });
  sp.sync([
    { id: 'pin1', look: 'kuki', pinned: true, stage: 'adult', x: 50, y: 110 },
    { id: 'free1', look: 'ned', pinned: false, stage: 'adult', x: 150, y: 110 }
  ]);
  for (let i = 0; i < 40; i++) {
    sp.step(100);
  }
  const byId = Object.fromEntries(sp.entries().map(e => [e.id, e]));
  assert.strictEqual(byId.pin1.x, 50);
  assert.strictEqual(byId.pin1.y, 110);
  assert.strictEqual(byId.pin1.anim, 'idle');
  const moved = Math.hypot(byId.free1.x - 150, byId.free1.y - 110);
  assert.ok(moved > 5, `expected unpinned pig to move, moved=${moved}`);

  // setPinned toggles behavior
  sp.setPinned('free1', true);
  const fx = byId.free1.x;
  const fy = byId.free1.y;
  for (let i = 0; i < 20; i++) sp.step(100);
  const after = Object.fromEntries(sp.entries().map(e => [e.id, e]));
  assert.strictEqual(after.free1.x, fx);
  assert.strictEqual(after.free1.y, fy);
  assert.strictEqual(after.free1.anim, 'idle');
});

// S4: bounds
runTest('S4 bounds', () => {
  const bounds = [10, 96, 230, 126];
  const sp = ScenePigs.create({ rng: makeRng(99), bounds, minGap: 22, speed: 70 });
  sp.sync([
    { id: 'p1', look: 'kuki', pinned: false, stage: 'adult' },
    { id: 'p2', look: 'ned', pinned: false, stage: 'adult' },
    { id: 'p3', look: 'miso', pinned: false, stage: 'adult' }
  ]);
  for (let i = 0; i < 500; i++) {
    sp.step(100);
    for (const p of sp.entries()) {
      assert.ok(p.x >= bounds[0] && p.x <= bounds[2], `x out of bounds: ${p.x}`);
      assert.ok(p.y >= bounds[1] && p.y <= bounds[3], `y out of bounds: ${p.y}`);
    }
  }
});

// S5: isFree-respected
runTest('S5 isFree-respected', () => {
  const bounds = [10, 96, 230, 126];
  const obstacle = { x0: 100, y0: 96, x1: 140, y1: 126 };
  const isFree = (x, y) => !(x >= obstacle.x0 && x <= obstacle.x1 && y >= obstacle.y0 && y <= obstacle.y1);

  const sp = ScenePigs.create({ rng: makeRng(123), bounds, minGap: 22, speed: 70 });
  sp.sync([
    { id: 'p1', look: 'kuki', pinned: false, stage: 'adult', x: 40, y: 110 },
    { id: 'p2', look: 'ned', pinned: false, stage: 'adult', x: 180, y: 110 }
  ]);
  for (let i = 0; i < 600; i++) {
    sp.step(100, { isFree });
    for (const p of sp.entries()) {
      assert.ok(isFree(p.x, p.y), `pig ${p.id} entered obstacle at (${p.x}, ${p.y})`);
    }
  }
});

// S6: sync-add-remove
runTest('S6 sync-add-remove', () => {
  const sp = ScenePigs.create({ rng: makeRng(55), bounds: [10, 96, 230, 126] });
  sp.sync([
    { id: 'a', look: { coat: 'tan' }, pinned: false, stage: 'adult', x: 40, y: 105 },
    { id: 'b', look: { coat: 'white' }, pinned: false, stage: 'adult', x: 120, y: 115 }
  ]);
  for (let i = 0; i < 10; i++) sp.step(100);
  const beforeA = sp.entries().find(e => e.id === 'a');

  // Update look of 'a', remove 'b', add 'c'
  sp.sync([
    { id: 'a', look: { coat: 'black' }, pinned: false, stage: 'adult' },
    { id: 'c', look: { coat: 'tricolor' }, pinned: false, stage: 'baby' }
  ]);
  const list = sp.entries();
  assert.strictEqual(list.length, 2);
  const afterA = list.find(e => e.id === 'a');
  assert.strictEqual(afterA.x, beforeA.x);
  assert.strictEqual(afterA.y, beforeA.y);
  assert.deepStrictEqual(afterA.look, { coat: 'black' });
  assert.strictEqual(list.find(e => e.id === 'b'), undefined);
  assert.ok(list.find(e => e.id === 'c'));

  assert.strictEqual(sp.remove('c'), true);
  assert.strictEqual(sp.remove('c'), false);
  assert.strictEqual(sp.entries().length, 1);
});

// S7: entries-sorted-by-y
runTest('S7 entries-sorted-by-y', () => {
  const sp = ScenePigs.create({ rng: makeRng(11), bounds: [10, 96, 230, 126] });
  sp.sync([
    { id: 'p3', look: 'a', pinned: true, stage: 'adult', x: 50, y: 120 },
    { id: 'p1', look: 'b', pinned: true, stage: 'adult', x: 90, y: 100 },
    { id: 'p2b', look: 'c', pinned: true, stage: 'adult', x: 130, y: 110 },
    { id: 'p2a', look: 'd', pinned: true, stage: 'adult', x: 170, y: 110 }
  ]);
  const ids = sp.entries().map(e => e.id);
  assert.deepStrictEqual(ids, ['p1', 'p2a', 'p2b', 'p3']);
});

// S8: deterministic
runTest('S8 deterministic', () => {
  function runOnce() {
    const sp = ScenePigs.create({ rng: makeRng(777), bounds: [10, 96, 230, 126], minGap: 22, speed: 70 });
    sp.sync([
      { id: 'a', look: 'kuki', pinned: false, stage: 'adult' },
      { id: 'b', look: 'ned', pinned: false, stage: 'adult' }
    ]);
    for (let i = 0; i < 150; i++) sp.step(100);
    return sp.entries();
  }
  assert.deepStrictEqual(runOnce(), runOnce());
});

// S9: dt-clamp (very large dtMs does not teleport)
runTest('S9 dt-clamp', () => {
  const bounds = [10, 96, 230, 126];
  const obstacle = { x0: 100, y0: 96, x1: 120, y1: 126 };
  const isFree = (x, y) => !(x >= obstacle.x0 && x <= obstacle.x1 && y >= obstacle.y0 && y <= obstacle.y1);
  const sp = ScenePigs.create({ rng: makeRng(19), bounds, minGap: 22, speed: 70 });
  sp.sync([{ id: 'a', look: 'kuki', pinned: false, stage: 'adult', x: 30, y: 110 }]);

  // Huge dtMs should not hang, leave bounds, or teleport through obstacle
  sp.step(1e8, { isFree });
  const a = sp.entries()[0];
  assert.ok(a.x >= bounds[0] && a.x <= bounds[2]);
  assert.ok(a.y >= bounds[1] && a.y <= bounds[3]);
  assert.ok(isFree(a.x, a.y));
});

// S10: no-nan
runTest('S10 no-nan', () => {
  const sp = ScenePigs.create({ rng: makeRng(3), bounds: [50, 100, 50, 100], minGap: 22, speed: 70 });
  sp.sync([
    { id: 'a', look: 'kuki', pinned: false, stage: 'adult' },
    { id: 'b', look: 'ned', pinned: false, stage: 'adult' }
  ]);
  sp.step(NaN);
  sp.step(-50);
  sp.step(Infinity);
  for (let i = 0; i < 50; i++) sp.step(100);
  for (const p of sp.entries()) {
    assert.ok(Number.isFinite(p.x), 'x finite');
    assert.ok(Number.isFinite(p.y), 'y finite');
    assert.ok(Number.isFinite(p.frame), 'frame finite');
    assert.ok(p.facing === 1 || p.facing === -1, 'facing valid');
  }
});

// S11: cost (4 pigs x 10000 steps < 200 ms)
runTest('S11 cost', () => {
  const sp = ScenePigs.create({ rng: makeRng(2026), bounds: [10, 96, 230, 126], minGap: 22, speed: 70 });
  sp.sync([
    { id: 'p1', look: 'a', pinned: false, stage: 'adult' },
    { id: 'p2', look: 'b', pinned: false, stage: 'adult' },
    { id: 'p3', look: 'c', pinned: false, stage: 'adult' },
    { id: 'p4', look: 'd', pinned: false, stage: 'adult' }
  ]);
  const t0 = Date.now();
  for (let i = 0; i < 10000; i++) {
    sp.step(50);
  }
  const elapsed = Date.now() - t0;
  assert.ok(elapsed < 200, `4 pigs x 10000 steps took ${elapsed}ms (>= 200ms)`);
  console.log(`   (4 pigs x 10000 steps: ${elapsed}ms)`);
});

// S12: isSegmentFree-basic
runTest('S12 isSegmentFree-basic', () => {
  const wall = { x0: 100, y0: 96, x1: 140, y1: 126 };
  const isFree = (x, y) => !(x >= wall.x0 && x <= wall.x1 && y >= wall.y0 && y <= wall.y1);
  assert.strictEqual(ScenePigs.isSegmentFree(20, 110, 90, 110, isFree), true);
  assert.strictEqual(ScenePigs.isSegmentFree(40, 110, 180, 110, isFree), false);
  assert.strictEqual(ScenePigs.isSegmentFree(40, 110, 180, 110, null), true);
  assert.strictEqual(ScenePigs.isSegmentFree(110, 110, 180, 110, isFree), false);

  // Thin 5px pillar must not be skipped by segment sampling
  const pillarFree = (x, y) => !(x >= 100 && x <= 105 && y >= 96 && y <= 126);
  assert.strictEqual(ScenePigs.isSegmentFree(90, 110, 115, 110, pillarFree), false);
});

// S13: spawn-avoids-obstacle
runTest('S13 spawn-avoids-obstacle', () => {
  const bounds = [10, 96, 230, 126];
  // Only right edge [206..230] is free; center (120, 111) is blocked
  const isFree = (x, y) => x >= 206 && x <= 230 && y >= 96 && y <= 126;

  const sp1 = ScenePigs.create({ rng: makeRng(101), bounds, minGap: 12, speed: 70, isFree });
  sp1.sync([
    { id: 'p1', look: 'kuki', pinned: false, stage: 'adult' },
    { id: 'p2', look: 'ned', pinned: false, stage: 'adult' }
  ]);
  for (const p of sp1.entries()) {
    assert.ok(p.x >= bounds[0] && p.x <= bounds[2]);
    assert.ok(p.y >= bounds[1] && p.y <= bounds[3]);
    assert.ok(isFree(p.x, p.y), `pig ${p.id} spawned on blocked cell (${p.x}, ${p.y})`);
  }

  // Passing isFree to sync() directly
  const sp2 = ScenePigs.create({ rng: makeRng(202), bounds, minGap: 12, speed: 70 });
  sp2.sync([{ id: 'p3', look: 'miso', pinned: false, stage: 'adult' }], isFree);
  const p3 = sp2.entries()[0];
  assert.ok(isFree(p3.x, p3.y), `sync(list, isFree) spawned on blocked cell (${p3.x}, ${p3.y})`);

  // Unpinned pig spawned without isFree gets rescued on first step(dt, { isFree }),
  // while pinned prop pig keeps its explicit coordinates.
  const sp3 = ScenePigs.create({ rng: makeRng(303), bounds, minGap: 12, speed: 70 });
  sp3.sync([
    { id: 'p4', look: 'a', pinned: false, stage: 'adult', x: 50, y: 110 },
    { id: 'pin', look: 'b', pinned: true, stage: 'adult', x: 50, y: 110 }
  ]);
  sp3.step(50, { isFree });
  const byId = Object.fromEntries(sp3.entries().map(e => [e.id, e]));
  assert.ok(isFree(byId.p4.x, byId.p4.y), `unpinned pig stayed blocked at (${byId.p4.x}, ${byId.p4.y})`);
  assert.strictEqual(byId.pin.x, 50);
  assert.strictEqual(byId.pin.y, 110);
});

// S14: middle-obstacle-los-and-deflection
runTest('S14 middle-obstacle-los-and-deflection', () => {
  const bounds = [10, 96, 230, 126];
  const wall = { x0: 100, y0: 96, x1: 140, y1: 126 };
  const isFreeWall = (x, y) => !(x >= wall.x0 && x <= wall.x1 && y >= wall.y0 && y <= wall.y1);

  const sp = ScenePigs.create({ rng: makeRng(404), bounds, minGap: 22, speed: 70, isFree: isFreeWall });
  sp.sync([{ id: 'lefty', look: 'kuki', pinned: false, stage: 'adult', x: 40, y: 110 }]);

  let minX = Infinity;
  let maxX = -Infinity;
  let sawTarget = false;
  for (let i = 0; i < 1000; i++) {
    sp.step(100, { isFree: isFreeWall });
    const p = sp.entries()[0];
    const tgt = sp.debug().targets[0];
    assert.ok(isFreeWall(p.x, p.y), `step ${i}: pig entered wall (${p.x}, ${p.y})`);
    assert.ok(p.x < wall.x0, `step ${i}: pig crossed central wall x=${p.x}`);
    if (tgt.targetX !== null && tgt.targetY !== null) {
      sawTarget = true;
      assert.ok(isFreeWall(tgt.targetX, tgt.targetY), `step ${i}: target inside wall (${tgt.targetX}, ${tgt.targetY})`);
      assert.ok(tgt.targetX < wall.x0, `step ${i}: pickTarget crossed obstacle x=${tgt.targetX}`);
      assert.ok(
        ScenePigs.isSegmentFree(p.x, p.y, tgt.targetX, tgt.targetY, isFreeWall),
        `step ${i}: target segment crossed obstacle (${p.x},${p.y})->(${tgt.targetX},${tgt.targetY})`
      );
    }
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
  }
  assert.ok(sawTarget, 'expected pig to pick at least one walk target');
  assert.ok(maxX - minX > 15, `expected pig to roam left of obstacle, span=${maxX - minX}`);

  // Slide deflection around partial middle obstacle [100..140, 104..126]
  const partialFree = (x, y) => !(x >= 100 && x <= 140 && y >= 104 && y <= 126);
  const spSlide = ScenePigs.create({ rng: makeRng(505), bounds, minGap: 22, speed: 70 });
  spSlide.sync([{ id: 'slider', look: 'ned', pinned: false, stage: 'adult', x: 92, y: 110 }]);

  // Let slider pick an upward-right target across x=100 while still on the left side
  let armed = false;
  for (let i = 0; i < 400; i++) {
    spSlide.step(50);
    const p = spSlide.entries()[0];
    const tgt = spSlide.debug().targets[0];
    if (p.x < 99 && tgt.targetX !== null && tgt.targetX > 115 && tgt.targetY < 103) {
      armed = true;
      break;
    }
    if (p.x >= 99) {
      spSlide.sync([{ id: 'slider', look: 'ned', pinned: false, stage: 'adult', x: 92, y: 110 }]);
      spSlide.remove('slider');
      spSlide.sync([{ id: 'slider', look: 'ned', pinned: false, stage: 'adult', x: 92, y: 110 }]);
    }
  }
  assert.ok(armed, 'expected test setup to arm an obstacle-corner walk target');

  let deflectedPastCorner = false;
  for (let i = 0; i < 80; i++) {
    spSlide.step(50, { isFree: partialFree });
    const p = spSlide.entries()[0];
    assert.ok(partialFree(p.x, p.y), `slide step ${i}: pig entered partial obstacle (${p.x}, ${p.y})`);
    if (p.x > 100 && p.y < 104) deflectedPastCorner = true;
  }
  assert.ok(deflectedPastCorner, 'expected pig to slide around obstacle corner into top corridor');
});

console.log('ALL ux-p5-scene-pigs PASSED');
