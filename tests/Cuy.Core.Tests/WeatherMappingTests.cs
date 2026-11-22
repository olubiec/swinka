using System;
using System.Collections.Generic;
using Cuy.Core.Weather;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WeatherMappingTests
    {
        private static readonly HashSet<string> SixKinds = new HashSet<string>(WeatherMapping.CanonicalKinds);

        [Fact]
        public void AllWmoCodes0To99_MapToOneOfSixCanonicalKinds()
        {
            for (int code = 0; code <= 99; code++)
            {
                string kind = WeatherMapping.FromWmo(code);
                Assert.Contains(kind, SixKinds);
            }
        }

        [Theory]
        [InlineData(0, "clear")]
        [InlineData(1, "clear")]
        [InlineData(2, "cloudy")]
        [InlineData(3, "cloudy")]
        [InlineData(45, "fog")]
        [InlineData(48, "fog")]
        [InlineData(51, "rain")]
        [InlineData(67, "rain")]
        [InlineData(71, "snow")]
        [InlineData(77, "snow")]
        [InlineData(80, "rain")]
        [InlineData(82, "rain")]
        [InlineData(85, "snow")]
        [InlineData(86, "snow")]
        [InlineData(95, "storm")]
        [InlineData(99, "storm")]
        public void KnownWmoCodes_MapToExpectedKind(int code, string expected)
        {
            Assert.Equal(expected, WeatherMapping.FromWmo(code));
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(4)]
        [InlineData(44)]
        [InlineData(50)]
        [InlineData(68)]
        [InlineData(83)]
        [InlineData(94)]
        [InlineData(100)]
        [InlineData(999)]
        public void UnknownOrOutOfRangeWmoCodes_ReturnClear(int code)
        {
            Assert.Equal("clear", WeatherMapping.FromWmo(code));
        }

        [Theory]
        [InlineData("52.22977", "21.01178", 52.2, 21.0)]
        [InlineData("52.25", "21.05", 52.3, 21.1)]
        [InlineData("-90", "-180", -90.0, -180.0)]
        [InlineData("90", "180", 90.0, 180.0)]
        public void TryParseCoords_ValidInputs_RoundsToOneDecimalPlace(string latText, string lonText, double expectedLat, double expectedLon)
        {
            bool ok = WeatherMapping.TryParseCoords(latText, lonText, out double lat, out double lon);
            Assert.True(ok);
            Assert.Equal(expectedLat, lat);
            Assert.Equal(expectedLon, lon);
        }

        [Theory]
        [InlineData("-90.1", "0")]
        [InlineData("90.1", "0")]
        [InlineData("0", "-180.1")]
        [InlineData("0", "180.1")]
        [InlineData("NaN", "21.0")]
        [InlineData("52.2", "NaN")]
        [InlineData("Infinity", "21.0")]
        [InlineData("-Infinity", "21.0")]
        [InlineData("", "21.0")]
        [InlineData("abc", "21.0")]
        public void TryParseCoords_InvalidInputs_ReturnsFalse(string latText, string lonText)
        {
            bool ok = WeatherMapping.TryParseCoords(latText, lonText, out _, out _);
            Assert.False(ok);
        }

        [Fact]
        public void OldSaveWithoutWeatherSection_DefaultsConsentToFalse()
        {
            const string legacyJson = "{\"Version\":1,\"Name\":\"Pigi\"}";
            var state = JsonConvert.DeserializeObject<GameState>(legacyJson);

            Assert.NotNull(state);
            Assert.NotNull(state.Weather);
            Assert.False(state.Weather.Consent);
            Assert.Null(state.Weather.ConsentChangedUtc);
            Assert.Equal("", state.Weather.LocationName);
            Assert.Null(state.Weather.Latitude);
            Assert.Null(state.Weather.Longitude);
        }

        [Fact]
        public void SaveWithNullWeatherSection_DefaultsConsentToFalse()
        {
            const string nullWeatherJson = "{\"Version\":1,\"Name\":\"Pigi\",\"Weather\":null}";
            var state = JsonConvert.DeserializeObject<GameState>(nullWeatherJson);

            Assert.NotNull(state);
            Assert.NotNull(state.Weather);
            Assert.False(state.Weather.Consent);
        }
    }
}
