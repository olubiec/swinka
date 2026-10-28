using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class ProgressFeature : HomeFeatureBase
    {
        public override string Id { get { return "progress"; } }

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Session?.Pet;
            if (pet == null) return;

            // diary: the last 60 entries of pet.State.Diary, newest first
            var diaryList = new List<object>();
            if (pet.State?.Diary != null)
            {
                var recentEntries = pet.State.Diary
                    .OrderByDescending(e => e.DateUtc)
                    .Take(60);

                foreach (var entry in recentEntries)
                {
                    diaryList.Add(new
                    {
                        date = entry.DateUtc.ToLocalTime().ToString("yyyy-MM-dd"),
                        text = entry.Text ?? string.Empty
                    });
                }
            }
            state["diary"] = diaryList;

            // albumDates: map from animation key to "yyyy-MM-dd"
            var albumDates = new Dictionary<string, string>();
            if (pet.State?.Album != null)
            {
                foreach (var kvp in pet.State.Album)
                {
                    albumDates[kvp.Key] = kvp.Value.ToLocalTime().ToString("yyyy-MM-dd");
                }
            }
            state["albumDates"] = albumDates;

            // bondNext: pet.NextUnlock() info
            object bondNextInfo = null;
            if (pet.State?.Bond != null && pet.Balance != null)
            {
                var nextUnlock = pet.NextUnlock();
                if (nextUnlock != null)
                {
                    int pointsToNext = Math.Max(0, pet.Balance.BondPointsForLevel(nextUnlock.Level) - pet.State.Bond.Points);
                    bondNextInfo = new
                    {
                        level = nextUnlock.Level,
                        id = nextUnlock.Id,
                        title = nextUnlock.Title,
                        pointsToNext = pointsToNext
                    };
                }
            }
            state["bondNext"] = bondNextInfo;

            // hayRack: pet.State.HayRack and pet.HayTable.Max
            if (pet.State != null && pet.HayTable != null)
            {
                state["hayRack"] = new
                {
                    value = (int)Math.Round(pet.State.HayRack),
                    max = pet.HayTable.Max
                };
            }
            else
            {
                state["hayRack"] = new { value = 60, max = 100 };
            }
        }

        public override bool HandleMessage(string type, JObject payload, BrainController brain)
        {
            return false;
        }
    }
}
