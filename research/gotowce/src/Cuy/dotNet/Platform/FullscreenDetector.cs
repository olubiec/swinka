using System;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;

namespace Cuy.Platform
{
    /// <summary>
    /// "Is a full-screen game, video or presentation in front of the user?"
    ///
    /// Port of Chromium's ui/base/fullscreen_win.cc (BSD-3-Clause, Copyright The Chromium Authors):
    ///   IsPlatformFullScreenMode  -> SHQueryUserNotificationState == D3D full screen or presentation mode
    ///   IsFullScreenWindowMode    -> foreground window covers its whole monitor and has no frame styles
    /// with three Cuy changes:
    ///   1. the desktop shell (Progman / WorkerW / Shell_TrayWnd) and Cuy's own windows never count
    ///      (the old SoundManager check treated a click on the desktop as "full screen"),
    ///   2. any monitor counts, and Covers(Point) tells whether the full-screen window is on the pig's monitor,
    ///   3. QUNS_BUSY is reported separately (it is also set by some borderless games and by F11 in browsers).
    /// Call Check() every 2-5 s from a timer; it allocates almost nothing and never throws.
    /// </summary>
    public static class FullscreenDetector
    {
        public struct Result
        {
            public bool IsFullscreen;     // a full-screen window or D3D/presentation state
            public bool ShellBusy;        // QUNS_BUSY (treat as full screen only together with a covering window)
            public Rectangle MonitorBounds; // monitor of the full-screen window, Empty if unknown
            public string Reason;         // for cuy.log

            public bool Covers(Point screenPoint)
            {
                return IsFullscreen && (MonitorBounds.IsEmpty || MonitorBounds.Contains(screenPoint));
            }
        }

        public static Result Check()
        {
            var r = new Result { MonitorBounds = Rectangle.Empty, Reason = "none" };
            try
            {
                QUNS state;
                if (SHQueryUserNotificationState(out state) == 0)
                {
                    if (state == QUNS.RUNNING_D3D_FULL_SCREEN || state == QUNS.PRESENTATION_MODE)
                    {
                        r.IsFullscreen = true;
                        r.Reason = "shell:" + state;
                    }
                    else if (state == QUNS.BUSY)
                    {
                        r.ShellBusy = true;
                    }
                }

                Rectangle mon;
                string why;
                if (ForegroundWindowIsFullscreen(out mon, out why))
                {
                    r.IsFullscreen = true;
                    r.MonitorBounds = mon;
                    r.Reason = why;
                }
                else if (r.IsFullscreen)
                {
                    // D3D / presentation without a matching foreground window (e.g. focus on another monitor):
                    // assume the primary monitor, like Chromium does.
                    r.MonitorBounds = System.Windows.Forms.Screen.PrimaryScreen.Bounds;
                }
            }
            catch (Exception ex)
            {
                r = new Result { MonitorBounds = Rectangle.Empty, Reason = "error: " + ex.Message };
            }
            return r;
        }

        private static bool ForegroundWindowIsFullscreen(out Rectangle monitorBounds, out string reason)
        {
            monitorBounds = Rectangle.Empty;
            reason = null;

            IntPtr hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return false;

            // 1. Never the desktop, the taskbar or Cuy itself.
            string cls = ClassName(hwnd);
            if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd" || cls == "Shell_SecondaryTrayWnd")
                return false;
            uint pid;
            GetWindowThreadProcessId(hwnd, out pid);
            if (pid == (uint)Process.GetCurrentProcess().Id) return false;

            // 2. Window rect must equal its monitor rect (Chromium: IntersectRect + EqualRect).
            RECT wr;
            if (!GetWindowRect(hwnd, out wr)) return false;
            IntPtr hmon = MonitorFromRect(ref wr, MONITOR_DEFAULTTONULL);
            if (hmon == IntPtr.Zero) return false;
            var mi = new MONITORINFO { cbSize = Marshal.SizeOf(typeof(MONITORINFO)) };
            if (!GetMonitorInfo(hmon, ref mi)) return false;

            RECT inter;
            if (!IntersectRect(out inter, ref wr, ref mi.rcMonitor)) return false;
            if (!EqualRect(ref inter, ref mi.rcMonitor)) return false;

            // 3. No frame (Chromium: no WS_DLGFRAME / WS_THICKFRAME, no WS_EX_WINDOWEDGE / WS_EX_TOOLWINDOW).
            long style = GetWindowLongPtr(hwnd, GWL_STYLE).ToInt64();
            long exStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE).ToInt64();
            if ((style & (WS_DLGFRAME | WS_THICKFRAME)) != 0) return false;
            if ((exStyle & (WS_EX_WINDOWEDGE | WS_EX_TOOLWINDOW)) != 0) return false;

            monitorBounds = Rectangle.FromLTRB(mi.rcMonitor.Left, mi.rcMonitor.Top, mi.rcMonitor.Right, mi.rcMonitor.Bottom);
            reason = "window:" + cls;
            return true;
        }

        private static string ClassName(IntPtr hwnd)
        {
            var sb = new StringBuilder(64);
            return GetClassName(hwnd, sb, sb.Capacity) > 0 ? sb.ToString() : "";
        }

        // ---- Win32 --------------------------------------------------------------------------

        private enum QUNS
        {
            NOT_PRESENT = 1,
            BUSY = 2,
            RUNNING_D3D_FULL_SCREEN = 3,
            PRESENTATION_MODE = 4,
            ACCEPTS_NOTIFICATIONS = 5,
            QUIET_TIME = 6,
            APP = 7
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT { public int Left, Top, Right, Bottom; }

        [StructLayout(LayoutKind.Sequential)]
        private struct MONITORINFO
        {
            public int cbSize;
            public RECT rcMonitor;
            public RECT rcWork;
            public uint dwFlags;
        }

        private const int GWL_STYLE = -16;
        private const int GWL_EXSTYLE = -20;
        private const long WS_DLGFRAME = 0x00400000L;
        private const long WS_THICKFRAME = 0x00040000L;
        private const long WS_EX_WINDOWEDGE = 0x00000100L;
        private const long WS_EX_TOOLWINDOW = 0x00000080L;
        private const uint MONITOR_DEFAULTTONULL = 0;

        [DllImport("shell32.dll")]
        private static extern int SHQueryUserNotificationState(out QUNS state);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

        [DllImport("user32.dll")]
        private static extern IntPtr MonitorFromRect(ref RECT rect, uint flags);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO info);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool IntersectRect(out RECT dst, ref RECT a, ref RECT b);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool EqualRect(ref RECT a, ref RECT b);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetClassName(IntPtr hWnd, StringBuilder name, int maxCount);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);

        // GetWindowLongPtr exists only in 64-bit user32; fall back to GetWindowLong in 32-bit processes.
        private static IntPtr GetWindowLongPtr(IntPtr hWnd, int index)
        {
            return IntPtr.Size == 8 ? GetWindowLongPtr64(hWnd, index) : new IntPtr(GetWindowLong32(hWnd, index));
        }

        [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
        private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int index);

        [DllImport("user32.dll", EntryPoint = "GetWindowLong")]
        private static extern int GetWindowLong32(IntPtr hWnd, int index);
    }
}
