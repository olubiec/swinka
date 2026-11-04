using System.Collections.Generic;

namespace Cuy.Core.Input.Validation
{
    public sealed class PigRoomsMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule(
                "room_variant",
                FieldRule.Str("place", 128),
                FieldRule.Str("uid", 64),
                FieldRule.Int("variant", 0, 7)),
            new MessageRule(
                "room_variant_unlock",
                FieldRule.Str("itemId", 64),
                FieldRule.Int("variant", 1, 7)),
            new MessageRule(
                "room_rename",
                FieldRule.Str("place", 128),
                FieldRule.Str("name", 24)),
            new MessageRule(
                "room_transfer",
                FieldRule.Str("from", 128),
                FieldRule.Str("to", 128),
                FieldRule.Str("uid", 64),
                FieldRule.Int("x", -1, 200),
                FieldRule.Int("y", -1, 200))
        };
    }
}
