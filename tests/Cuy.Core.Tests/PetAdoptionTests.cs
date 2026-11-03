using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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

        private static Pet CreatePet(GameState? state = null, Balance? balance = null, NamedPigCatalog? catalog = null, DateTime? initialTime = null)
        {
            var now = initialTime ?? new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            state = state ?? GameState.CreateNew("test", clock.UtcNow);
            state.EnsureRosterInitialized();
            balance = balance ?? Balance.CreateDefault();
            var pet = new Pet(state, clock, balance);
            pet.NamedPigs = catalog ?? LoadRealCatalog();
            return pet;
        }

        [Fact]
        public void StarterPair_AdoptionIsFree_AndGivesKukiAndNed_WithLegendAtYearsInsideTheirRanges()
        {
            var pet = CreatePet();
            pet.State.Roster.Clear();
            var rng = new Random(42);
            var now = pet.Clock.UtcNow;

            var result = pet.AdoptGroup("starter", rng, now);

            Assert.Equal(AdoptResult.Ok, result);
            Assert.Equal(2, pet.State.Roster.Count);

            var kuki = pet.State.Roster.FirstOrDefault(p => p.NamedId == "kuki");
            var ned = pet.State.Roster.FirstOrDefault(p => p.NamedId == "ned");

            Assert.NotNull(kuki);
            Assert.NotNull(ned);

            var kukiDef = pet.NamedPigs.Find("kuki");
            var nedDef = pet.NamedPigs.Find("ned");

            Assert.NotNull(kuki.LegendAtYears);
            Assert.True(kuki.LegendAtYears.Value >= kukiDef.LegendYearsMin && kuki.LegendAtYears.Value <= kukiDef.LegendYearsMax,
                $"Kuki LegendAtYears {kuki.LegendAtYears} outside range [{kukiDef.LegendYearsMin}, {kukiDef.LegendYearsMax}]");

            Assert.NotNull(ned.LegendAtYears);
            Assert.True(ned.LegendAtYears.Value >= nedDef.LegendYearsMin && ned.LegendAtYears.Value <= nedDef.LegendYearsMax,
                $"Ned LegendAtYears {ned.LegendAtYears} outside range [{nedDef.LegendYearsMin}, {nedDef.LegendYearsMax}]");

            // Starter pair is free
            Assert.Equal(0, pet.State.Clovers);
            // No welcome pack items for starter pair
            Assert.Equal(0, pet.GetItemCount("bell_pepper"));
            Assert.Equal(0, pet.GetItemCount("parsley"));
            // pigs_arrived counter not incremented for starter pair
            int pigsArrived;
            pet.State.Stats.Counters.TryGetValue("pigs_arrived", out pigsArrived);
            Assert.Equal(0, pigsArrived);
        }

        [Fact]
        public void James_BeforeDay90_IsNotUnlocked()
        {
            var pet = CreatePet();
            var startUtc = pet.Clock.UtcNow;
            pet.State.OffersStartUtc = startUtc;
            var before90 = startUtc.AddDays(89.5);
            var rng = new Random(123);

            var result = pet.AdoptNamed("james", memorial: false, rng: rng, nowUtc: before90);

            Assert.Equal(AdoptResult.NotUnlocked, result);
        }

        [Fact]
        public void James_AtDay90_With100Clovers_IsOk_Spends100_GrantsItems_AndPigsArrived()
        {
            var pet = CreatePet();
            var startUtc = pet.Clock.UtcNow;
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 100;
            var at90 = startUtc.AddDays(90.0);
            var rng = new Random(123);

            var result = pet.AdoptNamed("james", memorial: false, rng: rng, nowUtc: at90);

            Assert.Equal(AdoptResult.Ok, result);
            Assert.Equal(0, pet.State.Clovers);
            Assert.Equal(2, pet.GetItemCount("bell_pepper"));
            Assert.Equal(2, pet.GetItemCount("parsley"));
            Assert.Equal(1, pet.State.Stats.Counters["pigs_arrived"]);

            var james = pet.State.Roster.FirstOrDefault(p => p.NamedId == "james");
            Assert.NotNull(james);
            Assert.False(james.Memorial);
        }

        [Fact]
        public void James_AtDay90_With99Clovers_IsNotEnoughClovers()
        {
            var pet = CreatePet();
            var startUtc = pet.Clock.UtcNow;
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 99;
            var at90 = startUtc.AddDays(90.0);
            var rng = new Random(123);

            var result = pet.AdoptNamed("james", memorial: false, rng: rng, nowUtc: at90);

            Assert.Equal(AdoptResult.NotEnoughClovers, result);
            Assert.Equal(99, pet.State.Clovers);
        }

        [Fact]
        public void SecondAdoption_OfSamePig_IsAlreadyAdopted()
        {
            var pet = CreatePet();
            var startUtc = pet.Clock.UtcNow;
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 200;
            var at90 = startUtc.AddDays(90.0);
            var rng = new Random(123);

            var first = pet.AdoptNamed("james", memorial: false, rng: rng, nowUtc: at90);
            Assert.Equal(AdoptResult.Ok, first);

            var second = pet.AdoptNamed("james", memorial: false, rng: rng, nowUtc: at90);
            Assert.Equal(AdoptResult.AlreadyAdopted, second);
        }

        [Fact]
        public void FullRoster7_GivesRosterFull()
        {
            var pet = CreatePet();
            var startUtc = pet.Clock.UtcNow;
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 100;
            var at90 = startUtc.AddDays(90.0);
            var rng = new Random(123);

            // Fill roster with 7 living pigs
            pet.State.Roster.Clear();
            for (int i = 0; i < 7; i++)
            {
                pet.State.Roster.Add(new PigProfile($"Pig{i}", "smooth", "tricolor"));
            }

            var result = pet.AdoptNamed("james", memorial: false, rng: rng, nowUtc: at90);
            Assert.Equal(AdoptResult.RosterFull, result);
        }

        [Fact]
        public void FullRoster_WithLegendsOrMemorial_DoesNotBlockAdoption()
        {
            var pet = CreatePet();
            var startUtc = pet.Clock.UtcNow;
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 100;
            var at90 = startUtc.AddDays(90.0);
            var rng = new Random(123);

            // 7 pigs in roster, but 2 are memorial
            pet.State.Roster.Clear();
            for (int i = 0; i < 5; i++)
            {
                pet.State.Roster.Add(new PigProfile($"Living{i}", "smooth", "tricolor"));
            }
            for (int i = 0; i < 2; i++)
            {
                var memPig = new PigProfile($"Memorial{i}", "smooth", "tricolor");
                memPig.Memorial = true;
                pet.State.Roster.Add(memPig);
            }

            Assert.Equal(7, pet.State.Roster.Count);

            var result = pet.AdoptNamed("james", memorial: false, rng: rng, nowUtc: at90);
            Assert.Equal(AdoptResult.Ok, result);
        }

        [Fact]
        public void MemorialAdoption_OfRacuch_BeforeDay130_IsOk_Free_Legend_MemorialPigsCount_NoWelcomeItems()
        {
            var pet = CreatePet();
            var startUtc = pet.Clock.UtcNow;
            pet.State.OffersStartUtc = startUtc;
            pet.State.Clovers = 0; // free even with 0 clovers
            var day50 = startUtc.AddDays(50.0); // racuch offer is day 130 normally
            var rng = new Random(456);

            var result = pet.AdoptNamed("racuch", memorial: true, rng: rng, nowUtc: day50);

            Assert.Equal(AdoptResult.Ok, result);
            Assert.Equal(0, pet.State.Clovers);

            var racuch = pet.State.Roster.FirstOrDefault(p => p.NamedId == "racuch");
            Assert.NotNull(racuch);
            Assert.True(racuch.Memorial);

            // Stage is Legend
            var stage = PigLife.StageOf(racuch, day50, pet.Balance.PigDaysPerRealDay, pet.State.BirthDateUtc);
            Assert.Equal(LifeStage.Legend, stage);

            // memorial_pigs is 1
            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);

            // No welcome pack items
            Assert.Equal(0, pet.GetItemCount("bell_pepper"));
            Assert.Equal(0, pet.GetItemCount("parsley"));

            // pigs_arrived not incremented
            int pigsArrived;
            pet.State.Stats.Counters.TryGetValue("pigs_arrived", out pigsArrived);
            Assert.Equal(0, pigsArrived);
        }

        [Fact]
        public void SetMemorial_TwiceOnOnePig_CountsOnce()
        {
            var pet = CreatePet();
            pet.State.Roster.Clear();
            var pig = new PigProfile("TestPig", "smooth", "tricolor");
            pet.State.Roster.Add(pig);

            bool ok1 = pet.SetMemorial(pig.Id, true);
            Assert.True(ok1);
            Assert.True(pig.Memorial);
            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);

            bool ok2 = pet.SetMemorial(pig.Id, true);
            Assert.True(ok2);
            Assert.True(pig.Memorial);
            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);

            bool ok3 = pet.SetMemorial(pig.Id, false);
            Assert.True(ok3);
            Assert.False(pig.Memorial);
            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);

            bool ok4 = pet.SetMemorial(pig.Id, true);
            Assert.True(ok4);
            Assert.True(pig.Memorial);
            Assert.Equal(1, pet.State.Stats.Counters["memorial_pigs"]);
        }

        [Fact]
        public void SetMemorial_UnknownPig_ReturnsFalse()
        {
            var pet = CreatePet();
            bool result = pet.SetMemorial("non_existent_pig_id", true);
            Assert.False(result);
        }

        [Fact]
        public void CheckOffers_Day0AnnouncesNothingForStarterPair_Day91AnnouncesJamesOnce_SecondCallReturnsEmpty()
        {
            var pet = CreatePet();
            pet.Balance.ArrivalsActive = true;
            // Roster has 1 default pig from EnsureRosterInitialized, so clock starts at day 0
            var day0 = pet.Clock.UtcNow;

            var announcedDay0 = pet.CheckOffers(day0);
            Assert.Empty(announcedDay0);
            Assert.Contains("kuki", pet.State.OffersSeen);
            Assert.Contains("ned", pet.State.OffersSeen);

            var day91 = day0.AddDays(91.0);
            var announcedDay91 = pet.CheckOffers(day91);
            Assert.Single(announcedDay91);
            Assert.Equal("james", announcedDay91[0]);

            var secondCall = pet.CheckOffers(day91);
            Assert.Empty(secondCall);
        }

        [Fact]
        public void CheckOffers_WhenArrivalsActiveIsFalse_ReturnsEmpty()
        {
            var pet = CreatePet();
            pet.Balance.ArrivalsActive = false;
            var day100 = pet.Clock.UtcNow.AddDays(100.0);

            var announced = pet.CheckOffers(day100);
            Assert.Empty(announced);
            Assert.Null(pet.State.OffersStartUtc);
        }

        [Fact]
        public void Events_FireWithRightArguments()
        {
            var pet = CreatePet();
            pet.Balance.ArrivalsActive = true;
            var day0 = pet.Clock.UtcNow;
            pet.State.OffersStartUtc = day0;
            pet.State.Clovers = 200;

            var unlockedEvents = new List<OfferUnlockedEventArgs>();
            pet.OfferUnlocked += (s, e) => unlockedEvents.Add(e);

            var adoptedEvents = new List<PigAdoptedEventArgs>();
            pet.PigAdopted += (s, e) => adoptedEvents.Add(e);

            // Starter offers are not announced via OfferUnlocked
            pet.CheckOffers(day0);
            Assert.Empty(unlockedEvents);

            // Day 91: James is announced
            pet.CheckOffers(day0.AddDays(91.0));
            Assert.Single(unlockedEvents);
            Assert.Equal("james", unlockedEvents[0].PigId);

            // Adopt James (non-memorial)
            pet.AdoptNamed("james", memorial: false, rng: new Random(1), nowUtc: day0.AddDays(91.0));
            Assert.Single(adoptedEvents);
            Assert.Equal("james", adoptedEvents[0].Pig.NamedId);
            Assert.False(adoptedEvents[0].Memorial);

            // Adopt Racuch (memorial)
            pet.AdoptNamed("racuch", memorial: true, rng: new Random(2), nowUtc: day0.AddDays(91.0));
            Assert.Equal(2, adoptedEvents.Count);
            Assert.Equal("racuch", adoptedEvents[1].Pig.NamedId);
            Assert.True(adoptedEvents[1].Memorial);
        }

        [Fact]
        public void UnknownPig_ReturnsUnknownPigResult()
        {
            var pet = CreatePet();
            var res = pet.AdoptNamed("dragon", memorial: false, rng: null, nowUtc: DateTime.UtcNow);
            Assert.Equal(AdoptResult.UnknownPig, res);

            var groupRes = pet.AdoptGroup("mystical_creatures", null, DateTime.UtcNow);
            Assert.Equal(AdoptResult.UnknownPig, groupRes);
        }
    }
}
