using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using Cuy.Core;
using Cuy.Core.AI;
using Cuy.Core.Time;

namespace Cuy
{
    /// <summary>
    /// Coordinates Cuy.Core with the eSheep engine:
    /// manages the game session (GameSession), the clock (ScaledClock), the AI brain (Brain),
    /// physics priority and the pig's walking distance.
    /// </summary>
    public sealed class BrainController : IDisposable
    {
        private static BrainController _instance;
        public static BrainController Instance => _instance;

        private readonly ScaledClock _clock;
        private readonly GameSession _session;
        private readonly Brain _brain;

        // Offer toasts & adoption
        private readonly Queue<string> _pendingOfferToasts = new Queue<string>();
        private DateTime _lastOfferToastTime = DateTime.MinValue;
        private readonly object _offerToastLock = new object();
        private DateTime _lastOfferCheckTime = DateTime.UtcNow;
        private bool _isClosed;

        // Harvest notification (at most once per local day)
        private DateTime _lastHarvestNoticeDay = DateTime.MinValue;

        /// <summary>Home setting "notifyHarvest" (default on).</summary>
        public bool NotifyHarvest { get; set; } = true;

        /// <summary>True when a plot is ripe or orchard stock is above zero. Null until the farm state is wired in.</summary>
        public Func<bool> HarvestReadyCheck { get; set; }

        // Walk state (the pig walks the distance and stops)
        private int _targetWalkDistancePx;
        private int _traversedWalkDistancePx;
        private bool _isWalking;

        // State of multi-stage sequences (e.g. sleep: lie_down -> sleep -> wake_up)
        private string _subStage; // "entrance", "main", "exit"

        // Physics state (physics always has priority)
        private bool _isPhysicsActive;
        private string _physicsReason;

        // Behaviors
        private Cuy.Behaviors.BehaviorHost _behaviorHost;
        private Cuy.Behaviors.BehaviorContext _behaviorContext;
        private DateTime _lastBehaviorErrorTime = DateTime.MinValue;

        // User idle state (sleep when the user is idle, via GetLastInputInfo)
        private TimeSpan _idleThreshold = TimeSpan.FromMinutes(10);
        private TimeSpan _currentRealIdleTime;
        private bool _isUserIdle;
        private bool _wasUserIdle;
        private bool _isWakingUp;

        // Time of the last update
        private DateTime _lastRealTime;

        public event Action<double> MultiplierChanged;
        public event Action<string> AnimationRequested;
        public System.Collections.Generic.List<FormPet> ActivePets => FormPet.AllPets;

        public BrainController(double initialMultiplier = 1.0)
        {
            _instance = this;
            _lastRealTime = DateTime.UtcNow;

            _clock = new ScaledClock(initialMultiplier > 0 ? initialMultiplier : 1.0);
            _session = GameSession.Open(_clock, newPetName: "Cuy");
            if (_session.LoadResult.Source == Cuy.Core.Save.LoadSource.Backup)
            {
                Log("[WARN] save.json was damaged or missing. Loaded save.bak instead. " + _session.LoadResult.MainError);
            }
            _session.Start();
            _session.Pet.StageChanged += OnPetStageChanged;
            if (_session.Pet.Balance != null)
            {
                _session.Pet.Balance.ArrivalsActive = true;
            }
            _session.Pet.Birthday += OnPetBirthday;
            _session.Pet.OfferUnlocked += OnOfferUnlocked;
            _session.Pet.PigAdopted += OnPigAdopted;

            try
            {
                _session.Pet.CheckOffers(DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                Log("[WARN] BrainController initial CheckOffers: " + ex.Message);
            }

            _brain = Brain.CreateDefault(_session.Pet);

            // The brain's first decision
            _brain.DecideNextAction();
            SetupActionState(_brain.CurrentAction);

            // Desktop poop manager
            PoopManager.Initialize(this);
            PoopManager.Instance.RestoreSavedPoops();

            // Feeding and food placement manager
            FoodManager.Initialize(this);

            // Sound manager
            SoundManager.Initialize();
            _session.Pet.NeedLow += (s, e) =>
            {
                if (e.Need == Need.Satiety)
                {
                    SoundManager.Instance?.PlayWheek("hunger");
                }
            };
            _session.Pet.NeedCritical += (s, e) =>
            {
                if (e.Need == Need.Satiety)
                {
                    SoundManager.Instance?.PlayWheek("critical_hunger");
                }
            };
        }

        private DateTime _lastHandledBirthdayTime = DateTime.MinValue;

        private void OnPetBirthday(object sender, BirthdayEventArgs e)
        {
            try
            {
                Log($"[Birthday] year {e.Years}");
                if (HomeWindow.IsOpen) return;

                var now = DateTime.UtcNow;
                if ((now - _lastHandledBirthdayTime).TotalSeconds < 5.0) return;

                var petForm = FormPet.ActivePet ?? (FormPet.AllPets.Count > 0 ? FormPet.AllPets[0] : null);
                if (petForm != null && (petForm.ScriptHoldsPosition || petForm.IsDragging || petForm.IsTossing)) return;

                _lastHandledBirthdayTime = now;
                RequestAnimation("party");
                SoundManager.Instance?.PlayPopcorn();
                petForm?.ShowStatusMessage("Happy birthday!", 4000);
            }
            catch (Exception ex)
            {
                Log("[Birthday] Error in birthday handler: " + ex.Message);
            }
        }

        private void OnPetStageChanged(object sender, StageChangedEventArgs e)
        {
            try
            {
                string oldStage = e.OldStage.ToString();
                string newStage = e.NewStage.ToString();
                string stageKey = Cuy.Core.LifeStages.DataKey(e.NewStage);

                var anyPet = FormPet.ActivePet ?? (FormPet.AllPets.Count > 0 ? FormPet.AllPets[0] : null);
                var xml = anyPet?.Xml;
                if (xml != null)
                {
                    bool reloaded = xml.ReloadStageSprites(stageKey);
                    if (reloaded)
                    {
                        foreach (var petForm in FormPet.AllPets.ToArray())
                        {
                            PigLook.Apply(petForm, xml, stageKey);
                        }
                        Log($"[Stage] {oldStage} -> {newStage}, sheet reloaded");
                    }
                }
            }
            catch (Exception ex)
            {
                Log("[WARN] BrainController.OnPetStageChanged: " + ex.Message);
            }
        }

        private void OnOfferUnlocked(object sender, OfferUnlockedEventArgs e)
        {
            try
            {
                if (e == null || string.IsNullOrEmpty(e.PigId)) return;
                var catalog = _session?.Pet?.NamedPigs ?? Cuy.Core.Pigs.NamedPigCatalog.Current;
                var def = catalog?.Find(e.PigId);
                string name = def != null && !string.IsNullOrEmpty(def.Name) ? def.Name : e.PigId;
                string message = $"A new friend is waiting for adoption: {name}";
                lock (_offerToastLock)
                {
                    _pendingOfferToasts.Enqueue(message);
                }
                DeliverOfferToastIfDue();
            }
            catch (Exception ex)
            {
                Log("[WARN] BrainController.OnOfferUnlocked: " + ex.Message);
            }
        }

        private void DeliverOfferToastIfDue()
        {
            lock (_offerToastLock)
            {
                if (_pendingOfferToasts.Count == 0) return;

                DateTime now = DateTime.UtcNow;
                if ((now - _lastOfferToastTime).TotalSeconds >= 60.0)
                {
                    string toast = _pendingOfferToasts.Dequeue();
                    _lastOfferToastTime = now;
                    PostToast(toast);
                }
            }
        }

        private void CheckHarvestNotice()
        {
            try
            {
                if (!NotifyHarvest || HarvestReadyCheck == null) return;

                DateTime today = DateTime.Now.Date;
                if (_lastHarvestNoticeDay == today) return;

                int dayKey = today.Year * 10000 + today.Month * 100 + today.Day;
                var counters = Pet?.State?.Stats?.Counters;
                if (counters != null && counters.TryGetValue("harvest_notice_day", out int storedDay) && storedDay == dayKey)
                {
                    _lastHarvestNoticeDay = today;
                    return;
                }

                if (SoundManager.Instance != null && SoundManager.Instance.IsFullScreenOrBusy()) return;
                if (!HarvestReadyCheck()) return;

                _lastHarvestNoticeDay = today;
                if (counters != null) counters["harvest_notice_day"] = dayKey;
                Log("[Harvest] Notified: something is ready on the farm.");
                PostToast("Something is ready on the farm!");
            }
            catch (Exception ex)
            {
                Log("[WARN] BrainController.CheckHarvestNotice: " + ex.Message);
            }
        }

        private void PostToast(string text)
        {
            if (string.IsNullOrEmpty(text)) return;
            try
            {
                HomeWindow.PostToPage(new { type = "toast", text = text });
            }
            catch (Exception ex)
            {
                Log("[WARN] HomeWindow.PostToPage: " + ex.Message);
            }

            try
            {
                var petForm = FormPet.ActivePet ?? (FormPet.AllPets.Count > 0 ? FormPet.AllPets[0] : null);
                petForm?.ShowStatusMessage(text);
            }
            catch (Exception ex)
            {
                Log("[WARN] FormPet.ShowStatusMessage: " + ex.Message);
            }
        }

        private void OnPigAdopted(object sender, PigAdoptedEventArgs e)
        {
            try
            {
                if (e?.Pig == null) return;

                string toast = e.Memorial ? "Forever in the family" : $"Welcome, {e.Pig.Name}!";
                PostToast(toast);

                if (e.Memorial) return;

                var state = _session?.Pet?.State;
                if (state != null)
                {
                    if (state.ActivePigIds == null)
                    {
                        state.ActivePigIds = new List<string>();
                    }
                    if (state.ActivePigIds.Count < 2 && !state.ActivePigIds.Contains(e.Pig.Id))
                    {
                        state.ActivePigIds.Add(e.Pig.Id);
                    }
                }

                bool isActive = state != null && state.ActivePigIds != null && state.ActivePigIds.Take(2).Contains(e.Pig.Id);
                if (isActive)
                {
                    CreatePetWindowAndPeek(e.Pig);
                }
            }
            catch (Exception ex)
            {
                Log("[ERROR] BrainController.OnPigAdopted: " + ex.Message);
            }
        }

        private void CreatePetWindowAndPeek(Cuy.Core.Pigs.PigProfile pig)
        {
            if (pig == null) return;

            try
            {
                var existing = FormPet.ActivePet ?? (FormPet.AllPets.Count > 0 ? FormPet.AllPets[0] : null);
                if (existing == null)
                {
                    Log("[WARN] CreatePetWindowAndPeek: No existing FormPet available.");
                    return;
                }

                if (existing.InvokeRequired)
                {
                    existing.BeginInvoke(new Action(() => CreatePetWindowAndPeek(pig)));
                    return;
                }

                if (FormPet.AllPets.Count >= 2)
                {
                    Log("[Desktop] Already at max active desktop pets (2).");
                    return;
                }

                foreach (var p in FormPet.AllPets)
                {
                    if (p != null && !p.IsDisposed && p.Profile?.Id == pig.Id)
                    {
                        return;
                    }
                }

                var xml = existing.Xml;
                var animField = typeof(FormPet).GetField("Animations", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                var animations = animField?.GetValue(existing) as Animations;
                if (animations == null && xml != null)
                {
                    animations = new Animations(xml);
                    xml.LoadAnimations(animations);
                }

                if (xml == null || animations == null)
                {
                    Log("[WARN] Cannot create pet window: Xml or Animations missing.");
                    return;
                }

                var newPet = new FormPet(animations, xml);
                foreach (var sprite in xml.sprites)
                {
                    newPet.AddImage(sprite);
                }
                newPet.Profile = pig;
                PigLook.Apply(newPet, xml, PigLook.CurrentStageKey());
                newPet.Show(xml.spriteWidth, xml.spriteHeight);
                newPet.Play(true);

                Log($"[Desktop] Created pet window for adopted pig: {pig.Name} ({pig.Id})");

                var scene = new EdgePeekScene(EdgeSide.Left, () =>
                {
                    Log($"[Peek] Adopted pig peek for {pig.Name} completed.");
                }, firstRun: false);
                scene.Start();
            }
            catch (Exception ex)
            {
                Log("[ERROR] CreatePetWindowAndPeek: " + ex);
            }
        }

        public static void Initialize(double initialMultiplier = 1.0)
        {
            if (_instance == null)
            {
                new BrainController(initialMultiplier);
            }
            else if (initialMultiplier > 0 && Math.Abs(_instance.ClockMultiplier - initialMultiplier) > 0.01)
            {
                _instance.SetClockMultiplier(initialMultiplier);
            }
        }

        // ---- Properties ------------------------------------------------------

        public ScaledClock Clock => _clock;
        public GameSession Session => _session;
        public Brain Brain => _brain;
        public Cuy.Core.Pet Pet => _session.Pet;
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
            Log(string.Format("[Test] Idle threshold changed to: {0:0}s", _idleThreshold.TotalSeconds));
        }

        public bool IsTestIdleThresholdActive => _idleThreshold.TotalSeconds <= 30;

        // ---- Clock switching --------------------------------------------------

        public void SetClockMultiplier(double multiplier)
        {
            if (multiplier <= 0) return;
            _clock.Multiplier = multiplier;
            MultiplierChanged?.Invoke(multiplier);
            Log(string.Format("[Clock] Time multiplier changed to: {0:0.#}x", multiplier));
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

        // ---- Time loop -------------------------------------------------------

        public void Update()
        {
            DateTime nowReal = DateTime.UtcNow;
            TimeSpan realElapsed = nowReal - _lastRealTime;
            if (realElapsed <= TimeSpan.Zero) return;
            _lastRealTime = nowReal;

            // Limit the time step to 1 real second to avoid jumps when the window pauses
            if (realElapsed > TimeSpan.FromSeconds(1.0))
            {
                realElapsed = TimeSpan.FromSeconds(1.0);
            }

            TimeSpan gameElapsed = TimeSpan.FromTicks((long)(realElapsed.Ticks * _clock.Multiplier));

            // 1. Check user idleness via Win32 GetLastInputInfo
            TimeSpan realIdle = Win32Input.GetIdleTime();
            _currentRealIdleTime = realIdle;

            // With an accelerated game clock (e.g. 60x in test mode) game idle time grows faster
            TimeSpan effectiveIdle = TimeSpan.FromTicks((long)(realIdle.Ticks * (_clock.Multiplier > 1.0 ? _clock.Multiplier : 1.0)));

            bool isIdle = (realIdle >= _idleThreshold) || (effectiveIdle >= _idleThreshold);
            _isUserIdle = isIdle;

            // Pass idleness to Brain as a condition (not a hard override)
            _brain.IsUserIdle = isIdle;
            _brain.UserIdleDuration = effectiveIdle;

            // React to idle state changes
            if (isIdle && !_wasUserIdle)
            {
                _wasUserIdle = true;
                Log(string.Format("[Idle] User idle detected (real: {0:0}s, effective: {1:0}s, threshold: {2:0}s).",
                    realIdle.TotalSeconds, effectiveIdle.TotalSeconds, _idleThreshold.TotalSeconds));

                // The pig is not in physics or asleep -> let Brain consider sleep as the next action
                if (!_isPhysicsActive && !_isWakingUp && !IsCurrentlySleeping())
                {
                    var newAction = _brain.DecideNextAction();
                    SetupActionState(newAction);
                }
            }
            else if (!isIdle && _wasUserIdle)
            {
                _wasUserIdle = false;
                Log(string.Format("[Activity] Mouse or keyboard input after {0:0}s of idleness.", realIdle.TotalSeconds));

                // Mouse movement wakes it through wake_up, not instantly!
                if (IsCurrentlySleeping() && !_isWakingUp)
                {
                    TriggerWakeUp();
                }
            }

            // Update Pet and AutoSaver
            _session.Tick();

            // Periodic slow tick for offers (~1 minute)
            if ((nowReal - _lastOfferCheckTime).TotalSeconds >= 60.0)
            {
                _lastOfferCheckTime = nowReal;
                try
                {
                    _session?.Pet?.CheckOffers(nowReal);
                }
                catch (Exception ex)
                {
                    Log("[WARN] BrainController slow tick CheckOffers: " + ex.Message);
                }
                CheckHarvestNotice();
            }

            DeliverOfferToastIfDue();

            // Update poops (count down game time, update positions on windows)
            PoopManager.Instance?.Update(gameElapsed);

            // Update the feeding mechanics
            FoodManager.Instance?.Update(gameElapsed);

            // Update crunching sounds while eating
            SoundManager.Instance?.UpdateEating(gameElapsed);

            // Update cursor interactions
            if (ScriptAnimation == null) InteractionManager.Instance?.Update(gameElapsed); // no cursor reactions during the intro

            Cuy.Features.HomeFeatures.TickAll(gameElapsed, this);

            if (_behaviorHost == null && _session?.Pet != null && FormPet.ActivePet != null)
            {
                _behaviorHost = new Cuy.Behaviors.BehaviorHost();
                var disabled = Program.MyData.GetDisabledBehaviors();
                foreach (var id in disabled) _behaviorHost.DisabledIds.Add(id);

                bool isBusy = ScriptAnimation != null || _isPhysicsActive || FormPet.ActivePet.CurrentAnimationName == "sulk";
                _behaviorContext = new Cuy.Behaviors.BehaviorContext(
                    _session.Pet,
                    FormPet.ActivePet,
                    this,
                    Log,
                    isBusy,
                    HomeWindow.IsOpen,
                    (anim) => { if (ScriptAnimation != null) return false; return ForceAction(anim); }
                );
                _behaviorHost.Start(_behaviorContext);
            }

            if (_behaviorHost != null && realElapsed.TotalSeconds > 0)
            {
                _behaviorContext.ActivePet = FormPet.ActivePet;
                _behaviorContext.IsBusy = ScriptAnimation != null || _isPhysicsActive || FormPet.ActivePet?.CurrentAnimationName == "sulk";
                _behaviorContext.IsHomeOpen = HomeWindow.IsOpen;

                try
                {
                    _behaviorHost.Tick(realElapsed);
                }
                catch (Exception ex)
                {
                    if ((DateTime.UtcNow - _lastBehaviorErrorTime).TotalSeconds > 60)
                    {
                        Log($"[Behavior] host error: {ex.Message}");
                        _lastBehaviorErrorTime = DateTime.UtcNow;
                    }
                }
            }

            bool isFoodActive = FoodManager.Instance != null && FoodManager.Instance.State != FoodInteractionState.None;
            bool isInteractionActive = InteractionManager.Instance != null && InteractionManager.Instance.IsActiveInteraction;

            // Update Brain (only without physics, wake-up, food interaction or cursor interaction)
            if (!_isPhysicsActive && !isFoodActive && !isInteractionActive && ScriptAnimation == null)
            {
                var beforeAction = _brain.CurrentAction;
                if (!_isWakingUp)
                {
                    _brain.Update(gameElapsed);

                    // Check whether Brain changed the action after time passed
                    if (_brain.CurrentAction != null && !object.ReferenceEquals(_brain.CurrentAction, beforeAction))
                    {
                        SetupActionState(_brain.CurrentAction);
                    }
                }
            }
        }

        // ---- Physics handling (physics has priority) -------------------------

        public void InterruptPhysics(string reason)
        {
            if (!_isPhysicsActive)
            {
                _isPhysicsActive = true;
                _physicsReason = reason ?? "physics";
                _brain.Interrupt(_physicsReason);
                Log(string.Format("[Physics] Action interrupted by physics: {0}", _physicsReason));
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
                Log(string.Format("[Physics] Brain resumed after physics. Action: {0} ({1})",
                    resumed.ActionId, resumed.AnimationName));
            }
        }

        // ---- Walk handling ---------------------------------------------------

        public void StepWalk(int deltaPx)
        {
            if (!_isWalking) return;
            _traversedWalkDistancePx += Math.Abs(deltaPx);

            if (_traversedWalkDistancePx >= _targetWalkDistancePx)
            {
                // The pig has walked the distance and stops
                _isWalking = false;
                Log(string.Format("[Walk] Reached distance {0}/{1} px - the pig stops.",
                    _traversedWalkDistancePx, _targetWalkDistancePx));
            }
        }

        public void StopWalk()
        {
            _isWalking = false;
        }

        // ---- Menu interactions (Feed, Call) ----------------------------------

        public void RequestAnimation(string animationName)
        {
            if (string.IsNullOrEmpty(animationName)) return;
            AnimationRequested?.Invoke(animationName);
        }

        public void Feed(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return;

            if (string.Equals(itemId, "hay", StringComparison.OrdinalIgnoreCase))
            {
                // Hay is always unlimited - put it on the desktop
                if (FoodManager.Instance != null)
                {
                    FoodManager.Instance.SpawnFood("hay");
                }
                return;
            }

            // Items from the inventory
            if (_session.Pet.TryRemoveItem(itemId, 1))
            {
                if (FoodManager.Instance != null)
                {
                    FoodManager.Instance.SpawnFood(itemId);
                }
            }
            else
            {
                Log(string.Format("[Feeding] Item {0} is not in the inventory.", itemId));
            }
        }

        /// <summary>
        /// While set (first-run intro), the Brain makes no decisions and the pet keeps playing this animation.
        /// </summary>
        public string ScriptAnimation { get; set; }

        /// <summary>A scripted scene puts the pet on the ground itself: drop any fall/drag state from the spawn.</summary>
        public void ClearPhysicsForScript()
        {
            _isPhysicsActive = false;
            _physicsReason = null;
        }

        public void CallPet()
        {
            HomeWindow.CloseIfOpen(); // the pig comes out of Home first
            if (InteractionManager.Instance != null)
            {
                InteractionManager.Instance.CallPet();
                return;
            }

            _session.Pet.AddBondPoints(1);
            _session.Pet.Count("calls");
            RequestAnimation("wheek");
            Log(string.Format("[Call] Pig called. Bond points: {0} (level {1})",
                _session.Pet.State.Bond.Points, _session.Pet.State.Bond.Level));
        }

        public void PetPig()
        {
            if (InteractionManager.Instance != null)
            {
                InteractionManager.Instance.TriggerPetting();
                return;
            }

            if (_session?.Pet != null)
            {
                bool rewarded = _session.Pet.TryRewardPetting(3.0);
                Log(string.Format("[Petting] Pig petted ({0}). Mood: {1:0.#}%",
                    rewarded ? "+3 mood" : "hourly reward limit reached",
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
            PoopManager.Instance?.TrySpawnPoop(force: true);
        }

        // ---- Picking the next animation for the eSheep engine ----------------

        public string GetCurrentDesiredAnimation()
        {
            bool isInteractionActive = InteractionManager.Instance != null && InteractionManager.Instance.IsActiveInteraction;
            if (_isPhysicsActive || (FoodManager.Instance != null && FoodManager.Instance.State != FoodInteractionState.None) || isInteractionActive)
            {
                // While physics, feeding or cursor interaction is active, it drives the animations directly
                return null;
            }

            var action = _brain.CurrentAction;
            if (action == null)
            {
                var newAction = _brain.DecideNextAction();
                SetupActionState(newAction);
                action = newAction;
            }

            // Sequences with an entry (e.g. sleep: lie_down -> sleep -> wake_up)
            if (action.Definition.EntryAnimation != null && _subStage == "entrance")
            {
                return action.Definition.EntryAnimation;
            }
            if ((action.Definition.ExitAnimation != null || _isWakingUp) && _subStage == "exit")
            {
                return action.Definition.ExitAnimation ?? "wake_up";
            }

            // Default animation of the action (e.g. idle, walk, eat, sniff, popcorn, scratch...)
            return action.AnimationName;
        }

        /// <summary>
        /// Called by FormPet when an animation sequence ends (AnimationStep >= TotalSteps).
        /// Returns the next animation name or decides the next step.
        /// </summary>
        public string OnAnimationSequenceFinished(string currentAnimationName)
        {
            if (ScriptAnimation != null) return ScriptAnimation;

            bool isInteractionActive = InteractionManager.Instance != null && InteractionManager.Instance.IsActiveInteraction;
            if (_isPhysicsActive || (FoodManager.Instance != null && FoodManager.Instance.State != FoodInteractionState.None) || isInteractionActive)
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

            // If the entry stage was running (e.g. lie_down) -> go to the actual sleep
            if (_subStage == "entrance" && currentAnimationName == action.Definition.EntryAnimation)
            {
                if (_isWakingUp || _subStage == "exit")
                {
                    // Mouse moved while lying down -> wake up right away
                    _subStage = "exit";
                    return action.Definition.ExitAnimation ?? "wake_up";
                }
                _subStage = "main";
                return action.AnimationName;
            }

            // If the actual sleep was running and the mouse moved (_isWakingUp)
            if (_isWakingUp && currentAnimationName == action.AnimationName)
            {
                _subStage = "exit";
                return action.Definition.ExitAnimation ?? "wake_up";
            }

            // If the exit stage was running (e.g. wake_up) -> action done, pick a new one
            if ((_subStage == "exit" || _isWakingUp) && (currentAnimationName == action.Definition.ExitAnimation || currentAnimationName == "wake_up"))
            {
                _isWakingUp = false;
                _session.Pet.IsSleeping = false;
                var next = _brain.DecideNextAction();
                SetupActionState(next);
                Log(string.Format("[WakeUp] wake_up animation finished. The pig got up and chose: {0} ({1})",
                    next.ActionId, next.AnimationName));
                return next.AnimationName;
            }

            // If it was a walk and the distance is done -> end of the walk
            if (action.Definition.IsMovement)
            {
                if (!_isWalking)
                {
                    // Distance covered: move on to the next Brain action or rest
                    var next = _brain.DecideNextAction();
                    SetupActionState(next);
                    return next.AnimationName;
                }
                else
                {
                    // Distance not covered yet: keep walking
                    return action.AnimationName;
                }
            }

            // One-shot actions (e.g. popcorn, wheek, scratch, poop)
            if (action.ActionId == "popcorn" || action.ActionId == "wheeking" || action.ActionId == "scratching" || currentAnimationName == "poop")
            {
                var next = _brain.DecideNextAction();
                SetupActionState(next);
                return next.AnimationName;
            }

            // Longer actions (idle, eat, doze, sleep):
            // if the Brain action time is over -> check for an exit animation
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

            // If time is still running -> loop the current animation
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

            // The pig is asleep: update the flag in Pet so energy rises
            bool isSleeping = (action.ActionId == "sleep" || action.ActionId == "nap");
            _session.Pet.IsSleeping = isSleeping;
            if (!isSleeping)
            {
                _isWakingUp = false;
            }

            Log(string.Format("[Brain] New action: {0} ({1}), time: {2:0.#}s, distance: {3}px, score: {4:0.00}",
                action.ActionId, action.AnimationName, action.Duration.TotalSeconds, action.MoveDistancePx, action.Score));
#if DEBUG
            lock (_recentDecisions)
            {
                _recentDecisions.Enqueue(string.Format("{0:HH:mm:ss} {1} ({2}) score {3:0.00}",
                    DateTime.Now, action.ActionId, action.AnimationName, action.Score));
                while (_recentDecisions.Count > 20) _recentDecisions.Dequeue();
            }
#endif
        }

        public bool IsCurrentlySleeping()
        {
            if (_session?.Pet != null && _session.Pet.IsSleeping) return true;
            var action = _brain.CurrentAction;
            if (action == null) return false;
            return (action.ActionId == "sleep" || action.ActionId == "nap");
        }

        public void TriggerWakeUp()
        {
            if (_isPhysicsActive) return;
            var action = _brain.CurrentAction;
            if (action == null) return;

            Log("[WakeUp] Starting to wake the pig through the wake_up animation (not instantly).");
            _isWakingUp = true;
            _subStage = "exit";
        }

        // ---- Telemetry and the F9 overlay (test tool, disabled in Release) -----

        #if DEBUG
        private DebugOverlay _overlayForm;
#endif

        public void ToggleOverlay()
        {
#if DEBUG
            if (_overlayForm == null || _overlayForm.IsDisposed)
            {
                _overlayForm = new DebugOverlay(this);
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

        /// <summary>After sleep or hibernation: counts the time that passed once with the offline rules.</summary>
        public void OnResume()
        {
            _lastRealTime = DateTime.UtcNow;
            _session.Pet.Update();
            Log("[Power] Resumed from sleep. Offline rules applied.");
        }

        // ---- Closing the session ---------------------------------------------

        public bool ForceAction(string id)
        {
            if (HomeWindow.IsOpen) return false;

            bool isInteractionActive = InteractionManager.Instance != null && InteractionManager.Instance.IsActiveInteraction;
            if (_isPhysicsActive || (FoodManager.Instance != null && FoodManager.Instance.State != FoodInteractionState.None) || isInteractionActive || ScriptAnimation != null)
            {
                return false;
            }

            var decision = _brain.ForceAction(id);
            if (decision == null) return false;

            SetupActionState(decision);

            Log(string.Format("[Play] Forced action {0} ({1})", decision.ActionId, decision.AnimationName));
            return true;
        }

        public void Dispose()
        {
            Close();
        }

        public void Close()
        {
            if (_isClosed) return;
            _isClosed = true;

            try
            {
                if (_session?.Pet != null)
                {
                    _session.Pet.OfferUnlocked -= OnOfferUnlocked;
                    _session.Pet.PigAdopted -= OnPigAdopted;
                    _session.Pet.StageChanged -= OnPetStageChanged;
                    _session.Pet.Birthday -= OnPetBirthday;
                }
            }
            catch (Exception ex)
            {
                Log("[WARN] Unsubscribe on close: " + ex.Message);
            }
            try
            {
                try { _behaviorHost?.Stop(); } catch { }
                FoodManager.Instance?.CancelActiveFood();
                PoopManager.Instance?.CloseAllVisuals();
                SoundManager.Instance?.Dispose();
                Log("[Session] Saving the state and closing the game...");
                _session?.Close();
            }
            catch (Exception ex)
            {
                Log("[ERROR] Saving failed: " + ex.Message);
            }
        }

        private static readonly object _logLock = new object();
        private static int _errorCount;

        /// <summary>Number of [WARN]/[ERROR]/[FATAL] lines logged since start.</summary>
        public static int ExceptionCount => _errorCount;

#if DEBUG
        private static readonly Queue<string> _recentDecisions = new Queue<string>();

        /// <summary>Last 20 Brain decisions, oldest first.</summary>
        public static string[] RecentDecisions
        {
            get { lock (_recentDecisions) { return _recentDecisions.ToArray(); } }
        }
#endif

        public static void Log(string message)
        {
            if (message != null && (message.StartsWith("[WARN]") || message.StartsWith("[ERROR]") || message.StartsWith("[FATAL]")))
            {
                System.Threading.Interlocked.Increment(ref _errorCount);
            }
            try
            {
                string logsDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Cuy",
                    "logs"
                );
                Directory.CreateDirectory(logsDir);
                string logFile = Path.Combine(logsDir, "cuy.log");

                lock (_logLock)
                {
                    if (File.Exists(logFile))
                    {
                        var fi = new FileInfo(logFile);
                        if (fi.Length >= 1024 * 1024) // 1 MB
                        {
                            RotateLogs(logsDir, logFile);
                        }
                    }

                    string line = string.Format("{0:yyyy-MM-dd HH:mm:ss.fff}|{1}\r\n", DateTime.Now, message);
                    File.AppendAllText(logFile, line);
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[WARN] BrainController.Log: " + ex.Message); }
        }

        private static void RotateLogs(string logsDir, string logFile)
        {
            try
            {
                string log3 = Path.Combine(logsDir, "cuy.3.log");
                string log2 = Path.Combine(logsDir, "cuy.2.log");
                string log1 = Path.Combine(logsDir, "cuy.1.log");

                if (File.Exists(log3)) File.Delete(log3);
                if (File.Exists(log2)) File.Move(log2, log3);
                if (File.Exists(log1)) File.Move(log1, log2);
                if (File.Exists(logFile)) File.Move(logFile, log1);
            }
            catch (Exception ex) { Log("[WARN] BrainController.RotateLogs: " + ex.Message); }
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
