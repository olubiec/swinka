(function () {
  'use strict';

  if (window.CuyPlaces) return;

  const DEFAULT_PLACES = ['house', 'garden', 'park', 'farm', 'market'];
  let currentSceneId = null;
  let previousPigLocations = null;
  let exitDisabledUntil = 0;
  let draggedPigId = null;
  let lastState = null;
  let apiRef = null;

  // Scene light and ambient state
  let lightsData = null;
  let lightsLoaded = false;
  let lightsLoading = false;
  const sceneLampToggles = {};
  let dustImageCache = null;

  function getLightsNow() {
    if (typeof window !== 'undefined' && window.__cuyNow != null) {
      const n = window.__cuyNow;
      if (typeof n === 'number' || typeof n === 'string' || n instanceof Date) return n;
    }
    return new Date();
  }

  function getPlaceKind(sceneId) {
    if (['garden', 'park', 'farm', 'market'].includes(sceneId)) {
      return 'outdoor';
    }
    return 'indoor';
  }

  function getDustImage(file) {
    if (!file) return null;
    if (dustImageCache) return dustImageCache;
    const isWebView = !!(typeof window !== 'undefined' && window.chrome && window.chrome.webview);
    const prefix = file.startsWith('world/') ? '' : 'world/';
    const url = isWebView ? ('https://cuy.assets/' + prefix + file) : ('../../assets/' + prefix + file);
    const img = new Image();
    img.src = url;
    dustImageCache = img;
    return dustImageCache;
  }

  function ensureLights(onReady) {
    if (!window.Lights && typeof document !== 'undefined' && !document.querySelector('script[data-cuy-lights]')) {
      const s = document.createElement('script');
      s.src = 'lib/lights.js';
      s.dataset.cuyLights = '1';
      s.onload = () => { if (onReady) onReady(); };
      s.onerror = () => { /* missing lib is safe */ };
      document.head.appendChild(s);
    }
    if (lightsLoaded) {
      if (onReady) onReady();
      return;
    }
    if (lightsLoading) return;
    lightsLoading = true;
    const isWebView = !!(typeof window !== 'undefined' && window.chrome && window.chrome.webview);
    const url = isWebView ? 'https://cuy.assets/data/lights.json' : '../../assets/data/lights.json';
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        lightsData = j;
        lightsLoaded = true;
        lightsLoading = false;
        if (onReady) onReady();
      })
      .catch(() => {
        lightsData = null;
        lightsLoaded = true;
        lightsLoading = false;
        if (onReady) onReady();
      });
  }

  let weatherData = null;
  let weatherLoaded = false;
  let weatherLoading = false;
  let hotspotsData = null;
  let hotspotsLoaded = false;
  let hotspotsLoading = false;
  let lampHotspotSubscribed = false;

  function ensureWeather(onReady) {
    if (!window.CuyWeather && typeof document !== 'undefined' && !document.querySelector('script[data-cuy-weather]')) {
      const s = document.createElement('script');
      s.src = 'lib/weather.js';
      s.dataset.cuyWeather = '1';
      s.onload = () => { if (onReady) onReady(); };
      s.onerror = () => { /* missing lib is safe */ };
      document.head.appendChild(s);
    }
    if (weatherLoaded) {
      if (onReady) onReady();
      return;
    }
    if (weatherLoading) return;
    weatherLoading = true;
    const isWebView = !!(typeof window !== 'undefined' && window.chrome && window.chrome.webview);
    const url = isWebView ? 'https://cuy.assets/data/weather.json' : '../../assets/data/weather.json';
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        weatherData = j;
        weatherLoaded = true;
        weatherLoading = false;
        if (onReady) onReady();
      })
      .catch(() => {
        weatherData = null;
        weatherLoaded = true;
        weatherLoading = false;
        if (onReady) onReady();
      });
  }

  function ensureHotspots(onReady) {
    if (hotspotsLoaded) {
      if (onReady) onReady();
      return;
    }
    if (hotspotsLoading) return;
    hotspotsLoading = true;
    const isWebView = !!(typeof window !== 'undefined' && window.chrome && window.chrome.webview);
    const url = isWebView ? 'https://cuy.assets/data/scene_hotspots.json' : '../../assets/data/scene_hotspots.json';
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        hotspotsData = j;
        hotspotsLoaded = true;
        hotspotsLoading = false;
        if (onReady) onReady();
      })
      .catch(() => {
        hotspotsData = null;
        hotspotsLoaded = true;
        hotspotsLoading = false;
        if (onReady) onReady();
      });
  }

  function ensureLampHotspotSubscription() {
    if (lampHotspotSubscribed) return;
    if (window.CanvasPig && typeof window.CanvasPig.onHotspot === 'function') {
      lampHotspotSubscribed = true;
      window.CanvasPig.onHotspot((hs) => {
        if (hs && hs.kind === 'lamp') {
          toggleLamp(hs.uid || hs.id);
        }
      });
    }
  }

  // Pre-load lights lazily
  ensureLights();

  const CuyLight = {
    build(sceneId, placed, toggles) {
      const sId = sceneId || currentSceneId || 'salon';
      if (!window.Lights || typeof window.Lights.periodOf !== 'function' || typeof window.Lights.ambientFor !== 'function' || typeof window.Lights.activeSources !== 'function' || !lightsData) return null;
      const period = window.Lights.periodOf(getLightsNow());
      const kind = getPlaceKind(sId);
      const amb = window.Lights.ambientFor(lightsData, period);

      let items = placed;
      if (!items) {
        const st = getState();
        items = (window.CuyScenes && typeof window.CuyScenes.placedThings === 'function')
          ? window.CuyScenes.placedThings(st, sId)
          : [];
        if ((!items || items.length === 0) && st) {
          let layout = null;
          if (st.rooms && st.rooms.layouts) layout = st.rooms.layouts[sId];
          if (!layout && st[sId] && st[sId].layout) layout = st[sId].layout;
          if (!layout && st.places && st.places.layouts) layout = st.places.layouts[sId];
          if (layout && Array.isArray(layout.items)) items = layout.items;
        }
      }

      const activeToggles = toggles || (sceneLampToggles && sceneLampToggles[sId]) || {};
      const sourcesMap = lightsData.sources || {};
      const placedForLights = [];

      (items || []).forEach(it => {
        if (!it) return;
        const itemId = it.itemId || it.id;
        const key = Object.keys(sourcesMap).find(k => k === itemId || sourcesMap[k].item === itemId);
        if (!key) return;
        const srcDef = sourcesMap[key];
        const uid = it.uid || it.id || key;

        let gx, gy;
        const cell = 16;
        if (it.x != null && it.y != null) {
          if (it.isPixel || it.x > 15 || it.y > 8) {
            const ax = it.anchorX != null ? it.anchorX : 8;
            const ay = it.anchorY != null ? it.anchorY : 16;
            if (srcDef.glow && Array.isArray(srcDef.glow)) {
              gx = it.x - ax + srcDef.glow[0];
              gy = it.y - ay + srcDef.glow[1];
            } else {
              gx = it.x;
              gy = it.y - ay / 2;
            }
          } else {
            if (srcDef.glow && Array.isArray(srcDef.glow)) {
              gx = it.x * cell + srcDef.glow[0];
              gy = it.y * cell + srcDef.glow[1];
            } else {
              gx = Math.round((it.x + 0.5) * cell);
              gy = Math.round((it.y + 0.5) * cell);
            }
          }
        } else {
          return;
        }

        placedForLights.push({
          id: uid,
          uid: uid,
          itemId: key,
          x: gx,
          y: gy,
          rawItem: it
        });
      });

      const active = window.Lights.activeSources(lightsData, kind, placedForLights, period, activeToggles);

      if (!amb) return null;
      return {
        ambient: amb,
        sources: active || [],
        dust: lightsData.dust || null,
        period: period,
        kind: kind
      };
    }
  };
  window.CuyLight = CuyLight;

  // Extend CanvasPig and PigCanvas to support lightScene and lamp glow
  if (typeof window !== 'undefined') {
    if (window.CanvasPig) {
      window.CanvasPig.setLightScene = function(scene) {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
        if (inst && typeof inst.setLightScene === 'function') {
          inst.setLightScene(scene);
          if (typeof inst.render === 'function') {
            try { inst.render(); } catch (e) {}
          }
        }
      };

      const origCpDebug = window.CanvasPig.debug;
      window.CanvasPig.debug = function() {
        const res = origCpDebug ? origCpDebug.apply(this, arguments) : {};
        if (res) {
          const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
          if (inst && res.lightScene === undefined) {
            res.lightScene = inst.lightScene || null;
          }
        }
        return res;
      };
    }

    if (window.PigCanvas && window.PigCanvas.prototype) {
      const origDebug = window.PigCanvas.prototype.debug;
      window.PigCanvas.prototype.debug = function() {
        const res = origDebug ? origDebug.apply(this, arguments) : {};
        if (res && res.lightScene === undefined) {
          res.lightScene = this.lightScene || null;
        }
        return res;
      };

      const origSetLightScene = window.PigCanvas.prototype.setLightScene;
      window.PigCanvas.prototype.setLightScene = function(scene) {
        if (scene && (!scene.sources || scene.sources.length === 0) && window.CuyPlaces && window.CuyLight) {
          const curScene = window.CuyPlaces.getCurrentPlace();
          const built = window.CuyLight.build(curScene);
          if (built && built.sources && built.sources.length > 0) {
            scene = built;
          }
        }
        if (origSetLightScene) {
          origSetLightScene.call(this, scene);
        } else {
          this.lightScene = scene || null;
        }
        if (typeof this.render === 'function') {
          try { this.render(); } catch (e) {}
        }
      };

      const origGlow = window.PigCanvas.prototype.applySceneGlow;
      window.PigCanvas.prototype.applySceneGlow = function(ctx, scene) {
        if (origGlow) origGlow.call(this, ctx, scene);
        if (!scene) return;

        // Lamp glow
        const sources = scene.sources || [];
        const now = Date.now();
        const lit = [];

        sources.forEach((src, idx) => {
          if (!src || !src.on) return;
          const cx = src.x;
          const cy = src.y;
          const r = src.radius || (src.radiusCells ? src.radiusCells * 16 : 40);
          lit.push({ cx, cy });

          let strength = src.strength != null ? src.strength : (src.intensity != null ? src.intensity : 0.8);
          if (src.flicker) {
            strength *= (0.85 + 0.15 * Math.sin(now / 160 + idx));
          }
          let col = src.color || [1, 0.85, 0.6];
          if (col === 'ambient') {
            const amb = scene.ambient || {};
            col = amb.color || [1, 0.95, 0.85];
          }
          const rgb = Array.isArray(col) && col[0] <= 1 && col[1] <= 1 && col[2] <= 1
            ? [Math.round(col[0] * 255), Math.round(col[1] * 255), Math.round(col[2] * 255)]
            : (Array.isArray(col) ? col : [255, 220, 160]);

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const glowAlpha = Math.min(0.32, (strength || 0.8) * 0.32);
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${glowAlpha})`);
          g.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
          ctx.restore();
        });

        // Dust motes around lit lamps
        if (scene.dust && lit.length && typeof document !== 'undefined') {
          const dust = scene.dust;
          const dustImg = getDustImage(dust.file);
          if (dustImg && dustImg.complete && dustImg.naturalWidth > 0) {
            const frames = dust.frames || 1;
            const fw = Math.floor(dustImg.naturalWidth / frames);
            const fh = dustImg.naturalHeight;
            if (fw > 0) {
              const frameIdx = Math.floor((now / 1000) * (dust.fps || 1)) % frames;
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = 0.28;
              lit.forEach(pt => {
                ctx.drawImage(dustImg, frameIdx * fw, 0, fw, fh, pt.cx - fw / 2, pt.cy - fh / 2, fw, fh);
              });
              ctx.restore();
            }
          }
        }
      };
    }
  }

  function getState() {
    return (window.CuyHome && window.CuyHome.api && window.CuyHome.api.getState()) ||
      (window.bridge && window.bridge.getState && window.bridge.getState()) || lastState || null;
  }

  function sendBridgeMessage(msg) {
    if (apiRef && typeof apiRef.send === 'function') {
      apiRef.send(msg);
    } else if (window.bridge && typeof window.bridge.send === 'function') {
      window.bridge.send(msg);
    }
  }

  function getFirstPigId(st) {
    if (!st) return 'pig_1';
    if (Array.isArray(st.activePigIds) && st.activePigIds[0]) return st.activePigIds[0];
    if (st.places && st.places.pigLocations) {
      if (Array.isArray(st.places.pigLocations) && st.places.pigLocations[0]) {
        const id = st.places.pigLocations[0].pigId || st.places.pigLocations[0].PigId;
        if (id) return id;
      } else if (!Array.isArray(st.places.pigLocations) && typeof st.places.pigLocations === 'object') {
        const keys = Object.keys(st.places.pigLocations);
        if (keys.length > 0) return keys[0];
      }
    }
    if (Array.isArray(st.pigLocations) && st.pigLocations[0]) {
      const id = st.pigLocations[0].pigId || st.pigLocations[0].PigId;
      if (id) return id;
    }
    if (Array.isArray(st.pigs) && st.pigs[0] && (st.pigs[0].id || st.pigs[0].pigId)) {
      return st.pigs[0].id || st.pigs[0].pigId;
    }
    if (Array.isArray(st.roster) && st.roster[0] && (st.roster[0].id || st.roster[0].pigId)) {
      return st.roster[0].id || st.roster[0].pigId;
    }
    if (st.pig && (st.pig.id || st.pig.pigId)) {
      return st.pig.id || st.pig.pigId;
    }
    return st.id || st.pigId || 'starter';
  }

  function getPigLocations(st) {
    if (!st) st = getState();
    if (!st) return [];
    if (st.places && Array.isArray(st.places.pigLocations)) {
      return st.places.pigLocations;
    }
    if (st.places && st.places.pigLocations && typeof st.places.pigLocations === 'object') {
      return Object.keys(st.places.pigLocations).map(k => {
        const v = st.places.pigLocations[k];
        return (v && typeof v === 'object') ? v : { pigId: k, scene: v, pinned: false };
      });
    }
    if (Array.isArray(st.pigLocations)) {
      return st.pigLocations;
    }
    return [];
  }

  function applyOptimisticSceneToState(st, pigId, sceneId) {
    if (!st || !sceneId) return;
    const resolvedPigId = pigId || getFirstPigId(st);
    if (!st.places) st.places = {};
    if (Array.isArray(st.places.pigLocations)) {
      let loc = st.places.pigLocations.find(p => p && (p.pigId === resolvedPigId || p.PigId === resolvedPigId));
      if (!loc && st.places.pigLocations.length === 1) {
        loc = st.places.pigLocations[0];
      }
      if (loc) {
        loc.scene = sceneId;
        if (loc.sceneId !== undefined) loc.sceneId = sceneId;
        if (loc.Scene !== undefined) loc.Scene = sceneId;
        if (loc.SceneId !== undefined) loc.SceneId = sceneId;
      } else {
        st.places.pigLocations.push({ pigId: resolvedPigId, scene: sceneId, pinned: false });
      }
    } else if (st.places.pigLocations && typeof st.places.pigLocations === 'object') {
      if (!(resolvedPigId in st.places.pigLocations)) {
        const keys = Object.keys(st.places.pigLocations);
        if (keys.length === 1) {
          st.places.pigLocations[keys[0]] = sceneId;
        }
      }
      st.places.pigLocations[resolvedPigId] = sceneId;
    } else {
      st.places.pigLocations = [{ pigId: resolvedPigId, scene: sceneId, pinned: false }];
    }

    if (Array.isArray(st.pigLocations)) {
      let locRoot = st.pigLocations.find(p => p && (p.pigId === resolvedPigId || p.PigId === resolvedPigId));
      if (!locRoot && st.pigLocations.length === 1) {
        locRoot = st.pigLocations[0];
      }
      if (locRoot) {
        locRoot.scene = sceneId;
        if (locRoot.sceneId !== undefined) locRoot.sceneId = sceneId;
        if (locRoot.Scene !== undefined) locRoot.Scene = sceneId;
        if (locRoot.SceneId !== undefined) locRoot.SceneId = sceneId;
      }
    }
  }

  function optimisticallySetPigScene(pigId, sceneId) {
    if (!sceneId) return;
    const st = getState();
    if (st) applyOptimisticSceneToState(st, pigId, sceneId);
    if (lastState && lastState !== st) applyOptimisticSceneToState(lastState, pigId, sceneId);
    if (Array.isArray(previousPigLocations)) {
      const resolvedPigId = pigId || getFirstPigId(st || lastState);
      let prev = previousPigLocations.find(p => p && (p.pigId === resolvedPigId || p.PigId === resolvedPigId));
      if (!prev && previousPigLocations.length === 1) {
        prev = previousPigLocations[0];
      }
      if (prev) {
        prev.scene = sceneId;
        if (prev.sceneId !== undefined) prev.sceneId = sceneId;
        if (prev.Scene !== undefined) prev.Scene = sceneId;
        if (prev.SceneId !== undefined) prev.SceneId = sceneId;
      }
    }
  }

  function getPigName(pigId, st) {
    if (!st) st = getState();
    if (st) {
      if (Array.isArray(st.roster)) {
        const found = st.roster.find(p => p && (p.id === pigId || p.pigId === pigId));
        if (found && (found.name || found.petName)) return found.name || found.petName;
      }
      if (Array.isArray(st.rooms && st.rooms.pigRooms)) {
        const pr = st.rooms.pigRooms.find(r => r && (r.pigId === pigId || ('pig:' + r.pigId) === pigId));
        if (pr && (pr.name || pr.displayName)) return pr.name || pr.displayName;
      }
      if (Array.isArray(st.places && st.places.order)) {
        const ordItem = st.places.order.find(s => s && (s.id === ('pig:' + pigId) || s.id === pigId));
        if (ordItem && ordItem.title) {
          const m = ordItem.title.match(/^(.+?)\s+Room$/i);
          if (m) return m[1];
        }
      }
      if (st.name && (!pigId || pigId === 'pig_1' || pigId === st.id)) {
        return st.name;
      }
    }
    if (pigId === 'pig_2') return 'Pop';
    if (pigId === 'pig_3') return 'Pua';
    return 'Cuy';
  }

  function getOrder(st) {
    if (!st) st = getState();
    if (window.CuyScenes && typeof window.CuyScenes.order === 'function') {
      return window.CuyScenes.order(st);
    }
    if (st && st.places && Array.isArray(st.places.order)) {
      return st.places.order;
    }
    return [
      { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
      { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
      { id: 'park', title: 'Park', locked: false, unlockHint: '' },
      { id: 'farm', title: 'Farm', locked: false, unlockHint: '' },
      { id: 'market', title: 'Market', locked: false, unlockHint: '' }
    ];
  }

  function getSceneTitle(sceneId, st) {
    if (!st) st = getState();
    const ord = getOrder(st);
    const item = ord.find(s => s.id === sceneId);
    if (st && st.rooms) {
      if (st.rooms.layouts && st.rooms.layouts[sceneId] && st.rooms.layouts[sceneId].name) {
        return st.rooms.layouts[sceneId].name;
      }
      if (Array.isArray(st.rooms.pigRooms)) {
        const pr = st.rooms.pigRooms.find(r => r && (r.roomId === sceneId || ('pig:' + r.pigId) === sceneId));
        if (pr && (pr.displayName || pr.name)) {
          return pr.displayName || pr.name;
        }
      }
    }
    if (item && item.title) return item.title;
    if (window.CuyScenes && typeof window.CuyScenes.def === 'function') {
      const d = window.CuyScenes.def(sceneId);
      if (d && d.title) return d.title;
    }
    return sceneId ? (sceneId.charAt(0).toUpperCase() + sceneId.slice(1)) : '';
  }

  if (typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.neighbor === 'function') {
    const _origNeighbor = window.CuyScenes.neighbor;
    window.CuyScenes.neighbor = function (id, dir, state) {
      if (dir === 'right') dir = 1;
      else if (dir === 'left') dir = -1;
      return _origNeighbor.call(this, id, dir, state);
    };
  }

  function showToast(text) {
    if (window.bridge && typeof window.bridge.dispatchMessage === 'function') {
      window.bridge.dispatchMessage({ type: 'toast', text: text });
    }
    if (typeof document !== 'undefined') {
      let toastEl = document.getElementById('globalToast');
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'globalToast';
        toastEl.style.position = 'fixed';
        toastEl.style.bottom = '20px';
        toastEl.style.left = '50%';
        toastEl.style.transform = 'translateX(-50%)';
        toastEl.style.zIndex = '10000';
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = text;
      toastEl.style.opacity = '1';
      if (toastEl._timer) clearTimeout(toastEl._timer);
      toastEl._timer = setTimeout(() => { toastEl.style.opacity = '0'; }, 2500);
    }
  }

  function getActivePigIdForScene(sceneId, st) {
    if (!st) st = getState();
    const pigLocs = getPigLocations(st);
    const activePigId = getFirstPigId(st);
    const sId = sceneId || currentSceneId || 'salon';
    const pigInScene = pigLocs.find(p => (p.scene || p.sceneId || p.Scene || p.SceneId || 'salon') === sId);
    const pigEntry = pigInScene || pigLocs.find(p => (p.pigId || p.PigId) === activePigId) || pigLocs[0];
    return (pigEntry && (pigEntry.pigId || pigEntry.PigId)) || activePigId;
  }

  function computeNeighbourScene(currentScene, direction, st) {
    const ord = getOrder(st);
    if (!ord || ord.length === 0) return null;

    const idx = ord.findIndex(s => s.id === currentScene);
    if (idx !== -1) {
      const step = direction === 'left' ? -1 : 1;
      const targetIdx = (idx + step + ord.length) % ord.length;
      return ord[targetIdx];
    }

    if (direction === 'left') {
      return ord.find(s => s.id === 'market') || ord[ord.length - 1];
    } else {
      return ord.find(s => s.id === 'garden') || ord[0];
    }
  }

  function updatePresenceChips(st) {
    if (!st) st = getState();
    const stage = document.querySelector('.stage-viewport');
    let container = document.getElementById('placesPresenceChips');
    if (!container && stage) {
      container = document.createElement('div');
      container.id = 'placesPresenceChips';
      container.className = 'places-presence-chips';
      stage.appendChild(container);
    } else if (container && stage && container.parentNode !== stage) {
      stage.appendChild(container);
    }
    if (!container) return;

    const pigLocs = getPigLocations(st);
    if (pigLocs.length === 0) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }

    // Filter pigs that are NOT in the current scene
    const elsewherePigs = pigLocs.filter(p => {
      const sc = p.scene || p.sceneId || p.Scene || p.SceneId || 'salon';
      return sc !== currentSceneId;
    });

    if (elsewherePigs.length === 0) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }

    container.innerHTML = '';
    container.hidden = false;

    const multiplePigs = (pigLocs.length >= 2);

    elsewherePigs.forEach(p => {
      const pigId = p.pigId || p.PigId || 'pig_1';
      const sceneId = p.scene || p.sceneId || p.Scene || p.SceneId || 'salon';
      const sceneTitle = getSceneTitle(sceneId, st);
      const pigName = getPigName(pigId, st);

      const chip = document.createElement('div');
      chip.className = 'places-presence-chip';

      const label = document.createElement('span');
      label.className = 'chip-text';
      if (multiplePigs) {
        label.textContent = pigName + ' is in ' + sceneTitle;
      } else {
        label.textContent = 'Cuy is in ' + sceneTitle;
      }
      chip.appendChild(label);

      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'chip-go-btn ui-btn';
      goBtn.textContent = 'Go there';
      goBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyScene(sceneId, getState());
      });
      chip.appendChild(goBtn);

      container.appendChild(chip);
    });
  }

  function handlePigExit(ev) {
    const st = getState();
    const pigLocs = getPigLocations(st);
    const activePigId = getFirstPigId(st);

    const pigInScene = pigLocs.find(p => (p.scene || p.sceneId || p.Scene || p.SceneId || 'salon') === currentSceneId);
    const pigEntry = pigInScene || pigLocs.find(p => (p.pigId || p.PigId) === activePigId) || pigLocs[0];
    if (pigEntry && pigEntry.pinned) {
      return;
    }

    const direction = (ev && ev.to === 'left') ? 'left' : 'right';
    const targetScene = computeNeighbourScene(currentSceneId, direction, st);

    if (!targetScene || targetScene.locked) {
      exitDisabledUntil = Date.now() + 60000;
      if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
        window.CanvasPig.setPigVisible(true);
      }
      if (window.CanvasPig && typeof window.CanvasPig.setExitsEnabled === 'function') {
        window.CanvasPig.setExitsEnabled(false);
      }
      return;
    }

    const pigId = (pigEntry && (pigEntry.pigId || pigEntry.PigId)) || activePigId;
    if (window.bridge && typeof window.bridge.send === 'function') {
      window.bridge.send({
        type: 'places.pigMove',
        pigId: pigId,
        to: targetScene.id
      });
    }
  }

  function bindCanvasExits() {
    if (window.CanvasPig) {
      window.CanvasPig.onPigExit = handlePigExit;
    }
    const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
    if (inst) {
      inst.onPigExit = handlePigExit;
    }
    if (typeof window !== 'undefined') {
      window.onPigExit = handlePigExit;
    }
  }

  function handleEdgeHold(ev) {
    const side = (ev && ev.side) || 'right';
    const current = currentSceneId || 'salon';
    const st = getState();

    let neighbourId = null;
    if (window.CuyScenes && typeof window.CuyScenes.neighbor === 'function') {
      neighbourId = window.CuyScenes.neighbor(current, side, st);
    } else {
      const ord = getOrder(st);
      const idx = ord ? ord.findIndex(s => s.id === current) : -1;
      if (idx !== -1) {
        const step = (side === 'left' || side === -1) ? -1 : 1;
        neighbourId = ord[(idx + step + ord.length) % ord.length].id;
      }
    }

    const ord = getOrder(st);
    const neighbourItem = ord ? ord.find(s => s.id === neighbourId) : null;
    const isLocked = !neighbourItem || !!neighbourItem.locked;
    const isNone = !neighbourId || neighbourId === current;

    if (isLocked || isNone) {
      const hint = (neighbourItem && neighbourItem.unlockHint) ? neighbourItem.unlockHint : 'Locked';
      showToast('Locked: ' + hint);
      return;
    }

    if (!draggedPigId) {
      draggedPigId = getActivePigIdForScene(current, st);
    }
    const pigId = draggedPigId || getFirstPigId(st);
    optimisticallySetPigScene(pigId, neighbourId);

    applyScene(neighbourId, st);

    sendBridgeMessage({
      type: 'places.pigMove',
      pigId: pigId,
      to: neighbourId
    });

    const tod = (window.CuyScenes && typeof window.CuyScenes.timeOfDay === 'function')
      ? window.CuyScenes.timeOfDay()
      : 'day';
    const def = (window.CuyScenes && typeof window.CuyScenes.def === 'function')
      ? window.CuyScenes.def(neighbourId, tod, st)
      : { id: neighbourId, size: [240, 130], walk: [10, 80, 230, 126] };

    if (window.CanvasPig && typeof window.CanvasPig.continueDrag === 'function') {
      window.CanvasPig.continueDrag(def);
    }
  }

  function handleCanvasDrop(ev) {
    const st = getState();
    const pigId = draggedPigId || getActivePigIdForScene(currentSceneId, st) || getFirstPigId(st);
    if (pigId && currentSceneId) {
      optimisticallySetPigScene(pigId, currentSceneId);
    }
    draggedPigId = null;

    if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
      window.CanvasPig.setPigVisible(true);
    }

    if (pigId && currentSceneId) {
      sendBridgeMessage({
        type: 'places.pigMove',
        pigId: pigId,
        to: currentSceneId
      });
    }
  }

  function bindCanvasDragSwitch() {
    if (window.CanvasPig) {
      window.CanvasPig.onEdgeHold = handleEdgeHold;
      window.CanvasPig.onDrop = handleCanvasDrop;
    }
    const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    if (inst) {
      inst.onEdgeHold = handleEdgeHold;
      inst.onDrop = handleCanvasDrop;
    }
    if (typeof window !== 'undefined') {
      window.onEdgeHold = handleEdgeHold;
      window.onDrop = handleCanvasDrop;
    }
  }

  function checkArrivals(st) {
    if (!st) st = getState();
    const currentLocs = getPigLocations(st);

    if (!previousPigLocations) {
      previousPigLocations = JSON.parse(JSON.stringify(currentLocs));
      return;
    }

    const ord = getOrder(st);

    for (const cur of currentLocs) {
      const pigId = cur.pigId || cur.PigId;
      const prev = previousPigLocations.find(p => (p.pigId || p.PigId) === pigId);
      const curScene = cur.scene || cur.sceneId || cur.Scene || cur.SceneId;
      const prevScene = prev ? (prev.scene || prev.sceneId || prev.Scene || prev.SceneId) : null;

      if (prevScene && curScene !== prevScene && curScene === currentSceneId) {
        // Pig arrived at currently viewed scene!
        let enterSide = 'left';
        if (ord && ord.length > 0) {
          const idxCur = ord.findIndex(s => s.id === curScene);
          const idxPrev = ord.findIndex(s => s.id === prevScene);
          if (idxCur !== -1 && idxPrev !== -1) {
            const rightNeighbour = (idxCur + 1) % ord.length;
            if (idxPrev === rightNeighbour) {
              enterSide = 'right';
            } else {
              enterSide = 'left';
            }
          }
        }

        if (window.CanvasPig && typeof window.CanvasPig.enterFrom === 'function') {
          window.CanvasPig.enterFrom(enterSide);
        }
      }
    }

    previousPigLocations = JSON.parse(JSON.stringify(currentLocs));
  }

  function applyScene(sceneId, st) {
    if (!st) st = getState();
    if (!sceneId) sceneId = currentSceneId;
    if (!sceneId) {
      const firstPig = getFirstPigId(st);
      sceneId = (window.CuyScenes && typeof window.CuyScenes.pigScene === 'function')
        ? window.CuyScenes.pigScene(st, firstPig)
        : 'salon';
    }
    currentSceneId = sceneId;

    const ord = getOrder(st);
    const item = ord.find(s => s.id === currentSceneId) || { id: currentSceneId, title: currentSceneId, locked: false };
    const isLocked = !!item.locked;

    // 1. Update title in the bar
    const titleEl = document.getElementById('placesBarTitle');
    if (titleEl) {
      titleEl.textContent = getSceneTitle(currentSceneId, st);
    }

    // 2. Set CanvasPig scene & things
    const currentInstScene = (window.CuyPig && window.CuyPig.mainInstance && window.CuyPig.mainInstance.sceneId) || null;
    const tod = (window.CuyScenes && typeof window.CuyScenes.timeOfDay === 'function')
      ? window.CuyScenes.timeOfDay()
      : 'day';
    const sceneDef = (window.CuyScenes && typeof window.CuyScenes.def === 'function')
      ? window.CuyScenes.def(currentSceneId, tod, st)
      : { id: currentSceneId, size: [240, 130], walk: [10, 80, 230, 125] };

    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance) || (window.CuyPig && window.CuyPig.mainInstance);
    const sizeChanged = inst && sceneDef.size && (inst.sceneWidth !== sceneDef.size[0] || inst.sceneHeight !== sceneDef.size[1]);

    if (currentInstScene !== currentSceneId || sizeChanged) {
      if (window.CanvasPig && typeof window.CanvasPig.setScene === 'function') {
        window.CanvasPig.setScene(sceneDef);
      }
    }

    const things = (window.CuyScenes && typeof window.CuyScenes.placedThings === 'function')
      ? window.CuyScenes.placedThings(st, currentSceneId)
      : [];
    if (window.CanvasPig && typeof window.CanvasPig.setThings === 'function') {
      window.CanvasPig.setThings(things, true);
    }

    // Light scene
    const sceneLight = CuyLight.build(currentSceneId);
    if (window.CanvasPig && typeof window.CanvasPig.setLightScene === 'function') {
      window.CanvasPig.setLightScene(sceneLight);
    }
    if (!lightsLoaded) {
      ensureLights(() => {
        const sl = CuyLight.build(currentSceneId);
        if (window.CanvasPig && typeof window.CanvasPig.setLightScene === 'function') {
          window.CanvasPig.setLightScene(sl);
        }
      });
    }

    ensureLampHotspotSubscription();

    // Hotspots per scene
    const syncHotspots = () => {
      if (window.CuyHotspots && typeof window.CuyHotspots.fromScene === 'function' &&
          window.CanvasPig && typeof window.CanvasPig.setHotspots === 'function') {
        const hsList = isLocked
          ? (window.CuyHotspots.EMPTY || [])
          : window.CuyHotspots.fromScene(currentSceneId, hotspotsData, things, null);
        window.CanvasPig.setHotspots(hsList);
      }
    };
    syncHotspots();
    if (!hotspotsLoaded && window.CuyHotspots && typeof window.CuyHotspots.fromScene === 'function') {
      ensureHotspots(syncHotspots);
    }

    // Weather layer (outdoor only, unlocked only)
    const syncWeatherLayer = () => {
      if (!window.CuyRoom) return;
      if (getPlaceKind(currentSceneId) === 'outdoor' && !isLocked &&
          window.CuyWeather && typeof window.CuyWeather.stateFor === 'function' && typeof window.CuyWeather.draw === 'function') {
        const weatherState = window.CuyWeather.stateFor(getLightsNow(), 'outdoor', st && st.settings, weatherData);
        if (typeof window.CuyRoom.addLayer === 'function') {
          window.CuyRoom.addLayer('weather', 15, (ctx, scene) => {
            if (!window.CuyWeather || typeof window.CuyWeather.draw !== 'function') return;
            const w = (scene && scene.width) || 256;
            const h = (scene && scene.height) || 144;
            const t = (scene && scene.time != null) ? scene.time : 0;
            window.CuyWeather.draw(ctx, weatherState, t, w, h);
          });
        }
      } else if (typeof window.CuyRoom.removeLayer === 'function') {
        window.CuyRoom.removeLayer('weather');
      }
    };
    syncWeatherLayer();
    if (getPlaceKind(currentSceneId) === 'outdoor' && !isLocked && !weatherLoaded) {
      ensureWeather(syncWeatherLayer);
    }

    // 3. Pig visibility and exits
    const pigLocs = getPigLocations(st);
    const pigInThisScene = pigLocs.find(p => (p.scene || p.sceneId || p.Scene || p.SceneId || 'salon') === currentSceneId);
    const firstPig = getFirstPigId(st);
    const firstPigLoc = pigLocs.find(p => (p.pigId || p.PigId) === firstPig) || pigLocs[0];
    const isPigPinned = pigInThisScene ? !!pigInThisScene.pinned : (firstPigLoc ? !!firstPigLoc.pinned : false);

    const isAnyPigHere = pigLocs.length > 0
      ? pigLocs.some(p => (p.scene || p.sceneId || p.Scene || p.SceneId || 'salon') === currentSceneId)
      : (currentSceneId === 'salon');

    const roster = Array.isArray(st && st.roster) ? st.roster : [];
    const presentList = pigLocs
      .filter(p => p && (p.scene || p.sceneId || p.Scene || p.SceneId || 'salon') === currentSceneId)
      .map(loc => {
        const pigId = loc.pigId || loc.PigId || loc.id;
        const rosterPig = roster.find(r => r && (r.id === pigId || r.pigId === pigId));
        return {
          id: pigId,
          look: (rosterPig && rosterPig.look) || rosterPig || null,
          pinned: !!loc.pinned,
          stage: (rosterPig && rosterPig.stage) || (st && st.stageKey) || 'adult'
        };
      });

    bindCanvasExits();
    bindCanvasDragSwitch();

    let hasLeftNeighbour = false;
    let hasRightNeighbour = false;
    if (ord && ord.length > 1) {
      hasLeftNeighbour = true;
      hasRightNeighbour = true;
    }
    if (window.CanvasPig && typeof window.CanvasPig.setEdgeNeighbours === 'function') {
      window.CanvasPig.setEdgeNeighbours({
        left: hasLeftNeighbour,
        right: hasRightNeighbour
      });
    }

    const isPigBeingDragged = (inst && !!inst.drag) || (draggedPigId !== null);

    if (window.CanvasPig && typeof window.CanvasPig.setExitsEnabled === 'function') {
      const now = Date.now();
      const exitsAllowed = isAnyPigHere && !isPigPinned && (now >= exitDisabledUntil) && !isPigBeingDragged;
      window.CanvasPig.setExitsEnabled(exitsAllowed);
    }

    // 4. Locked overlay and hint
    const hintBar = document.getElementById('placesLockedHint');
    const hintText = document.getElementById('placesHintText');

    if (isLocked) {
      if (hintBar) hintBar.hidden = false;
      if (hintText) hintText.textContent = item.unlockHint || 'Locked';

      if (window.CanvasPig && typeof window.CanvasPig.setPresentPigs === 'function') {
        window.CanvasPig.setPresentPigs([]);
      } else if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
        window.CanvasPig.setPigVisible(false);
      }

      if (window.CuyRoom && typeof window.CuyRoom.addLayer === 'function') {
        window.CuyRoom.addLayer('p36_locked_overlay', 25, (ctx) => {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = 'rgb(87, 98, 150)';
          ctx.fillRect(0, 0, 240, 130);
          ctx.restore();
        });
      }
    } else {
      if (hintBar) hintBar.hidden = true;
      if (hintText) hintText.textContent = '';

      if (window.CuyRoom && typeof window.CuyRoom.removeLayer === 'function') {
        window.CuyRoom.removeLayer('p36_locked_overlay');
      }

      if (window.CanvasPig && typeof window.CanvasPig.setPresentPigs === 'function') {
        window.CanvasPig.setPresentPigs(presentList);
      } else if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
        window.CanvasPig.setPigVisible(isAnyPigHere || isPigBeingDragged);
      }
    }

    if (!isPigBeingDragged) {
      draggedPigId = null;
    }

    bindEditButton();
    syncEditButton(isPigBeingDragged);

    // 5. Update presence chips
    updatePresenceChips(st);
  }

  function next() {
    const st = getState();
    if (!currentSceneId) {
      const firstPig = getFirstPigId(st);
      currentSceneId = (window.CuyScenes && typeof window.CuyScenes.pigScene === 'function')
        ? window.CuyScenes.pigScene(st, firstPig)
        : 'salon';
    }
    let nextId;
    if (window.CuyScenes && typeof window.CuyScenes.neighbor === 'function') {
      nextId = window.CuyScenes.neighbor(currentSceneId, 1, st);
    } else {
      const ord = getOrder(st);
      const idx = ord.findIndex(s => s.id === currentSceneId);
      nextId = ord[(idx + 1) % ord.length].id;
    }
    applyScene(nextId, st);
  }

  function prev() {
    const st = getState();
    if (!currentSceneId) {
      const firstPig = getFirstPigId(st);
      currentSceneId = (window.CuyScenes && typeof window.CuyScenes.pigScene === 'function')
        ? window.CuyScenes.pigScene(st, firstPig)
        : 'salon';
    }
    let prevId;
    if (window.CuyScenes && typeof window.CuyScenes.neighbor === 'function') {
      prevId = window.CuyScenes.neighbor(currentSceneId, -1, st);
    } else {
      const ord = getOrder(st);
      const idx = ord.findIndex(s => s.id === currentSceneId);
      prevId = ord[(idx - 1 + ord.length) % ord.length].id;
    }
    applyScene(prevId, st);
  }

  function getPlacesList(st) {
    if (!st) st = getState();
    if (st && st.places && Array.isArray(st.places.places) && st.places.places.length > 0) {
      const fromState = st.places.places.map(p => typeof p === 'string' ? p : p.id);
      const hasDefaults = DEFAULT_PLACES.some(id => fromState.includes(id));
      if (hasDefaults) {
        const ordered = [];
        DEFAULT_PLACES.forEach(id => {
          if (fromState.includes(id)) ordered.push(id);
        });
        fromState.forEach(id => {
          if (!ordered.includes(id)) ordered.push(id);
        });
        return ordered;
      }
      return fromState;
    }
    return DEFAULT_PLACES.slice();
  }

  function getHouseRooms(st) {
    if (!st) st = getState();
    const rooms = ['salon'];
    if (st && st.rooms) {
      if (st.rooms.layouts) {
        Object.keys(st.rooms.layouts).forEach(k => {
          if (k !== 'salon' && k !== 'garden' && k !== 'park' && k !== 'dorm' && !k.startsWith('pig:') && !rooms.includes(k)) {
            rooms.push(k);
          }
        });
      }
      if (Array.isArray(st.rooms.pigRooms)) {
        st.rooms.pigRooms.forEach(r => {
          if (r && r.adopted !== false && r.roomId && !rooms.includes(r.roomId)) {
            rooms.push(r.roomId);
          }
        });
      }
      if (st.rooms.dorm || (st.rooms.layouts && st.rooms.layouts.dorm)) {
        if (!rooms.includes('dorm')) rooms.push('dorm');
      }
    }
    return rooms;
  }

  function isToggleableLightSource(src) {
    if (!src) return false;
    if (src.toggle === false) return false;
    const itemId = String(src.itemId || src.id || '').toLowerCase();
    if (itemId === 'window' || itemId.startsWith('window_')) return false;
    return true;
  }

  function toggleLamp(uid) {
    if (!currentSceneId) currentSceneId = 'salon';
    if (!sceneLampToggles[currentSceneId]) sceneLampToggles[currentSceneId] = {};
    const light = CuyLight.build(currentSceneId);
    const src = light && light.sources && light.sources.find(s => s.id === uid || s.uid === uid || s.itemId === uid);
    if (src && !isToggleableLightSource(src)) return;
    const currentlyOn = src ? src.on : true;
    sceneLampToggles[currentSceneId][uid] = !currentlyOn;
    applyScene(currentSceneId, getState());
  }

  function setLampToggle(uid, on) {
    if (!currentSceneId) currentSceneId = 'salon';
    if (!sceneLampToggles[currentSceneId]) sceneLampToggles[currentSceneId] = {};
    const light = CuyLight.build(currentSceneId);
    const src = light && light.sources && light.sources.find(s => s.id === uid || s.uid === uid || s.itemId === uid);
    if (src && !isToggleableLightSource(src)) return;
    if (!src) {
      const low = String(uid || '').toLowerCase();
      if (low === 'window' || low.startsWith('window_')) return;
    }
    sceneLampToggles[currentSceneId][uid] = !!on;
    applyScene(currentSceneId, getState());
  }

  function syncEditButton(isPigBeingDragged) {
    const btn = document.getElementById('placesEditBtn');
    if (!btn) return;
    const hasEdit = !!(window.CuyEdit && typeof window.CuyEdit.toggle === 'function');
    const isOpen = !!(window.CuyEdit && typeof window.CuyEdit.isOpen === 'function' && window.CuyEdit.isOpen());
    btn.disabled = !hasEdit || !!isPigBeingDragged;
    btn.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
    btn.classList.toggle('active', isOpen);
  }

  function bindEditButton() {
    const btn = document.getElementById('placesEditBtn');
    if (!btn || btn.dataset.p47cBound) return;
    btn.dataset.p47cBound = '1';
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (window.CuyEdit && typeof window.CuyEdit.toggle === 'function') {
        window.CuyEdit.toggle();
      }
      syncEditButton(false);
    });
    if (typeof MutationObserver !== 'undefined') {
      const obs = new MutationObserver(() => {
        const pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.classList.toggle('active', pressed);
      });
      obs.observe(btn, { attributes: true, attributeFilter: ['aria-pressed'] });
    }
    syncEditButton(false);
  }

  const CuyPlaces = {
    getCurrentPlace() {
      return currentSceneId || 'salon';
    },
    setCurrentPlace(placeId) {
      if (placeId) applyScene(placeId, getState());
    },
    getCurrentHouseRoom() {
      return (currentSceneId && (currentSceneId === 'salon' || currentSceneId === 'dorm' || currentSceneId.startsWith('pig:'))) ? currentSceneId : 'salon';
    },
    setCurrentHouseRoom(roomId) {
      if (roomId) applyScene(roomId, getState());
    },
    getPlacesList,
    getHouseRooms,
    openPlace(placeId, roomArg) {
      const target = (placeId === 'house' ? (roomArg || 'salon') : (placeId || 'salon'));
      applyScene(target, getState());
    },
    next,
    prev,
    renderArrowsHtml(placeId) {
      return '';
    },
    bindArrows(container) {},
    updateStageNav(st) {
      if (st) lastState = st;
      applyScene(currentSceneId, st || getState());
      checkArrivals(st);
    },
    applyScene,
    toggleLamp,
    setLampToggle,
    applyLight(sceneId) {
      const sId = sceneId || currentSceneId || 'salon';
      const sceneLight = CuyLight.build(sId);
      if (window.CanvasPig && typeof window.CanvasPig.setLightScene === 'function') {
        window.CanvasPig.setLightScene(sceneLight);
      }
    }
  };

  window.CuyPlaces = CuyPlaces;

  if (typeof window !== 'undefined') {
    bindCanvasExits();
    bindCanvasDragSwitch();
    bindEditButton();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        bindCanvasExits();
        bindCanvasDragSwitch();
        bindEditButton();
      });
    }

    if (window.bridge && typeof window.bridge.onAction === 'function') {
      window.bridge.onAction(action => {
        if (action && (action.type === 'take_out' || action.type === 'takeOut')) {
          draggedPigId = null;
        }
      });
    }

    if (window.bridge && window.bridge.mockHandlers) {
      const handlePigMove = function (st, action) {
        if (!action || !action.to) return;
        const pigId = action.pigId || action.pig_id || 'pig_1';
        const to = action.to;

        if (!st.places) st.places = {};
        if (!Array.isArray(st.places.order)) {
          if (window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function') {
            st.places.order = window.CuyScenesMock.state().places.order;
          }
        }
        if (!Array.isArray(st.places.pigLocations)) {
          if (window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function') {
            st.places.pigLocations = window.CuyScenesMock.state().places.pigLocations;
          }
        }

        const ring = st.places.order || [];
        const targetEntry = ring.find(s => s.id === to);
        if (targetEntry && targetEntry.locked) {
          return;
        }

        let loc = st.places.pigLocations && st.places.pigLocations.find(p => (p.pigId || p.PigId) === pigId);
        if (!loc) {
          loc = { pigId: pigId, scene: to, pinned: false };
          if (!st.places.pigLocations) st.places.pigLocations = [];
          st.places.pigLocations.push(loc);
          const pig1Loc = st.places.pigLocations.find(p => (p.pigId || p.PigId) === 'pig_1');
          if (pig1Loc) {
            pig1Loc.scene = to;
            if (pig1Loc.Scene !== undefined) pig1Loc.Scene = to;
          }
        } else {
          loc.scene = to;
          if (loc.Scene !== undefined) loc.Scene = to;
        }
        if (Array.isArray(st.pigLocations)) {
          let locRoot = st.pigLocations.find(p => (p.pigId || p.PigId) === pigId);
          if (locRoot) {
            locRoot.scene = to;
            if (locRoot.Scene !== undefined) locRoot.Scene = to;
          }
        }
      };

      window.bridge.mockHandlers.set('places.pigMove', handlePigMove);
      window.bridge.mockHandlers.set('places_pig_move', handlePigMove);
    }
  }

  if (window.CuyHome && window.CuyHome.registerFeature) {
    window.CuyHome.registerFeature({
      id: 'places',
      title: 'Places',
      icon: 'icon-house',
      order: 35,
      open(container, api, arg) {
        if (api) apiRef = api;
        CuyPlaces.openPlace(arg || CuyPlaces.getCurrentPlace() || 'salon');
      },
      onState(st) {
        if (st) lastState = st;
        CuyPlaces.updateStageNav(st);
      }
    });
  }
})();
