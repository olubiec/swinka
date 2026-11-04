using System.Collections.Generic;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Input.Validation
{
    /// <summary>Rules for the Home page messages (docs/contracts/homes.md).</summary>
    public sealed class HomesMessages : IMessageRuleSet
    {
        public const int MaxPigIdLength = 64;
        public const int MaxModeLength = 16;
        public const int MaxRoomIdLength = 64;

        public IEnumerable<MessageRule> Rules => new[]
        {
            // mode must be free or room, and room is required for room: see ValidatePigHome.
            new MessageRule(
                "pig_home",
                FieldRule.Str("pigId", MaxPigIdLength),
                FieldRule.Str("mode", MaxModeLength),
                FieldRule.Str("room", MaxRoomIdLength, required: false))
        };

        /// <summary>
        /// Checks the whole pig_home payload: pigId 1 to 64 characters; mode is free or room;
        /// room is a string of at most 64 characters and required when mode is room.
        /// </summary>
        /// <returns>An error message, or null when the payload is valid.</returns>
        public static string ValidatePigHome(JObject message)
        {
            if (message == null) return "Message payload cannot be null.";

            if (!message.TryGetValue("pigId", out JToken pigToken) || pigToken.Type != JTokenType.String)
            {
                return "Field 'pigId' must be a string.";
            }
            string pigId = (string)pigToken;
            if (pigId.Length == 0) return "Field 'pigId' cannot be empty.";
            if (pigId.Length > MaxPigIdLength) return "Field 'pigId' exceeds maximum length of " + MaxPigIdLength + ".";

            if (!message.TryGetValue("mode", out JToken modeToken) || modeToken.Type != JTokenType.String)
            {
                return "Field 'mode' must be a string.";
            }
            string mode = (string)modeToken;
            if (mode != PigHomeState.ModeFree && mode != PigHomeState.ModeRoom)
            {
                return "Field 'mode' must be 'free' or 'room'.";
            }

            bool hasRoom = message.TryGetValue("room", out JToken roomToken) && roomToken.Type != JTokenType.Null;
            if (!hasRoom)
            {
                return mode == PigHomeState.ModeRoom ? "Field 'room' is required when mode is 'room'." : null;
            }
            if (roomToken.Type != JTokenType.String) return "Field 'room' must be a string.";

            string room = (string)roomToken;
            if (mode == PigHomeState.ModeRoom && room.Length == 0) return "Field 'room' cannot be empty.";
            if (room.Length > MaxRoomIdLength) return "Field 'room' exceeds maximum length of " + MaxRoomIdLength + ".";
            return null;
        }
    }
}
