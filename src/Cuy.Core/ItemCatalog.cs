using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
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

        public static ItemCatalog LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data"),
                Path.Combine(baseDir),
                Path.Combine(baseDir, "..", "assets", "data"),
                Path.Combine(baseDir, "..", "..", "assets", "data"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data")
            };

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
                            jsons.Add(File.ReadAllText(itemsFile));

                            var extraFiles = Directory.GetFiles(fullDirPath, "items_*.json");
                            Array.Sort(extraFiles); // alphabetical
                            foreach (var f in extraFiles)
                            {
                                jsons.Add(File.ReadAllText(f));
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
