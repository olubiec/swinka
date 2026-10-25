using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Cuy.Core.Health;
using Cuy.Core.Time;

namespace Cuy.Core
{
    public sealed partial class Pet
    {
        private HealthSystem _healthSystem;

        public HealthSystem HealthSystem
        {
            get
            {
                if (_healthSystem == null)
                {
                    _healthSystem = new HealthSystem();
                }
                return _healthSystem;
            }
        }

        public void TickHealth(TimeSpan elapsed)
        {
            HealthSystem.Tick(this, elapsed, null);
        }

        public void RecordTreat(string itemId)
        {
            if (itemId == "carrot" || itemId == "strawberry")
            {
                var localDate = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                if (State.Health.TreatsLocalDate != localDate)
                {
                    State.Health.TreatsLocalDate = localDate;
                    State.Health.SweetTreatsToday = 0;
                }
                State.Health.SweetTreatsToday++;
            }
        }

        public List<ActiveCondition> Checkup()
        {
            foreach (var active in State.Health.Active)
            {
                active.Known = true;
            }
            State.Health.LastCheckupUtc = Clock.UtcNow;
            return State.Health.Active.ToList();
        }

        public bool Treat(string conditionId)
        {
            var active = State.Health.Active.FirstOrDefault(a => a.Id == conditionId);
            if (active != null && !active.Treated)
            {
                active.Treated = true;
                var def = HealthSystem.GetCondition(conditionId);
                active.CourseDaysLeft = def?.Treatment?.CourseDays ?? 0;

                // Set LastDoseLocalDate to yesterday to allow give dose immediately
                active.LastDoseLocalDate = Clock.LocalNow().AddDays(-1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                // Give first dose today
                GiveDose(conditionId);
                return true;
            }
            return false;
        }

        public void GiveDose(string conditionId)
        {
            var active = State.Health.Active.FirstOrDefault(a => a.Id == conditionId);
            if (active != null && active.Treated)
            {
                var localDate = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                if (active.LastDoseLocalDate != localDate)
                {
                    active.LastDoseLocalDate = localDate;
                    if (active.CourseDaysLeft > 0)
                    {
                        active.CourseDaysLeft--;
                        var def = HealthSystem.GetCondition(conditionId);
                        int totalCourseDays = def?.Treatment?.CourseDays ?? 0;
                        if (totalCourseDays > 0)
                        {
                            active.Severity -= 1.0 / (totalCourseDays + 1);
                            if (active.Severity < 0) active.Severity = 0;
                        }
                    }
                }
            }
        }

        public bool IsSick => State.Health.Active.Count > 0;

        public bool RefusesTreats => State.Health.Active.Any(a => HealthSystem.GetCondition(a.Id)?.RefusesTreats == true);

        public bool SlowWalk => State.Health.Active.Any(a => HealthSystem.GetCondition(a.Id)?.SlowWalk == true);

        public double ScratchingFactor
        {
            get
            {
                double maxScratch = 0;
                foreach (var a in State.Health.Active)
                {
                    var def = HealthSystem.GetCondition(a.Id);
                    if (def != null && def.Scratching > maxScratch)
                    {
                        maxScratch = def.Scratching;
                    }
                }
                return maxScratch;
            }
        }

        public string SicknessAnimation
        {
            get
            {
                string anim = null;
                double maxSeverity = -1;
                foreach (var a in State.Health.Active)
                {
                    var def = HealthSystem.GetCondition(a.Id);
                    if (def != null && !string.IsNullOrEmpty(def.Animation) && a.Severity > maxSeverity)
                    {
                        maxSeverity = a.Severity;
                        anim = def.Animation;
                    }
                }
                return anim;
            }
        }

        public double HealthPenalty
        {
            get
            {
                double penalty = 15 * State.Health.Active.Sum(a => a.Severity);
                return Math.Min(60, penalty);
            }
        }
    }
}
