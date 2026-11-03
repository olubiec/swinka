using System;
using Cuy.Core.Pigs;

namespace Cuy.Core
{
    public sealed class NeedEventArgs : EventArgs
    {
        public NeedEventArgs(Need need, double value)
        {
            Need = need;
            Value = value;
        }

        public Need Need { get; }
        public double Value { get; }
    }

    public sealed class StageChangedEventArgs : EventArgs
    {
        public StageChangedEventArgs(LifeStage oldStage, LifeStage newStage)
        {
            OldStage = oldStage;
            NewStage = newStage;
        }

        public LifeStage OldStage { get; }
        public LifeStage NewStage { get; }
    }

    public sealed class BirthdayEventArgs : EventArgs
    {
        public BirthdayEventArgs(int years)
        {
            Years = years;
        }

        /// <summary>Which birthday this is (the pig's years).</summary>
        public int Years { get; }
    }

    public sealed class LevelUpEventArgs : EventArgs
    {
        public LevelUpEventArgs(int oldLevel, int newLevel)
        {
            OldLevel = oldLevel;
            NewLevel = newLevel;
        }

        public int OldLevel { get; }
        public int NewLevel { get; }
    }

    public sealed class DailyRewardEventArgs : EventArgs
    {
        public DailyRewardEventArgs(int clovers, int streak)
        {
            Clovers = clovers;
            Streak = streak;
        }

        public int Clovers { get; }
        public int Streak { get; }
    }

    public sealed class OfferUnlockedEventArgs : EventArgs
    {
        public OfferUnlockedEventArgs(string pigId)
        {
            PigId = pigId;
        }

        public string PigId { get; }
    }

    public sealed class PigAdoptedEventArgs : EventArgs
    {
        public PigAdoptedEventArgs(PigProfile pig, bool memorial)
        {
            Pig = pig;
            Memorial = memorial;
        }

        public PigProfile Pig { get; }
        public bool Memorial { get; }
    }
}
