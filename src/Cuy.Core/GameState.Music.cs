using System.Collections.Generic;
using Cuy.Core.Music;
using Newtonsoft.Json;

namespace Cuy.Core
{
    public sealed partial class GameState
    {
        /// <summary>Records (vinyl discs) owned as items: record id -> count. Missing in old saves = empty.</summary>
        [JsonConverter(typeof(RecordCountsConverter))]
        public Dictionary<string, int> Records { get; set; } = new Dictionary<string, int>();

        /// <summary>Record ids the player owns (shelf). Missing in old saves = empty.</summary>
        [JsonConverter(typeof(RecordIdListConverter))]
        public List<string> PlayerOwned { get; set; } = new List<string>();

        /// <summary>Music players placed in rooms: room id -> player id (the player standing in the room, see contract.js). Missing in old saves = empty.</summary>
        [JsonConverter(typeof(RecordPlacementConverter))]
        public Dictionary<string, string> PlayerPlaced { get; set; } = new Dictionary<string, string>();

        /// <summary>1 once the starter player was granted (A6). Missing in old saves = 0.</summary>
        public int MusicVersion { get; set; }

        /// <summary>Starter player for every save that has not got it yet (once). Mirrors economy.js starterSave.</summary>
        public void EnsureMusic()
        {
            if (Records == null) Records = new Dictionary<string, int>();
            if (PlayerOwned == null) PlayerOwned = new List<string>();
            if (PlayerPlaced == null) PlayerPlaced = new Dictionary<string, string>();
            if (MusicVersion >= 1) return;
            const string starter = "player_turntable";
            if (!PlayerOwned.Contains(starter) && !PlayerPlaced.ContainsValue(starter)) PlayerOwned.Add(starter);
            MusicVersion = 1;
        }
    }
}
