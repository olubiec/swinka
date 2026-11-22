'use strict';

const assert = require('assert');
const path = require('path');

const EditHistory = require(path.resolve(__dirname, '../../web/home/features/places/edit-history.js'));

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

run('U1 undo-place-removes', () => {
  const h = EditHistory.create();
  h.push({ kind: 'place', place: 'living_room', itemId: 'bed_small', x: 64, y: 80 });
  assert.deepStrictEqual(h.counts(), { undo: 1, redo: 0, canUndo: true, canRedo: false });

  // Before uid is resolved, undo returns [] and preserves stack
  assert.deepStrictEqual(h.undo(), []);
  assert.deepStrictEqual(h.counts(), { undo: 1, redo: 0, canUndo: true, canRedo: false });

  const followUp = h.resolvePlacedUid('living_room', 'bed_small', 64, 80, 'u_101');
  assert.deepStrictEqual(followUp, []);

  const msgs = h.undo();
  assert.deepStrictEqual(msgs, [{ type: 'room_remove', place: 'living_room', uid: 'u_101' }]);
  assert.deepStrictEqual(h.counts(), { undo: 0, redo: 1, canUndo: false, canRedo: true });
});

run('U2 undo-move-restores', () => {
  const h = EditHistory.create();
  h.push({ kind: 'move', place: 'living_room', uid: 'u_202', prevX: 32, prevY: 48, x: 96, y: 80 });
  const msgs = h.undo();
  assert.deepStrictEqual(msgs, [{ type: 'room_move', place: 'living_room', uid: 'u_202', x: 32, y: 48 }]);
  h.acknowledge();
  const redoMsgs = h.redo();
  assert.deepStrictEqual(redoMsgs, [{ type: 'room_move', place: 'living_room', uid: 'u_202', x: 96, y: 80 }]);
});

run('U3 undo-remove-restores-with-flip', () => {
  const h = EditHistory.create();
  h.push({ kind: 'remove', place: 'garden', uid: 'u_303', itemId: 'bench_wood', x: 112, y: 96, flip: true });
  const msgs = h.undo();
  assert.deepStrictEqual(msgs, [{ type: 'room_place', place: 'garden', itemId: 'bench_wood', x: 112, y: 96 }]);
  const followUp = h.resolvePlacedUid('garden', 'bench_wood', 112, 96, 'u_304');
  assert.deepStrictEqual(followUp, [{ type: 'room_flip', place: 'garden', uid: 'u_304' }]);
  h.acknowledge();

  // Subsequent redo removes using the newly resolved uid
  const redoMsgs = h.redo();
  assert.deepStrictEqual(redoMsgs, [{ type: 'room_remove', place: 'garden', uid: 'u_304' }]);
});

run('U4 redo-after-undo', () => {
  const h = EditHistory.create();
  h.push({ kind: 'flip', place: 'living_room', uid: 'u_401' });
  assert.deepStrictEqual(h.undo(), [{ type: 'room_flip', place: 'living_room', uid: 'u_401' }]);
  h.acknowledge();
  assert.deepStrictEqual(h.counts(), { undo: 0, redo: 1, canUndo: false, canRedo: true });

  assert.deepStrictEqual(h.redo(), [{ type: 'room_flip', place: 'living_room', uid: 'u_401' }]);
  h.acknowledge();
  assert.deepStrictEqual(h.counts(), { undo: 1, redo: 0, canUndo: true, canRedo: false });

  // Place redo gets new uid via resolvePlacedUid
  h.push({ kind: 'place', place: 'living_room', itemId: 'bowl', x: 40, y: 64, uid: 'u_402' });
  assert.deepStrictEqual(h.undo(), [{ type: 'room_remove', place: 'living_room', uid: 'u_402' }]);
  assert.deepStrictEqual(h.redo(), [{ type: 'room_place', place: 'living_room', itemId: 'bowl', x: 40, y: 64 }]);
  h.resolvePlacedUid('living_room', 'bowl', 40, 64, 'u_403');
  assert.deepStrictEqual(h.undo(), [{ type: 'room_remove', place: 'living_room', uid: 'u_403' }]);
});

run('U5 new-op-clears-redo', () => {
  const h = EditHistory.create();
  h.push({ kind: 'flip', place: 'living_room', uid: 'u_1' });
  h.push({ kind: 'flip', place: 'living_room', uid: 'u_2' });
  h.undo();
  assert.strictEqual(h.counts().redo, 1);

  h.push({ kind: 'move', place: 'living_room', uid: 'u_1', prevX: 16, prevY: 48, x: 32, y: 48 });
  assert.deepStrictEqual(h.counts(), { undo: 2, redo: 0, canUndo: true, canRedo: false });
  assert.deepStrictEqual(h.redo(), []);
});

run('U6 limit-50-drops-oldest', () => {
  assert.strictEqual(EditHistory.MAX_HISTORY, 50);
  const h = EditHistory.create();
  for (let i = 1; i <= 55; i += 1) {
    h.push({ kind: 'flip', place: 'living_room', uid: 'u_' + i });
  }
  assert.strictEqual(h.counts().undo, 50);
  const firstUndo = h.undo();
  assert.deepStrictEqual(firstUndo, [{ type: 'room_flip', place: 'living_room', uid: 'u_55' }]);
  let lastUndo = firstUndo;
  for (let i = 0; i < 49; i += 1) {
    lastUndo = h.undo();
  }
  assert.deepStrictEqual(lastUndo, [{ type: 'room_flip', place: 'living_room', uid: 'u_6' }]);
  assert.deepStrictEqual(h.undo(), []);
});

run('U7 scene-change-clears', () => {
  const h = EditHistory.create();
  h.push({ kind: 'flip', place: 'living_room', uid: 'u_1' });
  h.push({ kind: 'flip', place: 'living_room', uid: 'u_2' });
  h.undo();
  assert.strictEqual(h.counts().undo, 1);
  assert.strictEqual(h.counts().redo, 1);

  h.clear();
  assert.deepStrictEqual(h.counts(), { undo: 0, redo: 0, canUndo: false, canRedo: false });
  assert.strictEqual(h.rollbackPending(), false);
});

run('U8 core-rejects-then-skip', () => {
  const h = EditHistory.create();
  h.push({ kind: 'move', place: 'living_room', uid: 'u_1', prevX: 16, prevY: 48, x: 32, y: 48 });
  h.push({ kind: 'remove', place: 'living_room', uid: 'u_2', itemId: 'bed', x: 64, y: 80, flip: true });

  const msgs = h.undo();
  assert.strictEqual(msgs.length, 1);
  assert.deepStrictEqual(h.counts(), { undo: 1, redo: 1, canUndo: true, canRedo: true });

  // Core rejects inverse: rollbackPending restores entry to previous stack (undo)
  assert.strictEqual(h.rollbackPending(), true);
  assert.deepStrictEqual(h.counts(), { undo: 2, redo: 0, canUndo: true, canRedo: false });
  assert.strictEqual(h.rollbackPending(), false);

  // Subsequent acknowledge/rollback stays consistent; optional skip drops rejected entry
  h.undo();
  assert.strictEqual(h.rollbackPending({ drop: true }), true);
  assert.deepStrictEqual(h.counts(), { undo: 1, redo: 0, canUndo: true, canRedo: false });
  const prevMsgs = h.undo();
  assert.deepStrictEqual(prevMsgs, [{ type: 'room_move', place: 'living_room', uid: 'u_1', x: 16, y: 48 }]);
});

run('U9 snap-to-grid', () => {
  const metrics = { cellSize: 16, floorY0: 32, cols: 16 };
  // Indoor floor boundary
  const s1 = EditHistory.snapCell('indoor', { cells: [1, 1] }, 0, 32, metrics);
  assert.deepStrictEqual(s1, { x: 8, y: 48, cx: 0, cy: 0, cw: 1, ch: 1, off: { x: 0, y: 32 } });

  const s2 = EditHistory.snapCell('indoor', { w: 32 }, 15.9, 47.9, metrics);
  assert.strictEqual(s2.cx, 0);
  assert.strictEqual(s2.cy, 0);
  assert.strictEqual(s2.cw, 2);
  assert.strictEqual(s2.x, 16);
  assert.strictEqual(s2.y, 48);

  // Indoor wall clamping for negative and out-of-bounds
  const wNeg = EditHistory.snapCell('indoor', { layer: 'wall', cells: [2, 1] }, -40, -20, metrics);
  assert.strictEqual(wNeg.cx, 0);
  assert.strictEqual(wNeg.cy, 0);
  assert.strictEqual(wNeg.x, 16);
  assert.strictEqual(wNeg.y, 16);

  const wFar = EditHistory.snapCell('indoor', { layer: 'wall', cells: [2, 1] }, 999, 500, metrics);
  assert.strictEqual(wFar.cx, 14);
  assert.strictEqual(wFar.x, 240);
  assert.strictEqual(wFar.y, 32);

  // Outdoor negative & boundary
  const outNeg = EditHistory.snapCell('outdoor', null, -1, -1, metrics);
  assert.strictEqual(outNeg.cx, -1);
  assert.strictEqual(outNeg.cy, -1);
  assert.strictEqual(outNeg.x, -8);
  assert.strictEqual(outNeg.y, 0);
});

run('U10 comfort-meter-bounds', () => {
  const empty = EditHistory.computeComfortDisplay({}, 'living_room');
  assert.deepStrictEqual(empty, {
    score: 0,
    cap: 100,
    moodFactor: 1,
    moodPct: 0,
    ratio: 0,
    text: 'Comfort 0/100 - mood drops 0% slower'
  });

  const mid = EditHistory.computeComfortDisplay({
    comfort: { living_room: { score: 42, cap: 100, moodFactor: 0.94 } }
  }, 'living_room');
  assert.deepStrictEqual(mid, {
    score: 42,
    cap: 100,
    moodFactor: 0.94,
    moodPct: 6,
    ratio: 0.42,
    text: 'Comfort 42/100 - mood drops 6% slower'
  });

  const over = EditHistory.computeComfortDisplay({
    comfort: { score: 150, cap: 100, moodFactor: 0 }
  }, 'living_room');
  assert.strictEqual(over.score, 100);
  assert.strictEqual(over.ratio, 1);
  assert.strictEqual(over.moodPct, 100);

  const under = EditHistory.computeComfortDisplay({
    comfort: { score: -10, cap: 100, moodFactor: 1.5 }
  });
  assert.strictEqual(under.score, 0);
  assert.strictEqual(under.ratio, 0);
  assert.strictEqual(under.moodPct, 2);
});

run('U11 bad-input', () => {
  const h = EditHistory.create({ maxSteps: -5 });
  assert.strictEqual(h.push(null), false);
  assert.strictEqual(h.push({ kind: 'unknown', place: 'living_room' }), false);
  assert.strictEqual(h.push({ kind: 'place', place: '', itemId: 'bed', x: 0, y: 0 }), false);
  assert.strictEqual(h.push({ kind: 'place', place: 'living_room', itemId: 'bed', x: NaN, y: 0 }), false);
  assert.strictEqual(h.push({ kind: 'move', place: 'living_room', uid: '', prevX: 0, prevY: 0, x: 1, y: 1 }), false);
  assert.strictEqual(h.push({ kind: 'remove', place: 'living_room', uid: 'u1', itemId: '', x: 0, y: 0 }), false);
  assert.deepStrictEqual(h.resolvePlacedUid(null, null, NaN, NaN, ''), []);
  assert.deepStrictEqual(h.counts(), { undo: 0, redo: 0, canUndo: false, canRedo: false });

  const sBad = EditHistory.snapCell(null, null, NaN, undefined, null);
  assert.strictEqual(Number.isFinite(sBad.x), true);
  assert.strictEqual(Number.isFinite(sBad.y), true);

  const cBad = EditHistory.computeComfortDisplay(null, null);
  assert.strictEqual(cBad.score, 0);
  assert.strictEqual(cBad.cap, 100);
});

console.log('Summary: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
