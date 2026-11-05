// Music engine for the record player: queue, loop, volume, pause and mute over one <audio> at a time.
// No DOM rendering here. Browser: window.CuyMusicEngine.create(opts). Node tests: require(). Every failure is
// logged with one console.warn and never thrown. Track choice: CuyMusicContract.trackForRecord (D2).
(function (root, factory) {
  const contract = typeof module === 'object' && module.exports ? require('./contract.js') : root.CuyMusicContract;
  const api = factory(contract);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CuyMusicEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function (contract) {
  'use strict';

  const MUSIC_AUDIO = true; // false: queue and states still work, no Audio element is created (plan: Warianty)
  const TRACKS_FILE = 'music/tracks.json';
  const OGG_TYPE = 'audio/ogg; codecs="vorbis"';

  function msg(e) {
    return e && e.message ? e.message : String(e);
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function create(opts) {
    const o = opts || {};
    const root_ = typeof window !== 'undefined' ? window : globalThis;
    const musicAudio = o.musicAudio !== undefined ? Boolean(o.musicAudio) : MUSIC_AUDIO;
    // Base comes from UiAssets.assetsBase (ui-assets.js) when exported, or from opts.assetsBase.
    const base = typeof o.assetsBase === 'string' ? o.assetsBase
      : (root_.UiAssets && typeof root_.UiAssets.assetsBase === 'function' ? root_.UiAssets.assetsBase() : null);

    let tracks = null;
    let loading = null;
    let oggOk = null; // null = not probed yet
    let queue = []; // record ids
    let index = 0;
    let status = 'stopped'; // stopped | playing | paused | waiting (autoplay blocked) | silent (no ogg) | error
    let volume = 0.35;
    let loop = true;
    let muted = false;
    let audio = null;
    let failures = 0; // consecutive failures, reset by a successful start
    let gen = 0; // invalidates pending async starts
    let gestureOn = false;

    function warn(text) {
      console.warn('CuyMusicEngine: ' + text);
    }

    function readMuted() {
      return Boolean(root_.Sound && root_.Sound.isMuted);
    }

    function effectiveVolume() {
      return muted ? 0 : volume;
    }

    function refresh() {
      muted = readMuted();
      if (audio) audio.volume = effectiveVolume();
      return muted;
    }

    function load() {
      if (tracks) return Promise.resolve(tracks);
      if (loading) return loading;
      if (!base) {
        warn('no assets base (UiAssets.assetsBase missing), music is silent');
        return Promise.resolve([]);
      }
      if (typeof root_.fetch !== 'function') {
        warn('fetch missing, music is silent');
        return Promise.resolve([]);
      }
      loading = Promise.resolve()
        .then(() => root_.fetch(base + TRACKS_FILE))
        .then((r) => {
          if (!r.ok) throw new Error('tracks.json ' + r.status);
          return r.json();
        })
        .then((data) => {
          tracks = Array.isArray(data) ? data : [];
          return tracks;
        })
        .catch((e) => {
          warn('tracks.json failed: ' + msg(e));
          tracks = [];
          return tracks;
        });
      return loading;
    }

    function probeOgg() {
      if (oggOk !== null) return oggOk;
      try {
        const probe = new root_.Audio();
        oggOk = typeof probe.canPlayType !== 'function' || probe.canPlayType(OGG_TYPE) !== '';
      } catch (e) {
        oggOk = false;
        warn('no audio device or Audio element: ' + msg(e));
        return oggOk;
      }
      if (!oggOk) warn('decoder without ogg support, music is silent');
      return oggOk;
    }

    function stopAudio() {
      const a = audio;
      audio = null;
      if (a) {
        try { a.pause(); } catch (e) { /* element already gone */ }
      }
    }

    // Returns false when nothing is left to play (queue end without loop).
    function advance() {
      if (index + 1 < queue.length) {
        index++;
        return true;
      }
      if (loop && queue.length) {
        index = 0;
        return true;
      }
      return false;
    }

    function listenGesture() {
      if (gestureOn || typeof root_.addEventListener !== 'function') return;
      gestureOn = true;
      const go = () => {
        root_.removeEventListener('pointerdown', go);
        root_.removeEventListener('keydown', go);
        gestureOn = false;
        if (status === 'waiting' && audio) startPlayback(audio);
      };
      root_.addEventListener('pointerdown', go);
      root_.addEventListener('keydown', go);
    }

    // One failed track: warn once, drop it, move on. Stops when every queued track failed in a row.
    function skip(text) {
      warn(text);
      stopAudio();
      failures++;
      if (failures >= queue.length) {
        status = 'error';
        index = 0;
        return;
      }
      if (advance()) startCurrent();
      else { status = 'stopped'; index = 0; }
    }

    function startPlayback(a) {
      refresh();
      a.volume = effectiveVolume();
      let p;
      try {
        p = a.play();
      } catch (e) {
        if (a === audio) skip('play threw: ' + msg(e));
        return;
      }
      Promise.resolve(p).then(() => {
        if (a !== audio) return;
        failures = 0;
        if (status !== 'paused') status = 'playing';
      }, (e) => {
        if (a !== audio) return;
        if (e && e.name === 'NotAllowedError') {
          status = 'waiting';
          warn('autoplay blocked, playback starts after the first click');
          listenGesture();
        } else {
          skip('play failed: ' + msg(e));
        }
      });
    }

    function startCurrent() {
      const my = ++gen;
      stopAudio();
      if (!queue.length) { status = 'stopped'; return; }
      if (!musicAudio) { status = 'playing'; return; }
      if (!probeOgg()) { status = 'silent'; return; }
      load().then((list) => {
        if (my !== gen) return;
        if (!list.length) { status = 'silent'; return; } // load() already warned
        const id = queue[index];
        const eco = root_.CuyMusicEconomy;
        const explicit = eco && typeof eco.recordTrack === 'function' ? eco.recordTrack(id) : null;
        const entry = contract.trackForRecord(id, list, explicit);
        if (!entry) return skip('no track for record ' + id);
        const url = base + entry.file;
        let a;
        try {
          a = new root_.Audio(url);
        } catch (e) {
          return skip('Audio constructor failed (no device?): ' + msg(e));
        }
        audio = a;
        a.loop = false;
        a.addEventListener('ended', () => {
          if (a !== audio) return;
          stopAudio();
          if (advance()) startCurrent();
          else { status = 'stopped'; index = 0; }
        });
        a.addEventListener('error', () => {
          if (a !== audio) return;
          skip('track failed to load (404 or decode): ' + url);
        });
        status = 'playing';
        startPlayback(a);
      });
    }

    return {
      MUSIC_AUDIO,
      load,
      setQueue(recordIds) {
        stopAudio();
        gen++;
        queue = Array.isArray(recordIds) ? recordIds.filter((id) => typeof id === 'string' && id !== '') : [];
        index = 0;
        failures = 0;
        status = 'stopped';
        return queue.length;
      },
      enqueue(recordId) {
        if (typeof recordId !== 'string' || recordId === '') return false;
        queue.push(recordId);
        return true;
      },
      play() {
        if (!queue.length) return false;
        if (status === 'error') { failures = 0; index = 0; }
        if (status === 'playing' || status === 'waiting') return true;
        if (status === 'paused' && audio) {
          status = 'playing';
          startPlayback(audio);
          return true;
        }
        startCurrent();
        return true;
      },
      pause() {
        if (status !== 'playing' && status !== 'waiting') return false;
        if (audio) {
          try { audio.pause(); } catch (e) { warn('pause failed: ' + msg(e)); }
        }
        status = 'paused';
        return true;
      },
      next() {
        if (!queue.length) return false;
        if (!advance()) { stopAudio(); status = 'stopped'; index = 0; return false; }
        startCurrent();
        return true;
      },
      stop() {
        gen++;
        stopAudio();
        status = 'stopped';
        index = 0;
      },
      setVolume(v) {
        const n = Number(v);
        if (!Number.isFinite(n)) return volume;
        volume = clamp01(n);
        if (audio) audio.volume = effectiveVolume();
        return volume;
      },
      setLoop(on) {
        loop = Boolean(on);
      },
      refresh,
      getState() {
        return {
          status,
          recordId: queue[index] || null,
          index,
          queueLength: queue.length,
          volume,
          loop,
          muted: readMuted(),
          audio: musicAudio && oggOk !== false
        };
      }
    };
  }

  return { MUSIC_AUDIO, create };
});
