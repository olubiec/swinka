using System;
using System.Collections.Generic;

namespace Cuy.Core.Care
{
    public class CareState
    {
        public CareSettings Settings { get; set; } = new CareSettings();
        public Dictionary<string, DateTime> LastDoneUtc { get; set; } = new Dictionary<string, DateTime>();
        public Dictionary<string, DateTime> SnoozedUntilUtc { get; set; } = new Dictionary<string, DateTime>();
        public List<CareHistoryEntry> History { get; set; } = new List<CareHistoryEntry>();
        public List<WeightEntry> Weights { get; set; } = new List<WeightEntry>();
        public Dictionary<string, int> Streaks { get; set; } = new Dictionary<string, int>();

        public void Normalize()
        {
            if (Settings == null) Settings = new CareSettings();
            if (Settings.PigNames == null) Settings.PigNames = new List<string>();
            if (Settings.TaskOverrides == null) Settings.TaskOverrides = new Dictionary<string, CareTaskOverride>();
            if (LastDoneUtc == null) LastDoneUtc = new Dictionary<string, DateTime>();
            if (SnoozedUntilUtc == null) SnoozedUntilUtc = new Dictionary<string, DateTime>();
            if (History == null) History = new List<CareHistoryEntry>();
            if (Weights == null) Weights = new List<WeightEntry>();
            if (Streaks == null) Streaks = new Dictionary<string, int>();
        }
    }

    public class CareSettings
    {
        public List<string> PigNames { get; set; } = new List<string>();
        public Dictionary<string, CareTaskOverride> TaskOverrides { get; set; } = new Dictionary<string, CareTaskOverride>();
    }

    public class CareTaskOverride
    {
        public bool Enabled { get; set; } = true;
        public string Time { get; set; }
        public int? Weekday { get; set; }
        public int? EveryDays { get; set; }
    }

    public class CareHistoryEntry
    {
        public string LocalDate { get; set; } // yyyy-MM-dd
        public string TaskId { get; set; }
    }

    public class WeightEntry
    {
        public string LocalDate { get; set; } // yyyy-MM-dd
        public string Pig { get; set; }
        public int Grams { get; set; }
    }
}
