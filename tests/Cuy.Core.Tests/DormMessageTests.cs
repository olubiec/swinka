using System.Linq;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class DormMessageTests
    {
        [Theory]
        [InlineData("dorm_unlock", "{}")]
        [InlineData("dorm_upgrade", "{}")]
        [InlineData("dorm_move_out", "{\"pigId\":\"kuki\"}")]
        public void ValidPayloads_Pass(string type, string json)
        {
            var result = MessageValidator.Validate(type, JObject.Parse(json));

            Assert.True(result.IsOk);
        }

        [Fact]
        public void MoveIn_ValidIds_PassTheArrayCheck()
        {
            Assert.Null(DormMessages.ValidatePigIds(JObject.Parse("{\"pigIds\":[\"kuki\",\"ned\"]}")));
            Assert.Null(DormMessages.ValidatePigIds(JObject.Parse("{\"pigIds\":[\"a\",\"b\",\"c\",\"d\",\"e\",\"f\"]}")));
        }

        [Fact]
        public void MoveOut_MissingPigId_Fails()
        {
            var result = MessageValidator.Validate("dorm_move_out", JObject.Parse("{}"));

            Assert.True(result.IsInvalid);
        }

        [Fact]
        public void MoveOut_WrongType_Fails()
        {
            var result = MessageValidator.Validate("dorm_move_out", JObject.Parse("{\"pigId\":5}"));

            Assert.True(result.IsInvalid);
        }

        [Fact]
        public void MoveOut_TooLongId_Fails()
        {
            var longId = new string('a', DormMessages.MaxPigIdLength + 1);
            var result = MessageValidator.Validate("dorm_move_out", JObject.Parse("{\"pigId\":\"" + longId + "\"}"));

            Assert.True(result.IsInvalid);
        }

        [Fact]
        public void MoveIn_MissingPigIds_Fails()
        {
            Assert.NotNull(DormMessages.ValidatePigIds(JObject.Parse("{}")));
        }

        [Fact]
        public void MoveIn_WrongType_Fails()
        {
            Assert.NotNull(DormMessages.ValidatePigIds(JObject.Parse("{\"pigIds\":\"kuki\"}")));
            Assert.NotNull(DormMessages.ValidatePigIds(JObject.Parse("{\"pigIds\":[\"kuki\",3]}")));
        }

        [Fact]
        public void MoveIn_ZeroIds_Fails()
        {
            Assert.NotNull(DormMessages.ValidatePigIds(JObject.Parse("{\"pigIds\":[]}")));
        }

        [Fact]
        public void MoveIn_SevenIds_Fails()
        {
            Assert.NotNull(DormMessages.ValidatePigIds(JObject.Parse("{\"pigIds\":[\"a\",\"b\",\"c\",\"d\",\"e\",\"f\",\"g\"]}")));
        }

        [Fact]
        public void MoveIn_DuplicateIds_Fail()
        {
            Assert.NotNull(DormMessages.ValidatePigIds(JObject.Parse("{\"pigIds\":[\"kuki\",\"kuki\"]}")));
        }

        [Fact]
        public void MoveIn_TooLongId_Fails()
        {
            var longId = new string('a', DormMessages.MaxPigIdLength + 1);
            Assert.NotNull(DormMessages.ValidatePigIds(JObject.Parse("{\"pigIds\":[\"" + longId + "\"]}")));
        }
    }
}
