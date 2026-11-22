using System;
using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Cuy.Core.Weather;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public sealed class WeatherAdversarialTests
    {
        [Fact(Skip = "SKIP WX-handler-never-called-without-consent: WeatherService lives in Cuy (net48), not referenced by Cuy.Core.Tests (net9.0).")]
        public void WX_HandlerNeverCalledWithoutConsent()
        {
        }

        [Fact]
        public void WX_PayloadOnlyRoundedLatLon()
        {
            double rLat = WeatherMapping.RoundCoord(52.22977);
            double rLon = WeatherMapping.RoundCoord(21.01178);

            Assert.Equal(52.2, rLat);
            Assert.Equal(21.0, rLon);

            string url = OpenMeteo.ForecastUrl(rLat, rLon);
            Assert.Equal(
                "https://api.open-meteo.com/v1/forecast?latitude=52.2&longitude=21&current=temperature_2m,weather_code,is_day&timezone=auto",
                url);

            Assert.True(WeatherMapping.TryParseCoords("52.22977", "21.01178", out double parsedLat, out double parsedLon));
            Assert.Equal(52.2, parsedLat);
            Assert.Equal(21.0, parsedLon);

            Assert.False(WeatherMapping.TryParseCoords("NaN", "21.0", out _, out _));
            Assert.False(WeatherMapping.TryParseCoords("52.2", "Infinity", out _, out _));
            Assert.False(WeatherMapping.TryParseCoords("90.1", "21.0", out _, out _));
            Assert.False(WeatherMapping.TryParseCoords("-90.1", "21.0", out _, out _));
            Assert.False(WeatherMapping.TryParseCoords("52.2", "180.1", out _, out _));
            Assert.False(WeatherMapping.TryParseCoords("52.2", "-180.1", out _, out _));
        }

        [Fact(Skip = "SKIP WX-min-interval-30-min: WeatherService lives in Cuy (net48), not referenced by Cuy.Core.Tests (net9.0).")]
        public void WX_MinInterval30Min()
        {
        }

        [Fact(Skip = "SKIP WX-timeout-5s: WeatherService lives in Cuy (net48), not referenced by Cuy.Core.Tests (net9.0).")]
        public void WX_Timeout5s()
        {
        }

        [Fact]
        public void WX_MalformedJsonNoThrow()
        {
            var now = new DateTime(2026, 11, 22, 12, 0, 0, DateTimeKind.Utc);
            string[] badPayloads =
            {
                null,
                "",
                "   ",
                "null",
                "{",
                "{bad json",
                "[]",
                "{}",
                "{\"current\":null}",
                "{\"current\":{\"temperature_2m\":\"bad\"}}",
                "{\"results\":[]}",
                "{\"results\":[null]}"
            };

            foreach (string payload in badPayloads)
            {
                Assert.Null(OpenMeteo.ParseCurrent(payload, now));
                Assert.Null(OpenMeteo.ParseGeocode(payload));
            }
        }

        [Fact(Skip = "SKIP WX-http-500-no-throw: WeatherService lives in Cuy (net48), not referenced by Cuy.Core.Tests (net9.0).")]
        public void WX_Http500NoThrow()
        {
        }

        [Fact]
        public void WX_AllWmoCodes()
        {
            var allowed = new HashSet<string>(WeatherMapping.CanonicalKinds, StringComparer.Ordinal);

            for (int code = 0; code <= 99; code++)
            {
                string kind = WeatherMapping.FromWmo(code);
                Assert.Contains(kind, allowed);
            }

            int[] unknownCodes = { -100, -1, 4, 10, 49, 50, 70, 90, 100, 999 };
            foreach (int code in unknownCodes)
            {
                Assert.Equal("clear", WeatherMapping.FromWmo(code));
            }
        }

        [Fact]
        public void WX_MessageFuzz300()
        {
            var rng = new Random(42);
            string[] types =
            {
                "weather.setConsent",
                "weather.setLocation",
                "weather.deleteLocation",
                "weather.refresh"
            };

            for (int i = 0; i < 300; i++)
            {
                string type = types[rng.Next(types.Length)];
                var msg = new JObject { ["type"] = type };

                if (rng.Next(4) != 0) msg["consent"] = RandomToken(rng);
                if (rng.Next(4) != 0) msg["city"] = RandomToken(rng);
                if (rng.Next(4) != 0) msg["lat"] = RandomToken(rng);
                if (rng.Next(4) != 0) msg["lon"] = RandomToken(rng);
                if (rng.Next(3) == 0) msg["extra"] = RandomToken(rng);

                var res = MessageValidator.Validate(msg);
                Assert.True(res.IsOk || res.IsInvalid);

                if (type == "weather.setLocation")
                {
                    _ = WeatherMessages.ValidateLocationPayload(msg, out _, out _, out _);
                }
            }
        }

        [Fact]
        public void WX_GameStateDefaultOff()
        {
            var state = new GameState();
            Assert.NotNull(state.Weather);
            Assert.False(state.Weather.Consent);
            Assert.Null(state.Weather.ConsentChangedUtc);
            Assert.Equal("", state.Weather.LocationName);
            Assert.Null(state.Weather.Latitude);
            Assert.Null(state.Weather.Longitude);

            state.Weather = null;
            Assert.NotNull(state.Weather);
            Assert.False(state.Weather.Consent);
        }

        private static JToken RandomToken(Random rng)
        {
            switch (rng.Next(7))
            {
                case 0: return JValue.CreateNull();
                case 1: return new JValue(rng.Next(2) == 0);
                case 2: return new JValue(rng.Next(-500, 500));
                case 3: return new JValue((rng.NextDouble() - 0.5) * 400.0);
                case 4: return new JValue(new string('x', rng.Next(0, 120)));
                case 5: return new JArray(1, "two", false);
                default: return new JObject { ["nested"] = "val" };
            }
        }
    }
}
