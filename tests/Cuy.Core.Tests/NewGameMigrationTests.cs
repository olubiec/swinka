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
        public void EmptyRoster_RealCatalog_CreatesKukiAndNed_BothActive_OffersClockSet_LegendThresholdsInRange()
        {
            var catalog = LoadRealCatalog();
            var rng = new Random(12345);
            var nowUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var state = new GameState();

            state.EnsureRosterInitialized(catalog, rng, nowUtc);

            Assert.Equal(2, state.Roster.Count);

            var kuki = state.Roster[0];
            Assert.Equal("kuki", kuki.NamedId);
            Assert.Equal("Kuki", kuki.Name);
            Assert.Equal("rosette_normal", kuki.Breed);
            Assert.Equal("two_tone.ginger", kuki.PaletteId);
            Assert.Equal(nowUtc, kuki.ArrivedAtUtc);
            Assert.Equal(PigLife.BornAtFor(nowUtc, 0.1, 21.0), kuki.BornAtUtc);
            Assert.NotNull(kuki.LegendAtYears);
            Assert.InRange(kuki.LegendAtYears.Value, 6.0, 7.5);

            var ned = state.Roster[1];
            Assert.Equal("ned", ned.NamedId);
            Assert.Equal("Ned", ned.Name);
            Assert.Equal("teddy_chubby", ned.Breed);
            Assert.Equal("bicolor_head.chocolate", ned.PaletteId);
            Assert.Equal(nowUtc, ned.ArrivedAtUtc);
            Assert.Equal(PigLife.BornAtFor(nowUtc, 0.0, 21.0), ned.BornAtUtc);
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
            var rng = new Random(42);
            var nowUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var state = new GameState();

            var oldPig = new PigProfile("OldCuy", "smooth", "tricolor");
            state.Roster.Add(oldPig);

            state.EnsureRosterInitialized(catalog, rng, nowUtc);

            Assert.Single(state.Roster);
            Assert.Same(oldPig, state.Roster[0]);
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
            var rng = new Random(100);
            var nowUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);

            // Fresh game calling twice
            var state = new GameState();
            state.EnsureRosterInitialized(catalog, rng, nowUtc);

            Assert.Equal(2, state.Roster.Count);
            string id0 = state.Roster[0].Id;
            string id1 = state.Roster[1].Id;
            double? legend0 = state.Roster[0].LegendAtYears;
            double? legend1 = state.Roster[1].LegendAtYears;
            DateTime? offersStart = state.OffersStartUtc;

            // Second call with different time and rng
            state.EnsureRosterInitialized(catalog, new Random(999), nowUtc.AddDays(7));

            Assert.Equal(2, state.Roster.Count);
            Assert.Equal(id0, state.Roster[0].Id);
            Assert.Equal(id1, state.Roster[1].Id);
            Assert.Equal(legend0, state.Roster[0].LegendAtYears);
            Assert.Equal(legend1, state.Roster[1].LegendAtYears);
            Assert.Equal(offersStart, state.OffersStartUtc);
            Assert.Equal(2, state.ActivePigIds.Count);
            Assert.Equal(id0, state.ActivePigIds[0]);
            Assert.Equal(id1, state.ActivePigIds[1]);

            // Save with one old pig calling twice
            var oldSave = new GameState();
            var oldPig = new PigProfile("OldTimer", "peruvian", "agouti");
            oldSave.Roster.Add(oldPig);
            oldSave.EnsureRosterInitialized(catalog, rng, nowUtc);

            Assert.Single(oldSave.Roster);
            Assert.Equal(nowUtc, oldSave.OffersStartUtc);

            oldSave.EnsureRosterInitialized(catalog, new Random(999), nowUtc.AddDays(14));

            Assert.Single(oldSave.Roster);
            Assert.Same(oldPig, oldSave.Roster[0]);
            Assert.Equal(nowUtc, oldSave.OffersStartUtc);
        }

        [Fact]
        public void EmptyCatalog_KeepsOldSingleDefaultPig()
        {
            var emptyCatalog = new NamedPigCatalog(new NamedPigDefinition[0], 0, null, 0.5, 1.5, null);
            var rng = new Random(42);
            var nowUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var state = new GameState();
            state.Name = "CustomName";

            state.EnsureRosterInitialized(emptyCatalog, rng, nowUtc);

            Assert.Single(state.Roster);
            Assert.Equal("CustomName", state.Roster[0].Name);
            Assert.Null(state.Roster[0].NamedId);
            Assert.Contains("cuddly", state.Roster[0].Traits);
            Assert.True(state.Roster[0].IsTraitDiscovered("cuddly"));
            Assert.Single(state.ActivePigIds);
            Assert.Equal(state.Roster[0].Id, state.ActivePigIds[0]);
            Assert.Null(state.OffersStartUtc);
        }

        [Fact]
        public void ActivePigIds_HasAtMostTwoEntries()
        {
            var catalog = LoadRealCatalog();
            var rng = new Random(42);
            var nowUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
            var state = new GameState();

            var p1 = new PigProfile("P1");
            var p2 = new PigProfile("P2");
            var p3 = new PigProfile("P3");
            state.Roster.AddRange(new[] { p1, p2, p3 });
            state.ActivePigIds = new List<string> { p1.Id, p2.Id, p3.Id };

            state.EnsureRosterInitialized(catalog, rng, nowUtc);

            Assert.Equal(2, state.ActivePigIds.Count);
            Assert.Equal(p1.Id, state.ActivePigIds[0]);
            Assert.Equal(p2.Id, state.ActivePigIds[1]);
        }
    }
}
