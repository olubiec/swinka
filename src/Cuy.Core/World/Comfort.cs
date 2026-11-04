using System;

namespace Cuy.Core.World
{
    public static class Comfort
    {
        public static int Score(WorldState world, WorldItemCatalog items, string placeIdOrNull)
        {
            if (world?.Rooms == null || items == null)
            {
                return 0;
            }

            int sum = 0;
            if (!string.IsNullOrEmpty(placeIdOrNull))
            {
                if (world.Rooms.TryGetValue(placeIdOrNull, out var layout) && layout?.Items != null)
                {
                    foreach (var placed in layout.Items)
                    {
                        if (placed == null) continue;
                        var def = items.Find(placed.ItemId);
                        if (def != null)
                        {
                            sum += def.Comfort;
                        }
                    }
                }
            }
            else
            {
                foreach (var layout in world.Rooms.Values)
                {
                    if (layout?.Items == null) continue;
                    foreach (var placed in layout.Items)
                    {
                        if (placed == null) continue;
                        var def = items.Find(placed.ItemId);
                        if (def != null)
                        {
                            sum += def.Comfort;
                        }
                    }
                }
            }

            return Math.Max(0, sum);
        }

        public static int Capped(int score, PlaceCatalog places)
        {
            int cap = places != null && places.ComfortCap > 0 ? places.ComfortCap : 100;
            if (score <= 0) return 0;
            return Math.Min(score, cap);
        }

        public static double MoodDecayFactor(int cappedScore, PlaceCatalog places)
        {
            int cap = places != null && places.ComfortCap > 0 ? places.ComfortCap : 100;
            double reduction = places != null ? places.MoodDecayReductionAtCap : 0.15;

            if (cappedScore <= 0)
            {
                return 1.0;
            }

            if (cappedScore >= cap)
            {
                return 1.0 - reduction;
            }

            return 1.0 - reduction * ((double)cappedScore / cap);
        }
    }
}
