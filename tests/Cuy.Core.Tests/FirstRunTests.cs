using System;
using Cuy.Core;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class FirstRunTests
    {
        [Fact]
        public void NewGame_NeedsNamingAndIsNamedCuy()
        {
            var state = GameState.CreateNew(null, new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc));
            Assert.True(state.NeedsNaming);
            Assert.False(state.GiftNoteShown);
            Assert.Equal("Cuy", state.Name);
            Assert.NotNull(state.GrowthStartUtc);
        }

        [Fact]
        public void OldSaveWithoutNewFields_DoesNotNeedNaming()
        {
            var state = Newtonsoft.Json.JsonConvert.DeserializeObject<GameState>(
                "{\"version\":2,\"name\":\"Nibbles\",\"needs\":{}}", SaveSystem.JsonSettings);
            state.Normalize();
            Assert.False(state.NeedsNaming);
            Assert.False(state.GiftNoteShown);
        }

        [Fact]
        public void PigStaysBaby_WhenGrowthIsDisabled()
        {
            var birthUtc = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);
            var state = GameState.CreateNew("Cuy", birthUtc);
            var pet = new Pet(state, new ManualClock(birthUtc.AddDays(15)), new Balance { GrowthActive = false });
            pet.Start();
            Assert.Equal(LifeStage.Baby, pet.Stage);
        }
    }
}
