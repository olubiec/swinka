// Pure hotspot engine: merges static scene hotspots with instance-derived hotspots,
// resolves hits, arbitrates pig/edit/drag/hotspot, clamps labels, sorts for keyboard, and tracks cooldowns.
// No DOM, no dependencies. Browser: window.CuyHotspots. Node: module.exports.
(function (root) {
  'use strict';

  var KINDS = Object.freeze(['stall', 'plot', 'orchard', 'shop', 'decor', 'lamp']);
  var EMPTY = Object.freeze([]);
  var ROOM_SCENES = { room: true, salon: true, bedroom: true, playroom: true, dorm: true };
  var SCENE_W = 256;
  var SCENE_H = 144;

  function isRoomScene(sceneId) {
    if (typeof sceneId !== 'string') return false;
    return ROOM_SCENES[sceneId] === true || sceneId.indexOf('pig:') === 0;
  }

  function isValidRect(rect) {
    return Array.isArray(rect) &&
      rect.length >= 4 &&
      Number.isFinite(rect[0]) &&
      Number.isFinite(rect[1]) &&
      Number.isFinite(rect[2]) &&
      Number.isFinite(rect[3]) &&
      rect[0] >= 0 &&
      rect[1] >= 0 &&
      rect[2] > rect[0] &&
      rect[3] > rect[1];
  }

  function isLampItem(itemId, catalog) {
    if (typeof itemId !== 'string' || !itemId) return false;
    if (itemId.indexOf('window_') === 0) return false;
    if (catalog && catalog[itemId] && catalog[itemId].kind === 'lamp') return true;
    return itemId.indexOf('lamp_') === 0 ||
      itemId.indexOf('lantern') !== -1 ||
      itemId === 'torch_wall' ||
      itemId === 'fairy_lights' ||
      itemId === 'brazier' ||
      itemId === 'campfire';
  }

  function classifyInstance(inst, catalog) {
    if (!inst || typeof inst !== 'object') return null;
    var uid = typeof inst.uid === 'string' ? inst.uid : (typeof inst.id === 'string' ? inst.id : '');
    var itemId = typeof inst.itemId === 'string' ? inst.itemId : '';
    var kind = null;
    var id = null;

    if (uid.indexOf('fx:market:stall_') === 0) {
      kind = 'stall';
      id = 'stall:' + uid.slice('fx:market:stall_'.length);
    } else if (uid === 'fx:market:order_board' || itemId === 'order_board') {
      kind = 'stall';
      id = 'stall:orders';
    } else if (itemId === 'stall_basic' || itemId === 'stall_big') {
      kind = 'stall';
      id = uid ? (uid.indexOf('stall:') === 0 ? uid : 'stall:' + uid) : ('stall:' + itemId);
    } else if (uid.indexOf('fx:farm:plot:') === 0) {
      kind = 'plot';
      id = 'plot:' + uid.slice('fx:farm:plot:'.length);
    } else if (isLampItem(itemId, catalog)) {
      kind = 'lamp';
      id = uid || itemId;
    }

    if (!kind || !id) return null;
    if (!Number.isFinite(inst.x) || !Number.isFinite(inst.y)) return null;

    var sw = (Number.isFinite(inst.sw) && inst.sw > 0) ? inst.sw
      : (Number.isFinite(inst.w) && inst.w > 0 ? (inst.w <= 8 ? inst.w * 16 : inst.w) : 16);
    var sh = (Number.isFinite(inst.sh) && inst.sh > 0) ? inst.sh
      : (Number.isFinite(inst.h) && inst.h > 0 ? (inst.h <= 8 ? inst.h * 16 : inst.h) : 16);
    var ax = Number.isFinite(inst.anchorX) ? inst.anchorX : sw / 2;
    var ay = Number.isFinite(inst.anchorY) ? inst.anchorY : sh;

    var x0 = Math.round(inst.x - ax);
    var y0 = Math.round(inst.y - ay);
    var x1 = Math.round(inst.x - ax + sw);
    var y1 = Math.round(inst.y - ay + sh);
    if (x1 <= x0 || y1 <= y0) return null;

    var defaultLabel = id === 'stall:orders' ? 'Orders' : id;
    var rawLabel = inst.label || inst.name || (catalog && catalog[itemId] && catalog[itemId].name) || defaultLabel;
    return {
      id: id,
      kind: kind,
      rect: [x0, y0, x1, y1],
      label: String(rawLabel).slice(0, 14),
      uid: uid || id
    };
  }

  function fromScene(sceneId, staticData, instances, catalog) {
    var staticList = (staticData && staticData.scenes && typeof sceneId === 'string' && Array.isArray(staticData.scenes[sceneId]))
      ? staticData.scenes[sceneId]
      : null;
    var hasInstances = Array.isArray(instances) && instances.length > 0;

    if (isRoomScene(sceneId) && !hasInstances && (!staticList || staticList.length === 0)) {
      return EMPTY;
    }

    var merged = [];
    var seen = Object.create(null);

    if (hasInstances) {
      for (var i = 0; i < instances.length; i += 1) {
        var derived = classifyInstance(instances[i], catalog);
        if (!derived || seen[derived.id]) continue;
        seen[derived.id] = true;
        merged.push(derived);
      }
    }

    if (staticList) {
      for (var j = 0; j < staticList.length; j += 1) {
        var st = staticList[j];
        if (!st || typeof st !== 'object' || typeof st.id !== 'string' || !st.id) continue;
        if (seen[st.id]) continue;
        if (!isValidRect(st.rect)) continue;
        seen[st.id] = true;
        merged.push({
          id: st.id,
          kind: st.kind || 'decor',
          rect: [st.rect[0], st.rect[1], st.rect[2], st.rect[3]],
          label: typeof st.label === 'string' ? st.label : st.id,
          uid: typeof st.uid === 'string' ? st.uid : st.id
        });
      }
    }

    if (merged.length === 0 && isRoomScene(sceneId)) {
      return EMPTY;
    }
    return merged;
  }

  function hit(list, x, y) {
    if (!Array.isArray(list) || !Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    var best = null;
    var bestY1 = -Infinity;
    var bestArea = Infinity;

    for (var i = 0; i < list.length; i += 1) {
      var hs = list[i];
      if (!hs || typeof hs !== 'object' || !isValidRect(hs.rect)) continue;
      var r = hs.rect;
      if (x >= r[0] && x < r[2] && y >= r[1] && y < r[3]) {
        var y1 = r[3];
        var area = (r[2] - r[0]) * (r[3] - r[1]);
        if (y1 > bestY1 || (y1 === bestY1 && area < bestArea)) {
          best = hs;
          bestY1 = y1;
          bestArea = area;
        }
      }
    }
    return best;
  }

  function arbitrate(opts) {
    if (!opts || typeof opts !== 'object') return 'hotspot';
    if (opts.editMode) return 'edit';
    if (opts.dragging) return 'drag';
    if (opts.overPig) return 'pig';
    return 'hotspot';
  }

  function clampLabelRect(rect, labelW, labelH, sceneW, sceneH) {
    var sw = Number.isFinite(sceneW) && sceneW > 0 ? sceneW : SCENE_W;
    var sh = Number.isFinite(sceneH) && sceneH > 0 ? sceneH : SCENE_H;
    var lw = Number.isFinite(labelW) && labelW >= 0 ? labelW : 0;
    var lh = Number.isFinite(labelH) && labelH >= 0 ? labelH : 0;
    var maxX = Math.max(0, sw - lw);
    var maxY = Math.max(0, sh - lh);

    var x = 0;
    var y = 0;
    if (Array.isArray(rect) && rect.length >= 4 &&
        Number.isFinite(rect[0]) && Number.isFinite(rect[1]) &&
        Number.isFinite(rect[2]) && Number.isFinite(rect[3])) {
      var cx = (rect[0] + rect[2]) / 2;
      x = Math.round(cx - lw / 2);
      y = Math.round(rect[1] - lh - 2);
      if (y < 0) {
        y = Math.round(rect[3] + 2);
      }
    }

    if (x < 0) x = 0;
    if (x > maxX) x = maxX;
    if (y < 0) y = 0;
    if (y > maxY) y = maxY;

    return { x: x, y: y, w: lw, h: lh };
  }

  function sortKeyboard(list) {
    if (!Array.isArray(list)) return [];
    var copy = [];
    for (var i = 0; i < list.length; i += 1) {
      var hs = list[i];
      if (hs && typeof hs === 'object' && Array.isArray(hs.rect) && hs.rect.length >= 4 &&
          Number.isFinite(hs.rect[0]) && Number.isFinite(hs.rect[1])) {
        copy.push(hs);
      }
    }
    copy.sort(function (a, b) {
      return (a.rect[1] - b.rect[1]) || (a.rect[0] - b.rect[0]);
    });
    return copy;
  }

  function createTracker(opts) {
    var cfg = (opts && typeof opts === 'object') ? opts : {};
    var cooldownMs = Number.isFinite(cfg.cooldownMs) && cfg.cooldownMs >= 0 ? cfg.cooldownMs : 250;
    var nowFn = typeof cfg.now === 'function' ? cfg.now : function () { return Date.now(); };
    var listeners = Object.create(null);
    var lastId = null;
    var lastTime = -Infinity;

    var tracker = {
      hoverId: null,
      activeId: null,
      setHover: function (id) {
        tracker.hoverId = id == null ? null : String(id);
      },
      on: function (kind, fn) {
        if (typeof kind !== 'string' || typeof fn !== 'function') {
          return function () {};
        }
        if (!listeners[kind]) {
          listeners[kind] = [];
        }
        listeners[kind].push(fn);
        return function unsubscribe() {
          var arr = listeners[kind];
          if (!arr) return;
          var idx = arr.indexOf(fn);
          if (idx !== -1) arr.splice(idx, 1);
        };
      },
      trigger: function (hotspot, nowMs) {
        if (!hotspot || typeof hotspot !== 'object' || !hotspot.id || !hotspot.kind) {
          return false;
        }
        var t = Number.isFinite(nowMs) ? nowMs : nowFn();
        if (hotspot.id === lastId && (t - lastTime) < cooldownMs) {
          return false;
        }
        lastId = hotspot.id;
        lastTime = t;
        tracker.activeId = hotspot.id;

        var fns = listeners[hotspot.kind];
        if (fns && fns.length > 0) {
          var snapshot = fns.slice();
          for (var i = 0; i < snapshot.length; i += 1) {
            snapshot[i](hotspot);
          }
        }
        return true;
      }
    };

    return tracker;
  }

  var api = {
    KINDS: KINDS,
    EMPTY: EMPTY,
    fromScene: fromScene,
    hit: hit,
    arbitrate: arbitrate,
    clampLabelRect: clampLabelRect,
    sortKeyboard: sortKeyboard,
    createTracker: createTracker
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.CuyHotspots = api;
}(typeof window !== 'undefined' ? window : globalThis));
