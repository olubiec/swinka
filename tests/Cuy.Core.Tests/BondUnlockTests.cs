using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class BondUnlockTests : IDisposable
    {
        private readonly string _testDir;

        public BondUnlockTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyBondTest_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                {
                    Directory.Delete(_testDir, true);
                }
            }
            catch
            {
            }
        }

        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (!string.IsNullOrEmpty(dir))
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                {
                    return Path.Combine(dir, relativePath);
                }
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Could not find Cuy.sln to resolve {relativePath}");
        }

        [Fact]
        public void IsUnlocked_CorrectAtVariousLevels()
        {
            var table = BondUnlocks.Load(File.ReadAllText(RepoFile("assets/data/bond.json")));

            var state = new GameState();
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(state, clock, new Balance());
            pet.BondTable = table;

            pet.State.Bond.Level = 2;
            Assert.False(pet.IsUnlocked("greet_on_start")); // unlocks at 3
            Assert.True(pet.IsUnlocked("approach_cursor")); // unlocks at 2

            pet.State.Bond.Level = 3;
            Assert.True(pet.IsUnlocked("greet_on_start"));
            Assert.True(pet.IsUnlocked("approach_cursor"));
            Assert.False(pet.IsUnlocked("trick_spin")); // unlocks at 5

            pet.State.Bond.Level = 20;
            Assert.True(pet.IsUnlocked("greet_on_start"));
            Assert.True(pet.IsUnlocked("golden_bowl"));
        }

        [Fact]
        public void NextUnlock_CorrectAtVariousLevels()
        {
            var table = BondUnlocks.Load(File.ReadAllText(RepoFile("assets/data/bond.json")));

            var state = new GameState();
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(state, clock, new Balance());
            pet.BondTable = table;

            pet.State.Bond.Level = 4;
            var next = pet.NextUnlock();
            Assert.NotNull(next);
            Assert.Equal("trick_spin", next.Id);
            Assert.Equal(5, next.Level);

            pet.State.Bond.Level = 19;
            next = pet.NextUnlock();
            Assert.NotNull(next);
            Assert.Equal("golden_bowl", next.Id);
            Assert.Equal(20, next.Level);

            pet.State.Bond.Level = 20;
            next = pet.NextUnlock();
            Assert.Null(next);
        }

        [Fact]
        public void UnknownId_IsNeverUnlocked()
        {
            var table = BondUnlocks.Load(File.ReadAllText(RepoFile("assets/data/bond.json")));

            var state = new GameState();
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(state, clock, new Balance());
            pet.BondTable = table;

            pet.State.Bond.Level = 20;
            Assert.False(pet.IsUnlocked("some_unknown_id"));
        }

        [Fact]
        public void BrokenJson_ReturnsDefaults()
        {
            string badJson = "{ \"levels\": [ { \"id\": } ] }"; // syntax error
            var table = BondUnlocks.Load(badJson);

            var state = new GameState();
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(state, clock, new Balance());
            pet.BondTable = table;

            pet.State.Bond.Level = 20;
            // The defaults include golden_bowl at 20
            Assert.True(pet.IsUnlocked("golden_bowl"));
        }

        [Fact]
        public void BondLevel_SurvivesSaveLoadRoundTrip()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 14, 0, 0, DateTimeKind.Utc);

            var state = GameState.CreateNew("BondTest", nowUtc);
            state.Bond.Level = 12;
            state.Bond.Points = 150;

            saveSystem.Save(state);

            var loadResult = saveSystem.Load();
            Assert.Equal(LoadSource.Main, loadResult.Source);
            var loaded = loadResult.State;

            Assert.Equal(12, loaded.Bond.Level);
            Assert.Equal(150, loaded.Bond.Points);
        }
    }
}
