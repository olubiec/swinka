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
        public int UnlockLevel { get; set; }
        public int ReadyIn { get; set; }
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

        public int TrickReadyInSeconds(string id)
        {
            var config = TricksTable;
            var now = Clock.UtcNow;
            var elapsed = (now - _lastTrickTime).TotalSeconds;
            if (elapsed >= config.CooldownSeconds) return 0;
            return (int)Math.Ceiling(config.CooldownSeconds - elapsed);
        }

        public IEnumerable<TrickInfo> GetTricks()
        {
            var config = TricksTable;
            var bondTable = BondTable;
            return config.Tricks.Select(t =>
            {
                var unlockEntry = bondTable?.Levels?.FirstOrDefault(l => string.Equals(l.Id, "trick_" + t.Id, StringComparison.OrdinalIgnoreCase));
                int unlockLvl = unlockEntry != null ? unlockEntry.Level : 0;
                return new TrickInfo
                {
                    Id = t.Id,
                    Title = t.Title,
                    Unlocked = IsUnlocked(t.Unlock),
                    UnlockLevel = unlockLvl,
                    ReadyIn = TrickReadyInSeconds(t.Id)
                };
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