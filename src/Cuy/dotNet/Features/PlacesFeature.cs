using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class PlacesFeature : HomeFeatureBase
    {
        public override string Id => "places";

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
            var world = pet.EnsureWorld();
            var catalog = pet.PlaceCatalog;

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

            state["places"] = new
            {
                places = placesList,
                rooms = roomsList,
                clovers = pet.Clovers
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "place_unlock" && type != "room_unlock" && type != "place_upgrade")
            {
                return false;
            }

            var pet = brain?.Pet;
            if (pet == null) return true;

            pet.Balance.PlacesActive = true;
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
    }
}
