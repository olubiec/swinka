/*
 * MusicDirector: stack of contexts for the Domek music (MUSIC_PLAN 5.4, PK-34b).
 * Priorities: minigame 50, record 40, home 30, place 20, desktop 10.
 * The highest priority wins; on a tie the later setContext wins (Seq).
 * Works in the browser (window.MusicDirector) and in Node (module.exports) for tests.
 */
(function (root) {
  'use strict';

  var PRIORITY = { minigame: 50, record: 40, home: 30, place: 20, desktop: 10 };
  var FADE_MS = 1500;

  function kindOf(key) {
    if (key.indexOf('home.view:') === 0) return 'home';
    return key.split(':')[0];
  }

  /**
   * Maps a context key to a track id.
   * routeMap comes from music.json `routes` (entries with `track`), keyed by the context key.
   */
  function trackFor(key, routeMap) {
    if (routeMap && routeMap[key]) return routeMap[key];
    var kind = kindOf(key);
    var id = key.slice(key.indexOf(':') + 1);
    if (kind === 'minigame') return 'mg_' + id;
    if (kind === 'record') return 'rec_' + id;
    if (kind === 'place') return 'place_' + id;
    if (key === 'home.view:album') return 'theme_cuy';
    if (key.indexOf('home.view:rooms.room:') === 0) return 'place_room_' + key.slice('home.view:rooms.room:'.length);
    if (key === 'home.view:coloring') return 'calm';
    if (key === 'home.view:shop') return 'place_market';
    return 'home_main';
  }

  /**
   * @param {object} options
   *   engine: MusicEngine instance (play, stop, setNightFilter)
   *   tracks: music.json `tracks` (id -> definition with file / stems / loop)
   *   routes: music.json `routes` as a map key -> track id (optional)
   */
  function createDirector(options) {
    var engine = options.engine;
    var tracks = options.tracks || {};
    var routeMap = options.routes || {};
    var stack = [];
    var seq = 0;
    var currentTrack = null;

    function top() {
      var best = null;
      stack.forEach(function (c) {
        if (!best || c.priority > best.priority || (c.priority === best.priority && c.seq > best.seq)) best = c;
      });
      return best;
    }

    function apply() {
      var t = top();
      if (!t) {
        if (currentTrack !== null) {
          engine.stop(FADE_MS);
          currentTrack = null;
        }
        return;
      }
      if (t.trackId === currentTrack) return;
      var def = tracks[t.trackId] || { id: t.trackId, file: 'music/' + t.trackId + '.ogg', loop: true };
      currentTrack = t.trackId;
      engine.play(Object.assign({ id: t.trackId }, def), { fadeMs: FADE_MS, night: !!t.night });
    }

    /** Sets (or replaces) a context. key examples: 'minigame:mg_veggie_rain', 'home.view:album', 'place:garden'. */
    function setContext(key, opts) {
      opts = opts || {};
      var kind = kindOf(key);
      if (!PRIORITY.hasOwnProperty(kind)) throw new Error('unknown music context: ' + key);
      stack = stack.filter(function (c) { return c.key !== key; });
      stack.push({
        key: key,
        kind: kind,
        priority: PRIORITY[kind],
        trackId: opts.trackId || trackFor(key, routeMap),
        night: !!opts.night,
        seq: ++seq
      });
      apply();
    }

    function clearContext(key) {
      var before = stack.length;
      stack = stack.filter(function (c) { return c.key !== key; });
      if (stack.length !== before) apply();
    }

    /** Removes every Domek context (window closed). Desktop belt is not touched here. */
    function stopHome() {
      stack = stack.filter(function (c) { return c.kind === 'desktop'; });
      apply();
    }

    function minigame(id) { setContext('minigame:' + id); }
    function minigameEnd(id) { clearContext('minigame:' + id); }

    return {
      setContext: setContext,
      clearContext: clearContext,
      stopHome: stopHome,
      minigame: minigame,
      minigameEnd: minigameEnd,
      current: function () { var t = top(); return t ? { key: t.key, trackId: t.trackId, priority: t.priority } : null; },
      stack: function () { return stack.map(function (c) { return { key: c.key, priority: c.priority, seq: c.seq }; }); },
      trackFor: function (key) { return trackFor(key, routeMap); }
    };
  }

  var api = { create: createDirector, PRIORITY: PRIORITY, trackFor: trackFor };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MusicDirector = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
