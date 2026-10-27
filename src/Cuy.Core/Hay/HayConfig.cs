using System;
using System.IO;
using System.Reflection;
using Newtonsoft.Json;

namespace Cuy.Core.Hay
{
    public sealed class HayConfig
    {
        private static readonly object _syncLock = new object();
        private static HayConfig _current;

        public static HayConfig Current
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
            set
            {
                lock (_syncLock)
                {
                    _current = value;
                }
            }
        }

        [JsonProperty("max")]
        public double Max { get; set; } = 100;

        [JsonProperty("refillAmount")]
        public double RefillAmount { get; set; } = 50;

        [JsonProperty("eatPerGameHour")]
        public double EatPerGameHour { get; set; } = 6;

        [JsonProperty("offlineEatPerHour")]
        public double OfflineEatPerHour { get; set; } = 2;

        [JsonProperty("fullnessPerHayUnit")]
        public double FullnessPerHayUnit { get; set; } = 0.5;

        [JsonProperty("wheekBelow")]
        public double WheekBelow { get; set; } = 10;

        public static HayConfig Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                throw new ArgumentNullException(nameof(json));

            try
            {
                var config = JsonConvert.DeserializeObject<HayConfig>(json);
                return config ?? new HayConfig();
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"HayConfig: Error parsing JSON: {ex.Message}");
                return new HayConfig();
            }
        }

        public static HayConfig LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("hay.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static HayConfig LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "hay.json"),
                Path.Combine(baseDir, "hay.json"),
                Path.Combine(baseDir, "..", "assets", "data", "hay.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "hay.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "hay.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "hay.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "hay.json")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    string fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        return LoadFromFile(fullPath);
                    }
                }
                catch { }
            }

            // 2. Check embedded resources
            var asm = typeof(HayConfig).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("hay.json", StringComparison.OrdinalIgnoreCase))
                {
                    using (var stream = asm.GetManifestResourceStream(resName))
                    {
                        if (stream != null)
                        {
                            using (var reader = new StreamReader(stream))
                            {
                                return Load(reader.ReadToEnd());
                            }
                        }
                    }
                }
            }

            // 3. Fallback to code defaults
            ItemCatalog.ErrorLogger?.Invoke("HayConfig: hay.json not found, using hardcoded defaults.");
            return new HayConfig();
        }
    }
}
