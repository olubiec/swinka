using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Cuy.Core
{
    /// <summary>
    /// Katalog przedmiotów wczytywany z swinka/dane/items.json.
    /// Zgodny z .NET Standard 2.0 (brak zależności od WinForms/Win32).
    /// </summary>
    public sealed class ItemCatalog
    {
        private static readonly object _syncLock = new object();
        private static ItemCatalog _defaultInstance;

        private readonly Dictionary<string, ItemDefinition> _itemsById;
        private readonly List<ItemDefinition> _itemsList;

        public string CurrencyName { get; }
        public string CurrencyIcon { get; }

        public IReadOnlyList<ItemDefinition> AllItems => _itemsList;

        public ItemCatalog(IEnumerable<ItemDefinition> items, string currencyName = "koniczynki", string currencyIcon = "koniczynka")
        {
            CurrencyName = currencyName ?? "koniczynki";
            CurrencyIcon = currencyIcon ?? "koniczynka";
            _itemsById = new Dictionary<string, ItemDefinition>(StringComparer.OrdinalIgnoreCase);
            _itemsList = new List<ItemDefinition>();

            if (items != null)
            {
                foreach (var item in items)
                {
                    if (item == null || string.IsNullOrEmpty(item.Id)) continue;
                    _itemsById[item.Id] = item;
                    _itemsList.Add(item);

                    // Rejestracja aliasu angielskiego/polskiego do wyszukiwania
                    string norm = NormalizeId(item.Id);
                    if (!string.Equals(norm, item.Id, StringComparison.OrdinalIgnoreCase) && !_itemsById.ContainsKey(norm))
                    {
                        _itemsById[norm] = item;
                    }
                    string pl = ToPolishId(item.Id);
                    if (!string.Equals(pl, item.Id, StringComparison.OrdinalIgnoreCase) && !_itemsById.ContainsKey(pl))
                    {
                        _itemsById[pl] = item;
                    }
                }
            }
        }

        public ItemDefinition GetItem(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return null;
            ItemDefinition def;
            return _itemsById.TryGetValue(itemId, out def) ? def : null;
        }

        public bool Contains(string itemId)
        {
            return !string.IsNullOrEmpty(itemId) && _itemsById.ContainsKey(itemId);
        }

        public static ItemCatalog Default
        {
            get
            {
                if (_defaultInstance != null) return _defaultInstance;
                lock (_syncLock)
                {
                    if (_defaultInstance == null)
                    {
                        _defaultInstance = LoadDefault();
                    }
                }
                return _defaultInstance;
            }
        }

        public static void SetDefault(ItemCatalog catalog)
        {
            lock (_syncLock)
            {
                _defaultInstance = catalog;
            }
        }

        private static readonly Dictionary<string, string> PolishToEnglishItemIds = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "siano", "hay" },
            { "granulat", "pellets" },
            { "papryka", "bell_pepper" },
            { "natka", "parsley" },
            { "jarmuz", "kale" },
            { "ogorek", "cucumber" },
            { "marchewka", "carrot" },
            { "gryzak", "chew_toy" },
            { "pilka", "ball" },
            { "tunel", "tunnel" },
            { "domek", "house" },
            { "poidlo", "water_bottle" },
            { "tort", "cake" }
        };

        private static readonly Dictionary<string, string> EnglishToPolishItemIds = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "hay", "siano" },
            { "pellets", "granulat" },
            { "bell_pepper", "papryka" },
            { "parsley", "natka" },
            { "kale", "jarmuz" },
            { "cucumber", "ogorek" },
            { "carrot", "marchewka" },
            { "chew_toy", "gryzak" },
            { "ball", "pilka" },
            { "tunnel", "tunel" },
            { "house", "domek" },
            { "water_bottle", "poidlo" },
            { "cake", "tort" }
        };

        public static string NormalizeId(string id)
        {
            if (string.IsNullOrEmpty(id)) return id;
            string mapped;
            if (PolishToEnglishItemIds.TryGetValue(id, out mapped)) return mapped;
            return id;
        }

        public static string ToPolishId(string id)
        {
            if (string.IsNullOrEmpty(id)) return id;
            string mapped;
            if (EnglishToPolishItemIds.TryGetValue(id, out mapped)) return mapped;
            return id;
        }

        public static ItemCatalog LoadJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                throw new ArgumentNullException(nameof(json));

            var root = JObject.Parse(json);
            string currencyName = "clovers";
            string currencyIcon = "clover";

            var walutaTok = (root["currency"] ?? root["waluta"]) as JObject;
            if (walutaTok != null)
            {
                currencyName = (string)(walutaTok["name"] ?? walutaTok["nazwa"]) ?? currencyName;
                currencyIcon = (string)(walutaTok["icon"] ?? walutaTok["ikona"]) ?? currencyIcon;
            }

            var itemsList = new List<ItemDefinition>();
            var przedmiotyArr = (root["items"] ?? root["przedmioty"]) as JArray;
            if (przedmiotyArr != null)
            {
                foreach (var tok in przedmiotyArr)
                {
                    string id = (string)tok["id"];
                    if (string.IsNullOrEmpty(id)) continue;

                    var def = new ItemDefinition
                    {
                        Id = id,
                        Name = (string)(tok["name"] ?? tok["nazwa"]) ?? id,
                        Category = (string)(tok["category"] ?? tok["kategoria"]) ?? "other",
                        Price = tok["price"] != null && tok["price"].Type == JTokenType.Integer ? (int?)tok["price"] :
                                (tok["cena"] != null && tok["cena"].Type == JTokenType.Integer ? (int?)tok["cena"] : null),
                        IsUnlimited = (bool?)(tok["unlimited"] ?? tok["bez_limitu"]) ?? false,
                        IsDurable = (bool?)(tok["durable"] ?? tok["trwale"]) ?? false,
                        IconName = (string)(tok["icon"] ?? tok["ikona"]) ?? id,
                        Animation = (string)(tok["animation"] ?? tok["animacja"]) ?? "eat_treat",
                        Description = (string)(tok["description"] ?? tok["opis"]) ?? "",
                        DailyLimit = (int?)(tok["daily_limit"] ?? tok["limit_dzienny"]),
                        Uses = (int?)(tok["uses"] ?? tok["uzycia"])
                    };

                    var efektyTok = (tok["effects"] ?? tok["efekty"]) as JObject;
                    if (efektyTok != null)
                    {
                        foreach (var prop in efektyTok.Properties())
                        {
                            try
                            {
                                def.Effects[prop.Name] = (double)prop.Value;
                                // Also alias between English and Polish need names in effects
                                Need needEnum;
                                if (NeedNames.TryParseDataKey(prop.Name, out needEnum))
                                {
                                    def.Effects[NeedNames.DataKey(needEnum)] = (double)prop.Value;
                                    def.Effects[NeedNames.PolishDataKey(needEnum)] = (double)prop.Value;
                                }
                            }
                            catch { }
                        }
                    }

                    itemsList.Add(def);
                }
            }

            return new ItemCatalog(itemsList, currencyName, currencyIcon);
        }

        public static ItemCatalog LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("Nie odnaleziono pliku items.json", filePath);
            string json = File.ReadAllText(filePath);
            return LoadJson(json);
        }

        public static ItemCatalog LoadDefault()
        {
            // 1. Sprawdź system plików
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "items.json"),
                Path.Combine(baseDir, "items.json"),
                Path.Combine(baseDir, "..", "assets", "data", "items.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "items.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "items.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "items.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "items.json"),
                Path.Combine(baseDir, "swinka", "dane", "items.json"),
                Path.Combine(baseDir, "..", "swinka", "dane", "items.json"),
                Path.Combine(baseDir, "..", "..", "swinka", "dane", "items.json")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    string fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        return LoadFromFile(fullPath);
                    }
                }
                catch { }
            }

            // 2. Sprawdź zasoby osadzone (Embedded Resource)
            var asm = typeof(ItemCatalog).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("items.json", StringComparison.OrdinalIgnoreCase))
                {
                    using (var stream = asm.GetManifestResourceStream(resName))
                    {
                        if (stream != null)
                        {
                            using (var reader = new StreamReader(stream))
                            {
                                return LoadJson(reader.ReadToEnd());
                            }
                        }
                    }
                }
            }

            // 3. Bezpieczny fallback z podstawowymi danymi
            return CreateHardcodedFallback();
        }

        private static ItemCatalog CreateHardcodedFallback()
        {
            var list = new List<ItemDefinition>
            {
                new ItemDefinition { Id = "siano", Name = "Siano", Category = "jedzenie", Price = 0, IsUnlimited = true, IconName = "siano", Animation = "eat", Effects = new Dictionary<string, double> { { "najedzenie", 10 }, { "zabki", 6 } }, Description = "Podstawa diety. Darmowe, bez limitu." },
                new ItemDefinition { Id = "granulat", Name = "Granulat", Category = "jedzenie", Price = 5, IconName = "granulat", Animation = "eat_bowl", Effects = new Dictionary<string, double> { { "najedzenie", 20 }, { "witamina_c", 5 } }, Description = "Sycący dodatek z miseczki." },
                new ItemDefinition { Id = "papryka", Name = "Papryka", Category = "warzywo", Price = 12, IconName = "papryka", Animation = "eat_treat", Effects = new Dictionary<string, double> { { "najedzenie", 8 }, { "witamina_c", 35 }, { "humor", 5 } }, Description = "Najlepsze źródło witaminy C." },
                new ItemDefinition { Id = "natka", Name = "Natka pietruszki", Category = "warzywo", Price = 8, IconName = "natka", Animation = "eat_treat", Effects = new Dictionary<string, double> { { "najedzenie", 6 }, { "witamina_c", 20 } }, Description = "Dużo witaminy C, mało kalorii." },
                new ItemDefinition { Id = "jarmuz", Name = "Jarmuż", Category = "warzywo", Price = 10, IconName = "jarmuz", Animation = "eat_big", Effects = new Dictionary<string, double> { { "najedzenie", 10 }, { "witamina_c", 25 }, { "zabki", 3 } }, Description = "Duży liść do szarpania." },
                new ItemDefinition { Id = "ogorek", Name = "Ogórek", Category = "warzywo", Price = 5, IconName = "ogorek", Animation = "eat_treat", Effects = new Dictionary<string, double> { { "najedzenie", 6 }, { "humor", 4 }, { "witamina_c", 2 } }, Description = "Orzeźwiający, prawie bez witaminy C." },
                new ItemDefinition { Id = "marchewka", Name = "Marchewka", Category = "smakolyk", Price = 8, IconName = "marchewka", Animation = "eat_treat", DailyLimit = 1, Effects = new Dictionary<string, double> { { "najedzenie", 8 }, { "humor", 10 }, { "witamina_c", 3 } }, Description = "Słodka, więc tylko raz dziennie." },
                new ItemDefinition { Id = "gryzak", Name = "Gryzak", Category = "gryzak", Price = 20, Uses = 5, IconName = "gryzak", Animation = "chew_stick", Effects = new Dictionary<string, double> { { "zabki", 40 }, { "humor", 5 } }, Description = "Ściera ząbki. Starcza na 5 razy." },
                new ItemDefinition { Id = "pilka", Name = "Piłeczka", Category = "zabawka", Price = 60, IsDurable = true, IconName = "pilka", Animation = "ball_push", Effects = new Dictionary<string, double> { { "humor", 15 }, { "energia", -5 } }, Description = "Odblokowuje zabawę piłeczką." },
                new ItemDefinition { Id = "tunel", Name = "Tunel", Category = "zabawka", Price = 150, IsDurable = true, IconName = "tunel", Animation = "tunnel_in", Effects = new Dictionary<string, double> { { "humor", 20 }, { "energia", -8 } }, Description = "Odblokowuje bieganie przez tunel." },
                new ItemDefinition { Id = "domek", Name = "Domek", Category = "wyposazenie", Price = 250, IsDurable = true, IconName = "domek", Animation = "sleep_house", Effects = new Dictionary<string, double> { { "energia", 10 }, { "humor", 5 } }, Description = "Sen w domku regeneruje energię 1,5x szybciej." },
                new ItemDefinition { Id = "poidlo", Name = "Poidło", Category = "wyposazenie", Price = 40, IsDurable = true, IconName = "poidlo", Animation = "drink", Effects = new Dictionary<string, double> { { "humor", 2 }, { "najedzenie", 2 } }, Description = "Odblokowuje picie." },
                new ItemDefinition { Id = "tort", Name = "Tort z selera", Category = "specjalne", Price = null, IconName = "tort", Animation = "party", Effects = new Dictionary<string, double> { { "najedzenie", 15 }, { "humor", 30 }, { "witamina_c", 10 } }, Description = "Tylko na urodziny." }
            };

            return new ItemCatalog(list, "koniczynki", "koniczynka");
        }
    }
}
