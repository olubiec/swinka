// Six record players in the room (A5): placing and picking up (playerOwned <-> playerPlaced), the record queue
// and the sound gate (only with a placed player), plus the room sprites. Pure model first (Node tests, no DOM);
// the draw and the browser start are at the end. Browser: window.CuyMusicWorld.
// Saves: playerOwned [playerId], playerPlaced {roomId: playerId}, records {recordId: count} (contract.js).
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports && typeof require === 'function'
      ? require('./contract.js')
      : (root && root.CuyMusicContract)
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CuyMusicWorld = api;
})(typeof window !== 'undefined' ? window : null, function (Contract) {
  'use strict';

  const FLOOR_Y = 119; // scene.floorY in canvas-pig.js (scene 240 x 130)
  const SPOT_X = [12, 52, 92, 132, 172, 200]; // room x of the first, second, ... placed player
  const FRAME_MS = 250; // animation step of the *_on sheets
  const SPRITE_DIR = 'world/house/'; // relative to the assets base (assets/world/house/<id>.png, <id>_on.png)

  let players = []; // from players_design.json, cheapest first: {id, name, price, range}

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  // Reads the design file (object with a "players" map). Returns how many players were loaded.
  function setDesign(design) {
    const src = design && design.players && typeof design.players === 'object' ? design.players : {};
    const list = [];
    for (const id of Object.keys(src)) {
      const p = src[id] || {};
      list.push({
        id,
        name: typeof p.name === 'string' ? p.name : id,
        price: Number(p.price_hint) || 0,
        range: Number(p.range_cells) || 0
      });
    }
    list.sort((a, b) => (a.price - b.price) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    players = list;
    return players.length;
  }

  function getPlayers() {
    return players.slice();
  }

  function isKnown(playerId) {
    return players.some((p) => p.id === playerId);
  }

  function spriteFiles(playerId) {
    return { off: SPRITE_DIR + playerId + '.png', on: SPRITE_DIR + playerId + '_on.png' };
  }

  // [{roomId, playerId}] for every placed player with a known id. Old saves without the field give [].
  function placedList(save) {
    const s = Contract.migrateMusicSave(save);
    return Object.keys(s.playerPlaced)
      .map((roomId) => ({ roomId, playerId: s.playerPlaced[roomId] }))
      .filter((e) => isKnown(e.playerId));
  }

  // Record ids with count > 0, sorted (the queue for the player).
  function recordQueue(save) {
    const s = Contract.migrateMusicSave(save);
    return Object.keys(s.records).filter((id) => s.records[id] > 0).sort();
  }

  // Sound needs a placed player and at least one record. Without hardware there is no sound.
  function canPlayMusic(save) {
    return placedList(save).length > 0 && recordQueue(save).length > 0;
  }

  // Owned player -> placed in roomId. Returns the new save, or null when the move is not allowed
  // (unknown player, not owned, room already has a player, bad room id).
  function placePlayer(save, roomId, playerId) {
    const s = Contract.migrateMusicSave(save);
    if (typeof roomId !== 'string' || roomId === '' || !isKnown(playerId)) return null;
    if (hasOwn(s.playerPlaced, roomId) || !s.playerOwned.includes(playerId)) return null;
    const placed = Object.assign({}, s.playerPlaced);
    placed[roomId] = playerId;
    return Object.assign({}, s, {
      playerOwned: s.playerOwned.filter((id) => id !== playerId),
      playerPlaced: placed
    });
  }

  // Placed in roomId -> back to playerOwned. Returns the new save, or null when nothing stands there.
  function pickUpPlayer(save, roomId) {
    const s = Contract.migrateMusicSave(save);
    if (!hasOwn(s.playerPlaced, roomId)) return null;
    const playerId = s.playerPlaced[roomId];
    const placed = Object.assign({}, s.playerPlaced);
    delete placed[roomId];
    const owned = s.playerOwned.includes(playerId) ? s.playerOwned : s.playerOwned.concat([playerId]);
    return Object.assign({}, s, { playerOwned: owned, playerPlaced: placed });
  }

  // Points the mini player (A4 engine) at the record queue. Silent (empty queue) without a placed player.
  // Same save state as the last call: nothing happens, so playback is not restarted by the poll.
  let lastKey = null;
  function syncEngine(engine, save) {
    const queue = canPlayMusic(save) ? recordQueue(save) : [];
    const key = queue.join(',');
    if (key === lastKey) return queue.length;
    lastKey = key;
    return engine.setQueue(queue);
  }

  // Room layer: draws each placed player at its spot, animated while canPlayMusic(save).
  // sheetOf(playerId) -> {off: Image, on: Image}; now in ms. Returns how many players were drawn.
  // scene.state is the game state the room canvas gets (the root); the music save sits under its "music" key.
  function drawPlayers(ctx, scene, sheetOf, now) {
    const save = scene && scene.state && scene.state.music ? scene.state.music : {};
    const placed = placedList(save);
    const live = canPlayMusic(save);
    const floorY = scene && Number.isFinite(scene.floorY) ? scene.floorY : FLOOR_Y;
    let drawn = 0;
    placed.forEach((e, i) => {
      const sheet = sheetOf(e.playerId);
      if (!sheet || !sheet.off || !sheet.off.complete || !(sheet.off.naturalWidth > 0)) return;
      const w = sheet.off.naturalWidth;
      const h = sheet.off.naturalHeight;
      const x = SPOT_X[i % SPOT_X.length];
      const y = floorY - h;
      if (live && sheet.on && sheet.on.complete && sheet.on.naturalWidth >= w) {
        const frames = Math.max(1, Math.floor(sheet.on.naturalWidth / w));
        const f = Math.floor((now || 0) / FRAME_MS) % frames;
        ctx.drawImage(sheet.on, f * w, 0, w, h, x, y, w, h);
      } else {
        ctx.drawImage(sheet.off, x, y);
      }
      drawn++;
    });
    return drawn;
  }

  // ---- Browser: sprites, design file and the room layer (not run in Node) ----
  const images = {};
  function sheetOf(playerId) {
    if (!images[playerId]) {
      const files = spriteFiles(playerId);
      const base = browserBase();
      const load = (src) => {
        const img = new Image();
        img.onerror = () => console.warn('CuyMusicWorld: failed to load ' + src);
        img.src = src;
        return img;
      };
      images[playerId] = { off: load(base + files.off), on: load(base + files.on) };
    }
    return images[playerId];
  }

  function browserBase() {
    const isWebView = window.chrome && window.chrome.webview;
    return isWebView ? 'https://cuy.assets/' : '../../assets/';
  }

  function registerLayer() {
    if (!window.CuyRoom) return false;
    window.CuyRoom.addLayer('music_players', 3, (ctx, scene) => {
      drawPlayers(ctx, scene, sheetOf, performance.now());
    });
    return true;
  }

  function browserStart() {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof fetch !== 'function') return;
    fetch(browserBase() + 'records/players_design.json')
      .then((r) => r.json())
      .then((design) => setDesign(design))
      .catch((err) => console.warn('CuyMusicWorld: design file not loaded: ' + (err && err.message)));
    // PigCanvas is created later in app.js, so the layer is registered on the first tries after load.
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (registerLayer() || tries > 100) clearInterval(timer);
    }, 100);
    startQueueSync();
  }

  // Feeds the mini player queue from the save (state.music, exposed by the C# side) on every state update.
  // Waits for the bridge and for the mini player engine, which are created on their own schedule.
  function syncFromState() {
    const player = window.CuyMusicPlayer;
    const engine = player && typeof player.autoEngine === 'function' ? player.autoEngine() : null;
    const bridge = window.bridge;
    if (!engine || !bridge || typeof bridge.getState !== 'function') return false;
    try {
      const state = bridge.getState() || {};
      syncEngine(engine, state.music || {});
    } catch (err) {
      console.warn('CuyMusicWorld: queue not synced: ' + (err && err.message));
    }
    return true;
  }

  function startQueueSync() {
    let tries = 0;
    let subscribed = false;
    const timer = setInterval(() => {
      tries++;
      if (!subscribed && window.bridge && typeof window.bridge.onState === 'function') {
        window.bridge.onState(() => syncFromState());
        subscribed = true;
      }
      if (syncFromState() && subscribed) clearInterval(timer);
      if (tries > 100) clearInterval(timer);
    }, 100);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState !== 'loading') browserStart();
    else document.addEventListener('DOMContentLoaded', browserStart);
  }

  return {
    setDesign,
    getPlayers,
    spriteFiles,
    placedList,
    recordQueue,
    canPlayMusic,
    placePlayer,
    pickUpPlayer,
    syncEngine,
    drawPlayers,
    registerLayer
  };
});
