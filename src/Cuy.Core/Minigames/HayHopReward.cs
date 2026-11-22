using System;
using System.IO;
using System.Reflection;
using Cuy.Core.Economy;
using Newtonsoft.Json;

namespace Cuy.Core.Minigames
{
    public sealed class HayHopConfig
    {
        private static readonly object _syncLock = new object();
        private static HayHopConfig _current;

        public static HayHopConfig Current
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

        [JsonProperty("game_id")]
        public string GameId { get; set; } = "hay_hop";

        [JsonProperty("points_per_clover")]
        public int PointsPerClover { get; set; } = 10;

        [JsonProperty("max_clovers_per_game")]
        public int MaxCloversPerGame { get; set; } = 40;

        [JsonProperty("max_score")]
        public int MaxScore { get; set; } = 5000;

        [JsonProperty("min_duration_ms")]
        public int MinDurationMs { get; set; } = 1000;

        [JsonProperty("max_duration_ms")]
        public int MaxDurationMs { get; set; } = 3600000;

        [JsonProperty("max_points_per_second")]
        public int MaxPointsPerSecond { get; set; } = 25;

        [JsonProperty("mood_rewarded")]
        public double MoodRewarded { get; set; } = 15.0;

        [JsonProperty("mood_unrewarded")]
        public double MoodUnrewarded { get; set; } = 3.0;

        public static HayHopConfig Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                throw new ArgumentNullException(nameof(json));

            var config = JsonConvert.DeserializeObject<HayHopConfig>(json);
            return config ?? new HayHopConfig();
        }

        public static HayHopConfig LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("hayhop.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static HayHopConfig LoadDefault()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "hayhop.json"),
                Path.Combine(baseDir, "hayhop.json"),
                Path.Combine(baseDir, "..", "assets", "data", "hayhop.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "hayhop.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "hayhop.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "hayhop.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "hayhop.json")
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

            var asm = typeof(HayHopConfig).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("hayhop.json", StringComparison.OrdinalIgnoreCase))
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

            ItemCatalog.ErrorLogger?.Invoke("HayHopConfig: hayhop.json not found, using hardcoded defaults.");
            return new HayHopConfig();
        }
    }

    public sealed class HayHopRewardResult
    {
        public int Clovers { get; }
        public double Mood { get; }
        public bool Rewarded { get; }
        public bool RejectedAsImpossible { get; }

        public HayHopRewardResult(int clovers, double mood, bool rewarded, bool rejectedAsImpossible)
        {
            Clovers = clovers;
            Mood = mood;
            Rewarded = rewarded;
            RejectedAsImpossible = rejectedAsImpossible;
        }
    }

    public static class HayHopReward
    {
        public static HayHopRewardResult Compute(
            int score,
            int durationMs,
            int dailyGamesCount,
            int dailyCloversToday,
            HayHopConfig config,
            EconomyConfig.MinigameConfig economy,
            double scoreMultiplier = 1.0)
        {
            config = config ?? HayHopConfig.Current;
            economy = economy ?? EconomyConfig.Current.Minigame;

            if (score <= 0 ||
                durationMs < config.MinDurationMs ||
                durationMs > config.MaxDurationMs ||
                score > config.MaxScore)
            {
                return new HayHopRewardResult(0, 0.0, false, score > 0);
            }

            int maxPlausible = (int)Math.Ceiling((durationMs / 1000.0) * config.MaxPointsPerSecond);
            if (score > maxPlausible)
            {
                return new HayHopRewardResult(0, 0.0, false, true);
            }

            if (dailyGamesCount >= economy.RewardedGamesPerDay ||
                dailyCloversToday >= economy.MaxCloversPerDay)
            {
                return new HayHopRewardResult(0, config.MoodUnrewarded, false, false);
            }

            int eff = (int)Math.Round(score * scoreMultiplier, MidpointRounding.AwayFromZero);
            int pointsPerClover = Math.Max(1, config.PointsPerClover);
            int raw = Math.Min(config.MaxCloversPerGame, Math.Max(0, eff / pointsPerClover));
            int remaining = Math.Max(0, economy.MaxCloversPerDay - Math.Max(0, dailyCloversToday));
            int clovers = Math.Min(raw, remaining);

            return new HayHopRewardResult(clovers, config.MoodRewarded, true, false);
        }
    }
}
