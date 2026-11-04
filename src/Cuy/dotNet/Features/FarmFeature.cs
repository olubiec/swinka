using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class FarmFeature : HomeFeatureBase
    {
        public override string Id => "farm";

        private DateTime _lastFarmTick = DateTime.MinValue;

        public override void Initialize(BrainController brain)
        {
            if (brain?.Pet?.Balance != null)
            {
                brain.Pet.Balance.FarmActive = true;
            }
        }

        public override void Tick(TimeSpan gameElapsed, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            pet.FarmTick();

            if (HomeWindow.IsOpen)
            {
                var now = pet.Clock != null ? pet.Clock.UtcNow : DateTime.UtcNow;
                if ((now - _lastFarmTick).TotalSeconds >= 30)
                {
                    _lastFarmTick = now;
                    HomeWindow.NotifyStateChanged();
                }
            }
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            pet.Balance.FarmActive = true;
            var world = pet.EnsureWorld();
            var farmConfig = pet.FarmConfig;
            var farm = world.Farm;
            var nowUtc = pet.Clock != null ? pet.Clock.UtcNow : DateTime.UtcNow;

            int harvests = 0;
            pet.State.Stats?.Counters?.TryGetValue("harvests", out harvests);

            // 1. Plots
            var plotsList = new List<object>();
            int plotsOwned = farm.PlotsOwned;
            for (int i = 0; i < plotsOwned; i++)
            {
                var ps = (farm.Plots != null && i < farm.Plots.Count) ? farm.Plots[i] : null;
                string cropId = ps?.CropId;
                string plotState = "empty";
                int secondsLeft = 0;
                int yield = 0;
                bool watered = ps?.Watered ?? false;

                if (!string.IsNullOrEmpty(cropId))
                {
                    var cropDef = farmConfig?.Find(cropId);
                    yield = cropDef?.Yield ?? 0;
                    if (FarmEngine.IsRipe(farmConfig, farm, nowUtc, i))
                    {
                        plotState = "ripe";
                        secondsLeft = 0;
                    }
                    else
                    {
                        plotState = "growing";
                        var tl = FarmEngine.TimeLeft(farmConfig, farm, nowUtc, i);
                        secondsLeft = (int)Math.Max(0, Math.Ceiling((tl ?? TimeSpan.Zero).TotalSeconds));
                    }
                }

                plotsList.Add(new
                {
                    index = i,
                    cropId = cropId,
                    state = plotState,
                    watered = watered,
                    secondsLeft = secondsLeft,
                    yield = yield
                });
            }

            // 2. Orchard
            var orchardList = new List<object>();
            int orchardSlots = farm.OrchardSlots;
            for (int s = 0; s < orchardSlots; s++)
            {
                var os = (farm.Orchard != null && s < farm.Orchard.Count) ? farm.Orchard[s] : null;
                string cropId = os?.CropId;
                int stock = os?.Stock ?? 0;
                int secondsToNext = 0;

                if (!string.IsNullOrEmpty(cropId))
                {
                    var cropDef = farmConfig?.Find(cropId);
                    if (cropDef != null && stock < cropDef.MaxStock && os != null)
                    {
                        var diff = os.NextUtc - nowUtc;
                        secondsToNext = (int)Math.Max(0, Math.Ceiling(diff.TotalSeconds));
                    }
                }

                orchardList.Add(new
                {
                    slot = s,
                    cropId = cropId,
                    stock = stock,
                    secondsToNext = secondsToNext
                });
            }

            // 3. Crops
            var cropsList = new List<object>();
            if (farmConfig?.Crops != null)
            {
                foreach (var c in farmConfig.Crops)
                {
                    if (c == null) continue;
                    var itemDef = ItemCatalogLoader.GetItem(c.ItemId);
                    string name = itemDef?.Name ?? c.Id;
                    string icon = itemDef?.IconName ?? c.Id;
                    string kind = c.Kind == CropKind.Annual ? "annual" : "perennial";
                    bool cropUnlocked = harvests >= c.UnlockHarvests;
                    string seedItem = !string.IsNullOrEmpty(c.SeedItemId) ? c.SeedItemId : (c.Kind == CropKind.Annual ? "seed_" + c.Id : "sapling_" + c.Id);
                    int seedOwned = pet.GetItemCount(seedItem);

                    cropsList.Add(new
                    {
                        id = c.Id,
                        name = name,
                        icon = icon,
                        kind = kind,
                        unlocked = cropUnlocked,
                        seedItem = seedItem,
                        seedOwned = seedOwned,
                        growMinutes = c.GrowMinutes,
                        yield = c.Yield,
                        sellPrice = c.SellPrice,
                        unlockHarvests = c.UnlockHarvests
                    });
                }
            }

            // 4. Tools
            string canId = string.IsNullOrEmpty(farm.CanId) ? "can_1" : farm.CanId;
            int plotsPerWater = FarmExpansion.PlotsPerWaterUse(farm, farmConfig);
            bool sprinkler = farm.Sprinkler;

            var toolsObj = new
            {
                canId = canId,
                plotsPerWater = plotsPerWater,
                sprinkler = sprinkler
            };

            // 5. Upgrades
            int nextPackCost = FarmExpansion.NextPackCost(farmConfig, farm);
            int nextOrchardCost = FarmExpansion.NextOrchardCost(farmConfig, farm);
            int nextCanCost = -1;
            if (string.IsNullOrEmpty(farm.CanId) || string.Equals(farm.CanId, "can_1", StringComparison.OrdinalIgnoreCase))
            {
                var can2 = farmConfig?.Cans?.FirstOrDefault(cn => string.Equals(cn.Id, "can_2", StringComparison.OrdinalIgnoreCase));
                nextCanCost = can2?.Cost ?? 120;
            }
            int sprinklerCost = farm.Sprinkler ? -1 : (farmConfig?.Cans?.FirstOrDefault(cn => string.Equals(cn.Id, "sprinkler", StringComparison.OrdinalIgnoreCase))?.Cost ?? 650);

            var upgradesObj = new
            {
                nextPackCost = nextPackCost,
                nextOrchardCost = nextOrchardCost,
                nextCanCost = nextCanCost,
                sprinklerCost = sprinklerCost
            };

            bool unlocked = PlaceUnlock.IsUnlocked(world, pet.PlaceCatalog, "farm") || farm.PlotsOwned > 0;

            state["farm"] = new
            {
                unlocked = unlocked,
                plots = plotsList,
                orchard = orchardList,
                crops = cropsList,
                tools = toolsObj,
                upgrades = upgradesObj,
                harvests = harvests
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "farm_plant" && type != "farm_water" && type != "farm_harvest" &&
                type != "farm_harvest_all" && type != "orchard_plant" && type != "orchard_harvest" &&
                type != "farm_buy")
            {
                return false;
            }

            var pet = brain?.Pet;
            if (pet == null) return true;

            pet.Balance.FarmActive = true;

            if (type == "farm_plant")
            {
                int plot = message?.Value<int?>("plot") ?? -1;
                string cropId = message?.Value<string>("cropId");
                if (string.IsNullOrEmpty(cropId) || plot < 0) return true;

                var res = pet.Plant(plot, cropId);
                if (res == FarmResult.UnknownCrop || res == FarmResult.NoSuchPlot)
                {
                    return true;
                }
                else if (res == FarmResult.Ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Planted!" });
                }
                else if (res == FarmResult.NoSeed)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
                else if (res == FarmResult.Occupied)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Something is in the way" });
                }
                else if (res == FarmResult.Locked || res == FarmResult.NotAnnual || res == FarmResult.Disabled)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "farm_water")
            {
                int plot = message?.Value<int?>("plot") ?? -1;
                if (plot < 0) return true;

                bool watered = pet.Water(plot);
                if (watered)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Watered!" });
                }
                else
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "farm_harvest")
            {
                int plot = message?.Value<int?>("plot") ?? -1;
                if (plot < 0) return true;

                var summary = pet.Harvest(plot);
                if (summary != null && summary.Count > 0)
                {
                    string txt = summary.GreatHarvest ? $"Great harvest! +{summary.Count}" : $"Harvested! +{summary.Count}";
                    HomeWindow.PostToPage(new { type = "toast", text = txt });
                }
                else
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "farm_harvest_all")
            {
                var summary = pet.HarvestAll();
                if (summary != null && summary.Count > 0)
                {
                    string txt = summary.GreatHarvest ? $"Great harvest! +{summary.Count}" : $"Harvested! +{summary.Count}";
                    HomeWindow.PostToPage(new { type = "toast", text = txt });
                }
                else
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "orchard_plant")
            {
                int slot = message?.Value<int?>("slot") ?? -1;
                string cropId = message?.Value<string>("cropId");
                if (string.IsNullOrEmpty(cropId) || slot < 0) return true;

                bool ok = pet.PlantOrchard(slot, cropId);
                if (ok)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Planted!" });
                }
                else
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "orchard_harvest")
            {
                int slot = message?.Value<int?>("slot") ?? -1;
                if (slot < 0) return true;

                var summary = pet.HarvestOrchard(slot);
                if (summary != null && summary.Count > 0)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = $"Harvested! +{summary.Count}" });
                }
                else
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
            }
            else if (type == "farm_buy")
            {
                string what = message?.Value<string>("what");
                string buyId = message?.Value<string>("id");

                if (string.Equals(what, "pack", StringComparison.OrdinalIgnoreCase))
                {
                    int cost = pet.BuyPlotPack();
                    if (cost > 0)
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Plots expanded!" });
                    }
                    else
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                    }
                }
                else if (string.Equals(what, "orchard", StringComparison.OrdinalIgnoreCase))
                {
                    int cost = pet.BuyOrchardSlot();
                    if (cost > 0)
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Orchard expanded!" });
                    }
                    else
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                    }
                }
                else if (string.Equals(what, "can", StringComparison.OrdinalIgnoreCase))
                {
                    int cost = pet.BuyCan(buyId ?? "can_2");
                    if (cost > 0)
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Watering can upgraded!" });
                    }
                    else
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                    }
                }
                else if (string.Equals(what, "sprinkler", StringComparison.OrdinalIgnoreCase))
                {
                    int cost = pet.BuySprinkler();
                    if (cost > 0)
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Sprinkler installed!" });
                    }
                    else
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                    }
                }
                else
                {
                    return true;
                }
            }

            try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] FarmFeature save: " + ex.Message); }
            HomeWindow.NotifyStateChanged();
            return true;
        }
    }
}
