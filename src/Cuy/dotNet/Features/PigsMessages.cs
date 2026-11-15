using System.Collections.Generic;
using Cuy.Core.Input;

namespace Cuy.Features
{
    public sealed class PigsMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("adopt_pig"),
            new MessageRule("toggle_pig_active", FieldRule.Id("pigId")),
            new MessageRule("adopt_named", FieldRule.Id("id", required: false), FieldRule.Id("pigId", required: false), FieldRule.Bool("memorial", required: false)),
            new MessageRule("adopt_group", FieldRule.Id("id", required: false), FieldRule.Id("groupId", required: false)),
            new MessageRule("set_memorial", FieldRule.Id("pigId", required: false), FieldRule.Id("id", required: false), FieldRule.Bool("on", required: false)),
            new MessageRule("adopt_starter_pair"),
            new MessageRule("accept_adoption_offer")
        };
    }
}
