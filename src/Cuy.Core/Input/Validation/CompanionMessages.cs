using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Input.Validation
{
    /// <summary>
    /// Validation rules for companion settings messages (<c>companion.set</c>).
    /// Discovered via reflection by <see cref="MessageValidator"/>.
    /// </summary>
    public sealed class CompanionMessages : IMessageRuleSet
    {
        public const string DefaultCompanionId = "garden_friend";
        private const int MaxIdLen = 128;
        private static readonly Regex IdPattern = new Regex("^[a-z0-9_:]+$", RegexOptions.Compiled);

        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("companion.set", FieldRule.Bool("enabled", true), FieldRule.Id("id", false))
        };

        /// <summary>
        /// Returns true when <paramref name="id"/> matches a known companion identifier
        /// (defaults to <see cref="DefaultCompanionId"/> when <paramref name="knownIds"/> is null).
        /// </summary>
        public static bool IsKnownCompanion(string id, IEnumerable<string> knownIds = null)
        {
            if (string.IsNullOrWhiteSpace(id))
                return false;

            if (knownIds == null)
                return string.Equals(id, DefaultCompanionId, StringComparison.Ordinal);

            foreach (var candidate in knownIds)
            {
                if (string.Equals(id, candidate, StringComparison.Ordinal))
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Validates a <c>companion.set</c> payload including companion catalog membership.
        /// Returns <c>null</c> when valid, or a short error code string when invalid.
        /// </summary>
        public static string ValidateSetPayload(JObject message, IEnumerable<string> knownIds = null)
        {
            if (message == null)
                return "null_message";

            if (!message.TryGetValue("enabled", out var enabledTok)
                || enabledTok == null
                || enabledTok.Type == JTokenType.Null
                || enabledTok.Type == JTokenType.Undefined)
            {
                return "missing_enabled";
            }

            if (enabledTok.Type != JTokenType.Boolean)
                return "invalid_enabled_type";

            if (message.TryGetValue("id", out var idTok)
                && idTok != null
                && idTok.Type != JTokenType.Null
                && idTok.Type != JTokenType.Undefined)
            {
                if (idTok.Type != JTokenType.String)
                    return "invalid_id_type";

                string id = idTok.Value<string>();
                if (string.IsNullOrWhiteSpace(id))
                    return "empty_id";

                if (id.Length > MaxIdLen)
                    return "id_too_long";

                if (!IdPattern.IsMatch(id))
                    return "invalid_id_format";

                if (!IsKnownCompanion(id, knownIds))
                    return "unknown_companion";
            }

            return null;
        }
    }
}
