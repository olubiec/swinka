using System;
using System.Collections.Generic;
using System.Globalization;
using Cuy.Core.Time;

namespace Cuy.Core.Care
{
    public class DueTask
    {
        public CareTaskDefinition Task { get; set; }
        public DateTime DueUtc { get; set; }
    }

    public static class CareSchedule
    {
        public static DateTime NextDueLocal(CareTaskDefinition task, CareSettings settings, DateTime? lastDoneUtc, IClock clock)
        {
            var nowLocal = clock.LocalNow();
            var timeParts = GetTimeParts(task, settings);

            if (task.Schedule == "daily")
            {
                var todayDueLocal = nowLocal.Date.AddHours(timeParts.Item1).AddMinutes(timeParts.Item2);
                if (lastDoneUtc.HasValue)
                {
                    var lastDoneLocal = lastDoneUtc.Value.ToLocalTime();
                    if (lastDoneLocal.Date == nowLocal.Date)
                    {
                        return todayDueLocal.AddDays(1);
                    }
                }
                return todayDueLocal;
            }
            else if (task.Schedule == "weekly")
            {
                int dueWeekday = GetWeekday(task, settings);
                var startOfWeek = nowLocal.Date.AddDays(-(int)nowLocal.DayOfWeek);
                var dueLocalThisWeek = startOfWeek.AddDays(dueWeekday).AddHours(timeParts.Item1).AddMinutes(timeParts.Item2);

                if (lastDoneUtc.HasValue)
                {
                    var lastDoneLocal = lastDoneUtc.Value.ToLocalTime();
                    var lastDoneStartOfWeek = lastDoneLocal.Date.AddDays(-(int)lastDoneLocal.DayOfWeek);
                    if (lastDoneStartOfWeek == startOfWeek)
                    {
                        return dueLocalThisWeek.AddDays(7);
                    }
                }
                return dueLocalThisWeek;
            }
            else if (task.Schedule == "every_n_days")
            {
                int everyDays = GetEveryDays(task, settings);
                if (lastDoneUtc.HasValue)
                {
                    var lastDoneLocal = lastDoneUtc.Value.ToLocalTime();
                    return lastDoneLocal.Date.AddDays(everyDays).AddHours(timeParts.Item1).AddMinutes(timeParts.Item2);
                }
                return nowLocal.Date.AddHours(timeParts.Item1).AddMinutes(timeParts.Item2);
            }

            return nowLocal;
        }

        public static bool IsDue(CareTaskDefinition task, CareSettings settings, CareState state, DateTime nowUtc, IClock clock)
        {
            if (settings != null && settings.TaskOverrides != null && settings.TaskOverrides.TryGetValue(task.Id, out var over))
            {
                if (!over.Enabled) return false;
            }

            if (state.SnoozedUntilUtc != null && state.SnoozedUntilUtc.TryGetValue(task.Id, out var snoozeUtc))
            {
                if (nowUtc < snoozeUtc) return false;
            }

            DateTime? lastDone = null;
            if (state.LastDoneUtc != null && state.LastDoneUtc.TryGetValue(task.Id, out var ld))
            {
                lastDone = ld;
            }

            var nextDueLocal = NextDueLocal(task, settings, lastDone, clock);
            var nowLocal = clock.LocalNow();

            if (nowLocal < nextDueLocal) return false;

            return true;
        }

        public static IReadOnlyList<DueTask> GetDue(IReadOnlyList<CareTaskDefinition> tasks, CareSettings settings, CareState state, IClock clock)
        {
            var dueTasks = new List<DueTask>();
            var nowUtc = clock.UtcNow;

            foreach (var task in tasks)
            {
                if (IsDue(task, settings, state, nowUtc, clock))
                {
                    DateTime? lastDone = null;
                    if (state.LastDoneUtc != null && state.LastDoneUtc.TryGetValue(task.Id, out var ld))
                    {
                        lastDone = ld;
                    }
                    var dueLocal = NextDueLocal(task, settings, lastDone, clock);
                    var dueDateTimeLocal = DateTime.SpecifyKind(dueLocal, DateTimeKind.Local);
                    dueTasks.Add(new DueTask { Task = task, DueUtc = dueDateTimeLocal.ToUniversalTime() });
                }
            }

            dueTasks.Sort((a, b) => a.DueUtc.CompareTo(b.DueUtc));
            return dueTasks;
        }

        private static Tuple<int, int> GetTimeParts(CareTaskDefinition task, CareSettings settings)
        {
            string timeStr = task.Time;
            if (settings != null && settings.TaskOverrides != null && settings.TaskOverrides.TryGetValue(task.Id, out var over))
            {
                if (!string.IsNullOrEmpty(over.Time)) timeStr = over.Time;
            }

            int hours = 0, mins = 0;
            if (!string.IsNullOrEmpty(timeStr))
            {
                var parts = timeStr.Split(':');
                if (parts.Length == 2)
                {
                    int.TryParse(parts[0], out hours);
                    int.TryParse(parts[1], out mins);
                }
            }
            return Tuple.Create(hours, mins);
        }

        private static int GetWeekday(CareTaskDefinition task, CareSettings settings)
        {
            int w = task.Weekday ?? 0;
            if (settings != null && settings.TaskOverrides != null && settings.TaskOverrides.TryGetValue(task.Id, out var over))
            {
                if (over.Weekday.HasValue) w = over.Weekday.Value;
            }
            return w;
        }

        private static int GetEveryDays(CareTaskDefinition task, CareSettings settings)
        {
            int d = task.EveryDays ?? 1;
            if (settings != null && settings.TaskOverrides != null && settings.TaskOverrides.TryGetValue(task.Id, out var over))
            {
                if (over.EveryDays.HasValue) d = over.EveryDays.Value;
            }
            return d;
        }
    }
}
