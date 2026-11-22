using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Input.Validation
{
    /// <summary>
    /// Validation rules for desktop props messages (props.place, props.move, props.remove, props.toRoom, props.fromRoom).
    /// Discovered via reflection by MessageValidator.
    /// </summary>
    public sealed class PropsMessages : IMessageRuleSet
    {
        private const int MaxIdLen = 64;
        private const int MinRoomCell = -1;
        private const int MaxRoomCell = 200;

        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("props.place", FieldRule.Str("itemId", MaxIdLen)),
            new MessageRule("props.move", FieldRule.Str("uid", MaxIdLen)),
            new MessageRule("props.remove", FieldRule.Str("uid", MaxIdLen)),
            new MessageRule("props.toRoom", FieldRule.Str("uid", MaxIdLen), FieldRule.Str("room", MaxIdLen), FieldRule.Int("x", MinRoomCell, MaxRoomCell), FieldRule.Int("y", MinRoomCell, MaxRoomCell)),
            new MessageRule("props.fromRoom", FieldRule.Str("room", MaxIdLen), FieldRule.Str("uid", MaxIdLen))
        };

        /// <summary>
        /// Validates a props.* message payload including double ranges [0,1] and NaN/Infinity rejection.
        /// Returns null when valid, or a short error code string when invalid.
        /// </summary>
        public static string Validate(string type, JObject message)
        {
            if (string.IsNullOrWhiteSpace(type)) return "missing_type";
            if (message == null) return "null_message";

            switch (type)
            {
                case "props.place":
                case "prop_place":
                    return ValidateString(message, "itemId", MaxIdLen)
                        ?? ValidateUnitDouble(message, "x")
                        ?? ValidateUnitDouble(message, "y");

                case "props.move":
                case "prop_move":
                    return ValidateString(message, "uid", MaxIdLen)
                        ?? ValidateUnitDouble(message, "x")
                        ?? ValidateUnitDouble(message, "y");

                case "props.remove":
                case "prop_remove":
                    return ValidateString(message, "uid", MaxIdLen);

                case "props.toRoom":
                case "prop_to_room":
                    return ValidateString(message, "uid", MaxIdLen)
                        ?? ValidateString(message, "room", MaxIdLen)
                        ?? ValidateIntRange(message, "x", MinRoomCell, MaxRoomCell)
                        ?? ValidateIntRange(message, "y", MinRoomCell, MaxRoomCell);

                case "props.fromRoom":
                case "prop_from_room":
                    return ValidateString(message, "room", MaxIdLen)
                        ?? ValidateString(message, "uid", MaxIdLen)
                        ?? ValidateUnitDouble(message, "x")
                        ?? ValidateUnitDouble(message, "y");

                default:
                    return "unknown_type";
            }
        }

        private static string ValidateString(JObject message, string field, int maxLen)
        {
            var tok = message[field];
            if (tok == null || tok.Type == JTokenType.Null) return "missing_" + field;
            if (tok.Type != JTokenType.String) return "invalid_" + field + "_type";

            string val = tok.Value<string>();
            if (string.IsNullOrWhiteSpace(val)) return "empty_" + field;
            if (val.Length > maxLen) return field + "_too_long";
            return null;
        }

        private static string ValidateUnitDouble(JObject message, string field)
        {
            var tok = message[field];
            if (tok == null || tok.Type == JTokenType.Null) return "missing_" + field;
            if (tok.Type != JTokenType.Float && tok.Type != JTokenType.Integer) return "invalid_" + field + "_type";

            double val = tok.Value<double>();
            if (double.IsNaN(val) || double.IsInfinity(val)) return "invalid_" + field + "_number";
            if (val < 0.0 || val > 1.0) return field + "_out_of_range";
            return null;
        }

        private static string ValidateIntRange(JObject message, string field, int min, int max)
        {
            var tok = message[field];
            if (tok == null || tok.Type == JTokenType.Null) return "missing_" + field;
            if (tok.Type != JTokenType.Integer) return "invalid_" + field + "_type";

            long val = tok.Value<long>();
            if (val < min || val > max) return field + "_out_of_range";
            return null;
        }
    }
}
