// Music prices in clovers (A6, decision D3). ONE place for every music price.
// Decision D5e (docs/ECONOMY_AUDIT.md): common 50, rare 150, unique 150, portable 200. Keep in sync with MusicPrices.cs.
// Records: by rarity from assets/records/manifest.json. 'unique' has no source, so it gets the rare price (D5e).
// Players: cheapest first; player_turntable is the starter player (granted once, see economy.js).
// Browser: window.CuyMusicPrices. Node: require().
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CuyMusicPrices = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const RECORD_PRICE = Object.freeze({
    common: 50,
    rare: 150,
    unique: 150
  });

  const PLAYER_PRICE = Object.freeze({
    player_turntable: 120, // starter, granted for free once
    player_portable: 200,
    player_gramophone: 400, // TODO-D3
    player_cassette: 600, // TODO-D3
    player_boombox: 900, // TODO-D3
    player_jukebox: 1400 // TODO-D3
  });

  const STARTER_PLAYER = 'player_turntable';

  // Price of a record by rarity, or null when the rarity is not for sale.
  function recordPrice(rarity) {
    return Object.prototype.hasOwnProperty.call(RECORD_PRICE, rarity) ? RECORD_PRICE[rarity] : null;
  }

  // Price of a player by id, or null when the id is unknown.
  function playerPrice(playerId) {
    return Object.prototype.hasOwnProperty.call(PLAYER_PRICE, playerId) ? PLAYER_PRICE[playerId] : null;
  }

  return { RECORD_PRICE, PLAYER_PRICE, STARTER_PLAYER, recordPrice, playerPrice };
});
