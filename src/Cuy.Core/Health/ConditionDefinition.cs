using System.Collections.Generic;
using Newtonsoft.Json;

namespace Cuy.Core.Health
{
    public class HealthData
    {
        [JsonProperty("checkup_price")]
        public int CheckupPrice { get; set; }

        [JsonProperty("severity_growth_per_day")]
        public double SeverityGrowthPerDay { get; set; }

        [JsonProperty("conditions")]
        public List<ConditionDefinition> Conditions { get; set; } = new List<ConditionDefinition>();
    }

    public class ConditionDefinition
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("trigger")]
        public ConditionTrigger Trigger { get; set; }

        [JsonProperty("chance_per_day")]
        public double ChancePerDay { get; set; }

        [JsonProperty("risk_multipliers")]
        public Dictionary<string, double> RiskMultipliers { get; set; }

        [JsonProperty("extra_decay_per_hour")]
        public Dictionary<string, double> ExtraDecayPerHour { get; set; }

        [JsonProperty("refuses_treats")]
        public bool RefusesTreats { get; set; }

        [JsonProperty("slow_walk")]
        public bool SlowWalk { get; set; }

        [JsonProperty("scratching")]
        public double Scratching { get; set; }

        [JsonProperty("animation")]
        public string Animation { get; set; }

        [JsonProperty("treatment")]
        public ConditionTreatment Treatment { get; set; }

        [JsonProperty("info")]
        public string Info { get; set; }
    }

    public class ConditionTrigger
    {
        [JsonProperty("need")]
        public string NeedKey { get; set; }

        [JsonProperty("below")]
        public double? Below { get; set; }

        [JsonProperty("for_hours")]
        public double? ForHours { get; set; }

        [JsonProperty("random")]
        public bool Random { get; set; }

        [JsonProperty("sweet_treats_today_above")]
        public int? SweetTreatsTodayAbove { get; set; }
    }

    public class ConditionTreatment
    {
        [JsonProperty("price")]
        public int Price { get; set; }

        [JsonProperty("course_days")]
        public int CourseDays { get; set; }

        [JsonProperty("cure_need")]
        public CureNeed CureNeed { get; set; }
    }

    public class CureNeed
    {
        [JsonProperty("need")]
        public string NeedKey { get; set; }

        [JsonProperty("above")]
        public double Above { get; set; }
    }
}
