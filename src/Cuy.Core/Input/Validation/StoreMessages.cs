using System;
using System.Collections.Generic;

namespace Cuy.Core.Input.Validation
{
    /// <summary>
    /// Rules for the home store messages store_open and store_buy.
    /// Contract: docs/contracts/store.md.
    /// The kind list is not enforced by the generic validator (it has no enum rule);
    /// use <see cref="IsKnownKind"/> for it.
    /// </summary>
    public sealed class StoreMessages : IMessageRuleSet
    {
        public const int MaxIdLength = 64;
        public const int MinCount = 1;
        public const int MaxCount = 99;

        private static readonly string[] KnownKinds =
        {
            "room", "place", "item", "variant", "decor", "farm", "stall", "dorm"
        };

        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("store_open"),
            new MessageRule("store_buy",
                FieldRule.Str("kind", 16),
                FieldRule.Str("id", MaxIdLength),
                FieldRule.Int("count", MinCount, MaxCount))
        };

        public static bool IsKnownKind(string kind)
        {
            return kind != null && Array.IndexOf(KnownKinds, kind) >= 0;
        }
    }
}
