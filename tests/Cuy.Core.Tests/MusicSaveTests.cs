using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.Save;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MusicSaveTests
    {
        private static GameState Load(string json)
        {
            return JsonConvert.DeserializeObject<GameState>(json, SaveSystem.JsonSettings);
        }

        [Fact]
        public void OldSaveWithoutMusicFieldsGivesEmptyEquipmentAndKeepsRest()
        {
            var state = Load("{\"clovers\":42,\"name\":\"Ala\",\"poopCount\":3}");

            Assert.NotNull(state);
            Assert.Empty(state.Records);
            Assert.Empty(state.PlayerOwned);
            Assert.Empty(state.PlayerPlaced);
            Assert.Equal(42, state.Clovers);
            Assert.Equal("Ala", state.Name);
            Assert.Equal(3, state.PoopCount);
        }

        [Fact]
        public void WrongTypesFallBackToEmptyWithoutThrowing()
        {
            var state = Load("{\"records\":\"x\",\"playerOwned\":{},\"playerPlaced\":[1],\"clovers\":7}");

            Assert.Empty(state.Records);
            Assert.Empty(state.PlayerOwned);
            Assert.Empty(state.PlayerPlaced);
            Assert.Equal(7, state.Clovers);
        }

        [Fact]
        public void NullFieldsGiveEmptyCollections()
        {
            var state = Load("{\"records\":null,\"playerOwned\":null,\"playerPlaced\":null}");

            Assert.NotNull(state.Records);
            Assert.NotNull(state.PlayerOwned);
            Assert.NotNull(state.PlayerPlaced);
            Assert.Empty(state.Records);
            Assert.Empty(state.PlayerOwned);
            Assert.Empty(state.PlayerPlaced);
        }

        [Fact]
        public void BadEntriesAreDroppedGoodOnesKept()
        {
            var state = Load("{" +
                "\"records\":{\"disc_a\":2,\"disc_b\":\"3\",\"disc_c\":-1,\"disc_d\":1.5,\"disc_e\":0,\"disc_f\":3}," +
                "\"playerOwned\":[\"disc_a\",1,\"disc_a\",\"\",\"disc_b\",null]," +
                "\"playerPlaced\":{\"salon\":\"disc_a\",\"bedroom\":5,\"\":\"disc_b\",\"hall\":\"\"}}");

            Assert.Equal(2, state.Records.Count);
            Assert.Equal(2, state.Records["disc_a"]);
            Assert.Equal(3, state.Records["disc_f"]);
            Assert.Equal(new List<string> { "disc_a", "disc_b" }, state.PlayerOwned);
            Assert.Single(state.PlayerPlaced);
            Assert.Equal("disc_a", state.PlayerPlaced["salon"]);
        }

        [Fact]
        public void RoundTripKeepsMusicFields()
        {
            var state = GameState.CreateNew("Ala", System.DateTime.UtcNow);
            state.Records["disc_a"] = 2;
            state.PlayerOwned.Add("disc_a");
            state.PlayerPlaced["salon"] = "disc_a";

            var back = Load(SaveSystem.Serialize(state));

            Assert.Equal(2, back.Records["disc_a"]);
            Assert.Equal(new List<string> { "disc_a" }, back.PlayerOwned);
            Assert.Equal("disc_a", back.PlayerPlaced["salon"]);
        }
    }
}
