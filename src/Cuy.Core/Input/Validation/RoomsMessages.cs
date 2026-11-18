using System.Collections.Generic;

namespace Cuy.Core.Input.Validation
{
    public sealed class RoomsMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("room_buy", FieldRule.Id("itemId")),
            new MessageRule(
                "room_place",
                FieldRule.Id("place"),
                FieldRule.Id("itemId"),
                FieldRule.Int("x", -1, 512),
                FieldRule.Int("y", -1, 256),
                FieldRule.Bool("flip", required: false)),
            new MessageRule(
                "room_move",
                FieldRule.Id("place"),
                FieldRule.Id("uid"),
                FieldRule.Int("x", -1, 512),
                FieldRule.Int("y", -1, 256)),
            new MessageRule(
                "room_flip",
                FieldRule.Id("place"),
                FieldRule.Id("uid"),
                FieldRule.Bool("flip", required: false)),
            new MessageRule(
                "room_remove",
                FieldRule.Id("place"),
                FieldRule.Id("uid")),
            new MessageRule(
                "room_skin",
                FieldRule.Id("room"),
                FieldRule.Id("slot"),
                FieldRule.Id("itemId", required: false))
        };

        public static string ToastFor(string errorCode)
        {
            if (errorCode == "fixture_locked")
                return "You can move this fixture, not stash it.";
            return "Action not available.";
        }
    }
}
