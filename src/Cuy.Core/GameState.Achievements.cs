using System;
using System.Collections.Generic;

namespace Cuy.Core
{
    public partial class GameState
    {
        public Dictionary<string, DateTime> EarnedAchievements { get; set; } = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);

        public bool IsAchievementEarned(string id)
        {
            if (string.IsNullOrEmpty(id) || EarnedAchievements == null) return false;
            return EarnedAchievements.ContainsKey(id);
        }

        public void RecordAchievement(string id, DateTime utcDate)
        {
            if (string.IsNullOrEmpty(id)) return;
            if (EarnedAchievements == null) EarnedAchievements = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);
            if (!EarnedAchievements.ContainsKey(id))
            {
                EarnedAchievements[id] = utcDate;
            }
        }
    }
}
