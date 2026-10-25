using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Cuy.Core.Health
{
    public class HealthState
    {
        [JsonProperty("active")]
        public List<ActiveCondition> Active { get; set; } = new List<ActiveCondition>();

        [JsonProperty("history")]
        public List<HealthHistoryEntry> History { get; set; } = new List<HealthHistoryEntry>();

        [JsonProperty("low_need_hours")]
        public Dictionary<string, double> LowNeedHours { get; set; } = new Dictionary<string, double>();

        [JsonProperty("last_checkup_utc")]
        public DateTime LastCheckupUtc { get; set; }

        [JsonProperty("sweet_treats_today")]
        public int SweetTreatsToday { get; set; }

        [JsonProperty("treats_local_date")]
        public string TreatsLocalDate { get; set; }

        [JsonProperty("last_roll_local_date")]
        public string LastRollLocalDate { get; set; }

        [JsonIgnore]
        public Random RandomSeed { get; set; }
    }

    public class ActiveCondition
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("since_utc")]
        public DateTime SinceUtc { get; set; }

        [JsonProperty("severity")]
        public double Severity { get; set; }

        [JsonProperty("known")]
        public bool Known { get; set; }

        [JsonProperty("treated")]
        public bool Treated { get; set; }

        [JsonProperty("course_days_left")]
        public int CourseDaysLeft { get; set; }

        [JsonProperty("last_dose_local_date")]
        public string LastDoseLocalDate { get; set; }
    }

    public class HealthHistoryEntry
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("start_utc")]
        public DateTime StartUtc { get; set; }

        [JsonProperty("end_utc")]
        public DateTime EndUtc { get; set; }
    }
}
