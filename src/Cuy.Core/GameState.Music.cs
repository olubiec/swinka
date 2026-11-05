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

        /// <summary>Music players placed in rooms: room id -> record id in the player. Missing in old saves = empty.</summary>
        [JsonConverter(typeof(RecordPlacementConverter))]
        public Dictionary<string, string> PlayerPlaced { get; set; } = new Dictionary<string, string>();
    }
}
