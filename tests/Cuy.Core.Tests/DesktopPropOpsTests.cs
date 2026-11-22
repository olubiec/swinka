using System.Collections.Generic;
using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class DesktopPropOpsTests
    {
        private static DesktopPropCatalog CreateCatalog() => DesktopPropCatalog.CreateDefault();

        [Fact]
        public void PutOnDesktop_UnownedItem_ReturnsNotOwned()
        {
            var catalog = CreateCatalog();
            var desktop = new List<DesktopProp>();
            var world = new WorldState();
            var gameState = new GameState();

            var result = DesktopPropOps.PutOnDesktop(desktop, world, gameState, "toy_basket", 0.5, 0.5, catalog, out var added);

            Assert.Equal(DesktopPropResult.NotOwned, result);
            Assert.Null(added);
            Assert.Empty(desktop);
        }

        [Fact]
        public void PutOnDesktop_UnknownItem_ReturnsUnknownItem()
        {
            var catalog = CreateCatalog();
            var desktop = new List<DesktopProp>();
            var world = new WorldState();
            var gameState = new GameState();

            var result = DesktopPropOps.PutOnDesktop(desktop, world, gameState, "does_not_exist", 0.5, 0.5, catalog, out var added);

            Assert.Equal(DesktopPropResult.UnknownItem, result);
            Assert.Null(added);
        }

        [Fact]
        public void PutOnDesktop_ExceedsLimit_ReturnsFull()
        {
            var catalog = CreateCatalog();
            var desktop = new List<DesktopProp>();
            var world = new WorldState();
            world.OwnedItems["toy_basket"] = 7;
            var gameState = new GameState();

            for (int i = 0; i < catalog.MaxOnDesktop; i++)
            {
                var r = DesktopPropOps.PutOnDesktop(desktop, world, gameState, "toy_basket", 0.1 * i, 0.5, catalog, out var added);
                Assert.Equal(DesktopPropResult.Ok, r);
                Assert.NotNull(added);
            }

            var seventh = DesktopPropOps.PutOnDesktop(desktop, world, gameState, "toy_basket", 0.9, 0.5, catalog, out var rejected);
            Assert.Equal(DesktopPropResult.Full, seventh);
            Assert.Null(rejected);
            Assert.Equal(6, desktop.Count);
        }

        [Fact]
        public void PutOnDesktop_SameSingleOwnedItemTwice_ReturnsNotOwned()
        {
            var catalog = CreateCatalog();
            var desktop = new List<DesktopProp>();
            var world = new WorldState();
            world.OwnedItems["toy_basket"] = 1;
            var gameState = new GameState();

            var first = DesktopPropOps.PutOnDesktop(desktop, world, gameState, "toy_basket", 0.3, 0.7, catalog, out _);
            var second = DesktopPropOps.PutOnDesktop(desktop, world, gameState, "toy_basket", 0.6, 0.7, catalog, out _);

            Assert.Equal(DesktopPropResult.Ok, first);
            Assert.Equal(DesktopPropResult.NotOwned, second);
            Assert.Single(desktop);
            Assert.Equal(0, DesktopPropOps.FreeCount(desktop, world, gameState, "toy_basket", catalog));
        }

        [Fact]
        public void RemoveFromDesktop_MissingUid_ReturnsNotFound()
        {
            var desktop = new List<DesktopProp>();

            var result = DesktopPropOps.RemoveFromDesktop(desktop, "missing_uid");

            Assert.Equal(DesktopPropResult.NotFound, result);
        }

        [Fact]
        public void PutAndMove_OutOfBoundsOrNaNCoords_AreClamped()
        {
            var catalog = CreateCatalog();
            var desktop = new List<DesktopProp>();
            var world = new WorldState();
            var gameState = new GameState();
            gameState.Inventory["golden_bowl"] = 1;

            var put = DesktopPropOps.PutOnDesktop(desktop, world, gameState, "golden_bowl", -0.5, 1.8, catalog, out var added);
            Assert.Equal(DesktopPropResult.Ok, put);
            Assert.Equal(0.0, added.X);
            Assert.Equal(1.0, added.Y);

            var move = DesktopPropOps.MoveOnDesktop(desktop, added.Uid, double.NaN, double.PositiveInfinity);
            Assert.Equal(DesktopPropResult.Ok, move);
            Assert.Equal(0.5, added.X);
            Assert.Equal(0.5, added.Y);
        }

        [Fact]
        public void OldSaveWithoutPropsSection_UsesSafeDefaults()
        {
            var catalog = CreateCatalog();
            var oldWorld = JsonConvert.DeserializeObject<WorldState>("{\"Version\":1,\"OwnedItems\":{\"toy_basket\":2}}");
            var gameState = new GameState();
            var desktop = new List<DesktopProp>();

            Assert.Equal(2, DesktopPropOps.OwnedCount(oldWorld, gameState, "toy_basket", catalog));
            Assert.Equal(2, DesktopPropOps.FreeCount(desktop, oldWorld, gameState, "toy_basket", catalog));
        }

        [Fact]
        public void ToRoomAndFromRoom_RespectRoomPlacementAndDesktopCap()
        {
            var catalog = CreateCatalog();
            var items = new WorldItemCatalog(new[]
            {
                new WorldItemDefinition("toy_basket", "Toy basket", new[] { "salon" }, 1, 1, 10, 1, "floor", "toy_basket")
            });
            var world = new WorldState();
            world.OwnedItems["toy_basket"] = 1;
            world.Rooms["salon"] = new RoomLayout();
            var gameState = new GameState();
            var desktop = new List<DesktopProp>();

            Assert.Equal(DesktopPropResult.Ok, DesktopPropOps.PutOnDesktop(desktop, world, gameState, "toy_basket", 0.5, 0.5, catalog, out var prop));

            // Out of bounds in room -> RoomRefused and prop remains on desktop
            var refused = DesktopPropOps.ToRoom(desktop, world, gameState, prop.Uid, "salon", -1, 0, 8, 6, 2, items, catalog);
            Assert.Equal(DesktopPropResult.RoomRefused, refused);
            Assert.Single(desktop);

            // Valid room cell -> Ok and moved to room
            var moved = DesktopPropOps.ToRoom(desktop, world, gameState, prop.Uid, "salon", 1, 3, 8, 6, 2, items, catalog);
            Assert.Equal(DesktopPropResult.Ok, moved);
            Assert.Empty(desktop);
            Assert.Equal(1, DesktopPropOps.PlacedInRoomsCount(world, "toy_basket"));

            // Bring back from room when desktop is full -> Stored
            for (int i = 0; i < catalog.MaxOnDesktop; i++)
            {
                desktop.Add(new DesktopProp { Uid = "fill_" + i, ItemId = "cushion_big", X = 0.5, Y = 0.5 });
            }
            string placedUid = world.Rooms["salon"].Items[0].Uid;
            var fromRoom = DesktopPropOps.FromRoom(desktop, world, "salon", placedUid, 0.4, 0.6, catalog);
            Assert.Equal(DesktopPropResult.Stored, fromRoom);
            Assert.Equal(0, DesktopPropOps.PlacedInRoomsCount(world, "toy_basket"));
        }
    }
}
