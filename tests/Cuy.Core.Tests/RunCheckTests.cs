using System;
using System.Collections.Generic;
using Cuy.Core.Save;
using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class RunCheckTests
    {
        private static RoomLayout BuildEnclosedRect(int x0, int y0, int innerW, int innerH, bool withGate = true, bool skipOneFence = false)
        {
            var layout = new RoomLayout();
            int x1 = x0 + innerW + 1;
            int y1 = y0 + innerH + 1;
            int uid = 1;
            bool gatePlaced = false;
            bool skipped = false;

            for (int x = x0; x <= x1; x++)
            {
                for (int y = y0; y <= y1; y++)
                {
                    bool onBorder = x == x0 || x == x1 || y == y0 || y == y1;
                    if (!onBorder) continue;

                    if (skipOneFence && !skipped && x == x0 + 1 && y == y0)
                    {
                        skipped = true;
                        continue;
                    }

                    string itemId = "fence_wood";
                    if (withGate && !gatePlaced && x == x0 + 1 && y == y1)
                    {
                        itemId = "gate_garden";
                        gatePlaced = true;
                    }

                    layout.Items.Add(new PlacedItem
                    {
                        Uid = "i" + (uid++),
                        ItemId = itemId,
                        X = x,
                        Y = y
                    });
                }
            }

            return layout;
        }

        [Fact]
        public void EmptyGarden_ReturnsNoFence()
        {
            var info = RunCheck.Analyze(new RoomLayout(), 16, 9);
            Assert.False(info.Valid);
            Assert.Equal("no_fence", info.Reason);
            Assert.Equal(0, info.Cells);
            Assert.Equal(0, info.Capacity);
            Assert.Empty(info.CellList);
            Assert.False(RunCheck.IsFenced(new RoomLayout()));
            Assert.Equal(0, RunCheck.Capacity(new RoomLayout()));
        }

        [Fact]
        public void RunOpenByOneCell_ReturnsOpenEdge()
        {
            var layout = BuildEnclosedRect(2, 1, 4, 3, withGate: true, skipOneFence: true);
            var info = RunCheck.Analyze(layout, 16, 9);

            Assert.False(info.Valid);
            Assert.Equal("open_edge", info.Reason);
            Assert.False(RunCheck.IsFenced(layout));
        }

        [Fact]
        public void FenceWithoutEnclosure_ReturnsOpenEdge()
        {
            var layout = new RoomLayout();
            layout.Items.Add(new PlacedItem { Uid = "1", ItemId = "fence_wood", X = 5, Y = 4 });
            layout.Items.Add(new PlacedItem { Uid = "2", ItemId = "gate_garden", X = 6, Y = 4 });

            var info = RunCheck.Analyze(layout, 16, 9);
            Assert.False(info.Valid);
            Assert.Equal("open_edge", info.Reason);
        }

        [Fact]
        public void ClosedRunWithoutGate_ReturnsNoGate()
        {
            var layout = BuildEnclosedRect(2, 1, 4, 3, withGate: false);
            var info = RunCheck.Analyze(layout, 16, 9);

            Assert.False(info.Valid);
            Assert.False(info.HasGate);
            Assert.Equal("no_gate", info.Reason);
            Assert.Equal(12, info.Cells);
        }

        [Fact]
        public void ClosedRunTooSmall_ReturnsTooSmall()
        {
            var layout = BuildEnclosedRect(2, 1, 3, 3, withGate: true);
            var info = RunCheck.Analyze(layout, 16, 9);

            Assert.False(info.Valid);
            Assert.Equal("too_small", info.Reason);
            Assert.Equal(9, info.Cells);
        }

        [Theory]
        [InlineData(4, 3, 12, 2)]
        [InlineData(6, 3, 18, 3)]
        [InlineData(6, 4, 24, 4)]
        public void ClosedRunWithGate_CalculatesCapacity(int innerW, int innerH, int expectedCells, int expectedCap)
        {
            var layout = BuildEnclosedRect(1, 1, innerW, innerH, withGate: true);
            var info = RunCheck.Analyze(layout, 16, 9);

            Assert.True(info.Valid);
            Assert.True(info.HasGate);
            Assert.Equal("ok", info.Reason);
            Assert.Equal(expectedCells, info.Cells);
            Assert.Equal(expectedCap, info.Capacity);
            Assert.Equal(expectedCells, info.CellList.Count);
            Assert.True(RunCheck.IsFenced(layout));
            Assert.Equal(expectedCap, RunCheck.Capacity(layout));
        }

        [Fact]
        public void Capacity_MinimumOnePig_WhenMinCellsSmallerThanCellsPerPig()
        {
            var cfg = RunConfig.Load("{\"min_cells\":4,\"cells_per_pig\":10}");
            var layout = BuildEnclosedRect(2, 2, 2, 2, withGate: true); // 4 cells
            var info = RunCheck.Analyze(layout, 16, 9, null, cfg);

            Assert.True(info.Valid);
            Assert.Equal(4, info.Cells);
            Assert.Equal(1, info.Capacity);
        }

        [Fact]
        public void OldSaveWithoutRunOrGarden_AnalyzesSafely()
        {
            string oldJson = "{\"Rooms\":{\"salon\":{\"Wallpaper\":\"w1\",\"Floor\":\"f1\",\"Items\":[]}}}";
            var world = JsonConvert.DeserializeObject<WorldState>(oldJson);
            world.Rooms.TryGetValue("garden", out var garden);

            var info = RunCheck.Analyze(garden, 16, 9);
            Assert.False(info.Valid);
            Assert.Equal("no_fence", info.Reason);
        }

        [Fact]
        public void SeededRandomPlacements_NeverThrow()
        {
            var rng = new Random(20261121);
            string[] ids = { "fence_wood", "hedge", "gate_garden", "clover_patch" };
            for (int t = 0; t < 25; t++)
            {
                var layout = new RoomLayout();
                int count = rng.Next(0, 30);
                for (int i = 0; i < count; i++)
                {
                    layout.Items.Add(new PlacedItem
                    {
                        Uid = "r" + i,
                        ItemId = ids[rng.Next(ids.Length)],
                        X = rng.Next(0, 16),
                        Y = rng.Next(0, 9)
                    });
                }

                var info = RunCheck.Analyze(layout, 16, 9);
                Assert.NotNull(info);
                Assert.NotNull(info.Reason);
                Assert.NotNull(info.CellList);
            }
        }
    }
}
