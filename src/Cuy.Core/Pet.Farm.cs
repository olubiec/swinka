using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.Time;
using Cuy.Core.World;

namespace Cuy.Core
{
    public enum FarmResult
    {
        Ok,
        Disabled,
        NoSeed,
        NoSuchPlot,
        Occupied,
        UnknownCrop,
        Locked,
        NotAnnual
    }

    public sealed class HarvestSummary
    {
        public string CropId { get; set; } = string.Empty;
        public string ItemId { get; set; } = string.Empty;
        public int Count { get; set; }
        public bool GreatHarvest { get; set; }
        public IReadOnlyList<HarvestResult> Results { get; set; } = Array.Empty<HarvestResult>();
        public IReadOnlyDictionary<string, int> Items { get; set; } = new Dictionary<string, int>();
    }

    public partial class Pet
    {
        private FarmState EnsureFarm()
        {
            var world = EnsureWorld();
            if (world.Farm == null) world.Farm = new FarmState();
            if (world.Farm.PlotsOwned <= 0) world.Farm.PlotsOwned = FarmConfig?.StartPlots ?? 4;
            if (world.Farm.Plots == null) world.Farm.Plots = new List<PlotState>();
            while (world.Farm.Plots.Count < world.Farm.PlotsOwned)
            {
                world.Farm.Plots.Add(new PlotState());
            }
            return world.Farm;
        }

        public FarmResult Plant(int plot, string cropId)
        {
            if (!Balance.FarmActive) return FarmResult.Disabled;
            if (string.IsNullOrEmpty(cropId)) return FarmResult.UnknownCrop;

            var farm = EnsureFarm();
            var crop = FarmConfig?.Find(cropId);
            if (crop == null) return FarmResult.UnknownCrop;
            if (crop.Kind != CropKind.Annual) return FarmResult.NotAnnual;

            int harvests = 0;
            State.Stats?.Counters?.TryGetValue("harvests", out harvests);
            if (crop.UnlockHarvests > harvests) return FarmResult.Locked;

            if (plot < 0 || plot >= farm.PlotsOwned) return FarmResult.NoSuchPlot;

            if (farm.Plots != null && plot < farm.Plots.Count)
            {
                var existing = farm.Plots[plot];
                if (!string.IsNullOrEmpty(existing?.CropId)) return FarmResult.Occupied;
            }

            string seedItemId = !string.IsNullOrEmpty(crop.SeedItemId) ? crop.SeedItemId : "seed_" + crop.Id;
            if (GetItemCount(seedItemId) <= 0)
            {
                return FarmResult.NoSeed;
            }

            var res = FarmEngine.Plant(FarmConfig, farm, Clock.UtcNow, plot, cropId, harvests);
            if (res == PlantResult.Ok)
            {
                TryRemoveItem(seedItemId, 1);
                Count("planted_crops", 1);
                return FarmResult.Ok;
            }

            switch (res)
            {
                case PlantResult.NoSuchPlot: return FarmResult.NoSuchPlot;
                case PlantResult.Occupied: return FarmResult.Occupied;
                case PlantResult.UnknownCrop: return FarmResult.UnknownCrop;
                case PlantResult.Locked: return FarmResult.Locked;
                case PlantResult.NotAnnual: return FarmResult.NotAnnual;
                default: return FarmResult.Disabled;
            }
        }

        public bool Water(int plot)
        {
            if (!Balance.FarmActive) return false;
            var farm = EnsureFarm();

            int count = FarmExpansion.PlotsPerWaterUse(farm, FarmConfig);
            int watered = FarmEngine.WaterMany(FarmConfig, farm, Clock.UtcNow, plot, count);
            if (watered > 0)
            {
                Count("times_watered", 1);
                return true;
            }
            return false;
        }

        public HarvestSummary Harvest(int plot)
        {
            if (!Balance.FarmActive) return new HarvestSummary();
            var farm = EnsureFarm();

            var r = FarmEngine.Harvest(FarmConfig, farm, Clock.UtcNow, plot);
            if (r == null || r.Count <= 0) return new HarvestSummary();

            AddItem(r.ItemId, r.Count);
            Count("harvests", 1);
            RecordDailyHarvestDiary();
            CheckAchievements();

            var items = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                [r.ItemId] = r.Count
            };

            return new HarvestSummary
            {
                CropId = r.CropId,
                ItemId = r.ItemId,
                Count = r.Count,
                GreatHarvest = r.GreatHarvest,
                Results = new[] { r },
                Items = items
            };
        }

        public HarvestSummary HarvestAll()
        {
            if (!Balance.FarmActive) return new HarvestSummary();
            var farm = EnsureFarm();

            var results = FarmEngine.HarvestAll(FarmConfig, farm, Clock.UtcNow);
            if (results == null || results.Count == 0) return new HarvestSummary();

            var items = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            int totalCount = 0;
            bool anyGreat = false;

            foreach (var r in results)
            {
                if (r == null || r.Count <= 0) continue;
                AddItem(r.ItemId, r.Count);
                totalCount += r.Count;
                if (r.GreatHarvest) anyGreat = true;

                if (items.TryGetValue(r.ItemId, out int cur))
                    items[r.ItemId] = cur + r.Count;
                else
                    items[r.ItemId] = r.Count;

                Count("harvests", 1);
            }

            if (totalCount > 0)
            {
                RecordDailyHarvestDiary();
                CheckAchievements();
            }

            return new HarvestSummary
            {
                Results = results,
                Items = items,
                Count = totalCount,
                GreatHarvest = anyGreat,
                ItemId = results[0].ItemId,
                CropId = results[0].CropId
            };
        }

        public bool PlantOrchard(int slot, string cropId)
        {
            if (!Balance.FarmActive) return false;
            if (string.IsNullOrEmpty(cropId)) return false;

            var farm = EnsureFarm();
            var crop = FarmConfig?.Find(cropId);
            if (crop == null || crop.Kind != CropKind.Perennial) return false;

            int harvests = 0;
            State.Stats?.Counters?.TryGetValue("harvests", out harvests);
            if (crop.UnlockHarvests > harvests) return false;

            string seedItemId = !string.IsNullOrEmpty(crop.SeedItemId) ? crop.SeedItemId : "sapling_" + crop.Id;
            if (GetItemCount(seedItemId) <= 0) return false;

            var res = FarmEngine.PlantOrchard(FarmConfig, farm, Clock.UtcNow, slot, cropId, harvests);
            if (res == PlantResult.Ok)
            {
                TryRemoveItem(seedItemId, 1);
                Count("planted_orchard", 1);
                return true;
            }
            return false;
        }

        public HarvestSummary HarvestOrchard(int slot)
        {
            if (!Balance.FarmActive) return new HarvestSummary();
            var farm = EnsureFarm();

            var r = FarmEngine.HarvestOrchard(FarmConfig, farm, Clock.UtcNow, slot);
            if (r == null || r.Count <= 0) return new HarvestSummary();

            AddItem(r.ItemId, r.Count);
            Count("harvests", 1);
            RecordDailyHarvestDiary();
            CheckAchievements();

            var items = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                [r.ItemId] = r.Count
            };

            return new HarvestSummary
            {
                CropId = r.CropId,
                ItemId = r.ItemId,
                Count = r.Count,
                GreatHarvest = r.GreatHarvest,
                Results = new[] { r },
                Items = items
            };
        }

        public int BuyPlotPack()
        {
            if (!Balance.FarmActive) return -1;
            var farm = EnsureFarm();
            int cost = FarmExpansion.NextPackCost(FarmConfig, farm);
            if (cost < 0) return -1;
            if (!TrySpendClovers(cost)) return -1;
            if (!FarmExpansion.ApplyPack(FarmConfig, farm))
            {
                AddClovers(cost);
                return -1;
            }
            Count("spent_farm", cost);
            Count("plot_packs_bought", 1);
            return cost;
        }

        public int BuyOrchardSlot()
        {
            if (!Balance.FarmActive) return -1;
            var farm = EnsureFarm();
            int cost = FarmExpansion.NextOrchardCost(FarmConfig, farm);
            if (cost < 0) return -1;
            if (!TrySpendClovers(cost)) return -1;
            if (!FarmExpansion.ApplyOrchardSlot(FarmConfig, farm))
            {
                AddClovers(cost);
                return -1;
            }
            Count("spent_farm", cost);
            Count("orchard_slots_bought", 1);
            return cost;
        }

        public int BuyCan(string id)
        {
            if (!Balance.FarmActive) return -1;
            if (string.IsNullOrEmpty(id)) return -1;
            var farm = EnsureFarm();
            if (!FarmExpansion.CanBuyCan(FarmConfig, farm, id)) return -1;

            var canDef = FarmConfig?.Cans?.FirstOrDefault(c => string.Equals(c.Id, id, StringComparison.OrdinalIgnoreCase));
            int cost = canDef?.Cost ?? 0;
            if (cost > 0 && !TrySpendClovers(cost)) return -1;

            if (!FarmExpansion.ApplyCan(FarmConfig, farm, id))
            {
                if (cost > 0) AddClovers(cost);
                return -1;
            }

            if (cost > 0) Count("spent_farm", cost);
            return cost;
        }

        public int BuySprinkler()
        {
            if (!Balance.FarmActive) return -1;
            var farm = EnsureFarm();
            if (!FarmExpansion.CanBuySprinkler(FarmConfig, farm)) return -1;

            var canDef = FarmConfig?.Cans?.FirstOrDefault(c => string.Equals(c.Id, "sprinkler", StringComparison.OrdinalIgnoreCase));
            int cost = canDef?.Cost ?? 650;
            if (cost > 0 && !TrySpendClovers(cost)) return -1;

            if (!FarmExpansion.ApplySprinkler(FarmConfig, farm))
            {
                if (cost > 0) AddClovers(cost);
                return -1;
            }

            if (cost > 0) Count("spent_farm", cost);
            return cost;
        }

        public void FarmTick()
        {
            if (!Balance.FarmActive) return;
            var farm = EnsureFarm();
            FarmEngine.Tick(FarmConfig, farm, Clock.UtcNow);
        }

        private void RecordDailyHarvestDiary()
        {
            int todayOrdinal = Clock.LocalNow().Date.Year * 10000 + Clock.LocalNow().Date.Month * 100 + Clock.LocalNow().Date.Day;
            int lastDay = 0;
            State.Stats?.Counters?.TryGetValue("last_harvest_day", out lastDay);
            if (lastDay != todayOrdinal)
            {
                if (State.Stats?.Counters != null)
                {
                    State.Stats.Counters["last_harvest_day"] = todayOrdinal;
                }
                AddDiaryEntry("Harvested fresh vegetables from the farm.");
            }
        }
    }
}
