using System;
using System.IO;
using Cuy.Core.AI;
using Newtonsoft.Json.Linq;

namespace Cuy.Core
{
    public partial class Pet
    {
        private static int? _birthdayRewardClovers;

        private static int GetBirthdayRewardClovers()
        {
            if (_birthdayRewardClovers.HasValue) return _birthdayRewardClovers.Value;

            try
            {
                var brain = Brain.CreateDefault();
                if (brain?.Config?.Events != null && brain.Config.Events.TryGetValue("birthday", out var bdayToken))
                {
                    int reward = bdayToken.Value<int>("reward_clovers");
                    if (reward > 0)
                    {
                        _birthdayRewardClovers = reward;
                        return reward;
                    }
                }
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke("[Birthday] Error loading reward from actions.json: " + ex.Message);
            }

            _birthdayRewardClovers = 100;
            return 100;
        }

        private bool _cakeAddedThisCall = false;

        internal void GrantBirthday(int years, bool reward)
        {
            if (!Balance.BirthdayRewardsActive) return;

            if (reward)
            {
                int rewardClovers = GetBirthdayRewardClovers();
                AddClovers(rewardClovers);
                if (!_cakeAddedThisCall)
                {
                    AddItem("cake", 1);
                    _cakeAddedThisCall = true;
                }
                string yearStr = years == 1 ? "1 year" : $"{years} years";
                AddDiaryEntry($"Happy birthday to me! I am {yearStr} old today.");
                Count("birthdays");
            }
        }
    }
}
