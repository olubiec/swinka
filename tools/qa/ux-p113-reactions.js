'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var PigReactions = require(path.resolve(__dirname, '../../web/home/lib/pig-reactions.js'));

var VALID_R41_ANIMS = [
  'idle', 'eat', 'eat_treat', 'party', 'popcorn', 'wake_up', 'purr_pet',
  'chin_rub', 'spin', 'stand_up', 'hurdle', 'sick', 'sad', 'scratch',
  'shiver', 'happy', 'chatter', 'greet', 'walk'
];

var TEN_EVENTS = [
  { type: 'feed', item: 'hay' },
  { type: 'treat', item: 'parsley' },
  { type: 'pet' },
  { type: 'chin' },
  { type: 'trick', trickId: 'spin' },
  { type: 'sick' },
  { type: 'poop' },
  { type: 'groom' },
  { type: 'sulk' },
  { type: 'birthday' }
];

var results = [];
function runCase(name, fn) {
  try {
    fn();
    results.push({ name: name, ok: true });
    console.log('PASS ' + name);
  } catch (err) {
    results.push({ name: name, ok: false, err: err });
    console.error('FAIL ' + name + ': ' + (err && err.stack ? err.stack : err));
  }
}

runCase('E1 every-event-has-reaction', function () {
  TEN_EVENTS.forEach(function (ev) {
    var res = PigReactions.react(ev, {});
    assert.ok(res && typeof res === 'object', 'reaction missing for ' + ev.type);
    assert.ok(VALID_R41_ANIMS.indexOf(res.anim) >= 0, 'invalid anim ' + res.anim + ' for ' + ev.type);
    assert.ok(typeof res.durationMs === 'number' && res.durationMs > 0);
    assert.strictEqual(res.interruptAutonomous, true);
  });
  var petWake = PigReactions.react('pet', { isSleeping: true });
  assert.strictEqual(petWake.anim, 'wake_up');
  var healed = PigReactions.react({ type: 'sick', healed: true }, {});
  assert.strictEqual(healed.anim, 'happy');
});

runCase('E2 priority-over-behavior', function () {
  var autoPri = PigReactions.PRIORITIES.autonomous;
  assert.strictEqual(autoPri, 30);
  TEN_EVENTS.forEach(function (ev) {
    var res = PigReactions.react(ev, {});
    assert.ok(res.priority >= 50 && res.priority > autoPri, ev.type + ' must outrank autonomous');
    assert.strictEqual(PigReactions.canInterrupt(autoPri, res), true);
  });
  assert.strictEqual(
    PigReactions.canInterrupt(PigReactions.PRIORITIES.sulk, PigReactions.react('pet', {})),
    false
  );
});

runCase('E3 sick-blocks-run-and-hop', function () {
  var sickCtx = { isSick: true, sicknessAnim: 'shiver', favoriteFood: 'bell_pepper' };
  ['run', 'popcorn', 'hurdle', 'spin', 'greet'].forEach(function (anim) {
    assert.strictEqual(PigReactions.isBlockedBySickness(anim, sickCtx), true);
    assert.strictEqual(PigReactions.isBlockedBySickness(anim, { isSick: false }), false);
  });
  assert.strictEqual(PigReactions.isBlockedBySickness('walk', sickCtx), false);

  var trickRes = PigReactions.react({ type: 'trick', trickId: 'popcorn' }, sickCtx);
  assert.strictEqual(trickRes.blocked, true);
  assert.strictEqual(trickRes.anim, 'shiver');

  var favTreatSick = PigReactions.react({ type: 'treat', item: 'bell_pepper' }, sickCtx);
  assert.notStrictEqual(favTreatSick.anim, 'popcorn');
  assert.strictEqual(favTreatSick.anim, 'eat_treat');

  var playSick = PigReactions.react('play', sickCtx);
  assert.strictEqual(playSick.blocked, true);
  assert.strictEqual(playSick.anim, 'shiver');
});

runCase('E4 sulk-ignores-pet-for-time', function () {
  var eightClicks = [100, 400, 700, 1000, 1300, 1600, 1900, 2200];
  var nineClicks = eightClicks.concat([2500]);
  assert.strictEqual(PigReactions.detectSulk(eightClicks, 2600).triggered, false);
  var sulkState = PigReactions.detectSulk(nineClicks, 2600);
  assert.strictEqual(sulkState.triggered, true);
  assert.strictEqual(sulkState.recent.length, 9);

  // After 3000ms window passes, old clicks expire
  var afterWindow = PigReactions.detectSulk(nineClicks, 6000);
  assert.strictEqual(afterWindow.triggered, false);
  assert.strictEqual(afterWindow.recent.length, 0);

  ['pet', 'chin', 'call', { type: 'trick', trickId: 'spin' }].forEach(function (ev) {
    var r = PigReactions.react(ev, { isSulking: true });
    assert.strictEqual(r.anim, 'chatter');
    assert.strictEqual(r.blocked, true);
    assert.strictEqual(r.sound, 'chatter');
    assert.strictEqual(r.bubble, 'Hmph!');
  });
});

runCase('E5 treat-vs-hay-different-anim', function () {
  var hay = PigReactions.react({ type: 'feed', item: 'hay' }, {});
  var treat = PigReactions.react({ type: 'treat', item: 'parsley' }, {});
  var favTreat = PigReactions.react({ type: 'treat', item: 'parsley' }, { favoriteFood: 'parsley' });
  var cake = PigReactions.react({ type: 'feed', item: 'cake' }, {});
  var full = PigReactions.react({ type: 'feed', item: 'hay' }, { fullness: 95 });

  assert.strictEqual(hay.anim, 'eat');
  assert.strictEqual(treat.anim, 'eat_treat');
  assert.strictEqual(favTreat.anim, 'popcorn');
  assert.strictEqual(cake.anim, 'party');
  assert.strictEqual(full.anim, 'idle');
  assert.strictEqual(full.blocked, true);
  assert.notStrictEqual(treat.anim, hay.anim);
  assert.notStrictEqual(favTreat.anim, hay.anim);
  assert.notStrictEqual(cake.anim, hay.anim);
});

runCase('E6 trick-id-mapped', function () {
  var tricksPath = path.resolve(__dirname, '../../assets/data/tricks.json');
  var tricksData = JSON.parse(fs.readFileSync(tricksPath, 'utf8'));
  assert.ok(Array.isArray(tricksData.tricks) && tricksData.tricks.length > 0);
  tricksData.tricks.forEach(function (t) {
    var r = PigReactions.react({ type: 'trick', trickId: t.id }, {});
    assert.strictEqual(r.anim, t.id);
    assert.strictEqual(r.bubble, 'Ta-da!');
    assert.strictEqual(r.effect, 'sparkles');
    assert.strictEqual(r.sound, t.id === 'popcorn' ? 'pop' : 'fanfare');
  });
  var fallback = PigReactions.react({ type: 'trick', trickId: 'unknown_trick' }, {});
  assert.strictEqual(fallback.anim, 'popcorn');
  assert.strictEqual(fallback.sound, 'pop');
});

runCase('E7 bubble-and-sound-present', function () {
  TEN_EVENTS.forEach(function (ev) {
    var r = PigReactions.react(ev, {});
    assert.strictEqual(typeof r.bubble, 'string');
    assert.ok(r.bubble.length > 0, ev.type + ' needs non-empty bubble');
    assert.strictEqual(typeof r.sound, 'string');
    assert.ok(r.sound.length > 0, ev.type + ' needs non-empty sound');
  });
});

runCase('E8 repeat-spam-throttled', function () {
  var accepted = [];
  var lastAt = null;
  for (var t = 0; t < 500; t += 50) {
    var r = PigReactions.react('pet', { nowMs: t, lastReactionAtMs: lastAt, cooldownMs: 600 });
    if (r) {
      accepted.push(r);
      lastAt = t;
    }
  }
  assert.strictEqual(accepted.length, 1, '10 pets in 500ms must emit only 1 reaction');
  var afterCooldown = PigReactions.react('pet', { nowMs: 650, lastReactionAtMs: lastAt, cooldownMs: 600 });
  assert.ok(afterCooldown && afterCooldown.anim === 'purr_pet');
  assert.strictEqual(PigReactions.isThrottled(0, 450, 600), true);
  assert.strictEqual(PigReactions.isThrottled(0, 600, 600), false);
});

runCase('E9 deterministic', function () {
  var a = PigReactions.react({ type: 'treat', item: 'kale' }, { favoriteFood: 'kale', isSick: false });
  var b = PigReactions.react({ type: 'treat', item: 'kale' }, { favoriteFood: 'kale', isSick: false });
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual(
    PigReactions.detectSulk([100, 200, 300], 500),
    PigReactions.detectSulk([100, 200, 300], 500)
  );
  assert.strictEqual(
    PigReactions.isBlockedBySickness('spin', { isSick: true }),
    PigReactions.isBlockedBySickness('spin', { isSick: true })
  );
});

runCase('E10 bad-input', function () {
  var bad = [null, undefined, NaN, Infinity, -1, 42, {}, [], '', { type: '__proto__' }, { type: 'unknown_ev' }];
  bad.forEach(function (v) {
    assert.strictEqual(PigReactions.react(v, v), null);
    assert.strictEqual(PigReactions.canInterrupt(v, v), false);
    assert.strictEqual(PigReactions.isBlockedBySickness(v, v), false);
    if (v === 42) {
      assert.strictEqual(PigReactions.isThrottled(v, v, v), true);
    } else {
      assert.strictEqual(PigReactions.isThrottled(v, v, v), false);
    }
  });
  assert.deepStrictEqual(PigReactions.detectSulk(null, NaN), { triggered: false, recent: [] });
  assert.strictEqual(
    PigReactions.react({ type: 'trick', trickId: '__proto__' }, {}).anim,
    'popcorn'
  );
});

var failed = results.filter(function (r) { return !r.ok; });
console.log('PK-H4 summary: ' + (results.length - failed.length) + '/' + results.length + ' passed');
if (failed.length > 0) process.exit(1);
