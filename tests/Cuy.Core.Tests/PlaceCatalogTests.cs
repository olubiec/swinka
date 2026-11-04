using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PlaceCatalogTests
    {
        public static string RepoFile(string relativePath)
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

        [Fact]
        public void Load_RealJson_LoadsFivePlacesAndConfigCorrectly()
        {
            string json = File.ReadAllText(RepoFile("assets/data/places.json"));
            var catalog = PlaceCatalog.Load(json);

            Assert.NotNull(catalog);
            Assert.Equal(5, catalog.Places.Count);

            var house = catalog.Find("house");
            var garden = catalog.Find("garden");
            var farm = catalog.Find("farm");
            var park = catalog.Find("park");
            var market = catalog.Find("market");

            Assert.NotNull(house);
            Assert.NotNull(garden);
            Assert.NotNull(farm);
            Assert.NotNull(park);
            Assert.NotNull(market);

            // House has three rooms: salon, bedroom, playroom
            Assert.True(house.UnlockedAtStart);
            Assert.Equal(3, house.Rooms.Count);

            var salon = house.Rooms.FirstOrDefault(r => string.Equals(r.Id, "salon", StringComparison.OrdinalIgnoreCase));
            var bedroom = house.Rooms.FirstOrDefault(r => string.Equals(r.Id, "bedroom", StringComparison.OrdinalIgnoreCase));
            var playroom = house.Rooms.FirstOrDefault(r => string.Equals(r.Id, "playroom", StringComparison.OrdinalIgnoreCase));

            Assert.NotNull(salon);
            Assert.NotNull(bedroom);
            Assert.NotNull(playroom);

            // Salon has three levels: 12x7, 16x8, 20x9
            Assert.Equal(3, salon.Levels.Count);
            Assert.Equal(12, salon.Levels[0].Cols);
            Assert.Equal(7, salon.Levels[0].Rows);
            Assert.Equal(0, salon.Levels[0].Cost);

            Assert.Equal(16, salon.Levels[1].Cols);
            Assert.Equal(8, salon.Levels[1].Rows);
            Assert.Equal(530, salon.Levels[1].Cost);

            Assert.Equal(20, salon.Levels[2].Cols);
            Assert.Equal(9, salon.Levels[2].Rows);
            Assert.Equal(1200, salon.Levels[2].Cost);

            // Costs check
            Assert.Equal(400, garden.Cost);
            Assert.Equal(600, farm.Cost);
            Assert.Equal(1200, park.Cost);
            Assert.Equal(470, bedroom.Cost);
            Assert.Equal(660, playroom.Cost);

            // Farm and park require garden
            Assert.Contains("garden", farm.Requires, StringComparer.OrdinalIgnoreCase);
            Assert.Contains("garden", park.Requires, StringComparer.OrdinalIgnoreCase);

            // Welcome items for farm
            Assert.NotNull(farm.WelcomeItems);
            Assert.Equal(2, farm.WelcomeItems["seed_dandelion"]);
            Assert.Equal(2, farm.WelcomeItems["seed_cilantro"]);
            Assert.Equal(2, farm.WelcomeItems["seed_parsley"]);

            // Wall rows and numbers
            Assert.Equal(2, catalog.WallRows);
            Assert.Equal(100, catalog.ComfortCap);
            Assert.Equal(0.15, catalog.MoodDecayReductionAtCap, 3);
            Assert.Equal(3, catalog.WalkPerDay);
            Assert.Equal(6, catalog.WalkMood);
            Assert.Equal(10, catalog.WalkMinComfortGarden);
        }

        [Fact]
        public void FindRoom_LocatesRoomAcrossPlaces()
        {
            string json = File.ReadAllText(RepoFile("assets/data/places.json"));
            var catalog = PlaceCatalog.Load(json);

            var salon = catalog.FindRoom("salon");
            var bedroom = catalog.FindRoom("bedroom");
            var playroom = catalog.FindRoom("playroom");
            var nonExistent = catalog.FindRoom("kitchen");

            Assert.NotNull(salon);
            Assert.Equal("salon", salon.Id);
            Assert.NotNull(bedroom);
            Assert.Equal("bedroom", bedroom.Id);
            Assert.NotNull(playroom);
            Assert.Equal("playroom", playroom.Id);
            Assert.Null(nonExistent);
            Assert.Null(catalog.FindRoom(null));
        }

        [Fact]
        public void Load_UnknownFields_IgnoredGracefully()
        {
            string json = @"{
                ""unknown_root_property"": ""test"",
                ""grid"": { ""wall_rows"": 3, ""unknown_grid"": 99 },
                ""comfort"": { ""cap"": 150, ""mood_decay_reduction_at_cap"": 0.2, ""extra"": true },
                ""walk"": { ""per_day"": 5, ""mood"": 10, ""min_comfort_garden"": 15, ""extra"": {} },
                ""places"": [
                    {
                        ""id"": ""house"",
                        ""name"": ""Cozy House"",
                        ""extra_field"": 12345,
                        ""unlocked_at_start"": true,
                        ""rooms"": [
                            {
                                ""id"": ""salon"",
                                ""name"": ""Salon"",
                                ""unknown_room_field"": ""ignored"",
                                ""levels"": [
                                    { ""cols"": 10, ""rows"": 5, ""cost"": 0, ""extra_level"": 1 }
                                ]
                            }
                        ]
                    },
                    {
                        ""id"": ""market"",
                        ""name"": ""Market"",
                        ""unlocked_at_start"": true
                    }
                ]
            }";

            var catalog = PlaceCatalog.Load(json);
            Assert.NotNull(catalog);
            Assert.Equal(2, catalog.Places.Count);
            Assert.Equal(3, catalog.WallRows);
            Assert.Equal(150, catalog.ComfortCap);
            Assert.Equal(0.2, catalog.MoodDecayReductionAtCap, 3);
            Assert.Equal(5, catalog.WalkPerDay);
            Assert.Equal(10, catalog.WalkMood);
            Assert.Equal(15, catalog.WalkMinComfortGarden);

            var house = catalog.Find("house");
            Assert.NotNull(house);
            Assert.Equal("Cozy House", house.Name);
            Assert.Single(house.Rooms);
            Assert.Single(house.Rooms[0].Levels);
        }

        [Fact]
        public void Load_BrokenJson_ReturnsMinimalDefault()
        {
            var logs = new List<string>();
            Action<string> originalLogger = ItemCatalog.ErrorLogger;
            try
            {
                ItemCatalog.ErrorLogger = msg => logs.Add(msg);

                var catalog = PlaceCatalog.Load("{ definitely not valid json !!!");
                Assert.NotNull(catalog);
                Assert.Equal(2, catalog.Places.Count);

                var house = catalog.Find("house");
                var market = catalog.Find("market");
                Assert.NotNull(house);
                Assert.NotNull(market);

                // Minimal default house has salon only
                Assert.Single(house.Rooms);
                Assert.Equal("salon", house.Rooms[0].Id);
                Assert.True(house.Rooms[0].Levels.Count >= 1);
                Assert.Equal(0, house.Rooms[0].Levels[0].Cost);

                Assert.NotEmpty(logs);
            }
            finally
            {
                ItemCatalog.ErrorLogger = originalLogger;
            }
        }

        [Fact]
        public void Load_EmptyOrNullJson_ReturnsMinimalDefault()
        {
            var catalog1 = PlaceCatalog.Load(null);
            Assert.NotNull(catalog1);
            Assert.Equal(2, catalog1.Places.Count);

            var catalog2 = PlaceCatalog.Load("   ");
            Assert.NotNull(catalog2);
            Assert.Equal(2, catalog2.Places.Count);
        }

        [Fact]
        public void RequiresRule_UnknownPlaceDroppedAndLogged()
        {
            var logs = new List<string>();
            Action<string> originalLogger = ItemCatalog.ErrorLogger;
            try
            {
                ItemCatalog.ErrorLogger = msg => logs.Add(msg);

                string json = @"{
                    ""places"": [
                        { ""id"": ""garden"", ""name"": ""Garden"" },
                        {
                            ""id"": ""farm"",
                            ""name"": ""Farm"",
                            ""requires"": [""garden"", ""mars_colony"", ""atlantis""]
                        }
                    ]
                }";

                var catalog = PlaceCatalog.Load(json);
                var farm = catalog.Find("farm");

                Assert.NotNull(farm);
                Assert.Single(farm.Requires);
                Assert.Contains("garden", farm.Requires);
                Assert.DoesNotContain("mars_colony", farm.Requires);
                Assert.DoesNotContain("atlantis", farm.Requires);

                Assert.Contains(logs, l => l.Contains("mars_colony") && l.Contains("farm"));
                Assert.Contains(logs, l => l.Contains("atlantis") && l.Contains("farm"));
            }
            finally
            {
                ItemCatalog.ErrorLogger = originalLogger;
            }
        }

        [Fact]
        public void LevelRule_FirstLevelNonZeroCost_ForcedToZeroAndLogged()
        {
            var logs = new List<string>();
            Action<string> originalLogger = ItemCatalog.ErrorLogger;
            try
            {
                ItemCatalog.ErrorLogger = msg => logs.Add(msg);

                string json = @"{
                    ""places"": [
                        {
                            ""id"": ""garden"",
                            ""name"": ""Garden"",
                            ""levels"": [
                                { ""cols"": 10, ""rows"": 5, ""cost"": 250 },
                                { ""cols"": 14, ""rows"": 7, ""cost"": 500 }
                            ]
                        },
                        {
                            ""id"": ""house"",
                            ""name"": ""House"",
                            ""rooms"": [
                                {
                                    ""id"": ""salon"",
                                    ""levels"": [
                                        { ""cols"": 12, ""rows"": 6, ""cost"": 100 }
                                    ]
                                }
                            ]
                        }
                    ]
                }";

                var catalog = PlaceCatalog.Load(json);

                var garden = catalog.Find("garden");
                Assert.NotNull(garden);
                Assert.Equal(0, garden.Levels[0].Cost);
                Assert.Equal(500, garden.Levels[1].Cost);

                var salon = catalog.FindRoom("salon");
                Assert.NotNull(salon);
                Assert.Equal(0, salon.Levels[0].Cost);

                Assert.Contains(logs, l => l.Contains("garden") && l.Contains("0"));
                Assert.Contains(logs, l => l.Contains("salon") && l.Contains("0"));
            }
            finally
            {
                ItemCatalog.ErrorLogger = originalLogger;
            }
        }

        [Theory]
        [InlineData(5, 10)]
        [InlineData(10, 10)]
        [InlineData(250, 250)]
        [InlineData(500, 500)]
        [InlineData(800, 500)]
        public void ComfortCap_ClampedBetween10And500(int inputCap, int expectedCap)
        {
            string json = $@"{{
                ""comfort"": {{ ""cap"": {inputCap} }},
                ""places"": [ {{ ""id"": ""market"" }} ]
            }}";

            var catalog = PlaceCatalog.Load(json);
            Assert.Equal(expectedCap, catalog.ComfortCap);
        }

        [Theory]
        [InlineData(-0.1, 0.0)]
        [InlineData(0.0, 0.0)]
        [InlineData(0.25, 0.25)]
        [InlineData(0.5, 0.5)]
        [InlineData(0.75, 0.5)]
        public void MoodDecayReductionAtCap_ClampedBetweenZeroAndHalf(double inputReduction, double expectedReduction)
        {
            string json = $@"{{
                ""comfort"": {{ ""mood_decay_reduction_at_cap"": {inputReduction.ToString(System.Globalization.CultureInfo.InvariantCulture)} }},
                ""places"": [ {{ ""id"": ""market"" }} ]
            }}";

            var catalog = PlaceCatalog.Load(json);
            Assert.Equal(expectedReduction, catalog.MoodDecayReductionAtCap, 3);
        }
    }
}
