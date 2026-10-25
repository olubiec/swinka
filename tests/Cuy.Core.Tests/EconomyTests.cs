using System;
using Cuy.Core.Economy;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class EconomyTests
    {
        [Fact]
        public void GiftStreak_IncreasesAmount_AndMissedDayResets()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, new Balance());

            // Day 1: Streak 1, amount 10
            int amt1 = pet.ClaimDailyGift();
            Assert.Equal(10, amt1);
            Assert.Equal(1, pet.State.Economy.GiftStreak);

            // Day 2: Streak 2, amount 15
            clock.Advance(TimeSpan.FromDays(1));
            int amt2 = pet.ClaimDailyGift();
            Assert.Equal(15, amt2);
            Assert.Equal(2, pet.State.Economy.GiftStreak);

            // Day 3: Streak 3, amount 20
            clock.Advance(TimeSpan.FromDays(1));
            int amt3 = pet.ClaimDailyGift();
            Assert.Equal(20, amt3);
            Assert.Equal(3, pet.State.Economy.GiftStreak);

            // Missed day resets streak -> Streak 1, amount 10
            clock.Advance(TimeSpan.FromDays(2));
            int amt4 = pet.ClaimDailyGift();
            Assert.Equal(10, amt4);
            Assert.Equal(1, pet.State.Economy.GiftStreak);
        }

        [Fact]
        public void MaxGiftLimit_IsEnforced()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, new Balance());

            int maxGift = 0;
            for (int i = 0; i < 20; i++)
            {
                maxGift = pet.ClaimDailyGift();
                clock.Advance(TimeSpan.FromDays(1));
            }
            Assert.Equal(50, maxGift);
        }

        [Fact]
        public void ClaimTwiceSameDay_ReturnsZero()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, new Balance());

            int amt1 = pet.ClaimDailyGift();
            Assert.Equal(10, amt1);

            int amt2 = pet.ClaimDailyGift();
            Assert.Equal(0, amt2);
        }

        [Fact]
        public void MinigameDailyCap_AcrossGames()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, new Balance());

            int totalClovers = 0;

            // Max per game is 40. 4 games of 400 points = 160 clovers, but daily cap is 150.
            for (int i = 0; i < 4; i++)
            {
                pet.RecordMinigameResult("test", 400, out int clovers, out bool _);
                totalClovers += clovers;
            }

            Assert.Equal(150, totalClovers);
            Assert.Equal(150, pet.State.Economy.MinigameCloversToday);
        }

        [Fact]
        public void ColoringMinMaxDailyLimit()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, new Balance());

            // Below min (e.g., 0 cells -> 0/40 = 0, but min is 5)
            int clovers1 = pet.AwardColoring(0);
            Assert.Equal(5, clovers1);

            // Above max (e.g., 2000 cells -> 50, but max is 25)
            int clovers2 = pet.AwardColoring(2000);
            Assert.Equal(25, clovers2);

            // Normal amount (e.g., 400 cells -> 10)
            int clovers3 = pet.AwardColoring(400);
            Assert.Equal(10, clovers3);

            // Reaching daily limit of 5 pictures
            pet.AwardColoring(400);
            pet.AwardColoring(400);

            // 6th picture should give 0
            int clovers6 = pet.AwardColoring(400);
            Assert.Equal(0, clovers6);
        }

        [Fact]
        public void CareTaskCap()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, new Balance());

            int total = 0;
            for (int i = 0; i < 6; i++)
            {
                total += pet.AwardCareTask();
            }
            Assert.Equal(30, total); // 6 tasks * 5 clovers

            int extra = pet.AwardCareTask();
            Assert.Equal(0, extra);
        }

        [Fact]
        public void TryPay_ChecksClovers()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, new Balance());

            pet.State.Clovers = 10;

            bool result1 = pet.TryPay(15, "food");
            Assert.False(result1);
            Assert.Equal(10, pet.State.Clovers);

            bool result2 = pet.TryPay(10, "food");
            Assert.True(result2);
            Assert.Equal(0, pet.State.Clovers);

            int stat;
            pet.State.Stats.Counters.TryGetValue("spent_food", out stat);
            Assert.Equal(1, stat);

            pet.State.Stats.Counters.TryGetValue("spent_clovers", out stat);
            Assert.Equal(10, stat);
        }

        [Fact]
        public void OldSaveWithoutEconomy_Works()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));

            // Simulating an old save without the Economy object set
            var oldState = new GameState();
            // the _economy backing field is uninitialized (null)

            var pet = new Pet(oldState, clock, new Balance());

            // Accessing it should create it lazily without crashing
            int clovers = pet.AwardCareTask();
            Assert.Equal(5, clovers);
            Assert.NotNull(oldState.Economy);
        }
    }
}
