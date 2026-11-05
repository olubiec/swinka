// Unit test: music save migration/validation and D2 track mapping (no browser).
// Usage: node tools/qa/music-contract-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const C = require(path.join(ROOT, 'web', 'home', 'features', 'music', 'contract.js'));
const tracks = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'music', 'tracks.json'), 'utf8'));

const tests = {
  'missing fields give empty equipment and keep the rest of the save'() {
    const m = C.migrateMusicSave({ clovers: 42, name: 'Ala' });
    assert.deepStrictEqual(m.records, {});
    assert.deepStrictEqual(m.playerOwned, []);
    assert.deepStrictEqual(m.playerPlaced, {});
    assert.strictEqual(m.clovers, 42);
    assert.strictEqual(m.name, 'Ala');
  },
  'null, array or non-object save does not throw'() {
    for (const bad of [null, undefined, 5, 'x', []]) {
      const m = C.migrateMusicSave(bad);
      assert.deepStrictEqual(m, { records: {}, playerOwned: [], playerPlaced: {} });
    }
  },
  'wrong types fall back to defaults'() {
    const m = C.migrateMusicSave({ records: 'x', playerOwned: {}, playerPlaced: [1], clovers: 7 });
    assert.deepStrictEqual(m.records, {});
    assert.deepStrictEqual(m.playerOwned, []);
    assert.deepStrictEqual(m.playerPlaced, {});
    assert.strictEqual(m.clovers, 7);
  },
  'null fields give empty values'() {
    const m = C.migrateMusicSave({ records: null, playerOwned: null, playerPlaced: null });
    assert.deepStrictEqual(m, { records: {}, playerOwned: [], playerPlaced: {} });
  },
  'bad entries are dropped, good ones kept'() {
    const m = C.migrateMusicSave({
      records: { disc_a: 2, disc_b: '3', disc_c: -1, disc_d: 1.5, disc_e: 0, disc_f: 3 },
      playerOwned: ['disc_a', 1, 'disc_a', '', 'disc_b', null],
      playerPlaced: { salon: 'disc_a', bedroom: 5, '': 'disc_b', hall: '' }
    });
    assert.deepStrictEqual(m.records, { disc_a: 2, disc_f: 3 });
    assert.deepStrictEqual(m.playerOwned, ['disc_a', 'disc_b']);
    assert.deepStrictEqual(m.playerPlaced, { salon: 'disc_a' });
  },
  'migration is idempotent'() {
    const once = C.migrateMusicSave({ records: { a: 1 }, playerOwned: ['a'], playerPlaced: { r: 'a' } });
    assert.deepStrictEqual(C.migrateMusicSave(once), once);
  },
  'hash is pinned (FNV-1a) so the track mapping never shifts'() {
    assert.strictEqual(C.hashId(''), 0x811c9dc5);
    assert.strictEqual(C.hashId('a'), 0xe40c292c);
  },
  'trackForRecord is deterministic and maps into the 5-file pool'() {
    assert.strictEqual(C.TRACK_POOL_SIZE, 5);
    const first = C.trackForRecord('disc_rock_01', tracks);
    assert.deepStrictEqual(C.trackForRecord('disc_rock_01', tracks), first);
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const t = C.trackForRecord('disc_' + i, tracks);
      assert.ok(tracks.slice(0, 5).includes(t), 'track must come from the first 5 entries');
      seen.add(t.id);
    }
    assert.strictEqual(seen.size, 5, 'all five tracks are reachable');
  },
  'trackForRecord returns null for bad input'() {
    assert.strictEqual(C.trackForRecord('', tracks), null);
    assert.strictEqual(C.trackForRecord(null, tracks), null);
    assert.strictEqual(C.trackForRecord('disc_a', []), null);
    assert.strictEqual(C.trackForRecord('disc_a', null), null);
  }
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + e.message); }
}
console.log(failed ? failed + ' failed' : 'all ' + Object.keys(tests).length + ' passed');
process.exit(failed ? 1 : 0);
