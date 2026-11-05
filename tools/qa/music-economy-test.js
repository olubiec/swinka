// Unit test: music economy (A6): prices (prices.js), buying records and players with clovers, the starter
// player once, old saves, the shop items and the queue fed into the mini player engine (world.syncEngine).
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
  'prices: records 40-80 (common) and 150-300 (rare), unique not for sale'() {
    assert.ok(Prices.recordPrice('common') >= 40 && Prices.recordPrice('common') <= 80);
    assert.ok(Prices.recordPrice('rare') >= 150 && Prices.recordPrice('rare') <= 300);
    assert.strictEqual(Prices.recordPrice(unique.rarity), null);
    assert.strictEqual(Prices.recordPrice('nonsense'), null);
  },
  'prices: six players 120 / 250 / 400 / 600 / 900 / 1400 in design order'() {
    const ids = Object.keys(design.players);
    assert.strictEqual(ids.length, 6);
    assert.deepStrictEqual(ids.map((id) => Prices.playerPrice(id)).sort((a, b) => a - b),
      [120, 250, 400, 600, 900, 1400]);
    assert.strictEqual(Prices.playerPrice('player_unknown'), null);
  },
  'buying a record subtracts the price and adds one copy'() {
    const r = Economy.buyRecord({}, 100, common.id, 'common');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.clovers, 100 - Prices.recordPrice('common'));
    assert.strictEqual(r.save.records[common.id], 1);
    const again = Economy.buyRecord(r.save, 1000, common.id, 'common');
    assert.strictEqual(again.save.records[common.id], 2, 'a second copy counts up');
  },
  'no funds blocks the record purchase and changes nothing'() {
    const price = Prices.recordPrice('common');
    const r = Economy.buyRecord({ records: {} }, price - 1, common.id, 'common');
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'no_funds');
    assert.strictEqual(r.clovers, price - 1);
    assert.strictEqual(r.save, null);
  },
  'unique record is not for sale'() {
    const r = Economy.buyRecord({}, 99999, unique.id, unique.rarity);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'not_for_sale');
  },
  'buying a player subtracts the price, owns it once and blocks the second buy'() {
    const r = Economy.buyPlayer({ playerOwned: [] }, 500, 'player_portable');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.clovers, 250);
    assert.deepStrictEqual(r.save.playerOwned, ['player_portable']);
    const dup = Economy.buyPlayer(r.save, r.clovers, 'player_portable');
    assert.strictEqual(dup.reason, 'owned');
    const placed = Economy.buyPlayer({ playerPlaced: { room1: 'player_portable' } }, 500, 'player_portable');
    assert.strictEqual(placed.reason, 'owned', 'a placed player counts as owned');
    assert.strictEqual(Economy.buyPlayer({}, 249, 'player_portable').reason, 'no_funds');
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
    assert.strictEqual(Economy.buyRecord(null, NaN, common.id, 'common').ok, false);
    assert.strictEqual(Economy.buyPlayer(undefined, 1e9, 'player_jukebox').ok, true);
  },
  'shop items: players with price, owned flag and the purchase message'() {
    const list = World.setDesign(design) && World.getPlayers();
    const items = Economy.shopItems({ music: { playerOwned: ['player_portable'] } }, list);
    const portable = items.find((i) => i.music.itemId === 'player_portable');
    assert.strictEqual(portable.price, 250);
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
    assert.deepStrictEqual(none.q, [], 'no placed player: silent queue');
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
