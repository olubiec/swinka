(function (root) {
  'use strict';

  var TUNNEL_IDS = {
    tunnel: true,
    prop_tunnel: true,
    willow_tunnel: true,
    tunnel_playground: true
  };

  var BALL_IDS = {
    ball: true,
    prop_ball: true,
    prop_hay_ball: true
  };

  function getRawId(thing) {
    if (!thing || typeof thing !== 'object') return '';
    if (typeof thing.itemId === 'string' && thing.itemId) return thing.itemId;
    if (typeof thing.id === 'string' && thing.id) return thing.id;
    return '';
  }

  function hasValidPosition(thing) {
    return Boolean(
      thing &&
      typeof thing === 'object' &&
      thing.flat !== true &&
      Number.isFinite(thing.x) &&
      Number.isFinite(thing.y)
    );
  }

  function kindOf(thing) {
    if (!hasValidPosition(thing)) return null;
    var raw = getRawId(thing);
    if (!raw) return null;
    var id = raw.toLowerCase();
    if (TUNNEL_IDS[id] || id.indexOf('tunnel') !== -1) return 'tunnel';
    if (BALL_IDS[id] || id.endsWith('_ball')) return 'ball';
    return null;
  }

  function interactionSpots(thing, def) {
    if (!hasValidPosition(thing)) return [];
    var kind = kindOf(thing);
    if (!kind && def && (def.kind === 'tunnel' || def.kind === 'ball')) {
      kind = def.kind;
    }
    if (!kind) return [];

    var defaultW = kind === 'tunnel' ? 32 : 16;
    var w = (def && Number.isFinite(def.w) && def.w > 0)
      ? def.w
      : (Number.isFinite(thing.w) && thing.w > 0 ? thing.w : defaultW);
    var halfW = Math.round(w / 2);
    var offset = kind === 'tunnel' ? 12 : 10;
    var y = Math.round(thing.y);

    var leftSpot = {
      x: Math.round(thing.x - halfW - offset),
      y: y,
      facing: 1,
      side: 'left'
    };
    var rightSpot = {
      x: Math.round(thing.x + halfW + offset),
      y: y,
      facing: -1,
      side: 'right'
    };

    if (kind === 'tunnel' && thing.flip === true) {
      return [rightSpot, leftSpot];
    }
    return [leftSpot, rightSpot];
  }

  function resolveDef(defs, itemId) {
    if (!defs || !itemId) return null;
    if (typeof defs === 'function') {
      try {
        return defs(itemId) || null;
      } catch (_) {
        return null;
      }
    }
    if (typeof defs === 'object') {
      return defs[itemId] || null;
    }
    return null;
  }

  function resolveThingUid(thing, itemId) {
    if (thing.uid !== undefined && thing.uid !== null && String(thing.uid)) {
      return String(thing.uid);
    }
    if (thing.id !== undefined && thing.id !== null && String(thing.id)) {
      return String(thing.id);
    }
    return itemId;
  }

  function pickReachable(things, pigPos, isFree, findPath, rng, defs) {
    if (!Array.isArray(things)) return null;
    if (!pigPos || typeof pigPos !== 'object' || !Number.isFinite(pigPos.x) || !Number.isFinite(pigPos.y)) {
      return null;
    }
    if (typeof isFree !== 'function' || typeof findPath !== 'function') {
      return null;
    }

    var reachable = [];
    for (var i = 0; i < things.length; i++) {
      var thing = things[i];
      var kind = kindOf(thing);
      if (!kind) continue;

      var itemId = getRawId(thing);
      var def = resolveDef(defs, itemId);
      var spots = interactionSpots(thing, def);

      for (var s = 0; s < spots.length; s++) {
        var spot = spots[s];
        if (isFree(spot.x, spot.y) !== true) continue;
        var path = findPath(pigPos.x, pigPos.y, spot.x, spot.y);
        if (!Array.isArray(path) || path.length === 0) continue;

        reachable.push({
          thingUid: resolveThingUid(thing, itemId),
          itemId: itemId,
          kind: kind,
          spot: spot,
          path: path
        });
        break;
      }
    }

    if (reachable.length === 0) return null;

    var rand = typeof rng === 'function' ? rng() : Math.random();
    if (!Number.isFinite(rand) || rand < 0) rand = 0;
    if (rand >= 1) rand = 0.999999999999;

    var idx = Math.floor(rand * reachable.length);
    return reachable[idx];
  }

  var api = {
    kindOf: kindOf,
    interactionSpots: interactionSpots,
    pickReachable: pickReachable
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.CuyPlayTargets = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
