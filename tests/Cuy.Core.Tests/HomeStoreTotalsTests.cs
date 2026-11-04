using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Cuy.Core.Pigs;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class HomeStoreTotalsTests
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

        /// <summary>A save with five adopted pigs, the garden and farm unlocked and every room present.</summary>
        private static IReadOnlyList<StoreRow> FullHomeRows(out PlaceCatalog places, out WorldItemCatalog items,
            out FarmConfig farm, out MarketConfig market, out PigRoomConfig pigRooms, out HomeEconomyConfig economy)
        {
            places = PlaceCatalog.LoadFromFile(RepoFile("assets/data/places.json"));
            items = WorldItemCatalog.LoadFromFile(RepoFile("assets/data/world_items.json"));
            farm = FarmConfig.LoadFromFile(RepoFile("assets/data/farm.json"));
            market = MarketConfig.LoadFromFile(RepoFile("assets/data/market.json"));
            pigRooms = PigRoomConfig.Load(File.ReadAllText(RepoFile("assets/data/pig_rooms.json")));
            economy = HomeEconomyConfig.Load(File.ReadAllText(RepoFile("assets/data/home_economy.json")));

            var state = GameState.CreateNew("test", new DateTime(2026, 11, 4, 12, 0, 0, DateTimeKind.Utc));
            state.Roster = new List<PigProfile>();
            for (int i = 1; i <= 5; i++) state.Roster.Add(new PigProfile { Id = "p" + i, Name = "Pig " + i });
            PlaceUnlock.Unlock(state.World, places, "garden");
            PlaceUnlock.Unlock(state.World, places, "farm");

            return HomeStore.Rows(state, places, items, farm, market, pigRooms, economy, null);
        }

        [Fact]
        public void EveryRowPrice_EqualsDataValue()
        {
            var rows = FullHomeRows(out var places, out var items, out var farm, out var market, out var pigRooms, out var economy);

            foreach (var row in rows.Where(r => r.Kind == HomeStore.KindItem))
            {
                Assert.Equal(items.Find(row.Id).Price, row.Price);
            }
            foreach (var row in rows.Where(r => r.Kind == HomeStore.KindPlace))
            {
                Assert.Equal(places.Places.First(p => p.Id == row.Id).Cost, row.Price);
            }
            foreach (var row in rows.Where(r => r.Kind == HomeStore.KindCan))
            {
                Assert.Equal(farm.Cans.First(c => c.Id == row.Id).Cost, row.Price);
            }
            foreach (var row in rows.Where(r => r.Kind == HomeStore.KindVariant))
            {
                string itemId = row.Id.Substring(0, row.Id.LastIndexOf(':'));
                Assert.Equal(economy.VariantPrice(items.Find(itemId).Price), row.Price);
            }
        }

        [Fact]
        public void UnlockedRows_HaveAPositivePrice()
        {
            var rows = FullHomeRows(out _, out _, out _, out _, out _, out _);

            foreach (var row in rows.Where(r => !r.Locked))
            {
                Assert.True(row.Price > 0, $"row {row.Kind}:{row.Id} has price {row.Price}");
            }
        }

        [Fact]
        public void NoRow_IsSignatureOrPropOrGardenGate()
        {
            var rows = FullHomeRows(out _, out var items, out _, out _, out _, out _);

            foreach (var row in rows.Where(r => r.Kind == HomeStore.KindItem))
            {
                var def = items.Find(row.Id);
                Assert.Null(def.SignatureOf);
                Assert.Null(def.PropOf);
                Assert.NotEqual("gate_garden", row.Id);
            }
        }

        [Fact]
        public void NoSellOrRefund_ForPlaceableIds()
        {
            var names = typeof(Pet).GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static)
                .Select(m => m.Name)
                .Concat(typeof(HomeStore).GetMethods(BindingFlags.Public | BindingFlags.Static).Select(m => m.Name))
                .ToList();

            // Pet.Sell is the market sale of crops and is the only allowed method with Sell in its name.
            Assert.DoesNotContain(names, n => n.Contains("Sell") && n != "Sell");
            Assert.DoesNotContain(names, n => n.Contains("Refund") || n.Contains("Unbuy") || n.Contains("Resell"));
        }
    }
}
