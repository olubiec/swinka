using System;

namespace Cuy.Core
{
    public sealed class WeatherSettings
    {
        public bool Consent { get; set; } = false;
        public DateTime? ConsentChangedUtc { get; set; }
        public string LocationName { get; set; } = "";
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }

    public sealed partial class GameState
    {
        private WeatherSettings _weather = new WeatherSettings();

        public WeatherSettings Weather
        {
            get => _weather;
            set => _weather = value ?? new WeatherSettings();
        }
    }
}
