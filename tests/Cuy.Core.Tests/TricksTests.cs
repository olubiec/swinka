using System;
using System.IO;
using System.Linq;
using Xunit;
using Cuy.Core;
using Cuy.Core.Time;

namespace Cuy.Core.Tests
{
    public class TricksTests
    {
        public static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    return Path.Combine(dir, relativePath);
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Cannot find repo root to resolve {relativePath}");
        }

        [Fact]
        public void Load_RealJson_ParsesCorrectly()
        {
            string json = File.ReadAllText(RepoFile("assets/data/tricks.json"));
            var config = TricksConfig.Load(json);

            Assert.NotNull(config);
            Assert.Equal(10, config.EnergyCost);
            Assert.Equal(25, config.MinEnergy);
            Assert.Equal(30, config.CooldownSeconds);
            Assert.Equal(2, config.BondPoints);
            Assert.Equal(3, config.MoodGain);
            Assert.NotNull(config.Tricks);
            Assert.Equal(4, config.Tricks.Count);

            var ids = config.Tricks.Select(t => t.Id).ToList();
            Assert.Equal(new[] { "spin", "stand_up", "popcorn", "hurdle" }, ids);
        }

        [Fact]
        public void Load_BrokenJson_ReturnsDefaultsWithoutThrowing()
        {
            string brokenJson = "{ \"tricks\": [ { \"id\": \"test\" } "; // Missing closing brackets
            var config = TricksConfig.Load(brokenJson);

            Assert.NotNull(config);
            Assert.Equal(4, config.Tricks.Count); // From defaults
            Assert.Equal(10, config.EnergyCost);
        }

        [Fact]
        public void GetTricks_ReflectsBondLevel()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());

            // Set bond level 1 (should be all locked)
            pet.State.Bond.Level = 1;

            var tricks = pet.GetTricks().ToList();
            Assert.Equal(4, tricks.Count);
            Assert.All(tricks, t => Assert.False(t.Unlocked));

            // Set bond level 20 (should be all unlocked)
            pet.State.Bond.Level = 20;

            var tricksUnocked = pet.GetTricks().ToList();
            Assert.Equal(4, tricksUnocked.Count);
            Assert.All(tricksUnocked, t => Assert.True(t.Unlocked));
        }

        [Fact]
        public void TryPerformTrick_Fails_IfUnknown()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());

            var result = pet.TryPerformTrick("non_existent_trick");
            Assert.Equal(TrickResult.Unknown, result);
        }

        [Fact]
        public void TryPerformTrick_Fails_IfSleeping()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());

            pet.IsSleeping = true;
            var result = pet.TryPerformTrick("spin");
            Assert.Equal(TrickResult.Sleeping, result);
        }

        [Fact]
        public void TryPerformTrick_Fails_IfLocked()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());

            pet.State.Bond.Level = 1; // Locked

            var result = pet.TryPerformTrick("spin");
            Assert.Equal(TrickResult.Locked, result);
        }

        [Fact]
        public void TryPerformTrick_Fails_IfTired()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());

            pet.State.Bond.Level = 20; // Unlocked
            pet.State.Needs.Energy = 20; // Lower than MinEnergy (25)

            var result = pet.TryPerformTrick("spin");
            Assert.Equal(TrickResult.Tired, result);
        }

        [Fact]
        public void TryPerformTrick_Succeeds_And_AppliesCooldown()
        {
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(new GameState(), clock, Balance.CreateDefault());

            pet.State.Bond.Level = 20; // Unlocked
            pet.State.Needs.Energy = 100;
            pet.State.Needs.Mood = 50;

            // Should succeed
            var result = pet.TryPerformTrick("spin");
            Assert.Equal(TrickResult.Ok, result);

            // Check effects
            Assert.Equal(90, pet.State.Needs.Energy); // 100 - 10
            Assert.Equal(53, pet.State.Needs.Mood); // 50 + 3

            pet.State.Stats.Counters.TryGetValue("tricks_performed", out int performed);
            Assert.Equal(1, performed);
            pet.State.Stats.Counters.TryGetValue("trick_spin", out int spinCount);
            Assert.Equal(1, spinCount);

            // Immediate second try should hit cooldown
            var result2 = pet.TryPerformTrick("spin");
            Assert.Equal(TrickResult.Cooldown, result2);

            // Advance time past cooldown
            clock.Advance(TimeSpan.FromSeconds(31));

            // Should succeed again
            var result3 = pet.TryPerformTrick("spin");
            Assert.Equal(TrickResult.Ok, result3);
        }
    }
}