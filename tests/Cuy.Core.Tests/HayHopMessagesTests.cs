using System;
using System.Collections.Generic;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class HayHopMessagesTests
    {
        private static readonly IReadOnlyDictionary<string, MessageRule> Rules =
            MessageValidator.BuildRuleMap(new IMessageRuleSet[] { new HayHopMessages() });

        [Fact]
        public void ValidPayload_PassesValidatorAndPayloadCheck()
        {
            var msg = new JObject
            {
                ["type"] = "minigame.hay_hop.result",
                ["score"] = 240,
                ["durationMs"] = 18500
            };

            var res = MessageValidator.ValidateWithRules(Rules, "minigame.hay_hop.result", msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);
            Assert.Null(HayHopMessages.ValidateResultPayload(msg));
        }

        [Fact]
        public void ValidPayloadWithOptionalSeed_Passes()
        {
            var msg = new JObject
            {
                ["type"] = "minigame.hay_hop.result",
                ["score"] = 0,
                ["durationMs"] = 1200,
                ["seed"] = "abc-123"
            };

            var res = MessageValidator.ValidateWithRules(Rules, "minigame.hay_hop.result", msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);
            Assert.Null(HayHopMessages.ValidateResultPayload(msg));
        }

        [Fact]
        public void NullOrMissingFields_RejectedWithErrorCode()
        {
            Assert.Equal("null_message", HayHopMessages.ValidateResultPayload(null));

            var missingScore = new JObject { ["durationMs"] = 5000 };
            Assert.Equal("missing_score", HayHopMessages.ValidateResultPayload(missingScore));
            Assert.Equal(ValidationStatus.Invalid,
                MessageValidator.ValidateWithRules(Rules, "minigame.hay_hop.result", missingScore).Status);

            var missingDuration = new JObject { ["score"] = 100 };
            Assert.Equal("missing_duration", HayHopMessages.ValidateResultPayload(missingDuration));
            Assert.Equal(ValidationStatus.Invalid,
                MessageValidator.ValidateWithRules(Rules, "minigame.hay_hop.result", missingDuration).Status);
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(5001)]
        public void OutOfRangeScore_Rejected(int badScore)
        {
            var msg = new JObject
            {
                ["score"] = badScore,
                ["durationMs"] = 5000
            };

            Assert.Equal("invalid_score", HayHopMessages.ValidateResultPayload(msg));
            Assert.Equal(ValidationStatus.Invalid,
                MessageValidator.ValidateWithRules(Rules, "minigame.hay_hop.result", msg).Status);
        }

        [Theory]
        [InlineData(-5)]
        [InlineData(3600001)]
        public void OutOfRangeDuration_Rejected(int badDuration)
        {
            var msg = new JObject
            {
                ["score"] = 100,
                ["durationMs"] = badDuration
            };

            Assert.Equal("invalid_duration", HayHopMessages.ValidateResultPayload(msg));
            Assert.Equal(ValidationStatus.Invalid,
                MessageValidator.ValidateWithRules(Rules, "minigame.hay_hop.result", msg).Status);
        }

        [Fact]
        public void NaNInfinityAndFloatValues_Rejected()
        {
            var nanScore = new JObject { ["score"] = double.NaN, ["durationMs"] = 5000 };
            Assert.Equal("invalid_score", HayHopMessages.ValidateResultPayload(nanScore));
            Assert.Equal(ValidationStatus.Invalid,
                MessageValidator.ValidateWithRules(Rules, "minigame.hay_hop.result", nanScore).Status);

            var infDuration = new JObject { ["score"] = 100, ["durationMs"] = double.PositiveInfinity };
            Assert.Equal("invalid_duration", HayHopMessages.ValidateResultPayload(infDuration));
            Assert.Equal(ValidationStatus.Invalid,
                MessageValidator.ValidateWithRules(Rules, "minigame.hay_hop.result", infDuration).Status);

            var floatScore = new JObject { ["score"] = 12.5, ["durationMs"] = 5000 };
            Assert.Equal("invalid_score", HayHopMessages.ValidateResultPayload(floatScore));
        }

        [Fact]
        public void Fuzz200RandomPayloads_NeverThrows()
        {
            var rng = new Random(20261122);
            for (int i = 0; i < 200; i++)
            {
                JObject msg = null;
                if (rng.Next(10) != 0)
                {
                    msg = new JObject();
                    if (rng.Next(4) != 0)
                        msg["score"] = RandomToken(rng);
                    if (rng.Next(4) != 0)
                        msg["durationMs"] = RandomToken(rng);
                    if (rng.Next(3) == 0)
                        msg["seed"] = RandomToken(rng);
                }

                _ = HayHopMessages.ValidateResultPayload(msg);
                _ = MessageValidator.ValidateWithRules(Rules, "minigame.hay_hop.result", msg);
            }
        }

        private static JToken RandomToken(Random rng)
        {
            switch (rng.Next(8))
            {
                case 0: return rng.Next(-500, 6000);
                case 1: return rng.Next(-100, 4000000);
                case 2: return double.NaN;
                case 3: return double.PositiveInfinity;
                case 4: return rng.NextDouble() * 100.0;
                case 5: return new string('x', rng.Next(0, 48));
                case 6: return rng.Next(2) == 0;
                default: return JValue.CreateNull();
            }
        }
    }
}
