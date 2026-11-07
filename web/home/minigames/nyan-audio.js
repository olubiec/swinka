/**
 * nyan-audio.js — Pure Web Audio API synthesiser for the Nyan Cuy minigame.
 * Features an authentic 8-bit chiptune BGM loop, guinea pig wheek SFX, and veggie crunch SFX.
 * Zero external libraries or audio files.
 */

(function (root) {
  'use strict';

  let audioCtx = null;
  let isPlaying = false;
  let currentStep = 0;
  let nextStepTime = 0;
  let timerId = null;
  let musicMasterGain = null;

  // Note frequencies (Hz)
  const F = {
    // Octave 2
    E2: 82.41,
    FS2: 92.50,
    GS2: 103.83,
    B2: 123.47,
    // Octave 3
    CS3: 138.59,
    D3: 146.83,
    DS3: 155.56,
    E3: 164.81,
    FS3: 185.00,
    GS3: 207.65,
    AS3: 233.08,
    B3: 246.94,
    // Octave 4
    C4: 261.63,
    CS4: 277.18,
    D4: 293.66,
    DS4: 311.13,
    E4: 329.63,
    F4: 349.23,
    FS4: 369.99,
    G4: 392.00,
    GS4: 415.30,
    A4: 440.00,
    AS4: 466.16,
    B4: 493.88,
    // Octave 5
    C5: 523.25,
    CS5: 554.37,
    D5: 587.33,
    DS5: 622.25,
    E5: 659.25,
    F5: 698.46,
    FS5: 739.99,
    G5: 783.99,
    GS5: 830.61,
    A5: 880.00,
    AS5: 932.33,
    B5: 987.77,
    _: 0
  };

  // 135 BPM Chiptune lead melody inspired by Nyan theme (16th notes)
  const LEAD_MELODY = [
    // Bar 1
    F.FS4, F.GS4, F.DS4, F.DS4, F._, F.B3, F.D4, F.CS4,
    F.B3, F._, F.B3, F.CS4, F.D4, F.D4, F.CS4, F.B3,
    // Bar 2
    F.CS4, F.DS4, F.FS4, F.GS4, F.DS4, F.FS4, F.CS4, F.DS4,
    F.B3, F.CS4, F.B3, F.DS4, F.FS4, F.GS4, F.DS4, F.FS4,
    // Bar 3
    F.CS4, F.DS4, F.B3, F.D4, F.DS4, F.D4, F.CS4, F.B3,
    F.CS4, F.D4, F.B3, F.CS4, F.DS4, F.FS4, F.C4, F.D4,
    // Bar 4
    F.B3, F.CS4, F.B3, F.CS4, F.FS4, F.GS4, F.B4, F.GS4,
    F.FS4, F.DS4, F.B3, F.CS4, F.B3, F._, F.B3, F._,
    // Bar 5 (Chorus octave)
    F.FS5, F.GS5, F.DS5, F.DS5, F._, F.B4, F.D5, F.CS5,
    F.B4, F._, F.B4, F.CS5, F.D5, F.D5, F.CS5, F.B4,
    // Bar 6
    F.CS5, F.DS5, F.FS5, F.GS5, F.DS5, F.FS5, F.CS5, F.DS5,
    F.B4, F.CS5, F.B4, F.DS5, F.FS5, F.GS5, F.DS5, F.FS5,
    // Bar 7
    F.CS5, F.DS5, F.B4, F.D5, F.DS5, F.D5, F.CS5, F.B4,
    F.CS5, F.D5, F.B4, F.CS5, F.DS5, F.FS5, F.C5, F.D5,
    // Bar 8
    F.B4, F.CS5, F.B4, F.CS5, F.FS5, F.GS5, F.B5, F.GS5,
    F.FS5, F.DS5, F.B4, F.CS5, F.B4, F._, F.B4, F._
  ];

  // 16th note bass accompaniment
  const BASS_LINE = [
    // Bar 1
    F.B2, F._, F.FS3, F._, F.B2, F._, F.FS3, F._,
    F.B2, F._, F.FS3, F._, F.B2, F._, F.FS3, F._,
    // Bar 2
    F.GS2, F._, F.DS3, F._, F.GS2, F._, F.DS3, F._,
    F.E2, F._, F.B2, F._, F.E2, F._, F.B2, F._,
    // Bar 3
    F.B2, F._, F.FS3, F._, F.B2, F._, F.FS3, F._,
    F.FS2, F._, F.CS3, F._, F.FS2, F._, F.CS3, F._,
    // Bar 4
    F.E2, F._, F.B2, F._, F.E2, F._, F.B2, F._,
    F.FS2, F._, F.FS2, F._, F.FS2, F._, F.FS2, F._,
    // Bar 5
    F.B2, F._, F.FS3, F._, F.B2, F._, F.FS3, F._,
    F.B2, F._, F.FS3, F._, F.B2, F._, F.FS3, F._,
    // Bar 6
    F.GS2, F._, F.DS3, F._, F.GS2, F._, F.DS3, F._,
    F.E2, F._, F.B2, F._, F.E2, F._, F.B2, F._,
    // Bar 7
    F.B2, F._, F.FS3, F._, F.B2, F._, F.FS3, F._,
    F.FS2, F._, F.CS3, F._, F.FS2, F._, F.CS3, F._,
    // Bar 8
    F.E2, F._, F.B2, F._, F.E2, F._, F.B2, F._,
    F.FS2, F._, F.FS2, F._, F.FS2, F._, F.FS2, F._
  ];

  const BPM = 135;
  const STEP_DURATION = 60 / (BPM * 4); // 16th note duration ~0.111s
  const TOTAL_STEPS = LEAD_MELODY.length;

  function getAudioContext() {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = null;
      if (root.zzfxX && typeof root.zzfxX.createGain === 'function') {
        audioCtx = root.zzfxX;
      } else {
        const AudioContextClass = root.AudioContext || root.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }
      const mg = root.MiniGames || root.Minigry;
      if (audioCtx && mg && typeof mg.track === 'function') {
        mg.track(audioCtx);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  // Resume context on user gesture if available
  if (typeof window !== 'undefined') {
    const unlock = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  function getEffectiveVolume() {
    if (typeof window === 'undefined') return 0;
    if (root.Sound && root.Sound.isMuted) return 0;
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('cuy_muted') === '1') {
        return 0;
      }
    } catch (e) {}

    let vol = 0.7;
    if (root.bridge && typeof root.bridge.getState === 'function') {
      const state = root.bridge.getState();
      if (state && state.settings) {
        if (state.settings.soundSuppressed) return 0;
        if (typeof state.settings.volume === 'number') {
          vol = state.settings.volume;
        }
      }
    }
    return Math.max(0, Math.min(1, vol));
  }

  function getMusicVolume() {
    return getEffectiveVolume() * 0.28;
  }

  function scheduleStep(step, time, duration) {
    if (!audioCtx || !musicMasterGain) return;

    // Lead voice (8-bit square wave)
    const leadFreq = LEAD_MELODY[step];
    if (leadFreq > 0) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(leadFreq, time);

      const noteLen = duration * 0.85;
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.setValueAtTime(0.12, time + noteLen * 0.7);
      gain.gain.linearRampToValueAtTime(0.0001, time + noteLen);

      osc.connect(gain);
      gain.connect(musicMasterGain);

      osc.start(time);
      osc.stop(time + duration);
    }

    // Bass voice (8-bit triangle wave)
    const bassFreq = BASS_LINE[step];
    if (bassFreq > 0) {
      const bOsc = audioCtx.createOscillator();
      const bGain = audioCtx.createGain();

      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(bassFreq, time);

      const bLen = duration * 0.9;
      bGain.gain.setValueAtTime(0.18, time);
      bGain.gain.linearRampToValueAtTime(0.0001, time + bLen);

      bOsc.connect(bGain);
      bGain.connect(musicMasterGain);

      bOsc.start(time);
      bOsc.stop(time + duration);
    }
  }

  function scheduler() {
    if (!isPlaying) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    // Synchronize master gain with volume setting
    if (musicMasterGain) {
      const targetVol = getMusicVolume();
      musicMasterGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.05);
    }

    // Fast-forward nextStepTime if it fell behind (e.g. background tab)
    if (nextStepTime < ctx.currentTime) {
      nextStepTime = ctx.currentTime;
    }

    const scheduleAheadTime = 0.25; // seconds
    while (nextStepTime < ctx.currentTime + scheduleAheadTime) {
      scheduleStep(currentStep, nextStepTime, STEP_DURATION);
      nextStepTime += STEP_DURATION;
      currentStep = (currentStep + 1) % TOTAL_STEPS;
    }
  }

  function startMusic() {
    if (isPlaying) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    isPlaying = true;
    currentStep = 0;
    nextStepTime = ctx.currentTime + 0.05;

    musicMasterGain = ctx.createGain();
    musicMasterGain.gain.setValueAtTime(getMusicVolume(), ctx.currentTime);
    musicMasterGain.connect(ctx.destination);
    const mg = root.MiniGames || root.Minigry;
    if (mg && typeof mg.track === 'function') {
      mg.track(musicMasterGain);
    }

    timerId = setInterval(scheduler, 25);
  }

  function stopMusic() {
    if (!isPlaying && !musicMasterGain) return;
    isPlaying = false;

    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }

    if (musicMasterGain) {
      const ctx = getAudioContext();
      if (ctx) {
        try {
          musicMasterGain.gain.cancelScheduledValues(ctx.currentTime);
          musicMasterGain.gain.setValueAtTime(0, ctx.currentTime);
          musicMasterGain.disconnect();
        } catch (e) {}
      }
      musicMasterGain = null;
    }
    if (audioCtx && audioCtx.state === 'closed') {
      audioCtx = null;
    }
  }

  /**
   * Guinea Pig Wheek SFX:
   * Upward frequency sweep (1200Hz to 2800Hz) with fast 50Hz vibrato/tremolo and quick decay envelope.
   */
  function playWheek() {
    const vol = getEffectiveVolume();
    if (vol <= 0) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.34;

    // Master SFX Gain Envelope
    const sfxGain = ctx.createGain();
    sfxGain.gain.setValueAtTime(0.0001, now);
    // Fast attack
    sfxGain.gain.linearRampToValueAtTime(vol * 0.35, now + 0.02);
    // Sustain during the high wheek
    sfxGain.gain.setValueAtTime(vol * 0.35, now + 0.22);
    // Quick decay envelope
    sfxGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // 50Hz Tremolo (Amplitude Modulation)
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.setValueAtTime(0.85, now);

    const tremoloLfo = ctx.createOscillator();
    tremoloLfo.frequency.setValueAtTime(50, now);
    const tremoloDepth = ctx.createGain();
    tremoloDepth.gain.setValueAtTime(0.15, now);
    tremoloLfo.connect(tremoloDepth);
    tremoloDepth.connect(tremoloGain.gain);

    // Primary carrier oscillator (triangle wave for natural whistle resonance)
    const carrier = ctx.createOscillator();
    carrier.type = 'triangle';
    carrier.frequency.setValueAtTime(1200, now);
    carrier.frequency.exponentialRampToValueAtTime(2800, now + 0.24);
    carrier.frequency.linearRampToValueAtTime(2500, now + duration);

    // 8-bit square layer for retro chiptune texture
    const chiptuneSub = ctx.createOscillator();
    chiptuneSub.type = 'square';
    chiptuneSub.frequency.setValueAtTime(1200, now);
    chiptuneSub.frequency.exponentialRampToValueAtTime(2800, now + 0.24);
    chiptuneSub.frequency.linearRampToValueAtTime(2500, now + duration);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.12, now);

    // 50Hz Vibrato LFO (Frequency Modulation)
    const vibratoLfo = ctx.createOscillator();
    vibratoLfo.frequency.setValueAtTime(50, now);
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.setValueAtTime(90, now);
    vibratoGain.gain.linearRampToValueAtTime(180, now + 0.22);
    vibratoGain.gain.linearRampToValueAtTime(40, now + duration);

    vibratoLfo.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);
    vibratoGain.connect(chiptuneSub.frequency);

    // Routing
    carrier.connect(tremoloGain);
    chiptuneSub.connect(subGain);
    subGain.connect(tremoloGain);
    tremoloGain.connect(sfxGain);
    sfxGain.connect(ctx.destination);

    // Playback
    carrier.start(now);
    chiptuneSub.start(now);
    vibratoLfo.start(now);
    tremoloLfo.start(now);

    const stopTime = now + duration + 0.05;
    carrier.stop(stopTime);
    chiptuneSub.stop(stopTime);
    vibratoLfo.stop(stopTime);
    tremoloLfo.stop(stopTime);
  }

  /**
   * Veggie Crunch SFX:
   * Double-nibble noise burst filtered for crisp carrot/hay crunch plus a low bite punch.
   */
  function playCrunch() {
    const vol = getEffectiveVolume();
    if (vol <= 0) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    function triggerNibble(startTime, scale) {
      const length = 0.045;
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * length));
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      // Bandpass filter for crisp vegetable snap
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2600, startTime);
      filter.Q.setValueAtTime(3.0, startTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.45 * scale, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + length);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(startTime);
      noise.stop(startTime + length + 0.01);

      // Low crunch snap bite tone
      const snapOsc = ctx.createOscillator();
      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(360, startTime);
      snapOsc.frequency.exponentialRampToValueAtTime(50, startTime + 0.035);

      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(vol * 0.35 * scale, startTime);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.035);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);

      snapOsc.start(startTime);
      snapOsc.stop(startTime + 0.04);
    }

    // Double nibble: initial crunch followed quickly by a second chew
    triggerNibble(now, 1.0);
    triggerNibble(now + 0.065, 0.75);
  }

  const NyanAudio = {
    startMusic,
    stopMusic,
    playWheek,
    playCrunch,
    get isPlaying() {
      return isPlaying;
    },
    get isMusicPlaying() {
      return isPlaying;
    },
    getVolume: getEffectiveVolume,
    NOTES: F,
    resume() {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }
  };

  root.NyanAudio = NyanAudio;
  if (root.Sound) {
    root.Sound.nyan = NyanAudio;
  }
})(typeof window !== 'undefined' ? window : this);
