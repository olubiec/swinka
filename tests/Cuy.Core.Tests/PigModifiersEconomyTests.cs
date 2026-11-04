using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigModifiersEconomyTests
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

        private static Pet CreatePet(bool pigModifiersActive, NamedPigCatalog? catalog = null)
        {
            var clock = new ManualClock(new DateTime(2026, 11, 4, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = pigModifiersActive;

            var pet = new Pet(state, clock, balance);
            pet.NamedPigs = catalog ?? LoadRealCatalog();
            return pet;
        }

        private static void SetActivePig(Pet pet, string namedId, string name)
        {
            var pig = new PigProfile(name) { NamedId = namedId };
            pet.State.Roster.Clear();
            pet.State.Roster.Add(pig);
            pet.State.ActivePigIds.Clear();
            pet.State.ActivePigIds.Add(pig.Id);
        }

        [Fact]
        public void FlagOff_PreservesDefaultNumbers()
        {
            var petGlen = CreatePet(pigModifiersActive: false);
            SetActivePig(petGlen, "glen", "Glen");

            // Bond gain is not scaled (neutral 1.0)
            int bondAdded = petGlen.AddBondPoints(4);
            Assert.Equal(4, bondAdded);
            Assert.Equal(4, petGlen.State.Bond.Points);

            var petJames = CreatePet(pigModifiersActive: false);
            SetActivePig(petJames, "james", "James");

            // Minigame score is not scaled (neutral 1.0)
            petJames.RecordMinigameResult("game", 100, out int clovers, out _);
            Assert.Equal(10, clovers);
        }

        [Fact]
        public void Glen_GainsMoreBondThanJames()
        {
            var petGlen = CreatePet(pigModifiersActive: true);
            SetActivePig(petGlen, "glen", "Glen");
            Assert.Equal(1.25, petGlen.ActiveModifiers.BondGain, 3);

            var petJames = CreatePet(pigModifiersActive: true);
            SetActivePig(petJames, "james", "James");
            Assert.Equal(0.7, petJames.ActiveModifiers.BondGain, 3);

            // Adding 4 points:
            // Glen: 4 * 1.25 = 5.0 -> 5
            // James: 4 * 0.7 = 2.8 -> 3
            int glenGained = petGlen.AddBondPoints(4);
            int jamesGained = petJames.AddBondPoints(4);

            Assert.Equal(5, glenGained);
            Assert.Equal(3, jamesGained);
            Assert.True(glenGained > jamesGained);

            // Adding 2 points (e.g. tricks):
            // Glen: 2 * 1.25 = 2.5 -> 3
            // James: 2 * 0.7 = 1.4 -> 1
            int glenTrickGained = petGlen.AddBondPoints(2);
            int jamesTrickGained = petJames.AddBondPoints(2);

            Assert.Equal(3, glenTrickGained);
            Assert.Equal(1, jamesTrickGained);
            Assert.True(glenTrickGained > jamesTrickGained);
        }

        [Fact]
        public void BondDailyLimit30_IsNeverExceeded()
        {
            var pet = CreatePet(pigModifiersActive: true);
            SetActivePig(pet, "glen", "Glen");

            // 20 * 1.25 = 25 points
            int first = pet.AddBondPoints(20);
            Assert.Equal(25, first);
            Assert.Equal(25, pet.State.Bond.PointsToday);
            Assert.Equal(25, pet.State.Bond.Points);

            // 20 * 1.25 = 25 points, but daily limit is 30, remaining cap is 5
            int second = pet.AddBondPoints(20);
            Assert.Equal(5, second);
            Assert.Equal(30, pet.State.Bond.PointsToday);
            Assert.Equal(30, pet.State.Bond.Points);

            // Further additions on the same day yield 0
            int third = pet.AddBondPoints(10);
            Assert.Equal(0, third);
            Assert.Equal(30, pet.State.Bond.PointsToday);
            Assert.Equal(30, pet.State.Bond.Points);
        }

        [Fact]
        public void Score100WithJames_PaysSameAs120WithNeutral()
        {
            var petJames = CreatePet(pigModifiersActive: true);
            SetActivePig(petJames, "james", "James");
            Assert.Equal(1.2, petJames.ActiveModifiers.MinigameScore, 3);

            var petNeutral = CreatePet(pigModifiersActive: false);
            SetActivePig(petNeutral, "kuki", "Kuki");
            Assert.Equal(1.0, petNeutral.ActiveModifiers.MinigameScore, 3);

            // James with score 100: 100 * 1.2 = 120 -> 120 / 10 = 12 clovers
            petJames.RecordMinigameResult("popcorn", 100, out int cloversJames, out _);

            // Neutral with score 120: 120 * 1.0 = 120 -> 120 / 10 = 12 clovers
            petNeutral.RecordMinigameResult("popcorn", 120, out int cloversNeutral, out _);

            Assert.Equal(12, cloversJames);
            Assert.Equal(12, cloversNeutral);
            Assert.Equal(cloversNeutral, cloversJames);
        }

        [Fact]
        public void PerGameCap40_AndDailyCap150_StillHoldWithMultiplier15()
        {
            var customPigs = new List<NamedPigDefinition>
            {
                new NamedPigDefinition(
                    id: "booster",
                    name: "Booster",
                    breed: "teddy",
                    paletteId: "default",
                    pattern: "solid",
                    palette: "brown",
                    startAgeYears: 0.0,
                    legendYearsMin: 7.0,
                    legendYearsMax: 9.0,
                    offerGroup: "starter",
                    offerAfterDays: 0,
                    offerCost: 0,
                    traits: null,
                    blurb: "Boosted pig",
                    weightG: null,
                    modifiers: new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase)
                    {
                        { "minigame_score", 1.5 }
                    }
                )
            };

            var catalog = new NamedPigCatalog(
                pigs: customPigs,
                welcomeClovers: 0,
                welcomeItems: null,
                modifierMin: 0.5,
                modifierMax: 1.5,
                groups: null
            );

            var pet = CreatePet(pigModifiersActive: true, catalog: catalog);
            SetActivePig(pet, "booster", "Booster");
            Assert.Equal(1.5, pet.ActiveModifiers.MinigameScore, 3);

            int startClovers = pet.State.Clovers;

            // Score 300 with 1.5 multiplier: 300 * 1.5 = 450 -> 45 clovers uncapped.
            // But per-game cap is 40.
            pet.RecordMinigameResult("game", 300, out int clovers1, out _);
            Assert.Equal(40, clovers1);
            Assert.Equal(40, pet.State.Economy.MinigameCloversToday);

            // Feed many results to test daily cap 150:
            // Game 2: 40 clovers (total 80)
            pet.RecordMinigameResult("game", 300, out int clovers2, out _);
            Assert.Equal(40, clovers2);
            Assert.Equal(80, pet.State.Economy.MinigameCloversToday);

            // Game 3: 40 clovers (total 120)
            pet.RecordMinigameResult("game", 300, out int clovers3, out _);
            Assert.Equal(40, clovers3);
            Assert.Equal(120, pet.State.Economy.MinigameCloversToday);

            // Game 4: remaining cap is 150 - 120 = 30 clovers
            pet.RecordMinigameResult("game", 300, out int clovers4, out _);
            Assert.Equal(30, clovers4);
            Assert.Equal(150, pet.State.Economy.MinigameCloversToday);

            // Game 5: cap reached, 0 clovers
            pet.RecordMinigameResult("game", 300, out int clovers5, out _);
            Assert.Equal(0, clovers5);
            Assert.Equal(150, pet.State.Economy.MinigameCloversToday);

            // Game 6: still 0 clovers
            pet.RecordMinigameResult("game", 300, out int clovers6, out _);
            Assert.Equal(0, clovers6);
            Assert.Equal(150, pet.State.Economy.MinigameCloversToday);

            Assert.Equal(startClovers + 150, pet.State.Clovers);
        }
    }
}
