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

        public void EnsureRosterInitialized(NamedPigCatalog catalog = null, Random rng = null, DateTime? nowUtc = null)
        {
            if (Roster == null) Roster = new List<PigProfile>();
            if (ActivePigIds == null) ActivePigIds = new List<string>();
            if (OffersSeen == null) OffersSeen = new HashSet<string>();

            var starterPigs = catalog?.OfferGroup("starter");
            if ((starterPigs == null || starterPigs.Count == 0) && catalog != null)
            {
                var kuki = catalog.Find("kuki");
                var ned = catalog.Find("ned");
                if (kuki != null && ned != null)
                {
                    starterPigs = new List<NamedPigDefinition> { kuki, ned };
                }
            }

            bool hasStartOffers = starterPigs != null && starterPigs.Count > 0;
            var now = nowUtc ?? DateTime.UtcNow;
            var r = rng ?? new Random();

            if (Roster.Count == 0)
            {
                if (hasStartOffers)
                {
                    ActivePigIds.Clear();
                    foreach (var def in starterPigs)
                    {
                        var pig = new PigProfile(def.Name, def.Breed, def.PaletteId)
                        {
                            NamedId = def.Id,
                            BornAtUtc = PigLife.BornAtFor(now, def.StartAgeYears, new Balance().PigDaysPerRealDay),
                            ArrivedAtUtc = now,
                            Traits = def.Traits != null ? new List<string>(def.Traits) : new List<string>()
                        };
                        LegendRoll.Assign(pig, def, r);
                        Roster.Add(pig);
                        ActivePigIds.Add(pig.Id);
                    }

                    if (!OffersStartUtc.HasValue)
                    {
                        OffersStartUtc = now;
                    }
                }
                else
                {
                    var initialPig = new PigProfile(Name ?? "Cuy", "smooth", "tricolor");
                    initialPig.Traits.Add("cuddly");
                    initialPig.DiscoverTrait("cuddly");
                    Roster.Add(initialPig);
                }
            }
            else
            {
                if (hasStartOffers && !OffersStartUtc.HasValue)
                {
                    OffersStartUtc = now;
                }
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
