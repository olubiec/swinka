using System;
using System.IO;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Pigs
{
    public sealed class PigRoamingConfig
    {
        private static readonly object _syncLock = new object();
        private static PigRoamingConfig _current;

        public static PigRoamingConfig Current
        {
            get
            {
                if (_current != null) return _current;
                lock (_syncLock)
                {
                    if (_current == null)
                    {
                        _current = LoadDefault();
                    }
                }
                return _current;
            }
        }

        public static void Reset()
        {
            lock (_syncLock)
            {
                _current = null;
            }
        }

        public int IntervalMinSeconds { get; set; } = 600;
        public int IntervalMaxSeconds { get; set; } = 1800;
        public int SleepStartHour { get; set; } = 22;
        public int SleepEndHour { get; set; } = 7;
        public bool PinnedDefault { get; set; } = false;

        public int[] SleepHours => new[] { SleepStartHour, SleepEndHour };

        public static PigRoamingConfig CreateDefault()
        {
            return new PigRoamingConfig();
        }

        public static PigRoamingConfig LoadDefault()
        {
            string[] starts = { AppContext.BaseDirectory, Directory.GetCurrentDirectory() };
            foreach (var start in starts)
            {
                if (string.IsNullOrEmpty(start)) continue;
                var dir = new DirectoryInfo(start);
                for (int depth = 0; dir != null && depth < 8; depth++, dir = dir.Parent)
                {
                    string path = Path.Combine(dir.FullName, "assets", "data", "pig_roaming.json");
                    if (!File.Exists(path)) continue;
                    try
                    {
                        return Load(File.ReadAllText(path));
                    }
                    catch (Exception ex)
                    {
                        Log($"could not read {path} ({ex.Message}), using code defaults.");
                        return CreateDefault();
                    }
                }
            }
            Log("pig_roaming.json not found, using code defaults.");
            return CreateDefault();
        }

        public static PigRoamingConfig Load(string json)
        {
            var cfg = new PigRoamingConfig();
            if (string.IsNullOrWhiteSpace(json))
            {
                Log("empty JSON, using code defaults.");
                return cfg;
            }

            JObject root;
            try
            {
                root = JObject.Parse(json);
            }
            catch (Exception ex)
            {
                Log($"bad JSON ({ex.Message}), using code defaults.");
                return cfg;
            }

            if (root["interval_min_s"] != null)
                cfg.IntervalMinSeconds = Math.Max(0, root.Value<int>("interval_min_s"));
            if (root["interval_max_s"] != null)
                cfg.IntervalMaxSeconds = Math.Max(cfg.IntervalMinSeconds, root.Value<int>("interval_max_s"));

            var sleepHours = root["sleep_hours"] as JArray;
            if (sleepHours != null && sleepHours.Count >= 2)
            {
                cfg.SleepStartHour = ClampHour(sleepHours[0].Value<int>());
                cfg.SleepEndHour = ClampHour(sleepHours[1].Value<int>());
            }

            if (root["pinned_default"] != null)
                cfg.PinnedDefault = root.Value<bool>("pinned_default");

            return cfg;
        }

        public bool IsSleepHours(DateTime localNow)
        {
            int hour = localNow.Hour;
            if (SleepStartHour == SleepEndHour) return false;
            if (SleepStartHour > SleepEndHour)
                return hour >= SleepStartHour || hour < SleepEndHour;
            return hour >= SleepStartHour && hour < SleepEndHour;
        }

        private static int ClampHour(int h)
        {
            if (h < 0) return 0;
            if (h > 23) return 23;
            return h;
        }

        private static void Log(string message)
        {
            ItemCatalog.ErrorLogger?.Invoke("PigRoamingConfig: " + message);
        }
    }
}
