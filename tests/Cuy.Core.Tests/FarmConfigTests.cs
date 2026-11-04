using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class FarmConfigTests
    {
        private static string RepoFile(string relativePath)
        {
            var dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Directory.GetParent(dir)?.FullName;
            }
            if (dir == null)
            {
                throw new InvalidOperationException("Could not find Cuy.sln repository root.");
            }
            return Path.Combine(dir, relativePath);
        }

        [Fact]
        public void RealFarmJson_LoadsExpectedNumbersAndLists()
        {
            string farmPath = RepoFile("assets/data/farm.json");
            var config = FarmConfig.LoadFromFile(farmPath);

            Assert.NotNull(config);
            Assert.Equal(15, config.Crops.Count);

            int annualCount = config.Crops.Count(c => c.Kind == CropKind.Annual);
            int perennialCount = config.Crops.Count(c => c.Kind == CropKind.Perennial);
            Assert.Equal(11, annualCount);
            Assert.Equal(4, perennialCount);

            Assert.Equal(24, config.TotalPlots);
            Assert.Equal(4, config.StartPlots);
            Assert.Equal(5, config.PlotPacks.Count);
            Assert.Equal(4, config.OrchardSlots.Count);

            Assert.True(config.StarterSeeds.ContainsKey("seed_dandelion"));
            Assert.True(config.StarterSeeds.ContainsKey("seed_cilantro"));
            Assert.True(config.StarterSeeds.ContainsKey("seed_parsley"));
            Assert.Equal(2, config.StarterSeeds["seed_dandelion"]);
            Assert.Equal(2, config.StarterSeeds["seed_cilantro"]);
            Assert.Equal(2, config.StarterSeeds["seed_parsley"]);

            Assert.Contains("onion", config.ForbiddenFoods);
            Assert.Contains("chocolate", config.ForbiddenFoods);
        }

        [Fact]
        public void RealCrops_ItemsAndSeedsExistInItemFilesWithMatchingSeedPrices()
        {
            string farmPath = RepoFile("assets/data/farm.json");
            var config = FarmConfig.LoadFromFile(farmPath);

            // Parse items.json, items_shop.json and items_farm.json directly with JObject.Parse
            var allItems = new Dictionary<string, JObject>(StringComparer.OrdinalIgnoreCase);

            string[] itemFiles = new[]
            {
                RepoFile("assets/data/items.json"),
                RepoFile("assets/data/items_shop.json"),
                RepoFile("assets/data/items_farm.json")
            };

            foreach (var file in itemFiles)
            {
                if (!File.Exists(file)) continue;
                var root = JObject.Parse(File.ReadAllText(file));
                if (root["items"] is JArray itemsArray)
                {
                    foreach (var itemToken in itemsArray)
                    {
                        if (itemToken is JObject itemObj)
                        {
                            string id = itemObj.Value<string>("id");
                            if (!string.IsNullOrEmpty(id) && !allItems.ContainsKey(id))
                            {
                                allItems[id] = itemObj;
                            }
                        }
                    }
                }
            }

            foreach (var crop in config.Crops)
            {
                Assert.True(allItems.ContainsKey(crop.ItemId),
                    $"Crop '{crop.Id}' refers to item '{crop.ItemId}' which does not exist in items JSON files.");

                Assert.True(allItems.ContainsKey(crop.SeedItemId),
                    $"Crop '{crop.Id}' refers to seed '{crop.SeedItemId}' which does not exist in items JSON files.");

                var seedObj = allItems[crop.SeedItemId];
                int seedPrice = seedObj.Value<int?>("price") ?? -1;
                Assert.Equal(crop.SeedPrice, seedPrice);
            }
        }

        [Fact]
        public void RealCrops_SellingPriceWithWiggleIsBelowBuyingPriceWithDiscount()
        {
            string farmPath = RepoFile("assets/data/farm.json");
            var config = FarmConfig.LoadFromFile(farmPath);

            var allItems = new Dictionary<string, JObject>(StringComparer.OrdinalIgnoreCase);
            string[] itemFiles = new[]
            {
                RepoFile("assets/data/items.json"),
                RepoFile("assets/data/items_shop.json"),
                RepoFile("assets/data/items_farm.json")
            };

            foreach (var file in itemFiles)
            {
                if (!File.Exists(file)) continue;
                var root = JObject.Parse(File.ReadAllText(file));
                if (root["items"] is JArray itemsArray)
                {
                    foreach (var itemToken in itemsArray)
                    {
                        if (itemToken is JObject itemObj)
                        {
                            string id = itemObj.Value<string>("id");
                            if (!string.IsNullOrEmpty(id) && !allItems.ContainsKey(id))
                            {
                                allItems[id] = itemObj;
                            }
                        }
                    }
                }
            }

            foreach (var crop in config.Crops)
            {
                Assert.True(allItems.ContainsKey(crop.ItemId));
                int buyPrice = allItems[crop.ItemId].Value<int>("price");

                double maxSellingPrice = crop.SellPrice * 1.15;
                double minBuyingPrice = buyPrice * 0.85;

                Assert.True(maxSellingPrice < minBuyingPrice,
                    $"Arbitrage risk for crop '{crop.Id}': sell * 1.15 ({maxSellingPrice}) is not < buy * 0.85 ({minBuyingPrice})");
            }
        }

        [Fact]
        public void RealCrops_AnnualUnlockThresholdsAreNonDecreasingInFileOrder()
        {
            string farmPath = RepoFile("assets/data/farm.json");
            var config = FarmConfig.LoadFromFile(farmPath);

            var annualCrops = config.Crops.Where(c => c.Kind == CropKind.Annual).ToList();
            int previousThreshold = -1;

            foreach (var crop in annualCrops)
            {
                Assert.True(crop.UnlockHarvests >= previousThreshold,
                    $"Annual crop '{crop.Id}' unlock {crop.UnlockHarvests} is lower than previous {previousThreshold}");
                previousThreshold = crop.UnlockHarvests;
            }
        }

        [Fact]
        public void CropWithForbiddenItem_IsSkipped()
        {
            string json = @"{
                ""forbidden_foods"": [""onion"", ""poison_berry""],
                ""crops"": [
                    {
                        ""id"": ""good_crop"",
                        ""item"": ""good_crop"",
                        ""kind"": ""annual"",
                        ""seed_item"": ""seed_good"",
                        ""seed_price"": 3,
                        ""grow_minutes"": 60,
                        ""yield"": 2,
                        ""sell_price"": 3,
                        ""unlock_harvests"": 0
                    },
                    {
                        ""id"": ""bad_crop"",
                        ""item"": ""poison_berry"",
                        ""kind"": ""annual"",
                        ""seed_item"": ""seed_bad"",
                        ""seed_price"": 3,
                        ""grow_minutes"": 60,
                        ""yield"": 2,
                        ""sell_price"": 3,
                        ""unlock_harvests"": 0
                    }
                ]
            }";

            var config = FarmConfig.Load(json);
            Assert.Single(config.Crops);
            Assert.Equal("good_crop", config.Crops[0].Id);
            Assert.Null(config.Find("bad_crop"));
        }

        [Fact]
        public void BrokenJson_ReturnsCodeDefaults()
        {
            var config = FarmConfig.Load("{ broken json {{{");

            Assert.NotNull(config);
            Assert.Equal(3, config.Crops.Count);
            Assert.NotNull(config.Find("dandelion"));
            Assert.NotNull(config.Find("cilantro"));
            Assert.NotNull(config.Find("parsley"));
            Assert.Equal(24, config.TotalPlots);
            Assert.Contains("onion", config.ForbiddenFoods);
            Assert.Contains("chocolate", config.ForbiddenFoods);
        }

        [Fact]
        public void EmptyJson_ReturnsCodeDefaults()
        {
            var config = FarmConfig.Load("");
            Assert.NotNull(config);
            Assert.Equal(3, config.Crops.Count);
        }

        [Fact]
        public void UnknownFields_AreIgnored()
        {
            string json = @"{
                ""unknown_top_field"": ""ignored_value"",
                ""future_expansion"": 999,
                ""start_plots"": 6,
                ""crops"": [
                    {
                        ""id"": ""test_crop"",
                        ""item"": ""test_crop"",
                        ""kind"": ""annual"",
                        ""seed_item"": ""seed_test"",
                        ""seed_price"": 5,
                        ""grow_minutes"": 100,
                        ""yield"": 2,
                        ""sell_price"": 4,
                        ""unlock_harvests"": 0,
                        ""mystery_trait"": ""shiny""
                    }
                ]
            }";

            var config = FarmConfig.Load(json);
            Assert.Equal(6, config.StartPlots);
            Assert.Single(config.Crops);
            Assert.Equal("test_crop", config.Crops[0].Id);
        }

        [Fact]
        public void DuplicateCropIds_KeepFirst()
        {
            string json = @"{
                ""crops"": [
                    {
                        ""id"": ""dandelion"",
                        ""item"": ""dandelion"",
                        ""kind"": ""annual"",
                        ""seed_item"": ""seed_dandelion"",
                        ""seed_price"": 3,
                        ""grow_minutes"": 60,
                        ""yield"": 2,
                        ""sell_price"": 3,
                        ""unlock_harvests"": 0
                    },
                    {
                        ""id"": ""dandelion"",
                        ""item"": ""dandelion"",
                        ""kind"": ""annual"",
                        ""seed_item"": ""seed_dandelion"",
                        ""seed_price"": 99,
                        ""grow_minutes"": 120,
                        ""yield"": 4,
                        ""sell_price"": 50,
                        ""unlock_harvests"": 10
                    }
                ]
            }";

            var config = FarmConfig.Load(json);
            Assert.Single(config.Crops);
            Assert.Equal(3, config.Crops[0].SeedPrice);
            Assert.Equal(60, config.Crops[0].GrowMinutes);
        }

        [Fact]
        public void ClampingRules_EnforceSafeBounds()
        {
            string json = @"{
                ""crops"": [
                    {
                        ""id"": ""too_fast_and_zero_yield"",
                        ""item"": ""item1"",
                        ""kind"": ""annual"",
                        ""seed_item"": ""seed1"",
                        ""seed_price"": 0,
                        ""grow_minutes"": 10,
                        ""yield"": 0,
                        ""sell_price"": -5,
                        ""unlock_harvests"": 0
                    },
                    {
                        ""id"": ""too_slow_and_huge_yield"",
                        ""item"": ""item2"",
                        ""kind"": ""annual"",
                        ""seed_item"": ""seed2"",
                        ""seed_price"": -2,
                        ""grow_minutes"": 5000,
                        ""yield"": 10,
                        ""sell_price"": 0,
                        ""unlock_harvests"": 0
                    }
                ]
            }";

            var config = FarmConfig.Load(json);
            Assert.Equal(2, config.Crops.Count);

            var crop1 = config.Find("too_fast_and_zero_yield");
            Assert.Equal(30, crop1.GrowMinutes);
            Assert.Equal(1, crop1.Yield);
            Assert.Equal(1, crop1.SeedPrice);
            Assert.Equal(1, crop1.SellPrice);

            var crop2 = config.Find("too_slow_and_huge_yield");
            Assert.Equal(1440, crop2.GrowMinutes);
            Assert.Equal(4, crop2.Yield);
            Assert.Equal(1, crop2.SeedPrice);
            Assert.Equal(1, crop2.SellPrice);
        }

        [Fact]
        public void PerennialWithoutMaxStock_GetsTwiceYield()
        {
            string json = @"{
                ""crops"": [
                    {
                        ""id"": ""apple_test"",
                        ""item"": ""apple_test"",
                        ""kind"": ""perennial"",
                        ""seed_item"": ""sapling_apple"",
                        ""seed_price"": 50,
                        ""grow_minutes"": 300,
                        ""yield"": 3,
                        ""sell_price"": 5,
                        ""unlock_harvests"": 10
                    }
                ]
            }";

            var config = FarmConfig.Load(json);
            var crop = config.Find("apple_test");
            Assert.NotNull(crop);
            Assert.Equal(CropKind.Perennial, crop.Kind);
            Assert.Equal(3, crop.Yield);
            Assert.Equal(6, crop.MaxStock);
        }

        [Fact]
        public void Find_IsCaseInsensitive_AndReturnsNullWhenNotFound()
        {
            var config = FarmConfig.CreateDefault();
            Assert.NotNull(config.Find("DANDELION"));
            Assert.NotNull(config.Find("dandelion"));
            Assert.Null(config.Find("unknown_crop"));
            Assert.Null(config.Find(null));
            Assert.Null(config.Find(""));
        }
    }
}
