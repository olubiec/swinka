using System;
using System.Collections.Generic;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigLocationTests
    {
        [Fact]
        public void L1_Start_StarterPigAtSalonNotPinned()
        {
            var state = new GameState();
            state.EnsureRosterInitialized();
            Assert.NotEmpty(state.Roster);
            var starterId = state.Roster[0].Id;
            var loc = state.GetPigLocation(starterId);
            Assert.NotNull(loc);
            Assert.Equal("salon", loc.SceneId);
            Assert.False(loc.Pinned);
        }

        [Fact]
        public void L2_AdjacentOnly_MovesOnlyToPreviousOrNextInRing()
        {
            var order = new[] { "salon", "pig:kuki", "dorm", "garden", "park", "farm", "market" };
            var clock = new ManualClock(new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc));
            var cfg = new PigRoamingConfig { IntervalMinSeconds = 600, IntervalMaxSeconds = 1800, SleepStartHour = 22, SleepEndHour = 7 };

            for (int seed = 0; seed < 20; seed++)
            {
                var rng = new Random(seed);
                var state = new GameState();
                state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
                var loc = state.GetPigLocation("kuki");
                loc.SceneId = "dorm";
                loc.NextMoveAt = clock.UtcNow;

                PigRoamer.Tick(state, order, _ => true, clock, rng, cfg);

                Assert.True(loc.SceneId == "pig:kuki" || loc.SceneId == "garden",
                    $"Expected pig:kuki or garden, but was {loc.SceneId}");
            }

            // Ring wrap-around
            {
                var rng = new Random(42);
                var state = new GameState();
                state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
                var loc = state.GetPigLocation("kuki");
                loc.SceneId = "salon";
                loc.NextMoveAt = clock.UtcNow;

                PigRoamer.Tick(state, order, _ => true, clock, rng, cfg);
                Assert.True(loc.SceneId == "market" || loc.SceneId == "pig:kuki");
            }
        }

        [Fact]
        public void L3_LockedSkipped_NeverMovesIntoLockedScene_StaysIfBothLocked()
        {
            var order = new[] { "salon", "pig:kuki", "dorm", "garden", "park", "farm", "market" };
            var clock = new ManualClock(new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc));
            var cfg = new PigRoamingConfig { IntervalMinSeconds = 600, IntervalMaxSeconds = 1800, SleepStartHour = 22, SleepEndHour = 7 };

            // Case A: pig:kuki is locked, garden is unlocked. Must pick garden.
            {
                var state = new GameState();
                state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
                var loc = state.GetPigLocation("kuki");
                loc.SceneId = "dorm";
                loc.NextMoveAt = clock.UtcNow;

                PigRoamer.Tick(state, order, scene => scene != "pig:kuki", clock, new Random(1), cfg);
                Assert.Equal("garden", loc.SceneId);
            }

            // Case B: both neighbours locked. Must stay at dorm.
            {
                var state = new GameState();
                state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
                var loc = state.GetPigLocation("kuki");
                loc.SceneId = "dorm";
                loc.NextMoveAt = clock.UtcNow;

                PigRoamer.Tick(state, order, scene => scene != "pig:kuki" && scene != "garden", clock, new Random(1), cfg);
                Assert.Equal("dorm", loc.SceneId);
            }
        }

        [Fact]
        public void L4_PinnedStays_PinnedPigDoesNotMove()
        {
            var order = new[] { "salon", "pig:kuki", "dorm", "garden", "park", "farm", "market" };
            var clock = new ManualClock(new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc));
            var cfg = new PigRoamingConfig { IntervalMinSeconds = 600, IntervalMaxSeconds = 1800, SleepStartHour = 22, SleepEndHour = 7 };

            var state = new GameState();
            state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
            var loc = state.GetPigLocation("kuki");
            loc.SceneId = "garden";
            loc.Pinned = true;

            for (int i = 0; i < 50; i++)
            {
                clock.Advance(TimeSpan.FromHours(1));
                PigRoamer.Tick(state, order, _ => true, clock, new Random(i), cfg);
                Assert.Equal("garden", loc.SceneId);
            }
        }

        [Fact]
        public void L5_OneLocation_TwoPigsMayBeInOneScene_NeverDuplicatesOrLoses()
        {
            var order = new[] { "salon", "pig:kuki", "pig:ned", "garden" };
            var clock = new ManualClock(new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc));
            var cfg = new PigRoamingConfig { IntervalMinSeconds = 600, IntervalMaxSeconds = 1800, SleepStartHour = 22, SleepEndHour = 7 };

            var state = new GameState();
            state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
            state.Roster.Add(new PigProfile("Ned") { Id = "ned" });

            var locKuki = state.GetPigLocation("kuki");
            var locNed = state.GetPigLocation("ned");
            Assert.Equal("salon", locKuki.SceneId);
            Assert.Equal("salon", locNed.SceneId);
            Assert.Equal(2, state.PigLocations.Count);

            // Move Kuki to garden
            locKuki.SceneId = "garden";
            Assert.Equal("garden", state.GetPigLocation("kuki").SceneId);
            Assert.Equal("salon", state.GetPigLocation("ned").SceneId);
            Assert.Equal(2, state.PigLocations.Count);

            // Move Ned to garden
            locNed.SceneId = "garden";
            Assert.Equal("garden", state.GetPigLocation("kuki").SceneId);
            Assert.Equal("garden", state.GetPigLocation("ned").SceneId);
            Assert.Equal(2, state.PigLocations.Count);

            // Tick roamer: still exactly 2 locations
            clock.Advance(TimeSpan.FromHours(2));
            PigRoamer.Tick(state, order, _ => true, clock, new Random(42), cfg);
            Assert.Equal(2, state.PigLocations.Count);
            Assert.NotNull(state.GetPigLocation("kuki"));
            Assert.NotNull(state.GetPigLocation("ned"));
        }

        [Fact]
        public void L6_OldSave_PutsEveryPigAtSalonFree_NothingDuplicated()
        {
            string json = @"{
                ""version"": 2,
                ""name"": ""OldPig"",
                ""roster"": [
                    { ""id"": ""pig-1"", ""name"": ""Kuki"" },
                    { ""id"": ""pig-2"", ""name"": ""Ned"" }
                ]
            }";
            var state = Newtonsoft.Json.JsonConvert.DeserializeObject<GameState>(json, SaveSystem.JsonSettings);
            Assert.NotNull(state);
            Assert.Equal(2, state.PigLocations.Count);

            var loc1 = state.GetPigLocation("pig-1");
            Assert.NotNull(loc1);
            Assert.Equal("salon", loc1.SceneId);
            Assert.False(loc1.Pinned);

            var loc2 = state.GetPigLocation("pig-2");
            Assert.NotNull(loc2);
            Assert.Equal("salon", loc2.SceneId);
            Assert.False(loc2.Pinned);

            Assert.Equal(2, state.PigLocations.Count);
        }

        [Fact]
        public void L7_Deterministic_SameSeedGivesSameRoute_DifferentSeedCanDiffer()
        {
            var order = new[] { "salon", "pig:kuki", "dorm", "garden", "park", "farm", "market" };
            var startUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var cfg = new PigRoamingConfig { IntervalMinSeconds = 600, IntervalMaxSeconds = 1800, SleepStartHour = 22, SleepEndHour = 7 };

            List<string> Run(int seed)
            {
                var clock = new ManualClock(startUtc);
                var rng = new Random(seed);
                var state = new GameState();
                state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
                var route = new List<string>();

                for (int i = 0; i < 20; i++)
                {
                    clock.Advance(TimeSpan.FromSeconds(1000));
                    PigRoamer.Tick(state, order, _ => true, clock, rng, cfg);
                    route.Add(state.GetPigLocation("kuki").SceneId);
                }
                return route;
            }

            var route1 = Run(12345);
            var route2 = Run(12345);
            var route3 = Run(99999);

            Assert.Equal(route1, route2);
            Assert.NotEqual(route1, route3);
        }

        [Fact]
        public void L8_Interval_NoMoveEarlierThanMin_AtLatestAtMax()
        {
            var order = new[] { "salon", "pig:kuki", "dorm", "garden", "park", "farm", "market" };
            var startUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var cfg = new PigRoamingConfig { IntervalMinSeconds = 600, IntervalMaxSeconds = 1800, SleepStartHour = 22, SleepEndHour = 7 };

            for (int seed = 1; seed <= 10; seed++)
            {
                var clock = new ManualClock(startUtc);
                var rng = new Random(seed);
                var state = new GameState();
                state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });

                PigRoamer.Tick(state, order, _ => true, clock, rng, cfg);
                var initialScene = state.GetPigLocation("kuki").SceneId;
                Assert.Equal("salon", initialScene);

                // Advance 599 seconds: no move earlier than 600s
                clock.Advance(TimeSpan.FromSeconds(599));
                PigRoamer.Tick(state, order, _ => true, clock, rng, cfg);
                Assert.Equal(initialScene, state.GetPigLocation("kuki").SceneId);

                // Advance to 1800s: must move
                clock.UtcNow = startUtc.AddSeconds(1800);
                PigRoamer.Tick(state, order, _ => true, clock, rng, cfg);
                Assert.NotEqual(initialScene, state.GetPigLocation("kuki").SceneId);
            }
        }

        [Fact]
        public void L9_NightHome_DuringSleepHoursGoesToOwnRoomIfUnlockedAndStaysUntilMorning()
        {
            var order = new[] { "salon", "pig:kuki", "dorm", "garden", "park", "farm", "market" };
            var cfg = new PigRoamingConfig { IntervalMinSeconds = 600, IntervalMaxSeconds = 1800, SleepStartHour = 22, SleepEndHour = 7 };

            // Night time: 23:00 local time
            var nightLocal = DateTime.Today.AddHours(23);
            var clock = new ManualClock(nightLocal.ToUniversalTime());

            var state = new GameState();
            state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
            var loc = state.GetPigLocation("kuki");
            loc.SceneId = "garden";

            // Tick at 23:00: own room is unlocked -> pig moves to pig:kuki
            PigRoamer.Tick(state, order, _ => true, clock, new Random(1), cfg);
            Assert.Equal("pig:kuki", loc.SceneId);

            // Advance 3 hours (02:00, still night): pig stays at pig:kuki
            clock.Advance(TimeSpan.FromHours(3));
            PigRoamer.Tick(state, order, _ => true, clock, new Random(2), cfg);
            Assert.Equal("pig:kuki", loc.SceneId);

            // Advance 4 hours (06:00, still night): pig stays at pig:kuki
            clock.Advance(TimeSpan.FromHours(4));
            PigRoamer.Tick(state, order, _ => true, clock, new Random(3), cfg);
            Assert.Equal("pig:kuki", loc.SceneId);

            // If own room is locked: pig does not go to pig:ned
            var state2 = new GameState();
            state2.Roster.Add(new PigProfile("Ned") { Id = "ned" });
            var loc2 = state2.GetPigLocation("ned");
            loc2.SceneId = "garden";

            PigRoamer.Tick(state2, order, scene => scene != "pig:ned", clock, new Random(4), cfg);
            Assert.NotEqual("pig:ned", loc2.SceneId);
        }

        [Fact]
        public void L10_SceneRemoved_DisappearsFromOrder_PlacedAtSalonNextTick()
        {
            var orderWithoutSecret = new[] { "salon", "pig:kuki" };
            var clock = new ManualClock(new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc));

            var state = new GameState();
            state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
            var loc = state.GetPigLocation("kuki");
            loc.SceneId = "secret_room";

            PigRoamer.Tick(state, orderWithoutSecret, _ => true, clock, new Random(1));
            Assert.Equal("salon", loc.SceneId);
        }

        [Fact]
        public void Config_LoadsDefaultValuesFromJsonFile()
        {
            var cfg = PigRoamingConfig.LoadDefault();
            Assert.NotNull(cfg);
            Assert.Equal(600, cfg.IntervalMinSeconds);
            Assert.Equal(1800, cfg.IntervalMaxSeconds);
            Assert.Equal(22, cfg.SleepStartHour);
            Assert.Equal(7, cfg.SleepEndHour);
            Assert.False(cfg.PinnedDefault);
        }

        [Fact]
        public void RoamerHelpers_CanMove_TryMove_SetPinned()
        {
            var order = new[] { "salon", "pig:kuki", "dorm", "garden" };
            var state = new GameState();
            state.Roster.Add(new PigProfile("Kuki") { Id = "kuki" });
            var loc = state.GetPigLocation("kuki");
            loc.SceneId = "salon";

            Assert.True(PigRoamer.AreAdjacent("salon", "garden", order));
            Assert.True(PigRoamer.AreAdjacent("salon", "pig:kuki", order));
            Assert.False(PigRoamer.AreAdjacent("salon", "dorm", order));

            Assert.True(PigRoamer.CanMove(state, "kuki", "pig:kuki", order, _ => true));
            Assert.False(PigRoamer.CanMove(state, "kuki", "dorm", order, _ => true));
            Assert.False(PigRoamer.CanMove(state, "kuki", "pig:kuki", order, s => s != "pig:kuki"));

            Assert.True(PigRoamer.TryMove(state, "kuki", "pig:kuki", order, _ => true));
            Assert.Equal("pig:kuki", loc.SceneId);

            Assert.True(PigRoamer.SetPinned(state, "kuki", true));
            Assert.True(loc.Pinned);
        }
    }
}
