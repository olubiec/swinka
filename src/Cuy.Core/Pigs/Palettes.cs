using System;
using System.Collections.Generic;
using System.Globalization;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Pigs
{
    /// <summary>Coat palettes: exact colour remaps of the ginger sprite sheets (assets/sprites/palettes.json).</summary>
    public class Palettes
    {
        public const string DefaultId = "tricolor";

        /// <summary>One colour swap as 0xRRGGBB values.</summary>
        public struct Pair
        {
            public int From;
            public int To;
            public Pair(int from, int to) { From = from; To = to; }
        }

        private readonly Dictionary<string, Pair[]> _map = new Dictionary<string, Pair[]>(StringComparer.OrdinalIgnoreCase);

        public string Default { get; private set; } = DefaultId;

        public IEnumerable<string> Ids { get { return _map.Keys; } }

        public static Palettes Parse(string json)
        {
            var result = new Palettes();
            var root = JObject.Parse(json);
            var def = (string)root["default"];
            if (!string.IsNullOrEmpty(def)) result.Default = def;
            var pals = root["palettes"] as JObject;
            if (pals == null) return result;
            foreach (var prop in pals.Properties())
            {
                var list = new List<Pair>();
                foreach (var item in (JArray)prop.Value)
                {
                    list.Add(new Pair(ParseHex((string)item[0]), ParseHex((string)item[1])));
                }
                result._map[prop.Name] = list.ToArray();
            }
            return result;
        }

        public static int ParseHex(string hex)
        {
            return int.Parse(hex.TrimStart('#'), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
        }

        public bool Has(string id)
        {
            return id != null && _map.ContainsKey(id);
        }

        /// <summary>Unknown or null ids fall back to the default palette (never throws).</summary>
        public string Normalize(string id)
        {
            return Has(id) ? id : Default;
        }

        public Pair[] Get(string id)
        {
            Pair[] pairs;
            if (id != null && _map.TryGetValue(id, out pairs)) return pairs;
            return _map.TryGetValue(Default, out pairs) ? pairs : new Pair[0];
        }
    }
}
