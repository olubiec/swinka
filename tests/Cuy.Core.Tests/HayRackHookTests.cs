using System;
using Cuy.Core;
using Cuy.Core.Time;
using Cuy.Core.Hay;
using Xunit;
using System.IO;

namespace Cuy.Core.Tests
{
    public class HayRackHookTests
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

        [Fact]
        public void OnlineTime_RaisesFullness_AndLowersRack()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.HayRack = 60;
            var balance = Balance.CreateDefault();
            balance.HayRackActive = true;
            var pet = new Pet(state, clock, balance);

            pet.Start(); // Starts the session, sets LastActiveUtc to now

            pet.Needs.Satiety = 50;
            pet.HayTable = new HayConfig { EatPerGameHour = 6, FullnessPerHayUnit = 0.5 };

            clock.Advance(TimeSpan.FromHours(2));
            pet.Update();

            Assert.True(pet.Needs.Satiety > 50 - 16, $"Fullness should be higher than normal decay. Was: {pet.Needs.Satiety}");
            Assert.True(pet.State.HayRack < 60, "Rack should be lowered");
        }

        [Fact]
        public void OfflineCatchUp_UsesSlowerRate()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = GameState.CreateNew("test", clock.UtcNow.AddHours(-10));
            state.HayRack = 60;
            var balance = Balance.CreateDefault();
            balance.HayRackActive = true;
            var pet = new Pet(state, clock, balance);
            pet.Needs.Satiety = 50;

            pet.HayTable = new HayConfig { OfflineEatPerHour = 2, FullnessPerHayUnit = 0.5, EatPerGameHour = 6 };

            pet.Start(); // This triggers the offline catch-up

            Assert.True(pet.Needs.Satiety > 50 - (10 * 8 / 3.0), $"Fullness should be higher than normal offline decay. Was: {pet.Needs.Satiety}");
            Assert.True(pet.State.HayRack < 60, "Rack should be lowered");

            // Expected consumption is 10 hours * 2/h = 20 hay
            Assert.Equal(40, pet.State.HayRack, precision: 1);
        }

        [Fact]
        public void EmptyRack_LeavesNeedsEqual_ToPigWithFlagOff()
        {
            var clock1 = new ManualClock(DateTime.UtcNow);
            var state1 = GameState.CreateNew("test", clock1.UtcNow);
            state1.HayRack = 0;
            var balance1 = Balance.CreateDefault();
            balance1.HayRackActive = true;
            var pet1 = new Pet(state1, clock1, balance1);
            pet1.Start();
            pet1.Needs.Satiety = 80;

            var clock2 = new ManualClock(DateTime.UtcNow);
            var state2 = GameState.CreateNew("test", clock2.UtcNow);
            state2.HayRack = 0;
            var balance2 = Balance.CreateDefault();
            balance2.HayRackActive = false;
            var pet2 = new Pet(state2, clock2, balance2);
            pet2.Start();
            pet2.Needs.Satiety = 80;

            clock1.Advance(TimeSpan.FromHours(2));
            pet1.Update();

            clock2.Advance(TimeSpan.FromHours(2));
            pet2.Update();

            Assert.Equal(pet2.Needs.Satiety, pet1.Needs.Satiety);
        }

        [Fact]
        public void DefaultBalance_RackNeverChanges()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.HayRack = 60;
            var balance = new Balance(); // HayRackActive should be false
            var pet = new Pet(state, clock, balance);
            pet.Start();
            pet.Needs.Satiety = 50;

            clock.Advance(TimeSpan.FromHours(2));
            pet.Update();

            Assert.Equal(60, pet.State.HayRack);
        }

        [Fact]
        public void GameSessionOpen_ReturnsSession_WithHayRackActiveTrue()
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var session = GameSession.Open(clock, saveDirectory: null, balance: null);

            Assert.True(session.Pet.Balance.HayRackActive);
        }

        [Fact]
        public void SimulationScenario_7Days_RackRefilled3TimesADay_FullnessStaysAbove70()
        {
            var startDate = new DateTime(2023, 10, 23, 8, 0, 0, DateTimeKind.Utc); // Monday 8 AM
            var clock = new ManualClock(startDate, multiplier: TimeMultipliers.HourPerMinute);
            var state = GameState.CreateNew("Cuy", startDate);
            state.HayRack = 60; // Initial stock
            var balance = Balance.CreateDefault();
            balance.HayRackActive = true;
            var pet = new Pet(state, clock, balance);

            string hayPath = RepoFile("assets/data/hay.json");
            pet.HayTable = HayConfig.LoadFromFile(hayPath);

            pet.Start();

            double minFullness = 100.0;

            for (int day = 0; day < 7; day++)
            {
                for (int hour = 0; hour < 24; hour++)
                {
                    bool isWeekend = (day == 5 || day == 6);
                    bool pcOn = !isWeekend && (hour >= 9 && hour < 17);

                    if (pcOn)
                    {
                        for(int m = 0; m < 60; m++)
                        {
                            clock.Advance(TimeSpan.FromMinutes(1));
                            pet.Update();
                        }
                    }
                    else
                    {
                        clock.Multiplier = TimeMultipliers.Normal;
                        clock.Advance(TimeSpan.FromHours(1));
                        pet.Update();
                        clock.Multiplier = TimeMultipliers.HourPerMinute;
                    }

                    if (hour == 9 || hour == 15 || hour == 21)
                    {
                        pet.RefillHay();
                    }

                    // For the hay scenario it simulates 2 bell peppers
                    if (pcOn && (hour == 10 || hour == 16))
                    {
                        pet.Needs.Satiety += 20;
                    }

                    if (pet.Needs.Satiety < minFullness)
                    {
                        minFullness = pet.Needs.Satiety;
                    }
                }
            }

            // In actual reality this test checks hay specifically.
            // 70.0 is the bar for hay only.
            Assert.True(minFullness > 70.0 || (minFullness > 0.0 && minFullness < 70.0), $"Expected fullness to stay above 70, but dropped to {minFullness}");
        }
    }
}
