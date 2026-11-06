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

        /// <summary>Admin/test command: sets the lead pig's age (and the pet's birth date) to the given pig days.</summary>
        public void AdminSetAgePigDays(double pigDays)
        {
            double perDay = Balance.PigDaysPerRealDay > 0 ? Balance.PigDaysPerRealDay : 21.0;
            DateTime birth = Clock.UtcNow.AddDays(-Math.Max(0, pigDays) / perDay);
            State.BirthDateUtc = birth;
            var lead = LeadPig();
            if (lead != null) lead.BornAtUtc = birth;
        }

        /// <summary>Admin/test command: jumps to the start of a life stage ("baby", "junior", "adult", "senior", "legend").</summary>
        public bool AdminSetStage(string stage)
        {
            double days;
            switch ((stage ?? "").ToLowerInvariant())
            {
                case "baby": days = 0; break;
                case "junior": days = LifeStages.JuniorFromPigDays + 0.5; break;
                case "adult": days = LifeStages.AdultFromPigDays + 0.5; break;
                case "senior": days = LifeStages.SeniorFromPigDays + 0.5; break;
                case "legend": days = LifeStages.LegendFromPigDays + 0.5; break;
                default: return false;
            }
            AdminSetAgePigDays(days);
            return true;
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
