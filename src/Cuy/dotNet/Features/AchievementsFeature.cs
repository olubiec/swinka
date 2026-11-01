using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class AchievementsFeature : HomeFeatureBase
    {
        private DateTime _lastCheckTime = DateTime.MinValue;

        public override string Id => "achievements";

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Session?.Pet;
            if (pet == null) return;

            state["achievements"] = pet.GetAchievements().Select(a => new
            {
                id = a.Id,
                title = a.Title,
                text = a.Text,
                category = a.Category,
                reward = a.Reward,
                earned = a.Earned,
                date = a.Date.HasValue ? a.Date.Value.ToLocalTime().ToString("yyyy-MM-dd") : null,
                hidden = a.Hidden
            }).ToList();
        }

        public override void Tick(TimeSpan gameElapsed, BrainController brain)
        {
            var pet = brain?.Session?.Pet;
            if (pet == null) return;

            var now = DateTime.UtcNow;
            if ((now - _lastCheckTime).TotalSeconds < 5.0) return;
            _lastCheckTime = now;

            var newlyEarned = pet.CheckAchievements();
            if (newlyEarned != null && newlyEarned.Count > 0)
            {
                foreach (var ach in newlyEarned)
                {
                    BrainController.Log($"[Achievement] {ach.Id} +{ach.Reward}");
                    var petForm = FormPet.ActivePet ?? (FormPet.AllPets.Count > 0 ? FormPet.AllPets[0] : null);
                    petForm?.ShowStatusMessage($"Achievement: {ach.Title} +{ach.Reward} clovers", 4500);

                    if (HomeWindow.IsOpen)
                    {
                        HomeWindow.PostToPage(new { type = "toast", text = $"Achievement: {ach.Title} +{ach.Reward} clovers" });
                    }
                }

                brain.Session?.AutoSaver?.SaveNow();
            }
        }
    }
}
