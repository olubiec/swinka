using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class MinigameCampaignFeature : HomeFeatureBase
    {
        public override string Id => "minigameCampaigns";

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var campaigns = brain.Pet.State.MinigameCampaigns;
            var outDict = new Dictionary<string, object>();

            if (campaigns != null)
            {
                foreach (var kv in campaigns)
                {
                    if (kv.Value == null) continue;
                    outDict[kv.Key] = new Dictionary<string, object>
                    {
                        { "unlockedLevel", kv.Value.UnlockedLevel },
                        { "starsPerLevel", kv.Value.StarsPerLevel ?? new Dictionary<int, int>() },
                        { "bestScorePerLevel", kv.Value.BestScorePerLevel ?? new Dictionary<int, int>() },
                        { "checkpointLevel", kv.Value.CheckpointLevel },
                        { "checkpointJson", kv.Value.CheckpointJson }
                    };
                }
            }

            state[Id] = outDict;
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type == "minigame_level_complete")
            {
                string gameId = (string)message["gameId"];
                int level = (int?)message["level"] ?? 1;
                int stars = (int?)message["stars"] ?? 1;
                int score = (int?)message["score"] ?? 0;

                brain.Pet.RecordMinigameLevelComplete(gameId, level, stars, score, out int clovers, out _);
                if (clovers > 0)
                {
                    brain.RequestAnimation("popcorn");
                }
                brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();
                return true;
            }

            if (type == "minigame_checkpoint_save")
            {
                string gameId = (string)message["gameId"];
                int level = (int?)message["level"] ?? 1;
                string checkpointJson = (string)message["checkpointJson"];

                if (brain.Pet.SaveMinigameCheckpoint(gameId, level, checkpointJson))
                {
                    brain.Session.AutoSaver.SaveNow();
                    HomeWindow.NotifyStateChanged();
                }
                return true;
            }

            return false;
        }
    }
}
