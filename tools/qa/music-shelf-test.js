// Unit test: record shelf model (A3): slot count from the manifest, states, empty save, icon classes.
// No DOM. Usage: node tools/qa/music-shelf-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHELF = require(path.join(ROOT, 'web', 'home', 'features', 'music', 'shelf.js'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'records', 'manifest.json'), 'utf8'));
const iconsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'icons', 'icons.json'), 'utf8'));
const iconKeys = Object.keys(iconsRaw.icons || iconsRaw);
const styleCss = fs.readFileSync(path.join(ROOT, 'web', 'home', 'style.css'), 'utf8');
const FIRST = manifest.records[0].id;
const SECOND = manifest.records[1].id;

const tests = {
  'one card per manifest record (24), grouped into 4 series rows of 6'() {
    const m = SHELF.buildShelfModel(manifest, {}, '');
    assert.strictEqual(m.total, 24);
    assert.strictEqual(m.cards.length, manifest.records.length);
    assert.strictEqual(m.rows.length, 4);
    for (const row of m.rows) assert.strictEqual(row.cards.length, 6);
  },
  'empty or missing save: every slot locked, hint shown, no throw'() {
    for (const save of [undefined, null, 'x', [], {}, { records: 'bad' }]) {
      const m = SHELF.buildShelfModel(manifest, save, '');
      assert.strictEqual(m.ownedCount, 0);
      assert.strictEqual(m.empty, true);
      assert.strictEqual(m.hint, SHELF.EMPTY_HINT);
      assert.ok(m.cards.every((c) => c.state === 'locked'));
      assert.strictEqual(m.total, 24);
    }
  },
  'owned records come from save.records count >= 1 and hide the hint'() {
    const m = SHELF.buildShelfModel(manifest, { records: { [FIRST]: 2, [SECOND]: 0 } }, '');
    const byId = Object.fromEntries(m.cards.map((c) => [c.id, c]));
    assert.strictEqual(byId[FIRST].state, 'owned');
    assert.strictEqual(byId[FIRST].count, 2);
    assert.strictEqual(byId[SECOND].state, 'locked');
    assert.strictEqual(m.ownedCount, 1);
    assert.strictEqual(m.empty, false);
    assert.strictEqual(m.hint, '');
  },
  'bad record counts are dropped by the contract, slot stays locked'() {
    const m = SHELF.buildShelfModel(manifest, { records: { [FIRST]: -1, [SECOND]: 1.5, s9_unknown: 3 } }, '');
    assert.strictEqual(m.ownedCount, 0);
    assert.strictEqual(m.total, 24);
  },
  'playing record is owned and gets the playing state; other owned stay owned'() {
    const save = { records: { [FIRST]: 1, [SECOND]: 1 } };
    const m = SHELF.buildShelfModel(manifest, save, SECOND);
    const byId = Object.fromEntries(m.cards.map((c) => [c.id, c]));
    assert.strictEqual(byId[SECOND].state, 'playing');
    assert.strictEqual(byId[SECOND].stateLabel, 'playing');
    assert.strictEqual(byId[FIRST].state, 'owned');
    assert.strictEqual(m.ownedCount, 2);
  },
  'playing a record the player does not own does not unlock it'() {
    const m = SHELF.buildShelfModel(manifest, { records: {} }, FIRST);
    assert.ok(m.cards.every((c) => c.state === 'locked'));
  },
  'manifest missing or malformed: empty model, no throw'() {
    for (const bad of [null, undefined, {}, { records: 'x' }, { records: [null, 5, { name: 'no id' }] }]) {
      const m = SHELF.buildShelfModel(bad, {}, '');
      assert.strictEqual(m.total, 0);
      assert.deepStrictEqual(m.rows, []);
      assert.strictEqual(m.empty, true);
    }
  },
  'every manifest icon maps to an atlas id and a CSS class in style.css'() {
    for (const card of SHELF.buildShelfModel(manifest, {}, '').cards) {
      const iconId = manifest.records.find((r) => r.id === card.id).icon;
      assert.ok(iconKeys.includes(iconId), 'atlas lacks ' + iconId);
      assert.ok(styleCss.includes('.' + card.iconClass + ' {'), 'style.css lacks .' + card.iconClass);
    }
  },
  'iconClassFor rejects anything that is not a record icon id'() {
    assert.strictEqual(SHELF.iconClassFor(undefined), '');
    assert.strictEqual(SHELF.iconClassFor('../x'), '');
    assert.strictEqual(SHELF.iconClassFor('rec_s1_poranek'), 'icon-rec-s1-poranek');
  }
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log('ok   - ' + name);
  } catch (err) {
    failed++;
    console.log('FAIL - ' + name + '\n       ' + (err && err.message));
  }
}
console.log(failed === 0 ? `music-shelf-test: ${Object.keys(tests).length} passed` : `music-shelf-test: ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
