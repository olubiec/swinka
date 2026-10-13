using System;
using System.Collections.Generic;
using System.Globalization;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.AI
{
    /// <summary>
    /// Główny model danych wczytywany z swinka/dane/actions.json.
    /// </summary>
    public sealed class ActionsConfiguration
    {
        [JsonProperty("needs")]
        public List<string> Needs { get; set; } = new List<string>();

        [JsonProperty("potrzeby")]
        private List<string> NeedsPl { set { if (value != null && value.Count > 0) Needs = value; } }

        [JsonProperty("decay_per_hour")]
        public Dictionary<string, double> DecayPerHour { get; set; } = new Dictionary<string, double>();

        [JsonProperty("spadek_na_godzine")]
        private Dictionary<string, double> DecayPerHourPl { set { if (value != null && value.Count > 0) DecayPerHour = value; } }

        [JsonProperty("daily_budget")]
        public DailyBudget DailyBudget { get; set; } = new DailyBudget();

        [JsonProperty("day_budget")]
        private DailyBudget DayBudgetEn { set { if (value != null) DailyBudget = value; } }

        [JsonProperty("budzet_dnia")]
        private DailyBudget DailyBudgetPl { set { if (value != null) DailyBudget = value; } }

        [JsonProperty("selection")]
        public string FormulaDescription { get; set; }

        [JsonProperty("wybor")]
        private string FormulaDescriptionPl { set { if (value != null) FormulaDescription = value; } }

        [JsonProperty("actions")]
        public List<ActionDefinition> Actions { get; set; } = new List<ActionDefinition>();

        [JsonProperty("czynnosci")]
        private List<ActionDefinition> ActionsPl { set { if (value != null && value.Count > 0) Actions = value; } }

        [JsonProperty("events")]
        public Dictionary<string, JToken> Events { get; set; } = new Dictionary<string, JToken>();

        [JsonProperty("zdarzenia")]
        private Dictionary<string, JToken> EventsPl { set { if (value != null && value.Count > 0) Events = value; } }
    }

    /// <summary>
    /// Budżet czasu dla doby i pory dnia.
    /// </summary>
    public sealed class DailyBudget
    {
        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("opis")]
        private string DescriptionPl { set { if (value != null) Description = value; } }

        /// <summary>Grupa -> procent czasu (np. "odpoczynek_i_drzemki": 50 lub "rest_and_naps": 50).</summary>
        [JsonProperty("time_percentages")]
        public Dictionary<string, double> TargetPercentages { get; set; } = new Dictionary<string, double>();

        [JsonProperty("time_share_percent")]
        private Dictionary<string, double> TargetPercentagesEn { set { if (value != null && value.Count > 0) TargetPercentages = value; } }

        [JsonProperty("procent_czasu")]
        private Dictionary<string, double> TargetPercentagesPl { set { if (value != null && value.Count > 0) TargetPercentages = value; } }

        [JsonProperty("periods")]
        public Dictionary<string, JObject> TimePeriods { get; set; } = new Dictionary<string, JObject>();

        [JsonProperty("times_of_day")]
        private Dictionary<string, JObject> TimePeriodsEn { set { if (value != null && value.Count > 0) TimePeriods = value; } }

        [JsonProperty("pory")]
        private Dictionary<string, JObject> TimePeriodsPl { set { if (value != null && value.Count > 0) TimePeriods = value; } }

        [JsonProperty("rare_per_day")]
        public Dictionary<string, string> RareBehaviorsPerDay { get; set; } = new Dictionary<string, string>();

        [JsonProperty("rzadkie_na_dobe")]
        private Dictionary<string, string> RareBehaviorsPerDayPl { set { if (value != null && value.Count > 0) RareBehaviorsPerDay = value; } }

        [JsonProperty("walking")]
        public string WalkingNote { get; set; }

        [JsonProperty("chodzenie")]
        private string WalkingNotePl { set { if (value != null) WalkingNote = value; } }
    }

    /// <summary>
    /// Definicja pojedynczej czynności świnki w Utility AI.
    /// </summary>
    public sealed class ActionDefinition
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("animation")]
        public string Animation { get; set; }

        [JsonProperty("animacja")]
        private string AnimationPl { set { if (value != null) Animation = value; } }

        [JsonProperty("duration_s")]
        public JToken DurationToken { get; set; }

        [JsonProperty("czas_s")]
        private JToken DurationTokenPl { set { if (value != null) DurationToken = value; } }

        [JsonProperty("distance_px")]
        public JToken DistanceToken { get; set; }

        [JsonProperty("dystans_px")]
        private JToken DistanceTokenPl { set { if (value != null) DistanceToken = value; } }

        [JsonProperty("effects")]
        public Dictionary<string, double> Effects { get; set; } = new Dictionary<string, double>();

        [JsonProperty("efekty")]
        private Dictionary<string, double> EffectsPl { set { if (value != null && value.Count > 0) Effects = value; } }

        [JsonProperty("base_weight")]
        public double? BaseWeight { get; set; }

        [JsonProperty("waga_bazowa")]
        private double? BaseWeightPl { set { BaseWeight = value; } }

        [JsonProperty("cooldown_s")]
        public double? CooldownSeconds { get; set; }

        [JsonProperty("daily_limit")]
        public JToken DailyLimitToken { get; set; }

        [JsonProperty("limit_dzienny")]
        private JToken DailyLimitTokenPl { set { if (value != null) DailyLimitToken = value; } }

        [JsonProperty("conditions")]
        public Dictionary<string, JToken> Conditions { get; set; } = new Dictionary<string, JToken>();

        [JsonProperty("warunki")]
        private Dictionary<string, JToken> ConditionsPl { set { if (value != null && value.Count > 0) Conditions = value; } }

        [JsonProperty("consumes")]
        public Dictionary<string, double> Consumes { get; set; } = new Dictionary<string, double>();

        [JsonProperty("zuzywa")]
        private Dictionary<string, double> ConsumesPl { set { if (value != null && value.Count > 0) Consumes = value; } }

        [JsonProperty("satisfies")]
        public List<string> Satisfies { get; set; } = new List<string>();

        [JsonProperty("zaspokaja")]
        private List<string> SatisfiesPl { set { if (value != null && value.Count > 0) Satisfies = value; } }

        [JsonProperty("movement")]
        public bool IsMovement { get; set; }

        [JsonProperty("ruch")]
        private bool IsMovementPl { set { IsMovement = value; } }

        [JsonProperty("signal")]
        public bool IsSignal { get; set; }

        [JsonProperty("sygnal")]
        private bool IsSignalPl { set { IsSignal = value; } }

        [JsonProperty("entry_animation")]
        public string EntryAnimation { get; set; }

        [JsonProperty("wejscie")]
        private string EntryAnimationPl { set { if (value != null) EntryAnimation = value; } }

        [JsonProperty("exit_animation")]
        public string ExitAnimation { get; set; }

        [JsonProperty("wyjscie")]
        private string ExitAnimationPl { set { if (value != null) ExitAnimation = value; } }

        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("opis")]
        private string DescriptionPl { set { if (value != null) Description = value; } }

        [JsonProperty("stage_multipliers")]
        public Dictionary<string, double> StageMultipliers { get; set; } = new Dictionary<string, double>();

        [JsonProperty("mnoznik_etapu")]
        private Dictionary<string, double> StageMultipliersPl { set { if (value != null && value.Count > 0) StageMultipliers = value; } }

        [JsonProperty("period_multipliers")]
        public Dictionary<string, double> PeriodMultipliers { get; set; } = new Dictionary<string, double>();

        [JsonProperty("mnoznik_pory")]
        private Dictionary<string, double> PeriodMultipliersPl { set { if (value != null && value.Count > 0) PeriodMultipliers = value; } }

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
        /// Zwraca limit dzienny dla wskazanego etapu życia (lub null, jeśli bez limitu).
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
                string plKey = LifeStages.PolishDataKey(stage);
                JToken val;
                if (obj.TryGetValue(key, StringComparison.OrdinalIgnoreCase, out val) ||
                    obj.TryGetValue(plKey, StringComparison.OrdinalIgnoreCase, out val))
                {
                    return (int)val;
                }
                if (obj.TryGetValue("adult", StringComparison.OrdinalIgnoreCase, out val) ||
                    obj.TryGetValue("dorosla", StringComparison.OrdinalIgnoreCase, out val))
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
            string plKey = LifeStages.PolishDataKey(stage);
            double m;
            if (StageMultipliers.TryGetValue(key, out m) || StageMultipliers.TryGetValue(plKey, out m)) return m;
            return 1.0;
        }

        /// <summary>
        /// Przypisuje czynność do jednej z 6 grup budżetu dnia.
        /// </summary>
        public static string GetBudgetGroup(string actionId, DailyBudget budget = null)
        {
            string enGroup = GetBudgetGroupEnglish(actionId);
            if (budget != null && budget.TargetPercentages != null)
            {
                if (budget.TargetPercentages.ContainsKey(enGroup)) return enGroup;
                string plGroup = ToPolishBudgetGroup(enGroup);
                if (budget.TargetPercentages.ContainsKey(plGroup)) return plGroup;
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
                case "odpoczynek":
                case "doze":
                case "nap":
                case "drzemka":
                case "sleep":
                case "sen":
                case "sleep_house":
                case "sleep_in_house":
                case "sen_w_domku":
                case "heat":
                case "upal":
                case "cold":
                case "zimno":
                    return "rest_and_naps";

                case "eat_hay":
                case "jedzenie_siana":
                case "drink":
                case "picie":
                case "beg":
                case "begging":
                case "proszenie":
                    return "eating_and_drinking";

                case "sniff":
                case "sniffing":
                case "weszenie":
                case "look":
                case "looking":
                case "front_look":
                case "peek":
                    return "sniffing_and_looking";

                case "walk":
                case "spacer":
                    return "walking";

                case "scratch":
                case "scratching":
                case "drapanie":
                case "chin_rub":
                case "chin_marking":
                case "znaczenie_broda":
                case "groom_other":
                case "wylizywanie":
                    return "grooming";

                default:
                    return "play_and_rare";
            }
        }

        public static string ToPolishBudgetGroup(string enGroup)
        {
            switch (enGroup)
            {
                case "rest_and_naps": return "odpoczynek_i_drzemki";
                case "eating_and_drinking": return "jedzenie_i_picie";
                case "sniffing_and_looking":
                case "sniffing_looking": return "weszenie_rozgladanie";
                case "walking": return "chodzenie";
                case "grooming": return "pielegnacja";
                default: return "zabawa_i_rzadkie";
            }
        }
    }
}
