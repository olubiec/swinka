using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Cuy
{
    public class ShadowForm : Form
    {
        private static ShadowForm _instance;

        private ShadowForm()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.ShowInTaskbar = false;
            this.TopMost = true;
            this.StartPosition = FormStartPosition.Manual;
        }

        protected override bool ShowWithoutActivation => true;

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                // WS_EX_LAYERED (0x00080000) | WS_EX_TRANSPARENT (0x00000020) | WS_EX_TOOLWINDOW (0x00000080) | WS_EX_NOACTIVATE (0x08000000)
                cp.ExStyle |= 0x00080000 | 0x00000020 | 0x00000080 | 0x08000000;
                return cp;
            }
        }

        public void SetBitmap(Bitmap bitmap, byte opacity = 255)
        {
            if (bitmap.PixelFormat != PixelFormat.Format32bppArgb && bitmap.PixelFormat != PixelFormat.Format32bppPArgb)
                throw new ApplicationException("The bitmap must be 32bpp with alpha-channel.");

            IntPtr screenDc = GetDC(IntPtr.Zero);
            IntPtr memDc = CreateCompatibleDC(screenDc);
            IntPtr hBitmap = IntPtr.Zero;
            IntPtr oldBitmap = IntPtr.Zero;

            try
            {
                hBitmap = bitmap.GetHbitmap(Color.FromArgb(0));  // Grab a GDI handle from this GDI+ bitmap
                oldBitmap = SelectObject(memDc, hBitmap);

                Size size = new Size(bitmap.Width, bitmap.Height);
                Point pointSource = new Point(0, 0);
                Point topPos = new Point(this.Left, this.Top);

                BLENDFUNCTION blend = new BLENDFUNCTION
                {
                    BlendOp = AC_SRC_OVER,
                    BlendFlags = 0,
                    SourceConstantAlpha = opacity,
                    AlphaFormat = AC_SRC_ALPHA
                };

                UpdateLayeredWindow(this.Handle, screenDc, ref topPos, ref size, memDc, ref pointSource, 0, ref blend, ULW_ALPHA);
            }
            finally
            {
                ReleaseDC(IntPtr.Zero, screenDc);
                if (hBitmap != IntPtr.Zero)
                {
                    SelectObject(memDc, oldBitmap);
                    DeleteObject(hBitmap);
                }
                DeleteDC(memDc);
            }
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        private struct ARGB
        {
            public byte Blue;
            public byte Green;
            public byte Red;
            public byte Alpha;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        private struct BLENDFUNCTION
        {
            public byte BlendOp;
            public byte BlendFlags;
            public byte SourceConstantAlpha;
            public byte AlphaFormat;
        }

        private const int ULW_ALPHA = 2;
        private const byte AC_SRC_OVER = 0x00;
        private const byte AC_SRC_ALPHA = 0x01;

        [DllImport("user32.dll", ExactSpelling = true, SetLastError = true)]
        private static extern bool UpdateLayeredWindow(IntPtr hwnd, IntPtr hdcDst, ref Point pptDst, ref Size psize, IntPtr hdcSrc, ref Point pprSrc, int crKey, ref BLENDFUNCTION pblend, int dwFlags);

        [DllImport("user32.dll", ExactSpelling = true, SetLastError = true)]
        private static extern IntPtr GetDC(IntPtr hWnd);

        [DllImport("user32.dll", ExactSpelling = true)]
        private static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

        [DllImport("gdi32.dll", ExactSpelling = true, SetLastError = true)]
        private static extern IntPtr CreateCompatibleDC(IntPtr hDC);

        [DllImport("gdi32.dll", ExactSpelling = true, SetLastError = true)]
        private static extern bool DeleteDC(IntPtr hdc);

        [DllImport("gdi32.dll", ExactSpelling = true)]
        private static extern IntPtr SelectObject(IntPtr hDC, IntPtr hObject);

        [DllImport("gdi32.dll", ExactSpelling = true, SetLastError = true)]
        private static extern bool DeleteObject(IntPtr hObject);

        private static double _lastWindowCacheTime = 0;
        private static Dictionary<IntPtr, ShadowNativeMethods.RECT> _windowCache = new Dictionary<IntPtr, ShadowNativeMethods.RECT>();
        private static int _lastScale = -1;
        private static Bitmap _cachedBitmap;
        private static int _cachedWidth = -1;
        private static int _cachedHeight = -1;
        private static byte _lastMaxAlpha = 0;

        public static void Update(FormPet pet)
        {
            if (pet.IsDisposed || pet.Disposing) return;
            string anim = pet.CurrentAnimationName;
            bool shouldShow = pet.IsDragging || pet.IsTossing || anim == "fall" || anim == "toss" || anim == "drag" || anim == "held";
            if (!shouldShow || pet.IsInHome)
            {
                if (_instance != null && _instance.Visible)
                {
                    _instance.Hide();
                }
                return;
            }

            if (_instance == null || _instance.IsDisposed)
            {
                _instance = new ShadowForm();
            }

            int scale = Program.MyData.GetScale();
            int petCenterX = pet.Left + pet.Width / 2;
            Rectangle workingArea = Screen.FromPoint(new Point(petCenterX, pet.Top)).WorkingArea;
            int defaultGroundY = workingArea.Bottom;
            int feetY = pet.Top + 59 * scale;

            double now = (DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalMilliseconds;
            if (now - _lastWindowCacheTime > 100)
            {
                _windowCache.Clear();
                uint ourProcessId = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
                ShadowNativeMethods.EnumWindows(delegate (IntPtr hWnd, IntPtr lParam)
                {
                    if (hWnd == pet.Handle || (_instance != null && hWnd == _instance.Handle)) return true;

                    ShadowNativeMethods.GetWindowThreadProcessId(hWnd, out uint windowProcessId);
                    if (windowProcessId == ourProcessId) return true;

                    if (ShadowNativeMethods.IsWindowVisible(hWnd) && !ShadowNativeMethods.IsIconic(hWnd))
                    {
                        int exStyle = ShadowNativeMethods.GetWindowLong(hWnd, -20); // GWL_EXSTYLE
                        if ((exStyle & 0x00000080) != 0) // WS_EX_TOOLWINDOW
                            return true;

                        if (ShadowNativeMethods.GetWindowRect(new HandleRef(null, hWnd), out ShadowNativeMethods.RECT rct))
                        {
                            if (rct.Right - rct.Left > 0 && rct.Bottom - rct.Top > 0)
                            {
                                _windowCache[hWnd] = rct;
                            }
                        }
                    }
                    return true;
                }, IntPtr.Zero);
                _lastWindowCacheTime = now;
            }

            int groundY = defaultGroundY;
            foreach (var kvp in _windowCache)
            {
                var rct = kvp.Value;
                if (petCenterX >= rct.Left && petCenterX <= rct.Right)
                {
                    if (rct.Top >= feetY && rct.Top < groundY)
                    {
                        // Check if it's not a Cuy app window. ShadowNativeMethods.GetWindowThreadProcessId could check process ID.
                        // We will rely on it being visually a window below.
                        groundY = rct.Top;
                    }
                }
            }

            int h = groundY - feetY;
            if (h < 0) h = 0;

            int bodyWidth = 38 * scale;
            double widthFactor = 1.0 - (h / 500.0);
            if (widthFactor < 0.35) widthFactor = 0.35;
            if (widthFactor > 1.0) widthFactor = 1.0;

            int shadowWidth = (int)(bodyWidth * widthFactor);
            int shadowHeight = shadowWidth / 4;
            if (shadowWidth <= 0 || shadowHeight <= 0) return;

            double alphaFactor = 1.0 - (h / 500.0);
            if (alphaFactor < 0.15) alphaFactor = 0.15;
            if (alphaFactor > 1.0) alphaFactor = 1.0;
            byte maxAlpha = (byte)(255 * 0.45 * alphaFactor);

            if (_cachedBitmap == null || _cachedWidth != shadowWidth || _cachedHeight != shadowHeight || _lastScale != scale || _lastMaxAlpha != maxAlpha)
            {
                if (_cachedBitmap != null) _cachedBitmap.Dispose();
                _cachedBitmap = new Bitmap(shadowWidth, shadowHeight, PixelFormat.Format32bppPArgb);
                using (Graphics g = Graphics.FromImage(_cachedBitmap))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    GraphicsPath path = new GraphicsPath();
                    path.AddEllipse(0, 0, shadowWidth, shadowHeight);
                    using (PathGradientBrush pgb = new PathGradientBrush(path))
                    {
                        pgb.CenterPoint = new PointF(shadowWidth / 2f, shadowHeight / 2f);
                        pgb.CenterColor = Color.FromArgb(maxAlpha, 43, 23, 18); // #2b1712
                        pgb.SurroundColors = new Color[] { Color.FromArgb(0, 43, 23, 18) };
                        g.FillPath(pgb, path);
                    }
                }
                _cachedWidth = shadowWidth;
                _cachedHeight = shadowHeight;
                _lastScale = scale;
                _lastMaxAlpha = maxAlpha;
            }

            int shadowX = petCenterX - shadowWidth / 2;
            int shadowY = groundY - shadowHeight / 2;

            if (_instance.Left != shadowX || _instance.Top != shadowY)
            {
                _instance.Location = new Point(shadowX, shadowY);
            }

            if (!_instance.Visible)
            {
                // we don't activate
                ShadowNativeMethods.ShowWindow(_instance.Handle, 8); // SW_SHOWNA
            }

            // Update layered window
            _instance.SetBitmap(_cachedBitmap);
        }

        public static void DisposeShadow()
        {
            if (_cachedBitmap != null)
            {
                _cachedBitmap.Dispose();
                _cachedBitmap = null;
            }
            if (_instance != null)
            {
                _instance.Dispose();
                _instance = null;
            }
        }

    internal static class ShadowNativeMethods
    {
        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left, Top, Right, Bottom;
        }

        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool GetWindowRect(HandleRef hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    }
}

}