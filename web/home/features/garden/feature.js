// Garden and park view (W20-04): decorate the garden and the park, send a pig for a walk, memory corner.
// Same state and messages as the room editor: rooms.layouts.garden / rooms.layouts.park and room_* with `place`.
// Placement is a small local copy (click to place, drag to move, right-click or Delete to remove, F flips).
(function () {
  'use strict';

  const CELL = 16;
  const PLACE_LABELS = { garden: 'Garden', park: 'Park' };
  const FLOOR_COLORS = {
    floor_grass: '#7fbf4a', floor_soil: '#9c6636', floor_stone: '#b8b0a3',
    floor_wood: '#e6b073', floor_straw: '#eedb7c', floor_fleece: '#f8eddd'
  };
  const GHOST_OK = 'rgba(127, 191, 74, 0.55)';
  const GHOST_BAD = 'rgba(232, 86, 76, 0.55)';

  const imageCache = {};
  let atlas = null;
  let atlasRequested = false;

  const S = {
    container: null,
    api: null,
    place: 'garden',
    selectedItem: null,
    selectedUid: null,
    cursor: { x: 0, y: 0 },
    drag: null,
    hover: null,
    scale: 1,
    canvas: null,
    hasFocus: false,
    unsubWalk: null,
    walkResult: null,
    walkPending: false,
    lockPending: null,
    layout: null,
    catalogById: {},
    pigs: [],
    memorial: [],
    period: null,         // time of day of the last render
    periodAt: 0,          // when the period was last checked (once a minute)
    animating: false,     // a lamp strip, flicker or dust runs: redraw on every frame tick
    lampToggles: {},      // placed item uid -> lamp on/off picked by the player (module memory only, no save)
    lightTimer: null
  };

  // Light and time of day (W32-02): time-of-day backgrounds, ambient tint, lamp glow, lamp strips and dust motes.
  // Engine: lib/lights.js (window.Lights); data: assets/data/lights.json. A missing lib, file or image means no light, no error.
  const LIGHT_PERIOD_MS = 60000;
  const LIGHT_FRAME_MS = 250;
  const DUST_ALPHA = 0.3;
  let lightsData = null;
  let lightsRequested = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function url(rel) {
    return S.api && S.api.assetUrl ? S.api.assetUrl(rel) : '../../assets/' + rel;
  }

  function loadImage(rel) {
    if (!imageCache[rel]) {
      const entry = { img: new Image(), ok: false, failed: false };
      entry.img.onload = () => { entry.ok = true; redraw(); };
      entry.img.onerror = () => { entry.failed = true; };
      entry.img.src = url(rel);
      imageCache[rel] = entry;
    }
    return imageCache[rel];
  }

  function loadAtlas() {
    if (atlasRequested) return;
    atlasRequested = true;
    fetch(url('world/atlas.json'))
      .then(r => (r.ok ? r.json() : null))
      .then(j => { atlas = j && j.items ? j : null; redraw(); })
      .catch(() => { atlas = null; });
  }


  function rgbCss(rgb, alpha) {
    return 'rgba(' + Math.round(rgb[0]) + ', ' + Math.round(rgb[1]) + ', ' + Math.round(rgb[2]) + ', ' + (alpha == null ? 1 : alpha) + ')';
  }

  function colourOf(c) {
    if (Array.isArray(c)) return [c[0], c[1], c[2]];
    const hex = String(c || '#ffffff').replace('#', '');
    return [parseInt(hex.slice(0, 2), 16) || 0, parseInt(hex.slice(2, 4), 16) || 0, parseInt(hex.slice(4, 6), 16) || 0];
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
      s.onload = () => redraw();
      document.head.appendChild(s);
    }
    if (lightsRequested) return;
    lightsRequested = true;
    fetch(url('data/lights.json'))
      .then(r => (r.ok ? r.json() : null))
      .then(j => { lightsData = j ? worldLights(j) : null; redraw(); })
      .catch(() => { lightsData = null; });
  }

  // lights.json paths are relative to assets/world/ (its contract); the loader works from assets/, so add the prefix here.
  function worldLights(j) {
    const w = p => (typeof p === 'string' ? 'world/' + p : p);
    const sources = {};
    Object.keys(j.sources || {}).forEach((k) => {
      const s = j.sources[k];
      const tods = s.window_tods ? Object.fromEntries(Object.entries(s.window_tods).map(([t, f]) => [t, w(f)])) : undefined;
      sources[k] = Object.assign({}, s, { file: w(s.file), on_file: w(s.on_file), mask: w(s.mask), window_tods: tods });
    });
    return Object.assign({}, j, { sources, dust: j.dust ? Object.assign({}, j.dust, { file: w(j.dust.file) }) : j.dust });
  }

  // A window has one sprite per time of day (window_tods); other lamps keep their file.
  function lampSource(s) {
    const p = lightPeriod();
    return s.window_tods && s.window_tods[p] ? Object.assign({}, s, { file: s.window_tods[p] }) : s;
  }

  // Edit mode (an item picked from the drawer, or an item being moved): no tint and no light.
  function isEditing() {
    return !!S.selectedItem || !!(S.drag && S.drag.moved);
  }

  // Lamps from lib/lights.js. Each placed item gets its own key (its uid), so every lamp keeps its own toggle.
  function activeLamps(layout) {
    const sources = lightsData.sources || {};
    const keyed = {};
    const placed = [];
    layout.items.forEach((it) => {
      const key = Object.keys(sources).find(id => id === it.itemId || sources[id].item === it.itemId);
      if (!key) return;
      keyed[it.uid] = lampSource(sources[key]);
      placed.push({ id: it.uid, x: it.x, y: it.y });
    });
    return window.Lights.activeSources(Object.assign({}, lightsData, { sources: keyed }), 'outdoor', placed, lightPeriod(), S.lampToggles);
  }

  // Light pass after the scene and before the UI overlays. Fire and lamp sources are outdoor sources.
  function drawLight(ctx, canvas, layout, cell, k) {
    S.animating = false;
    if (!window.Lights || !lightsData || isEditing()) return;
    const L = window.Lights;
    const amb = L.ambientFor(lightsData, lightPeriod());
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgbCss(L.tint([255, 255, 255], amb));
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const now = Date.now();
    const lit = [];
    activeLamps(layout).forEach((a, i) => {
      if (!a.on) return;
      const it = layout.items.find(x => x.uid === a.id);
      const def = it && S.catalogById[it.itemId];
      if (!def) return;
      const w = def.w * cell;
      const h = def.h * cell;
      const cx = a.x * cell + w / 2;
      const cy = a.y * cell + h / 2;
      const r = Math.max(1, (a.radiusCells || 2) * CELL * k);
      lit.push({ cx: cx, cy: cy });
      let alpha = a.strength == null ? 0.6 : a.strength;
      if (a.flicker) { alpha *= 0.85 + 0.15 * Math.sin(now / 160 + i); S.animating = true; }
      const mask = typeof a.mask === 'string' ? loadImage(a.mask) : null;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (mask && mask.ok) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(mask.img, cx - r, cy - r, 2 * r, 2 * r);
      } else {
        const c = colourOf(a.color);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, rgbCss(c, alpha));
        g.addColorStop(1, rgbCss(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      }
      ctx.restore();
      // Sprite strip: frames side by side, frame width = the item's atlas width, anchored like the item.
      // A lit lamp (evening, night or toggled on) shows its *_on strip; otherwise its one-frame base sprite.
      const onSheet = a.on && typeof a.on_file === 'string' ? loadImage(a.on_file) : null;
      const useOn = !!(onSheet && onSheet.ok);
      const sheet = useOn ? onSheet : (typeof a.file === 'string' ? loadImage(a.file) : null);
      const entry = atlas && atlas.items ? atlas.items[it.itemId] : null;
      const sw = entry && entry.size ? entry.size[0] : (sheet && sheet.ok ? sheet.img.naturalWidth : 0);
      if (sheet && sheet.ok && sw > 0) {
        const sh = sheet.img.naturalHeight;
        const frames = useOn ? (a.frames || 1) : Math.max(1, Math.floor(sheet.img.naturalWidth / sw));
        const idx = Math.floor((now / 1000) * (a.fps || 1)) % frames;
        const dw = sw * k;
        const dh = sh * k;
        ctx.drawImage(sheet.img, idx * sw, 0, sw, sh, a.x * cell + (w - dw) / 2, a.y * cell + h - dh, dw, dh);
        if (frames > 1) S.animating = true;
      }
    });

    // Dust motes: the lights.dust strip around each lit lamp, at low opacity
    const dust = lightsData.dust && typeof lightsData.dust.file === 'string' ? lightsData.dust : null;
    const dustSheet = dust ? loadImage(dust.file) : null;
    if (dustSheet && dustSheet.ok && lit.length) {
      const frames = dust.frames || 1;
      const fw = Math.floor(dustSheet.img.naturalWidth / frames);
      const fh = dustSheet.img.naturalHeight;
      if (fw > 0) {
        const idx = Math.floor((now / 1000) * (dust.fps || 1)) % frames;
        ctx.save();
        ctx.globalAlpha = DUST_ALPHA;
        lit.forEach(p => ctx.drawImage(dustSheet.img, idx * fw, 0, fw, fh, p.cx - fw * k / 2, p.cy - fh * k / 2, fw * k, fh * k));
        ctx.restore();
        if (frames > 1) S.animating = true;
      }
    }
  }

  // Play mode: a click on a lamp toggles it. The choice stays in S.lampToggles (module memory, no save).
  function toggleLamp(uid) {
    if (!window.Lights || !lightsData || !S.layout) return;
    const lamp = activeLamps(S.layout).find(a => a.id === uid);
    if (!lamp) return;
    S.lampToggles[uid] = !lamp.on;
    redraw();
  }

  // Once a minute the period is checked and the view is rendered again when it changed; animated lamps redraw each tick.
  function lightTick() {
    if (!S.container || !S.container.isConnected) return;
    if (Date.now() - S.periodAt >= LIGHT_PERIOD_MS) {
      S.periodAt = Date.now();
      if (lightPeriod() !== S.period) { render(); return; }
    }
    if (S.animating) redraw();
  }

  function redraw() {
    if (S.canvas && S.canvas.isConnected && S.layout) drawGrid(S.canvas, S.layout);
  }

  function spotProblem(layout, def, x, y, ignoreUid) {
    if (x < 0 || y < 0 || x + def.w > layout.cols || y + def.h > layout.rows) return 'outside';
    for (const it of layout.items) {
      if (it.uid === ignoreUid) continue;
      const od = S.catalogById[it.itemId];
      if (!od) continue;
      if (x < it.x + od.w && it.x < x + def.w && y < it.y + od.h && it.y < y + def.h) return 'overlap';
    }
    return null;
  }

  function itemAt(layout, cx, cy) {
    for (let i = layout.items.length - 1; i >= 0; i--) {
      const it = layout.items[i];
      const d = S.catalogById[it.itemId];
      if (!d) continue;
      if (cx >= it.x && cx < it.x + d.w && cy >= it.y && cy < it.y + d.h) return it;
    }
    return null;
  }

  function inBounds(layout, c) { return c.x >= 0 && c.y >= 0 && c.x < layout.cols && c.y < layout.rows; }

  function cellFromEvent(e) {
    const rect = S.canvas.getBoundingClientRect();
    const cell = CELL * S.scale;
    return {
      x: Math.floor((e.clientX - rect.left) * (S.canvas.width / rect.width) / cell),
      y: Math.floor((e.clientY - rect.top) * (S.canvas.height / rect.height) / cell)
    };
  }

  // Sky colours follow the local hour; the pig's own clock is not used.
  function skyFor(hour) {
    if (hour >= 5 && hour < 10) return ['#bfe6ff', '#fff1c9'];
    if (hour >= 10 && hour < 17) return ['#8fd3ff', '#e8f8ff'];
    if (hour >= 17 && hour < 20) return ['#f7a66b', '#ffd9a8'];
    return ['#2e3557', '#4a5480'];
  }

  // Floor and wall sprites from assets/world/tiles.json (16x16, one per cell). The colour stays the fallback until they load.
  let tileMap = null;
  let tilesRequested = false;
  function ensureTiles() {
    if (tilesRequested) return;
    tilesRequested = true;
    fetch(url('world/tiles.json'))
      .then(r => (r.ok ? r.json() : null))
      .then(j => { tileMap = j && j.tiles ? j.tiles : null; redraw(); })
      .catch(() => { tileMap = null; });
  }
  function tileImg(id) {
    const e = tileMap && tileMap[id];
    if (!e) return null;
    const t = loadImage('world/' + e.file);
    return t.ok ? t.img : null;
  }

  function drawGrid(canvas, layout) {
    ensureTiles();
    const ctx = canvas.getContext('2d');
    const k = S.scale;
    const cell = CELL * k;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sky = skyFor(new Date().getHours());
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, sky[0]);
    g.addColorStop(1, sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Time-of-day background (garden_<period>.png or park_<period>.png); with it the floor tiles are see-through
    const bg = loadImage('world/bg/' + (S.place === 'park' ? 'park' : 'garden') + '_' + (lightPeriod() || 'day') + '.png');
    if (bg.ok) ctx.drawImage(bg.img, 0, 0, canvas.width, canvas.height);

    const base = FLOOR_COLORS[layout.floor] || FLOOR_COLORS.floor_grass;
    const ft = tileImg(layout.floor);
    for (let y = 0; y < layout.rows; y++) {
      for (let x = 0; x < layout.cols; x++) {
        ctx.globalAlpha = bg.ok ? 0.35 : 0.9;
        if (ft) { ctx.drawImage(ft, x * cell, y * cell, cell, cell); continue; }
        ctx.fillStyle = base;
        ctx.fillRect(x * cell, y * cell, cell, cell);
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
    ctx.globalAlpha = 1;

    layout.items.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)).forEach(it => drawItem(ctx, it, cell, k));

    (S.pigs || []).forEach(p => {
      const cx = p.x * cell + cell / 2;
      const cy = p.y * cell + cell / 2;
      ctx.fillStyle = '#e98c42';
      ctx.beginPath();
      ctx.arc(cx, cy, cell / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b1712';
      ctx.font = (8 * k) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(p.name || '', cx, cy + cell / 2);
    });

    // Light pass (not in edit mode)
    drawLight(ctx, canvas, layout, cell, k);

    const sel = S.selectedUid && layout.items.find(i => i.uid === S.selectedUid);
    if (sel) {
      const d = S.catalogById[sel.itemId];
      if (d) {
        ctx.strokeStyle = '#eedb7c';
        ctx.lineWidth = Math.max(1, k);
        ctx.strokeRect(sel.x * cell + 0.5, sel.y * cell + 0.5, d.w * cell - 1, d.h * cell - 1);
      }
    }

    let ghost = null;
    if (S.drag && S.drag.moved) ghost = { def: S.catalogById[S.drag.itemId], x: S.drag.x, y: S.drag.y, ignore: S.drag.uid };
    else if (S.selectedItem && S.hover) ghost = { def: S.catalogById[S.selectedItem], x: S.hover.x, y: S.hover.y, ignore: null };
    if (ghost && ghost.def) {
      const bad = spotProblem(layout, ghost.def, ghost.x, ghost.y, ghost.ignore);
      ctx.fillStyle = bad ? GHOST_BAD : GHOST_OK;
      ctx.fillRect(ghost.x * cell, ghost.y * cell, ghost.def.w * cell, ghost.def.h * cell);
    }

    if (S.hasFocus) {
      ctx.strokeStyle = '#4f8f35';
      ctx.lineWidth = Math.max(1, k);
      ctx.strokeRect(S.cursor.x * cell + 0.5, S.cursor.y * cell + 0.5, cell - 1, cell - 1);
    }
  }

  function drawItem(ctx, it, cell, k) {
    const d = S.catalogById[it.itemId];
    if (!d) return;
    const w = d.w * cell;
    const h = d.h * cell;
    const x = it.x * cell;
    const y = it.y * cell;
    const entry = atlas && atlas.items ? atlas.items[it.itemId] : null;
    if (entry && entry.file) {
      const img = loadImage('world/' + entry.file);
      if (img.ok) {
        const sw = entry.size[0];
        const sh = entry.size[1];
        const dw = sw * k;
        const dh = sh * k;
        const dx = x + (w - dw) / 2;
        const dy = y + h - dh;
        ctx.save();
        if (it.flip) {
          ctx.translate(dx + dw, dy);
          ctx.scale(-1, 1);
          ctx.drawImage(img.img, 0, 0, sw, sh, 0, 0, dw, dh);
        } else {
          ctx.drawImage(img.img, 0, 0, sw, sh, dx, dy, dw, dh);
        }
        ctx.restore();
        return;
      }
    }
    ctx.fillStyle = colorFor(it.itemId);
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#3a1d17';
    ctx.font = (9 * k) + 'px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(it.itemId.split('_').map(p => p[0] || '').join('').slice(0, 2).toUpperCase(), x + w / 2, y + h / 2);
  }

  function colorFor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
    return 'hsl(' + h + ', 55%, 70%)';
  }

  function send(msg) { if (S.api && S.api.send) S.api.send(msg); }

  function placeAt(x, y) {
    if (!S.selectedItem) return;
    send({ type: 'room_place', place: S.place, itemId: S.selectedItem, x: x, y: y });
  }

  function bindCanvas(canvas) {
    canvas.addEventListener('focus', () => { S.hasFocus = true; redraw(); });
    canvas.addEventListener('blur', () => { S.hasFocus = false; redraw(); });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const layout = S.layout;
      const c = cellFromEvent(e);
      if (!inBounds(layout, c)) return;
      S.cursor = c;
      const hit = itemAt(layout, c.x, c.y);
      if (hit) {
        S.selectedUid = hit.uid;
        S.selectedItem = null;
        S.drag = { uid: hit.uid, itemId: hit.itemId, offX: c.x - hit.x, offY: c.y - hit.y, moved: false, x: hit.x, y: hit.y, start: { x: hit.x, y: hit.y } };
        canvas.setPointerCapture(e.pointerId);
      } else {
        S.drag = null;
        if (S.selectedItem) placeAt(c.x, c.y);
        else S.selectedUid = null;
      }
      redraw();
    });

    canvas.addEventListener('pointermove', (e) => {
      const c = cellFromEvent(e);
      if (S.drag) {
        const nx = c.x - S.drag.offX;
        const ny = c.y - S.drag.offY;
        if (nx !== S.drag.x || ny !== S.drag.y) {
          S.drag.x = nx; S.drag.y = ny;
          S.drag.moved = S.drag.moved || (nx !== S.drag.start.x || ny !== S.drag.start.y);
          redraw();
        }
      } else if (S.selectedItem && inBounds(S.layout, c)) {
        S.hover = c;
        redraw();
      }
    });

    canvas.addEventListener('pointerup', () => {
      const drag = S.drag;
      S.drag = null;
      if (drag && !drag.moved && !S.selectedItem) { toggleLamp(drag.uid); return; }
      if (drag && drag.moved) {
        const def = S.catalogById[drag.itemId];
        if (def && !spotProblem(S.layout, def, drag.x, drag.y, drag.uid)) {
          send({ type: 'room_move', place: S.place, uid: drag.uid, x: drag.x, y: drag.y });
        }
      }
      redraw();
    });

    canvas.addEventListener('pointerleave', () => { S.hover = null; redraw(); });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const c = cellFromEvent(e);
      const hit = itemAt(S.layout, c.x, c.y);
      if (hit) send({ type: 'room_remove', place: S.place, uid: hit.uid });
    });

    canvas.addEventListener('keydown', (e) => {
      const layout = S.layout;
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (moves[e.key]) {
        e.preventDefault();
        const [dx, dy] = moves[e.key];
        S.cursor = { x: Math.min(layout.cols - 1, Math.max(0, S.cursor.x + dx)), y: Math.min(layout.rows - 1, Math.max(0, S.cursor.y + dy)) };
        if (S.selectedItem) S.hover = S.cursor;
        redraw();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (S.selectedItem) {
          placeAt(S.cursor.x, S.cursor.y);
        } else {
          const hit = itemAt(layout, S.cursor.x, S.cursor.y);
          S.selectedUid = hit ? hit.uid : null;
          redraw();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (S.selectedUid) send({ type: 'room_remove', place: S.place, uid: S.selectedUid });
      } else if (e.key === 'f' || e.key === 'F') {
        if (S.selectedUid) send({ type: 'room_flip', place: S.place, uid: S.selectedUid });
      } else if (e.key === 'Escape') {
        S.selectedItem = null; S.selectedUid = null; S.hover = null;
        render();
      }
    });
  }

  function placeState(st, id) {
    return ((st.places && st.places.places) || []).find(p => p.id === id) || null;
  }

  // The walk scene art (assets/world/walk_scenes.*) is not in the repo yet, so the panel shows text and a sky gradient.
  function renderWalkPanel() {
    const box = S.container && S.container.querySelector('.garden-walk');
    if (!box) return;
    const r = S.walkResult;
    let text = 'Send a pig for a walk to find something new.';
    if (S.walkPending) text = 'Walk sent.';
    else if (r && r.text) text = r.text;
    box.innerHTML = `
      <div class="garden-walk-scene" aria-hidden="true"><span class="garden-walk-fallback">Sky and grass</span></div>
      <p class="garden-walk-text" aria-live="polite">${esc(text)}</p>`;
  }

  function render() {
    const container = S.container;
    if (!container) return;
    const st = S.api.getState();
    const hadFocus = !!(S.canvas && document.activeElement === S.canvas);
    container.dataset.place = S.place;
    container.setAttribute('data-place', S.place);
    if (!st || !st.rooms || !st.rooms.layouts) {
      container.innerHTML = '<p class="garden-empty">Loading the garden…</p>';
      S.canvas = null;
      return;
    }
    S.catalogById = {};
    (st.rooms.catalog || []).forEach(c => { S.catalogById[c.id] = c; });
    S.pigs = (Array.isArray(st.rooms.pigs) ? st.rooms.pigs : []).filter(p => p.place === S.place || !p.place);
    S.memorial = (st.pigs && Array.isArray(st.pigs.roster) ? st.pigs.roster : (Array.isArray(st.roster) ? st.roster : []))
      .filter(p => p && p.memorial && p.name);

    const place = placeState(st, S.place);
    const unlocked = !place || place.unlocked;
    const tabs = ['garden', 'park'].map(id => {
      const p = placeState(st, id);
      const locked = p ? !p.unlocked : false;
      const cur = id === S.place;
      const label = PLACE_LABELS[id] + (locked ? ' 🔒 ' + p.unlockCost : '');
      return `<button type="button" role="tab" class="garden-tab${cur ? ' is-current' : ''}" aria-selected="${cur}" data-tab="${id}">${esc(label)}</button>`;
    }).join('');

    let body;
    if (!unlocked) {
      const cost = place.unlockCost;
      const pending = S.lockPending === S.place;
      body = `<div class="garden-locked">
        <p>${esc(PLACE_LABELS[S.place])} is still closed.</p>
        <button type="button" class="garden-unlock" data-unlock="${S.place}">${pending ? 'Tap again to open for ' + cost : 'Open for ' + cost + ' clovers'}</button>
      </div>`;
    } else {
      const layout = st.rooms.layouts[S.place];
      if (!layout) {
        body = '<p class="garden-empty">This place is not built yet.</p>';
      } else {
        S.layout = layout;
        const avail = Math.max(160, (container.clientWidth || 360) - 24);
        S.scale = avail >= layout.cols * CELL * 2 ? 2 : 1;
        const w = layout.cols * CELL * S.scale;
        const h = layout.rows * CELL * S.scale;
        const drawer = (st.rooms.catalog || []).filter(c => c.owned && (c.places || []).indexOf(S.place) >= 0);
        const items = drawer.map(c => {
          const free = c.repeatable || c.placed === 0;
          const pressed = S.selectedItem === c.id;
          return `<button type="button" class="garden-item${pressed ? ' is-picked' : ''}" data-item="${esc(c.id)}" aria-pressed="${pressed}" ${free ? '' : 'disabled'} aria-label="${esc(c.name)}, ${c.placed} placed${free ? '' : ', all in use'}">${esc(c.name)} <span class="garden-item-meta">${c.placed} placed</span></button>`;
        }).join('') || '<p class="garden-empty">Nothing owned for this place yet. Buy decorations in the Market.</p>';
        body = `
          <canvas class="garden-canvas" width="${w}" height="${h}" style="width:${w}px;height:${h}px" tabindex="0"
            aria-label="${esc(PLACE_LABELS[S.place])} grid. Arrow keys move the cursor. Enter places the picked item or picks one up. F flips, Delete removes."></canvas>
          <p class="garden-hint">${S.selectedItem ? 'Click a cell to place the item. Esc cancels.' : 'Pick a decoration below, or drag one to move it. Right-click or Delete removes. F flips.'}</p>
          <div class="garden-drawer" role="group" aria-label="Owned decorations">${items}</div>`;
      }
    }

    const memorial = S.memorial.length
      ? S.memorial.map(p => `<span class="garden-stone-name">${esc(p.name)}</span>`).join('')
      : '<span class="garden-stone-empty">No memorial pigs yet</span>';

    const arrows = window.CuyPlaces ? window.CuyPlaces.renderArrowsHtml(S.place) : '';
    container.innerHTML = `
      <div class="garden-panel" data-place="${esc(S.place)}">
        ${arrows}
        ${body}
        <div class="garden-walk" aria-label="Walks"></div>
        <button type="button" class="garden-walk-btn" ${unlocked ? '' : 'disabled'}>Go for a walk</button>
        <section class="garden-memory" aria-label="Memory corner">
          <div class="garden-memory-title">Memory corner</div>
          <div class="garden-stone">${memorial}</div>
        </section>
      </div>`;
    if (window.CuyPlaces) window.CuyPlaces.bindArrows(container);

    S.canvas = container.querySelector('.garden-canvas');
    S.hasFocus = hadFocus;
    if (S.canvas) {
      if (hadFocus) S.canvas.focus({ preventScroll: true });
      bindCanvas(S.canvas);
      S.period = lightPeriod();
      ensureLights();
      loadAtlas();
      drawGrid(S.canvas, S.layout);
    }

    container.querySelectorAll('.garden-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        S.place = btn.dataset.tab;
        S.lockPending = null;
        S.selectedItem = null; S.selectedUid = null;
        render();
      });
    });
    container.querySelectorAll('.garden-item').forEach(btn => {
      btn.addEventListener('click', () => {
        S.selectedItem = S.selectedItem === btn.dataset.item ? null : btn.dataset.item;
        S.selectedUid = null;
        render();
      });
    });
    const unlockBtn = container.querySelector('.garden-unlock');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', () => {
        if (S.lockPending !== S.place) { S.lockPending = S.place; render(); return; }
        S.lockPending = null;
        send({ type: 'place_unlock', id: S.place });
      });
    }
    const walkBtn = container.querySelector('.garden-walk-btn');
    if (walkBtn) {
      walkBtn.addEventListener('click', () => {
        S.walkPending = true;
        S.walkResult = null;
        send({ type: 'walk', place: S.place });
        renderWalkPanel();
      });
    }
    renderWalkPanel();
  }

  window.CuyHome.registerFeature({
    id: 'garden',
    title: 'Garden',
    icon: 'icon-place-garden',
    order: 50,
    open(container, api, arg) {
      S.container = container;
      S.api = api;
      S.place = PLACE_LABELS[arg] ? arg : 'garden';
      if (window.CuyPlaces) window.CuyPlaces.setCurrentPlace(S.place);
      S.selectedItem = null;
      S.selectedUid = null;
      S.drag = null;
      S.hover = null;
      S.walkPending = false;
      S.walkResult = null;
      S.periodAt = Date.now();
      if (S.lightTimer) clearInterval(S.lightTimer);
      S.lightTimer = setInterval(lightTick, LIGHT_FRAME_MS);
      if (S.unsubWalk) S.unsubWalk();
      S.unsubWalk = api.onMessage('walk_result', (m) => {
        S.walkPending = false;
        S.walkResult = m;
        renderWalkPanel();
      });
      render();
    },
    close() {
      S.container = null;
      S.canvas = null;
      S.drag = null;
      if (S.unsubWalk) { S.unsubWalk(); S.unsubWalk = null; }
      if (S.lightTimer) { clearInterval(S.lightTimer); S.lightTimer = null; }
    },
    onState() {
      if (S.container && S.container.isConnected) render();
    }
  });
})();
