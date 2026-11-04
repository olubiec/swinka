using System.Collections.Generic;

namespace Cuy.Core.Input.Validation
{
    public sealed class MarketMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule(
                "market_sell",
                FieldRule.Id("itemId"),
                FieldRule.Int("count", 1, 10000)),
            new MessageRule(
                "market_buy",
                FieldRule.Id("itemId"),
                FieldRule.Int("count", 1, 10000)),
            new MessageRule(
                "market_special",
                FieldRule.Int("index", 0, 100)),
            new MessageRule(
                "market_order",
                FieldRule.Int("index", 0, 100)),
            new MessageRule("market_stall"),
            new MessageRule(
                "market_quote",
                FieldRule.Id("itemId"),
                FieldRule.Int("count", 1, 10000, required: false))
        };
    }
}
