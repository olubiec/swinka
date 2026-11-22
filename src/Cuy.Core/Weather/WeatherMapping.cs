using System;
using System.Globalization;

namespace Cuy.Core.Weather
{
    /// <summary>
    /// Maps WMO weather codes to canonical Home weather kinds and validates/rounds coordinates.
    /// </summary>
    public static class WeatherMapping
    {
        public static readonly string[] CanonicalKinds =
        {
            "clear", "cloudy", "fog", "rain", "snow", "storm"
        };

        public static bool IsKnownWmo(int code)
        {
            if (code == 0 || code == 1) return true;
            if (code == 2 || code == 3) return true;
            if (code == 45 || code == 48) return true;
            if (code >= 51 && code <= 67) return true;
            if (code >= 71 && code <= 77) return true;
            if (code >= 80 && code <= 82) return true;
            if (code == 85 || code == 86) return true;
            if (code >= 95 && code <= 99) return true;
            return false;
        }

        public static string FromWmo(int code)
        {
            if (code < 0 || code > 99 || !IsKnownWmo(code))
                return "clear";

            switch (OpenMeteo.FromWmo(code))
            {
                case WeatherCondition.Clear: return "clear";
                case WeatherCondition.Cloudy: return "cloudy";
                case WeatherCondition.Fog: return "fog";
                case WeatherCondition.Rain: return "rain";
                case WeatherCondition.Snow: return "snow";
                case WeatherCondition.Storm: return "storm";
                default: return "clear";
            }
        }

        public static double RoundCoord(double value)
        {
            return Math.Round(value, 1, MidpointRounding.AwayFromZero);
        }

        public static bool TryParseCoords(string latText, string lonText, out double lat, out double lon)
        {
            lat = 0;
            lon = 0;

            if (string.IsNullOrWhiteSpace(latText) || string.IsNullOrWhiteSpace(lonText))
                return false;

            if (!double.TryParse(latText.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out double rawLat))
                return false;
            if (!double.TryParse(lonText.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out double rawLon))
                return false;

            if (double.IsNaN(rawLat) || double.IsInfinity(rawLat))
                return false;
            if (double.IsNaN(rawLon) || double.IsInfinity(rawLon))
                return false;

            if (rawLat < -90.0 || rawLat > 90.0)
                return false;
            if (rawLon < -180.0 || rawLon > 180.0)
                return false;

            lat = RoundCoord(rawLat);
            lon = RoundCoord(rawLon);
            return true;
        }
    }
}
