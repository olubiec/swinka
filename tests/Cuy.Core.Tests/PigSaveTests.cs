using System.IO;
using Cuy.Core;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigSaveTests
    {
        [Fact]
        public void EnsureRosterInitialized_EmptyState_CreatesDefaultPig()
        {
            var state = new GameState();
            state.Name = "Gucio";

            state.EnsureRosterInitialized();

            Assert.Single(state.Roster);
            Assert.Equal("Gucio", state.Roster[0].Name);
            Assert.Single(state.ActivePigIds);
            Assert.Equal(state.Roster[0].Id, state.ActivePigIds[0]);
        }

        [Fact]
        public void SaveSystem_LoadsOldSave_MigratesRosterGracefully()
        {
            var tempDir = Path.Combine(Path.GetTempPath(), "Cuy_SaveTest_" + System.Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                // Legacy v2 JSON with no Roster
                string legacyJson = @"{
                    ""Version"": 2,
                    ""Name"": ""Kropka"",
                    ""Needs"": { ""fullness"": 80, ""vitamin_c"": 70, ""energy"": 90, ""mood"": 85, ""cleanliness"": 95, ""teeth"": 50 }
                }";
                File.WriteAllText(Path.Combine(tempDir, "save.json"), legacyJson);

                var saveSystem = new SaveSystem(tempDir);
                var result = saveSystem.Load();

                Assert.NotNull(result.State);
                Assert.NotNull(result.State.Roster);
                Assert.NotEmpty(result.State.Roster);
                Assert.Equal("Kropka", result.State.Roster[0].Name);
                Assert.Contains(result.State.Roster[0].Id, result.State.ActivePigIds);
            }
            finally
            {
                if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
            }
        }

        [Fact]
        public void ActivePigIds_ClampedToTwoMax()
        {
            var state = new GameState();
            state.Roster.Add(new PigProfile("Pig1"));
            state.Roster.Add(new PigProfile("Pig2"));
            state.Roster.Add(new PigProfile("Pig3"));

            state.ActivePigIds.Add(state.Roster[0].Id);
            state.ActivePigIds.Add(state.Roster[1].Id);
            state.ActivePigIds.Add(state.Roster[2].Id);

            state.EnsureRosterInitialized();

            Assert.Equal(2, state.ActivePigIds.Count);
        }
    }
}
