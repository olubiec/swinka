using System.Numerics;
using Cuy.Core.Physics;
using Xunit;

namespace Cuy.Core.Tests
{
    public class DragVelocityTests
    {
        private static void Near(double expected, double actual, double tolerance)
        {
            Assert.InRange(actual, expected - tolerance, expected + tolerance);
        }

        // D1.4: 10 px in 10 ms gives force 30 (the x30 scale of the toss force).
        [Fact]
        public void TenPixelsInTenMs_GivesForceThirty()
        {
            var drag = new DragVelocity();
            drag.Reset(0, 0, 0);
            drag.Add(10, 0, 10);
            Near(30, drag.TossForce(10).X, 1e-3);
        }

        // D1.4: releasing after a pause (last sample older than 80 ms) gives no toss.
        [Fact]
        public void ReleaseAfterPause_GivesNoForce()
        {
            var drag = new DragVelocity();
            drag.Reset(0, 0, 0);
            drag.Add(10, 0, 10);
            Assert.Equal(0f, drag.TossForce(10 + 81).X);
        }

        [Fact]
        public void SampleExactlyEightyMsOld_StillCounts()
        {
            var drag = new DragVelocity();
            drag.Reset(0, 0, 0);
            drag.Add(10, 0, 10);
            Near(30, drag.TossForce(90).X, 1e-3);
        }

        // D1.4: elapsed below 8 ms gives zero force.
        [Fact]
        public void ElapsedUnderEightMs_GivesNoForce()
        {
            var drag = new DragVelocity();
            drag.Reset(0, 0, 0);
            drag.Add(5, 0, 5);
            Assert.Equal(0f, drag.TossForce(5).X);
        }

        // D1.4: a sample with the same timestamp as the last one is ignored.
        [Fact]
        public void SameTimestampSample_IsIgnored()
        {
            var drag = new DragVelocity();
            drag.Reset(0, 0, 0);
            drag.Add(10, 0, 10);
            drag.Add(50, 0, 10);
            Near(30, drag.TossForce(10).X, 1e-3);
        }

        // D1.4: only the last 80 ms of samples count.
        [Fact]
        public void OnlyLastEightyMsCount()
        {
            var drag = new DragVelocity();
            drag.Reset(0, 0, 0);
            drag.Add(500, 0, 10);
            drag.Add(520, 0, 50);
            drag.Add(540, 0, 100);
            drag.Add(560, 0, 130);
            Near(15, drag.TossForce(130).X, 1e-3);
        }

        // D1.4: a very fast drag is clamped to MaxForce per axis, never NaN or Infinity.
        [Fact]
        public void VeryFastDrag_IsClampedNotInfinite()
        {
            var drag = new DragVelocity();
            drag.Reset(0, 0, 0);
            drag.Add(1000000, -1000000, 8);
            Vector2 force = drag.TossForce(8);
            Assert.False(float.IsNaN(force.X) || float.IsInfinity(force.X));
            Assert.False(float.IsNaN(force.Y) || float.IsInfinity(force.Y));
            Near(DragVelocity.MaxForce, force.X, 1e-3);
            Near(-DragVelocity.MaxForce, force.Y, 1e-3);
        }
    }
}
