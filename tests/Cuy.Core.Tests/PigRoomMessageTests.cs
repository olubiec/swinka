using Cuy.Core.Input;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigRoomMessageTests
    {
        [Fact]
        public void RoomVariant_GoodPayload_IsOk()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_variant"", ""place"": ""pig:abc"", ""uid"": ""u1"", ""variant"": 3 }");

            Assert.True(MessageValidator.Validate(msg).IsOk);
        }

        [Fact]
        public void RoomVariant_MissingUid_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_variant"", ""place"": ""pig:abc"", ""variant"": 3 }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("uid", res.Error);
        }

        [Fact]
        public void RoomVariant_StringVariant_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_variant"", ""place"": ""pig:abc"", ""uid"": ""u1"", ""variant"": ""3"" }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("variant", res.Error);
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(8)]
        public void RoomVariant_OutOfRangeVariant_IsInvalid(int variant)
        {
            var msg = JObject.Parse($@"{{ ""type"": ""room_variant"", ""place"": ""pig:abc"", ""uid"": ""u1"", ""variant"": {variant} }}");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("variant", res.Error);
        }

        [Fact]
        public void RoomVariantUnlock_GoodPayload_IsOk()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_variant_unlock"", ""itemId"": ""bed_basic"", ""variant"": 1 }");

            Assert.True(MessageValidator.Validate(msg).IsOk);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(8)]
        public void RoomVariantUnlock_OutOfRangeVariant_IsInvalid(int variant)
        {
            var msg = JObject.Parse($@"{{ ""type"": ""room_variant_unlock"", ""itemId"": ""bed_basic"", ""variant"": {variant} }}");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("variant", res.Error);
        }

        [Fact]
        public void RoomVariantUnlock_MissingItemId_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_variant_unlock"", ""variant"": 2 }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("itemId", res.Error);
        }

        [Fact]
        public void RoomRename_GoodPayload_IsOk()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_rename"", ""place"": ""pig:abc"", ""name"": ""Sunny corner"" }");

            Assert.True(MessageValidator.Validate(msg).IsOk);
        }

        [Fact]
        public void RoomRename_OverLongName_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_rename"", ""place"": ""pig:abc"", ""name"": ""abcdefghijklmnopqrstuvwxy"" }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("name", res.Error);
        }

        [Fact]
        public void RoomRename_MissingPlace_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_rename"", ""name"": ""Sunny"" }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("place", res.Error);
        }

        [Fact]
        public void RoomTransfer_GoodPayload_IsOk()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_transfer"", ""from"": ""pig:abc"", ""to"": ""salon"", ""uid"": ""u1"", ""x"": 3, ""y"": 4 }");

            Assert.True(MessageValidator.Validate(msg).IsOk);
        }

        [Fact]
        public void RoomTransfer_MissingTo_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""room_transfer"", ""from"": ""pig:abc"", ""uid"": ""u1"", ""x"": 3, ""y"": 4 }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("to", res.Error);
        }

        [Theory]
        [InlineData(-2)]
        [InlineData(201)]
        public void RoomTransfer_OutOfRangeCoordinate_IsInvalid(int x)
        {
            var msg = JObject.Parse($@"{{ ""type"": ""room_transfer"", ""from"": ""pig:abc"", ""to"": ""salon"", ""uid"": ""u1"", ""x"": {x}, ""y"": 4 }}");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("x", res.Error);
        }
    }
}
