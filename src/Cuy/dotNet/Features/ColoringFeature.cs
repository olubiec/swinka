using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using Cuy.Core;
using Cuy.Core.Economy;

namespace Cuy.Features
{
    public class ColoringFeature : HomeFeatureBase
    {
        public override string Id => "coloring";

        private Dictionary<string, int> _packPrices = new Dictionary<string, int>();

        public override void Initialize(BrainController brain)
        {
            LoadPackPrices();
        }

        private void LoadPackPrices()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
                string[] candidatePaths = new[]
                {
                    Path.Combine(baseDir, "assets", "coloring", "index.json"),
                    Path.Combine(baseDir, "..", "assets", "coloring", "index.json"),
                    Path.Combine(baseDir, "..", "..", "assets", "coloring", "index.json"),
                    Path.Combine(baseDir, "..", "..", "..", "assets", "coloring", "index.json"),
                    Path.Combine(baseDir, "..", "..", "..", "..", "assets", "coloring", "index.json"),
                    Path.Combine(Directory.GetCurrentDirectory(), "assets", "coloring", "index.json")
                };

                string foundPath = candidatePaths.FirstOrDefault(File.Exists);

                if (foundPath != null)
                {
                    string json = File.ReadAllText(foundPath);
                    var root = JObject.Parse(json);
                    var packsArr = root["packs"] as JArray;
                    if (packsArr != null)
                    {
                        foreach (var tok in packsArr)
                        {
                            string id = (string)tok["id"];
                            int price = (int?)tok["price"] ?? 0;
                            if (!string.IsNullOrEmpty(id))
                            {
                                _packPrices[id] = price;
                            }
                        }
                    }
                }
                else
                {
                    BrainController.Log("[WARN] ColoringFeature: assets/coloring/index.json not found.");
                }
            }
            catch (Exception ex)
            {
                BrainController.Log("[ERROR] ColoringFeature load index error: " + ex.Message);
            }
        }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var coloring = brain.Pet.State.Coloring;
            var economyState = brain.Pet.State.Economy;

            var lastReward = new Dictionary<string, object>
            {
                { "pictureId", coloring.LastRewardPictureId },
                { "clovers", coloring.LastRewardClovers }
            };

            state[Id] = new Dictionary<string, object>
            {
                { "completed", coloring.Completed },
                { "unlockedPacks", coloring.UnlockedPacks },
                { "rewardedToday", economyState.ColoringRewardedToday },
                { "maxRewardedPerDay", EconomyConfig.Current.Coloring.RewardedPicturesPerDay },
                { "lastReward", lastReward }
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type == "coloring_load")
            {
                string pictureId = (string)message["pictureId"];
                string painted = brain.Pet.GetColoringProgress(pictureId);
                HomeWindow.PostToPage(new { type = "coloring_progress", pictureId = pictureId, painted = painted });
                return true;
            }
            else if (type == "coloring_save")
            {
                string pictureId = (string)message["pictureId"];
                string painted = (string)message["painted"];
                brain.Pet.SaveColoringProgress(pictureId, painted);
                brain.Session.AutoSaver.SaveNow();
                return true;
            }
            else if (type == "coloring_done")
            {
                string pictureId = (string)message["pictureId"];
                int cells = (int?)message["cells"] ?? 0;

                string savedProgress = brain.Pet.GetColoringProgress(pictureId);
                string messagePainted = (string)message["painted"];
                string progressToCheck = savedProgress ?? messagePainted;

                int paintedOnes = 0;
                if (!string.IsNullOrEmpty(progressToCheck))
                {
                    paintedOnes = progressToCheck.Count(c => c == '1');
                }

                int clovers = brain.Pet.CompleteColoring(pictureId, cells, paintedOnes);
                if (clovers > 0)
                {
                    brain.RequestAnimation("popcorn");
                    HomeWindow.PostToPage(new { type = "toast", text = $"+{clovers} clovers!" });
                }

                brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();
                return true;
            }
            else if (type == "coloring_unlock")
            {
                string packId = (string)message["packId"];
                if (string.IsNullOrEmpty(packId) || !_packPrices.ContainsKey(packId))
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Unknown pack" });
                    return true;
                }

                int price = _packPrices[packId];
                if (!brain.Pet.UnlockColoringPack(packId, price))
                {
                    HomeWindow.PostToPage(new { type = "toast", text = "Not enough clovers" });
                }

                brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();
                return true;
            }

            return false;
        }
    }
}
