(function () {
  'use strict';

  if (typeof window !== 'undefined' && window.CuyScenes) return;

  const DEFAULT_SCENES = {
    room: {
      kind: 'room',
      title: 'Room',
      size: [192, 112],
      walk: [8, 40, 184, 110],
      depth_scale: [0.9375, 1.0],
      size_from_layout: true,
      pigWidthFrac: 0.20,
      bg: null
    },
    garden: {
      kind: 'outdoor',
      title: 'Garden',
      size: [256, 144],
      walk: [8, 80, 248, 138],
      depth_scale: [0.9375, 1.0],
      pigWidthFrac: 0.17,
      behindLine: 74,
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
      depth_scale: [0.9375, 1.0],
      pigWidthFrac: 0.17,
      behindLine: 106,
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
      depth_scale: [0.9375, 1.0],
      pigWidthFrac: 0.17,
      behindLine: 76,
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
      depth_scale: [0.9375, 1.0],
      pigWidthFrac: 0.17,
      behindLine: 120,
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
  let atlasData = null;
  let atlasPromise = null;
  let tilesData = null;
  let tilesPromise = null;

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

  function getTiles() {
    if (tilesData) return tilesData;
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(__dirname, '../../../assets/world/tiles.json'),
          path.resolve(__dirname, '../../../../assets/world/tiles.json'),
          path.resolve(process.cwd(), 'assets/world/tiles.json')
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            tilesData = JSON.parse(fs.readFileSync(p, 'utf8'));
            return tilesData;
          }
        }
      } catch (e) {}
    }
    return tilesData;
  }

  async function loadTiles() {
    if (tilesData) return tilesData;
    if (tilesPromise) return tilesPromise;

    tilesPromise = (async () => {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const url = getAssetUrl('world/tiles.json');
        try {
          const res = await window.fetch(url);
          if (res.ok) {
            tilesData = await res.json();
            return tilesData;
          }
        } catch (e) {}
      }
      return getTiles();
    })();

    return tilesPromise;
  }

  function getTileUrl(tileId) {
    if (!tileId) return null;
    const td = tilesData || getTiles();
    if (!td || !td.tiles) return null;
    const entry = td.tiles[tileId];
    if (entry && entry.file) {
      return getAssetUrl('world/' + entry.file);
    }
    return null;
  }

  function getAtlas() {
    if (atlasData) return atlasData;
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(__dirname, '../../../assets/world/atlas.json'),
          path.resolve(__dirname, '../../../../assets/world/atlas.json'),
          path.resolve(process.cwd(), 'assets/world/atlas.json')
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            atlasData = JSON.parse(fs.readFileSync(p, 'utf8'));
            return atlasData;
          }
        }
      } catch (e) {}
    }
    return atlasData;
  }

  async function loadAtlas() {
    if (atlasData) return atlasData;
    if (atlasPromise) return atlasPromise;

    atlasPromise = (async () => {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const url = getAssetUrl('world/atlas.json');
        try {
          const res = await window.fetch(url);
          if (res.ok) {
            atlasData = await res.json();
            return atlasData;
          }
        } catch (e) {}
      }
      return getAtlas();
    })();

    return atlasPromise;
  }

  async function load() {
    if (scenesData && atlasData) return scenesData;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      loadAtlas().catch(() => {});
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
    loadAtlas();
    loadTiles();
  }

  function getScenesDict() {
    if (!scenesData && typeof require !== 'undefined') {
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
            break;
          }
        }
      } catch (e) {}
    }
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

  function getRoomGeometry() {
    if (typeof window !== 'undefined' && window.CuyRoomGeometry) {
      return window.CuyRoomGeometry;
    }
    if (typeof CuyRoomGeometry !== 'undefined') {
      return CuyRoomGeometry;
    }
    if (typeof require !== 'undefined') {
      try {
        return require('./room-geometry.js');
      } catch (e) {
        try {
          const path = require('path');
          return require(path.resolve(__dirname, 'room-geometry.js'));
        } catch (e2) {}
      }
    }
    return null;
  }

  function layoutFor(sceneId, state) {
    let sid = sceneId;
    let st = state;
    if (typeof sid === 'object' && sid !== null && typeof st === 'string') {
      sid = state;
      st = sceneId;
    }
    const effectiveId = sid || 'salon';
    let layout = null;
    if (st) {
      if (st.rooms && st.rooms.layouts) {
        layout = st.rooms.layouts[effectiveId];
        if (!layout && (effectiveId === 'room' || effectiveId === 'salon')) {
          layout = st.rooms.layouts.salon || st.rooms.layouts.room;
        }
        if (!layout && effectiveId.startsWith('pig:')) {
          const rawName = effectiveId.slice(4);
          layout = st.rooms.layouts[rawName];
        }
        if (!layout && Array.isArray(st.rooms.pigRooms)) {
          const pr = st.rooms.pigRooms.find(r => r && (
            r.roomId === effectiveId ||
            r.pigId === effectiveId ||
            ('pig:' + r.pigId) === effectiveId ||
            r.name === effectiveId ||
            ('pig:' + r.name) === effectiveId
          ));
          if (pr) {
            layout = st.rooms.layouts[pr.roomId] || st.rooms.layouts['pig:' + pr.pigId] || st.rooms.layouts[pr.pigId];
          }
        }
      }
      if (!layout && st[effectiveId] && st[effectiveId].layout) {
        layout = st[effectiveId].layout;
      }
      if (!layout && st.places && st.places.layouts) {
        layout = st.places.layouts[effectiveId];
      }
      if (!layout && st.layouts && st.layouts[effectiveId]) {
        layout = st.layouts[effectiveId];
      }
      if (!layout && st.layout && typeof st.layout === 'object') {
        layout = st.layout;
      }
      if (!layout && (st.cols || st.rows) && Array.isArray(st.items)) {
        layout = st;
      }
    }
    return layout || null;
  }

  function def(id, tod, state) {
    let effectiveTod = tod;
    let effectiveState = state;
    if (tod && typeof tod === 'object' && state === undefined) {
      effectiveState = tod;
      effectiveTod = null;
    }

    const scenes = getScenesDict();
    const effectiveId = id || 'salon';

    let template;
    if (isHouseRoom(effectiveId) || !scenes[effectiveId]) {
      template = scenes.room || DEFAULT_SCENES.room;
    } else {
      template = scenes[effectiveId];
    }

    const t = (effectiveTod && typeof effectiveTod === 'string') ? effectiveTod.toLowerCase() : timeOfDay();
    let bgUrl = null;
    if (template.bg && typeof template.bg === 'object') {
      const rel = template.bg[t] || template.bg.day || Object.values(template.bg)[0];
      if (rel) {
        bgUrl = getAssetUrl(rel);
      }
    }

    const rawDs = template.depthScale || template.depth_scale || [0.88, 1.0];
    const exits = template.exits ? JSON.parse(JSON.stringify(template.exits)) : null;
    const isRoom = template.kind === 'room' || isHouseRoom(effectiveId);
    const pigWidthFrac = (typeof template.pigWidthFrac === 'number')
      ? template.pigWidthFrac
      : (isRoom ? 0.20 : 0.17);

    const hasSizeFromLayout = !!(template.size_from_layout || template.sizeFromLayout);

    let size;
    let wallH = undefined;
    let walk;

    if (hasSizeFromLayout) {
      const layout = layoutFor(effectiveId, effectiveState);
      const roomGeom = getRoomGeometry();
      if (layout && roomGeom) {
        const geom = roomGeom.geometry(layout);
        size = [geom.size[0], geom.size[1]];
        wallH = geom.wallH;
        walk = [geom.walk[0], geom.walk[1], geom.walk[2], geom.walk[3]];
      } else {
        size = [template.size[0], template.size[1]];
        wallH = 32;
        walk = [template.walk[0], template.walk[1], template.walk[2], template.walk[3]];
      }
    } else {
      size = [template.size[0], template.size[1]];
      walk = [template.walk[0], template.walk[1], template.walk[2], template.walk[3]];
    }

    const sw = (size && size[0]) || (template.size && template.size[0]) || 240;
    const bodySourceWidth = 46;
    const targetBottomPx = pigWidthFrac * sw;
    const rawBottomScale = targetBottomPx / bodySourceWidth;
    const bottomScale = Math.round(rawBottomScale * 8) / 8;

    const ratio = (rawDs[1] && rawDs[1] > 0) ? (rawDs[0] / rawDs[1]) : 0.88;
    const rawTopScale = bottomScale * ratio;
    let topScale = Math.round(rawTopScale * 8) / 8;
    if (topScale >= bottomScale) {
      topScale = Math.max(0.125, bottomScale - 0.125);
    }

    const computedDs = [topScale, bottomScale];

    const res = {
      id: effectiveId,
      kind: template.kind,
      title: getTitle(effectiveId, template),
      size: size,
      walk: walk,
      depthScale: computedDs,
      depth_scale: template.depth_scale || template.depthScale || computedDs,
      pigWidthFrac: pigWidthFrac,
      bgUrl: bgUrl,
      exits: exits,
      blockers: template.blockers ? JSON.parse(JSON.stringify(template.blockers)) : null,
      behindLine: (typeof template.behindLine === 'number') ? template.behindLine : null
    };

    if (wallH !== undefined) {
      res.wallH = wallH;
    }

    return res;
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

  function placedThings(state, sceneId) {
    const layout = layoutFor(sceneId, state);

    if (!layout || !Array.isArray(layout.items)) {
      return [];
    }

    const atlas = getAtlas();
    const roomGeom = getRoomGeometry();
    const items = [];

    for (const it of layout.items) {
      if (!it) continue;
      const itemId = it.itemId || it.id;
      const entry = (atlas && atlas.items) ? atlas.items[itemId] : null;

      const cw = (entry && entry.cells) ? entry.cells[0] : (it.w || 1);
      const ch = (entry && entry.cells) ? entry.cells[1] : (it.h || 1);

      let x, y;
      if (it.isPixel) {
        x = it.x;
        y = it.y;
      } else if (roomGeom && typeof roomGeom.cellToPx === 'function') {
        const pt = roomGeom.cellToPx(layout, it.x || 0, it.y || 0, cw, ch);
        x = pt.x;
        y = pt.y;
      } else {
        x = Math.round((it.x || 0) * 16 + (cw * 16) / 2);
        y = Math.round(((it.y || 0) + ch) * 16);
      }

      const sw = (entry && entry.size) ? entry.size[0] : (cw * 16);
      const sh = (entry && entry.size) ? entry.size[1] : (ch * 16);

      const anchorX = (entry && entry.anchor) ? entry.anchor[0] : Math.round(sw / 2);
      const anchorY = (entry && entry.anchor) ? entry.anchor[1] : sh;

      const url = (entry && entry.file) ? getAssetUrl('world/' + entry.file) : null;
      const isFlat = !!(it.flat || (entry && entry.flat) || (itemId && (itemId.startsWith('rug_') || itemId.startsWith('mat_') || itemId.includes('carpet'))));

      items.push({
        id: it.uid || it.id || itemId,
        itemId: itemId,
        url: url,
        img: null,
        x: x,
        y: y,
        anchorX: anchorX,
        anchorY: anchorY,
        flat: isFlat,
        flip: !!it.flip
      });
    }

    return items;
  }

  const CuyScenes = {
    load: load,
    loadAtlas: loadAtlas,
    loadTiles: loadTiles,
    order: order,
    neighbor: neighbor,
    def: def,
    layoutFor: layoutFor,
    timeOfDay: timeOfDay,
    pigScene: pigScene,
    placedThings: placedThings,
    getAtlas: getAtlas,
    getTiles: getTiles,
    getTileUrl: getTileUrl
  };

  if (typeof window !== 'undefined') {
    window.CuyScenes = CuyScenes;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CuyScenes;
  }
})();
