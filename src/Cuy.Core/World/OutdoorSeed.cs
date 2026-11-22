using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public static class OutdoorSeed
    {
        public static readonly string[] DefaultPlaces = { "garden", "park", "farm", "market" };

        private const int ParkGridCols = 16;
        private const int ParkGridRows = 9;
        private const string ParkMigrationMarker = "park#v4";
        private const string GardenMigrationMarker = "garden#v2";

        private static readonly (string Id, int X, int Y)[] LegacyParkCoords =
        {
            ("gazebo", 4, 2),
            ("gazebo", 3, 2),
            ("gazebo", 3, 3),
            ("bench_left", 7, 8),
            ("bench_left", 6, 7),
            ("bench_right", 13, 7),
            ("bench_right", 12, 7),
            ("bench_right", 12, 6),
            ("bridge", 10, 5),
            ("bridge", 9, 4),
            ("tree_1", 0, 1),
            ("tree_2", 13, 1),
            ("tree_2", 0, 4),
            ("tree_3", 10, 1),
            ("tree_4", 0, 4),
            ("tree_4", 5, 0),
            ("lamp_left", 1, 7),
            ("lamp_mid", 9, 5),
            ("lamp_mid", 8, 5),
            ("lamp_mid", 8, 4),
            ("lamp_right", 14, 5),
            ("lamp_right", 13, 5),
            ("lamp_right", 13, 4)
        };

        private static readonly (string Id, int X, int Y)[] LegacyGardenCoords =
        {
            ("tree_left", 12, 2),
            ("tree_left", 12, 3),
            ("tree_right", 14, 2),
            ("tree_right", 14, 3),
            ("hedge", 11, 3),
            ("burrow", 1, 3)
        };

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
            bool alreadySeeded = world.OutdoorSeeded.Contains(key);
            bool isPark = string.Equals(key, "park", StringComparison.OrdinalIgnoreCase);
            bool isGarden = string.Equals(key, "garden", StringComparison.OrdinalIgnoreCase);

            var table = defaults ?? OutdoorDefaults.Current;
            var entries = table?.ForScene(key);
            if (entries == null || entries.Count == 0)
            {
                world.OutdoorSeeded.Add(key);
                return;
            }

            if (!world.Rooms.TryGetValue(key, out var room) || room == null)
            {
                if (alreadySeeded) return;
                room = new RoomLayout();
                world.Rooms[key] = room;
            }

            // Old saves seeded "park" or "garden" with legacy/overlapping coordinates;
            // perform a one-time coordinate repair while keeping subsequent player removals intact.
            bool parkMigration = isPark && alreadySeeded && !world.OutdoorSeeded.Contains(ParkMigrationMarker);
            bool gardenMigration = isGarden && alreadySeeded && !world.OutdoorSeeded.Contains(GardenMigrationMarker);
            string lampMigrationMarker = key.ToLowerInvariant() + "#lamps_v1";
            bool lampMigration = alreadySeeded && !world.OutdoorSeeded.Contains(lampMigrationMarker);

            if (parkMigration || gardenMigration)
            {
                var legacyTable = parkMigration ? LegacyParkCoords : LegacyGardenCoords;
                var repairs = new List<(OutdoorDefaultItem entry, PlacedItem item)>();
                var pendingRepairs = new HashSet<PlacedItem>();
                foreach (var entry in entries)
                {
                    if (entry == null || string.IsNullOrEmpty(entry.Id) || string.IsNullOrEmpty(entry.ItemId))
                    {
                        continue;
                    }
                    string uid = BuildUid(key, entry.Id);
                    var existing = room.Items.FirstOrDefault(i => i != null && string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
                    if (existing != null && NeedsCoordinateRepair(entry, existing, legacyTable))
                    {
                        repairs.Add((entry, existing));
                        pendingRepairs.Add(existing);
                    }
                }

                foreach (var pair in repairs)
                {
                    pendingRepairs.Remove(pair.item);
                    int x = pair.entry.X;
                    int y = pair.entry.Y;
                    ResolveFreeAnchor(room, ref x, ref y, pair.item, pendingRepairs);
                    pair.item.X = x;
                    pair.item.Y = y;
                }
            }

            foreach (var entry in entries)
            {
                if (entry == null || string.IsNullOrEmpty(entry.Id) || string.IsNullOrEmpty(entry.ItemId))
                {
                    continue;
                }
                bool isLampEntry = string.Equals(entry.ItemId, "lamp_post", StringComparison.OrdinalIgnoreCase);
                if (alreadySeeded && !parkMigration && !(lampMigration && isLampEntry) && entry.Removable)
                {
                    continue;
                }

                string uid = BuildUid(key, entry.Id);
                var existing = room.Items.FirstOrDefault(i => i != null && string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
                if (existing == null)
                {
                    int x = entry.X;
                    int y = entry.Y;
                    if (parkMigration || (lampMigration && isLampEntry))
                    {
                        ResolveFreeAnchor(room, ref x, ref y);
                    }

                    room.Items.Add(new PlacedItem
                    {
                        Uid = uid,
                        ItemId = entry.ItemId,
                        X = x,
                        Y = y,
                        Flip = entry.Flip,
                        Movable = entry.Movable,
                        Removable = entry.Removable
                    });
                    world.OwnedItems.TryGetValue(entry.ItemId, out int owned);
                    world.OwnedItems[entry.ItemId] = owned + 1;
                }
                else if (!alreadySeeded)
                {
                    world.OwnedItems.TryGetValue(entry.ItemId, out int owned);
                    world.OwnedItems[entry.ItemId] = owned + 1;
                }
            }

            world.OutdoorSeeded.Add(key);
            world.OutdoorSeeded.Add(lampMigrationMarker);
            if (isPark)
            {
                world.OutdoorSeeded.Add(ParkMigrationMarker);
            }
            if (isGarden)
            {
                world.OutdoorSeeded.Add(GardenMigrationMarker);
            }
        }

        private static bool NeedsCoordinateRepair(
            OutdoorDefaultItem entry,
            PlacedItem existing,
            (string Id, int X, int Y)[] legacyCoords)
        {
            if (existing.X < 0 || existing.X >= ParkGridCols || existing.Y < 0 || existing.Y >= ParkGridRows)
            {
                return true;
            }

            foreach (var legacy in legacyCoords)
            {
                if (string.Equals(entry.Id, legacy.Id, StringComparison.OrdinalIgnoreCase) &&
                    existing.X == legacy.X && existing.Y == legacy.Y &&
                    (entry.X != legacy.X || entry.Y != legacy.Y))
                {
                    return true;
                }
            }

            return false;
        }

        private static void ResolveFreeAnchor(
            RoomLayout room,
            ref int x,
            ref int y,
            PlacedItem ignore = null,
            HashSet<PlacedItem> pending = null)
        {
            if (!IsAnchorOccupied(room, x, y, ignore, pending)) return;

            for (int cy = 0; cy < ParkGridRows; cy++)
            {
                for (int cx = 0; cx < ParkGridCols; cx++)
                {
                    if (!IsAnchorOccupied(room, cx, cy, ignore, pending))
                    {
                        x = cx;
                        y = cy;
                        return;
                    }
                }
            }
        }

        private static bool IsAnchorOccupied(RoomLayout room, int x, int y, PlacedItem ignore, HashSet<PlacedItem> pending)
        {
            foreach (var item in room.Items)
            {
                if (item == null || ReferenceEquals(item, ignore)) continue;
                if (pending != null && pending.Contains(item)) continue;
                if (item.X == x && item.Y == y) return true;
            }
            return false;
        }
    }
}
