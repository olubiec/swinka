using System;
using System.IO;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class RoomLayoutOpsTests
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

        private static WorldItemCatalog LoadCatalog()
        {
            string json = File.ReadAllText(RepoFile("assets/data/world_items.json"));
            return WorldItemCatalog.Load(json);
        }

        [Fact]
        public void EveryPlaceResult_IsReachable()
        {
            var cat = LoadCatalog();
            var sofa = cat.Find("sofa_cosy"); // 3x2 floor in house
            var window = cat.Find("window_sun"); // 2x2 wall in house
            var fence = cat.Find("fence_wood"); // 1x1 floor in garden
            var room = new RoomLayout();

            // UnknownItem
            Assert.Equal(PlaceResult.UnknownItem, RoomLayoutOps.CanPlace(room, 12, 7, 2, null, "house", 0, 2, null, cat));

            // NotAllowedHere
            Assert.Equal(PlaceResult.NotAllowedHere, RoomLayoutOps.CanPlace(room, 12, 7, 2, fence, "house", 0, 2, null, cat));

            // OutOfBounds
            Assert.Equal(PlaceResult.OutOfBounds, RoomLayoutOps.CanPlace(room, 12, 7, 2, sofa, "house", 10, 2, null, cat));

            // WrongLayerArea
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 12, 7, 2, sofa, "house", 0, 1, null, cat));
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 12, 7, 2, window, "house", 0, 2, null, cat));

            // Ok
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, sofa, "house", 0, 2, false, () => "u1", cat));

            // Overlap
            Assert.Equal(PlaceResult.Overlap, RoomLayoutOps.CanPlace(room, 12, 7, 2, sofa, "house", 1, 2, null, cat));
        }

        [Fact]
        public void FloorItems_OverlappingRefused_AdjacentAllowed()
        {
            var cat = LoadCatalog();
            var sofa = cat.Find("sofa_cosy"); // 3x2 floor
            var armchair = cat.Find("armchair"); // 2x2 floor
            var room = new RoomLayout();

            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, sofa, "house", 0, 2, false, () => "u1", cat));

            // Overlapping at x=2, y=2 (sofa occupies x=0..2, y=2..3)
            Assert.Equal(PlaceResult.Overlap, RoomLayoutOps.Place(room, 12, 7, 2, armchair, "house", 2, 2, false, () => "u2", cat));

            // Adjacent at x=3, y=2
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, armchair, "house", 3, 2, false, () => "u2", cat));
            Assert.Equal(2, room.Items.Count);
        }

        [Fact]
        public void GroundPath_UnderFloorItem_IsAllowed()
        {
            var cat = LoadCatalog();
            var path = cat.Find("path_stone"); // 1x1 ground in garden
            var bench = cat.Find("bench_wood"); // 2x1 floor in garden
            var garden = new RoomLayout();

            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(garden, 16, 9, 0, path, "garden", 2, 2, false, () => "p1", cat));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(garden, 16, 9, 0, bench, "garden", 2, 2, false, () => "b1", cat));

            // Another ground item on the same cell overlaps with path
            Assert.Equal(PlaceResult.Overlap, RoomLayoutOps.Place(garden, 16, 9, 0, path, "garden", 2, 2, false, () => "p2", cat));
        }

        [Fact]
        public void WallInFloorArea_And_FloorInWallRows_AreRefused()
        {
            var cat = LoadCatalog();
            var clock = cat.Find("wall_clock"); // 1x1 wall
            var window = cat.Find("window_sun"); // 2x2 wall
            var table = cat.Find("side_table"); // 1x1 floor
            var room = new RoomLayout();

            // Wall item in floor area (row 2 when wallRows=2)
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 12, 7, 2, clock, "house", 0, 2, null, cat));
            // Wall item straddling wall and floor (y=1, h=2 -> rows 1..2 when wallRows=2)
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 12, 7, 2, window, "house", 0, 1, null, cat));
            // Wall item inside wall rows (y=0, h=2)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, window, "house", 0, 0, null, cat));

            // Floor item in wall rows (row 0 or 1)
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 12, 7, 2, table, "house", 0, 0, null, cat));
            Assert.Equal(PlaceResult.WrongLayerArea, RoomLayoutOps.CanPlace(room, 12, 7, 2, table, "house", 0, 1, null, cat));
            // Floor item at row 2
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, table, "house", 0, 2, null, cat));
        }

        [Fact]
        public void MovingItem_OntoItself_OrOverlappingOldFootprint_IsAllowed()
        {
            var cat = LoadCatalog();
            var sofa = cat.Find("sofa_cosy"); // 3x2
            var room = new RoomLayout();

            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(room, 12, 7, 2, sofa, "house", 2, 3, false, () => "sofa1", cat));

            // Move onto exact same position
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Move(room, 12, 7, 2, cat, "house", "sofa1", 2, 3));
            // Move 1 cell right (overlaps old footprint)
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Move(room, 12, 7, 2, sofa, "house", "sofa1", 3, 3, cat));
            Assert.Equal(3, room.Items[0].X);
            Assert.Equal(3, room.Items[0].Y);
        }

        [Fact]
        public void OutdoorPlaces_AcceptFloorItemsInRowZero()
        {
            var cat = LoadCatalog();
            var bench = cat.Find("bench_wood"); // 2x1 floor in garden
            var fountain = cat.Find("fountain"); // 3x3 floor in park
            var garden = new RoomLayout();
            var park = new RoomLayout();

            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(garden, 16, 9, 0, bench, "garden", 0, 0, false, () => "g1", cat));
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.Place(park, 24, 12, 0, fountain, "park", 0, 0, false, () => "pk1", cat));
        }

        [Fact]
        public void Remove_Flip_And_CountPlaced_BehaveCorrectly()
        {
            var cat = LoadCatalog();
            var cushion = cat.Find("cushion_big");
            var room = new RoomLayout();

            Assert.False(RoomLayoutOps.Remove(room, "unknown_uid"));
            Assert.False(RoomLayoutOps.SetFlip(room, "unknown_uid", true));

            RoomLayoutOps.Place(room, 12, 7, 2, cushion, "house", 0, 2, false, () => "c1", cat);
            RoomLayoutOps.Place(room, 12, 7, 2, cushion, "house", 1, 2, false, () => "c2", cat);

            Assert.Equal(2, RoomLayoutOps.CountPlaced(room, "cushion_big"));
            Assert.True(RoomLayoutOps.SetFlip(room, "c1", true));
            Assert.True(room.Items[0].Flip);

            Assert.True(RoomLayoutOps.Remove(room, "c1"));
            Assert.Equal(1, RoomLayoutOps.CountPlaced(room, "cushion_big"));
            Assert.False(RoomLayoutOps.Remove(room, "c1"));
        }

        [Fact]
        public void Sofa3x2_AtLastValidCell_IsOk_AndOneCellFurther_IsOutOfBounds()
        {
            var cat = LoadCatalog();
            var sofa = cat.Find("sofa_cosy"); // 3x2
            var room = new RoomLayout();

            // Grid 12x7: last valid cell for 3x2 is x = 12 - 3 = 9, y = 7 - 2 = 5
            Assert.Equal(PlaceResult.Ok, RoomLayoutOps.CanPlace(room, 12, 7, 2, sofa, "house", 9, 5, null, cat));
            Assert.Equal(PlaceResult.OutOfBounds, RoomLayoutOps.CanPlace(room, 12, 7, 2, sofa, "house", 10, 5, null, cat));
            Assert.Equal(PlaceResult.OutOfBounds, RoomLayoutOps.CanPlace(room, 12, 7, 2, sofa, "house", 9, 6, null, cat));
        }
    }
}
