// Browser mock for the places bar and the room editor (W20-08).
// Mirrors state `places` and `rooms` and the messages place_*, room_* from Cuy.Core / PlacesFeature / RoomsFeature.
// Numbers are hard-coded here; the real ones come from assets/data/places.json and the C# catalog.
(function () {
  'use strict';
  const bridge = window.bridge;
  if (!bridge || !bridge.registerMockState || !bridge.registerMockHandler) return;

  const WORLD = /[?&]world=1(?!\d)/.test(window.location.search);

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
    { id: 'fence_wood',   name: 'Wood fence',   places: ['garden', 'park'],        w: 1, h: 1, layer: 'floor', price: 20,  comfort: 1, repeatable: true,  owned: 0 },
    { id: 'bench_wood',   name: 'Wood bench',   places: ['garden', 'park'],        w: 2, h: 1, layer: 'floor', price: 90,  comfort: 4, repeatable: true,  owned: 0 }
  ];

  const FLOORS = ['floor_wood', 'floor_straw', 'floor_fleece', 'floor_grass', 'floor_soil', 'floor_stone'];
  const WALLPAPERS = ['wallpaper_cream', 'wallpaper_mint', 'wallpaper_lilac'];

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
    if (typeof st.clovers !== 'number') st.clovers = 48;
    if (WORLD) {
      st.clovers = Math.max(st.clovers, 5000);
      st.places.places.forEach((p) => { p.unlocked = true; });
    }
    rebuildCatalog(st);
    return st;
  }

  function placedCount(st, itemId) {
    let n = 0;
    Object.keys(st.rooms.layouts).forEach((p) => {
      (st.rooms.layouts[p].items || []).forEach((it) => { if (it.itemId === itemId) n++; });
    });
    return n;
  }

  function rebuildCatalog(st) {
    st.rooms.catalog = CATALOG.map((c) => {
      const owned = (st.rooms.owned[c.id] || 0) > 0;
      return {
        id: c.id, name: c.name, places: c.places.slice(), w: c.w, h: c.h, layer: c.layer,
        price: c.price, comfort: c.comfort, icon: 'icon-' + c.id.replace(/_/g, '-'),
        owned: owned, placed: placedCount(st, c.id), repeatable: c.repeatable, free: c.price === 0
      };
    });
  }

  function findDef(id) { return CATALOG.find((c) => c.id === id) || null; }
  function findPlace(st, id) { return (st.places.places || []).find((p) => p.id === id) || null; }

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
    if (def.places.indexOf(action.place) < 0) { this.dispatchMessage({ type: 'toast', text: 'Not sold for this place' }); return; }
    const owned = st.rooms.owned[def.id] || 0;
    if (owned <= placedCount(st, def.id)) { this.dispatchMessage({ type: 'toast', text: 'Buy it first' }); return; }
    const err = checkSpot(st, layout, def, action.x | 0, action.y | 0, null);
    if (err) { this.dispatchMessage({ type: 'toast', text: err }); return; }
    layout.items.push({ uid: uid(), itemId: def.id, x: action.x | 0, y: action.y | 0, flip: false });
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
    const layout = st.rooms.layouts[action.place];
    if (!layout) return;
    if (action.slot === 'wallpaper' && layout.wallRows > 0) layout.wallpaper = action.itemId;
    if (action.slot === 'floor') layout.floor = action.itemId;
  });

  bridge.registerMockHandler('room_unlock', function (st) {
    this.dispatchMessage({ type: 'toast', text: 'No more rooms in the mock yet' });
  });

  // Exposed for the feature and for tests; reads only.
  window.CuyRoomsMock = { CATALOG: CATALOG, PLACE_DEFS: PLACE_DEFS, WORLD: WORLD };
})();
