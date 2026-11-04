using System;
using System.Collections.Generic;

namespace Cuy.Core.World
{
    public static class FarmExpansion
    {
        public static int NextPackCost(FarmConfig config, FarmState state)
        {
            if (config == null || state == null || config.PlotPacks == null || config.PlotPacks.Count == 0)
            {
                return -1;
            }

            int running = config.StartPlots;
            for (int i = 0; i < config.PlotPacks.Count; i++)
            {
                if (state.PlotsOwned <= running)
                {
                    return config.PlotPacks[i].Cost;
                }
                running += config.PlotPacks[i].Plots;
            }
            return -1;
        }

        public static int NextPackCost(FarmState state, FarmConfig config)
            => NextPackCost(config, state);

        public static bool ApplyPack(FarmConfig config, FarmState state)
        {
            if (config == null || state == null || config.PlotPacks == null)
            {
                return false;
            }

            int running = config.StartPlots;
            for (int i = 0; i < config.PlotPacks.Count; i++)
            {
                if (state.PlotsOwned <= running)
                {
                    if (state.PlotsOwned < config.StartPlots)
                    {
                        state.PlotsOwned = config.StartPlots;
                    }
                    state.PlotsOwned += config.PlotPacks[i].Plots;

                    if (state.Plots == null)
                    {
                        state.Plots = new List<PlotState>();
                    }
                    while (state.Plots.Count < state.PlotsOwned)
                    {
                        state.Plots.Add(new PlotState());
                    }
                    return true;
                }
                running += config.PlotPacks[i].Plots;
            }
            return false;
        }

        public static bool ApplyPack(FarmState state, FarmConfig config)
            => ApplyPack(config, state);

        public static int NextOrchardCost(FarmConfig config, FarmState state)
        {
            if (config == null || state == null || config.OrchardSlots == null)
            {
                return -1;
            }

            if (state.OrchardSlots < 0 || state.OrchardSlots >= config.OrchardSlots.Count)
            {
                return -1;
            }

            return config.OrchardSlots[state.OrchardSlots];
        }

        public static int NextOrchardCost(FarmState state, FarmConfig config)
            => NextOrchardCost(config, state);

        public static bool ApplyOrchardSlot(FarmConfig config, FarmState state)
        {
            if (NextOrchardCost(config, state) < 0)
            {
                return false;
            }

            state.OrchardSlots++;
            if (state.Orchard == null)
            {
                state.Orchard = new List<OrchardState>();
            }
            while (state.Orchard.Count < state.OrchardSlots)
            {
                state.Orchard.Add(new OrchardState());
            }
            return true;
        }

        public static bool ApplyOrchardSlot(FarmState state, FarmConfig config)
            => ApplyOrchardSlot(config, state);

        public static bool CanBuyCan(FarmConfig config, FarmState state, string canId)
        {
            if (state == null || string.IsNullOrEmpty(canId))
            {
                return false;
            }

            if (string.Equals(canId, "sprinkler", StringComparison.OrdinalIgnoreCase))
            {
                return CanBuySprinkler(config, state);
            }

            if (string.Equals(canId, "can_1", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (string.Equals(canId, "can_2", StringComparison.OrdinalIgnoreCase))
            {
                string currentCan = string.IsNullOrEmpty(state.CanId) ? "can_1" : state.CanId;
                return string.Equals(currentCan, "can_1", StringComparison.OrdinalIgnoreCase);
            }

            return false;
        }

        public static bool CanBuyCan(FarmState state, FarmConfig config, string canId)
            => CanBuyCan(config, state, canId);

        public static bool CanBuyCan(FarmState state, string canId)
            => CanBuyCan(FarmConfig.Current, state, canId);

        public static bool ApplyCan(FarmConfig config, FarmState state, string canId)
        {
            if (!CanBuyCan(config, state, canId))
            {
                return false;
            }

            if (string.Equals(canId, "sprinkler", StringComparison.OrdinalIgnoreCase))
            {
                return ApplySprinkler(config, state);
            }

            state.CanId = canId;
            return true;
        }

        public static bool ApplyCan(FarmState state, FarmConfig config, string canId)
            => ApplyCan(config, state, canId);

        public static bool ApplyCan(FarmState state, string canId)
            => ApplyCan(FarmConfig.Current, state, canId);

        public static bool CanBuySprinkler(FarmConfig config, FarmState state)
        {
            if (state == null) return false;
            return !state.Sprinkler;
        }

        public static bool CanBuySprinkler(FarmState state)
            => CanBuySprinkler(null, state);

        public static bool ApplySprinkler(FarmConfig config, FarmState state)
        {
            if (state == null || state.Sprinkler)
            {
                return false;
            }

            state.Sprinkler = true;
            return true;
        }

        public static bool ApplySprinkler(FarmState state)
            => ApplySprinkler(null, state);

        public static int PlotsPerWaterUse(FarmState state, FarmConfig config)
        {
            if (state == null) return 1;

            string currentCan = string.IsNullOrEmpty(state.CanId) ? "can_1" : state.CanId;
            if (config != null && config.Cans != null)
            {
                for (int i = 0; i < config.Cans.Count; i++)
                {
                    if (string.Equals(config.Cans[i].Id, currentCan, StringComparison.OrdinalIgnoreCase))
                    {
                        return config.Cans[i].PlotsPerUse > 0 ? config.Cans[i].PlotsPerUse : 1;
                    }
                }
            }

            return string.Equals(currentCan, "can_2", StringComparison.OrdinalIgnoreCase) ? 4 : 1;
        }

        public static int PlotsPerWaterUse(FarmConfig config, FarmState state)
            => PlotsPerWaterUse(state, config);

        public static int PlotsPerWaterUse(FarmState state)
            => PlotsPerWaterUse(state, FarmConfig.Current);
    }
}
