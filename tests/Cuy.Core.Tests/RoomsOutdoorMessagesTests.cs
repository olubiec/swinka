using System.Linq;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class RoomsOutdoorMessagesTests
    {
        [Theory]
        [InlineData("garden")]
        [InlineData("park")]
        [InlineData("farm")]
        [InlineData("market")]
        public void OutdoorPlace_IsAccepted_ForPlaceMoveRemoveFlip(string place)
        {
            var placeMsg = new JObject
            {
                ["type"] = "room_place",
                ["place"] = place,
                ["itemId"] = "bench_wood",
                ["x"] = 250,
                ["y"] = 120,
                ["flip"] = false
            };
            Assert.True(MessageValidator.Validate(placeMsg).IsOk);

            var moveMsg = new JObject
            {
                ["type"] = "room_move",
                ["place"] = place,
                ["uid"] = $"fx:{place}:bench",
                ["x"] = 250,
                ["y"] = 120
            };
            Assert.True(MessageValidator.Validate(moveMsg).IsOk);

            var removeMsg = new JObject
            {
                ["type"] = "room_remove",
                ["place"] = place,
                ["uid"] = $"fx:{place}:bench"
            };
            Assert.True(MessageValidator.Validate(removeMsg).IsOk);

            var flipMsg = new JObject
            {
                ["type"] = "room_flip",
                ["place"] = place,
                ["uid"] = $"fx:{place}:bench",
                ["flip"] = true
            };
            Assert.True(MessageValidator.Validate(flipMsg).IsOk);
        }

        [Theory]
        [InlineData("")]
        [InlineData(null)]
        [InlineData("..")]
        public void InvalidPlace_IsRejected(string place)
        {
            var msg = new JObject
            {
                ["type"] = "room_remove",
                ["place"] = place,
                ["uid"] = "fx:garden:bench"
            };
            Assert.True(MessageValidator.Validate(msg).IsInvalid);
        }

        [Fact]
        public void TooLongPlace_300Chars_IsRejected()
        {
            var msg = new JObject
            {
                ["type"] = "room_remove",
                ["place"] = new string('a', 300),
                ["uid"] = "fx:garden:bench"
            };
            Assert.True(MessageValidator.Validate(msg).IsInvalid);
        }

        [Theory]
        [InlineData("fx:garden:bench")]
        [InlineData("fx:park:bridge")]
        [InlineData("fx:farm:plot:0")]
        [InlineData("fx:market:stall_seeds")]
        public void FixtureUid_IsAccepted(string uid)
        {
            var msg = new JObject
            {
                ["type"] = "room_move",
                ["place"] = "garden",
                ["uid"] = uid,
                ["x"] = 100,
                ["y"] = 80
            };
            Assert.True(MessageValidator.Validate(msg).IsOk);
        }

        [Theory]
        [InlineData("..")]
        [InlineData("fx:garden:..\n")]
        [InlineData("fx:garden:bench\nrm")]
        [InlineData("")]
        public void InvalidUid_IsRejected(string uid)
        {
            var msg = new JObject
            {
                ["type"] = "room_remove",
                ["place"] = "garden",
                ["uid"] = uid
            };
            Assert.True(MessageValidator.Validate(msg).IsInvalid);
        }

        [Theory]
        [InlineData(-2, 50)]
        [InlineData(50, -2)]
        [InlineData(1000, 50)]
        [InlineData(50, 1000)]
        public void OutOfRangeCoordinates_AreRejected(int x, int y)
        {
            var placeMsg = new JObject
            {
                ["type"] = "room_place",
                ["place"] = "garden",
                ["itemId"] = "bench_wood",
                ["x"] = x,
                ["y"] = y
            };
            Assert.True(MessageValidator.Validate(placeMsg).IsInvalid);

            var moveMsg = new JObject
            {
                ["type"] = "room_move",
                ["place"] = "garden",
                ["uid"] = "fx:garden:bench",
                ["x"] = x,
                ["y"] = y
            };
            Assert.True(MessageValidator.Validate(moveMsg).IsInvalid);
        }

        [Fact]
        public void NonIntegerOrNaNCoordinates_AreRejected()
        {
            var nanMsg = new JObject
            {
                ["type"] = "room_move",
                ["place"] = "garden",
                ["uid"] = "fx:garden:bench",
                ["x"] = "NaN",
                ["y"] = 50
            };
            Assert.True(MessageValidator.Validate(nanMsg).IsInvalid);

            var floatMsg = new JObject
            {
                ["type"] = "room_place",
                ["place"] = "garden",
                ["itemId"] = "bench_wood",
                ["x"] = 12.5,
                ["y"] = 50
            };
            Assert.True(MessageValidator.Validate(floatMsg).IsInvalid);
        }

        [Fact]
        public void ToastFor_FixtureLocked_IsShortAndClean()
        {
            string toast = RoomsMessages.ToastFor("fixture_locked");
            Assert.False(string.IsNullOrWhiteSpace(toast));
            Assert.True(toast.Length <= 60);
            Assert.False(toast.Any(char.IsControl));
        }

        [Theory]
        [InlineData("unknown_error")]
        [InlineData("")]
        [InlineData(null)]
        public void ToastFor_UnknownCode_ReturnsDefaultWithoutThrowing(string code)
        {
            string toast = RoomsMessages.ToastFor(code);
            Assert.False(string.IsNullOrWhiteSpace(toast));
            Assert.True(toast.Length <= 60);
            Assert.False(toast.Any(char.IsControl));
        }
    }
}
