using System;
using System.Collections.Generic;

namespace Cuy.Core.World
{
    public enum PlantResult
    {
        Ok,
        NoSuchPlot,
        Occupied,
        UnknownCrop,
        Locked,
        NotAnnual
    }

    public class HarvestResult
    {
        public string ItemId { get; set; }
        public int Count { get; set; }
        public string CropId { get; set; }
        public bool GreatHarvest { get; set; }

        public HarvestResult()
        {
            ItemId = string.Empty;
            CropId = string.Empty;
        }

        public HarvestResult(string itemId, int count, string cropId = null, bool greatHarvest = false)
        {
            ItemId = itemId ?? string.Empty;
            Count = count;
            CropId = cropId ?? string.Empty;
            GreatHarvest = greatHarvest;
        }
    }

    public static class FarmEngine
    {
        public static PlantResult Plant(FarmConfig config, FarmState state, DateTime nowUtc, int plot, string cropId, int harvestsDone)
        {
            if (config == null || state == null) return PlantResult.NoSuchPlot;
            if (plot < 0 || plot >= state.PlotsOwned) return PlantResult.NoSuchPlot;

            if (state.Plots != null && plot < state.Plots.Count)
            {
                var existing = state.Plots[plot];
                if (!string.IsNullOrEmpty(existing.CropId)) return PlantResult.Occupied;
            }

            var crop = config.Find(cropId);
            if (crop == null) return PlantResult.UnknownCrop;
            if (crop.Kind != CropKind.Annual) return PlantResult.NotAnnual;
            if (crop.UnlockHarvests > harvestsDone) return PlantResult.Locked;

            if (state.Plots == null)
            {
                state.Plots = new List<PlotState>();
            }
            while (state.Plots.Count <= plot)
            {
                state.Plots.Add(new PlotState());
            }

            var plotState = state.Plots[plot];
            plotState.CropId = cropId;
            plotState.PlantedUtc = nowUtc;
            plotState.Watered = false;

            return PlantResult.Ok;
        }

        public static PlantResult Plant(FarmConfig config, FarmState state, int plot, string cropId, int harvestsDone, DateTime nowUtc)
            => Plant(config, state, nowUtc, plot, cropId, harvestsDone);

        public static PlantResult Plant(FarmConfig config, FarmState state, int plot, string cropId, int harvestsDone)
            => Plant(config, state, DateTime.UtcNow, plot, cropId, harvestsDone);

        public static PlantResult Plant(FarmConfig config, FarmState state, int plot, string cropId)
            => Plant(config, state, DateTime.UtcNow, plot, cropId, 0);

        public static bool IsRipe(FarmConfig config, FarmState state, DateTime nowUtc, int plot)
        {
            if (config == null || state == null || state.Plots == null) return false;
            if (plot < 0 || plot >= state.PlotsOwned || plot >= state.Plots.Count) return false;

            var plotState = state.Plots[plot];
            if (string.IsNullOrEmpty(plotState.CropId)) return false;

            var crop = config.Find(plotState.CropId);
            if (crop == null) return false;

            double cut = plotState.Watered ? (config.WaterTimeCutPercent / 100.0) : 0.0;
            double minutesNeeded = crop.GrowMinutes * (1.0 - cut);
            var duration = TimeSpan.FromMinutes(minutesNeeded);

            return (nowUtc - plotState.PlantedUtc) >= duration;
        }

        public static bool IsRipe(FarmConfig config, FarmState state, int plot, DateTime nowUtc)
            => IsRipe(config, state, nowUtc, plot);

        public static bool IsRipe(FarmConfig config, FarmState state, int plot)
            => IsRipe(config, state, DateTime.UtcNow, plot);

        public static TimeSpan? TimeLeft(FarmConfig config, FarmState state, DateTime nowUtc, int plot)
        {
            if (config == null || state == null || state.Plots == null) return null;
            if (plot < 0 || plot >= state.PlotsOwned || plot >= state.Plots.Count) return null;

            var plotState = state.Plots[plot];
            if (string.IsNullOrEmpty(plotState.CropId)) return null;

            var crop = config.Find(plotState.CropId);
            if (crop == null) return null;

            double cut = plotState.Watered ? (config.WaterTimeCutPercent / 100.0) : 0.0;
            double minutesNeeded = crop.GrowMinutes * (1.0 - cut);
            var duration = TimeSpan.FromMinutes(minutesNeeded);

            var elapsed = nowUtc - plotState.PlantedUtc;
            if (elapsed >= duration) return TimeSpan.Zero;
            return duration - elapsed;
        }

        public static TimeSpan? TimeLeft(FarmConfig config, FarmState state, int plot, DateTime nowUtc)
            => TimeLeft(config, state, nowUtc, plot);

        public static TimeSpan? TimeLeft(FarmConfig config, FarmState state, int plot)
            => TimeLeft(config, state, DateTime.UtcNow, plot);

        public static bool Water(FarmConfig config, FarmState state, DateTime nowUtc, int plot)
        {
            if (config == null || state == null || state.Plots == null) return false;
            if (plot < 0 || plot >= state.PlotsOwned || plot >= state.Plots.Count) return false;

            var plotState = state.Plots[plot];
            if (string.IsNullOrEmpty(plotState.CropId)) return false;
            if (plotState.Watered) return false;
            if (IsRipe(config, state, nowUtc, plot)) return false;

            plotState.Watered = true;
            return true;
        }

        public static bool Water(FarmConfig config, FarmState state, int plot, DateTime nowUtc)
            => Water(config, state, nowUtc, plot);

        public static bool Water(FarmConfig config, FarmState state, int plot)
            => Water(config, state, DateTime.UtcNow, plot);

        public static int WaterMany(FarmConfig config, FarmState state, DateTime nowUtc, int firstPlot, int count)
        {
            int watered = 0;
            for (int i = firstPlot; i < firstPlot + count; i++)
            {
                if (Water(config, state, nowUtc, i))
                {
                    watered++;
                }
            }
            return watered;
        }

        public static int WaterMany(FarmConfig config, FarmState state, int firstPlot, int count, DateTime nowUtc)
            => WaterMany(config, state, nowUtc, firstPlot, count);

        public static int WaterMany(FarmConfig config, FarmState state, int firstPlot, int count)
            => WaterMany(config, state, DateTime.UtcNow, firstPlot, count);

        public static HarvestResult Harvest(FarmConfig config, FarmState state, DateTime nowUtc, int plot)
        {
            if (config == null || state == null || state.Plots == null) return new HarvestResult(string.Empty, 0);
            if (plot < 0 || plot >= state.PlotsOwned || plot >= state.Plots.Count) return new HarvestResult(string.Empty, 0);

            var plotState = state.Plots[plot];
            if (string.IsNullOrEmpty(plotState.CropId)) return new HarvestResult(string.Empty, 0);

            var crop = config.Find(plotState.CropId);
            if (crop == null) return new HarvestResult(string.Empty, 0);

            if (!IsRipe(config, state, nowUtc, plot))
            {
                return new HarvestResult(crop.ItemId, 0, crop.Id);
            }

            long seed = unchecked((long)plot * 7919L + plotState.PlantedUtc.Ticks);
            var rng = new Random(unchecked((int)seed));
            bool great = rng.Next(100) < config.GreatHarvestChancePercent;
            int count = crop.Yield + (great ? config.GreatHarvestExtraYield : 0);

            plotState.CropId = null;
            plotState.PlantedUtc = default;
            plotState.Watered = false;

            return new HarvestResult(crop.ItemId, count, crop.Id, great);
        }

        public static HarvestResult Harvest(FarmConfig config, FarmState state, int plot, DateTime nowUtc)
            => Harvest(config, state, nowUtc, plot);

        public static HarvestResult Harvest(FarmConfig config, FarmState state, int plot)
            => Harvest(config, state, DateTime.UtcNow, plot);

        public static IReadOnlyList<HarvestResult> HarvestAll(FarmConfig config, FarmState state, DateTime nowUtc)
        {
            var results = new List<HarvestResult>();
            if (config == null || state == null || state.Plots == null) return results;

            for (int i = 0; i < state.PlotsOwned && i < state.Plots.Count; i++)
            {
                if (IsRipe(config, state, nowUtc, i))
                {
                    var res = Harvest(config, state, nowUtc, i);
                    if (res != null && res.Count > 0)
                    {
                        results.Add(res);
                    }
                }
            }
            return results;
        }

        public static IReadOnlyList<HarvestResult> HarvestAll(FarmConfig config, FarmState state)
            => HarvestAll(config, state, DateTime.UtcNow);

        public static PlantResult PlantOrchard(FarmConfig config, FarmState state, DateTime nowUtc, int slot, string cropId, int harvestsDone = int.MaxValue)
        {
            if (config == null || state == null) return PlantResult.NoSuchPlot;
            if (slot < 0 || slot >= state.OrchardSlots) return PlantResult.NoSuchPlot;

            if (state.Orchard != null && slot < state.Orchard.Count)
            {
                var existing = state.Orchard[slot];
                if (!string.IsNullOrEmpty(existing.CropId)) return PlantResult.Occupied;
            }

            var crop = config.Find(cropId);
            if (crop == null) return PlantResult.UnknownCrop;
            if (crop.Kind != CropKind.Perennial) return PlantResult.NotAnnual;
            if (crop.UnlockHarvests > harvestsDone) return PlantResult.Locked;

            if (state.Orchard == null)
            {
                state.Orchard = new List<OrchardState>();
            }
            while (state.Orchard.Count <= slot)
            {
                state.Orchard.Add(new OrchardState());
            }

            var orchardState = state.Orchard[slot];
            orchardState.CropId = cropId;
            orchardState.NextUtc = nowUtc.AddMinutes(crop.GrowMinutes);
            orchardState.Stock = 0;

            return PlantResult.Ok;
        }

        public static PlantResult PlantOrchard(FarmConfig config, FarmState state, int slot, string cropId, int harvestsDone = int.MaxValue, DateTime nowUtc = default)
            => PlantOrchard(config, state, nowUtc == default ? DateTime.UtcNow : nowUtc, slot, cropId, harvestsDone);

        public static PlantResult PlantOrchard(FarmConfig config, FarmState state, int slot, string cropId)
            => PlantOrchard(config, state, DateTime.UtcNow, slot, cropId);

        public static void Tick(FarmConfig config, FarmState state, DateTime nowUtc)
        {
            if (config == null || state == null) return;

            if (state.Orchard != null)
            {
                for (int i = 0; i < state.OrchardSlots && i < state.Orchard.Count; i++)
                {
                    var slot = state.Orchard[i];
                    if (string.IsNullOrEmpty(slot.CropId)) continue;

                    var crop = config.Find(slot.CropId);
                    if (crop == null || crop.GrowMinutes <= 0) continue;

                    while (slot.Stock < crop.MaxStock && nowUtc >= slot.NextUtc)
                    {
                        int increment = crop.Yield > 0 ? crop.Yield : 1;
                        slot.Stock = Math.Min(crop.MaxStock, slot.Stock + increment);
                        slot.NextUtc = slot.NextUtc.AddMinutes(crop.GrowMinutes);
                    }
                }
            }

            if (state.Sprinkler)
            {
                string today = nowUtc.ToString("yyyy-MM-dd");
                if (state.LastWaterDate != today)
                {
                    WaterMany(config, state, nowUtc, 0, state.PlotsOwned);
                    state.LastWaterDate = today;
                }
            }
        }

        public static void Tick(FarmConfig config, FarmState state)
            => Tick(config, state, DateTime.UtcNow);

        public static HarvestResult HarvestOrchard(FarmConfig config, FarmState state, DateTime nowUtc, int slot)
        {
            if (config == null || state == null || state.Orchard == null) return new HarvestResult(string.Empty, 0);
            if (slot < 0 || slot >= state.OrchardSlots || slot >= state.Orchard.Count) return new HarvestResult(string.Empty, 0);

            var orchardState = state.Orchard[slot];
            if (string.IsNullOrEmpty(orchardState.CropId)) return new HarvestResult(string.Empty, 0);

            var crop = config.Find(orchardState.CropId);
            if (crop == null) return new HarvestResult(string.Empty, 0);

            Tick(config, state, nowUtc);

            int count = orchardState.Stock;
            if (count <= 0)
            {
                return new HarvestResult(crop.ItemId, 0, crop.Id);
            }

            orchardState.Stock = 0;
            if (orchardState.NextUtc <= nowUtc)
            {
                orchardState.NextUtc = nowUtc.AddMinutes(crop.GrowMinutes);
            }

            return new HarvestResult(crop.ItemId, count, crop.Id, false);
        }

        public static HarvestResult HarvestOrchard(FarmConfig config, FarmState state, int slot, DateTime nowUtc)
            => HarvestOrchard(config, state, nowUtc, slot);

        public static HarvestResult HarvestOrchard(FarmConfig config, FarmState state, int slot)
            => HarvestOrchard(config, state, DateTime.UtcNow, slot);
    }
}
