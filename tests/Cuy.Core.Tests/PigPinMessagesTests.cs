using Cuy.Core.Input;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigPinMessagesTests
    {
        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void PlacesPigPin_GoodPayload_IsOk(bool pinned)
        {
            var msg = new JObject
            {
                ["type"] = "places.pigPin",
                ["pigId"] = "kuki",
                ["pinned"] = pinned
            };

            Assert.True(MessageValidator.Validate(msg).IsOk);
        }

        [Fact]
        public void PlacesPigPin_MissingPigId_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""places.pigPin"", ""pinned"": true }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("pigId", res.Error);
        }

        [Fact]
        public void PlacesPigPin_EmptyPigId_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""places.pigPin"", ""pigId"": """", ""pinned"": true }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("pigId", res.Error);
        }

        [Fact]
        public void PlacesPigPin_PinnedNotBool_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""places.pigPin"", ""pigId"": ""kuki"", ""pinned"": 1 }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("pinned", res.Error);
        }

        [Fact]
        public void PlacesPigPin_PinnedAsString_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""places.pigPin"", ""pigId"": ""kuki"", ""pinned"": ""true"" }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("pinned", res.Error);
        }

        [Fact]
        public void PlacesPigPin_UnknownField_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""places.pigPin"", ""pigId"": ""kuki"", ""pinned"": true, ""extra"": 1 }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
        }

        [Fact]
        public void PlacesPigPin_VeryLongPigId_IsInvalid()
        {
            var msg = new JObject
            {
                ["type"] = "places.pigPin",
                ["pigId"] = new string('a', 100),
                ["pinned"] = true
            };

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("pigId", res.Error);
        }

        [Fact]
        public void Validate_NullPayload_IsInvalid()
        {
            var res = MessageValidator.Validate(null);
            Assert.True(res.IsInvalid);
        }

        [Fact]
        public void PlacesPigMove_GoodPayload_IsOk()
        {
            var msg = JObject.Parse(@"{ ""type"": ""places.pigMove"", ""pigId"": ""kuki"", ""to"": ""garden"" }");

            Assert.True(MessageValidator.Validate(msg).IsOk);
        }

        [Fact]
        public void PlacesPigMove_MissingTo_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""places.pigMove"", ""pigId"": ""kuki"" }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("to", res.Error);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void PigsDesktopPet_GoodPayload_IsOk(bool on)
        {
            var msg = new JObject
            {
                ["type"] = "pigs.desktopPet",
                ["pigId"] = "kuki",
                ["on"] = on
            };

            Assert.True(MessageValidator.Validate(msg).IsOk);
        }

        [Fact]
        public void PigsDesktopPet_MissingPigId_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""pigs.desktopPet"", ""on"": true }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("pigId", res.Error);
        }

        [Fact]
        public void PigsDesktopPet_EmptyPigId_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""pigs.desktopPet"", ""pigId"": """", ""on"": true }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("pigId", res.Error);
        }

        [Fact]
        public void PigsDesktopPet_OnNotBool_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""pigs.desktopPet"", ""pigId"": ""kuki"", ""on"": 1 }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("on", res.Error);
        }

        [Fact]
        public void PigsDesktopPet_OnAsString_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""pigs.desktopPet"", ""pigId"": ""kuki"", ""on"": ""true"" }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("on", res.Error);
        }

        [Fact]
        public void PigsDesktopPet_UnknownField_IsInvalid()
        {
            var msg = JObject.Parse(@"{ ""type"": ""pigs.desktopPet"", ""pigId"": ""kuki"", ""on"": true, ""extra"": 1 }");

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
        }

        [Fact]
        public void PigsDesktopPet_VeryLongPigId_IsInvalid()
        {
            var msg = new JObject
            {
                ["type"] = "pigs.desktopPet",
                ["pigId"] = new string('a', 100),
                ["on"] = true
            };

            var res = MessageValidator.Validate(msg);
            Assert.True(res.IsInvalid);
            Assert.Contains("pigId", res.Error);
        }
    }
}
