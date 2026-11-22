using System;
using System.Collections.Generic;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WeatherMessagesTests
    {
        private static readonly IReadOnlyDictionary<string, MessageRule> Rules =
            MessageValidator.BuildRuleMap(new IMessageRuleSet[] { new WeatherMessages() });

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void SetConsent_ValidBool_Passes(bool consent)
        {
            var msg = new JObject { ["type"] = "weather.setConsent", ["consent"] = consent };
            var res = MessageValidator.ValidateWithRules(Rules, "weather.setConsent", msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);
        }

        [Theory]
        [InlineData("true")]
        [InlineData(1)]
        public void SetConsent_NonBool_Rejected(object badValue)
        {
            var msg = new JObject { ["type"] = "weather.setConsent", ["consent"] = JToken.FromObject(badValue) };
            var res = MessageValidator.ValidateWithRules(Rules, "weather.setConsent", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
        }

        [Fact]
        public void SetConsent_MissingField_Rejected()
        {
            var msg = new JObject { ["type"] = "weather.setConsent" };
            var res = MessageValidator.ValidateWithRules(Rules, "weather.setConsent", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
        }

        [Fact]
        public void SetLocation_ValidCoords_PassesAndRoundsToOneDecimal()
        {
            var msg = new JObject
            {
                ["type"] = "weather.setLocation",
                ["lat"] = "52.22977",
                ["lon"] = "21.01178"
            };
            var res = MessageValidator.ValidateWithRules(Rules, "weather.setLocation", msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);

            string err = WeatherMessages.ValidateLocationPayload(msg, out double? lat, out double? lon, out string city);
            Assert.Null(err);
            Assert.Equal(52.2, lat);
            Assert.Equal(21.0, lon);
            Assert.Null(city);
        }

        [Fact]
        public void SetLocation_ValidCity_Passes()
        {
            var msg = new JObject
            {
                ["type"] = "weather.setLocation",
                ["city"] = "Warsaw"
            };
            var res = MessageValidator.ValidateWithRules(Rules, "weather.setLocation", msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);

            string err = WeatherMessages.ValidateLocationPayload(msg, out double? lat, out double? lon, out string city);
            Assert.Null(err);
            Assert.Null(lat);
            Assert.Null(lon);
            Assert.Equal("Warsaw", city);
        }

        [Theory]
        [InlineData("-91", "21")]
        [InlineData("91", "21")]
        [InlineData("52", "-181")]
        [InlineData("52", "181")]
        [InlineData("NaN", "21")]
        [InlineData("52", "Infinity")]
        public void SetLocation_InvalidCoords_RejectedByPayloadCheck(string latStr, string lonStr)
        {
            var msg = new JObject
            {
                ["type"] = "weather.setLocation",
                ["lat"] = latStr,
                ["lon"] = lonStr
            };
            var res = MessageValidator.ValidateWithRules(Rules, "weather.setLocation", msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);

            string err = WeatherMessages.ValidateLocationPayload(msg, out _, out _, out _);
            Assert.Equal("invalid_coords", err);
        }

        [Fact]
        public void SetLocation_CityTooLong_RejectedByValidator()
        {
            var msg = new JObject
            {
                ["type"] = "weather.setLocation",
                ["city"] = new string('a', 81)
            };
            var res = MessageValidator.ValidateWithRules(Rules, "weather.setLocation", msg);
            Assert.Equal(ValidationStatus.Invalid, res.Status);
        }

        [Theory]
        [InlineData("weather.deleteLocation")]
        [InlineData("weather.refresh")]
        public void ParameterlessWeatherMessages_Pass(string type)
        {
            var msg = new JObject { ["type"] = type };
            var res = MessageValidator.ValidateWithRules(Rules, type, msg);
            Assert.Equal(ValidationStatus.Ok, res.Status);
        }

        [Fact]
        public void Fuzz200Payloads_NeverThrows()
        {
            var rng = new Random(42);
            string[] types = { "weather.setConsent", "weather.setLocation", "weather.deleteLocation", "weather.refresh" };

            for (int i = 0; i < 200; i++)
            {
                string type = types[rng.Next(types.Length)];
                var msg = new JObject { ["type"] = type };

                if (rng.Next(2) == 0) msg["consent"] = rng.Next(3) switch { 0 => JValue.CreateNull(), 1 => true, _ => "bad" };
                if (rng.Next(2) == 0) msg["city"] = new string('x', rng.Next(0, 100));
                if (rng.Next(2) == 0) msg["lat"] = (rng.NextDouble() * 400 - 200).ToString("G", System.Globalization.CultureInfo.InvariantCulture);
                if (rng.Next(2) == 0) msg["lon"] = rng.Next(4) == 0 ? "NaN" : (rng.NextDouble() * 400 - 200).ToString("G", System.Globalization.CultureInfo.InvariantCulture);

                var res = MessageValidator.ValidateWithRules(Rules, type, msg);
                Assert.True(res.Status == ValidationStatus.Ok || res.Status == ValidationStatus.Invalid);
                _ = WeatherMessages.ValidateLocationPayload(msg, out _, out _, out _);
            }
        }
    }
}
