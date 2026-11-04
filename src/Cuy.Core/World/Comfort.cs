using System;

namespace Cuy.Core.World
{
    public static class Comfort
    {
        public static int Score(WorldState world, WorldItemCatalog items, string placeIdOrNull = null)
        {
            if (world == null || world.Rooms == null || world.Rooms.Count == 0)
            {
                return 0;
            }

            var catalog = items ?? WorldItemCatalog.Current;
            if (catalog == null)
            {
                return 0;
            }

            int sum = 0;

            if (!string.IsNullOrEmpty(placeIdOrNull))
            {
                RoomLayout room;
                if (world.Rooms.TryGetValue(placeIdOrNull, out room))
                {
                    sum += ScoreRoom(room, catalog);
                }
                else if (string.Equals(placeIdOrNull, "house", StringComparison.OrdinalIgnoreCase))
                {
                    foreach (var kv in world.Rooms)
                    {
                        if (string.Equals(RoomLayoutOps.NormalizePlaceId(kv.Key), "house", StringComparison.OrdinalIgnoreCase))
                        {
                            sum += ScoreRoom(kv.Value, catalog);
                        }
                    }
                }
                return sum;
            }

            foreach (var kv in world.Rooms)
            {
                sum += ScoreRoom(kv.Value, catalog);
            }

            return sum;
        }

        private static int ScoreRoom(RoomLayout room, WorldItemCatalog catalog)
        {
            if (room == null || room.Items == null || room.Items.Count == 0)
            {
                return 0;
            }

            int sum = 0;
            for (int i = 0; i < room.Items.Count; i++)
            {
                var placed = room.Items[i];
                if (placed == null || string.IsNullOrEmpty(placed.ItemId)) continue;
                var def = catalog.Find(placed.ItemId);
                if (def != null && def.Comfort > 0)
                {
                    sum += def.Comfort;
                }
            }
            return sum;
        }

        public static int Capped(int score, PlaceCatalog places)
        {
            var cat = places ?? PlaceCatalog.Current;
            int cap = cat != null && cat.ComfortCap > 0 ? cat.ComfortCap : 100;
            if (score <= 0) return 0;
            if (score >= cap) return cap;
            return score;
        }

        public static int Capped(WorldState world, WorldItemCatalog items, PlaceCatalog places, string placeIdOrNull = null)
        {
            return Capped(Score(world, items, placeIdOrNull), places);
        }

        public static double MoodDecayFactor(int cappedScore, PlaceCatalog places)
        {
            var cat = places ?? PlaceCatalog.Current;
            int cap = cat != null && cat.ComfortCap > 0 ? cat.ComfortCap : 100;
            double reduction = cat != null ? cat.MoodDecayReductionAtCap : 0.15;

            int clamped = Capped(cappedScore, cat);
            double factor = 1.0 - reduction * ((double)clamped / cap);
            if (factor < 0.0) return 0.0;
            if (factor > 1.0) return 1.0;
            return factor;
        }

        public static double MoodDecayFactor(WorldState world, WorldItemCatalog items, PlaceCatalog places)
        {
            int raw = Score(world, items, null);
            int capped = Capped(raw, places);
            return MoodDecayFactor(capped, places);
        }
    }
}
