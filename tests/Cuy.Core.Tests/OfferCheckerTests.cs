using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.Pigs;
using Xunit;

namespace Cuy.Core.Tests
{
    public class OfferCheckerTests
    {
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
        public void Due_AtDayZero_OnlyKukiAndNedAreDue()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var seen = new HashSet<string>();

            var due = OfferChecker.Due(catalog.Pigs, startUtc, startUtc, seen);

            Assert.Equal(new[] { "kuki", "ned" }, due.Select(p => p.Id));
        }

        [Fact]
        public void Due_James_NotDueAt89Point99_DueAt90()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var seen = new HashSet<string> { "kuki", "ned" };

            var dueBefore = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(89.99), seen);
            Assert.Empty(dueBefore);

            var dueAt90 = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(90.0), seen);
            Assert.Single(dueAt90);
            Assert.Equal("james", dueAt90[0].Id);
        }

        [Fact]
        public void Due_GlenAt105_And_RacuchAt130_WithTolerance()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var seen = new HashSet<string> { "kuki", "ned", "james" };

            // Glen at 105 (not due at 104.99, due at 105.0)
            var glenBefore = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(104.99), seen);
            Assert.Empty(glenBefore);

            var glenAt105 = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(105.0), seen);
            Assert.Single(glenAt105);
            Assert.Equal("glen", glenAt105[0].Id);

            seen.Add("glen");

            // Racuch at 130 (not due at 129.99, due at 130.0)
            var racuchBefore = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(129.99), seen);
            Assert.Empty(racuchBefore);

            var racuchAt130 = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(130.0), seen);
            Assert.Single(racuchAt130);
            Assert.Equal("racuch", racuchAt130[0].Id);
        }

        [Fact]
        public void Due_AfterJumpOf140Days_AllFiveAreDueOnceInFileOrder_AndIdempotent()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var seen = new HashSet<string>();

            var due = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(140.0), seen);

            Assert.Equal(new[] { "kuki", "ned", "james", "glen", "racuch" }, due.Select(p => p.Id));

            // Adding results to alreadySeen makes next call return empty (idempotent)
            foreach (var pig in due)
            {
                seen.Add(pig.Id);
            }

            var dueAgain = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(140.0), seen);
            Assert.Empty(dueAgain);
        }

        [Fact]
        public void Due_UnadoptedOffer_StillDueAfter400Days()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            // kuki, ned, glen, racuch already seen, james not seen
            var seen = new HashSet<string> { "kuki", "ned", "glen", "racuch" };

            var due = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(400.0), seen);

            Assert.Single(due);
            Assert.Equal("james", due[0].Id);
        }

        [Fact]
        public void StatusFor_ReportsDaysLeft90ForJamesAtDay0_AndZeroWhenUnlocked()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var adopted = new HashSet<string>();

            var statusesDay0 = OfferChecker.StatusFor(catalog.Pigs, startUtc, startUtc, adopted);
            var jamesDay0 = statusesDay0.First(s => s.Id == "james");
            Assert.False(jamesDay0.Unlocked);
            Assert.Equal(90.0, jamesDay0.DaysLeft, 2);
            Assert.Equal(100, jamesDay0.Cost);
            Assert.Null(jamesDay0.Group);
            Assert.False(jamesDay0.Adopted);

            var kukiDay0 = statusesDay0.First(s => s.Id == "kuki");
            Assert.True(kukiDay0.Unlocked);
            Assert.Equal(0.0, kukiDay0.DaysLeft);
            Assert.Equal(0, kukiDay0.Cost);
            Assert.Equal("starter", kukiDay0.Group);
            Assert.False(kukiDay0.Adopted);

            var statusesDay90 = OfferChecker.StatusFor(catalog.Pigs, startUtc, startUtc.AddDays(90.0), adopted);
            var jamesDay90 = statusesDay90.First(s => s.Id == "james");
            Assert.True(jamesDay90.Unlocked);
            Assert.Equal(0.0, jamesDay90.DaysLeft);
        }

        [Fact]
        public void StatusFor_AdoptedIdsAreMarkedAdopted()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var adopted = new HashSet<string> { "kuki", "james" };

            var statuses = OfferChecker.StatusFor(catalog.Pigs, startUtc, startUtc.AddDays(140.0), adopted);

            var kuki = statuses.First(s => s.Id == "kuki");
            var ned = statuses.First(s => s.Id == "ned");
            var james = statuses.First(s => s.Id == "james");
            var glen = statuses.First(s => s.Id == "glen");
            var racuch = statuses.First(s => s.Id == "racuch");

            Assert.True(kuki.Adopted);
            Assert.False(ned.Adopted);
            Assert.True(james.Adopted);
            Assert.False(glen.Adopted);
            Assert.False(racuch.Adopted);
        }

        [Fact]
        public void Rules_NullOrEmptyList_GivesEmptyResult()
        {
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var empty = new List<NamedPigDefinition>();

            Assert.Empty(OfferChecker.Due(null, startUtc, startUtc, new HashSet<string>()));
            Assert.Empty(OfferChecker.Due(empty, startUtc, startUtc, new HashSet<string>()));

            Assert.Empty(OfferChecker.StatusFor(null, startUtc, startUtc, new HashSet<string>()));
            Assert.Empty(OfferChecker.StatusFor(empty, startUtc, startUtc, new HashSet<string>()));
        }

        [Fact]
        public void Rules_NowUtcBeforeOffersStartUtc_UnlocksOnlyOffersWithOfferAfterDaysZero()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var beforeStart = startUtc.AddDays(-10.0);

            var due = OfferChecker.Due(catalog.Pigs, startUtc, beforeStart, new HashSet<string>());
            Assert.Equal(new[] { "kuki", "ned" }, due.Select(p => p.Id));

            var statuses = OfferChecker.StatusFor(catalog.Pigs, startUtc, beforeStart, new HashSet<string>());
            var kuki = statuses.First(s => s.Id == "kuki");
            var james = statuses.First(s => s.Id == "james");

            Assert.True(kuki.Unlocked);
            Assert.Equal(0.0, kuki.DaysLeft);

            Assert.False(james.Unlocked);
            Assert.Equal(100.0, james.DaysLeft, 2);
        }
    }
}
