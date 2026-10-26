using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Time;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class VetFeature : HomeFeatureBase
    {
        public override string Id => "vet";

        private readonly Random _rng = new Random();
        private HashSet<string> _knownActiveConditions = null;
        private double _symptomRealSecondsLeft;
        private DateTime _lastTickTime = DateTime.MinValue;

        public VetFeature()
        {
            ResetSymptomTimer();
        }

        private void ResetSymptomTimer()
        {
            // 4 to 8 real minutes -> 240 to 480 seconds
            _symptomRealSecondsLeft = 240 + _rng.NextDouble() * 240;
        }

        public override void Tick(TimeSpan gameElapsed, BrainController brain)
        {
            var pet = brain.Pet;
            if (pet == null) return;

            // Calculate real time elapsed
            DateTime now = DateTime.UtcNow;
            if (_lastTickTime == DateTime.MinValue) _lastTickTime = now;
            double realSecondsElapsed = (now - _lastTickTime).TotalSeconds;
            _lastTickTime = now;

            pet.TickHealth(gameElapsed);

            bool newConditionAppeared = false;
            var currentConditions = pet.State.Health.Active.Select(c => c.Id).ToHashSet();

            if (_knownActiveConditions == null)
            {
                // First tick after load - just sync, don't trigger new condition alerts
                _knownActiveConditions = currentConditions;
            }
            else
            {
                foreach (var conditionId in currentConditions)
                {
                    if (!_knownActiveConditions.Contains(conditionId))
                    {
                        BrainController.Log($"[Health] {conditionId} started");
                        newConditionAppeared = true;
                    }
                }
                _knownActiveConditions = currentConditions;
            }

            if (newConditionAppeared)
            {
                HomeWindow.NotifyStateChanged();
                SoundManager.Instance?.PlayFear();
                brain.Session.AutoSaver.SaveNow();
            }

            // Symptoms on the desktop
            if (pet.IsSick)
            {
                double scratchingFactor = Math.Max(1.0, pet.ScratchingFactor);
                // Reduce timer based on real time, multiplied by scratching factor
                _symptomRealSecondsLeft -= realSecondsElapsed * scratchingFactor;

                if (_symptomRealSecondsLeft <= 0)
                {
                    ResetSymptomTimer();

                    if (!brain.IsCurrentlySleeping() && !brain.IsPhysicsActive && !HomeWindow.IsOpen)
                    {
                        var anim = pet.SicknessAnimation;
                        if (!string.IsNullOrEmpty(anim))
                        {
                            brain.RequestAnimation(anim);
                        }
                    }
                }
            }
        }

        public override void AddState(IDictionary<string, object> currentState, BrainController brain)
        {
            var pet = brain.Pet;
            if (pet == null) return;

            var activeConditions = pet.State.Health.Active.Select(a => {
                var def = pet.HealthSystem.GetCondition(a.Id);
                if (a.Known)
                {
                    return new JObject
                    {
                        ["id"] = a.Id,
                        ["name"] = def?.Name ?? a.Id,
                        ["known"] = true,
                        ["severity"] = a.Severity,
                        ["since"] = a.SinceUtc.ToLocalTime().ToString("yyyy-MM-ddTHH:mm"),
                        ["treated"] = a.Treated,
                        ["price"] = def?.Treatment?.Price ?? 0,
                        ["courseDays"] = def?.Treatment?.CourseDays ?? 0,
                        ["courseDaysLeft"] = a.CourseDaysLeft,
                        ["doseDueToday"] = IsDoseDueToday(a, pet),
                        ["info"] = def?.Info ?? "",
                        ["cureHint"] = GetCureHint(def)
                    };
                }
                else
                {
                    return new JObject
                    {
                        ["id"] = a.Id,
                        ["name"] = "Something is wrong",
                        ["known"] = false,
                        ["severity"] = a.Severity,
                        ["since"] = a.SinceUtc.ToLocalTime().ToString("yyyy-MM-ddTHH:mm"),
                        ["treated"] = false,
                        ["price"] = def?.Treatment?.Price ?? 0,
                        ["courseDays"] = def?.Treatment?.CourseDays ?? 0,
                        ["courseDaysLeft"] = 0,
                        ["doseDueToday"] = false,
                        ["info"] = "",
                        ["cureHint"] = ""
                    };
                }
            }).ToList();

            var history = pet.State.Health.History.Select(h => {
                var def = pet.HealthSystem.GetCondition(h.Id);
                return new JObject
                {
                    ["id"] = h.Id,
                    ["name"] = def?.Name ?? h.Id,
                    ["start"] = h.StartUtc.ToLocalTime().ToString("yyyy-MM-dd"),
                    ["end"] = h.EndUtc.ToLocalTime().ToString("yyyy-MM-dd")
                };
            }).ToList();

            // Dedupe symptoms
            var symptomsSet = new HashSet<string>();
            foreach (var a in pet.State.Health.Active)
            {
                var def = pet.HealthSystem.GetCondition(a.Id);
                if (def != null)
                {
                    if (a.Id == "scurvy") { symptomsSet.Add("Tired"); symptomsSet.Add("Rough fur"); }
                    else if (a.Id == "dental") { symptomsSet.Add("Not eating treats"); symptomsSet.Add("Drooling"); }
                    else if (a.Id == "bumblefoot") { symptomsSet.Add("Limping"); }
                    else if (a.Id == "mites") { symptomsSet.Add("Scratching a lot"); symptomsSet.Add("Bald spots"); }
                    else if (a.Id == "respiratory") { symptomsSet.Add("Sneezing"); symptomsSet.Add("Crusty eyes"); }
                    else if (a.Id == "gi_stasis") { symptomsSet.Add("Not eating"); symptomsSet.Add("Hunched"); }
                    else if (a.Id == "tummy_ache") { symptomsSet.Add("Soft poops"); }
                }
            }

            // Ensure condition prices correctly apply
            int checkupPrice = pet.HealthSystem.CheckupPrice;
            string lastCheckup = pet.State.Health.LastCheckupUtc == default
                ? null
                : pet.State.Health.LastCheckupUtc.ToLocalTime().ToString("yyyy-MM-ddTHH:mm");

            var vetState = new Dictionary<string, object>
            {
                ["isSick"] = pet.IsSick,
                ["checkupPrice"] = checkupPrice,
                ["lastCheckup"] = lastCheckup,
                ["conditions"] = activeConditions,
                ["history"] = history,
                ["symptoms"] = symptomsSet.ToList()
            };

            currentState["vet"] = vetState;

            var needs = brain.Needs;
            double rawHealth = needs?.Health ?? 100.0;
            double healthDisplay = Math.Max(5.0, rawHealth - pet.HealthPenalty);
            currentState["healthDisplay"] = healthDisplay;
        }

        private bool IsDoseDueToday(Cuy.Core.Health.ActiveCondition a, Pet pet)
        {
            if (!a.Treated || a.CourseDaysLeft <= 0) return false;
            var localDate = pet.Clock.LocalNow().ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
            return a.LastDoseLocalDate != localDate;
        }

        private string GetCureHint(Cuy.Core.Health.ConditionDefinition def)
        {
            if (def?.Treatment?.CureNeed == null) return null;
            if (Cuy.Core.NeedNames.TryParseDataKey(def.Treatment.CureNeed.NeedKey, out var need))
            {
                string needName = "";
                switch (need)
                {
                    case Cuy.Core.Need.Satiety: needName = "Fullness"; break;
                    case Cuy.Core.Need.VitaminC: needName = "Vitamin C"; break;
                    case Cuy.Core.Need.Energy: needName = "Energy"; break;
                    case Cuy.Core.Need.Mood: needName = "Mood"; break;
                    case Cuy.Core.Need.Cleanliness: needName = "Cleanliness"; break;
                    case Cuy.Core.Need.Teeth: needName = "Teeth"; break;
                }
                return $"{needName} above {def.Treatment.CureNeed.Above}";
            }
            return null;
        }

        public override bool HandleMessage(string type, JObject msg, BrainController brain)
        {
            var pet = brain.Pet;
            if (pet == null) return false;

            if (type == "vet_checkup")
            {
                int price = pet.HealthSystem.CheckupPrice;
                if (pet.TryPay(price, "vet"))
                {
                    pet.Checkup();
                    HomeWindow.NotifyStateChanged();
                    brain.Session.AutoSaver.SaveNow();
                }
                else
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }
            }
            else if (type == "vet_treat")
            {
                var conditionId = (string)msg["conditionId"];
                var def = pet.HealthSystem.GetCondition(conditionId);
                var active = pet.State.Health.Active.FirstOrDefault(a => a.Id == conditionId);

                if (def != null && active != null && active.Known && !active.Treated)
                {
                    int price = def.Treatment?.Price ?? 0;
                    if (pet.TryPay(price, "vet"))
                    {
                        pet.Treat(conditionId);
                        HomeWindow.NotifyStateChanged();
                        brain.Session.AutoSaver.SaveNow();
                    }
                    else
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                    }
                }
            }
            else if (type == "vet_dose")
            {
                var conditionId = (string)msg["conditionId"];
                pet.GiveDose(conditionId);
                HomeWindow.NotifyStateChanged();
                brain.Session.AutoSaver.SaveNow();
            }
            else
            {
                return false;
            }
            return true;
        }
    }
}