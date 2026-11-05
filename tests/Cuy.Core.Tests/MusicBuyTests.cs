using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.Music;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MusicBuyTests
    {
        private const string Common = "s1_poranek";
        private const string Rare = "s1_rare";
        private const string Unique = "s1_unique";

        private static readonly IReadOnlyDictionary<string, string> Rarity = new Dictionary<string, string>
        {
            { Common, "common" },
            { Rare, "rare" },
            { Unique, "unique" },
        };

        // Buys like the MusicFeature handler does: check, pay, grant. Returns the balance after the purchase.
        private static int Buy(GameState state, string kind, string id, int balance)
        {
            MusicBuyCheck check = MusicShop.Check(state, kind, id, balance, Rarity);
            Assert.True(check.Ok, "expected purchase to pass: " + check.Error);
            MusicShop.Grant(state, kind, id);
            return balance - check.Price;
        }

        [Fact]
        public void RecordPurchaseLowersBalanceByPriceAndAddsOneCopy()
        {
            var state = new GameState();
            int left = Buy(state, MusicShop.KindRecord, Common, 100);

            Assert.Equal(100 - MusicPrices.RecordPriceByRarity["common"], left);
            Assert.Equal(1, state.Records[Common]);
        }

        [Fact]
        public void RecordCanBeBoughtAgainAndCountGoesUp()
        {
            var state = new GameState();
            int left = Buy(state, MusicShop.KindRecord, Common, 1000);
            left = Buy(state, MusicShop.KindRecord, Common, left);

            Assert.Equal(2, state.Records[Common]);
            Assert.Equal(1000 - 2 * MusicPrices.RecordPriceByRarity["common"], left);
        }

        [Fact]
        public void NotEnoughCloversRejectsRecordAndChangesNothing()
        {
            var state = new GameState();
            int price = MusicPrices.RecordPriceByRarity["common"];

            MusicBuyCheck check = MusicShop.Check(state, MusicShop.KindRecord, Common, price - 1, Rarity);

            Assert.Equal(MusicBuyError.NotEnoughClovers, check.Error);
            Assert.Empty(state.Records);
        }

        [Fact]
        public void UniqueRecordCostsTheRarePrice()
        {
            // Decision D5e: unique records have no source, so they are priced at the rare price.
            MusicBuyCheck check = MusicShop.Check(new GameState(), MusicShop.KindRecord, Unique, 99999, Rarity);

            Assert.Equal(MusicBuyError.None, check.Error);
            Assert.Equal(MusicPrices.RecordPriceByRarity["rare"], check.Price);
        }

        [Fact]
        public void UnknownRecordIdIsRejected()
        {
            MusicBuyCheck check = MusicShop.Check(new GameState(), MusicShop.KindRecord, "nope", 99999, Rarity);

            Assert.Equal(MusicBuyError.UnknownItem, check.Error);
        }

        [Fact]
        public void PlayerIsBoughtOnlyOnce()
        {
            var state = new GameState();
            int left = Buy(state, MusicShop.KindPlayer, "player_portable", 500);

            Assert.Equal(500 - MusicPrices.PlayerPriceById["player_portable"], left);
            Assert.Equal(new[] { "player_portable" }, state.PlayerOwned);
            Assert.Equal(MusicBuyError.AlreadyOwned,
                MusicShop.Check(state, MusicShop.KindPlayer, "player_portable", 99999, Rarity).Error);
        }

        [Fact]
        public void PlacedPlayerCountsAsOwned()
        {
            var state = new GameState();
            state.PlayerPlaced["room1"] = "player_portable";

            MusicBuyCheck check = MusicShop.Check(state, MusicShop.KindPlayer, "player_portable", 99999, Rarity);

            Assert.Equal(MusicBuyError.AlreadyOwned, check.Error);
        }

        [Fact]
        public void PlayerNotEnoughCloversIsRejected()
        {
            MusicBuyCheck check = MusicShop.Check(new GameState(), MusicShop.KindPlayer, "player_portable",
                MusicPrices.PlayerPriceById["player_portable"] - 1, Rarity);

            Assert.Equal(MusicBuyError.NotEnoughClovers, check.Error);
        }

        [Fact]
        public void UnknownPlayerAndKindAreRejected()
        {
            var state = new GameState();

            Assert.Equal(MusicBuyError.UnknownItem, MusicShop.Check(state, MusicShop.KindPlayer, "player_x", 99999, Rarity).Error);
            Assert.Equal(MusicBuyError.UnknownItem, MusicShop.Check(state, "toy", "player_portable", 99999, Rarity).Error);
            Assert.Equal(MusicBuyError.UnknownItem, MusicShop.Check(state, MusicShop.KindPlayer, "", 99999, Rarity).Error);
            Assert.Equal(MusicBuyError.UnknownItem, MusicShop.Check(null, MusicShop.KindPlayer, "player_portable", 1, Rarity).Error);
        }

        [Fact]
        public void ParsesRecordRaritiesFromManifestAndIgnoresBadEntries()
        {
            string json = "{\"records\":[{\"id\":\"a\",\"rarity\":\"common\"},{\"id\":\"\",\"rarity\":\"rare\"},5,{\"id\":\"b\"}]}";

            IReadOnlyDictionary<string, string> map = MusicShop.ParseRecordRarities(json);

            Assert.Single(map);
            Assert.Equal("common", map["a"]);
            Assert.Empty(MusicShop.ParseRecordRarities("not json"));
            Assert.Empty(MusicShop.ParseRecordRarities(null));
        }
    }
}
