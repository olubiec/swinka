using System;
using System.Collections.Generic;
using System.Globalization;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SwinkaCore.AI
{
    /// <summary>
    /// Główny model danych wczytywany z swinka/dane/actions.json.
    /// </summary>
    public sealed class ActionsConfiguration
    {
        [JsonProperty("potrzeby")]
        public List<string> Needs { get; set; } = new List<string>();

        [JsonProperty("spadek_na_godzine")]
        public Dictionary<string, double> DecayPerHour { get; set; } = new Dictionary<string, double>();

        [JsonProperty("budzet_dnia")]
        public DailyBudget DailyBudget { get; set; } = new DailyBudget();

        [JsonProperty("wybor")]
        public string FormulaDescription { get; set; }

        [JsonProperty("czynnosci")]
        public List<ActionDefinition> Actions { get; set; } = new List<ActionDefinition>();

        [JsonProperty("zdarzenia")]
        public Dictionary<string, JToken> Events { get; set; } = new Dictionary<string, JToken>();
    }

    /// <summary>
    /// Budżet czasu dla doby i pory dnia.
    /// </summary>
    public sealed class DailyBudget
    {
        [JsonProperty("opis")]
        public string Description { get; set; }

        /// <summary>Grupa -> procent czasu (np. "odpoczynek_i_drzemki": 50).</summary>
        [JsonProperty("procent_czasu")]
        public Dictionary<string, double> TargetPercentages { get; set; } = new Dictionary<string, double>();

        [JsonProperty("pory")]
        public Dictionary<string, JObject> TimePeriods { get; set; } = new Dictionary<string, JObject>();

        [JsonProperty("rzadkie_na_dobe")]
        public Dictionary<string, string> RareBehaviorsPerDay { get; set; } = new Dictionary<string, string>();

        [JsonProperty("chodzenie")]
        public string WalkingNote { get; set; }
    }

    /// <summary>
    /// Definicja pojedynczej czynności świnki w Utility AI.
    /// </summary>
    public sealed class ActionDefinition
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("animacja")]
        public string Animation { get; set; }

        [JsonProperty("czas_s")]
        public JToken DurationToken { get; set; }

        [JsonProperty("dystans_px")]
        public JToken DistanceToken { get; set; }

        [JsonProperty("efekty")]
        public Dictionary<string, double> Effects { get; set; } = new Dictionary<string, double>();

        [JsonProperty("waga_bazowa")]
        public double BaseWeight { get; set; }

        [JsonProperty("cooldown_s")]
        public double? CooldownSeconds { get; set; }

        [JsonProperty("limit_dzienny")]
        public JToken DailyLimitToken { get; set; }

        [JsonProperty("warunki")]
        public Dictionary<string, JToken> Conditions { get; set; } = new Dictionary<string, JToken>();

        [JsonProperty("zuzywa")]
        public Dictionary<string, double> Consumes { get; set; } = new Dictionary<string, double>();

        [JsonProperty("zaspokaja")]
        public List<string> Satisfies { get; set; } = new List<string>();

        [JsonProperty("ruch")]
        public bool IsMovement { get; set; }

        [JsonProperty("sygnal")]
        public bool IsSignal { get; set; }

        [JsonProperty("wejscie")]
        public string EntryAnimation { get; set; }

        [JsonProperty("wyjscie")]
        public string ExitAnimation { get; set; }

        [JsonProperty("opis")]
        public string Description { get; set; }

        [JsonProperty("mnoznik_etapu")]
        public Dictionary<string, double> StageMultipliers { get; set; } = new Dictionary<string, double>();

        [JsonProperty("mnoznik_pory")]
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
                JToken val;
                if (obj.TryGetValue(key, StringComparison.OrdinalIgnoreCase, out val))
                {
                    return (int)val;
                }
                if (obj.TryGetValue("dorosla", StringComparison.OrdinalIgnoreCase, out val))
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
        /// Przypisuje czynność do jednej z 6 grup budżetu dnia.
        /// </summary>
        public static string GetBudgetGroup(string actionId)
        {
            if (string.IsNullOrEmpty(actionId)) return "zabawa_i_rzadkie";
            switch (actionId)
            {
                case "odpoczynek":
                case "drzemka":
                case "sen":
                case "sen_w_domku":
                case "upal":
                    return "odpoczynek_i_drzemki";

                case "jedzenie_siana":
                case "picie":
                case "proszenie":
                    return "jedzenie_i_picie";

                case "weszenie":
                    return "weszenie_rozgladanie";

                case "spacer":
                    return "chodzenie";

                case "drapanie":
                case "znaczenie_broda":
                    return "pielegnacja";

                default:
                    return "zabawa_i_rzadkie";
            }
        }
    }
}
