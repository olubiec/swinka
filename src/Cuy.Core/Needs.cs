using System;
using Newtonsoft.Json;

namespace Cuy.Core
{
    /// <summary>
    /// The guinea pig's six needs on a 0-100 scale, and Health computed from them.
    /// </summary>
    public sealed class Needs
    {
        public const double Min = 0;
        public const double Max = 100;

        private double _satiety = Max;
        private double _vitaminC = Max;
        private double _energy = Max;
        private double _mood = Max;
        private double _cleanliness = Max;
        private double _teeth = Max;

        public double Satiety { get { return _satiety; } set { _satiety = Clamp(value); } }
        public double VitaminC { get { return _vitaminC; } set { _vitaminC = Clamp(value); } }
        public double Energy { get { return _energy; } set { _energy = Clamp(value); } }
        public double Mood { get { return _mood; } set { _mood = Clamp(value); } }
        public double Cleanliness { get { return _cleanliness; } set { _cleanliness = Clamp(value); } }
        public double Teeth { get { return _teeth; } set { _teeth = Clamp(value); } }

        /// <summary>
        /// Health 0-100, computed from all six needs including cleanliness
        /// (cleanliness drops because of poops):
        /// half is the average, half is the lowest need. One badly neglected need
        /// lowers health a lot, but mild neglect on average does not make the pig sick.
        /// Example: after an offline weekend (20/20/100/20/100/77) health is about 38; the "sickness" threshold in actions.json is 25.
        /// </summary>
        [JsonProperty]
        public double Health
        {
            get
            {
                double sum = 0, min = Max;
                foreach (var n in NeedNames.All)
                {
                    double v = this[n];
                    sum += v;
                    if (v < min) min = v;
                }
                double avg = sum / NeedNames.All.Count;
                return Clamp(0.5 * avg + 0.5 * min);
            }
        }

        [JsonIgnore]
        public double this[Need need]
        {
            get
            {
                switch (need)
                {
                    case Need.Satiety: return _satiety;
                    case Need.VitaminC: return _vitaminC;
                    case Need.Energy: return _energy;
                    case Need.Mood: return _mood;
                    case Need.Cleanliness: return _cleanliness;
                    case Need.Teeth: return _teeth;
                    default: throw new ArgumentOutOfRangeException(nameof(need));
                }
            }
            set
            {
                switch (need)
                {
                    case Need.Satiety: Satiety = value; break;
                    case Need.VitaminC: VitaminC = value; break;
                    case Need.Energy: Energy = value; break;
                    case Need.Mood: Mood = value; break;
                    case Need.Cleanliness: Cleanliness = value; break;
                    case Need.Teeth: Teeth = value; break;
                    default: throw new ArgumentOutOfRangeException(nameof(need));
                }
            }
        }

        /// <summary>Lowest need (for the tray bubble, urgency and so on).</summary>
        public Need Lowest()
        {
            Need lowest = Need.Satiety;
            foreach (var n in NeedNames.All)
                if (this[n] < this[lowest]) lowest = n;
            return lowest;
        }

        /// <summary>
        /// Passage of time for the needs.
        /// </summary>
        /// <param name="span">Game time.</param>
        /// <param name="offline">The app was closed: decay is 3x slower and never below 20.</param>
        /// <param name="sleeping">The pig is asleep: energy rises instead of falling.</param>
        public void ApplyTime(TimeSpan span, bool offline, bool sleeping, Balance balance)
        {
            if (balance == null) throw new ArgumentNullException(nameof(balance));
            double hours = span.TotalHours;
            if (hours <= 0) return;

            foreach (var need in NeedNames.All)
            {
                double value = this[need];

                bool asleep = sleeping || (offline && balance.OfflineCountsAsSleep);
                if (need == Need.Energy && asleep)
                {
                    this[need] = value + balance.SleepEnergyRegenPerHour * hours;
                    continue;
                }

                double rate = balance.GetDecay(need);
                if (offline)
                {
                    rate *= balance.OfflineDecayFactor;
                    // Does not go below the threshold; if it was already lower, it stays where it was.
                    double floor = Math.Min(value, balance.OfflineFloor);
                    this[need] = Math.Max(value - rate * hours, floor);
                }
                else
                {
                    this[need] = value - rate * hours;
                }
            }
        }

        public Needs Clone()
        {
            return (Needs)MemberwiseClone();
        }

        private static double Clamp(double v)
        {
            if (double.IsNaN(v)) return Max;
            return v < Min ? Min : (v > Max ? Max : v);
        }
    }
}
