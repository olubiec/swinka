// Pure rest-spot picker for Home pigs (house > bed > cushion > floor corner + sleep_together pair).
// No DOM, no file I/O. Browser: window.RestSpots. Node: module.exports.
(function (root) {
  'use strict';

  var ITEM_KINDS = {
    // houses / hideouts / tunnels
    pigloo_garden: 'house',
    sig_james_hideout: 'house',
    cosy_nook: 'house',
    willow_tunnel: 'house',
    tunnel_playground: 'house',
    // beds / hammocks
    warm_house_bed: 'bed',
    bed: 'bed',
    hammock: 'bed',
    sig_glen_knit_bed: 'bed',
    sofa_cosy: 'bed',
    armchair: 'bed',
    // cushions / blankets / rugs
    cushion_big: 'cushion',
    pouf_boucle: 'cushion',
    sig_kuki_blanket: 'cushion',
    sig_racuch_hop_pad: 'cushion',
    picnic_blanket: 'cushion',
    rug_fringed: 'cushion',
    blanket_folded: 'cushion'
  };

  var TIER_PRIORITY = { house: 3, bed: 2, cushion: 1 };
  var PAIR_OFFSET_PX = 20;
  var CORNER_MARGIN_PX = 12;
  var TAKEN_RADIUS_PX = 14;

  function isFiniteNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function validWalk(walk) {
    if (!Array.isArray(walk) || walk.length < 4) return null;
    var x0 = walk[0];
    var y0 = walk[1];
    var x1 = walk[2];
    var y1 = walk[3];
    if (!isFiniteNum(x0) || !isFiniteNum(y0) || !isFiniteNum(x1) || !isFiniteNum(y1)) return null;
    if (x1 < x0 || y1 < y0) return null;
    return [x0, y0, x1, y1];
  }

  function inBounds(x, y, w) {
    return x >= w[0] && x <= w[2] && y >= w[1] && y <= w[3];
  }

  function pointBlockedByRects(x, y, blockers) {
    if (!Array.isArray(blockers)) return false;
    for (var i = 0; i < blockers.length; i++) {
      var b = blockers[i];
      var r = Array.isArray(b) ? b : (b && b.rect);
      if (Array.isArray(r) && r.length === 4) {
        if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true;
      }
    }
    return false;
  }

  function checkFree(scene, walk, x, y) {
    if (!inBounds(x, y, walk)) return false;
    if (typeof scene.isFree === 'function') {
      if (scene.isFree(x, y) !== true) return false;
    } else if (pointBlockedByRects(x, y, scene.blockers)) {
      return false;
    }
    return true;
  }

  function isPointTaken(x, y, thingKey, taken) {
    if (!Array.isArray(taken) || taken.length === 0) return false;
    for (var i = 0; i < taken.length; i++) {
      var tk = taken[i];
      if (!tk || typeof tk !== 'object') continue;
      if (thingKey && tk.thingId && tk.thingId === thingKey) return true;
      if (isFiniteNum(tk.gx) && isFiniteNum(tk.gy)) {
        var dx = x - tk.gx;
        var dy = y - tk.gy;
        if ((dx * dx + dy * dy) < (TAKEN_RADIUS_PX * TAKEN_RADIUS_PX)) return true;
      }
    }
    return false;
  }

  function isThingTaken(thingKey, taken) {
    if (!thingKey || !Array.isArray(taken)) return false;
    for (var i = 0; i < taken.length; i++) {
      var tk = taken[i];
      if (tk && tk.thingId && tk.thingId === thingKey) return true;
    }
    return false;
  }

  function distSq(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return dx * dx + dy * dy;
  }

  function getItemCategory(thing) {
    if (!thing || typeof thing !== 'object') return null;
    var key = thing.itemId || thing.id;
    if (typeof key !== 'string') return null;
    if (ITEM_KINDS[key]) return ITEM_KINDS[key];
    if (key === 'bed' || key.indexOf('_bed') !== -1 || key.indexOf('hammock') !== -1) return 'bed';
    if (key.indexOf('cushion') !== -1 || key.indexOf('blanket') !== -1 || key.indexOf('pouf') !== -1) return 'cushion';
    if (key.indexOf('hideout') !== -1 || key.indexOf('pigloo') !== -1 || key.indexOf('tunnel') !== -1) return 'house';
    return null;
  }

  function getThingWidthPx(thing, tilePx) {
    if (isFiniteNum(thing.w) && thing.w > 0) {
      return thing.w <= 8 ? thing.w * tilePx : thing.w;
    }
    return tilePx;
  }

  function findFreePointNear(scene, walk, baseX, baseY, taken, thingKey, isHouse) {
    var candidates = [];
    if (isHouse) {
      candidates.push([baseX, baseY - 1]);
      candidates.push([baseX, baseY]);
    } else {
      candidates.push([baseX, baseY]);
      candidates.push([baseX, baseY - 1]);
    }
    var offsets = [
      [0, 4], [0, -4], [4, 0], [-4, 0],
      [0, 8], [8, 0], [-8, 0], [0, -8],
      [12, 0], [-12, 0], [0, 12], [16, 0], [-16, 0]
    ];
    for (var i = 0; i < offsets.length; i++) {
      candidates.push([baseX + offsets[i][0], baseY + offsets[i][1]]);
    }

    for (var j = 0; j < candidates.length; j++) {
      var cx = Math.round(clamp(candidates[j][0], walk[0], walk[2]));
      var cy = Math.round(clamp(candidates[j][1], walk[1], walk[3]));
      if (Math.abs(cx - baseX) > 32 || Math.abs(cy - baseY) > 32) continue;
      if (!checkFree(scene, walk, cx, cy)) continue;
      if (isPointTaken(cx, cy, thingKey, taken)) continue;
      return { gx: cx, gy: cy };
    }
    return null;
  }

  function findPairNear(scene, walk, baseX, baseY, taken, thingKey) {
    var half = PAIR_OFFSET_PX / 2;
    var configs = [
      [baseX - half, baseY, baseX + half, baseY],
      [baseX, baseY, baseX + PAIR_OFFSET_PX, baseY],
      [baseX - PAIR_OFFSET_PX, baseY, baseX, baseY],
      [baseX - half, baseY - 2, baseX + half, baseY - 2],
      [baseX - half, baseY + 4, baseX + half, baseY + 4]
    ];
    for (var i = 0; i < configs.length; i++) {
      var x1 = Math.round(configs[i][0]);
      var y1 = Math.round(configs[i][1]);
      var x2 = Math.round(configs[i][2]);
      var y2 = Math.round(configs[i][3]);
      if (Math.abs(x2 - x1) < PAIR_OFFSET_PX) continue;
      if (!checkFree(scene, walk, x1, y1) || !checkFree(scene, walk, x2, y2)) continue;
      if (isPointTaken(x1, y1, thingKey, taken) || isPointTaken(x2, y2, thingKey, taken)) continue;
      return { x1: x1, y1: y1, x2: x2, y2: y2 };
    }
    return null;
  }

  function pickFloorSingle(scene, walk, taken) {
    var x0 = walk[0], y0 = walk[1], x1 = walk[2], y1 = walk[3];
    var mx = Math.min(CORNER_MARGIN_PX, Math.floor((x1 - x0) / 2));
    var my = Math.min(CORNER_MARGIN_PX, Math.floor((y1 - y0) / 2));
    var corners = [
      [x0 + mx, y0 + my],
      [x1 - mx, y0 + my],
      [x0 + mx, y1 - my],
      [x1 - mx, y1 - my],
      [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)]
    ];
    for (var i = 0; i < corners.length; i++) {
      var cx = Math.round(clamp(corners[i][0], x0, x1));
      var cy = Math.round(clamp(corners[i][1], y0, y1));
      if (checkFree(scene, walk, cx, cy) && !isPointTaken(cx, cy, null, taken)) {
        return { gx: cx, gy: cy };
      }
    }
    var step = 6;
    for (var y = y0; y <= y1; y += step) {
      for (var x = x0; x <= x1; x += step) {
        var rx = Math.round(x);
        var ry = Math.round(y);
        if (checkFree(scene, walk, rx, ry) && !isPointTaken(rx, ry, null, taken)) {
          return { gx: rx, gy: ry };
        }
      }
    }
    return null;
  }

  function pickFloorPair(scene, walk, taken) {
    var x0 = walk[0], y0 = walk[1], x1 = walk[2], y1 = walk[3];
    if ((x1 - x0) < PAIR_OFFSET_PX) return null;
    var mx = Math.min(CORNER_MARGIN_PX, Math.floor((x1 - x0 - PAIR_OFFSET_PX) / 2));
    var my = Math.min(CORNER_MARGIN_PX, Math.floor((y1 - y0) / 2));
    var anchors = [
      [x0 + mx, y0 + my],
      [x1 - mx - PAIR_OFFSET_PX, y0 + my],
      [x0 + mx, y1 - my],
      [x1 - mx - PAIR_OFFSET_PX, y1 - my]
    ];
    for (var i = 0; i < anchors.length; i++) {
      var ax = Math.round(clamp(anchors[i][0], x0, x1 - PAIR_OFFSET_PX));
      var ay = Math.round(clamp(anchors[i][1], y0, y1));
      var bx = ax + PAIR_OFFSET_PX;
      if (checkFree(scene, walk, ax, ay) && checkFree(scene, walk, bx, ay) &&
          !isPointTaken(ax, ay, null, taken) && !isPointTaken(bx, ay, null, taken)) {
        return { x1: ax, y1: ay, x2: bx, y2: ay };
      }
    }
    var step = 6;
    for (var y = y0; y <= y1; y += step) {
      for (var x = x0; x <= x1 - PAIR_OFFSET_PX; x += step) {
        var rx = Math.round(x);
        var ry = Math.round(y);
        var rx2 = rx + PAIR_OFFSET_PX;
        if (checkFree(scene, walk, rx, ry) && checkFree(scene, walk, rx2, ry) &&
            !isPointTaken(rx, ry, null, taken) && !isPointTaken(rx2, ry, null, taken)) {
          return { x1: rx, y1: ry, x2: rx2, y2: ry };
        }
      }
    }
    return null;
  }

  function pick(opts) {
    if (!opts || typeof opts !== 'object') return null;
    var scene = opts.scene;
    if (!scene || typeof scene !== 'object') return null;
    var walk = validWalk(scene.walk);
    if (!walk) return null;

    var kind = (opts.kind === 'nap' || opts.kind === 'sleep_together') ? opts.kind : 'sleep';
    var things = Array.isArray(opts.things) ? opts.things : [];
    var pigPos = (opts.pigPos && isFiniteNum(opts.pigPos.x) && isFiniteNum(opts.pigPos.y)) ? opts.pigPos : null;
    var taken = Array.isArray(opts.taken) ? opts.taken : [];
    var rng = (typeof opts.rng === 'function') ? opts.rng : Math.random;
    var tilePx = (isFiniteNum(scene.tilePx) && scene.tilePx > 0) ? scene.tilePx : 16;
    var midX = (walk[0] + walk[2]) / 2;

    if (kind === 'sleep_together') {
      var pairCandidates = [];
      for (var i = 0; i < things.length; i++) {
        var t = things[i];
        var cat = getItemCategory(t);
        if (cat !== 'bed' && cat !== 'cushion') continue;
        if (!isFiniteNum(t.x) || !isFiniteNum(t.y)) continue;
        var tKey = t.uid || t.id || null;
        if (isThingTaken(tKey, taken)) continue;
        var widthPx = getThingWidthPx(t, tilePx);
        var wideScore = widthPx >= (2 * tilePx) ? 10 : 0;
        var tierScore = (cat === 'bed' ? 2 : 1) + wideScore;
        var pair = findPairNear(scene, walk, t.x, t.y, taken, tKey);
        if (!pair) continue;
        var comfort = isFiniteNum(t.comfort) ? t.comfort : 0;
        var dist = pigPos ? distSq(pair.x1, pair.y1, pigPos.x, pigPos.y) : 0;
        pairCandidates.push({
          tier: tierScore,
          comfort: comfort,
          dist: dist,
          tie: rng(),
          spotType: cat,
          thingId: tKey,
          pair: pair
        });
      }
      if (pairCandidates.length > 0) {
        pairCandidates.sort(function (a, b) {
          if (b.tier !== a.tier) return b.tier - a.tier;
          if (b.comfort !== a.comfort) return b.comfort - a.comfort;
          if (a.dist !== b.dist) return a.dist - b.dist;
          return a.tie - b.tie;
        });
        var bestP = pairCandidates[0];
        return {
          gx: bestP.pair.x1,
          gy: bestP.pair.y1,
          anim: 'sleep_together',
          faceLeft: false,
          spotType: bestP.spotType,
          thingId: bestP.thingId,
          pair: {
            gx: bestP.pair.x2,
            gy: bestP.pair.y2,
            anim: 'sleep_together',
            faceLeft: true
          }
        };
      }
      var floorPair = pickFloorPair(scene, walk, taken);
      if (!floorPair) return null;
      return {
        gx: floorPair.x1,
        gy: floorPair.y1,
        anim: 'sleep_together',
        faceLeft: false,
        spotType: 'floor',
        thingId: null,
        pair: {
          gx: floorPair.x2,
          gy: floorPair.y2,
          anim: 'sleep_together',
          faceLeft: true
        }
      };
    }

    // Single pig: 'sleep' or 'nap'
    var candidates = [];
    for (var k = 0; k < things.length; k++) {
      var item = things[k];
      var category = getItemCategory(item);
      if (!category) continue;
      if (!isFiniteNum(item.x) || !isFiniteNum(item.y)) continue;
      var thingId = item.uid || item.id || null;
      if (isThingTaken(thingId, taken)) continue;

      var pt = findFreePointNear(scene, walk, item.x, item.y, taken, thingId, category === 'house');
      if (!pt) continue;

      var anim;
      if (category === 'house') {
        anim = 'sleep_house';
      } else {
        anim = (kind === 'nap') ? 'doze' : 'sleep';
      }
      var faceLeft = (typeof item.flip === 'boolean') ? item.flip : (pt.gx > midX);
      candidates.push({
        prio: TIER_PRIORITY[category] || 0,
        comfort: isFiniteNum(item.comfort) ? item.comfort : 0,
        dist: pigPos ? distSq(pt.gx, pt.gy, pigPos.x, pigPos.y) : 0,
        tie: rng(),
        gx: pt.gx,
        gy: pt.gy,
        anim: anim,
        faceLeft: faceLeft,
        spotType: category,
        thingId: thingId
      });
    }

    if (candidates.length > 0) {
      candidates.sort(function (a, b) {
        if (b.prio !== a.prio) return b.prio - a.prio;
        if (b.comfort !== a.comfort) return b.comfort - a.comfort;
        if (a.dist !== b.dist) return a.dist - b.dist;
        return a.tie - b.tie;
      });
      var chosen = candidates[0];
      return {
        gx: chosen.gx,
        gy: chosen.gy,
        anim: chosen.anim,
        faceLeft: chosen.faceLeft,
        spotType: chosen.spotType,
        thingId: chosen.thingId,
        pair: null
      };
    }

    var floorPt = pickFloorSingle(scene, walk, taken);
    if (!floorPt) return null;
    return {
      gx: floorPt.gx,
      gy: floorPt.gy,
      anim: (kind === 'nap') ? 'doze' : 'sleep',
      faceLeft: floorPt.gx > midX,
      spotType: 'floor',
      thingId: null,
      pair: null
    };
  }

  var api = {
    pick: pick,
    ITEM_KINDS: ITEM_KINDS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RestSpots = api;
}(typeof window !== 'undefined' ? window : globalThis));
