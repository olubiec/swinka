using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Save;
using Xunit;

namespace Cuy.Core.Tests
{
    public class CorruptSaveBackupTests : IDisposable
    {
        private readonly string _testDir;

        public CorruptSaveBackupTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyCorruptBackupTest_" + Guid.NewGuid().ToString("N"));
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
        public void SaveSystem_Load_WhenMainCorrupt_LoadsFromBackupAndCopiesToCorruptFile()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            // Save a valid state to the backup
            var backupState = GameState.CreateNew("DobraKopia", nowUtc);
            backupState.Clovers = 88;
            saveSystem.Save(backupState);

            // Deliberately damage the main save.json (invalid JSON syntax)
            string corruptedContent = "{\"version\": 1, \"name\": \"Truncated file...";
            File.WriteAllText(saveSystem.SavePath, corruptedContent);

            var result = saveSystem.Load();

            // Should load from the backup
            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal("DobraKopia", result.State.Name);
            Assert.Equal(88, result.State.Clovers);
            Assert.NotNull(result.MainError);
            Assert.Null(result.BackupError);

            // A save.corrupt.json file with the damaged content should be kept
            string corruptFilePath = Path.Combine(_testDir, SaveSystem.CorruptFileName);
            Assert.True(File.Exists(corruptFilePath), "save.corrupt.json should be kept for analysis.");
            Assert.Equal(corruptedContent, File.ReadAllText(corruptFilePath));
        }

        [Fact]
        public void SaveSystem_Load_WhenMainEmpty_LoadsFromBackup()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            var validState = GameState.CreateNew("ImportantPig", nowUtc);
            validState.Clovers = 50;
            saveSystem.Save(validState);

            // The main file becomes empty (e.g. a sudden reset while saving without a flush)
            File.WriteAllText(saveSystem.SavePath, "   \n\r");

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal("ImportantPig", result.State.Name);
            Assert.Contains("The file is empty", result.MainError);
        }

        [Fact]
        public void SaveSystem_Load_WhenMainHasInvalidSchemaWithoutNeeds_LoadsFromBackup()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            var validState = GameState.CreateNew("ValidPig", nowUtc);
            saveSystem.Save(validState);

            // The file has valid JSON but lacks required data (needs: null)
            File.WriteAllText(saveSystem.SavePath, "{\"version\": 1, \"name\": \"NoNeeds\", \"needs\": null}");

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal("ValidPig", result.State.Name);
            Assert.Contains("contains no game state", result.MainError);
        }

        [Fact]
        public void SaveSystem_SaveAfterRecoveringFromBackup_RepairsMainAndPreservesGoodBackup()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            // 1. Save the original state (goes to save.json and save.bak)
            var state1 = GameState.CreateNew("BackupPig", nowUtc);
            saveSystem.Save(state1);

            // 2. Damage the main file
            File.WriteAllText(saveSystem.SavePath, "CORRUPTED_DATA_!@#$");

            // 3. Load: the system detects the damage and sets _mainCorrupt = true
            var loadResult = saveSystem.Load();
            Assert.Equal(LoadSource.Backup, loadResult.Source);
            Assert.Equal("BackupPig", loadResult.State.Name);

            // 4. Save a new game state (after recovering / continuing)
            var state2 = loadResult.State;
            state2.Name = "RecoveredPig";
            state2.Clovers = 120;
            saveSystem.Save(state2);

            // 5. The next Load should read Main without problems
            var secondLoad = saveSystem.Load();
            Assert.Equal(LoadSource.Main, secondLoad.Source);
            Assert.Equal("RecoveredPig", secondLoad.State.Name);
            Assert.Equal(120, secondLoad.State.Clovers);
            Assert.Null(secondLoad.MainError);
        }

        [Fact]
        public void SaveSystem_Load_WhenBothMainAndBackupCorrupt_ReturnsNoneAndLogsBothErrors()
        {
            var saveSystem = new SaveSystem(_testDir);

            // Both files damaged
            File.WriteAllText(saveSystem.SavePath, "BAD_MAIN");
            File.WriteAllText(saveSystem.BackupPath, "BAD_BACKUP");

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.None, result.Source);
            Assert.Null(result.State);
            Assert.NotNull(result.MainError);
            Assert.NotNull(result.BackupError);
        }

        [Fact]
        public void SaveSystem_Load_WhenMainMissingButBackupExists_LoadsFromBackup()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            var validState = GameState.CreateNew("BackupOnly", nowUtc);
            saveSystem.Save(validState);

            // Delete save.json, only save.bak is left
            File.Delete(saveSystem.SavePath);

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.NotNull(result.State);
            Assert.Equal("BackupOnly", result.State.Name);
            Assert.Null(result.MainError);
        }

        [Fact]
        public void SaveSystem_Save_WhenMainCorruptAndNewInstance_PreservesGoodBackup()
        {
            var saveSystem1 = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            // 1. Save a valid initial state (it lands in save.json and save.bak)
            var initialGoodState = GameState.CreateNew("DobraKopiaZapasowa", nowUtc);
            initialGoodState.Clovers = 77;
            saveSystem1.Save(initialGoodState);

            // 2. Damage the main save.json
            string corruptedData = "{ invalid: json, truncated file... ";
            File.WriteAllText(saveSystem1.SavePath, corruptedData);

            // 3. Create a new SaveSystem instance (Load() is not called, so _mainCorrupt is false by default)
            var newSaveSystem = new SaveSystem(_testDir);

            // 4. Save a new state through the new instance
            var newState = GameState.CreateNew("NewState", nowUtc);
            newState.Clovers = 150;
            newSaveSystem.Save(newState);

            // 5. save.bak still holds the good state (not overwritten by the damaged file)
            Assert.True(File.Exists(newSaveSystem.BackupPath), "save.bak should exist.");
            string backupJson = File.ReadAllText(newSaveSystem.BackupPath);
            var backupState = Newtonsoft.Json.JsonConvert.DeserializeObject<GameState>(backupJson, SaveSystem.JsonSettings);
            Assert.NotNull(backupState);
            Assert.Equal("DobraKopiaZapasowa", backupState.Name);
            Assert.Equal(77, backupState.Clovers);

            // 6. The main save.json was replaced with the new valid state
            var loadResult = newSaveSystem.Load();
            Assert.Equal(LoadSource.Main, loadResult.Source);
            Assert.Equal("NewState", loadResult.State.Name);
            Assert.Equal(150, loadResult.State.Clovers);
        }
    }
}
