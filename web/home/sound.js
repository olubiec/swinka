/**
 * sound.js — Lightweight 8-bit retro sound synthesiser using the Web Audio API.
 * Works without audio files, reacts instantly to clicks.
 */

(function (root) {
  'use strict';

  // Compact ZzFX WebAudio synthesizer (Frank Force - MIT)
  if (typeof root.zzfxV === 'undefined') root.zzfxV = 0.3;
  const zzfxR = 44100;

  function ensureAudioContext() {
    if (!root.zzfxX && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        try { root.zzfxX = new Ctx(); } catch (e) {}
      }
    }
    if (root.zzfxX && root.zzfxX.state === 'suspended') {
      try { root.zzfxX.resume(); } catch (e) {}
    }
    return root.zzfxX || null;
  }

  function zzfxG(
    volume = 1, randomness = .05, frequency = 220, attack = 0, sustain = 0,
    release = .1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
    pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0,
    bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0, tremolo = 0
  ) {
    let PI2 = Math.PI * 2,
      sign = v => v > 0 ? 1 : -1,
      startSlide = slide *= 500 * PI2 / zzfxR / zzfxR,
      startFrequency = frequency *= (1 + randomness * 2 * Math.random() - randomness) * PI2 / zzfxR,
      b = [], t = 0, tm = 0, i = 0, j = 1, r = 0, c = 0, s = 0, f, length;

    attack = attack * zzfxR + 9;
    decay *= zzfxR;
    sustain *= zzfxR;
    release *= zzfxR;
    delay *= zzfxR;
    deltaSlide *= 500 * PI2 / zzfxR ** 3;
    modulation *= PI2 / zzfxR;
    pitchJump *= PI2 / zzfxR;
    pitchJumpTime *= zzfxR;
    repeatTime = repeatTime * zzfxR | 0;

    for (length = attack + decay + sustain + release + delay | 0; i < length; b[i++] = s) {
      if (!(++c % (bitCrush * 100 | 0))) {
        s = shape ? shape > 1 ? shape > 2 ? shape > 3 ?
          Math.sin((t % PI2) ** 3) :
          Math.max(Math.min(Math.tan(t), 1), -1) :
          1 - (2 * t / PI2 % 2 + 2) % 2 :
          1 - 4 * Math.abs(Math.round(t / PI2) - t / PI2) :
          Math.sin(t);

        s = (repeatTime ? 1 - tremolo + tremolo * Math.sin(PI2 * i / repeatTime) : 1) *
          sign(s) * (Math.abs(s) ** shapeCurve) *
          volume * root.zzfxV * (
            i < attack ? i / attack :
            i < attack + decay ? 1 - ((i - attack) / decay) * (1 - sustainVolume) :
            i < attack + decay + sustain ? sustainVolume :
            i < length - delay ? (length - i - delay) / release * sustainVolume :
            0);

        s = delay ? s / 2 + (delay > i ? 0 :
          (i < length - delay ? 1 : (length - i) / delay) * b[i - delay | 0] / 2) : s;
      }

      f = (frequency += slide += deltaSlide) * Math.cos(modulation * tm++);
      t += f - f * noise * (1 - (Math.sin(i) + 1) * 1e9 % 2);

      if (j && ++j > pitchJumpTime) {
        frequency += pitchJump;
        startFrequency += pitchJump;
        j = 0;
      }

      if (repeatTime && !(++r % repeatTime)) {
        frequency = startFrequency;
        slide = startSlide;
        j = j || 1;
      }
    }
    return b;
  }

  if (typeof root.zzfx !== 'function') {
    root.zzfx = function (...p) {
      const ctx = ensureAudioContext();
      if (!ctx) return null;
      try {
        const samples = zzfxG(...p);
        if (!samples || !samples.length) return null;
        const buffer = ctx.createBuffer(1, samples.length, zzfxR);
        buffer.getChannelData(0).set(samples);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        return source;
      } catch (e) {
        return null;
      }
    };
  }

  let isMuted = false;

  function resumeAudioContext() {
    ensureAudioContext();
  }

  // Resume context on first interaction
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', resumeAudioContext, { once: true });
    window.addEventListener('keydown', resumeAudioContext, { once: true });
  }

  function getSettings() {
    let settings = { volume: 0.7, soundSuppressed: false };
    if (window.bridge) {
      const state = window.bridge.getState();
      if (state && state.settings) {
        if (typeof state.settings.volume === 'number') settings.volume = state.settings.volume;
        if (typeof state.settings.soundSuppressed === 'boolean') settings.soundSuppressed = state.settings.soundSuppressed;
      }
    }
    return settings;
  }

  function checkSound() {
    if (isMuted) return false;
    const settings = getSettings();
    if (settings.soundSuppressed) return false;
    if (typeof root.zzfxV !== 'undefined') {
      root.zzfxV = settings.volume * 0.3;
    }
    return true;
  }

  const Sound = {
    get isMuted() {
      return isMuted;
    },
    set isMuted(val) {
      isMuted = Boolean(val);
      try { localStorage.setItem('cuy_muted', isMuted ? '1' : '0'); } catch (e) {}
    },

    get nyan() {
      return root.NyanAudio || null;
    },
    set nyan(val) {
      root.NyanAudio = val;
    },

    init() {
      try {
        isMuted = localStorage.getItem('cuy_muted') === '1';
      } catch (e) {}
    },

    // Short button click (retro bleep)
    click() {
      if (!checkSound()) return;
      if (root.zzfx) root.zzfx(1, 0.05, 440, 0, 0, 0.05, 1, 1, 100);
    },

    // Happy pig wheek ("WHEEE!")
    wheek() {
      if (!checkSound()) return;
      if (root.zzfx) root.zzfx(1, 0.05, 600, 0, 0.12, 0.13, 1, 1, 50, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0); // Approximation of wheek
    },

    // Crunching a vegetable / hay
    crunch() {
      if (!checkSound()) return;
      if (root.zzfx) {
        root.zzfx(1, 0.05, 320, 0, 0, 0.05, 2, 1, -50);
        setTimeout(() => { if(checkSound() && root.zzfx) root.zzfx(1, 0.05, 320, 0, 0, 0.05, 2, 1, -50); }, 70);
        setTimeout(() => { if(checkSound() && root.zzfx) root.zzfx(1, 0.05, 320, 0, 0, 0.05, 2, 1, -50); }, 140);
      }
    },

    // Sweeping / cleaning
    sweep() {
      if (!checkSound()) return;
      if (root.zzfx) root.zzfx(1, 0.05, 350, 0, 0.12, 0.03, 1, 1, -30);
    },

    // Success / earning clovers
    fanfare() {
      if (!checkSound()) return;
      if (root.zzfx) {
        root.zzfx(1, 0.05, 523.25, 0, 0.06, 0.06, 1);
        setTimeout(() => { if(checkSound() && root.zzfx) root.zzfx(1, 0.05, 659.25, 0, 0.06, 0.06, 1); }, 60);
        setTimeout(() => { if(checkSound() && root.zzfx) root.zzfx(1, 0.05, 783.99, 0, 0.06, 0.06, 1); }, 120);
        setTimeout(() => { if(checkSound() && root.zzfx) root.zzfx(1, 0.05, 1046.5, 0, 0.06, 0.06, 1); }, 180);
      }
    },

    // Happy double-jump chirp (popcorning)
    popcorn() {
      if (!checkSound()) return;
      if (root.zzfx) {
        root.zzfx(1, 0.05, 660, 0, 0.05, 0.06, 1, 1, 90);
        setTimeout(() => { if (checkSound() && root.zzfx) root.zzfx(1, 0.05, 880, 0, 0.06, 0.08, 1, 1, 110); }, 80);
      }
    },

    // Soft low purr when petted
    purr() {
      if (!checkSound()) return;
      if (root.zzfx) {
        root.zzfx(0.7, 0.05, 140, 0.02, 0.14, 0.12, 0, 1, 5, 0, 0, 0, 0.03, 0, 18);
      }
    },

    // Water droplet blips when drinking
    drink() {
      if (!checkSound()) return;
      if (root.zzfx) {
        root.zzfx(0.8, 0.05, 520, 0, 0.03, 0.05, 0, 1, 120);
        setTimeout(() => { if (checkSound() && root.zzfx) root.zzfx(0.8, 0.05, 620, 0, 0.03, 0.05, 0, 1, 120); }, 90);
      }
    },

    CUES: {
      click: [1, 0.05, 440, 0, 0, 0.05, 1, 1, 100],
      wheek: [1, 0.05, 600, 0, 0.12, 0.13, 1, 1, 50, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      crunch: [1, 0.05, 320, 0, 0, 0.05, 2, 1, -50],
      sweep: [1, 0.05, 350, 0, 0.12, 0.03, 1, 1, -30],
      fanfare: [1, 0.05, 783.99, 0, 0.08, 0.08, 1],
      popcorn: [1, 0.05, 740, 0, 0.06, 0.08, 1, 1, 100],
      purr: [0.7, 0.05, 140, 0.02, 0.14, 0.12, 0, 1, 5, 0, 0, 0, 0.03, 0, 18],
      drink: [0.8, 0.05, 560, 0, 0.03, 0.05, 0, 1, 120],
      room_place: [1, 0.05, 480, 0, 0.03, 0.05, 1, 1, 60],
      room_move: [0.9, 0.05, 390, 0, 0.02, 0.04, 1, 1, 40],
      room_remove: [0.9, 0.05, 300, 0, 0.03, 0.06, 1, 1, -60],
      room_flip: [0.9, 0.05, 520, 0, 0.02, 0.04, 1, 1, 80],
      room_buy: [1, 0.05, 659.25, 0, 0.06, 0.08, 1, 1, 90],
      edit_error: [0.9, 0.05, 180, 0, 0.06, 0.08, 2, 1, -40],
      lamp_on: [0.8, 0.05, 600, 0, 0.02, 0.04, 1, 1, 80],
      lamp_off: [0.8, 0.05, 420, 0, 0.02, 0.04, 1, 1, -60],
      fountain_ambience: [0.4, 0.1, 480, 0.01, 0.05, 0.08, 0, 1, 30]
    },

    play(cue) {
      if (!cue) return false;
      if (typeof this[cue] === 'function' && cue !== 'play' && cue !== 'init') {
        this[cue]();
        return true;
      }
      const def = this.CUES && this.CUES[cue];
      if (!def) return false;
      if (!checkSound()) return false;
      if (typeof def === 'function') {
        def();
        return true;
      }
      if (Array.isArray(def) && typeof root.zzfx === 'function') {
        root.zzfx(...def);
        return true;
      }
      return false;
    }
  };

  Sound.init();
  if (root.NyanAudio) {
    Sound.nyan = root.NyanAudio;
  }
  root.Sound = Sound;
})(typeof window !== 'undefined' ? window : this);
