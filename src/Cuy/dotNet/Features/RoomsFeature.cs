using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class RoomsFeature : HomeFeatureBase
    {
        public override string Id => "rooms";

        public override void Initialize(BrainController brain)
        {
            if (brain?.Pet?.Balance != null)
            {
                brain.Pet.Balance.WorldDecorActive = true;
            }
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            pet.Balance.WorldDecorActive = true;
            var world = pet.EnsureWorld();
            var placeCatalog = pet.PlaceCatalog;
            var itemCatalog = pet.WorldItemCatalog;

            // 1. Layouts
            var placeOrRoomIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (placeCatalog?.Places != null)
            {
                foreach (var p in placeCatalog.Places)
                {
                    if (!string.IsNullOrEmpty(p?.Id)) placeOrRoomIds.Add(p.Id);
                }
            }
            if (placeCatalog?.Rooms != null)
            {
                foreach (var r in placeCatalog.Rooms)
                {
                    if (!string.IsNullOrEmpty(r?.Id)) placeOrRoomIds.Add(r.Id);
                }
            }
            if (world.Rooms != null)
            {
                foreach (var k in world.Rooms.Keys)
                {
                    if (!string.IsNullOrEmpty(k)) placeOrRoomIds.Add(k);
                }
            }
            placeOrRoomIds.Add("salon");

            // Pig rooms exist only while Balance.PigRoomsActive is on; their ids come from the roster.
            bool pigRoomsOn = pet.Balance.PigRoomsActive && pet.PigRooms != null && pet.State.Roster != null;
            if (pigRoomsOn)
            {
                foreach (var pig in pet.State.Roster)
                {
                    if (pig == null) continue;
                    placeOrRoomIds.Add(pet.RoomIdOf(pig.Id));
                }
            }

            int wallRows = placeCatalog != null ? placeCatalog.WallRows : 2;
            var layoutsDict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            var gridSizes = new Dictionary<string, (int cols, int rows)>(StringComparer.OrdinalIgnoreCase);

            foreach (var id in placeOrRoomIds)
            {
                world.Rooms.TryGetValue(id, out var roomLayout);

                var (cols, rows) = pet.GetRoomGridSize(id);
                if (cols <= 0)
                {
                    var pDef = placeCatalog?.Find(id);
                    if (pDef?.Levels != null && pDef.Levels.Count > 0)
                    {
                        cols = pDef.Levels[0].Cols;
                        rows = pDef.Levels[0].Rows;
                    }
                    else
                    {
                        var rDef = placeCatalog?.FindRoom(id);
                        if (rDef?.Levels != null && rDef.Levels.Count > 0)
                        {
                            cols = rDef.Levels[0].Cols;
                            rows = rDef.Levels[0].Rows;
                        }
                    }
                }
                if (cols <= 0) cols = 12;
                if (rows <= 0) rows = 7;
                gridSizes[id] = (cols, rows);

                var itemsList = new List<object>();
                if (roomLayout?.Items != null)
                {
                    foreach (var it in roomLayout.Items)
                    {
                        if (it == null) continue;
                        itemsList.Add(new
                        {
                            uid = it.Uid,
                            itemId = it.ItemId,
                            x = it.X,
                            y = it.Y,
                            flip = it.Flip,
                            variant = it.Variant
                        });
                    }
                }

                layoutsDict[id] = new
                {
                    name = roomLayout?.Name ?? string.Empty,
                    cols = cols,
                    rows = rows,
                    wallRows = wallRows,
                    wallpaper = roomLayout?.Wallpaper ?? string.Empty,
                    floor = roomLayout?.Floor ?? string.Empty,
                    items = itemsList
                };
            }

            // 2. Catalog
            var catalogList = new List<object>();
            if (itemCatalog?.All != null)
            {
                foreach (var def in itemCatalog.All)
                {
                    if (def == null || string.IsNullOrEmpty(def.Id)) continue;

                    int owned = 0;
                    if (world.OwnedItems != null)
                    {
                        world.OwnedItems.TryGetValue(def.Id, out owned);
                    }

                    int placed = 0;
                    if (world.Rooms != null)
                    {
                        foreach (var r in world.Rooms.Values)
                        {
                            if (r?.Items != null)
                            {
                                placed += r.Items.Count(i => i != null && string.Equals(i.ItemId, def.Id, StringComparison.OrdinalIgnoreCase));
                            }
                        }
                    }

                    catalogList.Add(new
                    {
                        id = def.Id,
                        name = def.Name,
                        places = def.Places != null ? def.Places.ToList() : new List<string>(),
                        w = def.W,
                        h = def.H,
                        price = def.Price,
                        comfort = def.Comfort,
                        layer = def.Layer,
                        icon = def.Icon,
                        owned = owned,
                        placed = placed,
                        repeatable = def.Repeatable,
                        free = def.IsFree
                    });
                }
            }

            // 3. Comfort
            int score = pet.ComfortScore();
            int cap = placeCatalog != null && placeCatalog.ComfortCap > 0 ? placeCatalog.ComfortCap : 100;
            int capped = Comfort.Capped(score, placeCatalog);
            double moodFactor = Comfort.MoodDecayFactor(capped, placeCatalog);

            var comfortObj = new
            {
                score = score,
                cap = cap,
                moodFactor = Math.Round(moodFactor, 4)
            };

            // 4. Pig rooms, comfort per pig, storage and colour variants
            var pigRooms = new List<object>();
            var comfortByPig = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            var storageList = new List<object>();
            var variantPrices = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            int variantCount = pet.PigRooms != null ? pet.PigRooms.VariantCount : 4;
            var variantNames = new List<string>();
            for (int v = 0; v < variantCount; v++)
            {
                variantNames.Add(v == 0 ? "Original" : "Colour " + v);
            }

            if (pigRoomsOn)
            {
                foreach (var pig in pet.State.Roster)
                {
                    if (pig == null) continue;
                    string roomId = pet.RoomIdOf(pig.Id);
                    int roomLevel = 1;
                    if (world.PlaceLevels != null && world.PlaceLevels.TryGetValue(roomId, out int lv) && lv > 0)
                        roomLevel = lv;
                    else
                    {
                        int plv = PlaceUnlock.GetLevel(world, placeCatalog, roomId);
                        if (plv > 0) roomLevel = plv;
                    }
                    var (pigCols, pigRows) = pet.GetRoomGridSize(roomId);
                    if (pigCols <= 0 || pigRows <= 0)
                    {
                        (pigCols, pigRows) = gridSizes.TryGetValue(roomId, out var grid) ? grid : (10, 6);
                    }
                    int maxLevel = pet.PigRooms?.Levels != null ? pet.PigRooms.Levels.Count : 0;
                    int nextCost = -1;
                    if (pet.PigRooms?.Levels != null && roomLevel < pet.PigRooms.Levels.Count)
                    {
                        nextCost = pet.PigRooms.Levels[roomLevel].Cost;
                    }

                    pigRooms.Add(new
                    {
                        pigId = pig.Id,
                        name = pig.Name,
                        roomId = roomId,
                        displayName = pet.RoomDisplayName(pig.Id),
                        level = roomLevel,
                        maxLevel = maxLevel,
                        nextLevelCost = nextCost,
                        cols = pigCols,
                        rows = pigRows,
                        memorial = pig.Memorial,
                        portrait = string.IsNullOrEmpty(pig.NamedId) ? null : "sprites/portraits/" + pig.NamedId + ".png"
                    });

                    int pigScore = pet.ComfortScore(roomId);
                    int pigCapped = Comfort.Capped(pigScore, placeCatalog);
                    comfortByPig[pig.Id] = new
                    {
                        score = pigScore,
                        cap = cap,
                        moodFactor = Math.Round(Comfort.MoodDecayFactor(pigCapped, placeCatalog), 4)
                    };
                }

                foreach (var s in pet.StorageList())
                {
                    storageList.Add(new { itemId = s.itemId, free = s.free, count = s.free });
                }

                if (itemCatalog?.All != null)
                {
                    foreach (var def in itemCatalog.All)
                    {
                        if (def == null || string.IsNullOrEmpty(def.Id) || !def.Recolor) continue;

                        // Index 0 is the original colour (free); each other variant costs the same VariantPrice.
                        var prices = new List<int>();
                        for (int v = 0; v < variantCount; v++)
                        {
                            prices.Add(v == 0 ? 0 : pet.VariantPrice(def.Id));
                        }
                        variantPrices[def.Id] = prices;
                    }
                }
            }

            // 5. Skins
            var wallpapers = new List<object>();
            var floors = new List<object>();

            var allDecor = ItemCatalogLoader.GetAll();
            if (allDecor != null)
            {
                foreach (var it in allDecor)
                {
                    if (it == null) continue;
                    if (it.Id.StartsWith("wallpaper_") || string.Equals(it.IconName, "wallpaper", StringComparison.OrdinalIgnoreCase))
                    {
                        wallpapers.Add(new
                        {
                            id = it.Id,
                            name = it.Name,
                            icon = it.IconName,
                            price = it.Price ?? 0,
                            owned = pet.GetItemCount(it.Id) > 0 || (world.OwnedItems != null && world.OwnedItems.ContainsKey(it.Id))
                        });
                    }
                    else if (it.Id.StartsWith("floor_") && !it.Id.StartsWith("floor_lamp"))
                    {
                        floors.Add(new
                        {
                            id = it.Id,
                            name = it.Name,
                            icon = it.IconName,
                            price = it.Price ?? 0,
                            owned = pet.GetItemCount(it.Id) > 0 || (world.OwnedItems != null && world.OwnedItems.ContainsKey(it.Id))
                        });
                    }
                }
            }

            var skinsObj = new
            {
                wallpapers = wallpapers,
                floors = floors
            };

            state["rooms"] = new
            {
                layouts = layoutsDict,
                catalog = catalogList,
                comfort = comfortObj,
                skins = skinsObj,
                pigRooms = pigRooms,
                storage = storageList,
                variantNames = variantNames,
                variantPrices = variantPrices,
                variantsUnlocked = world.UnlockedVariants.ToList(),
                comfortByPig = comfortByPig
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "room_buy" && type != "room_place" && type != "room_move" &&
                type != "room_flip" && type != "room_remove" && type != "room_skin" &&
                type != "room_variant" && type != "room_variant_unlock" &&
                type != "room_rename" && type != "room_transfer")
            {
                return false;
            }

            var pet = brain?.Pet;
            if (pet == null) return true;

            pet.Balance.WorldDecorActive = true;

            if (type == "room_buy")
            {
                string itemId = message?.Value<string>("itemId");
                if (string.IsNullOrEmpty(itemId)) return true;

                var res = pet.BuyItem(itemId);
                if (res == BuyResult.UnknownItem)
                {
                    return true;
                }
                else if (res == BuyResult.Ok)
                {
                    var def = pet.WorldItemCatalog?.Find(itemId);
                    HomeWindow.PostToPage(new { type = "toast", text = $"Bought {def?.Name ?? itemId}!" });
                }
                else if (res == BuyResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (res == BuyResult.Locked)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "room_place")
            {
                string place = message?.Value<string>("place") ?? "salon";
                string itemId = message?.Value<string>("itemId");
                int rawX = message?.Value<int?>("x") ?? 0;
                int rawY = message?.Value<int?>("y") ?? 0;
                bool flip = message?.Value<bool?>("flip") ?? false;

                if (string.IsNullOrEmpty(itemId)) return true;

                var def = pet.WorldItemCatalog?.Find(itemId);
                var (x, y) = ResolveGridCoordinates(pet, place, def, rawX, rawY);

                var res = pet.PlaceItem(place, itemId, x, y, flip);
                if (res == PlaceResult.UnknownItem)
                {
                    return true;
                }
                else if (res == PlaceResult.Ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Placed!" });
                }
                else if (res == PlaceResult.Overlap)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Something is in the way" });
                }
                else if (res == PlaceResult.OutOfBounds || res == PlaceResult.WrongLayerArea)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Too close to the wall" });
                }
                else if (res == PlaceResult.NotAllowedHere)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "room_move")
            {
                string place = message?.Value<string>("place") ?? "salon";
                string uid = message?.Value<string>("uid");
                int rawX = message?.Value<int?>("x") ?? 0;
                int rawY = message?.Value<int?>("y") ?? 0;

                if (string.IsNullOrEmpty(uid)) return true;

                WorldItemDefinition def = null;
                var world = pet.State.World;
                if (world?.Rooms != null && world.Rooms.TryGetValue(place, out var rLayout) && rLayout?.Items != null)
                {
                    var placedItem = rLayout.Items.FirstOrDefault(i => i != null && string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
                    if (placedItem != null)
                    {
                        def = pet.WorldItemCatalog?.Find(placedItem.ItemId);
                    }
                }

                var (x, y) = ResolveGridCoordinates(pet, place, def, rawX, rawY, ignoreUid: uid);

                var res = pet.MoveItem(place, uid, x, y);
                if (res == PlaceResult.UnknownItem)
                {
                    return true;
                }
                else if (res == PlaceResult.Ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Moved!" });
                }
                else if (res == PlaceResult.Overlap)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Something is in the way" });
                }
                else if (res == PlaceResult.OutOfBounds || res == PlaceResult.WrongLayerArea)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Too close to the wall" });
                }
                else if (res == PlaceResult.NotAllowedHere)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "room_flip")
            {
                string place = message?.Value<string>("place") ?? "salon";
                string uid = message?.Value<string>("uid");
                if (string.IsNullOrEmpty(uid)) return true;

                bool? flipVal = message?.Value<bool?>("flip");
                bool ok = flipVal.HasValue ? pet.FlipItem(place, uid, flipVal.Value) : pet.FlipItem(place, uid);
                if (ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Flipped!" });
                }
            }
            else if (type == "room_remove")
            {
                string place = message?.Value<string>("place") ?? "salon";
                string uid = message?.Value<string>("uid");
                if (string.IsNullOrEmpty(uid)) return true;

                bool ok = pet.RemoveItem(place, uid);
                if (ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Removed!" });
                }
            }
            else if (type == "room_skin")
            {
                string room = message?.Value<string>("room") ?? message?.Value<string>("place") ?? "salon";
                string slot = message?.Value<string>("slot");
                string itemId = message?.Value<string>("itemId");

                if (string.IsNullOrEmpty(slot)) return true;

                var world = pet.EnsureWorld();
                if (!world.Rooms.TryGetValue(room, out var roomLayout) || roomLayout == null)
                {
                    roomLayout = new RoomLayout();
                    world.Rooms[room] = roomLayout;
                }

                if (string.IsNullOrEmpty(itemId))
                {
                    if (slot == "wallpaper") roomLayout.Wallpaper = string.Empty;
                    else if (slot == "floor") roomLayout.Floor = string.Empty;
                    HomeWindow.PostToPage(new { type = "toast", text = "Removed!" });
                }
                else
                {
                    bool owned = pet.GetItemCount(itemId) > 0 || (world.OwnedItems != null && world.OwnedItems.ContainsKey(itemId));
                    if (owned)
                    {
                        if (slot == "wallpaper") roomLayout.Wallpaper = itemId;
                        else if (slot == "floor") roomLayout.Floor = itemId;
                        HomeWindow.PostToPage(new { type = "toast", text = "Skin applied!" });
                    }
                    else
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                    }
                }
            }
            else if (type == "room_variant")
            {
                string place = message?.Value<string>("place");
                string uid = message?.Value<string>("uid");
                int? variant = message?.Value<int?>("variant");
                if (string.IsNullOrEmpty(place) || string.IsNullOrEmpty(uid) || !variant.HasValue) return true;

                if (pet.SetVariant(place, uid, variant.Value))
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Colour changed!" });
                }
            }
            else if (type == "room_variant_unlock")
            {
                string itemId = message?.Value<string>("itemId");
                int? variant = message?.Value<int?>("variant");
                if (string.IsNullOrEmpty(itemId) || !variant.HasValue) return true;

                var res = pet.UnlockVariant(itemId, variant.Value);
                if (res == WorldResult.Ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Colour unlocked!" });
                }
                else if (res == WorldResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (res == WorldResult.Unknown)
                {
                    return true;
                }
            }
            else if (type == "room_rename")
            {
                string place = message?.Value<string>("place");
                string name = message?.Value<string>("name") ?? string.Empty;
                if (string.IsNullOrEmpty(place)) return true;

                if (pet.RenameRoom(place, name))
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Room renamed!" });
                }
            }
            else if (type == "room_transfer")
            {
                string from = message?.Value<string>("from");
                string to = message?.Value<string>("to");
                string uid = message?.Value<string>("uid");
                int x = message?.Value<int?>("x") ?? 0;
                int y = message?.Value<int?>("y") ?? 0;

                if (string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to) || string.IsNullOrEmpty(uid)) return true;

                var res = pet.TransferItem(from, uid, to, x, y);
                if (res == PlaceResult.UnknownItem)
                {
                    return true;
                }
                else if (res == PlaceResult.Ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Moved to another room!" });
                }
                else if (res == PlaceResult.Overlap)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Something is in the way" });
                }
                else if (res == PlaceResult.OutOfBounds || res == PlaceResult.WrongLayerArea)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Too close to the wall" });
                }
                else if (res == PlaceResult.NotAllowedHere)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }

            try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] RoomsFeature save: " + ex.Message); }
            HomeWindow.NotifyStateChanged();
            return true;
        }

        private static (int x, int y) ResolveGridCoordinates(
            Pet pet,
            string place,
            WorldItemDefinition def,
            int rawX,
            int rawY,
            string ignoreUid = null)
        {
            if (pet == null || def == null) return (rawX, rawY);

            var world = pet.State.World ?? new WorldState();
            var (cols, rows) = pet.GetRoomGridSize(place);
            if (cols <= 0 || rows <= 0)
            {
                (cols, rows) = PlaceUnlock.GridSize(world, pet.PlaceCatalog, place);
            }
            if (cols <= 0) cols = 12;
            if (rows <= 0) rows = 7;
            int wallRows = pet.PlaceCatalog != null ? pet.PlaceCatalog.WallRows : 2;

            int w = def.W > 0 ? def.W : 1;
            int h = def.H > 0 ? def.H : 1;

            RoomLayout room = null;
            if (world.Rooms != null)
            {
                world.Rooms.TryGetValue(place, out room);
            }

            string effPlace = Pet.EffectivePlaceForValidation(place);

            // 1. Auto-place for negative coords (e.g. from customize panel stash)
            if (rawX < 0 || rawY < 0)
            {
                int startY = string.Equals(def.Layer, "wall", StringComparison.OrdinalIgnoreCase) ? 0 : wallRows;
                int endY = string.Equals(def.Layer, "wall", StringComparison.OrdinalIgnoreCase) ? wallRows : rows;

                for (int cy = startY; cy + h <= endY; cy++)
                {
                    for (int cx = 0; cx + w <= cols; cx++)
                    {
                        if (RoomLayoutOps.CanPlace(room, cols, rows, wallRows, def, effPlace, cx, cy, ignoreUid, pet.WorldItemCatalog) == PlaceResult.Ok)
                        {
                            return (cx, cy);
                        }
                    }
                }
                return (rawX, rawY);
            }

            // 2. Pixel coordinates conversion (rawX or rawY beyond cell bounds)
            if (rawX >= cols || rawY >= rows)
            {
                int targetX = (int)Math.Round(rawX / 16.0 - w / 2.0);
                int targetY = (int)Math.Round(rawY / 16.0 - h);

                targetX = Math.Max(0, Math.Min(cols - w, targetX));
                targetY = Math.Max(0, Math.Min(rows - h, targetY));

                if (RoomLayoutOps.CanPlace(room, cols, rows, wallRows, def, effPlace, targetX, targetY, ignoreUid, pet.WorldItemCatalog) == PlaceResult.Ok)
                {
                    return (targetX, targetY);
                }

                // If collision / snapping issue, find nearest valid neighbor by Manhattan distance
                int bestDist = int.MaxValue;
                int bestX = targetX;
                int bestY = targetY;
                bool found = false;

                int searchRadius = 3;
                int minX = Math.Max(0, targetX - searchRadius);
                int maxX = Math.Min(cols - w, targetX + searchRadius);
                int minY = Math.Max(0, targetY - searchRadius);
                int maxY = Math.Min(rows - h, targetY + searchRadius);

                for (int cy = minY; cy <= maxY; cy++)
                {
                    for (int cx = minX; cx <= maxX; cx++)
                    {
                        if (RoomLayoutOps.CanPlace(room, cols, rows, wallRows, def, effPlace, cx, cy, ignoreUid, pet.WorldItemCatalog) == PlaceResult.Ok)
                        {
                            int dist = Math.Abs(cx - targetX) + Math.Abs(cy - targetY);
                            if (dist < bestDist)
                            {
                                bestDist = dist;
                                bestX = cx;
                                bestY = cy;
                                found = true;
                            }
                        }
                    }
                }

                if (found)
                {
                    return (bestX, bestY);
                }

                return (targetX, targetY);
            }

            // 3. Already cell coordinates
            return (rawX, rawY);
        }
    }
}
