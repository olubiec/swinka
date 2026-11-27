using System.Collections.Generic;

namespace Cuy.Core.Input.Validation
{
    public sealed class MinigameCampaignMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules
        {
            get
            {
                yield return new MessageRule(
                    "minigame_level_complete",
                    FieldRule.Str("gameId", 64),
                    FieldRule.Int("level", 1, 200),
                    FieldRule.Int("stars", 1, 3),
                    FieldRule.Int("score", 0, 100000));
                yield return new MessageRule(
                    "minigame_checkpoint_save",
                    FieldRule.Str("gameId", 64),
                    FieldRule.Int("level", 1, 200),
                    FieldRule.Str("checkpointJson", 8192, required: false));
            }
        }
    }
}
