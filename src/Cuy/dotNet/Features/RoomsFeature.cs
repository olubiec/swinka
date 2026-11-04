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

            int wallRows = placeCatalog != null ? placeCatalog.WallRows : 2;
            var layoutsDict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            foreach (var id in placeOrRoomIds)
            {
                world.Rooms.TryGetValue(id, out var roomLayout);

                var (cols, rows) = PlaceUnlock.GridSize(world, placeCatalog, id);
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
                            flip = it.Flip
                        });
                    }
                }

                layoutsDict[id] = new
                {
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

            // 4. Skins
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
                skins = skinsObj
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "room_buy" && type != "room_place" && type != "room_move" &&
                type != "room_flip" && type != "room_remove" && type != "room_skin")
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
                int x = message?.Value<int?>("x") ?? 0;
                int y = message?.Value<int?>("y") ?? 0;
                bool flip = message?.Value<bool?>("flip") ?? false;

                if (string.IsNullOrEmpty(itemId)) return true;

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
                int x = message?.Value<int?>("x") ?? 0;
                int y = message?.Value<int?>("y") ?? 0;

                if (string.IsNullOrEmpty(uid)) return true;

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

            try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] RoomsFeature save: " + ex.Message); }
            HomeWindow.NotifyStateChanged();
            return true;
        }
    }
}
