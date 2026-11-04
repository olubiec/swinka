using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using Cuy.Core.Time;
using Newtonsoft.Json.Linq;

namespace Cuy.Core
{
    /// <summary>
    /// Item catalog loaded from assets/data/items.json.
    /// .NET Standard 2.0 compatible (no WinForms/Win32 dependencies).
    /// </summary>
    public sealed class ItemCatalog
    {
        private static readonly object _syncLock = new object();
        private static ItemCatalog _defaultInstance;

        private readonly Dictionary<string, ItemDefinition> _itemsById;
        private readonly List<ItemDefinition> _itemsList;

        /// <summary>Receives ERROR messages (the app routes them to cuy.log).</summary>
        public static Action<string> ErrorLogger { get; set; }

        public string CurrencyName { get; }
        public string CurrencyIcon { get; }

        public IReadOnlyList<ItemDefinition> AllItems => _itemsList;

        public ItemCatalog(IEnumerable<ItemDefinition> items, string currencyName = "clovers", string currencyIcon = "clover")
        {
            CurrencyName = currencyName ?? "clovers";
            CurrencyIcon = currencyIcon ?? "clover";
            _itemsById = new Dictionary<string, ItemDefinition>(StringComparer.OrdinalIgnoreCase);
            _itemsList = new List<ItemDefinition>();

            if (items != null)
            {
                foreach (var item in items)
                {
                    if (item == null || string.IsNullOrEmpty(item.Id)) continue;
                    _itemsById[item.Id] = item;
                    _itemsList.Add(item);
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

        public static ItemCatalog LoadJson(string json)
        {
            return LoadJsonFiles(new[] { json });
        }

        public static ItemCatalog LoadJsonFiles(IEnumerable<string> jsonTexts)
        {
            string currencyName = "clovers";
            string currencyIcon = "clover";
            var itemsList = new List<ItemDefinition>();
            var seenIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (string json in jsonTexts)
            {
                if (string.IsNullOrWhiteSpace(json)) continue;

                try
                {
                    var root = JObject.Parse(json);

                    var currencyTok = root["currency"] as JObject;
                    if (currencyTok != null)
                    {
                        currencyName = (string)currencyTok["name"] ?? currencyName;
                        currencyIcon = (string)currencyTok["icon"] ?? currencyIcon;
                    }

                    var itemsArr = root["items"] as JArray;
                    if (itemsArr != null)
                    {
                        foreach (var tok in itemsArr)
                        {
                            string id = (string)tok["id"];
                            if (string.IsNullOrEmpty(id)) continue;

                            if (seenIds.Contains(id))
                            {
                                ErrorLogger?.Invoke($"ItemCatalog: Duplicate item id '{id}' found, ignoring subsequent definition.");
                                continue;
                            }

                            var def = new ItemDefinition
                            {
                                Id = id,
                                Name = (string)tok["name"] ?? id,
                                Category = (string)tok["category"] ?? "other",
                                Price = tok["price"] != null && tok["price"].Type == JTokenType.Integer ? (int?)tok["price"] : null,
                                IsUnlimited = (bool?)tok["unlimited"] ?? false,
                                IsDurable = (bool?)tok["durable"] ?? false,
                                IconName = (string)tok["icon"] ?? id,
                                Animation = (string)tok["animation"] ?? "eat_treat",
                                Description = (string)tok["description"] ?? "",
                                DailyLimit = (int?)tok["daily_limit"],
                                Uses = (int?)tok["uses"],
                                OneTime = (bool?)tok["one_time"] ?? (bool?)tok["permanent"] ?? false
                            };

                            var stagesArr = tok["stages"] as JArray;
                            if (stagesArr != null)
                            {
                                foreach (var stageTok in stagesArr)
                                {
                                    string stageStr = (string)stageTok;
                                    if (string.IsNullOrEmpty(stageStr)) continue;

                                    bool isValid = false;
                                    foreach (LifeStage s in Enum.GetValues(typeof(LifeStage)))
                                    {
                                        if (string.Equals(LifeStages.DataKey(s), stageStr, StringComparison.OrdinalIgnoreCase))
                                        {
                                            isValid = true;
                                            break;
                                        }
                                    }

                                    if (isValid)
                                    {
                                        def.Stages.Add(stageStr.ToLowerInvariant());
                                    }
                                    else
                                    {
                                        ErrorLogger?.Invoke($"ItemCatalog: Unknown stage '{stageStr}' on item '{id}'");
                                    }
                                }
                            }

                            var effectsTok = tok["effects"] as JObject;
                            if (effectsTok != null)
                            {
                                foreach (var prop in effectsTok.Properties())
                                {
                                    try
                                    {
                                        def.Effects[prop.Name] = (double)prop.Value;
                                    }
                                    catch { }
                                }
                            }

                            itemsList.Add(def);
                            seenIds.Add(id);
                        }
                    }
                }
                catch (Exception ex)
                {
                    ErrorLogger?.Invoke($"ItemCatalog: Error parsing JSON: {ex.Message}");
                }
            }

            return new ItemCatalog(itemsList, currencyName, currencyIcon);
        }

        public static ItemCatalog LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("items.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return LoadJson(json);
        }

        public IEnumerable<ItemDefinition> AvailableFor(LifeStage stage)
        {
            foreach (var item in _itemsList)
            {
                if (item.IsAvailableFor(stage))
                {
                    yield return item;
                }
            }
        }

        /// <summary>
        /// Returns true if the category represents an edible food (food, vegetable, treat, chew_stick, care).
        /// Non-food categories like seed, equipment, furniture, toy are not edible.
        /// </summary>
        public static bool IsFoodCategory(string category)
        {
            if (string.IsNullOrEmpty(category)) return false;
            return string.Equals(category, "food", StringComparison.OrdinalIgnoreCase)
                || string.Equals(category, "vegetable", StringComparison.OrdinalIgnoreCase)
                || string.Equals(category, "treat", StringComparison.OrdinalIgnoreCase)
                || string.Equals(category, "chew_stick", StringComparison.OrdinalIgnoreCase)
                || string.Equals(category, "care", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Returns true if the item is present in this catalog and belongs to an edible food category.
        /// </summary>
        public bool IsFood(string itemId)
        {
            var def = GetItem(itemId);
            return def != null && IsFoodCategory(def.Category);
        }

        /// <summary>
        /// Feeds an item to the pet if valid and edible, applying effects to needs, bond, and daily limits.
        /// Returns true if eaten, false if unknown, not edible (like seeds/toys), or refused (daily limit, full, etc.).
        /// </summary>
        public bool Feed(Pet pet, string itemId)
        {
            if (pet == null || string.IsNullOrEmpty(itemId)) return false;

            var def = GetItem(itemId);
            if (def == null) return false;

            // Only food can be fed (seeds, toys, equipment cannot be eaten)
            if (!IsFoodCategory(def.Category)) return false;

            if (pet.RefusesTreats && (string.Equals(def.Category, "treat", StringComparison.OrdinalIgnoreCase)
                                   || string.Equals(def.Category, "vegetable", StringComparison.OrdinalIgnoreCase)))
            {
                return false;
            }

            string todayStr = pet.Clock.LocalNow().ToString("yyyyMMdd", System.Globalization.CultureInfo.InvariantCulture);
            string eatenCounterKey = $"ate_{def.Id}_{todayStr}";

            if (def.DailyLimit.HasValue)
            {
                int eatenToday = 0;
                pet.State.Stats.Counters.TryGetValue(eatenCounterKey, out eatenToday);
                if (eatenToday >= def.DailyLimit.Value)
                {
                    return false;
                }
            }

            double fullnessEffect = def.GetEffect("fullness");
            if (fullnessEffect > 0.0 && pet.Needs.Satiety >= 95.0)
            {
                return false;
            }

            // Consume from inventory if present
            if (!def.IsUnlimited && pet.GetItemCount(def.Id) > 0)
            {
                pet.TryRemoveItem(def.Id, 1);
            }

            // Apply need effects
            foreach (var eff in def.Effects)
            {
                if (NeedNames.TryParseDataKey(eff.Key, out Need need))
                {
                    pet.ChangeNeed(need, eff.Value);
                }
            }

            pet.AddBondPoints(1);
            if (string.Equals(def.Id, "hay", StringComparison.OrdinalIgnoreCase))
            {
                pet.RefillHay();
                pet.Count("hay_refills");
            }
            if (!def.IsUnlimited)
            {
                pet.Count(eatenCounterKey);
            }
            pet.RecordFoodEaten(def.Id);
            if (string.Equals(def.Category, "treat", StringComparison.OrdinalIgnoreCase))
            {
                pet.RecordTreat(def.Id);
            }

            return true;
        }

        public static ItemCatalog LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            var candidatePaths = new List<string>
            {
                Path.Combine(baseDir, "assets", "data"),
                Path.Combine(baseDir),
                Path.Combine(baseDir, "..", "assets", "data"),
                Path.Combine(baseDir, "..", "..", "assets", "data"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data"),
                Path.Combine(baseDir, "..", "..", "..", "..", "..", "assets", "data"),
                Path.Combine(baseDir, "..", "..", "..", "..", "..", "..", "assets", "data"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data")
            };

            string cur = baseDir;
            while (!string.IsNullOrEmpty(cur))
            {
                candidatePaths.Add(Path.Combine(cur, "assets", "data"));
                var parent = Path.GetDirectoryName(cur);
                if (parent == cur) break;
                cur = parent;
            }

            foreach (var dirPath in candidatePaths)
            {
                try
                {
                    string fullDirPath = Path.GetFullPath(dirPath);
                    if (Directory.Exists(fullDirPath))
                    {
                        string itemsFile = Path.Combine(fullDirPath, "items.json");
                        if (File.Exists(itemsFile))
                        {
                            var jsons = new List<string>();
                            var loadedPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                            jsons.Add(File.ReadAllText(itemsFile));
                            loadedPaths.Add(Path.GetFullPath(itemsFile));

                            var extraFiles = Directory.GetFiles(fullDirPath, "items_*.json");
                            Array.Sort(extraFiles); // alphabetical
                            foreach (var f in extraFiles)
                            {
                                if (loadedPaths.Add(Path.GetFullPath(f)))
                                {
                                    jsons.Add(File.ReadAllText(f));
                                }
                            }

                            string[] knownExtras = new[] { "items_shop.json", "items_decor.json", "items_farm.json" };
                            foreach (var extra in knownExtras)
                            {
                                string p = Path.Combine(fullDirPath, extra);
                                if (File.Exists(p) && loadedPaths.Add(Path.GetFullPath(p)))
                                {
                                    jsons.Add(File.ReadAllText(p));
                                }
                            }

                            return LoadJsonFiles(jsons);
                        }
                    }
                }
                catch { }
            }

            // 2. Check embedded resources
            var asm = typeof(ItemCatalog).GetTypeInfo().Assembly;
            var jsonTexts = new List<string>();
            var resNames = asm.GetManifestResourceNames().Where(r => r.Contains("items.json") || r.Contains("items_")).OrderBy(r => r).ToList();

            string mainRes = resNames.FirstOrDefault(r => r.EndsWith("items.json", StringComparison.OrdinalIgnoreCase));
            if (mainRes != null)
            {
                using (var stream = asm.GetManifestResourceStream(mainRes))
                using (var reader = new StreamReader(stream))
                {
                    jsonTexts.Add(reader.ReadToEnd());
                }

                foreach (var resName in resNames)
                {
                    if (resName != mainRes && (resName.Contains("items_") && resName.EndsWith(".json", StringComparison.OrdinalIgnoreCase)))
                    {
                        using (var stream = asm.GetManifestResourceStream(resName))
                        using (var reader = new StreamReader(stream))
                        {
                            jsonTexts.Add(reader.ReadToEnd());
                        }
                    }
                }
                return LoadJsonFiles(jsonTexts);
            }

            // 3. No catalog available: report an error and continue with an empty one.
            ErrorLogger?.Invoke("ItemCatalog: items.json not found on disk or in embedded resources; using an empty catalog.");
            return new ItemCatalog(new List<ItemDefinition>());
        }
    }
}
