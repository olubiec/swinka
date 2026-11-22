// Pure visual weather module for outdoor scenes (no DOM, no gameplay effect).
// Browser: window.CuyWeather. Node: module.exports.
(function (root) {
  'use strict';

  var DEFAULT_W = 256;
  var DEFAULT_H = 144;

  var DEFAULT_DATA = {
    version: 1,
    outdoorScenes: ['garden', 'park', 'farm', 'market'],
    types: {
      clear: { weight: 0.65 },
      overcast: { weight: 0.20, tintColor: '#5f7f87', tintAlpha: 0.14 },
      cloudy: { weight: 0, tintColor: '#6d8792', tintAlpha: 0.12 },
      fog: { weight: 0, tintColor: '#b7c7c9', tintAlpha: 0.24 },
      rain: {
        weight: 0.15,
        tintColor: '#3f5a68',
        tintAlpha: 0.22,
        streakCount: 28,
        streakColor: '#b9c9c4',
        streakHighlight: '#8da9a8',
        streakAlpha: 0.65,
        streakLength: 7,
        speedY: 160,
        windX: -28
      },
      storm: {
        weight: 0,
        tintColor: '#2c414f',
        tintAlpha: 0.30,
        streakCount: 44,
        streakColor: '#c9d7d4',
        streakHighlight: '#ffffff',
        streakAlpha: 0.78,
        streakLength: 9,
        speedY: 220,
        windX: -52
      },
      snow: {
        weight: 0,
        tintColor: '#9fb8c4',
        tintAlpha: 0.12,
        flakeCount: 36,
        flakeColor: '#eef4f5',
        flakeAlpha: 0.85,
        speedY: 24,
        windX: -8
      }
    }
  };

  function normalizeDateKey(dateKey) {
    if (dateKey instanceof Date) {
      return isNaN(dateKey.getTime()) ? 'invalid' : dateKey.toISOString().slice(0, 10);
    }
    if (typeof dateKey === 'number') {
      return Number.isFinite(dateKey) ? String(dateKey) : '0';
    }
    if (typeof dateKey === 'string') {
      return dateKey;
    }
    return '';
  }

  function fnv1a(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // Avalanche mix so sequential date keys distribute across [0, 1)
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  function pickType(u, types) {
    var keys = Object.keys(types);
    var total = 0;
    for (var i = 0; i < keys.length; i++) {
      var w = types[keys[i]] && types[keys[i]].weight;
      if (typeof w === 'number' && Number.isFinite(w) && w > 0) {
        total += w;
      }
    }
    if (total <= 0) {
      return 'clear';
    }
    var target = u * total;
    var acc = 0;
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      var wt = types[k] && types[k].weight;
      if (typeof wt === 'number' && Number.isFinite(wt) && wt > 0) {
        acc += wt;
        if (target < acc) {
          return k;
        }
      }
    }
    return keys[keys.length - 1] || 'clear';
  }

  function stateFor(dateKey, sceneKind, settings, data) {
    if (sceneKind !== 'outdoor') {
      return { type: 'none', outdoor: false, seed: 0, config: null };
    }
    if (settings && (settings.weatherEnabled === false || settings.weather === false)) {
      return { type: 'none', outdoor: true, disabled: true, seed: 0, config: null };
    }

    var cfgData = (data && data.types && typeof data.types === 'object') ? data : DEFAULT_DATA;
    var types = cfgData.types;
    var keyStr = normalizeDateKey(dateKey);
    var seed = fnv1a(keyStr);
    var u = seed / 4294967296;
    var chosen = pickType(u, types);
    var rawCfg = types[chosen] || null;
    var config = rawCfg ? Object.assign({}, rawCfg) : null;

    return {
      type: chosen,
      outdoor: true,
      seed: seed,
      dateKey: keyStr,
      config: config
    };
  }

  function drawStreaksBatch(ctx, color, count, modRemain, modBase, seed, t, w, h, windX, speedY, dx, dy) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    for (var i = 0; i < count; i++) {
      if (modBase > 0 && (i % modBase === 0) !== modRemain) {
        continue;
      }
      var h1 = Math.imul((seed ^ (i * 374761393)) >>> 0, 668265263) >>> 0;
      var h2 = Math.imul((seed ^ (i * 1274126177)) >>> 0, 2246822519) >>> 0;
      var x0 = (h1 / 4294967296) * w;
      var y0 = (h2 / 4294967296) * h;
      var x = ((x0 + windX * t) % w + w) % w;
      var y = ((y0 + speedY * t) % h + h) % h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
    }
    ctx.stroke();
  }

  function draw(ctx, state, tMs, w, h) {
    if (!ctx || !state || !state.outdoor || state.type === 'none' || state.type === 'clear') {
      return;
    }

    var cfg = state.config || DEFAULT_DATA.types[state.type];
    if (!cfg) {
      return;
    }

    var width = (Number.isFinite(w) && w > 0) ? w : DEFAULT_W;
    var height = (Number.isFinite(h) && h > 0) ? h : DEFAULT_H;
    var t = (Number.isFinite(tMs) && tMs >= 0) ? tMs / 1000 : 0;

    if (typeof ctx.save === 'function') {
      ctx.save();
    }

    if (cfg.tintColor && typeof cfg.tintAlpha === 'number' && cfg.tintAlpha > 0) {
      ctx.globalAlpha = cfg.tintAlpha;
      ctx.fillStyle = cfg.tintColor;
      ctx.fillRect(0, 0, width, height);
    }

    if (state.type === 'rain' || state.type === 'storm') {
      var count = (Number.isFinite(cfg.streakCount) && cfg.streakCount > 0) ? Math.floor(cfg.streakCount) : 28;
      var len = (Number.isFinite(cfg.streakLength) && cfg.streakLength > 0) ? cfg.streakLength : 7;
      var speedY = Number.isFinite(cfg.speedY) ? cfg.speedY : 160;
      var windX = Number.isFinite(cfg.windX) ? cfg.windX : -28;
      var alpha = (Number.isFinite(cfg.streakAlpha) && cfg.streakAlpha >= 0) ? cfg.streakAlpha : 0.65;
      var mag = Math.hypot(windX, speedY) || 1;
      var dx = (windX / mag) * len;
      var dy = (speedY / mag) * len;
      var seed = (state.seed >>> 0) || 1;

      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1;

      var mainColor = cfg.streakColor || '#b9c9c4';
      var hiColor = cfg.streakHighlight || mainColor;

      if (hiColor !== mainColor && count >= 4) {
        drawStreaksBatch(ctx, mainColor, count, false, 4, seed, t, width, height, windX, speedY, dx, dy);
        drawStreaksBatch(ctx, hiColor, count, true, 4, seed, t, width, height, windX, speedY, dx, dy);
      } else {
        drawStreaksBatch(ctx, mainColor, count, false, 0, seed, t, width, height, windX, speedY, dx, dy);
      }
    } else if (state.type === 'snow') {
      var fCount = (Number.isFinite(cfg.flakeCount) && cfg.flakeCount > 0) ? Math.floor(cfg.flakeCount) : 36;
      var fSpeedY = Number.isFinite(cfg.speedY) ? cfg.speedY : 24;
      var fWindX = Number.isFinite(cfg.windX) ? cfg.windX : -8;
      var fAlpha = (Number.isFinite(cfg.flakeAlpha) && cfg.flakeAlpha >= 0) ? cfg.flakeAlpha : 0.85;
      var fSeed = (state.seed >>> 0) || 1;

      ctx.globalAlpha = fAlpha;
      ctx.fillStyle = cfg.flakeColor || '#eef4f5';
      for (var fi = 0; fi < fCount; fi++) {
        var fh1 = Math.imul((fSeed ^ (fi * 374761393)) >>> 0, 668265263) >>> 0;
        var fh2 = Math.imul((fSeed ^ (fi * 1274126177)) >>> 0, 2246822519) >>> 0;
        var fx0 = (fh1 / 4294967296) * width;
        var fy0 = (fh2 / 4294967296) * height;
        var sway = Math.sin(t * 2 + fi) * 2;
        var fx = Math.floor(((fx0 + fWindX * t + sway) % width + width) % width);
        var fy = Math.floor(((fy0 + fSpeedY * t) % height + height) % height);
        var sz = (fi % 4 === 0) ? 2 : 1;
        ctx.fillRect(fx, fy, sz, sz);
      }
    }

    if (typeof ctx.restore === 'function') {
      ctx.restore();
    }
  }

  var api = {
    DEFAULT_DATA: DEFAULT_DATA,
    stateFor: stateFor,
    draw: draw
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.CuyWeather = api;
}(typeof window !== 'undefined' ? window : globalThis));
