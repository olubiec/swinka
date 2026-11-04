using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.Economy;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class CollectionInvariantsTests
    {
        private static string RepoFile(string relativePath)
        {
            string? dir = AppContext.BaseDirectory;
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

        private static EconomyConfig LoadRealEconomy()
        {
            string json = File.ReadAllText(RepoFile("assets/data/economy.json"));
            return EconomyConfig.Load(json);
        }

        private static void AssertModifiersInRange(PigModifiers mods, double min = 0.5, double max = 1.5)
        {
            Assert.InRange(mods.Appetite, min, max);
            Assert.InRange(mods.PoopRate, min, max);
            Assert.InRange(mods.Activity, min, max);
            Assert.InRange(mods.BondGain, min, max);
            Assert.InRange(mods.MinigameScore, min, max);
            Assert.InRange(mods.WheekRate, min, max);
            Assert.InRange(mods.Startle, min, max);
            Assert.InRange(mods.JoyWeight, min, max);
        }

        [Fact]
        public void Invariant1_MinigameIncomePerDay_NeverExceeds150_ForAnyPairOrSinglePig()
        {
            var catalog = LoadRealCatalog();
            var economy = LoadRealEconomy();
            var pigIds = catalog.Pigs.Select(p => p.Id).ToList();

            var rostersToTest = new List<string[]>();
            rostersToTest.Add(Array.Empty<string>());
            foreach (var id in pigIds)
            {
                rostersToTest.Add(new[] { id });
            }
            for (int i = 0; i < pigIds.Count; i++)
            {
                for (int j = i + 1; j < pigIds.Count; j++)
                {
                    rostersToTest.Add(new[] { pigIds[i], pigIds[j] });
                }
            }

            foreach (var activeIds in rostersToTest)
            {
                var clock = new ManualClock(new DateTime(2026, 6, 1, 10, 0, 0, DateTimeKind.Utc));
                var state = GameState.CreateNew("Cuy", clock.UtcNow);
                var balance = Balance.CreateDefault();
                balance.PigModifiersActive = true;
                balance.PerPigAgeActive = true;

                var pet = new Pet(state, clock, balance)
                {
                    NamedPigs = catalog
                };

                pet.State.Roster.Clear();
                pet.State.ActivePigIds.Clear();
                foreach (var pigId in activeIds)
                {
                    var def = catalog.Find(pigId);
                    Assert.NotNull(def);
                    var profile = new PigProfile(def.Name, def.Breed, def.PaletteId) { NamedId = def.Id };
                    pet.State.Roster.Add(profile);
                    pet.State.ActivePigIds.Add(profile.Id);
                }

                int totalAwarded = 0;
                for (int game = 0; game < 25; game++)
                {
                    pet.RecordMinigameResult("veggie_rain", 500, out int cloversAwarded, out _);
                    Assert.InRange(cloversAwarded, 0, economy.Minigame.MaxPerGame);
                    totalAwarded += cloversAwarded;
                }

                Assert.True(totalAwarded <= 150, $"Total minigame clovers {totalAwarded} exceeded 150 for roster [{string.Join(", ", activeIds)}]");
                Assert.Equal(150, totalAwarded);
                Assert.Equal(150, pet.State.Economy.MinigameCloversToday);
            }
        }

        [Fact]
        public void Invariant2_SixtyDaySimulation_KukiNedAndAllPairs_WithinTenPercentOfSinglePigBaseline()
        {
            var catalog = LoadRealCatalog();
            int baselineEarned = Simulate60DayRegularEarnedClovers(catalog, null, pigModifiersActive: false);
            Assert.True(baselineEarned > 0);

            var pigIds = catalog.Pigs.Select(p => p.Id).ToList();
            for (int i = 0; i < pigIds.Count; i++)
            {
                for (int j = i + 1; j < pigIds.Count; j++)
                {
                    var pair = new[] { pigIds[i], pigIds[j] };
                    int pairEarned = Simulate60DayRegularEarnedClovers(catalog, pair, pigModifiersActive: true);
                    double diffRatio = Math.Abs(pairEarned - baselineEarned) / (double)baselineEarned;
                    Assert.True(diffRatio <= 0.10,
                        $"Pair {pigIds[i]}+{pigIds[j]} earned {pairEarned} vs baseline {baselineEarned} (diff {diffRatio:P2} > 10%)");
                }
            }
        }

        private static int Simulate60DayRegularEarnedClovers(
            NamedPigCatalog catalog,
            IReadOnlyList<string>? activeNamedIds,
            bool pigModifiersActive)
        {
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(startUtc);
            var balance = Balance.CreateDefault();
            balance.HayRackActive = true;
            balance.DiaryActive = true;
            balance.BirthdayRewardsActive = true;
            balance.PigModifiersActive = pigModifiersActive;
            balance.PerPigAgeActive = pigModifiersActive;

            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            state.EnsureRosterInitialized();
            var pet = new Pet(state, clock, balance)
            {
                NamedPigs = catalog
            };
            pet.ApplyNewGameEconomy();

            if (activeNamedIds != null && activeNamedIds.Count > 0)
            {
                var rng = new Random(42);
                pet.State.Roster.Clear();
                pet.State.ActivePigIds.Clear();
                foreach (var pigId in activeNamedIds)
                {
                    var def = catalog.Find(pigId);
                    Assert.NotNull(def);
                    var profile = new PigProfile(def.Name, def.Breed, def.PaletteId)
                    {
                        NamedId = def.Id,
                        BornAtUtc = PigLife.BornAtFor(clock.UtcNow, def.StartAgeYears, balance.PigDaysPerRealDay),
                        ArrivedAtUtc = clock.UtcNow,
                        LegendAtYears = LegendRoll.RollFor(def, rng),
                        Traits = def.Traits != null ? new List<string>(def.Traits) : new List<string>()
                    };
                    pet.State.Roster.Add(profile);
                    if (pet.State.ActivePigIds.Count < 2)
                    {
                        pet.State.ActivePigIds.Add(profile.Id);
                    }
                }
            }

            int totalEarned = 0;
            const int pcFrom = 9;
            const int pcTo = 17;

            for (int day = 1; day <= 60; day++)
            {
                clock.Advance(TimeSpan.FromHours(pcFrom));
                pet.Update();

                int gift = pet.ClaimDailyGift();
                if (gift > 0) totalEarned += gift;

                for (int h = 0; h < 3; h++) pet.RefillHay();

                for (int v = 0; v < 2; v++)
                {
                    pet.ChangeNeed(Need.Satiety, 20);
                    pet.ChangeNeed(Need.VitaminC, 25);
                    pet.ChangeNeed(Need.Mood, 5);
                    pet.AddBondPoints(2);
                    pet.AddClovers(2);
                    totalEarned += 2;
                }

                for (int p = 0; p < 9; p++)
                {
                    pet.ChangeNeed(Need.Mood, 5);
                    pet.AddBondPoints(2);
                }

                for (int m = 0; m < 4; m++)
                {
                    pet.RecordMinigameResult("veggie_rain", 140, out int clv, out _);
                    if (clv > 0) totalEarned += clv;
                }

                var tricks = pet.GetTricks();
                if (tricks != null)
                {
                    foreach (var tr in tricks)
                    {
                        if (tr.Unlocked && tr.ReadyIn <= 0)
                        {
                            pet.TryPerformTrick(tr.Id);
                        }
                    }
                }

                for (int c = 0; c < 3; c++)
                {
                    int careClv = pet.AwardCareTask();
                    if (careClv > 0) totalEarned += careClv;
                }

                int basePoops = Math.Max(1, (pcTo - pcFrom) / 3);
                int poops = pigModifiersActive
                    ? Math.Max(1, (int)Math.Round(basePoops * pet.ActiveModifiers.PoopRate, MidpointRounding.AwayFromZero))
                    : basePoops;
                for (int pc = 0; pc < poops; pc++)
                {
                    pet.AddClovers(1);
                    totalEarned += 1;
                }

                var newlyEarned = pet.CheckAchievements();
                if (newlyEarned != null)
                {
                    foreach (var ach in newlyEarned)
                    {
                        totalEarned += ach.Reward;
                    }
                }

                int oldBirthdays = pet.State.BirthdaysCelebrated;
                pet.Update();
                if (pet.State.BirthdaysCelebrated > oldBirthdays)
                {
                    int count = Math.Min(3, pet.State.BirthdaysCelebrated - oldBirthdays);
                    totalEarned += 50 * count;
                }

                clock.Advance(TimeSpan.FromHours(pcTo - pcFrom));
                pet.Update();
                clock.Advance(TimeSpan.FromHours(24 - pcTo));
            }

            return totalEarned;
        }

        [Fact]
        public void Invariant3_EveryModifierWithin0Point5To1Point5_AndEmptyRosterIsNeutral()
        {
            var catalog = LoadRealCatalog();
            Assert.Equal(0.5, catalog.ModifierMin, 3);
            Assert.Equal(1.5, catalog.ModifierMax, 3);

            var clock = new ManualClock(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = true;

            var emptyState = GameState.CreateNew("Cuy", clock.UtcNow);
            emptyState.Roster.Clear();
            emptyState.ActivePigIds.Clear();
            var emptyPet = new Pet(emptyState, clock, balance) { NamedPigs = catalog };

            Assert.Equal(PigModifiers.Neutral, emptyPet.ActiveModifiers);

            foreach (var pig in catalog.Pigs)
            {
                foreach (var kv in pig.Modifiers)
                {
                    Assert.InRange(kv.Value, 0.5, 1.5);
                }

                var singleMods = PigModifiers.FromDictionary(pig.Modifiers).Clamp(catalog.ModifierMin, catalog.ModifierMax);
                AssertModifiersInRange(singleMods, 0.5, 1.5);

                var state = GameState.CreateNew("Cuy", clock.UtcNow);
                var profile = new PigProfile(pig.Name, pig.Breed, pig.PaletteId) { NamedId = pig.Id };
                state.Roster.Clear();
                state.Roster.Add(profile);
                state.ActivePigIds.Clear();
                state.ActivePigIds.Add(profile.Id);

                var pet = new Pet(state, clock, balance) { NamedPigs = catalog };
                AssertModifiersInRange(pet.ActiveModifiers, 0.5, 1.5);
            }

            for (int i = 0; i < catalog.Pigs.Count; i++)
            {
                for (int j = i + 1; j < catalog.Pigs.Count; j++)
                {
                    var p1 = catalog.Pigs[i];
                    var p2 = catalog.Pigs[j];

                    var state = GameState.CreateNew("Cuy", clock.UtcNow);
                    var prof1 = new PigProfile(p1.Name, p1.Breed, p1.PaletteId) { NamedId = p1.Id };
                    var prof2 = new PigProfile(p2.Name, p2.Breed, p2.PaletteId) { NamedId = p2.Id };
                    state.Roster.Clear();
                    state.Roster.Add(prof1);
                    state.Roster.Add(prof2);
                    state.ActivePigIds.Clear();
                    state.ActivePigIds.Add(prof1.Id);
                    state.ActivePigIds.Add(prof2.Id);

                    var pet = new Pet(state, clock, balance) { NamedPigs = catalog };
                    AssertModifiersInRange(pet.ActiveModifiers, 0.5, 1.5);
                }
            }
        }

        [Fact]
        public void Invariant4_OffersUnlockAtDays90_105_130_WithTolerance0Point01_AndRemainAvailableAfter400Days()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "kuki", "ned" };

            // James at day 90 (tolerance 0.01)
            Assert.Empty(OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(90.0 - 0.01), seen));
            var dueJames = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(90.0), seen);
            Assert.Single(dueJames);
            Assert.Equal("james", dueJames[0].Id);
            seen.Add("james");

            // Glen at day 105 (tolerance 0.01)
            Assert.Empty(OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(105.0 - 0.01), seen));
            var dueGlen = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(105.0), seen);
            Assert.Single(dueGlen);
            Assert.Equal("glen", dueGlen[0].Id);
            seen.Add("glen");

            // Racuch at day 130 (tolerance 0.01)
            Assert.Empty(OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(130.0 - 0.01), seen));
            var dueRacuch = OfferChecker.Due(catalog.Pigs, startUtc, startUtc.AddDays(130.0), seen);
            Assert.Single(dueRacuch);
            Assert.Equal("racuch", dueRacuch[0].Id);

            // Unadopted offers remain available after 400 days
            var adopted = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "kuki", "ned" };
            var statusesAfter400 = OfferChecker.StatusFor(catalog.Pigs, startUtc, startUtc.AddDays(400.0), adopted);

            foreach (var offerId in new[] { "james", "glen", "racuch" })
            {
                var status = statusesAfter400.FirstOrDefault(s => s.Id == offerId);
                Assert.NotNull(status);
                Assert.True(status.Unlocked);
                Assert.False(status.Adopted);
                Assert.Equal(0.0, status.DaysLeft, 3);
            }

            // Also verify via Pet.AdoptNamed at day 400 that an unadopted offer can still be adopted
            var clock = new ManualClock(startUtc);
            var state = GameState.CreateNew("Cuy", startUtc);
            state.EnsureRosterInitialized(catalog, new Random(1), startUtc);
            state.Clovers = 500;
            var balance = Balance.CreateDefault();
            balance.ArrivalsActive = true;
            var pet = new Pet(state, clock, balance) { NamedPigs = catalog };

            clock.Advance(TimeSpan.FromDays(400));
            pet.CheckOffers(clock.UtcNow);
            Assert.Equal(AdoptResult.Ok, pet.AdoptNamed("james", memorial: false, rng: new Random(2), nowUtc: clock.UtcNow));
            Assert.Equal(AdoptResult.Ok, pet.AdoptNamed("glen", memorial: false, rng: new Random(3), nowUtc: clock.UtcNow));
            Assert.Equal(AdoptResult.Ok, pet.AdoptNamed("racuch", memorial: false, rng: new Random(4), nowUtc: clock.UtcNow));
        }

        [Fact]
        public void Invariant5_After140DayJump_AllThreeOffersUnlockedOnce_EachEventFiredOnce()
        {
            var catalog = LoadRealCatalog();
            var startUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(startUtc);
            var state = GameState.CreateNew("Cuy", startUtc);
            state.EnsureRosterInitialized(catalog, new Random(42), startUtc);

            var balance = Balance.CreateDefault();
            balance.ArrivalsActive = true;
            var pet = new Pet(state, clock, balance) { NamedPigs = catalog };

            var eventsFired = new List<string>();
            pet.OfferUnlocked += (s, e) => eventsFired.Add(e.PigId);

            // Jump 140 days at once
            clock.Advance(TimeSpan.FromDays(140));
            var announced = pet.CheckOffers(clock.UtcNow);

            Assert.Equal(new[] { "james", "glen", "racuch" }, announced);
            Assert.Equal(new[] { "james", "glen", "racuch" }, eventsFired);

            // Subsequent check does not unlock or fire again
            var secondAnnounced = pet.CheckOffers(clock.UtcNow);
            Assert.Empty(secondAnnounced);
            Assert.Equal(3, eventsFired.Count);
        }

        [Fact]
        public void Invariant6_LegendRolls_1000SeedsRespectRanges_KukiLessThanNedAtLeast95Percent_AndSavedThresholdPersists()
        {
            var catalog = LoadRealCatalog();
            var kukiDef = catalog.Find("kuki");
            var nedDef = catalog.Find("ned");
            var jamesDef = catalog.Find("james");
            var glenDef = catalog.Find("glen");
            var racuchDef = catalog.Find("racuch");

            Assert.NotNull(kukiDef);
            Assert.NotNull(nedDef);
            Assert.NotNull(jamesDef);
            Assert.NotNull(glenDef);
            Assert.NotNull(racuchDef);

            int kukiLessThanNed = 0;

            for (int seed = 0; seed < 1000; seed++)
            {
                var rng = new Random(seed);
                double kukiRoll = LegendRoll.RollFor(kukiDef, rng).Value;
                double nedRoll = LegendRoll.RollFor(nedDef, rng).Value;
                double jamesRoll = LegendRoll.RollFor(jamesDef, rng).Value;
                double glenRoll = LegendRoll.RollFor(glenDef, rng).Value;
                double racuchRoll = LegendRoll.RollFor(racuchDef, rng).Value;

                Assert.InRange(kukiRoll, 6.0, 7.5);
                Assert.InRange(nedRoll, 7.0, 9.5);
                Assert.InRange(jamesRoll, 6.5, 9.5);
                Assert.InRange(glenRoll, 6.5, 9.5);
                Assert.InRange(racuchRoll, 6.5, 9.5);

                if (kukiRoll < nedRoll)
                {
                    kukiLessThanNed++;
                }
            }

            Assert.True(kukiLessThanNed >= 950, $"Expected Kuki < Ned in at least 950/1000 seeded pairs, got {kukiLessThanNed}");

            // Saved threshold does not change after save/load round-trip and EnsureRosterInitialized
            string tempDir = Path.Combine(Path.GetTempPath(), "CuyLegendPersist_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                var nowUtc = new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);
                var state = GameState.CreateNew("Cuy", nowUtc);
                state.EnsureRosterInitialized(catalog, new Random(77), nowUtc);

                var kuki = state.Roster.First(p => p.NamedId == "kuki");
                var ned = state.Roster.First(p => p.NamedId == "ned");
                double? expectedKukiLegend = kuki.LegendAtYears;
                double? expectedNedLegend = ned.LegendAtYears;
                Assert.NotNull(expectedKukiLegend);
                Assert.NotNull(expectedNedLegend);

                var saveSystem = new SaveSystem(tempDir);
                saveSystem.Save(state);

                var loaded = saveSystem.Load().State;
                Assert.NotNull(loaded);
                loaded.EnsureRosterInitialized(catalog, new Random(999), nowUtc.AddDays(30));

                var loadedKuki = loaded.Roster.First(p => p.NamedId == "kuki");
                var loadedNed = loaded.Roster.First(p => p.NamedId == "ned");
                Assert.Equal(expectedKukiLegend, loadedKuki.LegendAtYears);
                Assert.Equal(expectedNedLegend, loadedNed.LegendAtYears);
            }
            finally
            {
                try { Directory.Delete(tempDir, true); } catch { }
            }
        }

        [Fact]
        public void Invariant7_OldSaveWithoutNewFields_LoadsWithDefaultValues()
        {
            string tempDir = Path.Combine(Path.GetTempPath(), "CuyOldSaveInvariant_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                string oldJson = @"{
  ""version"": 2,
  ""name"": ""Chrupka"",
  ""birthDateUtc"": ""2026-01-01T08:00:00Z"",
  ""lastActiveUtc"": ""2026-01-02T08:00:00Z"",
  ""clovers"": 55,
  ""needs"": {
    ""fullness"": 80.0,
    ""vitamin_c"": 75.0,
    ""energy"": 90.0,
    ""mood"": 85.0,
    ""cleanliness"": 100.0,
    ""teeth"": 70.0
  }
}";
                File.WriteAllText(Path.Combine(tempDir, SaveSystem.FileName), oldJson);

                var loadResult = new SaveSystem(tempDir).Load();
                Assert.Equal(LoadSource.Main, loadResult.Source);
                Assert.NotNull(loadResult.State);

                var state = loadResult.State;
                Assert.Equal("Chrupka", state.Name);
                Assert.NotNull(state.Roster);
                Assert.Single(state.Roster);
                Assert.Equal("Chrupka", state.Roster[0].Name);
                Assert.Null(state.Roster[0].NamedId);
                Assert.Null(state.Roster[0].BornAtUtc);
                Assert.Null(state.Roster[0].ArrivedAtUtc);
                Assert.Null(state.Roster[0].LegendAtYears);
                Assert.False(state.Roster[0].Memorial);

                Assert.NotNull(state.ActivePigIds);
                Assert.Single(state.ActivePigIds);
                Assert.Equal(state.Roster[0].Id, state.ActivePigIds[0]);

                Assert.Null(state.OffersStartUtc);
                Assert.NotNull(state.OffersSeen);
                Assert.Empty(state.OffersSeen);

                // When initialized with the real catalog later, the existing pig stays and the offer clock starts
                var catalog = LoadRealCatalog();
                var nowUtc = new DateTime(2026, 2, 1, 12, 0, 0, DateTimeKind.Utc);
                state.EnsureRosterInitialized(catalog, new Random(10), nowUtc);

                Assert.Single(state.Roster);
                Assert.Equal("Chrupka", state.Roster[0].Name);
                Assert.Null(state.Roster[0].NamedId);
                Assert.Equal(nowUtc, state.OffersStartUtc);
            }
            finally
            {
                try { Directory.Delete(tempDir, true); } catch { }
            }
        }
    }
}
