using System.Collections.Generic;

namespace Cuy.Core.Music
{
    // Music prices in clovers (A6, decision D3). C# is the source of truth for purchases (MusicShop).
    // web/home/features/music/prices.js shows the same numbers; tools/qa/music-economy-test.js checks they match.
    // Decision D5e (docs/ECONOMY_AUDIT.md): common 50, rare 150, unique 150 (no source before, priced at rare), portable 200.
    public static class MusicPrices
    {
        // Records by rarity (assets/records/manifest.json). 'unique' has no source, so it gets the rare price (D5e).
        public static readonly IReadOnlyDictionary<string, int> RecordPriceByRarity = new Dictionary<string, int>
        {
            { "common", 50 },
            { "rare", 150 },
            { "unique", 150 },
        };

        // Players, cheapest first. player_turntable is the starter (granted once for free, see GameState.EnsureMusic).
        public static readonly IReadOnlyDictionary<string, int> PlayerPriceById = new Dictionary<string, int>
        {
            { "player_turntable", 120 }, // starter
            { "player_portable", 200 },
            { "player_gramophone", 400 }, // TODO-D3
            { "player_cassette", 600 }, // TODO-D3
            { "player_boombox", 900 }, // TODO-D3
            { "player_jukebox", 1400 }, // TODO-D3
        };
    }
}
