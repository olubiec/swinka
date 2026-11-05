using System.Collections.Generic;
using System.Numerics;

namespace Cuy.Core.Physics
{
    /// <summary>
    /// Keeps the recent drag positions of the pet and turns them into a toss force (pixels per 30 ms).
    /// </summary>
    public sealed class DragVelocity
    {
        private struct Sample { public double Time, X, Y; }
        private readonly List<Sample> samples = new List<Sample>();
        public void Reset(double x, double y, double now)
        {
            samples.Clear(); Add(x, y, now);
        }
        public void Add(double x, double y, double now)
        {
            if (samples.Count > 0 && now <= samples[samples.Count - 1].Time) return;
            samples.Add(new Sample { X = x, Y = y, Time = now });
            while (samples.Count > 2 && samples[1].Time <= now - 80) samples.RemoveAt(0);
        }
        public Vector2 TossForce(double now)
        {
            if (samples.Count < 2) return Vector2.Zero;
            Sample first = samples[0], last = samples[samples.Count - 1];
            double elapsed = last.Time - first.Time;
            if (elapsed < 8 || now - last.Time > 80) return Vector2.Zero;
            return new Vector2((float)((last.X - first.X) / elapsed * 30), (float)((last.Y - first.Y) / elapsed * 30));
        }
    }
}
