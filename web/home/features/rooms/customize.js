// Customize panel for the room editor (W25-05). Mounted by features/rooms/feature.js after every render:
// window.RoomCustomize.mount(container, ctx), ctx = { state, roomId, send } where state is the full state (state.rooms is used).
// Panels: selected item (colour variants, flip, remove), walls and floor skins, room name, storage and transfer.
// Every message is fire-and-forget: the server decides and toasts when it rejects one, so this module never waits for an answer.
(function () {
  'use strict';
  const root = window;
  const DEFAULT_VARIANTS = ['natural', 'cocoa', 'mint', 'lilac'];
  const SHARED_LABELS = { salon: 'Living room', garden: 'Garden', park: 'Park' };
  const SKIN_COLORS = {
    floor_wood: '#e6b073', floor_straw: '#eedb7c', floor_fleece: '#f8eddd',
    floor_grass: '#7fbf4a', floor_soil: '#9c6636', floor_stone: '#b8b0a3',
    wallpaper_cream: '#fffdf8', wallpaper_mint: '#cfeedb', wallpaper_lilac: '#e2d6f0'
  };

  // Floor and wall swatches show the tile texture (assets/world/tiles); the colour above is the fallback while it loads or when the file is missing.
  const TILE_BASE = window.chrome && window.chrome.webview ? 'https://cuy.assets/' : '../../assets/';

  let selectedUid = null;  // set from the room-select event that feature.js dispatches
  let mounted = null;      // { container, ctx } of the latest mount

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function roomsOf(st) { return (st && st.rooms) || {}; }

  function layoutOf(st, roomId) {
    const layouts = roomsOf(st).layouts;
    return (layouts && layouts[roomId]) || null;
  }

  function catalogOf(st, itemId) {
    return (roomsOf(st).catalog || []).find(c => c.id === itemId) || null;
  }

  function variantNames(st) {
    const names = roomsOf(st).variantNames;
    return Array.isArray(names) && names.length ? names : DEFAULT_VARIANTS;
  }

  function variantUnlocked(st, itemId, variant) {
    if (variant === variantNames(st)[0]) return true;
    const list = (roomsOf(st).unlockedVariants || {})[itemId] || [];
    return list.indexOf(variant) >= 0;
  }

  function variantPrice(st, itemId, variant) {
    const table = roomsOf(st).variantPrices || {};
    const prices = table[itemId];
    return prices && typeof prices[variant] === 'number' ? prices[variant] : null;
  }

  function roomLabel(st, key) {
    const pig = (roomsOf(st).pigRooms || []).find(r => r && r.roomId === key);
    if (pig) return pig.displayName || key;
    return SHARED_LABELS[key] || key;
  }

  function skinName(id) {
    const s = String(id).replace(/^(floor|wallpaper)_/, '').replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function selectedItem(layout) {
    if (!layout || !selectedUid) return null;
    return layout.items.find(i => i.uid === selectedUid) || null;
  }

  function send(ctx, msg) {
    if (ctx && typeof ctx.send === 'function') ctx.send(msg);
  }

  function itemSection(st, layout) {
    const it = selectedItem(layout);
    if (!it) return '<p class="rc-muted">Click an item to change it.</p>';
    const def = catalogOf(st, it.itemId);
    const names = variantNames(st);
    const current = it.variant || names[0];
    const swatches = names.map((v, i) => {
      const locked = !variantUnlocked(st, it.itemId, v);
      const price = locked ? variantPrice(st, it.itemId, v) : null;
      const isCurrent = v === current;
      const label = locked ? `${v}, locked${price != null ? ', ' + price + ' clovers' : ''}` : v;
      const tail = locked
        ? `<span class="pixel-icon icon-padlock" aria-hidden="true"></span><span class="rc-price">${price != null ? esc(price) : '?'}</span>`
        : `<span class="rc-price">${esc(v)}</span>`;
      return `<button type="button" class="rc-swatch${isCurrent ? ' is-current' : ''}${locked ? ' is-locked' : ''}" data-action="variant" data-variant="${esc(v)}" aria-pressed="${isCurrent}" aria-label="${esc(label)}">` +
        `<span class="rc-chip rc-chip-${i % 4}" aria-hidden="true"></span>${tail}</button>`;
    }).join('');
    return `
      <p class="rc-item-name">${esc(def ? def.name : it.itemId)}</p>
      <div class="rc-swatches" role="group" aria-label="Colour">${swatches}</div>
      <div class="rc-row">
        <button type="button" class="rc-btn" data-action="flip">Flip</button>
        <button type="button" class="rc-btn rc-btn-danger" data-action="remove">Remove</button>
      </div>`;
  }

  function skinRow(slot, ids, current) {
    if (!ids.length) return '<p class="rc-muted">None owned yet.</p>';
    const buttons = ids.map((id) => {
      const on = id === current;
      return `<button type="button" class="rc-skin${on ? ' is-current' : ''}" data-action="skin" data-slot="${slot}" data-item="${esc(id)}" aria-pressed="${on}" aria-label="${esc(skinName(id))}">` +
        `<span class="rc-chip rc-chip-skin" style="background-color:${esc(SKIN_COLORS[id] || '#dddddd')};background-image:url('${TILE_BASE}world/tiles/${esc(id)}.png');background-size:100% 100%;image-rendering:pixelated" aria-hidden="true"></span>` +
        `<span class="rc-price">${esc(skinName(id))}</span></button>`;
    }).join('');
    return `<div class="rc-swatches" role="group" aria-label="${slot === 'floor' ? 'Floors' : 'Wallpapers'}">${buttons}</div>`;
  }

  function skinsSection(st, layout) {
    const skins = roomsOf(st).skins || {};
    const walls = layout.wallRows > 0
      ? skinRow('wallpaper', skins.wallpapers || [], layout.wallpaper)
      : '<p class="rc-muted">This room has no walls.</p>';
    return `<h4 class="rc-sub">Walls</h4>${walls}<h4 class="rc-sub">Floor</h4>${skinRow('floor', skins.floors || [], layout.floor)}`;
  }

  function nameSection(st, roomId, layout) {
    const current = layout.name || roomLabel(st, roomId);
    return `<label class="rc-label">Room name
        <input type="text" class="rc-input" data-field="name" maxlength="24" value="${esc(current)}">
      </label>
      <p class="rc-muted">Up to 24 characters. Press Enter to save.</p>
      <div class="rc-row"><button type="button" class="rc-btn" data-action="reset-name">Reset name</button></div>`;
  }

  function storageSection(st, roomId) {
    const spare = (roomsOf(st).storage || []).filter(s => s && s.count > 0);
    const rows = spare.map((s) => {
      const def = catalogOf(st, s.itemId);
      return `<li class="rc-row"><span>${esc(def ? def.name : s.itemId)} <span class="rc-muted">x ${esc(s.count)}</span></span>` +
        `<button type="button" class="rc-btn" data-action="store" data-item="${esc(s.itemId)}">Put in this room</button></li>`;
    }).join('');
    const layouts = roomsOf(st).layouts || {};
    const sources = [];
    Object.keys(layouts).forEach((key) => {
      if (key === roomId) return;
      (layouts[key].items || []).forEach((it) => {
        const def = catalogOf(st, it.itemId);
        sources.push(`<option value="${esc(key + '|' + it.uid)}">${esc(def ? def.name : it.itemId)} (${esc(roomLabel(st, key))})</option>`);
      });
    });
    const storeHtml = rows ? `<ul class="rc-list">${rows}</ul>` : '<p class="rc-muted">Nothing in storage.</p>';
    const moveHtml = sources.length
      ? `<label class="rc-label">Move here from
           <select class="rc-input" data-field="transfer"><option value="">Choose an item...</option>${sources.join('')}</select>
         </label>`
      : '<p class="rc-muted">No items in other rooms.</p>';
    return storeHtml + moveHtml;
  }

  function render() {
    if (!mounted) return;
    const container = mounted.container;
    const ctx = mounted.ctx;
    const st = ctx.state || null;
    const layout = layoutOf(st, ctx.roomId);
    if (!layout) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <section class="rc-section" aria-label="Selected item">
        <h3 class="rc-heading">Selected item</h3>
        ${itemSection(st, layout)}
      </section>
      <section class="rc-section" aria-label="Walls and floor">
        <h3 class="rc-heading">Walls and floor</h3>
        ${skinsSection(st, layout)}
      </section>
      <section class="rc-section" aria-label="Room name">
        <h3 class="rc-heading">Name</h3>
        ${nameSection(st, ctx.roomId, layout)}
      </section>
      <section class="rc-section" aria-label="Storage">
        <h3 class="rc-heading">Storage</h3>
        ${storageSection(st, ctx.roomId)}
      </section>`;
  }

  function onClick(e) {
    const btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!btn || !mounted) return;
    const ctx = mounted.ctx;
    const st = ctx.state || null;
    const roomId = ctx.roomId;
    const layout = layoutOf(st, roomId);
    const act = btn.dataset.action;

    if (act === 'variant') {
      const it = selectedItem(layout);
      if (!it) return;
      const variant = btn.dataset.variant;
      if (variantUnlocked(st, it.itemId, variant)) {
        send(ctx, { type: 'room_variant', place: roomId, uid: it.uid, variant: variant });
        return;
      }
      const price = variantPrice(st, it.itemId, variant);
      if (price == null) return;
      if (root.confirm && !root.confirm('Unlock the ' + variant + ' colour for ' + price + ' clovers?')) return;
      send(ctx, { type: 'room_variant_unlock', itemId: it.itemId, variant: variant });
    } else if (act === 'flip') {
      const it = selectedItem(layout);
      if (it) send(ctx, { type: 'room_flip', place: roomId, uid: it.uid });
    } else if (act === 'remove') {
      const it = selectedItem(layout);
      if (!it) return;
      send(ctx, { type: 'room_remove', place: roomId, uid: it.uid });
      selectedUid = null;
      render();
    } else if (act === 'skin') {
      send(ctx, { type: 'room_skin', room: roomId, slot: btn.dataset.slot, itemId: btn.dataset.item });
    } else if (act === 'reset-name') {
      send(ctx, { type: 'room_rename', place: roomId, name: '' });
    } else if (act === 'store') {
      // x and y of -1 mean "first free cell"
      send(ctx, { type: 'room_place', place: roomId, itemId: btn.dataset.item, x: -1, y: -1 });
    }
  }

  function onChange(e) {
    const t = e.target;
    if (!mounted || !t || !t.dataset) return;
    const ctx = mounted.ctx;
    if (t.dataset.field === 'name') {
      send(ctx, { type: 'room_rename', place: ctx.roomId, name: String(t.value || '').trim().slice(0, 24) });
    } else if (t.dataset.field === 'transfer') {
      const value = t.value || '';
      const cut = value.indexOf('|');
      if (cut > 0) {
        send(ctx, { type: 'room_transfer', from: value.slice(0, cut), place: ctx.roomId, uid: value.slice(cut + 1) });
      }
      t.value = '';
    }
  }

  function onKeydown(e) {
    const t = e.target;
    if (e.key === 'Enter' && t && t.dataset && t.dataset.field === 'name') {
      e.preventDefault();
      t.blur(); // the change event saves the name
    }
  }

  function mount(container, ctx) {
    if (!container) return;
    mounted = { container: container, ctx: ctx || {} };
    container.onclick = onClick;
    container.onchange = onChange;
    container.onkeydown = onKeydown;
    render();
  }

  document.addEventListener('room-select', (e) => {
    selectedUid = (e && e.detail && e.detail.uid) || null;
    render();
  });

  root.RoomCustomize = { mount: mount };
})();
