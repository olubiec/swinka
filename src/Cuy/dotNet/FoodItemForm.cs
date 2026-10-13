using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Cuy
{
    /// <summary>
    /// Okno przedmiotu jedzenia na pulpicie (położone na pasku zadań lub ramce okna):
    /// - Rozmiar 32x32 px (ikona 16x16 z assets/icons/icons_16.png powiększona x2 Nearest-Neighbor)
    /// - Przezroczyste tło (Magenta), bez ramki, zawsze na wierzchu (TopMost)
    /// - Przeciągalne myszką (Drag & Drop)
    /// - Potrafi płynnie spadać z grawitacją na pasek zadań
    /// - Podąża za oknem, jeśli na nim leży.
    /// </summary>
    public sealed class FoodItemForm : Form
    {
        private const int WS_EX_NOACTIVATE = 0x08000000;
        private const int WS_EX_TOOLWINDOW = 0x00000080;
        private const int WS_EX_TOPMOST = 0x00000008;

        public string ItemId { get; }
        public CuyItemDef ItemDef { get; }
        public IntPtr WindowHwnd { get; set; }
        public Point WindowRelativeOffset { get; set; }
        public bool IsOnTaskbar { get; set; }

        private bool _isDragging;
        private Point _dragStartPos;
        private bool _isFalling;
        private double _fallVy;
        private Timer _fallTimer;
        private readonly ToolTip _toolTip;

        public bool IsDragging => _isDragging;
        public bool IsFalling => _isFalling;

        public FoodItemForm(string itemId, IntPtr windowHwnd = default, Point relativeOffset = default)
        {
            ItemId = itemId ?? throw new ArgumentNullException(nameof(itemId));
            ItemDef = ItemCatalogLoader.GetItem(itemId);
            WindowHwnd = windowHwnd;
            WindowRelativeOffset = relativeOffset;
            IsOnTaskbar = (windowHwnd == IntPtr.Zero);

            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            BackColor = Color.Magenta;
            TransparencyKey = Color.Magenta;
            DoubleBuffered = true;
            Size = new Size(32, 32);
            Cursor = Cursors.Hand;

            _toolTip = new ToolTip();
            string desc = ItemDef != null && !string.IsNullOrEmpty(ItemDef.Description)
                ? ItemDef.Description
                : "Pyszne jedzenie dla świnki";
            string title = ItemDef != null ? ItemDef.Name : itemId;
            _toolTip.SetToolTip(this, string.Format("{0}\n{1}\n(Przeciągnij myszką, aby przenieść)", title, desc));

            _fallTimer = new Timer();
            _fallTimer.Interval = 15;
            _fallTimer.Tick += FallTimer_Tick;
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
            string iconName = ItemDef?.IconName ?? ItemId;
            Bitmap bmp = PetIcons.GetIconBitmap(iconName);
            if (bmp != null)
            {
                e.Graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
                e.Graphics.PixelOffsetMode = PixelOffsetMode.Half;
                e.Graphics.DrawImage(bmp, new Rectangle(0, 0, 32, 32), new Rectangle(0, 0, 16, 16), GraphicsUnit.Pixel);
            }
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left && !_isFalling)
            {
                _isDragging = true;
                _dragStartPos = e.Location;
                Capture = true;
                FoodManager.Instance?.OnFoodDragStart(this);
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            if (_isDragging)
            {
                Point screenCursor = Cursor.Position;
                Location = new Point(screenCursor.X - _dragStartPos.X, screenCursor.Y - _dragStartPos.Y);
                FoodManager.Instance?.OnFoodDragging(this);
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            if (_isDragging && e.Button == MouseButtons.Left)
            {
                _isDragging = false;
                Capture = false;
                FoodManager.Instance?.OnFoodDropped(this);
            }
        }

        /// <summary>
        /// Rozpoczyna płynny grawitacyjny spadek jedzenia na pasek zadań.
        /// </summary>
        public void StartFallToTaskbar()
        {
            if (_isFalling) return;
            _isFalling = true;
            _fallVy = 1.0;
            _fallTimer.Start();
            BrainController.Log(string.Format("[Jedzenie] Przedmiot {0} spada na pasek zadań.", ItemDef?.Name ?? ItemId));
        }

        private void FallTimer_Tick(object sender, EventArgs e)
        {
            if (IsDisposed || !_isFalling)
            {
                _fallTimer.Stop();
                return;
            }

            Rectangle workingArea = Screen.PrimaryScreen.WorkingArea;
            int groundY = workingArea.Bottom - Height;

            _fallVy += 1.5;
            int newY = (int)(Location.Y + _fallVy);

            if (newY >= groundY)
            {
                newY = groundY;
                Location = new Point(Location.X, newY);
                _isFalling = false;
                _fallVy = 0.0;
                _fallTimer.Stop();

                WindowHwnd = IntPtr.Zero;
                IsOnTaskbar = true;
                WindowRelativeOffset = Point.Empty;

                FoodManager.Instance?.OnFoodLandedOnTaskbar(this);
            }
            else
            {
                Location = new Point(Location.X, newY);
            }
        }

        /// <summary>
        /// Śledzenie ruchu okna, jeśli jedzenie leży na nim.
        /// </summary>
        public void UpdateTracking()
        {
            if (IsDisposed || _isDragging || _isFalling) return;
            if (IsOnTaskbar || WindowHwnd == IntPtr.Zero) return;

            if (!NativeMethods.IsWindow(WindowHwnd) || !NativeMethods.IsWindowVisible(WindowHwnd))
            {
                // Okno zniknęło/zamknięte -> jedzenie spada na pasek zadań
                WindowHwnd = IntPtr.Zero;
                StartFallToTaskbar();
                return;
            }

            if (NativeMethods.GetWindowRect(new HandleRef(this, WindowHwnd), out var rct))
            {
                if (rct.Right - rct.Left <= 0 || rct.Bottom - rct.Top <= 0)
                {
                    WindowHwnd = IntPtr.Zero;
                    StartFallToTaskbar();
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
                WindowHwnd = IntPtr.Zero;
                StartFallToTaskbar();
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_fallTimer != null)
                {
                    _fallTimer.Stop();
                    _fallTimer.Dispose();
                    _fallTimer = null;
                }
                _toolTip?.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
