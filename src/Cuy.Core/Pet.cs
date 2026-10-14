using System;
using System.Collections.Generic;
using System.Globalization;
using Cuy.Core.Time;

namespace Cuy.Core
{
    /// <summary>
    /// The pig's core: passage of time, needs, age, bond, currency and events.
    /// The single source of truth about the game state. Call <see cref="Update"/> regularly (e.g. every second) from the game thread.
    /// </summary>
    /// <remarks>Not thread-safe: use it from one thread.</remarks>
    public sealed class Pet
    {
        private readonly bool[] _lowNotified = new bool[NeedNames.All.Count];
        private readonly bool[] _criticalNotified = new bool[NeedNames.All.Count];

        public Pet(GameState state, IClock clock, Balance balance = null)
        {
            if (state == null) throw new ArgumentNullException(nameof(state));
            if (clock == null) throw new ArgumentNullException(nameof(clock));
            state.Normalize();
            State = state;
            Clock = clock;
            Balance = balance ?? Balance.CreateDefault();
        }

        // ---- Events ----------------------------------------------------------

        /// <summary>A need dropped below the "low" threshold (default 35).</summary>
        public event EventHandler<NeedEventArgs> NeedLow;

        /// <summary>A need dropped below the "critical" threshold (default 15).</summary>
        public event EventHandler<NeedEventArgs> NeedCritical;

        /// <summary>Life stage changed (e.g. Baby -> Junior). After a long offline period several stages can pass at once.</summary>
        public event EventHandler<StageChangedEventArgs> StageChanged;

        /// <summary>Birthday (every 17.4 real days). After a long offline period it fires once per missed birthday.</summary>
        public event EventHandler<BirthdayEventArgs> Birthday;

        /// <summary>New bond level. On a jump of several levels it fires for each level.</summary>
        public event EventHandler<LevelUpEventArgs> LevelUp;

        // ---- Stan ------------------------------------------------------------

        public GameState State { get; }
        public IClock Clock { get; }
        public Balance Balance { get; }

        public Needs Needs { get { return State.Needs; } }

        /// <summary>The pig is asleep: energy rises instead of falling. Set by the behaviour layer.</summary>
        public bool IsSleeping { get; set; }

        public bool IsStarted { get; private set; }

        /// <summary>Game time that passed offline at the last <see cref="Start"/>.</summary>
        public TimeSpan LastOfflineDuration { get; private set; }

        public PigAge Age
        {
            get { return PigAge.FromBirth(State.BirthDateUtc, Clock.UtcNow, Balance.PigDaysPerRealDay); }
        }

        public LifeStage Stage { get { return State.Stage; } }

        // ---- Passage of time -------------------------------------------------

        /// <summary>
        /// Call once after loading the state (after hooking up the events). Adds the time the app was closed
        /// using the offline rules and raises pending events right away.
        /// </summary>
        public void Start()
        {
            if (IsStarted) return;
            IsStarted = true;
            State.Stats.Sessions++;

            var now = Clock.UtcNow;
            var offline = now - State.LastActiveUtc;
            LastOfflineDuration = offline > TimeSpan.Zero ? offline : TimeSpan.Zero;
            if (offline > TimeSpan.Zero)
            {
                ApplyTime(offline, offline: true);
                State.LastActiveUtc = now;
            }
            RecalculateCleanliness();
            CheckAll();
        }

        /// <summary>
        /// Adds the time since the last call. A gap longer than <see cref="Cuy.Core.Balance.MaxOnlineGap"/>
        /// of real time (computer asleep) counts as offline.
        /// </summary>
        public void Update()
        {
            if (!IsStarted) Start();

            var now = Clock.UtcNow;
            var elapsed = now - State.LastActiveUtc;
            // Clock went backwards (system time change, back from 60x to 1x): do not move the pig back in time.
            if (elapsed <= TimeSpan.Zero) return;

            double multiplier = Clock.Multiplier > 0 ? Clock.Multiplier : 1;
            double realSeconds = elapsed.TotalSeconds / multiplier;
            bool gap = realSeconds > Balance.MaxOnlineGap.TotalSeconds;

            ApplyTime(elapsed, offline: gap);
            State.LastActiveUtc = now;
            CheckAll();
        }

        private void ApplyTime(TimeSpan span, bool offline)
        {
            State.Needs.ApplyTime(span, offline, IsSleeping, Balance);
            if (offline) State.Stats.OfflineHours += span.TotalHours;
            else State.Stats.OnlineHours += span.TotalHours;
        }

        private void CheckAll()
        {
            CheckStage();
            CheckBirthdays();
            CheckNeedThresholds();
        }

        private void CheckStage()
        {
            var newStage = Balance.GrowthActive ? Age.Stage : LifeStage.Baby;
            if (newStage == State.Stage) return;
            var old = State.Stage;
            State.Stage = newStage;
            Raise(StageChanged, new StageChangedEventArgs(old, newStage));
        }

        private void CheckBirthdays()
        {
            int years = Age.Years;
            while (State.BirthdaysCelebrated < years)
            {
                State.BirthdaysCelebrated++;
                Raise(Birthday, new BirthdayEventArgs(State.BirthdaysCelebrated));
            }
        }

        private void CheckNeedThresholds()
        {
            foreach (var need in NeedNames.All)
            {
                int i = (int)need;
                double v = State.Needs[need];

                if (!_lowNotified[i] && v < Balance.LowThreshold)
                {
                    _lowNotified[i] = true;
                    Raise(NeedLow, new NeedEventArgs(need, v));
                }
                else if (_lowNotified[i] && v >= Balance.LowThreshold + Balance.ThresholdHysteresis)
                {
                    _lowNotified[i] = false;
                }

                if (!_criticalNotified[i] && v < Balance.CriticalThreshold)
                {
                    _criticalNotified[i] = true;
                    Raise(NeedCritical, new NeedEventArgs(need, v));
                }
                else if (_criticalNotified[i] && v >= Balance.CriticalThreshold + Balance.ThresholdHysteresis)
                {
                    _criticalNotified[i] = false;
                }
            }
        }

        // ---- Care and rewards ------------------------------------------------

        /// <summary>Changes a need by the given amount (feeding, play...). Result clamped to 0-100.</summary>
        public void ChangeNeed(Need need, double delta)
        {
            State.Needs[need] = State.Needs[need] + delta;
            CheckNeedThresholds();
        }

        /// <summary>
        /// Adds bond points within the daily limit. Returns how many were actually added.
        /// </summary>
        public int AddBondPoints(int points)
        {
            if (points <= 0) return 0;
            var bond = State.Bond;
            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            if (bond.PointsTodayDate != today)
            {
                bond.PointsTodayDate = today;
                bond.PointsToday = 0;
            }

            int allowed = Math.Max(0, Math.Min(points, Balance.BondDailyLimit - bond.PointsToday));
            if (allowed == 0) return 0;

            bond.PointsToday += allowed;
            bond.Points += allowed;

            int newLevel = Balance.BondLevelForPoints(bond.Points);
            while (bond.Level < newLevel)
            {
                int old = bond.Level;
                bond.Level++;
                Raise(LevelUp, new LevelUpEventArgs(old, bond.Level));
            }
            return allowed;
        }

        public void AddClovers(int amount)
        {
            if (amount < 0) throw new ArgumentOutOfRangeException(nameof(amount), "Use TrySpendClovers to spend.");
            State.Clovers += amount;
        }

        /// <summary>Spends clovers if there are enough. The balance never drops below 0.</summary>
        public bool TrySpendClovers(int amount)
        {
            if (amount < 0) throw new ArgumentOutOfRangeException(nameof(amount));
            if (State.Clovers < amount) return false;
            State.Clovers -= amount;
            return true;
        }

        // ---- Poops and cage cleanliness ---------------------------------------

        public const int MaxPoops = 8;

        /// <summary>
        /// Recomputes cage cleanliness from the number of poops:
        /// 0 poops = 100%, 8 poops = 0% (12.5% less per poop).
        /// </summary>
        public void RecalculateCleanliness()
        {
            State.Needs.Cleanliness = Math.Max(0.0, 100.0 - (State.PoopCount * 12.5));
            CheckNeedThresholds();
        }

        /// <summary>
        /// Adds a poop (up to 8). Returns false if the limit was reached.
        /// </summary>
        public bool TryAddPoop(PoopItem poop = null)
        {
            if (State.PoopCount >= MaxPoops) return false;
            State.PoopCount++;
            if (poop != null)
            {
                if (poop.CreatedAtUtc == default) poop.CreatedAtUtc = Clock.UtcNow;
                State.Poops.Add(poop);
            }
            RecalculateCleanliness();
            return true;
        }

        /// <summary>
        /// Removes a poop (e.g. after a click): lowers the count, adds 1 clover and recomputes cleanliness.
        /// </summary>
        public bool CleanPoop(string poopId = null)
        {
            if (State.PoopCount <= 0 && State.Poops.Count == 0) return false;

            if (!string.IsNullOrEmpty(poopId))
            {
                State.Poops.RemoveAll(p => p.Id == poopId);
            }
            else if (State.Poops.Count > 0)
            {
                State.Poops.RemoveAt(0);
            }

            State.PoopCount = Math.Max(0, State.PoopCount - 1);
            AddClovers(1);
            Count("poops_collected");
            RecalculateCleanliness();
            return true;
        }

        /// <summary>
        /// Cleans the whole cage (e.g. in Home): resets the poop count, clears the list and restores cleanliness to 100.
        /// </summary>
        public void CleanAllPoops()
        {
            State.PoopCount = 0;
            State.Poops.Clear();
            RecalculateCleanliness();
        }

        public int GetItemCount(string itemId)
        {
            int n;
            return itemId != null && State.Inventory.TryGetValue(itemId, out n) ? n : 0;
        }

        public void AddItem(string itemId, int count = 1)
        {
            if (string.IsNullOrEmpty(itemId)) throw new ArgumentNullException(nameof(itemId));
            if (count <= 0) throw new ArgumentOutOfRangeException(nameof(count));
            State.Inventory[itemId] = GetItemCount(itemId) + count;
        }

        /// <summary>Takes items from the inventory if available. At zero the entry is removed.</summary>
        public bool TryRemoveItem(string itemId, int count = 1)
        {
            if (count <= 0) throw new ArgumentOutOfRangeException(nameof(count));
            int have = GetItemCount(itemId);
            if (have < count) return false;
            if (have == count) State.Inventory.Remove(itemId);
            else State.Inventory[itemId] = have - count;
            return true;
        }

        /// <summary>Marks an animation in the behaviour album. Returns true if seen for the first time.</summary>
        public bool MarkSeen(string animationName)
        {
            if (string.IsNullOrEmpty(animationName) || State.Album.ContainsKey(animationName)) return false;
            State.Album[animationName] = Clock.UtcNow;
            return true;
        }

        public DiaryEntry AddDiaryEntry(string text)
        {
            var entry = new DiaryEntry { DateUtc = Clock.UtcNow, Text = text ?? string.Empty };
            State.Diary.Add(entry);
            return entry;
        }

        /// <summary>Increments a counter in the statistics (e.g. "bell_pepper", "popcorn").</summary>
        public int Count(string counter, int by = 1)
        {
            if (string.IsNullOrEmpty(counter)) throw new ArgumentNullException(nameof(counter));
            int n;
            State.Stats.Counters.TryGetValue(counter, out n);
            n += by;
            State.Stats.Counters[counter] = n;
            return n;
        }


        /// <summary>
        /// Records a minigame score, grants the reward (clovers = min(40, score / 10), mood +15)
        /// within the limit of 10 rewarded games per day, and updates the records in GameState.
        /// </summary>
        public bool RecordMinigameResult(string gameId, int score, out int cloversAwarded, out bool isNewRecord)
        {
            if (string.IsNullOrEmpty(gameId)) gameId = "unknown";
            if (State.HighScores == null) State.HighScores = new System.Collections.Generic.Dictionary<string, int>();

            int currentRecord = 0;
            State.HighScores.TryGetValue(gameId, out currentRecord);
            isNewRecord = score > currentRecord;
            if (isNewRecord)
            {
                State.HighScores[gameId] = score;
            }

            // Daily limit of 10 rewarded games
            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            if (State.MinigamesDailyDate != today)
            {
                State.MinigamesDailyDate = today;
                State.MinigamesDailyCount = 0;
            }

            cloversAwarded = 0;
            if (State.MinigamesDailyCount < 10)
            {
                // clovers = min(40, score / 10)
                cloversAwarded = Math.Min(40, Math.Max(0, score / 10));
                if (cloversAwarded > 0)
                {
                    AddClovers(cloversAwarded);
                }
                State.MinigamesDailyCount++;
            }

            // mood +15 after a game
            ChangeNeed(Need.Mood, 15.0);

            Count("minigames_played");
            Count("minigame_" + gameId);

            return isNewRecord;
        }

        private static readonly string[] DefaultVegetableIds = new[]
        {
            "bell_pepper", "cucumber", "parsley", "carrot", "kale"
        };

        /// <summary>
        /// Records eating an item: increments the total feedings counter,
        /// the item's counter and the dedicated "eaten_<id>" counter.
        /// </summary>
        public void RecordFoodEaten(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return;
            Count("feedings");
            Count(itemId);
            Count("eaten_" + itemId.ToLowerInvariant());
        }

        /// <summary>
        /// Returns the id of the vegetable or treat the pig likes most
        /// (highest eaten counter > 0). Returns null if no vegetable has been eaten yet.
        /// </summary>
        public string GetFavoriteVegetable(System.Collections.Generic.IEnumerable<string> candidateVegetableIds = null)
        {
            var candidates = candidateVegetableIds ?? DefaultVegetableIds;
            string bestId = null;
            int maxCount = 0;

            foreach (var id in candidates)
            {
                if (string.IsNullOrEmpty(id)) continue;
                string key = "eaten_" + id.ToLowerInvariant();
                int count;
                if (!State.Stats.Counters.TryGetValue(key, out count))
                {
                    State.Stats.Counters.TryGetValue(id, out count);
                }

                if (count > maxCount)
                {
                    maxCount = count;
                    bestId = id;
                }
            }

            return bestId;
        }

        /// <summary>
        /// Checks whether the given item is currently the pig's favourite vegetable.
        /// </summary>
        public bool IsFavoriteVegetable(string itemId, System.Collections.Generic.IEnumerable<string> candidateVegetableIds = null)
        {
            if (string.IsNullOrEmpty(itemId)) return false;
            string fav = GetFavoriteVegetable(candidateVegetableIds);
            return !string.IsNullOrEmpty(fav) && string.Equals(fav, itemId, StringComparison.OrdinalIgnoreCase);
        }

        private void Raise<T>(EventHandler<T> handler, T args) where T : EventArgs
        {
            if (handler != null) handler(this, args);
        }
    }
}
