using System;
using System.Collections.Generic;
using Cuy.Core.Input;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MessageValidatorTests
    {
        private sealed class TestRuleSet : IMessageRuleSet
        {
            public IEnumerable<MessageRule> Rules => new[]
            {
                new MessageRule(
                    "test_action",
                    FieldRule.Id("item_id"),
                    FieldRule.Int("amount", 1, 10),
                    FieldRule.Str("note", 5, required: false),
                    FieldRule.Bool("confirm", required: true))
            };
        }

        private sealed class DuplicateRuleSetA : IMessageRuleSet
        {
            public IEnumerable<MessageRule> Rules => new[]
            {
                new MessageRule("dup_type", FieldRule.Id("id"))
            };
        }

        private sealed class DuplicateRuleSetB : IMessageRuleSet
        {
            public IEnumerable<MessageRule> Rules => new[]
            {
                new MessageRule("dup_type", FieldRule.Int("count", 0, 5))
            };
        }

        private static readonly IReadOnlyDictionary<string, MessageRule> TestRules =
            MessageValidator.BuildRuleMap(new IMessageRuleSet[] { new TestRuleSet() });

        [Fact]
        public void Validate_ValidMessage_ReturnsOk()
        {
            var msg = JObject.Parse(@"{ ""type"": ""test_action"", ""item_id"": ""bell_pepper:1"", ""amount"": 5, ""note"": ""yum"", ""confirm"": true }");
            var res = MessageValidator.ValidateWithRules(TestRules, "test_action", msg);

            Assert.True(res.IsOk);
            Assert.Equal(ValidationResult.Ok, res);
            Assert.Null(res.Error);
        }

        [Fact]
        public void Validate_MissingRequiredField_ReturnsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""test_action"", ""item_id"": ""bell_pepper"", ""amount"": 5 }");
            var res = MessageValidator.ValidateWithRules(TestRules, "test_action", msg);

            Assert.True(res.IsInvalid);
            Assert.Contains("confirm", res.Error);
        }

        [Fact]
        public void Validate_WrongType_ReturnsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""test_action"", ""item_id"": ""bell_pepper"", ""amount"": ""five"", ""confirm"": true }");
            var res = MessageValidator.ValidateWithRules(TestRules, "test_action", msg);

            Assert.True(res.IsInvalid);
            Assert.Contains("amount", res.Error);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(11)]
        public void Validate_OutOfRangeInt_ReturnsInvalid(int amount)
        {
            var msg = new JObject
            {
                ["type"] = "test_action",
                ["item_id"] = "bell_pepper",
                ["amount"] = amount,
                ["confirm"] = true
            };
            var res = MessageValidator.ValidateWithRules(TestRules, "test_action", msg);

            Assert.True(res.IsInvalid);
            Assert.Contains("amount", res.Error);
        }

        [Fact]
        public void Validate_StringTooLong_ReturnsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""test_action"", ""item_id"": ""bell_pepper"", ""amount"": 3, ""note"": ""123456"", ""confirm"": true }");
            var res = MessageValidator.ValidateWithRules(TestRules, "test_action", msg);

            Assert.True(res.IsInvalid);
            Assert.Contains("note", res.Error);
        }

        [Theory]
        [InlineData("")]
        [InlineData("Invalid-Id")]
        [InlineData("has space")]
        public void Validate_InvalidId_ReturnsInvalid(string badId)
        {
            var msg = new JObject
            {
                ["type"] = "test_action",
                ["item_id"] = badId,
                ["amount"] = 3,
                ["confirm"] = true
            };
            var res = MessageValidator.ValidateWithRules(TestRules, "test_action", msg);

            Assert.True(res.IsInvalid);
            Assert.Contains("item_id", res.Error);
        }

        [Fact]
        public void Validate_UnknownType_ReturnsUnknown()
        {
            var msg = JObject.Parse(@"{ ""type"": ""unregistered_type"", ""foo"": 123 }");
            var res = MessageValidator.ValidateWithRules(TestRules, "unregistered_type", msg);

            Assert.True(res.IsUnknown);
            Assert.Equal(ValidationResult.Unknown, res);

            var coreRes = MessageValidator.Validate("unregistered_type_in_core", msg);
            Assert.True(coreRes.IsUnknown);
        }

        [Fact]
        public void BuildRuleMap_DuplicateRegistration_ThrowsWithBothClassNames()
        {
            var ex = Assert.Throws<InvalidOperationException>(() =>
                MessageValidator.BuildRuleMap(new IMessageRuleSet[]
                {
                    new DuplicateRuleSetA(),
                    new DuplicateRuleSetB()
                }));

            Assert.Contains(nameof(DuplicateRuleSetA), ex.Message);
            Assert.Contains(nameof(DuplicateRuleSetB), ex.Message);
            Assert.Contains("dup_type", ex.Message);
        }

        [Fact]
        public void Validate_ExtraFields_AreIgnored()
        {
            var msg = JObject.Parse(@"{ ""type"": ""test_action"", ""item_id"": ""carrot"", ""amount"": 2, ""confirm"": false, ""extra_field"": ""ignored"", ""another"": 999 }");
            var res = MessageValidator.ValidateWithRules(TestRules, "test_action", msg);

            Assert.True(res.IsOk);
        }
    }
}
