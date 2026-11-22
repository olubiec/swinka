/**
 * draw-budget.js — Pure viewport culling, layer degradation, animation/particle/light
 * caps, hidden-tab FPS throttling, and frame cost scoring.
 * UMD module (window.DrawBudget / module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DrawBudget = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const DEFAULT_LIMITS = Object.freeze({
    maxItems: 48,
    maxAnimated: 24,
    maxParticles: 32,
    maxLights: 8,
    hiddenFps: 30,
    activeFps: 60,
    cullMarginPx: 32,
    layerPriority: Object.freeze({
      fixture: 0,
      wall: 1,
      floor: 2,
      ground: 3,
      decor: 4
    })
  });

  function isFiniteNum(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function cloneLimits(src) {
    const base = src && typeof src === 'object' ? src : DEFAULT_LIMITS;
    const lp = base.layerPriority && typeof base.layerPriority === 'object'
      ? base.layerPriority
      : DEFAULT_LIMITS.layerPriority;
    return {
      maxItems: isFiniteNum(base.maxItems) && base.maxItems >= 0 ? Math.floor(base.maxItems) : DEFAULT_LIMITS.maxItems,
      maxAnimated: isFiniteNum(base.maxAnimated) && base.maxAnimated >= 0 ? Math.floor(base.maxAnimated) : DEFAULT_LIMITS.maxAnimated,
      maxParticles: isFiniteNum(base.maxParticles) && base.maxParticles >= 0 ? Math.floor(base.maxParticles) : DEFAULT_LIMITS.maxParticles,
      maxLights: isFiniteNum(base.maxLights) && base.maxLights >= 0 ? Math.floor(base.maxLights) : DEFAULT_LIMITS.maxLights,
      hiddenFps: isFiniteNum(base.hiddenFps) && base.hiddenFps > 0 ? base.hiddenFps : DEFAULT_LIMITS.hiddenFps,
      activeFps: isFiniteNum(base.activeFps) && base.activeFps > 0 ? base.activeFps : DEFAULT_LIMITS.activeFps,
      cullMarginPx: isFiniteNum(base.cullMarginPx) && base.cullMarginPx >= 0 ? base.cullMarginPx : DEFAULT_LIMITS.cullMarginPx,
      layerPriority: {
        fixture: isFiniteNum(lp.fixture) ? lp.fixture : DEFAULT_LIMITS.layerPriority.fixture,
        wall: isFiniteNum(lp.wall) ? lp.wall : DEFAULT_LIMITS.layerPriority.wall,
        floor: isFiniteNum(lp.floor) ? lp.floor : DEFAULT_LIMITS.layerPriority.floor,
        ground: isFiniteNum(lp.ground) ? lp.ground : DEFAULT_LIMITS.layerPriority.ground,
        decor: isFiniteNum(lp.decor) ? lp.decor : DEFAULT_LIMITS.layerPriority.decor
      }
    };
  }

  let _activeLimits = cloneLimits(DEFAULT_LIMITS);

  function resolveLimits(limits) {
    if (!limits || typeof limits !== 'object') return _activeLimits;
    return cloneLimits(Object.assign({}, _activeLimits, limits, {
      layerPriority: Object.assign({}, _activeLimits.layerPriority, limits.layerPriority || {})
    }));
  }

  function setLimits(obj) {
    if (!obj || typeof obj !== 'object') return getLimits();
    _activeLimits = cloneLimits(Object.assign({}, DEFAULT_LIMITS, obj, {
      layerPriority: Object.assign({}, DEFAULT_LIMITS.layerPriority, obj.layerPriority || {})
    }));
    return getLimits();
  }

  function getLimits() {
    return cloneLimits(_activeLimits);
  }

  function loadLimits(url) {
    const targetUrl = typeof url === 'string' && url.length > 0 ? url : 'assets/data/draw_limits.json';
    if (typeof fetch !== 'function') {
      return Promise.resolve(getLimits());
    }
    return fetch(targetUrl)
      .then(function (res) {
        if (!res || !res.ok) return getLimits();
        return res.json();
      })
      .then(function (data) {
        if (data && typeof data === 'object') {
          return setLimits(data);
        }
        return getLimits();
      })
      .catch(function () {
        return getLimits();
      });
  }

  function isVisible(thing, viewport, marginPx) {
    if (!thing || typeof thing !== 'object' || !isFiniteNum(thing.x) || !isFiniteNum(thing.y)) {
      return false;
    }
    if (!viewport || typeof viewport !== 'object' || !isFiniteNum(viewport.width) || !isFiniteNum(viewport.height)) {
      return false;
    }
    if (viewport.width <= 0 || viewport.height <= 0) return false;

    const margin = isFiniteNum(marginPx) && marginPx >= 0 ? marginPx : _activeLimits.cullMarginPx;
    const vx = isFiniteNum(viewport.x) ? viewport.x : 0;
    const vy = isFiniteNum(viewport.y) ? viewport.y : 0;

    const w = isFiniteNum(thing.w) && thing.w > 0 ? thing.w : (isFiniteNum(thing.width) && thing.width > 0 ? thing.width : 16);
    const h = isFiniteNum(thing.h) && thing.h > 0 ? thing.h : (isFiniteNum(thing.height) && thing.height > 0 ? thing.height : 16);
    const ax = isFiniteNum(thing.anchorX) ? thing.anchorX : 0.5;
    const ay = isFiniteNum(thing.anchorY) ? thing.anchorY : 1;

    const left = thing.x - w * ax;
    const top = thing.y - h * ay;
    const right = left + w;
    const bottom = top + h;

    return (
      right >= vx - margin &&
      left <= vx + viewport.width + margin &&
      bottom >= vy - margin &&
      top <= vy + viewport.height + margin
    );
  }

  function resolveFocus(focusPt, viewport) {
    if (focusPt && typeof focusPt === 'object' && isFiniteNum(focusPt.x) && isFiniteNum(focusPt.y)) {
      return { x: focusPt.x, y: focusPt.y };
    }
    if (viewport && typeof viewport === 'object' && isFiniteNum(viewport.width) && isFiniteNum(viewport.height)) {
      const vx = isFiniteNum(viewport.x) ? viewport.x : 0;
      const vy = isFiniteNum(viewport.y) ? viewport.y : 0;
      return { x: vx + viewport.width / 2, y: vy + viewport.height / 2 };
    }
    return { x: 128, y: 72 };
  }

  function distSq(item, focus) {
    const ix = item && isFiniteNum(item.x) ? item.x : focus.x;
    const iy = item && isFiniteNum(item.y) ? item.y : focus.y;
    const dx = ix - focus.x;
    const dy = iy - focus.y;
    return dx * dx + dy * dy;
  }

  function isProtected(item) {
    if (!item || typeof item !== 'object') return false;
    return Boolean(
      item.isGhost ||
      item.isPig ||
      item.kind === 'pig' ||
      item.type === 'pig' ||
      item.layer === 'pig' ||
      item.interactive ||
      item.isInteractive ||
      item.isFixture ||
      item.fixture ||
      item.layer === 'fixture'
    );
  }

  function getLayerPriority(item, lp) {
    if (!item || typeof item !== 'object') return lp.decor;
    if (item.isDecor || item.kind === 'decor') return lp.decor;
    if (typeof item.layer === 'string' && isFiniteNum(lp[item.layer])) {
      return lp[item.layer];
    }
    return lp.floor;
  }

  function selectItems(items, viewport, focusPt, limits) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const lim = resolveLimits(limits);
    const hasViewport = viewport && typeof viewport === 'object' && isFiniteNum(viewport.width) && isFiniteNum(viewport.height);

    const visible = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item || typeof item !== 'object') continue;
      if (isProtected(item) || !hasViewport || isVisible(item, viewport, lim.cullMarginPx)) {
        visible.push(item);
      }
    }

    if (visible.length <= lim.maxItems) {
      return visible;
    }

    const focus = resolveFocus(focusPt, viewport);
    const keepSet = new Set();
    const droppable = [];

    for (let i = 0; i < visible.length; i += 1) {
      const item = visible[i];
      if (isProtected(item)) {
        keepSet.add(i);
      } else {
        droppable.push({
          idx: i,
          priority: getLayerPriority(item, lim.layerPriority),
          dist: distSq(item, focus)
        });
      }
    }

    const remaining = Math.max(0, lim.maxItems - keepSet.size);
    droppable.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.idx - b.idx;
    });

    for (let i = 0; i < remaining && i < droppable.length; i += 1) {
      keepSet.add(droppable[i].idx);
    }

    const result = [];
    for (let i = 0; i < visible.length; i += 1) {
      if (keepSet.has(i)) {
        result.push(visible[i]);
      }
    }
    return result;
  }

  function hasExplicitAnimFlag(item) {
    if (!item || typeof item !== 'object') return false;
    return Boolean(
      item.animated === true ||
      item.isAnimated === true ||
      (isFiniteNum(item.frames) && item.frames > 1) ||
      (Array.isArray(item.frames) && item.frames.length > 1) ||
      item.light ||
      item.glow ||
      (isFiniteNum(item.fps) && item.fps > 0)
    );
  }

  function capAnimated(items, focusPt, limits) {
    const out = new Set();
    if (!Array.isArray(items) || items.length === 0) return out;
    const lim = resolveLimits(limits);
    if (lim.maxAnimated <= 0) return out;

    const focus = resolveFocus(focusPt, null);
    let anyExplicit = false;
    for (let i = 0; i < items.length; i += 1) {
      if (hasExplicitAnimFlag(items[i])) {
        anyExplicit = true;
        break;
      }
    }

    const candidates = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item || typeof item !== 'object') continue;
      if (item.animated === false || item.frames === 1) continue;
      if (anyExplicit && !hasExplicitAnimFlag(item)) continue;
      candidates.push({ item: item, idx: i, dist: distSq(item, focus) });
    }

    candidates.sort(function (a, b) {
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.idx - b.idx;
    });

    const count = Math.min(lim.maxAnimated, candidates.length);
    for (let i = 0; i < count; i += 1) {
      out.add(candidates[i].item);
    }
    return out;
  }

  function capParticles(particles, limits) {
    if (!Array.isArray(particles) || particles.length === 0) return [];
    const lim = resolveLimits(limits);
    if (lim.maxParticles <= 0) return [];
    if (particles.length <= lim.maxParticles) return particles.slice();
    return particles.slice(-lim.maxParticles);
  }

  function capLights(sources, focusPt, limits) {
    if (!Array.isArray(sources) || sources.length === 0) return [];
    const lim = resolveLimits(limits);
    if (lim.maxLights <= 0) return [];

    const focus = resolveFocus(focusPt, null);
    const enabled = [];
    for (let i = 0; i < sources.length; i += 1) {
      const s = sources[i];
      if (!s || typeof s !== 'object' || s.on === false) continue;
      enabled.push({ src: s, idx: i, dist: distSq(s, focus) });
    }

    enabled.sort(function (a, b) {
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.idx - b.idx;
    });

    const out = [];
    const count = Math.min(lim.maxLights, enabled.length);
    for (let i = 0; i < count; i += 1) {
      out.push(enabled[i].src);
    }
    return out;
  }

  function shouldDrawFrame(nowMs, lastFrameMs, isHidden, limits) {
    const lim = resolveLimits(limits);
    if (isHidden === true) {
      const minIntervalMs = 1000 / lim.hiddenFps;
      const draw = !isFiniteNum(lastFrameMs) || !isFiniteNum(nowMs) ? true : (nowMs - lastFrameMs) >= minIntervalMs;
      return { draw: draw, minIntervalMs: minIntervalMs };
    }
    return { draw: true, minIntervalMs: 1000 / lim.activeFps };
  }

  function frameCost(stats, limits) {
    const lim = resolveLimits(limits);
    const s = stats && typeof stats === 'object' ? stats : {};
    const items = isFiniteNum(s.items) && s.items > 0 ? s.items : 0;
    const animated = isFiniteNum(s.animated) && s.animated > 0 ? s.animated : 0;
    const particles = isFiniteNum(s.particles) && s.particles > 0 ? s.particles : 0;
    const lights = isFiniteNum(s.lights) && s.lights > 0 ? s.lights : 0;

    const itemRatio = lim.maxItems > 0 ? items / lim.maxItems : 0;
    const animRatio = lim.maxAnimated > 0 ? animated / lim.maxAnimated : 0;
    const partRatio = lim.maxParticles > 0 ? particles / lim.maxParticles : 0;
    const lightRatio = lim.maxLights > 0 ? lights / lim.maxLights : 0;

    const score = Math.round(itemRatio * 40 + animRatio * 25 + partRatio * 15 + lightRatio * 20);
    const overBudget = (
      score > 100 ||
      items > lim.maxItems ||
      animated > lim.maxAnimated ||
      particles > lim.maxParticles ||
      lights > lim.maxLights
    );

    return {
      items: items,
      animated: animated,
      particles: particles,
      lights: lights,
      score: score,
      overBudget: overBudget
    };
  }

  return {
    DEFAULT_LIMITS: DEFAULT_LIMITS,
    loadLimits: loadLimits,
    setLimits: setLimits,
    getLimits: getLimits,
    isVisible: isVisible,
    selectItems: selectItems,
    capAnimated: capAnimated,
    capParticles: capParticles,
    capLights: capLights,
    shouldDrawFrame: shouldDrawFrame,
    frameCost: frameCost
  };
});
