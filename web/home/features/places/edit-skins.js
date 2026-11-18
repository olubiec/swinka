// Edit drawer module for changing owned wallpapers and floors (PK-P6s).
// Pure API: isIndoorRoom(state, roomId), listOwned(state, roomId).
// DOM API: build(container, { state, roomId, send }).
(function (root) {
  'use strict';

  var OUTDOOR_IDS = ['garden', 'park', 'farm', 'market'];
  var TILE_BASE = (typeof window !== 'undefined' && window.chrome && window.chrome.webview)
    ? 'https://cuy.assets/'
    : '../../assets/';
  var FALLBACK_COLOR = '#d9c096';
  var SKIN_COLORS = {
    wallpaper_mint: '#c3c98a',
    wallpaper_peach: '#f2b5a0',
    wallpaper_sky: '#b9c9c4',
    wallpaper_lilac: '#7a5a6b',
    wallpaper_night: '#2b3c4e',
    wallpaper_cream: '#fbf0d9',
    floor_wood_light: '#e3b27a',
    floor_tiles_checker: '#d9c096',
    floor_grass: '#6c8050',
    floor_carpet_red: '#8c4237',
    floor_wood: '#c58a52',
    floor_straw: '#e9c871',
    floor_fleece: '#efdcb8',
    floor_soil: '#6f4328',
    floor_stone: '#8da9a8'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function skinName(id) {
    var s = String(id || '').replace(/^(floor|wallpaper)_/, '').replace(/_/g, ' ');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function isIndoorRoom(_state, roomId) {
    if (!roomId || typeof roomId !== 'string') return false;
    return OUTDOOR_IDS.indexOf(roomId) < 0;
  }

  function normalizeSkins(list, ownedMap) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var entry = list[i];
      if (typeof entry === 'string' && entry) {
        out.push({
          id: entry,
          name: skinName(entry),
          color: SKIN_COLORS[entry] || FALLBACK_COLOR
        });
      } else if (entry && typeof entry === 'object' && entry.id) {
        var isOwned = entry.owned === true || Boolean(ownedMap && ownedMap[entry.id] > 0);
        if (isOwned) {
          out.push({
            id: entry.id,
            name: entry.name || skinName(entry.id),
            color: SKIN_COLORS[entry.id] || FALLBACK_COLOR
          });
        }
      }
    }
    return out;
  }

  function listOwned(state, roomId) {
    if (!isIndoorRoom(state, roomId)) {
      return {
        visible: false,
        currentWallpaper: '',
        currentFloor: '',
        wallpapers: [],
        floors: []
      };
    }
    var rooms = (state && state.rooms) || {};
    var layouts = rooms.layouts || {};
    var layout = layouts[roomId] || {};
    var skins = rooms.skins || {};
    var ownedMap = rooms.owned || {};
    return {
      visible: true,
      currentWallpaper: layout.wallpaper || '',
      currentFloor: layout.floor || '',
      wallpapers: normalizeSkins(skins.wallpapers, ownedMap),
      floors: normalizeSkins(skins.floors, ownedMap)
    };
  }

  function ensureStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('editSkinsStyle')) return;
    var style = document.createElement('style');
    style.id = 'editSkinsStyle';
    style.textContent = [
      '.edit-skins-panel{display:flex;flex-direction:column;gap:8px;padding:6px;font-family:var(--ui-font,"Pixelify Sans",monospace);color:var(--ui-ink,#3a1d17);}',
      '.edit-skins-section{display:flex;flex-direction:column;gap:4px;}',
      '.edit-skins-heading{margin:0;font-size:12px;line-height:1.2;color:var(--ui-wood-0,#47281c);}',
      '.edit-skins-grid{display:flex;flex-wrap:wrap;gap:6px;}',
      '.edit-skin-btn{display:inline-flex;align-items:center;gap:6px;padding:4px 6px;border:2px solid var(--ui-wood-1,#6f4328);background:var(--ui-linen-3,#fbf0d9);color:var(--ui-ink,#3a1d17);font:inherit;font-size:11px;cursor:pointer;}',
      '.edit-skin-btn.is-current{border-color:var(--ui-wood-0,#47281c);background:var(--ui-hay-2,#e9c871);}',
      '.edit-skin-swatch{width:16px;height:16px;border:1px solid var(--ui-ink,#3a1d17);background-size:100% 100%;image-rendering:pixelated;flex-shrink:0;}',
      '.edit-skin-swatch-default{background-color:var(--ui-linen-1,#d9c096);}',
      '.edit-skin-label{white-space:nowrap;}',
      '.edit-skins-empty{margin:0;padding:8px;font-size:12px;color:var(--ui-wood-1,#6f4328);}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function renderSlot(title, slot, items, currentId) {
    var buttons = [];
    var isDefault = !currentId;
    buttons.push(
      '<button type="button" class="edit-skin-btn' + (isDefault ? ' is-current' : '') + '"' +
      ' data-action="skin" data-slot="' + slot + '" data-item=""' +
      ' aria-pressed="' + String(isDefault) + '">' +
      '<span class="edit-skin-swatch edit-skin-swatch-default" aria-hidden="true"></span>' +
      '<span class="edit-skin-label">Default</span>' +
      '</button>'
    );
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var isCurrent = item.id === currentId;
      buttons.push(
        '<button type="button" class="edit-skin-btn' + (isCurrent ? ' is-current' : '') + '"' +
        ' data-action="skin" data-slot="' + slot + '" data-item="' + esc(item.id) + '"' +
        ' aria-pressed="' + String(isCurrent) + '">' +
        '<span class="edit-skin-swatch" style="background-color:' + esc(item.color) +
        ';background-image:url(\'' + TILE_BASE + 'world/tiles/' + esc(item.id) + '.png\')" aria-hidden="true"></span>' +
        '<span class="edit-skin-label">' + esc(item.name) + '</span>' +
        '</button>'
      );
    }
    return '<section class="edit-skins-section" data-slot="' + slot + '" aria-label="' + esc(title) + '">' +
      '<h4 class="edit-skins-heading">' + esc(title) + '</h4>' +
      '<div class="edit-skins-grid">' + buttons.join('') + '</div>' +
      '</section>';
  }

  function build(container, ctx) {
    if (!container) return;
    container.innerHTML = '';
    var state = ctx && ctx.state;
    var roomId = ctx && ctx.roomId;
    var res = listOwned(state, roomId);
    if (!res.visible) {
      container.hidden = true;
      container.onclick = null;
      return;
    }
    ensureStyles();
    container.hidden = false;
    if (res.wallpapers.length === 0 && res.floors.length === 0) {
      container.innerHTML = '<div class="edit-skins-panel"><p class="edit-skins-empty">Buy wallpapers in the shop</p></div>';
      container.onclick = null;
      return;
    }
    container.innerHTML = '<div class="edit-skins-panel">' +
      renderSlot('Walls', 'wallpaper', res.wallpapers, res.currentWallpaper) +
      renderSlot('Floor', 'floor', res.floors, res.currentFloor) +
      '</div>';
    container.onclick = function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-action="skin"]') : null;
      if (!btn || !ctx || typeof ctx.send !== 'function') return;
      ctx.send({
        type: 'room_skin',
        room: roomId,
        slot: btn.dataset.slot,
        itemId: btn.dataset.item
      });
    };
  }

  var api = {
    OUTDOOR_IDS: OUTDOOR_IDS,
    SKIN_COLORS: SKIN_COLORS,
    isIndoorRoom: isIndoorRoom,
    listOwned: listOwned,
    build: build
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.EditSkins = api;
}(typeof window !== 'undefined' ? window : globalThis));
