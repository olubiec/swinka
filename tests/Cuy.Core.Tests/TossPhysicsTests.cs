using System.Drawing;
using Cuy.Core.Physics;
using Xunit;

namespace Cuy.Core.Tests
{
    public class TossPhysicsTests
    {
        private static readonly Rectangle Wide = new Rectangle(0, 0, 10000, 1000);
        private static readonly Rectangle Small = new Rectangle(0, 0, 1000, 500);

        private static TossBounds Bounds(Rectangle screen, int width, int height, int footOffsetY = 0)
        {
            return new TossBounds { Screen = screen, Width = width, Height = height, FootOffsetY = footOffsetY };
        }

        private static void Near(double expected, double actual, double tolerance)
        {
            Assert.InRange(actual, expected - tolerance, expected + tolerance);
        }

        // Falls from rest for totalMs using steps of tickMs; no window, tall screen, so no landing.
        private static double FallDistance(int tickMs, int totalMs)
        {
            var state = new TossState { X = 100, Y = 0, VelX = 0, VelY = 0 };
            TossBounds bounds = Bounds(new Rectangle(0, 0, 1000, 2000), 10, 10);
            int elapsed = 0;
            while (elapsed < totalMs)
            {
                state = TossPhysics.Step(state, tickMs, bounds, null).State;
                elapsed += tickMs;
            }
            return state.Y;
        }

        // D1.1 (a): horizontal speed 30 px per 30 ms covers 10 px per 10 ms.
        [Fact]
        public void HorizontalToss_CoversExpectedDistance()
        {
            var state = new TossState { X = 0, Y = 0, VelX = 30, VelY = 0 };
            TossBounds bounds = Bounds(Wide, 10, 10);
            for (int i = 0; i < 10; i++)
            {
                state = TossPhysics.Step(state, 30, bounds, null).State;
            }
            Near(300, state.X, 1);
        }

        // D1.1 (c): a pause longer than 50 ms moves the pet as much as 50 ms.
        [Fact]
        public void PauseLongerThan50Ms_IntegratesLikeFiftyMs()
        {
            var state = new TossState { X = 100, Y = 100, VelX = 20, VelY = -10 };
            TossBounds bounds = Bounds(Wide, 10, 10);
            TossStepResult fifty = TossPhysics.Step(state, 50, bounds, null);
            TossStepResult pause = TossPhysics.Step(state, 500, bounds, null);
            Assert.True(pause.Stepped);
            Near(fifty.State.X, pause.State.X, 1e-9);
            Near(fifty.State.Y, pause.State.Y, 1e-9);
            Near(fifty.State.VelY, pause.State.VelY, 1e-9);
        }

        [Fact]
        public void ZeroTime_DoesNotStep()
        {
            var state = new TossState { X = 1, Y = 2, VelX = 30, VelY = 5 };
            TossStepResult result = TossPhysics.Step(state, 0, Bounds(Wide, 10, 10), null);
            Assert.False(result.Stepped);
            Near(1, result.State.X, 1e-9);
            Near(2, result.State.Y, 1e-9);
        }

        // D1.1 (d): bounce off the left and right edge reverses vx and multiplies it by -0.3.
        [Fact]
        public void LeftEdge_ReversesAndDampsVelocity()
        {
            var state = new TossState { X = 5, Y = 0, VelX = -30, VelY = 0 };
            TossStepResult result = TossPhysics.Step(state, 30, Bounds(Wide, 10, 10), null);
            Near(7.5, result.State.X, 1e-9);
            Near(9, result.State.VelX, 1e-9);
        }

        [Fact]
        public void RightEdge_ReversesAndDampsVelocity()
        {
            var state = new TossState { X = 9985, Y = 0, VelX = 30, VelY = 0 };
            TossStepResult result = TossPhysics.Step(state, 30, Bounds(Wide, 10, 10), null);
            Near(9982.5, result.State.X, 1e-9);
            Near(-9, result.State.VelX, 1e-9);
        }

        // D1.1 (e): the same trajectory for tick steps 8, 16 and 33 ms (528 ms is a multiple of all three).
        [Fact]
        public void Fall_IsIndependentOfTickRate()
        {
            const int total = 528;
            double reference = FallDistance(8, total);
            Near(reference, FallDistance(16, total), 2);
            Near(reference, FallDistance(33, total), 2);
            Assert.True(reference > 100 && reference < 1990);
        }

        // D1.2 (a): after landing on the bottom edge the sprite bottom equals the screen bottom.
        [Fact]
        public void Landing_OnBottomEdge_PutsSpriteBottomOnScreenBottom()
        {
            var state = new TossState { X = 0, Y = 489.5, VelX = 0, VelY = 38.4 };
            TossBounds bounds = Bounds(Small, 10, 10, 0);
            TossStepResult result = TossPhysics.Step(state, 30, bounds, null);
            Assert.True(result.Landed);
            Near(Small.Bottom, result.State.Y + result.OffsetY + bounds.Height, 1e-9);
        }

        // D1.2 (a) with a foot offset (E4): the ground is Bottom - Height - FootOffsetY, as in grounded code.
        [Fact]
        public void Landing_WithFootOffset_KeepsFeetOnBottomEdge()
        {
            var state = new TossState { X = 0, Y = 489.5, VelX = 0, VelY = 38.4 };
            TossBounds bounds = Bounds(Small, 10, 10, 4);
            TossStepResult result = TossPhysics.Step(state, 30, bounds, null);
            Assert.True(result.Landed);
            Near(Small.Bottom, result.State.Y + result.OffsetY + bounds.Height, 1e-9);
        }

        // D1.2 (b): landing on a window puts the sprite bottom on the window top.
        [Fact]
        public void LandingOnWindow_PutsSpriteBottomOnWindowTop()
        {
            var state = new TossState { X = 0, Y = 289.5, VelX = 0, VelY = 0 };
            WindowTopProbe probe = (x, downStep) => state.Y + downStep >= 290 ? 300 : -1;
            TossStepResult result = TossPhysics.Step(state, 30, Bounds(Small, 10, 10), probe);
            Assert.True(result.Landed);
            Near(300, result.State.Y + 10, 1e-9);
        }

        // D1.2 (c): landing speed below 40 is soft, 40 and above is hard (boundary 39.9 / 40.0).
        [Fact]
        public void LandingSpeedJustBelow40_IsSoft()
        {
            var state = new TossState { X = 0, Y = 489.5, VelX = 0, VelY = 38.4 };
            TossStepResult result = TossPhysics.Step(state, 30, Bounds(Small, 10, 10), null);
            Assert.True(result.Landed);
            Assert.True(result.Soft);
            Near(490, result.State.Y, 1e-9);
        }

        [Fact]
        public void LandingSpeedOf40_IsHard()
        {
            var state = new TossState { X = 0, Y = 489.5, VelX = 0, VelY = 38.5 };
            TossStepResult result = TossPhysics.Step(state, 30, Bounds(Small, 10, 10), null);
            Assert.True(result.Landed);
            Assert.False(result.Soft);
        }

        // D1.2 (d): an upward toss returns and lands exactly once, on the ground.
        [Fact]
        public void UpwardToss_ReturnsAndLandsExactlyOnce()
        {
            var state = new TossState { X = 0, Y = 490, VelX = 0, VelY = -30 };
            TossBounds bounds = Bounds(Small, 10, 10);
            int landings = 0;
            bool wentAboveGround = false;
            for (int i = 0; i < 500 && landings == 0; i++)
            {
                TossStepResult result = TossPhysics.Step(state, 16, bounds, null);
                state = result.State;
                if (state.Y < 489) wentAboveGround = true;
                if (result.Landed) landings++;
            }
            Assert.True(wentAboveGround);
            Assert.Equal(1, landings);
            Near(490, state.Y, 1e-9);
        }

        // D1.2 (e): a window that disappears mid-fall no longer catches the pet; it lands on the bar.
        [Fact]
        public void WindowGoneMidFall_LandsOnBar()
        {
            bool windowPresent = true;
            var state = new TossState { X = 0, Y = 100, VelX = 0, VelY = 0 };
            WindowTopProbe probe = (x, downStep) => windowPresent && state.Y + downStep >= 290 ? 300 : -1;
            TossBounds bounds = Bounds(Small, 10, 10);
            for (int i = 0; i < 5; i++)
            {
                state = TossPhysics.Step(state, 30, bounds, probe).State;
            }
            windowPresent = false;
            TossStepResult result = default(TossStepResult);
            for (int i = 0; i < 200 && !result.Landed; i++)
            {
                result = TossPhysics.Step(state, 30, bounds, probe);
                state = result.State;
            }
            Assert.True(result.Landed);
            Near(490, state.Y, 1e-9);
        }

        // D1.2 (f): a window whose top is below the ground level is not chosen.
        [Fact]
        public void WindowBelowGround_IsIgnored()
        {
            var state = new TossState { X = 0, Y = 489.5, VelX = 0, VelY = 0 };
            WindowTopProbe probe = (x, downStep) => 600;
            TossStepResult result = TossPhysics.Step(state, 30, Bounds(Small, 10, 10), probe);
            Assert.True(result.Landed);
            Near(490, result.State.Y, 1e-9);
        }

        // D1.2 (g): a monitor with negative coordinates (left of the primary, above it).
        [Fact]
        public void NegativeCoordinateMonitor_LandsOnItsOwnBottom()
        {
            var monitor = new Rectangle(-1920, -200, 1920, 1280); // Bottom 1080, Right 0
            var state = new TossState { X = -1000, Y = 1069.5, VelX = 0, VelY = 0 };
            TossStepResult result = TossPhysics.Step(state, 30, Bounds(monitor, 10, 10), null);
            Assert.True(result.Landed);
            Near(1070, result.State.Y, 1e-9);
            Near(-1000, result.State.X, 1e-9);
        }

        [Fact]
        public void NegativeCoordinateMonitor_BouncesOffItsLeftEdge()
        {
            var monitor = new Rectangle(-1920, -200, 1920, 1280);
            var state = new TossState { X = -1900, Y = 0, VelX = -50, VelY = 0 };
            TossStepResult result = TossPhysics.Step(state, 30, Bounds(monitor, 10, 10), null);
            Near(-1911, result.State.X, 1e-9);
            Assert.True(result.State.VelX > 0);
        }
    }
}
