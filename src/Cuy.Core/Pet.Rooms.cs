using System;
using System.Linq;
using Cuy.Core.Pigs;
using Cuy.Core.World;

namespace Cuy.Core
{
    public enum BuyResult
    {
        Ok,
        NotEnoughClovers,
        Locked,
        MissingRequirement = Locked,
        UnknownItem,
        Unknown = UnknownItem,
        Disabled
    }

    public sealed partial class Pet
    {
        public BuyResult BuyItem(string id)
        {
            if (!Balance.WorldDecorActive) return BuyResult.Disabled;
            if (string.IsNullOrEmpty(id)) return BuyResult.UnknownItem;

            var def = WorldItemCatalog.Find(id);
            if (def == null) return BuyResult.UnknownItem;

            if (!string.IsNullOrEmpty(def.Requires))
            {
                if (string.Equals(def.Requires, "memorial_pig", StringComparison.OrdinalIgnoreCase))
                {
                    bool hasMemorialPig = State.Roster != null && State.Roster.Any(p => p != null && p.Memorial);
                    if (!hasMemorialPig) return BuyResult.Locked;
                }
                else
                {
                    var world = EnsureWorld();
                    if (!PlaceUnlock.IsUnlocked(world, PlaceCatalog, def.Requires))
                    {
                        return BuyResult.Locked;
                    }
                }
            }

            int price = def.IsFree ? 0 : def.Price;
            if (price > 0 && !TrySpendClovers(price))
            {
                return BuyResult.NotEnoughClovers;
            }

            var w = EnsureWorld();
            string canonicalId = def.Id;
            int current = 0;
            foreach (var kv in w.OwnedItems)
            {
                if (string.Equals(kv.Key, canonicalId, StringComparison.OrdinalIgnoreCase))
                {
                    current = kv.Value;
                    canonicalId = kv.Key;
                    break;
                }
            }
            w.OwnedItems[canonicalId] = current + 1;
            return BuyResult.Ok;
        }

        public PlaceResult PlaceItem(string placeOrRoomId, string itemId, int x, int y, bool flip)
        {
            if (!Balance.WorldDecorActive) return PlaceResult.NotAllowedHere;
            if (string.IsNullOrEmpty(placeOrRoomId) || string.IsNullOrEmpty(itemId)) return PlaceResult.UnknownItem;

            var def = WorldItemCatalog.Find(itemId);
            if (def == null) return PlaceResult.UnknownItem;

            var world = EnsureWorld();

            int owned = 0;
            foreach (var kv in world.OwnedItems)
            {
                if (string.Equals(kv.Key, def.Id, StringComparison.OrdinalIgnoreCase))
                {
                    owned += kv.Value;
                }
            }

            if (owned < 1 && State.Inventory != null && State.Inventory.TryGetValue(def.Id, out int invCount) && invCount > 0)
            {
                owned = invCount;
                world.OwnedItems[def.Id] = invCount;
            }

            if (owned < 1) return PlaceResult.NotAllowedHere;

            if (!def.Repeatable)
            {
                int placed = 0;
                foreach (var r in world.Rooms.Values)
                {
                    if (r?.Items != null)
                    {
                        foreach (var it in r.Items)
                        {
                            if (it != null && string.Equals(it.ItemId, def.Id, StringComparison.OrdinalIgnoreCase))
                            {
                                placed++;
                            }
                        }
                    }
                }

                if (owned - placed < 1) return PlaceResult.NotAllowedHere;
            }

            if (!world.Rooms.TryGetValue(placeOrRoomId, out var roomLayout) || roomLayout == null)
            {
                roomLayout = new RoomLayout();
                world.Rooms[placeOrRoomId] = roomLayout;
            }

            var (cols, rows) = PlaceUnlock.GridSize(world, PlaceCatalog, placeOrRoomId);
            int wallRows = PlaceCatalog != null ? PlaceCatalog.WallRows : 2;

            var result = RoomLayoutOps.Place(roomLayout, cols, rows, wallRows, def, placeOrRoomId, x, y, catalog: WorldItemCatalog);
            if (result == PlaceResult.Ok)
            {
                if (flip && roomLayout.Items.Count > 0)
                {
                    roomLayout.Items[roomLayout.Items.Count - 1].Flip = true;
                }
                Count("items_placed");
            }

            return result;
        }

        public PlaceResult MoveItem(string place, string uid, int x, int y)
        {
            if (!Balance.WorldDecorActive) return PlaceResult.NotAllowedHere;
            if (string.IsNullOrEmpty(place) || string.IsNullOrEmpty(uid)) return PlaceResult.UnknownItem;

            var world = EnsureWorld();
            if (!world.Rooms.TryGetValue(place, out var room) || room == null) return PlaceResult.UnknownItem;

            var (cols, rows) = PlaceUnlock.GridSize(world, PlaceCatalog, place);
            int wallRows = PlaceCatalog != null ? PlaceCatalog.WallRows : 2;

            return RoomLayoutOps.Move(room, cols, rows, wallRows, WorldItemCatalog, place, uid, x, y);
        }

        public bool FlipItem(string place, string uid, bool flip)
        {
            if (!Balance.WorldDecorActive) return false;
            if (string.IsNullOrEmpty(place) || string.IsNullOrEmpty(uid)) return false;

            var world = EnsureWorld();
            if (!world.Rooms.TryGetValue(place, out var room) || room == null) return false;

            return RoomLayoutOps.SetFlip(room, uid, flip);
        }

        public bool FlipItem(string place, string uid)
        {
            if (!Balance.WorldDecorActive) return false;
            if (string.IsNullOrEmpty(place) || string.IsNullOrEmpty(uid)) return false;

            var world = EnsureWorld();
            if (!world.Rooms.TryGetValue(place, out var room) || room?.Items == null) return false;

            var placed = room.Items.FirstOrDefault(i => string.Equals(i.Uid, uid, StringComparison.OrdinalIgnoreCase));
            if (placed == null) return false;

            return RoomLayoutOps.SetFlip(room, uid, !placed.Flip);
        }

        public bool RemoveItem(string place, string uid)
        {
            if (!Balance.WorldDecorActive) return false;
            if (string.IsNullOrEmpty(place) || string.IsNullOrEmpty(uid)) return false;

            var world = EnsureWorld();
            if (!world.Rooms.TryGetValue(place, out var room) || room == null) return false;

            return RoomLayoutOps.Remove(room, uid);
        }

        /// <summary>
        /// Factor for mood decay from comfort. World-wide while only WorldDecorActive is on; with PigRoomsActive
        /// it is the average over the active (non-memorial) pigs, each judged by its own room.
        /// Falls back to the world-wide factor when no active pig can be found.
        /// </summary>
        public double MoodDecayComfortFactor()
        {
            if (!Balance.WorldDecorActive) return 1.0;

            if (Balance.PigRoomsActive && State.ActivePigIds != null && State.Roster != null)
            {
                var world = EnsureWorld();
                double sum = 0;
                int count = 0;
                var seen = new System.Collections.Generic.HashSet<PigProfile>();
                int max = Math.Min(State.ActivePigIds.Count, 2);
                for (int i = 0; i < max; i++)
                {
                    var pig = FindRosterPig(State.ActivePigIds[i]);
                    if (pig == null || pig.Memorial || !seen.Add(pig)) continue;
                    int score = Comfort.Score(world, WorldItemCatalog, PigRooms.RoomId(PigKey(pig)));
                    sum += Comfort.MoodDecayFactor(Comfort.Capped(score, PlaceCatalog), PlaceCatalog);
                    count++;
                }
                if (count > 0) return sum / count;
            }

            return Comfort.MoodDecayFactor(Comfort.Capped(ComfortScore(), PlaceCatalog), PlaceCatalog);
        }

        public int ComfortScore(string placeId = null)
        {
            var world = EnsureWorld();
            return Comfort.Score(world, WorldItemCatalog, placeId);
        }
    }
}
