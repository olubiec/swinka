// Pure light engine: turns lights.json, the time of day and the placed items into the light data a renderer needs.
// No DOM, no state. Browser: window.Lights. Node: module.exports (used by tools/qa/lights-test.js).
(function (root) {
  'use strict';

  // Period starts (hour, inclusive). morning 06-10, day 10-17, evening 17-21, night 21-06.
  // No garden-background code defines these hours yet, so they are named constants here.
  var PERIOD_STARTS = [
    { hour: 6, period: 'morning' },
    { hour: 10, period: 'day' },
    { hour: 17, period: 'evening' },
    { hour: 21, period: 'night' }
  ];
  var PERIODS = ['morning', 'day', 'evening', 'night'];
  var DEFAULT_PERIOD = 'day';
  var PLACE_KINDS = ['indoor', 'outdoor'];

  // date: a Date, or an hour number 0-23.
  function periodOf(date) {
    var hour = typeof date === 'number' ? date : date.getHours();
    var period = 'night';
    for (var i = 0; i < PERIOD_STARTS.length; i++) {
      if (hour >= PERIOD_STARTS[i].hour) period = PERIOD_STARTS[i].period;
    }
    return period;
  }

  function periodIndex(period) {
    return PERIODS.indexOf(period);
  }

  function ambientFor(lights, period) {
    var table = (lights && lights.ambient) || {};
    var entry = table[period] || table[DEFAULT_PERIOD] || { color: [1, 1, 1], level: 1 };
    return { color: entry.color.slice(), level: entry.level };
  }

  // Colours come as [r,g,b] arrays or '#rrggbb' strings; both are returned as [r,g,b] numbers.
  function toRgb(color) {
    if (Array.isArray(color)) return [color[0], color[1], color[2]];
    var hex = String(color).replace('#', '');
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16)
    ];
  }

  // A source belongs to a placed item when its key or its `item` atlas id equals the item id.
  function findSource(sources, id) {
    if (Object.prototype.hasOwnProperty.call(sources, id)) return sources[id];
    var keys = Object.keys(sources);
    for (var i = 0; i < keys.length; i++) {
      if (sources[keys[i]].item === id) return sources[keys[i]];
    }
    return null;
  }

  // Automatic state, used when the player has not toggled the item:
  // auto_at sources are on from that period on; toggle sources are on in evening and night; the rest are always on.
  function autoOn(src, period) {
    if (src.auto_at) return periodIndex(period) >= periodIndex(src.auto_at);
    if (src.toggle) return periodIndex(period) >= periodIndex('evening');
    return true;
  }

  // place: 'indoor' (rooms) or 'outdoor' (garden, park, farm, market). Sources with place 'both' always match.
  function activeSources(lights, place, placedItems, period, toggles) {
    var sources = (lights && lights.sources) || {};
    var result = [];
    var list = placedItems || [];
    var manual = toggles || {};
    for (var i = 0; i < list.length; i++) {
      var placed = list[i];
      var src = findSource(sources, placed.id);
      if (!src) continue;
      if (src.place !== 'both' && src.place !== place) continue;
      var on = typeof manual[placed.id] === 'boolean' ? manual[placed.id] : autoOn(src, period);
      result.push({
        id: placed.id,
        x: placed.x,
        y: placed.y,
        on: on,
        color: src.color,
        radiusCells: src.radius_cells,
        strength: src.strength,
        flicker: src.flicker,
        frames: src.frames,
        fps: src.fps,
        file: src.file,
        on_file: src.on_file,
        mask: src.mask,
        glow: src.glow
      });
    }
    return result;
  }

  // Multiplies an [r,g,b] colour (0-255) by the ambient colour and level, then clamps to 0-255.
  function tint(rgb, ambient) {
    var out = [];
    for (var i = 0; i < 3; i++) {
      var v = rgb[i] * ambient.color[i] * ambient.level;
      out.push(Math.round(Math.min(255, Math.max(0, v))));
    }
    return out;
  }

  // Closest colour of the palette (the caller passes assets/data/style_palette.json colours).
  // Returns the palette entry itself, so the result is always a palette member.
  function nearest(rgb, palette) {
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < palette.length; i++) {
      var c = toRgb(palette[i]);
      var dr = rgb[0] - c[0];
      var dg = rgb[1] - c[1];
      var db = rgb[2] - c[2];
      var dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = palette[i];
      }
    }
    return best;
  }

  var api = {
    PERIODS: PERIODS,
    PLACE_KINDS: PLACE_KINDS,
    periodOf: periodOf,
    ambientFor: ambientFor,
    activeSources: activeSources,
    tint: tint,
    nearest: nearest
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.Lights = api;
}(typeof window !== 'undefined' ? window : globalThis));
