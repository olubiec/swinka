// Room editor (W20-02, tabs and level-up W25-04): place, move, flip and remove items on a grid.
// State: rooms.layouts[roomId], rooms.catalog[], rooms.pigRooms[]. Messages: room_place, room_move, room_flip, room_remove, place_upgrade.
// Room ids: 'salon', 'garden', 'park' (shared) and 'pig:<pigId>' (one per pig, from rooms.pigRooms).
// The server decides every placement; the ghost colour uses a local copy of the rules only as a hint.
// Dispatches document 'room-select' (detail: { uid }) when the picked item changes; customize.js listens to it.
// W26-07: shared bedroom tab (room id 'dorm', layout 'dorm'), panel from dorm.js (window.DormPanel), loaded on demand.
(function () {
  'use strict';

  const CELL = 16;
  const DORM_ID = 'dorm';
  const PLACE_LABELS = { salon: 'Living room', garden: 'Garden', park: 'Park', dorm: 'Shared bedroom' };
  const PIG_PREFIX = 'pig:';
  let dormRequested = false;
  let customizeRequested = false;
  const FLOOR_COLORS = {
    floor_wood: '#e6b073', floor_straw: '#eedb7c', floor_fleece: '#f8eddd',
    floor_grass: '#7fbf4a', floor_soil: '#9c6636', floor_stone: '#b8b0a3'
  };
  const WALL_FILL = '#fffdf8';
  const WALL_TRIM = '#c98d50';
  const GHOST_OK = 'rgba(127, 191, 74, 0.55)';
  const GHOST_BAD = 'rgba(232, 86, 76, 0.55)';

  // Sprites are loaded lazily. A missing file is remembered and the colour block is drawn instead.
  const imageCache = {};
  let atlas = null;
  let atlasRequested = false;

  const S = {
    container: null,
    api: null,
    place: 'salon',
    selectedItem: null,   // catalog id picked in the drawer
    selectedUid: null,    // placed item picked on the grid
    cursor: { x: 0, y: 0 },
    drag: null,           // { uid, offX, offY, moved, x, y }
    hover: null,          // { x, y } for the ghost preview
    scale: 1,
    canvas: null,
    period: null,         // time of day of the last render
    periodAt: 0,          // when the period was last checked (once a minute)
    animating: false,     // a lamp strip or flicker runs: redraw on every frame tick
    lampToggles: {},      // placed item uid -> lamp on/off picked by the player (module memory only, no save)
    lightTimer: null
  };

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

  // Light and time of day (W32-01): ambient tint, lamp glow and lamp sprite strips.
  // Engine: lib/lights.js (window.Lights); data: assets/data/lights.json. A missing lib, file or image means no light, no error.
  const LIGHT_PERIOD_MS = 60000;
  const LIGHT_FRAME_MS = 250;
  let lightsData = null;
  let lightsRequested = false;


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
    return window.Lights.activeSources(Object.assign({}, lightsData, { sources: keyed }), 'indoor', placed, lightPeriod(), S.lampToggles);
  }

  // Light pass after the scene and before the UI overlays.
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
    if (S.canvas && S.canvas.isConnected && S.layout) drawGrid(S.canvas, S.layout, S.pigs || []);
  }

  function findDef(st, id) {
    return ((st.rooms && st.rooms.catalog) || []).find(c => c.id === id) || null;
  }

  function isPigRoom(id) {
    return typeof id === 'string' && id.indexOf(PIG_PREFIX) === 0;
  }

  // Pig rooms sell the living room catalogue; so does the shared bedroom.
  function saleKeyOf(place) {
    return isPigRoom(place) || place === DORM_ID ? 'salon' : place;
  }

  function dormOf(st) { return (st && st.dorm) || {}; }

  function residentsOf(st) {
    const r = dormOf(st).residents;
    return Array.isArray(r) ? r : [];
  }

  // A pig who lives in the shared bedroom has no room of its own on the page: its tab opens the dorm.
  function residentRoom(st, id) {
    return isPigRoom(id) && residentsOf(st).indexOf(id.slice(PIG_PREFIX.length)) >= 0;
  }

  function dormReady(st) {
    return !!dormOf(st).unlocked && residentsOf(st).length > 0 && !!(st.rooms && st.rooms.layouts && st.rooms.layouts[DORM_ID]);
  }

  function pigRoomOf(st, id) {
    return ((st && st.rooms && st.rooms.pigRooms) || []).find(r => r && r.roomId === id) || null;
  }

  function labelOf(st, id) {
    if (PLACE_LABELS[id]) return PLACE_LABELS[id];
    const pr = pigRoomOf(st, id);
    return pr && pr.displayName ? pr.displayName : String(id);
  }

  function resolvePlace(st, want) {
    if (PLACE_LABELS[want]) return want;
    if (st && st.rooms && st.rooms.layouts && st.rooms.layouts[want]) return want;
    if (isPigRoom(want) && st && st.rooms && st.rooms.layouts && st.rooms.layouts[want]) return residentRoom(st, want) ? DORM_ID : want;
    return 'salon';
  }

  // Tabs: shared rooms first (garden and park once unlocked), then one tab per pig room, then the shared bedroom.
  function tabsOf(st) {
    const tabs = [{ id: 'salon', label: PLACE_LABELS.salon, portrait: null, memorial: false }];
    ((st.rooms && st.rooms.pigRooms) || []).forEach((r) => {
      if (!r || r.adopted === false) return;
      tabs.push({ id: r.roomId, label: r.displayName || r.roomId, portrait: r.portrait || null, memorial: !!r.memorial,
        badge: residentRoom(st, r.roomId) ? 'moved in' : '' });
    });
    const dorm = dormOf(st);
    const locked = !dorm.unlocked;
    tabs.push({ id: DORM_ID, label: PLACE_LABELS[DORM_ID], portrait: null, memorial: false,
      price: locked && dorm.unlockCost != null ? dorm.unlockCost : null });
    return tabs;
  }

  function tabsHtmlOf(tabs) {
    return tabs.map((t) => {
      const sel = t.id === S.place;
      const portrait = t.portrait
        ? `<img class="room-tab-portrait" src="../../assets/sprites/portraits/${esc(t.portrait)}.png" width="24" height="24" alt="" onerror="this.style.visibility='hidden'">`
        : '';
      const candle = t.memorial ? '<span class="pixel-icon icon-candle" aria-hidden="true"></span>' : '';
      const badge = t.badge ? `<span class="room-tab-badge">${esc(t.badge)}</span>` : '';
      const price = t.price != null ? `<span class="room-tab-price">${esc(t.price)} clovers</span>` : '';
      return `<button type="button" role="tab" class="room-tab${sel ? ' is-selected' : ''}${t.memorial ? ' is-memorial' : ''}" data-room="${esc(t.id)}" aria-selected="${sel}" tabindex="${sel ? '0' : '-1'}">` +
        `${portrait}${candle}<span class="room-tab-label">${esc(t.label)}</span>${badge}${price}</button>`;
    }).join('');
  }

  // The DormPanel script is loaded once, on demand; the page is drawn again when it arrives.
  function loadDormPanel() {
    if (dormRequested || window.DormPanel) return;
    dormRequested = true;
    const s = document.createElement('script');
    s.src = 'features/rooms/dorm.js';
    s.onload = () => { if (S.container && S.container.isConnected) render(); };
    document.head.appendChild(s);
  }

  // Shows the panel in the slot above the canvas (dorm only).
  function mountDorm(container, st) {
    const slot = container.querySelector('.room-dorm');
    if (!slot) return;
    if (window.DormPanel && typeof window.DormPanel.mount === 'function') {
      window.DormPanel.mount(slot, { state: st, send: send });
    } else {
      loadDormPanel();
    }
  }

  // Locked or empty shared bedroom: the panel and the tabs, no canvas.
  function renderDormWithoutRoom(container, st, tabs) {
    S.canvas = null;
    container.dataset.place = 'house';
    container.setAttribute('data-place', 'house');
    container.innerHTML = `
      <div class="room-panel" data-place="house">
        <div class="room-tabs" role="tablist" aria-label="Rooms">${tabsHtmlOf(tabs)}</div>
        <div class="room-dorm"></div>
        <p class="room-hint">${dormOf(st).unlocked ? 'Move a pig in above to use the shared bedroom.' : ''}</p>
        <p class="room-status" aria-live="polite"></p>
      </div>`;
    bindTabs(container, tabs);
    mountDorm(container, st);
  }

  // The customize panel (customize.js + customize.css) is loaded once, on demand; the page is drawn again when it arrives.
  function loadCustomizePanel() {
    if (!document.querySelector('link[data-room-customize]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'features/rooms/customize.css';
      l.dataset.roomCustomize = '1';
      document.head.appendChild(l);
    }
    if (customizeRequested || window.RoomCustomize) return;
    customizeRequested = true;
    const s = document.createElement('script');
    s.src = 'features/rooms/customize.js';
    s.onload = () => {
      // Re-announce the picked item so the panel knows which one is selected
      if (S.selectedUid) document.dispatchEvent(new CustomEvent('room-select', { detail: { uid: S.selectedUid } }));
      if (S.container && S.container.isConnected) render();
    };
    document.head.appendChild(s);
  }

  function setSelectedUid(uid) {
    S.selectedUid = uid;
    document.dispatchEvent(new CustomEvent('room-select', { detail: { uid: uid } }));
  }

  // Local copy of the placement rules (hint only).
  function spotProblem(layout, def, x, y, ignoreUid) {
    if (x < 0 || y < 0 || x + def.w > layout.cols || y + def.h > layout.rows) return 'outside';
    if (def.layer === 'wall' && y + def.h > layout.wallRows) return 'not-wall';
    if (def.layer === 'floor' && y < layout.wallRows) return 'not-floor';
    const defs = S.catalogById || {};
    for (const it of layout.items) {
      if (it.uid === ignoreUid) continue;
      const od = defs[it.itemId];
      if (!od || od.layer !== def.layer) continue;
      if (x < it.x + od.w && it.x < x + def.w && y < it.y + od.h && it.y < y + def.h) return 'overlap';
    }
    return null;
  }

  function itemAt(layout, cx, cy) {
    const defs = S.catalogById || {};
    for (let i = layout.items.length - 1; i >= 0; i--) {
      const it = layout.items[i];
      const d = defs[it.itemId];
      if (!d) continue;
      if (cx >= it.x && cx < it.x + d.w && cy >= it.y && cy < it.y + d.h) return it;
    }
    return null;
  }

  function cellFromEvent(e) {
    const rect = S.canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (S.canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (S.canvas.height / rect.height);
    const cell = CELL * S.scale;
    return { x: Math.floor(px / cell), y: Math.floor(py / cell) };
  }

  function inBounds(layout, c) { return c.x >= 0 && c.y >= 0 && c.x < layout.cols && c.y < layout.rows; }

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

  function drawGrid(canvas, layout, pigs) {
    ensureTiles();
    const ctx = canvas.getContext('2d');
    const k = S.scale;
    const cell = CELL * k;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Walls and floor
    for (let y = 0; y < layout.rows; y++) {
      for (let x = 0; x < layout.cols; x++) {
        if (y < layout.wallRows) {
          const wt = tileImg(layout.wallpaper);
          if (wt) ctx.drawImage(wt, x * cell, y * cell, cell, cell);
          else { ctx.fillStyle = WALL_FILL; ctx.fillRect(x * cell, y * cell, cell, cell); }
          if (y === layout.wallRows - 1) {
            ctx.fillStyle = WALL_TRIM;
            ctx.fillRect(x * cell, y * cell + cell - 2 * k, cell, 2 * k);
          }
        } else if (tileImg(layout.floor)) {
          ctx.drawImage(tileImg(layout.floor), x * cell, y * cell, cell, cell);
        } else {
          const base = FLOOR_COLORS[layout.floor] || FLOOR_COLORS.floor_wood;
          ctx.fillStyle = base;
          ctx.fillRect(x * cell, y * cell, cell, cell);
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(x * cell, y * cell, cell, cell);
          }
        }
      }
    }

    // Floor items first, sorted by row, so the front ones cover the back ones
    const sorted = layout.items.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const walls = sorted.filter(it => (S.catalogById[it.itemId] || {}).layer === 'wall');
    const floors = sorted.filter(it => (S.catalogById[it.itemId] || {}).layer !== 'wall');
    walls.forEach(it => drawItem(ctx, it, cell, k));
    floors.forEach(it => drawItem(ctx, it, cell, k));

    // Pigs (optional state list, none in Cuy.Core yet)
    pigs.forEach(p => drawPig(ctx, p, cell, k));

    // Light pass (not in edit mode)
    drawLight(ctx, canvas, layout, cell, k);

    // Selection outline
    const sel = S.selectedUid && layout.items.find(i => i.uid === S.selectedUid);
    if (sel) {
      const d = S.catalogById[sel.itemId];
      if (d) {
        ctx.strokeStyle = '#eedb7c';
        ctx.lineWidth = Math.max(1, k);
        ctx.strokeRect(sel.x * cell + 0.5, sel.y * cell + 0.5, d.w * cell - 1, d.h * cell - 1);
      }
    }

    // Ghost preview: dragged item or the item picked in the drawer
    let ghost = null;
    if (S.drag && S.drag.moved) ghost = { def: S.catalogById[S.drag.itemId], x: S.drag.x, y: S.drag.y, ignore: S.drag.uid };
    else if (S.selectedItem && S.hover) ghost = { def: S.catalogById[S.selectedItem], x: S.hover.x, y: S.hover.y, ignore: null };
    if (ghost && ghost.def) {
      const bad = spotProblem(layout, ghost.def, ghost.x, ghost.y, ghost.ignore);
      ctx.fillStyle = bad ? GHOST_BAD : GHOST_OK;
      ctx.fillRect(ghost.x * cell, ghost.y * cell, ghost.def.w * cell, ghost.def.h * cell);
    }

    // Cursor for keyboard users
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
        const dy = y + h - dh; // anchor: bottom centre of the footprint
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
    // Fallback block with a two-letter label
    ctx.fillStyle = colorFor(it.itemId);
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#3a1d17';
    ctx.font = (9 * k) + 'px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const label = it.itemId.split('_').map(p => p[0] || '').join('').slice(0, 2).toUpperCase();
    ctx.fillText(label, x + w / 2, y + h / 2);
    if (it.flip) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x + w - 4 * k, y + 2 * k, 2 * k, h - 4 * k);
    }
  }

  function drawPig(ctx, p, cell, k) {
    const cx = p.x * cell + cell / 2;
    const cy = p.y * cell + cell / 2;
    const img = loadImage('sprites/' + (p.stage || 'adult') + '/idle.png');
    if (img.ok) {
      ctx.drawImage(img.img, 0, 0, 32, 32, cx - cell / 2, cy - cell / 2, cell, cell);
    } else {
      ctx.fillStyle = '#e98c42';
      ctx.beginPath();
      ctx.arc(cx, cy, cell / 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3a1d17';
    ctx.font = (8 * k) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(p.name || '', cx, cy + cell / 2);
  }

  function colorFor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
    return 'hsl(' + h + ', 55%, 70%)';
  }

  function send(msg) {
    if (S.api && S.api.send) S.api.send(msg);
  }

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
      if (S.selectedItem) {
        placeAt(c.x, c.y);
      } else if (hit) {
        setSelectedUid(hit.uid);
        S.drag = { uid: hit.uid, itemId: hit.itemId, offX: c.x - hit.x, offY: c.y - hit.y, moved: false, x: hit.x, y: hit.y, start: { x: hit.x, y: hit.y } };
        canvas.setPointerCapture(e.pointerId);
      } else {
        S.drag = null;
        setSelectedUid(null);
      }
      redraw();
    });

    canvas.addEventListener('pointermove', (e) => {
      const layout = S.layout;
      const c = cellFromEvent(e);
      if (S.drag) {
        const nx = c.x - S.drag.offX;
        const ny = c.y - S.drag.offY;
        if (nx !== S.drag.x || ny !== S.drag.y) {
          S.drag.x = nx; S.drag.y = ny;
          S.drag.moved = S.drag.moved || (nx !== S.drag.start.x || ny !== S.drag.start.y);
          redraw();
        }
      } else if (S.selectedItem && inBounds(layout, c)) {
        S.hover = c;
        redraw();
      }
    });

    canvas.addEventListener('pointerup', () => {
      const drag = S.drag;
      S.drag = null;
      if (drag && !drag.moved && !S.selectedItem) {
        if (drag.itemId === 'gramophone' || drag.itemId === 'player_gramophone') {
          if (window.CuyMusicPlayer && typeof window.CuyMusicPlayer.toggle === 'function') {
            window.CuyMusicPlayer.toggle();
          }
          return;
        }
        toggleLamp(drag.uid);
        return;
      }
      if (!drag || !drag.moved) { redraw(); return; }
      const layout = S.layout;
      const def = S.catalogById[drag.itemId];
      const problem = def ? spotProblem(layout, def, drag.x, drag.y, drag.uid) : 'missing';
      if (!problem) {
        send({ type: 'room_move', place: S.place, uid: drag.uid, x: drag.x, y: drag.y });
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
          if (hit && (hit.itemId === 'gramophone' || hit.itemId === 'player_gramophone')) {
            if (window.CuyMusicPlayer && typeof window.CuyMusicPlayer.toggle === 'function') {
              window.CuyMusicPlayer.toggle();
            }
          }
          setSelectedUid(hit ? hit.uid : null);
          redraw();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (S.selectedUid) send({ type: 'room_remove', place: S.place, uid: S.selectedUid });
      } else if (e.key === 'f' || e.key === 'F') {
        if (S.selectedUid) send({ type: 'room_flip', place: S.place, uid: S.selectedUid });
      } else if (e.key === 'Escape') {
        if (window.CuyMusicPlayer && typeof window.CuyMusicPlayer.isVisible === 'function' && window.CuyMusicPlayer.isVisible()) {
          window.CuyMusicPlayer.hide();
        }
        S.selectedItem = null; S.hover = null;
        setSelectedUid(null);
        render();
      }
    });
  }

  // Changes the room shown. Picks and drags are dropped, the customize panel is told that no item is picked.
  function switchRoom(id, focusTab) {
    if (!id) return;
    if (id === 'garden' || id === 'park') {
      if (window.CuyPlaces) {
        window.CuyPlaces.openPlace(id);
        return;
      }
    }
    if (S.api && residentRoom(S.api.getState(), id)) id = DORM_ID;
    if (id === S.place) return;
    S.place = id;
    if (window.CuyPlaces) window.CuyPlaces.setCurrentHouseRoom(id);
    S.selectedItem = null;
    S.drag = null;
    S.hover = null;
    setSelectedUid(null);
    render();
    if (focusTab && S.container) {
      const tab = S.container.querySelector('.room-tab[data-room="' + id + '"]');
      if (tab) tab.focus();
    }
  }

  function bindTabs(container, tabs) {
    const list = container.querySelector('.room-tabs');
    if (!list) return;
    container.querySelectorAll('.room-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchRoom(btn.dataset.room, false));
    });
    list.addEventListener('keydown', (e) => {
      const ids = tabs.map(t => t.id);
      let i = ids.indexOf(S.place);
      if (e.key === 'ArrowRight') i = (i + 1) % ids.length;
      else if (e.key === 'ArrowLeft') i = (i - 1 + ids.length) % ids.length;
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = ids.length - 1;
      else return;
      e.preventDefault();
      e.stopPropagation();
      switchRoom(ids[i], true);
    });
  }

  function render() {
    const container = S.container;
    if (!container) return;
    const st = S.api.getState();
    container.dataset.place = 'house';
    container.setAttribute('data-place', 'house');
    const housePlace = ((st && st.places && st.places.places) || []).find(p => p.id === 'house');
    if (housePlace && housePlace.unlocked === false) {
      container.innerHTML = `<div class="room-panel room-locked" data-place="house">
        <p class="room-locked-text">The house is locked. ${housePlace.unlockCost ? 'Open for ' + housePlace.unlockCost + ' clovers' : 'Locked'}</p>
      </div>`;
      return;
    }
    const hadFocus = !!(S.canvas && document.activeElement === S.canvas);
    if (!st || !st.rooms || !st.rooms.layouts) {
      container.innerHTML = '<p class="room-empty">Loading the house…</p>';
      S.canvas = null;
      return;
    }
    S.catalogById = {};
    (st.rooms.catalog || []).forEach(c => { S.catalogById[c.id] = c; });
    if (S.selectedItem && !S.catalogById[S.selectedItem]) {
      const shopDef = (st.shop?.items || []).find(i => i.id === S.selectedItem);
      S.catalogById[S.selectedItem] = {
        id: S.selectedItem,
        name: shopDef?.name || 'Mushroom lamp',
        places: ['salon'],
        w: 1, h: 2, layer: 'floor',
        price: 140, comfort: 2,
        repeatable: false, owned: 1, placed: 0
      };
    }
    const dormMode = S.place === DORM_ID;
    S.layout = (dormMode && !dormReady(st)) ? null : (st.rooms.layouts[S.place] || null);
    S.pigs = (st.rooms && Array.isArray(st.rooms.pigs)) ? st.rooms.pigs.filter(p => p.place === S.place || !p.place) : [];
    if (!S.layout && dormMode) {
      renderDormWithoutRoom(container, st, tabsOf(st));
      return;
    }
    if (!S.layout) {
      container.innerHTML = '<p class="room-empty">This room is not built yet.</p>';
      S.canvas = null;
      return;
    }
    const layout = S.layout;
    const avail = Math.max(160, (container.clientWidth || 360) - 24);
    S.scale = avail >= layout.cols * CELL * 2 ? 2 : 1;
    const w = layout.cols * CELL * S.scale;
    const h = layout.rows * CELL * S.scale;
    const placedTotal = layout.items.length;
    const sale = saleKeyOf(S.place);
    const drawer = (st.rooms.catalog || []).map(c => {
      const isOwned = c.owned || (st.inventory && st.inventory[c.id] > 0) || (st.rooms?.owned && st.rooms.owned[c.id] > 0) || (c.id === S.selectedItem);
      return Object.assign({}, c, { owned: isOwned });
    }).filter(c => c.owned && (c.places || []).indexOf(sale) >= 0);
    if (S.selectedItem && !drawer.some(c => c.id === S.selectedItem)) {
      const shopDef = (st.shop?.items || []).find(i => i.id === S.selectedItem);
      const def = {
        id: S.selectedItem,
        name: shopDef?.name || 'Mushroom lamp',
        places: [sale],
        w: 1, h: 2, layer: 'floor',
        price: 140, comfort: 2,
        repeatable: false,
        owned: true,
        placed: (layout.items || []).filter(i => i.itemId === S.selectedItem).length
      };
      S.catalogById[S.selectedItem] = def;
      drawer.push(def);
    }
    const clovers = typeof st.clovers === 'number' ? st.clovers : 0;

    const items = drawer.map(c => {
      const free = c.repeatable || c.placed === 0;
      const pressed = S.selectedItem === c.id;
      return `<button type="button" class="room-item${pressed ? ' is-picked placing-item' : ''}" data-item="${esc(c.id)}" aria-pressed="${pressed}" ${free ? '' : 'disabled'} aria-label="${esc(c.name)}, ${c.placed} placed${free ? '' : ', all in use'}">` +
        `<span class="room-item-name">${esc(c.name)}</span>` +
        `<span class="room-item-meta">${c.w}×${c.h} · ${c.placed} placed</span></button>`;
    }).join('') || '<p class="room-empty">Nothing owned for this room yet. Buy items in the Market.</p>';

    const tabs = tabsOf(st);
    const tabsHtml = tabsHtmlOf(tabs);

    // Bigger room for pig rooms (the house upgrade is not offered here yet)
    const pr = pigRoomOf(st, S.place);
    let levelHtml = '';
    if (pr && pr.nextLevelCost != null) {
      const cost = pr.nextLevelCost;
      const missing = Math.max(0, cost - clovers);
      levelHtml = `<div class="room-level">
          <button type="button" class="game-btn room-level-btn" id="roomLevelBtn" ${missing > 0 ? 'disabled' : ''} aria-label="Bigger room for ${cost} clovers">Bigger room - ${cost} clovers</button>
          ${missing > 0 ? `<span class="room-level-missing">${missing} more clovers needed</span>` : ''}
        </div>`;
    }

    const cell = CELL * S.scale;
    const isPlayerOpen = window.CuyMusicPlayer && typeof window.CuyMusicPlayer.isVisible === 'function' ? window.CuyMusicPlayer.isVisible() : false;
    const gramophones = (layout.items || []).filter(it => it.itemId === 'gramophone' || it.itemId === 'player_gramophone');
    const gramophoneTriggersHtml = gramophones.map(it => {
      const def = S.catalogById[it.itemId] || { w: 1, h: 1 };
      const gx = it.x * cell;
      const gy = it.y * cell;
      const gw = (def.w || 1) * cell;
      const gh = (def.h || 1) * cell;
      return `<button type="button" class="room-gramophone-trigger" data-uid="${esc(it.uid)}" aria-label="Gramophone" aria-expanded="${isPlayerOpen ? 'true' : 'false'}" style="position:absolute;left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px;" tabindex="0"></button>`;
    }).join('');

    container.classList.add('rooms-editor');
    container.innerHTML = `
      <div class="room-panel rooms-editor" data-place="house">
        <div class="room-tabs" role="tablist" aria-label="Rooms">${tabsHtml}</div>
        ${dormMode ? '<div class="room-dorm"></div>' : ''}
        <div class="room-head">
          <button type="button" class="room-title room-name-btn" aria-label="Rename this room">${esc(layout.name || labelOf(st, S.place))}</button>
          <span class="room-count">${placedTotal} placed</span>
        </div>
        ${levelHtml}
        <div class="room-canvas-wrap" style="position:relative;display:inline-block;line-height:0;">
          <canvas class="room-canvas" width="${w}" height="${h}" style="width:${w}px;height:${h}px" tabindex="0"
            aria-label="Room grid. Arrow keys move the cursor. Enter places the picked item or picks up one. F flips, Delete removes."></canvas>
          ${gramophoneTriggersHtml}
        </div>
        <p class="room-hint">${S.selectedItem ? 'Tap the room to place it. Esc cancels.' : 'Pick an item below, or drag an item to move it. Right-click or Delete removes. F flips.'}</p>
        ${S.selectedItem ? `<div class="placing-item" data-item="${esc(S.selectedItem)}">Placing: ${esc(S.catalogById[S.selectedItem]?.name || S.selectedItem)}</div>` : ''}
        <div class="room-drawer" role="group" aria-label="Owned items">${items}</div>
        <div class="room-customize"></div>
        <p class="room-status" aria-live="polite"></p>
      </div>`;

    if (S.from === 'decor') {
      const header = document.querySelector('#modalTitle')?.parentElement;
      if (header) {
        let btn = header.querySelector('.modal-back');
        if (!btn) {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'modal-back';
          header.insertBefore(btn, document.querySelector('#modalTitle'));
        }
        btn.setAttribute('aria-label', 'Back to Decorate');
        btn.textContent = '← Back';
        btn.onclick = () => {
          btn.remove();
          S.from = null;
          window.CuyHome.openFeature('decor', null, { from: 'more' });
        };
      }
    }

    S.canvas = container.querySelector('.room-canvas');
    S.hasFocus = hadFocus;
    if (hadFocus) S.canvas.focus({ preventScroll: true });
    bindCanvas(S.canvas);
    container.querySelectorAll('.room-gramophone-trigger').forEach(trig => {
      trig.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.CuyMusicPlayer && typeof window.CuyMusicPlayer.toggle === 'function') {
          window.CuyMusicPlayer.toggle();
        }
      });
      trig.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (window.CuyMusicPlayer && typeof window.CuyMusicPlayer.toggle === 'function') {
            window.CuyMusicPlayer.toggle();
          }
        }
      });
    });
    bindTabs(container, tabs);
    if (dormMode) mountDorm(container, st);
    container.querySelectorAll('.room-item').forEach(btn => {
      btn.addEventListener('click', () => {
        S.selectedItem = S.selectedItem === btn.dataset.item ? null : btn.dataset.item;
        setSelectedUid(null);
        render();
      });
    });
    // The name opens the rename field in the customize panel
    const nameBtn = container.querySelector('.room-name-btn');
    if (nameBtn) {
      nameBtn.addEventListener('click', () => {
        const input = S.container.querySelector('.rc-input[data-field="name"]');
        if (input) { input.focus(); input.select(); }
      });
    }
    const levelBtn = container.querySelector('#roomLevelBtn');
    if (levelBtn) levelBtn.addEventListener('click', () => send({ type: 'place_upgrade', id: S.place }));


    // Customize panel (W25-05); nothing breaks when it is not loaded
    const customize = container.querySelector('.room-customize');
    if (window.RoomCustomize && typeof window.RoomCustomize.mount === 'function') {
      window.RoomCustomize.mount(customize, { state: st, roomId: S.place, send: send });
    } else {
      loadCustomizePanel();
    }
    S.period = lightPeriod();
    ensureLights();
    loadAtlas();
    drawGrid(S.canvas, layout, S.pigs);
  }

  window.CuyHome.registerFeature({
    id: 'rooms',
    title: 'Rooms',
    icon: 'icon-house-plan',
    order: 40,
    open(container, api, arg) {
      S.container = container;
      S.api = api;
      const st = api.getState();
      let want = arg && typeof arg === 'object' ? arg.room : arg;
      if (!want && arg && typeof arg === 'object' && arg.from === 'decor') {
        const pigRooms = (st && st.rooms && st.rooms.pigRooms) || [];
        const adopted = pigRooms.find(r => r.adopted !== false);
        want = adopted ? adopted.roomId : 'salon';
      }
      if (!want && S.place) want = S.place;
      S.place = resolvePlace(st, want);
      if (window.CuyPlaces) {
        window.CuyPlaces.setCurrentPlace('house');
        window.CuyPlaces.setCurrentHouseRoom(S.place);
      }
      S.from = (arg && typeof arg === 'object' && arg.from) ? arg.from : null;
      S.fromPlaces = (arg && typeof arg === 'object' && arg.fromPlaces) || false;
      S.selectedItem = (arg && typeof arg === 'object' && arg.place) ? arg.place : null;
      setSelectedUid(null);
      S.drag = null;
      S.hover = null;
      S.periodAt = Date.now();
      if (S.lightTimer) clearInterval(S.lightTimer);
      S.lightTimer = setInterval(lightTick, LIGHT_FRAME_MS);
      render();
    },
    close() {
      if (S.from === 'decor') {
        const btn = document.querySelector('.modal-back');
        if (btn) btn.remove();
        S.from = null;
      }
      S.container = null;
      S.canvas = null;
      S.drag = null;
      if (S.lightTimer) { clearInterval(S.lightTimer); S.lightTimer = null; }
    },
    onState() {
      if (S.container && S.container.isConnected) render();
    }
  });
})();
