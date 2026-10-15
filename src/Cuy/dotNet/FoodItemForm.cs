using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Cuy
{
    /// <summary>
    /// A food item window on the desktop (lying on the taskbar or a window frame):
    /// - 32x32 px (16x16 icon from assets/icons/icons_16.png scaled x2 nearest neighbour)
    /// - Transparent background (magenta), no border, always on top (TopMost)
    /// - Can be dragged with the mouse
    /// - Falls smoothly with gravity onto the taskbar
    /// - Follows the window it lies on.
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
            AutoScaleMode = AutoScaleMode.None; // stay 32 px at any Windows scaling, so it sits on the taskbar
            Size = new Size(32, 32);
            Cursor = Cursors.Hand;

            _toolTip = new ToolTip();
            string desc = ItemDef != null && !string.IsNullOrEmpty(ItemDef.Description)
                ? ItemDef.Description
                : "Tasty food for your guinea pig";
            string title = ItemDef != null ? ItemDef.Name : itemId;
            _toolTip.SetToolTip(this, string.Format("{0}\n{1}\n(Drag to move it, right-click to take it away)", title, desc));

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
                // Draw so the lowest visible pixel touches the bottom edge: the food lies on the surface, not above it.
                int emptyRows = EmptyBottomRows(bmp);
                e.Graphics.DrawImage(bmp, new Rectangle(0, Height - 32 + emptyRows * 2, 32, 32), new Rectangle(0, 0, 16, 16), GraphicsUnit.Pixel);
            }
        }

        private static int EmptyBottomRows(Bitmap bmp)
        {
            try
            {
                for (int y = Math.Min(15, bmp.Height - 1); y >= 0; y--)
                    for (int x = 0; x < Math.Min(16, bmp.Width); x++)
                        if (bmp.GetPixel(x, y).A > 0) return 15 - y;
            }
            catch (Exception) { }
            return 0;
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
            if (e.Button == MouseButtons.Right && !_isDragging)
            {
                FoodManager.Instance?.RemoveFoodByUser(this);
                return;
            }
            if (_isDragging && e.Button == MouseButtons.Left)
            {
                _isDragging = false;
                Capture = false;
                FoodManager.Instance?.OnFoodDropped(this);
            }
        }

        /// <summary>
        /// Starts the smooth gravity fall of the food onto the taskbar.
        /// </summary>
        public void StartFallToTaskbar()
        {
            if (_isFalling) return;
            _isFalling = true;
            _fallVy = 1.0;
            _fallTimer.Start();
            BrainController.Log(string.Format("[Food] Item {0} falls onto the taskbar.", ItemDef?.Name ?? ItemId));
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
        /// Tracks the window the food lies on.
        /// </summary>
        public void UpdateTracking()
        {
            if (IsDisposed || _isDragging || _isFalling) return;
            if (IsOnTaskbar || WindowHwnd == IntPtr.Zero) return;

            if (!NativeMethods.IsWindow(WindowHwnd) || !NativeMethods.IsWindowVisible(WindowHwnd))
            {
                // Window gone/closed -> the food falls onto the taskbar
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
