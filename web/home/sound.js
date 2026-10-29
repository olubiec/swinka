/**
 * sound.js — Lightweight 8-bit retro sound synthesiser using the Web Audio API.
 * Works without audio files, reacts instantly to clicks.
 */

(function (root) {
  'use strict';

  let isMuted = false;

  function resumeAudioContext() {
    if (root.zzfxX && root.zzfxX.state === 'suspended') {
      root.zzfxX.resume();
    }
  }

  // Resume context on first interaction
  window.addEventListener('pointerdown', resumeAudioContext, { once: true });
  window.addEventListener('keydown', resumeAudioContext, { once: true });

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
    }
  };

  Sound.init();
  root.Sound = Sound;
})(typeof window !== 'undefined' ? window : this);
