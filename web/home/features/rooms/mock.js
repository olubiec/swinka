// Browser mock for the places bar and the room editor (W20-08).
// Mirrors state `places` and `rooms` and the messages place_*, room_* from Cuy.Core / PlacesFeature / RoomsFeature.
// Numbers are hard-coded here; the real ones come from assets/data/places.json and the C# catalog.
// W25-07 adds pig rooms (rooms.pigRooms, layouts keyed 'pig:<pigId>'), colour variants, room names,
// storage, transfers and ?memorial=1 (Ned gets a memorial room).
// W26-07 adds the shared bedroom: state dorm, layout 'dorm', messages dorm_unlock, dorm_move_in, dorm_move_out, dorm_upgrade.
// W27-08 adds pig homes: state homes { pigs, rooms } (docs/contracts/homes.md) and the message pig_home.
(function () {
  'use strict';
  const bridge = window.bridge;
  if (!bridge || !bridge.registerMockState || !bridge.registerMockHandler) return;

  const WORLD = /[?&]world=1(?!\d)/.test(window.location.search);
  const MEMORIAL = /[?&]memorial=1(?!\d)/.test(window.location.search);

  const PLACE_DEFS = [
    { id: 'house',  name: 'House',  unlockCost: 0,    unlocked: true, maxLevel: 3, cols: 12, rows: 7 },
    { id: 'garden', name: 'Garden', unlockCost: 400,  unlocked: false, maxLevel: 1, cols: 12, rows: 7 },
    { id: 'farm',   name: 'Farm',   unlockCost: 600,  unlocked: false, maxLevel: 1, cols: 12, rows: 7 },
    { id: 'park',   name: 'Park',   unlockCost: 1200, unlocked: false, maxLevel: 1, cols: 14, rows: 8 },
    { id: 'market', name: 'Market', unlockCost: 0,    unlocked: true, maxLevel: 1, cols: 12, rows: 7 }
  ];
  // House levels from assets/data/places.json (salon)
  const HOUSE_LEVELS = [
    { cols: 12, rows: 7, wallRows: 2, cost: 0 },
    { cols: 16, rows: 8, wallRows: 2, cost: 530 },
    { cols: 20, rows: 9, wallRows: 2, cost: 1200 }
  ];

  const LAYOUT_PLACES = {
    salon:  { cols: 12, rows: 7, wallRows: 2, wallpaper: 'wallpaper_cream', floor: 'floor_wood' },
    garden: { cols: 12, rows: 7, wallRows: 0, wallpaper: '',                floor: 'floor_grass' },
    park:   { cols: 14, rows: 8, wallRows: 0, wallpaper: '',                floor: 'floor_grass' }
  };

  const CATALOG = [
    { id: 'sofa_cosy',    name: 'Cosy sofa',    places: ['salon'],                 w: 3, h: 2, layer: 'floor', price: 120, comfort: 5, repeatable: false, owned: 1 },
    { id: 'plant_pot',    name: 'Plant pot',    places: ['salon'],                 w: 1, h: 1, layer: 'floor', price: 25,  comfort: 2, repeatable: true,  owned: 2 },
    { id: 'wall_picture', name: 'Wall picture', places: ['salon'],                 w: 2, h: 1, layer: 'wall',  price: 40,  comfort: 3, repeatable: true,  owned: 0 },
    { id: 'lamp_floor',   name: 'Floor lamp',   places: ['salon'],                 w: 1, h: 2, layer: 'floor', price: 60,  comfort: 2, repeatable: true,  owned: 0 },
    { id: 'lamp_mushroom', name: 'Mushroom lamp', places: ['salon'],               w: 1, h: 2, layer: 'floor', price: 140, comfort: 2, repeatable: false, owned: 0 },
    { id: 'fence_wood',   name: 'Wood fence',   places: ['garden', 'park'],        w: 1, h: 1, layer: 'floor', price: 20,  comfort: 1, repeatable: true,  owned: 0 },
    { id: 'bench_wood',   name: 'Wood bench',   places: ['garden', 'park'],        w: 2, h: 1, layer: 'floor', price: 90,  comfort: 4, repeatable: true,  owned: 0 }
  ];

  const FLOORS = ['floor_wood', 'floor_straw', 'floor_fleece', 'floor_grass', 'floor_soil', 'floor_stone'];
  const WALLPAPERS = ['wallpaper_cream', 'wallpaper_mint', 'wallpaper_lilac'];

  // Pig rooms (W25-07). Level 1 is the start size; PIG_LEVELS[n].cost is the price of reaching level n + 1.
  const PIG_ROOM_PREFIX = 'pig:';
  const PIG_LEVELS = [
    { cols: 10, rows: 6, wallRows: 2, cost: 0 },
    { cols: 12, rows: 7, wallRows: 2, cost: 400 },
    { cols: 14, rows: 8, wallRows: 2, cost: 900 }
  ];
  // The five named pigs. Kuki and Ned are adopted; the signature item is a catalog item at a fixed cell.
  const PIG_DEFS = [
    { pigId: 'kuki',   name: 'Kuki',   adopted: true,  wallpaper: 'wallpaper_mint',  floor: 'floor_fleece', signature: { itemId: 'lamp_floor',   x: 8, y: 2 } },
    { pigId: 'ned',    name: 'Ned',    adopted: true,  wallpaper: 'wallpaper_lilac', floor: 'floor_straw',  signature: { itemId: 'wall_picture', x: 4, y: 0 } },
    { pigId: 'james',  name: 'James',  adopted: false, wallpaper: 'wallpaper_cream', floor: 'floor_wood',   signature: { itemId: 'sofa_cosy',    x: 4, y: 3 } },
    { pigId: 'glen',   name: 'Glen',   adopted: false, wallpaper: 'wallpaper_mint',  floor: 'floor_stone',  signature: { itemId: 'plant_pot',    x: 8, y: 5 } },
    { pigId: 'racuch', name: 'Racuch', adopted: false, wallpaper: 'wallpaper_cream', floor: 'floor_grass',  signature: { itemId: 'lamp_floor',   x: 5, y: 4 } }
  ];
  // Spare items: owned but not placed anywhere. Seeded once with the pig rooms.
  const STORAGE_SEED = [
    { itemId: 'plant_pot', count: 1 },
    { itemId: 'wall_picture', count: 1 },
    { itemId: 'lamp_floor', count: 1 }
  ];
  const VARIANT_NAMES = ['natural', 'cocoa', 'mint', 'lilac'];
  const VARIANT_PRICES = { cocoa: 30, mint: 45, lilac: 45 };
  const NAME_MAX = 24;

  // Shared bedroom (W26-07). Level 1 is the start size; DORM_LEVELS[n].cost is the price of reaching level n + 1.
  const DORM_ID = 'dorm';
  const DORM_UNLOCK_COST = 1500;
  const DORM_LEVELS = [
    { cols: 16, rows: 8, wallRows: 2, cost: 0 },
    { cols: 18, rows: 9, wallRows: 2, cost: 1100 },
    { cols: 20, rows: 10, wallRows: 2, cost: 1800 }
  ];

  // Pig homes (W27-08). Locations follow a 20 s slot, like PigWander; a tied pig stays in its room.
  const HOME_SLOT_MS = 20000;
  const HOME_ACTIVITIES = ['sleep', 'eat', 'play', 'rest', 'explore'];
  const HOME_ROOM_NAMES = { salon: 'Living room', garden: 'Garden', park: 'Park', dorm: 'Shared bedroom' };

  // Rooms a pig can be tied to: the living room, unlocked garden and park, and the dorm when it is open.
  function homeRoomsOf(st) {
    const out = [{ id: 'salon', name: HOME_ROOM_NAMES.salon }];
    ['garden', 'park'].forEach((id) => {
      const p = findPlace(st, id);
      if (p && p.unlocked) out.push({ id: id, name: HOME_ROOM_NAMES[id] });
    });
    if (st.dorm && st.dorm.unlocked) out.push({ id: DORM_ID, name: HOME_ROOM_NAMES.dorm });
    return out;
  }

  // Recomputes state homes for the adopted pigs. The stored choices live in st.homeModes (not sent as part of homes).
  function ensureHomes(st) {
    const rooms = homeRoomsOf(st);
    const modes = st.homeModes || (st.homeModes = {});
    const slot = Math.floor(Date.now() / HOME_SLOT_MS);
    const adopted = (st.rooms.pigRooms || []).filter((r) => r.adopted !== false);
    st.homes = {
      rooms: rooms,
      pigs: adopted.map((r, i) => {
        const pick = modes[r.pigId] || { mode: 'free', room: null };
        const tied = !r.memorial && pick.mode === 'room' && rooms.some((x) => x.id === pick.room);
        let location = r.roomId;
        if (!r.memorial) location = tied ? pick.room : rooms[(i + slot) % rooms.length].id;
        return {
          pigId: r.pigId,
          name: r.displayName,
          mode: tied ? 'room' : 'free',
          room: tied ? pick.room : null,
          location: location,
          activity: r.memorial ? 'rest' : HOME_ACTIVITIES[(i + slot) % HOME_ACTIVITIES.length],
          memorial: !!r.memorial,
          portrait: 'sprites/portraits/' + r.pigId + '.png'
        };
      })
    };
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function defaultLayouts() {
    const out = {};
    Object.keys(LAYOUT_PLACES).forEach((p) => {
      out[p] = Object.assign({ items: [] }, clone(LAYOUT_PLACES[p]));
    });
    // Two starting items in the living room
    out.salon.items = [
      { uid: 'u1', itemId: 'sofa_cosy', x: 2, y: 4, flip: false },
      { uid: 'u2', itemId: 'plant_pot', x: 9, y: 4, flip: false }
    ];
    return out;
  }

  function ensureRooms(st) {
    if (!st.places) st.places = { places: [], rooms: [], clovers: st.clovers || 0 };
    if (!Array.isArray(st.places.places) || st.places.places.length === 0) {
      st.places.places = PLACE_DEFS.map((d) => ({
        id: d.id, name: d.name, unlocked: d.unlocked, level: 1, maxLevel: d.maxLevel,
        unlockCost: d.unlockCost, nextLevelCost: null, cols: d.cols, rows: d.rows
      }));
    }
    if (!st.rooms) {
      st.rooms = { layouts: defaultLayouts(), owned: {}, catalog: [], comfort: {}, skins: { wallpapers: WALLPAPERS.slice(), floors: FLOORS.slice() } };
      CATALOG.forEach((c) => { if (c.owned > 0) st.rooms.owned[c.id] = c.owned; });
    }
    if (!st.rooms.layouts) st.rooms.layouts = defaultLayouts();
    if (!st.rooms.owned) st.rooms.owned = {};
    if (!st.rooms.skins) st.rooms.skins = { wallpapers: WALLPAPERS.slice(), floors: FLOORS.slice() };
    if (!st.rooms.variantNames) st.rooms.variantNames = VARIANT_NAMES.slice();
    if (!st.rooms.variantPrices) st.rooms.variantPrices = variantPriceTable();
    if (!st.rooms.unlockedVariants) st.rooms.unlockedVariants = {};
    if (!Array.isArray(st.rooms.pigRooms)) seedPigRooms(st);
    if (typeof st.clovers !== 'number') st.clovers = 48;
    if (WORLD) {
      st.clovers = Math.max(st.clovers, 5000);
      st.places.places.forEach((p) => { p.unlocked = true; });
    }
    ensureDorm(st);
    rebuildCatalog(st);
    ensureHomes(st);
    return st;
  }

  // Shared bedroom state. Keeps unlocked, residents and origin; the rest is recomputed from the pig rooms.
  function ensureDorm(st) {
    if (!st.dorm) {
      st.dorm = { unlocked: false, unlockCost: DORM_UNLOCK_COST, level: 1, residents: [], origin: {}, storedNotice: '' };
    }
    const d = st.dorm;
    d.candidates = (st.rooms.pigRooms || []).filter((r) => r.adopted !== false)
      .map((r) => ({ pigId: r.pigId, name: r.displayName, portrait: r.portrait, memorial: !!r.memorial }));
    if (!Array.isArray(d.residents)) d.residents = [];
    d.residents = d.residents.filter((id) => d.candidates.some((c) => c.pigId === id));
    if (!d.origin) d.origin = {};
    d.maxLevel = DORM_LEVELS.length;
    d.nextLevelCost = d.level < DORM_LEVELS.length ? DORM_LEVELS[d.level].cost : null;
    d.bondBonus = d.residents.length >= 2 ? 1 : 0;
    if (d.unlocked) {
      const lvl = DORM_LEVELS[d.level - 1];
      if (!st.rooms.layouts[DORM_ID]) {
        st.rooms.layouts[DORM_ID] = { cols: lvl.cols, rows: lvl.rows, wallRows: lvl.wallRows, wallpaper: 'wallpaper_cream', floor: 'floor_wood', items: [] };
      } else {
        const layout = st.rooms.layouts[DORM_ID];
        layout.cols = lvl.cols; layout.rows = lvl.rows; layout.wallRows = lvl.wallRows;
      }
    }
  }

  // Spare item into storage (one more of that item).
  function addStorage(st, itemId) {
    const list = st.rooms.storage || (st.rooms.storage = []);
    const row = list.find((s) => s.itemId === itemId);
    if (row) row.count += 1; else list.push({ itemId: itemId, count: 1 });
  }

  function seedPigRooms(st) {
    st.rooms.pigRooms = PIG_DEFS.map((d) => ({
      roomId: PIG_ROOM_PREFIX + d.pigId,
      pigId: d.pigId,
      displayName: d.name,
      portrait: d.pigId,
      adopted: d.adopted,
      memorial: MEMORIAL && d.pigId === 'ned',
      level: 1,
      maxLevel: PIG_LEVELS.length,
      nextLevelCost: PIG_LEVELS[1].cost
    }));
    PIG_DEFS.forEach((d) => {
      const lvl = PIG_LEVELS[0];
      st.rooms.layouts[PIG_ROOM_PREFIX + d.pigId] = {
        cols: lvl.cols, rows: lvl.rows, wallRows: lvl.wallRows, wallpaper: d.wallpaper, floor: d.floor,
        items: [
          { uid: 'p' + d.pigId + '1', itemId: 'plant_pot', x: 1, y: 2, flip: false },
          { uid: 'p' + d.pigId + '2', itemId: d.signature.itemId, x: d.signature.x, y: d.signature.y, flip: false }
        ]
      };
    });
    st.rooms.storage = STORAGE_SEED.map((s) => ({ itemId: s.itemId, count: s.count }));
    // Owned must cover what is placed (pig rooms) plus the spare items in storage.
    CATALOG.forEach((c) => {
      const spare = STORAGE_SEED.filter((s) => s.itemId === c.id).reduce((n, s) => n + s.count, 0);
      st.rooms.owned[c.id] = Math.max(st.rooms.owned[c.id] || 0, placedCount(st, c.id) + spare);
    });
  }

  function variantPriceTable() {
    const out = {};
    CATALOG.forEach((c) => { out[c.id] = Object.assign({}, VARIANT_PRICES); });
    return out;
  }

  function placedCount(st, itemId) {
    let n = 0;
    Object.keys(st.rooms.layouts).forEach((p) => {
      (st.rooms.layouts[p].items || []).forEach((it) => { if (it.itemId === itemId) n++; });
    });
    return n;
  }

  function rebuildCatalog(st) {
    if (st.inventory) {
      Object.keys(st.inventory).forEach((k) => {
        if (st.inventory[k] > 0) {
          st.rooms.owned[k] = Math.max(st.rooms.owned[k] || 0, st.inventory[k]);
        }
      });
    }
    st.rooms.catalog = CATALOG.map((c) => {
      const owned = ((st.rooms.owned && st.rooms.owned[c.id]) || (st.inventory && st.inventory[c.id]) || 0) > 0;
      return {
        id: c.id, name: c.name, places: c.places.slice(), w: c.w, h: c.h, layer: c.layer,
        price: c.price, comfort: c.comfort, icon: 'icon-' + c.id.replace(/_/g, '-'),
        owned: owned, placed: placedCount(st, c.id), repeatable: c.repeatable, free: c.price === 0
      };
    });
  }

  function findDef(id) { return CATALOG.find((c) => c.id === id) || null; }
  function findPlace(st, id) { return (st.places.places || []).find((p) => p.id === id) || null; }
  function isPigRoomId(id) { return typeof id === 'string' && id.indexOf(PIG_ROOM_PREFIX) === 0; }
  // Pig rooms sell the living room catalogue.
  function saleKeyOf(place) { return isPigRoomId(place) || place === DORM_ID ? 'salon' : place; }
  function pigRoomOf(st, id) { return (st.rooms.pigRooms || []).find((r) => r.roomId === id) || null; }
  function variantUnlocked(st, itemId, variant) {
    if (variant === st.rooms.variantNames[0]) return true;
    return (st.rooms.unlockedVariants[itemId] || []).indexOf(variant) >= 0;
  }

  // Returns null if the spot is fine, otherwise the toast text.
  function checkSpot(st, layout, def, x, y, ignoreUid) {
    if (x < 0 || y < 0 || x + def.w > layout.cols || y + def.h > layout.rows) {
      return 'That spot is outside the room';
    }
    if (def.layer === 'wall' && y + def.h > layout.wallRows) return 'That only goes on a wall';
    if (def.layer === 'floor' && y < layout.wallRows) return 'That goes on the floor';
    for (const it of layout.items) {
      if (it.uid === ignoreUid) continue;
      const od = findDef(it.itemId);
      if (!od || od.layer !== def.layer) continue;
      const overlap = x < it.x + od.w && it.x < x + def.w && y < it.y + od.h && it.y < y + def.h;
      if (overlap) return 'No room for that here';
    }
    return null;
  }

  // First free cell for the item (auto placement, used when x and y are -1). Null when the room is full.
  function findFreeCell(st, layout, def) {
    const top = def.layer === 'wall' ? 0 : layout.wallRows;
    for (let y = top; y + def.h <= layout.rows; y++) {
      for (let x = 0; x + def.w <= layout.cols; x++) {
        if (!checkSpot(st, layout, def, x, y, null)) return { x: x, y: y };
      }
    }
    return null;
  }

  function uid() { return 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  bridge.registerMockState('rooms', function (st) { ensureRooms(st); });

  bridge.registerMockHandler('place_unlock', function (st, action) {
    ensureRooms(st);
    const p = findPlace(st, action.id);
    if (!p) return;
    if (p.unlocked) return;
    if (st.clovers < p.unlockCost && !WORLD) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
    st.clovers -= p.unlockCost;
    p.unlocked = true;
    this.dispatchMessage({ type: 'toast', text: p.name + ' is open' });
  });

  bridge.registerMockHandler('place_upgrade', function (st, action) {
    ensureRooms(st);
    if (isPigRoomId(action.id)) {
      const pr = pigRoomOf(st, action.id);
      if (!pr || pr.level >= pr.maxLevel) return;
      const next = PIG_LEVELS[pr.level];
      if (!next) return;
      if (st.clovers < next.cost) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
      st.clovers -= next.cost;
      pr.level += 1;
      const layout = st.rooms.layouts[action.id];
      layout.cols = next.cols; layout.rows = next.rows; layout.wallRows = next.wallRows;
      const after = PIG_LEVELS[pr.level];
      pr.nextLevelCost = after ? after.cost : null;
      this.dispatchMessage({ type: 'toast', text: 'The room grew' });
      return;
    }
    const p = findPlace(st, action.id);
    if (!p || !p.unlocked || p.level >= p.maxLevel) return;
    const lvl = HOUSE_LEVELS[p.level];
    if (!lvl) return;
    if (st.clovers < lvl.cost) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
    st.clovers -= lvl.cost;
    p.level += 1;
    p.cols = lvl.cols; p.rows = lvl.rows;
    st.rooms.layouts.salon.cols = lvl.cols;
    st.rooms.layouts.salon.rows = lvl.rows;
    st.rooms.layouts.salon.wallRows = lvl.wallRows;
    this.dispatchMessage({ type: 'toast', text: 'The house grew' });
  });

  bridge.registerMockHandler('room_buy', function (st, action) {
    ensureRooms(st);
    const def = findDef(action.itemId);
    if (!def) return;
    if (st.clovers < def.price) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
    st.clovers -= def.price;
    st.rooms.owned[def.id] = (st.rooms.owned[def.id] || 0) + 1;
  });

  bridge.registerMockHandler('room_place', function (st, action) {
    ensureRooms(st);
    const def = findDef(action.itemId);
    const layout = st.rooms.layouts[action.place];
    if (!def || !layout) return;
    if (def.places.indexOf(saleKeyOf(action.place)) < 0) { this.dispatchMessage({ type: 'toast', text: 'Not sold for this place' }); return; }
    const owned = st.rooms.owned[def.id] || 0;
    if (owned <= placedCount(st, def.id)) { this.dispatchMessage({ type: 'toast', text: 'Buy it first' }); return; }
    let x = action.x | 0;
    let y = action.y | 0;
    if (x < 0 || y < 0) {
      // x and y of -1 mean "first free cell"
      const cell = findFreeCell(st, layout, def);
      if (!cell) { this.dispatchMessage({ type: 'toast', text: 'No room for that here' }); return; }
      x = cell.x; y = cell.y;
    }
    const err = checkSpot(st, layout, def, x, y, null);
    if (err) { this.dispatchMessage({ type: 'toast', text: err }); return; }
    layout.items.push({ uid: uid(), itemId: def.id, x: x, y: y, flip: false });
    if (def.id === 'lamp_mushroom' || def.id.startsWith('lamp_')) {
      if (!st.decor) st.decor = { equipped: {} };
      if (!st.decor.equipped) st.decor.equipped = {};
      st.decor.equipped.lamp = def.id;
    }
  });

  bridge.registerMockHandler('room_move', function (st, action) {
    ensureRooms(st);
    const layout = st.rooms.layouts[action.place];
    if (!layout) return;
    const it = layout.items.find((i) => i.uid === action.uid);
    const def = it && findDef(it.itemId);
    if (!def) return;
    const err = checkSpot(st, layout, def, action.x | 0, action.y | 0, it.uid);
    if (err) { this.dispatchMessage({ type: 'toast', text: err }); return; }
    it.x = action.x | 0; it.y = action.y | 0;
  });

  bridge.registerMockHandler('room_flip', function (st, action) {
    ensureRooms(st);
    const layout = st.rooms.layouts[action.place];
    const it = layout && layout.items.find((i) => i.uid === action.uid);
    if (it) it.flip = !it.flip;
  });

  bridge.registerMockHandler('room_remove', function (st, action) {
    ensureRooms(st);
    const layout = st.rooms.layouts[action.place];
    if (!layout) return;
    layout.items = layout.items.filter((i) => i.uid !== action.uid);
  });

  bridge.registerMockHandler('room_skin', function (st, action) {
    ensureRooms(st);
    // The customize panel sends `room`; the older messages send `place`.
    const layout = st.rooms.layouts[action.room || action.place];
    if (!layout) return;
    if (action.slot === 'wallpaper' && layout.wallRows > 0) layout.wallpaper = action.itemId;
    if (action.slot === 'floor') layout.floor = action.itemId;
  });

  bridge.registerMockHandler('room_variant', function (st, action) {
    ensureRooms(st);
    const layout = st.rooms.layouts[action.place];
    const it = layout && layout.items.find((i) => i.uid === action.uid);
    if (!it || st.rooms.variantNames.indexOf(action.variant) < 0) return;
    if (!variantUnlocked(st, it.itemId, action.variant)) { this.dispatchMessage({ type: 'toast', text: 'Unlock that colour first' }); return; }
    it.variant = action.variant;
  });

  bridge.registerMockHandler('room_variant_unlock', function (st, action) {
    ensureRooms(st);
    const prices = st.rooms.variantPrices[action.itemId];
    const price = prices ? prices[action.variant] : undefined;
    if (price == null || action.variant === st.rooms.variantNames[0]) return;
    const list = st.rooms.unlockedVariants[action.itemId] || (st.rooms.unlockedVariants[action.itemId] = []);
    if (list.indexOf(action.variant) >= 0) return;
    if (st.clovers < price) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
    st.clovers -= price;
    list.push(action.variant);
    this.dispatchMessage({ type: 'toast', text: 'New colour unlocked' });
  });

  bridge.registerMockHandler('room_rename', function (st, action) {
    ensureRooms(st);
    const layout = st.rooms.layouts[action.place];
    if (!layout) return;
    const name = String(action.name == null ? '' : action.name).trim().slice(0, NAME_MAX);
    if (name) layout.name = name; else delete layout.name;
  });

  bridge.registerMockHandler('room_transfer', function (st, action) {
    ensureRooms(st);
    const from = st.rooms.layouts[action.from];
    const to = st.rooms.layouts[action.place];
    if (!from || !to || action.from === action.place) return;
    const it = from.items.find((i) => i.uid === action.uid);
    const def = it && findDef(it.itemId);
    if (!def) return;
    if (def.places.indexOf(saleKeyOf(action.place)) < 0) { this.dispatchMessage({ type: 'toast', text: 'Not sold for this place' }); return; }
    const cell = findFreeCell(st, to, def);
    if (!cell) { this.dispatchMessage({ type: 'toast', text: 'No room for that here' }); return; }
    from.items = from.items.filter((i) => i !== it);
    to.items.push({ uid: uid(), itemId: it.itemId, x: cell.x, y: cell.y, flip: it.flip, variant: it.variant });
  });

  bridge.registerMockHandler('room_unlock', function (st) {
    this.dispatchMessage({ type: 'toast', text: 'No more rooms in the mock yet' });
  });

  bridge.registerMockHandler('dorm_unlock', function (st) {
    ensureRooms(st);
    const d = st.dorm;
    if (d.unlocked) return;
    if (d.candidates.length < 2) { this.dispatchMessage({ type: 'toast', text: 'You need two pigs first' }); return; }
    if (st.clovers < d.unlockCost && !WORLD) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
    st.clovers -= d.unlockCost;
    d.unlocked = true;
    ensureDorm(st);
    rebuildCatalog(st);
    this.dispatchMessage({ type: 'toast', text: 'The shared bedroom is open' });
  });

  // Residents' items go side by side into the shared room (in the order of the pig rooms); what does not fit goes to storage.
  bridge.registerMockHandler('dorm_move_in', function (st, action) {
    ensureRooms(st);
    const d = st.dorm;
    if (!d.unlocked) return;
    const ids = (Array.isArray(action.pigIds) ? action.pigIds : [])
      .filter((id) => d.candidates.some((c) => c.pigId === id) && d.residents.indexOf(id) < 0);
    if (!ids.length) return;
    const shared = st.rooms.layouts[DORM_ID];
    let stored = 0;
    d.storedNotice = '';
    ids.forEach((id) => {
      const room = st.rooms.layouts[PIG_ROOM_PREFIX + id];
      const items = room ? room.items.slice() : [];
      d.origin[id] = [];
      items.forEach((it) => {
        const def = findDef(it.itemId);
        const cell = def ? findFreeCell(st, shared, def) : null;
        if (cell) {
          shared.items.push({ uid: it.uid, itemId: it.itemId, x: cell.x, y: cell.y, flip: it.flip, variant: it.variant });
          d.origin[id].push(it.uid);
        } else {
          addStorage(st, it.itemId);
          stored++;
        }
      });
      if (room) room.items = [];
      d.residents.push(id);
    });
    if (stored) {
      d.storedNotice = stored + (stored === 1 ? ' item' : ' items') + ' went to storage: the shared bedroom is full';
      this.dispatchMessage({ type: 'toast', text: d.storedNotice });
    } else {
      this.dispatchMessage({ type: 'toast', text: 'Moved in together' });
    }
    ensureDorm(st);
    rebuildCatalog(st);
  });

  // Items that came from the pig's own room go back (or to storage when that room is full).
  bridge.registerMockHandler('dorm_move_out', function (st, action) {
    ensureRooms(st);
    const d = st.dorm;
    const id = action.pigId;
    if (!d.unlocked || d.residents.indexOf(id) < 0) return;
    const shared = st.rooms.layouts[DORM_ID];
    const room = st.rooms.layouts[PIG_ROOM_PREFIX + id];
    let stored = 0;
    d.storedNotice = '';
    (d.origin[id] || []).forEach((uid) => {
      const it = shared.items.find((i) => i.uid === uid);
      if (!it) return; // the player took it out of the shared room already
      shared.items = shared.items.filter((i) => i !== it);
      const def = findDef(it.itemId);
      const cell = room && def ? findFreeCell(st, room, def) : null;
      if (cell) room.items.push({ uid: it.uid, itemId: it.itemId, x: cell.x, y: cell.y, flip: it.flip, variant: it.variant });
      else { addStorage(st, it.itemId); stored++; }
    });
    delete d.origin[id];
    d.residents = d.residents.filter((r) => r !== id);
    if (stored) {
      d.storedNotice = stored + (stored === 1 ? ' item' : ' items') + ' went to storage: its room is full';
      this.dispatchMessage({ type: 'toast', text: d.storedNotice });
    }
    ensureDorm(st);
    rebuildCatalog(st);
  });

  bridge.registerMockHandler('dorm_upgrade', function (st) {
    ensureRooms(st);
    const d = st.dorm;
    if (!d.unlocked || d.level >= DORM_LEVELS.length) return;
    const next = DORM_LEVELS[d.level];
    if (st.clovers < next.cost) { this.dispatchMessage({ type: 'toast', text: 'Not enough clovers' }); return; }
    st.clovers -= next.cost;
    d.level += 1;
    ensureDorm(st);
    this.dispatchMessage({ type: 'toast', text: 'The shared bedroom grew' });
  });

  // Home switch: roam ('free') or stay in a room. Unknown and memorial pigs are ignored; a room the pig cannot use gets a toast.
  bridge.registerMockHandler('pig_home', function (st, action) {
    ensureRooms(st);
    const pigId = typeof action.pigId === 'string' ? action.pigId : '';
    if (!pigId || pigId.length > 64) return;
    const pr = pigRoomOf(st, PIG_ROOM_PREFIX + pigId);
    if (!pr || pr.adopted === false || pr.memorial) return;
    const modes = st.homeModes || (st.homeModes = {});
    if (action.mode === 'free') {
      modes[pigId] = { mode: 'free', room: null };
    } else if (action.mode === 'room') {
      const room = typeof action.room === 'string' ? action.room : '';
      if (!room || room.length > 64) return;
      if (!homeRoomsOf(st).some((r) => r.id === room)) { this.dispatchMessage({ type: 'toast', text: 'That room is not available' }); return; }
      modes[pigId] = { mode: 'room', room: room };
    } else {
      return;
    }
    ensureHomes(st);
  });

  // Exposed for the feature and for tests; reads only.
  window.CuyRoomsMock = { CATALOG: CATALOG, PLACE_DEFS: PLACE_DEFS, WORLD: WORLD, PIG_LEVELS: PIG_LEVELS, DORM_LEVELS: DORM_LEVELS, VARIANT_NAMES: VARIANT_NAMES };
})();
