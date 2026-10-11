using System;
using System.Collections.Generic;
using System.IO;
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

        // Czas ostatniej aktualizacji
        private DateTime _lastRealTime;

        public event Action<double> MultiplierChanged;

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

            // Aktualizacja Pet i AutoSaver
            _session.Tick();

            // Aktualizacja Brain (tylko gdy nie ma fizyki)
            if (!_isPhysicsActive)
            {
                var beforeAction = _brain.CurrentAction;
                _brain.Update(gameElapsed);

                // Sprawdź czy Brain zmienił akcję po upływie czasu
                if (_brain.CurrentAction != null && !object.ReferenceEquals(_brain.CurrentAction, beforeAction))
                {
                    SetupActionState(_brain.CurrentAction);
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

        // ---- Wybór kolejnej animacji dla silnika eSheep ----------------------

        public string GetCurrentDesiredAnimation()
        {
            if (_isPhysicsActive)
            {
                // Gdy fizyka jest aktywna, eSheep steruje animacjami drag/toss/fall/land bezpośrednio
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
            if (action.Definition.ExitAnimation != null && _subStage == "exit")
            {
                return action.Definition.ExitAnimation;
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
            if (_isPhysicsActive)
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
                _subStage = "main";
                return action.AnimationName;
            }

            // Jeśli trwał etap wyjściowy (np. wake_up) -> akcja zakończona, wybierz nową
            if (_subStage == "exit" && currentAnimationName == action.Definition.ExitAnimation)
            {
                var next = _brain.DecideNextAction();
                SetupActionState(next);
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

            // Akcje jednokrotne (np. popcorn, wheek, scratch)
            if (action.ActionId == "popcorn" || action.ActionId == "kwiczenie" || action.ActionId == "drapanie")
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
            _session.Pet.IsSleeping = (action.ActionId == "sen" || action.ActionId == "sen_w_domku" || action.ActionId == "drzemka");

            Log(string.Format("[Brain] Nowa czynność: {0} ({1}), czas: {2:0.#}s, dystans: {3}px, zysk: {4:0.00}",
                action.ActionId, action.AnimationName, action.Duration.TotalSeconds, action.MoveDistancePx, action.Score));
        }

        // ---- Telemetria i nakładka F9 (Requirement 3) -----------------------

        private FormBrainOverlay _overlayForm;

        public void ToggleOverlay()
        {
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
}
