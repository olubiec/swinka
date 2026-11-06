(function () {
  'use strict';

  if (typeof window !== 'undefined' && window.CuyScenes) return;

  const DEFAULT_SCENES = {
    room: {
      kind: 'room',
      title: 'Room',
      size: [240, 130],
      walk: [10, 96, 230, 126],
      depth_scale: [0.88, 1.0],
      bg: null
    },
    garden: {
      kind: 'outdoor',
      title: 'Garden',
      size: [256, 144],
      walk: [8, 80, 248, 138],
      depth_scale: [0.82, 1.0],
      bg: {
        morning: 'world/bg/garden_morning.png',
        day: 'world/bg/garden_day.png',
        evening: 'world/bg/garden_evening.png',
        night: 'world/bg/garden_night.png'
      },
      exits: {
        left: { to: 'house', x: 2 },
        right: { to: 'park', x: 253 }
      }
    },
    park: {
      kind: 'outdoor',
      title: 'Park',
      size: [384, 192],
      walk: [10, 110, 374, 186],
      depth_scale: [0.78, 1.0],
      bg: {
        morning: 'world/bg/park_morning.png',
        day: 'world/bg/park_day.png',
        evening: 'world/bg/park_evening.png',
        night: 'world/bg/park_night.png'
      },
      exits: {
        left: { to: 'garden', x: 4 },
        right: { to: 'farm', x: 380 }
      }
    },
    farm: {
      kind: 'outdoor',
      title: 'Farm',
      size: [256, 144],
      walk: [8, 80, 248, 138],
      depth_scale: [0.82, 1.0],
      bg: {
        morning: 'world/bg/farm.png',
        day: 'world/bg/farm.png',
        evening: 'world/bg/farm.png',
        night: 'world/bg/farm.png'
      },
      exits: {
        left: { to: 'park', x: 3 },
        right: { to: 'market', x: 252 }
      }
    },
    market: {
      kind: 'outdoor',
      title: 'Market',
      size: [256, 144],
      walk: [8, 120, 248, 140],
      depth_scale: [0.92, 1.0],
      bg: {
        morning: 'world/bg/market.png',
        day: 'world/bg/market.png',
        evening: 'world/bg/market.png',
        night: 'world/bg/market.png'
      },
      exits: {
        left: { to: 'farm', x: 3 },
        right: { to: 'house', x: 252 }
      }
    }
  };

  let scenesData = null;
  let loadPromise = null;

  function getAssetUrl(rel) {
    if (!rel) return null;
    if (typeof window !== 'undefined') {
      if (window.CuyHome && window.CuyHome.api && typeof window.CuyHome.api.assetUrl === 'function') {
        return window.CuyHome.api.assetUrl(rel);
      }
      const isWebView = !!(window.chrome && window.chrome.webview);
      return isWebView ? 'https://cuy.assets/' + rel : '../../assets/' + rel;
    }
    return '../../assets/' + rel;
  }

  async function load() {
    if (scenesData) return scenesData;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const url = getAssetUrl('data/place_scenes.json');
        try {
          const res = await window.fetch(url);
          if (res.ok) {
            scenesData = await res.json();
            return scenesData;
          }
        } catch (e) {}
      }

      if (typeof require !== 'undefined') {
        try {
          const fs = require('fs');
          const path = require('path');
          const candidates = [
            path.resolve(__dirname, '../../../assets/data/place_scenes.json'),
            path.resolve(__dirname, '../../../../assets/data/place_scenes.json'),
            path.resolve(process.cwd(), 'assets/data/place_scenes.json')
          ];
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              scenesData = JSON.parse(fs.readFileSync(p, 'utf8'));
              return scenesData;
            }
          }
        } catch (e) {}
      }

      return scenesData;
    })();

    return loadPromise;
  }

  // Pre-trigger loading if in browser
  if (typeof window !== 'undefined') {
    load();
  }

  function getScenesDict() {
    return (scenesData && scenesData.scenes) || DEFAULT_SCENES;
  }

  function order(state) {
    if (state && state.places && Array.isArray(state.places.order) && state.places.order.length > 0) {
      return state.places.order.map(s => ({
        id: s.id,
        title: s.title || (typeof s.id === 'string' ? s.id.charAt(0).toUpperCase() + s.id.slice(1) : ''),
        locked: !!s.locked,
        unlockHint: s.unlockHint || ''
      }));
    }
    return [
      { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
      { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
      { id: 'park', title: 'Park', locked: false, unlockHint: '' },
      { id: 'farm', title: 'Farm', locked: false, unlockHint: '' },
      { id: 'market', title: 'Market', locked: false, unlockHint: '' }
    ];
  }

  function neighbor(id, dir, state) {
    const ord = order(state);
    if (!ord || ord.length === 0) return id;
    const idx = ord.findIndex(s => s.id === id);
    if (idx === -1) {
      return dir >= 0 ? ord[0].id : ord[ord.length - 1].id;
    }
    const step = dir >= 0 ? 1 : -1;
    const nextIdx = (idx + step + ord.length) % ord.length;
    return ord[nextIdx].id;
  }

  function timeOfDay() {
    if (typeof window !== 'undefined' && window.Lights && typeof window.Lights.periodOf === 'function') {
      return window.Lights.periodOf(new Date());
    }
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 6) return 'night';
    if (hour >= 17) return 'evening';
    if (hour >= 10) return 'day';
    return 'morning';
  }

  function isHouseRoom(id) {
    if (!id) return true;
    if (id === 'room' || id === 'salon' || id === 'dorm') return true;
    if (typeof id === 'string' && id.startsWith('pig:')) return true;
    return false;
  }

  function getTitle(id, template) {
    if (id === 'salon') return 'Salon';
    if (id === 'dorm') return 'Dormitory';
    if (typeof id === 'string' && id.startsWith('pig:')) {
      const name = id.slice(4);
      return (name.charAt(0).toUpperCase() + name.slice(1)) + ' Room';
    }
    return template.title || (typeof id === 'string' ? id.charAt(0).toUpperCase() + id.slice(1) : 'Room');
  }

  function def(id, tod) {
    const scenes = getScenesDict();
    const effectiveId = id || 'salon';

    let template;
    if (isHouseRoom(effectiveId) || !scenes[effectiveId]) {
      template = scenes.room || DEFAULT_SCENES.room;
    } else {
      template = scenes[effectiveId];
    }

    const t = (tod && typeof tod === 'string') ? tod.toLowerCase() : timeOfDay();
    let bgUrl = null;
    if (template.bg && typeof template.bg === 'object') {
      const rel = template.bg[t] || template.bg.day || Object.values(template.bg)[0];
      if (rel) {
        bgUrl = getAssetUrl(rel);
      }
    }

    const ds = template.depthScale || template.depth_scale || [0.88, 1.0];
    const exits = template.exits ? JSON.parse(JSON.stringify(template.exits)) : null;

    return {
      id: effectiveId,
      kind: template.kind,
      title: getTitle(effectiveId, template),
      size: [template.size[0], template.size[1]],
      walk: [template.walk[0], template.walk[1], template.walk[2], template.walk[3]],
      depthScale: [ds[0], ds[1]],
      bgUrl: bgUrl,
      exits: exits
    };
  }

  function pigScene(state, pigId) {
    if (state) {
      const list = (state.places && Array.isArray(state.places.pigLocations))
        ? state.places.pigLocations
        : (Array.isArray(state.pigLocations) ? state.pigLocations : null);
      if (list && pigId) {
        const loc = list.find(p => p && (p.pigId === pigId || p.PigId === pigId));
        if (loc) {
          if (loc.scene) return loc.scene;
          if (loc.sceneId) return loc.sceneId;
          if (loc.Scene) return loc.Scene;
          if (loc.SceneId) return loc.SceneId;
        }
      }
    }
    return 'salon';
  }

  const CuyScenes = {
    load: load,
    order: order,
    neighbor: neighbor,
    def: def,
    timeOfDay: timeOfDay,
    pigScene: pigScene
  };

  if (typeof window !== 'undefined') {
    window.CuyScenes = CuyScenes;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CuyScenes;
  }
})();
