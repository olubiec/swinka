using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class SaveLoadTests : IDisposable
    {
        private readonly string _testDir;

        public SaveLoadTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuySaveLoadTest_" + Guid.NewGuid().ToString("N"));
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
                // Ignore errors deleting the temp folder after the test
            }
        }

        [Fact]
        public void SaveSystem_SaveAndLoad_RoundtripsAllFields()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 14, 0, 0, DateTimeKind.Utc);

            var state = GameState.CreateNew("Fluffy", nowUtc);
            state.Clovers = 150;
            state.Inventory["bell_pepper"] = 5;
            state.Inventory["hay"] = 12;
            state.Album["popcorn"] = nowUtc;
            state.Diary.Add(new DiaryEntry { DateUtc = nowUtc, Text = "Pig diary - test entry" });
            state.Needs.Satiety = 75.5;
            state.Needs.VitaminC = 82.0;
            state.Needs.Energy = 60.0;
            state.Needs.Mood = 90.0;
            state.Needs.Cleanliness = 95.0;
            state.Needs.Teeth = 88.0;
            state.Bond.Level = 3;
            state.Bond.Points = 45;
            state.Bond.PointsToday = 15;
            state.Bond.PointsTodayDate = "2026-10-11";
            state.Stats.Sessions = 3;
            state.Stats.OnlineHours = 4.5;
            state.Stats.OfflineHours = 12.0;
            state.Stats.Counters["popcorn"] = 7;

            saveSystem.Save(state);

            Assert.True(File.Exists(saveSystem.SavePath), "save.json should exist.");
            Assert.True(File.Exists(saveSystem.BackupPath), "save.bak should be created on the first save.");

            var loadResult = saveSystem.Load();

            Assert.Equal(LoadSource.Main, loadResult.Source);
            Assert.Null(loadResult.MainError);
            Assert.NotNull(loadResult.State);

            var loaded = loadResult.State;
            Assert.Equal(GameState.CurrentVersion, loaded.Version);
            Assert.Equal("Fluffy", loaded.Name);
            Assert.Equal(150, loaded.Clovers);
            Assert.Equal(5, loaded.Inventory["bell_pepper"]);
            Assert.Equal(12, loaded.Inventory["hay"]);
            Assert.True(loaded.Album.ContainsKey("popcorn"));
            Assert.Single(loaded.Diary);
            Assert.Equal("Pig diary - test entry", loaded.Diary[0].Text);

            Assert.Equal(75.5, loaded.Needs.Satiety, precision: 3);
            Assert.Equal(82.0, loaded.Needs.VitaminC, precision: 3);
            Assert.Equal(60.0, loaded.Needs.Energy, precision: 3);
            Assert.Equal(90.0, loaded.Needs.Mood, precision: 3);
            Assert.Equal(95.0, loaded.Needs.Cleanliness, precision: 3);
            Assert.Equal(88.0, loaded.Needs.Teeth, precision: 3);

            Assert.Equal(3, loaded.Bond.Level);
            Assert.Equal(45, loaded.Bond.Points);
            Assert.Equal(15, loaded.Bond.PointsToday);
            Assert.Equal("2026-10-11", loaded.Bond.PointsTodayDate);

            Assert.Equal(3, loaded.Stats.Sessions);
            Assert.Equal(4.5, loaded.Stats.OnlineHours, precision: 3);
            Assert.Equal(12.0, loaded.Stats.OfflineHours, precision: 3);
            Assert.Equal(7, loaded.Stats.Counters["popcorn"]);
        }

        [Fact]
        public void SaveSystem_SecondSave_UpdatesMainAndRotatesOldToBackup()
        {
            var saveSystem = new SaveSystem(_testDir);
            var nowUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);

            var state1 = GameState.CreateNew("First", nowUtc);
            state1.Clovers = 10;
            saveSystem.Save(state1);

            var state2 = GameState.CreateNew("Second", nowUtc);
            state2.Clovers = 25;
            saveSystem.Save(state2);

            // save.json should hold the newest state ("Second", 25 clovers)
            var mainResult = saveSystem.Load();
            Assert.Equal(LoadSource.Main, mainResult.Source);
            Assert.Equal("Second", mainResult.State.Name);
            Assert.Equal(25, mainResult.State.Clovers);

            // save.bak should hold the previous state ("First", 10 clovers)
            string backupJson = File.ReadAllText(saveSystem.BackupPath);
            var backupState = Newtonsoft.Json.JsonConvert.DeserializeObject<GameState>(backupJson, SaveSystem.JsonSettings);
            Assert.NotNull(backupState);
            Assert.Equal("First", backupState.Name);
            Assert.Equal(10, backupState.Clovers);
        }

        [Fact]
        public void SaveSystem_Load_WhenNoSaveExists_ReturnsNoneAndNullState()
        {
            var saveSystem = new SaveSystem(_testDir);

            var result = saveSystem.Load();

            Assert.Equal(LoadSource.None, result.Source);
            Assert.Null(result.State);
            Assert.Null(result.MainError);
            Assert.Null(result.BackupError);
        }

        [Fact]
        public void GameSession_SaveAndLoad_Integration()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc));

            using (var session1 = GameSession.Open(clock, _testDir, newPetName: "Dottie"))
            {
                Assert.True(session1.IsNewGame);
                session1.Start();
                session1.Pet.AddClovers(42);
                session1.Pet.ChangeNeed(Need.Satiety, -20);
                session1.Close();
            }

            using (var session2 = GameSession.Open(clock, _testDir))
            {
                Assert.False(session2.IsNewGame);
                Assert.Equal(LoadSource.Main, session2.LoadResult.Source);
                Assert.Equal("Dottie", session2.Pet.State.Name);
                Assert.Equal(42, session2.Pet.State.Clovers);
                Assert.Equal(80.0, session2.Pet.Needs.Satiety, precision: 3);
            }
        }

        [Fact]
        public void SaveSystem_MigrateLegacyDirectory_MovesSaveAndCleansLegacy()
        {
            string legacyDir = Path.Combine(_testDir, "LegacySwinka");
            string targetDir = Path.Combine(_testDir, "TargetCuy");
            Directory.CreateDirectory(legacyDir);
            string legacySave = Path.Combine(legacyDir, SaveSystem.FileName);
            File.WriteAllText(legacySave, "{\"Version\":1,\"Name\":\"Fluffy\"}");

            SaveSystem.MigrateLegacyDirectory(legacyDir, targetDir);

            Assert.True(File.Exists(Path.Combine(targetDir, SaveSystem.FileName)));
            Assert.False(File.Exists(legacySave));
            Assert.False(Directory.Exists(legacyDir));
        }
    }
}
