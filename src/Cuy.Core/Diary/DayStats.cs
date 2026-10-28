using System;
using System.Collections.Generic;

namespace Cuy.Core.Diary
{
    public class DayStats
    {
        public string Date { get; set; }
        public int Fed { get; set; }
        public int Pets { get; set; }
        public int Games { get; set; }
        public int Poops { get; set; }
        public bool HasActivity { get; set; }

        public static DayStats FromCounters(string date, IDictionary<string, int> before, IDictionary<string, int> after)
        {
            if (before == null) before = new Dictionary<string, int>();
            if (after == null) after = new Dictionary<string, int>();

            int GetDelta(string key)
            {
                int valBefore = before.ContainsKey(key) ? before[key] : 0;
                int valAfter = after.ContainsKey(key) ? after[key] : 0;
                int delta = valAfter - valBefore;
                return delta < 0 ? 0 : delta;
            }

            var stats = new DayStats
            {
                Date = date,
                Fed = GetDelta("feedings"),
                Pets = GetDelta("pets"),
                Games = GetDelta("minigames_played"),
                Poops = GetDelta("poops_collected")
            };

            stats.HasActivity = stats.Fed > 0 || stats.Pets > 0 || stats.Games > 0 || stats.Poops > 0;

            return stats;
        }
    }
}
