using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class PlacesFeature : HomeFeatureBase
    {
        public override string Id => "places";
        private Random _rng;

        public override void Initialize(BrainController brain)
        {
            if (brain?.Pet?.Balance != null)
            {
                brain.Pet.Balance.PlacesActive = true;
            }
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            pet.Balance.PlacesActive = true;
            pet.EnsurePigRooms();
            HealOrphanPigRooms(pet);
            var world = pet.EnsureWorld();
            var catalog = pet.PlaceCatalog ?? PlaceCatalog.Current;
            var gameState = pet.State;

            var placesList = new List<object>();
            if (catalog?.Places != null)
            {
                foreach (var p in catalog.Places)
                {
                    if (p == null || string.IsNullOrEmpty(p.Id)) continue;

                    bool unlocked = PlaceUnlock.IsUnlocked(world, catalog, p.Id);
                    int level = PlaceUnlock.GetLevel(world, catalog, p.Id);
                    int maxLevel = p.Levels != null && p.Levels.Count > 0 ? p.Levels.Count : 1;
                    int unlockCost = PlaceUnlock.UnlockCost(world, catalog, p.Id);
                    int nextLevelCost = PlaceUnlock.NextLevelCost(world, catalog, p.Id);
                    var requires = p.Requires != null ? p.Requires.ToList() : new List<string>();

                    var (cols, rows) = PlaceUnlock.GridSize(world, catalog, p.Id);
                    if (cols <= 0 && p.Levels != null && p.Levels.Count > 0)
                    {
                        cols = p.Levels[0].Cols;
                        rows = p.Levels[0].Rows;
                    }

                    placesList.Add(new
                    {
                        id = p.Id,
                        name = p.Name,
                        unlocked = unlocked,
                        level = level,
                        maxLevel = maxLevel,
                        unlockCost = unlockCost,
                        nextLevelCost = nextLevelCost,
                        requires = requires,
                        cols = cols,
                        rows = rows
                    });
                }
            }

            var roomsList = new List<object>();
            if (catalog?.Rooms != null)
            {
                foreach (var r in catalog.Rooms)
                {
                    if (r == null || string.IsNullOrEmpty(r.Id)) continue;

                    bool unlocked = PlaceUnlock.IsUnlocked(world, catalog, r.Id);
                    int level = PlaceUnlock.GetLevel(world, catalog, r.Id);
                    int unlockCost = PlaceUnlock.UnlockCost(world, catalog, r.Id);
                    int nextLevelCost = PlaceUnlock.NextLevelCost(world, catalog, r.Id);

                    var (cols, rows) = PlaceUnlock.GridSize(world, catalog, r.Id);
                    if (cols <= 0 && r.Levels != null && r.Levels.Count > 0)
                    {
                        cols = r.Levels[0].Cols;
                        rows = r.Levels[0].Rows;
                    }

                    roomsList.Add(new
                    {
                        id = r.Id,
                        name = r.Name,
                        unlocked = unlocked,
                        level = level,
                        unlockCost = unlockCost,
                        nextLevelCost = nextLevelCost,
                        cols = cols,
                        rows = rows
                    });
                }
            }

            // Build scene ring order
            var roomIds = GetRoomIds(gameState, world);
            Func<string, bool> isUnlocked = s => CheckUnlocked(world, catalog, s);
            var ring = SceneOrder.Build(roomIds, isUnlocked);
            var orderList = new List<object>();
            foreach (var entry in ring)
            {
                int entryLevel = 1;
                int entryMaxLevel = 1;
                int entryNextCost = -1;

                if (entry.Id.StartsWith("pig:", StringComparison.OrdinalIgnoreCase))
                {
                    if (world.PlaceLevels != null && world.PlaceLevels.TryGetValue(entry.Id, out int lv) && lv > 0)
                        entryLevel = lv;
                    else
                        entryLevel = 1;

                    var pLevels = pet.PigRooms?.Levels;
                    entryMaxLevel = pLevels != null ? pLevels.Count : 1;
                    if (pLevels != null && entryLevel < pLevels.Count)
                    {
                        entryNextCost = pLevels[entryLevel].Cost;
                    }
                }
                else if (string.Equals(entry.Id, SceneOrder.DormId, StringComparison.OrdinalIgnoreCase))
                {
                    entryLevel = SharedRoomOps.DormLevel(world);
                    var dLevels = pet.PigRooms?.Dorm?.Levels;
                    entryMaxLevel = dLevels != null ? dLevels.Count : 1;
                    if (dLevels != null && entryLevel < dLevels.Count)
                    {
                        entryNextCost = dLevels[entryLevel].Cost;
                    }
                }
                else
                {
                    entryLevel = PlaceUnlock.GetLevel(world, catalog, entry.Id);
                    var pDef = catalog?.Find(entry.Id);
                    if (pDef != null)
                    {
                        entryMaxLevel = pDef.Levels != null && pDef.Levels.Count > 0 ? pDef.Levels.Count : 1;
                        entryNextCost = PlaceUnlock.NextLevelCost(world, catalog, entry.Id);
                    }
                    else
                    {
                        var rDef = catalog?.FindRoom(entry.Id);
                        if (rDef != null)
                        {
                            entryMaxLevel = rDef.Levels != null && rDef.Levels.Count > 0 ? rDef.Levels.Count : 1;
                            entryNextCost = PlaceUnlock.NextLevelCost(world, catalog, entry.Id);
                        }
                    }
                }

                string sceneTitle = GetSceneTitle(pet, entry.Id);
                if (string.IsNullOrEmpty(sceneTitle)) sceneTitle = entry.Title;

                orderList.Add(new
                {
                    id = entry.Id,
                    title = sceneTitle,
                    locked = entry.Locked,
                    unlockHint = entry.UnlockHint,
                    level = entryLevel,
                    maxLevel = entryMaxLevel,
                    nextLevelCost = entryNextCost,
                    nextCost = entryNextCost
                });
            }

            // Pig locations
            var pigLocs = new List<object>();
            if (gameState?.PigLocations != null)
            {
                foreach (var loc in gameState.PigLocations.Values)
                {
                    if (loc == null || string.IsNullOrEmpty(loc.PigId)) continue;
                    pigLocs.Add(new
                    {
                        pigId = loc.PigId,
                        scene = loc.SceneId,
                        pinned = loc.Pinned
                    });
                }
            }

            state["places"] = new
            {
                places = placesList,
                rooms = roomsList,
                clovers = pet.Clovers,
                order = orderList,
                pigLocations = pigLocs
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "place_unlock" && type != "room_unlock" && type != "place_upgrade" &&
                type != "places.pigMove" && type != "places_pig_move" && type != "pig_move" && type != "places_pigMove" &&
                type != "places.pigPin" && type != "places_pig_pin" && type != "pig_pin" && type != "places_pigPin")
            {
                return false;
            }

            var pet = brain?.Pet;
            if (pet == null) return true;

            pet.Balance.PlacesActive = true;
            var world = pet.EnsureWorld();
            var catalog = pet.PlaceCatalog ?? PlaceCatalog.Current;
            var gameState = pet.State;

            if (type == "places.pigMove" || type == "places_pig_move" || type == "pig_move" || type == "places_pigMove")
            {
                string pigId = message?.Value<string>("pigId") ?? message?.Value<string>("pig_id");
                string to = message?.Value<string>("to");
                if (string.IsNullOrEmpty(pigId) || string.IsNullOrEmpty(to) || gameState == null) return true;

                var roomIds = GetRoomIds(gameState, world);
                Func<string, bool> isUnlocked = s => CheckUnlocked(world, catalog, s);
                var ring = SceneOrder.Build(roomIds, isUnlocked);
                var ringIds = ring.Select(r => r.Id).ToList();

                if (!PigRoamer.CanMove(gameState, pigId, to, ringIds, isUnlocked))
                {
                    bool locked = !isUnlocked(to);
                    HomeWindow.PostToPage(new { type = "toast", text = locked ? "Not ready yet" : "Cannot move there" });
                    return true;
                }

                if (PigRoamer.TryMove(gameState, pigId, to, ringIds, isUnlocked, pet.Clock))
                {
                    try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] PlacesFeature save: " + ex.Message); }
                    HomeWindow.NotifyStateChanged();
                }
                return true;
            }
            else if (type == "places.pigPin" || type == "places_pig_pin" || type == "pig_pin" || type == "places_pigPin")
            {
                string pigId = message?.Value<string>("pigId") ?? message?.Value<string>("pig_id");
                bool pinned = message?.Value<bool?>("pinned") ?? message?.Value<bool?>("isPinned") ?? true;
                if (string.IsNullOrEmpty(pigId) || gameState == null) return true;

                if (PigRoamer.SetPinned(gameState, pigId, pinned))
                {
                    try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] PlacesFeature save: " + ex.Message); }
                    HomeWindow.NotifyStateChanged();
                }
                return true;
            }

            string id = message?.Value<string>("id");
            if (string.IsNullOrEmpty(id)) return true;

            if (type == "place_unlock")
            {
                var res = pet.UnlockPlace(id);
                if (res == WorldResult.Unknown)
                {
                    return true;
                }
                else if (res == WorldResult.Ok)
                {
                    var def = pet.PlaceCatalog?.Find(id);
                    HomeWindow.PostToPage(new { type = "toast", text = $"Unlocked {def?.Name ?? id}!" });
                }
                else if (res == WorldResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (res == WorldResult.Locked)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "room_unlock")
            {
                var res = pet.UnlockRoom(id);
                if (res == WorldResult.Unknown)
                {
                    return true;
                }
                else if (res == WorldResult.Ok)
                {
                    var def = pet.PlaceCatalog?.FindRoom(id);
                    HomeWindow.PostToPage(new { type = "toast", text = $"Unlocked {def?.Name ?? id}!" });
                }
                else if (res == WorldResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (res == WorldResult.Locked)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "place_upgrade")
            {
                var res = pet.UpgradePlace(id);
                if (res == WorldResult.Unknown)
                {
                    return true;
                }
                else if (res == WorldResult.Ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Upgraded!" });
                }
                else if (res == WorldResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (res == WorldResult.Locked)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
                else if (res == WorldResult.MaxLevel)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Max level reached" });
                }
            }

            try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] PlacesFeature save: " + ex.Message); }
            HomeWindow.NotifyStateChanged();
            return true;
        }

        public override void Tick(TimeSpan gameElapsed, BrainController brain)
        {
            var pet = brain?.Pet;
            var state = pet?.State;
            if (pet == null || state == null) return;

            var world = pet.EnsureWorld();
            var catalog = pet.PlaceCatalog ?? PlaceCatalog.Current;
            IClock clock = pet.Clock ?? brain?.Clock ?? (IClock)new ManualClock(DateTime.UtcNow);

            var roomIds = GetRoomIds(state, world);
            Func<string, bool> isUnlocked = id => CheckUnlocked(world, catalog, id);
            var ring = SceneOrder.Build(roomIds, isUnlocked);
            var orderIds = ring.Select(r => r.Id).ToList();

            if (_rng == null) _rng = new Random();
            var moved = PigRoamer.Tick(state, orderIds, isUnlocked, clock, _rng, PigRoamingConfig.Current);
            if (moved != null && moved.Count > 0)
            {
                HomeWindow.NotifyStateChanged();
            }
        }

        private static void HealOrphanPigRooms(Pet pet)
        {
            if (pet?.State?.Roster == null) return;

            foreach (var pig in pet.State.Roster)
            {
                if (pig == null) continue;
                if (!string.IsNullOrEmpty(pig.NamedId) && !string.IsNullOrEmpty(pig.Id) &&
                    !string.Equals(pig.NamedId, pig.Id, StringComparison.Ordinal))
                {
                    string canonicalId = "pig:" + pig.NamedId;
                    string guidRoomId = "pig:" + pig.Id;

                    if (pet.State.World?.Rooms != null && pet.State.World.Rooms.TryGetValue(guidRoomId, out var orphanRoom) && orphanRoom != null)
                    {
                        if (!pet.State.World.Rooms.TryGetValue(canonicalId, out var canonicalRoom) || canonicalRoom == null)
                        {
                            pet.State.World.Rooms[canonicalId] = orphanRoom;
                        }
                        else if (orphanRoom.Items != null && orphanRoom.Items.Count > 0 &&
                                 (canonicalRoom.Items == null || canonicalRoom.Items.Count == 0))
                        {
                            canonicalRoom.Items = orphanRoom.Items;
                        }
                        pet.State.World.Rooms.Remove(guidRoomId);
                    }

                    if (pet.State.PigLocations != null && pet.State.PigLocations.TryGetValue(pig.Id, out var loc) && loc != null)
                    {
                        if (string.Equals(loc.SceneId, guidRoomId, StringComparison.OrdinalIgnoreCase))
                        {
                            loc.SceneId = canonicalId;
                        }
                    }
                }
            }
        }

        private static string Capitalize(string str)
        {
            if (string.IsNullOrEmpty(str)) return str;
            return char.ToUpperInvariant(str[0]) + str.Substring(1);
        }

        private static string GetSceneTitle(Pet pet, string sceneId)
        {
            if (string.IsNullOrEmpty(sceneId)) return string.Empty;
            if (sceneId.StartsWith("pig:", StringComparison.OrdinalIgnoreCase))
            {
                string raw = sceneId.Substring(4);
                var pig = pet?.State?.Roster?.FirstOrDefault(p =>
                    p != null && (string.Equals(p.Id, raw, StringComparison.OrdinalIgnoreCase) ||
                                  string.Equals(p.NamedId, raw, StringComparison.OrdinalIgnoreCase)));
                if (pig != null && !string.IsNullOrWhiteSpace(pig.Name))
                {
                    return Capitalize(pig.Name) + "'s Room";
                }
                if (!string.IsNullOrEmpty(raw))
                {
                    return Capitalize(raw) + "'s Room";
                }
                return "Pig's Room";
            }
            if (string.Equals(sceneId, SceneOrder.DormId, StringComparison.OrdinalIgnoreCase))
            {
                return "Shared Bedroom";
            }
            if (string.Equals(sceneId, SceneOrder.SalonId, StringComparison.OrdinalIgnoreCase))
            {
                return "Living room";
            }
            var def = pet?.PlaceCatalog?.Find(sceneId);
            if (def != null && !string.IsNullOrEmpty(def.Name)) return def.Name;
            var rDef = pet?.PlaceCatalog?.FindRoom(sceneId);
            if (rDef != null && !string.IsNullOrEmpty(rDef.Name)) return rDef.Name;
            return Capitalize(sceneId);
        }

        private static List<string> GetRoomIds(GameState state, WorldState world)
        {
            var list = new List<string>();
            if (state?.Roster != null)
            {
                foreach (var pig in state.Roster)
                {
                    if (pig == null || pig.Memorial) continue;
                    string key = !string.IsNullOrEmpty(pig.NamedId) ? pig.NamedId : pig.Id;
                    if (string.IsNullOrEmpty(key)) continue;
                    string id = "pig:" + key;
                    if (!list.Contains(id)) list.Add(id);
                }
            }
            if (world?.Rooms != null)
            {
                foreach (var k in world.Rooms.Keys)
                {
                    if (k.StartsWith("pig:", StringComparison.OrdinalIgnoreCase) && !list.Contains(k))
                    {
                        list.Add(k);
                    }
                }
            }
            return list;
        }

        private static bool CheckUnlocked(WorldState world, PlaceCatalog catalog, string id)
        {
            if (string.Equals(id, SceneOrder.SalonId, StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(id, SceneOrder.DormId, StringComparison.OrdinalIgnoreCase))
                return world != null && world.RoomsUnlocked.Contains(SceneOrder.DormId);
            if (id.StartsWith("pig:", StringComparison.OrdinalIgnoreCase))
            {
                if (world != null && world.RoomsUnlocked.Contains(id)) return true;
                if (world != null && world.Rooms != null && world.Rooms.ContainsKey(id)) return true;
                return true;
            }
            return PlaceUnlock.IsUnlocked(world, catalog, id);
        }
    }
}
