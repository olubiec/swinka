using System;
using System.IO;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class ComfortTests
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

        private static WorldItemCatalog LoadItems()
        {
            return WorldItemCatalog.Load(File.ReadAllText(RepoFile("assets/data/world_items.json")));
        }

        private static PlaceCatalog LoadPlaces()
        {
            return PlaceCatalog.Load(File.ReadAllText(RepoFile("assets/data/places.json")));
        }

        [Fact]
        public void EmptyWorld_ScoreIsZero_AndFactorIsOne()
        {
            var items = LoadItems();
            var places = LoadPlaces();
            var world = new WorldState();

            int score = Comfort.Score(world, items, null);
            int capped = Comfort.Capped(score, places);
            double factor = Comfort.MoodDecayFactor(capped, places);

            Assert.Equal(0, score);
            Assert.Equal(0, capped);
            Assert.Equal(1.0, factor, 6);
        }

        [Fact]
        public void TwoSofas_GiveScoreTwelve()
        {
            var items = LoadItems();
            var places = LoadPlaces();
            var world = new WorldState();
            var salon = new RoomLayout();
            salon.Items.Add(new PlacedItem { Uid = "1", ItemId = "sofa_cosy", X = 0, Y = 2 });
            salon.Items.Add(new PlacedItem { Uid = "2", ItemId = "sofa_cosy", X = 3, Y = 2 });
            world.Rooms["salon"] = salon;

            int score = Comfort.Score(world, items, null);
            Assert.Equal(12, score);
            Assert.Equal(12, Comfort.Capped(score, places));
        }

        [Fact]
        public void WorldAboveCap_IsCappedAt100_AndFactorIs0Point85()
        {
            var items = LoadItems();
            var places = LoadPlaces();
            var world = new WorldState();
            var salon = new RoomLayout();

            // 20 sofas x 6 comfort = 120 > 100
            for (int i = 0; i < 20; i++)
            {
                salon.Items.Add(new PlacedItem { Uid = "s" + i, ItemId = "sofa_cosy", X = 0, Y = 2 });
            }
            world.Rooms["salon"] = salon;

            int raw = Comfort.Score(world, items, null);
            Assert.Equal(120, raw);

            int capped = Comfort.Capped(raw, places);
            Assert.Equal(100, capped);

            double factor = Comfort.MoodDecayFactor(capped, places);
            Assert.Equal(0.85, factor, 6);
        }

        [Fact]
        public void UnknownItemIds_ContributeZero()
        {
            var items = LoadItems();
            var world = new WorldState();
            var salon = new RoomLayout();
            salon.Items.Add(new PlacedItem { Uid = "u1", ItemId = "non_existent_item", X = 0, Y = 2 });
            salon.Items.Add(new PlacedItem { Uid = "u2", ItemId = "sofa_cosy", X = 3, Y = 2 });
            world.Rooms["salon"] = salon;

            Assert.Equal(6, Comfort.Score(world, items, null));
        }

        [Fact]
        public void PerPlaceScore_CountsOnlyThatPlace()
        {
            var items = LoadItems();
            var world = new WorldState();

            var salon = new RoomLayout();
            salon.Items.Add(new PlacedItem { Uid = "1", ItemId = "sofa_cosy", X = 0, Y = 2 }); // 6
            world.Rooms["salon"] = salon;

            var garden = new RoomLayout();
            garden.Items.Add(new PlacedItem { Uid = "2", ItemId = "pond_small", X = 0, Y = 0 }); // 6
            garden.Items.Add(new PlacedItem { Uid = "3", ItemId = "tree_small", X = 4, Y = 0 }); // 4
            world.Rooms["garden"] = garden;

            Assert.Equal(6, Comfort.Score(world, items, "salon"));
            Assert.Equal(10, Comfort.Score(world, items, "garden"));
            Assert.Equal(0, Comfort.Score(world, items, "park"));
            Assert.Equal(16, Comfort.Score(world, items, null));
        }

        [Fact]
        public void MoodDecayFactor_IsMonotonicNonIncreasing()
        {
            var places = LoadPlaces();
            double prev = Comfort.MoodDecayFactor(0, places);
            for (int s = 1; s <= 150; s++)
            {
                int capped = Comfort.Capped(s, places);
                double current = Comfort.MoodDecayFactor(capped, places);
                Assert.True(current <= prev + 1e-12, $"Factor increased at score {s}: {current} > {prev}");
                prev = current;
            }
        }
    }
}
