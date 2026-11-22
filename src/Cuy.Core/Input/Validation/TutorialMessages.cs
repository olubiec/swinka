using System.Collections.Generic;

namespace Cuy.Core.Input.Validation
{
    /// <summary>
    /// Validation rules for tutorial and guide messages (<c>tutorial.*</c>).
    /// Discovered via reflection by <see cref="MessageValidator"/>.
    /// </summary>
    public sealed class TutorialMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("tutorial.completeTour", FieldRule.Str("mode", 16, required: false)),
            new MessageRule("tutorial.markHint", FieldRule.Str("hintId", 32)),
            new MessageRule("tutorial.resetHints"),
            new MessageRule("tutorial.replayTour", FieldRule.Str("mode", 16, required: false))
        };
    }
}
