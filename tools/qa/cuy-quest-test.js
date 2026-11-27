const assert = require('assert');
const CuyQuestLogic = require('../../web/home/minigames/cuy-quest-logic.js');

assert.strictEqual(CuyQuestLogic.LEVELS.length, 12, 'Expected 12 levels in Cuy Quest');

for (let i = 0; i < CuyQuestLogic.LEVELS.length; i++) {
  const parsed = CuyQuestLogic.parseLevel(i);
  assert.strictEqual(parsed.def.id, i + 1, `Level ${i + 1} id mismatch`);
  assert(parsed.pigSpawns.kuki, `Level ${i + 1} missing Kuki spawn`);
  assert(parsed.pigSpawns.ned, `Level ${i + 1} missing Ned spawn`);
  assert(parsed.pigSpawns.glen, `Level ${i + 1} missing Glen spawn`);
  assert(parsed.stars.length === 3, `Level ${i + 1} should have 3 stars, got ${parsed.stars.length}`);
  assert(parsed.goal, `Level ${i + 1} missing goal`);
}

assert.strictEqual(CuyQuestLogic.calculateStars(3, 120), 3);
assert.strictEqual(CuyQuestLogic.calculateStars(2, 120), 2);
assert.strictEqual(CuyQuestLogic.calculateStars(1, 30), 2);
assert.strictEqual(CuyQuestLogic.calculateStars(0, 90), 1);

console.log('Cuy Quest logic tests passed (12/12 levels valid).');
