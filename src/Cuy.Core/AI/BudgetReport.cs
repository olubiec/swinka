using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace Cuy.Core.AI
{
    public sealed class GroupBudgetStats
    {
        public string GroupName { get; set; }
        public double TotalSeconds { get; set; }
        public double ActualPercentage { get; set; }
        public double TargetPercentage { get; set; }
        public double DeviationPercentagePoints { get; set; }
        public bool IsWithinTolerance { get; set; }
    }

    public sealed class BudgetReport
    {
        public TimeSpan TotalTime { get; set; }
        public double DaysCount { get; set; }
        public List<GroupBudgetStats> Groups { get; set; } = new List<GroupBudgetStats>();
        public Dictionary<string, double> RareBehaviorsPerDay { get; set; } = new Dictionary<string, double>();
        public Dictionary<string, string> RareBehaviorTargets { get; set; } = new Dictionary<string, string>();
        public bool IsAllWithinTolerance { get; set; }

        public string FormatTable()
        {
            var sb = new StringBuilder();
            sb.AppendLine("==========================================================================================");
            sb.AppendLine(" GUINEA PIG DAY BUDGET REPORT (day_budget from actions.json)");
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                " Simulated time: {0:0.#} h ({1:0.0} days) | Total activity time: {2:0.#} s",
                TotalTime.TotalHours, DaysCount, TotalTime.TotalSeconds));
            sb.AppendLine("==========================================================================================");
            sb.AppendLine(string.Format("{0,-24} | {1,-10} | {2,-11} | {3,-10} | {4,-11} | {5}",
                "Action group", "Time (s)", "Share (%)", "Target (%)", "Deviation", "Status (<= 5 pts)"));
            sb.AppendLine(new string('-', 90));

            foreach (var g in Groups)
            {
                string status = g.IsWithinTolerance ? "PASS" : "FAIL";
                sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                    "{0,-24} | {1,8:0.#} s | {2,9:0.00}% | {3,8:0.00}% | {4,9:+0.00;-0.00; 0.00} p.p. | [{5}]",
                    g.GroupName, g.TotalSeconds, g.ActualPercentage, g.TargetPercentage, g.DeviationPercentagePoints, status));
            }

            sb.AppendLine(new string('-', 90));
            sb.AppendLine("RARE BEHAVIOURS PER DAY:");
            foreach (var kv in RareBehaviorsPerDay)
            {
                string target;
                RareBehaviorTargets.TryGetValue(kv.Key, out target);
                target = target ?? "-";
                sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                    "  - {0,-18}: {1,5:0.00} / day (target from actions.json: {2})",
                    kv.Key, kv.Value, target));
            }
            sb.AppendLine("==========================================================================================");
            return sb.ToString();
        }

        public override string ToString()
        {
            return FormatTable();
        }
    }
}
