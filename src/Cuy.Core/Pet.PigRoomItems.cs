using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.World;

namespace Cuy.Core
{
    /// <summary>Colour variants, room names, storage and transfer between rooms (behind Balance.PigRoomsActive).</summary>
    public sealed partial class Pet
    {
        private static string VariantKey(string itemId, int variant)
        {
            return itemId + ":" + variant;
        }

        /// <summary>Price of unlocking a variant of an item: 0 for free items.</summary>
        public int VariantPrice(string itemId)
        {
            var def = string.IsNullOrEmpty(itemId) ? null : WorldItemCatalog.Find(itemId);
            if (def == null || def.IsFree) return 0;
            return HomeEconomy.VariantPrice(def.Price);
        }

        /// <summary>Buys colour variant 1-3 of an item once. Owned variants cost nothing again.</summary>
        public WorldResult UnlockVariant(string itemId, int variant)
        {
            if (Balance == null || !Balance.PigRoomsActive) return WorldResult.Disabled;
            var def = string.IsNullOrEmpty(itemId) ? null : WorldItemCatalog.Find(itemId);
            if (def == null || !def.Recolor || variant < 1 || variant >= PigRooms.VariantCount) return WorldResult.Unknown;

            var world = EnsureWorld();
            string key = VariantKey(def.Id, variant);
            if (world.UnlockedVariants.Contains(key)) return WorldResult.Ok;

            int price = VariantPrice(def.Id);
            if (price > 0 && !TrySpendClovers(price)) return WorldResult.NotEnoughClovers;
            world.UnlockedVariants.Add(key);
            return WorldResult.Ok;
        }

        /// <summary>Recolours a placed item. Variant 0 is always allowed, others need an unlocked variant.</summary>
        public bool SetVariant(string roomId, string uid, int variant)
        {
            if (Balance == null || !Balance.PigRoomsActive) return false;
            if (string.IsNullOrEmpty(roomId) || string.IsNullOrEmpty(uid)) return false;
            if (variant < 0 || variant >= PigRooms.VariantCount) return false;

            var world = EnsureWorld();
            if (!world.Rooms.TryGetValue(roomId, out var room) || room?.Items == null) return false;
            var placed = room.Items.FirstOrDefault(i => i != null && string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
            if (placed == null) return false;

            if (variant != 0)
            {
                var def = WorldItemCatalog.Find(placed.ItemId);
                if (def == null || !def.Recolor) return false;
                if (!world.UnlockedVariants.Contains(VariantKey(def.Id, variant))) return false;
            }

            placed.Variant = variant;
            return true;
        }

        /// <summary>
        /// Names a room. Trimmed and cut to MaxNameLen; empty or null resets to the default name;
        /// control characters are refused. The name is plain text.
        /// </summary>
        public bool RenameRoom(string roomId, string name)
        {
            if (Balance == null || !Balance.PigRoomsActive) return false;
            if (string.IsNullOrEmpty(roomId)) return false;

            var world = EnsureWorld();
            if (!world.Rooms.TryGetValue(roomId, out var room) || room == null) return false;

            string clean = name == null ? string.Empty : name.Trim();
            if (clean.Any(char.IsControl)) return false;
            if (clean.Length > PigRooms.MaxNameLen) clean = clean.Substring(0, PigRooms.MaxNameLen).TrimEnd();
            room.Name = clean.Length == 0 ? null : clean;
            return true;
        }

        /// <summary>Owned items that are not placed anywhere (non-repeatable items only), with the free count.</summary>
        public IReadOnlyList<(string itemId, int free)> StorageList()
        {
            var result = new List<(string itemId, int free)>();
            if (Balance == null || !Balance.PigRoomsActive) return result;

            var world = EnsureWorld();
            foreach (var kv in world.OwnedItems.OrderBy(k => k.Key, StringComparer.Ordinal))
            {
                var def = WorldItemCatalog.Find(kv.Key);
                if (def == null || def.Repeatable) continue;
                int placed = 0;
                foreach (var room in world.Rooms.Values)
                {
                    if (room?.Items == null) continue;
                    placed += room.Items.Count(i => i != null && string.Equals(i.ItemId, def.Id, StringComparison.OrdinalIgnoreCase));
                }
                int free = kv.Value - placed;
                if (free > 0) result.Add((kv.Key, free));
            }
            return result;
        }

        /// <summary>Moves a placed item to another room in one step. If the target refuses, nothing changes.</summary>
        public PlaceResult TransferItem(string fromRoom, string uid, string toRoom, int x, int y)
        {
            if (Balance == null || !Balance.PigRoomsActive) return PlaceResult.NotAllowedHere;
            if (string.IsNullOrEmpty(fromRoom) || string.IsNullOrEmpty(uid) || string.IsNullOrEmpty(toRoom)) return PlaceResult.UnknownItem;

            var world = EnsureWorld();
            if (!world.Rooms.TryGetValue(fromRoom, out var from) || from?.Items == null) return PlaceResult.UnknownItem;
            if (!world.Rooms.TryGetValue(toRoom, out var to) || to == null) return PlaceResult.UnknownItem;
            var placed = from.Items.FirstOrDefault(i => i != null && string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
            if (placed == null) return PlaceResult.UnknownItem;
            var def = WorldItemCatalog.Find(placed.ItemId);
            if (def == null) return PlaceResult.UnknownItem;

            var grid = GetRoomGridSize(toRoom);
            int wallRows = PlaceCatalog != null ? PlaceCatalog.WallRows : 2;

            if (string.Equals(fromRoom, toRoom, StringComparison.OrdinalIgnoreCase))
            {
                return RoomLayoutOps.Move(from, grid.cols, grid.rows, wallRows, WorldItemCatalog, EffectivePlaceForValidation(toRoom), placed.Uid, x, y);
            }

            string keepUid = placed.Uid;
            var result = RoomLayoutOps.Place(to, grid.cols, grid.rows, wallRows, def, EffectivePlaceForValidation(toRoom), x, y, () => keepUid, WorldItemCatalog);
            if (result != PlaceResult.Ok) return result;

            var moved = to.Items[to.Items.Count - 1];
            moved.Variant = placed.Variant;
            moved.Flip = placed.Flip;
            from.Items.Remove(placed);
            NotePigRoomPlacement(toRoom);
            return PlaceResult.Ok;
        }
    }
}
