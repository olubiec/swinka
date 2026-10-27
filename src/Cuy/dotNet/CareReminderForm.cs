using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using Cuy.Core.Care;

namespace Cuy
{
    public class CareReminderForm : Form
    {
        private static CareReminderForm _activeForm;

        private CareTaskDefinition _task;
        private System.Windows.Forms.Timer _followTimer;
        private System.Windows.Forms.Timer _hideTimer;
        private bool _isActionHandled;
        private Button _doneBtn;
        private Button _laterBtn;
        private Label _closeLabel;

        public static void ShowReminder(CareTaskDefinition task)
        {
            if (_activeForm != null && !_activeForm.IsDisposed)
            {
                if (_activeForm._task?.Id == task.Id) return;
                _activeForm.Close();
            }

            _activeForm = new CareReminderForm(task);
            _activeForm.Show();
        }

        public static void CloseForTask(string taskId)
        {
            if (_activeForm != null && !_activeForm.IsDisposed && _activeForm._task?.Id == taskId)
            {
                _activeForm._isActionHandled = true;
                _activeForm.Close();
            }
        }

        private CareReminderForm(CareTaskDefinition task)
        {
            _task = task;

            FormBorderStyle = FormBorderStyle.None;
            TopMost = true;
            ShowInTaskbar = false;
            DoubleBuffered = true;
            BackColor = ColorTranslator.FromHtml("#f7ecd9");
            Size = new Size(200, 100); // Temporary size, will be updated based on content

            SetupUI();

            _followTimer = new System.Windows.Forms.Timer { Interval = 200 };
            _followTimer.Tick += FollowTimer_Tick;
            _followTimer.Start();

            _hideTimer = new System.Windows.Forms.Timer { Interval = 3 * 60 * 1000 };
            _hideTimer.Tick += HideTimer_Tick;
            _hideTimer.Start();

            FormClosed += CareReminderForm_FormClosed;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            using (var pen = new Pen(ColorTranslator.FromHtml("#2b1712"), 3))
            {
                e.Graphics.DrawRectangle(pen, 1, 1, Width - 3, Height - 3);
            }
        }

        private void SetupUI()
        {
            _closeLabel = new Label
            {
                Text = "×",
                Font = new Font("Arial", 12, FontStyle.Bold),
                ForeColor = ColorTranslator.FromHtml("#2b1712"),
                Cursor = Cursors.Hand,
                AutoSize = true,
                Location = new Point(Width - 25, 5)
            };
            _closeLabel.Click += (s, e) => CloseWithSnooze(15);
            Controls.Add(_closeLabel);

            string iconName = GetIconName(_task.Id);
            Bitmap iconBmp = PetIcons.GetIconBitmap(iconName);
            if (iconBmp != null)
            {
                var iconBox = new PictureBox
                {
                    Image = ResizeBitmap(iconBmp, iconBmp.Width * 2, iconBmp.Height * 2),
                    SizeMode = PictureBoxSizeMode.AutoSize,
                    Location = new Point(10, 10)
                };
                Controls.Add(iconBox);
            }

            var titleLabel = new Label
            {
                Text = _task.Title,
                Font = new Font(FontFamily.GenericSansSerif, 10, FontStyle.Bold),
                ForeColor = ColorTranslator.FromHtml("#2b1712"),
                AutoSize = true,
                Location = new Point(50, 10)
            };
            Controls.Add(titleLabel);

            string firstSentence = GetFirstSentence(_task.Text);
            var textLabel = new Label
            {
                Text = firstSentence,
                Font = new Font(FontFamily.GenericSansSerif, 8),
                ForeColor = ColorTranslator.FromHtml("#2b1712"),
                AutoSize = false,
                Size = new Size(180, 40),
                Location = new Point(10, 45)
            };
            Controls.Add(textLabel);

            _doneBtn = new Button
            {
                Text = "Done",
                Font = new Font(FontFamily.GenericSansSerif, 8, FontStyle.Bold),
                BackColor = ColorTranslator.FromHtml("#e4d2b8"),
                FlatStyle = FlatStyle.Flat,
                Size = new Size(60, 25),
                Location = new Point(10, 90),
                Cursor = Cursors.Hand
            };
            _doneBtn.FlatAppearance.BorderSize = 1;
            _doneBtn.FlatAppearance.BorderColor = ColorTranslator.FromHtml("#2b1712");
            _doneBtn.Click += (s, e) => MarkDone();
            Controls.Add(_doneBtn);

            _laterBtn = new Button
            {
                Text = "Later (1 h)",
                Font = new Font(FontFamily.GenericSansSerif, 8),
                BackColor = ColorTranslator.FromHtml("#e4d2b8"),
                FlatStyle = FlatStyle.Flat,
                Size = new Size(80, 25),
                Location = new Point(80, 90),
                Cursor = Cursors.Hand
            };
            _laterBtn.FlatAppearance.BorderSize = 1;
            _laterBtn.FlatAppearance.BorderColor = ColorTranslator.FromHtml("#2b1712");
            _laterBtn.Click += (s, e) => CloseWithSnooze(60);
            Controls.Add(_laterBtn);

            Size = new Size(200, 130);
            _closeLabel.Location = new Point(Width - 25, 5);
        }

        private string GetIconName(string taskId)
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
                default: return taskId;
            }
        }

        private string GetFirstSentence(string text)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;
            int idx = text.IndexOf('.');
            if (idx >= 0) return text.Substring(0, idx + 1);
            return text;
        }

        private Bitmap ResizeBitmap(Bitmap bmp, int width, int height)
        {
            var result = new Bitmap(width, height);
            using (var g = Graphics.FromImage(result))
            {
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(bmp, 0, 0, width, height);
            }
            return result;
        }

        private void FollowTimer_Tick(object sender, EventArgs e)
        {
            var pet = FormPet.ActivePet;
            if (pet != null)
            {
                var petBounds = pet.Bounds;
                int x = petBounds.X + (petBounds.Width / 2) - (Width / 2);
                int y = petBounds.Y - Height - 10;

                // Keep on screen
                var screen = Screen.FromRectangle(petBounds).WorkingArea;
                if (x < screen.Left) x = screen.Left;
                if (x + Width > screen.Right) x = screen.Right - Width;
                if (y < screen.Top) y = petBounds.Bottom + 10; // If above screen, put below

                Location = new Point(x, y);
            }
        }

        private void HideTimer_Tick(object sender, EventArgs e)
        {
            _isActionHandled = true; // Auto-hide counts as nothing
            Close();
        }

        private void MarkDone()
        {
            var brain = BrainController.Instance;
            var pet = brain?.Pet;
            if (pet != null)
            {
                bool wasDue = pet.MarkCareDone(_task.Id);
                if (wasDue)
                {
                    pet.AwardCareTask();
                }
                brain.RequestAnimation("happy");
                brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();
            }
            _isActionHandled = true;
            Close();
        }

        private void CloseWithSnooze(int minutes)
        {
            var brain = BrainController.Instance;
            var pet = brain?.Pet;
            if (pet != null)
            {
                pet.SnoozeCare(_task.Id, minutes);
                brain.Session.AutoSaver.SaveNow();
                HomeWindow.NotifyStateChanged();
            }
            _isActionHandled = true;
            Close();
        }

        private void CareReminderForm_FormClosed(object sender, FormClosedEventArgs e)
        {
            _followTimer?.Stop();
            _hideTimer?.Stop();

            if (!_isActionHandled)
            {
                CloseWithSnooze(15);
            }

            if (_activeForm == this)
            {
                _activeForm = null;
            }
        }

        protected override bool ShowWithoutActivation => true;

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                const int WS_EX_NOACTIVATE = 0x08000000;
                cp.ExStyle |= WS_EX_NOACTIVATE;
                return cp;
            }
        }
    }
}
