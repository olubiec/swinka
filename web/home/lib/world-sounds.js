/**
 * world-sounds.js — World/editor/farm event sound dispatcher with mute/suppression
 * awareness and per-event throttling. UMD module (window.WorldSounds / module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.WorldSounds = factory(root);
  }
})(typeof window !== 'undefined' ? window : this, function (root) {
  'use strict';

  const EVENT_MAP = Object.freeze({
    room_place: Object.freeze({ cue: 'place', file: null, minIntervalMs: 60 }),
    room_move: Object.freeze({ cue: 'place', file: null, minIntervalMs: 80 }),
    room_remove: Object.freeze({ cue: 'remove', file: null, minIntervalMs: 60 }),
    room_flip: Object.freeze({ cue: 'flip', file: null, minIntervalMs: 60 }),
    room_buy: Object.freeze({ cue: 'coin', file: null, minIntervalMs: 80 }),
    edit_undo: Object.freeze({ cue: 'undo', file: null, minIntervalMs: 60 }),
    edit_redo: Object.freeze({ cue: 'redo', file: null, minIntervalMs: 60 }),
    edit_error: Object.freeze({ cue: 'error', file: null, minIntervalMs: 120 }),
    farm_plant: Object.freeze({ cue: 'plant', file: null, minIntervalMs: 80 }),
    farm_water: Object.freeze({ cue: 'water', file: null, minIntervalMs: 100 }),
    farm_harvest: Object.freeze({ cue: 'harvest', file: null, minIntervalMs: 80 }),
    coin_earn: Object.freeze({ cue: 'coin', file: null, minIntervalMs: 80 }),
    walk_grass: Object.freeze({ cue: 'step_grass', file: null, minIntervalMs: 320 }),
    fountain_ambience: Object.freeze({ cue: 'fountain', file: null, minIntervalMs: 1400 }),
    pig_wheek: Object.freeze({ cue: 'wheek', file: 'assets/sounds/wheek_1.wav', minIntervalMs: 400 }),
    pig_crunch: Object.freeze({ cue: 'crunch', file: 'assets/sounds/crunch_1.wav', minIntervalMs: 250 }),
    pig_purr: Object.freeze({ cue: 'wheek', file: 'assets/sounds/purr.wav', minIntervalMs: 500 })
  });

  let _suppressed = false;
  const _lastPlayed = Object.create(null);

  function resolveSettings(settings) {
    if (settings && typeof settings === 'object') return settings;
    if (root && root.bridge && typeof root.bridge.getState === 'function') {
      const state = root.bridge.getState();
      if (state && state.settings && typeof state.settings === 'object') {
        return state.settings;
      }
    }
    return null;
  }

  function resolveSound(soundOpt) {
    if (soundOpt && typeof soundOpt === 'object') return soundOpt;
    if (root && root.Sound) return root.Sound;
    return null;
  }

  function isSuppressed(settings, soundOpt) {
    if (_suppressed) return true;
    const snd = resolveSound(soundOpt);
    if (snd && snd.isMuted === true) return true;
    const s = resolveSettings(settings);
    if (s) {
      if (s.soundSuppressed === true) return true;
      if (typeof s.volume === 'number' && Number.isFinite(s.volume) && s.volume <= 0) return true;
    }
    return false;
  }

  function setSuppressed(flag) {
    _suppressed = Boolean(flag);
  }

  function canPlay(eventName, nowMs, opts) {
    if (typeof eventName !== 'string' || !eventName) return false;
    const entry = EVENT_MAP[eventName];
    if (!entry) return false;
    const o = opts && typeof opts === 'object' ? opts : null;
    if (isSuppressed(o && o.settings, o && o.sound)) return false;
    const now = typeof nowMs === 'number' && Number.isFinite(nowMs) ? nowMs : Date.now();
    const last = _lastPlayed[eventName];
    if (typeof last === 'number' && Number.isFinite(last) && (now - last) < entry.minIntervalMs) {
      return false;
    }
    return true;
  }

  function play(eventName, opts) {
    if (typeof eventName !== 'string' || !eventName) {
      return { played: false, cue: null, reason: 'bad_input' };
    }
    const entry = EVENT_MAP[eventName];
    if (!entry) {
      return { played: false, cue: null, reason: 'unknown_event' };
    }

    const o = opts && typeof opts === 'object' ? opts : null;
    const snd = resolveSound(o && o.sound);
    if (isSuppressed(o && o.settings, snd)) {
      return { played: false, cue: entry.cue, reason: 'suppressed' };
    }

    const nowMs = o && typeof o.nowMs === 'number' && Number.isFinite(o.nowMs) ? o.nowMs : Date.now();
    const last = _lastPlayed[eventName];
    if (typeof last === 'number' && Number.isFinite(last) && (nowMs - last) < entry.minIntervalMs) {
      return { played: false, cue: entry.cue, reason: 'throttled' };
    }

    _lastPlayed[eventName] = nowMs;

    if (snd) {
      if (typeof snd.play === 'function') {
        const ok = snd.play(entry.cue);
        if (ok === false) {
          return { played: false, cue: entry.cue, reason: 'muted' };
        }
      } else if (typeof snd[entry.cue] === 'function') {
        snd[entry.cue]();
      }
    }

    return { played: true, cue: entry.cue };
  }

  function resetThrottle() {
    const keys = Object.keys(_lastPlayed);
    for (let i = 0; i < keys.length; i += 1) {
      delete _lastPlayed[keys[i]];
    }
  }

  return {
    EVENT_MAP: EVENT_MAP,
    isSuppressed: isSuppressed,
    setSuppressed: setSuppressed,
    canPlay: canPlay,
    play: play,
    resetThrottle: resetThrottle
  };
});
