using System;
using System.Collections.Generic;
using System.IO;
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
            if (string.IsNullOrWhiteSpace(json))
                throw new ArgumentNullException(nameof(json));

            var root = JObject.Parse(json);
            string currencyName = "clovers";
            string currencyIcon = "clover";

            var currencyTok = root["currency"] as JObject;
            if (currencyTok != null)
            {
                currencyName = (string)currencyTok["name"] ?? currencyName;
                currencyIcon = (string)currencyTok["icon"] ?? currencyIcon;
            }

            var itemsList = new List<ItemDefinition>();
            var itemsArr = root["items"] as JArray;
            if (itemsArr != null)
            {
                foreach (var tok in itemsArr)
                {
                    string id = (string)tok["id"];
                    if (string.IsNullOrEmpty(id)) continue;

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
                        Uses = (int?)tok["uses"]
                    };

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

        public static ItemCatalog LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "items.json"),
                Path.Combine(baseDir, "items.json"),
                Path.Combine(baseDir, "..", "assets", "data", "items.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "items.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "items.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "items.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "items.json")
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

            // 2. Check embedded resources
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

            // 3. No catalog available: report an error and continue with an empty one.
            ErrorLogger?.Invoke("ItemCatalog: items.json not found on disk or in embedded resources; using an empty catalog.");
            return new ItemCatalog(new List<ItemDefinition>());
        }
    }
}
