// Music economy (A6): the one-time starter player, the shop items for the existing shop (features/shop) and
// the purchase request. The balance and the save are owned by C# (MusicShop.cs / MusicFeature.cs): buy sends
// musicBuy and the new state comes back through the bridge. Prices shown here: prices.js (TODO-D3, same numbers as C#).
// Save fields: records, playerOwned, playerPlaced (contract.js) and musicVersion (1 = starter granted).
// The C# side (GameState.Music.cs) applies the same starter rule on load.
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports && typeof require === 'function'
      ? { Contract: require('./contract.js'), Prices: require('./prices.js') }
      : { Contract: root && root.CuyMusicContract, Prices: root && root.CuyMusicPrices }
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CuyMusicEconomy = api;
})(typeof window !== 'undefined' ? window : null, function (deps) {
  'use strict';

  const Contract = deps.Contract;
  const Prices = deps.Prices;
  const MUSIC_VERSION = 1;

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  // Old saves have no musicVersion (0): the starter player is added once and the version is set to 1.
  // Saves at version 1 or later are returned unchanged (no duplicate).
  function starterSave(save) {
    const src = isPlainObject(save) ? save : {};
    const s = Contract.migrateMusicSave(src);
    const version = Number.isInteger(src.musicVersion) ? src.musicVersion : 0;
    if (version >= MUSIC_VERSION) return Object.assign({}, s, { musicVersion: version });
    const starter = Prices.STARTER_PLAYER;
    const known = s.playerOwned.includes(starter) || Object.values(s.playerPlaced).includes(starter);
    return Object.assign({}, s, {
      playerOwned: known ? s.playerOwned : s.playerOwned.concat([starter]),
      musicVersion: MUSIC_VERSION
    });
  }

  // ---- Browser: shop items and the purchase message (not run in Node) ----
  let manifestRecords = [];

  // Shop entries for features/shop: records (toy tab) and players, each with the purchase message in `music`.
  // state = bridge state (save fields come from the C# state; empty until the C# side exposes them).
  function shopItems(state, playerList) {
    const s = Contract.migrateMusicSave(state && state.music ? state.music : state);
    const items = [];
    for (const r of manifestRecords) {
      const price = Prices.recordPrice(r.rarity);
      if (price === null) continue;
      items.push({
        id: 'record:' + r.id,
        name: r.name,
        category: 'toy',
        price,
        icon: r.icon ? 'icon-' + String(r.icon).replace(/_/g, '-') : '',
        description: 'Record, ' + r.rarity,
        music: { kind: 'record', itemId: r.id, rarity: r.rarity },
        owned: s.records[r.id] || 0
      });
    }
    for (const p of playerList || []) {
      if (Prices.playerPrice(p.id) === null) continue;
      const owned = s.playerOwned.includes(p.id) || Object.values(s.playerPlaced).includes(p.id);
      items.push({
        id: 'player:' + p.id,
        name: p.name,
        category: 'toy',
        price: Prices.playerPrice(p.id),
        icon: '',
        description: 'Record player',
        oneTime: true,
        music: { kind: 'player', itemId: p.id },
        owned: owned ? 1 : 0
      });
    }
    return items;
  }

  // Sends the purchase to the C# side (MusicFeature). The C# side checks the price, the balance and the ownership,
  // then pushes the new state; this file never changes the balance.
  function buy(item) {
    if (!item || !item.music || !window.bridge || typeof window.bridge.send !== 'function') return false;
    window.bridge.send({ type: 'musicBuy', kind: item.music.kind, itemId: item.music.itemId });
    return true;
  }

  function loadManifest() {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    const base = window.chrome && window.chrome.webview ? 'https://cuy.assets/' : '../../assets/';
    fetch(base + 'records/manifest.json')
      .then((r) => r.json())
      .then((m) => { manifestRecords = Array.isArray(m && m.records) ? m.records.filter((r) => r && r.id) : []; })
      .catch((err) => console.warn('CuyMusicEconomy: manifest not loaded: ' + (err && err.message)));
  }
  if (typeof document !== 'undefined') {
    if (document.readyState !== 'loading') loadManifest();
    else document.addEventListener('DOMContentLoaded', loadManifest);
  }

  // Manifest for the shelf and the mini player names (read once from assets/records/manifest.json).
  function manifest() {
    return { records: manifestRecords.slice() };
  }

  function recordName(id) {
    const r = manifestRecords.find((x) => x.id === id);
    return r && typeof r.name === 'string' && r.name !== '' ? r.name : null;
  }

  // Track id from the manifest "tracks" field, or null when the record has none (or the manifest is not loaded).
  function recordTrack(id) {
    const r = manifestRecords.find((x) => x.id === id);
    return r && typeof r.tracks === 'string' && r.tracks !== '' ? r.tracks : null;
  }

  return {
    MUSIC_VERSION,
    starterSave,
    shopItems,
    buy,
    manifest,
    recordName,
    recordTrack
  };
});
