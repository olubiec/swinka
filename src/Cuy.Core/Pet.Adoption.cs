using System;
using System.Collections.Generic;
using Cuy.Core.Pigs;

namespace Cuy.Core
{
    public enum AdoptResult
    {
        Ok,
        UnknownPig,
        AlreadyAdopted,
        NotUnlocked,
        NotEnoughClovers,
        RosterFull
    }

    public sealed partial class Pet
    {
        public event EventHandler<OfferUnlockedEventArgs> OfferUnlocked;
        public event EventHandler<PigAdoptedEventArgs> PigAdopted;

        public int MaxRoster { get; set; } = 7;

        private readonly HashSet<string> _memorialCountedPigs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        public AdoptResult AdoptNamed(string pigId, bool memorial, Random rng, DateTime nowUtc)
        {
            return AdoptNamedInternal(pigId, memorial, free: false, rng: rng, nowUtc: nowUtc);
        }

        public AdoptResult AdoptNamed(string pigId, bool memorial = false)
        {
            return AdoptNamed(pigId, memorial, null, Clock?.UtcNow ?? DateTime.UtcNow);
        }

        public AdoptResult AdoptGroup(string groupId, bool memorial, Random rng, DateTime nowUtc)
        {
            if (string.IsNullOrEmpty(groupId))
            {
                return AdoptResult.UnknownPig;
            }

            var catalog = NamedPigs;
            var groupPigs = catalog?.OfferGroup(groupId);
            if (groupPigs == null || groupPigs.Count == 0)
            {
                return AdoptResult.UnknownPig;
            }

            var actualRng = rng ?? new Random();
            int adoptedCount = 0;

            for (int i = 0; i < groupPigs.Count; i++)
            {
                var def = groupPigs[i];
                if (def == null) continue;

                bool alreadyAdopted = false;
                if (State.Roster != null)
                {
                    for (int j = 0; j < State.Roster.Count; j++)
                    {
                        var p = State.Roster[j];
                        if (p != null && string.Equals(p.NamedId, def.Id, StringComparison.OrdinalIgnoreCase))
                        {
                            alreadyAdopted = true;
                            break;
                        }
                    }
                }

                if (alreadyAdopted)
                {
                    continue;
                }

                var result = AdoptNamedInternal(def.Id, memorial: memorial, free: true, rng: actualRng, nowUtc: nowUtc);
                if (result != AdoptResult.Ok)
                {
                    return result;
                }
                adoptedCount++;
            }

            if (adoptedCount == 0)
            {
                return AdoptResult.AlreadyAdopted;
            }

            return AdoptResult.Ok;
        }

        public AdoptResult AdoptGroup(string groupId, bool memorial = false)
        {
            return AdoptGroup(groupId, memorial, null, Clock?.UtcNow ?? DateTime.UtcNow);
        }

        private AdoptResult AdoptNamedInternal(string pigId, bool memorial, bool free, Random rng, DateTime nowUtc)
        {
            if (string.IsNullOrEmpty(pigId))
            {
                return AdoptResult.UnknownPig;
            }

            var catalog = NamedPigs;
            var def = catalog?.Find(pigId);
            if (def == null)
            {
                return AdoptResult.UnknownPig;
            }

            // 1. AlreadyAdopted check
            if (State.Roster != null)
            {
                for (int i = 0; i < State.Roster.Count; i++)
                {
                    var p = State.Roster[i];
                    if (p != null && string.Equals(p.NamedId, def.Id, StringComparison.OrdinalIgnoreCase))
                    {
                        return AdoptResult.AlreadyAdopted;
                    }
                }
            }

            // 2. NotUnlocked check (memorial adoption is always immediate)
            if (!memorial && def.OfferAfterDays > 0)
            {
                if (!State.OffersStartUtc.HasValue || nowUtc < State.OffersStartUtc.Value.AddDays(def.OfferAfterDays))
                {
                    return AdoptResult.NotUnlocked;
                }
            }

            // 3. NotEnoughClovers check
            bool isStarter = string.Equals(def.OfferGroup, "starter", StringComparison.OrdinalIgnoreCase);
            int cost = (free || memorial || isStarter) ? 0 : def.OfferCost;
            if (cost > 0 && State.Clovers < cost)
            {
                return AdoptResult.NotEnoughClovers;
            }

            // 4. RosterFull check
            // The roster limit counts only living pigs that are not in the legend stage and not memorial,
            // so legends and memorial pigs never block a new adoption.
            if (!memorial)
            {
                int livingCount = 0;
                if (State.Roster != null)
                {
                    for (int i = 0; i < State.Roster.Count; i++)
                    {
                        var p = State.Roster[i];
                        if (p == null) continue;
                        if (p.Memorial) continue;
                        var stage = PigLife.StageOf(p, nowUtc, Balance.PigDaysPerRealDay, State.BirthDateUtc);
                        if (stage == LifeStage.Legend) continue;
                        livingCount++;
                    }
                }

                if (MaxRoster > 0 && livingCount >= MaxRoster)
                {
                    return AdoptResult.RosterFull;
                }
            }

            // Success: create profile
            var profile = new PigProfile
            {
                Name = def.Name,
                Breed = def.Breed,
                PaletteId = def.PaletteId,
                NamedId = def.Id,
                BornAtUtc = PigLife.BornAtFor(nowUtc, def.StartAgeYears, Balance.PigDaysPerRealDay),
                ArrivedAtUtc = nowUtc,
                Memorial = memorial
            };

            if (def.Traits != null)
            {
                profile.Traits.AddRange(def.Traits);
            }

            var actualRng = rng ?? new Random();
            LegendRoll.Assign(profile, def, actualRng);

            // Spend cost
            if (cost > 0)
            {
                TrySpendClovers(cost);
            }

            // Add to roster
            if (State.Roster == null)
            {
                State.Roster = new List<PigProfile>();
            }
            State.Roster.Add(profile);

            // Start offers clock on first pig adoption if not started yet
            if (!State.OffersStartUtc.HasValue && State.Roster.Count > 0)
            {
                State.OffersStartUtc = nowUtc;
            }

            if (State.OffersSeen == null)
            {
                State.OffersSeen = new HashSet<string>();
            }
            State.OffersSeen.Add(def.Id);

            // Welcome items (only for non-starter, non-memorial)
            if (!memorial && !isStarter)
            {
                if (catalog?.WelcomeItems != null && catalog.WelcomeItems.Count > 0)
                {
                    foreach (var kvp in catalog.WelcomeItems)
                    {
                        AddItem(kvp.Key, kvp.Value);
                    }
                }
                else
                {
                    AddItem("bell_pepper", 2);
                    AddItem("parsley", 2);
                }
            }

            // Counters
            if (!memorial && !isStarter)
            {
                Count("pigs_arrived");
            }

            if (memorial)
            {
                RecordMemorialCounterOnce(profile);
            }

            // Diary line
            AddDiaryEntry($"Adopted {profile.Name}!");

            // Raise PigAdopted event
            try
            {
                PigAdopted?.Invoke(this, new PigAdoptedEventArgs(profile, memorial));
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"[Adoption] PigAdopted event error: {ex.Message}");
            }

            return AdoptResult.Ok;
        }

        public bool SetMemorial(string pigId, bool on)
        {
            if (string.IsNullOrEmpty(pigId) || State.Roster == null)
            {
                return false;
            }

            PigProfile profile = null;
            for (int i = 0; i < State.Roster.Count; i++)
            {
                var p = State.Roster[i];
                if (p == null) continue;
                if (string.Equals(p.Id, pigId, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p.NamedId, pigId, StringComparison.OrdinalIgnoreCase))
                {
                    profile = p;
                    break;
                }
            }

            if (profile == null)
            {
                return false;
            }

            profile.Memorial = on;
            if (on)
            {
                RecordMemorialCounterOnce(profile);
            }

            return true;
        }

        private bool RecordMemorialCounterOnce(PigProfile profile)
        {
            if (profile == null) return false;
            string key = !string.IsNullOrEmpty(profile.NamedId) ? profile.NamedId : profile.Id;
            string counterKey = "memorial_seen_" + key.ToLowerInvariant();

            if (_memorialCountedPigs.Contains(key) ||
                _memorialCountedPigs.Contains(profile.Id) ||
                (profile.NamedId != null && _memorialCountedPigs.Contains(profile.NamedId)) ||
                (State.Stats?.Counters != null && State.Stats.Counters.ContainsKey(counterKey)))
            {
                _memorialCountedPigs.Add(key);
                _memorialCountedPigs.Add(profile.Id);
                if (!string.IsNullOrEmpty(profile.NamedId)) _memorialCountedPigs.Add(profile.NamedId);
                return false;
            }

            _memorialCountedPigs.Add(key);
            _memorialCountedPigs.Add(profile.Id);
            if (!string.IsNullOrEmpty(profile.NamedId)) _memorialCountedPigs.Add(profile.NamedId);
            if (State.Stats?.Counters != null)
            {
                State.Stats.Counters[counterKey] = 1;
            }
            Count("memorial_pigs");
            return true;
        }

        public IReadOnlyList<string> CheckOffers(DateTime nowUtc)
        {
            if (Balance == null || !Balance.ArrivalsActive)
            {
                return Array.Empty<string>();
            }

            if (State.OffersSeen == null)
            {
                State.OffersSeen = new HashSet<string>();
            }

            int pigCount = State.Roster != null ? State.Roster.Count : 0;
            if (!State.OffersStartUtc.HasValue)
            {
                if (pigCount > 0)
                {
                    State.OffersStartUtc = nowUtc;
                }
                else
                {
                    return Array.Empty<string>();
                }
            }

            var catalog = NamedPigs;
            if (catalog == null || catalog.Pigs == null || catalog.Pigs.Count == 0)
            {
                return Array.Empty<string>();
            }

            var due = OfferChecker.Due(catalog.Pigs, State.OffersStartUtc.Value, nowUtc, State.OffersSeen);
            if (due == null || due.Count == 0)
            {
                return Array.Empty<string>();
            }

            var announced = new List<string>();
            for (int i = 0; i < due.Count; i++)
            {
                var pig = due[i];
                if (pig == null || string.IsNullOrEmpty(pig.Id)) continue;

                State.OffersSeen.Add(pig.Id);

                bool isStarter = string.Equals(pig.OfferGroup, "starter", StringComparison.OrdinalIgnoreCase);
                if (!isStarter)
                {
                    announced.Add(pig.Id);
                    try
                    {
                        OfferUnlocked?.Invoke(this, new OfferUnlockedEventArgs(pig.Id));
                    }
                    catch (Exception ex)
                    {
                        ItemCatalog.ErrorLogger?.Invoke($"[Adoption] OfferUnlocked event error: {ex.Message}");
                    }
                }
            }

            return announced;
        }

        public IReadOnlyList<string> CheckOffers()
        {
            return CheckOffers(Clock?.UtcNow ?? DateTime.UtcNow);
        }
    }
}
