using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.Pigs;
using Cuy.Core.Save;
using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WorldMigrationTests
    {
        [Fact]
        public void EnsureWorld_ProducesSalonWithPlacedLegacyItems()
        {
            var worldItems = WorldItemCatalog.Current;
            var catalog = ItemCatalog.LoadDefault();

            var json = @"{
                ""Name"": ""Pigi"",
                ""Version"": 1,
                ""Decor"": {
                    ""Equipped"": {
                        ""rug"": ""rug_leaves"",
                        ""poster"": ""poster_pig""
                    },
                    ""Unlocked"": [""rug_leaves"", ""poster_pig"", ""cushion_star""]
                }
            }";

            var state = JsonConvert.DeserializeObject<GameState>(json, SaveSystem.JsonSettings);
            Assert.NotNull(state);

            state.EnsureWorld(worldItems, catalog);

            Assert.True(state.World.LegacyDecorMigrated);
            Assert.True(state.World.Rooms.ContainsKey("salon"));
            var salon = state.World.Rooms["salon"];
            Assert.NotNull(salon);
            Assert.NotNull(salon.Items);
        }

        [Fact]
        public void EnsureWorld_Idempotent_RunningTwiceChangesNothing()
        {
            var worldItems = WorldItemCatalog.Current;
            var catalog = ItemCatalog.LoadDefault();

            var state = new GameState();
            state.Roster.Add(new PigProfile { Id = "pig1", Name = "Halo", Memorial = true });

            state.EnsureWorld(worldItems, catalog);

            var salonItemsCount = state.World.Rooms["salon"].Items.Count;
            var memoryCornerCount = state.World.OwnedItems["memory_corner"];

            state.EnsureWorld(worldItems, catalog);

            Assert.Equal(salonItemsCount, state.World.Rooms["salon"].Items.Count);
            Assert.Equal(memoryCornerCount, state.World.OwnedItems["memory_corner"]);
        }

        [Fact]
        public void EnsureWorld_MemorialPigGrantsExactlyOneMemoryCorner_NonMemorialNone()
        {
            var worldItems = WorldItemCatalog.Current;
            var catalog = ItemCatalog.LoadDefault();

            // Non-memorial roster
            var stateNonMemorial = new GameState();
            stateNonMemorial.Roster.Add(new PigProfile { Id = "pig1", Name = "LivePig", Memorial = false });
            stateNonMemorial.EnsureWorld(worldItems, catalog);
            Assert.False(stateNonMemorial.World.OwnedItems.ContainsKey("memory_corner"));

            // Memorial roster
            var stateMemorial = new GameState();
            stateMemorial.Roster.Add(new PigProfile { Id = "pig2", Name = "AngelPig", Memorial = true });
            stateMemorial.EnsureWorld(worldItems, catalog);
            Assert.True(stateMemorial.World.OwnedItems.ContainsKey("memory_corner"));
            Assert.Equal(1, stateMemorial.World.OwnedItems["memory_corner"]);

            // Ensure running again does not increase count
            stateMemorial.EnsureWorld(worldItems, catalog);
            Assert.Equal(1, stateMemorial.World.OwnedItems["memory_corner"]);
        }

        [Fact]
        public void VeryOldSaveWithoutNewFields_LoadsAndRoundTrips()
        {
            var json = @"{
                ""Name"": ""OldTimer"",
                ""Version"": 1,
                ""Clovers"": 150
            }";

            var state = JsonConvert.DeserializeObject<GameState>(json, SaveSystem.JsonSettings);
            Assert.NotNull(state);
            Assert.Equal("OldTimer", state.Name);
            Assert.Equal(150, state.Clovers);

            var worldItems = WorldItemCatalog.Current;
            var catalog = ItemCatalog.LoadDefault();
            state.EnsureWorld(worldItems, catalog);

            var serialized = SaveSystem.Serialize(state);
            var reloaded = JsonConvert.DeserializeObject<GameState>(serialized, SaveSystem.JsonSettings);
            Assert.NotNull(reloaded);
            Assert.Equal("OldTimer", reloaded.Name);
            Assert.Equal(150, reloaded.Clovers);
            Assert.True(reloaded.World.Rooms.ContainsKey("salon"));
        }
    }
}
