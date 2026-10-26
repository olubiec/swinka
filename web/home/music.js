(function () {
  'use strict';

  let audioCtx = null;

  // Constants
  const FADE_MS = 400;
  const FADE_STEPS = 20;
  const FADE_STEP_MS = FADE_MS / FADE_STEPS;
  const LOCAL_STORAGE_VOL_KEY = 'cuy_music_volume';
  const LOCAL_STORAGE_ON_KEY = 'cuy_music_on';
  const ASSET_PREFIX = (window.chrome && window.chrome.webview) ? 'https://cuy.assets/' : '../../assets/';

  // State
  let trackData = null;
  let tracksLoading = false;
  let currentId = null;
  let currentAudio = null;
  let fadeInterval = null;
  let targetVolume = 0.35;
  let isEnabled = true;
  let pollInterval = null;
  let pendingPlay = null;

  // Init local storage values
  try {
    const savedVol = localStorage.getItem(LOCAL_STORAGE_VOL_KEY);
    if (savedVol !== null) {
      targetVolume = parseFloat(savedVol);
    }
    const savedOn = localStorage.getItem(LOCAL_STORAGE_ON_KEY);
    if (savedOn !== null) {
      isEnabled = savedOn === 'true';
    }
  } catch (e) {
    console.warn('CuyMusic: Could not read localStorage', e);
  }

  function getBaseVolume() {
    if (!isEnabled || (window.Sound && window.Sound.isMuted)) {
      return 0;
    }
    return targetVolume;
  }

  function applyVolume(audio, vol) {
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, vol));
    }
  }

  function fadeTo(audio, target, ms, onComplete) {
    if (!audio) return;
    if (audio.fadeInterval) {
      clearInterval(audio.fadeInterval);
      audio.fadeInterval = null;
    }

    if (ms <= 0) {
      applyVolume(audio, target);
      if (onComplete) onComplete();
      return;
    }

    const startVol = audio.volume;
    const diff = target - startVol;
    let step = 0;

    audio.fadeInterval = setInterval(() => {
      step++;
      const v = startVol + (diff * (step / FADE_STEPS));
      applyVolume(audio, v);

      if (step >= FADE_STEPS) {
        clearInterval(audio.fadeInterval);
        audio.fadeInterval = null;
        applyVolume(audio, target);
        if (onComplete) onComplete();
      }
    }, FADE_STEP_MS);
  }

  function stopCurrent(ms) {
    if (!currentAudio) return;
    const a = currentAudio;
    currentAudio = null;
    currentId = null;

    fadeTo(a, 0, ms, () => {
      a.pause();
      a.src = '';
    });
  }

  async function loadTracks() {
    if (trackData) return trackData;
    if (tracksLoading) {
      // Wait for existing fetch to complete
      return new Promise(resolve => {
        const i = setInterval(() => {
          if (trackData) {
            clearInterval(i);
            resolve(trackData);
          }
        }, 50);
      });
    }

    tracksLoading = true;
    try {
      const res = await fetch(ASSET_PREFIX + 'music/tracks.json');
      trackData = await res.json();
    } catch (e) {
      console.error('CuyMusic: Failed to load tracks.json', e);
      trackData = [];
    }
    tracksLoading = false;
    return trackData;
  }

  function doPlay(id, loop, forceVolume) {
    const tracks = trackData;
    if (!tracks) return;

    const track = tracks.find(t => t.id === id);
    if (!track) {
      console.warn('CuyMusic: Track not found', id);
      return;
    }

    if (currentId === id) {
      // Same track playing, just ensure volume is correct and it is playing
      if (currentAudio.paused) {
          const vol = forceVolume !== undefined ? forceVolume : getBaseVolume();
          currentAudio.volume = 0;
          const p = currentAudio.play();
          if (p !== undefined) {
            p.then(() => {
              fadeTo(currentAudio, vol, FADE_MS);
            }).catch(e => {
              pendingPlay = { id, loop, volume: forceVolume };
              console.warn('CuyMusic: Autoplay blocked, waiting for interaction');
            });
          }
      }
      return;
    }

    stopCurrent(FADE_MS);

    currentId = id;
    const audio = new Audio(ASSET_PREFIX + track.file);
    audio.loop = loop;
    audio.volume = 0; // Start silent for fade-in
    currentAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        const vol = forceVolume !== undefined ? forceVolume : getBaseVolume();
        fadeTo(audio, vol, FADE_MS);
      }).catch(e => {
        // Autoplay policy prevented playback
        pendingPlay = { id, loop, volume: forceVolume };
        console.warn('CuyMusic: Autoplay blocked, waiting for interaction');
        // audio might be kept in currentAudio but paused, we'll try again on pointerdown
      });
    }
  }

  // API
  window.CuyMusic = {
    play: async function (id, { loop = true, volume } = {}) {
      const tracks = await loadTracks();
      if (!tracks) return;
      doPlay(id, loop, volume);
    },
    stop: function (fadeMs = FADE_MS) {
      pendingPlay = null;
      stopCurrent(fadeMs);
    },
    pause: function () {
      if (currentAudio && !currentAudio.paused) {
        fadeTo(currentAudio, 0, FADE_MS, () => {
          if (currentAudio) currentAudio.pause();
        });
      }
    },
    resume: function () {
      if (currentAudio && currentAudio.paused) {
        currentAudio.play().then(() => {
          fadeTo(currentAudio, getBaseVolume(), FADE_MS);
        }).catch(e => {
            console.warn('CuyMusic: Autoplay blocked on resume', e);
        });
      }
    },
    setVolume: function (v) {
      targetVolume = Math.max(0, Math.min(1, v));
      try {
        localStorage.setItem(LOCAL_STORAGE_VOL_KEY, targetVolume.toString());
      } catch (e) {
        console.warn('CuyMusic: Could not save volume', e);
      }
      if (currentAudio && !currentAudio.paused) {
        // fade to new volume or set immediately
        fadeTo(currentAudio, getBaseVolume(), FADE_MS);
      }
    },
    getVolume: function () {
      return targetVolume;
    },
    setEnabled: function (on) {
      isEnabled = !!on;
      try {
        localStorage.setItem(LOCAL_STORAGE_ON_KEY, isEnabled.toString());
      } catch (e) {
        console.warn('CuyMusic: Could not save enabled state', e);
      }

      if (!isEnabled) {
         if (currentAudio && !currentAudio.paused) {
             fadeTo(currentAudio, 0, FADE_MS, () => {
                 if (currentAudio) currentAudio.pause();
             });
         }
      } else {
         if (currentAudio && currentAudio.paused && !pendingPlay) {
             currentAudio.play().then(() => {
                 fadeTo(currentAudio, getBaseVolume(), FADE_MS);
             }).catch(e => console.warn(e));
         } else if (currentAudio && !currentAudio.paused) {
             fadeTo(currentAudio, getBaseVolume(), FADE_MS);
         }
      }
    },
    isEnabled: function () {
      return isEnabled;
    },
    tracks: function () {
      return trackData;
    }
  };

  // Poll for Sound.isMuted
  let lastMuteState = false;
  pollInterval = setInterval(() => {
    const isMuted = (window.Sound && window.Sound.isMuted);
    if (isMuted !== lastMuteState) {
      lastMuteState = isMuted;
      if (currentAudio && !currentAudio.paused) {
        fadeTo(currentAudio, getBaseVolume(), FADE_MS);
      } else if (currentAudio && currentAudio.paused && !isMuted && isEnabled) {
          // Unmuted, resume if we have a track
          CuyMusic.resume();
      }
    }
  }, 500);

  // Handle Visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause(); // Pause immediately when hidden
      }
    } else {
      if (currentAudio && currentAudio.paused && isEnabled && !(window.Sound && window.Sound.isMuted)) {
        currentAudio.play().then(() => {
          applyVolume(currentAudio, getBaseVolume()); // Resume at current vol
        }).catch(e => console.warn(e));
      }
    }
  });

  // Handle Autoplay Retry
  const resumeAudio = () => {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const CtxClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new CtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (pendingPlay) {
      const p = pendingPlay;
      pendingPlay = null;
      CuyMusic.play(p.id, { loop: p.loop, volume: p.volume });
    } else if (currentAudio && currentAudio.paused && currentId && isEnabled && !(window.Sound && window.Sound.isMuted)) {
      // It might have been paused due to other autoplay restrictions
      currentAudio.play().then(() => {
          fadeTo(currentAudio, getBaseVolume(), FADE_MS);
      }).catch(e => console.warn(e));
    }
  };

  document.addEventListener('pointerdown', resumeAudio, { capture: true });
  document.addEventListener('keydown', resumeAudio, { capture: true });

})();
