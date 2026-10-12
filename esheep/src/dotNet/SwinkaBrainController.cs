using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using SwinkaCore;
using SwinkaCore.AI;
using SwinkaCore.Time;

namespace DesktopPet
{
    /// <summary>
    /// Koordynator integracji SwinkaCore z eSheep:
    /// zarządza sesją gry (GameSession), zegarem (ScaledClock), mózgiem AI (Brain),
    /// priorytetami fizyki oraz dystansem spaceru świnki.
    /// </summary>
    public sealed class SwinkaBrainController
    {
        private static SwinkaBrainController _instance;
        public static SwinkaBrainController Instance => _instance;

        private readonly ScaledClock _clock;
        private readonly GameSession _session;
        private readonly Brain _brain;

        // Stan spaceru (Requirement 2: świnka przechodzi dystans i staje)
        private int _targetWalkDistancePx;
        private int _traversedWalkDistancePx;
        private bool _isWalking;

        // Stan sekwencji wieloetapowych (np. sen: lie_down -> sleep -> wake_up)
        private string _subStage; // "entrance", "main", "exit"

        // Stan fizyki (Requirement 1: fizyka ma zawsze pierwszeństwo)
        private bool _isPhysicsActive;
        private string _physicsReason;

        // Stan bezczynności użytkownika (B3: sen przy bezczynności przez GetLastInputInfo)
        private TimeSpan _idleThreshold = TimeSpan.FromMinutes(10);
        private TimeSpan _currentRealIdleTime;
        private bool _isUserIdle;
        private bool _wasUserIdle;
        private bool _isWakingUp;

        // Czas ostatniej aktualizacji
        private DateTime _lastRealTime;

        public event Action<double> MultiplierChanged;
        public event Action<string> AnimationRequested;

        public SwinkaBrainController(double initialMultiplier = 1.0)
        {
            _instance = this;
            _lastRealTime = DateTime.UtcNow;

            _clock = new ScaledClock(initialMultiplier > 0 ? initialMultiplier : 1.0);
            _session = GameSession.Open(_clock, newPetName: "Świnka");
            _session.Start();

            _brain = Brain.CreateDefault(_session.Pet);

            // Pierwsza decyzja mózgu
            _brain.DecideNextAction();
            SetupActionState(_brain.CurrentAction);

            // Menedżer bobków na pulpicie (B4)
            SwinkaPoopManager.Initialize(this);
            SwinkaPoopManager.Instance.RestoreSavedPoops();

            // Menedżer karmienia i kładzenia jedzenia (B6)
            SwinkaFoodManager.Initialize(this);
        }

        public static void Initialize(double initialMultiplier = 1.0)
        {
            if (_instance == null)
            {
                new SwinkaBrainController(initialMultiplier);
            }
            else if (initialMultiplier > 0 && Math.Abs(_instance.ClockMultiplier - initialMultiplier) > 0.01)
            {
                _instance.SetClockMultiplier(initialMultiplier);
            }
        }

        // ---- Właściwości -----------------------------------------------------

        public ScaledClock Clock => _clock;
        public GameSession Session => _session;
        public Brain Brain => _brain;
        public SwinkaCore.Pet Pet => _session.Pet;
        public Needs Needs => _session.Pet.Needs;

        public double ClockMultiplier => _clock.Multiplier;
        public double TimeMultiplier => _clock.Multiplier;
        public void SetMultiplier(double m) => SetClockMultiplier(m);

        public bool IsPhysicsActive => _isPhysicsActive;
        public string PhysicsReason => _physicsReason;

        public ActionDecision CurrentAction => _brain.CurrentAction;
        public TimeSpan RemainingDuration => _brain.RemainingDuration;

        public bool IsWalking => _isWalking;
        public int TargetWalkDistancePx => _targetWalkDistancePx;
        public int TraversedWalkDistancePx => _traversedWalkDistancePx;
        public string SubStage => _subStage;

        public TimeSpan IdleThreshold
        {
            get => _idleThreshold;
            set => _idleThreshold = value > TimeSpan.Zero ? value : TimeSpan.FromSeconds(5);
        }

        public TimeSpan CurrentRealIdleTime => _currentRealIdleTime;
        public bool IsUserIdle => _isUserIdle;
        public bool IsWakingUp => _isWakingUp;

        public void SetTestIdleThreshold(bool enableTest10s)
        {
            _idleThreshold = enableTest10s ? TimeSpan.FromSeconds(10) : TimeSpan.FromMinutes(10);
            Log(string.Format("[Test] Zmieniono próg bezczynności na: {0:0}s", _idleThreshold.TotalSeconds));
        }

        public bool IsTestIdleThresholdActive => _idleThreshold.TotalSeconds <= 30;

        // ---- Przełączanie zegara (Requirement 4) -----------------------------

        public void SetClockMultiplier(double multiplier)
        {
            if (multiplier <= 0) return;
            _clock.Multiplier = multiplier;
            MultiplierChanged?.Invoke(multiplier);
            Log(string.Format("[Zegar] Zmieniono mnożnik czasu na: {0:0.#}x", multiplier));
        }

        public void ToggleSpeed60x()
        {
            if (Math.Abs(_clock.Multiplier - 60.0) < 0.1)
            {
                SetClockMultiplier(1.0);
            }
            else
            {
                SetClockMultiplier(60.0);
            }
        }

        // ---- Pętla czasu -----------------------------------------------------

        public void Update()
        {
            DateTime nowReal = DateTime.UtcNow;
            TimeSpan realElapsed = nowReal - _lastRealTime;
            if (realElapsed <= TimeSpan.Zero) return;
            _lastRealTime = nowReal;

            // Ograniczenie kroku czasu do 1s realnej, aby uniknąć skoków przy pauzach okna
            if (realElapsed > TimeSpan.FromSeconds(1.0))
            {
                realElapsed = TimeSpan.FromSeconds(1.0);
            }

            TimeSpan gameElapsed = TimeSpan.FromTicks((long)(realElapsed.Ticks * _clock.Multiplier));

            // 1. Sprawdzenie bezczynności użytkownika przez Win32 GetLastInputInfo (B3)
            TimeSpan realIdle = Win32Input.GetIdleTime();
            _currentRealIdleTime = realIdle;

            // Przy przyspieszonym zegarze gry (np. 60x w trybie testowym) czas bezczynności gry rośnie szybciej
            TimeSpan effectiveIdle = TimeSpan.FromTicks((long)(realIdle.Ticks * (_clock.Multiplier > 1.0 ? _clock.Multiplier : 1.0)));

            bool isIdle = (realIdle >= _idleThreshold) || (effectiveIdle >= _idleThreshold);
            _isUserIdle = isIdle;

            // Przekazanie bezczynności do Brain jako warunek (nie jako twarde wymuszenie)
            _brain.IsUserIdle = isIdle;
            _brain.UserIdleDuration = effectiveIdle;

            // Reakcja na zmianę stanu bezczynności
            if (isIdle && !_wasUserIdle)
            {
                _wasUserIdle = true;
                Log(string.Format("[Bezczynność] Wykryto bezczynność użytkownika (realny: {0:0}s, efektywny: {1:0}s, próg: {2:0}s).",
                    realIdle.TotalSeconds, effectiveIdle.TotalSeconds, _idleThreshold.TotalSeconds));

                // Świnka nie jest w trakcie fizyki ani snu -> pozwól Brain rozważyć sen jako kolejną akcję
                if (!_isPhysicsActive && !_isWakingUp && !IsCurrentlySleeping())
                {
                    var newAction = _brain.DecideNextAction();
                    SetupActionState(newAction);
                }
            }
            else if (!isIdle && _wasUserIdle)
            {
                _wasUserIdle = false;
                Log(string.Format("[Aktywność] Wykryto ruch myszką lub klawiaturą po {0:0}s bezczynności.", realIdle.TotalSeconds));

                // B3: Ruch myszką budzi ją przez wake_up, nie natychmiast!
                if (IsCurrentlySleeping() && !_isWakingUp)
                {
                    TriggerWakeUp();
                }
            }

            // Aktualizacja Pet i AutoSaver
            _session.Tick();

            // Aktualizacja bobków (B4: odliczanie czasu gry, aktualizacja pozycji na oknach)
            SwinkaPoopManager.Instance?.Update(gameElapsed);

            // Aktualizacja mechaniki karmienia (B6)
            SwinkaFoodManager.Instance?.Update(gameElapsed);

            bool isFoodActive = SwinkaFoodManager.Instance != null && SwinkaFoodManager.Instance.State != FoodInteractionState.None;

            // Aktualizacja Brain (tylko gdy nie ma fizyki, nie trwa wybudzanie i nie trwa interakcja z jedzeniem)
            if (!_isPhysicsActive && !isFoodActive)
            {
                var beforeAction = _brain.CurrentAction;
                if (!_isWakingUp)
                {
                    _brain.Update(gameElapsed);

                    // Sprawdź czy Brain zmienił akcję po upływie czasu
                    if (_brain.CurrentAction != null && !object.ReferenceEquals(_brain.CurrentAction, beforeAction))
                    {
                        SetupActionState(_brain.CurrentAction);
                    }
                }
            }
        }

        // ---- Obsługa fizyki (Requirement 1: Priorytet fizyki) ----------------

        public void InterruptPhysics(string reason)
        {
            if (!_isPhysicsActive)
            {
                _isPhysicsActive = true;
                _physicsReason = reason ?? "physics";
                _brain.Interrupt(_physicsReason);
                Log(string.Format("[Fizyka] Akcja przerwana przez fizykę: {0}", _physicsReason));
            }
        }

        public void ResumePhysics()
        {
            if (_isPhysicsActive)
            {
                _isPhysicsActive = false;
                _physicsReason = null;
                var resumed = _brain.Resume();
                SetupActionState(resumed);
                Log(string.Format("[Fizyka] Wznowienie Brain po fizyce. Akcja: {0} ({1})",
                    resumed.ActionId, resumed.AnimationName));
            }
        }

        // ---- Obsługa spaceru (Requirement 2) --------------------------------

        public void StepWalk(int deltaPx)
        {
            if (!_isWalking) return;
            _traversedWalkDistancePx += Math.Abs(deltaPx);

            if (_traversedWalkDistancePx >= _targetWalkDistancePx)
            {
                // Świnka przeszła zadany dystans i staje
                _isWalking = false;
                Log(string.Format("[Spacer] Osiągnięto dystans {0}/{1} px - świnka staje.",
                    _traversedWalkDistancePx, _targetWalkDistancePx));
            }
        }

        public void StopWalk()
        {
            _isWalking = false;
        }

        // ---- Interakcje z menu (Karmienie, Zawołaj) --------------------------

        public void RequestAnimation(string animationName)
        {
            if (string.IsNullOrEmpty(animationName)) return;
            AnimationRequested?.Invoke(animationName);
        }

        public void Feed(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return;

            if (string.Equals(itemId, "siano", StringComparison.OrdinalIgnoreCase))
            {
                // Siano jest zawsze bez limitu - kładziemy na pulpicie (B6)
                if (SwinkaFoodManager.Instance != null)
                {
                    SwinkaFoodManager.Instance.SpawnFood("siano");
                }
                return;
            }

            // Przedmioty z ekwipunku
            if (_session.Pet.TryRemoveItem(itemId, 1))
            {
                if (SwinkaFoodManager.Instance != null)
                {
                    SwinkaFoodManager.Instance.SpawnFood(itemId);
                }
            }
            else
            {
                Log(string.Format("[Karmienie] Brak przedmiotu {0} w ekwipunku.", itemId));
            }
        }

        public void CallPet()
        {
            _session.Pet.AddBondPoints(1);
            _session.Pet.Count("zawolania");
            RequestAnimation("wheek");
            Log(string.Format("[Zawołaj] Zawołano świnkę. Punkty więzi: {0} (poziom {1})",
                _session.Pet.State.Bond.Points, _session.Pet.State.Bond.Level));
        }

        public void PetPig()
        {
            if (_session?.Pet != null)
            {
                _session.Pet.Needs.Mood = Math.Min(100.0, _session.Pet.Needs.Mood + 3.0);
                _session.Pet.Count("glaskanie");
                _session.Pet.AddBondPoints(1);
                Log(string.Format("[Głaskanie] Pogłaskano świnkę (+3 humoru). Humor: {0:0.#}%",
                    _session.Pet.Needs.Mood));
            }
            RequestAnimation("purr_pet");
        }

        public void CleanPoop(string poopId = null)
        {
            _session?.Pet?.CleanPoop(poopId);
        }

        public void SpawnPoopNow()
        {
            SwinkaPoopManager.Instance?.TrySpawnPoop(force: true);
        }

        // ---- Wybór kolejnej animacji dla silnika eSheep ----------------------

        public string GetCurrentDesiredAnimation()
        {
            if (_isPhysicsActive || (SwinkaFoodManager.Instance != null && SwinkaFoodManager.Instance.State != FoodInteractionState.None))
            {
                // Gdy fizyka lub karmienie jest aktywne, eSheep/FoodManager steruje animacjami bezpośrednio
                return null;
            }

            var action = _brain.CurrentAction;
            if (action == null)
            {
                var newAction = _brain.DecideNextAction();
                SetupActionState(newAction);
                action = newAction;
            }

            // Sekwencje z wejściem (np. sen: lie_down -> sleep -> wake_up)
            if (action.Definition.EntryAnimation != null && _subStage == "entrance")
            {
                return action.Definition.EntryAnimation;
            }
            if ((action.Definition.ExitAnimation != null || _isWakingUp) && _subStage == "exit")
            {
                return action.Definition.ExitAnimation ?? "wake_up";
            }

            // Domyślna animacja akcji (np. idle, walk, eat, sniff, popcorn, scratch...)
            return action.AnimationName;
        }

        /// <summary>
        /// Wywoływane przez FormPet gdy sekwencja animacji dobiegła końca (AnimationStep >= TotalSteps).
        /// Zwraca nazwę następnej animacji lub decyduje o kolejnym kroku.
        /// </summary>
        public string OnAnimationSequenceFinished(string currentAnimationName)
        {
            if (_isPhysicsActive || (SwinkaFoodManager.Instance != null && SwinkaFoodManager.Instance.State != FoodInteractionState.None))
            {
                return null;
            }

            var action = _brain.CurrentAction;
            if (action == null)
            {
                action = _brain.DecideNextAction();
                SetupActionState(action);
                return action.AnimationName;
            }

            // Jeśli trwał etap wejściowy (np. lie_down) -> przejdź do właściwego snu (sleep)
            if (_subStage == "entrance" && currentAnimationName == action.Definition.EntryAnimation)
            {
                if (_isWakingUp || _subStage == "exit")
                {
                    // Ruch myszką nastąpił w trakcie kładzenia się -> od razu wybudzanie
                    _subStage = "exit";
                    return action.Definition.ExitAnimation ?? "wake_up";
                }
                _subStage = "main";
                return action.AnimationName;
            }

            // Jeśli trwało właściwe spanie (sleep) i nastąpił ruch myszką (_isWakingUp)
            if (_isWakingUp && currentAnimationName == action.AnimationName)
            {
                _subStage = "exit";
                return action.Definition.ExitAnimation ?? "wake_up";
            }

            // Jeśli trwał etap wyjściowy (np. wake_up) -> akcja zakończona, wybierz nową
            if ((_subStage == "exit" || _isWakingUp) && (currentAnimationName == action.Definition.ExitAnimation || currentAnimationName == "wake_up"))
            {
                _isWakingUp = false;
                _session.Pet.IsSleeping = false;
                var next = _brain.DecideNextAction();
                SetupActionState(next);
                Log(string.Format("[Budzenie] Zakończono animację wake_up. Świnka wstała i wybrała: {0} ({1})",
                    next.ActionId, next.AnimationName));
                return next.AnimationName;
            }

            // Jeśli to był spacer i dystans został ukończony -> koniec spaceru
            if (action.Definition.IsMovement)
            {
                if (!_isWalking)
                {
                    // Dystans przebyty: przechodzimy do kolejnej akcji Brain lub odpoczynku
                    var next = _brain.DecideNextAction();
                    SetupActionState(next);
                    return next.AnimationName;
                }
                else
                {
                    // Dystans jeszcze nieprzebyty: kontynuuj walk
                    return action.AnimationName;
                }
            }

            // Akcje jednokrotne (np. popcorn, wheek, scratch, poop)
            if (action.ActionId == "popcorn" || action.ActionId == "kwiczenie" || action.ActionId == "drapanie" || currentAnimationName == "poop")
            {
                var next = _brain.DecideNextAction();
                SetupActionState(next);
                return next.AnimationName;
            }

            // Czynności trwające dłużej (idle, eat, doze, sleep):
            // Jeśli czas akcji w Brain dobiegł końca -> sprawdź czy jest wyjście (exit animation)
            if (_brain.RemainingDuration <= TimeSpan.Zero)
            {
                if (action.Definition.ExitAnimation != null && _subStage != "exit")
                {
                    _subStage = "exit";
                    return action.Definition.ExitAnimation;
                }

                var next = _brain.DecideNextAction();
                SetupActionState(next);
                return next.AnimationName;
            }

            // Jeśli czas jeszcze trwa -> zapętl bieżącą animację
            return action.AnimationName;
        }

        private void SetupActionState(ActionDecision action)
        {
            if (action == null) return;

            if (action.Definition.EntryAnimation != null)
            {
                _subStage = "entrance";
            }
            else
            {
                _subStage = "main";
            }

            if (action.Definition.IsMovement && action.MoveDistancePx > 0)
            {
                _isWalking = true;
                _targetWalkDistancePx = action.MoveDistancePx;
                _traversedWalkDistancePx = 0;
            }
            else
            {
                _isWalking = false;
                _targetWalkDistancePx = 0;
                _traversedWalkDistancePx = 0;
            }

            // Świnka śpi: aktualizuj flagę w Pet, by energia rosła
            bool isSleeping = (action.ActionId == "sen" || action.ActionId == "sen_w_domku" || action.ActionId == "drzemka");
            _session.Pet.IsSleeping = isSleeping;
            if (!isSleeping)
            {
                _isWakingUp = false;
            }

            Log(string.Format("[Brain] Nowa czynność: {0} ({1}), czas: {2:0.#}s, dystans: {3}px, zysk: {4:0.00}",
                action.ActionId, action.AnimationName, action.Duration.TotalSeconds, action.MoveDistancePx, action.Score));
        }

        public bool IsCurrentlySleeping()
        {
            if (_session?.Pet != null && _session.Pet.IsSleeping) return true;
            var action = _brain.CurrentAction;
            if (action == null) return false;
            return (action.ActionId == "sen" || action.ActionId == "sen_w_domku" || action.ActionId == "drzemka");
        }

        public void TriggerWakeUp()
        {
            if (_isPhysicsActive) return;
            var action = _brain.CurrentAction;
            if (action == null) return;

            Log("[Budzenie] Rozpoczęcie procedury wybudzania świnki przez animację wake_up (nie natychmiast).");
            _isWakingUp = true;
            _subStage = "exit";
        }

        // ---- Telemetria i nakładka F9 (Narzędzie testowe - w Release wyłączone) -----

        private FormBrainOverlay _overlayForm;

        public void ToggleOverlay()
        {
#if DEBUG
            if (_overlayForm == null || _overlayForm.IsDisposed)
            {
                _overlayForm = new FormBrainOverlay(this);
                _overlayForm.Show();
            }
            else
            {
                if (_overlayForm.Visible)
                {
                    _overlayForm.Hide();
                }
                else
                {
                    _overlayForm.Show();
                    _overlayForm.BringToFront();
                }
            }
#endif
        }

        public IReadOnlyList<ActionScoreInfo> GetActionScores()
        {
            return _brain.EvaluateAllActionScores();
        }

        public BudgetReport GetBudgetReport()
        {
            return _brain.GetBudgetReport();
        }

        // ---- Zamykanie sesji -------------------------------------------------

        public void Close()
        {
            try
            {
                SwinkaFoodManager.Instance?.CancelActiveFood();
                SwinkaPoopManager.Instance?.CloseAllVisuals();
                Log("[Sesja] Zapisywanie stanu i zamykanie gry...");
                _session?.Close();
            }
            catch (Exception ex)
            {
                Log("[Błąd] Zapisywanie nie powiodło się: " + ex.Message);
            }
        }

        private static readonly object _logLock = new object();
        public static void Log(string message)
        {
            try
            {
                string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "behavior_log.txt");
                string line = string.Format("{0:yyyy-MM-dd HH:mm:ss.fff}|{1}\r\n", DateTime.Now, message);
                lock (_logLock)
                {
                    File.AppendAllText(path, line);
                }
            }
            catch { }
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    internal static class Win32Input
    {
        [DllImport("user32.dll")]
        public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

        public static TimeSpan GetIdleTime()
        {
            var lii = new LASTINPUTINFO();
            lii.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
            if (GetLastInputInfo(ref lii))
            {
                uint tickCount = (uint)Environment.TickCount;
                unchecked
                {
                    uint idleMs = tickCount - lii.dwTime;
                    return TimeSpan.FromMilliseconds(idleMs);
                }
            }
            return TimeSpan.Zero;
        }
    }
}
