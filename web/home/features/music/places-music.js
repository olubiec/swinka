// Background music per place: which existing track (assets/music/tracks.json) plays in each place.
// Browser: window.CuyPlaceMusic. Playback goes through window.CuyMusic.play; nothing here throws.
// Place ids follow assets/data/places.json; 'pig:<id>' rooms are houses and play the house track.
(function (root) {
  'use strict';

  const TRACK_BY_PLACE = {
    house: 'calm',
    salon: 'calm',
    bedroom: 'calm',
    dorm: 'calm',
    playroom: 'games_2',
    garden: 'menu',
    park: 'menu',
    farm: 'games_1',
    market: 'games_2'
  };

  // Track id for a place, or null when the place has none or the track is not in the catalogue.
  function trackForPlace(placeId) {
    try {
      let key = typeof placeId === 'string' ? placeId : '';
      if (key.indexOf('pig:') === 0) key = 'house';
      if (!Object.prototype.hasOwnProperty.call(TRACK_BY_PLACE, key)) return null;
      const track = TRACK_BY_PLACE[key];
      const cm = root.CuyMusic;
      const list = cm && typeof cm.tracks === 'function' ? cm.tracks() : null;
      if (Array.isArray(list) && list.length && !list.some((t) => t && t.id === track)) return null;
      return track;
    } catch (e) {
      return null;
    }
  }

  // Starts the place's track in a loop. Returns the track id, or null when nothing was started.
  function enter(placeId) {
    try {
      const cm = root.CuyMusic;
      if (!cm || typeof cm.play !== 'function') return null;
      const track = trackForPlace(placeId);
      if (!track) return null;
      const p = cm.play(track, { loop: true });
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return track;
    } catch (e) {
      return null;
    }
  }

  // Place a feature window stands for (CuyHome.openFeature id and arg), or null.
  function placeOfFeature(featureId, arg) {
    try {
      const want = arg && typeof arg === 'object' ? arg.room : arg;
      if (featureId === 'rooms') return want === 'garden' || want === 'park' ? want : 'house';
      if (featureId === 'garden') return want === 'park' ? 'park' : 'garden';
      if (featureId === 'farm' || featureId === 'market') return featureId;
      return null;
    } catch (e) {
      return null;
    }
  }

  function enterFeature(featureId, arg) {
    const place = placeOfFeature(featureId, arg);
    return place ? enter(place) : null;
  }

  root.CuyPlaceMusic = { trackForPlace: trackForPlace, enter: enter, enterFeature: enterFeature, placeOfFeature: placeOfFeature };
})(typeof window !== 'undefined' ? window : globalThis);
