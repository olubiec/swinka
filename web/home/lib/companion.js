// Pure optional companion module for garden and park scenes (no DOM, no gameplay/economy effect).
// Browser: window.Companion. Node: module.exports.
(function (root) {
  'use strict';

  var DEFAULT_WALK = [8, 80, 248, 138];
  var MAX_DT_MS = 2000;
  var SUB_STEP_MS = 50;

  var DEFAULT_DATA = {
    version: 1,
    defaultId: 'garden_friend',
    allowedScenes: ['garden', 'park'],
    companions: [
      {
        id: 'garden_friend',
        name: 'Garden Friend',
        sprite: 'sprites/companion_agouti/spritesheet.png',
        frameSize: [64, 64],
        floorY: 59,
        scale: 0.45,
        speed: 22,
        minPigGap: 20,
        reactRadius: 34,
        reactCooldownMs: 3500,
        idleMinMs: 1400,
        idleMaxMs: 3200,
        animations: {
          idle: { row: 0, frames: 16, fps: 8 },
          sniff: { row: 1, frames: 12, fps: 12 },
          walk: { row: 2, frames: 8, fps: 10 },
          popcorn: { row: 4, frames: 12, fps: 14 }
        }
      }
    ]
  };

  function makeRng(seed) {
    var a = (Number.isFinite(seed) ? seed : 1337) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalizeConfig(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.companions) || data.companions.length === 0) {
      return DEFAULT_DATA;
    }
    return data;
  }

  function normalizeWalk(walk) {
    if (!Array.isArray(walk) || walk.length < 4) return DEFAULT_WALK;
    var x0 = Number(walk[0]);
    var y0 = Number(walk[1]);
    var x1 = Number(walk[2]);
    var y1 = Number(walk[3]);
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
      return DEFAULT_WALK;
    }
    return [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)];
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function minPigDist(x, y, pigs) {
    var best = Infinity;
    for (var i = 0; i < pigs.length; i++) {
      var p = pigs[i];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      var d = Math.hypot(x - p.x, y - p.y);
      if (d < best) best = d;
    }
    return best;
  }

  function nearestPig(x, y, pigs) {
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < pigs.length; i++) {
      var p = pigs[i];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      var d = Math.hypot(x - p.x, y - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best ? { pig: best, dist: bestDist } : null;
  }

  function resolveSpec(cfg, id) {
    var list = cfg.companions;
    if (typeof id === 'string' && id.length > 0) {
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === id) return list[i];
      }
    }
    var defId = cfg.defaultId;
    for (var j = 0; j < list.length; j++) {
      if (list[j] && list[j].id === defId) return list[j];
    }
    return list[0];
  }

  function create(data, opts) {
    var cfg = normalizeConfig(data);
    var options = opts && typeof opts === 'object' ? opts : {};
    var rng = makeRng(options.seed);
    var enabled = Boolean(options.enabled);
    var spec = resolveSpec(cfg, options.id);

    var active = false;
    var currentScene = null;
    var x = 0;
    var y = 0;
    var tx = 0;
    var ty = 0;
    var facing = 1;
    var state = 'idle'; // 'idle' | 'walk' | 'react'
    var anim = 'idle';
    var stateTimerMs = 0;
    var reactCooldownMs = 0;
    var animTimeMs = 0;

    function randRange(minVal, maxVal) {
      return minVal + rng() * Math.max(0, maxVal - minVal);
    }

    function isSceneAllowed(sceneId) {
      if (typeof sceneId !== 'string' || sceneId.length === 0) return false;
      var allowed = Array.isArray(cfg.allowedScenes) ? cfg.allowedScenes : DEFAULT_DATA.allowedScenes;
      return allowed.indexOf(sceneId) !== -1;
    }

    function isPointValid(px, py, walk, pigs, isFree) {
      if (px < walk[0] || px > walk[2] || py < walk[1] || py > walk[3]) return false;
      if (!isFree(px, py)) return false;
      return minPigDist(px, py, pigs) >= spec.minPigGap;
    }

    function pickValidPoint(walk, pigs, isFree) {
      var w = walk[2] - walk[0];
      var h = walk[3] - walk[1];
      for (var i = 0; i < 40; i++) {
        var rx = walk[0] + rng() * w;
        var ry = walk[1] + rng() * h;
        if (isPointValid(rx, ry, walk, pigs, isFree)) {
          return { x: rx, y: ry };
        }
      }
      // Coarse deterministic grid fallback
      for (var gy = walk[1]; gy <= walk[3]; gy += 10) {
        for (var gx = walk[0]; gx <= walk[2]; gx += 12) {
          if (isPointValid(gx, gy, walk, pigs, isFree)) {
            return { x: gx, y: gy };
          }
        }
      }
      return {
        x: clamp((walk[0] + walk[2]) * 0.5, walk[0], walk[2]),
        y: clamp((walk[1] + walk[3]) * 0.5, walk[1], walk[3])
      };
    }

    function enterIdle(durationMs) {
      state = 'idle';
      anim = 'idle';
      stateTimerMs = durationMs;
      animTimeMs = 0;
    }

    function spawnInScene(sceneId, walk, pigs, isFree) {
      var pt = pickValidPoint(walk, pigs, isFree);
      currentScene = sceneId;
      x = pt.x;
      y = pt.y;
      tx = pt.x;
      ty = pt.y;
      facing = rng() < 0.5 ? 1 : -1;
      reactCooldownMs = 0;
      active = true;
      enterIdle(randRange(spec.idleMinMs, spec.idleMaxMs));
    }

    function pushAwayFromPigs(walk, pigs, isFree) {
      var nearest = nearestPig(x, y, pigs);
      if (!nearest || nearest.dist >= spec.minPigGap) return;
      var dx = x - nearest.pig.x;
      var dy = y - nearest.pig.y;
      var len = Math.hypot(dx, dy);
      var ux = len > 1e-4 ? dx / len : 1;
      var uy = len > 1e-4 ? dy / len : 0;
      var targetDist = spec.minPigGap + 2;
      var nx = clamp(nearest.pig.x + ux * targetDist, walk[0], walk[2]);
      var ny = clamp(nearest.pig.y + uy * targetDist, walk[1], walk[3]);
      if (isPointValid(nx, ny, walk, pigs, isFree)) {
        x = nx;
        y = ny;
      }
    }

    function stepSub(subDt, walk, pigs, isFree) {
      reactCooldownMs = Math.max(0, reactCooldownMs - subDt);
      animTimeMs += subDt;

      // Ensure we don't remain overlapping if a pig moved into us
      pushAwayFromPigs(walk, pigs, isFree);

      // Check reaction to nearby pig
      if (state !== 'react' && reactCooldownMs <= 0) {
        var near = nearestPig(x, y, pigs);
        if (near && near.dist <= spec.reactRadius) {
          facing = near.pig.x >= x ? 1 : -1;
          anim = rng() < 0.5 ? 'popcorn' : 'sniff';
          state = 'react';
          var animDef = spec.animations[anim] || spec.animations.idle;
          stateTimerMs = Math.round((animDef.frames / animDef.fps) * 1000);
          reactCooldownMs = spec.reactCooldownMs;
          animTimeMs = 0;
          return;
        }
      }

      if (state === 'react') {
        stateTimerMs -= subDt;
        if (stateTimerMs <= 0) {
          enterIdle(randRange(spec.idleMinMs, spec.idleMaxMs));
        }
        return;
      }

      if (state === 'idle') {
        stateTimerMs -= subDt;
        if (stateTimerMs <= 0) {
          var target = pickValidPoint(walk, pigs, isFree);
          if (Math.hypot(target.x - x, target.y - y) >= 4 && isPointValid(target.x, target.y, walk, pigs, isFree)) {
            tx = target.x;
            ty = target.y;
            facing = tx >= x ? 1 : -1;
            state = 'walk';
            anim = 'walk';
            animTimeMs = 0;
          } else {
            enterIdle(spec.idleMinMs);
          }
        }
        return;
      }

      if (state === 'walk') {
        var dx = tx - x;
        var dy = ty - y;
        var dist = Math.hypot(dx, dy);
        var stepDist = spec.speed * (subDt / 1000);

        if (dist <= stepDist || dist < 1) {
          if (isPointValid(tx, ty, walk, pigs, isFree)) {
            x = tx;
            y = ty;
          }
          enterIdle(randRange(spec.idleMinMs, spec.idleMaxMs));
          return;
        }

        var nx = x + (dx / dist) * stepDist;
        var ny = y + (dy / dist) * stepDist;
        if (isPointValid(nx, ny, walk, pigs, isFree)) {
          x = nx;
          y = ny;
        } else {
          enterIdle(spec.idleMinMs);
        }
      }
    }

    function step(dt, ctx) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      if (!enabled || !ctx || typeof ctx !== 'object' || !isSceneAllowed(ctx.sceneId)) {
        active = false;
        currentScene = null;
        return;
      }

      var walk = normalizeWalk(ctx.walk);
      var pigs = Array.isArray(ctx.pigs) ? ctx.pigs : [];
      var isFree = typeof ctx.isFree === 'function' ? ctx.isFree : function () { return true; };

      if (!active || currentScene !== ctx.sceneId) {
        spawnInScene(ctx.sceneId, walk, pigs, isFree);
      }

      var remaining = Math.min(dt, MAX_DT_MS);
      while (remaining > 0) {
        var subDt = Math.min(remaining, SUB_STEP_MS);
        stepSub(subDt, walk, pigs, isFree);
        remaining -= subDt;
      }
    }

    function entries() {
      if (!enabled || !active) return [];
      var animDef = spec.animations[anim] || spec.animations.idle;
      var frame = Math.floor((animTimeMs / 1000) * animDef.fps) % animDef.frames;
      if (!Number.isInteger(frame) || frame < 0) frame = 0;
      return [
        {
          id: spec.id,
          x: x,
          y: y,
          frame: frame,
          row: animDef.row,
          anim: anim,
          facing: facing,
          sprite: spec.sprite,
          frameSize: spec.frameSize.slice(),
          floorY: spec.floorY,
          scale: spec.scale
        }
      ];
    }

    function setEnabled(on) {
      enabled = Boolean(on);
      if (!enabled) {
        active = false;
        currentScene = null;
      }
    }

    function setId(id) {
      spec = resolveSpec(cfg, id);
    }

    function isEnabled() {
      return enabled;
    }

    function getId() {
      return spec.id;
    }

    return {
      step: step,
      entries: entries,
      setEnabled: setEnabled,
      setId: setId,
      isEnabled: isEnabled,
      getId: getId
    };
  }

  var api = {
    DEFAULT_DATA: DEFAULT_DATA,
    create: create
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.Companion = api;
}(typeof window !== 'undefined' ? window : globalThis));
