using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using Xunit;
using Cuy.Core.Pigs;

namespace Cuy.Core.Tests
{
    public class NamedPigCatalogTests
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
        public void Load_OrderOfPigs_IsKukiNedJamesGlenRacuch()
        {
            var catalog = LoadRealCatalog();

            Assert.Equal(5, catalog.Pigs.Count);
            var expectedIds = new[] { "kuki", "ned", "james", "glen", "racuch" };
            Assert.Equal(expectedIds, catalog.Pigs.Select(p => p.Id));
        }

        [Fact]
        public void OfferGroup_Starter_HoldsKukiAndNed_WithZeroDaysAndCost()
        {
            var catalog = LoadRealCatalog();

            var starterPigs = catalog.OfferGroup("starter");
            Assert.Equal(2, starterPigs.Count);

            Assert.Equal("kuki", starterPigs[0].Id);
            Assert.Equal(0, starterPigs[0].OfferAfterDays);
            Assert.Equal(0, starterPigs[0].OfferCost);
            Assert.Equal("starter", starterPigs[0].OfferGroup);

            Assert.Equal("ned", starterPigs[1].Id);
            Assert.Equal(0, starterPigs[1].OfferAfterDays);
            Assert.Equal(0, starterPigs[1].OfferCost);
            Assert.Equal("starter", starterPigs[1].OfferGroup);
        }

        [Fact]
        public void Offers_DaysAndCost_MatchSpecification()
        {
            var catalog = LoadRealCatalog();

            var james = catalog.Find("james");
            Assert.NotNull(james);
            Assert.Equal(90, james.OfferAfterDays);
            Assert.Equal(100, james.OfferCost);

            var glen = catalog.Find("glen");
            Assert.NotNull(glen);
            Assert.Equal(105, glen.OfferAfterDays);
            Assert.Equal(100, glen.OfferCost);

            var racuch = catalog.Find("racuch");
            Assert.NotNull(racuch);
            Assert.Equal(130, racuch.OfferAfterDays);
            Assert.Equal(100, racuch.OfferCost);
        }

        [Fact]
        public void StartAges_MatchSpecification()
        {
            var catalog = LoadRealCatalog();

            Assert.Equal(0.1, catalog.Find("kuki")?.StartAgeYears ?? -1, 3);
            Assert.Equal(0.0, catalog.Find("ned")?.StartAgeYears ?? -1, 3);
            Assert.Equal(0.0, catalog.Find("james")?.StartAgeYears ?? -1, 3);
            Assert.Equal(1.2, catalog.Find("glen")?.StartAgeYears ?? -1, 3);
            Assert.Equal(0.0, catalog.Find("racuch")?.StartAgeYears ?? -1, 3);
        }

        [Fact]
        public void LegendRanges_MatchSpecification()
        {
            var catalog = LoadRealCatalog();

            var kuki = catalog.Find("kuki");
            Assert.NotNull(kuki);
            Assert.Equal(6.0, kuki.LegendYearsMin, 3);
            Assert.Equal(7.5, kuki.LegendYearsMax, 3);

            var ned = catalog.Find("ned");
            Assert.NotNull(ned);
            Assert.Equal(7.0, ned.LegendYearsMin, 3);
            Assert.Equal(9.5, ned.LegendYearsMax, 3);

            var james = catalog.Find("james");
            Assert.NotNull(james);
            Assert.Equal(6.5, james.LegendYearsMin, 3);
            Assert.Equal(9.5, james.LegendYearsMax, 3);

            var glen = catalog.Find("glen");
            Assert.NotNull(glen);
            Assert.Equal(6.5, glen.LegendYearsMin, 3);
            Assert.Equal(9.5, glen.LegendYearsMax, 3);

            var racuch = catalog.Find("racuch");
            Assert.NotNull(racuch);
            Assert.Equal(6.5, racuch.LegendYearsMin, 3);
            Assert.Equal(9.5, racuch.LegendYearsMax, 3);
        }

        [Fact]
        public void Modifiers_EveryPigHasEightKeysInsideLimits()
        {
            var catalog = LoadRealCatalog();

            string[] expectedKeys = new[]
            {
                "appetite", "poop_rate", "activity", "bond_gain",
                "minigame_score", "wheek_rate", "startle", "joy_weight"
            };

            foreach (var pig in catalog.Pigs)
            {
                foreach (var key in expectedKeys)
                {
                    Assert.True(pig.Modifiers.ContainsKey(key), $"Pig '{pig.Id}' missing modifier key '{key}'");
                    double val = pig.Modifiers[key];
                    Assert.True(val >= catalog.ModifierMin && val <= catalog.ModifierMax,
                        $"Pig '{pig.Id}' modifier '{key}' value {val} outside [{catalog.ModifierMin}, {catalog.ModifierMax}]");
                }
            }
        }

        [Fact]
        public void WelcomePack_MatchesSpecification()
        {
            var catalog = LoadRealCatalog();

            Assert.Equal(0, catalog.WelcomeClovers);
            Assert.True(catalog.WelcomeItems.ContainsKey("bell_pepper"));
            Assert.Equal(2, catalog.WelcomeItems["bell_pepper"]);
            Assert.True(catalog.WelcomeItems.ContainsKey("parsley"));
            Assert.Equal(2, catalog.WelcomeItems["parsley"]);
        }

        [Fact]
        public void Look_BreedAndPaletteId_ExistInSpriteAssets()
        {
            var catalog = LoadRealCatalog();

            var breedsJson = File.ReadAllText(RepoFile("assets/sprites/breeds.json"));
            var breedsObj = JObject.Parse(breedsJson)["breeds"] as JObject;
            Assert.NotNull(breedsObj);

            var palettesJson = File.ReadAllText(RepoFile("assets/sprites/palettes.json"));
            var palettesObj = JObject.Parse(palettesJson)["palettes"] as JObject;
            Assert.NotNull(palettesObj);

            foreach (var pig in catalog.Pigs)
            {
                Assert.True(breedsObj.ContainsKey(pig.Breed),
                    $"Breed '{pig.Breed}' for pig '{pig.Id}' does not exist in assets/sprites/breeds.json");
                Assert.True(palettesObj.ContainsKey(pig.PaletteId),
                    $"PaletteId '{pig.PaletteId}' for pig '{pig.Id}' does not exist in assets/sprites/palettes.json");
            }
        }

        [Fact]
        public void BrokenJson_ReturnsDefaults()
        {
            var catalog = NamedPigCatalog.Load("this is not valid json {{{");

            Assert.NotNull(catalog);
            Assert.Equal(5, catalog.Pigs.Count);
            Assert.Equal("kuki", catalog.Pigs[0].Id);
            Assert.Equal(0, catalog.WelcomeClovers);
            Assert.Equal(2, catalog.WelcomeItems["bell_pepper"]);
            Assert.Equal(2, catalog.WelcomeItems["parsley"]);
            Assert.Equal(0.5, catalog.ModifierMin);
            Assert.Equal(1.5, catalog.ModifierMax);
        }

        [Fact]
        public void LegendRange_MinGreaterThanOrEqualMax_OrBelow4Point5_FallsBackToDefault()
        {
            string customJson = @"{
                ""legend_years_default"": { ""min"": 6.5, ""max"": 9.5 },
                ""pigs"": [
                    {
                        ""id"": ""test_inv_max"",
                        ""legend_years"": { ""min"": 8.0, ""max"": 7.0 }
                    },
                    {
                        ""id"": ""test_inv_min"",
                        ""legend_years"": { ""min"": 4.0, ""max"": 8.0 }
                    }
                ]
            }";

            var catalog = NamedPigCatalog.Load(customJson);

            var p1 = catalog.Find("test_inv_max");
            Assert.NotNull(p1);
            Assert.Equal(6.5, p1.LegendYearsMin);
            Assert.Equal(9.5, p1.LegendYearsMax);

            var p2 = catalog.Find("test_inv_min");
            Assert.NotNull(p2);
            Assert.Equal(6.5, p2.LegendYearsMin);
            Assert.Equal(9.5, p2.LegendYearsMax);
        }

        [Fact]
        public void OfferGroup_UnknownPig_IsDropped()
        {
            string customJson = @"{
                ""pigs"": [
                    { ""id"": ""kuki"" }
                ],
                ""offer_groups"": [
                    { ""id"": ""starter"", ""label"": ""Starter"", ""pigs"": [""kuki"", ""unknown_pig""] }
                ]
            }";

            var catalog = NamedPigCatalog.Load(customJson);
            var group = catalog.Groups.FirstOrDefault(g => g.Id == "starter");
            Assert.NotNull(group);
            Assert.Equal(new[] { "kuki" }, group.PigIds);

            var pigs = catalog.OfferGroup("starter");
            Assert.Single(pigs);
            Assert.Equal("kuki", pigs[0].Id);
        }

        [Fact]
        public void DuplicateId_IsIgnored()
        {
            string customJson = @"{
                ""pigs"": [
                    { ""id"": ""kuki"", ""name"": ""First"" },
                    { ""id"": ""kuki"", ""name"": ""Second"" }
                ]
            }";

            var catalog = NamedPigCatalog.Load(customJson);
            Assert.Single(catalog.Pigs);
            Assert.Equal("First", catalog.Pigs[0].Name);
        }

        [Fact]
        public void UnknownExtraFields_DoNotBreakLoading()
        {
            string customJson = @"{
                ""extra_top_level"": ""surprise"",
                ""pigs"": [
                    {
                        ""id"": ""kuki"",
                        ""sprite_set"": ""custom_sheet"",
                        ""random_extra_field"": 42
                    }
                ]
            }";

            var catalog = NamedPigCatalog.Load(customJson);
            Assert.Single(catalog.Pigs);
            Assert.Equal("kuki", catalog.Pigs[0].Id);
        }

        [Fact]
        public void OutOfRangeModifier_IsClamped_AndNonPositiveOrNonFinite_ResetsToOne()
        {
            string customJson = @"{
                ""modifier_limits"": { ""min"": 0.5, ""max"": 1.5 },
                ""pigs"": [
                    {
                        ""id"": ""kuki"",
                        ""modifiers"": {
                            ""appetite"": 2.5,
                            ""poop_rate"": 0.2,
                            ""activity"": -0.5,
                            ""bond_gain"": 0.0
                        }
                    }
                ]
            }";

            var catalog = NamedPigCatalog.Load(customJson);
            var pig = catalog.Find("kuki");
            Assert.NotNull(pig);

            // 2.5 clamped to max 1.5
            Assert.Equal(1.5, pig.Modifiers["appetite"]);
            // 0.2 clamped to min 0.5
            Assert.Equal(0.5, pig.Modifiers["poop_rate"]);
            // -0.5 <= 0 reset to 1.0
            Assert.Equal(1.0, pig.Modifiers["activity"]);
            // 0.0 <= 0 reset to 1.0
            Assert.Equal(1.0, pig.Modifiers["bond_gain"]);
            // Missing key means 1.0
            Assert.Equal(1.0, pig.Modifiers["minigame_score"]);
        }

        [Fact]
        public void NegativeDaysOrCost_ClampedToZero()
        {
            string customJson = @"{
                ""pigs"": [
                    {
                        ""id"": ""kuki"",
                        ""offer"": { ""after_days"": -10, ""cost"": -50 }
                    }
                ]
            }";

            var catalog = NamedPigCatalog.Load(customJson);
            var pig = catalog.Find("kuki");
            Assert.NotNull(pig);
            Assert.Equal(0, pig.OfferAfterDays);
            Assert.Equal(0, pig.OfferCost);
        }

        [Fact]
        public void Pigs_HaveBakedSheetsAndEntryInPigsJson()
        {
            var catalog = LoadRealCatalog();

            var pigsJsonPath = RepoFile("assets/sprites/pigs/pigs.json");
            var pigsJson = File.ReadAllText(pigsJsonPath);
            var pigsObj = JObject.Parse(pigsJson)["pigs"] as JObject;
            Assert.NotNull(pigsObj);

            string[] stages = new[] { "baby", "junior", "adult", "senior", "legend" };

            foreach (var pig in catalog.Pigs)
            {
                Assert.True(pigsObj.ContainsKey(pig.Id),
                    $"Pig '{pig.Id}' has no entry in assets/sprites/pigs/pigs.json");

                foreach (var stage in stages)
                {
                    string sheetPath = RepoFile($"assets/sprites/pigs/{pig.Id}/{stage}/spritesheet.png");
                    Assert.True(File.Exists(sheetPath), $"Missing sheet at {sheetPath}");
                }
            }
        }
    }
}
