// tools/qa/ux-p41-audio.js
// Verification for PK-P41c: Music state around minigames
// Tests:
// A1 start-registers: entering each game creates >= 0 tracked sources and records home music state
// A2 leave-silences: after leave, live (playing) tracked sources == 0 for every game
// A3 home-music-restored: playing/volume/position state of home music equals state before entering (if off, stays off)
// A4 leave-paths: Back, X, Esc and pagehide each trigger teardown exactly once (spy)
// A5 reenter: entering again after leaving works and does not double-play
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

function createEnv() {
  let liveAudioCount = 0;
  let liveContextCount = 0;

  class FakeAudio {
    constructor(src = '') {
      this.src = src;
      this.paused = true;
      this.volume = 1.0;
      this.currentTime = 0;
      this.loop = false;
      this._listeners = {};
    }
    addEventListener(evt, fn) {
      this._listeners[evt] = this._listeners[evt] || [];
      this._listeners[evt].push(fn);
    }
    play() {
      if (this.paused) {
        this.paused = false;
        liveAudioCount++;
      }
      return Promise.resolve();
    }
    pause() {
      if (!this.paused) {
        this.paused = true;
        liveAudioCount = Math.max(0, liveAudioCount - 1);
      }
    }
    disconnect() {
      this.pause();
    }
    stop() {
      this.pause();
    }
  }

  class FakeAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.destination = {};
      liveContextCount++;
    }
    createGain() {
      let isConnected = true;
      return {
        gain: {
          value: 1,
          setValueAtTime(v) { this.value = v; },
          setTargetAtTime(v) { this.value = v; },
          linearRampToValueAtTime(v) { this.value = v; },
          exponentialRampToValueAtTime(v) { this.value = v; },
          cancelScheduledValues() {}
        },
        connect() { isConnected = true; },
        disconnect() { isConnected = false; },
        get isConnected() { return isConnected; }
      };
    }
    createOscillator() {
      let isPlaying = false;
      return {
        frequency: {
          value: 440,
          setValueAtTime(v) { this.value = v; },
          linearRampToValueAtTime(v) { this.value = v; },
          exponentialRampToValueAtTime(v) { this.value = v; }
        },
        type: 'sine',
        connect() {},
        disconnect() { isPlaying = false; },
        start() { isPlaying = true; },
        stop() { isPlaying = false; },
        get isPlaying() { return isPlaying; }
      };
    }
    createBuffer(channels, length, rate) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      let isPlaying = false;
      return {
        buffer: null,
        connect() {},
        disconnect() { isPlaying = false; },
        start() { isPlaying = true; },
        stop() { isPlaying = false; }
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { setValueAtTime() {} },
        Q: { setValueAtTime() {} },
        connect() {},
        disconnect() {}
      };
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
    close() {
      if (this.state !== 'closed') {
        this.state = 'closed';
        liveContextCount = Math.max(0, liveContextCount - 1);
      }
      return Promise.resolve();
    }
  }

  const winListeners = {};
  const docListeners = {};

  class FakeElement {
    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase();
      this.children = [];
      this.parentNode = null;
      this.id = '';
      this.className = '';
      this.classList = {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        contains(c) { return this._set.has(c); }
      };
      this.style = {};
      this._listeners = {};
      this._innerHTML = '';
    }
    get innerHTML() { return this._innerHTML; }
    set innerHTML(val) {
      this._innerHTML = val;
      // If setting innerHTML with play screen, ensure elements exist in document map
      if (typeof val === 'string') {
        const idMatches = val.match(/id=["']([^"']+)["']/g);
        if (idMatches) {
          idMatches.forEach((m) => {
            const rawId = m.replace(/id=["']|["']/g, '');
            docElements.set(rawId, doc.getElementById(rawId));
          });
        }
      }
    }
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    addEventListener(type, fn) {
      this._listeners[type] = this._listeners[type] || [];
      this._listeners[type].push(fn);
    }
    removeEventListener(type, fn) {
      this._listeners[type] = (this._listeners[type] || []).filter((f) => f !== fn);
    }
    closest(selector) {
      const selectors = selector.split(',').map((s) => s.trim());
      let el = this;
      while (el) {
        for (const sel of selectors) {
          if (sel.startsWith('#') && el.id === sel.slice(1)) return el;
          if (sel.startsWith('.') && el.classList.contains(sel.slice(1))) return el;
          if (sel === el.tagName.toLowerCase()) return el;
          if (sel.startsWith('[data-action=') && el.dataset && ('[data-action="' + el.dataset.action + '"]') === sel) return el;
        }
        el = el.parentNode;
      }
      return null;
    }
    click() {
      const evt = { target: this, type: 'click', bubbles: true };
      (this._listeners['click'] || []).slice().forEach((fn) => fn(evt));
      (docListeners['click'] || []).slice().forEach((fn) => fn(evt));
    }
  }

  const docElements = new Map();
  const doc = {
    hidden: false,
    body: new FakeElement('body'),
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => {
      if (!docElements.has(id)) {
        const el = new FakeElement('div');
        el.id = id;
        docElements.set(id, el);
      }
      return docElements.get(id);
    },
    querySelector: (sel) => {
      if (sel.startsWith('#')) return doc.getElementById(sel.slice(1));
      return new FakeElement('div');
    },
    addEventListener: (type, fn) => {
      docListeners[type] = docListeners[type] || [];
      docListeners[type].push(fn);
    },
    removeEventListener: (type, fn) => {
      docListeners[type] = (docListeners[type] || []).filter((f) => f !== fn);
    }
  };

  const win = {
    URL,
    console,
    location: { href: 'http://localhost/web/home/minigames/minigames-api.js' },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    document: doc,
    Audio: FakeAudio,
    AudioContext: FakeAudioContext,
    webkitAudioContext: FakeAudioContext,
    addEventListener: (type, fn) => {
      winListeners[type] = winListeners[type] || [];
      winListeners[type].push(fn);
    },
    removeEventListener: (type, fn) => {
      winListeners[type] = (winListeners[type] || []).filter((f) => f !== fn);
    },
    fetch: async () => ({
      ok: true,
      json: async () => ['veggie-rain.js', 'nyan-cuy.js', 'veggie-memory.js', 'hay-maze.js']
    }),
    Sound: {
      isMuted: false,
      click() {},
      wheek() {},
      crunch() {},
      fanfare() {}
    },
    bridge: {
      getState: () => ({
        stageKey: 'adult',
        clovers: 25,
        minigames: { dailyRewardedCount: 1, dailyMax: 10, records: {}, plays: {} }
      }),
      send() {}
    },
    CuySprites: {
      normBreed: (b) => b || 'smooth',
      activePig: () => ({ breed: 'smooth', paletteId: 'tricolor' })
    },
    Phaser: {
      AUTO: 0,
      CANVAS: 1,
      WEBGL: 2,
      Scale: { FIT: 1, RESIZE: 2, NONE: 0 },
      Game: class FakeGame {
        constructor(cfg) {
          this.config = cfg;
          this.sound = {
            context: new FakeAudioContext(),
            sounds: []
          };
          this.scene = { scenes: [] };
          if (cfg && cfg.scene) {
            const SceneClass = typeof cfg.scene === 'function' ? cfg.scene : null;
            if (SceneClass) {
              const sc = new SceneClass();
              sc.sound = this.sound;
              this.scene.scenes.push(sc);
              try { if (sc.preload) sc.preload(); } catch (e) {}
              try { if (sc.create) sc.create(); } catch (e) {}
            }
          }
        }
        destroy() {
          if (this.sound && this.sound.context) this.sound.context.close();
        }
      },
      Scene: class FakeScene {
        constructor(name) {
          this.name = name;
          this.events = {
            on(evt, fn) { this._l = this._l || {}; (this._l[evt] = this._l[evt] || []).push(fn); },
            emit(evt) { ((this._l && this._l[evt]) || []).forEach((f) => f()); }
          };
          this.sound = {
            context: new FakeAudioContext(),
            sounds: []
          };
          this.load = { spritesheet() {}, image() {} };
          this.add = {
            rectangle: () => ({ setOrigin() { return this; } }),
            text: () => ({ setInteractive: () => ({ on: () => {} }), setOrigin() { return this; }, setDepth() { return this; } }),
            image: () => ({ setDepth() { return this; } }),
            group: () => ({ add() {}, destroy() {} })
          };
          this.physics = {
            add: {
              group: () => ({ clear() {}, add() {} }),
              overlap: () => {}
            }
          };
          this.input = {
            on() {},
            keyboard: {
              createCursorKeys: () => ({ left: {}, right: {}, up: {}, down: {} }),
              addKey: () => ({})
            }
          };
          this.tweens = { add() {} };
          this.time = { addEvent: () => ({ remove() {} }) };
          this.scheduleTreatSpawn = () => {};
          this.scheduleObstacleSpawn = () => {};
        }
      }
    }
  };

  win.window = win;
  win.self = win;

  const sandbox = vm.createContext(win);

  // Load minigame scripts into sandbox
  const filesToLoad = [
    'web/home/minigames/minigames-api.js',
    'web/home/minigames/nyan-audio.js',
    'web/home/minigames/veggie-rain.js',
    'web/home/minigames/nyan-cuy.js',
    'web/home/minigames/veggie-memory.js'
  ];

  for (const rel of filesToLoad) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }

  function dispatchWinEvent(type, eventObj = {}) {
    eventObj.type = type;
    (winListeners[type] || []).slice().forEach((fn) => fn(eventObj));
  }

  function dispatchDocEvent(type, eventObj = {}) {
    eventObj.type = type;
    (docListeners[type] || []).slice().forEach((fn) => fn(eventObj));
  }

  return {
    window: win,
    document: doc,
    MiniGames: win.MiniGames || win.Minigry,
    FakeAudio,
    FakeAudioContext,
    get liveAudioCount() { return liveAudioCount; },
    get liveContextCount() { return liveContextCount; },
    dispatchWinEvent,
    dispatchDocEvent
  };
}

const tests = {
  // A1 start-registers: entering each of the games creates >= 0 tracked sources and records the home music state.
  'A1 start-registers': async () => {
    const env = createEnv();
    const mg = env.MiniGames;
    assert(mg, 'MiniGames manager exists');

    const games = mg.getAllGames();
    assert(games.length >= 3, `at least 3 minigames registered, found ${games.length}`);

    const container = env.document.getElementById('modalBody');

    for (const game of games) {
      const homeMusic = new env.FakeAudio('assets/music/home.ogg');
      homeMusic.paused = false;
      homeMusic.volume = 0.72;
      homeMusic.currentTime = 14.5;

      mg.setHomeMusic(homeMusic);
      mg.start(game.id, { container });

      const tracked = mg.getTrackedSources();
      assert(Array.isArray(tracked), `${game.id}: trackedSources is an array`);
      assert(tracked.length >= 0, `${game.id}: tracked sources count >= 0 (got ${tracked.length})`);

      const saved = mg.getHomeMusicState();
      assert(saved !== null, `${game.id}: home music state was recorded`);
      assert.strictEqual(saved.playing, true, `${game.id}: recorded playing state`);
      assert.strictEqual(saved.volume, 0.72, `${game.id}: recorded volume`);
      assert.strictEqual(saved.position, 14.5, `${game.id}: recorded position`);

      mg.leave();
    }
  },

  // A2 leave-silences: after leave, live (playing) tracked sources == 0 for every game.
  'A2 leave-silences': async () => {
    const env = createEnv();
    const mg = env.MiniGames;
    const container = env.document.getElementById('modalBody');
    const games = mg.getAllGames();

    for (const game of games) {
      // Audio source created before or during the game
      const dummyAudio = new env.FakeAudio('sfx.ogg');
      dummyAudio.play();
      mg.start(game.id, { container, audio: dummyAudio });

      // If game doesn't auto-track, ensure dummyAudio was tracked
      mg.track(dummyAudio);

      assert(mg.getLiveSources().length > 0, `${game.id}: has live sources while running`);

      mg.leave();

      const liveAfter = mg.getLiveSources();
      assert.strictEqual(liveAfter.length, 0, `${game.id}: live tracked sources == 0 after leave`);
      assert.strictEqual(dummyAudio.paused, true, `${game.id}: tracked audio was silenced`);
    }
  },

  // A3 home-music-restored: playing/volume/position state of the home music equals the state before entering (if home music was off, it stays off).
  'A3 home-music-restored': async () => {
    const env = createEnv();
    const mg = env.MiniGames;
    const container = env.document.getElementById('modalBody');

    // Case 1: Home music was ON
    const homeMusicOn = new env.FakeAudio('assets/music/home.ogg');
    homeMusicOn.paused = false;
    homeMusicOn.volume = 0.85;
    homeMusicOn.currentTime = 31.4;
    mg.setHomeMusic(homeMusicOn);

    mg.start('nyan-cuy', { container });
    mg.leave();

    assert.strictEqual(homeMusicOn.paused, false, 'home music was resumed');
    assert.strictEqual(homeMusicOn.volume, 0.85, 'home music volume restored');
    assert.strictEqual(homeMusicOn.currentTime, 31.4, 'home music position restored');

    // Case 2: Home music was OFF (must stay off)
    const homeMusicOff = new env.FakeAudio('assets/music/home.ogg');
    homeMusicOff.paused = true;
    homeMusicOff.volume = 0.45;
    homeMusicOff.currentTime = 5.0;
    mg.setHomeMusic(homeMusicOff);

    mg.start('nyan-cuy', { container });
    mg.leave();

    assert.strictEqual(homeMusicOff.paused, true, 'home music stayed off');
    assert.strictEqual(homeMusicOff.volume, 0.45, 'home music volume preserved');
  },

  // A4 leave-paths: Back, X, Esc and pagehide each trigger the teardown exactly once (spy).
  'A4 leave-paths': async () => {
    const env = createEnv();
    const mg = env.MiniGames;
    const container = env.document.getElementById('modalBody');

    let leaveCount = 0;
    const origLeave = mg.leave;
    mg.leave = function () {
      leaveCount++;
      return origLeave.apply(this, arguments);
    };

    try {
      // 1. Back button
      mg.start('veggie-rain', { container });
      leaveCount = 0;
      const backBtn = env.document.getElementById('minigamesBtnBack');
      backBtn.click();
      assert.strictEqual(leaveCount, 1, 'Back button triggered teardown exactly once');

      // 2. X (modal close button)
      mg.start('veggie-rain', { container });
      leaveCount = 0;
      const closeBtn = env.document.getElementById('modalCloseBtn');
      closeBtn.click();
      assert.strictEqual(leaveCount, 1, 'X button triggered teardown exactly once');

      // 3. Esc key
      mg.start('veggie-rain', { container });
      leaveCount = 0;
      env.dispatchWinEvent('keydown', { key: 'Escape' });
      assert.strictEqual(leaveCount, 1, 'Esc key triggered teardown exactly once');

      // 4. pagehide event
      mg.start('veggie-rain', { container });
      leaveCount = 0;
      env.dispatchWinEvent('pagehide');
      assert.strictEqual(leaveCount, 1, 'pagehide event triggered teardown exactly once');
    } finally {
      mg.leave = origLeave;
    }
  },

  // A5 reenter: entering again after leaving works and does not double-play.
  'A5 reenter': async () => {
    const env = createEnv();
    const mg = env.MiniGames;
    const container = env.document.getElementById('modalBody');

    // First entry
    mg.start('nyan-cuy', { container });
    const live1 = mg.getLiveSources().length;
    assert(live1 > 0, 'first entry has live audio');

    // Leave
    mg.leave();
    assert.strictEqual(mg.getLiveSources().length, 0, 'first leave silences all sources');

    // Reenter
    mg.start('nyan-cuy', { container });
    const live2 = mg.getLiveSources().length;
    assert(live2 > 0, 'reentering has live audio');
    assert.strictEqual(live2, live1, 'reentering does not double live audio sources');

    // Second leave
    mg.leave();
    assert.strictEqual(mg.getLiveSources().length, 0, 'second leave silences all sources');
  }
};

(async () => {
  let failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try {
      await fn();
      console.log('ok   ' + name);
    } catch (e) {
      failed++;
      console.error('FAIL ' + name + '\n     ' + (e && e.stack ? e.stack : e));
    }
  }
  if (failed > 0) {
    console.error(`ux-p41-audio: ${failed} failed`);
    process.exit(1);
  }
  console.log(`ux-p41-audio: ${Object.keys(tests).length} passed`);
})();
