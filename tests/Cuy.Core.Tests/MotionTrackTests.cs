using System.Drawing;
using Cuy.Core.Physics;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MotionTrackTests
    {
        private static void Near(double expected, double actual, double tolerance)
        {
            Assert.InRange(actual, expected - tolerance, expected + tolerance);
        }

        // D1.3: samples of one move never go backwards in time.
        [Fact]
        public void Sample_IsMonotonicInTime()
        {
            var track = new MotionTrack();
            track.Reset(0, 0, 0);
            track.MoveTo(100, 0, 0, 300);
            float previous = float.MinValue;
            for (int t = 0; t <= 400; t += 10)
            {
                float x = track.Sample(t).X;
                Assert.True(x >= previous, $"x went back at t={t}: {x} < {previous}");
                previous = x;
            }
            Near(100, previous, 1e-3);
        }

        // D1.3: retargeting in the middle of a move starts from the current position, so nothing jumps back.
        [Fact]
        public void Retarget_MidMove_DoesNotGoBack()
        {
            var track = new MotionTrack();
            track.Reset(0, 0, 0);
            track.MoveTo(100, 0, 0, 300);
            float atRetarget = track.Sample(150).X;
            Near(50, atRetarget, 1e-3);

            track.MoveTo(200, 0, 150, 300);
            Near(atRetarget, track.Sample(150).X, 1e-3);
            float previous = atRetarget;
            for (int t = 160; t <= 500; t += 10)
            {
                float x = track.Sample(t).X;
                Assert.True(x >= previous - 1e-3, $"x went back at t={t}");
                previous = x;
            }
        }

        // D1.3 (E5 regression): the walk is sent with 15% extra time, so at the nominal end it is still short of
        // the target and only reaches it when the extended duration ends.
        [Fact]
        public void MoveWithFifteenPercentReserve_DoesNotStopBeforeEnd()
        {
            const double nominal = 200;
            var track = new MotionTrack();
            track.Reset(0, 0, 0);
            track.MoveTo(100, 0, 0, nominal * 1.15);

            Assert.True(track.IsMoving(nominal));
            float atNominalEnd = track.Sample(nominal).X;
            Assert.True(atNominalEnd > 0 && atNominalEnd < 100, $"x at nominal end was {atNominalEnd}");

            Assert.True(track.IsMoving(nominal * 1.15 - 1));
            Near(100, track.Sample(nominal * 1.15).X, 1e-3);
        }

        // D1.3: IsMoving is true strictly before started + duration and false from that instant on.
        [Fact]
        public void IsMoving_FlipsExactlyAtDuration()
        {
            var track = new MotionTrack();
            track.Reset(0, 0, 0);
            track.MoveTo(100, 0, 0, 300);
            Assert.True(track.IsMoving(0));
            Assert.True(track.IsMoving(299.9));
            Assert.False(track.IsMoving(300));
            Assert.False(track.IsMoving(301));
        }

        // D1.3: no target change means nothing is moving, and an uninitialized track is not moving.
        [Fact]
        public void IsMoving_FalseWithoutDistanceOrInitialization()
        {
            var track = new MotionTrack();
            Assert.False(track.IsMoving(0));

            track.Reset(5, 5, 0);
            Assert.False(track.IsMoving(0));
        }

        // D1.3: Follow moves both ends of the current move: X scaled around the old left edge, Y shifted by dy.
        [Fact]
        public void Follow_MovesBothEnds()
        {
            var track = new MotionTrack();
            track.Reset(100, 50, 0);
            track.MoveTo(200, 50, 0, 300);
            track.Follow(100, 300, 0.5, -20);

            PointF start = track.Sample(0);
            PointF end = track.Sample(300);
            Near(300, start.X, 1e-3);
            Near(30, start.Y, 1e-3);
            Near(350, end.X, 1e-3);
            Near(30, end.Y, 1e-3);
        }
    }
}
