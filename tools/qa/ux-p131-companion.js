'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const COMPANIONS_JSON_PATH = path.join(ROOT, 'assets', 'data', 'companions.json');
const Companion = require(path.join(ROOT, 'web', 'home', 'lib', 'companion.js'));

const WALK = [8, 80, 248, 138];

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadData() {
  return JSON.parse(fs.readFileSync(COMPANIONS_JSON_PATH, 'utf8'));
}

test('K1 only-in-allowed-scenes', () => {
  const data = loadData();
  const inst = Companion.create(data, { enabled: true, seed: 42 });

  for (const sceneId of ['garden', 'park']) {
    inst.step(50, { sceneId, walk: WALK, pigs: [] });
    const entries = inst.entries();
    assert.strictEqual(entries.length, 1, `Expected 1 entry in ${sceneId}`);
  }

  for (const sceneId of ['salon', 'room', 'farm', 'market', 'pig:kuki', '']) {
    inst.step(50, { sceneId, walk: WALK, pigs: [] });
    const entries = inst.entries();
    assert.strictEqual(entries.length, 0, `Expected 0 entries in ${sceneId}`);
  }
});

test('K2 stays-in-strip', () => {
  const data = loadData();
  const inst = Companion.create(data, { enabled: true, seed: 101 });
  const isFree = (x, y) => !(x >= 100 && x <= 140 && y >= 95 && y <= 115);

  for (let i = 0; i < 300; i++) {
    inst.step(50, { sceneId: 'garden', walk: WALK, pigs: [], isFree });
    const [e] = inst.entries();
    assert.ok(e, 'Expected companion entry');
    assert.ok(e.x >= WALK[0] && e.x <= WALK[2], `x=${e.x} out of walk [${WALK[0]}, ${WALK[2]}]`);
    assert.ok(e.y >= WALK[1] && e.y <= WALK[3], `y=${e.y} out of walk [${WALK[1]}, ${WALK[3]}]`);
    assert.ok(isFree(e.x, e.y), `Companion entered blocked rect at (${e.x}, ${e.y})`);
  }
});

test('K3 avoids-pig-overlap', () => {
  const data = loadData();
  const minGap = data.companions[0].minPigGap;
  const pigs = [
    { x: 60, y: 105 },
    { x: 130, y: 110 },
    { x: 200, y: 100 }
  ];
  const inst = Companion.create(data, { enabled: true, seed: 777 });

  for (let i = 0; i < 300; i++) {
    inst.step(50, { sceneId: 'park', walk: WALK, pigs });
    const [e] = inst.entries();
    assert.ok(e, 'Expected companion entry');
    for (const p of pigs) {
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      assert.ok(dist >= minGap - 1e-6, `Overlap with pig at step ${i}: dist=${dist} < minGap=${minGap}`);
    }
  }
});

test('K4 reacts-when-pig-near', () => {
  const data = loadData();
  const inst = Companion.create(data, { enabled: true, seed: 55 });

  // Spawn away from pigs first
  inst.step(50, { sceneId: 'garden', walk: WALK, pigs: [] });
  const [initial] = inst.entries();
  assert.ok(initial, 'Expected initial entry');

  // Advance past any initial cooldown just in case
  for (let i = 0; i < 80; i++) {
    inst.step(50, { sceneId: 'garden', walk: WALK, pigs: [] });
  }
  const [beforeReact] = inst.entries();
  const pigX = Math.min(WALK[2], beforeReact.x + 25);
  const pigY = beforeReact.y;
  const expectedFacing = pigX >= beforeReact.x ? 1 : -1;

  inst.step(50, { sceneId: 'garden', walk: WALK, pigs: [{ x: pigX, y: pigY }] });
  const [reacted] = inst.entries();
  assert.ok(
    reacted.anim === 'popcorn' || reacted.anim === 'sniff',
    `Expected popcorn or sniff reaction, got ${reacted.anim}`
  );
  assert.strictEqual(reacted.facing, expectedFacing, 'Expected companion to face nearby pig');
});

test('K5 disabled-returns-empty', () => {
  const data = loadData();
  const offInst = Companion.create(data, { enabled: false, seed: 12 });
  offInst.step(50, { sceneId: 'garden', walk: WALK, pigs: [] });
  assert.strictEqual(offInst.entries().length, 0);
  assert.strictEqual(offInst.isEnabled(), false);

  const onInst = Companion.create(data, { enabled: true, seed: 12 });
  onInst.step(50, { sceneId: 'garden', walk: WALK, pigs: [] });
  assert.strictEqual(onInst.entries().length, 1);

  // Instant removal without another step
  onInst.setEnabled(false);
  assert.strictEqual(onInst.isEnabled(), false);
  assert.strictEqual(onInst.entries().length, 0);
});

test('K6 deterministic', () => {
  const data = loadData();
  const a = Companion.create(data, { enabled: true, seed: 1337 });
  const b = Companion.create(data, { enabled: true, seed: 1337 });
  const pigs = [{ x: 100, y: 110 }];

  for (let i = 0; i < 120; i++) {
    a.step(40, { sceneId: 'garden', walk: WALK, pigs });
    b.step(40, { sceneId: 'garden', walk: WALK, pigs });
    assert.deepStrictEqual(a.entries(), b.entries(), `Mismatch at step ${i}`);
  }
});

test('K7 entries-shape', () => {
  const data = loadData();
  const inst = Companion.create(data, { enabled: true, seed: 9 });
  inst.step(50, { sceneId: 'garden', walk: WALK, pigs: [] });
  const entries = inst.entries();
  assert.strictEqual(entries.length, 1);
  const e = entries[0];

  assert.strictEqual(typeof e.id, 'string');
  assert.strictEqual(Number.isFinite(e.x), true);
  assert.strictEqual(Number.isFinite(e.y), true);
  assert.strictEqual(Number.isInteger(e.frame) && e.frame >= 0, true);
  assert.strictEqual(Number.isInteger(e.row) && e.row >= 0, true);
  assert.ok(['idle', 'walk', 'sniff', 'popcorn'].includes(e.anim), `Unexpected anim ${e.anim}`);
  assert.ok(e.facing === 1 || e.facing === -1, `Unexpected facing ${e.facing}`);
  assert.strictEqual(typeof e.sprite, 'string');
  assert.ok(Array.isArray(e.frameSize) && e.frameSize.length === 2);
  assert.strictEqual(typeof e.floorY, 'number');
  assert.strictEqual(typeof e.scale, 'number');
});

test('K8 data-valid', () => {
  const data = loadData();
  assert.strictEqual(data.version, 1);
  assert.strictEqual(data.defaultId, 'garden_friend');
  assert.deepStrictEqual(data.allowedScenes, ['garden', 'park']);
  assert.ok(Array.isArray(data.companions) && data.companions.length >= 1);

  for (const c of data.companions) {
    assert.strictEqual(typeof c.id, 'string');
    assert.strictEqual(typeof c.sprite, 'string');
    const spritePath = path.join(ROOT, 'assets', c.sprite);
    assert.ok(fs.existsSync(spritePath), `Missing sprite on disk: ${spritePath}`);
    assert.ok(Array.isArray(c.frameSize) && c.frameSize[0] === 64 && c.frameSize[1] === 64);
    assert.ok(c.animations && c.animations.idle && c.animations.walk && c.animations.sniff && c.animations.popcorn);
  }
});

test('K9 bad-input', () => {
  const inst = Companion.create(null, null);
  assert.strictEqual(inst.getId(), Companion.DEFAULT_DATA.defaultId);
  assert.strictEqual(inst.isEnabled(), false);

  inst.setEnabled(true);
  inst.step(0, { sceneId: 'garden' });
  inst.step(-50, { sceneId: 'garden' });
  inst.step(NaN, { sceneId: 'garden' });
  inst.step(Infinity, { sceneId: 'garden' });
  inst.step(50, null);
  inst.step(50, {});
  assert.strictEqual(inst.entries().length, 0);

  inst.setId('nonexistent_companion');
  assert.strictEqual(inst.getId(), Companion.DEFAULT_DATA.defaultId);

  inst.step(50, { sceneId: 'garden', walk: WALK });
  assert.strictEqual(inst.entries().length, 1);
});

let passed = 0;
let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`PASS ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${t.name}: ${err && err.stack ? err.stack : err}`);
    failed++;
  }
}

console.log(`Summary: ${passed}/${tests.length} passed`);
process.exit(failed > 0 ? 1 : 0);
