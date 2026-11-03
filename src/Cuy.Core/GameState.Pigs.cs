using System;
using System.Collections.Generic;
using Cuy.Core.Pigs;

namespace Cuy.Core
{
    public partial class GameState
    {
        public List<PigProfile> Roster { get; set; } = new List<PigProfile>();
        public List<string> ActivePigIds { get; set; } = new List<string>();
        public DateTime? OffersStartUtc { get; set; }
        public HashSet<string> OffersSeen { get; set; } = new HashSet<string>();

        public void EnsureRosterInitialized()
        {
            if (Roster == null) Roster = new List<PigProfile>();
            if (ActivePigIds == null) ActivePigIds = new List<string>();
            if (OffersSeen == null) OffersSeen = new HashSet<string>();

            if (Roster.Count == 0)
            {
                var initialPig = new PigProfile(Name ?? "Cuy", "smooth", "tricolor");
                initialPig.Traits.Add("cuddly");
                initialPig.DiscoverTrait("cuddly");
                Roster.Add(initialPig);
            }

            if (ActivePigIds.Count == 0 && Roster.Count > 0)
            {
                ActivePigIds.Add(Roster[0].Id);
            }

            // Clamp active pigs to max 2
            if (ActivePigIds.Count > 2)
            {
                ActivePigIds = ActivePigIds.GetRange(0, 2);
            }
        }
    }
}
