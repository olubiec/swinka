using System;
using System.Collections.Generic;

namespace Cuy.Core.AI
{
    /// <summary>
    /// A decision made by the Brain (Utility AI): animation, duration and movement distance.
    /// </summary>
    public sealed class ActionDecision
    {
        public ActionDecision(
            string actionId,
            string animationName,
            TimeSpan duration,
            int moveDistancePx,
            string group,
            IReadOnlyDictionary<string, double> effects,
            double score,
            ActionDefinition definition)
        {
            ActionId = actionId ?? string.Empty;
            AnimationName = animationName ?? string.Empty;
            Duration = duration;
            MoveDistancePx = moveDistancePx;
            Group = group ?? string.Empty;
            Effects = effects ?? new Dictionary<string, double>();
            Score = score;
            Definition = definition;
        }

        /// <summary>Action id from actions.json (e.g. "walk", "eat_hay").</summary>
        public string ActionId { get; }

        /// <summary>Animation name for the renderer (e.g. "walk", "idle", "eat").</summary>
        public string AnimationName { get; }

        /// <summary>Random duration of the action (from the duration_s range).</summary>
        public TimeSpan Duration { get; }

        /// <summary>Movement distance in pixels (from distance_px for a walk, 0 for stationary actions).</summary>
        public int MoveDistancePx { get; }

        /// <summary>Day budget group (e.g. "walking", "eating_and_drinking").</summary>
        public string Group { get; }

        /// <summary>Effect on needs after the action.</summary>
        public IReadOnlyDictionary<string, double> Effects { get; }

        /// <summary>Utility score computed by the AI formula.</summary>
        public double Score { get; }

        /// <summary>Full action definition.</summary>
        public ActionDefinition Definition { get; }

        public override string ToString()
        {
            return string.Format("{0} ({1}, {2:0.#}s, {3}px, score: {4:0.00})",
                ActionId, AnimationName, Duration.TotalSeconds, MoveDistancePx, Score);
        }
    }
}
