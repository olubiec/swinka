using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WorldStateHomesTests
    {
        [Fact]
        public void AbsentEntry_ReadsAsDefaultMode()
        {
            var world = new WorldState();

            var free = world.HomeOf("kuki", "free");
            Assert.Equal(PigHomeState.ModeFree, free.Mode);
            Assert.Null(free.Room);

            var room = world.HomeOf("kuki", "room");
            Assert.Equal(PigHomeState.ModeRoom, room.Mode);
        }

        [Fact]
        public void PigHomes_RoundTripsThroughJson()
        {
            var world = new WorldState();
            world.PigHomes["kuki"] = new PigHomeState { Mode = PigHomeState.ModeRoom, Room = "playroom" };
            world.PigHomes["ned"] = new PigHomeState { Mode = PigHomeState.ModeFree };

            string json = JsonConvert.SerializeObject(world);
            var loaded = JsonConvert.DeserializeObject<WorldState>(json);

            Assert.Equal(PigHomeState.ModeRoom, loaded.PigHomes["kuki"].Mode);
            Assert.Equal("playroom", loaded.PigHomes["kuki"].Room);
            Assert.Equal(PigHomeState.ModeFree, loaded.PigHomes["ned"].Mode);
            Assert.Null(loaded.PigHomes["ned"].Room);
        }

        [Fact]
        public void OldWorldJson_LoadsWithEmptyPigHomes()
        {
            var loaded = JsonConvert.DeserializeObject<WorldState>("{\"Version\":1,\"LegacyDecorMigrated\":false}");

            Assert.NotNull(loaded.PigHomes);
            Assert.Empty(loaded.PigHomes);
        }

        [Theory]
        [InlineData("other")]
        [InlineData("")]
        [InlineData(null)]
        [InlineData("ROOM ")]
        public void Normalize_ReadsInvalidModeAsFree(string mode)
        {
            var home = new PigHomeState { Mode = mode, Room = "salon" }.Normalize();

            Assert.Equal(PigHomeState.ModeFree, home.Mode);
            Assert.Null(home.Room);
        }

        [Fact]
        public void Normalize_KeepsRoomForRoomMode()
        {
            var home = new PigHomeState { Mode = PigHomeState.ModeRoom, Room = "salon" }.Normalize();

            Assert.Equal(PigHomeState.ModeRoom, home.Mode);
            Assert.Equal("salon", home.Room);
        }
    }
}
