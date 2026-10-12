using System;
using System.Collections.Generic;
using System.Globalization;
using SwinkaCore.Time;

namespace SwinkaCore
{
    /// <summary>
    /// Mózg świnki: upływ czasu, potrzeby, wiek, więź, waluta i zdarzenia.
    /// Jedyne źródło prawdy o stanie gry. Wywołuj <see cref="Update"/> regularnie (np. co sekundę) z wątku gry.
    /// </summary>
    /// <remarks>Klasa nie jest bezpieczna wątkowo: używaj jej z jednego wątku.</remarks>
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

        // ---- Zdarzenia -------------------------------------------------------

        /// <summary>Potrzeba spadła poniżej progu "niska" (domyślnie 35).</summary>
        public event EventHandler<NeedEventArgs> NeedLow;

        /// <summary>Potrzeba spadła poniżej progu "krytyczna" (domyślnie 15).</summary>
        public event EventHandler<NeedEventArgs> NeedCritical;

        /// <summary>Zmiana etapu życia (np. Maluch -> Młodzik). Przy długim offline może przeskoczyć kilka etapów naraz.</summary>
        public event EventHandler<StageChangedEventArgs> StageChanged;

        /// <summary>Urodziny (co 17,4 dnia realnego). Po długim offline przychodzi osobno dla każdych zaległych urodzin.</summary>
        public event EventHandler<BirthdayEventArgs> Birthday;

        /// <summary>Nowy poziom więzi. Przy skoku o kilka poziomów przychodzi dla każdego poziomu.</summary>
        public event EventHandler<LevelUpEventArgs> LevelUp;

        // ---- Stan ------------------------------------------------------------

        public GameState State { get; }
        public IClock Clock { get; }
        public Balance Balance { get; }

        public Needs Needs { get { return State.Needs; } }

        /// <summary>Świnka śpi: energia rośnie zamiast spadać. Ustawia to warstwa zachowań (B2/B3).</summary>
        public bool IsSleeping { get; set; }

        public bool IsStarted { get; private set; }

        /// <summary>Ile czasu gry upłynęło offline przy ostatnim <see cref="Start"/>.</summary>
        public TimeSpan LastOfflineDuration { get; private set; }

        public PigAge Age
        {
            get { return PigAge.FromBirth(State.BirthDateUtc, Clock.UtcNow, Balance.PigDaysPerRealDay); }
        }

        public LifeStage Stage { get { return State.Stage; } }

        // ---- Upływ czasu -----------------------------------------------------

        /// <summary>
        /// Wywołaj raz po wczytaniu stanu (po podpięciu zdarzeń). Nalicza czas, gdy aplikacja była zamknięta,
        /// według zasad offline, i od razu zgłasza zaległe zdarzenia.
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
        /// Nalicza czas od ostatniego wywołania. Przerwa dłuższa niż <see cref="SwinkaCore.Balance.MaxOnlineGap"/>
        /// czasu realnego (uśpiony komputer) liczy się jak offline.
        /// </summary>
        public void Update()
        {
            if (!IsStarted) Start();

            var now = Clock.UtcNow;
            var elapsed = now - State.LastActiveUtc;
            // Zegar cofnięty (zmiana godziny w systemie, powrót z 60x do 1x): nie cofamy świnki w czasie.
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
            var newStage = Age.Stage;
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

        // ---- Opieka i nagrody ------------------------------------------------

        /// <summary>Zmienia potrzebę o podaną wartość (karmienie, zabawa...). Wynik obcinany do 0-100.</summary>
        public void ChangeNeed(Need need, double delta)
        {
            State.Needs[need] = State.Needs[need] + delta;
            CheckNeedThresholds();
        }

        /// <summary>
        /// Dodaje punkty więzi z uwzględnieniem dziennego limitu. Zwraca, ile faktycznie dodano.
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
            if (amount < 0) throw new ArgumentOutOfRangeException(nameof(amount), "Użyj TrySpendClovers do wydawania.");
            State.Clovers += amount;
        }

        /// <summary>Wydaje koniczynki, jeśli wystarczy. Stan nigdy nie schodzi poniżej 0.</summary>
        public bool TrySpendClovers(int amount)
        {
            if (amount < 0) throw new ArgumentOutOfRangeException(nameof(amount));
            if (State.Clovers < amount) return false;
            State.Clovers -= amount;
            return true;
        }

        // ---- Bobki i czystość klatki (B4) -----------------------------------

        public const int MaxPoops = 8;

        /// <summary>
        /// Przelicza potrzebę czystości klatki na podstawie liczby bobków:
        /// 0 bobków = 100%, 8 bobków = 0% (spadek o 12.5% na bobek).
        /// </summary>
        public void RecalculateCleanliness()
        {
            State.Needs.Cleanliness = Math.Max(0.0, 100.0 - (State.PoopCount * 12.5));
            CheckNeedThresholds();
        }

        /// <summary>
        /// Dodaje bobek (do limitu 8). Zwraca false jeśli limit został osiągnięty.
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
        /// Usuwa bobek (np. po kliknięciu): zmniejsza licznik, dodaje 1 koniczynkę i przelicza czystość.
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
            Count("zebrane_bobki");
            RecalculateCleanliness();
            return true;
        }

        /// <summary>
        /// Sprząta całą klatkę (np. w Domku): zeruje licznik bobków, czyści listę i przywraca czystość do 100.
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

        /// <summary>Zabiera przedmioty z ekwipunku, jeśli są. Przy zerze wpis znika.</summary>
        public bool TryRemoveItem(string itemId, int count = 1)
        {
            if (count <= 0) throw new ArgumentOutOfRangeException(nameof(count));
            int have = GetItemCount(itemId);
            if (have < count) return false;
            if (have == count) State.Inventory.Remove(itemId);
            else State.Inventory[itemId] = have - count;
            return true;
        }

        /// <summary>Zaznacza animację w Albumie zachowań. Zwraca true, jeśli zobaczona pierwszy raz.</summary>
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

        /// <summary>Zwiększa licznik w statystykach (np. "papryka", "popcorn").</summary>
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
        /// Zapisuje wynik minigry, nalicza nagrodę (koniczynki = min(40, punkty / 10), humor +15)
        /// z uwzględnieniem limitu maks. 10 nagradzanych gier dziennie oraz aktualizuje rekordy w GameState.
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

            // Dzienny limit 10 nagradzanych gier
            string today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            if (State.MinigamesDailyDate != today)
            {
                State.MinigamesDailyDate = today;
                State.MinigamesDailyCount = 0;
            }

            cloversAwarded = 0;
            if (State.MinigamesDailyCount < 10)
            {
                // koniczynki = min(40, punkty / 10)
                cloversAwarded = Math.Min(40, Math.Max(0, score / 10));
                if (cloversAwarded > 0)
                {
                    AddClovers(cloversAwarded);
                }
                State.MinigamesDailyCount++;
            }

            // humor +15 po grze
            ChangeNeed(Need.Mood, 15.0);

            Count("minigry_rozegrane");
            Count("minigra_" + gameId);

            return isNewRecord;
        }

        private static readonly string[] DefaultVegetableIds = new[]
        {
            "papryka", "ogorek", "natka", "marchewka", "jarmuz"
        };

        /// <summary>
        /// Rejestruje zjedzenie przedmiotu: zwiększa łączny licznik karmień,
        /// licznik danego przedmiotu oraz dedykowany licznik spożycia "eaten_<id>".
        /// </summary>
        public void RecordFoodEaten(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return;
            Count("karmienia");
            Count(itemId);
            Count("eaten_" + itemId.ToLowerInvariant());
        }

        /// <summary>
        /// Zwraca identyfikator warzywa/przysmaku, które świnka je najchętniej
        /// (ma najwyższy licznik spożycia > 0). Zwraca null, jeśli żadne warzywo nie zostało jeszcze zjedzone.
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
        /// Sprawdza, czy podany przedmiot jest aktualnie ulubionym warzywem świnki.
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
