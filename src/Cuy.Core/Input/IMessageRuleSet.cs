using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Input
{
    public interface IMessageRuleSet
    {
        IEnumerable<MessageRule> Rules { get; }
    }

    public sealed class MessageRule
    {
        public string Type { get; }
        public IReadOnlyList<FieldRule> Fields { get; }

        public MessageRule(string type, params FieldRule[] fields)
        {
            if (string.IsNullOrWhiteSpace(type))
                throw new ArgumentException("Message type cannot be empty.", nameof(type));
            Type = type;
            Fields = fields ?? Array.Empty<FieldRule>();
        }
    }

    public enum FieldKind
    {
        String,
        Int,
        Bool,
        Id
    }

    public sealed class FieldRule
    {
        private static readonly Regex IdPattern = new Regex("^[a-z0-9_:]+$", RegexOptions.Compiled);

        public string Name { get; }
        public FieldKind Kind { get; }
        public bool Required { get; }
        public int MaxLen { get; }
        public int Min { get; }
        public int Max { get; }

        private FieldRule(string name, FieldKind kind, bool required, int maxLen = 0, int min = 0, int max = 0)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Field name cannot be empty.", nameof(name));
            Name = name;
            Kind = kind;
            Required = required;
            MaxLen = maxLen;
            Min = min;
            Max = max;
        }

        public static FieldRule Str(string name, int maxLen, bool required = true)
            => new FieldRule(name, FieldKind.String, required, maxLen: maxLen);

        public static FieldRule Int(string name, int min, int max, bool required = true)
            => new FieldRule(name, FieldKind.Int, required, min: min, max: max);

        public static FieldRule Bool(string name, bool required = true)
            => new FieldRule(name, FieldKind.Bool, required);

        public static FieldRule Id(string name, bool required = true)
            => new FieldRule(name, FieldKind.Id, required, maxLen: 128);

        public string Validate(JObject message)
        {
            JToken token = null;
            bool exists = message != null && message.TryGetValue(Name, out token) && token != null && token.Type != JTokenType.Null && token.Type != JTokenType.Undefined;

            if (!exists)
            {
                return Required ? $"Missing required field '{Name}'." : null;
            }

            switch (Kind)
            {
                case FieldKind.String:
                    if (token.Type != JTokenType.String)
                        return $"Field '{Name}' must be a string.";
                    string strVal = token.Value<string>() ?? string.Empty;
                    if (MaxLen > 0 && strVal.Length > MaxLen)
                        return $"Field '{Name}' exceeds maximum length of {MaxLen}.";
                    return null;

                case FieldKind.Int:
                    if (token.Type != JTokenType.Integer)
                        return $"Field '{Name}' must be an integer.";
                    long longVal = token.Value<long>();
                    if (longVal < Min || longVal > Max)
                        return $"Field '{Name}' must be between {Min} and {Max}.";
                    return null;

                case FieldKind.Bool:
                    if (token.Type != JTokenType.Boolean)
                        return $"Field '{Name}' must be a boolean.";
                    return null;

                case FieldKind.Id:
                    if (token.Type != JTokenType.String)
                        return $"Field '{Name}' must be a string id.";
                    string idVal = token.Value<string>() ?? string.Empty;
                    if (string.IsNullOrEmpty(idVal))
                        return $"Field '{Name}' cannot be empty.";
                    if (MaxLen > 0 && idVal.Length > MaxLen)
                        return $"Field '{Name}' exceeds maximum length of {MaxLen}.";
                    if (!IdPattern.IsMatch(idVal))
                        return $"Field '{Name}' has invalid id format.";
                    return null;

                default:
                    return null;
            }
        }
    }
}
