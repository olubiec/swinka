using System;
using System.IO;
using System.Reflection;
using Newtonsoft.Json;

namespace Cuy.Core.Economy
{
    /*
     * Design target:
     * An active player earns about 150-250 clovers a day
     * (gift ~30, poops ~15, minigames up to 150, coloring ~50, real-life care tasks up to 30);
     * daily food costs ~30-40; one-time items 60-1500 give goals for days or weeks.
     */

    public sealed class EconomyConfig
    {
        private static readonly object _syncLock = new object();
        private static EconomyConfig _current;

        public static EconomyConfig Current
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

        [JsonProperty("daily_gift")]
        public DailyGiftConfig DailyGift { get; set; } = new DailyGiftConfig();

        [JsonProperty("poop_clean")]
        public PoopCleanConfig PoopClean { get; set; } = new PoopCleanConfig();

        [JsonProperty("minigame")]
        public MinigameConfig Minigame { get; set; } = new MinigameConfig();

        [JsonProperty("coloring")]
        public ColoringConfig Coloring { get; set; } = new ColoringConfig();

        [JsonProperty("care_task")]
        public CareTaskConfig CareTask { get; set; } = new CareTaskConfig();

        [JsonProperty("starting_clovers")]
        public int StartingClovers { get; set; } = 30;

        public sealed class DailyGiftConfig
        {
            [JsonProperty("base")]
            public int Base { get; set; } = 10;
            [JsonProperty("per_streak_day")]
            public int PerStreakDay { get; set; } = 5;
            [JsonProperty("max")]
            public int Max { get; set; } = 50;
            [JsonProperty("streak_resets_after_missed_days")]
            public int StreakResetsAfterMissedDays { get; set; } = 1;
        }

        public sealed class PoopCleanConfig
        {
            [JsonProperty("clovers")]
            public int Clovers { get; set; } = 1;
        }

        public sealed class MinigameConfig
        {
            [JsonProperty("points_per_clover")]
            public int PointsPerClover { get; set; } = 10;
            [JsonProperty("max_per_game")]
            public int MaxPerGame { get; set; } = 40;
            [JsonProperty("rewarded_games_per_day")]
            public int RewardedGamesPerDay { get; set; } = 10;
            [JsonProperty("max_clovers_per_day")]
            public int MaxCloversPerDay { get; set; } = 150;
        }

        public sealed class ColoringConfig
        {
            [JsonProperty("cells_per_clover")]
            public int CellsPerClover { get; set; } = 40;
            [JsonProperty("min_per_picture")]
            public int MinPerPicture { get; set; } = 5;
            [JsonProperty("max_per_picture")]
            public int MaxPerPicture { get; set; } = 25;
            [JsonProperty("rewarded_pictures_per_day")]
            public int RewardedPicturesPerDay { get; set; } = 5;
        }

        public sealed class CareTaskConfig
        {
            [JsonProperty("clovers")]
            public int Clovers { get; set; } = 5;
            [JsonProperty("max_per_day")]
            public int MaxPerDay { get; set; } = 6;
        }

        public static EconomyConfig Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                throw new ArgumentNullException(nameof(json));

            var config = JsonConvert.DeserializeObject<EconomyConfig>(json);
            return config ?? new EconomyConfig();
        }

        public static EconomyConfig LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("economy.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static EconomyConfig LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "economy.json"),
                Path.Combine(baseDir, "economy.json"),
                Path.Combine(baseDir, "..", "assets", "data", "economy.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "economy.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "economy.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "economy.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "economy.json")
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
            var asm = typeof(EconomyConfig).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("economy.json", StringComparison.OrdinalIgnoreCase))
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
            ItemCatalog.ErrorLogger?.Invoke("EconomyConfig: economy.json not found, using hardcoded defaults.");
            return new EconomyConfig();
        }
    }
}
