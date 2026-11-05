/*
 * MusicEngine: WebAudio graph for Domek music (MUSIC_PLAN 5.5, PK-34b).
 * Stems start on one clock, loops use loopStart/loopEnd, ducking and a night filter.
 * Works in the browser (window.MusicEngine) and in Node (module.exports) for tests.
 * The engine does not decide what to play; MusicDirector does that.
 */
(function (root) {
  'use strict';

  var DEFAULT_FADE_MS = 1500;
  var DUCK_DB = -5;
  var DUCK_DOWN_S = 0.04;
  var DUCK_HOLD_S = 0.4;
  var NIGHT_LOWPASS_HZ = 1800;
  var OPEN_LOWPASS_HZ = 20000;
  var START_LEAD_S = 0.1;

  function dbToGain(db) {
    return Math.pow(10, db / 20);
  }

  function clamp01(v) {
    if (typeof v !== 'number' || isNaN(v)) return 0;
    return v < 0 ? 0 : (v > 1 ? 1 : v);
  }

  /**
   * @param {object} options
   *   ctx: AudioContext-like object (currentTime, destination, createGain, createBiquadFilter, createBufferSource)
   *   loadBuffer: function(file) -> Promise<AudioBuffer-like> (decoded audio)
   *   fadeMs: optional default crossfade in ms (1500)
   */
  function createEngine(options) {
    var ctx = options.ctx;
    var loadBuffer = options.loadBuffer;
    var fadeMs = typeof options.fadeMs === 'number' ? options.fadeMs : DEFAULT_FADE_MS;

    // Graph: sources -> trackGain -> duckGain -> nightFilter -> master -> destination
    var master = ctx.createGain();
    var nightFilter = ctx.createBiquadFilter();
    var duckGain = ctx.createGain();
    var trackBus = ctx.createGain();
    nightFilter.type = 'lowpass';
    nightFilter.frequency.value = OPEN_LOWPASS_HZ;
    duckGain.gain.value = 1;
    trackBus.gain.value = 1;
    master.gain.value = 0.6;
    trackBus.connect(duckGain);
    duckGain.connect(nightFilter);
    nightFilter.connect(master);
    master.connect(ctx.destination);

    var volume = 0.6;
    var enabled = true;
    var nightOn = false;
    var current = null; // { id, voices: [{ src, gain }] }
    var loadToken = 0;

    function applyMaster() {
      master.gain.value = enabled ? volume : 0;
    }

    function fadeOutVoices(voices, when, fade) {
      voices.forEach(function (v) {
        v.gain.gain.cancelScheduledValues(when);
        v.gain.gain.setValueAtTime(v.gain.gain.value, when);
        v.gain.gain.linearRampToValueAtTime(0, when + fade);
        v.src.stop(when + fade + 0.05);
      });
    }

    /**
     * Starts a track definition: { id, loop, loopStart, loopEnd, file, stems? }.
     * Stems: { name: { file, enter } } with enter in seconds. All stems share one start time.
     */
    function play(def, opts) {
      opts = opts || {};
      var fade = typeof opts.fadeMs === 'number' ? opts.fadeMs : fadeMs;
      var token = ++loadToken;
      var stemDefs = def.stems ? Object.keys(def.stems).map(function (name) {
        return { name: name, file: def.stems[name].file, enter: def.stems[name].enter || 0 };
      }) : [{ name: 'main', file: def.file, enter: 0 }];

      nightOn = !!opts.night;
      nightFilter.frequency.value = nightOn ? NIGHT_LOWPASS_HZ : OPEN_LOWPASS_HZ;

      return Promise.all(stemDefs.map(function (s) { return loadBuffer(s.file); }))
        .then(function (buffers) {
          if (token !== loadToken) return null; // a newer play() superseded this one
          var when = ctx.currentTime + START_LEAD_S;
          var voices = [];
          stemDefs.forEach(function (s, i) {
            var buf = buffers[i];
            var src = ctx.createBufferSource();
            var g = ctx.createGain();
            src.buffer = buf;
            if (def.loop !== false) {
              src.loop = true;
              src.loopStart = def.loopStart || 0;
              src.loopEnd = def.loopEnd || (buf && buf.duration) || 0;
            }
            src.connect(g);
            g.connect(trackBus);
            if (s.enter > 0) {
              g.gain.setValueAtTime(0, when);
              g.gain.linearRampToValueAtTime(1, when + s.enter);
            } else {
              g.gain.setValueAtTime(1, when);
            }
            src.start(when, 0);
            voices.push({ src: src, gain: g });
          });

          if (current) {
            var old = current.voices;
            fadeOutVoices(old, when, fade / 1000);
          }
          current = { id: def.id, voices: voices };
          return current;
        });
    }

    function stop(fade) {
      loadToken++;
      if (!current) return;
      var f = typeof fade === 'number' ? fade : fadeMs;
      fadeOutVoices(current.voices, ctx.currentTime, f / 1000);
      current = null;
    }

    function setVolume(v) {
      volume = clamp01(v);
      applyMaster();
    }

    function setEnabled(on) {
      enabled = !!on;
      applyMaster();
    }

    function setNightFilter(on) {
      nightOn = !!on;
      nightFilter.frequency.value = nightOn ? NIGHT_LOWPASS_HZ : OPEN_LOWPASS_HZ;
    }

    /** Ducking: -5 dB in 40 ms, back to 0 dB after 400 ms. Triggered by wheek, purr, crunch, pop. */
    function duck() {
      var now = ctx.currentTime;
      var g = duckGain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(dbToGain(DUCK_DB), now + DUCK_DOWN_S);
      g.linearRampToValueAtTime(1, now + DUCK_DOWN_S + DUCK_HOLD_S);
    }

    return {
      play: play,
      stop: stop,
      setVolume: setVolume,
      setEnabled: setEnabled,
      setNightFilter: setNightFilter,
      duck: duck,
      currentId: function () { return current ? current.id : null; },
      isNightFilter: function () { return nightOn; },
      volume: function () { return volume; },
      isEnabled: function () { return enabled; }
    };
  }

  var api = { create: createEngine, DEFAULT_FADE_MS: DEFAULT_FADE_MS, dbToGain: dbToGain };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MusicEngine = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
