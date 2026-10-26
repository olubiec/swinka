using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public class DailyFeature : HomeFeatureBase
    {
        public override string Id => "daily";

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var dailyInfo = brain.Pet.GetDailyGift();
            state[Id] = new
            {
                available = dailyInfo.Available,
                amount = dailyInfo.Amount,
                streak = dailyInfo.Streak
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (type == "daily_claim")
            {
                var dailyInfo = brain.Pet.GetDailyGift();
                if (dailyInfo.Available)
                {
                    int amount = brain.Pet.ClaimDailyGift();
                    brain.Session.AutoSaver.SaveNow();

                    brain.RequestAnimation("popcorn");

                    HomeWindow.PostToPage(new
                    {
                        type = "daily_claimed",
                        amount = amount,
                        streak = dailyInfo.Streak
                    });

                    HomeWindow.NotifyStateChanged();
                }
                return true;
            }

            return false;
        }
    }
}
