using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core;
using Cuy.Core.Pigs;
using Xunit;

namespace Cuy.Core.Tests
{
    public class NewGameMigrationTests
    {
        private static string RepoFile(string relativePath)
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

        private static NamedPigCatalog LoadRealCatalog()
        {
            string json = File.ReadAllText(RepoFile("assets/data/pigs_named.json"));
            return NamedPigCatalog.Load(json);
        }

        [Fact]
        public void EmptyRoster_WithRealCatalog_CreatesKukiAndNedBothActiveAndOffersClockSetAndLegendInRange()
        {
            var catalog = LoadRealCatalog();
            var state = new GameState();
            var rng = new Random(12345);
            var nowUtc = new DateTime(2026, 11, 3, 12, 0, 0, DateTimeKind.Utc);

            state.EnsureRosterInitialized(catalog, rng, nowUtc);

            Assert.Equal(2, state.Roster.Count);

            var kuki = state.Roster.Find(p => p.NamedId == "kuki");
            Assert.NotNull(kuki);
            Assert.Equal("Kuki", kuki.Name);
            Assert.Equal("rosette_normal", kuki.Breed);
            Assert.Equal("two_tone.ginger", kuki.PaletteId);
            Assert.Equal(nowUtc, kuki.ArrivedAtUtc);
            Assert.Equal(PigLife.BornAtFor(nowUtc, 0.1, 21.0), kuki.BornAtUtc);
            Assert.NotNull(kuki.LegendAtYears);
            Assert.InRange(kuki.LegendAtYears.Value, 6.0, 7.5);

            var ned = state.Roster.Find(p => p.NamedId == "ned");
            Assert.NotNull(ned);
            Assert.Equal("Ned", ned.Name);
            Assert.Equal("teddy_chubby", ned.Breed);
            Assert.Equal("bicolor_head.chocolate", ned.PaletteId);
            Assert.Equal(nowUtc, ned.ArrivedAtUtc);
            Assert.Equal(nowUtc, ned.BornAtUtc);
            Assert.NotNull(ned.LegendAtYears);
            Assert.InRange(ned.LegendAtYears.Value, 7.0, 9.5);
            Assert.Contains("sleepyhead", ned.Traits);
            Assert.Contains("glutton", ned.Traits);
            Assert.Contains("explorer", ned.Traits);

            Assert.Equal(2, state.ActivePigIds.Count);
            Assert.Equal(kuki.Id, state.ActivePigIds[0]);
            Assert.Equal(ned.Id, state.ActivePigIds[1]);

            Assert.Equal(nowUtc, state.OffersStartUtc);
        }

        [Fact]
        public void SaveWithOneOldPig_KeepsOldPig_NamedIdNull_NoKukiNedInRoster_OffersStartUtcSet()
        {
            var catalog = LoadRealCatalog();
            var state = new GameState();
            var oldPig = new PigProfile("Bazyli", "peruvian", "agouti") { NamedId = null };
            state.Roster.Add(oldPig);

            var rng = new Random(42);
            var nowUtc = new DateTime(2026, 11, 3, 12, 0, 0, DateTimeKind.Utc);

            state.EnsureRosterInitialized(catalog, rng, nowUtc);

            Assert.Single(state.Roster);
            Assert.Same(oldPig, state.Roster[0]);
            Assert.Equal("Bazyli", state.Roster[0].Name);
            Assert.Null(state.Roster[0].NamedId);
            Assert.DoesNotContain(state.Roster, p => p.NamedId == "kuki" || p.NamedId == "ned");

            Assert.Equal(nowUtc, state.OffersStartUtc);
            Assert.Single(state.ActivePigIds);
            Assert.Equal(oldPig.Id, state.ActivePigIds[0]);
        }

        [Fact]
        public void CallingTwice_ChangesNothing()
        {
            var catalog = LoadRealCatalog();
            var state = new GameState();
            var rng = new Random(42);
            var nowUtc = new DateTime(2026, 11, 3, 12, 0, 0, DateTimeKind.Utc);

            // First call on empty roster
            state.EnsureRosterInitialized(catalog, rng, nowUtc);

            Assert.Equal(2, state.Roster.Count);
            string id0 = state.Roster[0].Id;
            string id1 = state.Roster[1].Id;
            double? legend0 = state.Roster[0].LegendAtYears;
            double? legend1 = state.Roster[1].LegendAtYears;
            var activeIds = new List<string>(state.ActivePigIds);

            // Second call with different rng and later time
            state.EnsureRosterInitialized(catalog, new Random(999), nowUtc.AddDays(14));

            Assert.Equal(2, state.Roster.Count);
            Assert.Equal(id0, state.Roster[0].Id);
            Assert.Equal(id1, state.Roster[1].Id);
            Assert.Equal(legend0, state.Roster[0].LegendAtYears);
            Assert.Equal(legend1, state.Roster[1].LegendAtYears);
            Assert.Equal(activeIds, state.ActivePigIds);
            Assert.Equal(nowUtc, state.OffersStartUtc);
        }

        [Fact]
        public void EmptyCatalog_KeepsOldSingleDefaultPig()
        {
            var emptyCatalog = new NamedPigCatalog(
                new NamedPigDefinition[0],
                welcomeClovers: 0,
                welcomeItems: null,
                modifierMin: 0.5,
                modifierMax: 1.5,
                groups: new OfferGroupDefinition[0]
            );

            var state = new GameState();
            state.Name = "LegacyPig";
            var rng = new Random(42);
            var nowUtc = new DateTime(2026, 11, 3, 12, 0, 0, DateTimeKind.Utc);

            state.EnsureRosterInitialized(emptyCatalog, rng, nowUtc);

            Assert.Single(state.Roster);
            Assert.Equal("LegacyPig", state.Roster[0].Name);
            Assert.Null(state.Roster[0].NamedId);
            Assert.Contains("cuddly", state.Roster[0].Traits);
            Assert.True(state.Roster[0].IsTraitDiscovered("cuddly"));
            Assert.Null(state.OffersStartUtc);
            Assert.Single(state.ActivePigIds);
            Assert.Equal(state.Roster[0].Id, state.ActivePigIds[0]);
        }

        [Fact]
        public void ActivePigIds_ClampedToAtMostTwoEntries()
        {
            var catalog = LoadRealCatalog();
            var state = new GameState();
            var p1 = new PigProfile("P1");
            var p2 = new PigProfile("P2");
            var p3 = new PigProfile("P3");
            state.Roster.Add(p1);
            state.Roster.Add(p2);
            state.Roster.Add(p3);

            state.ActivePigIds.Add(p1.Id);
            state.ActivePigIds.Add(p2.Id);
            state.ActivePigIds.Add(p3.Id);

            state.EnsureRosterInitialized(catalog, new Random(42), DateTime.UtcNow);

            Assert.Equal(2, state.ActivePigIds.Count);
            Assert.Equal(p1.Id, state.ActivePigIds[0]);
            Assert.Equal(p2.Id, state.ActivePigIds[1]);
        }
    }
}
