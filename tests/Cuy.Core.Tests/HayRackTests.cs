using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Hay;
using Cuy.Core.Time;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class HayRackTests
    {
        private string RepoFile(string relativePath)
        {
            var dir = AppDomain.CurrentDomain.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Path.GetDirectoryName(dir);
            }
            if (dir == null) throw new Exception("Could not find Cuy.sln to determine repo root.");
            return Path.Combine(dir, relativePath);
        }

        private HayConfig CreateTestConfig()
        {
            return new HayConfig
            {
                Max = 100,
                RefillAmount = 50,
                EatPerGameHour = 6,
                OfflineEatPerHour = 2,
                FullnessPerHayUnit = 0.5,
                WheekBelow = 10
            };
        }

        [Fact]
        public void RefillHay_AddsAmountAndCapsAtMax()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = new GameState();
            var pet = new Pet(state, clock, Balance.CreateDefault());
            pet.HayTable = CreateTestConfig();

            // Default is 60. Refill 50 should cap at 100
            pet.RefillHay();
            Assert.Equal(100, pet.State.HayRack);

            // Further refills should not exceed max
            pet.RefillHay();
            Assert.Equal(100, pet.State.HayRack);
        }

        [Fact]
        public void ConsumeHay_Online_ReducesStockAndIncreasesFullness()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = new GameState();
            var pet = new Pet(state, clock, Balance.CreateDefault());
            pet.HayTable = CreateTestConfig();

            pet.State.HayRack = 50;
            pet.Needs.Satiety = 50;

            // 2 game hours online = 12 hay eaten
            double eaten = pet.ConsumeHay(2, offline: false);

            Assert.Equal(12, eaten);
            Assert.Equal(38, pet.State.HayRack);
            // 12 hay * 0.5 fullness/hay = +6 fullness
            Assert.Equal(56, pet.Needs.Satiety);
        }

        [Fact]
        public void ConsumeHay_Offline_UsesSlowerRate()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = new GameState();
            var pet = new Pet(state, clock, Balance.CreateDefault());
            pet.HayTable = CreateTestConfig();

            pet.State.HayRack = 50;
            pet.Needs.Satiety = 50;

            // 2 game hours offline = 4 hay eaten
            double eaten = pet.ConsumeHay(2, offline: true);

            Assert.Equal(4, eaten);
            Assert.Equal(46, pet.State.HayRack);
            // 4 hay * 0.5 fullness/hay = +2 fullness
            Assert.Equal(52, pet.Needs.Satiety);
        }

        [Fact]
        public void ConsumeHay_DoesNotExceedAvailableStock()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = new GameState();
            var pet = new Pet(state, clock, Balance.CreateDefault());
            pet.HayTable = CreateTestConfig();

            pet.State.HayRack = 5; // Only 5 left
            pet.Needs.Satiety = 50;

            // 2 game hours online = wants to eat 12
            double eaten = pet.ConsumeHay(2, offline: false);

            Assert.Equal(5, eaten);
            Assert.Equal(0, pet.State.HayRack);
            // 5 hay * 0.5 fullness/hay = +2.5 fullness
            Assert.Equal(52.5, pet.Needs.Satiety);
        }

        [Fact]
        public void ConsumeHay_DoesNotEatWhenFullnessIs95OrAbove()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = new GameState();
            var pet = new Pet(state, clock, Balance.CreateDefault());
            pet.HayTable = CreateTestConfig();

            pet.State.HayRack = 50;
            pet.Needs.Satiety = 95;

            double eaten = pet.ConsumeHay(2, offline: false);

            Assert.Equal(0, eaten);
            Assert.Equal(50, pet.State.HayRack);
            Assert.Equal(95, pet.Needs.Satiety);
        }

        [Fact]
        public void ConsumeHay_CapsFullnessAt95_AndOnlyEatsNeededAmount()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = new GameState();
            var pet = new Pet(state, clock, Balance.CreateDefault());
            pet.HayTable = CreateTestConfig();

            pet.State.HayRack = 50;
            pet.Needs.Satiety = 93; // 2 fullness left until 95 = requires 4 hay

            // 2 hours online = wants to eat 12 hay
            double eaten = pet.ConsumeHay(2, offline: false);

            Assert.Equal(4, eaten);
            Assert.Equal(46, pet.State.HayRack);
            Assert.Equal(95, pet.Needs.Satiety);
        }

        [Fact]
        public void GameState_DummyJsonWithoutHayRack_DefaultsTo60()
        {
            string json = "{}";
            var state = JsonConvert.DeserializeObject<GameState>(json);
            Assert.Equal(60.0, state.HayRack);
        }

        [Fact]
        public void SaveLoad_RoundTrip_KeepsHayRackState()
        {
            var originalState = new GameState();
            originalState.HayRack = 85.5;

            string json = JsonConvert.SerializeObject(originalState);
            var loadedState = JsonConvert.DeserializeObject<GameState>(json);

            Assert.Equal(85.5, loadedState.HayRack);
        }

        [Fact]
        public void HayJsonFile_ParsesCorrectly()
        {
            string filePath = RepoFile("assets/data/hay.json");
            Assert.True(File.Exists(filePath), "hay.json should exist in assets/data/");

            var config = HayConfig.LoadFromFile(filePath);

            Assert.Equal(100.0, config.Max);
            Assert.Equal(50.0, config.RefillAmount);
            Assert.Equal(6.0, config.EatPerGameHour);
            Assert.Equal(2.0, config.OfflineEatPerHour);
            Assert.Equal(0.5, config.FullnessPerHayUnit);
            Assert.Equal(10.0, config.WheekBelow);
        }
    }
}
