using System.Collections.Generic;

namespace Cuy.Core.Input.Validation
{
    public sealed class FarmMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule(
                "farm_plant",
                FieldRule.Int("plot", 0, 100),
                FieldRule.Id("cropId")),
            new MessageRule(
                "farm_water",
                FieldRule.Int("plot", 0, 100)),
            new MessageRule(
                "farm_harvest",
                FieldRule.Int("plot", 0, 100)),
            new MessageRule("farm_harvest_all"),
            new MessageRule(
                "orchard_plant",
                FieldRule.Int("slot", 0, 100),
                FieldRule.Id("cropId")),
            new MessageRule(
                "orchard_harvest",
                FieldRule.Int("slot", 0, 100)),
            new MessageRule(
                "farm_buy",
                FieldRule.Id("what"),
                FieldRule.Id("id", required: false))
        };
    }
}
