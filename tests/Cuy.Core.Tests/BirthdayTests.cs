using System;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class BirthdayTests
    {
        private static double RealDaysPerPigYear(Balance balance)
        {
            // 365 pig days / PigDaysPerRealDay
            return 365.0 / balance.PigDaysPerRealDay;
        }

        [Fact]
        public void Birthday_DefaultBalance_NothingIsPaid()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var balance = new Balance(); // BirthdayRewardsActive is false
            var pet = new Pet(GameState.CreateNew("Piggy", clock.UtcNow), clock, balance);
            int initialClovers = pet.State.Clovers;

            // Advance by 1 pig year (~17.4 real days)
            clock.Advance(TimeSpan.FromDays(RealDaysPerPigYear(balance) + 1));
            pet.Update();

            Assert.Equal(1, pet.State.BirthdaysCelebrated);
            Assert.Equal(initialClovers, pet.State.Clovers);
            Assert.False(pet.State.Inventory.ContainsKey("cake"));
            Assert.Empty(pet.State.Diary);
        }

        [Fact]
        public void Birthday_SingleBirthday_GrantsRewardCakeAndSingularDiary()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var balance = new Balance { BirthdayRewardsActive = true };
            var pet = new Pet(GameState.CreateNew("Piggy", clock.UtcNow), clock, balance);
            int initialClovers = pet.State.Clovers;

            // Advance by 1 pig year
            clock.Advance(TimeSpan.FromDays(RealDaysPerPigYear(balance) + 1));
            pet.Update();

            Assert.Equal(1, pet.State.BirthdaysCelebrated);
            Assert.Equal(initialClovers + 100, pet.State.Clovers);
            Assert.Equal(1, pet.State.Inventory["cake"]);
            Assert.Single(pet.State.Diary);
            Assert.Equal("Happy birthday to me! I am 1 year old today.", pet.State.Diary[0].Text);
            Assert.Equal(1, pet.State.Stats.Counters["birthdays"]);
        }

        [Fact]
        public void Birthday_ThreeMissedBirthdays_PaysThreeTimesAndGivesOneCake()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var balance = new Balance { BirthdayRewardsActive = true };
            var pet = new Pet(GameState.CreateNew("Piggy", clock.UtcNow), clock, balance);
            int initialClovers = pet.State.Clovers;

            // Advance by 3 pig years
            clock.Advance(TimeSpan.FromDays(RealDaysPerPigYear(balance) * 3 + 1));
            pet.Update();

            Assert.Equal(3, pet.State.BirthdaysCelebrated);
            Assert.Equal(initialClovers + 300, pet.State.Clovers);
            Assert.Equal(1, pet.State.Inventory["cake"]); // cake given once per CheckBirthdays call
            Assert.Equal(3, pet.State.Diary.Count);
            Assert.Equal("Happy birthday to me! I am 3 years old today.", pet.State.Diary.Last().Text);
            Assert.Equal(3, pet.State.Stats.Counters["birthdays"]);
        }

        [Fact]
        public void Birthday_FiveMissedBirthdays_PaysAtMostThreeTimes()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var balance = new Balance { BirthdayRewardsActive = true };
            var pet = new Pet(GameState.CreateNew("Piggy", clock.UtcNow), clock, balance);
            int initialClovers = pet.State.Clovers;

            // Advance by 5 pig years
            clock.Advance(TimeSpan.FromDays(RealDaysPerPigYear(balance) * 5 + 1));
            pet.Update();

            Assert.Equal(5, pet.State.BirthdaysCelebrated);
            // Cap of 3 rewards in one call
            Assert.Equal(initialClovers + 300, pet.State.Clovers);
            Assert.Equal(1, pet.State.Inventory["cake"]);
            Assert.Equal(3, pet.State.Diary.Count);
            Assert.Equal(3, pet.State.Stats.Counters["birthdays"]);
        }

        [Fact]
        public void Birthday_SaveAndLoad_DoesNotDoubleGrant()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var balance = new Balance { BirthdayRewardsActive = true };
            var pet = new Pet(GameState.CreateNew("Piggy", clock.UtcNow), clock, balance);

            // 1st birthday celebrated
            clock.Advance(TimeSpan.FromDays(RealDaysPerPigYear(balance) + 1));
            pet.Update();
            Assert.Equal(1, pet.State.BirthdaysCelebrated);
            int cloversAfter1 = pet.State.Clovers;

            var tempDir = Path.Combine(Path.GetTempPath(), "Cuy_BirthdayTest_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                var saveSystem = new SaveSystem(tempDir);
                saveSystem.Save(pet.State);

                var loaded = saveSystem.Load();
                var loadedPet = new Pet(loaded.State, clock, balance);

                // Updating at the same time does not grant anything new
                loadedPet.Update();
                Assert.Equal(1, loadedPet.State.BirthdaysCelebrated);
                Assert.Equal(cloversAfter1, loadedPet.State.Clovers);
                Assert.Equal(1, loadedPet.State.Inventory["cake"]);
                Assert.Single(loadedPet.State.Diary);
            }
            finally
            {
                if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
            }
        }
    }
}
