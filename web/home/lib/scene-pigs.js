// Pure multi-pig scene state: tracks position, walk target, and animation frame per pig.
// No DOM, no Canvas. Browser: window.CuyScenePigs. Node: module.exports.
(function (root) {
  'use strict';

  var DEFAULT_BOUNDS = [10, 96, 230, 126];
  var DEFAULT_MIN_GAP = 22;
  var DEFAULT_SPEED = 28;
  var MAX_SUBSTEP_MS = 50;
  var MAX_TOTAL_DT_MS = 2000;
  var SPAWN_ATTEMPTS = 24;
  var TARGET_ATTEMPTS = 16;

  var CALM_IDLE_ANIMS = ['idle', 'sniff', 'doze', 'sleep', 'yawn', 'scratch'];

  var ANIM_FPS = {
    idle: 4,
    walk: 8,
    sniff: 6,
    popcorn: 8,
    dance: 8,
    purr_pet: 6,
    doze: 4,
    sleep: 5,
    yawn: 8,
    scratch: 10
  };

  function normalizeBounds(b) {
    if (!Array.isArray(b) || b.length < 4) return null;
    var x0 = Number(b[0]);
    var y0 = Number(b[1]);
    var x1 = Number(b[2]);
    var y1 = Number(b[3]);
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
      return null;
    }
    return [
      Math.min(x0, x1),
      Math.min(y0, y1),
      Math.max(x0, x1),
      Math.max(y0, y1)
    ];
  }

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function isSegmentFree(x0, y0, x1, y1, isFreeFn) {
    if (typeof isFreeFn !== 'function') return true;
    if (!Number.isFinite(x0) || !Number.isFinite(y0) ||
        !Number.isFinite(x1) || !Number.isFinite(y1)) {
      return false;
    }
    var dist = Math.hypot(x1 - x0, y1 - y0);
    var steps = Math.max(1, Math.ceil(dist / 4));
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var sx = x0 + (x1 - x0) * t;
      var sy = y0 + (y1 - y0) * t;
      if (!isFreeFn(sx, sy)) return false;
    }
    return true;
  }

  function create(opts) {
    var o = opts || {};
    var rng = typeof o.rng === 'function' ? o.rng : Math.random;
    var bounds = normalizeBounds(o.bounds) || DEFAULT_BOUNDS.slice();
    var minGap = (typeof o.minGap === 'number' && Number.isFinite(o.minGap) && o.minGap >= 0) ? o.minGap : DEFAULT_MIN_GAP;
    var speed = (typeof o.speed === 'number' && Number.isFinite(o.speed) && o.speed >= 0) ? o.speed : DEFAULT_SPEED;
    var pigs = [];
    var byId = Object.create(null);
    var controller;

    function resolveIsFree(fn) {
      if (typeof fn === 'function') return fn;
      if (fn && typeof fn.isFree === 'function') return fn.isFree;
      return controller && typeof controller.isFree === 'function' ? controller.isFree : null;
    }

    function resolveFindPath(fn) {
      if (typeof fn === 'function') return fn;
      if (fn && typeof fn.findPath === 'function') return fn.findPath;
      return controller && typeof controller.findPath === 'function' ? controller.findPath : null;
    }

    function setPathfinder(findPath, isFree) {
      if (arguments.length === 1 && findPath && typeof findPath === 'object' && !Array.isArray(findPath)) {
        if (findPath.findPath !== undefined) {
          controller.findPath = typeof findPath.findPath === 'function' ? findPath.findPath : null;
        }
        if (findPath.isFree !== undefined) {
          controller.isFree = typeof findPath.isFree === 'function' ? findPath.isFree : null;
        }
        return controller;
      }
      if (findPath !== undefined) {
        controller.findPath = typeof findPath === 'function' ? findPath : null;
      }
      if (isFree !== undefined) {
        controller.isFree = typeof isFree === 'function' ? isFree : null;
      }
      return controller;
    }

    function randUnit() {
      var v = rng();
      return Number.isFinite(v) ? clamp(v, 0, 0.9999999) : 0.5;
    }

    function minDistToOthers(x, y, excludeId) {
      var best = Infinity;
      for (var i = 0; i < pigs.length; i++) {
        var other = pigs[i];
        if (other.id === excludeId) continue;
        var d = Math.hypot(x - other.x, y - other.y);
        if (d < best) best = d;
      }
      return best;
    }

    function findNearestFree(x0, y0, b, excludeId, isFreeFn) {
      var sx = clamp(x0, b[0], b[2]);
      var sy = clamp(y0, b[1], b[3]);
      if ((!isFreeFn || isFreeFn(sx, sy)) && minDistToOthers(sx, sy, excludeId) >= minGap) {
        return { x: sx, y: sy };
      }
      var step = 4;
      var maxDx = Math.max(Math.abs(sx - b[0]), Math.abs(b[2] - sx));
      var maxDy = Math.max(Math.abs(sy - b[1]), Math.abs(b[3] - sy));
      var maxR = Math.ceil(Math.max(maxDx, maxDy) / step) + 1;
      var bestFree = null;
      var bestDist = -1;

      function testPoint(px, py) {
        var cx = clamp(px, b[0], b[2]);
        var cy = clamp(py, b[1], b[3]);
        if (!isFreeFn(cx, cy)) return null;
        var d = minDistToOthers(cx, cy, excludeId);
        if (d >= minGap) return { x: cx, y: cy };
        if (d > bestDist) {
          bestDist = d;
          bestFree = { x: cx, y: cy };
        }
        return null;
      }

      for (var ring = 1; ring <= maxR; ring++) {
        var r = ring * step;
        var hit;
        for (var dx = -r; dx <= r; dx += step) {
          hit = testPoint(sx + dx, sy - r);
          if (hit) return hit;
          hit = testPoint(sx + dx, sy + r);
          if (hit) return hit;
        }
        for (var dy = -r + step; dy <= r - step; dy += step) {
          hit = testPoint(sx - r, sy + dy);
          if (hit) return hit;
          hit = testPoint(sx + r, sy + dy);
          if (hit) return hit;
        }
      }
      return bestFree;
    }

    function pickSpawnPoint(b, isFreeFn) {
      var w = Math.max(0, b[2] - b[0]);
      var h = Math.max(0, b[3] - b[1]);
      var bestX = null;
      var bestY = null;
      var bestDist = -1;

      for (var i = 0; i < SPAWN_ATTEMPTS; i++) {
        var cx = b[0] + randUnit() * w;
        var cy = b[1] + randUnit() * h;
        if (isFreeFn && !isFreeFn(cx, cy)) continue;
        var d = minDistToOthers(cx, cy, null);
        if (d >= minGap) {
          return { x: cx, y: cy };
        }
        if (d > bestDist) {
          bestDist = d;
          bestX = cx;
          bestY = cy;
        }
      }

      if (bestX !== null) {
        return { x: bestX, y: bestY };
      }
      var fallback = findNearestFree(b[0] + w * 0.5, b[1] + h * 0.5, b, null, isFreeFn);
      if (fallback) return fallback;
      return { x: b[0] + w * 0.5, y: b[1] + h * 0.5 };
    }

    function computePath(pig, tx, ty, b, findPathFn) {
      if (typeof findPathFn !== 'function') return null;
      var raw = findPathFn(pig.x, pig.y, tx, ty);
      if (!Array.isArray(raw)) return null;
      var waypoints = [];
      for (var i = 0; i < raw.length; i++) {
        var pt = raw[i];
        var wx, wy;
        if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
          wx = pt.x;
          wy = pt.y;
        } else if (Array.isArray(pt) && pt.length >= 2) {
          wx = Number(pt[0]);
          wy = Number(pt[1]);
        } else {
          continue;
        }
        if (!Number.isFinite(wx) || !Number.isFinite(wy)) continue;
        waypoints.push({
          x: clamp(wx, b[0], b[2]),
          y: clamp(wy, b[1], b[3])
        });
      }
      while (waypoints.length > 0 &&
             Math.abs(waypoints[0].x - pig.x) < 1e-6 &&
             Math.abs(waypoints[0].y - pig.y) < 1e-6) {
        waypoints.shift();
      }
      if (waypoints.length === 0) {
        if (Math.hypot(tx - pig.x, ty - pig.y) < 1) {
          return [{ x: clamp(tx, b[0], b[2]), y: clamp(ty, b[1], b[3]) }];
        }
        return null;
      }
      return waypoints;
    }

    function pickTarget(pig, b, isFreeFn, findPathFn) {
      var w = Math.max(0, b[2] - b[0]);
      var h = Math.max(0, b[3] - b[1]);
      for (var i = 0; i < TARGET_ATTEMPTS; i++) {
        var tx = b[0] + randUnit() * w;
        var ty = b[1] + randUnit() * h;
        if (isFreeFn && !isFreeFn(tx, ty)) continue;
        if (minDistToOthers(tx, ty, pig.id) < minGap) continue;
        if (findPathFn) {
          var path = computePath(pig, tx, ty, b, findPathFn);
          if (!path) continue;
          return { x: tx, y: ty, path: path };
        }
        if (isFreeFn && !isSegmentFree(pig.x, pig.y, tx, ty, isFreeFn)) continue;
        return { x: tx, y: ty, path: null };
      }
      return null;
    }

    function pickCalmIdleAnim() {
      var idx = Math.floor(randUnit() * CALM_IDLE_ANIMS.length);
      return CALM_IDLE_ANIMS[idx] || 'idle';
    }

    function clearTarget(pig, idleMin, idleSpan) {
      pig.targetX = null;
      pig.targetY = null;
      pig._path = null;
      pig.anim = pickCalmIdleAnim();
      pig.frame = 0;
      pig.frameAcc = 0;
      var minMs = typeof idleMin === 'number' ? idleMin : 3500;
      var spanMs = typeof idleSpan === 'number' ? idleSpan : 5500;
      pig.idleTimer = minMs + randUnit() * spanMs;
    }

    function assignNewTarget(pig, b, isFreeFn, findPathFn, fallbackIdleMin) {
      var target = pickTarget(pig, b, isFreeFn, findPathFn);
      if (target) {
        pig.targetX = target.x;
        pig.targetY = target.y;
        pig._path = target.path;
        pig.anim = 'walk';
        return true;
      }
      clearTarget(pig, fallbackIdleMin || 3500, 3500);
      return false;
    }

    function canStepTo(pig, nx, ny, isFreeFn) {
      if (isFreeFn) {
        if (!isFreeFn(nx, ny)) return false;
        if (Math.hypot(nx - pig.x, ny - pig.y) > 4 && isFreeFn(pig.x, pig.y) && !isSegmentFree(pig.x, pig.y, nx, ny, isFreeFn)) {
          return false;
        }
      }
      for (var i = 0; i < pigs.length; i++) {
        var other = pigs[i];
        if (other.id === pig.id) continue;
        var newDist = Math.hypot(nx - other.x, ny - other.y);
        if (newDist < minGap) {
          var curDist = Math.hypot(pig.x - other.x, pig.y - other.y);
          if (newDist <= curDist) return false;
        }
      }
      return true;
    }

    function trySlideStep(pig, dx, dy, stepDist, b, isFreeFn) {
      var sx = dx !== 0
        ? clamp(pig.x + (dx > 0 ? 1 : -1) * Math.min(Math.abs(dx), stepDist), b[0], b[2])
        : pig.x;
      var sy = dy !== 0
        ? clamp(pig.y + (dy > 0 ? 1 : -1) * Math.min(Math.abs(dy), stepDist), b[1], b[3])
        : pig.y;

      var canX = Math.abs(sx - pig.x) >= 0.5;
      var canY = Math.abs(sy - pig.y) >= 0.5;
      var tryXFirst = Math.abs(dx) >= Math.abs(dy);

      var candidates = tryXFirst
        ? [{ ok: canX, x: sx, y: pig.y }, { ok: canY, x: pig.x, y: sy }]
        : [{ ok: canY, x: pig.x, y: sy }, { ok: canX, x: sx, y: pig.y }];

      for (var i = 0; i < candidates.length; i++) {
        var cand = candidates[i];
        if (!cand.ok) continue;
        if (canStepTo(pig, cand.x, cand.y, isFreeFn)) {
          var movedX = cand.x - pig.x;
          pig.x = cand.x;
          pig.y = cand.y;
          if (Math.abs(movedX) > 0.01) {
            pig.facing = movedX >= 0 ? 1 : -1;
          }
          pig.anim = 'walk';
          return true;
        }
      }
      return false;
    }

    function sync(list, isFreeFn) {
      var freeFn = resolveIsFree(isFreeFn);
      var items = Array.isArray(list) ? list : [];
      var seen = Object.create(null);
      var nextPigs = [];
      var nextById = Object.create(null);

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item || item.id == null) continue;
        var id = String(item.id);
        if (seen[id]) continue;
        seen[id] = true;

        var existing = byId[id];
        if (existing) {
          existing.look = item.look;
          existing.stage = item.stage !== undefined ? item.stage : existing.stage;
          existing.traits = Array.isArray(item.traits) ? item.traits : (existing.traits || []);
          existing.modifiers = item.modifiers !== undefined ? item.modifiers : existing.modifiers;
          existing.pinned = !!item.pinned;
          if (existing.pinned) {
            existing.targetX = null;
            existing.targetY = null;
            existing._path = null;
            existing.anim = 'idle';
          }
          nextPigs.push(existing);
          nextById[id] = existing;
        } else {
          var hasPos = typeof item.x === 'number' && Number.isFinite(item.x) &&
                       typeof item.y === 'number' && Number.isFinite(item.y);
          var pinned = !!item.pinned;
          var pos;
          if (hasPos) {
            var px = clamp(item.x, bounds[0], bounds[2]);
            var py = clamp(item.y, bounds[1], bounds[3]);
            if (!pinned && freeFn && (!freeFn(px, py) || minDistToOthers(px, py, id) < minGap)) {
              var freed = findNearestFree(px, py, bounds, id, freeFn);
              if (freed) {
                px = freed.x;
                py = freed.y;
              }
            }
            pos = { x: px, y: py };
          } else {
            pos = pickSpawnPoint(bounds, freeFn);
          }
          var created = {
            id: id,
            x: pos.x,
            y: pos.y,
            facing: randUnit() < 0.5 ? -1 : 1,
            anim: pickCalmIdleAnim(),
            frame: 0,
            frameAcc: 0,
            targetX: null,
            targetY: null,
            _path: null,
            idleTimer: pinned ? 0 : (3500 + randUnit() * 5500),
            look: item.look,
            stage: item.stage !== undefined ? item.stage : 'adult',
            traits: Array.isArray(item.traits) ? item.traits : [],
            modifiers: item.modifiers || null,
            pinned: pinned,
            dance: false,
            danceFps: null
          };
          pigs.push(created);
          nextPigs.push(created);
          nextById[id] = created;
        }
      }

      pigs = nextPigs;
      byId = nextById;
    }

    function stepPig(pig, subMs, b, isFreeFn, findPathFn) {
      if (pig.pinned) {
        pig.targetX = null;
        pig.targetY = null;
        pig._path = null;
        pig.anim = 'idle';
      } else if (pig.dance && pig.anim !== 'sleep' && pig.anim !== 'doze' && pig.anim !== 'sleep_house') {
        pig.targetX = null;
        pig.targetY = null;
        pig._path = null;
        pig.anim = 'dance';
      } else {
        if (isFreeFn && !isFreeFn(pig.x, pig.y)) {
          var rescued = findNearestFree(pig.x, pig.y, b, pig.id, isFreeFn);
          if (rescued) {
            pig.x = rescued.x;
            pig.y = rescued.y;
            pig._path = null;
          }
        }
        if (pig.targetX !== null && pig.targetY !== null) {
          if (findPathFn && !pig._path) {
            var computed = computePath(pig, pig.targetX, pig.targetY, b, findPathFn);
            if (computed) {
              pig._path = computed;
            } else {
              assignNewTarget(pig, b, isFreeFn, findPathFn, 3500);
            }
          }
        }
        if (pig.targetX !== null && pig.targetY !== null) {
          var hasPath = Array.isArray(pig._path) && pig._path.length > 0;
          var goalX = hasPath ? pig._path[0].x : pig.targetX;
          var goalY = hasPath ? pig._path[0].y : pig.targetY;
          var dx = goalX - pig.x;
          var dy = goalY - pig.y;
          var dist = Math.hypot(dx, dy);
          var activityMul = (pig.modifiers && typeof pig.modifiers.activity === 'number' && Number.isFinite(pig.modifiers.activity)) ? pig.modifiers.activity : 1;
          var stepDist = speed * activityMul * (subMs / 1000);

          if (dist <= stepDist || dist < 1) {
            var ax = clamp(goalX, b[0], b[2]);
            var ay = clamp(goalY, b[1], b[3]);
            if (canStepTo(pig, ax, ay, isFreeFn)) {
              pig.x = ax;
              pig.y = ay;
              if (Math.abs(dx) > 0.01) {
                pig.facing = dx >= 0 ? 1 : -1;
              }
              if (hasPath) {
                pig._path.shift();
                if (pig._path.length > 0) {
                  pig.anim = 'walk';
                } else {
                  clearTarget(pig, 3500, 5500);
                }
              } else {
                clearTarget(pig, 3500, 5500);
              }
            } else if (!trySlideStep(pig, dx, dy, stepDist, b, isFreeFn)) {
              if (isFreeFn || findPathFn) {
                assignNewTarget(pig, b, isFreeFn, findPathFn, 3500);
              } else {
                clearTarget(pig, 3500, 5500);
              }
            }
          } else {
            var nx = clamp(pig.x + (dx / dist) * stepDist, b[0], b[2]);
            var ny = clamp(pig.y + (dy / dist) * stepDist, b[1], b[3]);
            if (canStepTo(pig, nx, ny, isFreeFn)) {
              pig.x = nx;
              pig.y = ny;
              if (Math.abs(dx) > 0.01) {
                pig.facing = dx >= 0 ? 1 : -1;
              }
              pig.anim = 'walk';
            } else if (!trySlideStep(pig, dx, dy, stepDist, b, isFreeFn)) {
              if (isFreeFn || findPathFn) {
                assignNewTarget(pig, b, isFreeFn, findPathFn, 3500);
              } else {
                clearTarget(pig, 3500, 5500);
              }
            }
          }
        } else {
          if (!pig.anim || pig.anim === 'walk') {
            pig.anim = pickCalmIdleAnim();
          }
          pig.idleTimer -= subMs;
          if (pig.idleTimer <= 0) {
            if (randUnit() < 0.45) {
              clearTarget(pig, 3500, 5500);
            } else {
              assignNewTarget(pig, b, isFreeFn, findPathFn, 3500);
            }
          }
        }
      }

      var fps = (pig.anim === 'dance' && typeof pig.danceFps === 'number' && Number.isFinite(pig.danceFps) && pig.danceFps > 0)
        ? pig.danceFps
        : (ANIM_FPS[pig.anim] || 4);
      pig.frameAcc += (subMs / 1000) * fps;
      if (pig.frameAcc >= 1) {
        var adv = Math.floor(pig.frameAcc);
        pig.frameAcc -= adv;
        pig.frame = (pig.frame + adv) % 1000000;
      }
    }

    function step(dtMs, ctx) {
      if (typeof dtMs !== 'number' || !Number.isFinite(dtMs) || dtMs <= 0) return;
      if (pigs.length === 0) return;

      var c = ctx || {};
      var isFreeFn = resolveIsFree(c.isFree || c.pathfinder);
      var findPathFn = resolveFindPath(c.findPath || c.pathfinder);
      var activeBounds = normalizeBounds(c.bounds) || bounds;
      var remaining = Math.min(dtMs, MAX_TOTAL_DT_MS);

      while (remaining > 0) {
        var sub = remaining > MAX_SUBSTEP_MS ? MAX_SUBSTEP_MS : remaining;
        remaining -= sub;
        for (var i = 0; i < pigs.length; i++) {
          stepPig(pigs[i], sub, activeBounds, isFreeFn, findPathFn);
        }
      }
    }

    function entries() {
      var out = new Array(pigs.length);
      for (var i = 0; i < pigs.length; i++) {
        var p = pigs[i];
        out[i] = {
          id: p.id,
          x: p.x,
          y: p.y,
          facing: p.facing,
          anim: p.anim,
          frame: p.frame,
          look: p.look,
          stage: p.stage,
          pinned: p.pinned,
          dance: !!p.dance,
          danceFps: p.danceFps || null
        };
      }
      out.sort(function (a, b) {
        if (a.y !== b.y) return a.y - b.y;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
      return out;
    }

    function remove(id) {
      var key = String(id);
      if (!byId[key]) return false;
      delete byId[key];
      for (var i = 0; i < pigs.length; i++) {
        if (pigs[i].id === key) {
          pigs.splice(i, 1);
          break;
        }
      }
      return true;
    }

    function setBounds(newBounds) {
      var nb = normalizeBounds(newBounds);
      if (!nb) return;
      bounds = nb;
      for (var i = 0; i < pigs.length; i++) {
        var p = pigs[i];
        p.x = clamp(p.x, bounds[0], bounds[2]);
        p.y = clamp(p.y, bounds[1], bounds[3]);
        if (p.targetX !== null && p.targetY !== null) {
          p.targetX = clamp(p.targetX, bounds[0], bounds[2]);
          p.targetY = clamp(p.targetY, bounds[1], bounds[3]);
          p._path = null;
        }
      }
    }

    function setPinned(id, pinned) {
      var p = byId[String(id)];
      if (!p) return;
      p.pinned = !!pinned;
      if (p.pinned) {
        p.targetX = null;
        p.targetY = null;
        p._path = null;
        p.anim = 'idle';
      }
    }

    function setDance(id, dancing, fps) {
      var p = byId[String(id)];
      if (!p) return;
      p.dance = !!dancing;
      p.danceFps = (typeof fps === 'number' && Number.isFinite(fps) && fps > 0) ? fps : null;
      if (p.dance) {
        if (!p.pinned && p.anim !== 'sleep' && p.anim !== 'doze' && p.anim !== 'sleep_house') {
          p.targetX = null;
          p.targetY = null;
          p._path = null;
          p.anim = 'dance';
        }
      } else if (p.anim === 'dance') {
        p.anim = 'idle';
        p.frame = 0;
        p.frameAcc = 0;
      }
    }

    function movePig(id, x, y, facing, anim, frame) {
      var p = (id != null) ? byId[String(id)] : pigs[0];
      if (!p) return;
      if (typeof x === 'number' && Number.isFinite(x)) p.x = x;
      if (typeof y === 'number' && Number.isFinite(y)) p.y = y;
      if (facing === 1 || facing === -1) p.facing = facing;
      if (typeof anim === 'string' && anim) p.anim = anim;
      if (typeof frame === 'number' && Number.isFinite(frame)) p.frame = frame;
    }

    function movePrimary(x, y, facing, anim, frame) {
      movePig(null, x, y, facing, anim, frame);
    }

    function debug() {
      var targets = new Array(pigs.length);
      for (var i = 0; i < pigs.length; i++) {
        targets[i] = {
          id: pigs[i].id,
          targetX: pigs[i].targetX,
          targetY: pigs[i].targetY
        };
      }
      return {
        count: pigs.length,
        bounds: bounds.slice(),
        minGap: minGap,
        pigs: entries(),
        targets: targets
      };
    }

    controller = {
      findPath: typeof o.findPath === 'function' ? o.findPath : null,
      isFree: typeof o.isFree === 'function' ? o.isFree : null,
      setPathfinder: setPathfinder,
      sync: sync,
      step: step,
      entries: entries,
      remove: remove,
      setBounds: setBounds,
      setPinned: setPinned,
      setDance: setDance,
      movePig: movePig,
      movePrimary: movePrimary,
      debug: debug
    };
    return controller;
  }

  var api = {
    create: create,
    isSegmentFree: isSegmentFree
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.CuyScenePigs = api;
}(typeof window !== 'undefined' ? window : globalThis));
