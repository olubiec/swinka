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
        private const string ParkMigrationMarker = "park#v2";

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

            // Old saves seeded "park" with 24x12 coordinates or partial items before v2;
            // perform a one-time backfill + OOB relocation while keeping subsequent player removals intact.
            bool parkV2Migration = isPark && alreadySeeded && !world.OutdoorSeeded.Contains(ParkMigrationMarker);

            foreach (var entry in entries)
            {
                if (entry == null || string.IsNullOrEmpty(entry.Id) || string.IsNullOrEmpty(entry.ItemId))
                {
                    continue;
                }
                if (alreadySeeded && !parkV2Migration && entry.Removable)
                {
                    continue;
                }

                string uid = BuildUid(key, entry.Id);
                var existing = room.Items.FirstOrDefault(i => i != null && string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
                if (existing == null)
                {
                    int x = entry.X;
                    int y = entry.Y;
                    if (parkV2Migration)
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
                else if (parkV2Migration && NeedsParkCoordinateRepair(entry, existing))
                {
                    int x = entry.X;
                    int y = entry.Y;
                    ResolveFreeAnchor(room, ref x, ref y, existing);
                    existing.X = x;
                    existing.Y = y;
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

            if (string.Equals(entry.Id, "bench_left", StringComparison.OrdinalIgnoreCase) &&
                existing.X == 7 && existing.Y == 8 && (entry.X != 7 || entry.Y != 8))
            {
                return true;
            }

            if (string.Equals(entry.Id, "tree_2", StringComparison.OrdinalIgnoreCase) &&
                existing.X == 13 && existing.Y == 1 && (entry.X != 13 || entry.Y != 1))
            {
                return true;
            }

            return false;
        }

        private static void ResolveFreeAnchor(RoomLayout room, ref int x, ref int y, PlacedItem ignore = null)
        {
            if (!IsAnchorOccupied(room, x, y, ignore)) return;

            for (int cy = 0; cy < ParkGridRows; cy++)
            {
                for (int cx = 0; cx < ParkGridCols; cx++)
                {
                    if (!IsAnchorOccupied(room, cx, cy, ignore))
                    {
                        x = cx;
                        y = cy;
                        return;
                    }
                }
            }
        }

        private static bool IsAnchorOccupied(RoomLayout room, int x, int y, PlacedItem ignore)
        {
            foreach (var item in room.Items)
            {
                if (item == null || ReferenceEquals(item, ignore)) continue;
                if (item.X == x && item.Y == y) return true;
            }
            return false;
        }
    }
}
