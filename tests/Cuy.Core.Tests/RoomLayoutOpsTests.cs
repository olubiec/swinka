using System;
using System.Collections.Generic;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class RoomLayoutOpsTests
    {
        private static WorldItemDefinition CreateItem(string id, int w, int h, string layer, params string[] places)
        {
            return new WorldItemDefinition
            {
                Id = id,
                Name = id,
                W = w,
                H = h,
                Layer = layer,
                Place = new List<string>(places)
            };
        }

        [Fact]
        public void EveryPlaceResultIsReachable()
        {
            var room = new RoomLayout();
            var floorItem = CreateItem("chair", 1, 1, "floor", "house");

            // Ok
            var resOk = RoomLayoutOps.CanPlace(room, 10, 10, 2, floorItem, "salon", 0, 2);
            Assert.Equal(PlaceResult.Ok, resOk);

            // OutOfBounds
            var resOob = RoomLayoutOps.CanPlace(room, 10, 10, 2, floorItem, "salon", 10, 2);
            Assert.Equal(PlaceResult.OutOfBounds, resOob);

            // WrongLayerArea (floor item in wall row)
            var resWrongArea = RoomLayoutOps.CanPlace(room, 10, 10, 2, floorItem, "salon", 0, 1);
            Assert.Equal(PlaceResult.WrongLayerArea, resWrongArea);

            // Overlap
            RoomLayoutOps.Place(room, 10, 10, 2, floorItem, "salon", 0, 2);
            var resOverlap = RoomLayoutOps.CanPlace(room, 10, 10, 2, floorItem, "salon", 0, 2);
            Assert.Equal(PlaceResult.Overlap, resOverlap);

            // UnknownItem
            var resUnknown = RoomLayoutOps.CanPlace(room, 10, 10, 2, null, "salon", 0, 2);
            Assert.Equal(PlaceResult.UnknownItem, resUnknown);

            // NotAllowedHere
            var gardenOnlyItem = CreateItem("flowerbed", 1, 1, "floor", "garden");
            var resNotAllowed = RoomLayoutOps.CanPlace(room, 10, 10, 2, gardenOnlyItem, "salon", 1, 2);
            Assert.Equal(PlaceResult.NotAllowedHere, resNotAllowed);
        }

        [Fact]
        public void FloorItemsOverlapRefusedAndAdjacentAllowed()
        {
            var room = new RoomLayout();
            var itemA = CreateItem("boxA", 2, 2, "floor", "house");
            var itemB = CreateItem("boxB", 2, 2, "floor", "house");

            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 10, 10, 2, itemA, "salon", 2, 2));

            // Overlapping itemA at (2,2) with 2x2
            Assert.Equal(PlaceResult.Overlap, RoomLayoutOps.CanPlace(room, 10, 10, 2, itemB, "salon", 3, 3));
            Assert.Equal(PlaceResult.Overlap, RoomLayoutOps.CanPlace(room, 10, 10, 2, itemB, "salon", 2, 2));

            // Adjacent to the right: (4, 2)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 10, 10, 2, itemB, "salon", 4, 2));

            // Adjacent below: (2, 4)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 10, 10, 2, itemB, "salon", 2, 4));
        }

        [Fact]
        public void GroundPathUnderFloorItemIsAllowed()
        {
            var room = new RoomLayout();
            var groundPath = CreateItem("path", 2, 2, "ground", "house");
            var floorChair = CreateItem("chair", 1, 1, "floor", "house");

            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 10, 10, 2, groundPath, "salon", 2, 2));

            // Floor item placed on top of ground item cell
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 10, 10, 2, floorChair, "salon", 2, 2));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 10, 10, 2, floorChair, "salon", 2, 2));
        }

        [Fact]
        public void WallItemInFloorAreaAndFloorItemInWallRowsRefused()
        {
            var room = new RoomLayout();
            var wallPicture = CreateItem("picture", 2, 1, "wall", "house");
            var floorTable = CreateItem("table", 2, 2, "floor", "house");

            // Wall item placed at y=2 (floor area, wallRows=2) -> WrongLayerArea
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 10, 10, 2, wallPicture, "salon", 0, 2));

            // Wall item placed at y=0 (inside wallRows=2) -> Ok
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 10, 10, 2, wallPicture, "salon", 0, 0));

            // Floor item placed at y=1 (inside wall rows) -> WrongLayerArea
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 10, 10, 2, floorTable, "salon", 0, 1));
        }

        [Fact]
        public void MovingItemOntoItselfIsAllowedViaIgnoreUid()
        {
            var room = new RoomLayout();
            var item = CreateItem("sofa", 3, 2, "floor", "house");

            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, item, "salon", 4, 3, () => "uid-1"));

            // Move onto same position
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Move(room, 12, 7, 2, item, "salon", "uid-1", 4, 3));

            // Move by 1 cell
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Move(room, 12, 7, 2, item, "salon", "uid-1", 5, 3));
            Assert.Equal(5, room.Items[0].X);
        }

        [Fact]
        public void OutdoorPlacesAcceptFloorItemsInRow0()
        {
            var room = new RoomLayout();
            var gardenBush = CreateItem("bush", 1, 1, "floor", "garden");

            // In garden (wallRows = 0), y = 0 is valid for floor items
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 16, 9, 0, gardenBush, "garden", 0, 0));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 16, 9, 0, gardenBush, "garden", 0, 0));

            // Wall items should not be allowed in wallRows = 0
            var wallItem = CreateItem("poster", 1, 1, "wall", "garden");
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 16, 9, 0, wallItem, "garden", 0, 0));
        }

        [Fact]
        public void RemovingAndFlippingItems()
        {
            var room = new RoomLayout();
            var item = CreateItem("chair", 1, 1, "floor", "house");

            Assert.False(RoomLayoutOps.Remove(room, "non-existent"));
            Assert.False(RoomLayoutOps.SetFlip(room, "non-existent", true));

            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 10, 10, 2, item, "salon", 0, 2, () => "chair-1"));
            Assert.Equal(1, RoomLayoutOps.CountPlaced(room, "chair"));

            Assert.True(RoomLayoutOps.SetFlip(room, "chair-1", true));
            Assert.True(room.Items[0].Flip);

            Assert.True(RoomLayoutOps.Remove(room, "chair-1"));
            Assert.Equal(0, RoomLayoutOps.CountPlaced(room, "chair"));
            Assert.Empty(room.Items);
        }

        [Fact]
        public void Sofa3x2AtLastValidCellIsOkAndOneCellFurtherIsOutOfBounds()
        {
            var room = new RoomLayout();
            var sofa = CreateItem("sofa", 3, 2, "floor", "house");
            // Grid 12x7, sofa 3x2.
            // Last valid cell X is 12 - 3 = 9. Last valid cell Y is 7 - 2 = 5.
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, sofa, "salon", 9, 5));

            // One cell further X=10 -> OutOfBounds
            Assert.Equal(PlaceResult.OutOfBounds, RoomLayoutOps.CanPlace(room, 12, 7, 2, sofa, "salon", 10, 5));

            // One cell further Y=6 -> OutOfBounds
            Assert.Equal(PlaceResult.OutOfBounds, RoomLayoutOps.CanPlace(room, 12, 7, 2, sofa, "salon", 9, 6));
        }
    }
}
