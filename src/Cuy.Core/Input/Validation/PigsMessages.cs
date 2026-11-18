using System.Collections.Generic;

namespace Cuy.Core.Input.Validation
{
    public sealed class PigsMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("pigs.desktopPet", FieldRule.Id("pigId"), FieldRule.Bool("on"))
        };
    }
}
