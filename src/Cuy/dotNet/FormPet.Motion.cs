using System;
using System.Diagnostics;
using System.Globalization;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using Cuy.Core.Physics;

namespace Cuy
{
    public partial class FormPet
    {
        private readonly Stopwatch motionClock = Stopwatch.StartNew();
        private readonly MotionTrack motion = new MotionTrack();
        private readonly DragVelocity dragVelocity = new DragVelocity();
        private Timer motionTimer;
        private Point dragAnchor;
        private double tossUpdatedAt;
        private const double FallCacheMs = 75;     // window list reuse during a toss (D2.2)
        private double fallCacheAt = double.NegativeInfinity;
        private readonly List<IntPtr> fallHandles = new List<IntPtr>();
        private readonly List<Rectangle> fallRects = new List<Rectangle>();
        private static readonly bool perfEnabled = Environment.GetEnvironmentVariable("CUY_PERF") == "1";
        private readonly double[] perfTickMs = new double[300];
        private int perfCount, perfIndex, perfSlowGaps;
        private int perfGc0Start, perfGc1Start;   // GC.CollectionCount baseline at toss start (D2.4)
        private double perfLastTickAt = -1;
        private bool spritesFlipped;
        private readonly Dictionary<int, Image> flippedSprites = new Dictionary<int, Image>();
        private Timer followFallback;
        private IntPtr followHook, hookedWindow;
        private WinEventCallback followCallback;
        private const uint EventObjectLocationChange = 0x800B;
        private delegate void WinEventCallback(IntPtr hook, uint evt, IntPtr window, int objectId, int childId, uint thread, uint time);
        [DllImport("user32.dll")]
        private static extern IntPtr SetWinEventHook(uint min, uint max, IntPtr module, WinEventCallback callback, uint process, uint thread, uint flags);
        [DllImport("user32.dll")]
        private static extern bool UnhookWinEvent(IntPtr hook);
        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);

        // D2.4: assigning the same frame again would make PictureBox repaint for nothing.
        private void ShowSprite(Image frame)
        {
            if (!ReferenceEquals(pictureBox1.Image, frame)) pictureBox1.Image = frame;
        }

        private Image GetSprite(int index)
        {
            // Front-facing symmetrical sprites (front_idle, front_look 352-356, front_happy) must never be flipped
            if ((index >= 336 && index <= 356) || (index >= 373 && index <= 380))
            {
                return imageList1.Images[index];
            }

            if (!spritesFlipped) return imageList1.Images[index];
            Image image;
            if (!flippedSprites.TryGetValue(index, out image))
            {
                image = imageList1.Images[index];
                image.RotateFlip(RotateFlipType.RotateNoneFlipX);
                flippedSprites.Add(index, image);
            }
            return image;
        }

        private void SyncFollowHook()
        {
            if (hookedWindow == hwndWindow) return;
            if (followHook != IntPtr.Zero) UnhookWinEvent(followHook);
            followHook = IntPtr.Zero;
            hookedWindow = hwndWindow;
            if (hookedWindow != IntPtr.Zero)
            {
                uint process;
                uint thread = GetWindowThreadProcessId(hookedWindow, out process);
                if (thread != 0)
                    followHook = SetWinEventHook(EventObjectLocationChange, EventObjectLocationChange, IntPtr.Zero, followCallback, process, thread, 0);
                if (followHook == IntPtr.Zero) Debug.WriteLine("Window event hook unavailable; using timer fallback.");
            }
            followFallback.Enabled = hookedWindow != IntPtr.Zero;
        }

        /// <summary>
        /// Window rectangles for ShadowForm. Reuses the FallDetect list while it is younger than FallCacheMs (D2.3).
        /// </summary>
        internal IList<Rectangle> GetFallWindowRects()
        {
            double nowMs = motionClock.Elapsed.TotalMilliseconds;
            if (nowMs - fallCacheAt >= FallCacheMs)
            {
                RefreshFallWindows();
                fallCacheAt = nowMs;
            }
            return fallRects;
        }

        private void AdvanceToss(double now)
        {
            // Physics lives in Cuy.Core (TossPhysics). Pauses are bounded to 50 ms inside the step.
            var state = new TossState { X = PositionX, Y = PositionY, VelX = TossForce.X, VelY = tossVertVel };
            var bounds = new TossBounds { Screen = ScreenArea, Width = Width, Height = Height, FootOffsetY = CurrentAnimation.Start.OffsetY };
            // FallDetect reads PositionX, so the probe gets the X the step has already reached.
            TossStepResult step = TossPhysics.Step(state, now - tossUpdatedAt, bounds, (x, downStep) => { PositionX = x; return FallDetect(downStep); });
            tossUpdatedAt = now;
            if (!step.Stepped) return;
            PositionX = step.State.X;
            PositionY = step.State.Y;
            TossForce.X = (float)step.State.VelX;
            tossVertVel = step.State.VelY;
            // Same sink as the walking animations, so the feet touch the taskbar and landing does not jump.
            OffsetY = step.OffsetY;
            motion.Reset(PositionX, PositionY + OffsetY, now);
            RenderMotion(now);
            if (step.Landed)
            {
                if ((TossForce.X < 0 && !spritesFlipped) || (TossForce.X > 0 && spritesFlipped)) // face the throw direction
                {
                    IsMovingLeft = !IsMovingLeft;
                    spritesFlipped = !spritesFlipped;
                }
                IsTossing = false;
                ReportTossPerf();
                SetNewAnimation(step.Soft ? Animations.AnimationFallSoft : Animations.AnimationFallHard);
                pictureBox1.Image = GetSprite(CurrentAnimation.Sequence.Frames[0]);
                SyncFollowHook();
            }
        }

        private bool timerResolutionRequested;

        [DllImport("winmm.dll", ExactSpelling = true)]
        private static extern uint timeBeginPeriod(uint period);
        [DllImport("winmm.dll", ExactSpelling = true)]
        private static extern uint timeEndPeriod(uint period);

        private void SetMotionTimer(bool enabled)
        {
            if (enabled && !timerResolutionRequested)
            {
                timerResolutionRequested = timeBeginPeriod(1) == 0;
                if (!timerResolutionRequested) Debug.WriteLine("High-resolution motion timing unavailable; using default Windows timer precision.");
            }
            motionTimer.Enabled = enabled;
            if (!enabled && timerResolutionRequested)
            {
                timeEndPeriod(1);
                timerResolutionRequested = false;
            }
        }

        private void DisposeMotion()
        {
            Microsoft.Win32.SystemEvents.DisplaySettingsChanged -= DisplaySettingsChanged;
            // Releasing a captured PictureBox during disposal must not start a toss.
            IsDragging = false;
            IsTossing = false;
            if (motionTimer != null) SetMotionTimer(false);
            if (followFallback != null) followFallback.Stop();
            if (followHook != IntPtr.Zero) { UnhookWinEvent(followHook); followHook = IntPtr.Zero; }
            ShadowForm.DisposeShadow();
            foreach (Image image in flippedSprites.Values) image.Dispose();
            flippedSprites.Clear();
        }

        private void DisplaySettingsChanged(object sender, EventArgs e)
        {
            if (IsDisposed || Disposing || !IsHandleCreated) return;
            try { BeginInvoke((Action)RecoverDisplayLayout); }
            catch (InvalidOperationException) when (IsDisposed || Disposing || !IsHandleCreated)
            {
                // The form can close between the handle check and marshaling to its UI thread.
            }
        }

        private void RecoverDisplayLayout()
        {
            if (IsDisposed || Disposing) return;
            Screen nearest = Screen.FromRectangle(Bounds);
            Screen[] screens = Screen.AllScreens;
            DisplayIndex = Math.Max(0, Array.FindIndex(screens, screen => screen.DeviceName == nearest.DeviceName));
            Rectangle area = ScreenArea;
            if (IsDragging || Bounds.IntersectsWith(area)) return;
            // A pet on a removed display should reappear on the remaining desktop.
            hwndWindow = IntPtr.Zero;
            IsLeaving = false;
            pictureBox1.Location = Point.Empty;
            Size = pictureBox1.Size;
            int x = Math.Max(area.Left, Math.Min(Left, area.Right - Width));
            int y = Math.Max(area.Top, Math.Min(Top, area.Bottom - Height));
            Location = new Point(x, y);
            PositionX = x;
            PositionY = y - OffsetY;
            ResetMotion();
        }

        private void InitializeMotion()
        {
            Microsoft.Win32.SystemEvents.DisplaySettingsChanged += DisplaySettingsChanged;
            followCallback = (hook, evt, window, objectId, childId, thread, time) =>
            {
                if (!IsDisposed && !Disposing && window == hwndWindow && objectId == 0 && childId == 0 && !IsLeaving && !IsDragging)
                    FollowWindow();
            };
            followFallback = new Timer(components) { Interval = 100 };
            followFallback.Tick += (sender, e) =>
            {
                SyncFollowHook();
                if (!IsLeaving && !IsDragging) FollowWindow();
            };
            motionTimer = new Timer(components) { Interval = 8 };
            motionTimer.Tick += MotionTimer_Tick;
            pictureBox1.MouseMove += (sender, e) =>
            {
                if (IsDragging) UpdateDragPosition(Cursor.Position, motionClock.Elapsed.TotalMilliseconds);
            };
            pictureBox1.MouseCaptureChanged += (sender, e) =>
            {
                if (!IsDisposed && !Disposing && IsDragging && !pictureBox1.Capture)
                    PictureBox1_MouseUp(sender, new MouseEventArgs(MouseButtons.Left, 1, 0, 0, 0));
            };
        }

        private void ResetMotion()
        {
            motion.Reset(Left, Top, motionClock.Elapsed.TotalMilliseconds);
            SyncFollowHook();
            SetMotionTimer(IsDragging || IsTossing);
        }

        private void QueueMotion(int milliseconds)
        {
            double now = motionClock.Elapsed.TotalMilliseconds;
            if (!motion.Initialized) motion.Reset(Left, Top, now);
            SyncFollowHook();
            // 15% slack: a late animation tick (WinForms timers jitter by ~15 ms) must not stall the pet at the target.
            motion.MoveTo(PositionX, PositionY + OffsetY, now, milliseconds * 1.15);
            SetMotionTimer(true);
        }

        private void RenderMotion(double now)
        {
            PointF p = motion.Sample(now);
            Point position = new Point((int)Math.Round(p.X), (int)Math.Round(p.Y));
            if (Location != position) Location = position;
        }

        private void MotionTimer_Tick(object sender, EventArgs e)
        {
            if (!perfEnabled) { MotionTimerStep(); return; }
            double start = motionClock.Elapsed.TotalMilliseconds;
            if (perfLastTickAt >= 0 && start - perfLastTickAt > 20) perfSlowGaps++;
            perfLastTickAt = start;
            MotionTimerStep();
            perfTickMs[perfIndex] = motionClock.Elapsed.TotalMilliseconds - start;
            perfIndex = (perfIndex + 1) % perfTickMs.Length;
            if (perfCount < perfTickMs.Length) perfCount++;
        }

        // D0.2: frame-time diagnostics. Only active with CUY_PERF=1; the tick path stays allocation-free.
        private void ResetTossPerf()
        {
            perfCount = 0; perfIndex = 0; perfSlowGaps = 0; perfLastTickAt = -1;
            perfGc0Start = GC.CollectionCount(0); perfGc1Start = GC.CollectionCount(1);
        }

        private void ReportTossPerf()
        {
            if (!perfEnabled || perfCount == 0) return;
            double[] sorted = new double[perfCount];
            Array.Copy(perfTickMs, sorted, perfCount);
            Array.Sort(sorted);
            double sum = 0;
            foreach (double ms in sorted) sum += ms;
            double p95 = sorted[(int)Math.Ceiling(sorted.Length * 0.95) - 1];
            BrainController.Log(string.Format(CultureInfo.InvariantCulture,
                "[PERF] toss-perf ticks={0} min={1:F2} avg={2:F2} p95={3:F2} max={4:F2} gaps>20ms={5} gc0={6} gc1={7} (ms)",
                sorted.Length, sorted[0], sum / sorted.Length, p95, sorted[sorted.Length - 1], perfSlowGaps,
                GC.CollectionCount(0) - perfGc0Start, GC.CollectionCount(1) - perfGc1Start));
        }

        private void MotionTimerStep()
        {
            if (IsDisposed || Disposing) { SetMotionTimer(false); return; }
            double now = motionClock.Elapsed.TotalMilliseconds;
            if (IsDragging)
            {
                UpdateDragPosition(Cursor.Position, now);
                return;
            }
            if (IsTossing) AdvanceToss(now);
            else
            {
                SyncFollowHook();
                if (hwndWindow != IntPtr.Zero && !IsLeaving) FollowWindow();
                // FollowWindow may have rendered a newer timestamp. Never render backwards.
                if (motion.Initialized) RenderMotion(motionClock.Elapsed.TotalMilliseconds);
            }
            if (!IsTossing && !motion.IsMoving(now)) SetMotionTimer(false);
            ShadowForm.Update(this);
        }

        private void BeginSmoothDrag()
        {
            // Preserve the exact grab point, like dragging a normal window.
            SyncFollowHook();
            dragAnchor = PointToClient(Cursor.Position);
            PositionX = Left; PositionY = Top;
            OffsetY = 0;
            double now = motionClock.Elapsed.TotalMilliseconds;
            motion.Reset(Left, Top, now);
            dragVelocity.Reset(Left, Top, now);
            pictureBox1.Capture = true;
            SetMotionTimer(true);
        }

        private void UpdateDragPosition(Point cursor, double now)
        {
            Point position = new Point(cursor.X - dragAnchor.X, cursor.Y - dragAnchor.Y);
            PositionX = position.X; PositionY = position.Y;
            OffsetY = 0;
            dragVelocity.Add(PositionX, PositionY, now);
            motion.Reset(PositionX, PositionY, now);
            if (Location != position) Location = position;
            ShadowForm.Update(this);
        }
    }
}
