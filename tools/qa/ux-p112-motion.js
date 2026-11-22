'use strict';

var assert = require('assert');
var path = require('path');
var PigMotion = require(path.resolve(__dirname, '../../web/home/lib/pig-motion.js'));

// STUB home_behavior.json motion section (owned by PK-H1)
var STUB_MOTION_CFG = {
  hop: { popcornHeightPx: 10, popcornDurationMs: 857, popcornPeakFrac: 0.5 },
  speeds: { walk: 70, run: 135, follow: 85 },
  stageSpeedMul: { baby: 1.1, junior: 1.15, adult: 1.0, senior: 0.72, legend: 0.72 },
  particles: { maxActive: 24, zzzIntervalMs: 900, heartIntervalMs: 700, sweatIntervalMs: 1100 },
  bubbles: {
    popcorn: 'Popcorn!',
    wheek: 'Wheek!',
    sleep: 'Zzz...',
    doze: 'Zzz...',
    sleep_house: 'Zzz...',
    sleep_together: 'Zzz...',
    drink: 'Sip sip',
    happy: 'Happy!',
    front_happy: 'Happy!',
    purr_pet: 'Purr...',
    beg: 'Wheek?',
    eat: 'Crunch!',
    sad: '...',
    sick: '*sniffle*',
    shiver: 'Brr...',
    heat_flop: 'Phew...'
  }
};

function makeSeededRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

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

runCase('M1 popcorn-hop-height', function () {
  var dur = STUB_MOTION_CFG.hop.popcornDurationMs;
  var h = STUB_MOTION_CFG.hop.popcornHeightPx;
  assert.strictEqual(PigMotion.offsetY('popcorn', 0, STUB_MOTION_CFG), 0);
  var quarter = PigMotion.offsetY('popcorn', dur * 0.25, STUB_MOTION_CFG);
  var peak = PigMotion.offsetY('popcorn', dur * 0.5, STUB_MOTION_CFG);
  var threeQuarter = PigMotion.offsetY('popcorn', dur * 0.75, STUB_MOTION_CFG);
  assert.ok(quarter > 0 && quarter < h, 'quarter hop should rise smoothly');
  assert.ok(Math.abs(peak - h) < 1e-9, 'peak should equal popcornHeightPx=10');
  assert.ok(Math.abs(quarter - threeQuarter) < 1e-9, 'parabola should be symmetric');
  assert.strictEqual(PigMotion.offsetY('popcorn', dur, STUB_MOTION_CFG), 0);
  assert.strictEqual(PigMotion.offsetY('popcorn', dur + 200, STUB_MOTION_CFG), 0);
  assert.strictEqual(PigMotion.offsetY('popcorn', dur * 0.5), h, 'default cfg works too');
});

runCase('M2 hop-never-negative', function () {
  var anims = ['popcorn', 'walk', 'run', 'idle', 'sleep', 'doze'];
  for (var i = 0; i < anims.length; i++) {
    for (var t = -200; t <= 1500; t += 25) {
      var y = PigMotion.offsetY(anims[i], t, STUB_MOTION_CFG);
      assert.ok(typeof y === 'number' && Number.isFinite(y) && y >= 0, 'offsetY must be >= 0');
    }
  }
});

runCase('M3 run-faster-than-walk', function () {
  var walk = PigMotion.speed('walk', 'adult', STUB_MOTION_CFG);
  var run = PigMotion.speed('run', 'adult', STUB_MOTION_CFG);
  var zoomies = PigMotion.speed('zoomies', 'adult', STUB_MOTION_CFG);
  var follow = PigMotion.speed('follow', 'adult', STUB_MOTION_CFG);
  assert.strictEqual(walk, 70);
  assert.strictEqual(run, 135);
  assert.strictEqual(zoomies, run);
  assert.ok(run > walk, 'run faster than walk');
  assert.ok(follow > walk, 'follow faster than walk');
  assert.strictEqual(PigMotion.speed('sleep', 'adult', STUB_MOTION_CFG), 0);
  assert.strictEqual(PigMotion.speed('popcorn', 'adult', STUB_MOTION_CFG), 0);
  assert.strictEqual(PigMotion.speed('idle', 'adult', STUB_MOTION_CFG), 0);
});

runCase('M4 stage-speed-order', function () {
  var junior = PigMotion.speed('walk', 'junior', STUB_MOTION_CFG);
  var baby = PigMotion.speed('walk', 'baby', STUB_MOTION_CFG);
  var adult = PigMotion.speed('walk', 'adult', STUB_MOTION_CFG);
  var senior = PigMotion.speed('walk', 'senior', STUB_MOTION_CFG);
  var legend = PigMotion.speed('walk', 'legend', STUB_MOTION_CFG);
  assert.ok(junior > baby, 'junior faster than baby');
  assert.ok(baby > adult, 'baby faster than adult');
  assert.ok(adult > senior, 'adult faster than senior');
  assert.strictEqual(senior, legend);
  assert.strictEqual(PigMotion.speed('walk', 'unknown_stage', STUB_MOTION_CFG), adult);
});

runCase('M5 zzz-while-sleeping', function () {
  var rng = makeSeededRng(42);
  var sleepAnims = ['sleep', 'doze', 'sleep_house', 'sleep_together'];
  sleepAnims.forEach(function (anim) {
    assert.strictEqual(PigMotion.particles(anim, 899, rng, STUB_MOTION_CFG, 0).length, 0);
    var out = PigMotion.particles(anim, 900, rng, STUB_MOTION_CFG, 0);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].type, 'zzz');
  });
  var nonSleep = ['walk', 'idle', 'popcorn', 'run', 'happy', 'eat'];
  nonSleep.forEach(function (anim) {
    var out = PigMotion.particles(anim, 5000, rng, STUB_MOTION_CFG, 0);
    assert.ok(out.every(function (p) { return p.type !== 'zzz'; }), anim + ' must not emit zzz');
  });
});

runCase('M6 hearts-for-happy', function () {
  var rng = makeSeededRng(7);
  var heartAnims = ['happy', 'front_happy', 'purr_pet', 'nose_touch', 'groom_other'];
  heartAnims.forEach(function (anim) {
    assert.strictEqual(PigMotion.particles(anim, 699, rng, STUB_MOTION_CFG, 0).length, 0);
    var out = PigMotion.particles(anim, 700, rng, STUB_MOTION_CFG, 0);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].type, 'heart');
  });
  ['heat_flop', 'run'].forEach(function (anim) {
    var out = PigMotion.particles(anim, 1100, rng, STUB_MOTION_CFG, 0);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].type, 'sweat');
  });
});

runCase('M7 bubble-text-known-anims', function () {
  var expected = STUB_MOTION_CFG.bubbles;
  Object.keys(expected).forEach(function (anim) {
    assert.strictEqual(PigMotion.bubble(anim, STUB_MOTION_CFG), expected[anim]);
    assert.strictEqual(PigMotion.bubble(anim), expected[anim]);
  });
  assert.strictEqual(PigMotion.bubble('walk', STUB_MOTION_CFG), null);
  assert.strictEqual(PigMotion.bubble('idle', STUB_MOTION_CFG), null);
  assert.strictEqual(PigMotion.bubble('nonexistent_anim', STUB_MOTION_CFG), null);
});

runCase('M8 particles-bounded', function () {
  var rng = makeSeededRng(99);
  var active = [];
  var timer = 0;
  var dtMs = 100;
  for (var t = 0; t < 300000; t += dtMs) {
    var dtSec = dtMs / 1000;
    for (var i = active.length - 1; i >= 0; i--) {
      active[i].life -= dtSec;
      if (active[i].life <= 0) active.splice(i, 1);
    }
    timer += dtMs;
    var spawned = PigMotion.particles('sleep', timer, rng, STUB_MOTION_CFG, active.length);
    if (spawned.length > 0) {
      timer = 0;
      for (var j = 0; j < spawned.length; j++) active.push(spawned[j]);
    }
    assert.ok(active.length <= STUB_MOTION_CFG.particles.maxActive, 'active particles exceeded maxActive');
  }
  assert.strictEqual(
    PigMotion.particles('sleep', 2000, rng, STUB_MOTION_CFG, STUB_MOTION_CFG.particles.maxActive).length,
    0
  );
});

runCase('M9 deterministic', function () {
  var r1 = makeSeededRng(12345);
  var r2 = makeSeededRng(12345);
  assert.strictEqual(PigMotion.offsetY('popcorn', 321, STUB_MOTION_CFG), PigMotion.offsetY('popcorn', 321, STUB_MOTION_CFG));
  assert.strictEqual(PigMotion.speed('run', 'senior', STUB_MOTION_CFG), PigMotion.speed('run', 'senior', STUB_MOTION_CFG));
  assert.strictEqual(PigMotion.bubble('wheek', STUB_MOTION_CFG), PigMotion.bubble('wheek', STUB_MOTION_CFG));
  assert.deepStrictEqual(
    PigMotion.particles('happy', 800, r1, STUB_MOTION_CFG, 2),
    PigMotion.particles('happy', 800, r2, STUB_MOTION_CFG, 2)
  );
});

runCase('M10 bad-input', function () {
  var badValues = [null, undefined, NaN, Infinity, -50, {}, [], 42, 'toString', 'constructor', '__proto__'];
  badValues.forEach(function (bad) {
    assert.strictEqual(PigMotion.offsetY(bad, bad, bad), 0);
    assert.strictEqual(PigMotion.speed(bad, bad, bad), 0);
    assert.deepStrictEqual(PigMotion.particles(bad, bad, bad, bad, bad), []);
    assert.strictEqual(PigMotion.bubble(bad, bad), null);
  });
  assert.strictEqual(PigMotion.speed('walk', 'constructor', STUB_MOTION_CFG), 70);
  assert.strictEqual(PigMotion.bubble('constructor', STUB_MOTION_CFG), null);
});

var failed = results.filter(function (r) { return !r.ok; });
console.log('PK-H3 summary: ' + (results.length - failed.length) + '/' + results.length + ' passed');
if (failed.length > 0) process.exit(1);
