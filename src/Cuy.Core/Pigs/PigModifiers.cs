using System;
using System.Collections.Generic;

namespace Cuy.Core.Pigs
{
    public readonly struct PigModifiers : IEquatable<PigModifiers>
    {
        public static PigModifiers Neutral { get; } = new PigModifiers(1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0);

        public double Appetite { get; }
        public double PoopRate { get; }
        public double Activity { get; }
        public double BondGain { get; }
        public double MinigameScore { get; }
        public double WheekRate { get; }
        public double Startle { get; }
        public double JoyWeight { get; }

        public PigModifiers(
            double appetite = 1.0,
            double poopRate = 1.0,
            double activity = 1.0,
            double bondGain = 1.0,
            double minigameScore = 1.0,
            double wheekRate = 1.0,
            double startle = 1.0,
            double joyWeight = 1.0)
        {
            Appetite = appetite;
            PoopRate = poopRate;
            Activity = activity;
            BondGain = bondGain;
            MinigameScore = minigameScore;
            WheekRate = wheekRate;
            Startle = startle;
            JoyWeight = joyWeight;
        }

        public static PigModifiers FromDictionary(IReadOnlyDictionary<string, double> values)
        {
            if (values == null)
            {
                return Neutral;
            }

            return new PigModifiers(
                GetValue(values, "appetite"),
                GetValue(values, "poop_rate"),
                GetValue(values, "activity"),
                GetValue(values, "bond_gain"),
                GetValue(values, "minigame_score"),
                GetValue(values, "wheek_rate"),
                GetValue(values, "startle"),
                GetValue(values, "joy_weight")
            );
        }

        private static double GetValue(IReadOnlyDictionary<string, double> values, string key)
        {
            if (values.TryGetValue(key, out double val))
            {
                if (double.IsNaN(val) || double.IsInfinity(val) || val <= 0.0)
                {
                    return 1.0;
                }
                return val;
            }
            return 1.0;
        }

        public static PigModifiers Average(IEnumerable<PigModifiers> items)
        {
            if (items == null)
            {
                return Neutral;
            }

            double sumAppetite = 0.0;
            double sumPoopRate = 0.0;
            double sumActivity = 0.0;
            double sumBondGain = 0.0;
            double sumMinigameScore = 0.0;
            double sumWheekRate = 0.0;
            double sumStartle = 0.0;
            double sumJoyWeight = 0.0;
            int count = 0;

            foreach (var item in items)
            {
                sumAppetite += item.Appetite;
                sumPoopRate += item.PoopRate;
                sumActivity += item.Activity;
                sumBondGain += item.BondGain;
                sumMinigameScore += item.MinigameScore;
                sumWheekRate += item.WheekRate;
                sumStartle += item.Startle;
                sumJoyWeight += item.JoyWeight;
                count++;
            }

            if (count == 0)
            {
                return Neutral;
            }

            return new PigModifiers(
                sumAppetite / count,
                sumPoopRate / count,
                sumActivity / count,
                sumBondGain / count,
                sumMinigameScore / count,
                sumWheekRate / count,
                sumStartle / count,
                sumJoyWeight / count
            );
        }

        public PigModifiers Clamp(double min, double max)
        {
            if (min > max)
            {
                double temp = min;
                min = max;
                max = temp;
            }

            return new PigModifiers(
                ClampValue(Appetite, min, max),
                ClampValue(PoopRate, min, max),
                ClampValue(Activity, min, max),
                ClampValue(BondGain, min, max),
                ClampValue(MinigameScore, min, max),
                ClampValue(WheekRate, min, max),
                ClampValue(Startle, min, max),
                ClampValue(JoyWeight, min, max)
            );
        }

        private static double ClampValue(double val, double min, double max)
        {
            if (val < min) return min;
            if (val > max) return max;
            return val;
        }

        public static PigModifiers AverageClamped(IEnumerable<PigModifiers> items, double min, double max)
        {
            return Average(items).Clamp(min, max);
        }

        public bool Equals(PigModifiers other)
        {
            return Appetite.Equals(other.Appetite) &&
                   PoopRate.Equals(other.PoopRate) &&
                   Activity.Equals(other.Activity) &&
                   BondGain.Equals(other.BondGain) &&
                   MinigameScore.Equals(other.MinigameScore) &&
                   WheekRate.Equals(other.WheekRate) &&
                   Startle.Equals(other.Startle) &&
                   JoyWeight.Equals(other.JoyWeight);
        }

        public override bool Equals(object obj)
        {
            return obj is PigModifiers other && Equals(other);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                int hash = 17;
                hash = hash * 31 + Appetite.GetHashCode();
                hash = hash * 31 + PoopRate.GetHashCode();
                hash = hash * 31 + Activity.GetHashCode();
                hash = hash * 31 + BondGain.GetHashCode();
                hash = hash * 31 + MinigameScore.GetHashCode();
                hash = hash * 31 + WheekRate.GetHashCode();
                hash = hash * 31 + Startle.GetHashCode();
                hash = hash * 31 + JoyWeight.GetHashCode();
                return hash;
            }
        }

        public static bool operator ==(PigModifiers left, PigModifiers right) => left.Equals(right);
        public static bool operator !=(PigModifiers left, PigModifiers right) => !left.Equals(right);
    }
}
