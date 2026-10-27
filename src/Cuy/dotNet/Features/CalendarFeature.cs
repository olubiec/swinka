using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using Cuy.Features;
using Cuy.Core;
using Cuy.Core.Care;
using Cuy.Core.Economy;
using Cuy.Core.Time;

namespace Cuy.Features
{
    public class CalendarFeature : HomeFeatureBase
    {
        public override string Id => "calendar";

        private DateTime _lastTickTime = DateTime.MinValue;
        private DateTime _lastReminderTime = DateTime.MinValue;

        public override void AddState(IDictionary<string, object> currentState, BrainController brain)
        {
            var pet = brain.Pet;
            if (pet == null) return;

            pet.State.Care.Normalize();

            var pigs = pet.State.Care.Settings.PigNames ?? new List<string>();

            var nowUtc = pet.Clock.UtcNow;

            var tasksList = new List<object>();
            var tasks = pet.CareTasks ?? new List<CareTaskDefinition>();

            foreach (var t in tasks)
            {
                // apply overrides
                bool enabled = true;
                string time = t.Time;
                int? weekday = t.Weekday;
                int? everyDays = t.EveryDays;

                if (pet.State.Care.Settings.TaskOverrides.TryGetValue(t.Id, out var over))
                {
                    enabled = over.Enabled;
                    if (!string.IsNullOrEmpty(over.Time)) time = over.Time;
                    if (over.Weekday.HasValue) weekday = over.Weekday.Value;
                    if (over.EveryDays.HasValue) everyDays = over.EveryDays.Value;
                }

                bool due = CareSchedule.IsDue(t, pet.State.Care.Settings, pet.State.Care, nowUtc, pet.Clock);

                DateTime? lastDoneUtc = null;
                if (pet.State.Care.LastDoneUtc.TryGetValue(t.Id, out var ld)) lastDoneUtc = ld;

                var nextDueLocal = CareSchedule.NextDueLocal(t, pet.State.Care.Settings, lastDoneUtc, pet.Clock);
                var nextDueStr = nextDueLocal.ToString("yyyy-MM-ddTHH:mm");

                string lastDoneStr = lastDoneUtc.HasValue ? lastDoneUtc.Value.ToLocalTime().ToString("yyyy-MM-ddTHH:mm") : null;

                int streak = 0;
                pet.State.Care.Streaks.TryGetValue(t.Id, out streak);

                tasksList.Add(new {
                    id = t.Id,
                    title = t.Title,
                    text = t.Text,
                    schedule = t.Schedule,
                    time = time,
                    weekday = weekday,
                    everyDays = everyDays,
                    enabled = enabled,
                    weightLog = t.WeightLog ?? false,
                    due = due,
                    nextDue = nextDueStr,
                    lastDone = lastDoneStr,
                    streak = streak
                });
            }

            // history (last 62 days)
            var nowLocal = pet.Clock.LocalNow();
            var cutoffDate = nowLocal.Date.AddDays(-62).ToString("yyyy-MM-dd");
            var history = pet.State.Care.History
                .Where(h => string.Compare(h.LocalDate, cutoffDate, StringComparison.Ordinal) >= 0)
                .Select(h => new { date = h.LocalDate, taskId = h.TaskId })
                .ToList();

            var weights = pet.State.Care.Weights.Select(w => new { date = w.LocalDate, pig = w.Pig, grams = w.Grams }).ToList();

            var alerts = pet.WeightAlerts();

            // Economy
            int cloversPerTask = EconomyConfig.Current.CareTask.Clovers;
            int cloversMaxToday = EconomyConfig.Current.CareTask.MaxPerDay * cloversPerTask;

            var cloversToday = pet.State.Economy.CareCloversToday;

            var state = new Dictionary<string, object>
            {
                ["pigs"] = pigs,
                ["tasks"] = tasksList,
                ["history"] = history,
                ["weights"] = weights,
                ["alerts"] = alerts,
                ["snoozeMinutes"] = pet.CareSnoozeMinutes,
                ["cloversPerTask"] = cloversPerTask,
                ["cloversToday"] = cloversToday,
                ["cloversMaxToday"] = cloversMaxToday
            };

            currentState["calendar"] = state;
        }

        public override bool HandleMessage(string type, JObject msg, BrainController brain)
        {
            var pet = brain.Pet;
            if (pet == null) return false;

            if (type == "calendar_done")
            {
                var taskId = (string)msg["taskId"];
                if (string.IsNullOrEmpty(taskId)) return true;

                bool wasDue = pet.MarkCareDone(taskId);
                if (wasDue)
                {
                    pet.AwardCareTask();
                }
                brain.RequestAnimation("happy");
                brain.Session.AutoSaver.SaveNow();

                // Close reminder if it is open for this task
                CareReminderForm.CloseForTask(taskId);

                HomeWindow.NotifyStateChanged();
                return true;
            }
            else if (type == "calendar_snooze")
            {
                var taskId = (string)msg["taskId"];
                var minutes = (int)msg["minutes"];

                pet.SnoozeCare(taskId, minutes);
                brain.Session.AutoSaver.SaveNow();

                CareReminderForm.CloseForTask(taskId);

                HomeWindow.NotifyStateChanged();
                return true;
            }
            else if (type == "calendar_settings")
            {
                if (msg["pigs"] != null)
                {
                    var pigs = msg["pigs"].Select(p => (string)p).ToList();
                    pet.State.Care.Settings.PigNames = pigs;
                }

                if (msg["tasks"] != null)
                {
                    foreach (var tObj in msg["tasks"])
                    {
                        var id = (string)tObj["id"];
                        if (string.IsNullOrEmpty(id)) continue;

                        if (!pet.State.Care.Settings.TaskOverrides.TryGetValue(id, out var over))
                        {
                            over = new CareTaskOverride();
                            pet.State.Care.Settings.TaskOverrides[id] = over;
                        }

                        if (tObj["enabled"] != null) over.Enabled = (bool)tObj["enabled"];

                        if (tObj["time"] != null)
                        {
                            string time = (string)tObj["time"];
                            if (System.Text.RegularExpressions.Regex.IsMatch(time, "^[0-2][0-9]:[0-5][0-9]$")) over.Time = time;
                        }

                        if (tObj["weekday"] != null)
                        {
                            int w = (int)tObj["weekday"];
                            if (w >= 0 && w <= 6) over.Weekday = w;
                        }

                        if (tObj["everyDays"] != null)
                        {
                            int d = (int)tObj["everyDays"];
                            if (d > 0) over.EveryDays = d;
                        }
                    }
                }

                brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();
                return true;
            }
            else if (type == "calendar_weight")
            {
                string pig = (string)msg["pig"];
                int grams = msg["grams"] != null ? (int)msg["grams"] : 0;
                string date = (string)msg["date"];

                if (!string.IsNullOrWhiteSpace(pig) && grams >= 50 && grams <= 3000)
                {
                    // Names 1-16 letters/digits/spaces
                    if (System.Text.RegularExpressions.Regex.IsMatch(pig, @"^[a-zA-Z0-9 ]{1,16}$"))
                    {
                        pet.AddWeight(pig, grams, date);
                        brain.Session.AutoSaver.SaveNow();
                        HomeWindow.NotifyStateChanged();
                    }
                }
                return true;
            }
            else if (type == "calendar_weight_delete")
            {
                string pig = (string)msg["pig"];
                string date = (string)msg["date"];
                pet.DeleteWeight(pig, date);
                brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();
                return true;
            }

            return false;
        }

        public override void Tick(TimeSpan gameElapsed, BrainController brain)
        {
            var pet = brain.Pet;
            if (pet == null) return;

            DateTime now = DateTime.UtcNow;
            if (_lastTickTime == DateTime.MinValue) _lastTickTime = now;

            if ((now - _lastTickTime).TotalSeconds >= 30)
            {
                _lastTickTime = now;

                var tasks = pet.CareTasks ?? new List<CareTaskDefinition>();
                var dueTasks = CareSchedule.GetDue(tasks, pet.State.Care.Settings, pet.State.Care, pet.Clock);
                if (dueTasks.Count > 0)
                {
                    if ((now - _lastReminderTime).TotalMinutes >= 20)
                    {
                        var idleTime = Win32Input.GetIdleTime();
                        if (idleTime.TotalMinutes < 3)
                        {
                            if (!SoundManager.Instance.IsFullScreenOrBusy() && !HomeWindow.IsOpen && !pet.State.NeedsNaming)
                            {
                                _lastReminderTime = now;

                                var taskToRemind = dueTasks[0].Task;

                                FormPet.ActivePet?.Invoke((Action)(() => {
                                    FormPet.ActivePet.WalkTowardsScreenCenterAndRemind(taskToRemind);
                                }));
                            }
                        }
                    }
                }
            }
        }
    }
}
