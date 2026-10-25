using System.Collections.Generic;

namespace Cuy.Core.Care
{
    public class CareDataRoot
    {
        public List<CareTaskDefinition> Tasks { get; set; }
        public WeightAlertSettings WeightAlert { get; set; }
        public List<int> SnoozeMinutes { get; set; }
    }

    public class WeightAlertSettings
    {
        public int DropGrams { get; set; }
        public int DropPercent { get; set; }
    }

    public class CareTaskDefinition
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Schedule { get; set; } // "daily", "weekly", "every_n_days"
        public string Time { get; set; }
        public string Text { get; set; }
        public int? Weekday { get; set; } // 0 = Sunday ... 6 = Saturday
        public int? EveryDays { get; set; }
        public bool? WeightLog { get; set; }
    }
}
