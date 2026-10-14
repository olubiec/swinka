/**
 * sound.js — Lightweight 8-bit retro sound synthesiser using the Web Audio API.
 * Works without audio files, reacts instantly to clicks.
 */

(function (root) {
  'use strict';

  let audioCtx = null;
  let isMuted = false;

  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const Sound = {
    get isMuted() {
      return isMuted;
    },
    set isMuted(val) {
      isMuted = Boolean(val);
      try { localStorage.setItem('cuy_muted', isMuted ? '1' : '0'); } catch (e) {}
    },

    init() {
      try {
        isMuted = localStorage.getItem('cuy_muted') === '1';
      } catch (e) {}
    },

    // Short button click (retro bleep)
    click() {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    },

    // Happy pig wheek ("WHEEE!")
    wheek() {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(1400, t + 0.12);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.22);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    },

    // Crunching a vegetable / hay
    crunch() {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // 3 quick mini crunches
      [0, 0.07, 0.14].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t + offset);
        osc.frequency.exponentialRampToValueAtTime(160, t + offset + 0.05);

        gain.gain.setValueAtTime(0.09, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.05);
      });
    },

    // Sweeping / cleaning
    sweep() {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.linearRampToValueAtTime(200, t + 0.12);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    },

    // Success / earning clovers
    fanfare() {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + i * 0.06);

        gain.gain.setValueAtTime(0.06, t + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.12);
      });
    }
  };

  Sound.init();
  root.Sound = Sound;
})(typeof window !== 'undefined' ? window : this);
