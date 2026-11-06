using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class AdoptionGateTests
    {
        private static readonly DateTime T0 = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        private static string RepoFile(string relativePath)
        {
            string? dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln"))) return Path.Combine(dir, relativePath);
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException(relativePath);
        }

        private static NamedPigCatalog Catalog() => NamedPigCatalog.Load(File.ReadAllText(RepoFile("assets/data/pigs_named.json")));
        private static AdoptionGateConfig Config() => AdoptionGateConfig.Load(File.ReadAllText(RepoFile("assets/data/adoption_gate.json")));

        private static (Pet pet, ManualClock clock) NewGame()
        {
            var clock = new ManualClock(T0);
            var state = GameState.CreateNew("Cuy", T0);
            state.EnsureStarterPig(T0, Config());
            var pet = new Pet(state, clock, Balance.CreateDefault()) { NamedPigs = Catalog() };
            return (pet, clock);
        }

        private static void Tick(Pet pet, DateTime now, Random rng) =>
            AdoptionGate.Evaluate(pet.State, now, pet.Balance.PigDaysPerRealDay, rng, Config(), pet.NamedPigs);

        /// <summary>Steps one hour at a time until the starter pig is junior; returns that moment.</summary>
        private static DateTime AdvanceToJunior(Pet pet, Random rng)
        {
            var now = T0;
            for (int i = 0; i < 24 * 30; i++)
            {
                now = now.AddHours(1);
                Tick(pet, now, rng);
                if (pet.State.AdoptionStageReachedUtc.HasValue) return pet.State.AdoptionStageReachedUtc.Value;
            }
            throw new Exception("starter never reached junior");
        }

        [Fact]
        public void Config_ReadsJuniorAndOneToThreeDays()
        {
            var c = Config();
            Assert.Equal(LifeStage.Junior, c.StarterStage);
            Assert.Equal(1, c.DelayDaysMin);
            Assert.Equal(3, c.DelayDaysMax);
        }

        [Fact]
        public void G1_BeforeThreshold_KukiAndNedAreHiddenAndNotAdoptable()
        {
            var (pet, _) = NewGame();
            Tick(pet, T0, new Random(1));
            Assert.Single(pet.State.Roster);
            foreach (var id in new[] { "kuki", "ned" })
            {
                Assert.False(AdoptionGate.HasPig(pet.State, id));
                Assert.False(AdoptionGate.IsVisible(pet.State, id, Config(), pet.NamedPigs));
                Assert.False(AdoptionGate.IsAdoptable(pet.State, id, Config(), pet.NamedPigs));
            }
            Assert.False(pet.State.IsAdoptionOfferPending(Config(), pet.NamedPigs));
            Assert.Equal(AdoptResult.NotUnlocked, AdoptionGate.Accept(pet, new Random(1), T0, Config()));
            Assert.Single(pet.State.Roster);
        }

        [Fact]
        public void G2_AfterJuniorPlusOneToThreeDays_BothAreOneOffer()
        {
            var (pet, _) = NewGame();
            var rng = new Random(7);
            var reached = AdvanceToJunior(pet, rng);
            var offerAt = pet.State.AdoptionOfferAtUtc!.Value;

            Assert.InRange((offerAt - reached).TotalDays, 1.0, 3.0);
            Assert.False(pet.State.IsAdoptionOfferPending(Config(), pet.NamedPigs));

            Tick(pet, offerAt.AddMinutes(-1), rng);
            Assert.False(pet.State.AdoptionGateOpen);
            Assert.False(AdoptionGate.IsAdoptable(pet.State, "kuki", Config(), pet.NamedPigs));

            Tick(pet, offerAt, rng);
            Assert.True(pet.State.IsAdoptionOfferPending(Config(), pet.NamedPigs));
            Assert.True(AdoptionGate.IsAdoptable(pet.State, "kuki", Config(), pet.NamedPigs));
            Assert.True(AdoptionGate.IsAdoptable(pet.State, "ned", Config(), pet.NamedPigs));
        }

        [Fact]
        public void G2_DifferentSeedsGiveDelaysInsideTheRange()
        {
            for (int seed = 0; seed < 5; seed++)
            {
                var (pet, _) = NewGame();
                var reached = AdvanceToJunior(pet, new Random(seed));
                Assert.InRange((pet.State.AdoptionOfferAtUtc!.Value - reached).TotalDays, 1.0, 3.0);
            }
        }

        [Fact]
        public void G3_Accepting_AddsBothWithFixedNames()
        {
            var (pet, _) = NewGame();
            var rng = new Random(3);
            AdvanceToJunior(pet, rng);
            var now = pet.State.AdoptionOfferAtUtc!.Value;

            Assert.Equal(AdoptResult.Ok, AdoptionGate.Accept(pet, rng, now, Config()));
            Assert.Equal(3, pet.State.Roster.Count);
            var kuki = pet.State.Roster.Single(p => p.NamedId == "kuki");
            var ned = pet.State.Roster.Single(p => p.NamedId == "ned");
            Assert.Equal("Kuki", kuki.Name);
            Assert.Equal("Ned", ned.Name);
            Assert.False(AdoptionGate.TryRename(kuki, "Bob"));
            Assert.False(AdoptionGate.TryRename(ned, "Bob"));
            Assert.Equal("Kuki", kuki.Name);
            Assert.True(AdoptionGate.TryRename(pet.State.Roster[0], "Mimi"));
            Assert.False(pet.State.IsAdoptionOfferPending(Config(), pet.NamedPigs));
            Assert.Equal(AdoptResult.NotUnlocked, AdoptionGate.Accept(pet, rng, now, Config()));
            Assert.Equal(3, pet.State.Roster.Count);
        }

        [Theory]
        [InlineData("kuki")]
        [InlineData("ned")]
        [InlineData("both")]
        public void G4_OldSaveWithGatePigs_LoadsOpenWithoutDuplicates(string which)
        {
            var catalog = Catalog();
            var state = GameState.CreateNew("Cuy", T0);
            foreach (var id in new[] { "kuki", "ned" })
            {
                if (which != "both" && which != id) continue;
                var def = catalog.Find(id)!;
                state.Roster.Add(new PigProfile(def.Name, def.Breed, def.PaletteId) { NamedId = def.Id, BornAtUtc = T0 });
            }
            string json = JsonConvert.SerializeObject(state, SaveSystem.JsonSettings);
            var obj = Newtonsoft.Json.Linq.JObject.Parse(json);
            foreach (var key in new[] { "adoptionGateOpen", "adoptionStageReachedUtc", "adoptionOfferAtUtc", "adoptionAccepted" }) obj.Remove(key);
            var loaded = JsonConvert.DeserializeObject<GameState>(obj.ToString(), SaveSystem.JsonSettings)!;
            int before = loaded.Roster.Count;

            AdoptionGate.Evaluate(loaded, T0.AddDays(1), 21, new Random(1), Config(), catalog);

            Assert.True(loaded.AdoptionGateOpen);
            Assert.Equal(before, loaded.Roster.Count);
            Assert.Equal(1, loaded.Roster.Count(p => p.NamedId == "kuki") + loaded.Roster.Count(p => p.NamedId == "ned") - (which == "both" ? 1 : 0));
            Assert.False(loaded.IsAdoptionOfferPending(Config(), catalog));
            Assert.True(loaded.Roster.Count(p => p.NamedId == "kuki") <= 1);
            Assert.True(loaded.Roster.Count(p => p.NamedId == "ned") <= 1);

            var pet = new Pet(loaded, new ManualClock(T0.AddDays(1)), Balance.CreateDefault()) { NamedPigs = catalog };
            Assert.Equal(AdoptResult.NotUnlocked, AdoptionGate.Accept(pet, new Random(1), T0.AddDays(1), Config()));
            Assert.Equal(before, loaded.Roster.Count);
        }

        [Fact]
        public void G5_SaveWithoutGateField_LoadsWithSafeDefaults()
        {
            var state = GameState.CreateNew("Cuy", T0);
            state.EnsureStarterPig(T0, Config());
            var obj = Newtonsoft.Json.Linq.JObject.Parse(JsonConvert.SerializeObject(state, SaveSystem.JsonSettings));
            foreach (var key in new[] { "adoptionGateOpen", "adoptionStageReachedUtc", "adoptionOfferAtUtc", "adoptionAccepted" }) obj.Remove(key);
            var loaded = JsonConvert.DeserializeObject<GameState>(obj.ToString(), SaveSystem.JsonSettings)!;

            Assert.False(loaded.AdoptionGateOpen);
            Assert.False(loaded.AdoptionAccepted);
            Assert.Null(loaded.AdoptionOfferAtUtc);
            Assert.False(loaded.IsAdoptionOfferPending(Config(), Catalog()));
        }

        [Fact]
        public void G6_StarterLook_IsDefaultSkin_NotKukiAndNotNed()
        {
            var (pet, _) = NewGame();
            var starter = pet.State.Roster[0];
            var look = AdoptionGate.LookOf(starter, Config());
            var kuki = pet.NamedPigs.Find("kuki")!;
            var ned = pet.NamedPigs.Find("ned")!;

            Assert.Equal("smooth", look.Breed);
            Assert.Equal("tricolor", look.PaletteId);
            Assert.False(look.SameAs(new PigLookSpec(kuki.Breed, kuki.PaletteId)));
            Assert.False(look.SameAs(new PigLookSpec(ned.Breed, ned.PaletteId)));
            Assert.Equal(kuki.PaletteId, AdoptionGate.LookOf(new PigProfile(kuki.Name, kuki.Breed, kuki.PaletteId) { NamedId = "kuki" }, Config()).PaletteId);
        }
    }
}
