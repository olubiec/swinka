using System;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MinigameRewardTests
    {
        [Fact]
        public void Minigame_AwardsClovers_CappedAt40()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Tester", clock.UtcNow);
            state.Clovers = 10;
            var pet = new Pet(state, clock);

            // 150 points -> 15 clovers
            bool isRecord = pet.RecordMinigameResult("veggie_rain", 150, out int clovers, out bool isNewRecord);
            Assert.True(isNewRecord);
            Assert.Equal(15, clovers);
            Assert.Equal(25, state.Clovers);
            Assert.Equal(150, state.HighScores["veggie_rain"]);

            // 600 points -> max 40 clovers
            pet.RecordMinigameResult("veggie_rain", 600, out int cloversMax, out bool isNewRecord2);
            Assert.True(isNewRecord2);
            Assert.Equal(40, cloversMax);
            Assert.Equal(65, state.Clovers);
            Assert.Equal(600, state.HighScores["veggie_rain"]);
        }

        [Fact]
        public void Minigame_IncreasesMoodBy15()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Tester", clock.UtcNow);
            state.Needs.Mood = 50.0;
            var pet = new Pet(state, clock);

            pet.RecordMinigameResult("test_game", 100, out _, out _);
            Assert.Equal(65.0, state.Needs.Mood);

            state.Needs.Mood = 95.0;
            pet.RecordMinigameResult("test_game", 100, out _, out _);
            Assert.Equal(100.0, state.Needs.Mood);
        }

        [Fact]
        public void Minigame_Max10RewardedGamesPerDay()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Tester", clock.UtcNow);
            var pet = new Pet(state, clock);

            // 10 rewarded games
            for (int i = 1; i <= 10; i++)
            {
                pet.RecordMinigameResult("popcorn", 100, out int clovers, out _);
                Assert.Equal(10, clovers);
            }
            Assert.Equal(100, state.Clovers);
            Assert.Equal(10, state.MinigamesDailyCount);

            // 11th game on the same day -> 0 clovers, but score and mood still work
            state.Needs.Mood = 40.0;
            pet.RecordMinigameResult("popcorn", 120, out int clovers11, out bool isRecord);
            Assert.Equal(0, clovers11);
            Assert.Equal(100, state.Clovers);
            Assert.Equal(55.0, state.Needs.Mood);
            Assert.True(isRecord);
            Assert.Equal(120, state.HighScores["popcorn"]);

            // Next day -> limit reset
            clock.Advance(TimeSpan.FromDays(1));
            pet.RecordMinigameResult("popcorn", 100, out int cloversNextDay, out _);
            Assert.Equal(10, cloversNextDay);
            Assert.Equal(110, state.Clovers);
            Assert.Equal(1, state.MinigamesDailyCount);
        }
    }
}
