using System;
using Cuy.Core;
using Cuy.Core.Input;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class TutorialTests
    {
        [Fact]
        public void NewSave_StartsInFreshTutorialMode()
        {
            var state = GameState.CreateNew("Cuy", new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            state.Normalize();

            Assert.Equal("fresh", state.GetTutorialMode());
            Assert.Equal(0, state.TutorialVersionSeen);
            Assert.Empty(state.SeenTutorialHints);
        }

        [Fact]
        public void LegacySave_WithoutTutorialFields_StartsInUpdateTutorialMode()
        {
            var legacy = new GameState
            {
                Name = "Piko",
                NeedsNaming = false,
                TutorialVersionSeen = 0,
                TutorialKind = null,
                BirthDateUtc = new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc),
                LastActiveUtc = new DateTime(2025, 6, 1, 12, 0, 0, DateTimeKind.Utc)
            };

            legacy.Normalize();

            Assert.Equal("update", legacy.GetTutorialMode());
        }

        [Fact]
        public void CompleteMarkResetReplay_WorkAsExpected()
        {
            var state = GameState.CreateNew("Cuy", DateTime.UtcNow);
            state.NeedsNaming = false;
            state.TutorialKind = "fresh";

            Assert.Equal("fresh", state.GetTutorialMode());

            state.CompleteTutorialTour();
            Assert.Equal("done", state.GetTutorialMode());
            Assert.Equal(GameState.CurrentTutorialVersion, state.TutorialVersionSeen);

            Assert.True(state.MarkTutorialHintSeen("places"));
            Assert.False(state.MarkTutorialHintSeen("PLACES"));
            Assert.Contains("places", state.SeenTutorialHints);

            state.ResetTutorialHints();
            Assert.Empty(state.SeenTutorialHints);

            state.ReplayTutorialTour("update");
            Assert.Equal("update", state.GetTutorialMode());
            Assert.Equal(0, state.TutorialVersionSeen);
        }

        [Fact]
        public void MessageValidator_AcceptsTutorialMessagesAndRejectsInvalidMarkHint()
        {
            Assert.True(MessageValidator.Validate(JObject.Parse(@"{""type"":""tutorial.completeTour"",""mode"":""fresh""}")).IsOk);
            Assert.True(MessageValidator.Validate(JObject.Parse(@"{""type"":""tutorial.markHint"",""hintId"":""editor""}")).IsOk);
            Assert.True(MessageValidator.Validate(JObject.Parse(@"{""type"":""tutorial.resetHints""}")).IsOk);
            Assert.True(MessageValidator.Validate(JObject.Parse(@"{""type"":""tutorial.replayTour"",""mode"":""update""}")).IsOk);
            Assert.True(MessageValidator.Validate(JObject.Parse(@"{""type"":""tutorial.markHint""}")).IsInvalid);
        }
    }
}
