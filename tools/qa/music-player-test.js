// Unit test: mini player (features/music/player.js) on the real engine with a mocked Audio (no sound, no browser).
// Covers the model, the button actions, volume, mute refresh, autoplay wait and MUSIC_AUDIO=false (silent panel).
// Usage: node tools/qa/music-player-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MUSIC_DIR = path.join(ROOT, 'web', 'home', 'features', 'music');
const Engine = require(path.join(MUSIC_DIR, 'engine.js'));
const Player = require(path.join(MUSIC_DIR, 'player.js'));
const tracks = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'music', 'tracks.json'), 'utf8'));
const BASE = 'https://cuy.assets/';
const ids = ['disc_rock_01', 'disc_jazz_02', 'disc_blues_03'];

// Mock Audio (same idea as music-engine-test.js): records instances, scripted play() failure.
const cfg = { playError: null };
class MockAudio {
  constructor(src) {
    this.src = src === undefined ? '' : src;
    this.paused = true;
    this.volume = 1;
    this.loop = false;
    this.listeners = {};
    MockAudio.instances.push(this);
  }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  canPlayType() { return 'probably'; }
  play() {
    if (cfg.playError) {
      const name = cfg.playError;
      cfg.playError = null;
      const e = new Error(name);
      e.name = name;
      return Promise.reject(e);
    }
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.paused = true; }
}
MockAudio.instances = [];

globalThis.Audio = MockAudio;
globalThis.Sound = { isMuted: false };
globalThis.fetch = async (url) => {
  if (!String(url).endsWith('music/tracks.json')) throw new Error('unexpected fetch ' + url);
  return { ok: true, status: 200, json: async () => tracks };
};

// Engine warnings go to a list instead of the console.
const warns = [];
console.warn = (text) => warns.push(String(text));

const flush = () => new Promise((r) => setTimeout(r, 0));
async function until(fn, label) {
  for (let i = 0; i < 50; i++) {
    if (fn()) return;
    await flush();
  }
  throw new Error('timed out waiting for ' + label);
}
const nameOf = (id) => 'Title of ' + id;

function newEngine(musicAudio) {
  MockAudio.instances = [];
  cfg.playError = null;
  return Engine.create({ assetsBase: BASE, musicAudio: musicAudio !== false });
}

const tests = {
  'model: empty queue shows the empty title and disables the buttons'() {
    const m = Player.playerModel({ status: 'stopped', recordId: null, index: 0, queueLength: 0, volume: 0.35, muted: false }, nameOf);
    assert.strictEqual(m.empty, true);
    assert.strictEqual(m.title, 'No records yet');
    assert.strictEqual(m.canPlay, false);
    assert.strictEqual(m.canNext, false);
    assert.strictEqual(m.count, '0/0');
    assert.strictEqual(m.volume, 35);
    assert.strictEqual(m.playing, false);
  },

  'model: title from nameOf, position, bar progress, playing flag'() {
    const base = { status: 'playing', recordId: ids[1], index: 1, queueLength: 3, volume: 0.5, muted: false };
    const m = Player.playerModel(base, nameOf);
    assert.strictEqual(m.title, 'Title of ' + ids[1]);
    assert.strictEqual(m.count, '2/3');
    assert.strictEqual(m.progress, 50);
    assert.strictEqual(m.playing, true);
    assert.strictEqual(Player.playerModel({ ...base, status: 'waiting' }, nameOf).playing, true, 'waiting counts as playing');
    assert.strictEqual(Player.playerModel({ ...base, status: 'paused' }, nameOf).playing, false);
    assert.strictEqual(Player.playerModel({ ...base, index: 2 }, nameOf).progress, 100);
    assert.strictEqual(Player.playerModel({ ...base, queueLength: 1, index: 0 }, nameOf).progress, 100);
    assert.strictEqual(Player.playerModel({ ...base, recordId: ids[0] }, null).title, ids[0], 'no nameOf: id is the title');
    assert.strictEqual(Player.playerModel({ ...base, volume: 2 }, nameOf).volume, 100, 'volume clamped');
    assert.strictEqual(Player.playerModel({ ...base, muted: true }, nameOf).muted, true);
  },

  async 'play/pause toggles through the engine and needs a queue'() {
    const e = newEngine();
    assert.strictEqual(Player.togglePlay(e), false, 'empty queue: nothing to play');
    assert.strictEqual(e.getState().status, 'stopped');
    e.setQueue(ids);
    assert.strictEqual(Player.togglePlay(e), true);
    await until(() => e.getState().status === 'playing', 'playing');
    assert.strictEqual(Player.playerModel(e.getState(), nameOf).playing, true);
    Player.togglePlay(e);
    assert.strictEqual(e.getState().status, 'paused');
    assert.strictEqual(Player.playerModel(e.getState(), nameOf).playing, false);
    Player.togglePlay(e);
    await until(() => e.getState().status === 'playing', 'resumed');
  },

  async 'next moves to the next record; without loop it stops at the end'() {
    const e = newEngine();
    e.setLoop(false);
    e.setQueue(ids);
    Player.togglePlay(e);
    await until(() => e.getState().status === 'playing', 'playing');
    assert.strictEqual(Player.next(e), true);
    assert.strictEqual(e.getState().recordId, ids[1]);
    Player.next(e);
    assert.strictEqual(e.getState().recordId, ids[2]);
    assert.strictEqual(Player.next(e), false, 'last track, no loop');
    assert.strictEqual(e.getState().status, 'stopped');
  },

  async 'next wraps when loop is on'() {
    const e = newEngine();
    e.setQueue(ids);
    Player.togglePlay(e);
    await until(() => e.getState().status === 'playing', 'playing');
    Player.next(e); Player.next(e);
    assert.strictEqual(Player.next(e), true);
    assert.strictEqual(e.getState().recordId, ids[0]);
  },

  'volume: slider percent maps to 0-1, rejects non-numbers, clamps'() {
    const e = newEngine();
    assert.strictEqual(Player.setVolume(e, 80), 0.8);
    assert.strictEqual(e.getState().volume, 0.8);
    assert.strictEqual(Player.setVolume(e, '25'), 0.25, 'string from the input');
    assert.strictEqual(Player.setVolume(e, 'abc'), false);
    assert.strictEqual(e.getState().volume, 0.25);
    Player.setVolume(e, 150);
    assert.strictEqual(e.getState().volume, 1);
  },

  async 'mute: engine refresh reads Sound.isMuted and the panel shows it'() {
    const e = newEngine();
    e.setQueue(ids);
    Player.togglePlay(e);
    await until(() => e.getState().status === 'playing', 'playing');
    const a = MockAudio.instances[MockAudio.instances.length - 1];
    globalThis.Sound.isMuted = true;
    e.refresh();
    assert.strictEqual(e.getState().muted, true);
    assert.strictEqual(a.volume, 0, 'muted: audio silent');
    assert.strictEqual(Player.playerModel(e.getState(), nameOf).muted, true);
    globalThis.Sound.isMuted = false;
    e.refresh();
    assert.strictEqual(a.volume, e.getState().volume);
  },

  async 'autoplay blocked: status waiting, the button still reads as playing and pauses'() {
    const e = newEngine();
    e.setQueue(ids);
    cfg.playError = 'NotAllowedError';
    Player.togglePlay(e);
    await until(() => e.getState().status === 'waiting', 'waiting');
    assert.strictEqual(Player.playerModel(e.getState(), nameOf).playing, true);
    Player.togglePlay(e);
    assert.strictEqual(e.getState().status, 'paused');
  },

  async 'MUSIC_AUDIO=false: the panel actions work with no Audio element'() {
    const e = newEngine(false);
    e.setQueue(ids);
    assert.strictEqual(Player.togglePlay(e), true);
    assert.strictEqual(e.getState().status, 'playing');
    assert.strictEqual(e.getState().audio, false);
    assert.strictEqual(MockAudio.instances.length, 0, 'no Audio created');
    assert.strictEqual(Player.next(e), true);
    assert.strictEqual(e.getState().recordId, ids[1]);
    Player.togglePlay(e);
    assert.strictEqual(e.getState().status, 'paused');
    assert.strictEqual(Player.playerModel(e.getState(), nameOf).count, '2/3');
  },

  'engine flag default: the player uses Engine.MUSIC_AUDIO'() {
    assert.strictEqual(typeof Engine.MUSIC_AUDIO, 'boolean');
    assert.strictEqual(Player.STATUS_TEXT.waiting, 'click to start');
  }
};

(async () => {
  let failed = 0;
  const out = (s) => process.stdout.write(s + '\n');
  for (const [name, fn] of Object.entries(tests)) {
    try { await fn(); out('ok   ' + name); }
    catch (e) { failed++; out('FAIL ' + name + '\n     ' + e.message); }
  }
  out(failed ? failed + ' failed' : 'all ' + Object.keys(tests).length + ' passed');
  process.exit(failed ? 1 : 0);
})();
