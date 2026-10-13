using System;
using System.Collections.Generic;

namespace Cuy.Core.AI
{
    /// <summary>
    /// Decyzja podjęta przez Brain (Utility AI) – wskazuje animację, czas trwania i dystans ruchu.
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

        /// <summary>Identyfikator czynności z actions.json (np. "spacer", "jedzenie_siana").</summary>
        public string ActionId { get; }

        /// <summary>Nazwa animacji dla silnika graficznego (np. "walk", "idle", "eat").</summary>
        public string AnimationName { get; }

        /// <summary>Wylosowany czas trwania czynności (z zakresu czas_s).</summary>
        public TimeSpan Duration { get; }

        /// <summary>Dystans ruchu w pikselach (dla spaceru z dystans_px, dla czynności stacjonarnych 0).</summary>
        public int MoveDistancePx { get; }

        /// <summary>Grupa budżetu dnia (np. "chodzenie", "jedzenie_i_picie").</summary>
        public string Group { get; }

        /// <summary>Wpływ na potrzeby po wykonaniu.</summary>
        public IReadOnlyDictionary<string, double> Effects { get; }

        /// <summary>Wartość zysku (utility) wyliczona przez wzór AI.</summary>
        public double Score { get; }

        /// <summary>Pełna definicja czynności.</summary>
        public ActionDefinition Definition { get; }

        public override string ToString()
        {
            return string.Format("{0} ({1}, {2:0.#}s, {3}px, zysk: {4:0.00})",
                ActionId, AnimationName, Duration.TotalSeconds, MoveDistancePx, Score);
        }
    }
}
