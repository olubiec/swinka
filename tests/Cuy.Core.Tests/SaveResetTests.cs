using System;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class SaveResetTests : IDisposable
    {
        private readonly string _testDir;

        public SaveResetTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuySaveResetTest_" + Guid.NewGuid().ToString("N"));
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

        [Fact]
        public void SaveReset_WhenMarkerPresent_ReturnsFreshStateAndBacksUpOldSave()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);

            var oldState = GameState.CreateNew("OldPig", nowUtc);
            oldState.Clovers = 250;
            saveSystem.Save(oldState);

            Assert.True(File.Exists(saveSystem.SavePath), "save.json must exist before reset.");

            saveSystem.RequestReset();
            Assert.True(File.Exists(saveSystem.ResetMarkerPath), "reset.pending must exist after RequestReset.");

            var loadResult = saveSystem.Load();

            Assert.Equal(LoadSource.None, loadResult.Source);
            Assert.Null(loadResult.State);
            Assert.False(File.Exists(saveSystem.SavePath), "save.json should have been moved.");
            Assert.False(File.Exists(saveSystem.ResetMarkerPath), "reset.pending should have been deleted.");

            var resetBackups = Directory.GetFiles(_testDir, "save.reset-*.bak");
            Assert.Single(resetBackups);

            string backupJson = File.ReadAllText(resetBackups[0]);
            var restoredState = Newtonsoft.Json.JsonConvert.DeserializeObject<GameState>(backupJson, SaveSystem.JsonSettings);
            Assert.NotNull(restoredState);
            Assert.Equal("OldPig", restoredState.Name);
            Assert.Equal(250, restoredState.Clovers);
        }

        [Fact]
        public void SaveReset_WhenMarkerAbsent_LeavesSaveUntouched()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);

            var state = GameState.CreateNew("KeepMe", nowUtc);
            state.Clovers = 50;
            saveSystem.Save(state);

            var loadResult = saveSystem.Load();

            Assert.Equal(LoadSource.Main, loadResult.Source);
            Assert.NotNull(loadResult.State);
            Assert.Equal("KeepMe", loadResult.State.Name);
            Assert.Equal(50, loadResult.State.Clovers);

            var resetBackups = Directory.GetFiles(_testDir, "save.reset-*.bak");
            Assert.Empty(resetBackups);
        }

        [Fact]
        public void SaveReset_FreshSaveAfterReset_SavesAndLoadsSuccessfully()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);

            var oldState = GameState.CreateNew("FirstPig", nowUtc);
            saveSystem.Save(oldState);
            saveSystem.RequestReset();

            var firstLoad = saveSystem.Load();
            Assert.Null(firstLoad.State);

            var newState = GameState.CreateNew("NewBabyPig", nowUtc.AddDays(1));
            newState.Clovers = 0;
            saveSystem.Save(newState);

            var secondLoad = saveSystem.Load();
            Assert.Equal(LoadSource.Main, secondLoad.Source);
            Assert.NotNull(secondLoad.State);
            Assert.Equal("NewBabyPig", secondLoad.State.Name);

            // Confirm old backup still preserved
            var resetBackups = Directory.GetFiles(_testDir, "save.reset-*.bak");
            Assert.NotEmpty(resetBackups);
        }
    }
}
