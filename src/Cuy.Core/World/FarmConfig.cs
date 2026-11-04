using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.World
{
    public enum CropKind
    {
        Annual,
        Perennial
    }

    public sealed class CropDefinition
    {
        public string Id { get; }
        public string ItemId { get; }
        public CropKind Kind { get; }
        public string SeedItemId { get; }
        public int SeedPrice { get; }
        public int GrowMinutes { get; }
        public int Yield { get; }
        public int SellPrice { get; }
        public int UnlockHarvests { get; }
        public int MaxStock { get; }

        public CropDefinition(
            string id,
            string itemId,
            CropKind kind,
            string seedItemId,
            int seedPrice,
            int growMinutes,
            int yield,
            int sellPrice,
            int unlockHarvests,
            int maxStock = 0)
        {
            Id = id ?? string.Empty;
            ItemId = itemId ?? string.Empty;
            Kind = kind;
            SeedItemId = seedItemId ?? string.Empty;
            SeedPrice = seedPrice;
            GrowMinutes = growMinutes;
            Yield = yield;
            SellPrice = sellPrice;
            UnlockHarvests = unlockHarvests;
            MaxStock = maxStock;
        }
    }

    public sealed class PlotPack
    {
        public int Plots { get; }
        public int Cost { get; }

        public PlotPack(int plots, int cost)
        {
            Plots = plots;
            Cost = cost;
        }
    }

    public sealed class WaterCan
    {
        public string Id { get; }
        public int PlotsPerUse { get; }
        public int Cost { get; }
        public bool AutoDaily { get; }

        public WaterCan(string id, int plotsPerUse, int cost, bool autoDaily = false)
        {
            Id = id ?? string.Empty;
            PlotsPerUse = plotsPerUse;
            Cost = cost;
            AutoDaily = autoDaily;
        }
    }

    public sealed class FarmConfig
    {
        private static readonly object _syncLock = new object();
        private static FarmConfig _current;

        private readonly Dictionary<string, CropDefinition> _cropsById;

        public static FarmConfig Current
        {
            get
            {
                if (_current != null) return _current;
                lock (_syncLock)
                {
                    if (_current == null)
                    {
                        _current = LoadDefault();
                    }
                }
                return _current;
            }
            set
            {
                lock (_syncLock)
                {
                    _current = value;
                }
            }
        }

        public int StartPlots { get; }
        public IReadOnlyList<PlotPack> PlotPacks { get; }
        public IReadOnlyList<int> OrchardSlots { get; }
        public int WaterTimeCutPercent { get; }
        public IReadOnlyList<WaterCan> Cans { get; }
        public int GreatHarvestChancePercent { get; }
        public int GreatHarvestExtraYield { get; }
        public bool OverripeNeverSpoils { get; }
        public IReadOnlyDictionary<string, int> StarterSeeds { get; }
        public IReadOnlyList<string> ForbiddenFoods { get; }
        public IReadOnlyList<CropDefinition> Crops { get; }

        public int TotalPlots => StartPlots + (PlotPacks != null ? PlotPacks.Sum(p => p.Plots) : 0);

        public FarmConfig()
            : this(
                startPlots: 4,
                plotPacks: new[]
                {
                    new PlotPack(4, 200),
                    new PlotPack(4, 400),
                    new PlotPack(4, 660),
                    new PlotPack(4, 1060),
                    new PlotPack(4, 1600)
                },
                orchardSlots: new[] { 130, 200, 270, 400 },
                waterTimeCutPercent: 20,
                cans: new[]
                {
                    new WaterCan("can_1", 1, 0, false),
                    new WaterCan("can_2", 4, 150, false),
                    new WaterCan("sprinkler", 0, 650, true)
                },
                greatHarvestChancePercent: 10,
                greatHarvestExtraYield: 1,
                overripeNeverSpoils: true,
                starterSeeds: new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                {
                    ["seed_dandelion"] = 2,
                    ["seed_cilantro"] = 2,
                    ["seed_parsley"] = 2
                },
                forbiddenFoods: new[]
                {
                    "onion", "garlic", "leek", "potato", "tomato_leaf",
                    "rhubarb", "avocado", "chocolate", "mushroom", "raw_beans", "iceberg_lettuce"
                },
                crops: new[]
                {
                    new CropDefinition("dandelion", "dandelion", CropKind.Annual, "seed_dandelion", 3, 60, 2, 3, 0, 0),
                    new CropDefinition("cilantro", "cilantro", CropKind.Annual, "seed_cilantro", 3, 90, 2, 4, 0, 0),
                    new CropDefinition("parsley", "parsley", CropKind.Annual, "seed_parsley", 4, 150, 2, 4, 0, 0)
                })
        {
        }

        public FarmConfig(
            int startPlots,
            IEnumerable<PlotPack> plotPacks,
            IEnumerable<int> orchardSlots,
            int waterTimeCutPercent,
            IEnumerable<WaterCan> cans,
            int greatHarvestChancePercent,
            int greatHarvestExtraYield,
            bool overripeNeverSpoils,
            IDictionary<string, int> starterSeeds,
            IEnumerable<string> forbiddenFoods,
            IEnumerable<CropDefinition> crops)
        {
            StartPlots = startPlots;
            PlotPacks = plotPacks != null ? new List<PlotPack>(plotPacks) : new List<PlotPack>();
            OrchardSlots = orchardSlots != null ? new List<int>(orchardSlots) : new List<int>();
            WaterTimeCutPercent = waterTimeCutPercent;
            Cans = cans != null ? new List<WaterCan>(cans) : new List<WaterCan>();
            GreatHarvestChancePercent = greatHarvestChancePercent;
            GreatHarvestExtraYield = greatHarvestExtraYield;
            OverripeNeverSpoils = overripeNeverSpoils;
            StarterSeeds = starterSeeds != null
                ? new Dictionary<string, int>(starterSeeds, StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            ForbiddenFoods = forbiddenFoods != null ? new List<string>(forbiddenFoods) : new List<string>();
            Crops = crops != null ? new List<CropDefinition>(crops) : new List<CropDefinition>();

            _cropsById = new Dictionary<string, CropDefinition>(StringComparer.OrdinalIgnoreCase);
            foreach (var crop in Crops)
            {
                if (crop != null && !string.IsNullOrEmpty(crop.Id) && !_cropsById.ContainsKey(crop.Id))
                {
                    _cropsById[crop.Id] = crop;
                }
            }
        }

        public CropDefinition Find(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            return _cropsById.TryGetValue(id, out var crop) ? crop : null;
        }

        public static FarmConfig CreateDefault()
        {
            return new FarmConfig();
        }

        public static FarmConfig Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("FarmConfig: JSON string is null or whitespace, using defaults.");
                return CreateDefault();
            }

            try
            {
                var root = JObject.Parse(json);
                return Parse(root);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: Error parsing JSON: {ex.Message}");
                return CreateDefault();
            }
        }

        public static FarmConfig LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException("farm.json not found", filePath);
            }
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static FarmConfig LoadDefault()
        {
            // 1. Check file system candidates
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "farm.json"),
                Path.Combine(baseDir, "farm.json"),
                Path.Combine(baseDir, "..", "assets", "data", "farm.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "farm.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "farm.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "farm.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "farm.json")
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
            var asm = typeof(FarmConfig).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("farm.json", StringComparison.OrdinalIgnoreCase))
                {
                    using (var stream = asm.GetManifestResourceStream(resName))
                    {
                        if (stream != null)
                        {
                            using (var reader = new StreamReader(stream))
                            {
                                return Load(reader.ReadToEnd());
                            }
                        }
                    }
                }
            }

            // 3. Fallback to code defaults
            ItemCatalog.ErrorLogger?.Invoke("FarmConfig: farm.json not found, using hardcoded defaults.");
            return CreateDefault();
        }

        private static FarmConfig Parse(JObject root)
        {
            int startPlots = root.Value<int?>("start_plots") ?? 4;

            var plotPacks = new List<PlotPack>();
            if (root["plot_packs"] is JArray packsArray)
            {
                foreach (var item in packsArray)
                {
                    int plots = item.Value<int?>("plots") ?? 0;
                    int cost = item.Value<int?>("cost") ?? 0;
                    plotPacks.Add(new PlotPack(plots, cost));
                }
            }
            else
            {
                plotPacks.AddRange(new[]
                {
                    new PlotPack(4, 200),
                    new PlotPack(4, 400),
                    new PlotPack(4, 660),
                    new PlotPack(4, 1060),
                    new PlotPack(4, 1600)
                });
            }

            var orchardSlots = new List<int>();
            if (root["orchard_slots"] is JArray orchardArray)
            {
                foreach (var item in orchardArray)
                {
                    int cost = item.Value<int?>("cost") ?? 0;
                    orchardSlots.Add(cost);
                }
            }
            else
            {
                orchardSlots.AddRange(new[] { 130, 200, 270, 400 });
            }

            int waterTimeCut = 20;
            var cans = new List<WaterCan>();
            if (root["water"] is JObject waterObj)
            {
                waterTimeCut = waterObj.Value<int?>("time_cut_percent") ?? 20;
                if (waterObj["cans"] is JArray cansArray)
                {
                    foreach (var item in cansArray)
                    {
                        string id = item.Value<string>("id") ?? string.Empty;
                        int plotsPerUse = item.Value<int?>("plots_per_use") ?? 0;
                        int cost = item.Value<int?>("cost") ?? 0;
                        bool autoDaily = item.Value<bool?>("auto_daily") ?? false;
                        cans.Add(new WaterCan(id, plotsPerUse, cost, autoDaily));
                    }
                }
            }
            if (cans.Count == 0)
            {
                cans.AddRange(new[]
                {
                    new WaterCan("can_1", 1, 0, false),
                    new WaterCan("can_2", 4, 150, false),
                    new WaterCan("sprinkler", 0, 650, true)
                });
            }

            int ghChance = 10;
            int ghExtra = 1;
            if (root["great_harvest"] is JObject ghObj)
            {
                ghChance = ghObj.Value<int?>("chance_percent") ?? 10;
                ghExtra = ghObj.Value<int?>("extra_yield") ?? 1;
            }

            bool overripeNeverSpoils = root.Value<bool?>("overripe_never_spoils") ?? true;

            var starterSeeds = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            if (root["starter_seeds"] is JObject seedsObj)
            {
                foreach (var prop in seedsObj.Properties())
                {
                    starterSeeds[prop.Name] = (int?)prop.Value ?? 0;
                }
            }
            else
            {
                starterSeeds["seed_dandelion"] = 2;
                starterSeeds["seed_cilantro"] = 2;
                starterSeeds["seed_parsley"] = 2;
            }

            var forbiddenFoods = new List<string>();
            var forbiddenSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (root["forbidden_foods"] is JArray forbiddenArray)
            {
                foreach (var item in forbiddenArray)
                {
                    string food = item.Value<string>();
                    if (!string.IsNullOrEmpty(food))
                    {
                        forbiddenFoods.Add(food);
                        forbiddenSet.Add(food);
                    }
                }
            }
            else
            {
                forbiddenFoods.AddRange(new[]
                {
                    "onion", "garlic", "leek", "potato", "tomato_leaf",
                    "rhubarb", "avocado", "chocolate", "mushroom", "raw_beans", "iceberg_lettuce"
                });
                foreach (var f in forbiddenFoods) forbiddenSet.Add(f);
            }

            var crops = new List<CropDefinition>();
            var seenCropIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (root["crops"] is JArray cropsArray)
            {
                foreach (var cropToken in cropsArray)
                {
                    string id = cropToken.Value<string>("id");
                    if (string.IsNullOrEmpty(id))
                    {
                        ItemCatalog.ErrorLogger?.Invoke("FarmConfig: Crop without id skipped.");
                        continue;
                    }

                    if (seenCropIds.Contains(id))
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: Duplicate crop id '{id}' skipped.");
                        continue;
                    }

                    string item = cropToken.Value<string>("item") ?? id;
                    if (forbiddenSet.Contains(item))
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: Crop '{id}' has forbidden item '{item}', skipped.");
                        continue;
                    }

                    seenCropIds.Add(id);

                    string kindStr = cropToken.Value<string>("kind");
                    CropKind kind = string.Equals(kindStr, "perennial", StringComparison.OrdinalIgnoreCase)
                        ? CropKind.Perennial
                        : CropKind.Annual;

                    string seedItem = cropToken.Value<string>("seed_item") ?? string.Empty;
                    int seedPrice = cropToken.Value<int?>("seed_price") ?? 0;
                    int growMinutes = cropToken.Value<int?>("grow_minutes") ?? 0;
                    int yield = cropToken.Value<int?>("yield") ?? 0;
                    int sellPrice = cropToken.Value<int?>("sell_price") ?? 0;
                    int unlockHarvests = cropToken.Value<int?>("unlock_harvests") ?? 0;
                    int? maxStockNullable = cropToken.Value<int?>("max_stock");

                    // Clamping rules
                    if (growMinutes < 30)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: Crop '{id}' grow_minutes ({growMinutes}) clamped to 30.");
                        growMinutes = 30;
                    }
                    else if (growMinutes > 1440)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: Crop '{id}' grow_minutes ({growMinutes}) clamped to 1440.");
                        growMinutes = 1440;
                    }

                    if (yield < 1)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: Crop '{id}' yield ({yield}) clamped to 1.");
                        yield = 1;
                    }
                    else if (yield > 4)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: Crop '{id}' yield ({yield}) clamped to 4.");
                        yield = 4;
                    }

                    if (seedPrice <= 0)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: Crop '{id}' seed_price ({seedPrice}) clamped to 1.");
                        seedPrice = 1;
                    }

                    if (sellPrice <= 0)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: Crop '{id}' sell_price ({sellPrice}) clamped to 1.");
                        sellPrice = 1;
                    }

                    int maxStock;
                    if (kind == CropKind.Perennial)
                    {
                        if (!maxStockNullable.HasValue || maxStockNullable.Value <= 0)
                        {
                            maxStock = 2 * yield;
                        }
                        else
                        {
                            maxStock = maxStockNullable.Value;
                        }
                    }
                    else
                    {
                        maxStock = maxStockNullable ?? 0;
                    }

                    crops.Add(new CropDefinition(
                        id, item, kind, seedItem, seedPrice, growMinutes, yield, sellPrice, unlockHarvests, maxStock));
                }
            }

            if (crops.Count == 0)
            {
                ItemCatalog.ErrorLogger?.Invoke("FarmConfig: No valid crops found in JSON, using defaults.");
                return CreateDefault();
            }

            return new FarmConfig(
                startPlots,
                plotPacks,
                orchardSlots,
                waterTimeCut,
                cans,
                ghChance,
                ghExtra,
                overripeNeverSpoils,
                starterSeeds,
                forbiddenFoods,
                crops);
        }
    }
}
