using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Cuy.Core.Save;
using Cuy.Core.Weather;
using Newtonsoft.Json;

namespace Cuy
{
    public sealed class WeatherFetchResult
    {
        public string Status { get; set; } = "off";
        public WeatherInfo Info { get; set; }
        public bool FromCache { get; set; }
    }

    /// <summary>
    /// Opt-in Open-Meteo weather client. Never creates an HttpClient or sends any request
    /// unless <c>hasConsent()</c> returns true. Never throws to callers.
    /// </summary>
    public sealed class WeatherService : IDisposable
    {
        public static readonly TimeSpan MinRefreshInterval = TimeSpan.FromMinutes(30);
        public static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(5);

        private sealed class CachedWeather
        {
            public double Lat { get; set; }
            public double Lon { get; set; }
            public WeatherInfo Info { get; set; }
        }

        private readonly Func<bool> _hasConsent;
        private readonly Func<DateTime> _utcNow;
        private readonly HttpMessageHandler _handler;
        private readonly string _cachePath;
        private readonly object _lock = new object();

        private HttpClient _client;
        private CachedWeather _cache;
        private bool _cacheLoaded;
        private bool _disposed;

        public WeatherService(
            Func<bool> hasConsent,
            Func<DateTime> utcNow = null,
            HttpMessageHandler handler = null,
            string cachePath = null)
        {
            _hasConsent = hasConsent ?? (() => false);
            _utcNow = utcNow ?? (() => DateTime.UtcNow);
            _handler = handler;
            _cachePath = string.IsNullOrWhiteSpace(cachePath)
                ? Path.Combine(SaveSystem.DefaultDirectory, "weather_cache.json")
                : cachePath;
        }

        public async Task<WeatherFetchResult> GetCurrentAsync(double lat, double lon, bool force = false)
        {
            try
            {
                if (_disposed || !_hasConsent())
                    return new WeatherFetchResult { Status = "off", Info = null, FromCache = false };

                if (double.IsNaN(lat) || double.IsInfinity(lat) || lat < -90.0 || lat > 90.0
                    || double.IsNaN(lon) || double.IsInfinity(lon) || lon < -180.0 || lon > 180.0)
                {
                    return new WeatherFetchResult { Status = "no_location", Info = null, FromCache = false };
                }

                double rLat = WeatherMapping.RoundCoord(lat);
                double rLon = WeatherMapping.RoundCoord(lon);
                DateTime now = _utcNow();

                CachedWeather cached = GetMatchingCache(rLat, rLon);
                if (!force && cached != null && cached.Info != null && (now - cached.Info.FetchedUtc) < MinRefreshInterval)
                {
                    return new WeatherFetchResult
                    {
                        Status = "ok",
                        Info = cached.Info,
                        FromCache = true
                    };
                }

                HttpClient client = GetOrCreateClient();
                if (client == null)
                    return new WeatherFetchResult { Status = "off", Info = null, FromCache = false };

                string url = OpenMeteo.ForecastUrl(rLat, rLon);
                HttpResponseMessage response = await client.GetAsync(url).ConfigureAwait(false);
                if (!response.IsSuccessStatusCode)
                {
                    return new WeatherFetchResult
                    {
                        Status = "offline",
                        Info = cached?.Info,
                        FromCache = cached?.Info != null
                    };
                }

                string json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                WeatherInfo info = OpenMeteo.ParseCurrent(json, now);
                if (info == null)
                {
                    return new WeatherFetchResult
                    {
                        Status = "error",
                        Info = cached?.Info,
                        FromCache = cached?.Info != null
                    };
                }

                SaveCache(new CachedWeather { Lat = rLat, Lon = rLon, Info = info });
                return new WeatherFetchResult
                {
                    Status = "ok",
                    Info = info,
                    FromCache = false
                };
            }
            catch (Exception)
            {
                CachedWeather cached = TryGetAnyCache();
                return new WeatherFetchResult
                {
                    Status = "offline",
                    Info = cached?.Info,
                    FromCache = cached?.Info != null
                };
            }
        }

        public async Task<GeoPlace> GeocodeCityAsync(string city)
        {
            try
            {
                if (_disposed || !_hasConsent() || string.IsNullOrWhiteSpace(city))
                    return null;

                HttpClient client = GetOrCreateClient();
                if (client == null)
                    return null;

                string url = OpenMeteo.GeocodeUrl(city, "en");
                HttpResponseMessage response = await client.GetAsync(url).ConfigureAwait(false);
                if (!response.IsSuccessStatusCode)
                    return null;

                string json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                GeoPlace place = OpenMeteo.ParseGeocode(json);
                if (place == null)
                    return null;

                place.Latitude = WeatherMapping.RoundCoord(place.Latitude);
                place.Longitude = WeatherMapping.RoundCoord(place.Longitude);
                return place;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public void ClearCache()
        {
            lock (_lock)
            {
                _cache = null;
                _cacheLoaded = true;
                try
                {
                    if (!string.IsNullOrEmpty(_cachePath) && File.Exists(_cachePath))
                        File.Delete(_cachePath);
                }
                catch (Exception)
                {
                    // Never throw on cache cleanup
                }
            }
        }

        public void Dispose()
        {
            lock (_lock)
            {
                if (_disposed) return;
                _disposed = true;
                _client?.Dispose();
                _client = null;
            }
        }

        private HttpClient GetOrCreateClient()
        {
            lock (_lock)
            {
                if (_disposed || !_hasConsent())
                    return null;

                if (_client == null)
                {
                    _client = _handler != null
                        ? new HttpClient(_handler, disposeHandler: false)
                        : new HttpClient();
                    _client.Timeout = RequestTimeout;
                }

                return _client;
            }
        }

        private CachedWeather GetMatchingCache(double rLat, double rLon)
        {
            lock (_lock)
            {
                EnsureCacheLoaded();
                if (_cache == null || _cache.Info == null)
                    return null;

                if (Math.Abs(_cache.Lat - rLat) > 0.05 || Math.Abs(_cache.Lon - rLon) > 0.05)
                    return null;

                return _cache;
            }
        }

        private CachedWeather TryGetAnyCache()
        {
            lock (_lock)
            {
                EnsureCacheLoaded();
                return _cache;
            }
        }

        private void EnsureCacheLoaded()
        {
            if (_cacheLoaded) return;
            _cacheLoaded = true;
            try
            {
                if (string.IsNullOrEmpty(_cachePath) || !File.Exists(_cachePath))
                    return;

                string json = File.ReadAllText(_cachePath);
                _cache = JsonConvert.DeserializeObject<CachedWeather>(json);
            }
            catch (Exception)
            {
                _cache = null;
            }
        }

        private void SaveCache(CachedWeather entry)
        {
            lock (_lock)
            {
                _cache = entry;
                _cacheLoaded = true;
                try
                {
                    if (string.IsNullOrEmpty(_cachePath)) return;
                    string dir = Path.GetDirectoryName(_cachePath);
                    if (!string.IsNullOrEmpty(dir))
                        Directory.CreateDirectory(dir);
                    File.WriteAllText(_cachePath, JsonConvert.SerializeObject(entry));
                }
                catch (Exception)
                {
                    // Never throw on cache persistence
                }
            }
        }
    }
}
