using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class GameSessionWorldTests : IDisposable
    {
        private static readonly DateTime Start = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
        private readonly string _testDir;

        public GameSessionWorldTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyGameSessionWorld_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                {
                    Directory.Delete(_testDir, recursive: true);
                }
            }
            catch
            {
                // Ignore errors deleting the temp folder after the test
            }
        }

        [Fact]
        public void Open_EmptyFolder_SwitchesWorldFlagsOnAndCreatesSalonLayout()
        {
            var clock = new ManualClock(Start);

            using (var session = GameSession.Open(clock, _testDir))
            {
                var balance = session.Pet.Balance;
                Assert.True(balance.PlacesActive);
                Assert.True(balance.FarmActive);
                Assert.True(balance.MarketActive);
                Assert.True(balance.WorldDecorActive);

                Assert.True(session.Pet.State.World.Rooms.ContainsKey("salon"));
                Assert.NotNull(session.Pet.State.World.Rooms["salon"]);
            }
        }

        [Fact]
        public void Open_OldSaveWithEquippedDecor_PlacesLegacyItems_AndReopenKeepsThem()
        {
            var state = GameState.CreateNew("Old", Start);
            state.EnsureRosterInitialized();
            state.Decor.Equipped["wallpaper"] = "wallpaper_mint";
            state.Decor.Equipped["floor"] = "floor_wood_light";
            new SaveSystem(_testDir).Save(state);

            string wallpaper;
            int itemCount;
            using (var first = GameSession.Open(new ManualClock(Start.AddDays(1)), _testDir))
            {
                var salon = first.Pet.State.World.Rooms["salon"];
                wallpaper = salon.Wallpaper;
                itemCount = salon.Items.Count;
            }

            Assert.Equal("wallpaper_mint", wallpaper);
            Assert.True(itemCount > 0);

            using (var second = GameSession.Open(new ManualClock(Start.AddDays(2)), _testDir))
            {
                var salon = second.Pet.State.World.Rooms["salon"];
                Assert.Equal(wallpaper, salon.Wallpaper);
                Assert.Equal(itemCount, salon.Items.Count);
            }
        }

        [Fact]
        public void Open_NewGame_MarketIsUsableAtOnce_FarmIsLocked()
        {
            using (var session = GameSession.Open(new ManualClock(Start), _testDir))
            {
                var world = session.Pet.State.World;
                var places = session.Pet.PlaceCatalog;

                Assert.True(PlaceUnlock.IsUnlocked(world, places, "market"));
                Assert.False(PlaceUnlock.IsUnlocked(world, places, "farm"));
            }
        }
    }
}
