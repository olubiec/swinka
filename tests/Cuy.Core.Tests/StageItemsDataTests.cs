using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using Xunit;
using Cuy.Core;

namespace Cuy.Core.Tests
{
    public class StageItemsDataTests
    {
        private string RepoFile(string relativePath)
        {
            var dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Path.GetDirectoryName(dir);
            }
            if (dir == null) throw new Exception("Could not find repo root");
            return Path.Combine(dir, relativePath);
        }

        [Fact]
        public void NewStageItems_AreValidAndNotDuplicated()
        {
            var itemsJsonPath = RepoFile("assets/data/items.json");
            var itemsShopJsonPath = RepoFile("assets/data/items_shop.json");
            var itemsDecorJsonPath = RepoFile("assets/data/items_decor.json");
            var iconsJsonPath = RepoFile("assets/icons/icons.json");

            var itemsJson = File.ReadAllText(itemsJsonPath);
            var itemsShopJson = File.ReadAllText(itemsShopJsonPath);
            var itemsDecorJson = File.ReadAllText(itemsDecorJsonPath);
            var iconsJsonText = File.ReadAllText(iconsJsonPath);

            var catalog = ItemCatalog.LoadJsonFiles(new[] { itemsJson, itemsShopJson, itemsDecorJson });

            // Ensure the 5 items exist
            var newItems = new[] { "soft_pellets", "warm_house_bed", "dental_chew", "vitamin_mix", "carrot_top" };
            foreach (var itemId in newItems)
            {
                var item = catalog.GetItem(itemId);
                Assert.NotNull(item);
                // Check if they have a price or are marked unbuyable
                Assert.True(item.Price.HasValue || !item.CanBuy, $"Item {itemId} should have a valid price or not be buyable.");
            }

            // Ensure no duplicate IDs
            // Count unique items by loading all of them from JSON manually or by checking length vs set size
            // Wait, ItemCatalog already drops duplicates and logs it. We can just manually check files
            var allIds = new HashSet<string>();
            var allJsons = new[] { itemsJson, itemsShopJson, itemsDecorJson };
            foreach (var jsonStr in allJsons)
            {
                var jObj = JObject.Parse(jsonStr);
                var itemsArr = jObj["items"] as JArray;
                if (itemsArr != null)
                {
                    foreach (var tok in itemsArr)
                    {
                        var id = (string)tok["id"];
                        if (id != null)
                        {
                            Assert.True(allIds.Add(id), $"Duplicate item ID found: {id}");
                        }
                    }
                }
            }

            // Check icons exist in icons.json
            var iconsJObj = JObject.Parse(iconsJsonText);
            var iconsObj = iconsJObj["icons"] as JObject;
            Assert.NotNull(iconsObj);

            foreach (var itemId in newItems)
            {
                var item = catalog.GetItem(itemId);
                Assert.NotNull(iconsObj[item.IconName]);
            }
        }

        [Fact]
        public void ShopItems_HaveValidStages()
        {
            var itemsShopJsonPath = RepoFile("assets/data/items_shop.json");
            var itemsShopJson = File.ReadAllText(itemsShopJsonPath);

            var validStages = new HashSet<string> { "baby", "junior", "adult", "senior", "legend" };

            var jObj = JObject.Parse(itemsShopJson);
            var itemsArr = jObj["items"] as JArray;
            Assert.NotNull(itemsArr);

            var seniorItems = new[] { "soft_pellets", "warm_house_bed", "vitamin_mix" };

            foreach (var tok in itemsArr)
            {
                var id = (string)tok["id"];
                var stagesTok = tok["stages"] as JArray;

                if (stagesTok != null)
                {
                    var itemStages = stagesTok.Select(t => (string)t).ToList();
                    foreach (var stage in itemStages)
                    {
                        Assert.Contains(stage, validStages);
                    }

                    if (seniorItems.Contains(id))
                    {
                        Assert.Equal(2, itemStages.Count);
                        Assert.Contains("senior", itemStages);
                        Assert.Contains("legend", itemStages);
                    }
                }
            }
        }
    }
}
