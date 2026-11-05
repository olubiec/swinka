using System;
using System.Drawing;

namespace Cuy
{
    // Interpolate presentation only; collision/animation coordinates stay authoritative.
    internal sealed class MotionTrack
    {
        private double fromX, fromY, toX, toY, started, duration;
        public bool Initialized { get; private set; }
        public void Reset(double x, double y, double now)
        {
            fromX = toX = x; fromY = toY = y;
            started = now; duration = 0; Initialized = true;
        }
        public PointF Sample(double now)
        {
            double t = duration <= 0 ? 1 : Math.Max(0, Math.Min(1, (now - started) / duration));
            return new PointF((float)(fromX + (toX - fromX) * t), (float)(fromY + (toY - fromY) * t));
        }
        public void MoveTo(double x, double y, double now, double milliseconds)
        {
            if (!Initialized) { Reset(x, y, now); return; }
            PointF position = Sample(now);
            fromX = position.X; fromY = position.Y; toX = x; toY = y;
            started = now; duration = Math.Max(1, milliseconds);
        }
        public bool IsMoving(double now)
        {
            return Initialized && now < started + duration && (fromX != toX || fromY != toY);
        }
        public void Follow(double oldLeft, double newLeft, double ratio, double dy)
        {
            fromX = newLeft + (fromX - oldLeft) * ratio;
            toX = newLeft + (toX - oldLeft) * ratio;
            fromY += dy; toY += dy;
        }
    }
}
