using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Cuy
{
    public sealed class DesktopPropView
    {
        public string Uid { get; set; }
        public string ItemId { get; set; }
        public string SpritePath { get; set; }
        public double X { get; set; }
        public double Y { get; set; }
    }

    /// <summary>
    /// Transparent, click-through, topmost overlay that renders placed desktop props
    /// over the primary screen working area and adapts to DPI and display changes.
    /// </summary>
    public sealed class DesktopPropsOverlay : Form
    {
        private const int WS_EX_TOOLWINDOW = 0x00000080;
        private const int WS_EX_TOPMOST = 0x00000008;
        private const int WS_EX_NOACTIVATE = 0x08000000;
        private const int WS_EX_TRANSPARENT = 0x00000020;
        private const int WS_EX_LAYERED = 0x00080000;

        private const int FallbackSizePx = 16;
        private static readonly Color FallbackColor = Color.FromArgb(0xE6, 0xB0, 0x73);

        private readonly List<DesktopPropView> _props = new List<DesktopPropView>();
        private readonly Dictionary<string, Bitmap> _spriteCache = new Dictionary<string, Bitmap>(StringComparer.OrdinalIgnoreCase);
        private bool _displayHooked;

        public DesktopPropsOverlay()
        {
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            BackColor = Color.Magenta;
            TransparencyKey = Color.Magenta;
            DoubleBuffered = true;

            SyncBoundsToWorkingArea();
            SystemEvents.DisplaySettingsChanged += OnDisplaySettingsChanged;
            _displayHooked = true;
        }

        protected override bool ShowWithoutActivation => true;

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= WS_EX_TOOLWINDOW | WS_EX_TOPMOST | WS_EX_NOACTIVATE | WS_EX_TRANSPARENT | WS_EX_LAYERED;
                return cp;
            }
        }

        public void Show(IReadOnlyList<DesktopPropView> propList)
        {
            ReplaceProps(propList);
            SyncBoundsToWorkingArea();
            if (!Visible)
            {
                base.Show();
            }
            Invalidate();
        }

        public new void Hide()
        {
            if (Visible)
            {
                base.Hide();
            }
        }

        public void Update(IReadOnlyList<DesktopPropView> propList)
        {
            ReplaceProps(propList);
            if (_props.Count == 0)
            {
                Hide();
                return;
            }

            SyncBoundsToWorkingArea();
            if (!Visible)
            {
                base.Show();
            }
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            if (_props.Count == 0) return;

            var g = e.Graphics;
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;

            int scale = Math.Max(1, (int)Math.Round(DeviceDpi / 96.0) * 2);
            int width = Math.Max(1, ClientSize.Width);
            int height = Math.Max(1, ClientSize.Height);

            foreach (var prop in _props)
            {
                if (prop == null) continue;

                double nx = ClampUnit(prop.X);
                double ny = ClampUnit(prop.Y);

                Bitmap bmp = LoadSprite(prop.SpritePath);
                int drawW = (bmp != null ? bmp.Width : FallbackSizePx) * scale;
                int drawH = (bmp != null ? bmp.Height : FallbackSizePx) * scale;

                int x = (int)Math.Round(nx * Math.Max(0, width - drawW));
                int y = (int)Math.Round(ny * Math.Max(0, height - drawH));

                if (bmp != null)
                {
                    g.DrawImage(bmp, new Rectangle(x, y, drawW, drawH));
                }
                else
                {
                    using (var brush = new SolidBrush(FallbackColor))
                    {
                        g.FillRectangle(brush, x, y, drawW, drawH);
                    }
                }
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_displayHooked)
                {
                    SystemEvents.DisplaySettingsChanged -= OnDisplaySettingsChanged;
                    _displayHooked = false;
                }

                foreach (var bmp in _spriteCache.Values)
                {
                    bmp?.Dispose();
                }
                _spriteCache.Clear();
            }
            base.Dispose(disposing);
        }

        private void OnDisplaySettingsChanged(object sender, EventArgs e)
        {
            if (IsDisposed) return;
            if (InvokeRequired)
            {
                try { BeginInvoke((Action)SyncAndRepaint); } catch { }
            }
            else
            {
                SyncAndRepaint();
            }
        }

        private void SyncAndRepaint()
        {
            if (IsDisposed) return;
            SyncBoundsToWorkingArea();
            Invalidate();
        }

        private void SyncBoundsToWorkingArea()
        {
            var screen = Screen.PrimaryScreen;
            if (screen == null) return;
            Rectangle area = screen.WorkingArea;
            if (Bounds != area)
            {
                Bounds = area;
            }
        }

        private void ReplaceProps(IReadOnlyList<DesktopPropView> propList)
        {
            _props.Clear();
            if (propList == null) return;
            foreach (var p in propList)
            {
                if (p != null) _props.Add(p);
            }
        }

        private Bitmap LoadSprite(string spritePath)
        {
            if (string.IsNullOrWhiteSpace(spritePath)) return null;
            if (_spriteCache.TryGetValue(spritePath, out var cached))
            {
                return cached;
            }

            string resolved = ResolveAssetPath(spritePath);
            if (resolved == null)
            {
                _spriteCache[spritePath] = null;
                return null;
            }

            try
            {
                var bmp = new Bitmap(resolved);
                _spriteCache[spritePath] = bmp;
                return bmp;
            }
            catch
            {
                _spriteCache[spritePath] = null;
                return null;
            }
        }

        private static string ResolveAssetPath(string relativePath)
        {
            string clean = relativePath.Trim().TrimStart('/', '\\').Replace('/', Path.DirectorySeparatorChar);
            string[] roots = { AppContext.BaseDirectory, Directory.GetCurrentDirectory() };
            foreach (var root in roots)
            {
                if (string.IsNullOrEmpty(root)) continue;
                var dir = new DirectoryInfo(root);
                for (int depth = 0; depth < 8 && dir != null; depth++, dir = dir.Parent)
                {
                    string candidate = Path.Combine(dir.FullName, "assets", clean);
                    if (File.Exists(candidate)) return candidate;
                }
            }
            return null;
        }

        private static double ClampUnit(double value)
        {
            if (double.IsNaN(value) || double.IsInfinity(value)) return 0.5;
            if (value < 0.0) return 0.0;
            if (value > 1.0) return 1.0;
            return value;
        }
    }
}
