using System.Collections.Generic;
using Cuy.Core.Input;

namespace Cuy.Core.Input.Validation
{
    /// <summary>Message rules of the adoption popup. adoption_accept carries no fields: the price and the pigs are decided in Core.</summary>
    public sealed class PigsMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("adoption_accept")
        };
    }
}
