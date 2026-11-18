(function (root) {
  'use strict';

  const OUTDOOR_IDS = ['garden', 'park', 'farm', 'market'];

  const DEFAULT_THEMES = [
    { id: 'kuki', name: 'Kuki', mood: 'calm meadow', wallpaper: 'wallpaper_mint', floor: 'floor_wood_light' },
    { id: 'ned', name: 'Ned', mood: 'snack nook', wallpaper: 'wallpaper_peach', floor: 'floor_carpet_red' },
    { id: 'james', name: 'James', mood: 'safe hideout', wallpaper: 'wallpaper_night', floor: 'floor_tiles_checker' },
    { id: 'glen', name: 'Glen', mood: 'cosy reading corner', wallpaper: 'wallpaper_lilac', floor: 'floor_wood_light' },
    { id: 'racuch', name: 'Racuch', mood: 'play corner', wallpaper: 'wallpaper_sky', floor: 'floor_grass' }
  ];

  function capitalize(text) {
    const str = String(text || '');
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function formatSkinName(id) {
    return String(id || '').replace(/_/g, ' ');
  }

  function normalizeTheme(id, raw) {
    const src = raw || {};
    return {
      id: String(src.id || id || ''),
      name: String(src.name || capitalize(src.id || id || '')),
      mood: String(src.mood || ''),
      wallpaper: String(src.wallpaper || ''),
      floor: String(src.floor || '')
    };
  }

  function themes(state) {
    const rawThemes = state && state.rooms && state.rooms.themes;
    if (Array.isArray(rawThemes)) {
      return rawThemes.map((entry) => normalizeTheme(entry && entry.id, entry));
    }
    if (rawThemes && typeof rawThemes === 'object') {
      return Object.keys(rawThemes).map((id) => normalizeTheme(id, rawThemes[id]));
    }
    return DEFAULT_THEMES.map((entry) => Object.assign({}, entry));
  }

  function isIndoorRoom(roomId) {
    return Boolean(roomId) && OUTDOOR_IDS.indexOf(roomId) < 0;
  }

  function findSkinOwnership(state, slot, itemId) {
    if (!itemId) return { owned: true, name: '' };
    const rooms = (state && state.rooms) || {};
    const skins = rooms.skins || {};
    const list = slot === 'wallpaper' ? skins.wallpapers : skins.floors;
    const ownedMap = rooms.owned || {};
    const mapOwned = Number(ownedMap[itemId]) > 0;
    let foundName = '';
    let listedOwned = false;
    let listedExplicit = false;

    if (Array.isArray(list)) {
      for (let i = 0; i < list.length; i++) {
        const entry = list[i];
        if (typeof entry === 'string') {
          if (entry === itemId) {
            listedOwned = true;
            listedExplicit = true;
            break;
          }
        } else if (entry && entry.id === itemId) {
          foundName = entry.name ? String(entry.name) : '';
          listedExplicit = true;
          listedOwned = entry.owned === true;
          break;
        }
      }
    }

    return {
      owned: mapOwned || (listedExplicit ? listedOwned : false),
      name: foundName || formatSkinName(itemId)
    };
  }

  function plan(themeId, state, roomId) {
    if (!isIndoorRoom(roomId)) {
      return { refused: 'Templates are only for indoor rooms' };
    }

    const list = themes(state);
    let theme = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === themeId) {
        theme = list[i];
        break;
      }
    }
    if (!theme) {
      return { refused: 'Unknown template' };
    }

    const wallInfo = findSkinOwnership(state, 'wallpaper', theme.wallpaper);
    if (!wallInfo.owned) {
      return { refused: 'Buy ' + wallInfo.name + ' in the shop' };
    }

    const floorInfo = findSkinOwnership(state, 'floor', theme.floor);
    if (!floorInfo.owned) {
      return { refused: 'Buy ' + floorInfo.name + ' in the shop' };
    }

    const layouts = (state && state.rooms && state.rooms.layouts) || {};
    const layout = layouts[roomId];
    if (layout && (layout.wallpaper || '') === theme.wallpaper && (layout.floor || '') === theme.floor) {
      return { messages: [], noop: true };
    }

    return {
      messages: [
        { type: 'room_skin', room: roomId, slot: 'wallpaper', itemId: theme.wallpaper },
        { type: 'room_skin', room: roomId, slot: 'floor', itemId: theme.floor }
      ]
    };
  }

  function ensureStyles(doc) {
    if (!doc || !doc.head || doc.getElementById('editTemplatesStyle')) return;
    const style = doc.createElement('style');
    style.id = 'editTemplatesStyle';
    style.textContent = [
      '.edit-templates-list { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0; }',
      '.edit-template-btn { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 6px 8px; border: 2px solid var(--border, #6f5542); background: var(--card-bg, #fff7e6); color: var(--text, #3a2618); font: inherit; font-size: 11px; cursor: pointer; border-radius: 4px; }',
      '.edit-template-btn:hover:not(:disabled) { background: var(--card-hover, #f5e6c8); }',
      '.edit-template-btn.is-current { border-color: var(--accent, #5a8f49); opacity: 0.85; }',
      '.edit-template-btn:disabled { opacity: 0.55; cursor: not-allowed; }',
      '.edit-template-name { font-weight: 700; }',
      '.edit-template-mood { font-size: 10px; opacity: 0.8; }'
    ].join('\n');
    doc.head.appendChild(style);
  }

  function build(container, ctx) {
    if (!container) return;
    const opts = ctx || {};
    const state = opts.state || {};
    const roomId = opts.roomId || '';
    const send = typeof opts.send === 'function' ? opts.send : function () {};

    container.innerHTML = '';
    if (!isIndoorRoom(roomId)) {
      container.hidden = true;
      return;
    }

    container.hidden = false;
    const doc = container.ownerDocument;
    ensureStyles(doc);

    const listEl = doc.createElement('div');
    listEl.className = 'edit-templates-list';

    const list = themes(state);
    for (let i = 0; i < list.length; i++) {
      const theme = list[i];
      const res = plan(theme.id, state, roomId);
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'edit-template-btn';
      btn.setAttribute('data-theme', theme.id);

      const nameEl = doc.createElement('span');
      nameEl.className = 'edit-template-name';
      nameEl.textContent = theme.name;
      btn.appendChild(nameEl);

      if (theme.mood) {
        const moodEl = doc.createElement('span');
        moodEl.className = 'edit-template-mood';
        moodEl.textContent = theme.mood;
        btn.appendChild(moodEl);
      }

      if (res.refused) {
        btn.disabled = true;
        btn.classList.add('is-locked');
        btn.title = res.refused;
        btn.setAttribute('aria-pressed', 'false');
      } else if (res.noop) {
        btn.disabled = true;
        btn.classList.add('is-current');
        btn.title = 'Already applied';
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', function () {
          for (let j = 0; j < res.messages.length; j++) {
            send(res.messages[j]);
          }
        });
      }

      listEl.appendChild(btn);
    }

    container.appendChild(listEl);
  }

  const api = {
    OUTDOOR_IDS: OUTDOOR_IDS,
    DEFAULT_THEMES: DEFAULT_THEMES,
    themes: themes,
    plan: plan,
    build: build
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.EditTemplates = api;
}(typeof window !== 'undefined' ? window : globalThis));
