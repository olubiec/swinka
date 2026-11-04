using System;
using System.IO;
using System.Linq;
using System.Reflection;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetStoreTests
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

        private static Pet CreatePet(int clovers = 100000)
        {
            var clock = new ManualClock(new DateTime(2026, 11, 4, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.Clovers = clovers;
            state.Roster.Clear();
            var balance = Balance.CreateDefault();
            balance.PlacesActive = true;
            balance.FarmActive = true;
            balance.MarketActive = true;
            balance.PigRoomsActive = true;
            balance.DormActive = true;
            balance.WorldDecorActive = true;

            var pet = new Pet(state, clock, balance);
            pet.FarmConfig = FarmConfig.LoadFromFile(RepoFile("assets/data/farm.json"));
            pet.MarketConfig = MarketConfig.LoadFromFile(RepoFile("assets/data/market.json"));
            pet.WorldItemCatalog = WorldItemCatalog.LoadFromFile(RepoFile("assets/data/world_items.json"));
            return pet;
        }

        private static StoreRow RowFor(Pet pet, string kind, string id)
        {
            return HomeStore.Row(kind, id, pet.State, pet.PlaceCatalog, pet.WorldItemCatalog, pet.FarmConfig,
                pet.MarketConfig, pet.PigRooms, pet.HomeEconomy, ItemCatalog.Default);
        }

        [Fact]
        public void Purchase_UnlockedPlace_SpendsPriceAndReturnsOk()
        {
            var pet = CreatePet();
            int before = pet.State.Clovers;
            int price = RowFor(pet, HomeStore.KindPlace, "garden").Price;

            var res = pet.Purchase(HomeStore.KindPlace, "garden", 1, out int spent);

            Assert.Equal(StoreResult.Ok, res);
            Assert.Equal(price, spent);
            Assert.Equal(before - price, pet.State.Clovers);
            Assert.True(PlaceUnlock.IsUnlocked(pet.State.World, pet.PlaceCatalog, "garden"));
        }

        [Fact]
        public void Purchase_LockedRow_ReturnsLockedAndChangesNothing()
        {
            var pet = CreatePet();
            int before = pet.State.Clovers;

            var res = pet.Purchase(HomeStore.KindPlace, "farm", 1, out int spent);

            Assert.Equal(StoreResult.Locked, res);
            Assert.Equal(0, spent);
            Assert.Equal(before, pet.State.Clovers);
            Assert.False(PlaceUnlock.IsUnlocked(pet.State.World, pet.PlaceCatalog, "farm"));
        }

        [Fact]
        public void Purchase_NotEnoughClovers_ReturnsNotEnoughAndChangesNothing()
        {
            var pet = CreatePet(clovers: 0);

            var res = pet.Purchase(HomeStore.KindPlace, "garden", 1, out int spent);

            Assert.Equal(StoreResult.NotEnoughClovers, res);
            Assert.Equal(0, spent);
            Assert.Equal(0, pet.State.Clovers);
        }

        [Fact]
        public void Purchase_UnknownKindOrId_ReturnsUnknown()
        {
            var pet = CreatePet();

            Assert.Equal(StoreResult.Unknown, pet.Purchase("nope", "x", 1));
            Assert.Equal(StoreResult.Unknown, pet.Purchase(HomeStore.KindPlace, "no_such_place", 1));
            Assert.Equal(StoreResult.Unknown, pet.Purchase(HomeStore.KindItem, "no_such_item", 1));
        }

        [Fact]
        public void Purchase_Item_SpendsPriceAndCountsOwned()
        {
            var pet = CreatePet();
            Assert.Equal(StoreResult.Ok, pet.Purchase(HomeStore.KindPlace, "garden", 1));
            Assert.Equal(StoreResult.Ok, pet.Purchase(HomeStore.KindRoom, "bedroom", 1));

            var row = HomeStore.Rows(pet.State, pet.PlaceCatalog, pet.WorldItemCatalog, pet.FarmConfig,
                pet.MarketConfig, pet.PigRooms, pet.HomeEconomy, ItemCatalog.Default)
                .First(r => r.Kind == HomeStore.KindItem && !r.Locked);
            int before = pet.State.Clovers;

            var res = pet.Purchase(HomeStore.KindItem, row.Id, 1, out int spent);

            Assert.Equal(StoreResult.Ok, res);
            Assert.Equal(row.Price, spent);
            Assert.Equal(before - row.Price, pet.State.Clovers);
            Assert.Equal(1, pet.State.World.OwnedItems[row.Id]);
        }

        [Fact]
        public void Purchase_FarmSprinkler_AndPlotPack_Ok()
        {
            var pet = CreatePet();
            Assert.Equal(StoreResult.Ok, pet.Purchase(HomeStore.KindPlace, "garden", 1));
            Assert.Equal(StoreResult.Ok, pet.Purchase(HomeStore.KindPlace, "farm", 1));

            int before = pet.State.Clovers;
            var res = pet.Purchase(HomeStore.KindCan, "sprinkler", 1, out int spent);

            Assert.Equal(StoreResult.Ok, res);
            Assert.Equal(650, spent);
            Assert.Equal(before - 650, pet.State.Clovers);
            Assert.True(pet.State.World.Farm.Sprinkler);
            Assert.Equal(StoreResult.Ok, pet.Purchase(HomeStore.KindPlotPack, HomeStore.NextId, 1));
        }

        [Fact]
        public void Purchase_BigStall_SpendsFirstUpgradeCost()
        {
            var pet = CreatePet();
            int price = pet.MarketConfig.StallUpgrades[0].Cost;
            int before = pet.State.Clovers;

            var res = pet.Purchase(HomeStore.KindStall, HomeStore.BigStallId, 1, out int spent);

            Assert.Equal(StoreResult.Ok, res);
            Assert.Equal(price, spent);
            Assert.Equal(before - price, pet.State.Clovers);
        }

        [Fact]
        public void Purchase_Dorm_LockedWithoutPigs()
        {
            var pet = CreatePet();

            Assert.Equal(StoreResult.Locked, pet.Purchase(HomeStore.KindDorm, SharedRoomOps.DormId, 1));
        }

        [Fact]
        public void Pet_And_HomeStore_HaveNoSellOrRefundMethodExceptMarketSell()
        {
            var petMethods = typeof(Pet).GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static)
                .Select(m => m.Name);
            var storeMethods = typeof(HomeStore).GetMethods(BindingFlags.Public | BindingFlags.Static)
                .Select(m => m.Name);

            // Pet.Sell is the market sale of crops and is the only allowed Sell.
            Assert.Empty(petMethods.Where(n => n.StartsWith("Sell", StringComparison.Ordinal) && n != "Sell"));
            Assert.Empty(storeMethods.Where(n => n.StartsWith("Sell", StringComparison.Ordinal)));
            Assert.Empty(petMethods.Concat(storeMethods).Where(n => n.Contains("Refund")));
        }
    }
}
