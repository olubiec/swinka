using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Cuy.Core.World
{
    public static class LegacyDecorMigration
    {
        public static IReadOnlyList<WorldItemDefinition> LegacyItems(ItemCatalog catalog)
        {
            var list = new List<WorldItemDefinition>();
            if (catalog?.AllItems == null)
            {
                return list;
            }

            foreach (var it in catalog.AllItems)
            {
                if (it == null || string.IsNullOrEmpty(it.Id)) continue;
                string id = it.Id.ToLowerInvariant();
                string cat = (it.Category ?? "").ToLowerInvariant();

                if (id.StartsWith("plant_") || cat == "plant" || id.Contains("plant"))
                {
                    list.Add(new WorldItemDefinition
                    {
                        Id = it.Id,
                        Name = it.Name ?? it.Id,
                        W = 1,
                        H = 1,
                        Price = it.Price ?? 0,
                        Comfort = 2,
                        Layer = "floor",
                        Place = new List<string> { "house" },
                        Icon = it.Id
                    });
                }
                else if (id.StartsWith("lamp_") || cat == "lamp" || id.Contains("lamp"))
                {
                    list.Add(new WorldItemDefinition
                    {
                        Id = it.Id,
                        Name = it.Name ?? it.Id,
                        W = 1,
                        H = 1,
                        Price = it.Price ?? 0,
                        Comfort = 1,
                        Layer = "wall",
                        Place = new List<string> { "house" },
                        Icon = it.Id
                    });
                }
                else if (id.StartsWith("picture_") || cat == "picture" || id.Contains("picture"))
                {
                    list.Add(new WorldItemDefinition
                    {
                        Id = it.Id,
                        Name = it.Name ?? it.Id,
                        W = 2,
                        H = 1,
                        Price = it.Price ?? 0,
                        Comfort = 2,
                        Layer = "wall",
                        Place = new List<string> { "house" },
                        Icon = it.Id
                    });
                }
                else if (id.StartsWith("rug_") || cat == "rug" || id.Contains("rug"))
                {
                    list.Add(new WorldItemDefinition
                    {
                        Id = it.Id,
                        Name = it.Name ?? it.Id,
                        W = 3,
                        H = 2,
                        Price = it.Price ?? 0,
                        Comfort = 1,
                        Layer = "ground",
                        Place = new List<string> { "house" },
                        Icon = it.Id
                    });
                }
            }

            return list;
        }

        public static bool Migrate(GameState state, WorldItemCatalog items, ItemCatalog catalog)
        {
            if (state == null)
            {
                return false;
            }

            if (state.World == null)
            {
                state.World = new WorldState();
            }

            if (state.World.LegacyDecorMigrated)
            {
                return false;
            }

            // Register legacy items into catalogs
            if (catalog != null)
            {
                var legacyDefs = LegacyItems(catalog);
                foreach (var def in legacyDefs)
                {
                    RoomLayoutOps.RegisterItem(def);
                    if (items != null && items.Find(def.Id) == null)
                    {
                        RegisterItemIntoCatalog(items, def);
                    }
                }
            }

            if (!state.World.Rooms.TryGetValue("salon", out var salon) || salon == null)
            {
                salon = new RoomLayout();
                state.World.Rooms["salon"] = salon;
            }

            var equipped = state.Decor?.Equipped;
            if (equipped != null)
            {
                foreach (var kvp in equipped)
                {
                    string slot = (kvp.Key ?? "").Trim().ToLowerInvariant();
                    string itemId = kvp.Value;
                    if (string.IsNullOrEmpty(itemId)) continue;

                    // Unknown item ids are skipped
                    bool isKnown = (catalog != null && catalog.GetItem(itemId) != null) ||
                                   (items != null && items.Find(itemId) != null) ||
                                   (WorldItemCatalog.Current != null && WorldItemCatalog.Current.Find(itemId) != null);
                    if (!isKnown)
                    {
                        continue;
                    }

                    // Count as owned in WorldState.OwnedItems
                    state.World.OwnedItems[itemId] = state.World.OwnedItems.TryGetValue(itemId, out int count) ? count + 1 : 1;

                    // Migrate into salon layout
                    switch (slot)
                    {
                        case "wallpaper":
                            salon.Wallpaper = itemId;
                            break;
                        case "floor":
                            salon.Floor = itemId;
                            break;
                        case "rug":
                            EnsureRegistered(items, catalog, itemId, 3, 2, 1, "ground");
                            salon.Items.Add(new PlacedItem
                            {
                                Uid = Guid.NewGuid().ToString("N"),
                                ItemId = itemId,
                                X = 4,
                                Y = 3,
                                Flip = false
                            });
                            break;
                        case "plant":
                            EnsureRegistered(items, catalog, itemId, 1, 1, 2, "floor");
                            salon.Items.Add(new PlacedItem
                            {
                                Uid = Guid.NewGuid().ToString("N"),
                                ItemId = itemId,
                                X = 10,
                                Y = 6,
                                Flip = false
                            });
                            break;
                        case "picture":
                            EnsureRegistered(items, catalog, itemId, 2, 1, 2, "wall");
                            salon.Items.Add(new PlacedItem
                            {
                                Uid = Guid.NewGuid().ToString("N"),
                                ItemId = itemId,
                                X = 2,
                                Y = 0,
                                Flip = false
                            });
                            break;
                        case "lamp":
                            EnsureRegistered(items, catalog, itemId, 1, 1, 1, "wall");
                            salon.Items.Add(new PlacedItem
                            {
                                Uid = Guid.NewGuid().ToString("N"),
                                ItemId = itemId,
                                X = 8,
                                Y = 0,
                                Flip = false
                            });
                            break;
                    }
                }
            }

            state.World.LegacyDecorMigrated = true;
            return true;
        }

        private static void EnsureRegistered(WorldItemCatalog items, ItemCatalog catalog, string itemId, int w, int h, int comfort, string layer)
        {
            var def = items?.Find(itemId) ?? WorldItemCatalog.Current?.Find(itemId);
            if (def == null)
            {
                int price = catalog?.GetItem(itemId)?.Price ?? 0;
                string name = catalog?.GetItem(itemId)?.Name ?? itemId;
                def = new WorldItemDefinition
                {
                    Id = itemId,
                    Name = name,
                    W = w,
                    H = h,
                    Price = price,
                    Comfort = comfort,
                    Layer = layer,
                    Place = new List<string> { "house" }
                };
                RoomLayoutOps.RegisterItem(def);
                if (items != null)
                {
                    RegisterItemIntoCatalog(items, def);
                }
            }
        }

        private static void RegisterItemIntoCatalog(WorldItemCatalog catalog, WorldItemDefinition def)
        {
            if (catalog == null || def == null) return;
            try
            {
                var itemsField = typeof(WorldItemCatalog).GetField("_items", BindingFlags.NonPublic | BindingFlags.Instance);
                var dictField = typeof(WorldItemCatalog).GetField("_itemsById", BindingFlags.NonPublic | BindingFlags.Instance);
                if (itemsField?.GetValue(catalog) is List<WorldItemDefinition> list)
                {
                    list.Add(def);
                }
                if (dictField?.GetValue(catalog) is Dictionary<string, WorldItemDefinition> dict)
                {
                    dict[def.Id] = def;
                }
            }
            catch
            {
                // Ignore if reflection is unavailable
            }
        }
    }
}
