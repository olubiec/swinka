using System;
using System.IO;
using Cuy.Core.Hay;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class HayAppetiteTests
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

        private static HayConfig CreateTestHayConfig()
        {
            return new HayConfig
            {
                Max = 100,
                RefillAmount = 50,
                EatPerGameHour = 6,
                OfflineEatPerHour = 2,
                FullnessPerHayUnit = 0.5,
                WheekBelow = 10
            };
        }

        private static Pet CreatePet(bool pigModifiersActive)
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = GameState.CreateNew("test", clock.UtcNow);
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = pigModifiersActive;

            var pet = new Pet(state, clock, balance);
            pet.NamedPigs = LoadRealCatalog();
            pet.HayTable = CreateTestHayConfig();
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
        public void FlagOff_GivesOldResult_RegardlessOfActivePig()
        {
            var petNed = CreatePet(pigModifiersActive: false);
            SetActivePig(petNed, "ned", "Ned");
            petNed.State.HayRack = 50;
            petNed.Needs.Satiety = 50;

            var petGlen = CreatePet(pigModifiersActive: false);
            SetActivePig(petGlen, "glen", "Glen");
            petGlen.State.HayRack = 50;
            petGlen.Needs.Satiety = 50;

            double eatenNed = petNed.ConsumeHay(1.0, offline: false);
            double eatenGlen = petGlen.ConsumeHay(1.0, offline: false);

            // EatPerGameHour is 6; when flag is off, appetite modifier is neutral (1.0)
            Assert.Equal(6.0, eatenNed, 4);
            Assert.Equal(6.0, eatenGlen, 4);
            Assert.Equal(44.0, petNed.State.HayRack, 4);
            Assert.Equal(44.0, petGlen.State.HayRack, 4);
            Assert.Equal(53.0, petNed.Needs.Satiety, 4);
            Assert.Equal(53.0, petGlen.Needs.Satiety, 4);
        }

        [Fact]
        public void FlagOn_NedEats30PercentMoreHay_GlenEats30PercentLess_ProportionIs1Point3Over0Point7()
        {
            var petNed = CreatePet(pigModifiersActive: true);
            SetActivePig(petNed, "ned", "Ned");
            petNed.State.HayRack = 50;
            petNed.Needs.Satiety = 50;

            var petGlen = CreatePet(pigModifiersActive: true);
            SetActivePig(petGlen, "glen", "Glen");
            petGlen.State.HayRack = 50;
            petGlen.Needs.Satiety = 50;

            // 1 game hour online: EatPerGameHour = 6.0
            // Ned (appetite 1.3): 6.0 * 1.3 = 7.8 (30% more hay than base 6.0)
            // Glen (appetite 0.7): 6.0 * 0.7 = 4.2
            double eatenNed = petNed.ConsumeHay(1.0, offline: false);
            double eatenGlen = petGlen.ConsumeHay(1.0, offline: false);

            Assert.Equal(7.8, eatenNed, 4);
            Assert.Equal(4.2, eatenGlen, 4);

            // Ratio of eaten amounts matches 1.3 / 0.7
            Assert.Equal(1.3 / 0.7, eatenNed / eatenGlen, 4);

            Assert.Equal(50 - 7.8, petNed.State.HayRack, 4);
            Assert.Equal(50 - 4.2, petGlen.State.HayRack, 4);
            Assert.Equal(50 + (7.8 * 0.5), petNed.Needs.Satiety, 4);
            Assert.Equal(50 + (4.2 * 0.5), petGlen.Needs.Satiety, 4);
        }

        [Fact]
        public void OfflineConsumption_IsScaledSameWay()
        {
            var petNed = CreatePet(pigModifiersActive: true);
            SetActivePig(petNed, "ned", "Ned");
            petNed.State.HayRack = 50;
            petNed.Needs.Satiety = 50;

            var petGlen = CreatePet(pigModifiersActive: true);
            SetActivePig(petGlen, "glen", "Glen");
            petGlen.State.HayRack = 50;
            petGlen.Needs.Satiety = 50;

            // 1 hour offline: OfflineEatPerHour = 2.0
            // Ned (1.3): 2.0 * 1.3 = 2.6
            // Glen (0.7): 2.0 * 0.7 = 1.4
            double eatenNed = petNed.ConsumeHay(1.0, offline: true);
            double eatenGlen = petGlen.ConsumeHay(1.0, offline: true);

            Assert.Equal(2.6, eatenNed, 4);
            Assert.Equal(1.4, eatenGlen, 4);
            Assert.Equal(1.3 / 0.7, eatenNed / eatenGlen, 4);

            // Flag off offline check gives base 2.0
            var petOff = CreatePet(pigModifiersActive: false);
            SetActivePig(petOff, "ned", "Ned");
            petOff.State.HayRack = 50;
            petOff.Needs.Satiety = 50;
            double eatenOff = petOff.ConsumeHay(1.0, offline: true);
            Assert.Equal(2.0, eatenOff, 4);
        }

        [Fact]
        public void RackNeverGoesBelowZero_EvenWithHighAppetite()
        {
            var pet = CreatePet(pigModifiersActive: true);
            SetActivePig(pet, "ned", "Ned"); // Appetite 1.3
            pet.State.HayRack = 5.0; // Only 5 in rack
            pet.Needs.Satiety = 20.0;

            // Wants to eat 2 hours * 6.0 * 1.3 = 15.6 hay, but only 5 available
            double eaten = pet.ConsumeHay(2.0, offline: false);

            Assert.Equal(5.0, eaten, 4);
            Assert.Equal(0.0, pet.State.HayRack, 4);
            Assert.True(pet.State.HayRack >= 0.0);
            Assert.Equal(20.0 + (5.0 * 0.5), pet.Needs.Satiety, 4);

            // Subsequent consumption when empty returns 0 and keeps rack at 0
            double eatenAgain = pet.ConsumeHay(1.0, offline: false);
            Assert.Equal(0.0, eatenAgain);
            Assert.Equal(0.0, pet.State.HayRack);
        }

        [Fact]
        public void FullnessNeverExceeds95_EvenWithHighAppetite()
        {
            var pet = CreatePet(pigModifiersActive: true);
            SetActivePig(pet, "ned", "Ned"); // Appetite 1.3
            pet.State.HayRack = 100.0;
            pet.Needs.Satiety = 93.0; // Space left is 2.0 fullness -> requires 4.0 hay (at 0.5 fullness/hay)

            // 1 hour online with Ned wants 7.8 hay, but space only allows 4.0 hay
            double eaten = pet.ConsumeHay(1.0, offline: false);

            Assert.Equal(4.0, eaten, 4);
            Assert.Equal(96.0, pet.State.HayRack, 4);
            Assert.Equal(95.0, pet.Needs.Satiety, 4);
            Assert.True(pet.Needs.Satiety <= 95.0);

            // Subsequent consumption when at 95 returns 0 and does not exceed 95
            double eatenAt95 = pet.ConsumeHay(1.0, offline: false);
            Assert.Equal(0.0, eatenAt95);
            Assert.Equal(95.0, pet.Needs.Satiety);

            // Satiety already above 95 returns 0
            pet.Needs.Satiety = 98.0;
            double eatenOver95 = pet.ConsumeHay(1.0, offline: false);
            Assert.Equal(0.0, eatenOver95);
            Assert.Equal(98.0, pet.Needs.Satiety);
        }
    }
}
