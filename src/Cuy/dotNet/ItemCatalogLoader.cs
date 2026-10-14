using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Cuy
{
    public class CuyItemDef
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public int? Price { get; set; }
        public bool IsUnlimited { get; set; }
        public string IconName { get; set; }
        public string Animation { get; set; }
        public Dictionary<string, double> Effects { get; set; } = new Dictionary<string, double>();
        public string Description { get; set; }
    }

    /// <summary>
    /// Katalog przedmiotów świnki, wczytywany z assets/data/items.json.
    /// Zawiera też bezpieczne domyślne definicje podstawowych przedmiotów (hay, bell_pepper itd.).
    /// </summary>
    public static class ItemCatalogLoader
    {
        private static readonly object _syncLock = new object();
        private static Dictionary<string, CuyItemDef> _items;

        public static CuyItemDef GetItem(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return null;
            EnsureLoaded();

            CuyItemDef def;
            if (_items.TryGetValue(itemId, out def))
            {
                return def;
            }

            // Fallback dla nieznanego przedmiotu
            return new CuyItemDef
            {
                Id = itemId,
                Name = char.ToUpper(itemId[0]) + itemId.Substring(1),
                Category = "other",
                IconName = itemId,
                Animation = "eat_treat"
            };
        }

        public static IReadOnlyCollection<CuyItemDef> GetAll()
        {
            EnsureLoaded();
            return _items.Values;
        }

        private static void EnsureLoaded()
        {
            if (_items != null) return;
            lock (_syncLock)
            {
                if (_items != null) return;

                var map = new Dictionary<string, CuyItemDef>(StringComparer.OrdinalIgnoreCase);

                // Default values (overridden by items.json when present)
                AddDefault(map, "hay", "Siano", "food", 0, true, "hay", "eat",
                    new Dictionary<string, double> { { "fullness", 10 }, { "teeth", 6 } });
                AddDefault(map, "pellets", "Granulat", "food", 5, false, "pellets", "eat_bowl",
                    new Dictionary<string, double> { { "fullness", 20 }, { "vitamin_c", 5 } });
                AddDefault(map, "bell_pepper", "Papryka", "vegetable", 12, false, "bell_pepper", "eat_treat",
                    new Dictionary<string, double> { { "fullness", 8 }, { "vitamin_c", 35 }, { "mood", 5 } });
                AddDefault(map, "parsley", "Natka pietruszki", "vegetable", 8, false, "parsley", "eat_treat",
                    new Dictionary<string, double> { { "fullness", 6 }, { "vitamin_c", 20 } });
                AddDefault(map, "kale", "Jarmuż", "vegetable", 10, false, "kale", "eat_big",
                    new Dictionary<string, double> { { "fullness", 10 }, { "vitamin_c", 25 }, { "teeth", 3 } });
                AddDefault(map, "cucumber", "Ogórek", "vegetable", 5, false, "cucumber", "eat_treat",
                    new Dictionary<string, double> { { "fullness", 6 }, { "mood", 4 }, { "vitamin_c", 2 } });
                AddDefault(map, "carrot", "Marchewka", "treat", 8, false, "carrot", "eat_treat",
                    new Dictionary<string, double> { { "fullness", 8 }, { "mood", 10 }, { "vitamin_c", 3 } });
                AddDefault(map, "chew_stick", "Gryzak", "chew", 20, false, "chew_stick", "chew_stick",
                    new Dictionary<string, double> { { "teeth", 40 }, { "mood", 5 } });
                AddDefault(map, "ball", "Piłeczka", "toy", 60, false, "ball", "ball_push",
                    new Dictionary<string, double> { { "mood", 15 }, { "energy", -5 } });
                AddDefault(map, "tunnel", "Tunel", "toy", 150, false, "tunnel", "tunnel_in",
                    new Dictionary<string, double> { { "mood", 20 }, { "energy", -8 } });
                AddDefault(map, "house", "Domek", "furniture", 250, false, "house", "sleep_house",
                    new Dictionary<string, double> { { "energy", 10 }, { "mood", 5 } });
                AddDefault(map, "water_bottle", "Poidło", "furniture", 40, false, "water_bottle", "drink",
                    new Dictionary<string, double> { { "mood", 2 }, { "fullness", 2 } });
                AddDefault(map, "cake", "Tort z selera", "special", null, false, "cake", "party",
                    new Dictionary<string, double> { { "fullness", 15 }, { "mood", 30 }, { "vitamin_c", 10 } });

                // Próba wczytania assets/data/items.json
                string jsonPath = FindFile(Path.Combine("assets", "data", "items.json"))
                               ?? FindFile(Path.Combine("data", "items.json"))
                               ?? FindFile(Path.Combine("items.json"));

                if (!string.IsNullOrEmpty(jsonPath))
                {
                    try
                    {
                        string json = File.ReadAllText(jsonPath);
                        var root = JObject.Parse(json);
                        var itemsArr = root["items"] as JArray;
                        if (itemsArr != null)
                        {
                            foreach (var tok in itemsArr)
                            {
                                string id = (string)(tok["id"]);
                                if (string.IsNullOrEmpty(id)) continue;

                                var def = new CuyItemDef
                                {
                                    Id = id,
                                    Name = (string)tok["name"] ?? id,
                                    Category = (string)tok["category"] ?? "other",
                                    Price = tok["price"] != null && tok["price"].Type == JTokenType.Integer ? (int?)tok["price"] : null,
                                    IsUnlimited = (bool?)tok["unlimited"] ?? false,
                                    IconName = (string)tok["icon"] ?? id,
                                    Animation = (string)tok["animation"] ?? "eat_treat",
                                    Description = (string)tok["description"] ?? ""
                                };

                                var effectsTok = tok["effects"] as JObject;
                                if (effectsTok != null)
                                {
                                    foreach (var prop in effectsTok.Properties())
                                    {
                                        def.Effects[prop.Name] = (double)prop.Value;
                                    }
                                }

                                map[id] = def;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        BrainController.Log("[ERROR] Failed to load items.json: " + ex.Message);
                    }
                }

                _items = map;
            }
        }

        private static void AddDefault(Dictionary<string, CuyItemDef> map, string id, string name, string cat, int? price, bool unlimited, string icon, string anim, Dictionary<string, double> effects)
        {
            var def = new CuyItemDef
            {
                Id = id,
                Name = name,
                Category = cat,
                Price = price,
                IsUnlimited = unlimited,
                IconName = icon,
                Animation = anim,
                Effects = effects
            };
            map[id] = def;
        }

        private static string FindFile(string relativePath)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] searchPaths = new string[]
            {
                Path.Combine(baseDir, relativePath),
                Path.Combine(baseDir, "..", relativePath),
                Path.Combine(baseDir, "..", "..", relativePath),
                Path.Combine(baseDir, "..", "..", "..", relativePath),
                Path.Combine(baseDir, "..", "..", "..", "..", relativePath),
                Path.Combine(Directory.GetCurrentDirectory(), relativePath)
            };

            foreach (var p in searchPaths)
            {
                try
                {
                    if (File.Exists(p)) return Path.GetFullPath(p);
                }
                catch { }
            }

            return null;
        }
    }
}
