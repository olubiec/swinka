using System;
using System.Drawing;
using System.Windows.Forms;
using Cuy.Platform;

namespace Cuy.Behaviors
{
    public sealed class MouseFearBehavior : IDesktopBehavior
    {
        public string Id => "mouse_fear";

        private BehaviorContext _ctx;
        private MouseShakeMonitor _monitor;
        private readonly Random _random = new Random();

        private DateTime _lastShakeTime = DateTime.MinValue;
        private DateTime _lastFleeTime = DateTime.MinValue;
        private DateTime _lastApproachTime = DateTime.MinValue;
        private int _recentShakeCount;

        private bool _isFreezing;
        private TimeSpan _freezeRemaining;

        private bool _isFleeing;
        private TimeSpan _fleeWaitRemaining;
        private TimeSpan _cursorCalmDuration;
        private Point _lastCursorPos;
        private EdgeSide _fleeEdge;

        public void Start(BehaviorContext ctx)
        {
            _ctx = ctx;
            _monitor = new MouseShakeMonitor(() =>
            {
                var pet = _ctx.ActivePet;
                if (pet != null && !pet.IsDisposed && pet.Visible)
                {
                    return new Point(pet.Left + pet.Width / 2, pet.Top + pet.Height / 2);
                }
                return null;
            });
            _monitor.Shaken += OnShaken;
            _monitor.Start();
        }

        public void Tick(TimeSpan dt)
        {
            var pet = _ctx.ActivePet;
            if (pet == null || pet.IsDisposed) return;

            Point currentCursor = Cursor.Position;
            if (currentCursor == _lastCursorPos)
            {
                _cursorCalmDuration += dt;
            }
            else
            {
                _cursorCalmDuration = TimeSpan.Zero;
                _lastCursorPos = currentCursor;
            }

            // Handle freezing after startle
            if (_isFreezing)
            {
                _freezeRemaining -= dt;
                if (_freezeRemaining <= TimeSpan.Zero)
                {
                    _isFreezing = false;
                    if (pet.CurrentAnimationName == "freeze" || pet.CurrentAnimationName == "startle")
                    {
                        pet.PlayAnimationByName("idle");
                    }
                }
                return;
            }

            // Handle fleeing state
            if (_isFleeing)
            {
                _fleeWaitRemaining -= dt;
                if (_fleeWaitRemaining <= TimeSpan.Zero && _cursorCalmDuration >= TimeSpan.FromSeconds(5))
                {
                    // Return with peek
                    _isFleeing = false;
                    _ctx.Log("[Fear] cursor calm, returning with peek");
                    pet.Show();
                    var peekScene = new EdgePeekScene(_fleeEdge, () =>
                    {
                        pet.PlayAnimationByName("idle");
                    }, false);
                    peekScene.Start();
                }
                return;
            }

            // Approach cursor check for unlocked pigs
            if (_ctx.Pet != null && _ctx.Pet.IsUnlocked("approach_cursor") && !_ctx.IsBusy && !_ctx.Pet.IsSleeping && !_ctx.Pet.IsAway && !_ctx.IsHomeOpen)
            {
                Point petCenter = new Point(pet.Left + pet.Width / 2, pet.Top + pet.Height / 2);
                double dist = Math.Sqrt(Math.Pow(currentCursor.X - petCenter.X, 2) + Math.Pow(currentCursor.Y - petCenter.Y, 2));

                if (dist <= 300 && _cursorCalmDuration >= TimeSpan.FromSeconds(3))
                {
                    DateTime now = DateTime.UtcNow;
                    if ((now - _lastApproachTime) >= TimeSpan.FromMinutes(5) && pet.CurrentAnimationName == "idle")
                    {
                        _lastApproachTime = now;
                        _ctx.Log("[Fear] approaching calm cursor to sniff");
                        pet.SetFacing(currentCursor.X < petCenter.X);
                        pet.PlayAnimationByName("sniff");
                    }
                }
            }
        }

        private void OnShaken(Point cursorPoint)
        {
            var pet = _ctx.ActivePet;
            if (pet == null || pet.IsDisposed || _ctx.IsBusy || _ctx.Pet.IsAway || _ctx.Pet.IsSleeping || _ctx.IsHomeOpen || _isFleeing)
            {
                return;
            }

            DateTime now = DateTime.UtcNow;
            bool friendly = _ctx.Pet != null && _ctx.Pet.IsUnlocked("approach_cursor");

            if (friendly)
            {
                // Friendly pig: never flees, 50% chance to startle + freeze
                if (_random.NextDouble() < 0.5)
                {
                    _ctx.Log("[Fear] friendly pig startled");
                    SoundManager.Instance?.PlayFear();
                    pet.PlayAnimationByName("startle");
                    _isFreezing = true;
                    _freezeRemaining = TimeSpan.FromSeconds(2);
                }
                return;
            }

            // Normal pig: shake threshold divided by Pet.ActiveModifiers.Startle (clamped to at least 40% of original)
            const double baseShakes = 2.0;
            double startle = (_ctx?.Pet != null) ? _ctx.Pet.ActiveModifiers.Startle : 1.0;
            if (startle <= 0.0 || double.IsNaN(startle) || double.IsInfinity(startle))
            {
                startle = 1.0;
            }

            double effectiveThreshold = Math.Max(baseShakes * 0.4, baseShakes / startle);
            int shakesNeeded = Math.Max(1, (int)Math.Round(effectiveThreshold, MidpointRounding.AwayFromZero));

            if ((now - _lastShakeTime) > TimeSpan.FromSeconds(10))
            {
                _recentShakeCount = 0;
            }
            _recentShakeCount++;
            _lastShakeTime = now;

            if (_recentShakeCount >= shakesNeeded && (now - _lastFleeTime) >= TimeSpan.FromMinutes(5))
            {
                _recentShakeCount = 0;
                _lastFleeTime = now;
                _isFleeing = true;
                _isFreezing = false;
                _fleeWaitRemaining = TimeSpan.FromSeconds(_random.Next(5, 21)); // 5-20 s
                _ctx.Log($"[Fear] shake threshold reached ({shakesNeeded} shake(s) within 10s), fleeing to edge");
                SoundManager.Instance?.PlayFear();
                pet.PlayAnimationByName("flee");

                // Determine nearest edge
                var screen = Screen.FromControl(pet);
                int midX = screen.Bounds.Left + screen.Bounds.Width / 2;
                _fleeEdge = pet.Left < midX ? EdgeSide.Left : EdgeSide.Right;

                pet.Hide();
            }
            else
            {
                _ctx.Log("[Fear] mouse shake detected, startle and freeze");
                SoundManager.Instance?.PlayFear();
                pet.PlayAnimationByName("startle");
                _isFreezing = true;
                _freezeRemaining = TimeSpan.FromSeconds(2);
            }
        }

        public void Stop()
        {
            if (_monitor != null)
            {
                _monitor.Shaken -= OnShaken;
                _monitor.Stop();
                _monitor.Dispose();
                _monitor = null;
            }

            if (_isFleeing)
            {
                _isFleeing = false;
                _ctx?.ActivePet?.Show();
            }

            _recentShakeCount = 0;
        }
    }
}
