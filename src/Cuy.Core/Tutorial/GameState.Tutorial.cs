using System;
using System.Collections.Generic;

namespace Cuy.Core
{
    public sealed partial class GameState
    {
        /// <summary>Current tutorial version. Bump when major mechanics are added to the update tour.</summary>
        public const int CurrentTutorialVersion = 2;

        /// <summary>Highest tutorial version completed by the player (0 = not yet completed).</summary>
        public int TutorialVersionSeen { get; set; } = 0;

        /// <summary>Resolved tutorial flow: "fresh", "update", or "done". Null in v1.0.0 saves.</summary>
        public string TutorialKind { get; set; }

        /// <summary>Contextual hint ids already dismissed by the player.</summary>
        public HashSet<string> SeenTutorialHints { get; set; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        public void EnsureTutorialDefaults()
        {
            if (SeenTutorialHints == null)
            {
                SeenTutorialHints = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            }

            if (TutorialVersionSeen < 0)
            {
                TutorialVersionSeen = 0;
            }

            if (TutorialVersionSeen >= CurrentTutorialVersion)
            {
                TutorialKind = "done";
            }
            else if (string.IsNullOrWhiteSpace(TutorialKind))
            {
                TutorialKind = NeedsNaming ? "fresh" : "update";
            }
        }

        public string GetTutorialMode()
        {
            EnsureTutorialDefaults();
            if (TutorialVersionSeen >= CurrentTutorialVersion)
            {
                return "done";
            }

            if (string.Equals(TutorialKind, "fresh", StringComparison.OrdinalIgnoreCase))
            {
                return "fresh";
            }

            if (string.Equals(TutorialKind, "update", StringComparison.OrdinalIgnoreCase))
            {
                return "update";
            }

            return NeedsNaming ? "fresh" : "update";
        }

        public void CompleteTutorialTour()
        {
            EnsureTutorialDefaults();
            TutorialVersionSeen = CurrentTutorialVersion;
            TutorialKind = "done";
        }

        public bool MarkTutorialHintSeen(string hintId)
        {
            EnsureTutorialDefaults();
            if (string.IsNullOrWhiteSpace(hintId)) return false;
            return SeenTutorialHints.Add(hintId.Trim().ToLowerInvariant());
        }

        public void ResetTutorialHints()
        {
            EnsureTutorialDefaults();
            SeenTutorialHints.Clear();
        }

        public void ReplayTutorialTour(string mode)
        {
            EnsureTutorialDefaults();
            TutorialVersionSeen = 0;
            TutorialKind = string.Equals(mode, "update", StringComparison.OrdinalIgnoreCase)
                ? "update"
                : "fresh";
        }
    }
}
