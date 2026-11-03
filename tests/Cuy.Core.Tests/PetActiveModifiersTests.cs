using System;
using System.IO;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetActiveModifiersTests
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

        private static Pet CreatePet(GameState? state = null, Balance? balance = null, NamedPigCatalog? catalog = null)
        {
            var clock = new ManualClock(DateTime.UtcNow);
            state = state ?? GameState.CreateNew("test", clock.UtcNow);
            balance = balance ?? Balance.CreateDefault();
            var pet = new Pet(state, clock, balance);
            pet.NamedPigs = catalog ?? LoadRealCatalog();
            return pet;
        }

        [Fact]
        public void NamedPigs_Property_CanBeInjected_AndNullFallsBackToCurrent()
        {
            var pet = CreatePet();
            var realCatalog = LoadRealCatalog();

            pet.NamedPigs = realCatalog;
            Assert.Same(realCatalog, pet.NamedPigs);

            pet.NamedPigs = null;
            Assert.Same(NamedPigCatalog.Current, pet.NamedPigs);
        }

        [Fact]
        public void FlagOff_ReturnsNeutral_EvenWithNedActive()
        {
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = false;

            var pet = CreatePet(balance: balance);
            var ned = new PigProfile("Ned") { NamedId = "ned" };
            pet.State.Roster.Add(ned);
            pet.State.ActivePigIds.Clear();
            pet.State.ActivePigIds.Add(ned.Id);

            var mods = pet.ActiveModifiers;
            Assert.Equal(PigModifiers.Neutral, mods);
        }

        [Fact]
        public void NedAlone_GivesAppetite1Point3()
        {
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = true;

            var pet = CreatePet(balance: balance);
            var ned = new PigProfile("Ned") { NamedId = "ned" };
            pet.State.Roster.Add(ned);
            pet.State.ActivePigIds.Clear();
            pet.State.ActivePigIds.Add(ned.Id);

            var mods = pet.ActiveModifiers;
            Assert.Equal(1.3, mods.Appetite, 3);
            Assert.Equal(1.5, mods.PoopRate, 3);
            Assert.Equal(0.85, mods.Activity, 3);
            Assert.Equal(1.0, mods.BondGain, 3);
            Assert.Equal(1.0, mods.MinigameScore, 3);
            Assert.Equal(1.0, mods.WheekRate, 3);
            Assert.Equal(1.0, mods.Startle, 3);
            Assert.Equal(1.0, mods.JoyWeight, 3);
        }

        [Fact]
        public void NedPlusGlen_AveragesAppetiteTo1Point0_AndActivityTo0Point725()
        {
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = true;

            var pet = CreatePet(balance: balance);
            var ned = new PigProfile("Ned") { NamedId = "ned" };
            var glen = new PigProfile("Glen") { NamedId = "glen" };
            pet.State.Roster.Add(ned);
            pet.State.Roster.Add(glen);
            pet.State.ActivePigIds.Clear();
            pet.State.ActivePigIds.Add(ned.Id);
            pet.State.ActivePigIds.Add(glen.Id);

            var mods = pet.ActiveModifiers;
            Assert.Equal(1.0, mods.Appetite, 3);
            Assert.Equal(0.725, mods.Activity, 3);
            Assert.Equal(1.15, mods.PoopRate, 3);
            Assert.Equal(1.125, mods.BondGain, 3);
        }

        [Fact]
        public void UnnamedPig_IsIgnored_NedPlusAdoptedPig_GivesNedValues()
        {
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = true;

            var pet = CreatePet(balance: balance);
            var ned = new PigProfile("Ned") { NamedId = "ned" };
            var adopted = new PigProfile("Random", "smooth", "tricolor") { NamedId = null };
            pet.State.Roster.Add(ned);
            pet.State.Roster.Add(adopted);
            pet.State.ActivePigIds.Clear();
            pet.State.ActivePigIds.Add(ned.Id);
            pet.State.ActivePigIds.Add(adopted.Id);

            var mods = pet.ActiveModifiers;
            Assert.Equal(1.3, mods.Appetite, 3);
            Assert.Equal(1.5, mods.PoopRate, 3);
            Assert.Equal(0.85, mods.Activity, 3);
            Assert.Equal(1.0, mods.BondGain, 3);
        }

        [Fact]
        public void MemorialNed_IsIgnored()
        {
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = true;

            var pet = CreatePet(balance: balance);
            var ned = new PigProfile("Ned") { NamedId = "ned", Memorial = true };
            pet.State.Roster.Add(ned);
            pet.State.ActivePigIds.Clear();
            pet.State.ActivePigIds.Add(ned.Id);

            var mods = pet.ActiveModifiers;
            Assert.Equal(PigModifiers.Neutral, mods);

            // If Glen is also active and not memorial, only Glen contributes
            var glen = new PigProfile("Glen") { NamedId = "glen", Memorial = false };
            pet.State.Roster.Add(glen);
            pet.State.ActivePigIds.Add(glen.Id);

            var modsWithGlen = pet.ActiveModifiers;
            Assert.Equal(0.7, modsWithGlen.Appetite, 3);
            Assert.Equal(0.6, modsWithGlen.Activity, 3);
            Assert.Equal(0.8, modsWithGlen.PoopRate, 3);
        }

        [Fact]
        public void EmptyRoster_ReturnsNeutral()
        {
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = true;

            var pet = CreatePet(balance: balance);
            pet.State.Roster.Clear();
            pet.State.ActivePigIds.Clear();

            var mods = pet.ActiveModifiers;
            Assert.Equal(PigModifiers.Neutral, mods);
        }

        [Fact]
        public void SwitchingActivePig_ChangesResultImmediately()
        {
            var balance = Balance.CreateDefault();
            balance.PigModifiersActive = true;

            var pet = CreatePet(balance: balance);
            var ned = new PigProfile("Ned") { NamedId = "ned" };
            var glen = new PigProfile("Glen") { NamedId = "glen" };
            pet.State.Roster.Add(ned);
            pet.State.Roster.Add(glen);

            // Active: Ned
            pet.State.ActivePigIds.Clear();
            pet.State.ActivePigIds.Add(ned.Id);
            Assert.Equal(1.3, pet.ActiveModifiers.Appetite, 3);
            Assert.Equal(0.85, pet.ActiveModifiers.Activity, 3);

            // Switch active to: Glen
            pet.State.ActivePigIds.Clear();
            pet.State.ActivePigIds.Add(glen.Id);
            Assert.Equal(0.7, pet.ActiveModifiers.Appetite, 3);
            Assert.Equal(0.6, pet.ActiveModifiers.Activity, 3);

            // Both active: Ned + Glen
            pet.State.ActivePigIds.Add(ned.Id);
            Assert.Equal(1.0, pet.ActiveModifiers.Appetite, 3);
            Assert.Equal(0.725, pet.ActiveModifiers.Activity, 3);
        }
    }
}
