using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Pigs;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    /// <summary>My Pigs: publishes the roster (breed, palette, traits, age, offers) and handles adopting and bringing pigs to the desk.</summary>
    public class PigsFeature : HomeFeatureBase
    {
        private static readonly string[] DefaultNames = { "Piko", "Milo", "Luna", "Koko", "Buba", "Zuzu" };

        public override string Id { get { return "pigs"; } }

        private static JObject LoadConfig()
        {
            try
            {
                string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "data", "pigs.json");
                if (File.Exists(path)) return JObject.Parse(File.ReadAllText(path));
            }
            catch (Exception ex)
            {
                BrainController.Log("[WARN] PigsFeature.LoadConfig: " + ex.Message);
            }
            return new JObject();
        }

        private static int CountLivingRoster(GameState gs, Pet pet, DateTime nowUtc)
        {
            if (gs?.Roster == null) return 0;
            int count = 0;
            double pigDaysPerRealDay = pet?.Balance != null ? pet.Balance.PigDaysPerRealDay : 21.0;
            DateTime fallbackBirth = gs.BirthDateUtc;
            foreach (var p in gs.Roster)
            {
                if (p == null) continue;
                if (p.Memorial) continue;
                var stage = PigLife.StageOf(p, nowUtc, pigDaysPerRealDay, fallbackBirth);
                if (stage == LifeStage.Legend) continue;
                count++;
            }
            return count;
        }

        public override void Tick(TimeSpan gameElapsed, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet != null)
            {
                var nowUtc = pet.Clock != null ? pet.Clock.UtcNow : DateTime.UtcNow;
                pet.CheckOffers(nowUtc);
            }
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            var gs = pet?.State;
            if (gs == null) return;
            gs.EnsureRosterInitialized();

            var catalog = pet.NamedPigs ?? NamedPigCatalog.Current;
            DateTime nowUtc = pet.Clock != null ? pet.Clock.UtcNow : DateTime.UtcNow;
            pet.CheckOffers(nowUtc);

            double pigDaysPerRealDay = pet.Balance != null ? pet.Balance.PigDaysPerRealDay : 21.0;
            DateTime fallbackBirth = gs.BirthDateUtc;

            var rosterList = new List<object>();
            foreach (var p in gs.Roster)
            {
                if (p == null) continue;

                var age = PigLife.AgeOf(p, nowUtc, pigDaysPerRealDay, fallbackBirth);
                double ageYears = Math.Round(age.PigDays / LifeStages.DaysPerYear, 1);
                var stageEnum = PigLife.StageOf(p, nowUtc, pigDaysPerRealDay, fallbackBirth);
                string stage = LifeStages.DataKey(stageEnum);

                var namedDef = !string.IsNullOrEmpty(p.NamedId) ? catalog?.Find(p.NamedId) : null;
                string blurb = namedDef?.Blurb ?? string.Empty;

                Dictionary<string, double> roundedModifiers = null;
                if (namedDef?.Modifiers != null)
                {
                    roundedModifiers = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
                    foreach (var kv in namedDef.Modifiers)
                    {
                        roundedModifiers[kv.Key] = Math.Round(kv.Value, 2);
                    }
                }

                var pigMap = new Dictionary<string, object>
                {
                    ["id"] = p.Id,
                    ["name"] = p.Name,
                    ["breed"] = p.Breed,
                    ["paletteId"] = p.PaletteId,
                    ["traits"] = p.Traits != null ? p.Traits.ToList() : new List<string>(),
                    ["discoveredTraits"] = p.DiscoveredTraits != null ? p.DiscoveredTraits.ToList() : new List<string>(),
                    ["namedId"] = p.NamedId,
                    ["ageYears"] = ageYears,
                    ["stage"] = stage,
                    ["memorial"] = p.Memorial,
                    ["blurb"] = blurb
                };

                if (namedDef != null && roundedModifiers != null)
                {
                    pigMap["modifiers"] = roundedModifiers;
                }

                rosterList.Add(pigMap);
            }

            state["roster"] = rosterList;
            state["activePigIds"] = gs.ActivePigIds != null ? gs.ActivePigIds.ToList() : new List<string>();

            // Offers
            var adoptedNamedIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (gs.Roster != null)
            {
                foreach (var p in gs.Roster)
                {
                    if (p == null) continue;
                    if (!string.IsNullOrEmpty(p.NamedId)) adoptedNamedIds.Add(p.NamedId);
                    if (!string.IsNullOrEmpty(p.Id)) adoptedNamedIds.Add(p.Id);
                }
            }

            DateTime offersStartUtc = gs.OffersStartUtc ?? nowUtc;
            var offerStatuses = OfferChecker.StatusFor(catalog?.Pigs ?? Array.Empty<NamedPigDefinition>(), offersStartUtc, nowUtc, adoptedNamedIds);

            var offersList = new List<object>();
            if (offerStatuses != null)
            {
                foreach (var s in offerStatuses)
                {
                    if (s == null) continue;
                    var def = catalog?.Find(s.Id);
                    offersList.Add(new
                    {
                        id = s.Id,
                        name = s.Name,
                        unlocked = s.Unlocked,
                        daysLeft = s.DaysLeft,
                        cost = s.Cost,
                        group = s.Group,
                        adopted = s.Adopted,
                        look = new
                        {
                            breed = def?.Breed ?? string.Empty,
                            paletteId = def?.PaletteId ?? string.Empty
                        },
                        blurb = def?.Blurb ?? string.Empty,
                        traits = def?.Traits != null ? def.Traits.ToList() : new List<string>()
                    });
                }
            }
            state["offers"] = offersList;
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type != "adopt_pig" && type != "toggle_pig_active" && type != "adopt_named" && type != "adopt_group" && type != "set_memorial")
            {
                return false;
            }

            var pet = brain?.Pet;
            var gs = pet?.State;
            if (gs == null) return true;
            gs.EnsureRosterInitialized();

            DateTime nowUtc = pet.Clock != null ? pet.Clock.UtcNow : DateTime.UtcNow;

            if (type == "adopt_pig")
            {
                var cfg = LoadConfig();
                int cost = (int?)cfg["adopt_cost"] ?? 80;
                int maxRoster = (int?)cfg["max_roster"] ?? 6;
                int maxAdopted = (int?)cfg["max_adopted"] ?? 1;
                pet.MaxRoster = maxRoster;

                var names = cfg["names"] != null ? cfg["names"].Select(t => (string)t).ToArray() : DefaultNames;
                if (names.Length == 0) names = DefaultNames;

                int randomAdoptedCount = 0;
                for (int i = 1; i < gs.Roster.Count; i++)
                {
                    var p = gs.Roster[i];
                    if (p != null && string.IsNullOrEmpty(p.NamedId))
                    {
                        randomAdoptedCount++;
                    }
                }
                if (randomAdoptedCount >= maxAdopted)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "You already adopted a friend" });
                    return true;
                }

                int livingCount = CountLivingRoster(gs, pet, nowUtc);
                if (livingCount >= maxRoster)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "The family is full" });
                    return true;
                }
                if (!pet.TrySpendClovers(cost))
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                    return true;
                }
                var rng = new Random();
                var profile = PigProfile.CreateRandom(names[rng.Next(names.Length)], rng);
                profile.BornAtUtc = nowUtc;
                profile.ArrivedAtUtc = nowUtc;
                gs.Roster.Add(profile);
                BrainController.Log("[Pigs] adopted " + profile.Name + " (" + profile.Breed + ", " + profile.PaletteId + ")");
                HomeWindow.PostToPage(new { type = "toast", text = "Welcome " + profile.Name + " to the family!" });
            }
            else if (type == "adopt_named")
            {
                string id = message?.Value<string>("id") ?? message?.Value<string>("pigId");
                bool memorial = message?.Value<bool?>("memorial") ?? false;
                if (string.IsNullOrEmpty(id)) return true;

                var catalog = pet.NamedPigs ?? NamedPigCatalog.Current;
                var def = catalog?.Find(id);
                if (def == null) return true;

                var cfg = LoadConfig();
                int maxRoster = (int?)cfg["max_roster"] ?? 6;
                pet.MaxRoster = maxRoster;

                var rng = new Random();
                var result = pet.AdoptNamed(id, memorial, rng, nowUtc);

                if (result == AdoptResult.UnknownPig)
                {
                    return true;
                }
                else if (result == AdoptResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (result == AdoptResult.RosterFull)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "The family is full" });
                }
                else if (result == AdoptResult.NotUnlocked)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
                else if (result == AdoptResult.Ok)
                {
                    if (memorial)
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Forever in the family" });
                    }
                    else
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Welcome " + def.Name + " to the family!" });
                    }
                }
            }
            else if (type == "adopt_group")
            {
                string groupId = message?.Value<string>("id") ?? message?.Value<string>("groupId");
                if (string.IsNullOrEmpty(groupId)) return true;

                var catalog = pet.NamedPigs ?? NamedPigCatalog.Current;
                var groupPigs = catalog?.OfferGroup(groupId);
                if (groupPigs == null || groupPigs.Count == 0) return true;

                var cfg = LoadConfig();
                int maxRoster = (int?)cfg["max_roster"] ?? 6;
                pet.MaxRoster = maxRoster;

                var rng = new Random();
                var result = pet.AdoptGroup(groupId, rng, nowUtc);

                if (result == AdoptResult.UnknownPig)
                {
                    return true;
                }
                else if (result == AdoptResult.NotEnoughClovers)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
                else if (result == AdoptResult.RosterFull)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "The family is full" });
                }
                else if (result == AdoptResult.NotUnlocked)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not ready yet" });
                }
                else if (result == AdoptResult.Ok)
                {
                    string namesStr = string.Join(" and ", groupPigs.Select(p => p.Name));
                    HomeWindow.PostToPage(new { type = "toast", text = "Welcome " + namesStr + " to the family!" });
                }
            }
            else if (type == "set_memorial")
            {
                string pigId = message?.Value<string>("pigId") ?? message?.Value<string>("id");
                bool on = message?.Value<bool?>("on") ?? true;
                if (string.IsNullOrEmpty(pigId)) return true;

                bool changed = pet.SetMemorial(pigId, on);
                if (!changed)
                {
                    return true;
                }

                if (on)
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Forever in the family" });
                }
            }
            else // toggle_pig_active
            {
                string id = message?.Value<string>("pigId");
                if (string.IsNullOrEmpty(id) || !gs.Roster.Any(p => p.Id == id)) return true;
                var act = gs.ActivePigIds;
                if (act.Contains(id))
                {
                    if (act.Count > 1) act.Remove(id);
                }
                else
                {
                    if (act.Count >= 2) act.RemoveAt(0);
                    act.Add(id);
                }
            }

            try { brain.Session.AutoSaver.SaveNow(); } catch (Exception ex) { BrainController.Log("[WARN] PigsFeature save: " + ex.Message); }
            PigLook.RefreshAll();
            HomeWindow.NotifyStateChanged();
            return true;
        }
    }
}
