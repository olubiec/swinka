using System;
using System.Globalization;
using System.IO;
using System.Linq;
using Cuy.Core.Achievements;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetMarketTests
    {
        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    return Path.Combine(dir, relativePath);
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Cannot find repo root to resolve {relativePath}");
        }

        private static Pet CreatePet(DateTime? initialTime = null, bool marketActive = true)
        {
            var now = initialTime ?? new DateTime(2026, 11, 4, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var state = GameState.CreateNew("test", clock.UtcNow);
            var balance = Balance.CreateDefault();
            balance.MarketActive = marketActive;

            var pet = new Pet(state, clock, balance);
            pet.FarmConfig = FarmConfig.LoadFromFile(RepoFile("assets/data/farm.json"));
            pet.MarketConfig = MarketConfig.LoadFromFile(RepoFile("assets/data/market.json"));
            pet.WorldItemCatalog = WorldItemCatalog.LoadFromFile(RepoFile("assets/data/world_items.json"));
            pet.AchievementsTable = AchievementCatalog.Load(File.ReadAllText(RepoFile("assets/data/achievements.json")));
            return pet;
        }

        [Fact]
        public void Sell_ThreeDandelions_PaysQuoteAndRemovesThem()
        {
            var pet = CreatePet();
            pet.AddItem("dandelion", 5);

            var crop = pet.FarmConfig.Crops.First(c => c.Id == "dandelion");
            string today = pet.Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var quote = MarketPricing.Quote(pet.State.World.Market, pet.MarketConfig, crop, 3, today);
            int cloversBefore = pet.State.Clovers;

            var res = pet.Sell("dandelion", 3);

            Assert.Equal(SellResult.Ok, res);
            Assert.Equal(2, pet.GetItemCount("dandelion"));
            Assert.Equal(cloversBefore + quote.TotalClovers, pet.State.Clovers);
        }

        [Fact]
        public void Sell_MoreThanOwned_SellsOnlyOwned()
        {
            var pet = CreatePet();
            pet.AddItem("dandelion", 2);

            var crop = pet.FarmConfig.Crops.First(c => c.Id == "dandelion");
            string today = pet.Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var quote = MarketPricing.Quote(pet.State.World.Market, pet.MarketConfig, crop, 2, today);
            int cloversBefore = pet.State.Clovers;

            var res = pet.Sell("dandelion", 5);

            Assert.Equal(SellResult.Ok, res);
            Assert.Equal(0, pet.GetItemCount("dandelion"));
            Assert.Equal(cloversBefore + quote.TotalClovers, pet.State.Clovers);
        }

        [Fact]
        public void Sell_DailyCap_StopsAt30()
        {
            var pet = CreatePet();
            pet.AddItem("dandelion", 250);

            while (pet.State.World.Market.SalesToday < 30)
            {
                var r = pet.Sell("dandelion", 10);
                if (r != SellResult.Ok) break;
            }
            Assert.Equal(30, pet.State.World.Market.SalesToday);

            int itemsBefore = pet.GetItemCount("dandelion");
            var resCap = pet.Sell("dandelion", 5);
            Assert.Equal(SellResult.CapReached, resCap);
            Assert.Equal(itemsBefore, pet.GetItemCount("dandelion"));
            Assert.Equal(30, pet.State.World.Market.SalesToday);
        }

        [Fact]
        public void DailyRollover_RestoresDemandBy0_1_AndClearsSalesToday()
        {
            var initialTime = new DateTime(2026, 11, 4, 10, 0, 0, DateTimeKind.Utc);
            var pet = CreatePet(initialTime);
            var clock = (ManualClock)pet.Clock;

            pet.AddItem("dandelion", 10);
            pet.Sell("dandelion", 5);

            double demandDay1 = pet.State.World.Market.Demand["dandelion"];
            Assert.True(demandDay1 < 1.0);
            Assert.True(pet.State.World.Market.SalesToday > 0);

            clock.Advance(TimeSpan.FromDays(1));

            var view = pet.GetMarketView();
            Assert.NotNull(view);

            double demandDay2 = pet.State.World.Market.Demand["dandelion"];
            Assert.Equal(Math.Min(1.0, demandDay1 + 0.1), demandDay2, 3);
            Assert.Equal(0, pet.State.World.Market.SalesToday);
            Assert.Equal(30, view.CapLeft);
        }

        [Fact]
        public void Order_RefusedWithoutItems_AndPaidWithThem()
        {
            var pet = CreatePet();
            pet.State.World.Market.Orders.Add(new OrderState { CropId = "dandelion", Count = 2, Done = false });

            Assert.Equal(0, pet.GetItemCount("dandelion"));

            bool resFail = pet.FulfillOrder(0);
            Assert.False(resFail);

            pet.AddItem("dandelion", 2);
            int cloversBefore = pet.State.Clovers;

            bool resOk = pet.FulfillOrder(0);
            Assert.True(resOk);
            Assert.Equal(0, pet.GetItemCount("dandelion"));
            Assert.True(pet.State.Clovers > cloversBefore);
            Assert.True(pet.State.World.Market.Orders[0].Done);

            Assert.False(pet.FulfillOrder(0));
        }

        [Fact]
        public void Specials_Are20PercentBelowPrice()
        {
            var pet = CreatePet();
            var view = pet.GetMarketView();

            Assert.NotNull(view);
            Assert.NotEmpty(view.Specials);

            foreach (var special in view.Specials)
            {
                int expectedDiscounted = (int)Math.Round(special.OriginalPrice * 0.8, MidpointRounding.AwayFromZero);
                Assert.Equal(expectedDiscounted, special.DiscountedPrice);
                Assert.Equal(20, special.DiscountPercent);
            }

            pet.AddClovers(100);
            int cloversBefore = pet.State.Clovers;
            var buyRes = pet.BuySpecial(0);

            Assert.Equal(BuyResult.Ok, buyRes);
            Assert.Equal(cloversBefore - view.Specials[0].DiscountedPrice, pet.State.Clovers);
        }

        [Fact]
        public void FlagOff_DisablesAllMarketActions()
        {
            var pet = CreatePet(marketActive: false);
            pet.AddItem("dandelion", 5);

            var sellRes = pet.Sell("dandelion", 3);
            Assert.Equal(SellResult.Disabled, sellRes);

            var buyRes = pet.Buy("seed_dandelion", 1);
            Assert.Equal(BuyResult.Disabled, buyRes);

            var specRes = pet.BuySpecial(0);
            Assert.Equal(BuyResult.Disabled, specRes);

            pet.State.World.Market.Orders.Add(new OrderState { CropId = "dandelion", Count = 1, Done = false });
            Assert.False(pet.FulfillOrder(0));
            Assert.False(pet.BuyBigStall());
            Assert.Null(pet.GetMarketView());
        }

        [Fact]
        public void UnitsSold_CountsAndMarketRegularPaysAfter20()
        {
            var clock = new ManualClock(new DateTime(2026, 11, 4, 10, 0, 0, DateTimeKind.Utc));
            var pet = CreatePet(clock.UtcNow);

            pet.AddItem("dandelion", 30);

            pet.Sell("dandelion", 10);

            ((ManualClock)pet.Clock).Advance(TimeSpan.FromDays(1));

            pet.Sell("dandelion", 10);

            Assert.Equal(20, pet.State.Stats.Counters["units_sold"]);

            var newlyEarned = pet.CheckAchievements();

            var reg = newlyEarned.FirstOrDefault(a => a.Id == "market_regular");
            Assert.NotNull(reg);
            Assert.Equal(50, reg.Reward);
        }

        [Fact]
        public void Buy_SeedsAndPlaceablesAndFood_Works()
        {
            var pet = CreatePet();
            pet.AddClovers(1000);

            var resSeed = pet.Buy("seed_dandelion", 2);
            Assert.Equal(BuyResult.Ok, resSeed);
            Assert.Equal(2, pet.GetItemCount("seed_dandelion"));

            var resFood = pet.Buy("carrot", 1);
            Assert.Equal(BuyResult.Ok, resFood);
            Assert.Equal(1, pet.GetItemCount("carrot"));

            bool stallUpgraded = pet.BuyBigStall();
            Assert.True(stallUpgraded);
            Assert.Equal(1, pet.State.World.Market.StallLevel);
        }
    }
}
