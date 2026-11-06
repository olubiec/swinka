using System;
using Cuy.Core.Pigs;

namespace Cuy.Core
{
    public partial class GameState
    {
        /// <summary>True once Kuki and Ned may be offered (or already live in the roster). Old saves: false, migrated by AdoptionGate.Evaluate.</summary>
        public bool AdoptionGateOpen { get; set; }
        public DateTime? AdoptionStageReachedUtc { get; set; }
        public DateTime? AdoptionOfferAtUtc { get; set; }
        public bool AdoptionAccepted { get; set; }

        /// <summary>The adoption offer is shown: gate open, not accepted, and the gate pigs are not in the roster yet.</summary>
        public bool IsAdoptionOfferPending(AdoptionGateConfig config = null, NamedPigCatalog catalog = null)
        {
            if (!AdoptionGateOpen || AdoptionAccepted) return false;
            config = config ?? AdoptionGateConfig.Current;
            catalog = catalog ?? NamedPigCatalog.Current;
            var group = catalog?.OfferGroup(config.OfferGroup);
            if (group == null || group.Count == 0) return false;
            foreach (var def in group)
            {
                if (def != null && !AdoptionGate.HasPig(this, def.Id)) return true;
            }
            return false;
        }

        /// <summary>New game: one ordinary pig with the default skin. Does nothing when the roster is not empty.</summary>
        public PigProfile EnsureStarterPig(DateTime nowUtc, AdoptionGateConfig config = null)
        {
            if (Roster == null) Roster = new System.Collections.Generic.List<PigProfile>();
            if (ActivePigIds == null) ActivePigIds = new System.Collections.Generic.List<string>();
            if (Roster.Count > 0) return null;

            config = config ?? AdoptionGateConfig.Current;
            var pig = new PigProfile(Name ?? "Cuy", config.StarterBreed, config.StarterPaletteId)
            {
                BornAtUtc = nowUtc,
                ArrivedAtUtc = nowUtc
            };
            pig.Traits.Add("cuddly");
            pig.DiscoverTrait("cuddly");
            Roster.Add(pig);
            ActivePigIds.Clear();
            ActivePigIds.Add(pig.Id);
            return pig;
        }
    }
}
