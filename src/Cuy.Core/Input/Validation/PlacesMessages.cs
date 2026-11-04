using System.Collections.Generic;

namespace Cuy.Core.Input.Validation
{
    public sealed class PlacesMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("place_unlock", FieldRule.Id("id")),
            new MessageRule("room_unlock", FieldRule.Id("id")),
            new MessageRule("place_upgrade", FieldRule.Id("id"))
        };
    }
}
