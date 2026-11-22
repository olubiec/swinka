using System;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PropsMessagesTests
    {
        [Fact]
        public void RuleSet_ImplementsIMessageRuleSet_WithCanonicalTypes()
        {
            IMessageRuleSet ruleSet = new PropsMessages();
            Assert.NotNull(ruleSet.Rules);
            Assert.Contains(ruleSet.Rules, r => r.Type == "props.place");
            Assert.Contains(ruleSet.Rules, r => r.Type == "props.move");
            Assert.Contains(ruleSet.Rules, r => r.Type == "props.remove");
            Assert.Contains(ruleSet.Rules, r => r.Type == "props.toRoom");
            Assert.Contains(ruleSet.Rules, r => r.Type == "props.fromRoom");
        }

        [Fact]
        public void Validate_ValidMessages_ReturnNull()
        {
            Assert.Null(PropsMessages.Validate("props.place", JObject.Parse("{\"itemId\":\"toy_basket\",\"x\":0.5,\"y\":0.8}")));
            Assert.Null(PropsMessages.Validate("props.move", JObject.Parse("{\"uid\":\"dp_1\",\"x\":0.0,\"y\":1.0}")));
            Assert.Null(PropsMessages.Validate("props.remove", JObject.Parse("{\"uid\":\"dp_1\"}")));
            Assert.Null(PropsMessages.Validate("props.toRoom", JObject.Parse("{\"uid\":\"dp_1\",\"room\":\"salon\",\"x\":2,\"y\":3}")));
            Assert.Null(PropsMessages.Validate("props.fromRoom", JObject.Parse("{\"room\":\"salon\",\"uid\":\"it_1\",\"x\":0.25,\"y\":0.75}")));
        }

        [Fact]
        public void Validate_MissingFieldOrWrongType_Rejected()
        {
            Assert.NotNull(PropsMessages.Validate("props.place", JObject.Parse("{\"itemId\":\"toy_basket\",\"x\":0.5}")));
            Assert.NotNull(PropsMessages.Validate("props.place", JObject.Parse("{\"itemId\":123,\"x\":0.5,\"y\":0.5}")));
            Assert.NotNull(PropsMessages.Validate("props.move", JObject.Parse("{\"uid\":\"dp_1\",\"x\":\"bad\",\"y\":0.5}")));
            Assert.NotNull(PropsMessages.Validate("props.toRoom", JObject.Parse("{\"uid\":\"dp_1\",\"room\":\"salon\",\"x\":1.5,\"y\":2}")));
            Assert.NotNull(PropsMessages.Validate("props.remove", null));
        }

        [Fact]
        public void Validate_UnknownMessageTypeAndUnknownCatalogItem_Rejected()
        {
            Assert.NotNull(PropsMessages.Validate("props.unknown", JObject.Parse("{}")));
            Assert.False(DesktopPropCatalog.Current.IsProp("unknown_prop_item"));
        }

        [Fact]
        public void Validate_NaNInfinityNegativeAndOutOfRangeCoords_Rejected()
        {
            var nanMsg = new JObject { ["itemId"] = "toy_basket", ["x"] = double.NaN, ["y"] = 0.5 };
            var infMsg = new JObject { ["itemId"] = "toy_basket", ["x"] = 0.5, ["y"] = double.PositiveInfinity };
            var negMsg = new JObject { ["itemId"] = "toy_basket", ["x"] = -0.1, ["y"] = 0.5 };
            var overMsg = new JObject { ["itemId"] = "toy_basket", ["x"] = 0.5, ["y"] = 1.1 };
            var roomOutMsg = new JObject { ["uid"] = "dp_1", ["room"] = "salon", ["x"] = -2, ["y"] = 201 };

            Assert.NotNull(PropsMessages.Validate("props.place", nanMsg));
            Assert.NotNull(PropsMessages.Validate("props.place", infMsg));
            Assert.NotNull(PropsMessages.Validate("props.place", negMsg));
            Assert.NotNull(PropsMessages.Validate("props.place", overMsg));
            Assert.NotNull(PropsMessages.Validate("props.toRoom", roomOutMsg));
        }

        [Fact]
        public void Validate_TooLongId_Rejected()
        {
            string longId = new string('a', 65);
            Assert.NotNull(PropsMessages.Validate("props.place", new JObject { ["itemId"] = longId, ["x"] = 0.5, ["y"] = 0.5 }));
            Assert.NotNull(PropsMessages.Validate("props.remove", new JObject { ["uid"] = longId }));
            Assert.NotNull(PropsMessages.Validate("props.remove", new JObject { ["uid"] = "" }));
        }

        [Fact]
        public void Validate_Fuzz200Payloads_NeverThrows()
        {
            var rng = new Random(42);
            string[] types = { "props.place", "props.move", "props.remove", "props.toRoom", "props.fromRoom", "props.other", null, "" };

            for (int i = 0; i < 200; i++)
            {
                string type = types[rng.Next(types.Length)];
                JObject payload = null;
                int shape = rng.Next(4);
                if (shape == 1)
                {
                    payload = new JObject();
                }
                else if (shape == 2)
                {
                    payload = new JObject
                    {
                        ["itemId"] = rng.Next(2) == 0 ? (JToken)"toy_basket" : new string('x', rng.Next(1, 80)),
                        ["uid"] = rng.Next(2) == 0 ? (JToken)"dp_1" : rng.Next(-10, 10),
                        ["room"] = "salon",
                        ["x"] = rng.NextDouble() * 4.0 - 1.5,
                        ["y"] = rng.Next(3) == 0 ? double.NaN : rng.NextDouble() * 2.0 - 0.5
                    };
                }
                else if (shape == 3)
                {
                    payload = new JObject
                    {
                        ["uid"] = JValue.CreateNull(),
                        ["x"] = rng.Next(-5, 210),
                        ["y"] = rng.Next(-5, 210)
                    };
                }

                var ex = Record.Exception(() => PropsMessages.Validate(type, payload));
                Assert.Null(ex);
            }
        }
    }
}
