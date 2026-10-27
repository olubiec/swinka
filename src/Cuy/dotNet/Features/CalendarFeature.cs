using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.Care;
using Cuy.Core.Economy;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class CalendarFeature : HomeFeatureBase
    {
        public override string Id => "calendar";

        private Dictionary<string, DateTime> _lastShown = new Dictionary<string, DateTime>();
        private CareReminderForm _currentReminder;

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain.Pet;
            var careTasks = pet.CareTasks;
            var careState = pet.State.Care;
            var settings = careState.Settings;

            careState.Normalize();

            var economyConfig = EconomyConfig.Current.CareTask;
            int cloversPerTask = economyConfig.Clovers;
            int maxDaily = economyConfig.MaxPerDay * cloversPerTask;
            int cloversToday = pet.State.Economy.CareCloversToday;

            var pigsList = settings.PigNames.ToList();

            var taskObjects = new List<object>();
            foreach (var task in careTasks)
            {
                bool enabled = true;
                if (settings.TaskOverrides.TryGetValue(task.Id, out var over))
                {
                    enabled = over.Enabled;
                }

                DateTime? lastDone = null;
                if (careState.LastDoneUtc.TryGetValue(task.Id, out var ld))
                {
                    lastDone = ld;
                }

                var nextDueLocal = CareSchedule.NextDueLocal(task, settings, lastDone, pet.Clock);
                bool due = CareSchedule.IsDue(task, settings, careState, pet.Clock.UtcNow, pet.Clock);

                int streak = 0;
                careState.Streaks.TryGetValue(task.Id, out streak);

                // Use overrides for time, weekday, everyDays if they exist
                string t = task.Time;
                int? w = task.Weekday;
                int? ed = task.EveryDays;
                if (over != null)
                {
                    if (!string.IsNullOrEmpty(over.Time)) t = over.Time;
                    if (over.Weekday.HasValue) w = over.Weekday;
                    if (over.EveryDays.HasValue) ed = over.EveryDays;
                }

                taskObjects.Add(new
                {
                    id = task.Id,
                    title = task.Title,
                    text = task.Text,
                    schedule = task.Schedule,
                    time = t,
                    weekday = w,
                    everyDays = ed,
                    enabled = enabled,
                    weightLog = task.WeightLog ?? false,
                    due = due,
                    nextDue = nextDueLocal.ToString("yyyy-MM-ddTHH:mm"),
                    lastDone = lastDone?.ToLocalTime().ToString("yyyy-MM-ddTHH:mm"),
                    streak = streak
                });
            }

            var historyObj = careState.History
                .Select(h => new { date = h.LocalDate, taskId = h.TaskId })
                .ToList();

            var weightsObj = careState.Weights
                .Select(w => new { date = w.LocalDate, pig = w.Pig, grams = w.Grams })
                .ToList();

            var alerts = pet.WeightAlerts().ToList();

            // Default snooze minutes if missing
            var snoozeMinutes = new List<int> { 15, 60, 180 };

            state[Id] = new
            {
                pigs = pigsList,
                tasks = taskObjects,
                history = historyObj,
                weights = weightsObj,
                alerts = alerts,
                snoozeMinutes = snoozeMinutes,
                cloversPerTask = cloversPerTask,
                cloversToday = cloversToday,
                cloversMaxToday = maxDaily
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            var pet = brain.Pet;
            switch (type)
            {
                case "calendar_done":
                    {
                        string taskId = (string)message["taskId"];
                        if (string.IsNullOrEmpty(taskId)) return false;

                        bool wasDue = pet.MarkCareDone(taskId);
                        if (wasDue)
                        {
                            pet.AwardCareTask();
                        }
                        brain.RequestAnimation("happy");
                        brain.Session.AutoSaver.SaveNow();

                        if (_currentReminder != null && !_currentReminder.IsDisposed && _currentReminder.Task.Id == taskId)
                        {
                            _currentReminder.Close();
                            _currentReminder = null;
                        }
                        return true;
                    }
                case "calendar_snooze":
                    {
                        string taskId = (string)message["taskId"];
                        int minutes = (int?)message["minutes"] ?? 15;
                        if (string.IsNullOrEmpty(taskId)) return false;

                        pet.SnoozeCare(taskId, minutes);
                        brain.Session.AutoSaver.SaveNow();

                        // Fix for snooze vs. debounce bug
                        if (_lastShown.ContainsKey(taskId))
                        {
                            _lastShown[taskId] = DateTime.UtcNow.AddMinutes(-20);
                        }
                        return true;
                    }
                case "calendar_settings":
                    {
                        var pigsToken = message["pigs"] as JArray;
                        var tasksToken = message["tasks"] as JArray;

                        pet.State.Care.Normalize();
                        var settings = pet.State.Care.Settings;

                        if (pigsToken != null)
                        {
                            var newPigs = new List<string>();
                            foreach (var p in pigsToken)
                            {
                                string name = (string)p;
                                if (!string.IsNullOrWhiteSpace(name))
                                {
                                    // Validate 1-16 letters/digits/spaces
                                    string validName = new string(name.Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray());
                                    if (validName.Length > 16) validName = validName.Substring(0, 16);
                                    if (!string.IsNullOrWhiteSpace(validName))
                                        newPigs.Add(validName.Trim());
                                }
                            }
                            settings.PigNames = newPigs;
                        }

                        if (tasksToken != null)
                        {
                            foreach (var tToken in tasksToken)
                            {
                                string id = (string)tToken["id"];
                                if (string.IsNullOrEmpty(id)) continue;

                                if (!settings.TaskOverrides.TryGetValue(id, out var over))
                                {
                                    over = new CareTaskOverride();
                                    settings.TaskOverrides[id] = over;
                                }

                                if (tToken["enabled"] != null) over.Enabled = (bool)tToken["enabled"];
                                if (tToken["time"] != null)
                                {
                                    string time = (string)tToken["time"];
                                    // Validate HH:mm
                                    if (TimeSpan.TryParse(time, out _))
                                    {
                                        over.Time = time;
                                    }
                                }
                                if (tToken["weekday"] != null) over.Weekday = (int)tToken["weekday"];
                                if (tToken["everyDays"] != null) over.EveryDays = (int)tToken["everyDays"];
                            }
                        }

                        brain.Session.AutoSaver.SaveNow();
                        return true;
                    }
                case "calendar_weight":
                    {
                        string pig = (string)message["pig"];
                        int? grams = (int?)message["grams"];
                        string date = (string)message["date"];

                        if (string.IsNullOrWhiteSpace(pig) || !grams.HasValue) return false;
                        if (grams.Value < 50 || grams.Value > 3000) return false;

                        pet.AddWeight(pig, grams.Value, date);
                        brain.Session.AutoSaver.SaveNow();
                        return true;
                    }
                case "calendar_weight_delete":
                    {
                        string pig = (string)message["pig"];
                        string date = (string)message["date"];

                        if (string.IsNullOrWhiteSpace(pig) || string.IsNullOrWhiteSpace(date)) return false;

                        pet.DeleteWeight(pig, date);
                        brain.Session.AutoSaver.SaveNow();
                        return true;
                    }
            }
            return false;
        }

        private TimeSpan _tickAccumulator = TimeSpan.Zero;

        public override void Tick(TimeSpan gameElapsed, BrainController brain)
        {
            // Convert game time to real time using the clock multiplier for logic?
            // The requirement says "every 30 real seconds check CareSchedule.GetDue"
            // Actually gameElapsed represents the time passed in the game. Real time is gameElapsed.TotalSeconds / Clock.Multiplier
            // But we can just use real time for the timer.
            _tickAccumulator += TimeSpan.FromSeconds(gameElapsed.TotalSeconds / brain.Clock.Multiplier);

            if (_tickAccumulator.TotalSeconds >= 30)
            {
                _tickAccumulator = TimeSpan.Zero;
                CheckReminder(brain);
            }
        }

        private void CheckReminder(BrainController brain)
        {
            var pet = brain.Pet;
            if (pet == null) return;

            // Conditions
            if (pet.State.NeedsNaming) return;
            if (HomeWindow.IsOpen) return;
            if (Win32Input.GetIdleTime().TotalMinutes >= 3) return;
            if (FormPet.ActivePet != null)
            {
                // In FormPet, if TopMost is false due to a fullscreen app, we shouldn't show it.
                if (!FormPet.ActivePet.TopMost) return;
            }

            var dueTasks = CareSchedule.GetDue(pet.CareTasks, pet.State.Care.Settings, pet.State.Care, pet.Clock);
            if (dueTasks.Count == 0) return;

            var firstDue = dueTasks[0].Task;

            if (_currentReminder != null && !_currentReminder.IsDisposed)
            {
                return; // Only one card at a time
            }

            var nowReal = DateTime.UtcNow;

            if (_lastShown.TryGetValue(firstDue.Id, out var lastShownTime))
            {
                if ((nowReal - lastShownTime).TotalMinutes < 20)
                {
                    return; // Not already shown in this session in the last 20 minutes
                }
            }

            _lastShown[firstDue.Id] = nowReal;

            _currentReminder = new CareReminderForm(firstDue, brain);
            _currentReminder.Show();
        }
    }
}