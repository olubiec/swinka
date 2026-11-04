using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public sealed class SaleQuote
    {
        public int Units { get; }
        public int TotalClovers { get; }
        public double NewDemand { get; }

        public int Count => Units;
        public int Clovers => TotalClovers;
        public double Demand => NewDemand;
        public bool IsEmpty => Units <= 0;

        public static readonly SaleQuote Empty = new SaleQuote(0, 0, 1.0);

        public SaleQuote(int units, int totalClovers, double newDemand)
        {
            Units = units;
            TotalClovers = totalClovers;
            NewDemand = newDemand;
        }
    }

    public static class MarketPricing
    {
        private static int StableHash(string s)
        {
            if (string.IsNullOrEmpty(s)) return 0;
            unchecked
            {
                int hash = (int)2166136261;
                for (int i = 0; i < s.Length; i++)
                {
                    hash = (hash ^ s[i]) * 16777619;
                }
                return hash;
            }
        }

        public static double Wiggle(string localDate, string itemId, MarketConfig cfg)
        {
            if (cfg == null || cfg.PriceWigglePercent <= 0) return 0.0;
            string key = (localDate ?? "") + ":" + (itemId ?? "");
            int seed = StableHash(key);
            uint s = (uint)seed;
            s = s * 1664525u + 1013904223u;
            double fraction = (double)s / 4294967296.0; // in [0, 1)
            double maxWiggle = cfg.PriceWigglePercent / 100.0;
            return (fraction * 2.0 - 1.0) * maxWiggle;
        }

        public static int CapLeft(MarketState state, MarketConfig cfg)
        {
            if (cfg == null) return 0;
            if (state == null) return cfg.DailySalesCapClovers;
            int cap = cfg.DailySalesCapClovers;
            int used = (int)Math.Floor(state.SalesToday);
            return Math.Max(0, cap - used);
        }

        public static void NewDay(MarketState state, string localDate, MarketConfig cfg)
        {
            if (state == null) return;
            if (string.Equals(state.DayLocalDate, localDate, StringComparison.Ordinal)) return;

            // Recovers demand
            if (state.Demand != null && cfg != null)
            {
                foreach (var key in state.Demand.Keys.ToList())
                {
                    state.Demand[key] = Math.Min(1.0, state.Demand[key] + cfg.DemandRecoverPerDay);
                }
            }

            // Clears SoldToday and SalesToday when the date changes
            if (state.SoldToday != null)
            {
                state.SoldToday.Clear();
            }
            else
            {
                state.SoldToday = new Dictionary<string, int>();
            }

            state.SalesToday = 0;
            state.DayLocalDate = localDate;
        }

        public static SaleQuote Quote(MarketState state, MarketConfig cfg, CropDefinition crop, int count, string localDate)
        {
            if (count <= 0 || crop == null || cfg == null || state == null)
            {
                double defaultDemand = 1.0;
                if (state?.Demand != null && crop != null)
                {
                    string id = crop.ItemId ?? crop.Id ?? "";
                    if (state.Demand.TryGetValue(id, out double d))
                        defaultDemand = d;
                }
                return new SaleQuote(0, 0, defaultDemand);
            }

            int capLeft = CapLeft(state, cfg);
            string itemId = crop.ItemId ?? crop.Id ?? "";
            double curDemand = 1.0;
            if (state.Demand != null && state.Demand.TryGetValue(itemId, out double existingDemand))
            {
                curDemand = existingDemand;
            }

            if (capLeft <= 0)
            {
                return new SaleQuote(0, 0, curDemand);
            }

            double wiggle = Wiggle(localDate, itemId, cfg);
            double basePrice = crop.SellPrice * (1.0 + wiggle);
            double drop = cfg.DemandDropPerUnit;
            double floor = cfg.DemandFloor;

            int unitsFit = 0;
            double runningTotal = 0.0;
            double simulatedDemand = curDemand;

            for (int i = 0; i < count; i++)
            {
                double unitPrice = basePrice * simulatedDemand;
                if (unitPrice < 0) unitPrice = 0;

                double nextTotal = runningTotal + unitPrice;
                if ((int)Math.Floor(nextTotal) > capLeft)
                {
                    break;
                }

                runningTotal = nextTotal;
                unitsFit++;
                simulatedDemand = Math.Max(floor, simulatedDemand - drop);
            }

            int totalClovers = (int)Math.Floor(runningTotal);
            return new SaleQuote(unitsFit, totalClovers, simulatedDemand);
        }

        public static SaleQuote Sell(MarketState state, MarketConfig cfg, CropDefinition crop, int count, string localDate)
        {
            if (state == null) return SaleQuote.Empty;
            SaleQuote quote = Quote(state, cfg, crop, count, localDate);
            if (quote.Units <= 0) return quote;

            string itemId = crop.ItemId ?? crop.Id ?? "";
            if (state.Demand == null) state.Demand = new Dictionary<string, double>();
            state.Demand[itemId] = quote.NewDemand;

            state.SalesToday += quote.TotalClovers;

            if (state.SoldToday == null) state.SoldToday = new Dictionary<string, int>();
            state.SoldToday[itemId] = (state.SoldToday.TryGetValue(itemId, out int s) ? s : 0) + quote.Units;

            return quote;
        }
    }
}
