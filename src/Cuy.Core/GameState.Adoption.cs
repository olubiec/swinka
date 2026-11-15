using System;
using System.Linq;
using Cuy.Core.Pigs;

namespace Cuy.Core
{
    public partial class GameState
    {
        /// <summary>
        /// Whether the adoption gate for Kuki and Ned has been opened/unlocked.
        /// Defaults to false so new games start with an ordinary pig only.
        /// </summary>
        public bool AdoptionGateOpen { get; set; } = false;

        /// <summary>
        /// Timestamp in UTC when the Kuki and Ned adoption offer becomes available.
        /// Set when the starter pig reaches the threshold stage plus random delay.
        /// </summary>
        public DateTime? AdoptionOfferAvailableAtUtc { get; set; }

        /// <summary>
        /// Whether the Kuki and Ned adoption offer has been accepted.
        /// </summary>
        public bool AdoptionOfferAccepted { get; set; } = false;

        /// <summary>
        /// Checks whether a pig with the given named ID exists in the roster.
        /// </summary>
        public bool HasNamedPig(string namedId)
        {
            if (Roster == null || string.IsNullOrWhiteSpace(namedId)) return false;
            for (int i = 0; i < Roster.Count; i++)
            {
                var pig = Roster[i];
                if (pig != null && string.Equals(pig.NamedId, namedId, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// Synchronizes the adoption gate state with the roster contents (for backward compatibility).
        /// If an old save already has Kuki or Ned in the roster, the gate is marked open.
        /// </summary>
        public void SyncAdoptionGate()
        {
            if (HasNamedPig("kuki") || HasNamedPig("ned"))
            {
                AdoptionGateOpen = true;
                AdoptionOfferAccepted = true;
            }
        }
    }
}
