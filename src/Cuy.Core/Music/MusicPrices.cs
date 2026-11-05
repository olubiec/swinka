using System.Collections.Generic;

namespace Cuy.Core.Music
{
    // Music prices in clovers (A6, decision D3). C# is the source of truth for purchases (MusicShop).
    // web/home/features/music/prices.js shows the same numbers; tools/qa/music-economy-test.js checks they match.
    // TODO-D3: temporary values. The simulator (D3e) sets the final numbers; do not tune them by hand.
    public static class MusicPrices
    {
        // Records by rarity (assets/records/manifest.json). 'unique' has no price yet (not for sale).
        public static readonly IReadOnlyDictionary<string, int> RecordPriceByRarity = new Dictionary<string, int>
        {
            { "common", 60 }, // TODO-D3 range 40-80
            { "rare", 200 }, // TODO-D3 range 150-300
        };

        // Players, cheapest first. player_turntable is the starter (granted once for free, see GameState.EnsureMusic).
        public static readonly IReadOnlyDictionary<string, int> PlayerPriceById = new Dictionary<string, int>
        {
            { "player_turntable", 120 }, // TODO-D3 (starter)
            { "player_portable", 250 }, // TODO-D3
            { "player_gramophone", 400 }, // TODO-D3
            { "player_cassette", 600 }, // TODO-D3
            { "player_boombox", 900 }, // TODO-D3
            { "player_jukebox", 1400 }, // TODO-D3
        };
    }
}
