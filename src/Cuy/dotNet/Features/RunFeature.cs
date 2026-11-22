using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Input.Validation;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    /// <summary>
    /// Garden run feature: exposes state.run, handles run.out / run.in, and ticks mood/hours.
    /// </summary>
    public sealed class RunFeature : HomeFeatureBase
    {
        private const string PlaceGarden = "garden";
        private static readonly TimeSpan TickInterval = TimeSpan.FromSeconds(30);

        private readonly Dictionary<string, DateTime> _outSinceUtc = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, double> _hoursToday = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, double> _moodCreditedToday = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        private string _dayLocalDate = string.Empty;
        private TimeSpan _tickAccum = TimeSpan.Zero;

        public override string Id => "run";

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null) return;

            var world = pet.EnsureWorld();
            var catalog = pet.PlaceCatalog ?? PlaceCatalog.Current;
            bool available = PlaceUnlock.IsUnlocked(world, catalog, PlaceGarden);

            RoomLayout garden = null;
            world.Rooms?.TryGetValue(PlaceGarden, out garden);
            var (cols, rows) = PlaceUnlock.GridSize(world, catalog, PlaceGarden);
            if (cols <= 0) cols = 16;
            if (rows <= 0) rows = 9;

            var info = available
                ? RunCheck.Analyze(garden, cols, rows, WorldItemCatalog.Current, RunConfig.Current)
                : new RunInfo { Valid = false, Reason = "no_fence", CellList = Array.Empty<(int x, int y)>() };

            var localNow = pet.Clock != null ? pet.Clock.LocalNow() : DateTime.Now;
            EnsureDay(localNow);

            var verdict = RunRules.CanBeOut(localNow, null, RunConfig.Current);
            var verdictMsg = RunRules.Message(verdict);

            var cells = new List<int[]>(info.CellList.Count);
            foreach (var cell in info.CellList)
            {
                cells.Add(new[] { cell.x, cell.y });
            }

            var outList = new List<object>();
            foreach (var kv in _outSinceUtc)
            {
                _hoursToday.TryGetValue(kv.Key, out double hrs);
                outList.Add(new
                {
                    pigId = kv.Key,
                    since = kv.Value.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture),
                    hoursToday = Math.Round(hrs, 2)
                });
            }

            var candidates = new List<object>();
            var roster = pet.State?.Roster;
            if (roster != null)
            {
                foreach (var pig in roster)
                {
                    if (pig == null || string.IsNullOrEmpty(pig.Id)) continue;
                    candidates.Add(new
                    {
                        pigId = pig.Id,
                        name = pig.Name ?? pig.Id,
                        portrait = (string)null,
                        @out = _outSinceUtc.ContainsKey(pig.Id),
                        memorial = pig.Memorial
                    });
                }
            }

            state["run"] = new
            {
                available = available,
                valid = info.Valid,
                reason = info.Reason,
                cells = cells,
                capacity = info.Capacity,
                @out = outList,
                candidates = candidates,
                verdict = new
                {
                    ok = verdict == RunVerdict.Ok,
                    code = verdict.ToString(),
                    message = verdictMsg
                }
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            bool isOut = string.Equals(type, "run.out", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(type, "run_out", StringComparison.OrdinalIgnoreCase);
            bool isIn = string.Equals(type, "run.in", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(type, "run_in", StringComparison.OrdinalIgnoreCase);

            if (!isOut && !isIn) return false;

            var pet = brain?.Pet;
            if (pet == null) return true;

            if (RunMessages.ValidatePigPayload(message) != null)
            {
                return true;
            }

            string pigId = message["pigId"].Value<string>().Trim();
            var world = pet.EnsureWorld();
            var catalog = pet.PlaceCatalog ?? PlaceCatalog.Current;

            if (!PlaceUnlock.IsUnlocked(world, catalog, PlaceGarden))
            {
                Toast("Garden is locked");
                return true;
            }

            if (isIn)
            {
                if (_outSinceUtc.Remove(pigId))
                {
                    HomeWindow.NotifyStateChanged();
                }
                return true;
            }

            RoomLayout garden = null;
            world.Rooms?.TryGetValue(PlaceGarden, out garden);
            var (cols, rows) = PlaceUnlock.GridSize(world, catalog, PlaceGarden);
            if (cols <= 0) cols = 16;
            if (rows <= 0) rows = 9;

            var info = RunCheck.Analyze(garden, cols, rows, WorldItemCatalog.Current, RunConfig.Current);
            if (!info.Valid)
            {
                Toast("Needs a fence with a gate");
                return true;
            }

            var localNow = pet.Clock != null ? pet.Clock.LocalNow() : DateTime.Now;
            EnsureDay(localNow);
            var verdict = RunRules.CanBeOut(localNow, null, RunConfig.Current);
            if (verdict != RunVerdict.Ok)
            {
                Toast(RunRules.Message(verdict));
                return true;
            }

            var pig = pet.State?.Roster?.FirstOrDefault(p => p != null && string.Equals(p.Id, pigId, StringComparison.OrdinalIgnoreCase));
            if (pig == null || pig.Memorial)
            {
                return true;
            }

            if (_outSinceUtc.ContainsKey(pig.Id))
            {
                return true;
            }

            if (_outSinceUtc.Count >= info.Capacity)
            {
                Toast("The run is full");
                return true;
            }

            _outSinceUtc[pig.Id] = pet.Clock?.UtcNow ?? DateTime.UtcNow;
            HomeWindow.NotifyStateChanged();
            return true;
        }

        public override void Tick(TimeSpan gameElapsed, BrainController brain)
        {
            if (_outSinceUtc.Count == 0) return;

            _tickAccum += gameElapsed;
            if (_tickAccum < TickInterval) return;
            var elapsed = _tickAccum;
            _tickAccum = TimeSpan.Zero;

            var pet = brain?.Pet;
            if (pet == null) return;

            var localNow = pet.Clock != null ? pet.Clock.LocalNow() : DateTime.Now;
            EnsureDay(localNow);

            var verdict = RunRules.CanBeOut(localNow, null, RunConfig.Current);
            if (verdict != RunVerdict.Ok)
            {
                _outSinceUtc.Clear();
                HomeWindow.NotifyStateChanged();
                return;
            }

            double deltaHours = Math.Max(0.0, elapsed.TotalHours);
            if (deltaHours <= 0.0) return;

            foreach (var pigId in _outSinceUtc.Keys.ToList())
            {
                _hoursToday.TryGetValue(pigId, out double prevHours);
                double nextHours = Math.Min(RunConfig.Current.MaxHoursPerDay, prevHours + deltaHours);
                _hoursToday[pigId] = nextHours;

                double addedHours = Math.Max(0.0, nextHours - prevHours);
                if (addedHours > 0.0)
                {
                    _moodCreditedToday.TryGetValue(pigId, out double prevMood);
                    double moodDelta = RunRules.MoodFor(addedHours, prevMood, RunConfig.Current);
                    if (moodDelta > 0.0)
                    {
                        _moodCreditedToday[pigId] = prevMood + moodDelta;
                        pet.ChangeNeed(Need.Mood, moodDelta);
                    }

                    int wholeDiff = (int)Math.Floor(nextHours) - (int)Math.Floor(prevHours);
                    if (wholeDiff > 0)
                    {
                        pet.Count("run_hours", wholeDiff);
                    }
                }
            }
        }

        private void EnsureDay(DateTime localNow)
        {
            string today = localNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            if (string.Equals(_dayLocalDate, today, StringComparison.Ordinal)) return;

            _dayLocalDate = today;
            _hoursToday.Clear();
            _moodCreditedToday.Clear();
        }

        private static void Toast(string text)
        {
            HomeWindow.PostToPage(new { type = "toast", text = text });
        }
    }
}
