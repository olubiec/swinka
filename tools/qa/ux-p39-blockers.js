#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { checkBlockers, checkPlaceScenes } = require('./place-scenes-check');

const repoRoot = path.resolve(__dirname, '../..');
const jsonPath = path.join(repoRoot, 'assets/data/place_scenes.json');

console.log('--- Running UX-P39 Blockers Tests ---');

// 1. Check real data from assets/data/place_scenes.json
assert(fs.existsSync(jsonPath), `place_scenes.json must exist at ${jsonPath}`);
const realData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const realResult = checkPlaceScenes(realData);
assert.strictEqual(realResult.allPassed, true, `Real data should pass all checks, failed: ${JSON.stringify(realResult.failures)}`);
for (const rule of ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']) {
  assert.strictEqual(realResult.results[rule], true, `Real data should pass ${rule}`);
}
console.log('PASS 1: place_scenes.json data passes all B1-B6 and C1-C7 checks');

// Helper to clone data
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 2. Invalid fixture 1: Overlapping spawn (must be rejected by B2)
const fixtureSpawn = clone(realData);
const gardenWalk = fixtureSpawn.scenes.garden.walk;
const gardenMidY = Math.floor((gardenWalk[1] + gardenWalk[3]) / 2);
fixtureSpawn.scenes.garden.blockers.push({
  id: 'overlapping_spawn_test',
  rect: [6, gardenMidY - 2, 10, gardenMidY + 2]
});

const spawnResult = checkBlockers(fixtureSpawn);
assert.strictEqual(spawnResult.allPassed, false, 'Overlapping spawn fixture must be rejected');
assert.strictEqual(spawnResult.results.B2, false, 'Overlapping spawn fixture must fail rule B2');
assert(spawnResult.failures.B2.length > 0, 'Rule B2 must report failure message');
console.log(`PASS 2: Overlapping spawn fixture rejected by B2: ${spawnResult.failures.B2[0]}`);

// 3. Invalid fixture 2: Disconnected region (must be rejected by B4)
const fixtureDisconnect = clone(realData);
const [wx0, wy0, wx1, wy1] = fixtureDisconnect.scenes.garden.walk;
fixtureDisconnect.scenes.garden.blockers.push({
  id: 'wall_divider',
  rect: [120, wy0, 128, wy1]
});

const disconnectResult = checkBlockers(fixtureDisconnect);
assert.strictEqual(disconnectResult.allPassed, false, 'Disconnected region fixture must be rejected');
assert.strictEqual(disconnectResult.results.B4, false, 'Disconnected region fixture must fail rule B4');
assert(disconnectResult.failures.B4.length > 0, 'Rule B4 must report failure message');
console.log(`PASS 3: Disconnected region fixture rejected by B4: ${disconnectResult.failures.B4[0]}`);

// 4. Invalid fixture 3: Out of bounds (must be rejected by B1)
const fixtureOOB = clone(realData);
const [sw, sh] = fixtureOOB.scenes.garden.size;
fixtureOOB.scenes.garden.blockers.push({
  id: 'out_of_bounds_blocker',
  rect: [-10, 80, 20, 100]
});

const oobResult = checkBlockers(fixtureOOB);
assert.strictEqual(oobResult.allPassed, false, 'Out of bounds fixture must be rejected');
assert.strictEqual(oobResult.results.B1, false, 'Out of bounds fixture must fail rule B1');
assert(oobResult.failures.B1.length > 0, 'Rule B1 must report failure message');
console.log(`PASS 4: Out of bounds fixture rejected by B1: ${oobResult.failures.B1[0]}`);

// 5. Additional edge cases (rect order B6, duplicate ID B5)
const fixtureOrder = clone(realData);
fixtureOrder.scenes.garden.blockers.push({
  id: 'reversed_rect',
  rect: [50, 100, 40, 110]
});
const orderResult = checkBlockers(fixtureOrder);
assert.strictEqual(orderResult.results.B6, false, 'Reversed rect fixture must fail B6');
console.log('PASS 5: Invalid rect order fixture rejected by B6');

const fixtureDup = clone(realData);
fixtureDup.scenes.garden.blockers.push({
  id: 'fountain', // duplicate id
  rect: [10, 80, 20, 90]
});
const dupResult = checkBlockers(fixtureDup);
assert.strictEqual(dupResult.results.B5, false, 'Duplicate ID fixture must fail B5');
console.log('PASS 6: Duplicate blocker ID fixture rejected by B5');

console.log('All blocker tests passed successfully (data + invalid fixtures verified).');
