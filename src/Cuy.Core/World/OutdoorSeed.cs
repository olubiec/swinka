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
        private const string ParkMigrationMarker = "park#v3";

        private static readonly (string Id, int X, int Y)[] LegacyParkCoords =
        {
            ("gazebo", 4, 2),
            ("bench_left", 7, 8),
            ("bench_right", 13, 7),
            ("bridge", 10, 5),
            ("tree_1", 0, 1),
            ("tree_2", 13, 1),
            ("tree_3", 10, 1),
            ("tree_4", 0, 4),
            ("lamp_mid", 9, 5),
            ("lamp_right", 14, 5)
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

            // Old saves seeded "park" with 24x12 coordinates, partial items, or stream-overlapping v2 layouts;
            // perform a one-time backfill + coordinate repair while keeping subsequent player removals intact.
            bool parkMigration = isPark && alreadySeeded && !world.OutdoorSeeded.Contains(ParkMigrationMarker);

            if (parkMigration)
            {
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
                    if (existing != null && NeedsParkCoordinateRepair(entry, existing))
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
                if (alreadySeeded && !parkMigration && entry.Removable)
                {
                    continue;
                }

                string uid = BuildUid(key, entry.Id);
                var existing = room.Items.FirstOrDefault(i => i != null && string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
                if (existing == null)
                {
                    int x = entry.X;
                    int y = entry.Y;
                    if (parkMigration)
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
            if (isPark)
            {
                world.OutdoorSeeded.Add(ParkMigrationMarker);
            }
        }

        private static bool NeedsParkCoordinateRepair(OutdoorDefaultItem entry, PlacedItem existing)
        {
            if (existing.X < 0 || existing.X >= ParkGridCols || existing.Y < 0 || existing.Y >= ParkGridRows)
            {
                return true;
            }

            foreach (var legacy in LegacyParkCoords)
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
