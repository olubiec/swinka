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
            if (Settings.Pigs == null) Settings.Pigs = new List<CarePigProfile>();
            if (Settings.TaskOverrides == null) Settings.TaskOverrides = new Dictionary<string, CareTaskOverride>();
            if (LastDoneUtc == null) LastDoneUtc = new Dictionary<string, DateTime>();
            if (SnoozedUntilUtc == null) SnoozedUntilUtc = new Dictionary<string, DateTime>();
            if (History == null) History = new List<CareHistoryEntry>();
            if (Weights == null) Weights = new List<WeightEntry>();
            if (Streaks == null) Streaks = new Dictionary<string, int>();

            if (Settings.Pigs != null)
            {
                var validPigs = new List<CarePigProfile>();
                var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var allowedNames = new HashSet<string>(Settings.PigNames ?? new List<string>(), StringComparer.OrdinalIgnoreCase);

                foreach (var pig in Settings.Pigs)
                {
                    if (pig != null && !string.IsNullOrWhiteSpace(pig.Name) && allowedNames.Contains(pig.Name))
                    {
                        if (seen.Add(pig.Name))
                        {
                            validPigs.Add(pig);
                        }
                    }
                }
                Settings.Pigs = validPigs;
            }
        }

        public static CareState CreateNew()
        {
            return new CareState
            {
                Settings = new CareSettings
                {
                    ManualOptIn = true
                }
            };
        }
    }

    public class CarePigProfile
    {
        public string Name { get; set; }
        public string BirthDate { get; set; } // yyyy-MM-dd or null
        public string AdoptedDate { get; set; } // yyyy-MM-dd or null
        public int? BaselineGrams { get; set; }
    }

    public class CareSettings
    {
        public bool? ManualOptIn { get; set; }
        public List<CarePigProfile> Pigs { get; set; } = new List<CarePigProfile>();
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
