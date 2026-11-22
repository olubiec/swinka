using System;
using Cuy.Core.Economy;
using Cuy.Core.Minigames;
using Xunit;

namespace Cuy.Core.Tests
{
    public class HayHopRewardTests
    {
        private static HayHopConfig LoadRealConfig()
        {
            return HayHopConfig.LoadFromFile(RepoFile.Find("assets/data/hayhop.json"));
        }

        private static EconomyConfig.MinigameConfig DefaultEconomy()
        {
            return new EconomyConfig.MinigameConfig
            {
                PointsPerClover = 10,
                MaxPerGame = 40,
                RewardedGamesPerDay = 10,
                MaxCloversPerDay = 150
            };
        }

        [Fact]
        public void ValidScoreAndDuration_ComputesRewardFromConfig()
        {
            var cfg = LoadRealConfig();
            var eco = DefaultEconomy();

            // 150 points in 15s (10 pts/s <= 25 pts/s) => 150 / 10 = 15 clovers
            var res = HayHopReward.Compute(150, 15000, dailyGamesCount: 0, dailyCloversToday: 0, cfg, eco);

            Assert.True(res.Rewarded);
            Assert.False(res.RejectedAsImpossible);
            Assert.Equal(15, res.Clovers);
            Assert.Equal(cfg.MoodRewarded, res.Mood);
        }

        [Fact]
        public void HighValidScore_CapsAtMaxCloversPerGame()
        {
            var cfg = LoadRealConfig();
            var eco = DefaultEconomy();

            // 600 points in 30s (20 pts/s <= 25 pts/s) => 60 raw, capped at 40
            var res = HayHopReward.Compute(600, 30000, dailyGamesCount: 0, dailyCloversToday: 0, cfg, eco);

            Assert.True(res.Rewarded);
            Assert.False(res.RejectedAsImpossible);
            Assert.Equal(cfg.MaxCloversPerGame, res.Clovers);
            Assert.Equal(cfg.MoodRewarded, res.Mood);
        }

        [Theory]
        [InlineData(500, 2000)]   // 250 pts/s > 25 pts/s
        [InlineData(100, 0)]      // zero duration
        [InlineData(100, 500)]    // below min_duration_ms (1000)
        [InlineData(100, 3600001)] // above max_duration_ms
        [InlineData(5001, 300000)] // above max_score (5000)
        public void ImpossibleOrOutOfBoundsScore_EarnsZeroAndRejected(int score, int durationMs)
        {
            var cfg = LoadRealConfig();
            var eco = DefaultEconomy();

            var res = HayHopReward.Compute(score, durationMs, dailyGamesCount: 0, dailyCloversToday: 0, cfg, eco);

            Assert.False(res.Rewarded);
            Assert.True(res.RejectedAsImpossible);
            Assert.Equal(0, res.Clovers);
            Assert.Equal(0.0, res.Mood);
        }

        [Theory]
        [InlineData(0, 10000)]
        [InlineData(-10, 5000)]
        [InlineData(50, -100)]
        public void NonPositiveScoreOrNegativeDuration_EarnsZero(int score, int durationMs)
        {
            var cfg = LoadRealConfig();
            var eco = DefaultEconomy();

            var res = HayHopReward.Compute(score, durationMs, dailyGamesCount: 0, dailyCloversToday: 0, cfg, eco);

            Assert.False(res.Rewarded);
            Assert.Equal(0, res.Clovers);
            Assert.Equal(0.0, res.Mood);
        }

        [Fact]
        public void DailyCapReached_EarnsZeroCloversAndUnrewardedMood()
        {
            var cfg = LoadRealConfig();
            var eco = DefaultEconomy();

            var byGames = HayHopReward.Compute(200, 20000, dailyGamesCount: 10, dailyCloversToday: 50, cfg, eco);
            Assert.False(byGames.Rewarded);
            Assert.False(byGames.RejectedAsImpossible);
            Assert.Equal(0, byGames.Clovers);
            Assert.Equal(cfg.MoodUnrewarded, byGames.Mood);

            var byClovers = HayHopReward.Compute(200, 20000, dailyGamesCount: 3, dailyCloversToday: 150, cfg, eco);
            Assert.False(byClovers.Rewarded);
            Assert.False(byClovers.RejectedAsImpossible);
            Assert.Equal(0, byClovers.Clovers);
            Assert.Equal(cfg.MoodUnrewarded, byClovers.Mood);
        }

        [Fact]
        public void NearDailyCloverCap_ClampsToRemainingAllowance()
        {
            var cfg = LoadRealConfig();
            var eco = DefaultEconomy();

            var res = HayHopReward.Compute(200, 20000, dailyGamesCount: 5, dailyCloversToday: 145, cfg, eco);

            Assert.True(res.Rewarded);
            Assert.False(res.RejectedAsImpossible);
            Assert.Equal(5, res.Clovers);
            Assert.Equal(cfg.MoodRewarded, res.Mood);
        }

        [Fact]
        public void ChangingJsonConfig_ChangesComputedReward()
        {
            var eco = DefaultEconomy();
            var baseCfg = HayHopConfig.Load(@"{
                ""game_id"": ""hay_hop"",
                ""points_per_clover"": 10,
                ""max_clovers_per_game"": 40,
                ""max_score"": 5000,
                ""min_duration_ms"": 1000,
                ""max_duration_ms"": 3600000,
                ""max_points_per_second"": 25,
                ""mood_rewarded"": 15.0,
                ""mood_unrewarded"": 3.0
            }");

            var tunedCfg = HayHopConfig.Load(@"{
                ""game_id"": ""hay_hop"",
                ""points_per_clover"": 5,
                ""max_clovers_per_game"": 50,
                ""max_score"": 5000,
                ""min_duration_ms"": 1000,
                ""max_duration_ms"": 3600000,
                ""max_points_per_second"": 25,
                ""mood_rewarded"": 15.0,
                ""mood_unrewarded"": 3.0
            }");

            var r1 = HayHopReward.Compute(100, 10000, 0, 0, baseCfg, eco);
            var r2 = HayHopReward.Compute(100, 10000, 0, 0, tunedCfg, eco);

            Assert.Equal(10, r1.Clovers);
            Assert.Equal(20, r2.Clovers);
            Assert.NotEqual(r1.Clovers, r2.Clovers);
        }
    }
}
