using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Cuy.Core.Weather;

namespace Cuy.Platform
{
    /// <summary>
    /// The ONLY network use in Cuy (AGENTS.md hard rule 5 exception): Open-Meteo, no API key, no telemetry.
    /// Sends only the city name (geocoding, once) and the coordinates (forecast, every RefreshInterval).
    /// Free tier limits (open-meteo.com/en/terms): under 10 000 calls/day, 5 000/hour, 600/minute, non-commercial.
    /// One call per hour = 24 calls a day.
    ///
    /// Usage (UI thread):
    ///   _weather = new WeatherService(log: BrainController.Log);
    ///   _weather.Updated += info => brain.Pet.Weather = info;   // marshal to the UI thread if needed
    ///   _weather.SetCity(LocalData.WeatherCity, LocalData.WeatherLat, LocalData.WeatherLon);
    ///   ... on exit: _weather.Dispose();
    /// </summary>
    public sealed class WeatherService : IDisposable
    {
        public static readonly TimeSpan RefreshInterval = TimeSpan.FromHours(1);
        private static readonly HttpClient Http = CreateClient();

        private readonly Action<string> _log;
        private readonly SynchronizationContext _ui;
        private CancellationTokenSource _cts;
        private string _city;
        private double? _lat, _lon;
        private bool _loggedError;

        /// <summary>Fires on the thread that created the service (UI thread) with fresh weather.</summary>
        public event Action<WeatherInfo> Updated;

        /// <summary>Fires after a successful geocode so the caller can cache it (LocalData).</summary>
        public event Action<GeoPlace> PlaceResolved;

        public WeatherInfo Last { get; private set; }
        public GeoPlace Place { get; private set; }

        public WeatherService(Action<string> log)
        {
            _log = log ?? (s => { });
            _ui = SynchronizationContext.Current ?? new SynchronizationContext();
        }

        /// <summary>Empty city = weather off. Cached coordinates skip the geocoding call.</summary>
        public void SetCity(string city, double? cachedLat = null, double? cachedLon = null)
        {
            Stop();
            _city = (city ?? "").Trim();
            _lat = cachedLat;
            _lon = cachedLon;
            Last = null;
            if (_city.Length == 0)
            {
                _log("[Weather] off (no city)");
                Post(null);
                return;
            }
            _cts = new CancellationTokenSource();
            var token = _cts.Token;
            Task.Run(() => LoopAsync(token), token);
        }

        private async Task LoopAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    if (_lat == null || _lon == null)
                    {
                        string geo = await GetAsync(OpenMeteo.GeocodeUrl(_city, "en"), ct).ConfigureAwait(false);
                        var place = OpenMeteo.ParseGeocode(geo);
                        if (place == null)
                        {
                            _log("[Weather] city not found: " + _city);
                            return; // stop until the user types another city
                        }
                        Place = place;
                        _lat = place.Latitude;
                        _lon = place.Longitude;
                        _log("[Weather] place " + place.DisplayName);
                        _ui.Post(_ => PlaceResolved?.Invoke(place), null);
                    }

                    string json = await GetAsync(OpenMeteo.ForecastUrl(_lat.Value, _lon.Value), ct).ConfigureAwait(false);
                    var info = OpenMeteo.ParseCurrent(json, DateTime.UtcNow);
                    if (info != null)
                    {
                        Last = info;
                        _loggedError = false;
                        _log(string.Format("[Weather] {0} {1:0.0} C (code {2})", info.Condition, info.TemperatureC, info.WmoCode));
                        Post(info);
                    }
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    // Offline, DNS, timeout: keep the last good value, log only once until it works again.
                    if (!_loggedError) _log("[Weather] request failed: " + ex.GetType().Name + " " + ex.Message);
                    _loggedError = true;
                }

                try { await Task.Delay(RefreshInterval, ct).ConfigureAwait(false); }
                catch (OperationCanceledException) { return; }
            }
        }

        private static async Task<string> GetAsync(string url, CancellationToken ct)
        {
            using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct))
            {
                timeout.CancelAfter(TimeSpan.FromSeconds(10));
                using (var resp = await Http.GetAsync(url, timeout.Token).ConfigureAwait(false))
                {
                    resp.EnsureSuccessStatusCode();
                    return await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                }
            }
        }

        private void Post(WeatherInfo info)
        {
            _ui.Post(_ => Updated?.Invoke(info), null);
        }

        private static HttpClient CreateClient()
        {
            // .NET Framework 4.8 on an old Windows 10 may default to TLS 1.0; Open-Meteo needs TLS 1.2+.
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
            var c = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
            c.DefaultRequestHeaders.UserAgent.ParseAdd("Cuy-desktop-pet/1.0 (+gift, non-commercial)");
            return c;
        }

        private void Stop()
        {
            if (_cts == null) return;
            try { _cts.Cancel(); } catch { }
            _cts.Dispose();
            _cts = null;
        }

        public void Dispose() { Stop(); }
    }
}
