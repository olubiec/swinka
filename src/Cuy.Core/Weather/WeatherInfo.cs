using System;
using System.Globalization;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Weather
{
    public enum WeatherCondition { Clear, Cloudy, Fog, Rain, Snow, Storm }

    /// <summary>Current weather as the pig needs it. Not saved; WeatherService refreshes it.</summary>
    public sealed class WeatherInfo
    {
        public double TemperatureC { get; set; }
        public WeatherCondition Condition { get; set; }
        public int WmoCode { get; set; }
        public bool IsDay { get; set; } = true;
        public DateTime FetchedUtc { get; set; }

        public bool IsWet { get { return Condition == WeatherCondition.Rain || Condition == WeatherCondition.Storm; } }
    }

    /// <summary>A geocoding hit (Open-Meteo geocoding API).</summary>
    public sealed class GeoPlace
    {
        public string Name { get; set; }
        public string Country { get; set; }
        public string Admin1 { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }

        public string DisplayName
        {
            get
            {
                string s = Name ?? "";
                if (!string.IsNullOrEmpty(Admin1)) s += ", " + Admin1;
                if (!string.IsNullOrEmpty(Country)) s += ", " + Country;
                return s;
            }
        }
    }

    /// <summary>
    /// Pure helpers for Open-Meteo (https://open-meteo.com, data CC BY 4.0, free for non-commercial use).
    /// WMO code table as documented by Open-Meteo ("WMO Weather interpretation codes").
    /// </summary>
    public static class OpenMeteo
    {
        public const string Attribution = "Weather data by Open-Meteo.com (CC BY 4.0)";

        public static WeatherCondition FromWmo(int code)
        {
            if (code == 0 || code == 1) return WeatherCondition.Clear;          // clear, mainly clear
            if (code == 2 || code == 3) return WeatherCondition.Cloudy;         // partly cloudy, overcast
            if (code == 45 || code == 48) return WeatherCondition.Fog;          // fog, rime fog
            if (code >= 51 && code <= 67) return WeatherCondition.Rain;         // drizzle, freezing drizzle, rain, freezing rain
            if (code >= 71 && code <= 77) return WeatherCondition.Snow;         // snow fall, snow grains
            if (code >= 80 && code <= 82) return WeatherCondition.Rain;         // rain showers
            if (code == 85 || code == 86) return WeatherCondition.Snow;         // snow showers
            if (code >= 95 && code <= 99) return WeatherCondition.Storm;        // thunderstorm (+ hail)
            return WeatherCondition.Cloudy;                                     // unknown code: harmless default
        }

        public static string GeocodeUrl(string city, string language)
        {
            if (string.IsNullOrEmpty(language)) language = "en";
            return "https://geocoding-api.open-meteo.com/v1/search?count=1&format=json&language="
                   + Uri.EscapeDataString(language) + "&name=" + Uri.EscapeDataString((city ?? "").Trim());
        }

        public static string ForecastUrl(double lat, double lon)
        {
            return "https://api.open-meteo.com/v1/forecast?latitude=" + lat.ToString("0.####", CultureInfo.InvariantCulture)
                   + "&longitude=" + lon.ToString("0.####", CultureInfo.InvariantCulture)
                   + "&current=temperature_2m,weather_code,is_day&timezone=auto";
        }

        /// <summary>Returns null when the city was not found or the JSON is not what we expect.</summary>
        public static GeoPlace ParseGeocode(string json)
        {
            try
            {
                var root = JObject.Parse(json);
                var first = root["results"] is JArray arr && arr.Count > 0 ? arr[0] : null;
                if (first == null) return null;
                return new GeoPlace
                {
                    Name = (string)first["name"],
                    Country = (string)first["country"],
                    Admin1 = (string)first["admin1"],
                    Latitude = (double)first["latitude"],
                    Longitude = (double)first["longitude"]
                };
            }
            catch (Exception) { return null; }
        }

        /// <summary>Parses the "current" block of a forecast response; null on any problem.</summary>
        public static WeatherInfo ParseCurrent(string json, DateTime fetchedUtc)
        {
            try
            {
                var cur = JObject.Parse(json)["current"];
                if (cur == null || cur["temperature_2m"] == null || cur["weather_code"] == null) return null;
                int code = (int)cur["weather_code"];
                return new WeatherInfo
                {
                    TemperatureC = (double)cur["temperature_2m"],
                    WmoCode = code,
                    Condition = FromWmo(code),
                    IsDay = cur["is_day"] == null || (int)cur["is_day"] == 1,
                    FetchedUtc = fetchedUtc
                };
            }
            catch (Exception) { return null; }
        }
    }
}
