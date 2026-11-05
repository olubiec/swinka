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

        public AdoptResult AdoptNamed(string pigId, bool memorial, Random rng, DateTime nowUtc)
        {
            var catalog = NamedPigs ?? NamedPigCatalog.Current;
            var def = catalog?.Find(pigId);
            if (def == null)
            {
                return AdoptResult.UnknownPig;
            }

            if (State.Roster != null)
            {
                foreach (var p in State.Roster)
                {
                    if (p != null && (string.Equals(p.NamedId, def.Id, StringComparison.OrdinalIgnoreCase) ||
                                      string.Equals(p.Id, def.Id, StringComparison.OrdinalIgnoreCase)))
                    {
                        return AdoptResult.AlreadyAdopted;
                    }
                }
            }

            if (!memorial)
            {
                bool unlocked = def.OfferAfterDays == 0 ||
                    (State.OffersStartUtc.HasValue && nowUtc >= State.OffersStartUtc.Value.AddDays(def.OfferAfterDays)) ||
                    (State.OffersSeen != null && State.OffersSeen.Contains(def.Id));
                if (!unlocked)
                {
                    return AdoptResult.NotUnlocked;
                }
            }

            int cost = memorial ? 0 : def.OfferCost;
            if (cost > 0 && State.Clovers < cost)
            {
                return AdoptResult.NotEnoughClovers;
            }

            int livingCount = CountLivingRoster(nowUtc);
            if (!memorial && livingCount >= MaxRoster)
            {
                return AdoptResult.RosterFull;
            }

            return ApplyAdoption(def, memorial, free: cost == 0, rng: rng, nowUtc: nowUtc);
        }

        public AdoptResult AdoptNamed(string pigId, bool memorial, DateTime nowUtc)
        {
            return AdoptNamed(pigId, memorial, null, nowUtc);
        }

        public AdoptResult AdoptNamed(string pigId, Random rng, DateTime nowUtc)
        {
            return AdoptNamed(pigId, false, rng, nowUtc);
        }

        public AdoptResult AdoptNamed(string pigId, DateTime nowUtc)
        {
            return AdoptNamed(pigId, false, null, nowUtc);
        }

        public AdoptResult AdoptNamed(string pigId, bool memorial = false, Random rng = null)
        {
            return AdoptNamed(pigId, memorial, rng, Clock.UtcNow);
        }

        public AdoptResult AdoptGroup(string groupId, Random rng, DateTime nowUtc)
        {
            var catalog = NamedPigs ?? NamedPigCatalog.Current;
            var groupPigs = catalog?.OfferGroup(groupId);
            if (groupPigs == null || groupPigs.Count == 0)
            {
                return AdoptResult.UnknownPig;
            }

            foreach (var def in groupPigs)
            {
                if (def == null) continue;

                bool alreadyAdopted = false;
                if (State.Roster != null)
                {
                    foreach (var p in State.Roster)
                    {
                        if (p != null && (string.Equals(p.NamedId, def.Id, StringComparison.OrdinalIgnoreCase) ||
                                          string.Equals(p.Id, def.Id, StringComparison.OrdinalIgnoreCase)))
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

                int livingCount = CountLivingRoster(nowUtc);
                if (livingCount >= MaxRoster)
                {
                    return AdoptResult.RosterFull;
                }

                ApplyAdoption(def, memorial: false, free: true, rng: rng, nowUtc: nowUtc);
            }

            return AdoptResult.Ok;
        }

        public AdoptResult AdoptGroup(string groupId, DateTime nowUtc)
        {
            return AdoptGroup(groupId, null, nowUtc);
        }

        public AdoptResult AdoptGroup(string groupId)
        {
            return AdoptGroup(groupId, null, Clock.UtcNow);
        }

        public bool SetMemorial(string pigId, bool on)
        {
            if (string.IsNullOrEmpty(pigId) || State.Roster == null)
            {
                return false;
            }

            PigProfile profile = null;
            foreach (var p in State.Roster)
            {
                if (p != null && (string.Equals(p.Id, pigId, StringComparison.OrdinalIgnoreCase) ||
                                  (p.NamedId != null && string.Equals(p.NamedId, pigId, StringComparison.OrdinalIgnoreCase))))
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
            OnMemorialChanged(pigId, on);

            if (on)
            {
                string memKey = "memorial_counted_" + (profile.NamedId ?? profile.Id);
                if (State.Stats?.Counters != null && !State.Stats.Counters.ContainsKey(memKey))
                {
                    State.Stats.Counters[memKey] = 1;
                    Count("memorial_pigs");
                }
            }

            return true;
        }

        public IReadOnlyList<string> CheckOffers(DateTime nowUtc)
        {
            if (Balance == null || !Balance.ArrivalsActive)
            {
                return Array.Empty<string>();
            }

            int pigCount = State.Roster != null ? State.Roster.Count : 0;
            if (!State.OffersStartUtc.HasValue && pigCount > 0)
            {
                State.OffersStartUtc = nowUtc;
            }

            if (!State.OffersStartUtc.HasValue)
            {
                return Array.Empty<string>();
            }

            if (State.OffersSeen == null)
            {
                State.OffersSeen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            }

            var catalog = NamedPigs ?? NamedPigCatalog.Current;
            var due = OfferChecker.Due(catalog?.Pigs, State.OffersStartUtc.Value, nowUtc, State.OffersSeen);

            var announced = new List<string>();
            foreach (var def in due)
            {
                if (def == null || string.IsNullOrEmpty(def.Id)) continue;
                State.OffersSeen.Add(def.Id);
                bool isStarter = string.Equals(def.OfferGroup, "starter", StringComparison.OrdinalIgnoreCase);
                if (!isStarter)
                {
                    announced.Add(def.Id);
                    Raise(OfferUnlocked, new OfferUnlockedEventArgs(def.Id));
                }
            }

            return announced;
        }

        public IReadOnlyList<string> CheckOffers()
        {
            return CheckOffers(Clock.UtcNow);
        }

        private int CountLivingRoster(DateTime nowUtc)
        {
            if (State.Roster == null) return 0;
            int count = 0;
            double pigDaysPerRealDay = Balance != null ? Balance.PigDaysPerRealDay : 21.0;
            DateTime fallbackBirth = State.BirthDateUtc;
            foreach (var p in State.Roster)
            {
                if (p == null) continue;
                if (p.Memorial) continue;
                var stage = PigLife.StageOf(p, nowUtc, pigDaysPerRealDay, fallbackBirth);
                if (stage == LifeStage.Legend) continue;
                count++;
            }
            return count;
        }

        private AdoptResult ApplyAdoption(NamedPigDefinition def, bool memorial, bool free, Random rng, DateTime nowUtc)
        {
            int cost = (memorial || free) ? 0 : def.OfferCost;
            if (cost > 0)
            {
                TrySpendClovers(cost);
            }

            double pigDaysPerRealDay = Balance != null ? Balance.PigDaysPerRealDay : 21.0;
            var profile = new PigProfile
            {
                Name = def.Name,
                Breed = def.Breed,
                PaletteId = def.PaletteId,
                NamedId = def.Id,
                BornAtUtc = PigLife.BornAtFor(nowUtc, def.StartAgeYears, pigDaysPerRealDay),
                ArrivedAtUtc = nowUtc,
                LegendAtYears = LegendRoll.RollFor(def, rng),
                Memorial = memorial
            };

            if (def.Traits != null)
            {
                profile.Traits.AddRange(def.Traits);
            }

            if (State.Roster == null) State.Roster = new List<PigProfile>();
            State.Roster.Add(profile);

            bool isStarter = string.Equals(def.OfferGroup, "starter", StringComparison.OrdinalIgnoreCase);
            if (!isStarter && !memorial)
            {
                var catalog = NamedPigs ?? NamedPigCatalog.Current;
                var welcomeItems = catalog?.WelcomeItems;
                if (welcomeItems != null && welcomeItems.Count > 0)
                {
                    foreach (var kv in welcomeItems)
                    {
                        AddItem(kv.Key, kv.Value);
                    }
                }
                else
                {
                    AddItem("bell_pepper", 2);
                    AddItem("parsley", 2);
                }
            }

            if (!isStarter && !memorial)
            {
                Count("pigs_arrived");
            }

            if (memorial)
            {
                string memKey = "memorial_counted_" + (profile.NamedId ?? profile.Id);
                if (State.Stats?.Counters != null && !State.Stats.Counters.ContainsKey(memKey))
                {
                    State.Stats.Counters[memKey] = 1;
                    Count("memorial_pigs");
                }
            }

            AddDiaryEntry(memorial
                ? $"Remembering {profile.Name}. Forever in the family."
                : $"Adopted {profile.Name} into the family!");

            Raise(PigAdopted, new PigAdoptedEventArgs(profile, memorial));

            return AdoptResult.Ok;
        }
    }
}
