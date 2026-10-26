using System.Collections.Generic;

namespace Cuy.Core.Coloring
{
    public sealed class ColoringState
    {
        public Dictionary<string, string> Progress { get; set; } = new Dictionary<string, string>();
        public List<string> Completed { get; set; } = new List<string>();
        public List<string> UnlockedPacks { get; set; } = new List<string> { "guinea_pigs", "food_and_toys" };
        public string LastRewardPictureId { get; set; }
        public int LastRewardClovers { get; set; }
    }
}
