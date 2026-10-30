using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace Cuy
{
    public enum LookAtUserState
    {
        None,
        TurningToFront,
        TrackingCursor,
        TurningToSide
    }

    public enum CallPetState
    {
        None,
        ComeCalled,
        RunningToTarget,
        Greeting
    }

    /// <summary>
    /// Manages the pig's interactions with the cursor:
    /// 1. Petting (as in Pocket-Bird): 3 cursor turns within 1.5 s -> purr_pet + hearts, mood +5, bond +1 (max 10/h).
    ///    Petting a sleeping pig wakes it and lowers mood by 2.
    /// 2. Looking at you: cursor still for 1-3 s within 250 px -> turn, front_idle and tracking with front_look frames.
    ///    After 5 s or when the cursor moves away it turns back sideways. Cooldown 2 minutes.
    /// 3. Call: come_called, runs to the spot under the cursor on the taskbar/window, greet (wheek and hop).
    /// 4. Greeting after start: greet if bond >= 3, otherwise sniff.
    /// 5. More than 8 clicks in 3 s -> chatter and 30 s of sulking (does not come when called).
    /// </summary>
    public class InteractionManager
    {
        private readonly FormPet _petForm;

        // Petting
        private readonly List<DateTime> _reversalTimes = new List<DateTime>();
        private readonly List<DateTime> _rewardedPettingTimes = new List<DateTime>();
        private int _lastPetX = -1;
        private int _lastPetDir = 0;

        // Looking at you
        private LookAtUserState _lookState = LookAtUserState.None;
        private DateTime _lastLookAtUserTime = DateTime.MinValue;
        private Point _lastStationaryPos = Point.Empty;
        private double _stationarySeconds = 0.0;
        private double _lookStateTimer = 0.0;
        private double _trackingTotalSeconds = 0.0;

        // Call
        private CallPetState _callState = CallPetState.None;
        private int _callTargetX = 0;
        private double _callTimer = 0.0;

        // Annoyance (too many clicks)
        private readonly List<DateTime> _clickTimes = new List<DateTime>();
        private DateTime _offendedUntil = DateTime.MinValue;

        // Startup greeting
        private bool _hasGreetedOnStartup = false;

        public InteractionManager(FormPet petForm)
        {
            _petForm = petForm ?? throw new ArgumentNullException(nameof(petForm));
        }

        public static InteractionManager Instance { get; private set; }

        public static void Initialize(FormPet petForm)
        {
            Instance = new InteractionManager(petForm);
        }

        public bool IsOffended => DateTime.UtcNow < _offendedUntil;

        public double OffendedRemainingSeconds => IsOffended ? (_offendedUntil - DateTime.UtcNow).TotalSeconds : 0.0;

        public LookAtUserState LookState => _lookState;

        public CallPetState CallState => _callState;

        public bool IsActiveInteraction => _lookState != LookAtUserState.None || _callState != CallPetState.None;

        public IReadOnlyList<DateTime> RewardedPettingTimes => _rewardedPettingTimes;

        // ---- Petting ---------------------------------------------------------

        public void OnMouseMove(Point screenPos)
        {
            if (_petForm == null || _petForm.IsDisposed) return;
            if (_petForm.IsDragging || _petForm.IsTossing) return;

            Rectangle petBounds = _petForm.Bounds;
            if (petBounds.Contains(screenPos))
            {
                DateTime now = DateTime.UtcNow;
                int curX = screenPos.X;

                if (_lastPetX >= 0)
                {
                    int dx = curX - _lastPetX;
                    if (Math.Abs(dx) >= 6) // Movement threshold to filter out tiny mouse jitter
                    {
                        int dir = Math.Sign(dx);
                        if (_lastPetDir != 0 && dir != _lastPetDir)
                        {
                            _reversalTimes.Add(now);
                            _lastPetDir = dir;
                        }
                        else if (_lastPetDir == 0)
                        {
                            _lastPetDir = dir;
                        }
                        _lastPetX = curX;
                    }
                }
                else
                {
                    _lastPetX = curX;
                }

                // Check the 1.5 s window
                _reversalTimes.RemoveAll(t => (now - t).TotalSeconds > 1.5);

                if (_reversalTimes.Count >= 3)
                {
                    _reversalTimes.Clear();
                    _lastPetX = -1;
                    _lastPetDir = 0;
                    TriggerPetting();
                }
            }
            else
            {
                _lastPetX = -1;
                _lastPetDir = 0;
                _reversalTimes.RemoveAll(t => (DateTime.UtcNow - t).TotalSeconds > 1.5);
            }
        }

        public void TriggerPetting()
        {
            if (_petForm == null || _petForm.IsDisposed) return;

            var controller = BrainController.Instance;
            var pet = controller?.Pet;

            // Check whether the pig is asleep
            TAnimation currentAnim = _petForm.CurrentAnimation;
            string curAnimName = currentAnim.Name;
            bool isSleeping = (curAnimName == "sleep" ||
                               curAnimName == "doze" ||
                               curAnimName == "lie_down" ||
                               curAnimName == "sleep_house") ||
                              (pet != null && pet.IsSleeping);

            if (isSleeping)
            {
                if (pet != null)
                {
                    pet.IsSleeping = false;
                    pet.Needs.Mood = Math.Max(0.0, pet.Needs.Mood - 2.0);
                    BrainController.Log(string.Format(
                        "[Petting] Petting the sleeping pig wakes it! Mood -2 (mood now: {0:0.#}%).",
                        pet.Needs.Mood));
                    HomeWindow.NotifyStateChanged();
                }
                _petForm.PlayAnimationByName("wake_up");
            }
            else
            {
                // Awake pig: purr_pet + hearts (part of the animation)
                DateTime now = DateTime.UtcNow;
                _rewardedPettingTimes.RemoveAll(t => (now - t).TotalSeconds > 3600.0);

                if (_rewardedPettingTimes.Count < 10)
                {
                    _rewardedPettingTimes.Add(now);
                    if (pet != null)
                    {
                        pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 5.0);
                        pet.AddBondPoints(1);
                        pet.Count("pets");
                        BrainController.Log(string.Format(
                            "[Petting] Petting worked! purr_pet, mood +5 ({0:0.#}%), bond +1. Rewarded this hour: {1}/10.",
                            pet.Needs.Mood, _rewardedPettingTimes.Count));
                        HomeWindow.NotifyStateChanged();
                    }
                }
                else
                {
                    BrainController.Log(
                        "[Petting] Limit of 10 rewarded pets per hour reached. The pig only purrs (purr_pet).");
                }

                _petForm.PlayAnimationByName("purr_pet");
            }
        }

        // ---- Clicks and annoyance ---------------------------------------------

        public bool RegisterClick()
        {
            DateTime now = DateTime.UtcNow;
            _clickTimes.Add(now);
            _clickTimes.RemoveAll(t => (now - t).TotalSeconds > 3.0);

            if (_clickTimes.Count > 8)
            {
                _clickTimes.Clear();
                _offendedUntil = now.AddSeconds(30.0);

                // Interrupt current interactions
                _lookState = LookAtUserState.None;
                _callState = CallPetState.None;

                _petForm.HideStatusBubble();
                _petForm.PlayAnimationByName("chatter");

                BrainController.Log(
                    "[Annoyance] More than 8 clicks on the pig in 3 s! The pig chatters its teeth and sulks for 30 seconds.");
                return true;
            }

            return false;
        }

        // ---- Call ------------------------------------------------------------

        public bool CallPet()
        {
            if (_petForm == null || _petForm.IsDisposed) return false;

            if (IsOffended)
            {
                BrainController.Log(string.Format(
                    "[Call] The pig is sulking ({0:0.#}s left) and does not come when called!",
                    OffendedRemainingSeconds));
                _petForm.PlayAnimationByName("chatter");
                return false;
            }

            if (_petForm.IsDragging || _petForm.IsTossing) return false;

            // If looking at you was running, stop it in favour of the call
            _lookState = LookAtUserState.None;

            Point mousePos = Cursor.Position;
            int targetX = mousePos.X - (_petForm.Width / 2);

            // Limit the X position to the current surface
            if (_petForm.CurrentHwndWindow != IntPtr.Zero)
            {
                if (NativeMethods.GetWindowRect(new System.Runtime.InteropServices.HandleRef(_petForm, _petForm.CurrentHwndWindow), out NativeMethods.RECT rct))
                {
                    targetX = Math.Max(rct.Left, Math.Min(rct.Right - _petForm.Width, targetX));
                }
            }
            else
            {
                Rectangle screenArea = _petForm.ScreenArea;
                targetX = Math.Max(screenArea.Left, Math.Min(screenArea.Right - _petForm.Width, targetX));
            }

            _callTargetX = targetX;
            _callState = CallPetState.ComeCalled;
            _callTimer = 1.0; // 10 frames @ 100 ms = 1.0 s

            // Face the target
            _petForm.SetFacing(_callTargetX < _petForm.PositionX);
            _petForm.PlayAnimationByName("come_called");

            BrainController.Log(string.Format(
                "[Call] Pig called! come_called animation, target X={0}.", _callTargetX));

            return true;
        }

        // ---- Greeting after start --------------------------------------------

        public void CheckStartupGreeting()
        {
            if (_hasGreetedOnStartup) return;
            if (_petForm == null || _petForm.IsDisposed) return;

            _hasGreetedOnStartup = true;
            var pet = BrainController.Instance?.Pet;
            int bondLevel = pet?.State?.Bond?.Level ?? 1;

            if (pet != null && pet.IsUnlocked("greet_on_start"))
            {
                _petForm.PlayAnimationByName("greet");
                BrainController.Log(string.Format(
                    "[Greeting] Startup greeting: bond level {0} >= 3 -> greet (wheek and hop)!",
                    bondLevel));
            }
            else
            {
                _petForm.PlayAnimationByName("sniff");
                BrainController.Log(string.Format(
                    "[Greeting] Startup greeting: bond level {0} < 3 -> sniff.",
                    bondLevel));
            }
        }

        // ---- Update loop (called on every FormPet step) ----------------------

        public void Update(TimeSpan elapsed)
        {
            if (_petForm == null || _petForm.IsDisposed) return;
            if (_petForm.IsDragging || _petForm.IsTossing)
            {
                _lookState = LookAtUserState.None;
                _callState = CallPetState.None;
                return;
            }

            // 1. Check the startup greeting after the first landing
            if (!_hasGreetedOnStartup && (_petForm.IsOnTaskbar || _petForm.IsOnWindow))
            {
                CheckStartupGreeting();
            }

            // 2. Update the call state
            if (_callState != CallPetState.None)
            {
                UpdateCallState(elapsed);
                return; // The call takes priority over looking
            }

            // 3. Update the looking-at-you state
            UpdateLookAtUserState(elapsed);
        }

        private void UpdateCallState(TimeSpan elapsed)
        {
            switch (_callState)
            {
                case CallPetState.ComeCalled:
                    _callTimer -= elapsed.TotalSeconds;
                    if (_callTimer <= 0)
                    {
                        _callState = CallPetState.RunningToTarget;
                        _petForm.PlayAnimationByName("run");
                    }
                    break;

                case CallPetState.RunningToTarget:
                    int diff = _callTargetX - (int)_petForm.PositionX;
                    if (Math.Abs(diff) <= 8)
                    {
                        // Arrived: wheek and hop (greet)
                        _petForm.PositionX = _callTargetX;
                        _petForm.Location = new Point((int)_petForm.PositionX, (int)(_petForm.PositionY + _petForm.OffsetY));

                        _callState = CallPetState.Greeting;
                        _callTimer = 1.4; // 14 frames @ 100 ms = 1.4 s
                        _petForm.PlayAnimationByName("greet");

                        var pet = BrainController.Instance?.Pet;
                        if (pet != null)
                        {
                            pet.AddBondPoints(1);
                            pet.Count("calls");
                        }
                        BrainController.Log("[Call] The pig reached the cursor and greeted (greet)!");
                    }
                    else
                    {
                        _petForm.RunTowards(_callTargetX, 6);
                    }
                    break;

                case CallPetState.Greeting:
                    _callTimer -= elapsed.TotalSeconds;
                    if (_callTimer <= 0)
                    {
                        _callState = CallPetState.None;
                        _petForm.PlayAnimationByName("idle");
                    }
                    break;
            }
        }

        private void UpdateLookAtUserState(TimeSpan elapsed)
        {
            DateTime now = DateTime.UtcNow;
            Point cursorPos = Cursor.Position;
            Point petCenter = new Point((int)_petForm.PositionX + (_petForm.Width / 2), (int)_petForm.PositionY + (_petForm.Height / 2));
            double dist = Math.Sqrt(Math.Pow(cursorPos.X - petCenter.X, 2) + Math.Pow(cursorPos.Y - petCenter.Y, 2));

            switch (_lookState)
            {
                case LookAtUserState.None:
                    // Start conditions:
                    // - a resting pig (idle animation)
                    // - not sulking
                    // - 2 minute cooldown
                    // - cursor within 250 px
                    // - cursor still for 1-3 s
                    TAnimation restingAnim = _petForm.CurrentAnimation;
                    bool isResting = restingAnim.Name == "idle";
                    if (!isResting || IsOffended)
                    {
                        _stationarySeconds = 0.0;
                        _lastStationaryPos = cursorPos;
                        return;
                    }

                    if ((now - _lastLookAtUserTime).TotalSeconds < 120.0)
                    {
                        _stationarySeconds = 0.0;
                        _lastStationaryPos = cursorPos;
                        return;
                    }

                    if (dist <= 250.0)
                    {
                        double moveDist = Math.Sqrt(Math.Pow(cursorPos.X - _lastStationaryPos.X, 2) + Math.Pow(cursorPos.Y - _lastStationaryPos.Y, 2));
                        if (moveDist < 6.0)
                        {
                            _stationarySeconds += elapsed.TotalSeconds;
                        }
                        else
                        {
                            _stationarySeconds = 0.0;
                            _lastStationaryPos = cursorPos;
                        }

                        if (_stationarySeconds >= 1.5) // within 1-3 s
                        {
                            _stationarySeconds = 0.0;
                            _lookState = LookAtUserState.TurningToFront;
                            _lookStateTimer = 0.4; // turn: 4 frames @ 100 ms = 0.4 s
                            _petForm.PlayAnimationByName("turn");
                            BrainController.Log(
                                "[Looking] Cursor still within 250 px. The pig turns to face you (turn).");
                        }
                    }
                    else
                    {
                        _stationarySeconds = 0.0;
                        _lastStationaryPos = cursorPos;
                    }
                    break;

                case LookAtUserState.TurningToFront:
                    _lookStateTimer -= elapsed.TotalSeconds;
                    if (_lookStateTimer <= 0)
                    {
                        _lookState = LookAtUserState.TrackingCursor;
                        _trackingTotalSeconds = 0.0;
                    }
                    break;

                case LookAtUserState.TrackingCursor:
                    _trackingTotalSeconds += elapsed.TotalSeconds;

                    // End condition: 5 s passed or the cursor moved beyond 250 px
                    if (dist > 250.0 || _trackingTotalSeconds >= 5.0)
                    {
                        _lookState = LookAtUserState.TurningToSide;
                        _lookStateTimer = 0.3;
                        _lastLookAtUserTime = now;
                        _petForm.PlayAnimationByName("turn");
                        BrainController.Log(
                            "[Looking] Cursor moved away or 5 s passed. The pig turns back sideways to rest.");
                        return;
                    }

                    // Track the cursor with front_look frames (row 22: frames 352-356)
                    // 0 left (352), 1 right (353), 2 up (354), 3 down (355), 4 centre (356)
                    int dx = cursorPos.X - petCenter.X;
                    int dy = cursorPos.Y - petCenter.Y;

                    int frameIdx;
                    if (dist < 35.0)
                    {
                        frameIdx = 356; // 4: centre
                    }
                    else if (Math.Abs(dx) >= Math.Abs(dy))
                    {
                        frameIdx = dx < 0 ? 352 : 353; // 0: left, 1: right
                    }
                    else
                    {
                        frameIdx = dy < 0 ? 354 : 355; // 2: up, 3: down
                    }

                    _petForm.ShowCustomSprite(frameIdx);
                    break;

                case LookAtUserState.TurningToSide:
                    _lookStateTimer -= elapsed.TotalSeconds;
                    if (_lookStateTimer <= 0)
                    {
                        _lookState = LookAtUserState.None;
                        _petForm.ReturnFromCustomSprite();
                    }
                    break;
            }
        }
    }
}
