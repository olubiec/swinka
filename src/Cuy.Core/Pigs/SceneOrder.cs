using System;
using System.Collections.Generic;
using System.Linq;

namespace Cuy.Core.Pigs
{
    /// <summary>
    /// Represents a single scene entry in the circular ring of scenes.
    /// </summary>
    public sealed class SceneEntry
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public bool Locked { get; set; }
        public string UnlockHint { get; set; }

        public SceneEntry() { }

        public SceneEntry(string id, string title, bool locked, string unlockHint = null)
        {
            Id = id;
            Title = title;
            Locked = locked;
            UnlockHint = unlockHint;
        }

        public override string ToString() => Id ?? string.Empty;

        public static implicit operator string(SceneEntry entry) => entry?.Id;
    }

    /// <summary>
    /// Builds and navigates the circular ring of scenes (House rooms -> Garden -> Park -> Farm -> Market -> Salon).
    /// </summary>
    public static class SceneOrder
    {
        public const string SalonId = "salon";
        public const string DormId = "dorm";
        public const string GardenId = "garden";
        public const string ParkId = "park";
        public const string FarmId = "farm";
        public const string MarketId = "market";

        private static readonly string[] FixedOutdoorScenes = { GardenId, ParkId, FarmId, MarketId };

        /// <summary>
        /// Builds the ordered ring of scenes:
        /// 1. salon
        /// 2. pig rooms in the existing room order
        /// 3. dorm (only if unlocked)
        /// 4. garden, park, farm, market (locked places stay with Locked=true)
        /// </summary>
        public static IReadOnlyList<SceneEntry> Build(
            IEnumerable<string> rooms,
            Func<string, bool> unlocked = null,
            Func<string, string> getTitle = null,
            Func<string, string> getUnlockHint = null)
        {
            var ring = new List<SceneEntry>();

            Func<string, bool> isUnlocked = unlocked ?? DefaultIsUnlocked;

            // 1. Salon (House common room)
            bool salonLocked = !isUnlocked(SalonId);
            ring.Add(new SceneEntry(
                SalonId,
                getTitle?.Invoke(SalonId) ?? DefaultTitle(SalonId),
                salonLocked,
                salonLocked ? (getUnlockHint?.Invoke(SalonId) ?? DefaultUnlockHint(SalonId)) : null
            ));

            // 2. Pig rooms in existing room order
            if (rooms != null)
            {
                var seenPigRooms = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var raw in rooms)
                {
                    if (string.IsNullOrWhiteSpace(raw)) continue;
                    string r = raw.Trim();

                    // Skip fixed scenes and dorm (handled separately)
                    if (string.Equals(r, SalonId, StringComparison.OrdinalIgnoreCase)) continue;
                    if (string.Equals(r, DormId, StringComparison.OrdinalIgnoreCase)) continue;
                    if (IsFixedOutdoorScene(r)) continue;

                    string roomId = r.StartsWith("pig:", StringComparison.OrdinalIgnoreCase) ? r : "pig:" + r;
                    if (!seenPigRooms.Add(roomId)) continue;

                    bool pigLocked = !isUnlocked(roomId);
                    ring.Add(new SceneEntry(
                        roomId,
                        getTitle?.Invoke(roomId) ?? DefaultTitle(roomId),
                        pigLocked,
                        pigLocked ? (getUnlockHint?.Invoke(roomId) ?? DefaultUnlockHint(roomId)) : null
                    ));
                }
            }

            // 3. Dorm (only if unlocked)
            if (isUnlocked(DormId))
            {
                ring.Add(new SceneEntry(
                    DormId,
                    getTitle?.Invoke(DormId) ?? DefaultTitle(DormId),
                    false,
                    null
                ));
            }

            // 4. Garden, Park, Farm, Market (always present, Locked flag set)
            foreach (var placeId in FixedOutdoorScenes)
            {
                bool locked = !isUnlocked(placeId);
                ring.Add(new SceneEntry(
                    placeId,
                    getTitle?.Invoke(placeId) ?? DefaultTitle(placeId),
                    locked,
                    locked ? (getUnlockHint?.Invoke(placeId) ?? DefaultUnlockHint(placeId)) : null
                ));
            }

            return ring;
        }

        public static IReadOnlyList<SceneEntry> Build(
            IEnumerable<string> rooms,
            ISet<string> unlocked,
            Func<string, string> getTitle = null,
            Func<string, string> getUnlockHint = null)
        {
            return Build(rooms, unlocked != null ? unlocked.Contains : (Func<string, bool>)null, getTitle, getUnlockHint);
        }

        public static IReadOnlyList<string> BuildIds(
            IEnumerable<string> rooms,
            Func<string, bool> unlocked = null)
        {
            return Build(rooms, unlocked).Select(e => e.Id).ToList();
        }

        public static SceneEntry Next(IReadOnlyList<SceneEntry> ring, string currentId)
        {
            if (ring == null || ring.Count == 0 || string.IsNullOrEmpty(currentId)) return null;
            int idx = IndexOf(ring, currentId);
            if (idx < 0) return null;
            return ring[(idx + 1) % ring.Count];
        }

        public static SceneEntry Previous(IReadOnlyList<SceneEntry> ring, string currentId)
        {
            if (ring == null || ring.Count == 0 || string.IsNullOrEmpty(currentId)) return null;
            int idx = IndexOf(ring, currentId);
            if (idx < 0) return null;
            return ring[(idx - 1 + ring.Count) % ring.Count];
        }

        public static string Next(IReadOnlyList<string> ring, string currentId)
        {
            if (ring == null || ring.Count == 0 || string.IsNullOrEmpty(currentId)) return null;
            int idx = IndexOf(ring, currentId);
            if (idx < 0) return null;
            return ring[(idx + 1) % ring.Count];
        }

        public static string Previous(IReadOnlyList<string> ring, string currentId)
        {
            if (ring == null || ring.Count == 0 || string.IsNullOrEmpty(currentId)) return null;
            int idx = IndexOf(ring, currentId);
            if (idx < 0) return null;
            return ring[(idx - 1 + ring.Count) % ring.Count];
        }

        public static bool AreAdjacent(IReadOnlyList<SceneEntry> ring, string sceneA, string sceneB)
        {
            if (ring == null || ring.Count < 2 || string.IsNullOrEmpty(sceneA) || string.IsNullOrEmpty(sceneB)) return false;
            int idxA = IndexOf(ring, sceneA);
            int idxB = IndexOf(ring, sceneB);
            if (idxA < 0 || idxB < 0 || idxA == idxB) return false;
            int prev = (idxA - 1 + ring.Count) % ring.Count;
            int next = (idxA + 1) % ring.Count;
            return idxB == prev || idxB == next;
        }

        public static bool AreAdjacent(IReadOnlyList<string> ring, string sceneA, string sceneB)
        {
            return PigRoamer.AreAdjacent(sceneA, sceneB, ring);
        }

        public static int IndexOf(IReadOnlyList<SceneEntry> ring, string id)
        {
            if (ring == null || string.IsNullOrEmpty(id)) return -1;
            for (int i = 0; i < ring.Count; i++)
            {
                if (MatchesId(ring[i]?.Id, id)) return i;
            }
            return -1;
        }

        public static int IndexOf(IReadOnlyList<string> ring, string id)
        {
            if (ring == null || string.IsNullOrEmpty(id)) return -1;
            for (int i = 0; i < ring.Count; i++)
            {
                if (MatchesId(ring[i], id)) return i;
            }
            return -1;
        }

        private static bool MatchesId(string candidate, string target)
        {
            if (candidate == null || target == null) return false;
            if (string.Equals(candidate, target, StringComparison.OrdinalIgnoreCase)) return true;
            if (!target.StartsWith("pig:", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(candidate, "pig:" + target, StringComparison.OrdinalIgnoreCase)) return true;
            if (target.StartsWith("pig:", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(candidate, target.Substring(4), StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }

        private static bool IsFixedOutdoorScene(string id)
        {
            foreach (var s in FixedOutdoorScenes)
            {
                if (string.Equals(s, id, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        private static bool DefaultIsUnlocked(string id)
        {
            if (string.Equals(id, SalonId, StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(id, MarketId, StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }

        public static string DefaultTitle(string id)
        {
            if (string.IsNullOrEmpty(id)) return string.Empty;
            if (string.Equals(id, SalonId, StringComparison.OrdinalIgnoreCase)) return "Living room";
            if (string.Equals(id, DormId, StringComparison.OrdinalIgnoreCase)) return "Shared Bedroom";
            if (string.Equals(id, GardenId, StringComparison.OrdinalIgnoreCase)) return "Garden";
            if (string.Equals(id, ParkId, StringComparison.OrdinalIgnoreCase)) return "Park";
            if (string.Equals(id, FarmId, StringComparison.OrdinalIgnoreCase)) return "Farm";
            if (string.Equals(id, MarketId, StringComparison.OrdinalIgnoreCase)) return "Market";

            if (id.StartsWith("pig:", StringComparison.OrdinalIgnoreCase))
            {
                string name = id.Substring(4).Trim();
                if (name.Length > 0)
                {
                    string cap = char.ToUpperInvariant(name[0]) + name.Substring(1);
                    return cap + "'s Room";
                }
                return "Pig's Room";
            }

            return char.ToUpperInvariant(id[0]) + id.Substring(1);
        }

        public static string DefaultUnlockHint(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            if (string.Equals(id, GardenId, StringComparison.OrdinalIgnoreCase)) return "Requires clovers";
            if (string.Equals(id, ParkId, StringComparison.OrdinalIgnoreCase)) return "Requires Garden";
            if (string.Equals(id, FarmId, StringComparison.OrdinalIgnoreCase)) return "Requires Garden";
            if (string.Equals(id, DormId, StringComparison.OrdinalIgnoreCase)) return "Requires 2 pigs";
            return null;
        }
    }

    public static class SceneOrderExtensions
    {
        public static SceneEntry Next(this IReadOnlyList<SceneEntry> ring, string currentId) => SceneOrder.Next(ring, currentId);
        public static SceneEntry Previous(this IReadOnlyList<SceneEntry> ring, string currentId) => SceneOrder.Previous(ring, currentId);
        public static string Next(this IReadOnlyList<string> ring, string currentId) => SceneOrder.Next(ring, currentId);
        public static string Previous(this IReadOnlyList<string> ring, string currentId) => SceneOrder.Previous(ring, currentId);
    }
}
