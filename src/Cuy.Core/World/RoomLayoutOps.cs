using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.World
{
    public enum PlaceResult
    {
        Ok,
        OutOfBounds,
        WrongLayerArea,
        Overlap,
        UnknownItem,
        NotAllowedHere
    }

    public static class RoomLayoutOps
    {
        private static readonly Dictionary<string, WorldItemDefinition> KnownItems =
            new Dictionary<string, WorldItemDefinition>(StringComparer.OrdinalIgnoreCase);

        public static void RegisterItem(WorldItemDefinition item)
        {
            if (item != null && !string.IsNullOrEmpty(item.Id))
            {
                lock (KnownItems)
                {
                    KnownItems[item.Id] = item;
                }
            }
        }
        public static PlaceResult CanPlace(
            RoomLayout room,
            int cols,
            int rows,
            int wallRows,
            WorldItemDefinition item,
            string placeId,
            int x,
            int y,
            string ignoreUid = null,
            WorldItemCatalog catalog = null)
        {
            if (item == null)
            {
                return PlaceResult.UnknownItem;
            }

            RegisterItem(item);

            if (!IsAllowedInPlace(item, placeId))
            {
                return PlaceResult.NotAllowedHere;
            }

            int w = item.W > 0 ? item.W : (item.Width > 0 ? item.Width : 1);
            int h = item.H > 0 ? item.H : (item.Height > 0 ? item.Height : 1);

            if (x < 0 || y < 0 || x + w > cols || y + h > rows)
            {
                return PlaceResult.OutOfBounds;
            }

            string layer = (item.Layer ?? "").Trim().ToLowerInvariant();
            if (wallRows > 0)
            {
                if (layer == "wall")
                {
                    if (y < 0 || y + h > wallRows)
                    {
                        return PlaceResult.WrongLayerArea;
                    }
                }
                else
                {
                    if (y < wallRows)
                    {
                        return PlaceResult.WrongLayerArea;
                    }
                }
            }
            else
            {
                if (layer == "wall")
                {
                    return PlaceResult.WrongLayerArea;
                }
            }

            if (room?.Items != null)
            {
                var cat = catalog ?? WorldItemCatalog.Current;
                foreach (var placed in room.Items)
                {
                    if (placed == null) continue;
                    if (!string.IsNullOrEmpty(ignoreUid) && string.Equals(placed.Uid, ignoreUid, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    WorldItemDefinition otherDef = cat?.Find(placed.ItemId);
                    if (otherDef == null)
                    {
                        lock (KnownItems)
                        {
                            KnownItems.TryGetValue(placed.ItemId, out otherDef);
                        }
                    }
                    if (otherDef == null && string.Equals(placed.ItemId, item.Id, StringComparison.OrdinalIgnoreCase))
                    {
                        otherDef = item;
                    }

                    string otherLayer = (otherDef?.Layer ?? "floor").Trim().ToLowerInvariant();
                    int otherW = otherDef != null && otherDef.W > 0 ? otherDef.W : 1;
                    int otherH = otherDef != null && otherDef.H > 0 ? otherDef.H : 1;

                    bool sameLayer = string.Equals(layer, otherLayer, StringComparison.OrdinalIgnoreCase);
                    if (sameLayer)
                    {
                        bool intersects = !(x + w <= placed.X || placed.X + otherW <= x || y + h <= placed.Y || placed.Y + otherH <= y);
                        if (intersects)
                        {
                            return PlaceResult.Overlap;
                        }
                    }
                }
            }

            return PlaceResult.Ok;
        }

        public static PlaceResult Place(
            RoomLayout room,
            int cols,
            int rows,
            int wallRows,
            WorldItemDefinition item,
            string placeId,
            int x,
            int y,
            Func<string> uidGen = null,
            WorldItemCatalog catalog = null)
        {
            if (room == null)
            {
                return PlaceResult.UnknownItem;
            }

            var result = CanPlace(room, cols, rows, wallRows, item, placeId, x, y, ignoreUid: null, catalog: catalog);
            if (result != PlaceResult.Ok)
            {
                return result;
            }

            string uid = uidGen != null ? uidGen() : Guid.NewGuid().ToString("N");
            room.Items.Add(new PlacedItem
            {
                Uid = uid,
                ItemId = item.Id,
                X = x,
                Y = y,
                Flip = false
            });

            return PlaceResult.Ok;
        }

        public static PlaceResult Move(
            RoomLayout room,
            int cols,
            int rows,
            int wallRows,
            WorldItemDefinition item,
            string placeId,
            string uid,
            int x,
            int y,
            WorldItemCatalog catalog = null)
        {
            if (room?.Items == null || string.IsNullOrEmpty(uid))
            {
                return PlaceResult.UnknownItem;
            }

            var placed = room.Items.FirstOrDefault(i => string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
            if (placed == null || item == null)
            {
                return PlaceResult.UnknownItem;
            }

            var result = CanPlace(room, cols, rows, wallRows, item, placeId, x, y, ignoreUid: uid, catalog: catalog);
            if (result == PlaceResult.Ok)
            {
                placed.X = x;
                placed.Y = y;
            }

            return result;
        }

        public static PlaceResult Move(
            RoomLayout room,
            int cols,
            int rows,
            int wallRows,
            WorldItemCatalog catalog,
            string placeId,
            string uid,
            int x,
            int y)
        {
            if (room?.Items == null || string.IsNullOrEmpty(uid))
            {
                return PlaceResult.UnknownItem;
            }

            var placed = room.Items.FirstOrDefault(i => string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
            if (placed == null)
            {
                return PlaceResult.UnknownItem;
            }

            var item = catalog?.Find(placed.ItemId) ?? WorldItemCatalog.Current?.Find(placed.ItemId);
            if (item == null)
            {
                return PlaceResult.UnknownItem;
            }

            RegisterItem(item);

            return Move(room, cols, rows, wallRows, item, placeId, uid, x, y, catalog);
        }

        public static bool SetFlip(RoomLayout room, string uid, bool flip)
        {
            if (room?.Items == null || string.IsNullOrEmpty(uid))
            {
                return false;
            }

            var placed = room.Items.FirstOrDefault(i => string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
            if (placed == null)
            {
                return false;
            }

            placed.Flip = flip;
            return true;
        }

        public static bool Remove(RoomLayout room, string uid)
        {
            if (room?.Items == null || string.IsNullOrEmpty(uid))
            {
                return false;
            }

            var placed = room.Items.FirstOrDefault(i => string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
            if (placed == null)
            {
                return false;
            }

            return room.Items.Remove(placed);
        }

        public static int CountPlaced(RoomLayout room, string itemId)
        {
            if (room?.Items == null || string.IsNullOrEmpty(itemId))
            {
                return 0;
            }

            return room.Items.Count(i => string.Equals(i.ItemId, itemId, StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsAllowedInPlace(WorldItemDefinition item, string placeId)
        {
            if (string.IsNullOrEmpty(placeId))
            {
                return true;
            }

            var places = item.Places ?? item.Place;
            if (places == null || places.Count == 0)
            {
                return true;
            }

            if (places.Any(p => string.Equals(p, placeId, StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }

            if (string.Equals(placeId, "salon", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(placeId, "bedroom", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(placeId, "playroom", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(placeId, "dorm", StringComparison.OrdinalIgnoreCase))
            {
                if (places.Any(p => string.Equals(p, "house", StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }

            var placeCat = PlaceCatalog.Current;
            if (placeCat != null)
            {
                var parent = placeCat.Places?.FirstOrDefault(pl => pl.Rooms != null && pl.Rooms.Any(r => string.Equals(r.Id, placeId, StringComparison.OrdinalIgnoreCase)));
                if (parent != null && places.Any(p => string.Equals(p, parent.Id, StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
