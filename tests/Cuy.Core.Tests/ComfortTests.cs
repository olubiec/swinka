using System;
using System.Collections.Generic;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class ComfortTests
    {
        private static WorldItemCatalog CreateCatalogWith(params WorldItemDefinition[] items)
        {
            return new WorldItemCatalog(items, new List<string> { "wall", "floor", "ground" });
        }

        [Fact]
        public void EmptyWorldGivesZeroScoreAndFactorOne()
        {
            var world = new WorldState();
            var items = CreateCatalogWith();
            var places = PlaceCatalog.CreateMinimalDefault();

            int score = Comfort.Score(world, items, null);
            int capped = Comfort.Capped(score, places);
            double factor = Comfort.MoodDecayFactor(capped, places);

            Assert.Equal(0, score);
            Assert.Equal(0, capped);
            Assert.Equal(1.0, factor);
        }

        [Fact]
        public void TwoSofasGiveSumOfComfort()
        {
            var world = new WorldState();
            var sofa = new WorldItemDefinition { Id = "sofa_cosy", Name = "Sofa", Comfort = 6, Layer = "floor" };
            var items = CreateCatalogWith(sofa);

            var salon = new RoomLayout();
            salon.Items.Add(new PlacedItem { Uid = "s1", ItemId = "sofa_cosy", X = 2, Y = 2 });
            salon.Items.Add(new PlacedItem { Uid = "s2", ItemId = "sofa_cosy", X = 6, Y = 2 });
            world.Rooms["salon"] = salon;

            int score = Comfort.Score(world, items, null);
            Assert.Equal(12, score);
        }

        [Fact]
        public void WorldAboveCapIsCappedAt100AndFactorIsExactly085()
        {
            var world = new WorldState();
            var bigItem = new WorldItemDefinition { Id = "statue", Name = "Statue", Comfort = 150, Layer = "floor" };
            var items = CreateCatalogWith(bigItem);
            var places = PlaceCatalog.CreateMinimalDefault(); // ComfortCap=100, MoodDecayReductionAtCap=0.15

            var salon = new RoomLayout();
            salon.Items.Add(new PlacedItem { Uid = "st1", ItemId = "statue", X = 2, Y = 2 });
            world.Rooms["salon"] = salon;

            int score = Comfort.Score(world, items, null);
            Assert.Equal(150, score);

            int capped = Comfort.Capped(score, places);
            Assert.Equal(100, capped);

            double factor = Comfort.MoodDecayFactor(capped, places);
            Assert.Equal(0.85, factor, 6);
        }

        [Fact]
        public void UnknownItemIdsContributeZero()
        {
            var world = new WorldState();
            var items = CreateCatalogWith();

            var salon = new RoomLayout();
            salon.Items.Add(new PlacedItem { Uid = "u1", ItemId = "mystery_item", X = 2, Y = 2 });
            world.Rooms["salon"] = salon;

            int score = Comfort.Score(world, items, null);
            Assert.Equal(0, score);
        }

        [Fact]
        public void PerPlaceScoreCountsOnlyThatPlace()
        {
            var world = new WorldState();
            var sofa = new WorldItemDefinition { Id = "sofa", Comfort = 5, Layer = "floor" };
            var bush = new WorldItemDefinition { Id = "bush", Comfort = 8, Layer = "floor" };
            var items = CreateCatalogWith(sofa, bush);

            var salon = new RoomLayout();
            salon.Items.Add(new PlacedItem { Uid = "s1", ItemId = "sofa", X = 2, Y = 2 });
            world.Rooms["salon"] = salon;

            var garden = new RoomLayout();
            garden.Items.Add(new PlacedItem { Uid = "g1", ItemId = "bush", X = 2, Y = 2 });
            world.Rooms["garden"] = garden;

            Assert.Equal(5, Comfort.Score(world, items, "salon"));
            Assert.Equal(8, Comfort.Score(world, items, "garden"));
            Assert.Equal(13, Comfort.Score(world, items, null));
            Assert.Equal(0, Comfort.Score(world, items, "bedroom"));
        }

        [Fact]
        public void MoodDecayFactorIsMonotonicNonIncreasing()
        {
            var places = PlaceCatalog.CreateMinimalDefault();
            double prevFactor = 2.0;

            for (int score = 0; score <= 120; score += 5)
            {
                int capped = Comfort.Capped(score, places);
                double factor = Comfort.MoodDecayFactor(capped, places);

                Assert.True(factor <= prevFactor, $"Factor {factor} should be <= {prevFactor} at score {score}");
                Assert.True(factor >= 0.85, $"Factor {factor} should be >= 0.85");
                Assert.True(factor <= 1.0, $"Factor {factor} should be <= 1.0");
                prevFactor = factor;
            }
        }
    }
}
