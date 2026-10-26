using System;
using System.Drawing;
using System.Windows.Forms;
using Cuy.Core.Input;
using Cuy.Core.AI;

namespace Cuy.Platform
{
    public sealed class MouseShakeMonitor : IDisposable
    {
        private readonly Func<Point?> _pigCenter;
        private readonly MouseShakeDetector _detector;
        private readonly Timer _timer;
        private bool _isErrorLogged;

        public event Action<Point> Shaken;

        public MouseShakeMonitor(Func<Point?> pigCenter)
        {
            _pigCenter = pigCenter;
            _detector = new MouseShakeDetector();
            _timer = new Timer { Interval = 33 };
            _timer.Tick += OnTick;
        }

        public void Start()
        {
            _detector.Reset();
            _isErrorLogged = false;
            _timer.Start();
        }

        public void Stop()
        {
            _timer.Stop();
        }

        public void Dispose()
        {
            _timer.Dispose();
        }

        private void OnTick(object sender, EventArgs e)
        {
            try
            {
                var p = Cursor.Position;
                var c = _pigCenter();
                if (c == null)
                {
                    _detector.Reset();
                    return;
                }

                double dx = p.X - c.Value.X;
                double dy = p.Y - c.Value.Y;
                double distance = Math.Sqrt(dx * dx + dy * dy);

                if (_detector.Push(p.X, p.Y, distance, DateTime.UtcNow))
                {
                    BrainController.Log("[Shake] detected");
                    Shaken?.Invoke(p);
                }
            }
            catch (Exception ex)
            {
                if (!_isErrorLogged)
                {
                    _isErrorLogged = true;
                    BrainController.Log($"[Shake] error {ex.Message}");
                }
            }
        }

#if DEBUG
        private static MouseShakeMonitor _debugMonitor;

        public static void EnsureDebugStarted()
        {
            if (_debugMonitor != null) return;
            string[] args = Environment.GetCommandLineArgs();
            bool hasTest = false;
            foreach (string arg in args)
            {
                if (arg == "--shake-test") hasTest = true;
            }
            if (!hasTest) return;

            _debugMonitor = new MouseShakeMonitor(() =>
            {
                if (FormPet.ActivePet != null && FormPet.ActivePet.Visible)
                {
                    var b = FormPet.ActivePet.Bounds;
                    return new Point(b.Left + b.Width / 2, b.Top + b.Height / 2);
                }
                return null;
            });
            _debugMonitor.Start();
        }
#endif
    }
}
