using System;
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
        private static readonly DateTime Start = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
        private readonly string _testDir;

        public GameSessionFlagsTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyGameSessionFlags_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                {
                    Directory.Delete(_testDir, recursive: true);
                }
            }
            catch
            {
                // Ignore errors deleting the temp folder after the test
            }
        }

        [Fact]
        public void Open_EmptyFolder_SwitchesCollectionFlagsOnAndStartsWithKukiAndNed()
        {
            var clock = new ManualClock(Start);

            using (var session = GameSession.Open(clock, _testDir))
            {
                var balance = session.Pet.Balance;
                Assert.True(balance.PerPigAgeActive);
                Assert.True(balance.PigModifiersActive);
                Assert.True(balance.ArrivalsActive);
                Assert.True(balance.HayRackActive);
                Assert.True(balance.DiaryActive);
                Assert.True(balance.BirthdayRewardsActive);

                var namedIds = session.Pet.State.Roster
                    .Where(p => p != null && p.NamedId != null)
                    .Select(p => p.NamedId)
                    .ToList();
                Assert.Contains("kuki", namedIds, StringComparer.OrdinalIgnoreCase);
                Assert.Contains("ned", namedIds, StringComparer.OrdinalIgnoreCase);
            }
        }

        [Fact]
        public void Open_OldSingleProfileSave_KeepsThatPigAndUnlocksStarterPair()
        {
            var state = GameState.CreateNew("Old", Start);
            state.EnsureRosterInitialized();
            Assert.Single(state.Roster);
            string oldPigId = state.Roster[0].Id;
            new SaveSystem(_testDir).Save(state);

            var clock = new ManualClock(Start.AddDays(1));
            using (var session = GameSession.Open(clock, _testDir))
            {
                Assert.False(session.IsNewGame);
                Assert.Contains(session.Pet.State.Roster, p => p != null && p.Id == oldPigId);
                Assert.NotNull(session.Pet.State.OffersStartUtc);

                var starter = NamedPigCatalog.Current.Pigs
                    .Where(p => p != null && p.OfferGroup == "starter")
                    .ToList();
                var statuses = OfferChecker.StatusFor(
                    starter,
                    session.Pet.State.OffersStartUtc.Value,
                    clock.UtcNow,
                    session.Pet.State.Roster.Select(p => p.NamedId).Where(id => id != null).ToHashSet(StringComparer.OrdinalIgnoreCase));

                Assert.Contains(statuses, s => string.Equals(s.Id, "kuki", StringComparison.OrdinalIgnoreCase) && s.Unlocked);
                Assert.Contains(statuses, s => string.Equals(s.Id, "ned", StringComparison.OrdinalIgnoreCase) && s.Unlocked);
            }
        }

        [Fact]
        public void Reopen_DoesNotAnnounceSameOfferTwice()
        {
            var clock = new ManualClock(Start);
            using (var first = GameSession.Open(clock, _testDir))
            {
                first.Close();
            }

            // Long enough that later offers come due; the first open after this announces them.
            var later = new ManualClock(Start.AddDays(400));
            int seenAfterFirstLaterOpen;
            using (var second = GameSession.Open(later, _testDir))
            {
                seenAfterFirstLaterOpen = second.Pet.State.OffersSeen.Count;
                Assert.Empty(second.Pet.CheckOffers());
                second.Close();
            }

            using (var third = GameSession.Open(later, _testDir))
            {
                Assert.Equal(seenAfterFirstLaterOpen, third.Pet.State.OffersSeen.Count);
                Assert.Empty(third.Pet.CheckOffers());
            }
        }
    }
}
