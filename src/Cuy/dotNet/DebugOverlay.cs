using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using Cuy.Core;
using Cuy.Core.AI;

namespace Cuy
{
    using CuyPet = Cuy.Core.Pet;

    public partial class DebugOverlay : Form
    {
        public static void Toggle()
        {
            BrainController.Instance?.ToggleOverlay();
        }

        private readonly BrainController _controller;
        private readonly Timer _refreshTimer;

        // Header controls
        private Panel _headerPanel;
        private Label _lblTitle;
        private Label _lblStatus;
        private Label _lblIdleInfo;
        private Button _btnToggleSpeed;
        private Button _btnToggleIdleTest;

        // Tabs
        private TabControl _tabControl;
        private TabPage _tabNeeds;
        private TabPage _tabDecisions;
        private TabPage _tabBudget;

        // Needs tab controls
        private TableLayoutPanel _needsLayout;
        private readonly List<NeedBarControl> _needBars = new List<NeedBarControl>();
        private GroupBox _grpCurrentAction;
        private Label _lblActionName;
        private Label _lblActionGroup;
        private Label _lblActionDuration;
        private Label _lblActionWalk;
        private Label _lblActionScore;
        private ProgressBar _pbActionProgress;

        // Decisions tab controls
        private ListView _lvDecisions;

        // Budget tab controls
        private ListView _lvBudget;
        private Label _lblBudgetSummary;
        private Label _lblRareBehaviors;

        public DebugOverlay(BrainController controller)
        {
            _controller = controller ?? throw new ArgumentNullException(nameof(controller));

            InitializeComponent();
            SetupCustomUi();

            // Position in the top right corner of the screen
            Rectangle workingArea = Screen.PrimaryScreen.WorkingArea;
            Location = new Point(workingArea.Right - Width - 30, workingArea.Top + 40);

            _refreshTimer = new Timer(components);
            _refreshTimer.Interval = 150;
            _refreshTimer.Tick += (s, e) => UpdateTelemetry();
            _refreshTimer.Start();

            this.FormClosing += (s, e) =>
            {
                if (e.CloseReason == CloseReason.UserClosing)
                {
                    e.Cancel = true;
                    this.Hide();
                }
            };

            this.KeyDown += (s, e) =>
            {
                if (e.KeyCode == Keys.F9)
                {
                    this.Hide();
                }
            };
        }

        private void SetupCustomUi()
        {
            this.DoubleBuffered = true;

            // 1. Header
            _headerPanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = 88,
                BackColor = Color.FromArgb(28, 32, 42),
                Padding = new Padding(12)
            };

            _lblTitle = new Label
            {
                Text = "🐹 PIG BRAIN TELEMETRY (F9)",
                Font = new Font("Segoe UI", 11f, FontStyle.Bold),
                ForeColor = Color.White,
                Location = new Point(12, 8),
                AutoSize = true
            };

            _lblStatus = new Label
            {
                Text = "● ACTIVE (Utility AI)",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(52, 211, 153),
                Location = new Point(14, 32),
                AutoSize = true
            };

            _lblIdleInfo = new Label
            {
                Text = "💤 Idle: 00:00 / 10:00 (awake)",
                Font = new Font("Segoe UI", 8.5f),
                ForeColor = Color.FromArgb(148, 163, 184),
                Location = new Point(14, 56),
                AutoSize = true
            };

            _btnToggleSpeed = new Button
            {
                Text = "⚡ Clock: 1x (switch to 60x)",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                ForeColor = Color.White,
                BackColor = Color.FromArgb(59, 130, 246),
                FlatStyle = FlatStyle.Flat,
                Size = new Size(195, 30),
                Location = new Point(Width - 230, 10),
                Anchor = AnchorStyles.Top | AnchorStyles.Right,
                Cursor = Cursors.Hand
            };
            _btnToggleSpeed.FlatAppearance.BorderSize = 0;
            _btnToggleSpeed.Click += (s, e) =>
            {
                _controller.ToggleSpeed60x();
                UpdateSpeedButtonText();
            };

            _btnToggleIdleTest = new Button
            {
                Text = "💤 Threshold: 10m (test: 10s)",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                ForeColor = Color.White,
                BackColor = Color.FromArgb(71, 85, 105),
                FlatStyle = FlatStyle.Flat,
                Size = new Size(195, 30),
                Location = new Point(Width - 230, 46),
                Anchor = AnchorStyles.Top | AnchorStyles.Right,
                Cursor = Cursors.Hand
            };
            _btnToggleIdleTest.FlatAppearance.BorderSize = 0;
            _btnToggleIdleTest.Click += (s, e) =>
            {
                _controller.SetTestIdleThreshold(!_controller.IsTestIdleThresholdActive);
                UpdateIdleButtonText();
            };

            _headerPanel.Controls.Add(_lblTitle);
            _headerPanel.Controls.Add(_lblStatus);
            _headerPanel.Controls.Add(_lblIdleInfo);
            _headerPanel.Controls.Add(_btnToggleSpeed);
            _headerPanel.Controls.Add(_btnToggleIdleTest);
            this.Controls.Add(_headerPanel);

            // 2. TabControl
            _tabControl = new TabControl
            {
                Dock = DockStyle.Fill,
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                Padding = new Point(12, 8)
            };

            _tabNeeds = new TabPage("🐹 Needs and current action") { BackColor = Color.FromArgb(20, 22, 28) };
            _tabDecisions = new TabPage("🧠 AI scores") { BackColor = Color.FromArgb(20, 22, 28) };
            _tabBudget = new TabPage("📊 Day budget and stats") { BackColor = Color.FromArgb(20, 22, 28) };

            _tabControl.TabPages.Add(_tabNeeds);
            _tabControl.TabPages.Add(_tabDecisions);
            _tabControl.TabPages.Add(_tabBudget);
            this.Controls.Add(_tabControl);

            SetupNeedsTab();
            SetupDecisionsTab();
            SetupBudgetTab();
            UpdateSpeedButtonText();
            UpdateIdleButtonText();
        }

        private void SetupNeedsTab()
        {
            _needsLayout = new TableLayoutPanel
            {
                Dock = DockStyle.Top,
                Height = 310,
                ColumnCount = 1,
                RowCount = 7,
                Padding = new Padding(12, 8, 12, 4)
            };

            string[] needNames = { "Fullness", "Vitamin C", "Energy", "Mood", "Cleanliness", "Teeth", "Health" };
            Color[] needColors =
            {
                Color.FromArgb(16, 185, 129),  // Emerald
                Color.FromArgb(245, 158, 11),  // Amber
                Color.FromArgb(56, 189, 248),  // Sky Blue
                Color.FromArgb(236, 72, 153),  // Pink
                Color.FromArgb(20, 184, 166),  // Teal
                Color.FromArgb(244, 63, 94),   // Rose
                Color.FromArgb(99, 102, 241)   // Indigo
            };

            for (int i = 0; i < 7; i++)
            {
                var bar = new NeedBarControl(needNames[i], needColors[i]);
                _needBars.Add(bar);
                _needsLayout.Controls.Add(bar);
            }
            _tabNeeds.Controls.Add(_needsLayout);

            // Current action card
            _grpCurrentAction = new GroupBox
            {
                Text = "Current pig action",
                Dock = DockStyle.Fill,
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                Padding = new Padding(12),
                Margin = new Padding(12)
            };

            _lblActionName = new Label
            {
                Text = "Action: ...",
                Font = new Font("Segoe UI", 11f, FontStyle.Bold),
                ForeColor = Color.White,
                Location = new Point(14, 25),
                AutoSize = true
            };

            _lblActionGroup = new Label
            {
                Text = "Budget group: ...",
                Font = new Font("Segoe UI", 9f),
                ForeColor = Color.FromArgb(203, 213, 225),
                Location = new Point(14, 52),
                AutoSize = true
            };

            _lblActionScore = new Label
            {
                Text = "AI score: ...",
                Font = new Font("Segoe UI", 9f),
                ForeColor = Color.FromArgb(203, 213, 225),
                Location = new Point(280, 52),
                AutoSize = true
            };

            _lblActionDuration = new Label
            {
                Text = "Remaining: ...",
                Font = new Font("Segoe UI", 9f),
                ForeColor = Color.FromArgb(203, 213, 225),
                Location = new Point(14, 76),
                AutoSize = true
            };

            _lblActionWalk = new Label
            {
                Text = "Distance: ...",
                Font = new Font("Segoe UI", 9f),
                ForeColor = Color.FromArgb(203, 213, 225),
                Location = new Point(280, 76),
                AutoSize = true
            };

            _pbActionProgress = new ProgressBar
            {
                Location = new Point(14, 105),
                Size = new Size(500, 16),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
                Maximum = 100
            };

            _grpCurrentAction.Controls.Add(_lblActionName);
            _grpCurrentAction.Controls.Add(_lblActionGroup);
            _grpCurrentAction.Controls.Add(_lblActionScore);
            _grpCurrentAction.Controls.Add(_lblActionDuration);
            _grpCurrentAction.Controls.Add(_lblActionWalk);
            _grpCurrentAction.Controls.Add(_pbActionProgress);

            var actionContainer = new Panel { Dock = DockStyle.Fill, Padding = new Padding(12, 0, 12, 12) };
            actionContainer.Controls.Add(_grpCurrentAction);
            _tabNeeds.Controls.Add(actionContainer);
        }

        private void SetupDecisionsTab()
        {
            _lvDecisions = new ListView
            {
                Dock = DockStyle.Fill,
                View = View.Details,
                FullRowSelect = true,
                GridLines = true,
                BackColor = Color.FromArgb(24, 28, 36),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9f),
                HeaderStyle = ColumnHeaderStyle.Nonclickable
            };

            _lvDecisions.Columns.Add("Action", 120);
            _lvDecisions.Columns.Add("Animation", 80);
            _lvDecisions.Columns.Add("Group", 120);
            _lvDecisions.Columns.Add("AI score", 100);
            _lvDecisions.Columns.Add("State / condition", 110);

            _tabDecisions.Controls.Add(_lvDecisions);
        }

        private void SetupBudgetTab()
        {
            var topPanel = new Panel { Dock = DockStyle.Top, Height = 60, Padding = new Padding(12) };
            _lblBudgetSummary = new Label
            {
                Text = "Pig day budget report (PLAN.md rule: deviation ≤ 5 pts)",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                ForeColor = Color.White,
                Dock = DockStyle.Fill
            };
            topPanel.Controls.Add(_lblBudgetSummary);
            _tabBudget.Controls.Add(topPanel);

            _lvBudget = new ListView
            {
                Dock = DockStyle.Fill,
                View = View.Details,
                FullRowSelect = true,
                GridLines = true,
                BackColor = Color.FromArgb(24, 28, 36),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9f),
                HeaderStyle = ColumnHeaderStyle.Nonclickable
            };

            _lvBudget.Columns.Add("Budget group", 160);
            _lvBudget.Columns.Add("Target %", 70);
            _lvBudget.Columns.Add("Actual %", 85);
            _lvBudget.Columns.Add("Deviation", 90);
            _lvBudget.Columns.Add("Status (≤ 5 pp)", 110);

            _tabBudget.Controls.Add(_lvBudget);

            var bottomPanel = new Panel { Dock = DockStyle.Bottom, Height = 75, Padding = new Padding(12) };
            _lblRareBehaviors = new Label
            {
                Text = "Rare behaviours per day:\r\nPopcorn: 0 | Zoomies: 0 | Scratching: 0",
                Font = new Font("Segoe UI", 9f),
                ForeColor = Color.FromArgb(203, 213, 225),
                Dock = DockStyle.Fill
            };
            bottomPanel.Controls.Add(_lblRareBehaviors);
            _tabBudget.Controls.Add(bottomPanel);
        }

        private void UpdateSpeedButtonText()
        {
            double mul = _controller.ClockMultiplier;
            if (Math.Abs(mul - 60.0) < 0.1)
            {
                _btnToggleSpeed.Text = "⚡ Clock: 60x (click for 1x)";
                _btnToggleSpeed.BackColor = Color.FromArgb(239, 68, 68); // Red / active fast
            }
            else
            {
                _btnToggleSpeed.Text = "⏱️ Clock: 1x (click for 60x)";
                _btnToggleSpeed.BackColor = Color.FromArgb(59, 130, 246); // Blue
            }
        }

        private void UpdateIdleButtonText()
        {
            if (_controller.IsTestIdleThresholdActive)
            {
                _btnToggleIdleTest.Text = "💤 Test threshold: 10s (click: 10m)";
                _btnToggleIdleTest.BackColor = Color.FromArgb(168, 85, 247); // Purple
            }
            else
            {
                _btnToggleIdleTest.Text = "💤 Threshold: 10m (click: 10s)";
                _btnToggleIdleTest.BackColor = Color.FromArgb(71, 85, 105); // Slate
            }
        }

        private void UpdateTelemetry()
        {
            if (!this.Visible) return;

            Pet pet = _controller.Pet;
            if (pet == null) return;

            // 1. Physics vs AI status
            if (_controller.IsPhysicsActive)
            {
                _lblStatus.Text = string.Format("● PAUSED (physics: {0})", _controller.PhysicsReason);
                _lblStatus.ForeColor = Color.FromArgb(245, 158, 11);
            }
            else
            {
                _lblStatus.Text = "● ACTIVE (Brain Utility AI in control)";
                _lblStatus.ForeColor = Color.FromArgb(52, 211, 153);
            }

            // 1b. Idle and sleep info
            TimeSpan idle = _controller.CurrentRealIdleTime;
            TimeSpan threshold = _controller.IdleThreshold;
            string stateStr;
            Color stateColor;
            if (_controller.IsWakingUp)
            {
                stateStr = "Waking up (wake_up)...";
                stateColor = Color.FromArgb(251, 191, 36);
            }
            else if (pet.IsSleeping)
            {
                stateStr = "Asleep (sleep) 💤";
                stateColor = Color.FromArgb(147, 197, 253);
            }
            else if (_controller.IsUserIdle)
            {
                stateStr = "User idle (sleep preferred)";
                stateColor = Color.FromArgb(167, 139, 250);
            }
            else
            {
                stateStr = "Active";
                stateColor = Color.FromArgb(148, 163, 184);
            }

            _lblIdleInfo.Text = string.Format("💤 Idle: {0:mm\\:ss} / {1:mm\\:ss} (state: {2})",
                idle, threshold, stateStr);
            _lblIdleInfo.ForeColor = stateColor;

            // 2. Need bars
            var needs = pet.Needs;
            _needBars[0].SetValue(needs.Satiety, "-8.0/h");
            _needBars[1].SetValue(needs.VitaminC, "-4.0/h");
            _needBars[2].SetValue(needs.Energy, pet.IsSleeping ? "+rising" : "-6.0/h");
            _needBars[3].SetValue(needs.Mood, "-5.0/h");
            _needBars[4].SetValue(needs.Cleanliness, "");
            _needBars[5].SetValue(needs.Teeth, "-2.0/h");
            _needBars[6].SetValue(needs.Health, "");

            // 3. Current action card
            var action = _controller.CurrentAction;
            if (action != null)
            {
                _lblActionName.Text = string.Format("Action: {0} (animation: {1})", action.ActionId, action.AnimationName);
                _lblActionGroup.Text = string.Format("Group: {0}", action.Group);
                _lblActionScore.Text = string.Format("AI score: {0:0.00}", action.Score);

                double remaining = Math.Max(0.0, _controller.RemainingDuration.TotalSeconds);
                double total = Math.Max(0.1, action.Duration.TotalSeconds);
                _lblActionDuration.Text = string.Format("Remaining: {0:0.#}s / {1:0.#}s", remaining, total);

                int pct = (int)Math.Max(0, Math.Min(100, ((total - remaining) / total) * 100));
                _pbActionProgress.Value = pct;

                if (action.Definition.IsMovement)
                {
                    _lblActionWalk.Text = string.Format("Walk: {0} / {1} px ({2})",
                        _controller.TraversedWalkDistancePx,
                        _controller.TargetWalkDistancePx,
                        _controller.IsWalking ? "moving" : "stopping");
                }
                else
                {
                    _lblActionWalk.Text = "Movement: stationary";
                }
            }

            // 4. AI decisions tab (refreshed while active)
            if (_tabControl.SelectedTab == _tabDecisions)
            {
                UpdateDecisionsList();
            }

            // 5. Budget tab
            if (_tabControl.SelectedTab == _tabBudget)
            {
                UpdateBudgetList();
            }

            UpdateSpeedButtonText();
        }

        private void UpdateDecisionsList()
        {
            var scores = _controller.GetActionScores();
            if (scores == null) return;

            _lvDecisions.BeginUpdate();
            _lvDecisions.Items.Clear();

            // Sort by AI score, descending
            var sorted = new List<ActionScoreInfo>(scores);
            sorted.Sort((a, b) => b.Score.CompareTo(a.Score));

            foreach (var s in sorted)
            {
                var item = new ListViewItem(s.ActionId);
                item.SubItems.Add(s.AnimationName);
                item.SubItems.Add(s.Group);
                item.SubItems.Add(string.Format("{0:0.00}", s.Score));

                if (s.IsCurrent)
                {
                    item.SubItems.Add("▶ CHOSEN");
                    item.BackColor = Color.FromArgb(30, 58, 138); // Blue highlight
                    item.ForeColor = Color.White;
                }
                else if (s.IsAvailable)
                {
                    item.SubItems.Add("Available");
                    item.ForeColor = Color.FromArgb(203, 213, 225);
                }
                else
                {
                    item.SubItems.Add(s.UnavailableReason ?? "Blocked");
                    item.ForeColor = Color.FromArgb(148, 163, 184);
                }

                _lvDecisions.Items.Add(item);
            }
            _lvDecisions.EndUpdate();
        }

        private void UpdateBudgetList()
        {
            var report = _controller.GetBudgetReport();
            if (report == null) return;

            _lblBudgetSummary.Text = string.Format(
                "Day budget report (time: {0:0.#}h, tolerance ≤ 5 pts: {1})",
                report.TotalTime.TotalHours,
                report.IsAllWithinTolerance ? "✓ WITHIN" : "⚠️ OUT OF TOLERANCE");

            _lvBudget.BeginUpdate();
            _lvBudget.Items.Clear();

            foreach (var g in report.Groups)
            {
                var item = new ListViewItem(g.GroupName);
                item.SubItems.Add(string.Format("{0:0}%", g.TargetPercentage));
                item.SubItems.Add(string.Format("{0:0.0}%", g.ActualPercentage));
                item.SubItems.Add(string.Format("{0:+0.0;-0.0;0.0} pp", g.DeviationPercentagePoints));

                if (g.IsWithinTolerance)
                {
                    item.SubItems.Add("✓ OK");
                    item.ForeColor = Color.FromArgb(52, 211, 153); // Green
                }
                else
                {
                    item.SubItems.Add("⚠️ Deviation");
                    item.ForeColor = Color.FromArgb(245, 158, 11); // Amber
                }

                _lvBudget.Items.Add(item);
            }
            _lvBudget.EndUpdate();

            string rareText = "Rare behaviours (per day):\r\n";
            foreach (var kv in report.RareBehaviorsPerDay)
            {
                string target = report.RareBehaviorTargets.ContainsKey(kv.Key) ? report.RareBehaviorTargets[kv.Key] : "-";
                rareText += string.Format("{0}: {1:0.0}/day (target: {2})  |  ", kv.Key, kv.Value, target);
            }
            _lblRareBehaviors.Text = rareText.TrimEnd(' ', '|');
        }
    }

    /// <summary>
    /// A single need bar with name, percentage and colouring.
    /// </summary>
    internal sealed class NeedBarControl : UserControl
    {
        private readonly string _name;
        private readonly Color _color;
        private double _value;
        private string _rateInfo = "";

        public NeedBarControl(string name, Color color)
        {
            _name = name;
            _color = color;
            this.Height = 38;
            this.Dock = DockStyle.Top;
            this.DoubleBuffered = true;
        }

        public void SetValue(double val, string rateInfo)
        {
            _value = Math.Max(0.0, Math.Min(100.0, val));
            _rateInfo = rateInfo ?? "";
            this.Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Label text
            string title = string.Format("{0}: {1:0.#}% {2}", _name, _value, _rateInfo);
            using (var brush = new SolidBrush(Color.FromArgb(226, 232, 240)))
            using (var font = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            {
                g.DrawString(title, font, brush, new PointF(0, 0));
            }

            // Bar background
            int barY = 18;
            int barH = 12;
            int barW = Width - 4;
            var bgRect = new Rectangle(0, barY, barW, barH);

            using (var bgBrush = new SolidBrush(Color.FromArgb(39, 45, 58)))
            {
                g.FillRectangle(bgBrush, bgRect);
            }

            // Bar fill
            int fillW = (int)((_value / 100.0) * barW);
            if (fillW > 0)
            {
                var fillRect = new Rectangle(0, barY, fillW, barH);
                Color barColor = _color;

                // Red when the need is critically low
                if (_value < 20.0) barColor = Color.FromArgb(239, 68, 68);
                else if (_value < 40.0) barColor = Color.FromArgb(245, 158, 11);

                using (var fillBrush = new SolidBrush(barColor))
                {
                    g.FillRectangle(fillBrush, fillRect);
                }
            }

            // Bar frame
            using (var borderPen = new Pen(Color.FromArgb(51, 65, 85), 1))
            {
                g.DrawRectangle(borderPen, bgRect);
            }
        }
    }

    /// <summary>Alias for backward compatibility.</summary>
    public static class FormBrainOverlay
    {
        public static void Toggle() => DebugOverlay.Toggle();
    }
}
