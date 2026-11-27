using System;
using System.Collections.Generic;

namespace Cuy.Core
{
    public class MinigameResult
    {
        public string GameId { get; set; }
        public int Score { get; set; }
        public int Clovers { get; set; }
        public double Mood { get; set; }
        public bool IsNewRecord { get; set; }
        public bool Rewarded { get; set; }
    }

    public partial class Pet
    {
        public MinigameResult LastMinigameResult { get; private set; }

        public MinigameCampaignState GetOrCreateCampaign(string gameId)
        {
            if (string.IsNullOrWhiteSpace(gameId)) return null;
            if (!State.MinigameCampaigns.TryGetValue(gameId, out var camp) || camp == null)
            {
                camp = new MinigameCampaignState { UnlockedLevel = 1 };
                State.MinigameCampaigns[gameId] = camp;
            }
            if (camp.UnlockedLevel < 1) camp.UnlockedLevel = 1;
            if (camp.StarsPerLevel == null) camp.StarsPerLevel = new Dictionary<int, int>();
            if (camp.BestScorePerLevel == null) camp.BestScorePerLevel = new Dictionary<int, int>();
            return camp;
        }

        public bool RecordMinigameLevelComplete(string gameId, int level, int stars, int score, out int cloversAwarded, out bool isNewRecord)
        {
            cloversAwarded = 0;
            isNewRecord = false;
            if (string.IsNullOrWhiteSpace(gameId) || level < 1) return false;

            int clampedStars = Math.Max(1, Math.Min(3, stars));
            int clampedScore = Math.Max(0, score);

            var camp = GetOrCreateCampaign(gameId);
            int prevStars = camp.StarsPerLevel.TryGetValue(level, out var s) ? s : 0;
            if (clampedStars > prevStars)
            {
                camp.StarsPerLevel[level] = clampedStars;
            }

            if (level >= camp.UnlockedLevel)
            {
                camp.UnlockedLevel = level + 1;
            }

            int prevBest = camp.BestScorePerLevel.TryGetValue(level, out var b) ? b : 0;
            if (clampedScore > prevBest)
            {
                camp.BestScorePerLevel[level] = clampedScore;
            }

            if (camp.CheckpointLevel == level)
            {
                camp.CheckpointLevel = 0;
                camp.CheckpointJson = null;
            }

            // Aggregate total campaign score for high-score tracking
            int totalCampaignScore = 0;
            foreach (var kv in camp.BestScorePerLevel)
            {
                totalCampaignScore += kv.Value;
            }

            bool result = RecordMinigameResult(gameId, Math.Max(clampedScore, totalCampaignScore), out cloversAwarded, out isNewRecord);
            return result;
        }

        public bool SaveMinigameCheckpoint(string gameId, int level, string checkpointJson)
        {
            if (string.IsNullOrWhiteSpace(gameId) || level < 1) return false;
            if (checkpointJson != null && checkpointJson.Length > 8192) return false;

            var camp = GetOrCreateCampaign(gameId);
            camp.CheckpointLevel = level;
            camp.CheckpointJson = checkpointJson;
            return true;
        }

        public void ClearMinigameCheckpoint(string gameId)
        {
            if (string.IsNullOrWhiteSpace(gameId)) return;
            if (State.MinigameCampaigns.TryGetValue(gameId, out var camp) && camp != null)
            {
                camp.CheckpointLevel = 0;
                camp.CheckpointJson = null;
            }
        }
    }
}
