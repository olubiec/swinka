using System.Collections.Generic;
using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WorldStatePigFieldsTests
    {
        // Shape of a world.json written before the pig room fields existed (W16-06).
        private const string OldWorldJson = @"{
            ""Version"": 1,
            ""LegacyDecorMigrated"": true,
            ""PlaceLevels"": { ""house"": 1 },
            ""RoomsUnlocked"": [ ""house"" ],
            ""Rooms"": {
                ""house"": {
                    ""Wallpaper"": ""wallpaper_mint"",
                    ""Floor"": ""floor_wood_light"",
                    ""Items"": [
                        { ""Uid"": ""a1"", ""ItemId"": ""side_table"", ""X"": 2, ""Y"": 3, ""Flip"": false }
                    ]
                }
            },
            ""OwnedItems"": { ""side_table"": 1 }
        }";

        [Fact]
        public void Defaults_AreEmptyAndVariantZeroAndNameNull()
        {
            var state = new WorldState();

            Assert.Equal(1, state.Version);
            Assert.NotNull(state.Parked);
            Assert.Empty(state.Parked);
            Assert.NotNull(state.RoomShare);
            Assert.Empty(state.RoomShare);
            Assert.NotNull(state.PigRoomsEnsured);
            Assert.Empty(state.PigRoomsEnsured);
            Assert.NotNull(state.UnlockedVariants);
            Assert.Empty(state.UnlockedVariants);

            Assert.Equal(0, new PlacedItem().Variant);
            Assert.Null(new RoomLayout().Name);
        }

        [Fact]
        public void LayoutWithVariantAndName_RoundTripsThroughJson()
        {
            var layout = new RoomLayout
            {
                Wallpaper = "wallpaper_peach",
                Floor = "floor_carpet_red",
                Name = "Kuki's room",
            };
            layout.Items.Add(new PlacedItem { Uid = "u1", ItemId = "sofa_cosy", X = 1, Y = 2, Variant = 2 });

            string json = JsonConvert.SerializeObject(layout);
            var loaded = JsonConvert.DeserializeObject<RoomLayout>(json);

            Assert.Equal("Kuki's room", loaded.Name);
            Assert.Single(loaded.Items);
            Assert.Equal(2, loaded.Items[0].Variant);
            Assert.Equal("sofa_cosy", loaded.Items[0].ItemId);
        }

        [Fact]
        public void PigFields_RoundTripThroughWorldJson()
        {
            var state = new WorldState();
            var parked = new RoomLayout { Name = "Ned's room" };
            parked.Items.Add(new PlacedItem { Uid = "p1", ItemId = "armchair", Variant = 3 });
            state.Parked["ned"] = parked;
            state.RoomShare["ned"] = "dorm";
            state.PigRoomsEnsured.Add("ned");
            state.UnlockedVariants.Add("armchair:3");

            var loaded = JsonConvert.DeserializeObject<WorldState>(JsonConvert.SerializeObject(state));

            Assert.Equal("Ned's room", loaded.Parked["ned"].Name);
            Assert.Equal(3, loaded.Parked["ned"].Items[0].Variant);
            Assert.Equal("dorm", loaded.RoomShare["ned"]);
            Assert.Contains("ned", loaded.PigRoomsEnsured);
            Assert.Contains("armchair:3", loaded.UnlockedVariants);
        }

        [Fact]
        public void OldWorldJson_LoadsWithVariantZeroNullNameAndEmptyNewCollections()
        {
            var state = JsonConvert.DeserializeObject<WorldState>(OldWorldJson);

            Assert.Equal(1, state.Version);
            Assert.Equal("house", state.RoomsUnlocked.First());
            var item = state.Rooms["house"].Items[0];
            Assert.Equal("side_table", item.ItemId);
            Assert.Equal(0, item.Variant);
            Assert.Null(state.Rooms["house"].Name);

            Assert.Empty(state.Parked);
            Assert.Empty(state.RoomShare);
            Assert.Empty(state.PigRoomsEnsured);
            Assert.Empty(state.UnlockedVariants);
        }

        [Fact]
        public void NewCollectionSetToNullInJson_GivesEmptyOnAccess()
        {
            const string json = @"{ ""Parked"": null, ""RoomShare"": null, ""PigRoomsEnsured"": null, ""UnlockedVariants"": null }";

            var state = JsonConvert.DeserializeObject<WorldState>(json);

            Assert.NotNull(state.Parked);
            Assert.Empty(state.Parked);
            Assert.NotNull(state.RoomShare);
            Assert.Empty(state.RoomShare);
            Assert.NotNull(state.PigRoomsEnsured);
            Assert.Empty(state.PigRoomsEnsured);
            Assert.NotNull(state.UnlockedVariants);
            Assert.Empty(state.UnlockedVariants);
        }

        [Fact]
        public void NewCollectionAssignedNull_GivesEmptyOnAccess()
        {
            var state = new WorldState();
            state.Parked = null;
            state.RoomShare = null;
            state.PigRoomsEnsured = null;
            state.UnlockedVariants = null;

            Assert.Empty(state.Parked);
            Assert.Empty(state.RoomShare);
            Assert.Empty(state.PigRoomsEnsured);
            Assert.Empty(state.UnlockedVariants);
        }
    }
}
