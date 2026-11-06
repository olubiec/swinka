using System;
using System.Collections.Generic;
using Cuy.Core.Time;
using Newtonsoft.Json;

namespace Cuy.Core.Pigs
{
    public sealed class PigLocation
    {
        public string PigId { get; set; }
        public string SceneId { get; set; } = "salon";
        public bool Pinned { get; set; }
        public DateTime? NextMoveAt { get; set; }

        [JsonIgnore]
        public string Scene
        {
            get => SceneId;
            set { if (!string.IsNullOrEmpty(value)) SceneId = value; }
        }

        public PigLocation()
        {
        }

        public PigLocation(string pigId, string sceneId = "salon", bool pinned = false, DateTime? nextMoveAt = null)
        {
            PigId = pigId;
            SceneId = string.IsNullOrWhiteSpace(sceneId) ? "salon" : sceneId;
            Pinned = pinned;
            NextMoveAt = nextMoveAt;
        }
    }

    public static class PigRoamer
    {
        public static IReadOnlyList<PigLocation> Tick(
            GameState state,
            IReadOnlyList<string> order,
            Func<string, bool> isUnlocked,
            IClock clock,
            Random rng = null,
            PigRoamingConfig config = null)
        {
            if (state == null || clock == null) return Array.Empty<PigLocation>();

            var cfg = config ?? PigRoamingConfig.Current;
            var r = rng ?? new Random();
            DateTime nowUtc = clock.UtcNow;
            DateTime localNow = clock.LocalNow();
            bool isNight = cfg.IsSleepHours(localNow);

            state.EnsurePigLocations(clock, r, cfg);

            var moved = new List<PigLocation>();
            var locations = new List<PigLocation>(state.PigLocations.Values);

            foreach (var loc in locations)
            {
                if (loc == null || string.IsNullOrEmpty(loc.PigId)) continue;

                // L10: If the scene a pig is in disappears from order, placed at salon on next tick.
                if (order != null && order.Count > 0 && !ContainsScene(order, loc.SceneId))
                {
                    loc.SceneId = ContainsScene(order, "salon") ? "salon" : order[0];
                    loc.NextMoveAt = nowUtc.AddSeconds(r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1));
                    moved.Add(loc);
                    if (loc.Pinned) continue;
                }

                // L4: Pinned pigs stay put
                if (loc.Pinned) continue;

                // L9: Night-home: during sleep_hours a pig goes to its own room (pig:<id>) if that is unlocked and stays there until morning.
                if (isNight)
                {
                    string ownRoom = "pig:" + loc.PigId;
                    bool ownRoomUnlocked = (isUnlocked == null || isUnlocked(ownRoom)) && (order == null || ContainsScene(order, ownRoom));
                    if (ownRoomUnlocked)
                    {
                        if (!string.Equals(loc.SceneId, ownRoom, StringComparison.OrdinalIgnoreCase))
                        {
                            loc.SceneId = ownRoom;
                            moved.Add(loc);
                        }

                        // Stays there until morning
                        DateTime morningLocal = localNow.Date.AddDays(localNow.Hour >= cfg.SleepStartHour ? 1 : 0).AddHours(cfg.SleepEndHour);
                        DateTime morningUtc = morningLocal.ToUniversalTime();
                        if (!loc.NextMoveAt.HasValue || loc.NextMoveAt.Value < morningUtc)
                        {
                            loc.NextMoveAt = morningUtc.AddSeconds(r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1));
                        }
                        continue;
                    }
                }

                // Schedule interval if missing
                if (!loc.NextMoveAt.HasValue)
                {
                    loc.NextMoveAt = nowUtc.AddSeconds(r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1));
                    continue;
                }

                // L8: No move earlier than interval_min_s
                if (nowUtc < loc.NextMoveAt.Value)
                {
                    continue;
                }

                if (order == null || order.Count == 0)
                {
                    loc.NextMoveAt = nowUtc.AddSeconds(r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1));
                    continue;
                }

                int currentIdx = IndexOfScene(order, loc.SceneId);
                if (currentIdx < 0 || order.Count == 1)
                {
                    loc.NextMoveAt = nowUtc.AddSeconds(r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1));
                    continue;
                }

                int prevIdx = (currentIdx - 1 + order.Count) % order.Count;
                int nextIdx = (currentIdx + 1) % order.Count;
                string prevScene = order[prevIdx];
                string nextScene = order[nextIdx];

                bool prevOk = isUnlocked == null || isUnlocked(prevScene);
                bool nextOk = isUnlocked == null || isUnlocked(nextScene);

                // L3: Locked-skipped: never moves into locked scene; if both neighbours locked it stays
                if (!prevOk && !nextOk)
                {
                    loc.NextMoveAt = nowUtc.AddSeconds(r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1));
                    continue;
                }

                string targetScene;
                if (prevOk && nextOk)
                {
                    if (string.Equals(prevScene, nextScene, StringComparison.OrdinalIgnoreCase))
                    {
                        targetScene = nextScene;
                    }
                    else
                    {
                        targetScene = (r.Next(2) == 0) ? prevScene : nextScene;
                    }
                }
                else if (prevOk)
                {
                    targetScene = prevScene;
                }
                else
                {
                    targetScene = nextScene;
                }

                loc.SceneId = targetScene;
                loc.NextMoveAt = nowUtc.AddSeconds(r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1));
                moved.Add(loc);
            }

            return moved;
        }

        public static bool AreAdjacent(string sceneA, string sceneB, IReadOnlyList<string> order)
        {
            if (order == null || order.Count < 2) return false;
            if (string.IsNullOrEmpty(sceneA) || string.IsNullOrEmpty(sceneB)) return false;
            int idxA = IndexOfScene(order, sceneA);
            int idxB = IndexOfScene(order, sceneB);
            if (idxA < 0 || idxB < 0 || idxA == idxB) return false;
            int prev = (idxA - 1 + order.Count) % order.Count;
            int next = (idxA + 1) % order.Count;
            return idxB == prev || idxB == next;
        }

        public static bool CanMove(GameState state, string pigId, string toScene, IReadOnlyList<string> order, Func<string, bool> isUnlocked)
        {
            if (state == null || string.IsNullOrEmpty(pigId) || string.IsNullOrEmpty(toScene) || order == null)
                return false;
            var loc = state.GetPigLocation(pigId);
            if (loc == null) return false;
            if (isUnlocked != null && !isUnlocked(toScene)) return false;
            return AreAdjacent(loc.SceneId, toScene, order);
        }

        public static bool TryMove(GameState state, string pigId, string toScene, IReadOnlyList<string> order, Func<string, bool> isUnlocked, IClock clock = null, Random rng = null, PigRoamingConfig config = null)
        {
            if (!CanMove(state, pigId, toScene, order, isUnlocked))
                return false;
            var loc = state.GetPigLocation(pigId);
            loc.SceneId = toScene;
            if (clock != null)
            {
                var cfg = config ?? PigRoamingConfig.Current;
                var r = rng ?? new Random();
                loc.NextMoveAt = clock.UtcNow.AddSeconds(r.Next(cfg.IntervalMinSeconds, cfg.IntervalMaxSeconds + 1));
            }
            return true;
        }

        public static bool SetPinned(GameState state, string pigId, bool pinned)
        {
            if (state == null || string.IsNullOrEmpty(pigId)) return false;
            var loc = state.GetPigLocation(pigId);
            if (loc == null) return false;
            loc.Pinned = pinned;
            return true;
        }

        private static bool ContainsScene(IReadOnlyList<string> order, string sceneId)
        {
            return IndexOfScene(order, sceneId) >= 0;
        }

        private static int IndexOfScene(IReadOnlyList<string> order, string sceneId)
        {
            if (order == null || string.IsNullOrEmpty(sceneId)) return -1;
            for (int i = 0; i < order.Count; i++)
            {
                if (string.Equals(order[i], sceneId, StringComparison.OrdinalIgnoreCase))
                    return i;
            }
            return -1;
        }
    }
}
