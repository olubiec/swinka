// Farm view (W20-05): plots, planting menu, watering, harvest, upgrades and the orchard.
// State `farm` and messages farm_plant, farm_water, farm_harvest, farm_harvest_all, farm_buy, orchard_plant, orchard_harvest.
// The page never decides ripeness: it counts down `secondsLeft` locally and only sends what the player clicks.
(function () {
  'use strict';

  const PLOT_PX = 48; // on screen; the plot canvas itself is 32x32 and drawn with pixelated scaling
  const imageCache = {};
  let sheet = null;       // { img, json } from assets/world/farm/farm.png + farm.json
  let sheetRequested = false;

  const S = {
    container: null,
    api: null,
    menuPlot: null,        // plot index with the planting menu open
    unlockPending: false,  // first tap on the locked farm button
    clock: [],             // [{ at, left, total }] local countdown per plot index
    timer: null,
    lastState: null,
    period: null,          // time of day of the last render
    periodAt: 0,           // when the period was last checked (once a minute)
    scenePanel: null,      // { kind: 'plant'|'tooltip'|'orchard'|'shop', plot?: number, rect?: number[] }
    stripEl: null,
    overlayEl: null,
    boundHotspotApi: null,
    boundLayerApi: null,
    placeObserver: null
  };

  let iconMap = null;
  let iconImg = null;
  let iconsRequested = false;

  // Light and time of day (W32-03): ambient tint on the plots and crops.
  // Engine: lib/lights.js (window.Lights); data: assets/data/lights.json. A missing lib or file means no tint, no error.
  const LIGHT_PERIOD_MS = 60000;
  let lightsData = null;
  let lightsRequested = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function url(rel) {
    return S.api && S.api.assetUrl ? S.api.assetUrl(rel) : '../../assets/' + rel;
  }

  function loadSheet() {
    if (sheetRequested) return;
    sheetRequested = true;
    const img = new Image();
    const json = fetch(url('world/farm/farm.json')).then(r => (r.ok ? r.json() : null)).catch(() => null);
    const loaded = new Promise(resolve => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
    img.src = url('world/farm/farm.png');
    Promise.all([json, loaded]).then(([j, ok]) => {
      sheet = ok && j && j.frames ? { img: img, frames: j.frames } : null;
      refreshPlots();
    });
  }

  function frameOf(name, index) {
    if (!sheet || !sheet.frames[name]) return null;
    const list = sheet.frames[name];
    return list[Math.min(index, list.length - 1)] || null;
  }

  function drawPlot(canvas, plot, crop) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 32, 32);
    const baseName = plot.state === 'empty' ? 'bed_empty' : (plot.watered ? 'bed_wet' : 'soil');
    const base = frameOf(baseName, 0);
    if (sheet && base) {
      ctx.drawImage(sheet.img, base[0], base[1], base[2], base[3], 0, 0, 32, 32);
    } else {
      ctx.fillStyle = plot.state === 'empty' ? '#c9a46a' : '#7a4f2a';
      ctx.fillRect(0, 0, 32, 32);
    }
    if (plot.state === 'empty' || !plot.cropId) return;
    const total = crop && crop.growMinutes ? crop.growMinutes * 60 : 60;
    const progress = Math.min(1, Math.max(0, 1 - (plot.secondsLeft || 0) / total));
    const stage = plot.state === 'ripe' ? 3 : Math.min(2, Math.floor(progress * 3));
    const f = frameOf('crop_' + plot.cropId, stage);
    if (sheet && f) {
      ctx.drawImage(sheet.img, f[0], f[1], f[2], f[3], 0, 0, 32, 32);
    } else {
      ctx.fillStyle = '#7fbf4a';
      ctx.fillRect(10, 6, 12, 20);
    }
  }

  function cropOf(st, id) {
    return ((st.farm && st.farm.crops) || []).find(c => c.id === id) || null;
  }

  function plotLabel(plot, crop) {
    if (plot.state === 'empty') return 'Empty plot. Click to plant.';
    const name = crop ? crop.name : 'Crop';
    if (plot.state === 'ripe') return name + ' is ready. Click to harvest.';
    return name + ' growing, ' + fmt(plot.secondsLeft) + ' left' + (plot.watered ? ', watered' : '. Click to water.');
  }

  function fmt(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  // Local countdown: updates text and bars between state pushes. It never sends a message.
  function tick() {
    if (!S.container || !S.container.isConnected) return;
    if (Date.now() - S.periodAt >= LIGHT_PERIOD_MS) {
      S.periodAt = Date.now();
      if (lightPeriod() !== S.period) { render(); return; }
    }
    S.clock.forEach((c, i) => {
      if (!c) return;
      const left = Math.max(0, c.left - (Date.now() - c.at) / 1000);
      const el = S.container.querySelector(`[data-timer="${i}"]`);
      if (el) el.textContent = left > 0 ? fmt(left) : 'ready';
      const bar = S.container.querySelector(`[data-bar="${i}"]`);
      if (bar && c.total > 0) bar.style.width = Math.round(Math.min(100, (1 - left / c.total) * 100)) + '%';
    });
  }

  function send(msg) {
    if (S.api && S.api.send) { S.api.send(msg); return; }
    if (window.bridge && typeof window.bridge.send === 'function') window.bridge.send(msg);
  }

  function getState() {
    if (S.api && typeof S.api.getState === 'function') return S.api.getState();
    if (S.lastState) return S.lastState;
    if (window.bridge) return window.bridge.currentState || (typeof window.bridge.getState === 'function' ? window.bridge.getState() : null);
    return null;
  }

  function isFarmScene() {
    if (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function') {
      return window.CuyPlaces.getCurrentPlace() === 'farm';
    }
    const title = document.getElementById('placesBarTitle');
    return !!(title && title.textContent && title.textContent.trim().toLowerCase() === 'farm');
  }

  function ensureIconSheet() {
    if (iconsRequested) return;
    iconsRequested = true;
    fetch(url('icons/icons.json'))
      .then(r => (r.ok ? r.json() : null))
      .then(j => { iconMap = j || null; })
      .catch(() => { iconMap = null; });
    const img = new Image();
    img.onload = () => { iconImg = img; };
    img.src = url('icons/icons_16.png');
  }

  function drawFallbackMarker(ctx, kind, x, y) {
    ctx.save();
    if (kind === 'water_drop') {
      ctx.fillStyle = '#3a1d17';
      ctx.fillRect(x + 6, y + 2, 4, 2);
      ctx.fillRect(x + 5, y + 4, 6, 3);
      ctx.fillRect(x + 4, y + 7, 8, 5);
      ctx.fillRect(x + 5, y + 12, 6, 2);
      ctx.fillStyle = '#5f7f87';
      ctx.fillRect(x + 6, y + 5, 4, 7);
      ctx.fillStyle = '#8da9a8';
      ctx.fillRect(x + 6, y + 6, 2, 4);
    } else {
      ctx.fillStyle = '#3a1d17';
      ctx.fillRect(x + 4, y + 3, 8, 3);
      ctx.fillRect(x + 2, y + 6, 12, 7);
      ctx.fillStyle = '#6f4328';
      ctx.fillRect(x + 5, y + 4, 6, 2);
      ctx.fillStyle = '#d1a548';
      ctx.fillRect(x + 3, y + 7, 10, 5);
      ctx.fillStyle = '#a97a2f';
      ctx.fillRect(x + 3, y + 9, 10, 1);
    }
    ctx.restore();
  }

  function drawFarmMarkers(ctx, scene) {
    const sceneId = (scene && scene.id) || (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function' ? window.CuyPlaces.getCurrentPlace() : null);
    if (sceneId !== 'farm') return;
    const st = getState();
    if (!st || !st.farm || !st.farm.unlocked) return;
    const plots = st.farm.plots || [];
    const hotspots = (window.CanvasPig && typeof window.CanvasPig.getHotspots === 'function') ? window.CanvasPig.getHotspots() : [];
    if (!hotspots || !hotspots.length) return;

    ensureIconSheet();
    for (let k = 0; k < hotspots.length; k++) {
      const hs = hotspots[k];
      if (!hs || !Array.isArray(hs.rect) || hs.rect.length < 4) continue;
      const pm = String(hs.id || hs.uid || '').match(/(?:fx:farm:)?plot:(\d+)/);
      if (hs.kind !== 'plot' && !pm) continue;
      const idx = pm ? Number(pm[1]) : -1;
      const p = plots[idx];
      if (!p || p.state === 'empty') continue;

      let iconKey = null;
      if (p.state === 'growing' && !p.watered) iconKey = 'water_drop';
      else if (p.state === 'ripe') iconKey = 'basket';
      if (!iconKey) continue;

      const x = Math.round((hs.rect[0] + hs.rect[2]) / 2) - 8;
      const y = Math.max(0, Math.round(hs.rect[1]) - 16);
      const sheetIdx = iconMap && typeof iconMap[iconKey] === 'number' ? iconMap[iconKey] : -1;
      if (iconImg && iconImg.complete && iconImg.naturalWidth > 0 && sheetIdx >= 0) {
        const cols = Math.max(1, Math.floor(iconImg.naturalWidth / 16));
        const sx = (sheetIdx % cols) * 16;
        const sy = Math.floor(sheetIdx / cols) * 16;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(iconImg, sx, sy, 16, 16, x, y, 16, 16);
        ctx.restore();
      } else {
        drawFallbackMarker(ctx, iconKey, x, y);
      }
    }
  }

  function render() {
    const container = S.container;
    if (!container) return;
    const st = S.api.getState();
    if (!st || !st.farm) {
      container.innerHTML = '<p class="farm-empty">Loading the farm…</p>';
      return;
    }
    S.lastState = st;
    container.dataset.place = 'farm';
    container.setAttribute('data-place', 'farm');
    const f = st.farm;
    const crops = f.crops || [];
    const plots = f.plots || [];
    const up = f.upgrades || {};
    const tools = f.tools || { plotsPerWater: 1 };
    const clovers = st.clovers || 0;

    if (!f.unlocked) {
      const place = ((st.places && st.places.places) || []).find(x => x.id === 'farm') || { unlockCost: 600 };
      const pending = S.unlockPending;
      container.innerHTML = `<div class="farm-panel farm-locked" data-place="farm">
        <p>The farm is still closed.</p>
        <button type="button" class="farm-btn" data-open-farm="1">${pending ? 'Tap again to open' : 'Open for ' + place.unlockCost + ' clovers'}</button></div>`;
      const openBtn = container.querySelector('[data-open-farm]');
      openBtn.addEventListener('click', () => {
        if (!S.unlockPending) { S.unlockPending = true; render(); return; }
        S.unlockPending = false;
        send({ type: 'place_unlock', id: 'farm' });
      });
      return;
    }

    S.clock = plots.map(p => (p.state === 'growing' ? { at: Date.now(), left: p.secondsLeft, total: (cropOf(st, p.cropId) || {}).growMinutes * 60 || Math.max(p.secondsLeft, 1) } : null));

    const ripe = plots.filter(p => p.state === 'ripe').length;
    const growingUnwatered = plots.filter(p => p.state === 'growing' && !p.watered).length;

    const plotButtons = plots.map((p, i) => {
      const crop = cropOf(st, p.cropId);
      const pressed = S.menuPlot === i;
      return `<button type="button" class="farm-plot is-${p.state}${pressed ? ' is-menu' : ''}" data-plot="${i}" aria-expanded="${pressed}"
          aria-label="Plot ${i + 1}: ${esc(plotLabel(p, crop))}">
          <canvas class="farm-plot-canvas" width="32" height="32" data-plot-canvas="${i}" aria-hidden="true"></canvas>
          <span class="farm-plot-timer" data-timer="${i}">${p.state === 'growing' ? fmt(p.secondsLeft) : (p.state === 'ripe' ? 'ready' : '')}</span>
          <span class="farm-plot-bar"><span class="farm-plot-fill" data-bar="${i}" style="width:${p.state === 'ripe' ? 100 : p.state === 'growing' ? Math.round((1 - p.secondsLeft / Math.max(1, (crop && crop.growMinutes ? crop.growMinutes * 60 : p.secondsLeft))) * 100) : 0}%"></span></span>
        </button>`;
    }).join('');

    let menu = '';
    if (S.menuPlot !== null && plots[S.menuPlot] && plots[S.menuPlot].state === 'empty') {
      const rows = crops.map(c => {
        if (!c.unlocked) {
          const more = Math.max(0, c.unlockHarvests - (f.harvests || 0));
          return `<li class="farm-crop is-locked"><span class="pixel-icon icon-padlock" aria-hidden="true"></span> ${esc(c.name)}: ${more} more harvest${more === 1 ? '' : 's'}</li>`;
        }
        const owned = c.seedOwned || 0;
        return `<li class="farm-crop"><span class="farm-crop-name">${esc(c.name)}</span> <span class="farm-crop-meta">${owned} seed${owned === 1 ? '' : 's'} · ${c.growMinutes} min</span>
          <button type="button" class="farm-btn" data-plant="${esc(c.id)}" ${owned > 0 ? '' : 'disabled'}>Plant</button></li>`;
      }).join('');
      menu = `<div class="farm-menu" role="region" aria-label="Plant on plot ${S.menuPlot + 1}">
        <div class="farm-menu-head">Plant on plot ${S.menuPlot + 1}<button type="button" class="farm-btn farm-close" data-close="1">Close</button></div>
        <ul class="farm-crops">${rows}</ul></div>`;
    }

    const upgrade = (label, cost, what, disabledWhen) => {
      const can = cost !== null && cost !== undefined && clovers >= cost && !disabledWhen;
      const price = cost === null || cost === undefined ? 'Max' : cost + ' clovers';
      return `<button type="button" class="farm-btn farm-upgrade" data-buy="${what}" ${can ? '' : 'disabled'}>${esc(label)} · ${esc(price)}</button>`;
    };
    const upgrades = [
      upgrade('Next plot pack', up.nextPackCost, 'pack', false),
      upgrade('Orchard slot', up.nextOrchardCost, 'orchard', false),
      upgrade('Better can', up.nextCanCost, 'can', false),
      upgrade('Sprinkler', up.sprinklerCost, 'sprinkler', !!tools.sprinkler)
    ].join('');

    const orchard = (f.orchard || []).map(o => {
      if (!o.cropId) {
        return `<div class="farm-slot"><span class="farm-slot-name">Slot ${o.slot + 1}</span><button type="button" class="farm-btn" data-orchard-plant="${o.slot}">Plant sapling</button></div>`;
      }
      const next = o.stock < 5 && o.secondsToNext > 0 ? ' · next in ' + fmt(o.secondsToNext) : '';
      return `<div class="farm-slot"><span class="farm-slot-name">Slot ${o.slot + 1}: ${o.stock} apple${o.stock === 1 ? '' : 's'}${esc(next)}</span>
        <button type="button" class="farm-btn" data-orchard-harvest="${o.slot}" ${o.stock > 0 ? '' : 'disabled'}>Collect</button></div>`;
    }).join('');

    const watered = Math.min(tools.plotsPerWater || 1, growingUnwatered);
    container.innerHTML = `
      <div class="farm-panel" data-place="farm">
        <div class="farm-top">
          <span class="farm-title">Farm</span>
          <span class="farm-meta">${f.harvests || 0} harvests · ${ripe} ready</span>
        </div>
        <div class="farm-grid" role="group" aria-label="Plots">${plotButtons}</div>
        ${menu}
        <div class="farm-actions">
          <button type="button" class="farm-btn" data-harvest-all="1" ${ripe > 0 ? '' : 'disabled'}>Harvest all</button>
          <button type="button" class="farm-btn" data-water-all="1" ${watered > 0 ? '' : 'disabled'}>Water all${watered > 0 ? ' (' + watered + ')' : ''}</button>
        </div>
        <div class="farm-upgrades" role="group" aria-label="Upgrades">${upgrades}</div>
        <section class="farm-orchard" aria-label="Orchard"><div class="farm-section-title">Orchard</div>${orchard || '<p class="farm-empty">No orchard slots yet.</p>'}</section>
      </div>`;

    container.querySelectorAll('[data-plot-canvas]').forEach(cv => {
      const i = Number(cv.dataset.plotCanvas);
      drawPlot(cv, plots[i], cropOf(st, plots[i].cropId));
      applyAmbient(cv.getContext('2d'), 32, 32);
    });
    S.period = lightPeriod();
    ensureLights();

    container.querySelectorAll('.farm-plot').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.plot);
        const p = plots[i];
        if (!p) return;
        if (p.state === 'empty') {
          S.menuPlot = S.menuPlot === i ? null : i;
          render();
        } else if (p.state === 'growing') {
          if (!p.watered) send({ type: 'farm_water', plot: i });
        } else if (p.state === 'ripe') {
          send({ type: 'farm_harvest', plot: i });
        }
      });
    });
    container.querySelectorAll('[data-plant]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (S.menuPlot === null) return;
        send({ type: 'farm_plant', plot: S.menuPlot, cropId: btn.dataset.plant });
        S.menuPlot = null;
      });
    });
    const close = container.querySelector('[data-close]');
    if (close) close.addEventListener('click', () => { S.menuPlot = null; render(); });
    const harvestAll = container.querySelector('[data-harvest-all]');
    if (harvestAll) harvestAll.addEventListener('click', () => send({ type: 'farm_harvest_all' }));
    const waterAll = container.querySelector('[data-water-all]');
    if (waterAll) {
      waterAll.addEventListener('click', () => {
        // One message per plot, as many as the can allows; each is a click-equivalent action.
        plots.map((p, i) => ({ p, i })).filter(x => x.p.state === 'growing' && !x.p.watered)
          .slice(0, tools.plotsPerWater || 1)
          .forEach(x => send({ type: 'farm_water', plot: x.i }));
      });
    }
    container.querySelectorAll('[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'farm_buy', what: btn.dataset.buy }));
    });
    container.querySelectorAll('[data-orchard-plant]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'orchard_plant', slot: Number(btn.dataset.orchardPlant), cropId: 'apple' }));
    });
    container.querySelectorAll('[data-orchard-harvest]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'orchard_harvest', slot: Number(btn.dataset.orchardHarvest) }));
    });

    loadSheet();
  }

  function refreshPlots() {
    if (S.container && S.container.isConnected) render();
  }

  function rgbCss(rgb, alpha) {
    return 'rgba(' + Math.round(rgb[0]) + ', ' + Math.round(rgb[1]) + ', ' + Math.round(rgb[2]) + ', ' + (alpha == null ? 1 : alpha) + ')';
  }

  function lightPeriod() {
    return window.Lights ? window.Lights.periodOf(new Date()) : null;
  }

  // Loads lib/lights.js once (dynamic script, the page does not list it) and the light data once.
  function ensureLights() {
    if (!window.Lights && !document.querySelector('script[data-cuy-lights]')) {
      const s = document.createElement('script');
      s.src = 'lib/lights.js';
      s.dataset.cuyLights = '1';
      s.onload = () => refreshPlots();
      document.head.appendChild(s);
    }
    if (lightsRequested) return;
    lightsRequested = true;
    fetch(url('data/lights.json'))
      .then(r => (r.ok ? r.json() : null))
      .then(j => { lightsData = j; refreshPlots(); })
      .catch(() => { lightsData = null; });
  }

  // Ambient tint (multiply) over one plot canvas, crop included. No tint without the light data.
  function applyAmbient(ctx, w, h) {
    if (!window.Lights || !lightsData) return;
    const L = window.Lights;
    const amb = L.ambientFor(lightsData, lightPeriod());
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgbCss(L.tint([255, 255, 255], amb));
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function ensureStrip() {
    if (S.stripEl && S.stripEl.isConnected) return S.stripEl;
    const stage = document.querySelector('.stage-viewport');
    const anchor = document.getElementById('placesLockedHint') || document.getElementById('placesBar');
    if (!stage && (!anchor || !anchor.parentNode)) return null;
    const strip = document.createElement('div');
    strip.id = 'farmSceneStrip';
    strip.className = 'farm-scene-strip feature-farm';
    strip.hidden = true;
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', 'Farm quick actions');
    strip.innerHTML =
      '<button type="button" class="farm-btn farm-strip-btn" data-scene-harvest-all="1">Harvest all</button>' +
      '<button type="button" class="farm-btn farm-strip-btn" data-scene-water-all="1">Water all</button>';
    if (stage) {
      stage.appendChild(strip);
    } else {
      anchor.parentNode.insertBefore(strip, anchor.nextSibling);
    }
    strip.querySelector('[data-scene-harvest-all]').addEventListener('click', () => {
      send({ type: 'farm_harvest_all' });
    });
    strip.querySelector('[data-scene-water-all]').addEventListener('click', () => {
      const st = getState();
      if (!st || !st.farm) return;
      const plots = st.farm.plots || [];
      const limit = (st.farm.tools && st.farm.tools.plotsPerWater) || 1;
      plots.map((p, i) => ({ p, i }))
        .filter(x => x.p.state === 'growing' && !x.p.watered)
        .slice(0, limit)
        .forEach(x => send({ type: 'farm_water', plot: x.i }));
    });
    S.stripEl = strip;
    return strip;
  }

  function closeScenePanel() {
    S.scenePanel = null;
    if (S.overlayEl && S.overlayEl.parentNode) {
      S.overlayEl.parentNode.removeChild(S.overlayEl);
    }
    S.overlayEl = null;
  }

  function positionScenePanel(panel, rect) {
    const canvas = document.getElementById('pigCanvas');
    const cr = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 80, width: 256, height: 144 };
    const def = (window.CuyScenes && typeof window.CuyScenes.def === 'function') ? window.CuyScenes.def('farm') : null;
    const sw = (def && def.size && def.size[0]) || 256;
    const sh = (def && def.size && def.size[1]) || 144;
    const sx = cr.width / sw;
    const sy = cr.height / sh;
    const r = Array.isArray(rect) && rect.length >= 4 ? rect : [80, 40, 112, 72];

    let left = Math.round(cr.left + r[0] * sx);
    let top = Math.round(cr.top + r[3] * sy + 4);
    const pr = panel.getBoundingClientRect();
    if (top + pr.height > window.innerHeight - 4) {
      top = Math.round(cr.top + r[1] * sy - pr.height - 4);
    }
    left = Math.round(Math.max(4, Math.min(window.innerWidth - pr.width - 4, left)));
    top = Math.round(Math.max(4, Math.min(window.innerHeight - pr.height - 4, top)));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function renderScenePanel() {
    const spec = S.scenePanel;
    if (!spec || !isFarmScene()) {
      closeScenePanel();
      return;
    }
    const st = getState();
    if (!st || !st.farm || !st.farm.unlocked) {
      closeScenePanel();
      return;
    }
    const f = st.farm;
    const crops = f.crops || [];
    const plots = f.plots || [];
    const up = f.upgrades || {};
    const tools = f.tools || { plotsPerWater: 1 };
    const clovers = st.clovers || 0;

    if (!S.overlayEl || !S.overlayEl.isConnected) {
      const el = document.createElement('div');
      el.className = 'feature-farm';
      document.body.appendChild(el);
      S.overlayEl = el;
    }

    let html = '';
    if (spec.kind === 'tooltip') {
      const p = plots[spec.plot];
      if (!p || p.state !== 'growing') { closeScenePanel(); return; }
      const crop = cropOf(st, p.cropId);
      const name = crop ? crop.name : 'Crop';
      html = `<div class="farm-scene-tooltip" role="status">
        <span>${esc(name)} · ${fmt(p.secondsLeft)} left</span>
        <button type="button" class="farm-btn farm-close" data-scene-close="1">Close</button>
      </div>`;
    } else if (spec.kind === 'plant') {
      const p = plots[spec.plot];
      if (!p || p.state !== 'empty') { closeScenePanel(); return; }
      const rows = crops.map(c => {
        if (!c.unlocked) {
          const more = Math.max(0, c.unlockHarvests - (f.harvests || 0));
          return `<li class="farm-crop is-locked"><span class="pixel-icon icon-padlock" aria-hidden="true"></span> ${esc(c.name)}: ${more} more</li>`;
        }
        const owned = c.seedOwned || 0;
        return `<li class="farm-crop"><span class="farm-crop-name">${esc(c.name)}</span> <span class="farm-crop-meta">${owned} · ${c.growMinutes}m</span>
          <button type="button" class="farm-btn" data-plant="${esc(c.id)}" ${owned > 0 ? '' : 'disabled'}>Plant</button></li>`;
      }).join('');
      html = `<div class="farm-scene-panel" role="dialog" aria-label="Plant on plot ${spec.plot + 1}">
        <div class="farm-menu-head">Plot ${spec.plot + 1}<button type="button" class="farm-btn farm-close" data-scene-close="1">Close</button></div>
        <ul class="farm-crops">${rows}</ul>
      </div>`;
    } else if (spec.kind === 'orchard') {
      const slots = (f.orchard || []).map(o => {
        if (!o.cropId) {
          return `<div class="farm-slot"><span class="farm-slot-name">Slot ${o.slot + 1}</span>
            <button type="button" class="farm-btn" data-orchard-plant="${o.slot}">Plant sapling</button></div>`;
        }
        const next = o.stock < 5 && o.secondsToNext > 0 ? ' · ' + fmt(o.secondsToNext) : '';
        return `<div class="farm-slot"><span class="farm-slot-name">Slot ${o.slot + 1}: ${o.stock}${esc(next)}</span>
          <button type="button" class="farm-btn" data-orchard-harvest="${o.slot}" ${o.stock > 0 ? '' : 'disabled'}>Collect</button></div>`;
      }).join('');
      html = `<div class="farm-scene-panel" role="dialog" aria-label="Orchard">
        <div class="farm-menu-head">Orchard<button type="button" class="farm-btn farm-close" data-scene-close="1">Close</button></div>
        <div class="farm-scene-list">${slots || '<p class="farm-empty">No orchard slots yet.</p>'}</div>
      </div>`;
    } else if (spec.kind === 'shop') {
      const upgrade = (label, cost, what, disabledWhen) => {
        const can = cost !== null && cost !== undefined && clovers >= cost && !disabledWhen;
        const price = cost === null || cost === undefined ? 'Max' : cost + ' clovers';
        return `<button type="button" class="farm-btn farm-upgrade" data-buy="${what}" ${can ? '' : 'disabled'}>${esc(label)} · ${esc(price)}</button>`;
      };
      const items = [
        upgrade('Next plot pack', up.nextPackCost, 'pack', false),
        upgrade('Orchard slot', up.nextOrchardCost, 'orchard', false),
        upgrade('Better can', up.nextCanCost, 'can', false),
        upgrade('Sprinkler', up.sprinklerCost, 'sprinkler', !!tools.sprinkler)
      ].join('');
      html = `<div class="farm-scene-panel" role="dialog" aria-label="Farm shop">
        <div class="farm-menu-head">Farm shop<button type="button" class="farm-btn farm-close" data-scene-close="1">Close</button></div>
        <div class="farm-upgrades">${items}</div>
      </div>`;
    }

    S.overlayEl.innerHTML = html;
    const panel = S.overlayEl.firstElementChild;
    if (panel) positionScenePanel(panel, spec.rect);

    const closeBtn = S.overlayEl.querySelector('[data-scene-close]');
    if (closeBtn) closeBtn.addEventListener('click', closeScenePanel);
    S.overlayEl.querySelectorAll('[data-plant]').forEach(btn => {
      btn.addEventListener('click', () => {
        send({ type: 'farm_plant', plot: spec.plot, cropId: btn.dataset.plant });
        closeScenePanel();
      });
    });
    S.overlayEl.querySelectorAll('[data-orchard-plant]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'orchard_plant', slot: Number(btn.dataset.orchardPlant), cropId: 'apple' }));
    });
    S.overlayEl.querySelectorAll('[data-orchard-harvest]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'orchard_harvest', slot: Number(btn.dataset.orchardHarvest) }));
    });
    S.overlayEl.querySelectorAll('[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => send({ type: 'farm_buy', what: btn.dataset.buy }));
    });
  }

  function handleHotspot(hs) {
    if (!hs) return;
    const st = getState();
    if (!st || !st.farm || !st.farm.unlocked) return;
    const pm = String(hs.id || hs.uid || '').match(/(?:fx:farm:)?plot:(\d+)/);
    if (hs.kind === 'plot' || pm) {
      const idx = pm ? Number(pm[1]) : -1;
      const p = (st.farm.plots || [])[idx];
      if (!p) return;
      if (p.state === 'empty') {
        S.scenePanel = { kind: 'plant', plot: idx, rect: hs.rect };
        renderScenePanel();
      } else if (p.state === 'growing' && !p.watered) {
        closeScenePanel();
        send({ type: 'farm_water', plot: idx });
      } else if (p.state === 'ripe') {
        closeScenePanel();
        send({ type: 'farm_harvest', plot: idx });
      } else if (p.state === 'growing' && p.watered) {
        S.scenePanel = { kind: 'tooltip', plot: idx, rect: hs.rect };
        renderScenePanel();
      }
      return;
    }
    if (hs.kind === 'orchard' || hs.id === 'orchard') {
      S.scenePanel = { kind: 'orchard', rect: hs.rect };
      renderScenePanel();
      return;
    }
    if (hs.kind === 'shop' || hs.id === 'shop') {
      S.scenePanel = { kind: 'shop', rect: hs.rect };
      renderScenePanel();
    }
  }

  function syncSceneUI() {
    const strip = ensureStrip();
    const st = getState();
    const onFarm = isFarmScene();
    const unlocked = !!(st && st.farm && st.farm.unlocked);
    if (strip) {
      strip.hidden = !(onFarm && unlocked);
      if (onFarm && unlocked) {
        const plots = st.farm.plots || [];
        const tools = st.farm.tools || { plotsPerWater: 1 };
        const ripe = plots.filter(p => p.state === 'ripe').length;
        const dry = plots.filter(p => p.state === 'growing' && !p.watered).length;
        const watered = Math.min(tools.plotsPerWater || 1, dry);
        const hBtn = strip.querySelector('[data-scene-harvest-all]');
        const wBtn = strip.querySelector('[data-scene-water-all]');
        if (hBtn) hBtn.disabled = ripe === 0;
        if (wBtn) {
          wBtn.disabled = watered === 0;
          wBtn.textContent = watered > 0 ? 'Water all (' + watered + ')' : 'Water all';
        }
      }
    }
    if (!onFarm && S.scenePanel) closeScenePanel();
    else if (S.scenePanel) renderScenePanel();
  }

  function bindCanvasPig() {
    if (window.CanvasPig && typeof window.CanvasPig.onHotspot === 'function' && S.boundHotspotApi !== window.CanvasPig.onHotspot) {
      S.boundHotspotApi = window.CanvasPig.onHotspot;
      window.CanvasPig.onHotspot(handleHotspot);
    }
    const addLayerFn = (window.CanvasPig && typeof window.CanvasPig.addLayer === 'function')
      ? window.CanvasPig.addLayer
      : (window.CuyRoom && typeof window.CuyRoom.addLayer === 'function' ? window.CuyRoom.addLayer : null);
    if (addLayerFn && S.boundLayerApi !== addLayerFn) {
      S.boundLayerApi = addLayerFn;
      addLayerFn('farm_markers', 60, drawFarmMarkers);
    }
    if (!S.placeObserver && typeof MutationObserver !== 'undefined') {
      const title = document.getElementById('placesBarTitle');
      if (title) {
        S.placeObserver = new MutationObserver(() => syncSceneUI());
        S.placeObserver.observe(title, { childList: true, characterData: true, subtree: true });
      }
    }
  }

  window.CuyFarm = {
    handleHotspot,
    closePanel: closeScenePanel,
    drawMarkers: drawFarmMarkers,
    syncSceneUI
  };

  window.CuyHome.registerFeature({
    id: 'farm',
    title: 'Farm',
    icon: 'icon-place-farm',
    order: 60,
    alwaysOnState: true,
    open(container, api) {
      S.container = container;
      S.api = api;
      if (window.CuyPlaces) window.CuyPlaces.setCurrentPlace('farm');
      S.menuPlot = null;
      S.periodAt = Date.now();
      render();
      if (S.timer) clearInterval(S.timer);
      S.timer = setInterval(tick, 1000);
    },
    close() {
      S.container = null;
      if (S.timer) { clearInterval(S.timer); S.timer = null; }
    },
    onState(st) {
      if (st) S.lastState = st;
      bindCanvasPig();
      syncSceneUI();
      if (S.container && S.container.isConnected) render();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { bindCanvasPig(); syncSceneUI(); });
  } else {
    bindCanvasPig();
    syncSceneUI();
  }
})();
