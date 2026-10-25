using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using Cuy.Core.Time;

namespace Cuy.Core.Health
{
    public class HealthSystem
    {
        private HealthData _data;

        public HealthSystem()
        {
            LoadData();
        }

        private void LoadData()
        {
            var path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "data", "health.json");

            // Go up directories until we find assets folder
            if (!File.Exists(path))
            {
                var dir = AppDomain.CurrentDomain.BaseDirectory;
                while (dir != null && !Directory.Exists(Path.Combine(dir, "assets")))
                {
                    dir = Directory.GetParent(dir)?.FullName;
                }
                if (dir != null)
                {
                    path = Path.Combine(dir, "assets", "data", "health.json");
                }
            }

            if (File.Exists(path))
            {
                _data = JsonConvert.DeserializeObject<HealthData>(File.ReadAllText(path));
            }
            else
            {
                _data = new HealthData();
            }
        }

        // Expose Checkup Price and Conditions for tests
        public int CheckupPrice => _data.CheckupPrice;
        public IReadOnlyList<ConditionDefinition> Conditions => _data.Conditions;

        public ConditionDefinition GetCondition(string id)
        {
            return _data.Conditions.FirstOrDefault(c => c.Id == id);
        }

        public void Tick(Pet pet, TimeSpan gameElapsed, Random rng)
        {
            if (_data == null || _data.Conditions == null) return;
            if (pet.State.Health.RandomSeed == null)
            {
                pet.State.Health.RandomSeed = rng ?? new Random();
            }

            var localDate = pet.Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

            // 1. update LowNeedHours per trigger
            foreach (var condition in _data.Conditions)
            {
                if (condition.Trigger == null) continue;

                if (!string.IsNullOrEmpty(condition.Trigger.NeedKey))
                {
                    Need need;
                    if (NeedNames.TryParseDataKey(condition.Trigger.NeedKey, out need))
                    {
                        var needValue = pet.State.Needs[need];
                        if (condition.Trigger.Below.HasValue)
                        {
                            if (needValue < condition.Trigger.Below.Value)
                            {
                                if (!pet.State.Health.LowNeedHours.ContainsKey(condition.Id))
                                    pet.State.Health.LowNeedHours[condition.Id] = 0;
                                pet.State.Health.LowNeedHours[condition.Id] += gameElapsed.TotalHours;
                            }
                            else
                            {
                                pet.State.Health.LowNeedHours[condition.Id] = 0;
                            }
                        }
                    }
                }
            }

            // 2. roll new conditions once per game day
            if (pet.State.Health.LastRollLocalDate != localDate)
            {
                pet.State.Health.LastRollLocalDate = localDate;

                if (pet.State.Health.Active.Count < 2)
                {
                    var notActiveConditions = _data.Conditions.Where(c => !pet.State.Health.Active.Any(a => a.Id == c.Id)).ToList();

                    foreach(var condition in notActiveConditions)
                    {
                        bool triggered = false;
                        double chance = condition.ChancePerDay;

                        if (condition.Trigger != null)
                        {
                            if (!string.IsNullOrEmpty(condition.Trigger.NeedKey) && condition.Trigger.ForHours.HasValue)
                            {
                                if (pet.State.Health.LowNeedHours.TryGetValue(condition.Id, out double hours) && hours >= condition.Trigger.ForHours.Value)
                                {
                                    triggered = true;
                                }
                            }
                            else if (condition.Trigger.SweetTreatsTodayAbove.HasValue)
                            {
                                var yesterday = pet.Clock.LocalNow().AddDays(-1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                                if ((pet.State.Health.TreatsLocalDate == localDate || pet.State.Health.TreatsLocalDate == yesterday) && pet.State.Health.SweetTreatsToday > condition.Trigger.SweetTreatsTodayAbove.Value)
                                {
                                    triggered = true;
                                }
                            }
                            else if (condition.Trigger.Random)
                            {
                                triggered = true;
                                if (condition.RiskMultipliers != null)
                                {
                                    foreach (var kvp in condition.RiskMultipliers)
                                    {
                                        if (kvp.Key == "mood_below_30" && pet.State.Needs.Mood < 30) chance *= kvp.Value;
                                        if (kvp.Key == "energy_below_25" && pet.State.Needs.Energy < 25) chance *= kvp.Value;
                                        if (kvp.Key == "cleanliness_below_40" && pet.State.Needs.Cleanliness < 40) chance *= kvp.Value;
                                    }
                                }
                            }
                        }

                        if (triggered)
                        {
                            if (pet.State.Health.RandomSeed.NextDouble() <= chance)
                            {
                                pet.State.Health.Active.Add(new ActiveCondition
                                {
                                    Id = condition.Id,
                                    SinceUtc = pet.Clock.UtcNow,
                                    Severity = 0,
                                    Known = false,
                                    Treated = false,
                                    CourseDaysLeft = condition.Treatment?.CourseDays ?? 0
                                });
                                break; // at most one new condition per day
                            }
                        }
                    }
                }
            }

            // 3. active conditions update and extra decay
            var toRemove = new List<ActiveCondition>();

            foreach (var active in pet.State.Health.Active)
            {
                var def = GetCondition(active.Id);
                if (def == null) continue;

                if (!active.Treated)
                {
                    active.Severity += _data.SeverityGrowthPerDay * gameElapsed.TotalDays;
                    if (active.Severity > 1.0) active.Severity = 1.0;

                    if (def.ExtraDecayPerHour != null)
                    {
                        foreach (var kvp in def.ExtraDecayPerHour)
                        {
                            if (NeedNames.TryParseDataKey(kvp.Key, out Need decayNeed))
                            {
                                double decayAmount = kvp.Value * gameElapsed.TotalHours * (0.5 + active.Severity);
                                pet.ChangeNeed(decayNeed, -decayAmount);
                            }
                        }
                    }
                }
                else
                {
                    // 4. treated conditions logic
                    bool cureSatisfied = true;
                    if (def.Treatment?.CureNeed != null)
                    {
                        if (NeedNames.TryParseDataKey(def.Treatment.CureNeed.NeedKey, out Need cureNeedKey))
                        {
                            if (pet.State.Needs[cureNeedKey] <= def.Treatment.CureNeed.Above)
                            {
                                cureSatisfied = false;
                            }
                        }
                    }

                    if (def.Treatment != null && def.Treatment.CourseDays > 0)
                    {
                         // course_days > 0 handled by GiveDose lowering Severity
                         if (active.CourseDaysLeft <= 0 && cureSatisfied)
                         {
                             toRemove.Add(active);
                         }
                    }
                    else
                    {
                        // course_days == 0
                        if (cureSatisfied)
                        {
                            toRemove.Add(active);
                        }
                    }
                }
            }

            foreach (var rem in toRemove)
            {
                pet.State.Health.Active.Remove(rem);
                pet.State.Health.History.Add(new HealthHistoryEntry
                {
                    Id = rem.Id,
                    StartUtc = rem.SinceUtc,
                    EndUtc = pet.Clock.UtcNow
                });
            }
        }
    }
}
