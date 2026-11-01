using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class AwayTests
    {
        [Fact]
        public void Away_AppliesOfflineDecayRate()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(GameState.CreateNew("Pig1", clock.UtcNow), clock);

            var expectedNeeds = new Needs();
            expectedNeeds.ApplyTime(TimeSpan.FromHours(2), offline: true, sleeping: false, pet.Balance);

            // Pet updates with IsAway = true
            pet.SetAway(true);
            clock.Advance(TimeSpan.FromHours(2));
            pet.Update();

            // Hunger and mood decay should match the offline rates
            Assert.Equal(expectedNeeds.Satiety, pet.State.Needs.Satiety, 1);
            Assert.Equal(expectedNeeds.Mood, pet.State.Needs.Mood, 1);
        }

        [Fact]
        public void Away_PreventsPooping()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(GameState.CreateNew("Piggy", clock.UtcNow), clock);

            pet.SetAway(true);
            Assert.False(pet.TryAddPoop());
            Assert.Equal(0, pet.State.PoopCount);

            // After SetAway(false), pooping works again
            pet.SetAway(false);
            Assert.True(pet.TryAddPoop());
            Assert.Equal(1, pet.State.PoopCount);
        }

        [Fact]
        public void Away_NotSavedInGameState()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(GameState.CreateNew("Piggy", clock.UtcNow), clock);

            pet.SetAway(true);
            Assert.True(pet.IsAway);

            var tempDir = Path.Combine(Path.GetTempPath(), "Cuy_AwayTest_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                var saveSystem = new SaveSystem(tempDir);
                saveSystem.Save(pet.State);

                var loaded = saveSystem.Load();
                var loadedPet = new Pet(loaded.State, clock);

                Assert.False(loadedPet.IsAway);
            }
            finally
            {
                if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
            }
        }
    }
}
