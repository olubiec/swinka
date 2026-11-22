using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Input;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class TutorialFeature : HomeFeatureBase
    {
        public override string Id => "tutorial";

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var gs = brain?.Session?.Pet?.State;
            if (gs == null)
            {
                state["tutorial"] = new
                {
                    versionSeen = 0,
                    currentVersion = GameState.CurrentTutorialVersion,
                    mode = "done",
                    seenHints = Array.Empty<string>()
                };
                return;
            }

            gs.EnsureTutorialDefaults();
            state["tutorial"] = new
            {
                versionSeen = gs.TutorialVersionSeen,
                currentVersion = GameState.CurrentTutorialVersion,
                mode = gs.GetTutorialMode(),
                seenHints = gs.SeenTutorialHints.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToArray()
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (string.IsNullOrEmpty(type) || !type.StartsWith("tutorial.", StringComparison.Ordinal))
            {
                return false;
            }

            var validation = MessageValidator.Validate(message);
            if (!validation.IsOk)
            {
                BrainController.Log("[Tutorial] Invalid message: " + validation.Error);
                return true;
            }

            var gs = brain?.Session?.Pet?.State;
            if (gs == null) return true;

            switch (type)
            {
                case "tutorial.completeTour":
                {
                    string mode = message.Value<string>("mode");
                    gs.CompleteTutorialTour();
                    if (string.Equals(mode, "update", StringComparison.OrdinalIgnoreCase))
                    {
                        gs.MarkTutorialHintSeen("games");
                        gs.MarkTutorialHintSeen("more");
                    }
                    brain.Session?.AutoSaver?.SaveNow();
                    HomeWindow.NotifyStateChanged();
                    return true;
                }
                case "tutorial.markHint":
                {
                    string hintId = message.Value<string>("hintId");
                    if (gs.MarkTutorialHintSeen(hintId))
                    {
                        brain.Session?.AutoSaver?.SaveNow();
                    }
                    HomeWindow.NotifyStateChanged();
                    return true;
                }
                case "tutorial.resetHints":
                {
                    gs.ResetTutorialHints();
                    brain.Session?.AutoSaver?.SaveNow();
                    HomeWindow.NotifyStateChanged();
                    return true;
                }
                case "tutorial.replayTour":
                {
                    string mode = message.Value<string>("mode");
                    gs.ReplayTutorialTour(mode);
                    brain.Session?.AutoSaver?.SaveNow();
                    HomeWindow.NotifyStateChanged();
                    return true;
                }
            }

            return false;
        }
    }
}
