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
    canvas: null
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
    if (isPigRoom(want) && st && st.rooms && st.rooms.layouts && st.rooms.layouts[want]) return residentRoom(st, want) ? DORM_ID : want;
    return 'salon';
  }

  // Tabs: shared rooms first (garden and park once unlocked), then one tab per pig room, then the shared bedroom.
  function tabsOf(st) {
    const tabs = [{ id: 'salon', label: PLACE_LABELS.salon, portrait: null, memorial: false }];
    const places = (st.places && st.places.places) || [];
    ['garden', 'park'].forEach((id) => {
      const p = places.find(x => x && x.id === id);
      if (p && p.unlocked) tabs.push({ id: id, label: PLACE_LABELS[id], portrait: null, memorial: false });
    });
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
    container.innerHTML = `
      <div class="room-panel">
        <div class="room-tabs" role="tablist" aria-label="Rooms">${tabsHtmlOf(tabs)}</div>
        <div class="room-dorm"></div>
        <p class="room-hint">${dormOf(st).unlocked ? 'Move a pig in above to use the shared bedroom.' : ''}</p>
        <p class="room-status" aria-live="polite"></p>
      </div>`;
    bindTabs(container, tabs);
    mountDorm(container, st);
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

  function drawGrid(canvas, layout, pigs) {
    const ctx = canvas.getContext('2d');
    const k = S.scale;
    const cell = CELL * k;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Walls and floor
    for (let y = 0; y < layout.rows; y++) {
      for (let x = 0; x < layout.cols; x++) {
        if (y < layout.wallRows) {
          ctx.fillStyle = WALL_FILL;
          ctx.fillRect(x * cell, y * cell, cell, cell);
          if (y === layout.wallRows - 1) {
            ctx.fillStyle = WALL_TRIM;
            ctx.fillRect(x * cell, y * cell + cell - 2 * k, cell, 2 * k);
          }
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
      if (hit) {
        S.selectedItem = null;
        setSelectedUid(hit.uid);
        S.drag = { uid: hit.uid, itemId: hit.itemId, offX: c.x - hit.x, offY: c.y - hit.y, moved: false, x: hit.x, y: hit.y, start: { x: hit.x, y: hit.y } };
        canvas.setPointerCapture(e.pointerId);
      } else {
        S.drag = null;
        if (S.selectedItem) placeAt(c.x, c.y);
        else setSelectedUid(null);
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
          setSelectedUid(hit ? hit.uid : null);
          redraw();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (S.selectedUid) send({ type: 'room_remove', place: S.place, uid: S.selectedUid });
      } else if (e.key === 'f' || e.key === 'F') {
        if (S.selectedUid) send({ type: 'room_flip', place: S.place, uid: S.selectedUid });
      } else if (e.key === 'Escape') {
        S.selectedItem = null; S.hover = null;
        setSelectedUid(null);
        render();
      }
    });
  }

  // Changes the room shown. Picks and drags are dropped, the customize panel is told that no item is picked.
  function switchRoom(id, focusTab) {
    if (!id) return;
    if (S.api && residentRoom(S.api.getState(), id)) id = DORM_ID;
    if (id === S.place) return;
    S.place = id;
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
      switchRoom(ids[i], true);
    });
  }

  function render() {
    const container = S.container;
    if (!container) return;
    const st = S.api.getState();
    const hadFocus = !!(S.canvas && document.activeElement === S.canvas);
    if (!st || !st.rooms || !st.rooms.layouts) {
      container.innerHTML = '<p class="room-empty">Loading the house…</p>';
      S.canvas = null;
      return;
    }
    S.catalogById = {};
    (st.rooms.catalog || []).forEach(c => { S.catalogById[c.id] = c; });
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
    const drawer = (st.rooms.catalog || []).filter(c => c.owned && (c.places || []).indexOf(sale) >= 0);
    const clovers = typeof st.clovers === 'number' ? st.clovers : 0;

    const items = drawer.map(c => {
      const free = c.repeatable || c.placed === 0;
      const pressed = S.selectedItem === c.id;
      return `<button type="button" class="room-item${pressed ? ' is-picked' : ''}" data-item="${esc(c.id)}" aria-pressed="${pressed}" ${free ? '' : 'disabled'} aria-label="${esc(c.name)}, ${c.placed} placed${free ? '' : ', all in use'}">` +
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

    container.innerHTML = `
      <div class="room-panel">
        <div class="room-tabs" role="tablist" aria-label="Rooms">${tabsHtml}</div>
        ${dormMode ? '<div class="room-dorm"></div>' : ''}
        <div class="room-head">
          <button type="button" class="room-title room-name-btn" aria-label="Rename this room">${esc(layout.name || labelOf(st, S.place))}</button>
          <span class="room-count">${placedTotal} placed</span>
        </div>
        ${levelHtml}
        <canvas class="room-canvas" width="${w}" height="${h}" style="width:${w}px;height:${h}px" tabindex="0"
          aria-label="Room grid. Arrow keys move the cursor. Enter places the picked item or picks up one. F flips, Delete removes."></canvas>
        <p class="room-hint">${S.selectedItem ? 'Click a cell to place the item. Esc cancels.' : 'Pick an item below, or drag an item to move it. Right-click or Delete removes. F flips.'}</p>
        <div class="room-drawer" role="group" aria-label="Owned items">${items}</div>
        <div class="room-customize"></div>
        <p class="room-status" aria-live="polite"></p>
      </div>`;

    S.canvas = container.querySelector('.room-canvas');
    S.hasFocus = hadFocus;
    if (hadFocus) S.canvas.focus({ preventScroll: true });
    bindCanvas(S.canvas);
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
    }
    loadAtlas();
    drawGrid(S.canvas, layout, S.pigs);
  }

  window.CuyHome.registerFeature({
    id: 'rooms',
    title: 'Rooms',
    icon: 'icon-house',
    order: 40,
    open(container, api, arg) {
      S.container = container;
      S.api = api;
      // arg is a room id, or { room: roomId } from the My Pigs page
      const want = arg && typeof arg === 'object' ? arg.room : arg;
      S.place = resolvePlace(api.getState(), want);
      S.selectedItem = null;
      setSelectedUid(null);
      S.drag = null;
      S.hover = null;
      render();
    },
    close() {
      S.container = null;
      S.canvas = null;
      S.drag = null;
    },
    onState() {
      if (S.container && S.container.isConnected) render();
    }
  });
})();
