// Unit test: music engine on a mocked Audio (no real sound, no browser).
// Usage: node tools/qa/music-engine-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const ENGINE_PATH = path.join(ROOT, 'web', 'home', 'features', 'music', 'engine.js');
const Engine = require(ENGINE_PATH);
const C = require(path.join(ROOT, 'web', 'home', 'features', 'music', 'contract.js'));
const tracks = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'music', 'tracks.json'), 'utf8'));
const BASE = 'https://cuy.assets/';

// Mock Audio: records instances, scripted failures, fires events on demand.
const cfg = {};
function resetMock() {
  for (const k of Object.keys(cfg)) delete cfg[k];
  cfg.canPlay = 'probably';
  cfg.throwOnNew = null;
  cfg.playError = null; // Error to reject play() with
  MockAudio.instances = [];
}
class MockAudio {
  constructor(src) {
    if (cfg.throwOnNew) throw cfg.throwOnNew;
    this.src = src === undefined ? '' : src;
    this.paused = true;
    this.volume = 1;
    this.loop = false;
    this.plays = 0;
    this.pauses = 0;
    this.listeners = {};
    MockAudio.instances.push(this);
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
  fire(type) {
    (this.listeners[type] || []).forEach((fn) => fn({ type }));
  }
  canPlayType() {
    return cfg.canPlay;
  }
  play() {
    this.plays++;
    if (cfg.playError) {
      const name = cfg.playError; // consumed: only the first play() fails
      cfg.playError = null;
      const e = new Error(name);
      e.name = name === 'autoplay' ? 'NotAllowedError' : name;
      return Promise.reject(e);
    }
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.pauses++;
    this.paused = true;
  }
}
MockAudio.instances = [];

// Globals the engine reads at call time.
globalThis.Audio = MockAudio;
globalThis.Sound = { isMuted: false };
globalThis.fetch = async (url) => {
  if (!String(url).endsWith('music/tracks.json')) throw new Error('unexpected fetch ' + url);
  return { ok: true, status: 200, json: async () => tracks };
};
const target = new EventTarget();
globalThis.addEventListener = (t, f) => target.addEventListener(t, f);
globalThis.removeEventListener = (t, f) => target.removeEventListener(t, f);

let warns = [];
const realWarn = console.warn;
console.warn = (...args) => warns.push(args.join(' '));

const flush = () => new Promise((r) => setImmediate(r));
// The engine probes ogg support with one element that has no src; only elements with a src count as tracks.
const played = () => MockAudio.instances.filter((a) => a.src !== '');
const last = () => played()[played().length - 1];
const ids = ['disc_rock_01', 'disc_jazz_02', 'disc_blues_03'];
const trackUrl = (id) => BASE + C.trackForRecord(id, tracks).file;

function newEngine(extra) {
  return Engine.create(Object.assign({ assetsBase: BASE }, extra || {}));
}

const tests = {
  async 'record maps to the contract track and the chosen base'() {
    resetMock();
    const e = newEngine();
    e.setQueue([ids[0]]);
    e.play();
    await flush();
    assert.strictEqual(last().src, trackUrl(ids[0]));
    assert.ok(last().src.startsWith('https://cuy.assets/music/'));
    const e2 = newEngine({ assetsBase: '../../assets/' });
    e2.setQueue([ids[0]]);
    e2.play();
    await flush();
    assert.strictEqual(last().src, '../../assets/' + C.trackForRecord(ids[0], tracks).file);
  },
  async 'queue plays in order, loop wraps, no loop stops at the end'() {
    resetMock();
    const e = newEngine();
    e.setQueue(ids);
    e.play();
    await flush();
    assert.strictEqual(e.getState().recordId, ids[0]);
    last().fire('ended');
    await flush();
    assert.strictEqual(e.getState().recordId, ids[1]);
    last().fire('ended');
    await flush();
    last().fire('ended');
    await flush();
    assert.strictEqual(e.getState().recordId, ids[0], 'loop on: wraps to first');
    e.setLoop(false);
    e.next(); await flush(); e.next(); await flush();
    assert.strictEqual(e.getState().recordId, ids[2]);
    last().fire('ended');
    await flush();
    assert.strictEqual(e.getState().status, 'stopped');
    assert.strictEqual(e.getState().index, 0);
  },
  async 'pause keeps the element and play resumes it'() {
    resetMock();
    const e = newEngine();
    e.setQueue([ids[0]]);
    e.play(); await flush();
    const a = last();
    assert.strictEqual(e.pause(), true);
    assert.strictEqual(a.paused, true);
    assert.strictEqual(e.getState().status, 'paused');
    e.play(); await flush();
    assert.strictEqual(played().length, 1, 'no second element on resume');
    assert.strictEqual(a.paused, false);
    assert.strictEqual(e.getState().status, 'playing');
  },
  async 'volume applies to the element and the mute flag from Sound wins'() {
    resetMock();
    const e = newEngine();
    e.setQueue([ids[0]]);
    e.play(); await flush();
    e.setVolume(0.5);
    assert.strictEqual(last().volume, 0.5);
    e.setVolume(7);
    assert.strictEqual(e.getState().volume, 1);
    e.setVolume(NaN);
    assert.strictEqual(e.getState().volume, 1, 'NaN is ignored');
    e.setVolume(0.5);
    globalThis.Sound.isMuted = true;
    e.refresh();
    assert.strictEqual(last().volume, 0);
    assert.strictEqual(e.getState().muted, true);
    globalThis.Sound.isMuted = false;
    e.refresh();
    assert.strictEqual(last().volume, 0.5);
  },
  async 'autoplay blocked: waits, one warn, starts after the first click'() {
    resetMock();
    warns = [];
    const e = newEngine();
    e.setQueue([ids[0]]);
    cfg.playError = 'autoplay';
    e.play(); await flush();
    assert.strictEqual(e.getState().status, 'waiting');
    assert.strictEqual(warns.length, 1);
    assert.strictEqual(played().length, 1, 'no skip to another track');
    cfg.playError = null;
    target.dispatchEvent(new Event('pointerdown'));
    await flush();
    assert.strictEqual(e.getState().status, 'playing');
    assert.strictEqual(played()[0].paused, false);
  },
  async 'no audio device at probe: silent, one warn, no exception'() {
    resetMock();
    warns = [];
    const e = newEngine();
    e.setQueue(ids);
    cfg.throwOnNew = new Error('no device');
    assert.doesNotThrow(() => e.play());
    await flush();
    e.pause(); e.play(); await flush();
    assert.strictEqual(warns.length, 1);
    assert.strictEqual(e.getState().status, 'silent');
  },
  async 'device lost mid-queue: every failed track warns once, queue ends in error'() {
    resetMock();
    warns = [];
    const e = newEngine();
    e.setQueue(ids);
    e.play(); await flush();
    cfg.throwOnNew = new Error('device lost');
    e.next(); await flush();
    assert.strictEqual(warns.length, ids.length, 'one warn per failed track, then the queue stops');
    assert.strictEqual(e.getState().status, 'error');
    assert.doesNotThrow(() => e.stop());
  },
  async 'play rejected with a non-autoplay error skips to the next track'() {
    resetMock();
    warns = [];
    const e = newEngine();
    e.setQueue(ids);
    cfg.playError = 'NotSupportedError';
    e.play(); await flush();
    cfg.playError = null;
    assert.strictEqual(warns.length, 1, 'one warn for the failed play');
    assert.strictEqual(e.getState().recordId, ids[1]);
    assert.strictEqual(e.getState().status, 'playing');
  },
  async 'missing file (404 / decode error event): one warn, next track, no crash'() {
    resetMock();
    warns = [];
    const e = newEngine();
    e.setQueue(ids);
    e.play(); await flush();
    last().fire('error');
    await flush();
    assert.strictEqual(warns.length, 1);
    assert.strictEqual(e.getState().recordId, ids[1]);
    assert.strictEqual(played().length, 2);
  },
  async 'decoder without ogg: silent, no play, one warn'() {
    resetMock();
    warns = [];
    cfg.canPlay = '';
    const e = newEngine();
    e.setQueue(ids);
    assert.doesNotThrow(() => e.play());
    await flush();
    e.pause(); e.play(); await flush();
    assert.strictEqual(e.getState().status, 'silent');
    assert.strictEqual(e.getState().audio, false);
    assert.strictEqual(warns.length, 1);
    assert.strictEqual(played().length, 0, 'no track element is created');
    assert.strictEqual(MockAudio.instances.length, 1, 'only the probe element');
  },
  async 'MUSIC_AUDIO=false: state works, no Audio element is created'() {
    resetMock();
    const e = newEngine({ musicAudio: false });
    e.setQueue(ids);
    assert.strictEqual(e.play(), true);
    assert.strictEqual(e.getState().status, 'playing');
    e.pause();
    assert.strictEqual(e.getState().status, 'paused');
    e.next();
    assert.strictEqual(e.getState().recordId, ids[1]);
    assert.strictEqual(played().length, 0);
    assert.strictEqual(e.getState().audio, false);
    assert.strictEqual(Engine.MUSIC_AUDIO, true, 'default flag stays on in the module');
  },
  async 'tracks.json failure: one warn, playback is a no-op'() {
    resetMock();
    warns = [];
    const savedFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => null });
    const e = newEngine();
    e.setQueue(ids);
    assert.doesNotThrow(() => e.play());
    await flush();
    globalThis.fetch = savedFetch;
    assert.strictEqual(warns.length, 1);
    assert.strictEqual(played().length, 0);
  },
  async 'stale ended event from an old element does not advance the queue'() {
    resetMock();
    const e = newEngine();
    e.setQueue(ids);
    e.play(); await flush();
    const old = last();
    e.next(); await flush();
    old.fire('ended');
    await flush();
    assert.strictEqual(e.getState().recordId, ids[1]);
  },
  async 'empty queue and bad ids are ignored'() {
    resetMock();
    const e = newEngine();
    assert.strictEqual(e.play(), false);
    assert.strictEqual(e.setQueue(['', 5, 'x']), 1);
    assert.strictEqual(e.enqueue(''), false);
    assert.strictEqual(e.enqueue('y'), true);
    assert.strictEqual(e.getState().queueLength, 2);
  }
};

(async () => {
  let failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try { await fn(); realWarn('ok   ' + name); }
    catch (e) { failed++; realWarn('FAIL ' + name + '\n     ' + e.message); }
  }
  console.warn = realWarn;
  realWarn(failed ? failed + ' failed' : 'all ' + Object.keys(tests).length + ' passed');
  process.exit(failed ? 1 : 0);
})();
