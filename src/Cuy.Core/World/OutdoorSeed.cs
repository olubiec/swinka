using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public static class OutdoorSeed
    {
        public static readonly string[] DefaultPlaces = { "garden", "park", "farm", "market" };

        public static string BuildUid(string placeId, string id)
        {
            return $"fx:{placeId}:{id}";
        }

        public static void Seed(
            WorldState world,
            string placeId,
            OutdoorDefaults defaults = null,
            Balance balance = null)
        {
            if (world == null || string.IsNullOrWhiteSpace(placeId)) return;
            if (balance != null && !balance.OutdoorInstancesActive) return;

            string key = placeId.Trim();
            if (world.OutdoorSeeded.Contains(key)) return;

            var table = defaults ?? OutdoorDefaults.Current;
            var entries = table?.ForScene(key);
            if (entries == null || entries.Count == 0)
            {
                world.OutdoorSeeded.Add(key);
                return;
            }

            if (!world.Rooms.TryGetValue(key, out var room) || room == null)
            {
                room = new RoomLayout();
                world.Rooms[key] = room;
            }

            foreach (var entry in entries)
            {
                if (entry == null || string.IsNullOrEmpty(entry.Id) || string.IsNullOrEmpty(entry.ItemId))
                {
                    continue;
                }

                string uid = BuildUid(key, entry.Id);
                bool exists = room.Items.Any(i => i != null && string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
                if (!exists)
                {
                    room.Items.Add(new PlacedItem
                    {
                        Uid = uid,
                        ItemId = entry.ItemId,
                        X = entry.X,
                        Y = entry.Y,
                        Flip = entry.Flip,
                        Movable = entry.Movable,
                        Removable = entry.Removable
                    });
                }

                world.OwnedItems.TryGetValue(entry.ItemId, out int owned);
                world.OwnedItems[entry.ItemId] = owned + 1;
            }

            world.OutdoorSeeded.Add(key);
        }
    }
}
