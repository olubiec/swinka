using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class GameSessionFlagsTests : IDisposable
    {
        private readonly string _testDir;

        public GameSessionFlagsTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuySessionFlagsTest_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                {
                    Directory.Delete(_testDir, true);
                }
            }
            catch
            {
                // Ignore temp cleanup errors
            }
        }

        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                {
                    return Path.Combine(dir, relativePath);
                }
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Cannot find repo root to resolve {relativePath}");
        }

        private static NamedPigCatalog LoadRealCatalog()
        {
            string json = File.ReadAllText(RepoFile("assets/data/pigs_named.json"));
            return NamedPigCatalog.Load(json);
        }

        [Fact]
        public void Open_OnEmptyTempDirectory_HasNamedPigFlagsTrue_AndKukiAndNedInRoster()
        {
            var now = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var catalog = LoadRealCatalog();
            var rng = new Random(123);

            using (var session = GameSession.Open(clock, _testDir, balance: null, namedPigs: catalog, rng: rng))
            {
                Assert.True(session.IsNewGame);
                Assert.True(session.Pet.Balance.PerPigAgeActive);
                Assert.True(session.Pet.Balance.PigModifiersActive);
                Assert.True(session.Pet.Balance.ArrivalsActive);
                Assert.True(session.Pet.Balance.HayRackActive);
                Assert.True(session.Pet.Balance.DiaryActive);
                Assert.True(session.Pet.Balance.BirthdayRewardsActive);

                Assert.Equal(2, session.Pet.State.Roster.Count);
                Assert.Equal("kuki", session.Pet.State.Roster[0].NamedId);
                Assert.Equal("Kuki", session.Pet.State.Roster[0].Name);
                Assert.Equal("ned", session.Pet.State.Roster[1].NamedId);
                Assert.Equal("Ned", session.Pet.State.Roster[1].Name);

                Assert.Equal(2, session.Pet.State.ActivePigIds.Count);
                Assert.Equal(session.Pet.State.Roster[0].Id, session.Pet.State.ActivePigIds[0]);
                Assert.Equal(session.Pet.State.Roster[1].Id, session.Pet.State.ActivePigIds[1]);
                Assert.Equal(now, session.Pet.State.OffersStartUtc);
            }
        }

        [Fact]
        public void Open_WithPassedBalance_SwitchesNamedPigFlagsOn()
        {
            var now = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var catalog = LoadRealCatalog();
            var rng = new Random(123);
            var customBalance = new Balance
            {
                PerPigAgeActive = false,
                PigModifiersActive = false,
                ArrivalsActive = false
            };

            using (var session = GameSession.Open(clock, _testDir, balance: customBalance, namedPigs: catalog, rng: rng))
            {
                Assert.Same(customBalance, session.Pet.Balance);
                Assert.True(session.Pet.Balance.PerPigAgeActive);
                Assert.True(session.Pet.Balance.PigModifiersActive);
                Assert.True(session.Pet.Balance.ArrivalsActive);
            }
        }

        [Fact]
        public void Open_OnSaveWithOldSinglePig_KeepsIt_AndShowsStarterPairAsUnlockedOffers()
        {
            var now = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var catalog = LoadRealCatalog();
            var rng = new Random(42);

            var oldState = GameState.CreateNew("OldCuy", now.AddDays(-5));
            var oldPig = new PigProfile("OldCuy", "smooth", "tricolor");
            oldState.Roster.Add(oldPig);
            oldState.ActivePigIds.Add(oldPig.Id);
            new SaveSystem(_testDir).Save(oldState);

            using (var session = GameSession.Open(clock, _testDir, namedPigs: catalog, rng: rng))
            {
                Assert.False(session.IsNewGame);
                var state = session.Pet.State;

                Assert.Single(state.Roster);
                Assert.Equal(oldPig.Id, state.Roster[0].Id);
                Assert.Equal("OldCuy", state.Roster[0].Name);
                Assert.Null(state.Roster[0].NamedId);

                Assert.NotNull(state.OffersStartUtc);
                Assert.Contains("kuki", state.OffersSeen);
                Assert.Contains("ned", state.OffersSeen);

                var adoptedIds = new HashSet<string>(
                    state.Roster.Where(p => !string.IsNullOrEmpty(p.NamedId)).Select(p => p.NamedId),
                    StringComparer.OrdinalIgnoreCase);

                var statuses = OfferChecker.StatusFor(catalog.Pigs, state.OffersStartUtc.Value, clock.UtcNow, adoptedIds);
                var kukiOffer = statuses.First(s => s.Id == "kuki");
                var nedOffer = statuses.First(s => s.Id == "ned");

                Assert.True(kukiOffer.Unlocked);
                Assert.False(kukiOffer.Adopted);
                Assert.Equal("starter", kukiOffer.Group);

                Assert.True(nedOffer.Unlocked);
                Assert.False(nedOffer.Adopted);
                Assert.Equal("starter", nedOffer.Group);
            }
        }

        [Fact]
        public void Reopening_DoesNotAnnounceSameOfferTwice()
        {
            var startUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(startUtc);
            var catalog = LoadRealCatalog();
            var rng = new Random(99);

            // First open at day 0 and save
            using (var session1 = GameSession.Open(clock, _testDir, namedPigs: catalog, rng: rng))
            {
                session1.Start();
                session1.Close();
            }

            // Reopen after 95 days (James offer at day 90 unlocks during Open)
            clock.Advance(TimeSpan.FromDays(95));
            using (var session2 = GameSession.Open(clock, _testDir, namedPigs: catalog, rng: rng))
            {
                Assert.Contains("james", session2.Pet.State.OffersSeen);
                Assert.Empty(session2.Pet.CheckOffers(clock.UtcNow));
                session2.Start();
                session2.Close();
            }

            // Reopen again at the same time (or slightly later before day 105): James is not announced again
            clock.Advance(TimeSpan.FromDays(1));
            using (var session3 = GameSession.Open(clock, _testDir, namedPigs: catalog, rng: rng))
            {
                var announcedEvents = new List<string>();
                session3.Pet.OfferUnlocked += (s, e) => announcedEvents.Add(e.PigId);

                var announced = session3.Pet.CheckOffers(clock.UtcNow);
                Assert.Empty(announced);
                Assert.Empty(announcedEvents);
            }
        }
    }
}
