// Pure beat clock and dance rules for Home pigs.
// No DOM/I/O in the pure core. Browser: window.DanceSync. Node: module.exports.
(function (root) {
  'use strict';

  var DEFAULT_BPM = 120;
  var FRAMES_PER_BEAT = 4;
  var MIN_FPS = 4;
  var MAX_FPS = 16;
  var MAX_DANCE_MS = 30000;

  function toFiniteNumber(val, fallback) {
    return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  }

  function toPositiveNumber(val, fallback) {
    return typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : fallback;
  }

  function beatClock(opts) {
    var cfg = opts && typeof opts === 'object' ? opts : {};
    var activeBpm = toPositiveNumber(cfg.bpm, DEFAULT_BPM);
    var startMs = toFiniteNumber(cfg.startMs, 0);
    var offsetMs = toFiniteNumber(cfg.offsetMs, 0);
    var beatDurationMs = 60000 / activeBpm;
    var lastBeat = 0;
    var listeners = [];

    function elapsedFor(nowMs) {
      return nowMs - startMs - offsetMs;
    }

    function phase(nowMs) {
      if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) return 0;
      var elapsed = elapsedFor(nowMs);
      var p = (((elapsed % beatDurationMs) + beatDurationMs) % beatDurationMs) / beatDurationMs;
      return p >= 1 ? 0 : p;
    }

    function beatIndex(nowMs) {
      if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) return 0;
      return Math.floor(elapsedFor(nowMs) / beatDurationMs);
    }

    function onBeat(cb) {
      if (typeof cb !== 'function') {
        return function () {};
      }
      listeners.push(cb);
      return function unsubscribe() {
        var idx = listeners.indexOf(cb);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    }

    function update(nowMs) {
      if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) return false;
      var idx = beatIndex(nowMs);
      if (idx <= lastBeat) return false;
      lastBeat = idx;
      var snapshot = listeners.slice();
      for (var i = 0; i < snapshot.length; i++) {
        snapshot[i](idx, nowMs);
      }
      return true;
    }

    return {
      phase: phase,
      beatIndex: beatIndex,
      onBeat: onBeat,
      update: update,
      bpm: function () { return activeBpm; },
      beatMs: function () { return beatDurationMs; }
    };
  }

  function fpsForBpm(bpm, framesPerBeat) {
    var b = toPositiveNumber(bpm, DEFAULT_BPM);
    var fpb = toPositiveNumber(framesPerBeat, FRAMES_PER_BEAT);
    var raw = Math.round((b / 60) * fpb);
    return Math.max(MIN_FPS, Math.min(MAX_FPS, raw));
  }

  function stripQueryAndHash(str) {
    var q = str.indexOf('?');
    var h = str.indexOf('#');
    var cut = str.length;
    if (q !== -1 && q < cut) cut = q;
    if (h !== -1 && h < cut) cut = h;
    return str.slice(0, cut);
  }

  function resolveTrackBpm(trackIdOrSrc, bpmTable) {
    var table = bpmTable && typeof bpmTable === 'object' ? bpmTable : {};
    var fallbackBpm = toPositiveNumber(table.defaultBpm, DEFAULT_BPM);
    var tracks = table.tracks && typeof table.tracks === 'object' ? table.tracks : null;

    if (typeof trackIdOrSrc !== 'string' || !trackIdOrSrc || !tracks) {
      return { id: null, bpm: fallbackBpm, offsetMs: 0 };
    }

    if (Object.prototype.hasOwnProperty.call(tracks, trackIdOrSrc)) {
      var direct = tracks[trackIdOrSrc];
      if (direct && typeof direct === 'object') {
        return {
          id: trackIdOrSrc,
          bpm: toPositiveNumber(direct.bpm, fallbackBpm),
          offsetMs: toFiniteNumber(direct.offsetMs, 0)
        };
      }
    }

    var cleanSrc = stripQueryAndHash(trackIdOrSrc);
    var keys = Object.keys(tracks);
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var entry = tracks[id];
      if (!entry || typeof entry !== 'object' || typeof entry.file !== 'string' || !entry.file) {
        continue;
      }
      var file = entry.file;
      var slash = file.lastIndexOf('/');
      var base = slash !== -1 ? file.slice(slash + 1) : file;
      if (
        cleanSrc === file ||
        cleanSrc === base ||
        cleanSrc.endsWith('/' + file) ||
        cleanSrc.endsWith('/' + base)
      ) {
        return {
          id: id,
          bpm: toPositiveNumber(entry.bpm, fallbackBpm),
          offsetMs: toFiniteNumber(entry.offsetMs, 0)
        };
      }
    }

    return { id: null, bpm: fallbackBpm, offsetMs: 0 };
  }

  function shouldStartDance(ctx) {
    if (!ctx || typeof ctx !== 'object') return false;
    if (ctx.musicPlaying !== true || ctx.muted) return false;
    if (ctx.sleeping || ctx.sick || ctx.dragging || ctx.modalOpen) return false;
    var mood = toFiniteNumber(ctx.mood, 50);
    var energy = toFiniteNumber(ctx.energy, 50);
    return mood >= 20 && energy >= 15;
  }

  function shouldStopDance(ctx, elapsedMs) {
    if (!ctx || typeof ctx !== 'object') {
      return { stop: true, reason: 'music_stopped' };
    }
    if (!ctx.musicPlaying || ctx.muted) {
      return { stop: true, reason: 'music_stopped' };
    }
    var limit = toPositiveNumber(ctx.maxDanceMs, MAX_DANCE_MS);
    if (typeof elapsedMs === 'number' && Number.isFinite(elapsedMs) && elapsedMs >= limit) {
      return { stop: true, reason: 'time_limit' };
    }
    if (ctx.sleeping) {
      return { stop: true, reason: 'sleeping' };
    }
    if (ctx.sick) {
      return { stop: true, reason: 'sick' };
    }
    if (typeof ctx.mood === 'number' && Number.isFinite(ctx.mood) && ctx.mood < 15) {
      return { stop: true, reason: 'low_mood' };
    }
    if (typeof ctx.energy === 'number' && Number.isFinite(ctx.energy) && ctx.energy < 10) {
      return { stop: true, reason: 'low_energy' };
    }
    return { stop: false, reason: null };
  }

  function createBrowserSync(opts) {
    var cfg = opts && typeof opts === 'object' ? opts : {};
    var bpmTable = cfg.bpmTable && typeof cfg.bpmTable === 'object' ? cfg.bpmTable : null;
    var activeKey = null;
    var clock = null;

    function getEngine() {
      if (typeof window === 'undefined') return null;
      var player = window.CuyMusicPlayer;
      var engine = player && typeof player.autoEngine === 'function' ? player.autoEngine() : null;
      if (!engine && window.CuyMusicEngine && typeof window.CuyMusicEngine.getState === 'function') {
        engine = window.CuyMusicEngine;
      }
      return engine || null;
    }

    function getMusic() {
      if (typeof window === 'undefined') return null;
      var m = window.CuyMusic || null;
      if (m && typeof m.isPlaying === 'function' && m.isPlaying()) return m;
      var engine = getEngine();
      if (engine && typeof engine.getState === 'function') {
        var st = engine.getState();
        if (st && st.status === 'playing') return engine;
      }
      return m || engine;
    }

    function isMuted() {
      if (typeof window === 'undefined') return false;
      return Boolean(window.Sound && window.Sound.isMuted);
    }

    function setBpmTable(data) {
      bpmTable = data && typeof data === 'object' ? data : null;
      activeKey = null;
      clock = null;
    }

    function loadBpmTable(url) {
      if (typeof fetch !== 'function') {
        return Promise.resolve(null);
      }
      return fetch(url)
        .then(function (res) { return res && res.ok ? res.json() : null; })
        .then(function (data) {
          if (data) setBpmTable(data);
          return data;
        })
        .catch(function () { return null; });
    }

    function isMusicAudible() {
      if (isMuted()) return false;
      var music = getMusic();
      if (!music) return false;
      if (typeof music.getState === 'function' && typeof music.isPlaying !== 'function') {
        var st = music.getState();
        if (!st || st.status !== 'playing') return false;
        if (st.muted || (typeof st.volume === 'number' && st.volume <= 0)) return false;
        return true;
      }
      if (typeof music.isPlaying === 'function' && !music.isPlaying()) return false;
      if (typeof music.isEnabled === 'function' && !music.isEnabled()) return false;
      if (typeof music.getVolume === 'function' && music.getVolume() <= 0) return false;
      return true;
    }

    function currentTrackKey() {
      var music = getMusic();
      if (!music) return null;
      if (typeof music.getCurrentAudio === 'function') {
        var audio = music.getCurrentAudio();
        return audio && typeof audio.src === 'string' && audio.src ? audio.src : null;
      }
      if (typeof music.getState === 'function') {
        var st = music.getState();
        return st && typeof st.recordId === 'string' && st.recordId ? st.recordId : null;
      }
      return null;
    }

    function sync(nowMs) {
      var t = toFiniteNumber(nowMs, 0);
      var audible = isMusicAudible();
      var key = audible ? currentTrackKey() : null;

      if (!audible) {
        activeKey = null;
        clock = null;
        var defBpm = bpmTable && bpmTable.defaultBpm ? toPositiveNumber(bpmTable.defaultBpm, DEFAULT_BPM) : DEFAULT_BPM;
        return {
          audible: false,
          trackId: null,
          bpm: defBpm,
          fps: fpsForBpm(defBpm, bpmTable && bpmTable.framesPerBeat),
          phase: 0,
          beatChanged: false
        };
      }

      var resolved = resolveTrackBpm(key, bpmTable);
      if (!clock || key !== activeKey) {
        activeKey = key;
        clock = beatClock({
          bpm: resolved.bpm,
          startMs: t,
          offsetMs: resolved.offsetMs
        });
      }

      var beatChanged = clock.update(t);
      return {
        audible: true,
        trackId: resolved.id,
        bpm: clock.bpm(),
        fps: fpsForBpm(clock.bpm(), bpmTable && bpmTable.framesPerBeat),
        phase: clock.phase(t),
        beatChanged: beatChanged
      };
    }

    return {
      setBpmTable: setBpmTable,
      loadBpmTable: loadBpmTable,
      isMusicAudible: isMusicAudible,
      currentTrackKey: currentTrackKey,
      sync: sync
    };
  }

  var api = {
    DEFAULT_BPM: DEFAULT_BPM,
    FRAMES_PER_BEAT: FRAMES_PER_BEAT,
    MIN_FPS: MIN_FPS,
    MAX_FPS: MAX_FPS,
    MAX_DANCE_MS: MAX_DANCE_MS,
    beatClock: beatClock,
    fpsForBpm: fpsForBpm,
    resolveTrackBpm: resolveTrackBpm,
    shouldStartDance: shouldStartDance,
    shouldStopDance: shouldStopDance
  };

  if (typeof window !== 'undefined') {
    api.createBrowserSync = createBrowserSync;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.DanceSync = api;
}(typeof window !== 'undefined' ? window : globalThis));
