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

            DateTime now = nowUtc ?? DateTime.UtcNow;

            var starterDefs = new List<NamedPigDefinition>();
            if (catalog != null)
            {
                var starterGroup = catalog.OfferGroup("starter");
                if (starterGroup != null && starterGroup.Count > 0)
                {
                    starterDefs.AddRange(starterGroup);
                }
                else
                {
                    var kuki = catalog.Find("kuki");
                    var ned = catalog.Find("ned");
                    if (kuki != null && ned != null)
                    {
                        starterDefs.Add(kuki);
                        starterDefs.Add(ned);
                    }
                }
            }

            if (Roster.Count == 0)
            {
                if (starterDefs.Count > 0)
                {
                    double pigDaysPerRealDay = new Balance().PigDaysPerRealDay;
                    foreach (var def in starterDefs)
                    {
                        var pig = new PigProfile(def.Name, def.Breed, def.PaletteId)
                        {
                            NamedId = def.Id,
                            ArrivedAtUtc = now,
                            BornAtUtc = PigLife.BornAtFor(now, def.StartAgeYears, pigDaysPerRealDay)
                        };
                        if (def.Traits != null)
                        {
                            pig.Traits.AddRange(def.Traits);
                        }
                        LegendRoll.Assign(pig, def, rng);
                        Roster.Add(pig);
                    }

                    ActivePigIds.Clear();
                    foreach (var pig in Roster)
                    {
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
                if (starterDefs.Count > 0 && !OffersStartUtc.HasValue)
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
