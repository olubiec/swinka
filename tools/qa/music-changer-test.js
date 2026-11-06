// Radio (background music changer): unlock rule and slot list. Pure functions only (no DOM).
// Run: node tools/qa/music-changer-test.js
'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const Changer = require(path.join(ROOT, 'web', 'home', 'features', 'music', 'changer.js'));
const Prices = require(path.join(ROOT, 'web', 'home', 'features', 'music', 'prices.js'));
const tracks = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'music', 'tracks.json'), 'utf8'));

const STARTER = Prices.STARTER_PLAYER;
const cases = [];
const test = (name, fn) => cases.push({ name, fn });

test('starter player only: radio stays locked', () => {
  assert.strictEqual(Changer.hasBoughtPlayer({ playerOwned: [STARTER], playerPlaced: {} }), false);
  assert.strictEqual(Changer.hasBoughtPlayer({ playerOwned: [], playerPlaced: { living: STARTER } }), false);
});

test('empty or broken save: locked, no throw', () => {
  assert.strictEqual(Changer.hasBoughtPlayer(undefined), false);
  assert.strictEqual(Changer.hasBoughtPlayer(null), false);
  assert.strictEqual(Changer.hasBoughtPlayer({}), false);
  assert.strictEqual(Changer.hasBoughtPlayer({ playerOwned: 'nope', playerPlaced: 5 }), false);
});

test('any other player owned: unlocked', () => {
  assert.strictEqual(Changer.hasBoughtPlayer({ playerOwned: [STARTER, 'player_boombox'], playerPlaced: {} }), true);
});

test('other player placed in a room (not owned): unlocked', () => {
  assert.strictEqual(Changer.hasBoughtPlayer({ playerOwned: [], playerPlaced: { kitchen: 'player_portable' } }), true);
});

test('starter placed plus a bought player: unlocked', () => {
  const save = { playerOwned: [], playerPlaced: { living: STARTER, bedroom: 'player_gramophone' } };
  assert.strictEqual(Changer.hasBoughtPlayer(save), true);
});

test('slots: four Home slots in order, labels and hours', () => {
  assert.deepStrictEqual(Changer.SLOTS.map((s) => s.id), ['morning', 'day', 'evening', 'night']);
  assert.strictEqual(Changer.slotInfo('night').hours, '21–5');
  assert.strictEqual(Changer.slotInfo('nope'), null);
});

test('every slot has at least 3 ambient tracks in tracks.json (shuffle needs a choice)', () => {
  for (const s of Changer.SLOTS) {
    const n = tracks.filter((t) => t.use === 'ambient' && t.slot === s.id).length;
    assert.ok(n >= 3, s.id + ' has ' + n + ' ambient tracks');
  }
});

test('the first 5 entries (record pool) are unchanged in position', () => {
  assert.deepStrictEqual(tracks.slice(0, 5).map((t) => t.id), ['games_1', 'games_2', 'games_boss', 'menu', 'calm']);
});

test('every ambient track has a slot and a file that exists', () => {
  for (const t of tracks.filter((x) => x.use === 'ambient')) {
    assert.ok(Changer.SLOTS.some((s) => s.id === t.slot), t.id + ' has a known slot');
    assert.ok(fs.existsSync(path.join(ROOT, 'assets', t.file)), t.id + ' file exists');
  }
});

let failed = 0;
for (const c of cases) {
  try {
    c.fn();
    console.log('ok   ' + c.name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + c.name + '\n     ' + e.message);
  }
}
console.log('music-changer-test: ' + (cases.length - failed) + ' passed' + (failed ? ', ' + failed + ' FAILED' : ''));
process.exit(failed ? 1 : 0);
