// Unit test: room players (A5, features/music/world.js). Placing and picking up, old saves, the six entries from
// players_design.json, the record queue, the sound gate on the engine and the room draw (mock ctx, no DOM).
// Usage: node tools/qa/music-world-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const World = require(path.join(ROOT, 'web', 'home', 'features', 'music', 'world.js'));
const design = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'records', 'players_design.json'), 'utf8'));

// 1. Six entries from the design file, cheapest first, with existing sprite files.
assert.strictEqual(World.setDesign(design), 6);
const list = World.getPlayers();
assert.strictEqual(list.length, 6);
assert.deepStrictEqual(list.map((p) => p.id), [
  'player_turntable', 'player_portable', 'player_gramophone', 'player_cassette', 'player_boombox', 'player_jukebox'
]);
assert.deepStrictEqual(list.map((p) => p.price), [0, 120, 300, 450, 700, 1200]);
for (const p of list) {
  const f = World.spriteFiles(p.id);
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', f.off)), 'missing sprite ' + f.off);
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', f.on)), 'missing sprite ' + f.on);
}
assert.strictEqual(World.setDesign({}), 0, 'a file without players gives no entries');
World.setDesign(design);

// 2. Old save without the music fields: nothing stands, no sound, empty queue.
const old = { coins: 5, pigs: [] };
assert.deepStrictEqual(World.placedList(old), []);
assert.strictEqual(World.canPlayMusic(old), false);
assert.deepStrictEqual(World.recordQueue(old), []);
assert.strictEqual(World.placePlayer(old, 'home', 'player_turntable'), null, 'not owned yet');
assert.strictEqual(World.pickUpPlayer(old, 'home'), null);
// Wrong types in the music fields are read as empty.
const bad = { playerPlaced: 5, playerOwned: 'x', records: [] };
assert.deepStrictEqual(World.placedList(bad), []);
assert.deepStrictEqual(World.recordQueue(bad), []);

// 3. Place and pick up: owned -> placed -> owned.
let save = { playerOwned: ['player_turntable', 'player_boombox'], playerPlaced: {}, records: { s1_cichy: 1 } };
save = World.placePlayer(save, 'home', 'player_turntable');
assert.ok(save, 'place should succeed');
assert.deepStrictEqual(save.playerOwned, ['player_boombox']);
assert.deepStrictEqual(save.playerPlaced, { home: 'player_turntable' });
assert.deepStrictEqual(World.placedList(save), [{ roomId: 'home', playerId: 'player_turntable' }]);
assert.strictEqual(World.placePlayer(save, 'home', 'player_boombox'), null, 'room already has a player');
assert.strictEqual(World.placePlayer(save, 'kitchen', 'player_turntable'), null, 'not owned any more');
assert.strictEqual(World.placePlayer(save, 'kitchen', 'player_unknown'), null, 'unknown player');
assert.strictEqual(World.placePlayer(save, '', 'player_boombox'), null, 'empty room id');
const picked = World.pickUpPlayer(save, 'home');
assert.deepStrictEqual(picked.playerPlaced, {});
assert.deepStrictEqual(picked.playerOwned, ['player_boombox', 'player_turntable']);
assert.strictEqual(World.pickUpPlayer(picked, 'home'), null);
// Input is not changed.
assert.deepStrictEqual(save.playerOwned, ['player_boombox']);

// 4. Queue from records (count > 0, sorted); sound only with a placed player.
const rec = { records: { s1_nocna: 1, s1_cichy: 2, s1_kubek: 0 } };
assert.deepStrictEqual(World.recordQueue(rec), ['s1_cichy', 's1_nocna']);
assert.strictEqual(World.canPlayMusic(rec), false, 'no hardware, no sound');
const withPlayer = Object.assign({}, rec, { playerOwned: [], playerPlaced: { home: 'player_jukebox' } });
assert.strictEqual(World.canPlayMusic(withPlayer), true);
assert.strictEqual(World.canPlayMusic(Object.assign({}, withPlayer, { records: {} })), false, 'no records, no sound');
// Placed id that is not in the design is ignored.
assert.strictEqual(World.canPlayMusic(Object.assign({}, rec, { playerPlaced: { home: 'player_x' } })), false);

// 5. Engine sync: queue goes to the engine only with a placed player; same state does not reset it.
function fakeEngine() {
  return { calls: [], setQueue(q) { this.calls.push(q.slice()); return q.length; } };
}
const eng = fakeEngine();
World.syncEngine(eng, rec);
assert.deepStrictEqual(eng.calls[eng.calls.length - 1], [], 'silent without hardware');
World.syncEngine(eng, withPlayer);
assert.deepStrictEqual(eng.calls[eng.calls.length - 1], ['s1_cichy', 's1_nocna']);
const count = eng.calls.length;
World.syncEngine(eng, withPlayer);
assert.strictEqual(eng.calls.length, count, 'unchanged state is not sent again');
World.syncEngine(eng, Object.assign({}, withPlayer, { playerPlaced: {} }));
assert.deepStrictEqual(eng.calls[eng.calls.length - 1], [], 'picked up, silent again');

// 6. Room draw with a mock ctx: sprite per placed player, animation frames only while playing.
function img(w, h) { return { complete: true, naturalWidth: w, naturalHeight: h }; }
function mockCtx() {
  const calls = [];
  return { calls, drawImage(...args) { calls.push(args); } };
}
const sheets = {
  player_turntable: { off: img(32, 16), on: img(128, 16) },
  player_jukebox: { off: img(32, 32), on: img(128, 32) }
};
const sheetOf = (id) => sheets[id] || { off: { complete: false, naturalWidth: 0 } };
const sceneOff = { state: { playerPlaced: { home: 'player_turntable', kitchen: 'player_jukebox' }, records: {} } };
let ctx = mockCtx();
assert.strictEqual(World.drawPlayers(ctx, sceneOff, sheetOf, 0), 2);
assert.strictEqual(ctx.calls[0][0], sheets.player_turntable.off, 'static sprite without records');
assert.strictEqual(ctx.calls[0][1], 12);
assert.strictEqual(ctx.calls[0][2], 119 - 16, 'bottom on the floor line');
assert.strictEqual(ctx.calls[1][1], 52, 'second player at the second spot');
const sceneOn = { state: { playerPlaced: sceneOff.state.playerPlaced, records: { s1_cichy: 1 } } };
ctx = mockCtx();
World.drawPlayers(ctx, sceneOn, sheetOf, 260); // frame 1 of 4
assert.strictEqual(ctx.calls[0][0], sheets.player_turntable.on);
assert.deepStrictEqual(ctx.calls[0].slice(1, 5), [32, 0, 32, 16], 'animated frame cut from the on sheet');
// Old save and empty room: nothing is drawn, no throw.
ctx = mockCtx();
assert.strictEqual(World.drawPlayers(ctx, { state: old }, sheetOf, 0), 0);
assert.strictEqual(World.drawPlayers(ctx, { state: {} }, sheetOf, 0), 0);
assert.strictEqual(World.drawPlayers(ctx, undefined, sheetOf, 0), 0);
assert.strictEqual(ctx.calls.length, 0);

console.log('music-world-test: OK (6 players, placing, old save, queue, engine gate, room draw)');
