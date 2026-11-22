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
  let lastSceneKey = '';
  let lastThingsSig = '';
  let lastLightSig = '';
  let lastPresentSig = '';
  let lastHotspotsSig = '';
  let lastWeatherSig = '';
  let lastEdgeSig = '';
  let lastLockedOverlaySig = '';
  let lastEditOpen = null;
  let lastSceneContext = null;

  function playWorldSound(eventName, opts) {
    if (window.WorldSounds && typeof window.WorldSounds.play === 'function') {
      window.WorldSounds.play(eventName, opts);
    }
  }

  function resetSceneSigs() {
    lastSceneKey = '';
    lastThingsSig = '';
    lastLightSig = '';
    lastPresentSig = '';
    lastHotspotsSig = '';
    lastWeatherSig = '';
    lastEdgeSig = '';
    lastLockedOverlaySig = '';
  }

  function safeJsonSig(val) {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(Date.now()) + ':' + Math.random();
    }
  }

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

  function handleGramophoneHotspot() {
    const music = window.CuyMusic;
    const wasPlaying = !!(music && typeof music.isPlaying === 'function' && music.isPlaying());
    if (music) {
      if (wasPlaying) {
        if (typeof music.stop === 'function') music.stop(150);
      } else {
        if (typeof music.setEnabled === 'function' && typeof music.isEnabled === 'function' && !music.isEnabled()) {
          music.setEnabled(true);
        }
        if (typeof music.play === 'function') music.play('calm');
      }
    }
    const curInst = getCanvasPigInst();
    if (curInst) {
      const sp = curInst.scenePigs;
      const entries = (sp && typeof sp.entries === 'function') ? sp.entries() : [];
      if (wasPlaying) {
        if (typeof curInst.playAnim === 'function') curInst.playAnim('popcorn', 1400);
        if (typeof curInst._showAmbientBubble === 'function') curInst._showAmbientBubble('Wheek!', 1400);
        if (sp && typeof sp.setDance === 'function') {
          for (let i = 0; i < entries.length; i++) {
            sp.setDance(entries[i].id, false);
          }
        }
      } else {
        if (curInst.behavior && typeof curInst.behavior.interrupt === 'function') {
          curInst.behavior.interrupt('dance');
        }
        if (typeof curInst.playAnim === 'function') curInst.playAnim('dance', 6000);
        if (typeof curInst._showAmbientBubble === 'function') curInst._showAmbientBubble('Music!', 1500);
        if (sp && typeof sp.setDance === 'function') {
          const fps = curInst._danceSyncFps || 8;
          const primaryId = curInst._primaryPigId != null ? String(curInst._primaryPigId) : null;
          for (let i = 0; i < entries.length; i++) {
            const p = entries[i];
            if (!p || p.id == null) continue;
            if (primaryId && String(p.id) === primaryId) continue;
            if (p.pinned || p.anim === 'sleep' || p.anim === 'doze' || p.anim === 'sleep_house' || p.anim === 'held') continue;
            sp.setDance(p.id, true, fps);
          }
        }
      }
    }
    if (window.Sound && typeof window.Sound.wheek === 'function') {
      window.Sound.wheek();
    }
  }

  function ensureLampHotspotSubscription() {
    if (lampHotspotSubscribed) return;
    const inst = (window.CuyPig && window.CuyPig.mainInstance)
      || (window.CanvasPig && window.CanvasPig.instance)
      || (window.PigCanvas && window.PigCanvas.instance);
    if (!inst) return;
    if (window.CanvasPig && typeof window.CanvasPig.onHotspot === 'function') {
      lampHotspotSubscribed = true;
      window.CanvasPig.onHotspot((hs) => {
        if (hs && (hs.kind === 'lamp' || hs.kind === 'lamp_toggle' || hs.id === 'lamp_toggle')) {
          lastLightSig = '';
          toggleLamp(hs.uid || hs.id);
        } else if (hs && hs.kind === 'gramophone') {
          handleGramophoneHotspot(hs);
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
      let fromInst = false;
      if (!items) {
        const inst = getCanvasPigInst();
        if (inst && inst.sceneId === sId && Array.isArray(inst.things) && inst.things.length > 0) {
          items = inst.things;
          fromInst = true;
        }
      }
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

      let off = { x: 0, y: 0 };
      if (kind === 'indoor' && !placed) {
        const layout = (window.CuyScenes && typeof window.CuyScenes.layoutFor === 'function')
          ? window.CuyScenes.layoutFor(sId, getState())
          : null;
        const cols = (layout && layout.cols) || 12;
        const rows = (layout && layout.rows) || 7;
        off = (window.CuyRoomGeometry && typeof window.CuyRoomGeometry.stageOffset === 'function')
          ? window.CuyRoomGeometry.stageOffset(cols, rows)
          : { x: Math.floor((256 - cols * 16) / 2), y: Math.floor((144 - rows * 16) / 2) };
      }

      const activeToggles = toggles || (sceneLampToggles && sceneLampToggles[sId]) || {};
      const sourcesMap = lightsData.sources || {};
      const atlas = (window.CuyScenes && typeof window.CuyScenes.getAtlas === 'function') ? window.CuyScenes.getAtlas() : null;
      const atlasItems = (atlas && atlas.items) ? atlas.items : null;
      const placedForLights = [];

      (items || []).forEach(it => {
        if (!it) return;
        const itemId = it.itemId || it.id;
        const entry = atlasItems ? atlasItems[itemId] : null;
        const key = Object.keys(sourcesMap).find(k => k === itemId || sourcesMap[k].item === itemId || (entry && entry.light && entry.light.kind === k));
        if (!key) return;
        const srcDef = sourcesMap[key];
        const uid = it.uid || it.id || key;

        let gx, gy;
        const cell = 16;
        if (it.x != null && it.y != null) {
          if (it.isPixel || fromInst || it.x > 15 || it.y > 8) {
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

        if (!it._stageOffsetApplied && !fromInst) {
          gx += off.x;
          gy += off.y;
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
        pigLight: (window.Lights && typeof window.Lights.pigLight === 'function') ? window.Lights.pigLight(lightsData) : (lightsData.pig_light || null),
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
          if (!src || !src.on || src.color === 'ambient' || src.itemId === 'window') return;
          const cx = src.x;
          const cy = src.y;
          const r = Math.round((src.radius || (src.radiusCells ? src.radiusCells * 16 : 44)) * 1.18);
          lit.push({ cx, cy });

          let strength = src.strength != null ? src.strength : (src.intensity != null ? src.intensity : 0.85);
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
          let glowAlpha = scene.kind === 'outdoor'
            ? Math.min(0.20, (strength || 0.75) * 0.17)
            : Math.min(0.28, (strength || 0.85) * 0.24);
          if (scene.period === 'day') glowAlpha *= 0.45;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${glowAlpha})`);
          g.addColorStop(0.35, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${glowAlpha * 0.55})`);
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

  function findNextUnlockedScene(currentScene, direction, st) {
    const ord = getOrder(st);
    if (!Array.isArray(ord) || ord.length === 0) return null;
    const step = (direction === 'left' || direction === -1) ? -1 : 1;
    const startIdx = ord.findIndex(s => s && s.id === currentScene);
    if (startIdx === -1) {
      return ord.find(s => s && !s.locked && s.id !== currentScene) || null;
    }
    for (let i = 1; i < ord.length; i++) {
      const candidate = ord[(startIdx + step * i + ord.length * 2) % ord.length];
      if (candidate && !candidate.locked && candidate.id !== currentScene) {
        return candidate;
      }
    }
    return null;
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
    container.hidden = true;
    container.innerHTML = '';
    return;

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
      if (multiplePigs || (pigName && pigName !== 'Pig')) {
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

    const evPigId = (ev && ev.pigId != null) ? String(ev.pigId) : null;
    const pigInScene = (evPigId && pigLocs.find(p => String(p.pigId || p.PigId) === evPigId))
      || pigLocs.find(p => (p.scene || p.sceneId || p.Scene || p.SceneId || 'salon') === currentSceneId);
    const pigEntry = pigInScene || pigLocs.find(p => (p.pigId || p.PigId) === (evPigId || activePigId)) || pigLocs[0];
    if (pigEntry && pigEntry.pinned) {
      return;
    }

    const direction = (ev && ev.to === 'left') ? 'left' : 'right';
    let targetScene = computeNeighbourScene(currentSceneId, direction, st);
    if (!targetScene || targetScene.locked) {
      targetScene = findNextUnlockedScene(currentSceneId, direction, st);
    }

    if (!targetScene || targetScene.locked) {
      exitDisabledUntil = Date.now() + 60000;
      if (window.CanvasPig && typeof window.CanvasPig.setPresentPigs !== 'function' && typeof window.CanvasPig.setPigVisible === 'function') {
        window.CanvasPig.setPigVisible(true);
      }
      if (window.CanvasPig && typeof window.CanvasPig.setExitsEnabled === 'function') {
        window.CanvasPig.setExitsEnabled(false);
      }
      return;
    }

    const pigId = evPigId || (pigEntry && (pigEntry.pigId || pigEntry.PigId)) || activePigId;
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

  function getCanvasPigInst() {
    if (typeof window === 'undefined') return null;
    return (window.CuyPig && window.CuyPig.mainInstance)
      || (window.CanvasPig && window.CanvasPig.instance)
      || (window.PigCanvas && window.PigCanvas.instance)
      || null;
  }

  function getEdgeHoldSide(holdObj) {
    const inst = getCanvasPigInst();
    const hold = holdObj !== undefined
      ? holdObj
      : ((inst && inst.edgeHold) || (typeof window !== 'undefined' && window.CanvasPig && window.CanvasPig.edgeHold) || null);
    if (!hold) return null;
    if (typeof hold === 'string') {
      return (hold === 'left' || hold === 'right') ? hold : null;
    }
    const raw = hold.side != null ? hold.side : hold.dir;
    if (raw === 'left' || raw === -1) return 'left';
    if (raw === 'right' || raw === 1) return 'right';
    return null;
  }

  function isNeighborBlocked(side, st) {
    const current = currentSceneId || 'salon';
    const state = st || getState();
    let neighbourId = null;
    if (window.CuyScenes && typeof window.CuyScenes.neighbor === 'function') {
      neighbourId = window.CuyScenes.neighbor(current, side, state);
    } else {
      const ord = getOrder(state);
      const idx = ord ? ord.findIndex(s => s.id === current) : -1;
      if (idx !== -1) {
        const step = (side === 'left' || side === -1) ? -1 : 1;
        neighbourId = ord[(idx + step + ord.length) % ord.length].id;
      }
    }
    if (!neighbourId || neighbourId === current) return true;
    const ord = getOrder(state);
    const neighbourItem = ord ? ord.find(s => s.id === neighbourId) : null;
    return !neighbourItem || !!neighbourItem.locked;
  }

  function syncEdgeActive(holdObj) {
    if (typeof document === 'undefined') return;
    const leftBtn = document.getElementById('stageEdgeLeft');
    const rightBtn = document.getElementById('stageEdgeRight');
    const side = getEdgeHoldSide(holdObj);
    const leftNear = side === 'left';
    const rightNear = side === 'right';
    const leftBlocked = leftNear && isNeighborBlocked('left');
    const rightBlocked = rightNear && isNeighborBlocked('right');
    if (leftBtn) {
      leftBtn.classList.toggle('edge-active', leftNear && !leftBlocked && !leftBtn.disabled && !leftBtn.hidden);
      leftBtn.classList.toggle('edge-blocked', leftBlocked);
    }
    if (rightBtn) {
      rightBtn.classList.toggle('edge-active', rightNear && !rightBlocked && !rightBtn.disabled && !rightBtn.hidden);
      rightBtn.classList.toggle('edge-blocked', rightBlocked);
    }
  }

  function watchEdgeHoldProp(obj, defaultVal) {
    if (!obj || typeof obj !== 'object' || obj._cuyEdgeHoldWatched) return;
    const desc = Object.getOwnPropertyDescriptor(obj, 'edgeHold');
    if (desc && (!desc.configurable || typeof desc.get === 'function' || typeof desc.set === 'function')) return;
    let current = desc ? desc.value : defaultVal;
    try {
      Object.defineProperty(obj, '_cuyEdgeHoldWatched', {
        value: true,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(obj, 'edgeHold', {
        enumerable: true,
        configurable: true,
        get() {
          return current;
        },
        set(val) {
          current = val;
          syncEdgeActive();
        }
      });
    } catch (err) {
      // Ignore non-extensible objects
    }
  }

  let globalEdgePointerSyncBound = false;
  function bindEdgeHoldSync() {
    const inst = getCanvasPigInst();
    if (inst) {
      watchEdgeHoldProp(inst, null);
      if (inst.canvas && typeof inst.canvas.addEventListener === 'function' && !inst.canvas._cuyEdgeSyncBound) {
        inst.canvas._cuyEdgeSyncBound = true;
        inst.canvas.addEventListener('pointermove', () => syncEdgeActive());
        inst.canvas.addEventListener('pointerup', () => syncEdgeActive());
        inst.canvas.addEventListener('pointercancel', () => syncEdgeActive());
      }
    }
    if (typeof window !== 'undefined' && window.CanvasPig) {
      watchEdgeHoldProp(window.CanvasPig, undefined);
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function' && !globalEdgePointerSyncBound) {
      globalEdgePointerSyncBound = true;
      document.addEventListener('pointerdown', () => {
        const curInst = getCanvasPigInst();
        if (curInst && !curInst._cuyEdgeHoldWatched) bindEdgeHoldSync();
      });
      document.addEventListener('pointerup', () => syncEdgeActive());
      document.addEventListener('pointercancel', () => syncEdgeActive());
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('blur', () => syncEdgeActive(null));
      }
    }
    syncEdgeActive();
  }

  function handleEdgeHold(ev) {
    if (ev && (ev.active === false || ev.side === null || ev.dir === null)) {
      syncEdgeActive(null);
      return;
    }
    const rawSide = ev && (ev.side != null ? ev.side : ev.dir);
    const side = (rawSide === 'left' || rawSide === -1) ? 'left' : 'right';
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
    let neighbourItem = ord ? ord.find(s => s.id === neighbourId) : null;
    let isLocked = !neighbourItem || !!neighbourItem.locked;
    let isNone = !neighbourId || neighbourId === current;

    if (isNone) {
      const inst = getCanvasPigInst();
      if (inst && typeof inst.clearEdgeHold === 'function') inst.clearEdgeHold();
      syncEdgeActive(null);
      return;
    }

    if (isLocked) {
      const hint = (neighbourItem && neighbourItem.unlockHint) ? neighbourItem.unlockHint : 'Locked';
      showToast(hint === 'Locked' ? 'Locked' : ('Locked: ' + hint));
      playWorldSound('edit_error');
      const inst = getCanvasPigInst();
      if (inst && typeof inst.clearEdgeHold === 'function') inst.clearEdgeHold();
      syncEdgeActive(null);
      return;
    }

    if (ev && ev.pigId != null) {
      draggedPigId = String(ev.pigId);
    } else if (!draggedPigId) {
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
    syncEdgeActive(null);
  }

  function handleCanvasDrop(ev) {
    const st = getState();
    const pigId = (ev && ev.pigId != null ? String(ev.pigId) : null) || draggedPigId || getActivePigIdForScene(currentSceneId, st) || getFirstPigId(st);
    if (pigId && currentSceneId) {
      optimisticallySetPigScene(pigId, currentSceneId);
    }
    draggedPigId = null;

    if (window.CanvasPig && typeof window.CanvasPig.setPresentPigs === 'function') {
      if (currentSceneId && st) applyScene(currentSceneId, st);
    } else if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
      window.CanvasPig.setPigVisible(true);
    }

    if (pigId && currentSceneId) {
      sendBridgeMessage({
        type: 'places.pigMove',
        pigId: pigId,
        to: currentSceneId
      });
    }
    syncEdgeActive(null);
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
    bindEdgeHoldSync();
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
    const prevSceneId = currentSceneId;
    currentSceneId = sceneId;

    const isEditOpen = !!(window.CuyEdit && typeof window.CuyEdit.isOpen === 'function' && window.CuyEdit.isOpen());
    if (lastEditOpen !== null && lastEditOpen !== isEditOpen) {
      resetSceneSigs();
    }
    lastEditOpen = isEditOpen;

    const ord = getOrder(st);
    const item = ord.find(s => s.id === currentSceneId) || { id: currentSceneId, title: currentSceneId, locked: false };
    const isLocked = (currentSceneId === 'salon' || String(currentSceneId).indexOf('pig:') === 0) ? false : !!item.locked;

    // 1. Update title in the bar
    const titleEl = document.getElementById('placesBarTitle');
    if (titleEl) {
      const newTitle = getSceneTitle(currentSceneId, st);
      if (titleEl.textContent !== newTitle) {
        titleEl.textContent = newTitle;
      }
    }

    // 2. Set CanvasPig scene & things
    const currentInstScene = (window.CuyPig && window.CuyPig.mainInstance && window.CuyPig.mainInstance.sceneId) || null;
    const tod = (window.CuyScenes && typeof window.CuyScenes.timeOfDay === 'function')
      ? window.CuyScenes.timeOfDay()
      : 'day';
    const sceneDef = (window.CuyScenes && typeof window.CuyScenes.def === 'function')
      ? window.CuyScenes.def(currentSceneId, tod, st)
      : { id: currentSceneId, size: [240, 130], walk: [10, 80, 230, 125] };
    if (sceneDef && !sceneDef.id) {
      sceneDef.id = currentSceneId;
    }

    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance) || (window.CuyPig && window.CuyPig.mainInstance);
    const instSceneId = (inst && inst.sceneId) || currentInstScene;
    const instHasScene = !!(inst && inst.currentScene);
    const instSize = (inst && inst.currentScene && Array.isArray(inst.currentScene.size))
      ? inst.currentScene.size
      : (inst && inst.sceneKind === 'room' && Array.isArray(inst.roomSize)
        ? inst.roomSize
        : (inst ? [inst.sceneWidth, inst.sceneHeight] : null));
    const sizeChanged = !!(instSize && sceneDef.size && (instSize[0] !== sceneDef.size[0] || instSize[1] !== sceneDef.size[1]));
    const isCanvasDragging = !!(window.CanvasPig && typeof window.CanvasPig.isDragging === 'function' && window.CanvasPig.isDragging());
    const isPigBeingDragged = !!(inst && inst.drag && inst.drag.moved) || (draggedPigId !== null) || isCanvasDragging;

    const layoutWallpaper = (st && st.rooms && st.rooms.layouts && st.rooms.layouts[currentSceneId] && st.rooms.layouts[currentSceneId].wallpaper) || '';
    const layoutFloor = (st && st.rooms && st.rooms.layouts && st.rooms.layouts[currentSceneId] && st.rooms.layouts[currentSceneId].floor) || '';
    const sizeKey = (sceneDef && Array.isArray(sceneDef.size)) ? sceneDef.size.join('x') : '';
    const sceneKey = currentSceneId + '|' + tod + '|' + sizeKey + '|' + (isLocked ? '1' : '0') + '|' + layoutWallpaper + '|' + layoutFloor;
    const instSceneChanged = (inst && !instHasScene) || (instSceneId !== null && instSceneId !== currentSceneId) || sizeChanged;
    const sceneChanged = (prevSceneId !== currentSceneId) || instSceneChanged || (sceneKey !== lastSceneKey);

    if (sceneChanged) {
      resetSceneSigs();
    }
    lastSceneKey = sceneKey;

    if (sceneChanged || (inst && !instHasScene) || instSceneId !== currentSceneId || sizeChanged) {
      if (window.CanvasPig && typeof window.CanvasPig.setScene === 'function') {
        window.CanvasPig.setScene(sceneDef);
      }
      if (inst) {
        inst.sceneId = currentSceneId;
      }
    }

    const things = (window.CuyScenes && typeof window.CuyScenes.placedThings === 'function')
      ? window.CuyScenes.placedThings(st, currentSceneId)
      : [];
    const sceneKind = getPlaceKind(currentSceneId) === 'outdoor' ? 'outdoor' : 'room';
    const thingsSig = currentSceneId + '|' + safeJsonSig(things || []);
    if (sceneChanged || (!isPigBeingDragged && thingsSig !== lastThingsSig)) {
      lastThingsSig = thingsSig;
      if (window.CanvasPig && typeof window.CanvasPig.setThings === 'function') {
        window.CanvasPig.setThings(things, true);
      }
      if (inst) {
        if (typeof inst.invalidateRestSpots === 'function') {
          inst.invalidateRestSpots();
        } else {
          inst.pendingSpot = null;
        }
      }
      lastSceneContext = {
        sceneId: currentSceneId,
        sceneKind: sceneKind,
        things: Array.isArray(things) ? things.slice() : []
      };
      if (window.CanvasPig && typeof window.CanvasPig.setSceneContext === 'function') {
        window.CanvasPig.setSceneContext(lastSceneContext);
      }
    }
    if (sceneChanged && !isLocked) {
      const hasFountain = (things || []).some(t => t && /fountain/i.test(t.id || t.itemId || ''));
      if (currentSceneId === 'park' || (currentSceneId === 'garden' && hasFountain)) {
        playWorldSound('fountain_ambience', { minIntervalMs: 1400 });
      }
    }

    // Light scene
    const applyLightIfChanged = (sl) => {
      const sig = currentSceneId + '|' + (lightsLoaded ? '1' : '0') + '|' + safeJsonSig(sl);
      if (sig !== lastLightSig) {
        lastLightSig = sig;
        if (window.CanvasPig && typeof window.CanvasPig.setLightScene === 'function') {
          window.CanvasPig.setLightScene(sl);
        }
      }
    };
    const sceneLight = CuyLight.build(currentSceneId);
    applyLightIfChanged(sceneLight);
    if (!lightsLoaded) {
      ensureLights(() => {
        applyLightIfChanged(CuyLight.build(currentSceneId));
      });
    }
    if (window.CuyScenes && typeof window.CuyScenes.loadAtlas === 'function' && typeof window.CuyScenes.getAtlas === 'function' && !window.CuyScenes.getAtlas()) {
      const atlasSceneId = currentSceneId;
      window.CuyScenes.loadAtlas().then(() => {
        if (currentSceneId === atlasSceneId) applyLightIfChanged(CuyLight.build(currentSceneId));
      }).catch(() => {});
    }

    ensureLampHotspotSubscription();

    // Hotspots per scene
    const catalogForHotspots = (typeof window !== 'undefined' && window.CuyWorldItems) || null;
    const mySceneId = currentSceneId;
    const syncHotspots = () => {
      if (currentSceneId !== mySceneId) return;
      if (window.CuyHotspots && typeof window.CuyHotspots.fromScene === 'function' &&
          window.CanvasPig && typeof window.CanvasPig.setHotspots === 'function') {
        let hsThings = things;
        if (sceneDef && sceneDef.kind === 'room' && Array.isArray(things) && things.length > 0) {
          const curInst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance) || (window.CuyPig && window.CuyPig.mainInstance);
          const off = (curInst && curInst.roomOffset) || { x: 0, y: 0 };
          if (off.x || off.y) {
            hsThings = things.map(t => (t && !t._stageOffsetApplied && typeof t.x === 'number' && typeof t.y === 'number')
              ? Object.assign({}, t, { x: t.x + off.x, y: t.y + off.y })
              : t);
          }
        }
        const hsList = isLocked
          ? (window.CuyHotspots.EMPTY || [])
          : window.CuyHotspots.fromScene(currentSceneId, hotspotsData, hsThings, catalogForHotspots);
        const hsSig = currentSceneId + '|' + (isLocked ? '1' : '0') + '|' + (hotspotsLoaded ? '1' : '0') + '|' + safeJsonSig(hsList || []);
        if (hsSig !== lastHotspotsSig) {
          lastHotspotsSig = hsSig;
          window.CanvasPig.setHotspots(hsList);
        }
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
        let liveMapped = null;
        if (window.CuyWeatherLive && typeof window.CuyWeatherLive.mapState === 'function') {
          liveMapped = window.CuyWeatherLive.mapState(st && st.weather);
        } else if (st && st.weather && st.weather.consent && st.weather.status !== 'off' && typeof st.weather.condition === 'string') {
          const cond = st.weather.condition.toLowerCase();
          const visMap = { clear: 'clear', cloudy: 'overcast', fog: 'overcast', rain: 'rain', snow: 'snow', storm: 'rain' };
          if (visMap[cond]) liveMapped = { enabled: true, kind: cond, visualType: visMap[cond] };
        }
        let weatherState;
        if (liveMapped && liveMapped.enabled) {
          const visType = liveMapped.visualType || 'clear';
          const cfg = (weatherData && weatherData.types && weatherData.types[visType])
            || (window.CuyWeather.DEFAULT_DATA && window.CuyWeather.DEFAULT_DATA.types && window.CuyWeather.DEFAULT_DATA.types[visType])
            || null;
          weatherState = {
            type: visType,
            outdoor: true,
            seed: 1337,
            live: true,
            kind: liveMapped.kind,
            config: cfg ? Object.assign({}, cfg) : null
          };
        } else {
          weatherState = window.CuyWeather.stateFor(getLightsNow(), 'outdoor', st && st.settings, weatherData);
        }
        const wSig = currentSceneId + '|outdoor|' + (weatherLoaded ? '1' : '0') + '|' + safeJsonSig(weatherState);
        if (wSig !== lastWeatherSig) {
          lastWeatherSig = wSig;
          if (typeof window.CuyRoom.addLayer === 'function') {
            window.CuyRoom.addLayer('weather', 15, (ctx, scene) => {
              if (!window.CuyWeather || typeof window.CuyWeather.draw !== 'function') return;
              const w = (scene && scene.width) || 256;
              const h = (scene && scene.height) || 144;
              const t = (scene && scene.time != null) ? scene.time : 0;
              window.CuyWeather.draw(ctx, weatherState, t, w, h);
            });
          }
        }
      } else if (lastWeatherSig !== 'none') {
        lastWeatherSig = 'none';
        if (typeof window.CuyRoom.removeLayer === 'function') {
          window.CuyRoom.removeLayer('weather');
        }
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
        let pigLook = null;
        if (rosterPig) {
          const baseLook = (rosterPig.look && typeof rosterPig.look === 'object') ? rosterPig.look : rosterPig;
          pigLook = Object.assign({}, baseLook);
          const resolvedNamed = baseLook.namedId || baseLook.named || rosterPig.namedId || rosterPig.named || null;
          if (resolvedNamed) {
            pigLook.namedId = resolvedNamed;
            pigLook.named = resolvedNamed;
          }
          const resolvedPalette = baseLook.paletteId || rosterPig.paletteId || baseLook.coat || null;
          if (resolvedPalette) {
            pigLook.paletteId = resolvedPalette;
            if (!pigLook.coat) pigLook.coat = resolvedPalette;
          }
        }
        return {
          id: pigId,
          look: pigLook,
          traits: (rosterPig && Array.isArray(rosterPig.traits)) ? rosterPig.traits : [],
          modifiers: (rosterPig && rosterPig.modifiers) ? rosterPig.modifiers : null,
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
    const edgeSig = (hasLeftNeighbour ? '1' : '0') + (hasRightNeighbour ? '1' : '0');
    if (sceneChanged || edgeSig !== lastEdgeSig) {
      lastEdgeSig = edgeSig;
      if (window.CanvasPig && typeof window.CanvasPig.setEdgeNeighbours === 'function') {
        window.CanvasPig.setEdgeNeighbours({
          left: hasLeftNeighbour,
          right: hasRightNeighbour
        });
      }
    }

    if (window.CanvasPig && typeof window.CanvasPig.setExitsEnabled === 'function') {
      const now = Date.now();
      const exitsAllowed = isAnyPigHere && !isPigPinned && (now >= exitDisabledUntil) && !isPigBeingDragged;
      window.CanvasPig.setExitsEnabled(exitsAllowed);
    }

    // 4. Locked overlay and hint
    const hintBar = document.getElementById('placesLockedHint');
    const hintText = document.getElementById('placesHintText');
    let unlockBtn = document.getElementById('placesUnlockBtn');
    if (hintBar && !unlockBtn) {
      unlockBtn = document.createElement('button');
      unlockBtn.type = 'button';
      unlockBtn.id = 'placesUnlockBtn';
      unlockBtn.className = 'ui-btn places-unlock-btn';
      unlockBtn.hidden = true;
      hintBar.appendChild(unlockBtn);
    }
    if (unlockBtn && !unlockBtn._unlockBound) {
      unlockBtn._unlockBound = true;
      unlockBtn.addEventListener('click', () => {
        if (unlockBtn.disabled) return;
        const pid = unlockBtn.dataset.placeId;
        const msgType = unlockBtn.dataset.unlockType || 'place_unlock';
        if (!pid) return;
        if (window.bridge && typeof window.bridge.send === 'function') {
          window.bridge.send({ type: msgType, id: pid });
        }
        if (window.Sound && typeof window.Sound.click === 'function') {
          window.Sound.click();
        }
      });
    }

    if (isLocked) {
      const placesArr = (st && st.places && Array.isArray(st.places.places)) ? st.places.places : [];
      const roomsArr = (st && st.places && Array.isArray(st.places.rooms)) ? st.places.rooms : [];
      const placeDef = placesArr.find(p => p && p.id === currentSceneId) || null;
      const roomDef = roomsArr.find(r => r && r.id === currentSceneId) || null;
      const def = placeDef || roomDef;
      const isRoom = !placeDef && !!roomDef;
      const cost = def && typeof def.unlockCost === 'number' ? def.unlockCost : 0;
      const clovers = Number((st && st.clovers) || 0);
      const requires = (placeDef && Array.isArray(placeDef.requires)) ? placeDef.requires : [];
      const missingReqs = requires.filter(reqId => {
        const p = placesArr.find(x => x && x.id === reqId);
        if (p) return !p.unlocked;
        const r = roomsArr.find(x => x && x.id === reqId);
        if (r) return !r.unlocked;
        return false;
      });
      const missingNames = missingReqs.map(reqId => {
        const p = placesArr.find(x => x && x.id === reqId);
        if (p && p.name) return p.name;
        const r = roomsArr.find(x => x && x.id === reqId);
        if (r && r.name) return r.name;
        return reqId.charAt(0).toUpperCase() + reqId.slice(1);
      });
      const reqsMet = missingReqs.length === 0;
      const canAfford = clovers >= cost;
      const canUnlock = !!def && reqsMet && canAfford;

      if (hintBar) hintBar.hidden = false;
      if (hintText) {
        if (!reqsMet) {
          hintText.textContent = 'Requires ' + missingNames.join(', ');
        } else if (def && !canAfford) {
          hintText.textContent = 'Need ' + cost + ' clovers (have ' + clovers + ')';
        } else if (def) {
          hintText.textContent = 'Ready to unlock';
        } else {
          hintText.textContent = item.unlockHint || 'Locked';
        }
      }
      if (unlockBtn) {
        if (def) {
          unlockBtn.hidden = false;
          unlockBtn.disabled = !canUnlock;
          unlockBtn.setAttribute('aria-disabled', canUnlock ? 'false' : 'true');
          unlockBtn.dataset.placeId = currentSceneId;
          unlockBtn.dataset.unlockType = isRoom ? 'room_unlock' : 'place_unlock';
          unlockBtn.innerHTML = 'Unlock (' + cost + ' <span class="pixel-icon icon-clover" aria-hidden="true"></span>)';
          unlockBtn.title = !reqsMet
            ? ('Requires ' + missingNames.join(', '))
            : (!canAfford ? ('Need ' + (cost - clovers) + ' more clovers') : ('Unlock ' + (item.title || currentSceneId)));
        } else {
          unlockBtn.hidden = true;
        }
      }

      if (lastLockedOverlaySig !== 'locked') {
        lastLockedOverlaySig = 'locked';
        if (window.CuyRoom && typeof window.CuyRoom.addLayer === 'function') {
          window.CuyRoom.addLayer('p36_locked_overlay', 25, (ctx, scene) => {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgb(87, 98, 150)';
            ctx.fillRect(0, 0, (scene && scene.width) || 256, (scene && scene.height) || 144);
            ctx.restore();
          });
        }
      }
    } else {
      if (hintBar) hintBar.hidden = true;
      if (hintText) hintText.textContent = '';
      if (unlockBtn) unlockBtn.hidden = true;

      if (lastLockedOverlaySig !== 'unlocked') {
        lastLockedOverlaySig = 'unlocked';
        if (window.CuyRoom && typeof window.CuyRoom.removeLayer === 'function') {
          window.CuyRoom.removeLayer('p36_locked_overlay');
        }
      }
    }

    if (window.CanvasPig && typeof window.CanvasPig.setPresentPigs === 'function') {
      if (!isPigBeingDragged) {
        const targetPresent = isLocked ? [] : presentList;
        const presentSig = currentSceneId + '|' + (isLocked ? 'locked' : safeJsonSig(targetPresent));
        if (sceneChanged || presentSig !== lastPresentSig) {
          lastPresentSig = presentSig;
          window.CanvasPig.setPresentPigs(targetPresent);
        }
      }
    } else if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
      window.CanvasPig.setPigVisible(isLocked ? false : (isAnyPigHere || isPigBeingDragged));
    }

    if (!isPigBeingDragged) {
      draggedPigId = null;
    }

    bindEditButton();
    syncEditButton(isPigBeingDragged);
    bindEdgeArrows();
    syncEdgeArrows(st, ord);

    // 5. Update presence chips
    updatePresenceChips(st);

    if (prevSceneId !== currentSceneId && window.CuyEdit && typeof window.CuyEdit.render === 'function') {
      try {
        window.CuyEdit.render(st);
      } catch (e) {}
    }

    if (prevSceneId !== currentSceneId) {
      if (currentSceneId === 'market' && !isLocked) {
        if (window.CuyMarket && typeof window.CuyMarket.openPanel === 'function' && !document.getElementById('marketDrawer')) {
          window.CuyMarket.openPanel('food');
        }
      } else if (prevSceneId === 'market' || currentSceneId !== 'market') {
        if (window.CuyMarket && typeof window.CuyMarket.closePanel === 'function' && document.getElementById('marketDrawer')) {
          window.CuyMarket.closePanel();
        }
      }
    }

    if (sceneChanged && window.CuyRun && typeof window.CuyRun.onState === 'function') {
      window.CuyRun.onState(st);
    }
    if (isLocked && currentSceneId === 'garden') {
      const runBtn = document.getElementById('runEntryBtn');
      if (runBtn) runBtn.hidden = true;
    }
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
    const prevOverride = Object.prototype.hasOwnProperty.call(sceneLampToggles[currentSceneId], uid)
      ? sceneLampToggles[currentSceneId][uid]
      : undefined;
    const currentlyOn = src ? !!src.on : (prevOverride !== undefined ? !!prevOverride : true);
    sceneLampToggles[currentSceneId][uid] = !currentlyOn;
    lastLightSig = '';
    if (window.Sound && typeof window.Sound.click === 'function') {
      window.Sound.click();
    }
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
    lastLightSig = '';
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
      resetSceneSigs();
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

  function getNavButtons() {
    if (typeof document === 'undefined') {
      return { prevBtn: null, nextBtn: null, edgeLeft: null, edgeRight: null };
    }
    return {
      prevBtn: document.getElementById('placesPrevBtn') || document.getElementById('placesPrev'),
      nextBtn: document.getElementById('placesNextBtn') || document.getElementById('placesNext'),
      edgeLeft: document.getElementById('stageEdgeLeft'),
      edgeRight: document.getElementById('stageEdgeRight')
    };
  }

  function canCycleInOrder(dir, ord, st) {
    if (!Array.isArray(ord) || ord.length <= 1) return false;
    if (window.CuyScenes && typeof window.CuyScenes.neighbor === 'function' && currentSceneId) {
      const targetId = window.CuyScenes.neighbor(currentSceneId, dir, st);
      if (!targetId || targetId === currentSceneId) return false;
    }
    return true;
  }

  function syncEdgeArrowButton(edgeBtn, barBtn, canCycle) {
    if (!edgeBtn) return;
    const barHidden = !!(barBtn && (barBtn.hidden || barBtn.classList.contains('hidden') || barBtn.getAttribute('aria-hidden') === 'true'));
    const barDisabled = !!(barBtn && (barBtn.disabled || barBtn.getAttribute('aria-disabled') === 'true'));
    const isHidden = !canCycle || barHidden;
    const isDisabled = isHidden || barDisabled;

    edgeBtn.hidden = isHidden;
    edgeBtn.classList.toggle('hidden', isHidden);
    edgeBtn.disabled = isDisabled;
    edgeBtn.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    if (isHidden) {
      edgeBtn.setAttribute('aria-hidden', 'true');
    } else {
      edgeBtn.removeAttribute('aria-hidden');
    }
    if (isDisabled) {
      edgeBtn.classList.remove('edge-active');
    }
  }

  function syncEdgeArrows(st, ord) {
    if (!st) st = getState();
    if (!ord) ord = getOrder(st);
    const { prevBtn, nextBtn, edgeLeft, edgeRight } = getNavButtons();
    syncEdgeArrowButton(edgeLeft, prevBtn, canCycleInOrder(-1, ord, st));
    syncEdgeArrowButton(edgeRight, nextBtn, canCycleInOrder(1, ord, st));
    syncEdgeActive();
  }

  function observeBarNavButton(barBtn) {
    if (!barBtn || barBtn.dataset.cuyEdgeObserved || typeof MutationObserver === 'undefined') return;
    barBtn.dataset.cuyEdgeObserved = '1';
    const obs = new MutationObserver(() => syncEdgeArrows());
    obs.observe(barBtn, {
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'class', 'aria-disabled', 'aria-hidden']
    });
  }

  function bindEdgeArrows() {
    const { prevBtn, nextBtn, edgeLeft, edgeRight } = getNavButtons();
    if (edgeLeft && !edgeLeft.dataset.edgeBound) {
      edgeLeft.dataset.edgeBound = '1';
      edgeLeft.addEventListener('click', (e) => {
        e.preventDefault();
        if (edgeLeft.disabled) return;
        prev();
      });
    }
    if (edgeRight && !edgeRight.dataset.edgeBound) {
      edgeRight.dataset.edgeBound = '1';
      edgeRight.addEventListener('click', (e) => {
        e.preventDefault();
        if (edgeRight.disabled) return;
        next();
      });
    }
    observeBarNavButton(prevBtn);
    observeBarNavButton(nextBtn);
  }

  const CuyPlaces = {
    getCurrentPlace() {
      return currentSceneId || 'salon';
    },
    getSceneContext() {
      if (lastSceneContext) {
        return {
          sceneId: lastSceneContext.sceneId,
          sceneKind: lastSceneContext.sceneKind,
          things: Array.isArray(lastSceneContext.things) ? lastSceneContext.things.slice() : []
        };
      }
      const sId = currentSceneId || 'salon';
      return {
        sceneId: sId,
        sceneKind: getPlaceKind(sId) === 'outdoor' ? 'outdoor' : 'room',
        things: []
      };
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
      lastPresentSig = '';
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
        if (!currentSceneId || sId === currentSceneId) {
          lastLightSig = sId + '|' + (lightsLoaded ? '1' : '0') + '|' + safeJsonSig(sceneLight);
        }
        window.CanvasPig.setLightScene(sceneLight);
      }
    }
  };

  window.CuyPlaces = CuyPlaces;

  if (typeof window !== 'undefined') {
    bindCanvasExits();
    bindCanvasDragSwitch();
    bindEditButton();
    bindEdgeArrows();
    syncEdgeArrows();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        bindCanvasExits();
        bindCanvasDragSwitch();
        bindEditButton();
        bindEdgeArrows();
        syncEdgeArrows();
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
