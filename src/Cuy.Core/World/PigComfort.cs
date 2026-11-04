using System;
using System.Linq;

namespace Cuy.Core.World
{
    /// <summary>
    /// Comfort of one pig, seen from that pig. A resident of the shared bedroom counts the dorm as its own room
    /// (counted once per resident). A resident's parked room counts for nobody. Non-residents see the dorm as a
    /// common place. The result is capped to 0..MaxScore.
    /// </summary>
    public static class PigComfort
    {
        public const int MaxScore = 100;

        public static int Score(WorldState world, WorldItemCatalog items, PigRoomConfig config, string pigId)
        {
            if (world?.Rooms == null || items == null || config == null || string.IsNullOrEmpty(pigId))
            {
                return 0;
            }

            bool resident = IsResident(world, pigId);
            string ownRoomId = config.RoomId(pigId);
            double sum = 0;
            foreach (var pair in world.Rooms)
            {
                if (pair.Value?.Items == null) continue;

                double weight;
                if (pair.Key == ownRoomId)
                {
                    weight = resident ? 0 : config.ComfortOwn;
                }
                else if (pair.Key == SharedRoomOps.DormId)
                {
                    weight = resident ? config.ComfortOwn : config.ComfortCommon;
                }
                else if (config.TryParseRoomId(pair.Key, out string otherPigId))
                {
                    weight = IsResident(world, otherPigId) ? 0 : config.ComfortOthers;
                }
                else if (config.CommonPlaces != null && config.CommonPlaces.Contains(pair.Key))
                {
                    weight = config.ComfortCommon;
                }
                else
                {
                    continue;
                }

                sum += weight * ItemsComfort(pair.Value, items);
            }

            double capped = Math.Min(MaxScore, Math.Max(0, Math.Round(sum)));
            return (int)capped;
        }

        private static bool IsResident(WorldState world, string pigId)
        {
            return world.RoomShare != null
                && world.RoomShare.TryGetValue(pigId, out string share)
                && share == SharedRoomOps.DormId;
        }

        private static int ItemsComfort(RoomLayout layout, WorldItemCatalog items)
        {
            int sum = 0;
            foreach (var placed in layout.Items)
            {
                if (placed == null) continue;
                var def = items.Find(placed.ItemId);
                if (def != null) sum += def.Comfort;
            }
            return sum;
        }
    }
}
