using System;
using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WorldStateTests
    {
        [Fact]
        public void NewState_HasEmptyCollectionsAndDefaults()
        {
            var state = new GameState();

            Assert.NotNull(state.World);
            Assert.Equal(1, state.World.Version);
            Assert.False(state.World.LegacyDecorMigrated);
            Assert.NotNull(state.World.PlaceLevels);
            Assert.Empty(state.World.PlaceLevels);
            Assert.NotNull(state.World.RoomsUnlocked);
            Assert.Empty(state.World.RoomsUnlocked);
            Assert.NotNull(state.World.Rooms);
            Assert.Empty(state.World.Rooms);
            Assert.NotNull(state.World.OwnedItems);
            Assert.Empty(state.World.OwnedItems);

            Assert.NotNull(state.World.Farm);
            Assert.NotNull(state.World.Farm.Plots);
            Assert.Empty(state.World.Farm.Plots);
            Assert.NotNull(state.World.Farm.Orchard);
            Assert.Empty(state.World.Farm.Orchard);
            Assert.Equal(0, state.World.Farm.PlotsOwned);
            Assert.Equal(0, state.World.Farm.OrchardSlots);

            Assert.NotNull(state.World.Market);
            Assert.NotNull(state.World.Market.SoldToday);
            Assert.Empty(state.World.Market.SoldToday);
            Assert.NotNull(state.World.Market.Demand);
            Assert.Empty(state.World.Market.Demand);
            Assert.NotNull(state.World.Market.Orders);
            Assert.Empty(state.World.Market.Orders);
            Assert.Equal(0, state.World.Market.StallLevel);
            Assert.Equal(0.0, state.World.Market.SalesToday);
        }

        [Fact]
        public void Defaults_PlotsOwnedAndOrchardSlotsDefaultToZero()
        {
            var world = new WorldState();
            Assert.Equal(0, world.Farm.PlotsOwned);
            Assert.Equal(0, world.Farm.OrchardSlots);
        }

        [Fact]
        public void JsonRoundTrip_PreservesStateWithPlacedItem_Plot_AndOrder()
        {
            var state = new GameState();
            state.World.PlaceLevels["town"] = 2;
            state.World.RoomsUnlocked.Add("bedroom");

            var room = new RoomLayout
            {
                Wallpaper = "wp_wood",
                Floor = "fl_tile"
            };
            room.Items.Add(new PlacedItem
            {
                Uid = "u1",
                ItemId = "rug_red",
                X = 10,
                Y = 20,
                Flip = true
            });
            state.World.Rooms["bedroom"] = room;
            state.World.OwnedItems["rug_red"] = 1;

            state.World.Farm.PlotsOwned = 4;
            state.World.Farm.OrchardSlots = 2;
            var planted = new DateTime(2026, 11, 4, 12, 0, 0, DateTimeKind.Utc);
            state.World.Farm.Plots.Add(new PlotState
            {
                CropId = "carrot",
                PlantedUtc = planted,
                Watered = true
            });

            state.World.Market.Orders.Add(new OrderState
            {
                CropId = "carrot",
                Count = 5,
                Done = false
            });
            state.World.Market.SalesToday = 50.5;
            state.World.Market.Demand["carrot"] = 1.2;
            state.World.Market.SoldToday["carrot"] = 3;

            string json = JsonConvert.SerializeObject(state);
            var loaded = JsonConvert.DeserializeObject<GameState>(json);

            Assert.NotNull(loaded);
            Assert.NotNull(loaded.World);
            Assert.Equal(2, loaded.World.PlaceLevels["town"]);
            Assert.Contains("bedroom", loaded.World.RoomsUnlocked);
            Assert.Equal(1, loaded.World.OwnedItems["rug_red"]);

            var loadedRoom = loaded.World.Rooms["bedroom"];
            Assert.Equal("wp_wood", loadedRoom.Wallpaper);
            Assert.Equal("fl_tile", loadedRoom.Floor);
            Assert.Single(loadedRoom.Items);
            Assert.Equal("u1", loadedRoom.Items[0].Uid);
            Assert.Equal("rug_red", loadedRoom.Items[0].ItemId);
            Assert.Equal(10, loadedRoom.Items[0].X);
            Assert.Equal(20, loadedRoom.Items[0].Y);
            Assert.True(loadedRoom.Items[0].Flip);

            Assert.Equal(4, loaded.World.Farm.PlotsOwned);
            Assert.Equal(2, loaded.World.Farm.OrchardSlots);
            Assert.Single(loaded.World.Farm.Plots);
            Assert.Equal("carrot", loaded.World.Farm.Plots[0].CropId);
            Assert.Equal(planted, loaded.World.Farm.Plots[0].PlantedUtc);
            Assert.True(loaded.World.Farm.Plots[0].Watered);

            Assert.Single(loaded.World.Market.Orders);
            Assert.Equal("carrot", loaded.World.Market.Orders[0].CropId);
            Assert.Equal(5, loaded.World.Market.Orders[0].Count);
            Assert.False(loaded.World.Market.Orders[0].Done);
            Assert.Equal(50.5, loaded.World.Market.SalesToday);
            Assert.Equal(1.2, loaded.World.Market.Demand["carrot"]);
            Assert.Equal(3, loaded.World.Market.SoldToday["carrot"]);
        }

        [Fact]
        public void OldSaveWithoutWorld_LoadsAndWorldIsUsable()
        {
            string oldSaveJson = "{\"Clovers\": 100}";
            var loaded = JsonConvert.DeserializeObject<GameState>(oldSaveJson);

            Assert.NotNull(loaded);
            Assert.NotNull(loaded.World);
            Assert.Empty(loaded.World.PlaceLevels);
            Assert.Empty(loaded.World.RoomsUnlocked);
            Assert.Empty(loaded.World.Rooms);
            Assert.Empty(loaded.World.OwnedItems);

            // Verify world is directly usable
            loaded.World.PlaceLevels["meadow"] = 1;
            loaded.World.RoomsUnlocked.Add("kitchen");
            loaded.World.Farm.Plots.Add(new PlotState { CropId = "wheat" });

            Assert.Equal(1, loaded.World.PlaceLevels["meadow"]);
            Assert.Contains("kitchen", loaded.World.RoomsUnlocked);
            Assert.Single(loaded.World.Farm.Plots);
        }

        [Fact]
        public void SettingAnyCollectionToNullInJson_GivesEmptyCollectionsOnAccess()
        {
            string jsonWithNulls = @"{
                ""World"": {
                    ""PlaceLevels"": null,
                    ""RoomsUnlocked"": null,
                    ""Rooms"": null,
                    ""OwnedItems"": null,
                    ""Farm"": {
                        ""Plots"": null,
                        ""Orchard"": null
                    },
                    ""Market"": {
                        ""SoldToday"": null,
                        ""Demand"": null,
                        ""Orders"": null
                    }
                }
            }";

            var loaded = JsonConvert.DeserializeObject<GameState>(jsonWithNulls);

            Assert.NotNull(loaded);
            Assert.NotNull(loaded.World);
            Assert.NotNull(loaded.World.PlaceLevels);
            Assert.Empty(loaded.World.PlaceLevels);
            Assert.NotNull(loaded.World.RoomsUnlocked);
            Assert.Empty(loaded.World.RoomsUnlocked);
            Assert.NotNull(loaded.World.Rooms);
            Assert.Empty(loaded.World.Rooms);
            Assert.NotNull(loaded.World.OwnedItems);
            Assert.Empty(loaded.World.OwnedItems);

            Assert.NotNull(loaded.World.Farm);
            Assert.NotNull(loaded.World.Farm.Plots);
            Assert.Empty(loaded.World.Farm.Plots);
            Assert.NotNull(loaded.World.Farm.Orchard);
            Assert.Empty(loaded.World.Farm.Orchard);

            Assert.NotNull(loaded.World.Market);
            Assert.NotNull(loaded.World.Market.SoldToday);
            Assert.Empty(loaded.World.Market.SoldToday);
            Assert.NotNull(loaded.World.Market.Demand);
            Assert.Empty(loaded.World.Market.Demand);
            Assert.NotNull(loaded.World.Market.Orders);
            Assert.Empty(loaded.World.Market.Orders);

            // Also test RoomLayout with null Items
            string roomJson = @"{ ""Items"": null }";
            var room = JsonConvert.DeserializeObject<RoomLayout>(roomJson);
            Assert.NotNull(room);
            Assert.NotNull(room.Items);
            Assert.Empty(room.Items);

            // Also test explicit property assignment to null
            var world = new WorldState();
            world.PlaceLevels = null;
            world.RoomsUnlocked = null;
            world.Rooms = null;
            world.OwnedItems = null;
            world.Farm = null;
            world.Market = null;

            Assert.NotNull(world.PlaceLevels);
            Assert.NotNull(world.RoomsUnlocked);
            Assert.NotNull(world.Rooms);
            Assert.NotNull(world.OwnedItems);
            Assert.NotNull(world.Farm);
            Assert.NotNull(world.Market);

            world.Farm.Plots = null;
            world.Farm.Orchard = null;
            Assert.NotNull(world.Farm.Plots);
            Assert.NotNull(world.Farm.Orchard);

            world.Market.SoldToday = null;
            world.Market.Demand = null;
            world.Market.Orders = null;
            Assert.NotNull(world.Market.SoldToday);
            Assert.NotNull(world.Market.Demand);
            Assert.NotNull(world.Market.Orders);

            room.Items = null;
            Assert.NotNull(room.Items);
        }
    }
}
