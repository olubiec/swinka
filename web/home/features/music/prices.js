// Music prices in clovers (A6, decision D3). ONE place for every music price.
// TODO-D3: temporary values. The simulator (D3e) sets the final numbers; do not tune them by hand.
// Records: by rarity from assets/records/manifest.json. 'unique' has no price yet (not for sale).
// Players: cheapest first; player_turntable is the starter player (granted once, see economy.js).
// Browser: window.CuyMusicPrices. Node: require().
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CuyMusicPrices = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const RECORD_PRICE = Object.freeze({
    common: 60, // TODO-D3 range 40-80
    rare: 200 // TODO-D3 range 150-300
  });

  const PLAYER_PRICE = Object.freeze({
    player_turntable: 120, // TODO-D3 (starter, granted for free once)
    player_portable: 250, // TODO-D3
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
