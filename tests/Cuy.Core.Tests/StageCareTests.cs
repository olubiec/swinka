using System;
using System.Collections.Generic;
using System.IO;
using Xunit;

namespace Cuy.Core.Tests
{
    public class StageCareTests
    {
        [Fact]
        public void IsAvailableFor_NoStages_ReturnsTrue()
        {
            var def = new ItemDefinition { Id = "test" };
            Assert.True(def.IsAvailableFor(LifeStage.Baby));
            Assert.True(def.IsAvailableFor(LifeStage.Legend));
        }

        [Fact]
        public void IsAvailableFor_SpecifiedStages_MatchesCaseInsensitive()
        {
            var def = new ItemDefinition
            {
                Id = "test",
                Stages = new List<string> { "senior", "Legend", "ADULT" }
            };

            Assert.False(def.IsAvailableFor(LifeStage.Baby));
            Assert.False(def.IsAvailableFor(LifeStage.Junior));
            Assert.True(def.IsAvailableFor(LifeStage.Adult));
            Assert.True(def.IsAvailableFor(LifeStage.Senior));
            Assert.True(def.IsAvailableFor(LifeStage.Legend));
        }

        [Fact]
        public void Catalog_LoadsStagesAndDropsUnknownAndLogs()
        {
            string json = @"
            {
                ""items"": [
                    { ""id"": ""valid_item"", ""stages"": [""junior"", ""unknown_stage"", ""SENIOR""] },
                    { ""id"": ""all_stages"" }
                ]
            }";

            var logs = new List<string>();
            ItemCatalog.ErrorLogger = msg => logs.Add(msg);

            var catalog = ItemCatalog.LoadJson(json);

            var validItem = catalog.GetItem("valid_item");
            Assert.NotNull(validItem);
            Assert.Equal(2, validItem.Stages.Count);
            Assert.Contains("junior", validItem.Stages);
            Assert.Contains("senior", validItem.Stages);

            var allStagesItem = catalog.GetItem("all_stages");
            Assert.NotNull(allStagesItem);
            Assert.Empty(allStagesItem.Stages);

            Assert.Contains(logs, l => l.Contains("Unknown stage 'unknown_stage'"));
        }

        [Fact]
        public void RankFeedItems_DropsUnknownAndStageLocked()
        {
            var catalog = new ItemCatalog(new List<ItemDefinition>
            {
                new ItemDefinition { Id = "apple" },
                new ItemDefinition { Id = "soft_pellets", Stages = new List<string> { "baby" } },
                new ItemDefinition { Id = "hard_pellets", Stages = new List<string> { "adult", "senior", "legend" } }
            });

            var clock = new Cuy.Core.Time.ManualClock(DateTime.UtcNow);
            var pet = new Pet(GameState.CreateNew("Test", clock.UtcNow), clock);
            // Default stage is baby (birthdate is now)
            var rankedForBaby = pet.RankFeedItems(new[] { "apple", "soft_pellets", "hard_pellets", "unknown_item" }, catalog);

            Assert.Equal(2, rankedForBaby.Count);
            Assert.Contains("apple", rankedForBaby);
            Assert.Contains("soft_pellets", rankedForBaby);
            Assert.DoesNotContain("hard_pellets", rankedForBaby);
            Assert.DoesNotContain("unknown_item", rankedForBaby);

            // Change stage to senior
            pet.State.BirthDateUtc = pet.Clock.UtcNow.AddDays(-LifeStages.SeniorFromPigDays / Balance.CreateDefault().PigDaysPerRealDay - 1);
            pet.State.Stage = LifeStage.Senior; // Manually update for the test since time isn't ticking
            var rankedForSenior = pet.RankFeedItems(new[] { "apple", "soft_pellets", "hard_pellets", "unknown_item" }, catalog);

            Assert.Equal(2, rankedForSenior.Count);
            Assert.Contains("apple", rankedForSenior);
            Assert.Contains("hard_pellets", rankedForSenior);
            Assert.DoesNotContain("soft_pellets", rankedForSenior);
        }

        [Fact]
        public void RankFeedItems_AllNeedsHigh_KeepsInputOrder()
        {
            var catalog = new ItemCatalog(new List<ItemDefinition>
            {
                new ItemDefinition { Id = "b", Effects = new Dictionary<string, double> { { "fullness", 10 } } },
                new ItemDefinition { Id = "a", Effects = new Dictionary<string, double> { { "fullness", 50 } } },
                new ItemDefinition { Id = "c", Effects = new Dictionary<string, double> { { "fullness", 20 } } }
            });

            var clock = new Cuy.Core.Time.ManualClock(DateTime.UtcNow);
            var pet = new Pet(GameState.CreateNew("Test", clock.UtcNow), clock);
            // Needs are 100 by default
            var ranked = pet.RankFeedItems(new[] { "b", "a", "c" }, catalog);

            Assert.Equal(3, ranked.Count);
            Assert.Equal("b", ranked[0]);
            Assert.Equal("a", ranked[1]);
            Assert.Equal("c", ranked[2]);
        }

        [Fact]
        public void RankFeedItems_LowTeeth_RanksChewStickFirst()
        {
            var catalog = new ItemCatalog(new List<ItemDefinition>
            {
                new ItemDefinition { Id = "hay", Effects = new Dictionary<string, double> { { "fullness", 20 }, { "teeth", 5 } } },
                new ItemDefinition { Id = "chew_stick", Effects = new Dictionary<string, double> { { "teeth", 30 } } },
                new ItemDefinition { Id = "apple", Effects = new Dictionary<string, double> { { "fullness", 15 } } }
            });

            var clock = new Cuy.Core.Time.ManualClock(DateTime.UtcNow);
            var pet = new Pet(GameState.CreateNew("Test", clock.UtcNow), clock);
            pet.State.Needs.Teeth = 20; // < 30
            pet.State.Needs.Satiety = 100;

            var ranked = pet.RankFeedItems(new[] { "hay", "chew_stick", "apple" }, catalog);

            Assert.Equal(3, ranked.Count);
            Assert.Equal("chew_stick", ranked[0]); // 30 effect on teeth
            Assert.Equal("hay", ranked[1]); // 5 effect on teeth
            Assert.Equal("apple", ranked[2]); // 0 effect on teeth
        }

        [Fact]
        public void RankFeedItems_MultipleLowNeeds_SumsEffects()
        {
             var catalog = new ItemCatalog(new List<ItemDefinition>
            {
                new ItemDefinition { Id = "item1", Effects = new Dictionary<string, double> { { "fullness", 10 }, { "teeth", 10 } } },
                new ItemDefinition { Id = "item2", Effects = new Dictionary<string, double> { { "fullness", 30 } } },
                new ItemDefinition { Id = "item3", Effects = new Dictionary<string, double> { { "teeth", 25 } } }
            });

            var clock = new Cuy.Core.Time.ManualClock(DateTime.UtcNow);
            var pet = new Pet(GameState.CreateNew("Test", clock.UtcNow), clock);
            pet.State.Needs.Teeth = 20; // < 30
            pet.State.Needs.Satiety = 25; // < 30

            // item1 score: 10 + 10 = 20
            // item2 score: 30 + 0 = 30
            // item3 score: 0 + 25 = 25

            var ranked = pet.RankFeedItems(new[] { "item1", "item2", "item3" }, catalog);

            Assert.Equal(3, ranked.Count);
            Assert.Equal("item2", ranked[0]); // 30
            Assert.Equal("item3", ranked[1]); // 25
            Assert.Equal("item1", ranked[2]); // 20
        }

        [Fact]
        public void RepoFile_RealJsonTest()
        {
            string baseDir = AppContext.BaseDirectory;
            string repoRoot = baseDir;
            while (!string.IsNullOrEmpty(repoRoot) && !File.Exists(Path.Combine(repoRoot, "Cuy.sln")))
            {
                repoRoot = Path.GetDirectoryName(repoRoot);
            }

            Assert.NotNull(repoRoot);

            string itemsFile = Path.Combine(repoRoot, "assets", "data", "items.json");
            string itemsShopFile = Path.Combine(repoRoot, "assets", "data", "items_shop.json");
            string itemsDecorFile = Path.Combine(repoRoot, "assets", "data", "items_decor.json");

            var jsons = new List<string>
            {
                File.ReadAllText(itemsFile),
                File.ReadAllText(itemsShopFile),
                File.ReadAllText(itemsDecorFile)
            };

            var catalog = ItemCatalog.LoadJsonFiles(jsons);

            var clock = new Cuy.Core.Time.ManualClock(DateTime.UtcNow);
            var pet = new Pet(GameState.CreateNew("Test", clock.UtcNow), clock);
            pet.State.Needs.Teeth = 20;
            pet.State.Needs.Satiety = 100;

            // Use some real IDs that exist in the JSON files
            var ranked = pet.RankFeedItems(new[] { "hay", "chew_stick", "apple" }, catalog);

            Assert.True(ranked.Count > 0);

            // Chew stick should be ranked before hay because it has a higher teeth effect
            var rankedList = new List<string>(ranked);
            int chewStickIndex = rankedList.IndexOf("chew_stick");
            int hayIndex = rankedList.IndexOf("hay");

            if (chewStickIndex != -1 && hayIndex != -1)
            {
                 Assert.True(chewStickIndex < hayIndex);
            }
        }
    }
}