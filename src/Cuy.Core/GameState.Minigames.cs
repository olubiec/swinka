using System.Collections.Generic;

namespace Cuy.Core
{
    public sealed class MinigameCampaignState
    {
        public int UnlockedLevel { get; set; } = 1;
        public Dictionary<int, int> StarsPerLevel { get; set; } = new Dictionary<int, int>();
        public Dictionary<int, int> BestScorePerLevel { get; set; } = new Dictionary<int, int>();
        public int CheckpointLevel { get; set; }
        public string CheckpointJson { get; set; }
    }

    public partial class GameState
    {
        private Dictionary<string, int> _minigamePlays;
        private Dictionary<string, MinigameCampaignState> _minigameCampaigns;

        public Dictionary<string, int> MinigamePlays
        {
            get
            {
                if (_minigamePlays == null) _minigamePlays = new Dictionary<string, int>();
                return _minigamePlays;
            }
            set => _minigamePlays = value;
        }

        public Dictionary<string, MinigameCampaignState> MinigameCampaigns
        {
            get
            {
                if (_minigameCampaigns == null) _minigameCampaigns = new Dictionary<string, MinigameCampaignState>();
                return _minigameCampaigns;
            }
            set => _minigameCampaigns = value;
        }
    }
}
