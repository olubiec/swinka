using System;
using System.Drawing;
using System.Linq;
using System.Windows.Forms;
using Cuy.Core;

namespace Cuy
{
    internal static class EdgePeekDirector
    {
        private static Timer _timer;
        private static DateTime _lastPeekTime = DateTime.MinValue;
        private static int _nextPeekMinutes = 60;
        private static Random _random = new Random();
        private static bool _started;

        private static int _walkPhase = 0;
        private static Timer _walkTimer;
        private static EdgeSide _targetSide;

        public static void EnsureStarted()
        {
            if (_started) return;
            _started = true;

            bool isTest = Environment.GetCommandLineArgs().Contains("--peek-test");
            if (isTest)
            {
                _lastPeekTime = DateTime.UtcNow;
                _nextPeekMinutes = 0; // Wait time will be artificially short in tick
            }
            else
            {
                _lastPeekTime = DateTime.UtcNow;
                _nextPeekMinutes = _random.Next(60, 181);
            }

            _timer = new Timer { Interval = 30000 }; // every 30s
            _timer.Tick += (s, e) => Tick(isTest);
            _timer.Start();

            BrainController.Log("[EdgePeekDirector] Started.");
        }

        private static void Tick(bool isTest)
        {
            try
            {
                if (ShouldPeek(isTest))
                {
                    StartPeekSequence();
                }
            }
            catch (Exception ex)
            {
                BrainController.Log("[ERROR] EdgePeekDirector.Tick: " + ex);
            }
        }

        private static bool ShouldPeek(bool isTest)
        {
            var brain = BrainController.Instance;
            if (brain == null) return false;
            if (brain.Pet?.State?.NeedsNaming == true) return false;
            if (brain.ScriptAnimation != null) return false; // First-run scene or another script is active

            TimeSpan elapsed = DateTime.UtcNow - _lastPeekTime;
            if (isTest)
            {
                if (elapsed.TotalSeconds < 20) return false;
            }
            else
            {
                if (elapsed.TotalMinutes < _nextPeekMinutes) return false;
            }

            if (Win32Input.GetIdleTime().TotalMinutes >= 2) return false;
            if (HomeWindow.IsOpen) return false;

            var pet = FormPet.ActivePet;
            if (pet == null || pet.IsDisposed || !pet.Visible) return false;
            if (brain.Pet?.IsSleeping == true) return false;
            if (FoodManager.Instance?.State != FoodInteractionState.None) return false;
            if (InteractionManager.Instance?.IsActiveInteraction == true || InteractionManager.Instance?.LookState == LookAtUserState.TrackingCursor) return false;
            if (pet.IsTossing) return false;
            if (SoundManager.Instance.IsFullScreenOrBusy()) return false;

            return true;
        }

        private static void StartPeekSequence()
        {
            var pet = FormPet.ActivePet;
            if (pet == null) return;

            Rectangle wa = Screen.PrimaryScreen.WorkingArea;
            double leftDist = pet.PositionX - wa.Left;
            double rightDist = wa.Right - (pet.PositionX + pet.Width);
            _targetSide = leftDist < rightDist ? EdgeSide.Left : EdgeSide.Right;

            BrainController.Log($"[Peek] Starting peek sequence towards {_targetSide} edge.");

            _lastPeekTime = DateTime.UtcNow;
            _nextPeekMinutes = _random.Next(60, 181);

            BrainController.Instance.ScriptAnimation = "walk";
            pet.PlayAnimationByName("walk");

            _walkPhase = 1;
            _walkTimer = new Timer { Interval = 50 };
            _walkTimer.Tick += WalkTick;
            _walkTimer.Start();
        }

        private static void WalkTick(object sender, EventArgs e)
        {
            var pet = FormPet.ActivePet;
            if (pet == null || pet.IsDisposed || _walkPhase == 0)
            {
                _walkTimer?.Stop();
                return;
            }

            Rectangle wa = Screen.PrimaryScreen.WorkingArea;
            double w = pet.Width;

            if (_walkPhase == 1) // Walking off screen
            {
                int targetX = _targetSide == EdgeSide.Left ? wa.Left - (int)w - 50 : wa.Right + 50;

                if (_targetSide == EdgeSide.Left)
                {
                    if (pet.PositionX > targetX)
                    {
                        pet.StepTowards(targetX, 2);
                    }
                    else
                    {
                        BrainController.Log("[Peek] Pig is fully off-screen, hiding for a bit.");
                        _walkPhase = 2; // Hide phase
                        pet.Visible = false; // Optionally hide it just in case
                        _walkTimer.Interval = _random.Next(5000, 20000); // 5-20s hide
                    }
                }
                else
                {
                    if (pet.PositionX < targetX)
                    {
                        pet.StepTowards(targetX, 2);
                    }
                    else
                    {
                        BrainController.Log("[Peek] Pig is fully off-screen, hiding for a bit.");
                        _walkPhase = 2; // Hide phase
                        pet.Visible = false;
                        _walkTimer.Interval = _random.Next(5000, 20000); // 5-20s hide
                    }
                }
            }
            else if (_walkPhase == 2) // Done hiding, start the scene
            {
                _walkTimer.Stop();
                _walkTimer.Dispose();
                _walkPhase = 0;

                pet.Visible = true;

                BrainController.Log("[Peek] Starting EdgePeekScene.");
                var scene = new EdgePeekScene(_targetSide, () => {
                    BrainController.Log("[Peek] EdgePeekScene completed.");
                }, firstRun: false);
                scene.Start();
            }
        }
    }
}
