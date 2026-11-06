using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.Pigs;
using Xunit;

namespace Cuy.Core.Tests
{
    public class SceneOrderTests
    {
        [Fact]
        public void O1_NewGame_OrderAndLocked()
        {
            // New game: no pig rooms, dorm locked. Garden, park, farm locked; salon (and market) unlocked.
            Func<string, bool> unlocked = id => id == "salon" || id == "market";
            var ring = SceneOrder.Build(new string[0], unlocked);

            var expectedIds = new[] { "salon", "garden", "park", "farm", "market" };
            Assert.Equal(expectedIds, ring.Select(s => s.Id).ToArray());

            Assert.False(ring.First(s => s.Id == "salon").Locked);
            Assert.True(ring.First(s => s.Id == "garden").Locked);
            Assert.True(ring.First(s => s.Id == "park").Locked);
            Assert.True(ring.First(s => s.Id == "farm").Locked);
            Assert.False(ring.First(s => s.Id == "market").Locked);

            // Dorm is locked, so it must not be in the list
            Assert.DoesNotContain(ring, s => s.Id == "dorm");
        }

        [Fact]
        public void O2_TwoPigRoomsAndDormUnlocked_OrderAndIdsCorrect()
        {
            var rooms = new[] { "pig:kuki", "pig:ned" };
            var unlocked = new HashSet<string> { "salon", "pig:kuki", "pig:ned", "dorm", "market" };

            var ring = SceneOrder.Build(rooms, unlocked.Contains);

            var expectedIds = new[] { "salon", "pig:kuki", "pig:ned", "dorm", "garden", "park", "farm", "market" };
            Assert.Equal(expectedIds, ring.Select(s => s.Id).ToArray());

            Assert.False(ring.First(s => s.Id == "dorm").Locked);
            Assert.False(ring.First(s => s.Id == "pig:kuki").Locked);
            Assert.False(ring.First(s => s.Id == "pig:ned").Locked);
        }

        [Fact]
        public void O3_UnlockingPlace_FlipsOnlyThatFlag()
        {
            var rooms = new[] { "pig:kuki" };
            Func<string, bool> unlockedBefore = id => id == "salon" || id == "pig:kuki";
            Func<string, bool> unlockedAfter = id => id == "salon" || id == "pig:kuki" || id == "garden";

            var ringBefore = SceneOrder.Build(rooms, unlockedBefore);
            var ringAfter = SceneOrder.Build(rooms, unlockedAfter);

            Assert.Equal(ringBefore.Count, ringAfter.Count);
            for (int i = 0; i < ringBefore.Count; i++)
            {
                Assert.Equal(ringBefore[i].Id, ringAfter[i].Id);
                Assert.Equal(ringBefore[i].Title, ringAfter[i].Title);
                if (ringBefore[i].Id == "garden")
                {
                    Assert.True(ringBefore[i].Locked);
                    Assert.False(ringAfter[i].Locked);
                }
                else
                {
                    Assert.Equal(ringBefore[i].Locked, ringAfter[i].Locked);
                }
            }
        }

        [Fact]
        public void O4_Ring_NextOfMarketIsSalon_PreviousOfSalonIsMarket()
        {
            var ring = SceneOrder.Build(new[] { "pig:kuki" }, id => true);

            // Using SceneOrder.Next / Previous
            Assert.Equal("salon", SceneOrder.Next(ring, "market").Id);
            Assert.Equal("market", SceneOrder.Previous(ring, "salon").Id);

            // Extension method syntax
            Assert.Equal("salon", ring.Next("market").Id);
            Assert.Equal("market", ring.Previous("salon").Id);

            // String-only list overload
            var ids = ring.Select(s => s.Id).ToList();
            Assert.Equal("salon", SceneOrder.Next(ids, "market"));
            Assert.Equal("market", SceneOrder.Previous(ids, "salon"));
            Assert.True(SceneOrder.AreAdjacent(ring, "salon", "market"));
            Assert.True(SceneOrder.AreAdjacent(ids, "market", "salon"));
        }

        [Fact]
        public void DormLocked_NeverIncludedInRing()
        {
            // Even if dorm is explicitly passed in the rooms list, it is skipped when not unlocked
            var rooms = new[] { "pig:kuki", "dorm" };
            var ring = SceneOrder.Build(rooms, id => id == "salon" || id == "pig:kuki");

            Assert.DoesNotContain(ring, s => s.Id == "dorm");
            var expectedIds = new[] { "salon", "pig:kuki", "garden", "park", "farm", "market" };
            Assert.Equal(expectedIds, ring.Select(s => s.Id).ToArray());
        }
    }
}
