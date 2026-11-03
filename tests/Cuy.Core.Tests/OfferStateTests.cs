using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class OfferStateTests
    {
        [Fact]
        public void NewGameState_HasDefaultOfferFields()
        {
            var state = new GameState();

            Assert.Null(state.OffersStartUtc);
            Assert.NotNull(state.OffersSeen);
            Assert.Empty(state.OffersSeen);
        }

        [Fact]
        public void JsonRoundTrip_PreservesOfferFields()
        {
            var state = new GameState();
            var dt = new DateTime(2026, 11, 3, 12, 0, 0, DateTimeKind.Utc);
            state.OffersStartUtc = dt;
            state.OffersSeen.Add("offer_1");
            state.OffersSeen.Add("offer_2");

            string json = JsonConvert.SerializeObject(state);
            var loaded = JsonConvert.DeserializeObject<GameState>(json);

            Assert.NotNull(loaded);
            Assert.Equal(dt, loaded.OffersStartUtc);
            Assert.NotNull(loaded.OffersSeen);
            Assert.Equal(2, loaded.OffersSeen.Count);
            Assert.Contains("offer_1", loaded.OffersSeen);
            Assert.Contains("offer_2", loaded.OffersSeen);
        }

        [Fact]
        public void OldSave_WithoutOfferFields_LoadsWithDefaults_AndEnsureRosterInitializedDoesNotThrow()
        {
            string json = @"{ ""Version"": 2, ""Name"": ""Cuy"" }";
            var loaded = JsonConvert.DeserializeObject<GameState>(json);

            Assert.NotNull(loaded);
            var exception = Record.Exception(() => loaded.EnsureRosterInitialized());
            Assert.Null(exception);

            Assert.Null(loaded.OffersStartUtc);
            Assert.NotNull(loaded.OffersSeen);
            Assert.Empty(loaded.OffersSeen);
        }

        [Fact]
        public void OffersSeenNullInJson_GivesEmptySetAfterEnsureRosterInitialized()
        {
            string json = @"{ ""Version"": 2, ""Name"": ""Cuy"", ""OffersSeen"": null }";
            var loaded = JsonConvert.DeserializeObject<GameState>(json);

            Assert.NotNull(loaded);
            Assert.Null(loaded.OffersSeen);

            loaded.EnsureRosterInitialized();

            Assert.NotNull(loaded.OffersSeen);
            Assert.Empty(loaded.OffersSeen);
        }
    }
}
