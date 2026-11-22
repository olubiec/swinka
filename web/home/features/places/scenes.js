(function () {
  'use strict';

  if (typeof window !== 'undefined' && window.CuyScenes) return;

  const DEFAULT_SCENES = {
    room: {
      kind: 'room',
      title: 'Room',
      size: [192, 112],
      walk: [8, 40, 184, 110],
      depth_scale: [0.75, 0.875],
      size_from_layout: true,
      pigWidthFrac: 0.14,
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
      bg_clean: true,
      bg: {
        morning: 'world/bg/garden_day.png',
        day: 'world/bg/garden_day.png',
        evening: 'world/bg/garden_day.png',
        night: 'world/bg/garden_day.png'
      },
      exits: {
        left: { to: 'house', x: 2 },
        right: { to: 'park', x: 253 }
      }
    },
    park: {
      kind: 'outdoor',
      title: 'Park',
      size: [256, 144],
      walk: [8, 80, 248, 138],
      depth_scale: [0.9375, 1.0],
      pigWidthFrac: 0.17,
      behindLine: 74,
      bg_clean: true,
      bg: {
        morning: 'world/bg/park_day.png',
        day: 'world/bg/park_day.png',
        evening: 'world/bg/park_day.png',
        night: 'world/bg/park_day.png'
      },
      exits: {
        left: { to: 'garden', x: 4 },
        right: { to: 'farm', x: 252 }
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
      bg_clean: true,
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
      walk: [4, 78, 252, 140],
      depth_scale: [0.8125, 1.0],
      pigWidthFrac: 0.16,
      behindLine: 76,
      bg_clean: true,
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
  let hotspotsData = null;
  let hotspotsPromise = null;
  let lightsData = null;
  let lightsPromise = null;
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
            if (typeof window !== 'undefined' && window.CuyPlaces && typeof window.CuyPlaces.applyLight === 'function') {
              try { window.CuyPlaces.applyLight(); } catch (e) {}
            }
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
      loadHotspots().catch(() => {});
      loadLights().catch(() => {});
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

  function getHotspotsData() {
    if (hotspotsData) return hotspotsData;
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(__dirname, '../../../assets/data/scene_hotspots.json'),
          path.resolve(__dirname, '../../../../assets/data/scene_hotspots.json'),
          path.resolve(process.cwd(), 'assets/data/scene_hotspots.json')
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            hotspotsData = JSON.parse(fs.readFileSync(p, 'utf8'));
            return hotspotsData;
          }
        }
      } catch (e) {}
    }
    return hotspotsData;
  }

  async function loadHotspots() {
    if (hotspotsData) return hotspotsData;
    if (hotspotsPromise) return hotspotsPromise;
    hotspotsPromise = (async () => {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const url = getAssetUrl('data/scene_hotspots.json');
        try {
          const res = await window.fetch(url);
          if (res.ok) {
            hotspotsData = await res.json();
            return hotspotsData;
          }
        } catch (e) {}
      }
      return getHotspotsData();
    })();
    return hotspotsPromise;
  }

  function getLightsData() {
    if (lightsData) return lightsData;
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(__dirname, '../../../assets/data/lights.json'),
          path.resolve(__dirname, '../../../../assets/data/lights.json'),
          path.resolve(process.cwd(), 'assets/data/lights.json')
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            lightsData = JSON.parse(fs.readFileSync(p, 'utf8'));
            return lightsData;
          }
        }
      } catch (e) {}
    }
    return lightsData;
  }

  async function loadLights() {
    if (lightsData) return lightsData;
    if (lightsPromise) return lightsPromise;
    lightsPromise = (async () => {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const url = getAssetUrl('data/lights.json');
        try {
          const res = await window.fetch(url);
          if (res.ok) {
            lightsData = await res.json();
            return lightsData;
          }
        } catch (e) {}
      }
      return getLightsData();
    })();
    return lightsPromise;
  }

  // Pre-trigger loading if in browser
  if (typeof window !== 'undefined') {
    Promise.all([load(), loadAtlas(), loadTiles(), loadHotspots(), loadLights()]).then(() => {
      if (window.CuyPlaces && typeof window.CuyPlaces.updateStageNav === 'function') {
        window.CuyPlaces.updateStageNav();
      }
    }).catch(() => {});
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

  function isFlatItem(it, entry, itemId) {
    return !!(it.flat || (entry && entry.flat) || (itemId && (itemId.startsWith('rug_') || itemId.startsWith('mat_') || itemId.includes('carpet') || itemId.startsWith('plot_') || itemId.startsWith('grass_tuft_') || itemId.startsWith('path_'))));
  }

  function hasAtlasArt(atlas, entry) {
    if (atlas && atlas.items) {
      return !!(entry && entry.file && entry.art !== 'missing');
    }
    return true;
  }

  function buildInstanceBlockers(sceneId, state) {
    const layout = layoutFor(sceneId, state);
    if (!layout || !Array.isArray(layout.items)) {
      return [];
    }
    const atlas = getAtlas();
    const blockers = [];
    for (const it of layout.items) {
      if (!it) continue;
      let itemId = it.itemId || it.id;
      const uid = it.uid || it.id || itemId;
      if (sceneId === 'farm' && typeof uid === 'string') {
        const pm = uid.match(/^fx:farm:plot:(\d+)$/);
        if (pm && state && state.farm && Array.isArray(state.farm.plots)) {
          const p = state.farm.plots[Number(pm[1])];
          if (p) {
            if (p.state === 'ripe') itemId = 'plot_ripe';
            else if (p.state === 'growing') itemId = p.watered ? 'plot_watered' : 'plot_sprout';
            else itemId = 'plot_empty';
          }
        }
      }
      const entry = (atlas && atlas.items) ? atlas.items[itemId] : null;
      if (!hasAtlasArt(atlas, entry)) continue;
      if (isFlatItem(it, entry, itemId)) continue;

      const cw = (entry && entry.cells) ? entry.cells[0] : (it.w || 1);
      const ch = (entry && entry.cells) ? entry.cells[1] : (it.h || 1);

      let rx0, ry0, rx1, ry1;
      if (it.isPixel) {
        rx0 = Math.round((it.x || 0) - (cw * 16) / 2);
        ry1 = Math.round(it.y || 0);
        rx1 = rx0 + cw * 16;
        ry0 = ry1 - ch * 16;
      } else {
        rx0 = Math.round((it.x || 0) * 16);
        ry0 = Math.round((it.y || 0) * 16);
        rx1 = Math.round(((it.x || 0) + cw) * 16);
        ry1 = Math.round(((it.y || 0) + ch) * 16);
      }

      if (sceneId === 'market' && stallRoleOf({ uid: uid, id: uid })) {
        ry1 = 84;
        ry0 = ry1 - Math.min(ch * 16, 18);
      }

      blockers.push({
        id: it.uid || it.id || itemId,
        rect: [rx0, ry0, rx1, ry1],
        behindLine: -9999
      });
    }
    return blockers;
  }

  function setBgClean(sceneId, val) {
    if (!scenesData) {
      getScenesDict();
    }
    if (!scenesData) {
      scenesData = { scenes: JSON.parse(JSON.stringify(DEFAULT_SCENES)) };
    }
    if (!scenesData.scenes) scenesData.scenes = {};
    if (!scenesData.scenes[sceneId]) {
      scenesData.scenes[sceneId] = JSON.parse(JSON.stringify(DEFAULT_SCENES[sceneId] || {}));
    }
    scenesData.scenes[sceneId].bg_clean = !!val;
  }

  function def(id, tod, state) {
    let effectiveTod = tod;
    let effectiveState = state;
    if (tod && typeof tod === 'object' && state === undefined) {
      effectiveState = tod;
      effectiveTod = null;
    }
    if (!effectiveState && typeof window !== 'undefined' && window.bridge && window.bridge.currentState) {
      effectiveState = window.bridge.currentState;
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

    const explicitDs = (Array.isArray(template.depthScale) && template.depthScale.length >= 2)
      ? template.depthScale
      : ((Array.isArray(template.depth_scale) && template.depth_scale.length >= 2) ? template.depth_scale : null);
    const rawDs = explicitDs || [0.88, 1.0];
    const exits = template.exits ? JSON.parse(JSON.stringify(template.exits)) : null;
    const isRoom = template.kind === 'room' || isHouseRoom(effectiveId);
    const pigWidthFrac = (typeof template.pigWidthFrac === 'number')
      ? template.pigWidthFrac
      : (isRoom ? 0.20 : 0.17);

    const hasSizeFromLayout = !!(template.size_from_layout || template.sizeFromLayout);
    const layout = (hasSizeFromLayout || isRoom) ? layoutFor(effectiveId, effectiveState) : null;
    const roomGeom = getRoomGeometry();

    let size;
    let wallH = undefined;
    let walk;

    if (hasSizeFromLayout) {
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

    let computedDs;
    if (isRoom && roomGeom && typeof roomGeom.pigScaleForRoom === 'function') {
      const cols = (layout && layout.cols) || Math.round(((size && size[0]) || 192) / 16) || 12;
      const rows = (layout && layout.rows) || Math.round(((size && size[1]) || 112) / 16) || 7;
      computedDs = roomGeom.pigScaleForRoom(cols, rows);
    } else if (explicitDs) {
      computedDs = [Number(explicitDs[0]), Number(explicitDs[1])];
    } else {
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

      computedDs = [topScale, bottomScale];
    }

    const isBgClean = !!template.bg_clean;
    const res = {
      id: effectiveId,
      kind: template.kind,
      bg_clean: isBgClean,
      title: getTitle(effectiveId, template),
      size: size,
      walk: walk,
      depthScale: computedDs.slice(),
      depth_scale: (explicitDs ? [Number(explicitDs[0]), Number(explicitDs[1])] : computedDs.slice()),
      pigWidthFrac: pigWidthFrac,
      bgUrl: bgUrl,
      exits: exits,
      blockers: isBgClean
        ? buildInstanceBlockers(effectiveId, effectiveState)
        : (template.blockers ? JSON.parse(JSON.stringify(template.blockers)) : null),
      behindLine: isBgClean
        ? -9999
        : ((typeof template.behindLine === 'number') ? template.behindLine : null)
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

  function getItemFrames(itemId, entry, it) {
    if (it && Number.isFinite(Number(it.frames)) && Number(it.frames) > 1) {
      return { frames: Math.max(1, Number(it.frames)), explicit: true };
    }
    if (entry && Number.isFinite(Number(entry.frames)) && Number(entry.frames) > 1) {
      return { frames: Math.max(1, Number(entry.frames)), explicit: true };
    }
    const ld = getLightsData();
    if (ld && itemId && typeof ld === 'object') {
      const direct = ld[itemId];
      if (direct && typeof direct === 'object') {
        const f = Number(direct.frames || direct.frameCount);
        if (Number.isFinite(f) && f > 1) return { frames: Math.max(1, f), explicit: false };
      }
      for (const key of Object.keys(ld)) {
        const sub = ld[key];
        if (sub && typeof sub === 'object' && !Array.isArray(sub) && sub[itemId] && typeof sub[itemId] === 'object') {
          const f = Number(sub[itemId].frames || sub[itemId].frameCount);
          if (Number.isFinite(f) && f > 1) return { frames: Math.max(1, f), explicit: false };
        }
      }
    }
    if (typeof window !== 'undefined' && window.Lights && itemId) {
      if (typeof window.Lights.framesFor === 'function') {
        const f = Number(window.Lights.framesFor(itemId));
        if (Number.isFinite(f) && f > 1) return { frames: Math.max(1, f), explicit: false };
      }
      const lItems = window.Lights.items || window.Lights.fixtures;
      if (lItems && lItems[itemId]) {
        const f = Number(lItems[itemId].frames || lItems[itemId].frameCount);
        if (Number.isFinite(f) && f > 1) return { frames: Math.max(1, f), explicit: false };
      }
    }
    return { frames: 1, explicit: false };
  }

  function resolveSingleFrameMetrics(itemId, entry, it, cw, ch) {
    const frameInfo = getItemFrames(itemId, entry, it);
    const frameCount = Math.max(1, Number(frameInfo.frames) || 1);
    const useEntryW = !!(entry && Number.isFinite(entry.w) && entry.w > 0);
    const sizeW = (entry && entry.size && Number.isFinite(entry.size[0]) && entry.size[0] > 0) ? entry.size[0] : 0;
    const sizeH = (entry && entry.size && Number.isFinite(entry.size[1]) && entry.size[1] > 0) ? entry.size[1] : 0;
    const entryW = useEntryW ? entry.w : sizeW;
    const entryH = (entry && Number.isFinite(entry.h) && entry.h > 0) ? entry.h : sizeH;
    const fallbackW = (it && Number.isFinite(it.sw) && it.sw > 0)
      ? it.sw
      : ((it && Number.isFinite(it.w) && it.w > 0) ? (it.w <= 8 ? it.w * 16 : it.w) : cw * 16);
    const fallbackH = (it && Number.isFinite(it.sh) && it.sh > 0)
      ? it.sh
      : ((it && Number.isFinite(it.h) && it.h > 0) ? (it.h <= 8 ? it.h * 16 : it.h) : ch * 16);
    const isStrip = frameCount > 1 && entryW > 0 && (
      frameInfo.explicit || (useEntryW && entryW >= Math.max(frameCount * 12, Math.round(cw * 16 * frameCount * 0.75)))
    );
    const sw = entryW ? (isStrip ? Math.round(entryW / frameCount) : entryW) : fallbackW;
    const sh = entryH ? entryH : fallbackH;
    const rawAnchorX = (entry && entry.anchor) ? entry.anchor[0] : Math.round(sw / 2);
    const anchorX = (isStrip && rawAnchorX > sw) ? Math.round(sw / 2) : rawAnchorX;
    const anchorY = (entry && entry.anchor) ? entry.anchor[1] : sh;
    return { sw: sw, sh: sh, anchorX: anchorX, anchorY: anchorY };
  }

  function placedThings(state, sceneId) {
    let st = state;
    let sid = sceneId;
    if (typeof st === 'string') {
      sid = st;
      st = (sceneId && typeof sceneId === 'object') ? sceneId : null;
    }

    const scenes = getScenesDict();
    const tpl = scenes[sid];
    if (!isHouseRoom(sid) && tpl && tpl.kind === 'outdoor' && !tpl.bg_clean) {
      return [];
    }

    const layout = layoutFor(sid, st);

    if (!layout || !Array.isArray(layout.items)) {
      return [];
    }

    const atlas = getAtlas();
    const roomGeom = getRoomGeometry();
    const isRoomScene = isHouseRoom(sid);
    const roomCols = (layout && layout.cols) ? layout.cols : 12;
    const roomRows = (layout && layout.rows) ? layout.rows : 7;
    const geom = (isRoomScene && roomGeom && typeof roomGeom.geometry === 'function')
      ? roomGeom.geometry(layout)
      : { wallH: 32 };
    const off = isRoomScene
      ? ((roomGeom && typeof roomGeom.stageOffset === 'function')
        ? roomGeom.stageOffset(roomCols, roomRows)
        : { x: Math.floor((256 - roomCols * 16) / 2), y: Math.floor((144 - roomRows * 16) / 2) })
      : { x: 0, y: 0 };
    const wallBottomY = off.y + (typeof geom.wallH === 'number' ? geom.wallH : 32);
    const wallPrefixes = ['window_', 'picture_', 'shelf_', 'fairy_lights', 'bunting', 'hanging_ivy', 'wall_clock', 'clock_cuckoo', 'lace_curtain', 'wall_picture', 'curtains_dots', 'hanging_planter', 'mirror_wavy', 'frames_gallery', 'plant_shelf', 'memory_frame'];
    const catalog = (st && st.rooms && Array.isArray(st.rooms.catalog)) ? st.rooms.catalog : null;
    const items = [];

    for (const it of layout.items) {
      if (!it) continue;
      let itemId = it.itemId || it.id;
      const uid = it.uid || it.id || itemId;
      if (sid === 'farm' && typeof uid === 'string') {
        const pm = uid.match(/^fx:farm:plot:(\d+)$/);
        if (pm && st && st.farm && Array.isArray(st.farm.plots)) {
          const p = st.farm.plots[Number(pm[1])];
          if (p) {
            if (p.state === 'ripe') itemId = 'plot_ripe';
            else if (p.state === 'growing') itemId = p.watered ? 'plot_watered' : 'plot_sprout';
            else itemId = 'plot_empty';
          }
        }
      }
      const entry = (atlas && atlas.items) ? atlas.items[itemId] : null;
      if (!hasAtlasArt(atlas, entry)) continue;

      const cw = (entry && entry.cells) ? entry.cells[0]
        : ((Number.isFinite(it.w) && it.w > 0) ? (it.w <= 8 ? it.w : Math.max(1, Math.round(it.w / 16))) : 1);
      const ch = (entry && entry.cells) ? entry.cells[1]
        : ((Number.isFinite(it.h) && it.h > 0) ? (it.h <= 8 ? it.h : Math.max(1, Math.round(it.h / 16))) : 1);
      const catEntry = catalog ? catalog.find(c => c && (c.id === itemId || c.itemId === itemId)) : null;
      const worldItem = (typeof window !== 'undefined' && window.CuyWorldItems && typeof window.CuyWorldItems.find === 'function')
        ? window.CuyWorldItems.find(itemId)
        : null;
      const footHCandidates = [
        it.footH,
        it.foot_h,
        catEntry && catEntry.footH,
        catEntry && catEntry.foot_h,
        worldItem && worldItem.footH,
        worldItem && worldItem.foot_h,
        entry && entry.footH,
        entry && entry.foot_h
      ];
      let footH = ch;
      for (let fi = 0; fi < footHCandidates.length; fi++) {
        const v = Number(footHCandidates[fi]);
        if (Number.isFinite(v) && v > 0) {
          footH = v;
          break;
        }
      }

      let x, y;
      if (it.isPixel) {
        x = it.x;
        y = it.y;
      } else if (roomGeom && typeof roomGeom.cellToPx === 'function') {
        const pt = roomGeom.cellToPx(layout, it.x || 0, it.y || 0, cw, footH);
        x = pt.x;
        y = pt.y;
      } else {
        x = Math.round((it.x || 0) * 16 + (cw * 16) / 2);
        y = Math.round(((it.y || 0) + footH) * 16);
      }

      const metrics = resolveSingleFrameMetrics(itemId, entry, it, cw, ch);
      const url = (entry && entry.file) ? getAssetUrl('world/' + entry.file) : null;
      const isFlat = isFlatItem(it, entry, itemId);
      let itemLayer = (entry && entry.layer) || (catEntry && catEntry.layer) || it.layer || null;
      if ((!itemLayer || itemLayer === 'floor') && typeof itemId === 'string' && wallPrefixes.some(p => itemId.startsWith(p) || itemId === p)) {
        itemLayer = 'wall';
      }
      if (!itemLayer) itemLayer = 'floor';

      if (isRoomScene && !it.isPixel && (itemLayer === 'wall' || (typeof itemId === 'string' && itemId.startsWith('window_')))) {
        const frameH = metrics.sh;
        const visibleWallH = Math.max(frameH + 2, wallBottomY - 6);
        let drawY = off.y + (y - metrics.anchorY);
        if ((it.y || 0) === 0) {
          drawY = Math.max(3, Math.round((visibleWallH - frameH) / 2));
        }
        drawY = Math.max(2, Math.min(drawY, wallBottomY - 6 - frameH));
        y = (drawY - off.y) + metrics.anchorY;
      }

      if (sid === 'market' && stallRoleOf({ uid: uid, id: uid })) {
        y = 84;
      }

      items.push({
        id: uid,
        uid: uid,
        itemId: itemId,
        url: url,
        img: null,
        x: x,
        y: y,
        isPixel: true,
        w: metrics.sw,
        h: metrics.sh,
        sw: metrics.sw,
        sh: metrics.sh,
        anchorX: metrics.anchorX,
        anchorY: metrics.anchorY,
        footH: footH,
        flat: isFlat,
        layer: itemLayer,
        flip: !!it.flip
      });
    }

    return items;
  }

  function debugInstances(sceneId, state) {
    const st = state || (typeof window !== 'undefined' && window.bridge && window.bridge.currentState) || null;
    const scenes = getScenesDict();
    const tpl = scenes[sceneId] || {};
    const d = def(sceneId, null, st);
    return {
      sceneId: sceneId,
      bg_clean: !!tpl.bg_clean,
      layout: layoutFor(sceneId, st),
      placedThings: placedThings(st, sceneId),
      blockers: d ? d.blockers : []
    };
  }

  function hotspotsFor(sceneId, state) {
    const hsMod = (typeof window !== 'undefined' && window.CuyHotspots) || (typeof CuyHotspots !== 'undefined' ? CuyHotspots : null);
    if (!hsMod || typeof hsMod.fromScene !== 'function') return [];
    const st = state || (typeof window !== 'undefined' && window.bridge && window.bridge.currentState) || null;
    let instances = placedThings(st, sceneId);
    const atlas = getAtlas();
    let off = { x: 0, y: 0 };
    if (isHouseRoom(sceneId) && instances.length > 0) {
      const layout = layoutFor(sceneId, st);
      const cols = (layout && layout.cols) ? layout.cols : 12;
      const rows = (layout && layout.rows) ? layout.rows : 7;
      const roomGeom = getRoomGeometry();
      off = (roomGeom && typeof roomGeom.stageOffset === 'function')
        ? roomGeom.stageOffset(cols, rows)
        : { x: Math.floor((256 - cols * 16) / 2), y: Math.floor((144 - rows * 16) / 2) };
    }
    instances = instances.map(it => {
      const entry = (atlas && atlas.items) ? atlas.items[it.itemId] : null;
      const cw = (entry && entry.cells) ? entry.cells[0] : 1;
      const ch = (entry && entry.cells) ? entry.cells[1] : 1;
      const metrics = resolveSingleFrameMetrics(it.itemId, entry, it, cw, ch);
      const sw = (Number.isFinite(it.sw) && it.sw > 0) ? it.sw : metrics.sw;
      const sh = (Number.isFinite(it.sh) && it.sh > 0) ? it.sh : metrics.sh;
      const anchorX = Number.isFinite(it.anchorX) ? it.anchorX : metrics.anchorX;
      const anchorY = Number.isFinite(it.anchorY) ? it.anchorY : metrics.anchorY;
      return Object.assign({}, it, {
        x: (it.x || 0) + off.x,
        y: (it.y || 0) + off.y,
        sw: sw,
        sh: sh,
        anchorX: anchorX,
        anchorY: anchorY
      });
    });
    const catalog = (typeof window !== 'undefined' && window.CuyWorldItems) || null;
    return hsMod.fromScene(sceneId, getHotspotsData(), instances, catalog);
  }

  const SIGNBOARD_EMBLEMS = {
    left: {
      palette: {
        '1': '#4e9a36',
        '2': '#9be068',
        '3': '#7ec850',
        '4': '#2f7d32',
        '5': '#4e301b'
      },
      rows: [
        '..11....',
        '.1221.33',
        '.112.323',
        '...4.33.',
        '...44...',
        '...4....',
        '..5555..',
        '.555555.'
      ]
    },
    center: {
      palette: {
        '1': '#58a838',
        '2': '#7cd458',
        '3': '#ff9b3d',
        '4': '#b84b10',
        '5': '#e87828'
      },
      rows: [
        '....212.',
        '...121..',
        '...354..',
        '..3554..',
        '..3544..',
        '.3544...',
        '.344....',
        '.4......'
      ]
    },
    right: {
      palette: {
        '1': '#e85a90',
        '2': '#ff9ec4',
        '3': '#a8325f',
        '4': '#fff0c2',
        '5': '#f0c048'
      },
      rows: [
        '..111...',
        '.12211..',
        '1245113.',
        '1154513.',
        '1115333.',
        '.11333..',
        '..333...',
        '........'
      ]
    }
  };

  function drawPixelGrid(ctx, ox, oy, rows, palette) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      let c = 0;
      while (c < row.length) {
        const ch = row[c];
        if (ch === '.' || !palette[ch]) {
          c++;
          continue;
        }
        let end = c + 1;
        while (end < row.length && row[end] === ch) end++;
        ctx.fillStyle = palette[ch];
        ctx.fillRect(ox + c, oy + r, end - c, 1);
        c = end;
      }
    }
  }

  function resolveMarketStalls(state, opts) {
    if (opts && Array.isArray(opts.placed)) return opts.placed;
    if (Array.isArray(state)) return state;
    const placed = placedThings(state, 'market');
    if (placed && placed.length > 0) return placed;
    const layout = layoutFor('market', state);
    const rawItems = (layout && Array.isArray(layout.items))
      ? layout.items
      : [
          { uid: 'fx:market:stall_left', itemId: 'stall_basic', x: 1, y: 5, w: 2, h: 2 },
          { uid: 'fx:market:stall_center', itemId: 'stall_big', x: 6, y: 5, w: 3, h: 2 },
          { uid: 'fx:market:stall_right', itemId: 'stall_basic', x: 12, y: 5, w: 2, h: 2 }
        ];
    const atlas = getAtlas();
    return rawItems.map(it => {
      if (!it) return null;
      const itemId = it.itemId || it.id;
      const uid = it.uid || it.id || itemId;
      const entry = (atlas && atlas.items) ? atlas.items[itemId] : null;
      const cw = (entry && entry.cells) ? entry.cells[0] : (it.w || (itemId === 'stall_big' ? 3 : 2));
      const ch = (entry && entry.cells) ? entry.cells[1] : (it.h || 2);
      const metrics = resolveSingleFrameMetrics(itemId, entry, it, cw, ch);
      const x = it.isPixel ? it.x : Math.round((it.x || 0) * 16 + (cw * 16) / 2);
      let y = it.isPixel ? it.y : Math.round(((it.y || 0) + ch) * 16);
      if (stallRoleOf({ uid: uid, id: uid })) {
        y = 84;
      }
      return {
        id: uid,
        uid: uid,
        itemId: itemId,
        x: x,
        y: y,
        w: metrics.sw,
        h: metrics.sh,
        sw: metrics.sw,
        sh: metrics.sh,
        anchorX: metrics.anchorX,
        anchorY: metrics.anchorY
      };
    }).filter(Boolean);
  }

  function stallRoleOf(thing) {
    const uid = String((thing && (thing.uid || thing.id)) || '');
    if (/(?:^|:)stall_left$/.test(uid)) return 'left';
    if (/(?:^|:)stall_center$/.test(uid)) return 'center';
    if (/(?:^|:)stall_right$/.test(uid)) return 'right';
    return null;
  }

  function drawMarketSignboards(ctx, state, opts) {
    if (!ctx || typeof ctx.fillRect !== 'function') return [];
    const list = resolveMarketStalls(state, opts);
    const drawn = [];
    if (typeof ctx.save === 'function') ctx.save();
    if ('imageSmoothingEnabled' in ctx) ctx.imageSmoothingEnabled = false;

    for (const stall of list) {
      const role = stallRoleOf(stall);
      if (!role || !SIGNBOARD_EMBLEMS[role]) continue;
      const sw = (Number.isFinite(stall.sw) && stall.sw > 0) ? stall.sw : (stall.w || 32);
      const sh = (Number.isFinite(stall.sh) && stall.sh > 0) ? stall.sh : (stall.h || 32);
      const ax = Number.isFinite(stall.anchorX) ? stall.anchorX : Math.round(sw / 2);
      const ay = Number.isFinite(stall.anchorY) ? stall.anchorY : sh;
      const left = Math.round((stall.x || 0) - ax);
      const right = left + sw;
      const top = Math.round((stall.y || 0) - ay);

      const sx = Math.round((left + right) / 2) - 7;
      const sy = Math.round((stall.y || 84) - 16);

      ctx.fillStyle = 'rgba(30, 16, 8, 0.35)';
      ctx.fillRect(sx, sy + 12, 14, 1);

      ctx.fillStyle = '#3d2210';
      ctx.fillRect(sx, sy, 14, 12);

      ctx.fillStyle = '#9c6b3f';
      ctx.fillRect(sx + 1, sy + 1, 12, 10);

      ctx.fillStyle = '#b98756';
      ctx.fillRect(sx + 1, sy + 1, 12, 1);

      ctx.fillStyle = '#744a28';
      ctx.fillRect(sx + 1, sy + 10, 12, 1);

      ctx.fillStyle = '#f3e1b6';
      ctx.fillRect(sx + 2, sy + 2, 10, 8);

      ctx.fillStyle = '#3b2416';
      ctx.fillRect(sx + 2, sy + 2, 1, 1);
      ctx.fillRect(sx + 11, sy + 2, 1, 1);

      const active = opts && (
        opts.activeStall === role ||
        opts.hoverStall === role ||
        opts.activeId === stall.uid ||
        opts.hoverId === stall.uid ||
        opts.activeId === 'stall:' + role ||
        opts.hoverId === 'stall:' + role
      );
      if (active) {
        ctx.fillStyle = '#ffe89a';
        ctx.fillRect(sx, sy, 14, 1);
        ctx.fillRect(sx, sy + 11, 14, 1);
        ctx.fillRect(sx, sy, 1, 12);
        ctx.fillRect(sx + 13, sy, 1, 12);
      }

      const emblem = SIGNBOARD_EMBLEMS[role];
      drawPixelGrid(ctx, sx + 3, sy + 2, emblem.rows, emblem.palette);
      drawn.push({ id: stall.uid || stall.id, role: role, sx: sx, sy: sy, sw: 14, sh: 12 });
    }

    if (typeof ctx.restore === 'function') ctx.restore();
    return drawn;
  }

  const CuyScenes = {
    load: load,
    loadAtlas: loadAtlas,
    loadTiles: loadTiles,
    loadHotspots: loadHotspots,
    loadLights: loadLights,
    order: order,
    neighbor: neighbor,
    def: def,
    layoutFor: layoutFor,
    timeOfDay: timeOfDay,
    pigScene: pigScene,
    placedThings: placedThings,
    hotspotsFor: hotspotsFor,
    drawMarketSignboards: drawMarketSignboards,
    debugInstances: debugInstances,
    setBgClean: setBgClean,
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
