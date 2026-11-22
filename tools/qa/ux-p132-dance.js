'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..', '..');
var DanceSync = require(path.join(ROOT, 'web', 'home', 'lib', 'dance-sync.js'));
var bpmTable = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'music_bpm.json'), 'utf8'));
var tracksList = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'music', 'tracks.json'), 'utf8'));

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS ' + name);
  } catch (err) {
    failed++;
    console.error('FAIL ' + name + ': ' + (err && err.stack ? err.stack : err));
  }
}

// N1: beat-clock-period
test('N1 beat-clock-period', function () {
  var clk = DanceSync.beatClock({ bpm: 120, startMs: 0 });
  assert.strictEqual(clk.bpm(), 120);
  assert.strictEqual(clk.beatMs(), 500);
  assert.strictEqual(clk.beatIndex(0), 0);
  assert.strictEqual(clk.beatIndex(499), 0);
  assert.strictEqual(clk.beatIndex(500), 1);
  assert.strictEqual(clk.beatIndex(999), 1);
  assert.strictEqual(clk.beatIndex(1000), 2);

  var fired = [];
  var unsub = clk.onBeat(function (idx, nowMs) {
    fired.push([idx, nowMs]);
  });
  assert.strictEqual(clk.update(0), false);
  assert.strictEqual(clk.update(250), false);
  assert.strictEqual(clk.update(500), true);
  assert.strictEqual(clk.update(510), false);
  assert.strictEqual(clk.update(1000), true);
  assert.deepStrictEqual(fired, [[1, 500], [2, 1000]]);

  unsub();
  assert.strictEqual(clk.update(1500), true);
  assert.strictEqual(fired.length, 2);
});

// N2: phase-0-to-1
test('N2 phase-0-to-1', function () {
  var clk = DanceSync.beatClock({ bpm: 120, startMs: 0 });
  assert.strictEqual(clk.phase(0), 0);
  assert.strictEqual(clk.phase(250), 0.5);
  assert.strictEqual(clk.phase(500), 0);
  var times = [-100, -1, 0, 125, 250, 375, 499.9, 500, 1234.5];
  for (var i = 0; i < times.length; i++) {
    var p = clk.phase(times[i]);
    assert.ok(p >= 0 && p < 1, 'phase out of [0, 1) for t=' + times[i] + ': ' + p);
  }
});

// N3: starts-only-when-music-plays
test('N3 starts-only-when-music-plays', function () {
  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: true,
    muted: false,
    mood: 90,
    energy: 50,
    sleeping: false,
    sick: false,
    dragging: false,
    modalOpen: false
  }), true);

  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: false,
    muted: false,
    mood: 95,
    energy: 80,
    sleeping: false,
    sick: false
  }), false);

  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: true,
    muted: true,
    mood: 95,
    energy: 80,
    sleeping: false,
    sick: false
  }), false);

  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: true,
    muted: false,
    mood: 84,
    energy: 50
  }), false);

  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: true,
    muted: false,
    mood: 90,
    energy: 39
  }), false);
});

// N4: no-dance-when-sleepy-or-sick
test('N4 no-dance-when-sleepy-or-sick', function () {
  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: true,
    muted: false,
    mood: 95,
    energy: 80,
    sleeping: true,
    sick: false
  }), false);

  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: true,
    muted: false,
    mood: 95,
    energy: 80,
    sleeping: false,
    sick: true
  }), false);

  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: true,
    muted: false,
    mood: 95,
    energy: 80,
    dragging: true
  }), false);

  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: true,
    muted: false,
    mood: 95,
    energy: 80,
    modalOpen: true
  }), false);

  assert.deepStrictEqual(
    DanceSync.shouldStopDance({ musicPlaying: true, muted: false, sleeping: true }, 1000),
    { stop: true, reason: 'sleeping' }
  );
  assert.deepStrictEqual(
    DanceSync.shouldStopDance({ musicPlaying: true, muted: false, sick: true }, 1000),
    { stop: true, reason: 'sick' }
  );
});

// N5: stops-after-limit
test('N5 stops-after-limit', function () {
  assert.deepStrictEqual(
    DanceSync.shouldStopDance({ musicPlaying: true, muted: false, mood: 80, energy: 50 }, 29999),
    { stop: false, reason: null }
  );
  assert.deepStrictEqual(
    DanceSync.shouldStopDance({ musicPlaying: true, muted: false, mood: 80, energy: 50 }, 30000),
    { stop: true, reason: 'time_limit' }
  );
  assert.deepStrictEqual(
    DanceSync.shouldStopDance({ musicPlaying: true, muted: false, mood: 74, energy: 50 }, 1000),
    { stop: true, reason: 'low_mood' }
  );
  assert.deepStrictEqual(
    DanceSync.shouldStopDance({ musicPlaying: true, muted: false, mood: 80, energy: 29 }, 1000),
    { stop: true, reason: 'low_energy' }
  );
});

// N6: fps-scales-with-bpm-within-bounds
test('N6 fps-scales-with-bpm-within-bounds', function () {
  assert.strictEqual(DanceSync.fpsForBpm(96), 6);
  assert.strictEqual(DanceSync.fpsForBpm(120), 8);
  assert.strictEqual(DanceSync.fpsForBpm(150), 10);
  assert.strictEqual(DanceSync.fpsForBpm(20), DanceSync.MIN_FPS);
  assert.strictEqual(DanceSync.fpsForBpm(600), DanceSync.MAX_FPS);
});

// N7: no-music-no-dance
test('N7 no-music-no-dance', function () {
  assert.strictEqual(DanceSync.shouldStartDance({
    musicPlaying: false,
    muted: false,
    mood: 100,
    energy: 100
  }), false);
  assert.deepStrictEqual(
    DanceSync.shouldStopDance({ musicPlaying: false, muted: false, mood: 95, energy: 90 }, 500),
    { stop: true, reason: 'music_stopped' }
  );
  assert.deepStrictEqual(
    DanceSync.shouldStopDance({ musicPlaying: true, muted: true, mood: 95, energy: 90 }, 500),
    { stop: true, reason: 'music_stopped' }
  );
});

// N8: bpm-data-valid
test('N8 bpm-data-valid', function () {
  assert.strictEqual(bpmTable.version, 1);
  assert.ok(bpmTable.defaultBpm > 0);
  assert.ok(bpmTable.tracks && typeof bpmTable.tracks === 'object');

  for (var i = 0; i < tracksList.length; i++) {
    var t = tracksList[i];
    var entry = bpmTable.tracks[t.id];
    assert.ok(entry, 'Missing BPM entry for track ' + t.id);
    assert.strictEqual(entry.file, t.file);
    assert.ok(typeof entry.bpm === 'number' && entry.bpm > 0, 'Invalid BPM for ' + t.id);
  }

  assert.strictEqual(DanceSync.resolveTrackBpm('calm', bpmTable).bpm, 96);
  assert.strictEqual(
    DanceSync.resolveTrackBpm('https://cuy.assets/music/adventure_boss.ogg', bpmTable).bpm,
    150
  );
  assert.strictEqual(DanceSync.resolveTrackBpm('unknown_track', bpmTable).bpm, bpmTable.defaultBpm);
});

// N9: bad-input
test('N9 bad-input', function () {
  var clk = DanceSync.beatClock({ bpm: -50, startMs: NaN, offsetMs: 'bad' });
  assert.strictEqual(clk.bpm(), DanceSync.DEFAULT_BPM);
  assert.strictEqual(clk.phase(NaN), 0);
  assert.strictEqual(clk.beatIndex(NaN), 0);
  assert.strictEqual(clk.update(NaN), false);
  var unsub = clk.onBeat(null);
  assert.strictEqual(typeof unsub, 'function');
  unsub();

  assert.strictEqual(DanceSync.fpsForBpm(0), 8);
  assert.strictEqual(DanceSync.fpsForBpm(NaN), 8);
  assert.strictEqual(DanceSync.resolveTrackBpm(null, null).bpm, DanceSync.DEFAULT_BPM);
  assert.strictEqual(DanceSync.shouldStartDance(null), false);
  assert.deepStrictEqual(DanceSync.shouldStopDance(null, 0), { stop: true, reason: 'music_stopped' });
});

console.log('Summary: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
}
