using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Cuy.Core.Care;

namespace Cuy
{
    public sealed class CareReminderForm : Form
    {
        private const int WS_EX_NOACTIVATE = 0x08000000;
        private const int WS_EX_TOOLWINDOW = 0x00000080;
        private const int WS_EX_TOPMOST = 0x00000008;

        // Cozy warm pixel palette (assets/ui/ui_tokens.css)
        private static readonly Color ColBg = Color.FromArgb(251, 240, 217);           // --ui-linen-3 (#fbf0d9)
        private static readonly Color ColInnerBevel = Color.FromArgb(239, 220, 184);   // --ui-linen-2 (#efdcb8)
        private static readonly Color ColWoodDark = Color.FromArgb(71, 40, 28);        // --ui-wood-0 (#47281c)
        private static readonly Color ColWoodSoft = Color.FromArgb(111, 67, 40);       // --ui-wood-1 (#6f4328)
        private static readonly Color ColBtnDone = Color.FromArgb(151, 165, 105);      // --ui-moss-3 (#97a569)
        private static readonly Color ColBtnDoneHover = Color.FromArgb(195, 201, 138); // --ui-moss-4 (#c3c98a)
        private static readonly Color ColBtnLater = Color.FromArgb(239, 220, 184);     // --ui-linen-2 (#efdcb8)
        private static readonly Color ColBtnLaterHover = Color.FromArgb(246, 226, 160);// --ui-hay-3 (#f6e2a0)
        private static readonly Color ColBtnClose = Color.FromArgb(217, 135, 107);     // --ui-brick-3 (#d9876b)
        private static readonly Color ColBtnCloseHover = Color.FromArgb(184, 96, 74);  // --ui-brick-2 (#b8604a)
        private static readonly Color ColBtnPress = Color.FromArgb(197, 138, 82);      // --ui-wood-3 (#c58a52)
        private static readonly Color ColHighlight = Color.FromArgb(251, 240, 217);    // --ui-linen-3 (#fbf0d9)

        public CareTaskDefinition Task { get; }
        public string CloseReason { get; set; } = "auto-hide";
        private Timer _followTimer;
        private Timer _autoHideTimer;
        private Label _lblTitle;
        private Label _lblText;
        private Button _btnDone;
        private Button _btnLater;
        private Button _btnClose;
        private PictureBox _pbIcon;
        private Font _fontTitle;
        private Font _fontBody;
        private Font _fontBtnBold;
        private Font _fontBtnRegular;
        private DateTime _openedAt;

        private readonly BrainController _brain;

        public CareReminderForm(CareTaskDefinition task, BrainController brain)
        {
            Task = task ?? throw new ArgumentNullException(nameof(task));
            _brain = brain;

            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            BackColor = ColBg;
            ForeColor = ColWoodDark;
            DoubleBuffered = true;
            AutoScaleMode = AutoScaleMode.None;
            Size = new Size(248, 104);

            InitializeComponents();

            _followTimer = new Timer();
            _followTimer.Interval = 200;
            _followTimer.Tick += FollowTimer_Tick;

            _autoHideTimer = new Timer();
            _autoHideTimer.Interval = 180000; // 3 minutes
            _autoHideTimer.Tick += AutoHideTimer_Tick;

            _openedAt = DateTime.UtcNow;
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

        private void InitializeComponents()
        {
            _fontTitle = StatusBubble.CreatePixelFont(12f, FontStyle.Bold);
            _fontBody = StatusBubble.CreatePixelFont(11f, FontStyle.Regular);
            _fontBtnBold = StatusBubble.CreatePixelFont(11f, FontStyle.Bold);
            _fontBtnRegular = StatusBubble.CreatePixelFont(11f, FontStyle.Regular);

            _pbIcon = new PictureBox
            {
                Location = new Point(10, 10),
                Size = new Size(32, 32),
                SizeMode = PictureBoxSizeMode.Zoom,
                BackColor = Color.Transparent
            };
            string iconId = GetIconForTask(Task.Id);
            Bitmap bmp = PetIcons.GetIconBitmap(iconId);
            if (bmp != null)
            {
                _pbIcon.Image = ScaleBitmapNearest(bmp, 2);
            }
            Controls.Add(_pbIcon);

            _lblTitle = new Label
            {
                Location = new Point(48, 9),
                Size = new Size(168, 20),
                Text = Task.Title,
                Font = _fontTitle,
                ForeColor = ColWoodDark,
                UseMnemonic = false,
                BackColor = Color.Transparent
            };
            Controls.Add(_lblTitle);

            string firstSentence = GetFirstSentence(Task.Text);
            _lblText = new Label
            {
                Location = new Point(48, 29),
                Size = new Size(190, 38),
                Text = firstSentence,
                Font = _fontBody,
                ForeColor = ColWoodSoft,
                UseMnemonic = false,
                BackColor = Color.Transparent
            };
            Controls.Add(_lblText);

            _btnDone = new Button
            {
                Location = new Point(48, 70),
                Size = new Size(64, 24),
                Text = "Done",
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
                Font = _fontBtnBold,
                ForeColor = ColWoodDark,
                TabStop = false
            };
            AttachPixelButtonStyle(_btnDone, ColBtnDone, ColBtnDoneHover, ColBtnPress, ColBtnDoneHover);
            _btnDone.Click += BtnDone_Click;
            Controls.Add(_btnDone);

            _btnLater = new Button
            {
                Location = new Point(118, 70),
                Size = new Size(88, 24),
                Text = "Later (1 h)",
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
                Font = _fontBtnRegular,
                ForeColor = ColWoodDark,
                TabStop = false
            };
            AttachPixelButtonStyle(_btnLater, ColBtnLater, ColBtnLaterHover, ColBtnPress, ColHighlight);
            _btnLater.Click += BtnLater_Click;
            Controls.Add(_btnLater);

            _btnClose = new Button
            {
                Location = new Point(Width - 26, 6),
                Size = new Size(20, 20),
                Text = "×",
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
                Font = _fontBtnBold,
                ForeColor = ColWoodDark,
                TabStop = false
            };
            AttachPixelButtonStyle(_btnClose, ColBtnClose, ColBtnCloseHover, ColBtnPress, ColHighlight);
            _btnClose.Click += BtnClose_Click;
            Controls.Add(_btnClose);
        }

        private static void AttachPixelButtonStyle(Button btn, Color baseColor, Color hoverColor, Color pressColor, Color highlightColor)
        {
            btn.FlatAppearance.BorderSize = 0;
            bool isHovered = false;
            bool isPressed = false;

            btn.MouseEnter += (s, e) => { isHovered = true; btn.Invalidate(); };
            btn.MouseLeave += (s, e) => { isHovered = false; isPressed = false; btn.Invalidate(); };
            btn.MouseDown += (s, e) => { if (e.Button == MouseButtons.Left) { isPressed = true; btn.Invalidate(); } };
            btn.MouseUp += (s, e) => { isPressed = false; btn.Invalidate(); };

            btn.Paint += (s, e) =>
            {
                Graphics g = e.Graphics;
                g.SmoothingMode = SmoothingMode.None;
                g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.SingleBitPerPixelGridFit;

                Rectangle r = new Rectangle(0, 0, btn.Width, btn.Height);
                Color bg = isPressed ? pressColor : (isHovered ? hoverColor : baseColor);

                using (var bgBrush = new SolidBrush(bg))
                {
                    g.FillRectangle(bgBrush, r);
                }

                using (var borderPen = new Pen(ColWoodDark, 1f))
                {
                    g.DrawRectangle(borderPen, 0, 0, r.Width - 1, r.Height - 1);
                }

                if (!isPressed)
                {
                    using (var hiPen = new Pen(highlightColor, 1f))
                    {
                        g.DrawLine(hiPen, 1, 1, r.Width - 2, 1);
                        g.DrawLine(hiPen, 1, 1, 1, r.Height - 2);
                    }
                    using (var shPen = new Pen(ColWoodDark, 1f))
                    {
                        g.DrawLine(shPen, 1, r.Height - 2, r.Width - 2, r.Height - 2);
                    }
                }

                Rectangle textRect = isPressed ? new Rectangle(0, 1, r.Width, r.Height) : r;
                TextRenderer.DrawText(
                    g,
                    btn.Text,
                    btn.Font,
                    textRect,
                    btn.ForeColor,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);
            };
        }

        private string GetIconForTask(string taskId)
        {
            switch (taskId)
            {
                case "veggies": return "bell_pepper";
                case "water": return "water_drop";
                case "hay": return "hay";
                case "spot_clean": return "broom";
                case "weigh": return "scale";
                case "full_clean": return "broom";
                case "brush": return "brush";
                case "nails": return "nail_clipper";
                case "vet_check": return "vet";
                default: return "clover";
            }
        }

        private string GetFirstSentence(string text)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;
            int dot = text.IndexOf('.');
            if (dot >= 0) return text.Substring(0, dot + 1).Trim();
            return text.Trim();
        }

        private Bitmap ScaleBitmapNearest(Bitmap original, int scale)
        {
            int w = original.Width * scale;
            int h = original.Height * scale;
            Bitmap result = new Bitmap(w, h);
            using (Graphics g = Graphics.FromImage(result))
            {
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(original, new Rectangle(0, 0, w, h), new Rectangle(0, 0, original.Width, original.Height), GraphicsUnit.Pixel);
            }
            return result;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.None;
            using (var outerPen = new Pen(ColWoodDark, 2f))
            {
                e.Graphics.DrawRectangle(outerPen, 1, 1, Width - 2, Height - 2);
            }
            using (var innerPen = new Pen(ColInnerBevel, 1f))
            {
                e.Graphics.DrawRectangle(innerPen, 2, 2, Width - 5, Height - 5);
            }
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            BrainController.Log($"[Calendar] card shown: {Task.Id}");
            _followTimer.Start();
            _autoHideTimer.Start();
            UpdatePosition();

            _brain?.RequestAnimation("wheek");
            SoundManager.Instance?.PlayWheek("reminder");
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            BrainController.Log($"[Calendar] card closed: {Task.Id} ({CloseReason})");
            base.OnFormClosed(e);
        }

        private void FollowTimer_Tick(object sender, EventArgs e)
        {
            UpdatePosition();
        }

        private void AutoHideTimer_Tick(object sender, EventArgs e)
        {
            Close(); // Auto hide after 3 mins
        }

        private void UpdatePosition()
        {
            var pet = FormPet.ActivePet;
            if (pet != null && pet.Visible)
            {
                int petX = pet.Left + pet.Width / 2;
                int petY = pet.Top;
                int newX = petX - Width / 2;
                int newY = petY - Height - 10;

                // Keep on screen
                var screen = Screen.FromControl(pet);
                var bounds = screen.WorkingArea;
                if (newX < bounds.Left) newX = bounds.Left;
                if (newX + Width > bounds.Right) newX = bounds.Right - Width;
                if (newY < bounds.Top) newY = pet.Bottom + 10; // If it goes off top, put it below the pet

                Location = new Point(newX, newY);
            }
        }

        private void BtnDone_Click(object sender, EventArgs e)
        {
            CloseReason = "done";
            if (_brain?.Pet != null)
            {
                bool wasDue = _brain.Pet.MarkCareDone(Task.Id);
                if (wasDue)
                {
                    _brain.Pet.AwardCareTask();
                }
                _brain.RequestAnimation("happy");
                _brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();
            }
            Close();
        }

        private void BtnLater_Click(object sender, EventArgs e)
        {
            CloseReason = "later 60";
            SnoozeTask(60);
        }

        private void BtnClose_Click(object sender, EventArgs e)
        {
            CloseReason = "later 15";
            SnoozeTask(15);
        }

        private void SnoozeTask(int minutes)
        {
            if (_brain?.Pet != null)
            {
                _brain.Pet.SnoozeCare(Task.Id, minutes);
                _brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();
            }
            Close();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_followTimer != null)
                {
                    _followTimer.Stop();
                    _followTimer.Dispose();
                    _followTimer = null;
                }
                if (_autoHideTimer != null)
                {
                    _autoHideTimer.Stop();
                    _autoHideTimer.Dispose();
                    _autoHideTimer = null;
                }
                _fontTitle?.Dispose();
                _fontBody?.Dispose();
                _fontBtnBold?.Dispose();
                _fontBtnRegular?.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}