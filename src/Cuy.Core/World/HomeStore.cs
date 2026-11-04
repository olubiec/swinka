using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;

namespace Cuy.Core.World
{
    /// <summary>
    /// One purchasable thing of the home: its price, how many the player owns and why it is locked.
    /// Rows are read-only snapshots, the purchase itself lives in <see cref="Pet.Purchase"/>.
    /// </summary>
    public sealed class StoreRow
    {
        public string Kind { get; set; } = string.Empty;
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Place { get; set; } = string.Empty;
        public int Price { get; set; }
        public int Owned { get; set; }
        public int Placed { get; set; }
        public bool Locked { get; set; }
        /// <summary>Null when not locked. Values: needs_place:&lt;id&gt;, needs_pigs, needs_room_level, max_level, owned.</summary>
        public string LockedReason { get; set; }
    }

    /// <summary>
    /// Pure helper that lists every purchasable thing of the home from the data tables and the save state.
    /// No decoration is ever sold back, and signature and prop items are never sold.
    /// </summary>
    public static class HomeStore
    {
        public const string KindRoom = "room";
        public const string KindRoomLevel = "room_level";
        public const string KindPlace = "place";
        public const string KindPlaceLevel = "place_level";
        public const string KindPigRoomLevel = "pig_room_level";
        public const string KindDorm = "dorm";
        public const string KindDormLevel = "dorm_level";
        public const string KindItem = "item";
        public const string KindVariant = "variant";
        public const string KindDecor = "decor";
        public const string KindPlotPack = "plot_pack";
        public const string KindOrchardSlot = "orchard_slot";
        public const string KindCan = "can";
        public const string KindStall = "stall";

        /// <summary>Id of the single next plot pack or orchard slot row (the purchase always buys the next one).</summary>
        public const string NextId = "next";

        /// <summary>Id of the big market stall row.</summary>
        public const string BigStallId = "big_stall";

        private const string GardenGateId = "gate_garden";

        /// <summary>Every row of the store for this save, locked ones included.</summary>
        public static IReadOnlyList<StoreRow> Rows(
            GameState state,
            PlaceCatalog places,
            WorldItemCatalog items,
            FarmConfig farm,
            MarketConfig market,
            PigRoomConfig pigRooms,
            HomeEconomyConfig economy,
            ItemCatalog catalog)
        {
            var rows = new List<StoreRow>();
            if (state == null) return rows;

            WorldState world = state.World ?? new WorldState();

            AddPlaceRows(rows, world, places);
            AddPigRoomRows(rows, state, world, pigRooms);
            AddDormRows(rows, state, world, pigRooms);
            AddItemRows(rows, state, world, places, items, pigRooms, economy);
            AddDecorRows(rows, state, catalog);
            AddFarmRows(rows, world, places, farm);
            AddStallRow(rows, world, market);

            return rows;
        }

        /// <summary>The single row with this kind and id, or null when the store does not list it.</summary>
        public static StoreRow Row(
            string kind,
            string id,
            GameState state,
            PlaceCatalog places,
            WorldItemCatalog items,
            FarmConfig farm,
            MarketConfig market,
            PigRoomConfig pigRooms,
            HomeEconomyConfig economy,
            ItemCatalog catalog)
        {
            if (kind == null || id == null) return null;
            foreach (var row in Rows(state, places, items, farm, market, pigRooms, economy, catalog))
            {
                if (row.Kind == kind && row.Id == id) return row;
            }
            return null;
        }

        private static void AddPlaceRows(List<StoreRow> rows, WorldState world, PlaceCatalog places)
        {
            if (places == null) return;

            foreach (var place in places.Places)
            {
                if (place == null) continue;
                bool unlocked = PlaceUnlock.IsUnlocked(world, places, place.Id);
                string reason = unlocked ? "owned" : FirstUnmetRequirement(world, places, place.Requires);
                rows.Add(new StoreRow
                {
                    Kind = KindPlace,
                    Id = place.Id,
                    Name = place.Name,
                    Category = "place",
                    Place = place.Id,
                    Price = place.Cost,
                    Owned = unlocked ? 1 : 0,
                    Locked = reason != null,
                    LockedReason = reason
                });

                if (unlocked)
                {
                    AddLevelRow(rows, KindPlaceLevel, place.Id, place.Name, "place", place.Id,
                        place.Levels, PlaceUnlock.GetLevel(world, places, place.Id));
                }

                foreach (var room in place.Rooms ?? new List<RoomDefinition>())
                {
                    if (room == null) continue;
                    bool roomUnlocked = PlaceUnlock.IsUnlocked(world, places, room.Id);
                    string roomReason = roomUnlocked ? "owned" : (unlocked ? null : "needs_place:" + place.Id);
                    rows.Add(new StoreRow
                    {
                        Kind = KindRoom,
                        Id = room.Id,
                        Name = room.Name,
                        Category = "room",
                        Place = place.Id,
                        Price = room.Cost,
                        Owned = roomUnlocked ? 1 : 0,
                        Locked = roomReason != null,
                        LockedReason = roomReason
                    });

                    if (roomUnlocked)
                    {
                        AddLevelRow(rows, KindRoomLevel, room.Id, room.Name, "room", place.Id,
                            room.Levels, PlaceUnlock.GetLevel(world, places, room.Id));
                    }
                }
            }
        }

        private static void AddPigRoomRows(List<StoreRow> rows, GameState state, WorldState world, PigRoomConfig pigRooms)
        {
            if (pigRooms == null || state.Roster == null) return;

            foreach (var pig in state.Roster)
            {
                if (pig == null || pig.Memorial) continue;
                string roomId = pigRooms.RoomId(pig.Id);
                int level = CurrentLevel(world, roomId);
                AddLevelRow(rows, KindPigRoomLevel, roomId, pig.Name, "pig_room", "pig_room",
                    pigRooms.Levels, level);
            }
        }

        private static void AddDormRows(List<StoreRow> rows, GameState state, WorldState world, PigRoomConfig pigRooms)
        {
            var dorm = pigRooms?.Dorm;
            if (dorm == null) return;

            if (world.RoomsUnlocked.Contains(SharedRoomOps.DormId))
            {
                AddLevelRow(rows, KindDormLevel, SharedRoomOps.DormId, dorm.Name, "dorm", "dorm",
                    dorm.Levels, SharedRoomOps.DormLevel(world));
                return;
            }

            int residents = state.Roster == null ? 0 : state.Roster.Count(p => p != null && !p.Memorial);
            bool enoughPigs = residents >= dorm.RequiresPigs;
            rows.Add(new StoreRow
            {
                Kind = KindDorm,
                Id = SharedRoomOps.DormId,
                Name = dorm.Name,
                Category = "dorm",
                Place = "dorm",
                Price = dorm.UnlockCost,
                Owned = 0,
                Locked = !enoughPigs,
                LockedReason = enoughPigs ? null : "needs_pigs"
            });
        }

        private static void AddItemRows(
            List<StoreRow> rows,
            GameState state,
            WorldState world,
            PlaceCatalog places,
            WorldItemCatalog items,
            PigRoomConfig pigRooms,
            HomeEconomyConfig economy)
        {
            if (items == null) return;

            foreach (var def in items.Items)
            {
                if (!IsSellableItem(def)) continue;

                string place = def.Place == null ? string.Empty : def.Place.FirstOrDefault() ?? string.Empty;
                int owned = world.OwnedItems != null && world.OwnedItems.TryGetValue(def.Id, out int count) ? count : 0;
                string reason = PlaceReason(world, places, place);
                if (reason == null && owned > 0 && !def.Repeatable) reason = "owned";

                rows.Add(new StoreRow
                {
                    Kind = KindItem,
                    Id = def.Id,
                    Name = def.Name,
                    Category = place,
                    Place = place,
                    Price = def.Price,
                    Owned = owned,
                    Placed = CountPlaced(world, def.Id),
                    Locked = reason != null,
                    LockedReason = reason
                });

                if (!def.Recolor || pigRooms == null || economy == null) continue;

                for (int variant = 1; variant < pigRooms.VariantCount; variant++)
                {
                    string key = def.Id + ":" + variant;
                    bool unlockedVariant = world.UnlockedVariants != null && world.UnlockedVariants.Contains(key);
                    string variantReason = unlockedVariant ? "owned" : PlaceReason(world, places, place);
                    rows.Add(new StoreRow
                    {
                        Kind = KindVariant,
                        Id = key,
                        Name = def.Name,
                        Category = place,
                        Place = place,
                        Price = economy.VariantPrice(def.Price),
                        Owned = unlockedVariant ? 1 : 0,
                        Locked = variantReason != null,
                        LockedReason = variantReason
                    });
                }
            }
        }

        private static void AddDecorRows(List<StoreRow> rows, GameState state, ItemCatalog catalog)
        {
            if (catalog == null) return;

            foreach (var def in catalog.AllItems)
            {
                if (def == null || !string.Equals(def.Category, "decor", StringComparison.OrdinalIgnoreCase)) continue;
                if (!def.Price.HasValue || def.Price.Value <= 0) continue;

                int owned = state.Inventory != null && state.Inventory.TryGetValue(def.Id, out int count) ? count : 0;
                rows.Add(new StoreRow
                {
                    Kind = KindDecor,
                    Id = def.Id,
                    Name = def.Name,
                    Category = "decor",
                    Place = string.Empty,
                    Price = def.Price.Value,
                    Owned = owned,
                    Locked = false,
                    LockedReason = null
                });
            }
        }

        private static void AddFarmRows(List<StoreRow> rows, WorldState world, PlaceCatalog places, FarmConfig farm)
        {
            if (farm == null) return;

            FarmState farmState = world.Farm ?? new FarmState();
            string farmReason = PlaceReason(world, places, "farm");

            int packCost = FarmExpansion.NextPackCost(farm, farmState);
            if (packCost >= 0)
            {
                rows.Add(new StoreRow
                {
                    Kind = KindPlotPack,
                    Id = NextId,
                    Name = "Plot pack",
                    Category = "farm",
                    Place = "farm",
                    Price = packCost,
                    Owned = 0,
                    Locked = farmReason != null,
                    LockedReason = farmReason
                });
            }

            int orchardCost = FarmExpansion.NextOrchardCost(farm, farmState);
            if (orchardCost >= 0)
            {
                rows.Add(new StoreRow
                {
                    Kind = KindOrchardSlot,
                    Id = NextId,
                    Name = "Orchard slot",
                    Category = "farm",
                    Place = "farm",
                    Price = orchardCost,
                    Owned = 0,
                    Locked = farmReason != null,
                    LockedReason = farmReason
                });
            }

            foreach (var can in farm.Cans ?? new List<WaterCan>())
            {
                if (can == null || can.Cost <= 0) continue;
                bool isSprinkler = string.Equals(can.Id, "sprinkler", StringComparison.OrdinalIgnoreCase);
                bool owned = isSprinkler ? farmState.Sprinkler : string.Equals(farmState.CanId, can.Id, StringComparison.OrdinalIgnoreCase);
                string reason = owned ? "owned" : farmReason;
                rows.Add(new StoreRow
                {
                    Kind = KindCan,
                    Id = can.Id,
                    Name = can.Id,
                    Category = "farm",
                    Place = "farm",
                    Price = can.Cost,
                    Owned = owned ? 1 : 0,
                    Locked = reason != null,
                    LockedReason = reason
                });
            }
        }

        private static void AddStallRow(List<StoreRow> rows, WorldState world, MarketConfig market)
        {
            if (market == null) return;

            int level = world.Market?.StallLevel ?? 0;
            var upgrades = market.StallUpgrades ?? new List<StallUpgradeDefinition>();
            bool hasNext = level < upgrades.Count;
            rows.Add(new StoreRow
            {
                Kind = KindStall,
                Id = BigStallId,
                Name = "Big stall",
                Category = "market",
                Place = "market",
                Price = hasNext ? upgrades[level].Cost : 0,
                Owned = level,
                Locked = !hasNext,
                LockedReason = hasNext ? null : "max_level"
            });
        }

        private static void AddLevelRow(
            List<StoreRow> rows,
            string kind,
            string id,
            string name,
            string category,
            string place,
            IReadOnlyList<GridLevel> levels,
            int current)
        {
            int count = levels == null ? 0 : levels.Count;
            bool hasNext = current < count;
            rows.Add(new StoreRow
            {
                Kind = kind,
                Id = id,
                Name = name,
                Category = category,
                Place = place,
                Price = hasNext ? levels[current].Cost : 0,
                Owned = current,
                Locked = !hasNext,
                LockedReason = hasNext ? null : "max_level"
            });
        }

        private static bool IsSellableItem(WorldItemDefinition def)
        {
            if (def == null) return false;
            if (def.IsFree) return false;
            if (def.SignatureOf != null) return false;
            if (def.PropOf != null) return false;
            if (string.Equals(def.Id, GardenGateId, StringComparison.OrdinalIgnoreCase)) return false;
            return true;
        }

        private static int CurrentLevel(WorldState world, string id)
        {
            if (world.PlaceLevels != null && world.PlaceLevels.TryGetValue(id, out int level) && level > 0)
            {
                return level;
            }
            return 1;
        }

        private static int CountPlaced(WorldState world, string itemId)
        {
            if (world.Rooms == null) return 0;
            int total = 0;
            foreach (var room in world.Rooms.Values)
            {
                if (room?.Items == null) continue;
                total += room.Items.Count(i => i != null && string.Equals(i.ItemId, itemId, StringComparison.Ordinal));
            }
            return total;
        }

        private static string PlaceReason(WorldState world, PlaceCatalog places, string placeId)
        {
            if (string.IsNullOrEmpty(placeId) || places == null) return null;
            return PlaceUnlock.IsUnlocked(world, places, placeId) ? null : "needs_place:" + placeId;
        }

        private static string FirstUnmetRequirement(WorldState world, PlaceCatalog places, IReadOnlyList<string> requires)
        {
            if (requires == null) return null;
            foreach (var req in requires)
            {
                if (!PlaceUnlock.IsUnlocked(world, places, req)) return "needs_place:" + req;
            }
            return null;
        }
    }
}
