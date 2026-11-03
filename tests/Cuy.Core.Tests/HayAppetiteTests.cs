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

        private static HayConfig LoadRealHayConfig()
        {
            string json = File.ReadAllText(RepoFile("assets/data/hay.json"));
            return HayConfig.Load(json);
        }

        private static Pet CreatePet(bool pigModifiersActive = true, NamedPigCatalog? catalog = null, HayConfig? hayConfig = null)
        {
            var clock = new ManualClock(DateTime.UtcNow);
            var state = GameState.CreateNew("test", clock.UtcNow);
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = pigModifiersActive;
            var pet = new Pet(state, clock, balance);
            pet.NamedPigs = catalog ?? LoadRealCatalog();
            pet.HayTable = hayConfig ?? LoadRealHayConfig();
            return pet;
        }

        private static void SetActivePig(Pet pet, string namedId, string displayName)
        {
            var profile = new PigProfile(displayName) { NamedId = namedId };
            pet.State.Roster.Clear();
            pet.State.Roster.Add(profile);
            pet.State.ActivePigIds.Clear();
            pet.State.ActivePigIds.Add(profile.Id);
        }

        [Fact]
        public void FlagOff_GivesOldResult_EvenWithNedActive()
        {
            var pet = CreatePet(pigModifiersActive: false);
            SetActivePig(pet, "ned", "Ned");

            pet.State.HayRack = 100.0;
            pet.Needs.Satiety = 50.0;

            double eatenOnline = pet.ConsumeHay(1.0, offline: false);
            Assert.Equal(pet.HayTable.EatPerGameHour, eatenOnline, precision: 5);

            pet.State.HayRack = 100.0;
            pet.Needs.Satiety = 50.0;

            double eatenOffline = pet.ConsumeHay(1.0, offline: true);
            Assert.Equal(pet.HayTable.OfflineEatPerHour, eatenOffline, precision: 5);
        }

        [Fact]
        public void FlagOn_NedEats30PercentMoreThanBase_AndProportionalToGlen()
        {
            var petNed = CreatePet(pigModifiersActive: true);
            SetActivePig(petNed, "ned", "Ned");
            petNed.State.HayRack = 100.0;
            petNed.Needs.Satiety = 50.0;

            var petGlen = CreatePet(pigModifiersActive: true);
            SetActivePig(petGlen, "glen", "Glen");
            petGlen.State.HayRack = 100.0;
            petGlen.Needs.Satiety = 50.0;

            double eatenNed = petNed.ConsumeHay(1.0, offline: false);
            double eatenGlen = petGlen.ConsumeHay(1.0, offline: false);

            double baseRate = petNed.HayTable.EatPerGameHour;
            Assert.Equal(baseRate * 1.3, eatenNed, precision: 5);
            Assert.Equal(baseRate * 0.7, eatenGlen, precision: 5);

            // Ned (1.3) eats in proportion 1.3 / 0.7 relative to Glen (0.7)
            Assert.Equal(1.3 / 0.7, eatenNed / eatenGlen, precision: 5);
        }

        [Fact]
        public void FlagOn_OfflineConsumption_ScaledSameWay()
        {
            var petNed = CreatePet(pigModifiersActive: true);
            SetActivePig(petNed, "ned", "Ned");
            petNed.State.HayRack = 100.0;
            petNed.Needs.Satiety = 50.0;

            var petGlen = CreatePet(pigModifiersActive: true);
            SetActivePig(petGlen, "glen", "Glen");
            petGlen.State.HayRack = 100.0;
            petGlen.Needs.Satiety = 50.0;

            double eatenNed = petNed.ConsumeHay(1.0, offline: true);
            double eatenGlen = petGlen.ConsumeHay(1.0, offline: true);

            double baseOfflineRate = petNed.HayTable.OfflineEatPerHour;
            Assert.Equal(baseOfflineRate * 1.3, eatenNed, precision: 5);
            Assert.Equal(baseOfflineRate * 0.7, eatenGlen, precision: 5);

            // Proportional scaling for offline consumption
            Assert.Equal(1.3 / 0.7, eatenNed / eatenGlen, precision: 5);
        }

        [Fact]
        public void RackNeverGoesBelowZero()
        {
            var pet = CreatePet(pigModifiersActive: true);
            SetActivePig(pet, "ned", "Ned");

            pet.State.HayRack = 2.0;
            pet.Needs.Satiety = 10.0;

            // In 1 hour Ned would consume 7.8, but only 2.0 is in rack
            double eaten = pet.ConsumeHay(1.0, offline: false);

            Assert.Equal(2.0, eaten, precision: 5);
            Assert.Equal(0.0, pet.State.HayRack, precision: 5);

            // Further consumption yields 0 and stays at 0
            double eatenAgain = pet.ConsumeHay(1.0, offline: false);
            Assert.Equal(0.0, eatenAgain, precision: 5);
            Assert.Equal(0.0, pet.State.HayRack, precision: 5);
        }

        [Fact]
        public void FullnessNeverAbove95()
        {
            var pet = CreatePet(pigModifiersActive: true);
            SetActivePig(pet, "ned", "Ned");

            pet.State.HayRack = 100.0;
            pet.Needs.Satiety = 93.0;

            // Space left to 95.0 is 2.0 fullness units -> 4.0 hay units at 0.5 fullness/hay
            // In 5 hours Ned would eat 5 * 7.8 = 39.0, but capped by space
            double eaten = pet.ConsumeHay(5.0, offline: false);

            Assert.Equal(4.0, eaten, precision: 5);
            Assert.Equal(95.0, pet.Needs.Satiety, precision: 5);

            // Once fullness is 95, no more hay is consumed
            double eatenAfterCap = pet.ConsumeHay(1.0, offline: false);
            Assert.Equal(0.0, eatenAfterCap, precision: 5);
            Assert.Equal(95.0, pet.Needs.Satiety, precision: 5);
        }
    }
}
