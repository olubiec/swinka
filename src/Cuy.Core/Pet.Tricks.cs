using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core
{
    public enum TrickResult
    {
        Ok,
        Unknown,
        Locked,
        Tired,
        Cooldown,
        Sleeping
    }

    public sealed class TrickInfo
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public bool Unlocked { get; set; }
    }

    public partial class Pet
    {
        private TricksConfig _tricksTable;
        private DateTime _lastTrickTime;

        public TricksConfig TricksTable
        {
            get
            {
                if (_tricksTable == null) return TricksConfig.Current;
                return _tricksTable;
            }
            set
            {
                _tricksTable = value;
            }
        }

        public IEnumerable<TrickInfo> GetTricks()
        {
            var config = TricksTable;
            return config.Tricks.Select(t => new TrickInfo
            {
                Id = t.Id,
                Title = t.Title,
                Unlocked = IsUnlocked(t.Unlock)
            });
        }

        public TrickResult TryPerformTrick(string id)
        {
            var config = TricksTable;
            var trickDef = config.Tricks.FirstOrDefault(t => string.Equals(t.Id, id, StringComparison.OrdinalIgnoreCase));

            if (trickDef == null)
                return TrickResult.Unknown;

            if (IsSleeping)
                return TrickResult.Sleeping;

            if (!IsUnlocked(trickDef.Unlock))
                return TrickResult.Locked;

            if (State.Needs.Energy < config.MinEnergy)
                return TrickResult.Tired;

            var now = Clock.UtcNow;
            if ((now - _lastTrickTime).TotalSeconds < config.CooldownSeconds)
                return TrickResult.Cooldown;

            // Apply trick effects
            _lastTrickTime = now;
            ChangeNeed(Need.Energy, -config.EnergyCost);
            ChangeNeed(Need.Mood, config.MoodGain);
            AddBondPoints(config.BondPoints);
            Count("tricks_performed");
            Count("trick_" + trickDef.Id.ToLowerInvariant());

            return TrickResult.Ok;
        }
    }
}