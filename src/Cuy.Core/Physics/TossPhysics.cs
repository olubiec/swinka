using System;
using System.Drawing;

namespace Cuy.Core.Physics
{
    /// <summary>
    /// Position and velocity of a tossed pet. X and Y are the sprite origin; velocities are in pixels per 30 ms.
    /// </summary>
    public struct TossState
    {
        public double X;
        public double Y;
        public double VelX;
        public double VelY;
    }

    /// <summary>
    /// Fixed inputs of one toss step: the usable screen area, the sprite size and the foot offset of the current animation.
    /// </summary>
    public struct TossBounds
    {
        public Rectangle Screen;
        public int Width;
        public int Height;
        public int FootOffsetY;
    }

    /// <summary>
    /// Result of one toss step. When Stepped is false the step had no time to integrate and nothing changed.
    /// </summary>
    public struct TossStepResult
    {
        public TossState State;
        public bool Stepped;
        public bool Landed;
        /// <summary>True when the landing speed was below 40 (soft fall animation).</summary>
        public bool Soft;
        public int OffsetY;
    }

    /// <summary>
    /// Asks the platform layer for the top of a window or taskbar that the pet crosses while falling.
    /// Arguments: the X the pet has already moved to in this step, and the downward step in pixels.
    /// Returns -1 when nothing is hit.
    /// </summary>
    public delegate int WindowTopProbe(double x, int downStep);

    /// <summary>
    /// Ballistic step of a tossed pet. No WinForms and no Win32: window detection is passed in as a probe.
    /// Units are kept from the original toss: pixels per 30 ms, gravity 1.5 per dt unit, dt = min(50, dtMs) / 30,
    /// edge bounce factor -0.3.
    /// </summary>
    public static class TossPhysics
    {
        public static TossStepResult Step(TossState state, double dtMs, TossBounds bounds, WindowTopProbe probe)
        {
            var result = new TossStepResult { State = state, OffsetY = bounds.FootOffsetY };
            double dt = Math.Max(0, Math.Min(50, dtMs)) / 30.0;
            if (dt == 0) return result;
            result.Stepped = true;

            Rectangle area = bounds.Screen;
            double velX = state.VelX;
            double nextX = state.X + velX * dt;
            double right = area.Right - bounds.Width;
            if (nextX < area.Left || nextX > right)
            {
                double edge = nextX < area.Left ? area.Left : right;
                // Consume the remaining travel after impact instead of pausing a frame.
                nextX = edge - (nextX - edge) * .3;
                velX *= -.3;
            }
            double x = Math.Max(area.Left, Math.Min(right, nextX));

            double dy = state.VelY * dt + .75 * dt * dt;
            double velY = state.VelY + 1.5 * dt;
            // The probe sees the X already reached in this step, as the original window check did.
            int windowTop = dy > 0 && probe != null ? probe(x, (int)Math.Ceiling(dy)) : -1;
            double ground = area.Bottom - bounds.Height;
            bool land = state.Y + dy >= ground;
            if (windowTop != -1 && windowTop - bounds.Height <= ground)
            {
                ground = windowTop - bounds.Height;
                land = true;
            }

            result.State = new TossState
            {
                X = x,
                Y = land ? ground : state.Y + dy,
                VelX = velX,
                VelY = velY
            };
            result.Landed = land;
            result.Soft = velY < 40;
            return result;
        }
    }
}
