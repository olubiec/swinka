using System;
using System.Collections.Generic;
using Cuy.Core.Time;
using Cuy.Core.World;

namespace Cuy.Core
{
    public enum WalkResult
    {
        Ok,
        TooManyToday,
        PlaceLocked,
        NeedsComfort,
        Disabled
    }

    public partial class Pet
    {
        private readonly HashSet<string> _fedVegToday = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        private int _fedVegDateOrdinal = -1;

        private ItemCatalog _itemCatalog;
        public ItemCatalog ItemCatalog
        {
            get => _itemCatalog ?? ItemCatalog.Default;
            set => _itemCatalog = value;
        }

        private void SyncWalkDay()
        {
            if (State.Stats == null) State.Stats = new Statistics();
            if (State.Stats.Counters == null) State.Stats.Counters = new Dictionary<string, int>();

            var localDate = Clock.LocalNow().Date;
            int todayOrdinal = localDate.Year * 10000 + localDate.Month * 100 + localDate.Day;

            State.Stats.Counters.TryGetValue("walk_date_ordinal", out int recordedDay);
            if (recordedDay != todayOrdinal)
            {
                State.Stats.Counters["walk_date_ordinal"] = todayOrdinal;
                State.Stats.Counters["walks_today"] = 0;
            }

            if (_fedVegDateOrdinal != todayOrdinal)
            {
                _fedVegDateOrdinal = todayOrdinal;
                _fedVegToday.Clear();
            }
        }

        public int WalksLeftToday()
        {
            if (!Balance.PlacesActive) return 0;
            SyncWalkDay();
            int maxPerDay = PlaceCatalog?.WalkPerDay ?? 3;
            State.Stats.Counters.TryGetValue("walks_today", out int walks);
            return Math.Max(0, maxPerDay - walks);
        }

        public WalkResult Walk(string placeId)
        {
            if (!Balance.PlacesActive) return WalkResult.Disabled;
            if (string.IsNullOrEmpty(placeId)) return WalkResult.PlaceLocked;

            SyncWalkDay();
            if (WalksLeftToday() <= 0) return WalkResult.TooManyToday;

            var world = EnsureWorld();
            if (!PlaceUnlock.IsUnlocked(world, PlaceCatalog, placeId))
            {
                return WalkResult.PlaceLocked;
            }

            if (string.Equals(placeId, "garden", StringComparison.OrdinalIgnoreCase))
            {
                int minComfort = PlaceCatalog?.WalkMinComfortGarden ?? 10;
                if (ComfortScore("garden") < minComfort)
                {
                    return WalkResult.NeedsComfort;
                }
            }

            State.Stats.Counters["walks_today"]++;
            Count("walks_total", 1);
            int moodGain = PlaceCatalog?.WalkMood ?? 6;
            ChangeNeed(Need.Mood, moodGain);
            AddDiaryEntry($"Went for a nice walk in the {placeId}.");

            return WalkResult.Ok;
        }

        public void OnFed(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return;

            SyncWalkDay();

            var catalog = ItemCatalog ?? ItemCatalog.Default;
            var itemDef = catalog?.GetItem(itemId);
            if (itemDef == null) return;

            if (!string.Equals(itemDef.Category, "vegetable", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            if (_fedVegToday.Add(itemId))
            {
                if (_fedVegToday.Count == 3)
                {
                    var localDate = Clock.LocalNow().Date;
                    int todayOrdinal = localDate.Year * 10000 + localDate.Month * 100 + localDate.Day;
                    State.Stats.Counters.TryGetValue("veg_bonus_given_date", out int bonusDate);
                    if (bonusDate != todayOrdinal)
                    {
                        State.Stats.Counters["veg_bonus_given_date"] = todayOrdinal;
                        ChangeNeed(Need.Mood, 5.0);
                        AddDiaryEntry("Enjoyed a healthy, varied diet of fresh vegetables today.");
                    }
                }
            }
        }
    }
}
