using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class SharedRoomOpsTests
    {
        private static WorldItemCatalog Catalog()
        {
            return new WorldItemCatalog(new[]
            {
                new WorldItemDefinition { Id = "lamp", Name = "Lamp", W = 1, H = 1, Layer = "floor", Comfort = 2 },
                new WorldItemDefinition { Id = "sofa", Name = "Sofa", W = 8, H = 4, Layer = "floor", Comfort = 9 },
                new WorldItemDefinition { Id = "poster", Name = "Poster", W = 2, H = 1, Layer = "wall", Comfort = 3 }
            }, new[] { "ground", "floor", "wall" });
        }

        private static Func<string> UidGen()
        {
            int n = 0;
            return () => "new" + (++n);
        }

        private static RoomLayout PigRoom(string wallpaper, string prefix, string itemId, int count)
        {
            var room = new RoomLayout { Wallpaper = wallpaper, Floor = "floor_" + prefix, Name = prefix + "'s room" };
            for (int i = 1; i <= count; i++)
            {
                room.Items.Add(new PlacedItem { Uid = prefix + i, ItemId = itemId, X = i, Y = 5 });
            }
            return room;
        }

        private static WorldState MakeWorld(PigRoomConfig config, params (string pig, RoomLayout room)[] rooms)
        {
            var world = new WorldState();
            foreach (var (pig, room) in rooms)
            {
                world.Rooms[config.RoomId(pig)] = room;
            }
            return world;
        }

        private static int OwnedSum(WorldState world) => world.OwnedItems.Values.Sum();

        [Fact]
        public void MoveIn_TwoPigsWithEightLamps_EveryItemIsPlacedOrStored()
        {
            var config = PigRoomConfig.CreateDefault();
            var items = Catalog();
            var world = MakeWorld(config, ("a", PigRoom("wall_a", "a", "lamp", 8)), ("b", PigRoom("wall_b", "b", "lamp", 8)));
            world.OwnedItems["lamp"] = 16;
            int ownedBefore = OwnedSum(world);

            var result = SharedRoomOps.MoveIn(world, new[] { "a", "b" }, config, items, UidGen());

            Assert.Equal(MoveInStatus.Moved, result.Status);
            int placed = RoomLayoutOps.CountPlaced(world.Rooms[SharedRoomOps.DormId], "lamp");
            Assert.Equal(16, placed + result.ItemsStored);
            Assert.Equal(16, world.OwnedItems["lamp"]);
            Assert.Equal(ownedBefore, OwnedSum(world));
            Assert.Equal(new[] { "a", "b" }, SharedRoomOps.Residents(world).OrderBy(x => x).ToArray());
        }

        [Fact]
        public void MoveIn_ItemsThatDoNotFit_StayOwnedAndCountedInStorage()
        {
            var config = PigRoomConfig.CreateDefault();
            var items = Catalog();
            var a = PigRoom("wall_a", "a", "sofa", 2);
            var b = PigRoom("wall_b", "b", "sofa", 1);
            var world = MakeWorld(config, ("a", a), ("b", b));
            world.OwnedItems["sofa"] = 3;
            int ownedBefore = OwnedSum(world);

            var result = SharedRoomOps.MoveIn(world, new[] { "a", "b" }, config, items, UidGen());

            Assert.Equal(MoveInStatus.Moved, result.Status);
            int placed = RoomLayoutOps.CountPlaced(world.Rooms[SharedRoomOps.DormId], "sofa");
            Assert.Equal(2, placed);
            Assert.Equal(1, result.ItemsStored);
            Assert.Equal(3, placed + result.ItemsStored);
            Assert.Equal(3, world.OwnedItems["sofa"]);
            Assert.Equal(ownedBefore, OwnedSum(world));
        }

        [Fact]
        public void MoveIn_ThirdPigCanJoin()
        {
            var config = PigRoomConfig.CreateDefault();
            var items = Catalog();
            var world = MakeWorld(config, ("a", PigRoom("w", "a", "lamp", 2)), ("b", PigRoom("w", "b", "lamp", 2)), ("c", PigRoom("w", "c", "lamp", 2)));
            world.OwnedItems["lamp"] = 6;
            SharedRoomOps.MoveIn(world, new[] { "a", "b" }, config, items, UidGen());

            var result = SharedRoomOps.MoveIn(world, new[] { "c" }, config, items, UidGen());

            Assert.Equal(MoveInStatus.Moved, result.Status);
            Assert.Equal(3, SharedRoomOps.Residents(world).Count);
            Assert.Equal(6, OwnedSum(world));
        }

        [Fact]
        public void MoveIn_RefusesOneRoommateAlreadySharedAndTooMany()
        {
            var config = PigRoomConfig.CreateDefault();
            var items = Catalog();
            var world = MakeWorld(config, ("a", PigRoom("w", "a", "lamp", 1)), ("b", PigRoom("w", "b", "lamp", 1)));

            Assert.Equal(MoveInStatus.NeedTwo, SharedRoomOps.MoveIn(world, new[] { "a" }, config, items, UidGen()).Status);
            Assert.Empty(SharedRoomOps.Residents(world));

            SharedRoomOps.MoveIn(world, new[] { "a", "b" }, config, items, UidGen());
            Assert.Equal(MoveInStatus.AlreadyShared, SharedRoomOps.MoveIn(world, new[] { "a", "c" }, config, items, UidGen()).Status);

            var many = Enumerable.Range(1, config.Dorm.MaxResidents + 1).Select(i => "p" + i).ToList();
            var fresh = new WorldState();
            Assert.Equal(MoveInStatus.TooMany, SharedRoomOps.MoveIn(fresh, many, config, items, UidGen()).Status);
            Assert.Empty(fresh.RoomShare);
            Assert.False(fresh.Rooms.ContainsKey(SharedRoomOps.DormId));
        }

        [Fact]
        public void MoveOut_RestoresOriginalLayoutExactly_WhenNothingChanged()
        {
            var config = PigRoomConfig.CreateDefault();
            var items = Catalog();
            var world = MakeWorld(config, ("a", PigRoom("wall_a", "a", "lamp", 4)), ("b", PigRoom("wall_b", "b", "lamp", 4)));
            world.OwnedItems["lamp"] = 8;
            string before = JsonConvert.SerializeObject(world.Rooms[config.RoomId("a")]);

            SharedRoomOps.MoveIn(world, new[] { "a", "b" }, config, items, UidGen());
            bool ok = SharedRoomOps.MoveOut(world, "a", config);

            Assert.True(ok);
            Assert.Equal(before, JsonConvert.SerializeObject(world.Rooms[config.RoomId("a")]));
            Assert.False(world.RoomShare.ContainsKey("a"));
            Assert.False(world.Parked.ContainsKey("a"));
            Assert.Equal(new[] { "b" }, SharedRoomOps.Residents(world).ToArray());
        }

        [Fact]
        public void MoveOut_ReturnsSnapshotItemsAndKeepsItemsBoughtWhileSharing()
        {
            var config = PigRoomConfig.CreateDefault();
            var items = Catalog();
            var world = MakeWorld(config, ("a", PigRoom("wall_a", "a", "lamp", 4)), ("b", PigRoom("wall_b", "b", "lamp", 4)));
            world.OwnedItems["lamp"] = 9;
            SharedRoomOps.MoveIn(world, new[] { "a", "b" }, config, items, UidGen());

            var dorm = world.Rooms[SharedRoomOps.DormId];
            Assert.True(RoomLayoutOps.Place(dorm, 16, 8, 2, items.Find("lamp"), SharedRoomOps.DormPlaceId, 15, 7, () => "bought1", items) == PlaceResult.Ok);

            Assert.True(SharedRoomOps.MoveOut(world, "a", config));

            var backRoom = world.Rooms[config.RoomId("a")];
            Assert.Equal(new[] { "a1", "a2", "a3", "a4" }, backRoom.Items.Select(i => i.Uid).ToArray());
            var remaining = world.Rooms[SharedRoomOps.DormId].Items.Select(i => i.Uid).ToList();
            Assert.DoesNotContain(remaining, uid => uid.StartsWith("a", StringComparison.Ordinal));
            Assert.Contains("bought1", remaining);
            Assert.Contains("b1", remaining);
        }

        [Fact]
        public void MoveOut_OfLastButOneResident_LeavesDormWithOneResident()
        {
            var config = PigRoomConfig.CreateDefault();
            var items = Catalog();
            var world = MakeWorld(config, ("a", PigRoom("w", "a", "lamp", 1)), ("b", PigRoom("w", "b", "lamp", 1)));
            SharedRoomOps.MoveIn(world, new[] { "a", "b" }, config, items, UidGen());

            Assert.True(SharedRoomOps.MoveOut(world, "a", config));

            Assert.Equal(new[] { "b" }, SharedRoomOps.Residents(world).ToArray());
            Assert.True(world.Rooms.ContainsKey(SharedRoomOps.DormId));
            Assert.False(SharedRoomOps.MoveOut(world, "a", config));
        }

        [Fact]
        public void MoveIn_MemorialPigCanBeResident()
        {
            var config = PigRoomConfig.CreateDefault();
            var items = Catalog();
            var world = MakeWorld(config, ("ned_memorial", PigRoom("w", "n", "lamp", 1)), ("b", PigRoom("w", "b", "lamp", 1)));

            var result = SharedRoomOps.MoveIn(world, new[] { "ned_memorial", "b" }, config, items, UidGen());

            Assert.Equal(MoveInStatus.Moved, result.Status);
            Assert.Contains("ned_memorial", SharedRoomOps.Residents(world));
        }

        [Fact]
        public void MoveIn_DormTakesWallpaperAndFloorOfFirstResident()
        {
            var config = PigRoomConfig.CreateDefault();
            var items = Catalog();
            var world = MakeWorld(config, ("a", PigRoom("wall_a", "a", "lamp", 1)), ("b", PigRoom("wall_b", "b", "lamp", 1)));

            SharedRoomOps.MoveIn(world, new[] { "a", "b" }, config, items, UidGen());

            var dorm = world.Rooms[SharedRoomOps.DormId];
            Assert.Equal("wall_a", dorm.Wallpaper);
            Assert.Equal("floor_a", dorm.Floor);
            Assert.Equal(config.Dorm.Name, dorm.Name);
        }
    }
}
