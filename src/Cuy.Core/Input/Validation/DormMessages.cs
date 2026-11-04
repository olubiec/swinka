using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Input.Validation
{
    public sealed class DormMessages : IMessageRuleSet
    {
        public const int MaxMoveInPigs = 6;
        public const int MaxPigIdLength = 64;

        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("dorm_unlock"),
            new MessageRule("dorm_upgrade"),
            // pigIds is an array, which FieldRule cannot express: see ValidatePigIds.
            new MessageRule("dorm_move_in"),
            new MessageRule(
                "dorm_move_out",
                FieldRule.Str("pigId", MaxPigIdLength))
        };

        /// <summary>Checks dorm_move_in pigIds: an array of 1 to 6 unique strings, each 1 to 64 characters.</summary>
        /// <returns>An error message, or null when the payload is valid.</returns>
        public static string ValidatePigIds(JObject message)
        {
            if (message == null) return "Message payload cannot be null.";
            if (!message.TryGetValue("pigIds", out JToken token) || token == null || token.Type != JTokenType.Array)
            {
                return "Field 'pigIds' must be an array.";
            }

            var items = (JArray)token;
            if (items.Count < 1 || items.Count > MaxMoveInPigs)
            {
                return $"Field 'pigIds' must contain between 1 and {MaxMoveInPigs} ids.";
            }

            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (var item in items)
            {
                if (item == null || item.Type != JTokenType.String)
                {
                    return "Field 'pigIds' must contain only string ids.";
                }

                string id = item.Value<string>() ?? string.Empty;
                if (id.Length == 0 || id.Length > MaxPigIdLength)
                {
                    return $"Each pig id must be between 1 and {MaxPigIdLength} characters.";
                }

                if (!seen.Add(id))
                {
                    return "Field 'pigIds' contains duplicate ids.";
                }
            }

            return null;
        }
    }
}
