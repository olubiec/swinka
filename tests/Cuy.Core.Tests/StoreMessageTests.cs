using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class StoreMessageTests
    {
        [Theory]
        [InlineData("store_open", "{}")]
        [InlineData("store_buy", "{\"kind\":\"item\",\"id\":\"hay\",\"count\":1}")]
        [InlineData("store_buy", "{\"kind\":\"room\",\"id\":\"salon\",\"count\":99}")]
        [InlineData("store_buy", "{\"kind\":\"variant\",\"id\":\"hay:blue\",\"count\":5}")]
        public void GoodPayloads_AreAccepted(string type, string json)
        {
            var result = MessageValidator.Validate(type, JObject.Parse(json));
            Assert.True(result.IsOk);
        }

        [Theory]
        [InlineData("store_buy", "{\"kind\":\"item\",\"id\":\"hay\",\"count\":0}")]
        [InlineData("store_buy", "{\"kind\":\"item\",\"id\":\"hay\",\"count\":100}")]
        [InlineData("store_buy", "{\"kind\":\"item\",\"id\":\"hay\"}")]
        [InlineData("store_buy", "{\"id\":\"hay\",\"count\":1}")]
        [InlineData("store_buy", "{\"kind\":\"item\",\"count\":1}")]
        public void BadPayloads_AreRejected(string type, string json)
        {
            var result = MessageValidator.Validate(type, JObject.Parse(json));
            Assert.True(result.IsInvalid);
        }

        [Fact]
        public void IdAtMaxLength_IsAccepted_AndOneOverIsRejected()
        {
            var atLimit = new JObject { ["kind"] = "item", ["id"] = new string('a', StoreMessages.MaxIdLength), ["count"] = 1 };
            var overLimit = new JObject { ["kind"] = "item", ["id"] = new string('a', StoreMessages.MaxIdLength + 1), ["count"] = 1 };

            Assert.True(MessageValidator.Validate("store_buy", atLimit).IsOk);
            Assert.True(MessageValidator.Validate("store_buy", overLimit).IsInvalid);
        }

        [Theory]
        [InlineData("room")]
        [InlineData("place")]
        [InlineData("item")]
        [InlineData("variant")]
        [InlineData("decor")]
        [InlineData("farm")]
        [InlineData("stall")]
        [InlineData("dorm")]
        public void KnownKinds_AreRecognised(string kind)
        {
            Assert.True(StoreMessages.IsKnownKind(kind));
        }

        [Theory]
        [InlineData("cake")]
        [InlineData("ITEM")]
        [InlineData("")]
        [InlineData(null)]
        public void UnknownKinds_AreNotRecognised(string kind)
        {
            Assert.False(StoreMessages.IsKnownKind(kind));
        }
    }
}
