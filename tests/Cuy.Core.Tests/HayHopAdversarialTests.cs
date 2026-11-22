using System;
using Cuy.Core.Economy;
using Cuy.Core.Input;
using Cuy.Core.Input.Validation;
using Cuy.Core.Minigames;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class HayHopAdversarialTests
    {
        private static HayHopConfig LoadHopConfig()
        {
            return HayHopConfig.LoadFromFile(RepoFile.Find("assets/data/hayhop.json"));
        }

        private static EconomyConfig.MinigameConfig LoadMinigameEconomy()
        {
            return EconomyConfig.LoadFromFile(RepoFile.Find("assets/data/economy.json")).Minigame;
        }

        [Fact]
        public void HOP_forged_score_zero_reward()
        {
            var cfg = LoadHopConfig();
            var econ = LoadMinigameEconomy();

            var res = HayHopReward.Compute(
                score: 500,
                durationMs: 2000,
                dailyGamesCount: 0,
                dailyCloversToday: 0,
                config: cfg,
                economy: econ);

            Assert.Equal(0, res.Clovers);
            Assert.Equal(0.0, res.Mood);
            Assert.True(res.RejectedAsImpossible);
            Assert.False(res.Rewarded);
        }

        [Fact]
        public void HOP_zero_time()
        {
            var cfg = LoadHopConfig();
            var econ = LoadMinigameEconomy();

            var res = HayHopReward.Compute(
                score: 100,
                durationMs: 0,
                dailyGamesCount: 0,
                dailyCloversToday: 0,
                config: cfg,
                economy: econ);

            Assert.Equal(0, res.Clovers);
            Assert.False(res.Rewarded);
        }

        [Fact]
        public void HOP_daily_cap()
        {
            var cfg = LoadHopConfig();
            var econ = LoadMinigameEconomy();

            var atGameCap = HayHopReward.Compute(
                score: 200,
                durationMs: 10000,
                dailyGamesCount: 10,
                dailyCloversToday: 0,
                config: cfg,
                economy: econ);

            Assert.Equal(0, atGameCap.Clovers);
            Assert.False(atGameCap.Rewarded);

            var atCloverCap = HayHopReward.Compute(
                score: 200,
                durationMs: 10000,
                dailyGamesCount: 1,
                dailyCloversToday: 150,
                config: cfg,
                economy: econ);

            Assert.Equal(0, atCloverCap.Clovers);
            Assert.False(atCloverCap.Rewarded);

            var nearCloverCap = HayHopReward.Compute(
                score: 200,
                durationMs: 10000,
                dailyGamesCount: 1,
                dailyCloversToday: 145,
                config: cfg,
                economy: econ);

            Assert.Equal(5, nearCloverCap.Clovers);
            Assert.True(nearCloverCap.Rewarded);
        }

        [Fact]
        public void HOP_negative_and_nan()
        {
            var cfg = LoadHopConfig();
            var econ = LoadMinigameEconomy();

            Assert.False(string.IsNullOrEmpty(HayHopMessages.ValidateResultPayload(null)));
            Assert.False(string.IsNullOrEmpty(HayHopMessages.ValidateResultPayload(new JObject())));
            Assert.False(string.IsNullOrEmpty(HayHopMessages.ValidateResultPayload(new JObject
            {
                ["score"] = -1,
                ["durationMs"] = 5000
            })));
            Assert.False(string.IsNullOrEmpty(HayHopMessages.ValidateResultPayload(new JObject
            {
                ["score"] = 10,
                ["durationMs"] = -5
            })));
            Assert.False(string.IsNullOrEmpty(HayHopMessages.ValidateResultPayload(new JObject
            {
                ["score"] = double.NaN,
                ["durationMs"] = 5000
            })));
            Assert.False(string.IsNullOrEmpty(HayHopMessages.ValidateResultPayload(new JObject
            {
                ["score"] = 12.5,
                ["durationMs"] = 5000
            })));
            Assert.False(string.IsNullOrEmpty(HayHopMessages.ValidateResultPayload(new JObject
            {
                ["score"] = 10
            })));

            var reward = HayHopReward.Compute(
                score: -10,
                durationMs: 5000,
                dailyGamesCount: 0,
                dailyCloversToday: 0,
                config: cfg,
                economy: econ);

            Assert.Equal(0, reward.Clovers);
            Assert.False(reward.Rewarded);
        }

        [Fact]
        public void HOP_message_fuzz_300()
        {
            var rng = new Random(12345);

            for (int i = 0; i < 300; i++)
            {
                var obj = new JObject();
                if (rng.Next(4) != 0)
                {
                    obj["type"] = rng.Next(2) == 0 ? "minigame.hay_hop.result" : $"fuzz_{rng.Next(5)}";
                }

                switch (rng.Next(6))
                {
                    case 0: obj["score"] = rng.Next(-1000, 10000); break;
                    case 1: obj["score"] = rng.NextDouble() * 1000 - 500; break;
                    case 2: obj["score"] = double.NaN; break;
                    case 3: obj["score"] = "bad_string"; break;
                    case 4: obj["score"] = JValue.CreateNull(); break;
                    case 5: break; // missing
                }

                switch (rng.Next(5))
                {
                    case 0: obj["durationMs"] = rng.Next(-500, 4000000); break;
                    case 1: obj["durationMs"] = rng.NextDouble() * 10000; break;
                    case 2: obj["durationMs"] = true; break;
                    case 3: obj["durationMs"] = JValue.CreateNull(); break;
                    case 4: break; // missing
                }

                if (rng.Next(3) == 0)
                {
                    obj["seed"] = new string('x', rng.Next(0, 64));
                }
                else if (rng.Next(4) == 0)
                {
                    obj["seed"] = rng.Next(0, 100);
                }

                // Must never throw unhandled exceptions
                _ = HayHopMessages.ValidateResultPayload(obj);
                _ = MessageValidator.Validate(obj);
            }
        }
    }
}
