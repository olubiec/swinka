using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WorldSaveSizeTests : IDisposable
    {
        private static readonly DateTime Start = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
        private static readonly string[] PlaceIds = { "house", "garden", "farm", "park", "market" };
        private static readonly string[] RoomIds = { "salon", "bedroom", "playroom" };
        private static readonly string[] LayoutIds = { "salon", "bedroom", "playroom", "garden", "park" };
        private readonly string _testDir;

        public WorldSaveSizeTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyWorldSaveSize_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                {
                    Directory.Delete(_testDir, recursive: true);
                }
            }
            catch
            {
                // Ignore errors deleting the temp folder after the test
            }
        }

        private static GameState BuildMaxWorldState()
        {
            var state = GameState.CreateNew("Max", Start);

            state.Roster = new List<PigProfile>();
            for (int i = 0; i < 7; i++)
            {
                state.Roster.Add(new PigProfile { Id = "pig" + i, Name = "Pig" + i });
            }

            var world = state.World;
            foreach (var placeId in PlaceIds)
            {
                world.PlaceLevels[placeId] = 1;
            }
            foreach (var roomId in RoomIds)
            {
                world.RoomsUnlocked.Add(roomId);
            }

            // 5 rooms/places with 60 placed items each = 300 items.
            foreach (var layoutId in LayoutIds)
            {
                var layout = new RoomLayout { Wallpaper = "wallpaper_mint", Floor = "floor_wood_light" };
                for (int i = 0; i < 60; i++)
                {
                    layout.Items.Add(new PlacedItem
                    {
                        Uid = layoutId + "_" + i,
                        ItemId = "sofa_cosy",
                        X = i % 10,
                        Y = i / 10,
                        Flip = i % 2 == 0
                    });
                }
                world.Rooms[layoutId] = layout;
            }

            var crops = FarmConfig.Current.Crops;
            world.Farm.PlotsOwned = 24;
            world.Farm.OrchardSlots = 4;
            for (int i = 0; i < 24; i++)
            {
                world.Farm.Plots.Add(new PlotState
                {
                    CropId = crops[i % crops.Count].Id,
                    PlantedUtc = Start,
                    Watered = true
                });
            }
            for (int i = 0; i < 4; i++)
            {
                world.Farm.Orchard.Add(new OrchardState
                {
                    CropId = crops[i % crops.Count].Id,
                    NextUtc = Start.AddDays(1),
                    Stock = 3
                });
            }

            world.Market.StallLevel = 2;
            foreach (var crop in crops)
            {
                world.Market.Demand[crop.Id] = 1.0;
            }

            return state;
        }

        [Fact]
        public void MaxWorld_SavesUnder200KB()
        {
            var state = BuildMaxWorldState();

            string json = SaveSystem.Serialize(state);
            int bytes = Encoding.UTF8.GetByteCount(json);

            Assert.True(bytes < 200 * 1024, "Save is " + bytes + " bytes");
        }

        [Fact]
        public void MaxWorld_RoundTripsWithKeyCountsUnchangedAndUnder500ms()
        {
            var state = BuildMaxWorldState();
            var saveSystem = new SaveSystem(_testDir);

            var timer = Stopwatch.StartNew();
            saveSystem.Save(state);
            var load = saveSystem.Load();
            timer.Stop();

            Assert.NotNull(load.State);
            var loaded = load.State;

            long fileBytes = new FileInfo(Path.Combine(_testDir, SaveSystem.FileName)).Length;
            Assert.True(fileBytes < 200 * 1024, "Save file is " + fileBytes + " bytes");

            Assert.Equal(7, loaded.Roster.Count);
            Assert.Equal(24, loaded.World.Farm.Plots.Count);
            Assert.Equal(4, loaded.World.Farm.Orchard.Count);
            Assert.Equal(300, loaded.World.Rooms.Values.Sum(r => r.Items.Count));
            Assert.Equal(LayoutIds.Length, loaded.World.Rooms.Count);
            Assert.Equal(FarmConfig.Current.Crops.Count, loaded.World.Market.Demand.Count);
            Assert.Equal(PlaceIds.Length, loaded.World.PlaceLevels.Count);

            Assert.True(timer.ElapsedMilliseconds < 500, "Round trip took " + timer.ElapsedMilliseconds + " ms");
        }
    }
}
