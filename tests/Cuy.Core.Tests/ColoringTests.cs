using System;
using Xunit;
using Cuy.Core;
using Cuy.Core.Time;
using Cuy.Core.Economy;

namespace Cuy.Core.Tests
{
    public class ColoringTests
    {
        [Fact]
        public void SaveColoringProgress_ValidatesAndSaves()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock, new Balance());

            // Valid progress
            pet.SaveColoringProgress("gp_001", "10101");
            Assert.Equal("10101", pet.GetColoringProgress("gp_001"));

            // Invalid characters (rejected)
            pet.SaveColoringProgress("gp_002", "101a");
            Assert.Null(pet.GetColoringProgress("gp_002"));

            // Empty string (rejected)
            pet.SaveColoringProgress("gp_003", "");
            Assert.Null(pet.GetColoringProgress("gp_003"));
        }

        [Fact]
        public void SaveColoringProgress_EnforcesSizeGuard()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock, new Balance());

            for (int i = 0; i < 305; i++)
            {
                pet.SaveColoringProgress($"pic_{i}", "101");
            }

            Assert.Equal(300, state.Coloring.Progress.Count);
            // Verify older ones were dropped (this assumes the first keys added are the first returned by default enumeration)
            Assert.False(state.Coloring.Progress.ContainsKey("pic_0"));
            Assert.True(state.Coloring.Progress.ContainsKey("pic_304"));
        }

        [Fact]
        public void CompleteColoring_ValidInput_AwardsCloversAndUpdatesState()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock, new Balance());

            pet.SaveColoringProgress("gp_001", "11111");

            // cells = 5, paintedOnes = 5
            int clovers = pet.CompleteColoring("gp_001", 5, 5);

            // EconomyConfig.Coloring.MinPerPicture is 5
            Assert.Equal(5, clovers);
            Assert.Contains("gp_001", state.Coloring.Completed);
            Assert.False(state.Coloring.Progress.ContainsKey("gp_001"));
            Assert.Equal("gp_001", state.Coloring.LastRewardPictureId);
            Assert.Equal(5, state.Coloring.LastRewardClovers);
            Assert.Equal(5, state.Clovers);
        }

        [Fact]
        public void CompleteColoring_WrongPaintedOnes_DoesNotAward()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock, new Balance());

            pet.SaveColoringProgress("gp_001", "10111");

            int clovers = pet.CompleteColoring("gp_001", 5, 4); // not matching 5 cells

            Assert.Equal(0, clovers);
            Assert.DoesNotContain("gp_001", state.Coloring.Completed);
        }

        [Fact]
        public void CompleteColoring_AlreadyCompleted_DoesNotAward()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock, new Balance());

            state.Coloring.Completed.Add("gp_001");

            int clovers = pet.CompleteColoring("gp_001", 5, 5);
            Assert.Equal(0, clovers);
        }

        [Fact]
        public void CompleteColoring_RespectsDailyLimit()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock, new Balance());

            int configLimit = EconomyConfig.Current.Coloring.RewardedPicturesPerDay;

            int totalClovers = 0;
            for (int i = 0; i < configLimit + 2; i++)
            {
                pet.SaveColoringProgress($"pic_{i}", "11111");
                totalClovers += pet.CompleteColoring($"pic_{i}", 5, 5);
            }

            // Each picture gives 5 clovers. Should max out at 5 * configLimit (5 * 5 = 25)
            Assert.Equal(5 * configLimit, totalClovers);
        }

        [Fact]
        public void UnlockColoringPack_SucceedsIfEnoughClovers()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock, new Balance());

            state.Clovers = 100;

            bool success = pet.UnlockColoringPack("new_pack", 50);

            Assert.True(success);
            Assert.Contains("new_pack", state.Coloring.UnlockedPacks);
            Assert.Equal(50, state.Clovers); // Paid 50
        }

        [Fact]
        public void UnlockColoringPack_FailsIfNotEnoughClovers()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock, new Balance());

            state.Clovers = 30;

            bool success = pet.UnlockColoringPack("new_pack", 50);

            Assert.False(success);
            Assert.DoesNotContain("new_pack", state.Coloring.UnlockedPacks);
            Assert.Equal(30, state.Clovers); // Still 30
        }
    }
}
