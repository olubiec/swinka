using System;
using System.Collections.Generic;

namespace Cuy.Core.Achievements
{
    public static class AchievementEvaluator
    {
        public static List<AchievementDef> Check(
            AchievementCatalog catalog,
            GameState state,
            int stageIndex,
            int minigamesToday,
            Func<string, int> getCounter)
        {
            var earned = new List<AchievementDef>();
            if (catalog == null || state == null) return earned;

            foreach (var def in catalog.All)
            {
                if (state.IsAchievementEarned(def.Id)) continue;
                if (def.Rule == null) continue;

                bool satisfied = false;
                switch (def.Rule.Kind?.ToLowerInvariant())
                {
                    case "counter":
                        int count = getCounter != null ? getCounter(def.Rule.Name) : 0;
                        if (count >= def.Rule.AtLeast) satisfied = true;
                        break;

                    case "stage":
                        if (stageIndex >= def.Rule.AtLeast) satisfied = true;
                        break;

                    case "birthdays":
                        if (state.BirthdaysCelebrated >= def.Rule.AtLeast) satisfied = true;
                        break;

                    case "bond_level":
                        int bondLvl = state.Bond != null ? state.Bond.Level : 0;
                        if (bondLvl >= def.Rule.AtLeast) satisfied = true;
                        break;

                    case "diary_entries":
                        int diaryCount = state.Diary != null ? state.Diary.Count : 0;
                        if (diaryCount >= def.Rule.AtLeast) satisfied = true;
                        break;

                    case "minigames_today":
                        if (minigamesToday >= def.Rule.AtLeast) satisfied = true;
                        break;

                    default:
                        // Unknown rules ignored
                        break;
                }

                if (satisfied)
                {
                    earned.Add(def);
                }
            }

            return earned;
        }
    }
}
