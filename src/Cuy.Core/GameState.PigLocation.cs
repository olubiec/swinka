using System;
using System.Collections.Generic;
using Cuy.Core.Pigs;
using Cuy.Core.Time;

namespace Cuy.Core
{
    public sealed partial class GameState
    {
        private Dictionary<string, PigLocation> _pigLocations;

        public Dictionary<string, PigLocation> PigLocations
        {
            get
            {
                if (_pigLocations == null)
                {
                    _pigLocations = new Dictionary<string, PigLocation>(StringComparer.OrdinalIgnoreCase);
                }
                EnsurePigLocationsInternal();
                return _pigLocations;
            }
            set
            {
                _pigLocations = value != null
                    ? new Dictionary<string, PigLocation>(value, StringComparer.OrdinalIgnoreCase)
                    : new Dictionary<string, PigLocation>(StringComparer.OrdinalIgnoreCase);
            }
        }

        public PigLocation GetPigLocation(string pigId)
        {
            if (string.IsNullOrEmpty(pigId)) return null;
            if (PigLocations.TryGetValue(pigId, out var loc) && loc != null)
            {
                return loc;
            }
            var created = new PigLocation(pigId, "salon", false);
            PigLocations[pigId] = created;
            return created;
        }

        public void SetPigLocation(string pigId, string sceneId, bool? pinned = null)
        {
            if (string.IsNullOrEmpty(pigId)) return;
            var loc = GetPigLocation(pigId);
            if (!string.IsNullOrEmpty(sceneId))
            {
                loc.SceneId = sceneId;
            }
            if (pinned.HasValue)
            {
                loc.Pinned = pinned.Value;
            }
        }

        public void SetPigPinned(string pigId, bool pinned)
        {
            if (string.IsNullOrEmpty(pigId)) return;
            var loc = GetPigLocation(pigId);
            loc.Pinned = pinned;
        }

        public void EnsurePigLocations(IClock clock = null, Random rng = null, PigRoamingConfig config = null)
        {
            var cfg = config ?? PigRoamingConfig.Current;
            var r = rng;

            if (_pigLocations == null)
            {
                _pigLocations = new Dictionary<string, PigLocation>(StringComparer.OrdinalIgnoreCase);
            }

            if (Roster != null && Roster.Count > 0)
            {
                foreach (var pig in Roster)
                {
                    if (pig == null || string.IsNullOrEmpty(pig.Id)) continue;
                    if (!_pigLocations.TryGetValue(pig.Id, out var loc) || loc == null)
                    {
                        loc = new PigLocation(pig.Id, "salon", cfg.PinnedDefault);
                        if (clock != null)
                        {
                            int delay = (r != null)
                                ? r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1)
                                : cfg.IntervalMinSeconds;
                            loc.NextMoveAt = clock.UtcNow.AddSeconds(delay);
                        }
                        _pigLocations[pig.Id] = loc;
                    }
                }
            }
            else if (ActivePigIds != null && ActivePigIds.Count > 0)
            {
                foreach (var id in ActivePigIds)
                {
                    if (string.IsNullOrEmpty(id)) continue;
                    if (!_pigLocations.TryGetValue(id, out var loc) || loc == null)
                    {
                        loc = new PigLocation(id, "salon", cfg.PinnedDefault);
                        if (clock != null)
                        {
                            int delay = (r != null)
                                ? r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1)
                                : cfg.IntervalMinSeconds;
                            loc.NextMoveAt = clock.UtcNow.AddSeconds(delay);
                        }
                        _pigLocations[id] = loc;
                    }
                }
            }
        }

        private void EnsurePigLocationsInternal()
        {
            if (Roster != null && Roster.Count > 0)
            {
                foreach (var pig in Roster)
                {
                    if (pig == null || string.IsNullOrEmpty(pig.Id)) continue;
                    if (!_pigLocations.ContainsKey(pig.Id) || _pigLocations[pig.Id] == null)
                    {
                        _pigLocations[pig.Id] = new PigLocation(pig.Id, "salon", false);
                    }
                }
            }
            else if (ActivePigIds != null && ActivePigIds.Count > 0)
            {
                foreach (var id in ActivePigIds)
                {
                    if (string.IsNullOrEmpty(id)) continue;
                    if (!_pigLocations.ContainsKey(id) || _pigLocations[id] == null)
                    {
                        _pigLocations[id] = new PigLocation(id, "salon", false);
                    }
                }
            }
        }
    }
}
