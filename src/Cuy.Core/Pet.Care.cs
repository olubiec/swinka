using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.Care;
using Cuy.Core.Time;

namespace Cuy.Core
{
    public partial class Pet
    {
        private List<CareTaskDefinition> _careTasks = new List<CareTaskDefinition>();

        public IReadOnlyList<CareTaskDefinition> CareTasks => _careTasks;

        public void SetCareTasks(IEnumerable<CareTaskDefinition> tasks)
        {
            _careTasks = tasks?.ToList() ?? new List<CareTaskDefinition>();
        }

        public IReadOnlyList<int> CareSnoozeMinutes { get; private set; } = new List<int> { 15, 60, 180 };

        public void SetCareConfig(WeightAlertSettings alertConfig, IEnumerable<int> snoozeMinutes)
        {
            if (alertConfig != null) WeightAlertsConfig = alertConfig;
            if (snoozeMinutes != null) CareSnoozeMinutes = snoozeMinutes.ToList();
        }

        public bool MarkCareDone(string taskId)
        {
            var task = _careTasks.FirstOrDefault(t => t.Id == taskId);
            if (task == null) return false;

            State.Care.Normalize();

            bool wasDue = CareSchedule.IsDue(task, State.Care.Settings, State.Care, Clock.UtcNow, Clock);

            var nowUtc = Clock.UtcNow;
            var nowLocal = Clock.LocalNow();
            string localDateStr = nowLocal.ToString("yyyy-MM-dd");

            // Streaks: +1 if the previous window was done too, else 1
            int currentStreak = 0;
            State.Care.Streaks.TryGetValue(taskId, out currentStreak);

            if (wasDue)
            {
                if (State.Care.LastDoneUtc.TryGetValue(taskId, out var lastDone))
                {
                    // To check if the previous window was missed, let's use the task's schedule rules
                    // CareSchedule.NextDueLocal computes the next due time based on the given lastDoneUtc relative to *now*.
                    // Wait, if lastDone was long ago, NextDueLocal(..., lastDone) returns what?
                    // Ah, NextDueLocal just calculates based on the current window.

                    bool missedWindow = false;
                    var lastDoneLocal = lastDone.ToLocalTime();

                    if (task.Schedule == "daily")
                    {
                        // Done yesterday?
                        missedWindow = (nowLocal.Date - lastDoneLocal.Date).TotalDays > 1;
                    }
                    else if (task.Schedule == "weekly")
                    {
                        var startOfWeekNow = nowLocal.Date.AddDays(-(int)nowLocal.DayOfWeek);
                        var startOfWeekLastDone = lastDoneLocal.Date.AddDays(-(int)lastDoneLocal.DayOfWeek);
                        missedWindow = (startOfWeekNow - startOfWeekLastDone).TotalDays > 7;
                    }
                    else if (task.Schedule == "every_n_days")
                    {
                        // For every_n_days, missed window means we are more than everyDays * 2 past the last done?
                        // Or if we are more than everyDays past the expected due date
                        // The expected due date from lastDone was lastDoneLocal.Date + EveryDays
                        int everyDays = task.EveryDays ?? 1;
                        if (State.Care.Settings?.TaskOverrides?.TryGetValue(task.Id, out var over) == true && over.EveryDays.HasValue)
                            everyDays = over.EveryDays.Value;

                        var expectedDue = lastDoneLocal.Date.AddDays(everyDays);
                        missedWindow = (nowLocal.Date - expectedDue).TotalDays > everyDays;
                    }

                    if (!missedWindow)
                    {
                        State.Care.Streaks[taskId] = currentStreak + 1;
                    }
                    else
                    {
                        State.Care.Streaks[taskId] = 1;
                    }
                }
                else
                {
                    State.Care.Streaks[taskId] = 1;
                }
            }

            State.Care.LastDoneUtc[taskId] = nowUtc;
            State.Care.SnoozedUntilUtc.Remove(taskId);

            State.Care.History.Add(new CareHistoryEntry { LocalDate = localDateStr, TaskId = taskId });

            var cutoffDate = nowLocal.Date.AddDays(-120).ToString("yyyy-MM-dd");
            State.Care.History.RemoveAll(h => string.Compare(h.LocalDate, cutoffDate, StringComparison.Ordinal) < 0);

            return wasDue;
        }

        public void SnoozeCare(string taskId, int minutes)
        {
            if (minutes <= 0) return;
            State.Care.Normalize();
            var nowUtc = Clock.UtcNow;
            State.Care.SnoozedUntilUtc[taskId] = nowUtc.AddMinutes(minutes);
        }

        public void SetCareSettings(CareSettings settings)
        {
            if (settings == null) return;
            State.Care.Settings = settings;
        }

        public void AddWeight(string pig, int grams, string localDate = null)
        {
            if (string.IsNullOrWhiteSpace(pig)) return;
            State.Care.Normalize();

            if (string.IsNullOrEmpty(localDate))
            {
                localDate = Clock.LocalNow().ToString("yyyy-MM-dd");
            }

            State.Care.Weights.RemoveAll(w => w.Pig == pig && w.LocalDate == localDate);
            State.Care.Weights.Add(new WeightEntry { Pig = pig, Grams = grams, LocalDate = localDate });

            State.Care.Weights.Sort((a, b) => string.Compare(a.LocalDate, b.LocalDate, StringComparison.Ordinal));
        }

        public void DeleteWeight(string pig, string localDate)
        {
            if (string.IsNullOrWhiteSpace(pig) || string.IsNullOrWhiteSpace(localDate)) return;
            State.Care.Normalize();
            State.Care.Weights.RemoveAll(w => w.Pig == pig && w.LocalDate == localDate);
        }

        public WeightAlertSettings WeightAlertsConfig { get; set; } = new WeightAlertSettings { DropGrams = 50, DropPercent = 5 };

        public IEnumerable<string> WeightAlerts()
        {
            State.Care.Normalize();
            var alerts = new List<string>();

            var grouped = State.Care.Weights.GroupBy(w => w.Pig);
            foreach (var group in grouped)
            {
                var sorted = group.OrderBy(w => w.LocalDate).ToList();
                if (sorted.Count < 2) continue;

                var latest = sorted[sorted.Count - 1];
                var prev = sorted[sorted.Count - 2];

                if (!DateTime.TryParse(latest.LocalDate, out var latestDate) || !DateTime.TryParse(prev.LocalDate, out var prevDate))
                    continue;

                if ((latestDate - prevDate).TotalDays > 14) continue;

                int drop = prev.Grams - latest.Grams;
                if (drop > 0)
                {
                    double dropPct = (double)drop / prev.Grams * 100.0;
                    if (drop >= WeightAlertsConfig.DropGrams || dropPct >= WeightAlertsConfig.DropPercent)
                    {
                        var formattedDate = prevDate.ToString("dd MMM");
                        alerts.Add($"{latest.Pig} lost {drop} g since {formattedDate}. Watch her and see a vet if it continues.");
                    }
                }
            }

            return alerts;
        }
    }
}
