using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
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
        public string Id { get; set; } = string.Empty;
        public string ItemId { get; set; } = string.Empty;
        public CropKind Kind { get; set; } = CropKind.Annual;
        public string SeedItemId { get; set; } = string.Empty;
        public int SeedPrice { get; set; }
        public int GrowMinutes { get; set; }
        public int Yield { get; set; }
        public int SellPrice { get; set; }
        public int UnlockHarvests { get; set; }
        public int MaxStock { get; set; }

        public string Item
        {
            get => ItemId;
            set => ItemId = value ?? string.Empty;
        }

        public string SeedItem
        {
            get => SeedItemId;
            set => SeedItemId = value ?? string.Empty;
        }
    }

    public sealed class PlotPackDef
    {
        [JsonProperty("plots")]
        public int Plots { get; set; } = 4;

        [JsonProperty("cost")]
        public int Cost { get; set; }
    }

    public sealed class OrchardSlotDef
    {
        [JsonProperty("cost")]
        public int Cost { get; set; }
    }

    public sealed class WaterCanDef
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("plots_per_use")]
        public int PlotsPerUse { get; set; }

        [JsonProperty("auto_daily")]
        public bool AutoDaily { get; set; }

        [JsonProperty("cost")]
        public int Cost { get; set; }
    }

    public sealed class FarmConfig
    {
        private static readonly object _syncLock = new object();
        private static FarmConfig _current;

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

        public int StartPlots { get; set; } = 4;
        public List<PlotPackDef> PlotPacks { get; set; } = new List<PlotPackDef>();
        public List<int> OrchardSlots { get; set; } = new List<int>();
        public int WaterTimeCutPercent { get; set; } = 20;
        public List<WaterCanDef> Cans { get; set; } = new List<WaterCanDef>();
        public int GreatHarvestChancePercent { get; set; } = 10;
        public int GreatHarvestExtraYield { get; set; } = 1;
        public bool OverripeNeverSpoils { get; set; } = true;
        public Dictionary<string, int> StarterSeeds { get; set; } = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        public HashSet<string> ForbiddenFoods { get; set; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        public List<CropDefinition> Crops { get; set; } = new List<CropDefinition>();

        public int TotalPlots => StartPlots + (PlotPacks != null ? PlotPacks.Sum(p => p.Plots) : 0);

        public CropDefinition Find(string id)
        {
            if (string.IsNullOrWhiteSpace(id) || Crops == null) return null;
            return Crops.FirstOrDefault(c => string.Equals(c.Id, id, StringComparison.OrdinalIgnoreCase));
        }

        public CropDefinition GetCrop(string id) => Find(id);

        public static FarmConfig CreateDefaults()
        {
            var cfg = new FarmConfig
            {
                StartPlots = 4,
                PlotPacks = new List<PlotPackDef>
                {
                    new PlotPackDef { Plots = 4, Cost = 200 },
                    new PlotPackDef { Plots = 4, Cost = 400 },
                    new PlotPackDef { Plots = 4, Cost = 660 },
                    new PlotPackDef { Plots = 4, Cost = 1060 },
                    new PlotPackDef { Plots = 4, Cost = 1600 }
                },
                OrchardSlots = new List<int> { 130, 200, 270, 400 },
                WaterTimeCutPercent = 20,
                Cans = new List<WaterCanDef>
                {
                    new WaterCanDef { Id = "can_1", PlotsPerUse = 1, Cost = 0 },
                    new WaterCanDef { Id = "can_2", PlotsPerUse = 4, Cost = 150 },
                    new WaterCanDef { Id = "sprinkler", AutoDaily = true, Cost = 650 }
                },
                GreatHarvestChancePercent = 10,
                GreatHarvestExtraYield = 1,
                OverripeNeverSpoils = true,
                StarterSeeds = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                {
                    ["seed_dandelion"] = 2,
                    ["seed_cilantro"] = 2,
                    ["seed_parsley"] = 2
                },
                ForbiddenFoods = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "onion", "garlic", "leek", "potato", "tomato_leaf", "rhubarb",
                    "avocado", "chocolate", "mushroom", "raw_beans", "iceberg_lettuce"
                },
                Crops = new List<CropDefinition>
                {
                    new CropDefinition
                    {
                        Id = "dandelion", ItemId = "dandelion", Kind = CropKind.Annual,
                        SeedItemId = "seed_dandelion", SeedPrice = 3, GrowMinutes = 60,
                        Yield = 2, SellPrice = 3, UnlockHarvests = 0
                    },
                    new CropDefinition
                    {
                        Id = "cilantro", ItemId = "cilantro", Kind = CropKind.Annual,
                        SeedItemId = "seed_cilantro", SeedPrice = 3, GrowMinutes = 90,
                        Yield = 2, SellPrice = 4, UnlockHarvests = 0
                    },
                    new CropDefinition
                    {
                        Id = "parsley", ItemId = "parsley", Kind = CropKind.Annual,
                        SeedItemId = "seed_parsley", SeedPrice = 4, GrowMinutes = 150,
                        Yield = 2, SellPrice = 4, UnlockHarvests = 0
                    }
                }
            };
            return cfg;
        }

        public static FarmConfig Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                ItemCatalog.ErrorLogger?.Invoke("FarmConfig: empty json, using defaults.");
                return CreateDefaults();
            }

            try
            {
                var root = JObject.Parse(json);
                var cfg = new FarmConfig
                {
                    StartPlots = root["start_plots"]?.Value<int>() ?? 4,
                    OverripeNeverSpoils = root["overripe_never_spoils"]?.Value<bool>() ?? true
                };

                if (root["plot_packs"] is JArray packsArr)
                {
                    foreach (var p in packsArr)
                    {
                        cfg.PlotPacks.Add(new PlotPackDef
                        {
                            Plots = p["plots"]?.Value<int>() ?? 4,
                            Cost = p["cost"]?.Value<int>() ?? 0
                        });
                    }
                }

                if (root["orchard_slots"] is JArray orchardArr)
                {
                    foreach (var o in orchardArr)
                    {
                        int cost = o.Type == JTokenType.Integer ? o.Value<int>() : (o["cost"]?.Value<int>() ?? 0);
                        cfg.OrchardSlots.Add(cost);
                    }
                }

                if (root["water"] is JObject waterObj)
                {
                    cfg.WaterTimeCutPercent = waterObj["time_cut_percent"]?.Value<int>() ?? 20;
                    if (waterObj["cans"] is JArray cansArr)
                    {
                        foreach (var c in cansArr)
                        {
                            cfg.Cans.Add(new WaterCanDef
                            {
                                Id = c["id"]?.Value<string>() ?? string.Empty,
                                PlotsPerUse = c["plots_per_use"]?.Value<int>() ?? 0,
                                AutoDaily = c["auto_daily"]?.Value<bool>() ?? false,
                                Cost = c["cost"]?.Value<int>() ?? 0
                            });
                        }
                    }
                }

                if (root["great_harvest"] is JObject ghObj)
                {
                    cfg.GreatHarvestChancePercent = ghObj["chance_percent"]?.Value<int>() ?? 10;
                    cfg.GreatHarvestExtraYield = ghObj["extra_yield"]?.Value<int>() ?? 1;
                }

                if (root["starter_seeds"] is JObject seedsObj)
                {
                    foreach (var prop in seedsObj.Properties())
                    {
                        cfg.StarterSeeds[prop.Name] = prop.Value.Value<int>();
                    }
                }

                if (root["forbidden_foods"] is JArray forbiddenArr)
                {
                    foreach (var f in forbiddenArr)
                    {
                        var val = f.Value<string>();
                        if (!string.IsNullOrWhiteSpace(val))
                            cfg.ForbiddenFoods.Add(val);
                    }
                }

                if (root["crops"] is JArray cropsArr)
                {
                    var seenIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    foreach (var c in cropsArr)
                    {
                        string id = c["id"]?.Value<string>() ?? string.Empty;
                        string item = c["item"]?.Value<string>() ?? id;
                        if (string.IsNullOrWhiteSpace(id)) continue;

                        if (!seenIds.Add(id))
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: duplicate crop id '{id}' skipped.");
                            continue;
                        }

                        if (cfg.ForbiddenFoods.Contains(item) || cfg.ForbiddenFoods.Contains(id))
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: forbidden crop '{id}' (item '{item}') skipped.");
                            continue;
                        }

                        string kindStr = c["kind"]?.Value<string>() ?? "annual";
                        CropKind kind = string.Equals(kindStr, "perennial", StringComparison.OrdinalIgnoreCase)
                            ? CropKind.Perennial
                            : CropKind.Annual;

                        int growMins = c["grow_minutes"]?.Value<int>() ?? 60;
                        if (growMins < 30 || growMins > 1440)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: crop '{id}' grow_minutes {growMins} clamped to 30..1440.");
                            growMins = Math.Max(30, Math.Min(1440, growMins));
                        }

                        int yieldCount = c["yield"]?.Value<int>() ?? 1;
                        if (yieldCount < 1 || yieldCount > 4)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: crop '{id}' yield {yieldCount} clamped to 1..4.");
                            yieldCount = Math.Max(1, Math.Min(4, yieldCount));
                        }

                        int seedPrice = c["seed_price"]?.Value<int>() ?? 1;
                        if (seedPrice <= 0)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: crop '{id}' non-positive seed_price clamped to 1.");
                            seedPrice = 1;
                        }

                        int sellPrice = c["sell_price"]?.Value<int>() ?? 1;
                        if (sellPrice <= 0)
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"FarmConfig: crop '{id}' non-positive sell_price clamped to 1.");
                            sellPrice = 1;
                        }

                        int unlockHarvests = Math.Max(0, c["unlock_harvests"]?.Value<int>() ?? 0);
                        int maxStock = c["max_stock"]?.Value<int>() ?? (kind == CropKind.Perennial ? 2 * yieldCount : 0);
                        if (kind == CropKind.Perennial && maxStock <= 0)
                        {
                            maxStock = 2 * yieldCount;
                        }

                        cfg.Crops.Add(new CropDefinition
                        {
                            Id = id,
                            ItemId = item,
                            Kind = kind,
                            SeedItemId = c["seed_item"]?.Value<string>() ?? ("seed_" + id),
                            SeedPrice = seedPrice,
                            GrowMinutes = growMins,
                            Yield = yieldCount,
                            SellPrice = sellPrice,
                            UnlockHarvests = unlockHarvests,
                            MaxStock = maxStock
                        });
                    }
                }

                if (cfg.Crops.Count == 0)
                {
                    return CreateDefaults();
                }

                return cfg;
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke("FarmConfig: failed to parse json: " + ex.Message);
                return CreateDefaults();
            }
        }

        public static FarmConfig LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("farm.json not found", filePath);
            return Load(File.ReadAllText(filePath));
        }

        public static FarmConfig LoadDefault()
        {
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

            ItemCatalog.ErrorLogger?.Invoke("FarmConfig: farm.json not found, using hardcoded defaults.");
            return CreateDefaults();
        }
    }

    public enum PlantResult
    {
        Ok,
        NoSuchPlot,
        Occupied,
        UnknownCrop,
        Locked,
        NotAnnual,
        NotPerennial
    }

    public sealed class HarvestResult
    {
        public static readonly HarvestResult Empty = new HarvestResult(string.Empty, string.Empty, 0, false, -1);

        public string CropId { get; }
        public string ItemId { get; }
        public int Count { get; }
        public bool GreatHarvest { get; }
        public int Plot { get; }

        public string Item => ItemId;

        public HarvestResult(string cropId, string itemId, int count, bool greatHarvest = false, int plot = -1)
        {
            CropId = cropId ?? string.Empty;
            ItemId = itemId ?? string.Empty;
            Count = count;
            GreatHarvest = greatHarvest;
            Plot = plot;
        }
    }

    public static class FarmEngine
    {
        public static PlantResult Plant(FarmConfig config, FarmState state, DateTime nowUtc, int plot, string cropId, int harvestsDone = 0)
        {
            if (config == null) throw new ArgumentNullException(nameof(config));
            if (state == null) throw new ArgumentNullException(nameof(state));

            if (plot < 0 || plot >= state.PlotsOwned)
                return PlantResult.NoSuchPlot;

            EnsurePlotListSize(state, plot + 1);
            var existing = state.Plots[plot];
            if (existing != null && !string.IsNullOrEmpty(existing.CropId))
                return PlantResult.Occupied;

            var crop = config.Find(cropId);
            if (crop == null)
                return PlantResult.UnknownCrop;

            if (crop.Kind != CropKind.Annual)
                return PlantResult.NotAnnual;

            if (harvestsDone < crop.UnlockHarvests)
                return PlantResult.Locked;

            state.Plots[plot] = new PlotState
            {
                CropId = crop.Id,
                PlantedUtc = EnsureUtc(nowUtc),
                Watered = false
            };

            return PlantResult.Ok;
        }

        public static PlantResult Plant(FarmState state, FarmConfig config, DateTime nowUtc, int plot, string cropId, int harvestsDone = 0)
            => Plant(config, state, nowUtc, plot, cropId, harvestsDone);

        public static bool Water(FarmConfig config, FarmState state, DateTime nowUtc, int plot)
        {
            if (config == null || state == null) return false;
            if (plot < 0 || plot >= state.PlotsOwned || plot >= state.Plots.Count)
                return false;

            var p = state.Plots[plot];
            if (p == null || string.IsNullOrEmpty(p.CropId) || p.Watered)
                return false;

            if (IsRipe(config, state, nowUtc, plot))
                return false;

            p.Watered = true;
            return true;
        }

        public static bool Water(FarmState state, FarmConfig config, DateTime nowUtc, int plot)
            => Water(config, state, nowUtc, plot);

        public static int WaterMany(FarmConfig config, FarmState state, DateTime nowUtc, int firstPlot, int count)
        {
            if (config == null || state == null || count <= 0) return 0;
            int watered = 0;
            int start = Math.Max(0, firstPlot);
            int end = Math.Min(state.PlotsOwned, firstPlot + count);
            for (int i = start; i < end; i++)
            {
                if (Water(config, state, nowUtc, i))
                    watered++;
            }
            return watered;
        }

        public static int WaterMany(FarmState state, FarmConfig config, DateTime nowUtc, int firstPlot, int count)
            => WaterMany(config, state, nowUtc, firstPlot, count);

        public static TimeSpan GetEffectiveGrowDuration(FarmConfig config, CropDefinition crop, bool watered)
        {
            double minutes = crop.GrowMinutes;
            if (watered)
            {
                double cut = Math.Max(0, Math.Min(100, config.WaterTimeCutPercent)) / 100.0;
                minutes *= (1.0 - cut);
            }
            return TimeSpan.FromMinutes(minutes);
        }

        public static bool IsRipe(FarmConfig config, FarmState state, DateTime nowUtc, int plot)
        {
            if (config == null || state == null) return false;
            if (plot < 0 || plot >= state.PlotsOwned || plot >= state.Plots.Count)
                return false;

            var p = state.Plots[plot];
            if (p == null || string.IsNullOrEmpty(p.CropId))
                return false;

            var crop = config.Find(p.CropId);
            if (crop == null)
                return false;

            var duration = GetEffectiveGrowDuration(config, crop, p.Watered);
            return EnsureUtc(nowUtc) - EnsureUtc(p.PlantedUtc) >= duration;
        }

        public static bool IsRipe(FarmState state, FarmConfig config, DateTime nowUtc, int plot)
            => IsRipe(config, state, nowUtc, plot);

        public static TimeSpan? TimeLeft(FarmConfig config, FarmState state, DateTime nowUtc, int plot)
        {
            if (config == null || state == null) return null;
            if (plot < 0 || plot >= state.PlotsOwned || plot >= state.Plots.Count)
                return null;

            var p = state.Plots[plot];
            if (p == null || string.IsNullOrEmpty(p.CropId))
                return null;

            var crop = config.Find(p.CropId);
            if (crop == null)
                return null;

            var duration = GetEffectiveGrowDuration(config, crop, p.Watered);
            var elapsed = EnsureUtc(nowUtc) - EnsureUtc(p.PlantedUtc);
            var remaining = duration - elapsed;
            return remaining <= TimeSpan.Zero ? TimeSpan.Zero : remaining;
        }

        public static TimeSpan? TimeLeft(FarmState state, FarmConfig config, DateTime nowUtc, int plot)
            => TimeLeft(config, state, nowUtc, plot);

        public static HarvestResult Harvest(FarmConfig config, FarmState state, DateTime nowUtc, int plot)
        {
            if (!IsRipe(config, state, nowUtc, plot))
                return HarvestResult.Empty;

            var p = state.Plots[plot];
            var crop = config.Find(p.CropId);
            if (crop == null)
                return HarvestResult.Empty;

            int seed = unchecked((int)(plot * 7919L + p.PlantedUtc.Ticks));
            var rng = new Random(seed);
            bool great = config.GreatHarvestChancePercent > 0 && rng.Next(100) < config.GreatHarvestChancePercent;
            int totalYield = crop.Yield + (great ? config.GreatHarvestExtraYield : 0);

            state.Plots[plot] = null;

            return new HarvestResult(crop.Id, crop.ItemId, totalYield, great, plot);
        }

        public static HarvestResult Harvest(FarmState state, FarmConfig config, DateTime nowUtc, int plot)
            => Harvest(config, state, nowUtc, plot);

        public static HarvestResult Harvest(FarmConfig config, FarmState state, DateTime nowUtc, int plot, ref int harvestsDone)
        {
            var res = Harvest(config, state, nowUtc, plot);
            if (res.Count > 0) harvestsDone++;
            return res;
        }

        public static IReadOnlyList<HarvestResult> HarvestAll(FarmConfig config, FarmState state, DateTime nowUtc)
        {
            var results = new List<HarvestResult>();
            if (config == null || state == null) return results;

            int limit = Math.Min(state.PlotsOwned, state.Plots.Count);
            for (int i = 0; i < limit; i++)
            {
                if (IsRipe(config, state, nowUtc, i))
                {
                    var res = Harvest(config, state, nowUtc, i);
                    if (res.Count > 0)
                        results.Add(res);
                }
            }
            return results;
        }

        public static IReadOnlyList<HarvestResult> HarvestAll(FarmState state, FarmConfig config, DateTime nowUtc)
            => HarvestAll(config, state, nowUtc);

        public static PlantResult PlantOrchard(FarmConfig config, FarmState state, DateTime nowUtc, int slot, string cropId, int harvestsDone = int.MaxValue)
        {
            if (config == null) throw new ArgumentNullException(nameof(config));
            if (state == null) throw new ArgumentNullException(nameof(state));

            if (slot < 0 || slot >= state.OrchardSlots)
                return PlantResult.NoSuchPlot;

            EnsureOrchardListSize(state, slot + 1);
            var existing = state.Orchard[slot];
            if (existing != null && !string.IsNullOrEmpty(existing.CropId))
                return PlantResult.Occupied;

            var crop = config.Find(cropId);
            if (crop == null)
                return PlantResult.UnknownCrop;

            if (crop.Kind != CropKind.Perennial)
                return PlantResult.NotPerennial;

            if (harvestsDone < crop.UnlockHarvests)
                return PlantResult.Locked;

            var now = EnsureUtc(nowUtc);
            state.Orchard[slot] = new OrchardState
            {
                CropId = crop.Id,
                NextUtc = now.AddMinutes(crop.GrowMinutes),
                Stock = 0
            };

            return PlantResult.Ok;
        }

        public static PlantResult PlantOrchard(FarmState state, FarmConfig config, DateTime nowUtc, int slot, string cropId, int harvestsDone = int.MaxValue)
            => PlantOrchard(config, state, nowUtc, slot, cropId, harvestsDone);

        public static void Tick(FarmConfig config, FarmState state, DateTime nowUtc)
        {
            if (config == null || state == null) return;
            var now = EnsureUtc(nowUtc);

            int limit = Math.Min(state.OrchardSlots, state.Orchard.Count);
            for (int i = 0; i < limit; i++)
            {
                var o = state.Orchard[i];
                if (o == null || string.IsNullOrEmpty(o.CropId)) continue;

                var crop = config.Find(o.CropId);
                if (crop == null || crop.Kind != CropKind.Perennial || crop.GrowMinutes <= 0) continue;

                int maxStock = crop.MaxStock > 0 ? crop.MaxStock : 2 * crop.Yield;
                var cycle = TimeSpan.FromMinutes(crop.GrowMinutes);
                var next = EnsureUtc(o.NextUtc);

                while (now >= next && o.Stock < maxStock)
                {
                    o.Stock = Math.Min(maxStock, o.Stock + crop.Yield);
                    next = next.Add(cycle);
                    o.NextUtc = next;
                }

                if (o.Stock >= maxStock && now >= next)
                {
                    o.NextUtc = now.Add(cycle);
                }
            }
        }

        public static void Tick(FarmState state, FarmConfig config, DateTime nowUtc)
            => Tick(config, state, nowUtc);

        public static HarvestResult HarvestOrchard(FarmConfig config, FarmState state, DateTime nowUtc, int slot)
        {
            if (config == null || state == null) return HarvestResult.Empty;
            if (slot < 0 || slot >= state.OrchardSlots || slot >= state.Orchard.Count)
                return HarvestResult.Empty;

            Tick(config, state, nowUtc);

            var o = state.Orchard[slot];
            if (o == null || string.IsNullOrEmpty(o.CropId) || o.Stock <= 0)
                return HarvestResult.Empty;

            var crop = config.Find(o.CropId);
            if (crop == null)
                return HarvestResult.Empty;

            int count = o.Stock;
            int maxStock = crop.MaxStock > 0 ? crop.MaxStock : 2 * crop.Yield;
            bool wasFull = count >= maxStock;

            o.Stock = 0;
            var now = EnsureUtc(nowUtc);
            if (wasFull || EnsureUtc(o.NextUtc) <= now)
            {
                o.NextUtc = now.AddMinutes(crop.GrowMinutes);
            }

            return new HarvestResult(crop.Id, crop.ItemId, count, false, slot);
        }

        public static HarvestResult HarvestOrchard(FarmState state, FarmConfig config, DateTime nowUtc, int slot)
            => HarvestOrchard(config, state, nowUtc, slot);

        private static void EnsurePlotListSize(FarmState state, int minSize)
        {
            while (state.Plots.Count < minSize)
                state.Plots.Add(null);
        }

        private static void EnsureOrchardListSize(FarmState state, int minSize)
        {
            while (state.Orchard.Count < minSize)
                state.Orchard.Add(null);
        }

        private static DateTime EnsureUtc(DateTime dt)
        {
            return dt.Kind == DateTimeKind.Utc ? dt : DateTime.SpecifyKind(dt, DateTimeKind.Utc);
        }
    }
}
