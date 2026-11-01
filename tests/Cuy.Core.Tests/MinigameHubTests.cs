using System;
using System.IO;
using Xunit;
using Cuy.Core;
using Cuy.Core.Save;
using Cuy.Core.Time;

namespace Cuy.Core.Tests
{
    public class MinigameHubTests
    {
        [Fact]
        public void PlaysCounterPerGame_IncrementsProperly()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());

            Assert.Empty(pet.State.MinigamePlays);

            pet.RecordMinigameResult("veggie_rain", 100, out _, out _);
            Assert.Equal(1, pet.State.MinigamePlays["veggie_rain"]);

            pet.RecordMinigameResult("veggie_rain", 50, out _, out _);
            Assert.Equal(2, pet.State.MinigamePlays["veggie_rain"]);

            pet.RecordMinigameResult("popcorn", 80, out _, out _);
            Assert.Equal(2, pet.State.MinigamePlays["veggie_rain"]);
            Assert.Equal(1, pet.State.MinigamePlays["popcorn"]);
        }

        [Fact]
        public void RewardedGame_FirstVsEleventh_DailyLimit()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());
            pet.Needs.Mood = 10.0;

            // 1st game
            pet.RecordMinigameResult("veggie_rain", 200, out int clovers1, out _);
            Assert.True(pet.LastMinigameResult.Rewarded);
            Assert.Equal(20, clovers1);
            Assert.Equal(20, pet.LastMinigameResult.Clovers);
            Assert.Equal(15.0, pet.LastMinigameResult.Mood);

            // Games 2 to 10
            for (int i = 2; i <= 10; i++)
            {
                pet.RecordMinigameResult("veggie_rain", 200, out _, out _);
            }

            Assert.Equal(10, pet.State.MinigamesDailyCount);

            // 11th game (over daily limit)
            pet.RecordMinigameResult("veggie_rain", 200, out int clovers11, out _);
            Assert.False(pet.LastMinigameResult.Rewarded);
            Assert.Equal(0, clovers11);
            Assert.Equal(0, pet.LastMinigameResult.Clovers);
            Assert.Equal(3.0, pet.LastMinigameResult.Mood);
        }

        [Fact]
        public void ScoreZero_GivesNoMoodAndNoClovers()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());
            double initialMood = pet.Needs.Mood;

            pet.RecordMinigameResult("veggie_rain", 0, out int clovers, out _);
            Assert.Equal(0, clovers);
            Assert.Equal(0, pet.LastMinigameResult.Clovers);
            Assert.Equal(0.0, pet.LastMinigameResult.Mood);
            Assert.Equal(initialMood, pet.Needs.Mood);
        }

        [Fact]
        public void LastMinigameResult_MatchesOutValues()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());

            pet.RecordMinigameResult("hay_maze", 350, out int clovers, out bool isRecord);
            var res = pet.LastMinigameResult;

            Assert.NotNull(res);
            Assert.Equal("hay_maze", res.GameId);
            Assert.Equal(350, res.Score);
            Assert.Equal(clovers, res.Clovers);
            Assert.Equal(isRecord, res.IsNewRecord);
            Assert.True(res.Rewarded);
        }

        [Fact]
        public void SaveAndLoad_KeepsMinigamePlays()
        {
            string tempDir = Path.Combine(Path.GetTempPath(), "cuy_test_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                var saveSystem = new SaveSystem(tempDir);
                var state = new GameState();
                state.MinigamePlays["hay_maze"] = 5;
                state.MinigamePlays["popcorn"] = 12;

                saveSystem.Save(state);
                var loadedResult = saveSystem.Load();
                var loaded = loadedResult.State;

                Assert.NotNull(loaded.MinigamePlays);
                Assert.Equal(5, loaded.MinigamePlays["hay_maze"]);
                Assert.Equal(12, loaded.MinigamePlays["popcorn"]);
            }
            finally
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
        }
    }
}
