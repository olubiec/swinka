using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Cuy.Core
{
    public sealed class TrickDefinition
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("unlock")]
        public string Unlock { get; set; }

        [JsonProperty("title")]
        public string Title { get; set; }
    }

    public sealed class TricksConfig
    {
        private static readonly object _syncLock = new object();
        private static TricksConfig _current;

        public static TricksConfig Current
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

        [JsonProperty("energy_cost")]
        public double EnergyCost { get; set; } = 10;

        [JsonProperty("min_energy")]
        public double MinEnergy { get; set; } = 25;

        [JsonProperty("cooldown_seconds")]
        public double CooldownSeconds { get; set; } = 30;

        [JsonProperty("bond_points")]
        public int BondPoints { get; set; } = 2;

        [JsonProperty("mood_gain")]
        public double MoodGain { get; set; } = 3;

        [JsonProperty("tricks")]
        public List<TrickDefinition> Tricks { get; set; } = new List<TrickDefinition>();

        public TricksConfig() { }

        public TricksConfig(IEnumerable<TrickDefinition> tricks)
        {
            if (tricks != null)
                Tricks = tricks.ToList();
        }

        public static TricksConfig Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return CreateDefaultConfig();

            try
            {
                var config = JsonConvert.DeserializeObject<TricksConfig>(json);
                if (config == null) return CreateDefaultConfig();

                var validTricks = new List<TrickDefinition>();
                var seenIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                if (config.Tricks != null)
                {
                    foreach (var t in config.Tricks)
                    {
                        if (string.IsNullOrWhiteSpace(t.Id))
                        {
                            ItemCatalog.ErrorLogger?.Invoke("TricksConfig: Dropping trick with empty id");
                            continue;
                        }

                        if (seenIds.Contains(t.Id))
                        {
                            ItemCatalog.ErrorLogger?.Invoke($"TricksConfig: Dropping duplicate trick id '{t.Id}'");
                            continue;
                        }

                        seenIds.Add(t.Id);
                        validTricks.Add(t);
                    }
                }

                config.Tricks = validTricks;
                return config;
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke("TricksConfig: Error parsing JSON: " + ex.Message);
            }

            return CreateDefaultConfig();
        }

        private static TricksConfig LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("tricks.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static TricksConfig LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "tricks.json"),
                Path.Combine(baseDir, "tricks.json"),
                Path.Combine(baseDir, "..", "assets", "data", "tricks.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "tricks.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "tricks.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "tricks.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "tricks.json")
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
            var asm = typeof(TricksConfig).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("tricks.json", StringComparison.OrdinalIgnoreCase))
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
            ItemCatalog.ErrorLogger?.Invoke("TricksConfig: tricks.json not found, using hardcoded defaults.");
            return CreateDefaultConfig();
        }

        private static TricksConfig CreateDefaultConfig()
        {
            return new TricksConfig
            {
                EnergyCost = 10,
                MinEnergy = 25,
                CooldownSeconds = 30,
                BondPoints = 2,
                MoodGain = 3,
                Tricks = new List<TrickDefinition>
                {
                    new TrickDefinition { Id = "spin", Unlock = "trick_spin", Title = "Spin" },
                    new TrickDefinition { Id = "stand_up", Unlock = "trick_stand_up", Title = "Stand up" },
                    new TrickDefinition { Id = "popcorn", Unlock = "trick_popcorn", Title = "Popcorn jump" },
                    new TrickDefinition { Id = "hurdle", Unlock = "trick_hurdle", Title = "Hurdle jump" }
                }
            };
        }
    }
}