using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public static class FarmExpansion
    {
        public static int NextPackIndex(FarmConfig config, FarmState state)
        {
            if (config == null || state == null || config.PlotPacks == null || config.PlotPacks.Count == 0)
                return -1;

            int basePlots = Math.Max(state.PlotsOwned, config.StartPlots);
            int boughtPlots = basePlots - config.StartPlots;
            int accum = 0;

            for (int i = 0; i < config.PlotPacks.Count; i++)
            {
                int packPlots = Math.Max(1, config.PlotPacks[i].Plots);
                if (boughtPlots <= accum)
                    return i;
                accum += packPlots;
            }

            return -1;
        }

        public static int NextPackCost(FarmConfig config, FarmState state)
        {
            int idx = NextPackIndex(config, state);
            if (idx < 0 || idx >= config.PlotPacks.Count)
                return -1;
            return config.PlotPacks[idx].Cost;
        }

        public static int NextPackCost(FarmState state, FarmConfig config)
            => NextPackCost(config, state);

        public static bool ApplyPack(FarmConfig config, FarmState state)
        {
            int idx = NextPackIndex(config, state);
            if (idx < 0 || idx >= config.PlotPacks.Count)
                return false;

            if (state.PlotsOwned < config.StartPlots)
                state.PlotsOwned = config.StartPlots;

            int packPlots = Math.Max(1, config.PlotPacks[idx].Plots);
            state.PlotsOwned += packPlots;
            return true;
        }

        public static bool ApplyPack(FarmState state, FarmConfig config)
            => ApplyPack(config, state);

        public static int NextOrchardCost(FarmConfig config, FarmState state)
        {
            if (config == null || state == null || config.OrchardSlots == null)
                return -1;

            int idx = Math.Max(0, state.OrchardSlots);
            if (idx >= config.OrchardSlots.Count)
                return -1;

            return config.OrchardSlots[idx];
        }

        public static int NextOrchardCost(FarmState state, FarmConfig config)
            => NextOrchardCost(config, state);

        public static bool ApplyOrchardSlot(FarmConfig config, FarmState state)
        {
            if (NextOrchardCost(config, state) < 0)
                return false;

            state.OrchardSlots = Math.Max(0, state.OrchardSlots) + 1;
            return true;
        }

        public static bool ApplyOrchardSlot(FarmState state, FarmConfig config)
            => ApplyOrchardSlot(config, state);

        private static List<WaterCanDef> GetManualCans(FarmConfig config)
        {
            if (config?.Cans == null) return new List<WaterCanDef>();
            return config.Cans
                .Where(c => !c.AutoDaily && !string.Equals(c.Id, "sprinkler", StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        private static string GetCurrentCanId(FarmConfig config, FarmState state)
        {
            if (state != null && !string.IsNullOrWhiteSpace(state.CanId))
                return state.CanId;

            var manualCans = GetManualCans(config);
            if (manualCans.Count > 0 && manualCans[0].Cost == 0)
                return manualCans[0].Id;

            return "can_1";
        }

        public static int CanCost(FarmConfig config, string canId)
        {
            if (config?.Cans == null || string.IsNullOrWhiteSpace(canId)) return -1;
            var can = config.Cans.FirstOrDefault(c => string.Equals(c.Id, canId, StringComparison.OrdinalIgnoreCase));
            return can != null ? can.Cost : -1;
        }

        public static int NextCanCost(FarmConfig config, FarmState state)
        {
            if (config == null || state == null) return -1;
            var manualCans = GetManualCans(config);
            if (manualCans.Count == 0) return -1;

            string currentId = GetCurrentCanId(config, state);
            int curIdx = manualCans.FindIndex(c => string.Equals(c.Id, currentId, StringComparison.OrdinalIgnoreCase));
            int nextIdx = curIdx + 1;
            if (nextIdx >= 0 && nextIdx < manualCans.Count)
                return manualCans[nextIdx].Cost;

            return -1;
        }

        public static bool CanBuyCan(FarmConfig config, FarmState state, string canId)
        {
            if (config == null || state == null || string.IsNullOrWhiteSpace(canId))
                return false;

            var manualCans = GetManualCans(config);
            int targetIdx = manualCans.FindIndex(c => string.Equals(c.Id, canId, StringComparison.OrdinalIgnoreCase));
            if (targetIdx < 0)
                return false;

            // Default free can (index 0 with cost 0) is already owned by default unless state explicitly has no can at all
            string currentId = GetCurrentCanId(config, state);
            int curIdx = manualCans.FindIndex(c => string.Equals(c.Id, currentId, StringComparison.OrdinalIgnoreCase));

            if (targetIdx <= curIdx)
                return false;

            return targetIdx == curIdx + 1;
        }

        public static bool CanBuyCan(FarmState state, FarmConfig config, string canId)
            => CanBuyCan(config, state, canId);

        public static bool ApplyCan(FarmConfig config, FarmState state, string canId)
        {
            if (!CanBuyCan(config, state, canId))
                return false;

            var manualCans = GetManualCans(config);
            var target = manualCans.First(c => string.Equals(c.Id, canId, StringComparison.OrdinalIgnoreCase));
            state.CanId = target.Id;
            return true;
        }

        public static bool ApplyCan(FarmState state, FarmConfig config, string canId)
            => ApplyCan(config, state, canId);

        public static bool ApplyCan(FarmState state, string canId)
            => ApplyCan(FarmConfig.Current, state, canId);

        public static int SprinklerCost(FarmConfig config, FarmState state = null)
        {
            if (state != null && state.Sprinkler)
                return -1;
            if (config?.Cans == null)
                return -1;
            var sp = config.Cans.FirstOrDefault(c => c.AutoDaily || string.Equals(c.Id, "sprinkler", StringComparison.OrdinalIgnoreCase));
            return sp != null ? sp.Cost : -1;
        }

        public static bool CanBuySprinkler(FarmConfig config, FarmState state)
        {
            if (config == null || state == null || state.Sprinkler)
                return false;
            return SprinklerCost(config, state) >= 0;
        }

        public static bool ApplySprinkler(FarmConfig config, FarmState state)
        {
            if (!CanBuySprinkler(config, state))
                return false;

            state.Sprinkler = true;
            return true;
        }

        public static bool ApplySprinkler(FarmState state, FarmConfig config)
            => ApplySprinkler(config, state);

        public static bool ApplySprinkler(FarmState state)
            => ApplySprinkler(FarmConfig.Current, state);

        public static int PlotsPerWaterUse(FarmState state, FarmConfig config)
        {
            if (config == null)
                return 1;

            string currentId = GetCurrentCanId(config, state);
            var manualCans = GetManualCans(config);
            var can = manualCans.FirstOrDefault(c => string.Equals(c.Id, currentId, StringComparison.OrdinalIgnoreCase));
            if (can != null && can.PlotsPerUse > 0)
                return can.PlotsPerUse;

            return 1;
        }

        public static int PlotsPerWaterUse(FarmConfig config, FarmState state)
            => PlotsPerWaterUse(state, config);
    }
}
