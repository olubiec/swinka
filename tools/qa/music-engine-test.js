// Node test for MusicEngine and MusicDirector (PK-34b). No audio device needed.
const assert = require('assert');
const Engine = require('../../web/home/music-engine.js');
const Director = require('../../web/home/music-director.js');
const Mock = require('../../web/home/mocks/music-engine.mock.js');

const TRACKS = {
  mg_veggie_rain: {
    kind: 'minigame', loop: true,
    stems: {
      base: { file: 'music/minigames/mg_veggie_rain_base.ogg', enter: 0 },
      rhythm: { file: 'music/minigames/mg_veggie_rain_rhythm.ogg', enter: 10 },
      lead: { file: 'music/minigames/mg_veggie_rain_lead.ogg', enter: 25 }
    }
  },
  place_park: { file: 'music/places/place_park.ogg', loop: true, loopStart: 1.0, loopEnd: 90.0 },
  home_main: { file: 'music/home/home_main.ogg', loop: true },
  calm: { file: 'music/home/calm.ogg', loop: true },
  bed_day: { file: 'music/beds/bed_day.ogg', loop: true }
};

function makeEngine(ctx) {
  const loader = Mock.createMockLoader({});
  const engine = Engine.create({ ctx, loadBuffer: loader, fadeMs: 1500 });
  return { engine, loader };
}

async function testStemsOneClock() {
  const ctx = Mock.createMockContext(10);
  const { engine } = makeEngine(ctx);
  await engine.play({ id: 'mg_veggie_rain', ...TRACKS.mg_veggie_rain });
  const starts = ctx.log.filter(e => e.op === 'start');
  assert.strictEqual(starts.length, 3, 'three stems start');
  const when = starts[0].when;
  assert.strictEqual(when, 10.1, 'stems start at currentTime + 0.1');
  starts.forEach(s => assert.strictEqual(s.when, when, 'all stems on the same clock time'));
  // Stems with enter > 0 ramp in at their enter time.
  const ramps = ctx.log.filter(e => e.op === 'gain.linearRamp' && e.v === 1).map(e => e.t);
  assert.ok(ramps.includes(when + 10), 'rhythm enters at +10 s');
  assert.ok(ramps.includes(when + 25), 'lead enters at +25 s');
}

async function testLoopPoints() {
  const ctx = Mock.createMockContext(0);
  const { engine } = makeEngine(ctx);
  await engine.play({ id: 'place_park', ...TRACKS.place_park });
  const start = ctx.log.find(e => e.op === 'start');
  assert.strictEqual(start.loop, true);
  assert.strictEqual(start.loopStart, 1.0);
  assert.strictEqual(start.loopEnd, 90.0);
}

async function testDuck() {
  const ctx = Mock.createMockContext(5);
  const { engine } = makeEngine(ctx);
  engine.duck();
  const ramps = ctx.log.filter(e => e.op === 'gain.linearRamp');
  const down = ramps.find(e => Math.abs(e.t - 5.04) < 1e-9);
  const back = ramps.find(e => Math.abs(e.t - 5.44) < 1e-9);
  assert.ok(down, 'duck goes down at +40 ms');
  assert.ok(Math.abs(down.v - Math.pow(10, -5 / 20)) < 1e-9, 'duck is -5 dB');
  assert.ok(back && back.v === 1, 'duck returns to 0 dB after 400 ms');
}

async function testNightFilter() {
  const ctx = Mock.createMockContext(0);
  const { engine } = makeEngine(ctx);
  assert.strictEqual(engine.isNightFilter(), false);
  engine.setNightFilter(true);
  assert.strictEqual(engine.isNightFilter(), true);
  await engine.play({ id: 'home_main', ...TRACKS.home_main }, { night: true });
  engine.setNightFilter(false);
  assert.strictEqual(engine.isNightFilter(), false);
}

async function testEngineStopAndCrossfade() {
  const ctx = Mock.createMockContext(0);
  const { engine } = makeEngine(ctx);
  await engine.play({ id: 'home_main', ...TRACKS.home_main });
  await engine.play({ id: 'calm', ...TRACKS.calm });
  assert.strictEqual(engine.currentId(), 'calm');
  const stopsBefore = ctx.log.filter(e => e.op === 'stop').length;
  engine.stop(1500);
  assert.strictEqual(engine.currentId(), null);
  const stops = ctx.log.filter(e => e.op === 'stop');
  assert.ok(stops.length > stopsBefore, 'stop schedules source stops');
}

async function testEngineVolumeAndEnabled() {
  const ctx = Mock.createMockContext(0);
  const { engine } = makeEngine(ctx);
  engine.setVolume(2);
  assert.strictEqual(engine.volume(), 1, 'volume clamped to 1');
  engine.setEnabled(false);
  assert.strictEqual(engine.isEnabled(), false);
  engine.setEnabled(true);
  assert.strictEqual(engine.isEnabled(), true);
}

function testDirectorPriorities() {
  const ctx = Mock.createMockContext(0);
  const { engine } = makeEngine(ctx);
  const d = Director.create({ engine, tracks: TRACKS, routes: { 'place:park': 'place_park' } });

  d.setContext('home.view:rooms.room:kuki');
  assert.strictEqual(d.current().key, 'home.view:rooms.room:kuki');
  assert.strictEqual(d.current().trackId, 'place_room_kuki');

  d.minigame('veggie_rain');
  assert.strictEqual(d.current().priority, 50, 'minigame wins over home');
  assert.strictEqual(d.current().trackId, 'mg_veggie_rain');

  d.minigameEnd('veggie_rain');
  assert.strictEqual(d.current().key, 'home.view:rooms.room:kuki', 'home returns after minigame ends');
  assert.ok(!d.stack().some(c => c.key.indexOf('minigame:') === 0), 'no minigame context after close');
}

function testDirectorTieAndStop() {
  const ctx = Mock.createMockContext(0);
  const { engine } = makeEngine(ctx);
  const d = Director.create({ engine, tracks: TRACKS, routes: { 'place:park': 'place_park' } });

  d.setContext('place:garden');
  d.setContext('place:park');
  assert.strictEqual(d.current().key, 'place:park', 'same priority: later setContext wins');

  d.setContext('home.view:album');
  assert.strictEqual(d.current().trackId, 'theme_cuy');

  d.stopHome();
  assert.strictEqual(d.stack().filter(c => c.kind !== 'desktop').length, 0, 'closing Domek clears home contexts');
  assert.strictEqual(d.current(), null);
}

function testTrackMapping() {
  assert.strictEqual(Director.trackFor('home.view:coloring', {}), 'calm');
  assert.strictEqual(Director.trackFor('home.view:shop', {}), 'place_market');
  assert.strictEqual(Director.trackFor('home.view:album', {}), 'theme_cuy');
  assert.strictEqual(Director.trackFor('home.view:unknown', {}), 'home_main');
  assert.strictEqual(Director.trackFor('place:garden', {}), 'place_garden');
}

async function main() {
  await testStemsOneClock();
  await testLoopPoints();
  await testDuck();
  await testNightFilter();
  await testEngineStopAndCrossfade();
  await testEngineVolumeAndEnabled();
  testDirectorPriorities();
  testDirectorTieAndStop();
  testTrackMapping();
  console.log('MUSIC ENGINE TEST OK');
}

main().catch(err => {
  console.error('MUSIC ENGINE TEST FAILED:', err && err.message);
  process.exit(1);
});
