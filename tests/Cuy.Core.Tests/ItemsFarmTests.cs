using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class ItemsFarmTests
    {
        private static string RepoFile(string relativePath)
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
        public void Catalog_ContainsFarmItems_WithCorrectPricesAndCategories()
        {
            var catalog = ItemCatalog.LoadDefault();

            // seed_parsley: price 4, category seed
            var seedParsley = catalog.GetItem("seed_parsley");
            Assert.NotNull(seedParsley);
            Assert.Equal(4, seedParsley.Price);
            Assert.Equal("seed", seedParsley.Category);
            Assert.True(seedParsley.CanBuy);

            // sapling_apple: price 100, category seed
            var saplingApple = catalog.GetItem("sapling_apple");
            Assert.NotNull(saplingApple);
            Assert.Equal(100, saplingApple.Price);
            Assert.Equal("seed", saplingApple.Category);
            Assert.True(saplingApple.CanBuy);

            // blueberry: price 14, category treat, daily_limit 1
            var blueberry = catalog.GetItem("blueberry");
            Assert.NotNull(blueberry);
            Assert.Equal(14, blueberry.Price);
            Assert.Equal("treat", blueberry.Category);
            Assert.Equal(1, blueberry.DailyLimit);
            Assert.True(blueberry.CanBuy);

            // romaine_lettuce: price 7, category vegetable
            var romaine = catalog.GetItem("romaine_lettuce");
            Assert.NotNull(romaine);
            Assert.Equal(7, romaine.Price);
            Assert.Equal("vegetable", romaine.Category);
            Assert.True(romaine.CanBuy);

            // Check all 7 foods from items_farm.json exist
            string[] foods = { "cilantro", "basil", "romaine_lettuce", "zucchini", "cherry_tomato", "blueberry", "pear" };
            foreach (var foodId in foods)
            {
                var item = catalog.GetItem(foodId);
                Assert.NotNull(item);
                Assert.True(catalog.IsFood(foodId), $"Item {foodId} should be recognized as food.");
            }

            // Check all 15 seeds/saplings exist with category 'seed'
            string[] seeds = {
                "seed_dandelion", "seed_cilantro", "seed_parsley", "seed_basil",
                "seed_romaine_lettuce", "seed_cucumber", "seed_kale", "seed_zucchini",
                "seed_bell_pepper", "seed_carrot", "seed_cherry_tomato",
                "sapling_strawberry", "sapling_apple", "sapling_blueberry", "sapling_pear"
            };
            foreach (var seedId in seeds)
            {
                var item = catalog.GetItem(seedId);
                Assert.NotNull(item);
                Assert.Equal("seed", item.Category);
                Assert.False(catalog.IsFood(seedId), $"Seed {seedId} must not be classified as food.");
            }
        }

        [Fact]
        public void Feed_Vegetable_AppliesEffectsWhenFed()
        {
            var catalog = ItemCatalog.LoadDefault();
            var clock = new ManualClock(new DateTime(2026, 11, 4, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);

            // Set known starting needs
            pet.Needs.Satiety = 50.0;
            pet.Needs.VitaminC = 50.0;
            pet.Needs.Mood = 50.0;

            // romaine_lettuce: effects are fullness 8, vitamin_c 6, mood 3
            var romaine = catalog.GetItem("romaine_lettuce");
            Assert.NotNull(romaine);
            Assert.Equal(8.0, romaine.GetEffect("fullness"));
            Assert.Equal(6.0, romaine.GetEffect("vitamin_c"));
            Assert.Equal(3.0, romaine.GetEffect("mood"));

            bool fed = catalog.Feed(pet, "romaine_lettuce");
            Assert.True(fed);

            Assert.Equal(58.0, pet.Needs.Satiety);
            Assert.Equal(56.0, pet.Needs.VitaminC);
            Assert.Equal(53.0, pet.Needs.Mood);
            Assert.Equal(1, pet.State.Stats.Counters["feedings"]);
            Assert.Equal(1, pet.State.Stats.Counters["eaten_romaine_lettuce"]);
        }

        [Fact]
        public void Feed_Treat_RespectsDailyLimit()
        {
            var catalog = ItemCatalog.LoadDefault();
            var clock = new ManualClock(new DateTime(2026, 11, 4, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);

            pet.Needs.Satiety = 50.0;
            pet.Needs.VitaminC = 50.0;
            pet.Needs.Mood = 50.0;

            // blueberry: category treat, daily_limit 1, fullness 3, vitamin_c 6, mood 10
            var blueberry = catalog.GetItem("blueberry");
            Assert.NotNull(blueberry);
            Assert.Equal(1, blueberry.DailyLimit);

            // First feeding on Day 1 succeeds
            bool firstFeed = catalog.Feed(pet, "blueberry");
            Assert.True(firstFeed);
            Assert.Equal(53.0, pet.Needs.Satiety);
            Assert.Equal(56.0, pet.Needs.VitaminC);
            Assert.Equal(60.0, pet.Needs.Mood);
            Assert.Equal(1, pet.State.Stats.Counters["feedings"]);

            // Second feeding on the same day must be refused due to daily_limit = 1
            bool secondFeed = catalog.Feed(pet, "blueberry");
            Assert.False(secondFeed);
            Assert.Equal(53.0, pet.Needs.Satiety);
            Assert.Equal(56.0, pet.Needs.VitaminC);
            Assert.Equal(60.0, pet.Needs.Mood);
            Assert.Equal(1, pet.State.Stats.Counters["feedings"]); // Count did not increase

            // Next day, daily limit resets and feeding succeeds again
            clock.Advance(TimeSpan.FromDays(1));
            bool nextDayFeed = catalog.Feed(pet, "blueberry");
            Assert.True(nextDayFeed);
            Assert.Equal(56.0, pet.Needs.Satiety);
            Assert.Equal(2, pet.State.Stats.Counters["feedings"]);
        }

        [Fact]
        public void Feed_Seeds_AreNotEdible_ReturnsSameAsUnknownFood()
        {
            var catalog = ItemCatalog.LoadDefault();
            var clock = new ManualClock(new DateTime(2026, 11, 4, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);

            pet.Needs.Satiety = 50.0;
            pet.Needs.VitaminC = 50.0;
            pet.Needs.Mood = 50.0;

            // Feeding unknown food returns false
            bool unknownResult = catalog.Feed(pet, "nonexistent_unknown_food");
            Assert.False(unknownResult);
            Assert.False(catalog.IsFood("nonexistent_unknown_food"));

            // Feeding a seed returns the exact same result (false) as an unknown food
            bool seedResult = catalog.Feed(pet, "seed_parsley");
            Assert.Equal(unknownResult, seedResult);
            Assert.False(seedResult);
            Assert.False(catalog.IsFood("seed_parsley"));

            // Feeding sapling also returns the exact same result
            bool saplingResult = catalog.Feed(pet, "sapling_apple");
            Assert.Equal(unknownResult, saplingResult);
            Assert.False(saplingResult);
            Assert.False(catalog.IsFood("sapling_apple"));

            // Ensure no needs were modified and no feedings were counted
            Assert.Equal(50.0, pet.Needs.Satiety);
            Assert.Equal(50.0, pet.Needs.VitaminC);
            Assert.Equal(50.0, pet.Needs.Mood);
            Assert.False(pet.State.Stats.Counters.ContainsKey("feedings"));
        }
    }
}
