using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public enum MoveInStatus
    {
        Moved,
        TooMany,
        NeedTwo,
        AlreadyShared
    }

    public sealed class MoveInResult
    {
        public MoveInStatus Status { get; set; }

        /// <summary>Items of the moved pigs that did not fit into the dorm. They stay owned and unplaced.</summary>
        public int ItemsStored { get; set; }
    }

    /// <summary>
    /// Shared bedroom ("dorm"): merges pig rooms into one shared layout and restores them.
    /// Items are never deleted; only RoomLayoutOps.Place and RoomLayoutOps.Remove change layouts.
    /// </summary>
    public static class SharedRoomOps
    {
        public const string DormId = "dorm";

        /// <summary>Place id used for item placement rules: the shared bedroom counts as a bedroom.</summary>
        public const string DormPlaceId = "bedroom";

        /// <summary>Rows at the top of the dorm reserved for wall items (same as own pig rooms).</summary>
        public const int WallRows = 2;

        /// <summary>Pig ids that live in the shared bedroom, in RoomShare order.</summary>
        public static IReadOnlyList<string> Residents(WorldState world)
        {
            if (world?.RoomShare == null) return new string[0];
            return world.RoomShare.Where(kv => kv.Value == DormId).Select(kv => kv.Key).ToList();
        }

        /// <summary>Current dorm level (1-based). Missing entry = level 1.</summary>
        public static int DormLevel(WorldState world)
        {
            if (world?.PlaceLevels != null && world.PlaceLevels.TryGetValue(DormId, out int level))
            {
                return Math.Max(1, level);
            }
            return 1;
        }

        /// <summary>
        /// Moves the pigs into the shared bedroom. Each pig's layout is parked as a snapshot, the pig is marked as a
        /// resident and the items of all residents are placed into the dorm by first-fit: floor items by layer, then
        /// by comfort descending, then wall items. Items that do not fit stay owned but unplaced (storage).
        /// The pig's own room entry is kept (hidden while shared).
        /// </summary>
        public static MoveInResult MoveIn(WorldState world, IReadOnlyList<string> pigIds, PigRoomConfig config, WorldItemCatalog items, Func<string> newUid)
        {
            var result = new MoveInResult { Status = MoveInStatus.NeedTwo };
            if (world == null || config?.Dorm?.Levels == null || config.Dorm.Levels.Count == 0 || pigIds == null || newUid == null)
            {
                return result;
            }

            var ids = pigIds.Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            if (ids.Any(id => world.RoomShare.ContainsKey(id)))
            {
                result.Status = MoveInStatus.AlreadyShared;
                return result;
            }

            var residents = Residents(world);
            if (residents.Count + ids.Count < 2)
            {
                return result;
            }

            if (residents.Count + ids.Count > config.Dorm.MaxResidents)
            {
                result.Status = MoveInStatus.TooMany;
                return result;
            }

            int level = Math.Min(DormLevel(world), config.Dorm.Levels.Count);
            var grid = config.Dorm.Levels[level - 1];
            int cols = grid.Cols;
            int rows = grid.Rows;

            if (!world.Rooms.TryGetValue(DormId, out var dorm) || dorm == null)
            {
                dorm = new RoomLayout();
                world.Rooms[DormId] = dorm;
            }
            dorm.Name = config.Dorm.Name;

            var own = new List<KeyValuePair<string, RoomLayout>>();
            foreach (var pigId in ids)
            {
                world.Rooms.TryGetValue(config.RoomId(pigId), out var room);
                own.Add(new KeyValuePair<string, RoomLayout>(pigId, room ?? new RoomLayout()));
            }

            if (residents.Count == 0)
            {
                // The first resident gives the dorm its wallpaper and floor; the player changes them later.
                dorm.Wallpaper = own[0].Value.Wallpaper;
                dorm.Floor = own[0].Value.Floor;
            }

            foreach (var entry in own)
            {
                world.Parked[entry.Key] = Clone(entry.Value);
                world.RoomShare[entry.Key] = DormId;
            }

            var ordered = own
                .SelectMany(entry => entry.Value.Items.Where(i => i != null))
                .Select(i => new { Item = i, Def = items?.Find(i.ItemId) })
                .OrderBy(x => IsWall(x.Def) ? 1 : 0)
                .ThenBy(x => LayerIndex(items, x.Def))
                .ThenByDescending(x => x.Def != null ? x.Def.Comfort : 0)
                .ThenBy(x => x.Item.ItemId, StringComparer.Ordinal)
                .ThenBy(x => x.Item.Uid, StringComparer.Ordinal)
                .ToList();

            int stored = 0;
            foreach (var entry in ordered)
            {
                if (entry.Def == null || !TryPlaceFirstFit(dorm, cols, rows, entry.Def, items, entry.Item, newUid))
                {
                    stored++;
                }
            }

            result.Status = MoveInStatus.Moved;
            result.ItemsStored = stored;
            return result;
        }

        /// <summary>
        /// Restores the pig's parked layout and removes from the dorm the items that came from that layout.
        /// Items bought while sharing stay in the dorm. The RoomShare and Parked entries of the pig are removed.
        /// </summary>
        public static bool MoveOut(WorldState world, string pigId, PigRoomConfig config)
        {
            if (world == null || config == null || string.IsNullOrEmpty(pigId)) return false;
            if (!world.RoomShare.TryGetValue(pigId, out var shared) || shared != DormId) return false;

            if (world.Parked.TryGetValue(pigId, out var parked) && parked != null)
            {
                var snapshot = Clone(parked);
                if (world.Rooms.TryGetValue(DormId, out var dorm) && dorm != null)
                {
                    foreach (var uid in snapshot.Items.Select(i => i.Uid).Distinct().ToList())
                    {
                        RoomLayoutOps.Remove(dorm, uid);
                    }
                }
                world.Rooms[config.RoomId(pigId)] = snapshot;
            }

            world.Parked.Remove(pigId);
            world.RoomShare.Remove(pigId);
            return true;
        }

        private static bool TryPlaceFirstFit(RoomLayout dorm, int cols, int rows, WorldItemDefinition def, WorldItemCatalog items, PlacedItem source, Func<string> newUid)
        {
            for (int y = 0; y < rows; y++)
            {
                for (int x = 0; x < cols; x++)
                {
                    if (RoomLayoutOps.CanPlace(dorm, cols, rows, WallRows, def, DormPlaceId, x, y, null, items) != PlaceResult.Ok)
                    {
                        continue;
                    }

                    // The uid is kept so that move-out can find the item again; a clash gets a new one.
                    string uid = source.Uid;
                    if (dorm.Items.Any(i => i.Uid == uid))
                    {
                        uid = newUid();
                    }

                    dorm.Items.Add(new PlacedItem
                    {
                        Uid = uid,
                        ItemId = source.ItemId,
                        X = x,
                        Y = y,
                        Flip = source.Flip,
                        Variant = source.Variant
                    });
                    return true;
                }
            }
            return false;
        }

        private static bool IsWall(WorldItemDefinition def)
        {
            return def != null && string.Equals(def.Layer, "wall", StringComparison.OrdinalIgnoreCase);
        }

        private static int LayerIndex(WorldItemCatalog items, WorldItemDefinition def)
        {
            if (def == null || items?.Layers == null) return int.MaxValue;
            for (int i = 0; i < items.Layers.Count; i++)
            {
                if (string.Equals(items.Layers[i], def.Layer, StringComparison.OrdinalIgnoreCase)) return i;
            }
            return int.MaxValue - 1;
        }

        private static RoomLayout Clone(RoomLayout source)
        {
            var copy = new RoomLayout
            {
                Wallpaper = source.Wallpaper,
                Floor = source.Floor,
                Name = source.Name
            };
            foreach (var item in source.Items)
            {
                if (item == null) continue;
                copy.Items.Add(new PlacedItem
                {
                    Uid = item.Uid,
                    ItemId = item.ItemId,
                    X = item.X,
                    Y = item.Y,
                    Flip = item.Flip,
                    Variant = item.Variant
                });
            }
            return copy;
        }
    }
}
