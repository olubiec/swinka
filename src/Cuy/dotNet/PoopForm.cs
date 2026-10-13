using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Cuy.Core;

namespace Cuy
{
    /// <summary>
    /// Okno pojedynczego bobka na pulpicie (na pasku zadań lub na oknie aplikacji):
    /// - Rozmiar 32x32 px (ikona 16x16 z assets/icons/icons_16.png przeskalowana x2 metodą Nearest Neighbor)
    /// - Bez ramki, przezroczyste tło (Magenta), zawsze na wierzchu (TopMost)
    /// - Nie kradnie fokusu (WS_EX_NOACTIVATE)
    /// - Kliknięcie usuwa bobek i dodaje 1 koniczynkę (+ podnosi czystość klatki)
    /// - Podąża za oknem, na którym leży; gdy okno zostanie zamknięte, bobek znika z ekranu,
    ///   ale licznik zostaje w stanie gry.
    /// </summary>
    public sealed class PoopForm : Form
    {
        private const int WS_EX_NOACTIVATE = 0x08000000;
        private const int WS_EX_TOOLWINDOW = 0x00000080;
        private const int WS_EX_TOPMOST = 0x00000008;

        public PoopItem PoopData { get; }
        public IntPtr WindowHwnd { get; set; }
        public Point WindowRelativeOffset { get; set; }
        public bool IsOnTaskbar { get; set; }

        private readonly ToolTip _toolTip;

        public PoopForm(PoopItem poopData, IntPtr windowHwnd = default, Point relativeOffset = default)
        {
            PoopData = poopData ?? throw new ArgumentNullException(nameof(poopData));
            WindowHwnd = windowHwnd;
            WindowRelativeOffset = relativeOffset;
            IsOnTaskbar = poopData.OnTaskbar || windowHwnd == IntPtr.Zero;

            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            BackColor = Color.Magenta;
            TransparencyKey = Color.Magenta;
            DoubleBuffered = true;
            Size = new Size(32, 32);
            Location = new Point(poopData.X, poopData.Y);
            Cursor = Cursors.Hand;

            _toolTip = new ToolTip();
            _toolTip.SetToolTip(this, "Bobek świnki (kliknij, aby posprzątać: +1 koniczynka)");
        }

        protected override bool ShowWithoutActivation => true;

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= WS_EX_NOACTIVATE;
                cp.ExStyle |= WS_EX_TOOLWINDOW;
                cp.ExStyle |= WS_EX_TOPMOST;
                return cp;
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Bitmap bmp = PetIcons.GetIconBitmap("poop") ?? PetIcons.GetIconBitmap("bobek");
            if (bmp != null)
            {
                e.Graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
                e.Graphics.PixelOffsetMode = PixelOffsetMode.Half;
                e.Graphics.DrawImage(bmp, new Rectangle(0, 0, 32, 32), new Rectangle(0, 0, 16, 16), GraphicsUnit.Pixel);
            }
        }

        protected override void OnMouseClick(MouseEventArgs e)
        {
            base.OnMouseClick(e);
            if (e.Button == MouseButtons.Left)
            {
                PoopManager.Instance?.OnBobekClicked(this);
            }
        }

        /// <summary>
        /// Aktualizuje śledzenie okna: przesuwa bobek wraz z oknem,
        /// a w przypadku zamknięcia okna powiadamia menedżera, by usunąć bobek z ekranu.
        /// </summary>
        public void UpdateTracking()
        {
            if (IsDisposed) return;
            if (IsOnTaskbar || WindowHwnd == IntPtr.Zero) return;

            // Sprawdzenie czy okno jeszcze istnieje i jest widoczne
            if (!NativeMethods.IsWindow(WindowHwnd) || !NativeMethods.IsWindowVisible(WindowHwnd))
            {
                PoopManager.Instance?.OnWindowClosed(this);
                return;
            }

            if (NativeMethods.GetWindowRect(new HandleRef(this, WindowHwnd), out var rct))
            {
                if (rct.Right - rct.Left <= 0 || rct.Bottom - rct.Top <= 0 || (rct.Top == 0 && rct.Bottom == 0))
                {
                    PoopManager.Instance?.OnWindowClosed(this);
                    return;
                }

                int newX = rct.Left + WindowRelativeOffset.X;
                int newY = rct.Top + WindowRelativeOffset.Y;

                if (Location.X != newX || Location.Y != newY)
                {
                    Location = new Point(newX, newY);
                }
            }
            else
            {
                PoopManager.Instance?.OnWindowClosed(this);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _toolTip?.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
