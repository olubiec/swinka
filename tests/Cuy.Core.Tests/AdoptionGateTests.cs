using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class AdoptionGateTests
    {
        private static string FindRepoRoot()
        {
            string dir = AppContext.BaseDirectory;
            while (!string.IsNullOrEmpty(dir))
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln"))) return dir;
                dir = Path.GetDirectoryName(dir);
            }
            return Directory.GetCurrentDirectory();
        }

        private static GameState CreateStarterState(DateTime nowUtc)
        {
            var state = new GameState
            {
                BirthDateUtc = nowUtc,
                Roster = new List<PigProfile>
                {
                    new PigProfile("Cuy", "smooth", "tricolor")
                    {
                        NamedId = "cuy",
                        BornAtUtc = nowUtc,
                        ArrivedAtUtc = nowUtc
                    }
                },
                ActivePigIds = new List<string> { "cuy" }
            };
            return state;
        }

        /// <summary>
        /// G1: before the threshold Kuki and Ned are not available (not in roster, not adoptable).
        /// </summary>
        [Fact]
        public void G1_BeforeThreshold_KukiAndNedNotAvailable()
        {
            var now = new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var state = CreateStarterState(clock.UtcNow);

            // Starter is newborn (Baby stage)
            Assert.False(AdoptionGate.IsOpen(state));
            Assert.False(AdoptionGate.IsStarterAtThreshold(state, clock.UtcNow));
            Assert.False(AdoptionGate.IsOfferAvailable(state, clock.UtcNow));

            // Neither Kuki nor Ned in roster
            Assert.False(state.HasNamedPig("kuki"));
            Assert.False(state.HasNamedPig("ned"));
            Assert.DoesNotContain(state.Roster, p => p.NamedId == "kuki" || p.NamedId == "ned");
        }

        /// <summary>
        /// G2: threshold = starter pig stage junior plus random delay of 1-3 days (seeded RNG);
        /// after it both are available as ONE adoption offer.
        /// </summary>
        [Fact]
        public void G2_ThresholdWithDelay_OfferBecomesAvailable()
        {
            var birth = new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(birth);
            var state = CreateStarterState(clock.UtcNow);

            // Junior starts at 21 pig days. Let's advance 25 days with 1.0 scale
            clock.Advance(TimeSpan.FromDays(25));
            Assert.True(AdoptionGate.IsStarterAtThreshold(state, clock.UtcNow));

            // Seeded RNG: let's test deterministically
            var rng = new Random(42);
            // First check at Day 20 calculates the delay and sets AdoptionOfferAvailableAtUtc
            bool availableImmediate = AdoptionGate.IsOfferAvailable(state, clock.UtcNow, rng);
            Assert.NotNull(state.AdoptionOfferAvailableAtUtc);

            // Time is before the delay expiration -> offer not yet available
            Assert.False(availableImmediate);

            // Advance past the scheduled available time
            var targetUtc = state.AdoptionOfferAvailableAtUtc.Value;
            var neededAdvance = targetUtc - clock.UtcNow + TimeSpan.FromMinutes(1);
            clock.Advance(neededAdvance);

            Assert.True(AdoptionGate.IsOfferAvailable(state, clock.UtcNow));

            // Offer contains both Kuki and Ned as ONE offer
            var offer = AdoptionGate.GetOffer(state);
            Assert.NotNull(offer);
            Assert.Equal("kuki_and_ned", offer.Id);
            Assert.Equal(2, offer.Pigs.Count);
            Assert.Contains(offer.Pigs, p => p.Id == "kuki");
            Assert.Contains(offer.Pigs, p => p.Id == "ned");
        }

        /// <summary>
        /// G3: accepting the offer adds both to the roster with fixed names (rename is rejected for named pigs).
        /// </summary>
        [Fact]
        public void G3_AcceptOffer_AddsBothWithFixedNames_RenameRejected()
        {
            var now = new DateTime(2025, 2, 1, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var state = CreateStarterState(clock.UtcNow);

            bool accepted = AdoptionGate.AcceptOffer(state, nowUtc: clock.UtcNow);
            Assert.True(accepted);
            Assert.True(AdoptionGate.IsOpen(state));
            Assert.True(state.AdoptionOfferAccepted);

            // Both Kuki and Ned are in the roster
            Assert.True(state.HasNamedPig("kuki"));
            Assert.True(state.HasNamedPig("ned"));

            var kuki = state.Roster.First(p => p.NamedId == "kuki");
            var ned = state.Roster.First(p => p.NamedId == "ned");
            var starter = state.Roster.First(p => p.NamedId == "cuy" || string.IsNullOrEmpty(p.NamedId));

            // Named pigs reject rename
            Assert.False(AdoptionGate.CanRename(kuki));
            Assert.False(AdoptionGate.CanRename(ned));
            Assert.False(AdoptionGate.TryRename(kuki, "Fluffy"));
            Assert.False(AdoptionGate.TryRename(ned, "Spike"));
            Assert.Equal("Kuki", kuki.Name);
            Assert.Equal("Ned", ned.Name);

            // Starter (unnamed or custom) can be renamed if not a fixed named pig or if allowed
            var customPig = new PigProfile("Original", "smooth", "tricolor");
            Assert.True(AdoptionGate.CanRename(customPig));
            Assert.True(AdoptionGate.TryRename(customPig, "Bob"));
            Assert.Equal("Bob", customPig.Name);
        }

        /// <summary>
        /// G4: old save with Kuki and/or Ned already in the roster loads with the gate open and nothing duplicated.
        /// </summary>
        [Fact]
        public void G4_OldSaveWithKukiNed_LoadsWithGateOpen_NoDuplicates()
        {
            string oldJson = @"{
                ""Version"": 2,
                ""Roster"": [
                    { ""Id"": ""p1"", ""Name"": ""Kuki"", ""Breed"": ""rosette_normal"", ""PaletteId"": ""two_tone.ginger"", ""NamedId"": ""kuki"" },
                    { ""Id"": ""p2"", ""Name"": ""Ned"", ""Breed"": ""teddy_chubby"", ""PaletteId"": ""bicolor_head.chocolate"", ""NamedId"": ""ned"" }
                ]
            }";

            var state = JsonConvert.DeserializeObject<GameState>(oldJson);
            Assert.NotNull(state);

            // Gate automatically considered open due to existing Kuki/Ned
            Assert.True(AdoptionGate.IsOpen(state));

            // EnsureMigrated synchronizes state flag
            AdoptionGate.EnsureMigrated(state);
            Assert.True(state.AdoptionGateOpen);

            // Accepting offer does not duplicate pigs
            int initialCount = state.Roster.Count;
            AdoptionGate.AcceptOffer(state);
            Assert.Equal(initialCount, state.Roster.Count);
            Assert.Equal(1, state.Roster.Count(p => p.NamedId == "kuki"));
            Assert.Equal(1, state.Roster.Count(p => p.NamedId == "ned"));
        }

        /// <summary>
        /// G5: a save without the gate field loads with safe defaults (gate closed, offer not shown).
        /// </summary>
        [Fact]
        public void G5_SaveWithoutGateField_LoadsWithSafeDefaults()
        {
            string saveJsonWithoutGate = @"{
                ""Version"": 3,
                ""BirthDateUtc"": ""2025-01-01T12:00:00Z"",
                ""Roster"": [
                    { ""Id"": ""p0"", ""Name"": ""Cuy"", ""Breed"": ""smooth"", ""PaletteId"": ""tricolor"", ""NamedId"": ""cuy"" }
                ]
            }";

            var state = JsonConvert.DeserializeObject<GameState>(saveJsonWithoutGate);
            Assert.NotNull(state);

            // Safe defaults
            Assert.False(state.AdoptionGateOpen);
            Assert.Null(state.AdoptionOfferAvailableAtUtc);
            Assert.False(state.AdoptionOfferAccepted);

            // Gate is closed, offer is not shown
            Assert.False(AdoptionGate.IsOpen(state));
            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            Assert.False(AdoptionGate.IsOfferAvailable(state, clock.UtcNow));
        }

        /// <summary>
        /// G6: starter pig look != Kuki look (PigLook returns the default skin for the starter).
        /// </summary>
        [Fact]
        public void G6_StarterPigLook_NotEqualToKukiLook()
        {
            var starter = new PigProfile("Cuy", "smooth", "tricolor");
            var kuki = new PigProfile("Kuki", "rosette_normal", "two_tone.ginger") { NamedId = "kuki" };

            var starterLook = PigLook.Resolve(starter, "adult");
            var kukiLook = PigLook.Resolve(kuki, "adult");
            var defaultStarterLook = PigLook.StarterLook("adult");

            Assert.NotNull(starterLook);
            Assert.NotNull(kukiLook);
            Assert.NotNull(defaultStarterLook);

            // Starter look is different from Kuki look
            Assert.NotEqual(kukiLook.SpriteKey, starterLook.SpriteKey);
            Assert.NotEqual(kukiLook.SpriteKey, defaultStarterLook.SpriteKey);
            Assert.DoesNotContain("kuki", starterLook.SpriteKey);

            // Default skin returned for starter
            Assert.Equal("sprites/adult/spritesheet.png", defaultStarterLook.SpriteKey);
            Assert.Null(defaultStarterLook.Named);
        }
    }
}
