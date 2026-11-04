// House plan (W27-06): a flat cutaway of the house with one window per room and a live miniature in each.
// window.HousePlan.mount(container, ctx); ctx = { state (the rooms object), homes, places, dorm, select(roomId), assetUrl(rel) }.
// Shared rooms form the lower row (the dorm is wide), pig rooms the upper rows, three per row.
// Pig portraits sit on the window of their room. A pig click dispatches document 'room-pig' (detail: { pigId, roomId }).
// Items in the miniatures are coloured blocks (the sprites are not needed for a plan). Portraits load lazily.
// Every room and pig is a real button, so the plan works from the keyboard.
(function () {
  'use strict';

  const W = 720;
  const PAD = 24;
  const GAP = 12;
  const ROOF_H = 64;
  const Y0 = ROOF_H + 12;
  const ROW_H = 150;
  const BASE_H = 14;
  const LABEL_H = 18;
  const MINI_PAD = 8;
  const PIG_SLOT = 20;
  const PIG_ART = 16;
  const DORM_ID = 'dorm';
  const PLACE_LABELS = { salon: 'Living room', garden: 'Garden', park: 'Park', dorm: 'Shared bedroom' };
  const ACTIVITY_LABELS = { sleep: 'Napping', eat: 'Snacking', play: 'Playing', rest: 'Resting', explore: 'Exploring' };
  // Same colours as the room editor (feature.js)
  const FLOOR_COLORS = {
    floor_wood: '#e6b073', floor_straw: '#eedb7c', floor_fleece: '#f8eddd',
    floor_grass: '#7fbf4a', floor_soil: '#9c6636', floor_stone: '#b8b0a3'
  };
  const WALL_COLORS = { wallpaper_cream: '#fff3dc', wallpaper_mint: '#dff3e6', wallpaper_lilac: '#ebe2f8' };
  const PAPER = '#fffdf8';
  const ROOF = '#b5643a';
  const ROOF_EDGE = '#8f4a2a';
  const TRIM = '#c98d50';
  const BASE = '#9c6636';
  const INK = '#3a1d17';
  const DEFAULT_INFO = 'Hover or focus a room to see its comfort. Press Enter to open it.';

  const imageCache = {};
  let assetUrl = null;
  let current = null;   // { canvas, model, dpr } of the plan on screen

  function url(rel) {
    return assetUrl ? assetUrl(rel) : '../../assets/' + rel;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function redraw() {
    if (current && current.canvas.isConnected) draw(current);
  }

  function loadImage(rel) {
    if (!imageCache[rel]) {
      const entry = { img: new Image(), ok: false };
      entry.img.onload = () => { entry.ok = true; redraw(); };
      entry.img.src = url(rel);
      imageCache[rel] = entry;
    }
    return imageCache[rel];
  }

  function activityLabel(activity) {
    return ACTIVITY_LABELS[activity] || 'Idle';
  }

  function colorFor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
    return 'hsl(' + h + ', 55%, 70%)';
  }

  // Shared rooms: the living room always, garden and park when unlocked, the dorm when unlocked.
  function lockOf(id, places, dorm) {
    if (id === 'salon') return { locked: false, price: null };
    if (id === DORM_ID) return { locked: !dorm.unlocked, price: dorm.unlockCost != null ? dorm.unlockCost : null };
    const p = places.find(x => x && x.id === id);
    return { locked: !(p && p.unlocked), price: p && p.unlockCost != null ? p.unlockCost : null };
  }

  function makeWin(state, catalog, id, label, box, lock) {
    const layout = (state.layouts && state.layouts[id]) || null;
    let comfort = 0;
    if (state.comfort && typeof state.comfort[id] === 'number') {
      comfort = state.comfort[id];
    } else if (layout) {
      (layout.items || []).forEach((it) => {
        const c = catalog[it.itemId];
        if (c && typeof c.comfort === 'number') comfort += c.comfort;
      });
    }
    return Object.assign({ id: id, label: label, layout: layout, comfort: comfort, pigs: [], locked: false, price: null }, box, lock);
  }

  function buildModel(ctx) {
    const state = ctx.state || {};
    const homes = ctx.homes || {};
    const places = (ctx.places && ctx.places.places) || [];
    const dorm = ctx.dorm || {};
    const catalog = {};
    (state.catalog || []).forEach((c) => { catalog[c.id] = c; });
    const pigRooms = (state.pigRooms || []).filter(r => r && r.adopted !== false);
    const upperRows = Math.ceil(pigRooms.length / 3);
    const upperW = (W - 2 * PAD - 2 * GAP) / 3;
    const lowerY = Y0 + upperRows * (ROW_H + GAP);
    const H = lowerY + ROW_H + PAD + BASE_H;
    const wins = [];
    pigRooms.forEach((r, i) => {
      wins.push(makeWin(state, catalog, r.roomId, r.displayName || r.roomId,
        { x: PAD + (i % 3) * (upperW + GAP), y: Y0 + Math.floor(i / 3) * (ROW_H + GAP), w: upperW, h: ROW_H },
        { locked: false, price: null }));
    });
    const unit = (W - 2 * PAD - 3 * GAP) / 5;
    let x = PAD;
    [['salon', 1], [DORM_ID, 2], ['garden', 1], ['park', 1]].forEach(([id, span]) => {
      const w = unit * span;
      wins.push(makeWin(state, catalog, id, PLACE_LABELS[id], { x: x, y: lowerY, w: w, h: ROW_H }, lockOf(id, places, dorm)));
      x += w + GAP;
    });
    const byId = {};
    wins.forEach((w) => { byId[w.id] = w; });
    (homes.pigs || []).forEach((p) => { if (byId[p.location]) byId[p.location].pigs.push(p); });
    return { W: W, H: H, wins: wins, byId: byId, catalog: catalog };
  }

  function pct(v, total) { return (v / total * 100).toFixed(3) + '%'; }

  function region(x, y, w, h, m) {
    return 'left:' + pct(x, m.W) + ';top:' + pct(y, m.H) + ';width:' + pct(w, m.W) + ';height:' + pct(h, m.H);
  }

  function pigSlot(w, i) {
    return { x: w.x + 6 + (i % 6) * PIG_SLOT, y: w.y + w.h - PIG_SLOT - 6 - Math.floor(i / 6) * PIG_SLOT };
  }

  function roomInfo(w) {
    if (w.locked) return w.label + ': locked' + (w.price != null ? ', unlock for ' + w.price + ' clovers' : '');
    const n = w.pigs.length;
    return w.label + ': comfort ' + w.comfort + ', ' + n + (n === 1 ? ' pig' : ' pigs') + '. Press Enter to open it.';
  }

  function roomButton(w, m) {
    const state = w.locked ? (w.price != null ? 'locked, ' + w.price + ' clovers' : 'locked') : 'comfort ' + w.comfort;
    return '<button type="button" class="house-plan-room' + (w.locked ? ' is-locked' : '') + '" data-room="' + esc(w.id) +
      '" aria-label="' + esc(w.label + ', ' + state) + '" aria-disabled="' + (w.locked ? 'true' : 'false') +
      '" style="' + region(w.x, w.y, w.w, w.h, m) + '"></button>';
  }

  function pigButton(w, p, i, m) {
    const s = pigSlot(w, i);
    return '<button type="button" class="house-plan-pig" data-pig="' + esc(p.pigId) + '" data-room="' + esc(w.id) +
      '" aria-label="' + esc((p.name || p.pigId) + ', ' + activityLabel(p.activity)) +
      '" style="' + region(s.x, s.y, PIG_SLOT, PIG_SLOT, m) + '"></button>';
  }

  function mount(container, ctx) {
    if (!container) return;
    const c = ctx || {};
    assetUrl = typeof c.assetUrl === 'function' ? c.assetUrl : null;
    const m = buildModel(c);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let rooms = '';
    let pigs = '';
    m.wins.forEach((w) => {
      rooms += roomButton(w, m);
      w.pigs.forEach((p, i) => { pigs += pigButton(w, p, i, m); });
    });
    container.innerHTML = '<div class="house-plan">' +
      '<div class="house-plan-stage">' +
      '<canvas class="house-plan-canvas" width="' + Math.round(m.W * dpr) + '" height="' + Math.round(m.H * dpr) + '" aria-hidden="true"></canvas>' +
      rooms + pigs +
      '</div>' +
      '<p class="house-plan-info" aria-live="polite">' + DEFAULT_INFO + '</p>' +
      '</div>';

    const canvas = container.querySelector('.house-plan-canvas');
    const info = container.querySelector('.house-plan-info');
    current = { canvas: canvas, model: m, dpr: dpr };
    draw(current);

    const show = (text) => { info.textContent = text; };
    container.querySelectorAll('.house-plan-room').forEach((btn) => {
      const w = m.byId[btn.dataset.room];
      const say = () => show(roomInfo(w));
      btn.addEventListener('mouseenter', say);
      btn.addEventListener('focus', say);
      btn.addEventListener('mouseleave', () => show(DEFAULT_INFO));
      btn.addEventListener('blur', () => show(DEFAULT_INFO));
      btn.addEventListener('click', () => { if (!w.locked && typeof c.select === 'function') c.select(w.id); });
    });
    container.querySelectorAll('.house-plan-pig').forEach((btn) => {
      const w = m.byId[btn.dataset.room];
      const p = w.pigs.find(x => x.pigId === btn.dataset.pig);
      const say = () => show((p.name || p.pigId) + ': ' + activityLabel(p.activity));
      btn.addEventListener('mouseenter', say);
      btn.addEventListener('focus', say);
      btn.addEventListener('mouseleave', () => show(DEFAULT_INFO));
      btn.addEventListener('blur', () => show(DEFAULT_INFO));
      btn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('room-pig', { detail: { pigId: p.pigId, roomId: w.id } }));
      });
    });
  }

  function draw(cur) {
    const m = cur.model;
    const g = cur.canvas.getContext('2d');
    g.setTransform(cur.dpr, 0, 0, cur.dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, m.W, m.H);
    drawHouse(g, m);
    m.wins.forEach((w) => drawWindow(g, m, w));
    m.wins.forEach((w) => w.pigs.forEach((p, i) => drawPig(g, w, p, i)));
  }

  function drawHouse(g, m) {
    g.fillStyle = PAPER;
    g.fillRect(4, ROOF_H, m.W - 8, m.H - ROOF_H - BASE_H);
    g.fillStyle = TRIM;
    g.fillRect(4, ROOF_H - 4, m.W - 8, 4);
    g.fillStyle = ROOF;
    g.beginPath();
    g.moveTo(0, ROOF_H);
    g.lineTo(m.W / 2, 6);
    g.lineTo(m.W, ROOF_H);
    g.closePath();
    g.fill();
    g.fillStyle = ROOF_EDGE;
    g.fillRect(0, ROOF_H - 6, m.W, 6);
    g.fillStyle = BASE;
    g.fillRect(0, m.H - BASE_H, m.W, BASE_H);
  }

  function fitText(g, text, maxW) {
    let t = String(text);
    while (t.length > 1 && g.measureText(t).width > maxW) t = t.slice(0, -1);
    return t;
  }

  function drawWindow(g, m, w) {
    g.fillStyle = TRIM;
    g.fillRect(w.x - 3, w.y - 3, w.w + 6, w.h + 6);
    g.fillStyle = PAPER;
    g.fillRect(w.x, w.y, w.w, w.h);
    if (w.layout) {
      drawMini(g, m, w.layout, w.x + MINI_PAD, w.y + LABEL_H, w.w - 2 * MINI_PAD, w.h - LABEL_H - MINI_PAD);
    }
    g.fillStyle = 'rgba(255, 253, 248, 0.92)';
    g.fillRect(w.x, w.y, w.w, LABEL_H);
    g.fillStyle = INK;
    g.font = '600 11px sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(fitText(g, w.label, w.w - 2 * MINI_PAD), w.x + 6, w.y + LABEL_H / 2);
    if (w.locked) {
      g.fillStyle = 'rgba(40, 28, 20, 0.5)';
      g.fillRect(w.x, w.y + LABEL_H, w.w, w.h - LABEL_H);
      drawPadlock(g, w.x + w.w / 2, w.y + w.h / 2 - 8);
      g.fillStyle = PAPER;
      g.font = '600 12px sans-serif';
      g.textAlign = 'center';
      g.fillText(w.price != null ? w.price + ' clovers' : 'Locked', w.x + w.w / 2, w.y + w.h / 2 + 14);
    }
  }

  function drawPadlock(g, cx, cy) {
    g.strokeStyle = PAPER;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy - 3, 5, Math.PI, 0);
    g.stroke();
    g.fillStyle = PAPER;
    g.fillRect(cx - 7, cy - 3, 14, 11);
  }

  // Miniature of a room: wallpaper and floor, then the items as coloured blocks of their footprint.
  function drawMini(g, m, layout, x, y, w, h) {
    const cols = layout.cols;
    const rows = layout.rows;
    const cell = Math.min(w / cols, h / rows);
    const ox = x + (w - cell * cols) / 2;
    const oy = y + (h - cell * rows) / 2;
    const wall = WALL_COLORS[layout.wallpaper] || WALL_COLORS.wallpaper_cream;
    const floor = FLOOR_COLORS[layout.floor] || FLOOR_COLORS.floor_wood;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle = r < layout.wallRows ? wall : floor;
        g.fillRect(ox + c * cell, oy + r * cell, cell + 0.5, cell + 0.5);
      }
    }
    if (layout.wallRows > 0) {
      g.fillStyle = TRIM;
      g.fillRect(ox, oy + layout.wallRows * cell - Math.max(1, cell * 0.15), cols * cell, Math.max(1, cell * 0.15));
    }
    (layout.items || []).slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)).forEach((it) => {
      const d = m.catalog[it.itemId];
      if (!d) return;
      g.fillStyle = colorFor(it.itemId);
      g.fillRect(ox + it.x * cell + 1, oy + it.y * cell + 1, d.w * cell - 2, d.h * cell - 2);
    });
  }

  function drawPig(g, w, p, i) {
    const s = pigSlot(w, i);
    g.fillStyle = 'rgba(255, 253, 248, 0.85)';
    g.fillRect(s.x, s.y, PIG_SLOT, PIG_SLOT);
    const img = p.portrait ? loadImage(p.portrait) : null;
    if (img && img.ok) {
      g.drawImage(img.img, s.x + 2, s.y + 2, PIG_ART, PIG_ART);
    } else {
      g.fillStyle = '#e98c42';
      g.beginPath();
      g.arc(s.x + PIG_SLOT / 2, s.y + PIG_SLOT / 2, PIG_ART / 2, 0, Math.PI * 2);
      g.fill();
    }
  }

  window.HousePlan = { mount: mount, activityLabel: activityLabel };
})();
