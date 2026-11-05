// E5 audio edge cases for the record player engine (features/music/engine.js), with a mock Audio element.
// Cases: autoplay blocked (start after the first click), no audio device, decoder without ogg (silence, no throw),
// track 404 / decode error (skip to the next record, then 'error'), play() throwing, tab hidden and back,
// pause/resume on the same element, mute and unmute while playing, bad input.
// Usage (repo root): node tools/qa/audio-edge-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MUSIC = path.join(ROOT, 'web', 'home', 'features', 'music');
const TRACKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'music', 'tracks.json'), 'utf8'));

const tick = () => new Promise((r) => setTimeout(r, 0));
const warnings = [];
console.warn = (text) => warnings.push(String(text));

// Mock environment: window with listeners, Audio, fetch, Sound. Each scenario gets a fresh one.
function makeEnv(opts = {}) {
  const listeners = {};
  const env = {
    listeners,
    audios: [],
    tracksStatus: 200,
    Sound: { isMuted: false },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
    fire(type) { (listeners[type] || []).slice().forEach((f) => f({ type })); },
    fetch: async () => ({ ok: env.tracksStatus === 200, status: env.tracksStatus, json: async () => TRACKS }),
    // playMode: 'ok' | 'blocked' | 'reject' | 'throw'
    playMode: opts.playMode || 'ok',
    canPlay: opts.canPlay === undefined ? 'probably' : opts.canPlay,
    noDevice: Boolean(opts.noDevice),
  };
  env.Audio = class {
    constructor(src) {
      if (env.noDevice) throw new Error('no audio device');
      this.src = src || '';
      this.volume = 1;
      this.loop = false;
      this.paused = true;
      this.plays = 0;
      this.pauses = 0;
      this.handlers = {};
      if (this.src) env.audios.push(this); // the ogg probe is created with no src
    }
    canPlayType() { return env.canPlay; }
    addEventListener(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); }
    emit(type) { (this.handlers[type] || []).forEach((f) => f({ type })); }
    play() {
      this.plays++;
      if (env.playMode === 'throw') throw new Error('play threw');
      if (env.playMode === 'blocked') return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
      if (env.playMode === 'reject') return Promise.reject(new Error('decode failed'));
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.pauses++; this.paused = true; }
  };
  return env;
}

function loadEngine(env) {
  // The engine reads window/globalThis when it is required, so the mock goes in first.
  global.window = env;
  global.Audio = env.Audio;
  global.fetch = env.fetch;
  global.Sound = env.Sound;
  const path_ = require.resolve(path.join(MUSIC, 'engine.js'));
  delete require.cache[path_];
  return require(path_);
}

// Records whose tracks differ (hash mod 5), so a 404 on one track does not hit the next record.
const RECORDS = ['rec_a', 'rec_b', 'rec_c'];

const tests = {
  async 'autoplay blocked: status waiting, first pointerdown starts playback'() {
    const env = makeEnv({ playMode: 'blocked' });
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a']);
    eng.play();
    await tick(); await tick();
    assert.strictEqual(eng.getState().status, 'waiting');
    assert.ok(warnings.some((w) => /autoplay blocked/.test(w)), 'warns once about autoplay');
    env.playMode = 'ok';
    env.fire('pointerdown');
    await tick(); await tick();
    assert.strictEqual(eng.getState().status, 'playing');
    assert.strictEqual(env.audios.length, 1, 'same element is reused, no new track loaded');
    assert.strictEqual(env.audios[0].plays, 2);
  },

  async 'autoplay blocked then pause: a click does not start playback'() {
    const env = makeEnv({ playMode: 'blocked' });
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a']);
    eng.play();
    await tick(); await tick();
    eng.pause();
    env.playMode = 'ok';
    env.fire('keydown');
    await tick();
    assert.strictEqual(eng.getState().status, 'paused');
    assert.strictEqual(env.audios[0].plays, 1);
  },

  async 'no audio device: Audio constructor throws, state silent, no exception'() {
    const env = makeEnv({ noDevice: true });
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a']);
    assert.doesNotThrow(() => eng.play());
    await tick(); await tick();
    const st = eng.getState();
    assert.strictEqual(st.status, 'silent');
    assert.strictEqual(st.audio, false);
    assert.strictEqual(env.audios.length, 0);
  },

  async 'decoder without ogg: silent, no play call, no exception'() {
    const env = makeEnv({ canPlay: '' });
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a', 'rec_b']);
    assert.doesNotThrow(() => eng.play());
    await tick(); await tick();
    assert.strictEqual(eng.getState().status, 'silent');
    assert.strictEqual(eng.getState().audio, false);
    assert.strictEqual(env.audios.length, 0, 'no track element is created');
  },

  async 'tracks.json 404: music silent, no exception'() {
    const env = makeEnv();
    env.tracksStatus = 404;
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a']);
    eng.play();
    await tick(); await tick();
    assert.strictEqual(eng.getState().status, 'silent');
    assert.ok(warnings.some((w) => /tracks\.json/.test(w)));
  },

  async 'track 404 on the only record: one warning, status error, no throw'() {
    const env = makeEnv();
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a']);
    eng.play();
    await tick(); await tick();
    assert.strictEqual(env.audios.length, 1);
    assert.doesNotThrow(() => env.audios[0].emit('error'));
    await tick();
    assert.strictEqual(eng.getState().status, 'error');
    // a new play() after error retries from the first record
    env.audios[0].emit('error');
    assert.doesNotThrow(() => eng.play());
  },

  async 'track 404 in the middle of a queue: skips to the next record'() {
    const env = makeEnv();
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(RECORDS);
    eng.play();
    await tick(); await tick();
    env.audios[0].emit('error');
    await tick(); await tick();
    const st = eng.getState();
    assert.strictEqual(st.status, 'playing');
    assert.strictEqual(st.index, 1);
    assert.strictEqual(env.audios.length, 2);
  },

  async 'play() rejects with decode error: skip, no unhandled rejection'() {
    const env = makeEnv({ playMode: 'reject' });
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a']);
    eng.play();
    await tick(); await tick(); await tick();
    assert.strictEqual(eng.getState().status, 'error');
  },

  async 'play() throws synchronously: skip, no throw to the caller'() {
    const env = makeEnv({ playMode: 'throw' });
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a']);
    assert.doesNotThrow(() => eng.play());
    await tick(); await tick();
    assert.strictEqual(eng.getState().status, 'error');
  },

  async 'tab hidden and back: state and element survive, pause/resume keeps position'() {
    const env = makeEnv();
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a']);
    eng.play();
    await tick(); await tick();
    const before = env.audios[0];
    assert.doesNotThrow(() => { env.fire('visibilitychange'); env.fire('blur'); env.fire('focus'); });
    await tick();
    assert.strictEqual(eng.getState().status, 'playing');
    assert.strictEqual(env.audios[0], before, 'no reload on return');
    eng.pause();
    assert.strictEqual(eng.getState().status, 'paused');
    eng.play();
    await tick();
    assert.strictEqual(env.audios[0], before, 'resume uses the same element');
    assert.strictEqual(eng.getState().status, 'playing');
  },

  async 'mute while playing sets volume 0, unmute restores it'() {
    const env = makeEnv();
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    eng.setQueue(['rec_a']);
    eng.play();
    await tick(); await tick();
    const a = env.audios[0];
    assert.strictEqual(a.volume, 0.35);
    env.Sound.isMuted = true;
    eng.refresh();
    assert.strictEqual(a.volume, 0);
    assert.strictEqual(eng.getState().muted, true);
    eng.setVolume(0.8); // slider while muted: stays silent
    assert.strictEqual(a.volume, 0);
    env.Sound.isMuted = false;
    eng.refresh();
    assert.strictEqual(a.volume, 0.8);
  },

  async 'bad input never throws'() {
    const env = makeEnv();
    const eng = loadEngine(env).create({ musicAudio: true, assetsBase: '../../assets/' });
    assert.doesNotThrow(() => {
      eng.setQueue(null); eng.setQueue([null, 3, '']); eng.enqueue(undefined); eng.setVolume('x');
      eng.setLoop(undefined); eng.next(); eng.stop(); eng.pause();
    });
    assert.strictEqual(eng.play(), false, 'empty queue');
  },

  async 'no assets base: silent, no fetch'() {
    const env = makeEnv();
    let fetched = false;
    env.fetch = async () => { fetched = true; return { ok: true, json: async () => TRACKS }; };
    const eng = loadEngine(env).create({ musicAudio: true });
    eng.setQueue(['rec_a']);
    eng.play();
    await tick(); await tick();
    assert.strictEqual(eng.getState().status, 'silent');
    assert.strictEqual(fetched, false);
  },
};

(async () => {
  let failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    warnings.length = 0;
    try {
      await fn();
      console.log('ok   ' + name);
    } catch (e) {
      failed++;
      console.log('FAIL ' + name + '\n     ' + (e && e.message ? e.message : e));
    }
  }
  // Process-level cleanup: the mocked globals must not leak into other tests.
  delete global.window; delete global.Audio; delete global.fetch; delete global.Sound;
  if (failed) { console.log(`audio-edge-test: ${failed} failed`); process.exit(1); }
  console.log(`audio-edge-test: ${Object.keys(tests).length} passed`);
})();
