// Music (record player) save contract: pure functions, no DOM.
// Mirrors src/Cuy.Core/Music/MusicSaveConverters.cs (the C# side owns the save file).
// Save fields: records {recordId: count}, playerOwned [playerId], playerPlaced {roomId: playerId}
// (the value of playerPlaced is the id of the music player standing in the room, not a record id).
// Missing or wrong-typed fields become empty values; bad entries are dropped; nothing throws.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CuyMusicContract = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const TRACK_POOL_SIZE = 5; // D2: shared pool of the first 5 files in assets/music/tracks.json

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  // FNV-1a 32-bit over UTF-16 code units; stable across runs and platforms.
  function hashId(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  // D2: index = hash(record id) mod 5. Returns the manifest entry, or null when the manifest is short.
  function trackForRecord(recordId, tracks) {
    if (typeof recordId !== 'string' || recordId === '') return null;
    if (!Array.isArray(tracks)) return null;
    const entry = tracks[hashId(recordId) % TRACK_POOL_SIZE];
    return entry === undefined ? null : entry;
  }

  function sanitizeRecords(v) {
    const out = {};
    if (!isPlainObject(v)) return out;
    for (const key of Object.keys(v)) {
      const n = v[key];
      if (key !== '' && Number.isInteger(n) && n > 0 && n <= 2147483647) out[key] = n;
    }
    return out;
  }

  function sanitizePlayerOwned(v) {
    const out = [];
    if (!Array.isArray(v)) return out;
    for (const id of v) {
      if (typeof id === 'string' && id !== '' && !out.includes(id)) out.push(id);
    }
    return out;
  }

  function sanitizePlayerPlaced(v) {
    const out = {};
    if (!isPlainObject(v)) return out;
    for (const key of Object.keys(v)) {
      const id = v[key];
      if (key !== '' && typeof id === 'string' && id !== '') out[key] = id;
    }
    return out;
  }

  // Returns a copy of the save with the three music fields sanitized; every other field is kept.
  function migrateMusicSave(save) {
    const src = isPlainObject(save) ? save : {};
    return Object.assign({}, src, {
      records: sanitizeRecords(src.records),
      playerOwned: sanitizePlayerOwned(src.playerOwned),
      playerPlaced: sanitizePlayerPlaced(src.playerPlaced)
    });
  }

  return {
    TRACK_POOL_SIZE,
    hashId,
    trackForRecord,
    migrateMusicSave,
    sanitizeRecords,
    sanitizePlayerOwned,
    sanitizePlayerPlaced
  };
});
