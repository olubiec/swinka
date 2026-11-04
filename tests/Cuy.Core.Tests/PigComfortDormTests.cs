using System;
using System.Linq;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigComfortDormTests
    {
        private static readonly WorldItemCatalog Items = new WorldItemCatalog(new[]
        {
            new WorldItemDefinition { Id = "lamp", Name = "Lamp", W = 1, H = 1, Layer = "floor", Comfort = 10 },
            new WorldItemDefinition { Id = "rug", Name = "Rug", W = 1, H = 1, Layer = "floor", Comfort = 4 },
            new WorldItemDefinition { Id = "statue", Name = "Statue", W = 1, H = 1, Layer = "floor", Comfort = 30 }
        }, new[] { "ground", "floor", "wall" });

        private static RoomLayout Room(params string[] itemIds)
        {
            var room = new RoomLayout();
            for (int i = 0; i < itemIds.Length; i++)
            {
                room.Items.Add(new PlacedItem { Uid = "u" + i, ItemId = itemIds[i], X = i, Y = 5 });
            }
            return room;
        }

        private static int Expected(PigRoomConfig config, params (double weight, int comfort)[] parts)
        {
            double sum = parts.Sum(p => p.weight * p.comfort);
            return (int)Math.Min(PigComfort.MaxScore, Math.Max(0, Math.Round(sum)));
        }

        [Fact]
        public void BothResidents_DormCountsOncePerPigAsOwnRoom_AndParkedRoomsCountForNobody()
        {
            var config = PigRoomConfig.CreateDefault();
            var world = new WorldState();
            world.RoomShare["a"] = SharedRoomOps.DormId;
            world.RoomShare["b"] = SharedRoomOps.DormId;
            world.Rooms[SharedRoomOps.DormId] = Room("lamp");
            world.Rooms[config.RoomId("a")] = Room("statue");
            world.Rooms[config.RoomId("b")] = Room("rug");

            int scoreA = PigComfort.Score(world, Items, config, "a");
            int scoreB = PigComfort.Score(world, Items, config, "b");

            Assert.Equal(Expected(config, (config.ComfortOwn, 10)), scoreA);
            Assert.Equal(Expected(config, (config.ComfortOwn, 10)), scoreB);
        }

        [Fact]
        public void NonResident_SeesDormAsCommonPlace_AndResidentParkedRoomIsIgnored()
        {
            var config = PigRoomConfig.CreateDefault();
            var world = new WorldState();
            world.RoomShare["a"] = SharedRoomOps.DormId;
            world.Rooms[SharedRoomOps.DormId] = Room("lamp");
            world.Rooms[config.RoomId("a")] = Room("statue");
            world.Rooms[config.RoomId("b")] = Room("rug");

            int scoreB = PigComfort.Score(world, Items, config, "b");
            int scoreA = PigComfort.Score(world, Items, config, "a");

            Assert.Equal(Expected(config, (config.ComfortOwn, 4), (config.ComfortCommon, 10)), scoreB);
            Assert.Equal(Expected(config, (config.ComfortOwn, 10)), scoreA);
        }

        [Fact]
        public void Score_IsCappedAt100()
        {
            var config = PigRoomConfig.CreateDefault();
            var world = new WorldState();
            world.RoomShare["a"] = SharedRoomOps.DormId;
            world.RoomShare["b"] = SharedRoomOps.DormId;
            world.Rooms[SharedRoomOps.DormId] = Room("statue", "statue", "statue", "statue");

            Assert.Equal(PigComfort.MaxScore, PigComfort.Score(world, Items, config, "a"));
            Assert.Equal(PigComfort.MaxScore, PigComfort.Score(world, Items, config, "b"));
        }
    }
}
