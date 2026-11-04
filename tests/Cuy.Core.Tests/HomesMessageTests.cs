using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class HomesMessageTests
    {
        [Theory]
        [InlineData("{\"pigId\":\"kuki\",\"mode\":\"free\"}")]
        [InlineData("{\"pigId\":\"kuki\",\"mode\":\"room\",\"room\":\"playroom\"}")]
        public void GoodPayloads_AreAccepted(string json)
        {
            var result = MessageValidator.Validate("pig_home", JObject.Parse(json));

            Assert.True(result.IsOk);
            Assert.Null(HomesMessages.ValidatePigHome(JObject.Parse(json)));
        }

        [Theory]
        [InlineData("{\"mode\":\"free\"}")]
        [InlineData("{\"pigId\":\"kuki\"}")]
        [InlineData("{}")]
        public void MissingFields_AreRejected(string json)
        {
            var result = MessageValidator.Validate("pig_home", JObject.Parse(json));

            Assert.True(result.IsInvalid);
            Assert.NotNull(HomesMessages.ValidatePigHome(JObject.Parse(json)));
        }

        [Fact]
        public void ModeOther_IsRejected()
        {
            Assert.NotNull(HomesMessages.ValidatePigHome(JObject.Parse("{\"pigId\":\"kuki\",\"mode\":\"other\"}")));
            Assert.NotNull(HomesMessages.ValidatePigHome(JObject.Parse("{\"pigId\":\"kuki\",\"mode\":\"other\",\"room\":\"playroom\"}")));
        }

        [Fact]
        public void RoomMissing_ForRoomMode_IsRejected()
        {
            Assert.NotNull(HomesMessages.ValidatePigHome(JObject.Parse("{\"pigId\":\"kuki\",\"mode\":\"room\"}")));
            Assert.NotNull(HomesMessages.ValidatePigHome(JObject.Parse("{\"pigId\":\"kuki\",\"mode\":\"room\",\"room\":\"\"}")));
        }

        [Fact]
        public void OverLongIds_AreRejected()
        {
            string longId = new string('a', HomesMessages.MaxPigIdLength + 1);
            string longRoom = new string('r', HomesMessages.MaxRoomIdLength + 1);

            var pigResult = MessageValidator.Validate("pig_home", JObject.Parse("{\"pigId\":\"" + longId + "\",\"mode\":\"free\"}"));
            Assert.True(pigResult.IsInvalid);
            Assert.NotNull(HomesMessages.ValidatePigHome(JObject.Parse("{\"pigId\":\"" + longId + "\",\"mode\":\"free\"}")));

            Assert.NotNull(HomesMessages.ValidatePigHome(JObject.Parse("{\"pigId\":\"kuki\",\"mode\":\"room\",\"room\":\"" + longRoom + "\"}")));
        }
    }
}
