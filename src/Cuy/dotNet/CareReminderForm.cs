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
            BackColor = ColorTranslator.FromHtml("#f7ecd9"); // Cream
            ForeColor = ColorTranslator.FromHtml("#2b1712"); // Dark brown
            DoubleBuffered = true;
            AutoScaleMode = AutoScaleMode.None;
            Size = new Size(240, 100);

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
            _pbIcon = new PictureBox
            {
                Location = new Point(8, 8),
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
                Location = new Point(48, 8),
                Size = new Size(164, 20),
                Text = Task.Title,
                Font = new Font("Arial", 9F, FontStyle.Bold),
                UseMnemonic = false,
                BackColor = Color.Transparent
            };
            Controls.Add(_lblTitle);

            string firstSentence = GetFirstSentence(Task.Text);
            _lblText = new Label
            {
                Location = new Point(48, 28),
                Size = new Size(184, 40),
                Text = firstSentence,
                Font = new Font("Arial", 8.5F, FontStyle.Regular),
                UseMnemonic = false,
                BackColor = Color.Transparent
            };
            Controls.Add(_lblText);

            _btnDone = new Button
            {
                Location = new Point(48, 68),
                Size = new Size(60, 24),
                Text = "Done",
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
                Font = new Font("Arial", 8.5F, FontStyle.Bold)
            };
            _btnDone.FlatAppearance.BorderColor = ForeColor;
            _btnDone.Click += BtnDone_Click;
            Controls.Add(_btnDone);

            _btnLater = new Button
            {
                Location = new Point(116, 68),
                Size = new Size(80, 24),
                Text = "Later (1 h)",
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
                Font = new Font("Arial", 8.5F)
            };
            _btnLater.FlatAppearance.BorderColor = ForeColor;
            _btnLater.Click += BtnLater_Click;
            Controls.Add(_btnLater);

            _btnClose = new Button
            {
                Location = new Point(Width - 24, 4),
                Size = new Size(20, 20),
                Text = "×",
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
                Font = new Font("Arial", 10F, FontStyle.Bold)
            };
            _btnClose.FlatAppearance.BorderSize = 0;
            _btnClose.Click += BtnClose_Click;
            Controls.Add(_btnClose);
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
            using (var p = new Pen(ForeColor, 3))
            {
                e.Graphics.DrawRectangle(p, 1, 1, Width - 3, Height - 3); // Draw border inside the edge
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
            }
            base.Dispose(disposing);
        }
    }
}