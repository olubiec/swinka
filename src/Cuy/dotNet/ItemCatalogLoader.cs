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

    /// <summary>Alias dla kompatybilności wstecznej.</summary>
    public class SwinkaItemDef : CuyItemDef { }

    /// <summary>
    /// Katalog przedmiotów świnki, wczytywany z assets/data/items.json.
    /// Zawiera też bezpieczne domyślne definicje podstawowych przedmiotów (hay/siano, bell_pepper/papryka, itp.).
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

                // Domyślne wartości z PLAN.md i items.json (zarówno klucze polskie, jak i angielskie)
                AddDefault(map, "hay", "siano", "Siano", "food", 0, true, "hay", "eat",
                    new Dictionary<string, double> { { "satiety", 10 }, { "teeth", 6 } });
                AddDefault(map, "pellets", "granulat", "Granulat", "food", 5, false, "pellets", "eat_bowl",
                    new Dictionary<string, double> { { "satiety", 20 }, { "vitamin_c", 5 } });
                AddDefault(map, "bell_pepper", "papryka", "Papryka", "vegetable", 12, false, "bell_pepper", "eat_treat",
                    new Dictionary<string, double> { { "satiety", 8 }, { "vitamin_c", 35 }, { "mood", 5 } });
                AddDefault(map, "parsley", "natka", "Natka pietruszki", "vegetable", 8, false, "parsley", "eat_treat",
                    new Dictionary<string, double> { { "satiety", 6 }, { "vitamin_c", 20 } });
                AddDefault(map, "kale", "jarmuz", "Jarmuż", "vegetable", 10, false, "kale", "eat_big",
                    new Dictionary<string, double> { { "satiety", 10 }, { "vitamin_c", 25 }, { "teeth", 3 } });
                AddDefault(map, "cucumber", "ogorek", "Ogórek", "vegetable", 5, false, "cucumber", "eat_treat",
                    new Dictionary<string, double> { { "satiety", 6 }, { "mood", 4 }, { "vitamin_c", 2 } });
                AddDefault(map, "carrot", "marchewka", "Marchewka", "treat", 8, false, "carrot", "eat_treat",
                    new Dictionary<string, double> { { "satiety", 8 }, { "mood", 10 }, { "vitamin_c", 3 } });
                AddDefault(map, "chew_toy", "gryzak", "Gryzak", "chew", 20, false, "chew_toy", "chew_stick",
                    new Dictionary<string, double> { { "teeth", 40 }, { "mood", 5 } });
                AddDefault(map, "ball", "pilka", "Piłeczka", "toy", 60, false, "ball", "ball_push",
                    new Dictionary<string, double> { { "mood", 15 }, { "energy", -5 } });
                AddDefault(map, "tunnel", "tunel", "Tunel", "toy", 150, false, "tunnel", "tunnel_in",
                    new Dictionary<string, double> { { "mood", 20 }, { "energy", -8 } });
                AddDefault(map, "house", "domek", "Domek", "furniture", 250, false, "house", "sleep_house",
                    new Dictionary<string, double> { { "energy", 10 }, { "mood", 5 } });
                AddDefault(map, "water_bottle", "poidlo", "Poidło", "furniture", 40, false, "water_bottle", "drink",
                    new Dictionary<string, double> { { "mood", 2 }, { "satiety", 2 } });
                AddDefault(map, "cake", "tort", "Tort z selera", "special", null, false, "cake", "party",
                    new Dictionary<string, double> { { "satiety", 15 }, { "mood", 30 }, { "vitamin_c", 10 } });

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
                        var itemsArr = (root["items"] ?? root["przedmioty"]) as JArray;
                        if (itemsArr != null)
                        {
                            foreach (var tok in itemsArr)
                            {
                                string id = (string)(tok["id"]);
                                if (string.IsNullOrEmpty(id)) continue;

                                var def = new CuyItemDef
                                {
                                    Id = id,
                                    Name = (string)(tok["name"] ?? tok["nazwa"]) ?? id,
                                    Category = (string)(tok["category"] ?? tok["kategoria"]) ?? "other",
                                    Price = tok["price"] != null && tok["price"].Type == JTokenType.Integer ? (int?)tok["price"] :
                                            tok["cena"] != null && tok["cena"].Type == JTokenType.Integer ? (int?)tok["cena"] : null,
                                    IsUnlimited = (bool?)(tok["unlimited"] ?? tok["bez_limitu"]) ?? false,
                                    IconName = (string)(tok["icon"] ?? tok["ikona"]) ?? id,
                                    Animation = (string)(tok["animation"] ?? tok["animacja"]) ?? "eat_treat",
                                    Description = (string)(tok["description"] ?? tok["opis"]) ?? ""
                                };

                                var effectsTok = (tok["effects"] ?? tok["efekty"]) as JObject;
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
                        BrainController.Log("[Błąd] Nie udało się wczytać items.json: " + ex.Message);
                    }
                }

                _items = map;
            }
        }

        private static void AddDefault(Dictionary<string, CuyItemDef> map, string englishId, string polishId, string name, string cat, int? price, bool unlimited, string icon, string anim, Dictionary<string, double> effects)
        {
            var def = new CuyItemDef
            {
                Id = englishId,
                Name = name,
                Category = cat,
                Price = price,
                IsUnlimited = unlimited,
                IconName = icon,
                Animation = anim,
                Effects = effects
            };
            map[englishId] = def;
            if (!string.Equals(englishId, polishId, StringComparison.OrdinalIgnoreCase))
            {
                map[polishId] = def;
            }
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

    /// <summary>Alias dla kompatybilności wstecznej.</summary>
    public static class SwinkaItemCatalog
    {
        public static CuyItemDef GetItem(string itemId) => ItemCatalogLoader.GetItem(itemId);
        public static IReadOnlyCollection<CuyItemDef> GetAll() => ItemCatalogLoader.GetAll();
    }
}
