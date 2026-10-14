using System;
using System.Collections.Generic;
using System.Globalization;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.AI
{
    /// <summary>
    /// Main data model loaded from assets/data/actions.json.
    /// </summary>
    public sealed class ActionsConfiguration
    {
        [JsonProperty("needs")]
        public List<string> Needs { get; set; } = new List<string>();

        [JsonProperty("decay_per_hour")]
        public Dictionary<string, double> DecayPerHour { get; set; } = new Dictionary<string, double>();

        [JsonProperty("day_budget")]
        public DailyBudget DailyBudget { get; set; } = new DailyBudget();

        [JsonProperty("selection")]
        public string FormulaDescription { get; set; }

        [JsonProperty("actions")]
        public List<ActionDefinition> Actions { get; set; } = new List<ActionDefinition>();

        [JsonProperty("events")]
        public Dictionary<string, JToken> Events { get; set; } = new Dictionary<string, JToken>();
    }

    /// <summary>
    /// Time budget for the day and the times of day.
    /// </summary>
    public sealed class DailyBudget
    {
        [JsonProperty("description")]
        public string Description { get; set; }

        /// <summary>Group -> share of time in percent (e.g. "rest_and_naps": 50).</summary>
        [JsonProperty("time_share_percent")]
        public Dictionary<string, double> TargetPercentages { get; set; } = new Dictionary<string, double>();


        [JsonProperty("times_of_day")]
        public Dictionary<string, JObject> TimePeriods { get; set; } = new Dictionary<string, JObject>();


        [JsonProperty("rare_per_day")]
        public Dictionary<string, string> RareBehaviorsPerDay { get; set; } = new Dictionary<string, string>();

        [JsonProperty("walking")]
        public string WalkingNote { get; set; }
    }

    /// <summary>
    /// A single guinea pig action for the Utility AI.
    /// </summary>
    public sealed class ActionDefinition
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("animation")]
        public string Animation { get; set; }

        [JsonProperty("duration_s")]
        public JToken DurationToken { get; set; }

        [JsonProperty("distance_px")]
        public JToken DistanceToken { get; set; }

        [JsonProperty("effects")]
        public Dictionary<string, double> Effects { get; set; } = new Dictionary<string, double>();

        [JsonProperty("base_weight")]
        public double? BaseWeight { get; set; }

        [JsonProperty("cooldown_s")]
        public double? CooldownSeconds { get; set; }

        [JsonProperty("daily_limit")]
        public JToken DailyLimitToken { get; set; }

        [JsonProperty("conditions")]
        public Dictionary<string, JToken> Conditions { get; set; } = new Dictionary<string, JToken>();

        [JsonProperty("consumes")]
        public Dictionary<string, double> Consumes { get; set; } = new Dictionary<string, double>();

        [JsonProperty("satisfies")]
        public List<string> Satisfies { get; set; } = new List<string>();

        [JsonProperty("moves")]
        public bool IsMovement { get; set; }

        [JsonProperty("signal")]
        public bool IsSignal { get; set; }

        [JsonProperty("enter")]
        public string EntryAnimation { get; set; }

        [JsonProperty("exit")]
        public string ExitAnimation { get; set; }

        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("stage_multiplier")]
        public Dictionary<string, double> StageMultipliers { get; set; } = new Dictionary<string, double>();

        [JsonProperty("time_multiplier")]
        public Dictionary<string, double> PeriodMultipliers { get; set; } = new Dictionary<string, double>();

        public double MinDurationSeconds
        {
            get
            {
                if (DurationToken == null) return 5.0;
                if (DurationToken.Type == JTokenType.Array)
                {
                    var arr = (JArray)DurationToken;
                    return arr.Count > 0 ? (double)arr[0] : 5.0;
                }
                return (double)DurationToken;
            }
        }

        public double MaxDurationSeconds
        {
            get
            {
                if (DurationToken == null) return 5.0;
                if (DurationToken.Type == JTokenType.Array)
                {
                    var arr = (JArray)DurationToken;
                    return arr.Count > 1 ? (double)arr[1] : (double)arr[0];
                }
                return (double)DurationToken;
            }
        }

        public int MinDistancePx
        {
            get
            {
                if (DistanceToken == null) return 0;
                if (DistanceToken.Type == JTokenType.Array)
                {
                    var arr = (JArray)DistanceToken;
                    return arr.Count > 0 ? (int)arr[0] : 0;
                }
                return (int)DistanceToken;
            }
        }

        public int MaxDistancePx
        {
            get
            {
                if (DistanceToken == null) return 0;
                if (DistanceToken.Type == JTokenType.Array)
                {
                    var arr = (JArray)DistanceToken;
                    return arr.Count > 1 ? (int)arr[1] : (int)arr[0];
                }
                return (int)DistanceToken;
            }
        }

        /// <summary>
        /// Returns the daily limit for the given life stage (or null if unlimited).
        /// </summary>
        public int? GetDailyLimit(LifeStage stage)
        {
            if (DailyLimitToken == null || DailyLimitToken.Type == JTokenType.Null)
                return null;

            if (DailyLimitToken.Type == JTokenType.Integer)
                return (int)DailyLimitToken;

            if (DailyLimitToken.Type == JTokenType.Object)
            {
                var obj = (JObject)DailyLimitToken;
                string key = LifeStages.DataKey(stage);
                JToken val;
                if (obj.TryGetValue(key, StringComparison.OrdinalIgnoreCase, out val))
                {
                    return (int)val;
                }
                if (obj.TryGetValue("adult", StringComparison.OrdinalIgnoreCase, out val))
                {
                    return (int)val;
                }
            }
            return null;
        }

        public double GetStageMultiplier(LifeStage stage)
        {
            if (StageMultipliers == null || StageMultipliers.Count == 0) return 1.0;
            string key = LifeStages.DataKey(stage);
            double m;
            if (StageMultipliers.TryGetValue(key, out m)) return m;
            return 1.0;
        }

        /// <summary>
        /// Assigns the action to one of the 6 day budget groups.
        /// </summary>
        public static string GetBudgetGroup(string actionId, DailyBudget budget = null)
        {
            string enGroup = GetBudgetGroupEnglish(actionId);
            if (budget != null && budget.TargetPercentages != null)
            {
                if (budget.TargetPercentages.ContainsKey(enGroup)) return enGroup;
            }
            return enGroup;
        }

        public static string GetBudgetGroup(string actionId)
        {
            return GetBudgetGroupEnglish(actionId);
        }

        public static string GetBudgetGroupEnglish(string actionId)
        {
            if (string.IsNullOrEmpty(actionId)) return "play_and_rare";
            switch (actionId.ToLowerInvariant())
            {
                case "rest":
                case "doze":
                case "nap":
                case "sleep":
                case "sleep_house":
                case "sleep_in_house":
                case "heat":
                case "cold":
                    return "rest_and_naps";

                case "eat_hay":
                case "drink":
                case "beg":
                case "begging":
                    return "eating_and_drinking";

                case "sniff":
                case "sniffing":
                case "look":
                case "looking":
                case "front_look":
                case "peek":
                    return "sniffing_and_looking";

                case "walk":
                    return "walking";

                case "scratch":
                case "scratching":
                case "chin_rub":
                case "chin_marking":
                case "groom_other":
                case "grooming_other":
                    return "grooming";

                default:
                    return "play_and_rare";
            }
        }
    }
}
