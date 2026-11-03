using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetAdoptionTests
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

        private static Pet CreatePet(NamedPigCatalog? catalog = null, Balance? balance = null, DateTime? nowUtc = null)
        {
            DateTime start = nowUtc ?? new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(start);
            var state = GameState.CreateNew("test", clock.UtcNow);
            balance = balance ?? Balance.CreateDefault();
            var pet = new Pet(state, clock, balance);
            pet.NamedPigs = catalog ?? LoadRealCatalog();
            return pet;
        }

        [Fact]
        public void StarterPair_AdoptGroup_IsFree_GivesKukiAndNed_WithinLegendRanges()
        {
            var catalog = LoadRealCatalog();
            DateTime startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var pet = CreatePet(catalog, nowUtc: startUtc);
            pet.State.Roster.Clear();
            pet.State.ActivePigIds.Clear();
            pet.State.Clovers = 0;

            var adoptedEvents = new List<PigAdoptedEventArgs>();
            pet.PigAdopted += (s, e) => adoptedEvents.Add(e);

            var rng = new Random(42);
            var result = pet.AdoptGroup("starter", memorial: false, rng: rng, nowUtc: startUtc);

            Assert.Equal(AdoptResult.Ok, result);
            Assert.Equal(0, pet.State.Clovers);
            Assert.Equal(2, pet.State.Roster.Count);

            var kuki = pet.State.Roster.Find(p => p.NamedId == "kuki");
            Assert.NotNull(kuki);
            Assert.Equal("Kuki", kuki.Name);
            Assert.Equal("rosette_normal", kuki.Breed);
            Assert.Equal("two_tone.ginger", kuki.PaletteId);
            Assert.NotNull(kuki.LegendAtYears);
            Assert.True(kuki.LegendAtYears.Value >= 6.0 && kuki.LegendAtYears.Value <= 7.5,
                $"Kuki LegendAtYears {kuki.LegendAtYears} outside range [6.0, 7.5]");

            var ned = pet.State.Roster.Find(p => p.NamedId == "ned");
            Assert.NotNull(ned);
            Assert.Equal("Ned", ned.Name);
            Assert.Equal("teddy_chubby", ned.Breed);
            Assert.Equal("bicolor_head.chocolate", ned.PaletteId);
            Assert.NotNull(ned.LegendAtYears);
            Assert.True(ned.LegendAtYears.Value >= 7.0 && ned.LegendAtYears.Value <= 9.5,
                $"Ned LegendAtYears {ned.LegendAtYears} outside range [7.0, 9.5]");

            Assert.Equal(2, adoptedEvents.Count);
            Assert.Equal("kuki", adoptedEvents[0].Pig.NamedId);
            Assert.False(adoptedEvents[0].Memorial);
            Assert.Equal("ned", adoptedEvents[1].Pig.NamedId);
            Assert.False(adoptedEvents[1].Memorial);

            Assert.False(pet.State.Stats.Counters.ContainsKey("pigs_arrived"));
            Assert.Equal(0, pet.GetItemCount("bell_pepper"));
            Assert.Equal(0, pet.GetItemCount("parsley"));
        }

        [Fact]
        public void James_BeforeDay90_IsNotUnlocked()
        {
            var catalog = LoadRealCatalog();
            DateTime startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var pet = CreatePet(catalog, nowUtc: startUtc);
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 200;

            var result = pet.AdoptNamed("james", memorial: false, rng: new Random(1), nowUtc: startUtc.AddDays(89));
            Assert.Equal(AdoptResult.NotUnlocked, result);
        }

        [Fact]
        public void James_AtDay90_With100Clovers_IsOk_Spends100_GrantsItems_AndCountsPigsArrived()
        {
            var catalog = LoadRealCatalog();
            DateTime startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var pet = CreatePet(catalog, nowUtc: startUtc);
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 100;

            PigAdoptedEventArgs adoptedEvent = null;
            pet.PigAdopted += (s, e) => adoptedEvent = e;

            var result = pet.AdoptNamed("james", memorial: false, rng: new Random(1), nowUtc: startUtc.AddDays(90));

            Assert.Equal(AdoptResult.Ok, result);
            Assert.Equal(0, pet.State.Clovers);
            Assert.Equal(2, pet.GetItemCount("bell_pepper"));
            Assert.Equal(2, pet.GetItemCount("parsley"));
            Assert.Equal(1, pet.State.Stats.Counters["pigs_arrived"]);

            Assert.NotNull(adoptedEvent);
            Assert.Equal("james", adoptedEvent.Pig.NamedId);
            Assert.False(adoptedEvent.Memorial);
        }

        [Fact]
        public void James_AtDay90_With99Clovers_ReturnsNotEnoughClovers()
        {
            var catalog = LoadRealCatalog();
            DateTime startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var pet = CreatePet(catalog, nowUtc: startUtc);
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 99;

            var result = pet.AdoptNamed("james", memorial: false, rng: new Random(1), nowUtc: startUtc.AddDays(90));

            Assert.Equal(AdoptResult.NotEnoughClovers, result);
            Assert.Equal(99, pet.State.Clovers);
        }

        [Fact]
        public void SecondAdoptionOfSamePig_ReturnsAlreadyAdopted()
        {
            var catalog = LoadRealCatalog();
            DateTime startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var pet = CreatePet(catalog, nowUtc: startUtc);
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 200;

            var firstResult = pet.AdoptNamed("james", memorial: false, rng: new Random(1), nowUtc: startUtc.AddDays(90));
            Assert.Equal(AdoptResult.Ok, firstResult);

            var secondResult = pet.AdoptNamed("james", memorial: false, rng: new Random(1), nowUtc: startUtc.AddDays(90));
            Assert.Equal(AdoptResult.AlreadyAdopted, secondResult);
        }

        [Fact]
        public void FullRoster_7Pigs_ReturnsRosterFull()
        {
            var catalog = LoadRealCatalog();
            DateTime startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var pet = CreatePet(catalog, nowUtc: startUtc);
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 200;
            pet.MaxRoster = 7;

            pet.State.Roster.Clear();
            for (int i = 0; i < 7; i++)
            {
                pet.State.Roster.Add(new PigProfile($"Pig{i}")
                {
                    BornAtUtc = startUtc,
                    Memorial = false
                });
            }

            var result = pet.AdoptNamed("james", memorial: false, rng: new Random(1), nowUtc: startUtc.AddDays(90));
            Assert.Equal(AdoptResult.RosterFull, result);
        }

        [Fact]
        public void MemorialAdoption_Racuch_BeforeDay130_IsOk_Free_Legend_MemorialPigsCounted_NoWelcome()
        {
            var catalog = LoadRealCatalog();
            DateTime startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var pet = CreatePet(catalog, nowUtc: startUtc);
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 0;

            PigAdoptedEventArgs adoptedEvent = null;
            pet.PigAdopted += (s, e) => adoptedEvent = e;

            var result = pet.AdoptNamed("racuch", memorial: true, rng: new Random(1), nowUtc: startUtc.AddDays(50));

            Assert.Equal(AdoptResult.Ok, result);
            Assert.Equal(0, pet.State.Clovers);

            var racuch = pet.State.Roster.Find(p => p.NamedId == "racuch");
            Assert.NotNull(racuch);
            Assert.True(racuch.Memorial);

            var stage = PigLife.StageOf(racuch, startUtc.AddDays(50), pet.Balance.PigDaysPerRealDay, pet.State.BirthDateUtc);
            Assert.Equal(LifeStage.Legend, stage);

            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);
            Assert.False(pet.State.Stats.Counters.ContainsKey("pigs_arrived"));
            Assert.Equal(0, pet.GetItemCount("bell_pepper"));
            Assert.Equal(0, pet.GetItemCount("parsley"));

            Assert.NotNull(adoptedEvent);
            Assert.Equal("racuch", adoptedEvent.Pig.NamedId);
            Assert.True(adoptedEvent.Memorial);
        }

        [Fact]
        public void SetMemorial_TwiceOnOnePig_CountsOnce()
        {
            var catalog = LoadRealCatalog();
            var pet = CreatePet(catalog);

            var pig = new PigProfile("TestPig") { Memorial = false };
            pet.State.Roster.Add(pig);

            Assert.True(pet.SetMemorial(pig.Id, true));
            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);

            Assert.True(pet.SetMemorial(pig.Id, true));
            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);

            Assert.True(pet.SetMemorial(pig.Id, false));
            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);

            Assert.True(pet.SetMemorial(pig.Id, true));
            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);

            Assert.False(pet.SetMemorial("non_existent_id", true));
        }

        [Fact]
        public void CheckOffers_Day0AnnouncesNothingForStarter_Day91AnnouncesJamesOnce_SecondCallEmpty()
        {
            var catalog = LoadRealCatalog();
            DateTime startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var balance = Balance.CreateDefault();
            balance.ArrivalsActive = true;
            var pet = CreatePet(catalog, balance: balance, nowUtc: startUtc);

            pet.State.EnsureRosterInitialized();

            var unlockedEvents = new List<OfferUnlockedEventArgs>();
            pet.OfferUnlocked += (s, e) => unlockedEvents.Add(e);

            // Day 0: starter pair should NOT be announced
            var offersDay0 = pet.CheckOffers(startUtc);
            Assert.Empty(offersDay0);
            Assert.Empty(unlockedEvents);

            // Day 91: James should be announced
            var offersDay91 = pet.CheckOffers(startUtc.AddDays(91));
            Assert.Single(offersDay91);
            Assert.Equal("james", offersDay91[0]);
            Assert.Single(unlockedEvents);
            Assert.Equal("james", unlockedEvents[0].PigId);

            // Second call at Day 91: should return empty and not fire event again
            var offersDay91Second = pet.CheckOffers(startUtc.AddDays(91));
            Assert.Empty(offersDay91Second);
            Assert.Single(unlockedEvents);
        }

        [Fact]
        public void CheckOffers_ArrivalsActiveOff_ReturnsEmpty()
        {
            var catalog = LoadRealCatalog();
            DateTime startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var balance = Balance.CreateDefault();
            balance.ArrivalsActive = false;
            var pet = CreatePet(catalog, balance: balance, nowUtc: startUtc);
            pet.State.EnsureRosterInitialized();

            var offers = pet.CheckOffers(startUtc.AddDays(100));
            Assert.Empty(offers);
        }

        [Fact]
        public void AdoptNamed_UnknownPig_ReturnsUnknownPig()
        {
            var pet = CreatePet();
            var res = pet.AdoptNamed("non_existent");
            Assert.Equal(AdoptResult.UnknownPig, res);
        }
    }
}
