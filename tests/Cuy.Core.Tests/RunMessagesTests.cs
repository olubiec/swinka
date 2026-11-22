using System;
using System.Collections.Generic;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class RunMessagesTests
    {
        private static readonly IReadOnlyDictionary<string, MessageRule> Rules =
            MessageValidator.BuildRuleMap(new IMessageRuleSet[] { new RunMessages() });

        [Theory]
        [InlineData("run.out", "starter")]
        [InlineData("run.in", "kuki")]
        public void ValidMessages_PassValidatorAndPayloadCheck(string type, string pigId)
        {
            var msg = new JObject
            {
                ["type"] = type,
                ["pigId"] = pigId
            };

            var res = MessageValidator.ValidateWithRules(Rules, type, msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);
            Assert.Null(RunMessages.ValidatePigPayload(msg));
        }

        [Fact]
        public void MissingPigId_RejectedWithErrorCode()
        {
            var msg = new JObject { ["type"] = "run.out" };
            var res = MessageValidator.ValidateWithRules(Rules, "run.out", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
            Assert.Equal("missing_pig_id", RunMessages.ValidatePigPayload(msg));
        }

        [Theory]
        [InlineData(123)]
        [InlineData(true)]
        public void WrongTypePigId_RejectedWithErrorCode(object badValue)
        {
            var msg = new JObject
            {
                ["type"] = "run.in",
                ["pigId"] = JToken.FromObject(badValue)
            };

            var res = MessageValidator.ValidateWithRules(Rules, "run.in", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
            Assert.Equal("invalid_pig_id_type", RunMessages.ValidatePigPayload(msg));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void EmptyOrWhitespacePigId_Rejected(string badId)
        {
            var msg = new JObject
            {
                ["type"] = "run.out",
                ["pigId"] = badId
            };

            Assert.Equal("empty_pig_id", RunMessages.ValidatePigPayload(msg));
        }

        [Fact]
        public void TooLongPigId_Rejected()
        {
            var msg = new JObject
            {
                ["type"] = "run.out",
                ["pigId"] = new string('a', 65)
            };

            var res = MessageValidator.ValidateWithRules(Rules, "run.out", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
            Assert.Equal("pig_id_too_long", RunMessages.ValidatePigPayload(msg));
        }

        [Fact]
        public void RepeatedValidation_IsDeterministic()
        {
            var msg = new JObject { ["type"] = "run.out", ["pigId"] = "starter" };
            Assert.Null(RunMessages.ValidatePigPayload(msg));
            Assert.Null(RunMessages.ValidatePigPayload(msg));
        }

        [Fact]
        public void Fuzz200RandomPayloads_NeverThrows()
        {
            var rng = new Random(1162026);
            string[] types = { "run.out", "run.in", "unknown", "" };

            for (int i = 0; i < 200; i++)
            {
                JObject msg = null;
                int kind = rng.Next(6);
                if (kind > 0)
                {
                    msg = new JObject();
                    if (rng.Next(2) == 0) msg["type"] = types[rng.Next(types.Length)];
                    switch (kind)
                    {
                        case 1: msg["pigId"] = rng.Next(-100, 100); break;
                        case 2: msg["pigId"] = new string('x', rng.Next(0, 100)); break;
                        case 3: msg["pigId"] = new JArray(1, 2); break;
                        case 4: msg["pigId"] = JValue.CreateNull(); break;
                        case 5: msg["extra"] = "noise"; break;
                    }
                }

                string err = RunMessages.ValidatePigPayload(msg);
                if (msg == null) Assert.Equal("null_message", err);
                var valRes = MessageValidator.ValidateWithRules(Rules, msg?["type"]?.ToString() ?? "run.out", msg);
                Assert.True(valRes.Status == ValidationStatus.Ok || valRes.Status == ValidationStatus.Invalid || valRes.Status == ValidationStatus.Unknown);
            }
        }
    }
}
