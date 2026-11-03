using System;
using Cuy.Core.Pigs;

namespace Cuy.Core
{
    public sealed partial class Pet
    {
        private PigProfile LeadPig()
        {
            if (State?.ActivePigIds == null || State.Roster == null)
            {
                return null;
            }

            for (int i = 0; i < State.ActivePigIds.Count; i++)
            {
                var id = State.ActivePigIds[i];
                if (string.IsNullOrEmpty(id)) continue;
                for (int j = 0; j < State.Roster.Count; j++)
                {
                    if (State.Roster[j]?.Id == id)
                    {
                        return State.Roster[j];
                    }
                }
            }

            return null;
        }

        private DateTime? LeadBirthUtc()
        {
            return LeadPig()?.BornAtUtc;
        }

        private PigAge ComputeCurrentAge()
        {
            if (Balance.PerPigAgeActive)
            {
                var lead = LeadPig();
                if (lead != null)
                {
                    return PigLife.AgeOf(lead, Clock.UtcNow, Balance.PigDaysPerRealDay, State.BirthDateUtc);
                }
            }

            return PigAge.FromBirth(State.BirthDateUtc, Clock.UtcNow, Balance.PigDaysPerRealDay);
        }

        private LifeStage ComputeCurrentStage()
        {
            if (!Balance.GrowthActive)
            {
                return LifeStage.Baby;
            }

            if (Balance.PerPigAgeActive)
            {
                var lead = LeadPig();
                if (lead != null)
                {
                    return PigLife.StageOf(lead, Clock.UtcNow, Balance.PigDaysPerRealDay, State.BirthDateUtc);
                }
            }

            return Age.Stage;
        }
    }
}
