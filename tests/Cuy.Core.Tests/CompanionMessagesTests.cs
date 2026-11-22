using System;
using System.Collections.Generic;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class CompanionMessagesTests
    {
        private static readonly IReadOnlyDictionary<string, MessageRule> Rules =
            MessageValidator.BuildRuleMap(new IMessageRuleSet[] { new CompanionMessages() });

        [Theory]
        [InlineData(true, null)]
        [InlineData(false, null)]
        [InlineData(true, "garden_friend")]
        [InlineData(false, "garden_friend")]
        public void ValidCompanionSet_PassesValidatorAndPayloadCheck(bool enabled, string id)
        {
            var msg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = enabled
            };
            if (id != null)
            {
                msg["id"] = id;
            }

            var res = MessageValidator.ValidateWithRules(Rules, "companion.set", msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);
            Assert.Null(CompanionMessages.ValidateSetPayload(msg));
        }

        [Fact]
        public void CompanionMessages_DiscoveredByDefaultMessageValidator()
        {
            var msg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = true,
                ["id"] = "garden_friend"
            };

            var res = MessageValidator.Validate("companion.set", msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);
        }

        [Theory]
        [InlineData("dragon")]
        [InlineData("unknown_pet")]
        public void UnknownCompanion_RejectedByHelper(string badId)
        {
            Assert.False(CompanionMessages.IsKnownCompanion(badId));

            var msg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = true,
                ["id"] = badId
            };

            Assert.Equal("unknown_companion", CompanionMessages.ValidateSetPayload(msg));
        }

        [Fact]
        public void KnownCompanion_CustomListAccepted()
        {
            var known = new[] { "garden_friend", "meadow_friend" };
            Assert.True(CompanionMessages.IsKnownCompanion("meadow_friend", known));
            Assert.False(CompanionMessages.IsKnownCompanion("dragon", known));

            var msg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = true,
                ["id"] = "meadow_friend"
            };

            Assert.Null(CompanionMessages.ValidateSetPayload(msg, known));
        }

        [Fact]
        public void MissingEnabled_Rejected()
        {
            var msg = new JObject
            {
                ["type"] = "companion.set",
                ["id"] = "garden_friend"
            };

            var res = MessageValidator.ValidateWithRules(Rules, "companion.set", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
            Assert.Equal("missing_enabled", CompanionMessages.ValidateSetPayload(msg));
        }

        [Theory]
        [InlineData("true")]
        [InlineData(1)]
        [InlineData(0)]
        [InlineData(1.5)]
        public void WrongTypeEnabled_Rejected(object badEnabled)
        {
            var msg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = JToken.FromObject(badEnabled)
            };

            var res = MessageValidator.ValidateWithRules(Rules, "companion.set", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
            Assert.Equal("invalid_enabled_type", CompanionMessages.ValidateSetPayload(msg));
        }

        [Theory]
        [InlineData(123)]
        [InlineData(true)]
        public void WrongTypeId_Rejected(object badId)
        {
            var msg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = true,
                ["id"] = JToken.FromObject(badId)
            };

            var res = MessageValidator.ValidateWithRules(Rules, "companion.set", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
            Assert.Equal("invalid_id_type", CompanionMessages.ValidateSetPayload(msg));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("bad id!")]
        [InlineData("GARDEN_FRIEND")]
        public void InvalidIdFormat_Rejected(string badId)
        {
            var msg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = true,
                ["id"] = badId
            };

            var res = MessageValidator.ValidateWithRules(Rules, "companion.set", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
            Assert.NotNull(CompanionMessages.ValidateSetPayload(msg));
        }

        [Fact]
        public void TooLongId_Rejected()
        {
            var msg = new JObject
            {
                ["type"] = "companion.set",
                ["enabled"] = true,
                ["id"] = new string('a', 129)
            };

            var res = MessageValidator.ValidateWithRules(Rules, "companion.set", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
            Assert.Equal("id_too_long", CompanionMessages.ValidateSetPayload(msg));
        }

        [Fact]
        public void Fuzz200Payloads_NeverThrowsAndRejectsInvalid()
        {
            var rng = new Random(20261122);
            JToken[] weirdValues =
            {
                JValue.CreateNull(),
                new JValue("true"),
                new JValue(1),
                new JValue(0),
                new JValue(-5),
                new JValue(3.14),
                new JValue(""),
                new JValue("   "),
                new JValue("bad/id"),
                new JValue("UPPER"),
                new JValue(new string('x', 150)),
                new JArray(1, 2),
                new JObject { ["nested"] = true },
                new JValue(true),
                new JValue(false),
                new JValue("garden_friend"),
                new JValue("unknown_companion_xyz")
            };

            for (int i = 0; i < 200; i++)
            {
                var msg = new JObject { ["type"] = "companion.set" };
                if (rng.Next(4) != 0)
                {
                    msg["enabled"] = weirdValues[rng.Next(weirdValues.Length)].DeepClone();
                }
                if (rng.Next(3) != 0)
                {
                    msg["id"] = weirdValues[rng.Next(weirdValues.Length)].DeepClone();
                }

                var ex = Record.Exception(() =>
                {
                    var res = MessageValidator.ValidateWithRules(Rules, "companion.set", msg);
                    var payloadErr = CompanionMessages.ValidateSetPayload(msg);

                    bool enabledValid = msg.TryGetValue("enabled", out var enTok)
                        && enTok.Type == JTokenType.Boolean;
                    bool idPresent = msg.TryGetValue("id", out var idTok)
                        && idTok.Type != JTokenType.Null
                        && idTok.Type != JTokenType.Undefined;
                    bool idKnown = !idPresent || (idTok.Type == JTokenType.String && idTok.Value<string>() == "garden_friend");

                    if (enabledValid && idKnown)
                    {
                        Assert.Equal(ValidationStatus.Ok, res.Status);
                        Assert.Null(payloadErr);
                    }
                    else
                    {
                        Assert.True(res.Status == ValidationStatus.Invalid || payloadErr != null);
                    }
                });

                Assert.Null(ex);
            }
        }

        [Fact]
        public void OldSaveWithoutCompanionFields_LoadsWithDefaults()
        {
            const string oldSaveJson = @"{
                ""Version"": 3,
                ""Name"": ""Kuki"",
                ""Clovers"": 42
            }";

            var state = JsonConvert.DeserializeObject<GameState>(oldSaveJson);
            Assert.NotNull(state);
            Assert.False(state.CompanionEnabled);
            Assert.Equal("garden_friend", state.CompanionId);
        }
    }
}
