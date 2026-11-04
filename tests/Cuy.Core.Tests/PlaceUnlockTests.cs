using System;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PlaceUnlockTests
    {
        [Fact]
        public void FreshWorldStateReportsHouseSalonAndMarketUnlocked()
        {
            var world = new WorldState();
            var places = PlaceCatalog.LoadDefault();

            Assert.True(PlaceUnlock.IsUnlocked(world, places, "house"));
            Assert.True(PlaceUnlock.IsUnlocked(world, places, "salon"));
            Assert.True(PlaceUnlock.IsUnlocked(world, places, "market"));

            // Other places and rooms are locked initially
            Assert.False(PlaceUnlock.IsUnlocked(world, places, "garden"));
            Assert.False(PlaceUnlock.IsUnlocked(world, places, "farm"));
            Assert.False(PlaceUnlock.IsUnlocked(world, places, "park"));
            Assert.False(PlaceUnlock.IsUnlocked(world, places, "bedroom"));
            Assert.False(PlaceUnlock.IsUnlocked(world, places, "playroom"));

            Assert.Equal(UnlockResult.AlreadyUnlocked, PlaceUnlock.CanUnlock(world, places, "house"));
            Assert.Equal(UnlockResult.AlreadyUnlocked, PlaceUnlock.CanUnlock(world, places, "market"));
            Assert.Equal(UnlockResult.AlreadyUnlocked, PlaceUnlock.CanUnlockRoom(world, places, "salon"));
        }

        [Fact]
        public void FarmNeedsGardenBeforeUnlocking()
        {
            var world = new WorldState();
            var places = PlaceCatalog.LoadDefault();

            // Attempting to unlock farm without garden -> MissingRequirement
            Assert.Equal(UnlockResult.MissingRequirement, PlaceUnlock.CanUnlock(world, places, "farm"));
            Assert.False(PlaceUnlock.Unlock(world, places, "farm"));

            // Garden cost is 400
            Assert.Equal(400, PlaceUnlock.UnlockCost(world, places, "garden"));
            Assert.Equal(UnlockResult.Ok, PlaceUnlock.CanUnlock(world, places, "garden"));
            Assert.True(PlaceUnlock.Unlock(world, places, "garden"));
            Assert.True(PlaceUnlock.IsUnlocked(world, places, "garden"));

            // Now farm can be unlocked (farm cost is 600)
            Assert.Equal(600, PlaceUnlock.UnlockCost(world, places, "farm"));
            Assert.Equal(UnlockResult.Ok, PlaceUnlock.CanUnlock(world, places, "farm"));
            Assert.True(PlaceUnlock.Unlock(world, places, "farm"));
            Assert.True(PlaceUnlock.IsUnlocked(world, places, "farm"));
        }

        [Fact]
        public void UnlockingTwiceIsRefused()
        {
            var world = new WorldState();
            var places = PlaceCatalog.LoadDefault();

            Assert.True(PlaceUnlock.Unlock(world, places, "garden"));
            Assert.Equal(UnlockResult.AlreadyUnlocked, PlaceUnlock.CanUnlock(world, places, "garden"));
            Assert.False(PlaceUnlock.Unlock(world, places, "garden"));

            Assert.True(PlaceUnlock.UnlockRoom(world, places, "bedroom"));
            Assert.Equal(UnlockResult.AlreadyUnlocked, PlaceUnlock.CanUnlockRoom(world, places, "bedroom"));
            Assert.False(PlaceUnlock.UnlockRoom(world, places, "bedroom"));
        }

        [Fact]
        public void LevelsAdvance1To2To3ForSalonWithFileCostsAndNeverBeyond()
        {
            var world = new WorldState();
            var places = PlaceCatalog.LoadDefault();

            // Salon starts at level 1
            Assert.Equal(1, PlaceUnlock.GetLevel(world, places, "salon"));

            // Level 2 cost is 530
            int costLevel2 = PlaceUnlock.NextLevelCost(world, places, "salon");
            Assert.Equal(530, costLevel2);

            Assert.True(PlaceUnlock.Upgrade(world, places, "salon"));
            Assert.Equal(2, PlaceUnlock.GetLevel(world, places, "salon"));

            // Level 3 cost is 1200
            int costLevel3 = PlaceUnlock.NextLevelCost(world, places, "salon");
            Assert.Equal(1200, costLevel3);

            Assert.True(PlaceUnlock.Upgrade(world, places, "salon"));
            Assert.Equal(3, PlaceUnlock.GetLevel(world, places, "salon"));

            // Beyond level 3: NextLevelCost is -1 and Upgrade returns false
            Assert.Equal(-1, PlaceUnlock.NextLevelCost(world, places, "salon"));
            Assert.False(PlaceUnlock.Upgrade(world, places, "salon"));
            Assert.Equal(3, PlaceUnlock.GetLevel(world, places, "salon"));
        }

        [Fact]
        public void GridSizesMatchFileForEveryLevel()
        {
            var world = new WorldState();
            var places = PlaceCatalog.LoadDefault();

            // Salon level 1
            var (c1, r1) = PlaceUnlock.GridSize(world, places, "salon");
            Assert.Equal(12, c1);
            Assert.Equal(7, r1);

            // Salon level 2
            PlaceUnlock.Upgrade(world, places, "salon");
            var (c2, r2) = PlaceUnlock.GridSize(world, places, "salon");
            var salonDef = places.FindRoom("salon");
            Assert.Equal(salonDef.Levels[1].Cols, c2);
            Assert.Equal(salonDef.Levels[1].Rows, r2);

            // Salon level 3
            PlaceUnlock.Upgrade(world, places, "salon");
            var (c3, r3) = PlaceUnlock.GridSize(world, places, "salon");
            Assert.Equal(salonDef.Levels[2].Cols, c3);
            Assert.Equal(salonDef.Levels[2].Rows, r3);

            // Garden level 1 after unlock
            PlaceUnlock.Unlock(world, places, "garden");
            var gardenDef = places.Find("garden");
            var (cg1, rg1) = PlaceUnlock.GridSize(world, places, "garden");
            Assert.Equal(gardenDef.Levels[0].Cols, cg1);
            Assert.Equal(gardenDef.Levels[0].Rows, rg1);
        }

        [Fact]
        public void UnknownIdsAreRefused()
        {
            var world = new WorldState();
            var places = PlaceCatalog.LoadDefault();

            Assert.Equal(UnlockResult.Unknown, PlaceUnlock.CanUnlock(world, places, "unknown_place"));
            Assert.Equal(UnlockResult.Unknown, PlaceUnlock.CanUnlockRoom(world, places, "unknown_room"));
            Assert.False(PlaceUnlock.Unlock(world, places, "unknown_place"));
            Assert.False(PlaceUnlock.UnlockRoom(world, places, "unknown_room"));
            Assert.Equal(-1, PlaceUnlock.NextLevelCost(world, places, "unknown_place"));
            Assert.False(PlaceUnlock.Upgrade(world, places, "unknown_place"));
            Assert.Equal((0, 0), PlaceUnlock.GridSize(world, places, "unknown_place"));
            Assert.False(PlaceUnlock.IsUnlocked(world, places, "unknown_place"));
        }
    }
}
