using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace DesktopPet
{
    public sealed class SwinkaItemDef
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
    /// Katalog przedmiotów świnki, wczytywany z swinka/dane/items.json.
    /// Zawiera też bezpieczne domyślne definicje podstawowych przedmiotów (siano, papryka, itp.).
    /// </summary>
    public static class SwinkaItemCatalog
    {
        private static readonly object _syncLock = new object();
        private static Dictionary<string, SwinkaItemDef> _items;

        public static SwinkaItemDef GetItem(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return null;
            EnsureLoaded();

            SwinkaItemDef def;
            if (_items.TryGetValue(itemId, out def))
            {
                return def;
            }

            // Fallback dla nieznanego przedmiotu
            return new SwinkaItemDef
            {
                Id = itemId,
                Name = char.ToUpper(itemId[0]) + itemId.Substring(1),
                Category = "inne",
                IconName = itemId,
                Animation = "eat_treat"
            };
        }

        public static IReadOnlyCollection<SwinkaItemDef> GetAll()
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

                var map = new Dictionary<string, SwinkaItemDef>(StringComparer.OrdinalIgnoreCase);

                // Domyślne wartości z PLAN.md i items.json
                AddDefault(map, "siano", "Siano", "jedzenie", 0, true, "siano", "eat",
                    new Dictionary<string, double> { { "najedzenie", 10 }, { "zabki", 6 } });
                AddDefault(map, "granulat", "Granulat", "jedzenie", 5, false, "granulat", "eat_bowl",
                    new Dictionary<string, double> { { "najedzenie", 20 }, { "witamina_c", 5 } });
                AddDefault(map, "papryka", "Papryka", "warzywo", 12, false, "papryka", "eat_treat",
                    new Dictionary<string, double> { { "najedzenie", 8 }, { "witamina_c", 35 }, { "humor", 5 } });
                AddDefault(map, "natka", "Natka pietruszki", "warzywo", 8, false, "natka", "eat_treat",
                    new Dictionary<string, double> { { "najedzenie", 6 }, { "witamina_c", 20 } });
                AddDefault(map, "jarmuz", "Jarmuż", "warzywo", 10, false, "jarmuz", "eat_big",
                    new Dictionary<string, double> { { "najedzenie", 10 }, { "witamina_c", 25 }, { "zabki", 3 } });
                AddDefault(map, "ogorek", "Ogórek", "warzywo", 5, false, "ogorek", "eat_treat",
                    new Dictionary<string, double> { { "najedzenie", 6 }, { "humor", 4 }, { "witamina_c", 2 } });
                AddDefault(map, "marchewka", "Marchewka", "smakolyk", 8, false, "marchewka", "eat_treat",
                    new Dictionary<string, double> { { "najedzenie", 8 }, { "humor", 10 }, { "witamina_c", 3 } });
                AddDefault(map, "gryzak", "Gryzak", "gryzak", 20, false, "gryzak", "chew_stick",
                    new Dictionary<string, double> { { "zabki", 40 }, { "humor", 5 } });
                AddDefault(map, "pilka", "Piłeczka", "zabawka", 60, false, "pilka", "ball_push",
                    new Dictionary<string, double> { { "humor", 15 }, { "energia", -5 } });
                AddDefault(map, "tunel", "Tunel", "zabawka", 150, false, "tunel", "tunnel_in",
                    new Dictionary<string, double> { { "humor", 20 }, { "energia", -8 } });
                AddDefault(map, "domek", "Domek", "wyposazenie", 250, false, "domek", "sleep_house",
                    new Dictionary<string, double> { { "energia", 10 }, { "humor", 5 } });
                AddDefault(map, "poidlo", "Poidło", "wyposazenie", 40, false, "poidlo", "drink",
                    new Dictionary<string, double> { { "humor", 2 }, { "najedzenie", 2 } });
                AddDefault(map, "tort", "Tort z selera", "specjalne", null, false, "tort", "party",
                    new Dictionary<string, double> { { "najedzenie", 15 }, { "humor", 30 }, { "witamina_c", 10 } });

                // Próba wczytania swinka/dane/items.json
                string jsonPath = FindFile(Path.Combine("swinka", "dane", "items.json"));
                if (!string.IsNullOrEmpty(jsonPath))
                {
                    try
                    {
                        string json = File.ReadAllText(jsonPath);
                        var root = JObject.Parse(json);
                        var itemsArr = root["przedmioty"] as JArray;
                        if (itemsArr != null)
                        {
                            foreach (var tok in itemsArr)
                            {
                                string id = (string)tok["id"];
                                if (string.IsNullOrEmpty(id)) continue;

                                var def = new SwinkaItemDef
                                {
                                    Id = id,
                                    Name = (string)tok["nazwa"] ?? id,
                                    Category = (string)tok["kategoria"] ?? "inne",
                                    Price = tok["cena"] != null && tok["cena"].Type == JTokenType.Integer ? (int?)tok["cena"] : null,
                                    IsUnlimited = (bool?)tok["bez_limitu"] ?? false,
                                    IconName = (string)tok["ikona"] ?? id,
                                    Animation = (string)tok["animacja"] ?? "eat_treat",
                                    Description = (string)tok["opis"] ?? ""
                                };

                                var effectsTok = tok["efekty"] as JObject;
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
                        SwinkaBrainController.Log("[Błąd] Nie udało się wczytać items.json: " + ex.Message);
                    }
                }

                _items = map;
            }
        }

        private static void AddDefault(Dictionary<string, SwinkaItemDef> map, string id, string name, string cat, int? price, bool unlimited, string icon, string anim, Dictionary<string, double> effects)
        {
            map[id] = new SwinkaItemDef
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
