using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public sealed class DesktopProp
    {
        public string Uid { get; set; } = string.Empty;
        public string ItemId { get; set; } = string.Empty;
        public double X { get; set; }
        public double Y { get; set; }

        public void Clamp()
        {
            X = ClampCoord(X);
            Y = ClampCoord(Y);
        }

        private static double ClampCoord(double value)
        {
            if (double.IsNaN(value) || double.IsInfinity(value)) return 0.5;
            if (value < 0.0) return 0.0;
            if (value > 1.0) return 1.0;
            return value;
        }
    }

    public enum DesktopPropResult
    {
        Ok,
        Disabled,
        UnknownItem,
        NotOwned,
        Full,
        NotFound,
        RoomRefused,
        Stored
    }

    /// <summary>
    /// Pure operations for placing, moving, removing and transferring desktop props.
    /// </summary>
    public static class DesktopPropOps
    {
        public static int OwnedCount(WorldState world, GameState gameState, string itemId, DesktopPropCatalog catalog)
        {
            var cat = catalog ?? DesktopPropCatalog.Current;
            var def = cat.Find(itemId);
            if (def == null) return 0;

            if (string.Equals(def.Source, "inventory", StringComparison.OrdinalIgnoreCase))
            {
                return ReadDictCount(gameState?.Inventory, def.ItemId);
            }

            int worldCount = ReadDictCount(world?.OwnedItems, def.ItemId);
            if (worldCount == 0 && !string.IsNullOrEmpty(def.RoomItemId) && !string.Equals(def.RoomItemId, def.ItemId, StringComparison.OrdinalIgnoreCase))
            {
                worldCount = ReadDictCount(world?.OwnedItems, def.RoomItemId);
            }
            return worldCount;
        }

        public static int PlacedInRoomsCount(WorldState world, string roomItemId)
        {
            if (world?.Rooms == null || string.IsNullOrWhiteSpace(roomItemId)) return 0;
            int total = 0;
            foreach (var room in world.Rooms.Values)
            {
                if (room?.Items == null) continue;
                foreach (var item in room.Items)
                {
                    if (item != null && string.Equals(item.ItemId, roomItemId, StringComparison.OrdinalIgnoreCase))
                    {
                        total++;
                    }
                }
            }
            return total;
        }

        public static int OnDesktopCount(IList<DesktopProp> desktop, string itemId)
        {
            if (desktop == null || string.IsNullOrWhiteSpace(itemId)) return 0;
            int total = 0;
            foreach (var prop in desktop)
            {
                if (prop != null && string.Equals(prop.ItemId, itemId, StringComparison.OrdinalIgnoreCase))
                {
                    total++;
                }
            }
            return total;
        }

        public static int FreeCount(IList<DesktopProp> desktop, WorldState world, GameState gameState, string itemId, DesktopPropCatalog catalog)
        {
            var cat = catalog ?? DesktopPropCatalog.Current;
            var def = cat.Find(itemId);
            if (def == null) return 0;

            int owned = OwnedCount(world, gameState, def.ItemId, cat);
            int onDesktop = OnDesktopCount(desktop, def.ItemId);
            int inRooms = string.IsNullOrEmpty(def.RoomItemId) ? 0 : PlacedInRoomsCount(world, def.RoomItemId);
            return Math.Max(0, owned - onDesktop - inRooms);
        }

        public static DesktopPropResult PutOnDesktop(
            IList<DesktopProp> desktop,
            WorldState world,
            GameState gameState,
            string itemId,
            double x,
            double y,
            DesktopPropCatalog catalog,
            out DesktopProp added)
        {
            added = null;
            var cat = catalog ?? DesktopPropCatalog.Current;
            var def = cat.Find(itemId);
            if (def == null) return DesktopPropResult.UnknownItem;

            if (FreeCount(desktop, world, gameState, def.ItemId, cat) <= 0)
            {
                return DesktopPropResult.NotOwned;
            }

            if (desktop == null || desktop.Count >= cat.MaxOnDesktop)
            {
                return DesktopPropResult.Full;
            }

            added = new DesktopProp
            {
                Uid = "dp_" + Guid.NewGuid().ToString("N").Substring(0, 8),
                ItemId = def.ItemId,
                X = x,
                Y = y
            };
            added.Clamp();
            desktop.Add(added);
            return DesktopPropResult.Ok;
        }

        public static DesktopPropResult MoveOnDesktop(IList<DesktopProp> desktop, string uid, double x, double y)
        {
            if (desktop == null || string.IsNullOrWhiteSpace(uid)) return DesktopPropResult.NotFound;
            var prop = desktop.FirstOrDefault(p => p != null && string.Equals(p.Uid, uid, StringComparison.OrdinalIgnoreCase));
            if (prop == null) return DesktopPropResult.NotFound;

            prop.X = x;
            prop.Y = y;
            prop.Clamp();
            return DesktopPropResult.Ok;
        }

        public static DesktopPropResult RemoveFromDesktop(IList<DesktopProp> desktop, string uid)
        {
            if (desktop == null || string.IsNullOrWhiteSpace(uid)) return DesktopPropResult.NotFound;
            for (int i = 0; i < desktop.Count; i++)
            {
                if (desktop[i] != null && string.Equals(desktop[i].Uid, uid, StringComparison.OrdinalIgnoreCase))
                {
                    desktop.RemoveAt(i);
                    return DesktopPropResult.Ok;
                }
            }
            return DesktopPropResult.NotFound;
        }

        public static DesktopPropResult ToRoom(
            IList<DesktopProp> desktop,
            WorldState world,
            GameState gameState,
            string uid,
            string roomId,
            int cellX,
            int cellY,
            int cols,
            int rows,
            int wallRows,
            WorldItemCatalog items,
            DesktopPropCatalog catalog)
        {
            if (desktop == null || string.IsNullOrWhiteSpace(uid)) return DesktopPropResult.NotFound;
            int idx = -1;
            for (int i = 0; i < desktop.Count; i++)
            {
                if (desktop[i] != null && string.Equals(desktop[i].Uid, uid, StringComparison.OrdinalIgnoreCase))
                {
                    idx = i;
                    break;
                }
            }
            if (idx < 0) return DesktopPropResult.NotFound;

            var prop = desktop[idx];
            var cat = catalog ?? DesktopPropCatalog.Current;
            string roomItemId = cat.RoomItemFor(prop.ItemId);
            if (string.IsNullOrEmpty(roomItemId) || world?.Rooms == null || string.IsNullOrWhiteSpace(roomId))
            {
                return DesktopPropResult.RoomRefused;
            }

            if (!world.Rooms.TryGetValue(roomId, out var room) || room == null)
            {
                return DesktopPropResult.RoomRefused;
            }

            var itemCatalog = items ?? WorldItemCatalog.Current;
            var itemDef = itemCatalog?.Find(roomItemId);
            if (itemDef == null)
            {
                return DesktopPropResult.RoomRefused;
            }

            desktop.RemoveAt(idx);
            var placeResult = RoomLayoutOps.Place(room, cols, rows, wallRows, itemDef, roomId, cellX, cellY, catalog: itemCatalog);
            if (placeResult != PlaceResult.Ok)
            {
                desktop.Insert(idx, prop);
                return DesktopPropResult.RoomRefused;
            }

            return DesktopPropResult.Ok;
        }

        public static DesktopPropResult FromRoom(
            IList<DesktopProp> desktop,
            WorldState world,
            string roomId,
            string placedUid,
            double x,
            double y,
            DesktopPropCatalog catalog)
        {
            if (world?.Rooms == null || string.IsNullOrWhiteSpace(roomId) || string.IsNullOrWhiteSpace(placedUid))
            {
                return DesktopPropResult.NotFound;
            }

            if (!world.Rooms.TryGetValue(roomId, out var room) || room?.Items == null)
            {
                return DesktopPropResult.NotFound;
            }

            var placed = room.Items.FirstOrDefault(i => i != null && string.Equals(i.Uid, placedUid, StringComparison.OrdinalIgnoreCase));
            if (placed == null)
            {
                return DesktopPropResult.NotFound;
            }

            var cat = catalog ?? DesktopPropCatalog.Current;
            string propItemId = cat.IsProp(placed.ItemId)
                ? cat.Find(placed.ItemId).ItemId
                : cat.InventoryFor(placed.ItemId);

            if (string.IsNullOrEmpty(propItemId))
            {
                return DesktopPropResult.UnknownItem;
            }

            if (!RoomLayoutOps.Remove(room, placedUid))
            {
                return DesktopPropResult.NotFound;
            }

            if (desktop == null || desktop.Count >= cat.MaxOnDesktop)
            {
                return DesktopPropResult.Stored;
            }

            var added = new DesktopProp
            {
                Uid = "dp_" + Guid.NewGuid().ToString("N").Substring(0, 8),
                ItemId = propItemId,
                X = x,
                Y = y
            };
            added.Clamp();
            desktop.Add(added);
            return DesktopPropResult.Ok;
        }

        private static int ReadDictCount(Dictionary<string, int> dict, string key)
        {
            if (dict == null || string.IsNullOrWhiteSpace(key)) return 0;
            if (dict.TryGetValue(key, out int exact)) return Math.Max(0, exact);

            foreach (var kv in dict)
            {
                if (string.Equals(kv.Key, key, StringComparison.OrdinalIgnoreCase))
                {
                    return Math.Max(0, kv.Value);
                }
            }
            return 0;
        }
    }
}
