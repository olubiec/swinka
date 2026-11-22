'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..', '..');
var PigBehavior = require(path.join(ROOT, 'web', 'home', 'lib', 'pig-behavior.js'));
var actionsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'actions.json'), 'utf8'));
var homeData = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'home_behavior.json'), 'utf8'));

function makeRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeBaseCtx(overrides) {
  return Object.assign({
    needs: { fullness: 70, vitamin_c: 70, energy: 70, mood: 70, cleanliness: 70, teeth: 70, health: 100 },
    stage: 'adult',
    hour: 12,
    sceneKind: 'room',
    hasSpot: function () { return true; },
    otherPigNear: false,
    sick: false,
    weather: 20,
    dragging: false,
    modalOpen: false,
    hayInRack: 100,
    items: { water_bottle: 1, chew_stick: 1 },
    musicPlaying: false,
    userIdle: false
  }, overrides || {});
}

// B1: all-28-reachable over 3 simulated days at 250ms step
function testB1All28Reachable() {
  var brain = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(42), stage: 'adult' });
  var seen = {};
  var dt = 250;
  var steps = (3 * 86400 * 1000) / dt; // 3 days = 1,036,800 ticks

  for (var i = 0; i < steps; i++) {
    var sec = (i * dt) / 1000;
    var hour = Math.floor((sec / 3600) % 24);
    var phase = Math.floor(sec / 600) % 10; // rotate scenarios every 10 min

    var ctx;
    if (phase === 0) {
      // High mood, active adult/junior with companion
      ctx = makeBaseCtx({
        hour: hour,
        stage: (i % 2 === 0) ? 'adult' : 'junior',
        needs: { fullness: 85, vitamin_c: 85, energy: 85, mood: 95, cleanliness: 80, teeth: 80, health: 100 },
        otherPigNear: true,
        musicPlaying: true
      });
    } else if (phase === 1) {
      // Baby stage chirping/dancing
      ctx = makeBaseCtx({
        hour: hour,
        stage: 'baby',
        needs: { fullness: 80, vitamin_c: 80, energy: 80, mood: 92, cleanliness: 80, teeth: 80, health: 100 },
        otherPigNear: false
      });
    } else if (phase === 2) {
      // Tired + companion for sleep / nap / sleeping_together / yawning
      var sleepBand = Math.floor(sec / 300) % 2;
      ctx = makeBaseCtx({
        hour: sleepBand === 0 ? 19 : ((hour >= 7 && hour < 23) ? 23 : hour),
        stage: 'adult',
        needs: { fullness: 75, vitamin_c: 75, energy: sleepBand === 0 ? 40 : 20, mood: 70, cleanliness: 70, teeth: 70, health: 100 },
        otherPigNear: true
      });
    } else if (phase === 3) {
      // Low fullness & vitC & teeth, no hay briefly for wheeking, then hay for eat/dig
      ctx = makeBaseCtx({
        hour: hour,
        hayInRack: (Math.floor(sec / 120) % 2 === 0) ? 0 : 100,
        needs: { fullness: 20, vitamin_c: 20, energy: 70, mood: 60, cleanliness: 70, teeth: 20, health: 100 }
      });
    } else if (phase === 4) {
      // Cold weather
      ctx = makeBaseCtx({
        hour: hour,
        weather: 2,
        needs: { fullness: 80, vitamin_c: 80, energy: 70, mood: 60, cleanliness: 70, teeth: 70, health: 100 }
      });
    } else if (phase === 5) {
      // Hot weather
      ctx = makeBaseCtx({
        hour: hour,
        weather: 32,
        needs: { fullness: 80, vitamin_c: 80, energy: 70, mood: 60, cleanliness: 70, teeth: 70, health: 100 }
      });
    } else if (phase === 6) {
      // Sad + sick
      ctx = makeBaseCtx({
        hour: hour,
        needs: { fullness: 80, vitamin_c: 80, energy: 60, mood: 10, cleanliness: 50, teeth: 70, health: 15 }
      });
    } else if (phase === 7) {
      // Companion social actions (rumblestrut, nose_touch, grooming_other, following)
      ctx = makeBaseCtx({
        hour: 18,
        stage: 'adult',
        otherPigNear: true,
        needs: { fullness: 80, vitamin_c: 80, energy: 65, mood: 45, cleanliness: 70, teeth: 70, health: 100 }
      });
    } else if (phase === 8) {
      // Teeth / drink / dig_hay / chin_marking / scratching
      ctx = makeBaseCtx({
        hour: 8,
        stage: 'adult',
        hayInRack: 80,
        needs: { fullness: 90, vitamin_c: 90, energy: 80, mood: 55, cleanliness: 40, teeth: 30, health: 100 }
      });
    } else {
      // Normal day idle/walk/sniff/nap
      ctx = makeBaseCtx({
        hour: hour,
        needs: { fullness: 75, vitamin_c: 75, energy: 55, mood: 75, cleanliness: 75, teeth: 75, health: 100 }
      });
    }

    var res = brain.tick(dt, ctx);
    if (res && res.id) {
      seen[res.id] = (seen[res.id] || 0) + 1;
    }
  }

  var missing = [];
  for (var a = 0; a < actionsData.actions.length; a++) {
    var id = actionsData.actions[a].id;
    if (!seen[id]) missing.push(id);
  }
  assert.strictEqual(missing.length, 0, 'B1 missing actions: ' + missing.join(', '));
}

// B2: sleeps-when-tired
function testB2SleepsWhenTired() {
  var brain = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(7) });
  var res = brain.tick(250, makeBaseCtx({
    hour: 23,
    needs: { fullness: 80, vitamin_c: 80, energy: 10, mood: 70, cleanliness: 80, teeth: 80, health: 100 }
  }));
  assert.ok(res && (res.id === 'sleep' || res.anim === 'sleep' || res.anim === 'sleep_house'),
    'B2 expected sleep at night with low energy, got ' + (res && res.id));
}

// B3: no-sleep-while-dragged
function testB3NoSleepWhileDragged() {
  var brain = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(7) });
  // Cannot start sleep while dragged
  var r1 = brain.tick(250, makeBaseCtx({
    hour: 23,
    dragging: true,
    needs: { fullness: 80, vitamin_c: 80, energy: 10, mood: 70, cleanliness: 80, teeth: 80, health: 100 }
  }));
  assert.strictEqual(r1, null, 'B3 tick while dragging must return null');
  assert.strictEqual(brain.current(), null, 'B3 current() must remain null while dragging');

  // Start sleeping, then drag interrupts sleep
  var r2 = brain.tick(250, makeBaseCtx({
    hour: 23,
    dragging: false,
    needs: { fullness: 80, vitamin_c: 80, energy: 10, mood: 70, cleanliness: 80, teeth: 80, health: 100 }
  }));
  assert.strictEqual(r2.id, 'sleep', 'B3 should start sleeping when not dragged');
  var r3 = brain.tick(250, makeBaseCtx({ hour: 23, dragging: true }));
  assert.strictEqual(r3, null, 'B3 dragging during sleep returns null');
  assert.strictEqual(brain.current(), null, 'B3 dragging must interrupt sleep');
}

// B4: interrupt-then-resume
function testB4InterruptThenResume() {
  var brain = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(11) });
  var ctx = makeBaseCtx({
    hour: 23,
    needs: { fullness: 80, vitamin_c: 80, energy: 10, mood: 70, cleanliness: 80, teeth: 80, health: 100 }
  });
  var first = brain.tick(250, ctx);
  assert.ok(first && first.durationMs > 1000, 'B4 expected long action');
  brain.interrupt('pet');
  assert.strictEqual(brain.debug().interrupted, true);
  var remBefore = brain.current().remainingMs;
  assert.strictEqual(brain.tick(1000, ctx), null, 'B4 tick while interrupted returns null');
  assert.strictEqual(brain.current().remainingMs, remBefore, 'B4 timer must freeze while interrupted');
  var resumed = brain.resume(ctx);
  assert.strictEqual(resumed.id, first.id, 'B4 resume with >500ms left must resume same action');

  // Advance until <= 500ms remaining, interrupt, resume -> picks new action
  var stepMs = remBefore - 300;
  brain.tick(stepMs, ctx);
  assert.ok(brain.current().remainingMs <= 500);
  brain.interrupt('feed');
  var next = brain.resume(ctx);
  assert.ok(next && next.id, 'B4 resume with <=500ms left must pick an action');
}

// B5: cooldown-respected
function testB5CooldownRespected() {
  var brain = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(13) });
  var ctx = makeBaseCtx({
    hour: 18,
    needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 95, cleanliness: 90, teeth: 90, health: 100 },
    items: { water_bottle: 1, chew_stick: 1 }
  });
  // Run until zoomies (cd 7200s) triggers
  var firstZoomAt = -1;
  var secondZoomAt = -1;
  for (var i = 0; i < 60000; i++) {
    var res = brain.tick(1000, ctx);
    if (res && res.id === 'zoomies') {
      if (firstZoomAt < 0) firstZoomAt = i;
      else { secondZoomAt = i; break; }
    }
  }
  assert.ok(firstZoomAt >= 0, 'B5 zoomies should trigger');
  if (secondZoomAt >= 0) {
    assert.ok((secondZoomAt - firstZoomAt) >= 7200, 'B5 zoomies repeated before 7200s cooldown: ' + (secondZoomAt - firstZoomAt));
  }
}

// B6: daily-limit-respected
function testB6DailyLimitRespected() {
  var brain = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(19) });
  var ctx = makeBaseCtx({
    hour: 18,
    stage: 'adult',
    needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 95, cleanliness: 90, teeth: 90, health: 100 }
  });
  // Run full day 0 (86400s) and verify zoomies <= 2 and beaming <= 2 and chin_marking <= 3
  var day0Counts = {};
  for (var s = 0; s < 86400; s++) {
    var r = brain.tick(1000, ctx);
    if (r) day0Counts[r.id] = (day0Counts[r.id] || 0) + 1;
  }
  assert.ok((day0Counts.zoomies || 0) <= 2, 'B6 zoomies exceeded daily limit 2: ' + day0Counts.zoomies);
  assert.ok((day0Counts.beaming || 0) <= 2, 'B6 beaming exceeded daily limit 2: ' + day0Counts.beaming);
  assert.ok((day0Counts.chin_marking || 0) <= 3, 'B6 chin_marking exceeded daily limit 3: ' + day0Counts.chin_marking);
}

// B7: stage-filter
function testB7StageFilter() {
  var babyBrain = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(23), stage: 'baby' });
  var babyCtx = makeBaseCtx({
    stage: 'baby',
    otherPigNear: true,
    needs: { fullness: 80, vitamin_c: 80, energy: 80, mood: 60, cleanliness: 80, teeth: 80, health: 100 }
  });
  for (var i = 0; i < 10000; i++) {
    var r = babyBrain.tick(1000, babyCtx);
    if (r) assert.notStrictEqual(r.id, 'rumblestrut', 'B7 baby must never rumblestrut');
  }

  var adultBrain = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(23), stage: 'adult' });
  var adultCtx = makeBaseCtx({
    stage: 'adult',
    needs: { fullness: 80, vitamin_c: 80, energy: 80, mood: 80, cleanliness: 80, teeth: 80, health: 100 }
  });
  for (var j = 0; j < 10000; j++) {
    var r2 = adultBrain.tick(1000, adultCtx);
    if (r2) assert.notStrictEqual(r2.id, 'chirping', 'B7 adult must never chirp (daily_limit.adult=0)');
  }
}

// B8: needs-drive
function testB8NeedsDrive() {
  // Hungry -> eat_hay
  var b1 = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(31) });
  var r1 = b1.tick(250, makeBaseCtx({
    hayInRack: 50,
    needs: { fullness: 5, vitamin_c: 80, energy: 80, mood: 80, cleanliness: 80, teeth: 80, health: 100 }
  }));
  assert.strictEqual(r1.id, 'eat_hay', 'B8 low fullness should drive eat_hay, got ' + r1.id);

  // Water bottle -> drink occurs
  var b2 = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(31) });
  var sawDrink = false;
  var ctxDrink = makeBaseCtx({
    items: { water_bottle: 1 },
    hayInRack: 0,
    needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 30, cleanliness: 90, teeth: 90, health: 100 }
  });
  for (var i = 0; i < 600; i++) {
    var r2 = b2.tick(1000, ctxDrink);
    if (r2 && r2.id === 'drink') { sawDrink = true; break; }
  }
  assert.strictEqual(sawDrink, true, 'B8 water_bottle should enable drink');

  // Scratching occurs via base_weight/budget
  var b3 = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(31) });
  var sawScratch = false;
  var ctxScratch = makeBaseCtx({
    items: {},
    hayInRack: 0,
    needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 60, cleanliness: 20, teeth: 90, health: 100 }
  });
  for (var j = 0; j < 2000; j++) {
    var r3 = b3.tick(1000, ctxScratch);
    if (r3 && r3.id === 'scratching') { sawScratch = true; break; }
  }
  assert.strictEqual(sawScratch, true, 'B8 scratching should occur');
}

// B9: deterministic
function testB9Deterministic() {
  function runSeq(seed) {
    var b = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(seed) });
    var ctx = makeBaseCtx({ hour: 14, otherPigNear: true });
    var seq = [];
    for (var i = 0; i < 1000; i++) {
      var r = b.tick(500, ctx);
      if (r) seq.push(r.id + ':' + r.durationMs);
    }
    return seq;
  }
  assert.deepStrictEqual(runSeq(999), runSeq(999), 'B9 identical seeds must produce identical sequences');
}

// B10: bad-input
function testB10BadInput() {
  var b = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(5) });
  assert.doesNotThrow(function () {
    b.tick(NaN, null);
    b.tick(-100, { needs: { fullness: NaN, energy: undefined }, stage: 'alien', weather: 'tornado', hour: NaN });
    b.tick(250, { needs: null, items: 'broken', hasSpot: 'not-fn' });
    b.interrupt(null);
    b.resume(undefined);
    b.tick(250, {});
  }, 'B10 bad inputs must not throw');
}

// B11: spot-required-without-spot
function testB11SpotRequiredWithoutSpot() {
  var b = PigBehavior.create({ data: actionsData, homeData: homeData, rng: makeRng(41) });
  var ctx = makeBaseCtx({
    hour: 23,
    otherPigNear: true,
    hasSpot: function () { return false; },
    needs: { fullness: 80, vitamin_c: 80, energy: 10, mood: 70, cleanliness: 80, teeth: 80, health: 100 }
  });
  for (var i = 0; i < 200; i++) {
    var r = b.tick(1000, ctx);
    if (r) {
      assert.strictEqual(r.needsSpot, null, 'B11 action with needsSpot must not be chosen when hasSpot returns false, got ' + r.id);
      assert.notStrictEqual(r.id, 'sleep');
      assert.notStrictEqual(r.id, 'nap');
      assert.notStrictEqual(r.id, 'sleeping_together');
    }
  }
}

testB1All28Reachable();
testB2SleepsWhenTired();
testB3NoSleepWhileDragged();
testB4InterruptThenResume();
testB5CooldownRespected();
testB6DailyLimitRespected();
testB7StageFilter();
testB8NeedsDrive();
testB9Deterministic();
testB10BadInput();
testB11SpotRequiredWithoutSpot();

console.log('ux-p110-behavior: PASS (11/11 tests B1..B11)');
