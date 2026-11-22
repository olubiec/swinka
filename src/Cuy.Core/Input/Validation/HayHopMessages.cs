using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Input.Validation
{
    /// <summary>
    /// Validation rules for Hay Hop minigame messages.
    /// </summary>
    public sealed class HayHopMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules
        {
            get
            {
                yield return new MessageRule(
                    "minigame.hay_hop.result",
                    FieldRule.Int("score", 0, 5000),
                    FieldRule.Int("durationMs", 0, 3600000),
                    FieldRule.Str("seed", 32, required: false));
            }
        }

        /// <summary>
        /// Validates the payload of a minigame.hay_hop.result message.
        /// Returns null when valid, or a short error code string when invalid.
        /// </summary>
        public static string ValidateResultPayload(JObject message)
        {
            if (message == null) return "null_message";

            var scoreTok = message["score"];
            if (scoreTok == null || scoreTok.Type == JTokenType.Null || scoreTok.Type == JTokenType.Undefined)
                return "missing_score";
            if (scoreTok.Type != JTokenType.Integer)
                return "invalid_score";

            long score = scoreTok.Value<long>();
            if (score < 0 || score > 5000)
                return "invalid_score";

            var durationTok = message["durationMs"];
            if (durationTok == null || durationTok.Type == JTokenType.Null || durationTok.Type == JTokenType.Undefined)
                return "missing_duration";
            if (durationTok.Type != JTokenType.Integer)
                return "invalid_duration";

            long durationMs = durationTok.Value<long>();
            if (durationMs < 0 || durationMs > 3600000)
                return "invalid_duration";

            var seedTok = message["seed"];
            if (seedTok != null && seedTok.Type != JTokenType.Null && seedTok.Type != JTokenType.Undefined)
            {
                if (seedTok.Type != JTokenType.String)
                    return "invalid_seed";
                string seed = seedTok.Value<string>() ?? string.Empty;
                if (seed.Length > 32)
                    return "invalid_seed";
            }

            return null;
        }
    }
}
