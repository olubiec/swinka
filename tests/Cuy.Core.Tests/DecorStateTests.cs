using System;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class DecorStateTests
    {
        [Fact]
        public void EquipAndUnequip_WorksForValidSlots()
        {
            var state = new GameState();

            state.EquipDecor("wallpaper", "wallpaper_mint");
            Assert.Equal("wallpaper_mint", state.Decor.Equipped["wallpaper"]);

            state.UnequipDecor("wallpaper");
            Assert.Null(state.Decor.Equipped["wallpaper"]);
        }

        [Fact]
        public void Equip_RejectsUnknownSlot()
        {
            var state = new GameState();

            Assert.Throws<ArgumentException>(() => state.EquipDecor("ceiling", "lamp_star"));
        }

        [Fact]
        public void JsonRoundTrip_PreservesDecor()
        {
            var state = new GameState();
            state.EquipDecor("wallpaper", "wallpaper_mint");
            state.EquipDecor("plant", "plant_fern");

            string json = JsonConvert.SerializeObject(state);
            var loaded = JsonConvert.DeserializeObject<GameState>(json);
            loaded.Normalize();

            Assert.NotNull(loaded.Decor);
            Assert.Equal("wallpaper_mint", loaded.Decor.Equipped["wallpaper"]);
            Assert.Equal("plant_fern", loaded.Decor.Equipped["plant"]);
            Assert.False(loaded.Decor.Equipped.ContainsKey("rug"));
        }

        [Fact]
        public void OldSaveWithoutDecor_LoadsSuccessfully()
        {
            string json = @"{ ""Version"": 2, ""Name"": ""Cuy"" }";
            var loaded = JsonConvert.DeserializeObject<GameState>(json);
            loaded.Normalize();

            Assert.NotNull(loaded.Decor);
            Assert.NotNull(loaded.Decor.Equipped);
            Assert.Empty(loaded.Decor.Equipped);
        }
    }
}
