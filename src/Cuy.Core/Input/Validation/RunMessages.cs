using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Input.Validation
{
    /// <summary>
    /// Validation rules for garden run messages (run.out, run.in).
    /// </summary>
    public sealed class RunMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules
        {
            get
            {
                yield return new MessageRule("run.out", FieldRule.Str("pigId", 64));
                yield return new MessageRule("run.in", FieldRule.Str("pigId", 64));
            }
        }

        /// <summary>
        /// Validates the pigId payload of a run.out / run.in message.
        /// Returns null when valid, or a short error code string when invalid.
        /// </summary>
        public static string ValidatePigPayload(JObject message)
        {
            if (message == null) return "null_message";

            var tok = message["pigId"];
            if (tok == null || tok.Type == JTokenType.Null) return "missing_pig_id";
            if (tok.Type != JTokenType.String) return "invalid_pig_id_type";

            string pigId = tok.Value<string>();
            if (string.IsNullOrWhiteSpace(pigId)) return "empty_pig_id";
            if (pigId.Length > 64) return "pig_id_too_long";

            return null;
        }
    }
}
