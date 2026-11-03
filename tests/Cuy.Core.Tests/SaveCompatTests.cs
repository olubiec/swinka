using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core;
using Cuy.Core.Care;
using Cuy.Core.Coloring;
using Cuy.Core.Economy;
using Cuy.Core.Health;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Xunit;

namespace Cuy.Core.Tests
{
    public class SaveCompatTests : IDisposable
    {
        private readonly string _testDir;

        public SaveCompatTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuySaveCompatTest_" + Guid.NewGuid().ToString("N"));
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
                // Ignore cleanup errors
            }
        }

        [Fact]
        public void Load_Version1Save_MigratesPolishIds_AndPopulatesAllNewFieldDefaults()
        {
            // Legacy version 1 save containing Polish item ids and stat counters,
            // with none of the fields introduced in waves after v1.
            string legacyV1Json = @"{
  ""version"": 1,
  ""name"": ""Puszek"",
  ""birthDateUtc"": ""2026-10-01T10:00:00Z"",
  ""lastActiveUtc"": ""2026-10-01T12:00:00Z"",
  ""clovers"": 42,
  ""needs"": {
    ""fullness"": 85.0,
    ""vitamin_c"": 75.0,
    ""energy"": 60.0,
    ""mood"": 90.0,
    ""cleanliness"": 95.0,
    ""teeth"": 50.0
  },
  ""inventory"": {
    ""siano"": 12,
    ""papryka"": 4,
    ""granulat"": 6,
    ""natka"": 2,
    ""gryzak"": 1
  },
  ""stats"": {
    ""counters"": {
      ""karmienia"": 15,
      ""glaskanie"": 8,
      ""papryka"": 3,
      ""zebrane_bobki"": 5,
      ""eaten_siano"": 20
    }
  }
}";
            File.WriteAllText(Path.Combine(_testDir, SaveSystem.FileName), legacyV1Json);

            var result = new SaveSystem(_testDir).Load();

            Assert.Equal(LoadSource.Main, result.Source);
            Assert.Null(result.MainError);
            Assert.NotNull(result.State);

            var state = result.State;
            // Version migration: v1 upgraded to current version (2)
            Assert.Equal(GameState.CurrentVersion, state.Version);
            Assert.Equal("Puszek", state.Name);
            Assert.Equal(42, state.Clovers);

            // Polish inventory IDs migrated to canonical English
            Assert.Equal(12, state.Inventory["hay"]);
            Assert.Equal(4, state.Inventory["bell_pepper"]);
            Assert.Equal(6, state.Inventory["pellets"]);
            Assert.Equal(2, state.Inventory["parsley"]);
            Assert.Equal(1, state.Inventory["chew_stick"]);
            Assert.False(state.Inventory.ContainsKey("siano"));
            Assert.False(state.Inventory.ContainsKey("papryka"));

            // Polish stats counters migrated
            Assert.Equal(15, state.Stats.Counters["feedings"]);
            Assert.Equal(8, state.Stats.Counters["pets"]);
            Assert.Equal(3, state.Stats.Counters["bell_pepper"]);
            Assert.Equal(5, state.Stats.Counters["poops_collected"]);
            Assert.Equal(20, state.Stats.Counters["eaten_hay"]);

            // Default values for fields introduced in later waves:
            // 1. Roster and ActivePigIds
            Assert.NotNull(state.Roster);
            Assert.Single(state.Roster);
            Assert.Equal("Puszek", state.Roster[0].Name);
            Assert.Equal("smooth", state.Roster[0].Breed);
            Assert.Equal("tricolor", state.Roster[0].PaletteId);
            Assert.Contains("cuddly", state.Roster[0].Traits);
            Assert.NotNull(state.ActivePigIds);
            Assert.Single(state.ActivePigIds);
            Assert.Equal(state.Roster[0].Id, state.ActivePigIds[0]);

            // 2. Hay rack (defaults to 60.0)
            Assert.Equal(60.0, state.HayRack);

            // 3. Care state
            Assert.NotNull(state.Care);
            Assert.NotNull(state.Care.Settings);
            Assert.NotNull(state.Care.Settings.PigNames);
            Assert.NotNull(state.Care.LastDoneUtc);
            Assert.Empty(state.Care.LastDoneUtc);
            Assert.NotNull(state.Care.History);
            Assert.Empty(state.Care.History);
            Assert.NotNull(state.Care.Weights);
            Assert.Empty(state.Care.Weights);
            Assert.NotNull(state.Care.Streaks);
            Assert.Empty(state.Care.Streaks);

            // 4. Health state
            Assert.NotNull(state.Health);
            Assert.NotNull(state.Health.Active);
            Assert.Empty(state.Health.Active);
            Assert.NotNull(state.Health.History);
            Assert.Empty(state.Health.History);
            Assert.NotNull(state.Health.LowNeedHours);
            Assert.Empty(state.Health.LowNeedHours);
            Assert.Equal(0, state.Health.SweetTreatsToday);

            // 5. Decor state
            Assert.NotNull(state.Decor);
            Assert.NotNull(state.Decor.Equipped);
            Assert.Empty(state.Decor.Equipped);

            // 6. Economy state
            Assert.NotNull(state.Economy);
            Assert.Equal(0, state.Economy.MinigameCloversToday);
            Assert.Equal(0, state.Economy.CareCloversToday);
            Assert.Equal(0, state.Economy.ColoringRewardedToday);
            Assert.Equal(0, state.Economy.GiftStreak);

            // 7. Coloring state
            Assert.NotNull(state.Coloring);
            Assert.NotNull(state.Coloring.Progress);
            Assert.Empty(state.Coloring.Progress);
            Assert.NotNull(state.Coloring.Completed);
            Assert.Empty(state.Coloring.Completed);
            Assert.NotNull(state.Coloring.UnlockedPacks);
            Assert.Contains("guinea_pigs", state.Coloring.UnlockedPacks);
            Assert.Contains("food_and_toys", state.Coloring.UnlockedPacks);

            // 8. Achievements & Minigames & DayLog
            Assert.NotNull(state.EarnedAchievements);
            Assert.Empty(state.EarnedAchievements);
            Assert.NotNull(state.MinigamePlays);
            Assert.Empty(state.MinigamePlays);
            Assert.NotNull(state.DayLogCounters);
            Assert.Empty(state.DayLogCounters);

            // 9. Flags & collections
            Assert.False(state.NeedsNaming);
            Assert.False(state.GiftNoteShown);
            Assert.NotNull(state.GrowthStartUtc);
            Assert.NotNull(state.Bond);
            Assert.True(state.Bond.Level >= 1);
            Assert.NotNull(state.HighScores);
            Assert.NotNull(state.Album);
            Assert.NotNull(state.Diary);
            Assert.NotNull(state.Poops);
            Assert.Equal(0, state.PoopCount);
        }

        [Fact]
        public void Load_Version2EarlySave_PopulatesRecentWaveDefaults()
        {
            // Early version 2 save without newer subsystem states
            string legacyV2Json = @"{
  ""version"": 2,
  ""name"": ""Kropka"",
  ""birthDateUtc"": ""2026-10-05T08:00:00Z"",
  ""lastActiveUtc"": ""2026-10-05T09:00:00Z"",
  ""clovers"": 80,
  ""stage"": ""junior"",
  ""birthdaysCelebrated"": 0,
  ""needs"": {
    ""fullness"": 90.0,
    ""vitamin_c"": 85.0,
    ""energy"": 70.0,
    ""mood"": 80.0,
    ""cleanliness"": 100.0,
    ""teeth"": 75.0
  },
  ""bond"": {
    ""level"": 2,
    ""points"": 30,
    ""pointsToday"": 10,
    ""pointsTodayDate"": ""2026-10-05""
  },
  ""inventory"": {
    ""hay"": 5,
    ""carrot"": 2
  },
  ""stats"": {
    ""sessions"": 3,
    ""onlineHours"": 1.5,
    ""offlineHours"": 4.0,
    ""counters"": {
      ""feedings"": 7
    }
  }
}";
            File.WriteAllText(Path.Combine(_testDir, SaveSystem.FileName), legacyV2Json);

            var result = new SaveSystem(_testDir).Load();

            Assert.Equal(LoadSource.Main, result.Source);
            var state = result.State;
            Assert.NotNull(state);

            Assert.Equal(2, state.Version);
            Assert.Equal("Kropka", state.Name);
            Assert.Equal(80, state.Clovers);
            Assert.Equal(LifeStage.Junior, state.Stage);
            Assert.Equal(2, state.Bond.Level);
            Assert.Equal(30, state.Bond.Points);
            Assert.Equal(5, state.Inventory["hay"]);
            Assert.Equal(2, state.Inventory["carrot"]);

            // Subsystem defaults verification
            Assert.Equal(60.0, state.HayRack);
            Assert.NotNull(state.Roster);
            Assert.Single(state.Roster);
            Assert.Equal("Kropka", state.Roster[0].Name);
            Assert.Equal(state.Roster[0].Id, state.ActivePigIds[0]);

            Assert.NotNull(state.Care);
            Assert.NotNull(state.Health);
            Assert.NotNull(state.Decor);
            Assert.NotNull(state.Decor.Equipped);
            Assert.NotNull(state.Economy);
            Assert.NotNull(state.Coloring);
            Assert.Contains("guinea_pigs", state.Coloring.UnlockedPacks);
            Assert.NotNull(state.EarnedAchievements);
            Assert.NotNull(state.MinigamePlays);
            Assert.NotNull(state.DayLogCounters);
        }

        [Fact]
        public void Load_Version2Save_WithCustomSubsystemValues_PreservesExistingValues()
        {
            // Save that already has newer wave properties set
            string v2WithNewSystemsJson = @"{
  ""version"": 2,
  ""name"": ""Piksel"",
  ""birthDateUtc"": ""2026-10-01T10:00:00Z"",
  ""lastActiveUtc"": ""2026-10-01T10:00:00Z"",
  ""needs"": { ""fullness"": 100 },
  ""hayRack"": 45.5,
  ""decor"": {
    ""equipped"": {
      ""wallpaper"": ""stars"",
      ""floor"": ""wood""
    }
  },
  ""coloring"": {
    ""completed"": [ ""pic_01"" ],
    ""unlockedPacks"": [ ""guinea_pigs"", ""custom_pack"" ]
  },
  ""care"": {
    ""streaks"": {
      ""brushing"": 5
    }
  },
  ""health"": {
    ""sweet_treats_today"": 3,
    ""treats_local_date"": ""2026-10-01""
  },
  ""economy"": {
    ""giftStreak"": 4,
    ""minigameCloversToday"": 15
  },
  ""roster"": [
    {
      ""id"": ""pig_custom_1"",
      ""name"": ""Piksel"",
      ""breed"": ""rosette"",
      ""paletteId"": ""agouti"",
      ""traits"": [ ""explorer"", ""vocal"" ]
    }
  ],
  ""activePigIds"": [ ""pig_custom_1"" ],
  ""minigamePlays"": {
    ""runner"": 6
  },
  ""dayLogCounters"": {
    ""hay_eaten"": 2
  },
  ""earnedAchievements"": {
    ""first_run"": ""2026-10-01T10:00:00Z""
  }
}";
            File.WriteAllText(Path.Combine(_testDir, SaveSystem.FileName), v2WithNewSystemsJson);

            var state = new SaveSystem(_testDir).Load().State;
            Assert.NotNull(state);

            // Preserves custom values and does not overwrite with defaults
            Assert.Equal(45.5, state.HayRack);
            Assert.Equal("stars", state.Decor.Equipped["wallpaper"]);
            Assert.Equal("wood", state.Decor.Equipped["floor"]);
            Assert.Contains("pic_01", state.Coloring.Completed);
            Assert.Contains("custom_pack", state.Coloring.UnlockedPacks);
            Assert.Equal(5, state.Care.Streaks["brushing"]);
            Assert.Equal(3, state.Health.SweetTreatsToday);
            Assert.Equal("2026-10-01", state.Health.TreatsLocalDate);
            Assert.Equal(4, state.Economy.GiftStreak);
            Assert.Equal(15, state.Economy.MinigameCloversToday);
            Assert.Single(state.Roster);
            Assert.Equal("pig_custom_1", state.Roster[0].Id);
            Assert.Equal("rosette", state.Roster[0].Breed);
            Assert.Equal("agouti", state.Roster[0].PaletteId);
            Assert.Equal("pig_custom_1", state.ActivePigIds[0]);
            Assert.Equal(6, state.MinigamePlays["runner"]);
            Assert.Equal(2, state.DayLogCounters["hay_eaten"]);
            Assert.True(state.IsAchievementEarned("first_run"));
        }

        [Fact]
        public void Load_MinimalSaveMissingOptionalFields_NormalizesSafely()
        {
            // Minimal save missing almost all top-level properties
            string minimalJson = @"{
  ""needs"": { }
}";
            File.WriteAllText(Path.Combine(_testDir, SaveSystem.FileName), minimalJson);

            var state = new SaveSystem(_testDir).Load().State;
            Assert.NotNull(state);

            Assert.Equal("Cuy", state.Name);
            Assert.Equal(GameState.CurrentVersion, state.Version);
            Assert.Equal(60.0, state.HayRack);
            Assert.NotNull(state.Needs);
            Assert.NotNull(state.Bond);
            Assert.Equal(1, state.Bond.Level);
            Assert.Equal(0, state.Clovers);
            Assert.NotNull(state.Roster);
            Assert.Single(state.Roster);
            Assert.Equal("Cuy", state.Roster[0].Name);
            Assert.NotNull(state.Care);
            Assert.NotNull(state.Health);
            Assert.NotNull(state.Decor);
            Assert.NotNull(state.Economy);
            Assert.NotNull(state.Coloring);
            Assert.NotNull(state.EarnedAchievements);
        }

        [Fact]
        public void Load_FromBackupFile_WhenMainIsDamaged_MigratesAndPopulatesDefaults()
        {
            // save.json is corrupted
            File.WriteAllText(Path.Combine(_testDir, SaveSystem.FileName), "INVALID JSON {{{");

            // save.bak has valid legacy v1 save
            string legacyV1Json = @"{
  ""version"": 1,
  ""name"": ""Latka"",
  ""birthDateUtc"": ""2026-09-01T00:00:00Z"",
  ""lastActiveUtc"": ""2026-09-01T01:00:00Z"",
  ""needs"": { },
  ""inventory"": { ""papryka"": 2 }
}";
            File.WriteAllText(Path.Combine(_testDir, SaveSystem.BackupFileName), legacyV1Json);

            var result = new SaveSystem(_testDir).Load();

            Assert.Equal(LoadSource.Backup, result.Source);
            Assert.NotNull(result.MainError);
            Assert.NotNull(result.State);

            var state = result.State;
            Assert.Equal("Latka", state.Name);
            Assert.Equal(GameState.CurrentVersion, state.Version);
            Assert.Equal(2, state.Inventory["bell_pepper"]);
            Assert.Equal(60.0, state.HayRack);
            Assert.NotNull(state.Roster);
            Assert.Single(state.Roster);
            Assert.Equal("Latka", state.Roster[0].Name);
            Assert.NotNull(state.Care);
            Assert.NotNull(state.Health);
            Assert.NotNull(state.Decor);
            Assert.NotNull(state.Coloring);
            Assert.NotNull(state.Economy);
        }
    }
}
