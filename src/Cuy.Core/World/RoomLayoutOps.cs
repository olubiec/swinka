using System;
using System.Collections.Generic;

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
        public static string NormalizePlaceId(string placeOrRoomId)
        {
            if (string.IsNullOrEmpty(placeOrRoomId)) return string.Empty;
            if (string.Equals(placeOrRoomId, "garden", StringComparison.OrdinalIgnoreCase)
                || string.Equals(placeOrRoomId, "park", StringComparison.OrdinalIgnoreCase)
                || string.Equals(placeOrRoomId, "farm", StringComparison.OrdinalIgnoreCase))
            {
                return placeOrRoomId.ToLowerInvariant();
            }
            if (string.Equals(placeOrRoomId, "house", StringComparison.OrdinalIgnoreCase)
                || string.Equals(placeOrRoomId, "salon", StringComparison.OrdinalIgnoreCase)
                || string.Equals(placeOrRoomId, "bedroom", StringComparison.OrdinalIgnoreCase)
                || string.Equals(placeOrRoomId, "playroom", StringComparison.OrdinalIgnoreCase)
                || string.Equals(placeOrRoomId, "dorm", StringComparison.OrdinalIgnoreCase)
                || placeOrRoomId.StartsWith("pig:", StringComparison.OrdinalIgnoreCase))
            {
                return "house";
            }
            return placeOrRoomId;
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
            if (room == null) return PlaceResult.OutOfBounds;
            if (item == null) return PlaceResult.UnknownItem;

            string canonicalPlace = NormalizePlaceId(placeId);
            if (!item.AllowsPlace(canonicalPlace) && !item.AllowsPlace(placeId))
            {
                return PlaceResult.NotAllowedHere;
            }

            if (cols <= 0 || rows <= 0 || item.W <= 0 || item.H <= 0)
            {
                return PlaceResult.OutOfBounds;
            }

            if (x < 0 || y < 0 || x + item.W > cols || y + item.H > rows)
            {
                return PlaceResult.OutOfBounds;
            }

            int effectiveWallRows = Math.Max(0, wallRows);
            bool isWall = string.Equals(item.Layer, "wall", StringComparison.OrdinalIgnoreCase);

            if (isWall)
            {
                if (effectiveWallRows <= 0 || y < 0 || y + item.H > effectiveWallRows)
                {
                    return PlaceResult.WrongLayerArea;
                }
            }
            else
            {
                // floor or ground items must lie fully below wall rows
                if (y < effectiveWallRows)
                {
                    return PlaceResult.WrongLayerArea;
                }
            }

            if (room.Items != null && room.Items.Count > 0)
            {
                var cat = catalog ?? WorldItemCatalog.Current;
                for (int i = 0; i < room.Items.Count; i++)
                {
                    var existing = room.Items[i];
                    if (existing == null) continue;
                    if (!string.IsNullOrEmpty(ignoreUid) && string.Equals(existing.Uid, ignoreUid, StringComparison.Ordinal))
                    {
                        continue;
                    }

                    WorldItemDefinition existingDef = null;
                    if (string.Equals(existing.ItemId, item.Id, StringComparison.OrdinalIgnoreCase))
                    {
                        existingDef = item;
                    }
                    else if (cat != null)
                    {
                        existingDef = cat.Find(existing.ItemId);
                    }

                    if (existingDef == null)
                    {
                        continue;
                    }

                    if (!string.Equals(existingDef.Layer, item.Layer, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (RectanglesOverlap(x, y, item.W, item.H, existing.X, existing.Y, existingDef.W, existingDef.H))
                    {
                        return PlaceResult.Overlap;
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
            bool flip = false,
            Func<string> newUid = null,
            WorldItemCatalog catalog = null)
        {
            var check = CanPlace(room, cols, rows, wallRows, item, placeId, x, y, null, catalog);
            if (check != PlaceResult.Ok)
            {
                return check;
            }

            string uid = newUid != null ? newUid() : Guid.NewGuid().ToString("N");
            if (string.IsNullOrEmpty(uid))
            {
                uid = Guid.NewGuid().ToString("N");
            }

            room.Items.Add(new PlacedItem
            {
                Uid = uid,
                ItemId = item.Id,
                X = x,
                Y = y,
                Flip = flip
            });

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
            Func<string> newUid,
            bool flip = false,
            WorldItemCatalog catalog = null)
        {
            return Place(room, cols, rows, wallRows, item, placeId, x, y, flip, newUid, catalog);
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
            if (room == null || room.Items == null || string.IsNullOrEmpty(uid))
            {
                return PlaceResult.UnknownItem;
            }

            PlacedItem target = null;
            for (int i = 0; i < room.Items.Count; i++)
            {
                var it = room.Items[i];
                if (it != null && string.Equals(it.Uid, uid, StringComparison.Ordinal))
                {
                    target = it;
                    break;
                }
            }

            if (target == null)
            {
                return PlaceResult.UnknownItem;
            }

            var cat = catalog ?? WorldItemCatalog.Current;
            var def = cat?.Find(target.ItemId);
            if (def == null)
            {
                return PlaceResult.UnknownItem;
            }

            var check = CanPlace(room, cols, rows, wallRows, def, placeId, x, y, uid, cat);
            if (check != PlaceResult.Ok)
            {
                return check;
            }

            target.X = x;
            target.Y = y;
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
            if (room == null || room.Items == null || string.IsNullOrEmpty(uid) || item == null)
            {
                return PlaceResult.UnknownItem;
            }

            PlacedItem target = null;
            for (int i = 0; i < room.Items.Count; i++)
            {
                var it = room.Items[i];
                if (it != null && string.Equals(it.Uid, uid, StringComparison.Ordinal))
                {
                    target = it;
                    break;
                }
            }

            if (target == null)
            {
                return PlaceResult.UnknownItem;
            }

            var check = CanPlace(room, cols, rows, wallRows, item, placeId, x, y, uid, catalog);
            if (check != PlaceResult.Ok)
            {
                return check;
            }

            target.X = x;
            target.Y = y;
            return PlaceResult.Ok;
        }

        public static bool SetFlip(RoomLayout room, string uid, bool flip)
        {
            if (room == null || room.Items == null || string.IsNullOrEmpty(uid))
            {
                return false;
            }

            for (int i = 0; i < room.Items.Count; i++)
            {
                var it = room.Items[i];
                if (it != null && string.Equals(it.Uid, uid, StringComparison.Ordinal))
                {
                    it.Flip = flip;
                    return true;
                }
            }

            return false;
        }

        public static bool Remove(RoomLayout room, string uid)
        {
            if (room == null || room.Items == null || string.IsNullOrEmpty(uid))
            {
                return false;
            }

            for (int i = 0; i < room.Items.Count; i++)
            {
                var it = room.Items[i];
                if (it != null && string.Equals(it.Uid, uid, StringComparison.Ordinal))
                {
                    room.Items.RemoveAt(i);
                    return true;
                }
            }

            return false;
        }

        public static int CountPlaced(RoomLayout room, string itemId)
        {
            if (room == null || room.Items == null || string.IsNullOrEmpty(itemId))
            {
                return 0;
            }

            int count = 0;
            for (int i = 0; i < room.Items.Count; i++)
            {
                var it = room.Items[i];
                if (it != null && string.Equals(it.ItemId, itemId, StringComparison.OrdinalIgnoreCase))
                {
                    count++;
                }
            }

            return count;
        }

        private static bool RectanglesOverlap(int x1, int y1, int w1, int h1, int x2, int y2, int w2, int h2)
        {
            return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
        }
    }
}
