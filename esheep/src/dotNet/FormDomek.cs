using System;
using System.Drawing;
using System.Windows.Forms;
using SwinkaCore;

namespace DesktopPet
{
    /// <summary>
    /// Okno Domku świnki. Na tym etapie (B5) proste okno prezentujące stan pupila
    /// oraz informujące o pełnym widoku Domku w etapie C.
    /// Otwierane z menu zasobnika oraz dwuklikiem na ikonę w zasobniku.
    /// </summary>
    public partial class FormDomek : Form
    {
        private static FormDomek _instance;

        private Label _lblHeader;
        private Label _lblSubheader;
        private Panel _pnlInfo;
        private Label _lblName;
        private Label _lblStage;
        private Label _lblBond;
        private Label _lblClovers;
        private Label _lblNeeds;
        private Label _lblPlaceholderNote;
        private Button _btnClose;
        private Timer _refreshTimer;

        public FormDomek()
        {
            InitializeComponent();
            SetupCustomUI();
        }

        public static void ShowDomek()
        {
            if (_instance == null || _instance.IsDisposed)
            {
                _instance = new FormDomek();
            }

            _instance.RefreshData();
            _instance.Show();
            _instance.WindowState = FormWindowState.Normal;
            _instance.BringToFront();
            _instance.Focus();
        }

        private void SetupCustomUI()
        {
            this.BackColor = Color.FromArgb(254, 250, 243);
            this.Icon = SwinkaIcons.GetTrayIcon();

            _lblHeader = new Label
            {
                Text = "🏠 Domek świnki",
                Font = new Font("Segoe UI", 16F, FontStyle.Bold),
                ForeColor = Color.FromArgb(64, 40, 20),
                Location = new Point(20, 20),
                Size = new Size(380, 40),
                TextAlign = ContentAlignment.MiddleCenter
            };
            this.Controls.Add(_lblHeader);

            _lblSubheader = new Label
            {
                Text = "(na razie pusty – pełny widok WebView2 w etapie C)",
                Font = new Font("Segoe UI", 9F, FontStyle.Italic),
                ForeColor = Color.FromArgb(140, 110, 80),
                Location = new Point(20, 60),
                Size = new Size(380, 25),
                TextAlign = ContentAlignment.MiddleCenter
            };
            this.Controls.Add(_lblSubheader);

            _pnlInfo = new Panel
            {
                Location = new Point(20, 95),
                Size = new Size(380, 440),
                BackColor = Color.FromArgb(255, 255, 255),
                BorderStyle = BorderStyle.FixedSingle
            };
            this.Controls.Add(_pnlInfo);

            _lblName = new Label
            {
                Location = new Point(15, 15),
                Size = new Size(350, 30),
                Font = new Font("Segoe UI", 12F, FontStyle.Bold),
                ForeColor = Color.FromArgb(50, 40, 30)
            };
            _pnlInfo.Controls.Add(_lblName);

            _lblStage = new Label
            {
                Location = new Point(15, 50),
                Size = new Size(350, 25),
                Font = new Font("Segoe UI", 10F, FontStyle.Regular),
                ForeColor = Color.FromArgb(80, 70, 60)
            };
            _pnlInfo.Controls.Add(_lblStage);

            _lblBond = new Label
            {
                Location = new Point(15, 80),
                Size = new Size(350, 25),
                Font = new Font("Segoe UI", 10F, FontStyle.Regular),
                ForeColor = Color.FromArgb(80, 70, 60)
            };
            _pnlInfo.Controls.Add(_lblBond);

            _lblClovers = new Label
            {
                Location = new Point(15, 110),
                Size = new Size(350, 25),
                Font = new Font("Segoe UI", 10F, FontStyle.Bold),
                ForeColor = Color.FromArgb(40, 140, 40)
            };
            _pnlInfo.Controls.Add(_lblClovers);

            _lblNeeds = new Label
            {
                Location = new Point(15, 145),
                Size = new Size(350, 180),
                Font = new Font("Consolas", 9.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(60, 50, 40)
            };
            _pnlInfo.Controls.Add(_lblNeeds);

            _lblPlaceholderNote = new Label
            {
                Location = new Point(15, 335),
                Size = new Size(350, 90),
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(120, 100, 80),
                Text = "W etapie C w tym oknie znajdzie się interfejs pixel art w WebView2: interaktywny pokój, miseczka, paśnik, sklepik za koniczynki, album zachowań, pamiętnik oraz minigry!"
            };
            _pnlInfo.Controls.Add(_lblPlaceholderNote);

            _btnClose = new Button
            {
                Text = "Zamknij domek",
                Location = new Point(135, 550),
                Size = new Size(150, 35),
                Font = new Font("Segoe UI", 9.5F, FontStyle.Regular),
                BackColor = Color.FromArgb(245, 235, 220),
                FlatStyle = FlatStyle.Flat
            };
            _btnClose.Click += (s, e) => this.Hide();
            this.Controls.Add(_btnClose);

            _refreshTimer = new Timer();
            _refreshTimer.Interval = 1000;
            _refreshTimer.Tick += (s, e) =>
            {
                if (this.Visible) RefreshData();
            };
            _refreshTimer.Start();
        }

        public void RefreshData()
        {
            var brain = SwinkaBrainController.Instance;
            if (brain == null || brain.Pet == null)
            {
                _lblName.Text = "Świnka morska";
                _lblStage.Text = "Etap: wczytywanie...";
                _lblBond.Text = "Więź: -";
                _lblClovers.Text = "Koniczynki: 0 🍀";
                _lblNeeds.Text = "Potrzeby: brak danych";
                return;
            }

            var pet = brain.Pet;
            var state = pet.State;
            var needs = pet.Needs;

            _lblName.Text = "🐹 " + (string.IsNullOrWhiteSpace(state.Name) ? "Świnka" : state.Name);
            _lblStage.Text = string.Format("Etap życia: {0} ({1})", LifeStages.Polish(pet.Stage), pet.Age);
            _lblBond.Text = string.Format("Poziom więzi: {0} ({1} pkt)", state.Bond.Level, state.Bond.Points);
            _lblClovers.Text = string.Format("Koniczynki: {0} 🍀", state.Clovers);

            string najnizsza = NeedNames.Polish(needs.Lowest());
            _lblNeeds.Text = string.Format(
                "--- POTRZEBY ŚWINKI ---\r\n" +
                "• Najedzenie:     {0,3:0}%\r\n" +
                "• Witamina C:     {1,3:0}%\r\n" +
                "• Energia:        {2,3:0}%\r\n" +
                "• Humor:          {3,3:0}%\r\n" +
                "• Czystość:       {4,3:0}%\r\n" +
                "• Ząbki:          {5,3:0}%\r\n" +
                "• Zdrowie:        {6,3:0}%\r\n" +
                "Najniższa potrzeba: {7}",
                needs.Satiety,
                needs.VitaminC,
                needs.Energy,
                needs.Mood,
                needs.Cleanliness,
                needs.Teeth,
                needs.Health,
                najnizsza
            );
        }


        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                this.Hide();
                return;
            }
            base.OnFormClosing(e);
        }
    }
}
