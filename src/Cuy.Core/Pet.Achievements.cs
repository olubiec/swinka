using System;
using System.Collections.Generic;
using Cuy.Core.Achievements;

namespace Cuy.Core
{
    public class AchievementEarnedEventArgs : EventArgs
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public int Reward { get; set; }

        public AchievementEarnedEventArgs(string id, string title, int reward)
        {
            Id = id;
            Title = title;
            Reward = reward;
        }
    }

    public class AchievementInfo
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Text { get; set; }
        public string Category { get; set; }
        public int Reward { get; set; }
        public bool Earned { get; set; }
        public DateTime? Date { get; set; }
        public bool Hidden { get; set; }
    }

    public partial class Pet
    {
        public AchievementCatalog AchievementsTable { get; set; }

        public event EventHandler<AchievementEarnedEventArgs> AchievementEarned;

        public IReadOnlyList<AchievementInfo> CheckAchievements()
        {
            var catalog = AchievementsTable ?? AchievementCatalog.Current;
            int stageIndex = (int)Stage;
            int minigamesToday = State.MinigamesDailyCount;

            var newlyEarned = AchievementEvaluator.Check(
                catalog,
                State,
                stageIndex,
                minigamesToday,
                name =>
                {
                    int val = 0;
                    State.Stats?.Counters?.TryGetValue(name, out val);
                    return val;
                }
            );

            var result = new List<AchievementInfo>();
            DateTime now = Clock.UtcNow;

            foreach (var def in newlyEarned)
            {
                State.RecordAchievement(def.Id, now);
                AddClovers(def.Reward);
                AddDiaryEntry($"Achievement: {def.Title}");
                Count("achievements_earned");

                var info = new AchievementInfo
                {
                    Id = def.Id,
                    Title = def.Title,
                    Text = def.Text,
                    Category = def.Category,
                    Reward = def.Reward,
                    Earned = true,
                    Date = now,
                    Hidden = def.Hidden
                };
                result.Add(info);

                try
                {
                    AchievementEarned?.Invoke(this, new AchievementEarnedEventArgs(def.Id, def.Title, def.Reward));
                }
                catch (Exception ex)
                {
                    ItemCatalog.ErrorLogger?.Invoke($"[Achievement] Event error: {ex.Message}");
                }
            }

            return result;
        }

        public IReadOnlyList<AchievementInfo> GetAchievements()
        {
            var catalog = AchievementsTable ?? AchievementCatalog.Current;
            var list = new List<AchievementInfo>();

            foreach (var def in catalog.All)
            {
                bool earned = State.IsAchievementEarned(def.Id);
                DateTime? date = null;
                if (earned && State.EarnedAchievements.TryGetValue(def.Id, out var dt))
                {
                    date = dt;
                }

                list.Add(new AchievementInfo
                {
                    Id = def.Id,
                    Title = def.Title,
                    Text = def.Text,
                    Category = def.Category,
                    Reward = def.Reward,
                    Earned = earned,
                    Date = date,
                    Hidden = def.Hidden && !earned
                });
            }

            return list;
        }
    }
}
