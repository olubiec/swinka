using System.IO;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class LampPlacementTests
    {
        private static WorldItemCatalog LoadRealCatalog()
        {
            string filePath = RepoFile.Find("assets/data/world_items.json");
            return WorldItemCatalog.Load(File.ReadAllText(filePath));
        }

        [Theory]
        [InlineData("T1", "lamp_mushroom", "salon", 12, 7, 2, 0, 2, null, 0, 0, PlaceResult.Ok)]
        [InlineData("T2", "lamp_floor", "salon", 12, 7, 2, 5, 2, null, 0, 0, PlaceResult.Ok)]
        [InlineData("T3", "lamp_mushroom", "salon", 12, 7, 2, 0, 1, null, 0, 0, PlaceResult.WrongLayerArea)]
        [InlineData("T4", "lamp_floor", "salon", 12, 7, 2, 0, 0, null, 0, 0, PlaceResult.WrongLayerArea)]
        [InlineData("T5", "lamp_mushroom", "salon", 12, 7, 2, 0, 6, null, 0, 0, PlaceResult.Ok)]
        [InlineData("T6", "lamp_arc", "salon", 12, 7, 2, 2, 0, null, 0, 0, PlaceResult.Ok)]
        [InlineData("T7", "lamp_arc", "salon", 12, 7, 2, 2, 1, null, 0, 0, PlaceResult.Ok)]
        [InlineData("T8", "lamp_arc", "salon", 12, 7, 2, 2, 2, null, 0, 0, PlaceResult.WrongLayerArea)]
        [InlineData("T9", "fairy_lights", "salon", 12, 7, 2, 1, 0, null, 0, 0, PlaceResult.Ok)]
        [InlineData("T10", "fairy_lights", "salon", 12, 7, 2, 1, 2, null, 0, 0, PlaceResult.WrongLayerArea)]
        [InlineData("T11", "lamp_salt", "salon", 12, 7, 2, 3, 2, null, 0, 0, PlaceResult.Ok)]
        [InlineData("T12", "lamp_salt", "salon", 12, 7, 2, 3, 1, null, 0, 0, PlaceResult.WrongLayerArea)]
        [InlineData("T13", "lamp_mushroom", "salon", 12, 7, 2, 3, 2, "lamp_floor", 3, 2, PlaceResult.Overlap)]
        [InlineData("T14", "lamp_mushroom", "salon", 12, 7, 2, 4, 2, "side_table", 3, 2, PlaceResult.Ok)]
        [InlineData("T15", "wall_clock", "salon", 12, 7, 2, 2, 1, "sofa_cosy", 1, 2, PlaceResult.Ok)]
        [InlineData("T16", "lamp_oil", "garden", 16, 9, 0, 0, 0, null, 0, 0, PlaceResult.Ok)]
        [InlineData("T17", "lamp_post", "salon", 12, 7, 2, 0, 2, null, 0, 0, PlaceResult.NotAllowedHere)]
        public void CanPlace_LampCases_MatchR25Table(
            string caseId,
            string itemId,
            string placeId,
            int cols,
            int rows,
            int wallRows,
            int x,
            int y,
            string existingItemId,
            int existingX,
            int existingY,
            PlaceResult expected)
        {
            var catalog = LoadRealCatalog();
            var item = catalog.Find(itemId);
            Assert.NotNull(item);

            var room = new RoomLayout();
            if (!string.IsNullOrEmpty(existingItemId))
            {
                var existing = catalog.Find(existingItemId);
                Assert.NotNull(existing);
                var pre = RoomLayoutOps.Place(room, cols, rows, wallRows, existing, placeId, existingX, existingY, () => "existing-1", catalog);
                Assert.Equal(PlaceResult.Ok, pre);
            }

            var actual = RoomLayoutOps.CanPlace(room, cols, rows, wallRows, item, placeId, x, y, ignoreUid: null, catalog: catalog);
            Assert.True(expected == actual, $"{caseId}: expected {expected}, got {actual}");
        }

        [Fact]
        public void Move_AppliesSameFootprintRules()
        {
            var catalog = LoadRealCatalog();
            var mushroom = catalog.Find("lamp_mushroom");
            var arc = catalog.Find("lamp_arc");
            Assert.NotNull(mushroom);
            Assert.NotNull(arc);

            var room = new RoomLayout();
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, mushroom, "salon", 4, 4, () => "m1", catalog));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, arc, "salon", 0, 0, () => "a1", catalog));

            // Floor lamp can move to back-wall row y=2, rejected in wall row y=1
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Move(room, 12, 7, 2, mushroom, "salon", "m1", 0, 2, catalog));
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.Move(room, 12, 7, 2, mushroom, "salon", "m1", 0, 1, catalog));
            Assert.Equal(0, room.Items[0].X);
            Assert.Equal(2, room.Items[0].Y);

            // Wall lamp can move to y=1, rejected on floor y=2
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Move(room, 12, 7, 2, arc, "salon", "a1", 2, 1, catalog));
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.Move(room, 12, 7, 2, arc, "salon", "a1", 2, 2, catalog));
            Assert.Equal(2, room.Items[1].X);
            Assert.Equal(1, room.Items[1].Y);
        }

        [Fact]
        public void OldSavePositions_ForFloorLamps_RemainValid()
        {
            var catalog = LoadRealCatalog();
            var mushroom = catalog.Find("lamp_mushroom");
            var floorLamp = catalog.Find("lamp_floor");
            Assert.NotNull(mushroom);
            Assert.NotNull(floorLamp);

            var room = new RoomLayout();
            for (int y = 2; y <= 5; y++)
            {
                Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, mushroom, "salon", 1, y, catalog: catalog));
                Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, floorLamp, "salon", 2, y, catalog: catalog));
            }
        }

        [Fact]
        public void MissingFootFields_DefaultToWAndH()
        {
            var catalog = LoadRealCatalog();
            var lampPost = catalog.Find("lamp_post");
            Assert.NotNull(lampPost);
            Assert.Equal(0, lampPost.FootW);
            Assert.Equal(0, lampPost.FootH);
            Assert.Equal(0, lampPost.SpriteH);
            Assert.Equal(lampPost.W, lampPost.EffectiveFootW);
            Assert.Equal(lampPost.H, lampPost.EffectiveFootH);
            Assert.Equal(lampPost.H, lampPost.EffectiveSpriteH);

            var mushroom = catalog.Find("lamp_mushroom");
            var floorLamp = catalog.Find("lamp_floor");
            var arc = catalog.Find("lamp_arc");
            Assert.NotNull(mushroom);
            Assert.NotNull(floorLamp);
            Assert.NotNull(arc);

            Assert.Equal(1, mushroom.EffectiveFootW);
            Assert.Equal(1, mushroom.EffectiveFootH);
            Assert.Equal(2, mushroom.EffectiveSpriteH);

            Assert.Equal(1, floorLamp.EffectiveFootW);
            Assert.Equal(1, floorLamp.EffectiveFootH);
            Assert.Equal(2, floorLamp.EffectiveSpriteH);

            Assert.Equal(2, arc.EffectiveFootW);
            Assert.Equal(1, arc.EffectiveFootH);
            Assert.Equal(3, arc.EffectiveSpriteH);
        }
    }
}
