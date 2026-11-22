using System.Collections.Generic;
using Cuy.Core.Weather;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Input.Validation
{
    /// <summary>
    /// Validation rules for live weather consent and location messages (<c>weather.*</c>).
    /// Discovered via reflection by <see cref="MessageValidator"/>.
    /// </summary>
    public sealed class WeatherMessages : IMessageRuleSet
    {
        public IEnumerable<MessageRule> Rules => new[]
        {
            new MessageRule("weather.setConsent", FieldRule.Bool("consent")),
            new MessageRule(
                "weather.setLocation",
                FieldRule.Str("city", 80, required: false),
                FieldRule.Str("lat", 16, required: false),
                FieldRule.Str("lon", 16, required: false)),
            new MessageRule("weather.deleteLocation"),
            new MessageRule("weather.refresh")
        };

        /// <summary>
        /// Validates the semantic payload of <c>weather.setLocation</c>:
        /// either valid rounded coordinates (<c>lat</c> in [-90, 90], <c>lon</c> in [-180, 180])
        /// or a non-empty <c>city</c> name (max 80 chars).
        /// Returns <c>null</c> when valid, or an error code string when invalid.
        /// </summary>
        public static string ValidateLocationPayload(JObject message, out double? roundedLat, out double? roundedLon, out string city)
        {
            roundedLat = null;
            roundedLon = null;
            city = null;

            if (message == null)
                return "null_message";

            string latStr = message.TryGetValue("lat", out var latTok) && latTok.Type == JTokenType.String ? (string)latTok : null;
            string lonStr = message.TryGetValue("lon", out var lonTok) && lonTok.Type == JTokenType.String ? (string)lonTok : null;
            string cityStr = message.TryGetValue("city", out var cityTok) && cityTok.Type == JTokenType.String ? ((string)cityTok)?.Trim() : null;

            bool hasLat = !string.IsNullOrWhiteSpace(latStr);
            bool hasLon = !string.IsNullOrWhiteSpace(lonStr);

            if (hasLat || hasLon)
            {
                if (!hasLat || !hasLon)
                    return "incomplete_coords";

                if (!WeatherMapping.TryParseCoords(latStr, lonStr, out double lat, out double lon))
                    return "invalid_coords";

                roundedLat = lat;
                roundedLon = lon;
                if (!string.IsNullOrEmpty(cityStr) && cityStr.Length <= 80)
                    city = cityStr;
                return null;
            }

            if (string.IsNullOrWhiteSpace(cityStr))
                return "missing_location";

            if (cityStr.Length > 80)
                return "city_too_long";

            city = cityStr;
            return null;
        }
    }
}
