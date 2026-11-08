using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using Xunit;
using Cuy.Core;

namespace Cuy.Core.Tests
{
    public class DataValidationTests
    {
        private static readonly HashSet<string> CanonicalNeeds = new(StringComparer.OrdinalIgnoreCase)
        {
            "fullness",
            "vitamin_c",
            "energy",
            "mood",
            "cleanliness",
            "teeth"
        };

        private static readonly string[] CanonicalBaseItems =
        {
            "hay",
            "pellets",
            "bell_pepper",
            "parsley",
            "kale",
            "cucumber",
            "carrot",
            "chew_stick",
            "water_bottle",
            "cake"
        };

        private static string RepoFile(string relativePath)
        {
            string? dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    return Path.Combine(dir, relativePath);
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Cannot find repo root to resolve {relativePath}");
        }

        private static string RepoDirectory(string relativePath = "")
        {
            string? dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    return string.IsNullOrEmpty(relativePath) ? dir : Path.Combine(dir, relativePath);
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException("Cannot find repo root with Cuy.sln");
        }

        [Fact]
        public void EveryJsonFile_InAssetsData_ParsesSuccessfully()
        {
            var dataDir = RepoDirectory("assets/data");
            var jsonFiles = Directory.GetFiles(dataDir, "*.json");

            Assert.NotEmpty(jsonFiles);
            Assert.True(jsonFiles.Length >= 20, $"Expected at least 20 JSON files in assets/data, found {jsonFiles.Length}");

            foreach (var filePath in jsonFiles)
            {
                var fileName = Path.GetFileName(filePath);
                var content = File.ReadAllText(filePath);
                Assert.False(string.IsNullOrWhiteSpace(content), $"File {fileName} is empty");

                var parsed = JToken.Parse(content);
                Assert.NotNull(parsed);
            }
        }

        [Fact]
        public void NeedIds_ConformToCanonicalIds()
        {
            // 1. Verify C# Need enum maps to the canonical need IDs
            var enumNeedKeys = NeedNames.All.Select(NeedNames.DataKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
            Assert.Equal(CanonicalNeeds, enumNeedKeys);

            // 2. Validate actions.json
            var actionsJson = File.ReadAllText(RepoFile("assets/data/actions.json"));
            var actionsToken = JObject.Parse(actionsJson);

            var needsArr = actionsToken["needs"] as JArray;
            Assert.NotNull(needsArr);
            var actionNeeds = needsArr.Select(t => t.ToString()).ToHashSet(StringComparer.OrdinalIgnoreCase);
            Assert.Equal(CanonicalNeeds, actionNeeds);

            var decayObj = actionsToken["decay_per_hour"] as JObject;
            Assert.NotNull(decayObj);
            foreach (var prop in decayObj.Properties())
            {
                Assert.Contains(prop.Name, CanonicalNeeds);
            }

            // 3. Validate health.json condition triggers and extra decays
            var healthJson = File.ReadAllText(RepoFile("assets/data/health.json"));
            var healthToken = JObject.Parse(healthJson);
            var conditions = healthToken["conditions"] as JArray;
            Assert.NotNull(conditions);

            foreach (var cond in conditions)
            {
                var triggerNeed = (string?)cond["trigger"]?["need"];
                if (!string.IsNullOrEmpty(triggerNeed))
                {
                    Assert.Contains(triggerNeed, CanonicalNeeds);
                }

                var cureNeed = (string?)cond["treatment"]?["cure_need"]?["need"];
                if (!string.IsNullOrEmpty(cureNeed))
                {
                    Assert.Contains(cureNeed, CanonicalNeeds);
                }

                var extraDecay = cond["extra_decay_per_hour"] as JObject;
                if (extraDecay != null)
                {
                    foreach (var prop in extraDecay.Properties())
                    {
                        Assert.Contains(prop.Name, CanonicalNeeds);
                    }
                }
            }

            // 4. Validate simulation.json
            var simJson = File.ReadAllText(RepoFile("assets/data/simulation.json"));
            var simToken = JObject.Parse(simJson);

            var careMin = simToken["with_care_min"] as JObject;
            if (careMin != null)
            {
                foreach (var prop in careMin.Properties())
                {
                    Assert.Contains(prop.Name, CanonicalNeeds);
                }
            }

            var noCareMin = simToken["weekend_no_care_min"] as JObject;
            if (noCareMin != null)
            {
                foreach (var prop in noCareMin.Properties())
                {
                    Assert.Contains(prop.Name, CanonicalNeeds);
                }
            }

            // 5. Validate item effect need names across all items*.json
            var dataDir = RepoDirectory("assets/data");
            var itemFiles = Directory.GetFiles(dataDir, "items*.json");
            var nonNeedKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "teeth_decay_multiplier",
                "sleep_energy_multiplier"
            };

            foreach (var file in itemFiles)
            {
                var json = File.ReadAllText(file);
                var jObj = JObject.Parse(json);
                var items = jObj["items"] as JArray;
                if (items == null) continue;

                foreach (var item in items)
                {
                    var effects = item["effects"] as JObject;
                    if (effects == null) continue;

                    foreach (var prop in effects.Properties())
                    {
                        if (nonNeedKeys.Contains(prop.Name)) continue;
                        Assert.Contains(prop.Name, CanonicalNeeds);
                    }
                }
            }
        }

        [Fact]
        public void BaseItemIds_InItemsJson_ConformToCanonicalIds()
        {
            var itemsJsonPath = RepoFile("assets/data/items.json");
            var itemsJson = File.ReadAllText(itemsJsonPath);
            var root = JObject.Parse(itemsJson);

            var itemsArr = root["items"] as JArray;
            Assert.NotNull(itemsArr);

            var loadedItemIds = itemsArr.Select(t => (string?)t["id"]).ToList();
            Assert.Equal(CanonicalBaseItems, loadedItemIds);
        }

        [Fact]
        public void AllItemDefinitions_HaveUniqueValidIds()
        {
            var dataDir = RepoDirectory("assets/data");
            var itemFiles = Directory.GetFiles(dataDir, "items*.json");
            var allIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var idRegex = new Regex("^[a-z0-9_]+$");

            foreach (var file in itemFiles)
            {
                var fileName = Path.GetFileName(file);
                var json = File.ReadAllText(file);
                var jObj = JObject.Parse(json);
                var items = jObj["items"] as JArray;
                Assert.NotNull(items);

                foreach (var item in items)
                {
                    var id = (string?)item["id"];
                    Assert.False(string.IsNullOrWhiteSpace(id), $"Item in {fileName} has an empty id");
                    Assert.Matches(idRegex, id!);
                    Assert.True(allIds.Add(id!), $"Duplicate item ID '{id}' found in {fileName}");
                }
            }
        }

        [Fact]
        public void ReferencedItemIds_InOtherDataFiles_ConformToCanonicalItems()
        {
            // Build canonical item set from items.json and items_*.json
            var dataDir = RepoDirectory("assets/data");
            var itemFiles = Directory.GetFiles(dataDir, "items*.json");
            var knownItemIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var file in itemFiles)
            {
                var json = File.ReadAllText(file);
                var jObj = JObject.Parse(json);
                var items = jObj["items"] as JArray;
                if (items == null) continue;

                foreach (var item in items)
                {
                    var id = (string?)item["id"];
                    if (!string.IsNullOrEmpty(id))
                    {
                        knownItemIds.Add(id!);
                    }
                }
            }

            // Check farm.json starter seeds and crops
            var farmJson = File.ReadAllText(RepoFile("assets/data/farm.json"));
            var farmObj = JObject.Parse(farmJson);

            var starterSeeds = farmObj["starter_seeds"] as JObject;
            if (starterSeeds != null)
            {
                foreach (var prop in starterSeeds.Properties())
                {
                    Assert.Contains(prop.Name, knownItemIds);
                }
            }

            var crops = farmObj["crops"] as JArray;
            if (crops != null)
            {
                foreach (var crop in crops)
                {
                    var cropItem = (string?)crop["item"];
                    var seedItem = (string?)crop["seed_item"];

                    if (!string.IsNullOrEmpty(cropItem))
                    {
                        Assert.Contains(cropItem!, knownItemIds);
                    }
                    if (!string.IsNullOrEmpty(seedItem))
                    {
                        Assert.Contains(seedItem!, knownItemIds);
                    }
                }
            }

            // Check pigs_named.json welcome items
            var pigsJson = File.ReadAllText(RepoFile("assets/data/pigs_named.json"));
            var pigsObj = JObject.Parse(pigsJson);
            var welcomeItems = pigsObj["welcome"]?["items"] as JObject;
            if (welcomeItems != null)
            {
                foreach (var prop in welcomeItems.Properties())
                {
                    Assert.Contains(prop.Name, knownItemIds);
                }
            }
        }

        [Fact]
        public void EveryItem_HasIconInIconsJson()
        {
            var iconsJsonPath = RepoFile("assets/icons/icons.json");
            var iconsJson = File.ReadAllText(iconsJsonPath);
            var iconsObj = JObject.Parse(iconsJson)["icons"] as JObject;
            Assert.NotNull(iconsObj);

            var validIconNames = iconsObj!.Properties()
                .Select(p => p.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var dataDir = RepoDirectory("assets/data");
            var itemFiles = Directory.GetFiles(dataDir, "items*.json");

            var allJsonTexts = new List<string>();

            foreach (var file in itemFiles)
            {
                var fileName = Path.GetFileName(file);
                var content = File.ReadAllText(file);
                allJsonTexts.Add(content);

                var jObj = JObject.Parse(content);
                var items = jObj["items"] as JArray;
                if (items == null) continue;

                foreach (var tok in items)
                {
                    var id = (string?)tok["id"];
                    Assert.False(string.IsNullOrWhiteSpace(id), $"Item in {fileName} missing id");

                    var iconName = (string?)tok["icon"] ?? id!;
                    Assert.True(validIconNames.Contains(iconName),
                        $"Item '{id}' in {fileName} references icon '{iconName}' which does not exist in icons.json");
                }
            }

            // Verify with ItemCatalog loader as well
            var catalog = ItemCatalog.LoadJsonFiles(allJsonTexts);
            Assert.NotEmpty(catalog.AllItems);

            foreach (var item in catalog.AllItems)
            {
                Assert.True(validIconNames.Contains(item.IconName),
                    $"Catalog item '{item.Id}' references icon '{item.IconName}' which does not exist in icons.json");
            }
        }
    }
}
