// Unit test: music economy (A6): prices (prices.js, parity with C#), the purchase message (C# checks the balance),
// the starter player once, old saves, the shop items and the queue fed into the mini player engine (world.syncEngine).
// Usage: node tools/qa/music-economy-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MUSIC = path.join(ROOT, 'web', 'home', 'features', 'music');
const Prices = require(path.join(MUSIC, 'prices.js'));
const Economy = require(path.join(MUSIC, 'economy.js'));
const World = require(path.join(MUSIC, 'world.js'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'records', 'manifest.json'), 'utf8'));
const design = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'records', 'players_design.json'), 'utf8'));

const common = manifest.records.find((r) => r.rarity === 'common');
const rare = manifest.records.find((r) => r.rarity === 'rare');
const unique = manifest.records.find((r) => r.rarity === 'unique');
assert.ok(common && rare && unique, 'manifest has common, rare and unique records');

const tests = {
  'prices: records 40-80 (common) and 150-300 (rare), unique at the rare price'() {
    assert.ok(Prices.recordPrice('common') >= 40 && Prices.recordPrice('common') <= 80);
    assert.ok(Prices.recordPrice('rare') >= 150 && Prices.recordPrice('rare') <= 300);
    assert.strictEqual(Prices.recordPrice(unique.rarity), 150);
    assert.strictEqual(Prices.recordPrice('nonsense'), null);
  },
  'prices: six players 120 / 200 / 400 / 600 / 900 / 1400 in design order'() {
    const ids = Object.keys(design.players);
    assert.strictEqual(ids.length, 6);
    assert.deepStrictEqual(ids.map((id) => Prices.playerPrice(id)).sort((a, b) => a - b),
      [120, 200, 400, 600, 900, 1400]);
    assert.strictEqual(Prices.playerPrice('player_unknown'), null);
  },
  'buy sends musicBuy with kind and itemId to C# and changes no balance here'() {
    const sent = [];
    global.window = { bridge: { send(m) { sent.push(m); } } };
    try {
      assert.strictEqual(Economy.buy({ music: { kind: 'record', itemId: common.id } }), true);
      assert.strictEqual(Economy.buy({ music: { kind: 'player', itemId: 'player_portable' } }), true);
    } finally {
      delete global.window;
    }
    assert.deepStrictEqual(sent, [
      { type: 'musicBuy', kind: 'record', itemId: common.id },
      { type: 'musicBuy', kind: 'player', itemId: 'player_portable' }
    ]);
  },
  'buy without a bridge or an item does nothing'() {
    assert.strictEqual(Economy.buy(null), false);
    assert.strictEqual(Economy.buy({ id: 'x' }), false, 'an item without music fields is not bought');
  },
  'prices.js has the same numbers as C# MusicPrices.cs (parity, TODO-D3)'() {
    const cs = fs.readFileSync(path.join(ROOT, 'src', 'Cuy.Core', 'Music', 'MusicPrices.cs'), 'utf8');
    const recordsPart = cs.slice(cs.indexOf('RecordPriceByRarity'), cs.indexOf('PlayerPriceById'));
    const playersPart = cs.slice(cs.indexOf('PlayerPriceById'));
    const pairs = (text) => Array.from(text.matchAll(/\{ "(\w+)", (\d+) \}/g)).map((m) => [m[1], Number(m[2])]);
    const csRecords = pairs(recordsPart);
    const csPlayers = pairs(playersPart);
    assert.ok(csRecords.length >= 2 && csPlayers.length === 6, 'C# table found');
    assert.deepStrictEqual(csRecords, Object.entries(Prices.RECORD_PRICE));
    assert.deepStrictEqual(csPlayers, Object.entries(Prices.PLAYER_PRICE));
  },
  'starter player is granted once to a new save'() {
    const s = Economy.starterSave({});
    assert.deepStrictEqual(s.playerOwned, ['player_turntable']);
    assert.strictEqual(s.musicVersion, 1);
    const again = Economy.starterSave(s);
    assert.deepStrictEqual(again.playerOwned, ['player_turntable'], 'no duplicate on the next load');
  },
  'old save without music fields gets the starter once and keeps its other fields'() {
    const s = Economy.starterSave({ clovers: 42, name: 'Ala', playerOwned: 'bad' });
    assert.deepStrictEqual(s.playerOwned, ['player_turntable']);
    assert.strictEqual(s.clovers, 42);
    assert.strictEqual(s.name, 'Ala');
  },
  'starter is not granted again when the player was picked up or placed'() {
    const placed = Economy.starterSave({ playerPlaced: { room1: 'player_turntable' } });
    assert.deepStrictEqual(placed.playerOwned, [], 'a placed starter is not added to owned');
    const owned = Economy.starterSave({ playerOwned: ['player_turntable'], musicVersion: 0 });
    assert.deepStrictEqual(owned.playerOwned, ['player_turntable']);
  },
  'bad input does not throw'() {
    assert.deepStrictEqual(Economy.starterSave(null).playerOwned, ['player_turntable']);
    assert.strictEqual(Economy.buy(undefined), false);
  },
  'shop items: players with price, owned flag and the purchase message'() {
    const list = World.setDesign(design) && World.getPlayers();
    const items = Economy.shopItems({ music: { playerOwned: ['player_portable'] } }, list);
    const portable = items.find((i) => i.music.itemId === 'player_portable');
    assert.strictEqual(portable.price, 200);
    assert.strictEqual(portable.owned, 1);
    assert.deepStrictEqual(portable.music, { kind: 'player', itemId: 'player_portable' });
    assert.strictEqual(items.find((i) => i.music.itemId === 'player_jukebox').price, 1400);
    assert.strictEqual(items.length, 6, 'records come from the browser manifest, not in Node');
  },
  'queue: records reach the mini player engine through syncEngine'() {
    const engine = { q: null, setQueue(q) { this.q = q; return q.length; } };
    const save = Economy.starterSave({ records: { [common.id]: 1 }, playerPlaced: { room1: 'player_turntable' } });
    World.syncEngine(engine, save);
    assert.deepStrictEqual(engine.q, [common.id]);
    const none = { q: null, setQueue(q) { this.q = q; return q.length; } };
    World.syncEngine(none, { records: { [common.id]: 1 } });
    assert.deepStrictEqual(none.q, [common.id], 'no placed player: the queue still plays (A8)');
  }
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log('ok   ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + '\n     ' + e.message);
  }
}
if (failed) {
  console.log(failed + ' failed');
  process.exit(1);
}
console.log('music-economy-test: ' + Object.keys(tests).length + ' passed');
