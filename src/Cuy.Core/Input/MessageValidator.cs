using System;
using System.Collections.Generic;
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Input
{
    public enum ValidationStatus
    {
        Ok,
        Invalid,
        Unknown
    }

    public readonly struct ValidationResult : IEquatable<ValidationResult>
    {
        public ValidationStatus Status { get; }
        public string Error { get; }

        public bool IsOk => Status == ValidationStatus.Ok;
        public bool IsInvalid => Status == ValidationStatus.Invalid;
        public bool IsUnknown => Status == ValidationStatus.Unknown;

        private ValidationResult(ValidationStatus status, string error)
        {
            Status = status;
            Error = error;
        }

        public static ValidationResult Ok { get; } = new ValidationResult(ValidationStatus.Ok, null);
        public static ValidationResult Unknown { get; } = new ValidationResult(ValidationStatus.Unknown, null);
        public static ValidationResult Invalid(string error) => new ValidationResult(ValidationStatus.Invalid, error ?? "Invalid message.");

        public bool Equals(ValidationResult other) => Status == other.Status && string.Equals(Error, other.Error, StringComparison.Ordinal);
        public override bool Equals(object obj) => obj is ValidationResult other && Equals(other);
        public override int GetHashCode() => ((int)Status * 397) ^ (Error != null ? Error.GetHashCode() : 0);
        public static bool operator ==(ValidationResult left, ValidationResult right) => left.Equals(right);
        public static bool operator !=(ValidationResult left, ValidationResult right) => !left.Equals(right);
        public override string ToString() => Status == ValidationStatus.Invalid ? $"Invalid({Error})" : Status.ToString();
    }

    public static class MessageValidator
    {
        private static readonly object SyncLock = new object();
        private static Dictionary<string, MessageRule> _rules;

        private static Dictionary<string, MessageRule> GetRules()
        {
            if (_rules != null)
                return _rules;

            lock (SyncLock)
            {
                if (_rules == null)
                {
                    _rules = DiscoverRules(typeof(IMessageRuleSet).Assembly);
                }
                return _rules;
            }
        }

        public static Dictionary<string, MessageRule> DiscoverRules(Assembly assembly)
        {
            if (assembly == null)
                throw new ArgumentNullException(nameof(assembly));

            var ruleSets = new List<IMessageRuleSet>();
            foreach (var type in assembly.GetExportedTypes())
            {
                if (!type.IsClass || type.IsAbstract)
                    continue;
                if (!typeof(IMessageRuleSet).IsAssignableFrom(type))
                    continue;
                var ctor = type.GetConstructor(Type.EmptyTypes);
                if (ctor == null)
                    continue;

                var instance = (IMessageRuleSet)Activator.CreateInstance(type);
                ruleSets.Add(instance);
            }

            return BuildRuleMap(ruleSets);
        }

        public static Dictionary<string, MessageRule> BuildRuleMap(IEnumerable<IMessageRuleSet> ruleSets)
        {
            var map = new Dictionary<string, MessageRule>(StringComparer.Ordinal);
            var owners = new Dictionary<string, string>(StringComparer.Ordinal);

            if (ruleSets == null)
                return map;

            foreach (var set in ruleSets)
            {
                if (set == null || set.Rules == null)
                    continue;

                string ownerName = set.GetType().FullName ?? set.GetType().Name;
                foreach (var rule in set.Rules)
                {
                    if (rule == null)
                        continue;

                    if (map.ContainsKey(rule.Type))
                    {
                        string existingOwner = owners[rule.Type];
                        throw new InvalidOperationException(
                            $"Duplicate message rule for type '{rule.Type}' registered by both '{existingOwner}' and '{ownerName}'.");
                    }

                    map[rule.Type] = rule;
                    owners[rule.Type] = ownerName;
                }
            }

            return map;
        }

        public static ValidationResult Validate(string type, JObject message)
        {
            return ValidateWithRules(GetRules(), type, message);
        }

        public static ValidationResult Validate(JObject message)
        {
            if (message == null)
                return ValidationResult.Invalid("Message cannot be null.");

            string type = message["type"]?.Type == JTokenType.String ? message["type"].Value<string>() : null;
            return Validate(type, message);
        }

        public static ValidationResult ValidateWithRules(IReadOnlyDictionary<string, MessageRule> rules, string type, JObject message)
        {
            if (string.IsNullOrEmpty(type))
                return ValidationResult.Invalid("Message type is required.");

            if (rules == null || !rules.TryGetValue(type, out var rule))
                return ValidationResult.Unknown;

            if (message == null)
                return ValidationResult.Invalid("Message payload cannot be null.");

            foreach (var field in rule.Fields)
            {
                string error = field.Validate(message);
                if (error != null)
                    return ValidationResult.Invalid(error);
            }

            return ValidationResult.Ok;
        }
    }
}
