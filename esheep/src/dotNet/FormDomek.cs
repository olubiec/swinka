using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SwinkaCore;

namespace DesktopPet
{
    /// <summary>
    /// Okno Domku świnki oparte na WebView2 (Etap C1).
    /// - Wymiary: 420x640 px, bez ramki systemowej (FormBorderStyle.None),
    /// - Przezroczyste zaokrąglone rogi i cień na pulpicie (DWM Composition),
    /// - Brak na pasku zadań (ShowInTaskbar = false),
    /// - Pozycjonowane automatycznie przy zasobniku systemowym,
    /// - Zawartość serwowana z lokalnego folderu /domek przez SetVirtualHostNameToFolderMapping,
    /// - Most C# ↔ JS ze SwinkaCore jako jedynym źródłem prawdy.
    /// </summary>
    public partial class FormDomek : Form
    {
        private static FormDomek _instance;

        private WebView2 _webView;
        private Timer _refreshTimer;
        private bool _isWebViewReady = false;
        private Point _dragStartCursor;
        private Point _dragStartLocation;

        #region Win32 API (DWM & Window Drag)

        [StructLayout(LayoutKind.Sequential)]
        private struct MARGINS
        {
            public int cxLeftWidth;
            public int cxRightWidth;
            public int cyTopHeight;
            public int cyBottomHeight;
        }

        [DllImport("dwmapi.dll")]
        private static extern int DwmExtendFrameIntoClientArea(IntPtr hWnd, ref MARGINS pMarInset);

        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        public static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);

        private const int WM_NCLBUTTONDOWN = 0xA1;
        private const int HT_CAPTION = 0x2;

        #endregion

        public FormDomek()
        {
            InitializeComponent();
            SetupFormStyle();
            SetupRefreshTimer();
            AttachPetEvents();
        }

        public static FormDomek Instance => _instance;

        /// <summary>
        /// Powiadamia otwarte okno Domku o zmianie stanu w SwinkaCore (np. po karmieniu na pulpicie lub sprzątnięciu).
        /// </summary>
        public static void NotifyStateChanged()
        {
            if (_instance != null && !_instance.IsDisposed && _instance.Visible)
            {
                if (_instance.InvokeRequired)
                {
                    _instance.BeginInvoke(new Action(() => _instance.SendStateToWebView()));
                }
                else
                {
                    _instance.SendStateToWebView();
                }
            }
        }

        private void AttachPetEvents()
        {
            try
            {
                var pet = SwinkaBrainController.Instance?.Pet;
                if (pet == null) return;
                pet.NeedLow += (s, e) => NotifyStateChanged();
                pet.NeedCritical += (s, e) => NotifyStateChanged();
                pet.StageChanged += (s, e) => NotifyStateChanged();
                pet.Birthday += (s, e) => NotifyStateChanged();
                pet.LevelUp += (s, e) => NotifyStateChanged();
            }
            catch { }
        }

        public static void ShowDomek()
        {
            SwinkaBrainController.Log("[FormDomek] ShowDomek() wywołano.");
            if (_instance == null || _instance.IsDisposed)
            {
                _instance = new FormDomek();
            }

            _instance.PositionNearTray();
            _instance.Show();
            _instance.WindowState = FormWindowState.Normal;
            _instance.BringToFront();
            _instance.Focus();

            if (_instance._isWebViewReady)
            {
                _instance.SendStateToWebView();
            }
        }

        private void SetupFormStyle()
        {
            this.AutoScaleMode = AutoScaleMode.None;
            this.Size = new Size(420, 640);
            this.ClientSize = new Size(420, 640);
            this.MaximumSize = new Size(420, 640);
            this.MinimumSize = new Size(420, 640);
            this.FormBorderStyle = FormBorderStyle.None;
            this.ShowInTaskbar = false;
            this.DoubleBuffered = true;
            this.BackColor = Color.Black; // DWM przy marginesach -1 traktuje czarne tło jako przezroczysty kanał alfa
            try
            {
                this.Icon = SwinkaIcons.GetTrayIcon();
            }
            catch { }
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            EnableDwmTransparency();
            if (_webView == null)
            {
                SetupWebViewAsync();
            }
        }

        private void EnableDwmTransparency()
        {
            try
            {
                MARGINS margins = new MARGINS
                {
                    cxLeftWidth = -1,
                    cxRightWidth = -1,
                    cyTopHeight = -1,
                    cyBottomHeight = -1
                };
                DwmExtendFrameIntoClientArea(this.Handle, ref margins);
            }
            catch (Exception ex)
            {
                SwinkaBrainController.Log("[FormDomek] Ostrzeżenie DWM: " + ex.Message);
            }
        }

        public void PositionNearTray()
        {
            try
            {
                Screen screen = Screen.FromPoint(Cursor.Position) ?? Screen.PrimaryScreen;
                Rectangle wa = screen.WorkingArea;
                Rectangle bounds = screen.Bounds;

                const int padding = 12;
                int targetX = wa.Right - this.Width - padding;
                int targetY = wa.Bottom - this.Height - padding;

                // Sprawdź nietypowe położenie paska zadań (góra/lewo)
                if (wa.Top > bounds.Top)
                {
                    targetY = wa.Top + padding;
                }
                else if (wa.Left > bounds.Left)
                {
                    targetX = wa.Left + padding;
                }

                // Ograniczenie do obszaru roboczego
                targetX = Math.Max(wa.Left, Math.Min(targetX, wa.Right - this.Width));
                targetY = Math.Max(wa.Top, Math.Min(targetY, wa.Bottom - this.Height));

                this.Location = new Point(targetX, targetY);
            }
            catch
            {
                this.Location = new Point(
                    Math.Max(0, Screen.PrimaryScreen.WorkingArea.Right - this.Width - 16),
                    Math.Max(0, Screen.PrimaryScreen.WorkingArea.Bottom - this.Height - 16)
                );
            }
        }

        private async void SetupWebViewAsync()
        {
            try
            {
                SwinkaBrainController.Log("[FormDomek] SetupWebViewAsync start.");
                _webView = new WebView2
                {
                    Dock = DockStyle.Fill,
                    DefaultBackgroundColor = Color.Transparent
                };
                this.Controls.Add(_webView);

                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Swinka",
                    "WebView2Profile"
                );
                Directory.CreateDirectory(userDataFolder);

                SwinkaBrainController.Log("[FormDomek] Tworzenie CoreWebView2Environment...");
                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                SwinkaBrainController.Log("[FormDomek] CoreWebView2Environment utworzone. Inicjalizacja kontrolki...");
                await _webView.EnsureCoreWebView2Async(env);
                SwinkaBrainController.Log("[FormDomek] EnsureCoreWebView2Async zakończone.");

                _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                _webView.CoreWebView2.Settings.AreDevToolsEnabled = true;

                string domekDir = ResolveDomekPath();
                SwinkaBrainController.Log(string.Format("[FormDomek] Mapowanie folderu /domek z: {0}", domekDir));

                _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "swinka.domek",
                    domekDir,
                    CoreWebView2HostResourceAccessKind.Allow
                );

                _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
                _webView.CoreWebView2.NavigationCompleted += (s, e) =>
                {
                    _isWebViewReady = true;
                    SwinkaBrainController.Log("[FormDomek] Nawigacja https://swinka.domek/index.html zakończona.");
                    SendStateToWebView();
                };

                _webView.CoreWebView2.Navigate("https://swinka.domek/index.html");
            }
            catch (Exception ex)
            {
                SwinkaBrainController.Log("[FormDomek] Błąd inicjalizacji WebView2: " + ex.ToString());
            }
        }

        private static string ResolveDomekPath()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            // 1. Sprawdź folder domek obok pliku wykonywalnego
            string p1 = Path.Combine(baseDir, "domek");
            if (Directory.Exists(p1)) return Path.GetFullPath(p1);

            // 2. Szukaj w górę drzewa katalogów (repozytorium / solucja)
            DirectoryInfo dir = new DirectoryInfo(baseDir);
            while (dir != null)
            {
                string candidate = Path.Combine(dir.FullName, "domek");
                if (Directory.Exists(candidate))
                {
                    return Path.GetFullPath(candidate);
                }
                dir = dir.Parent;
            }

            // 3. Sprawdź bieżący katalog roboczy
            string p4 = Path.GetFullPath("domek");
            if (Directory.Exists(p4)) return Path.GetFullPath(p4);

            return p1;
        }

        private void SetupRefreshTimer()
        {
            _refreshTimer = new Timer();
            _refreshTimer.Interval = 1000;
            _refreshTimer.Tick += (s, e) =>
            {
                if (this.Visible && _isWebViewReady)
                {
                    SendStateToWebView();
                }
            };
            _refreshTimer.Start();
        }

        /// <summary>
        /// Wysyła aktualny stan gry ze SwinkaCore do kontrolki WebView2 w formacie JSON.
        /// </summary>
        public void SendStateToWebView()
        {
            if (!_isWebViewReady || _webView?.CoreWebView2 == null || this.IsDisposed) return;

            try
            {
                var brain = SwinkaBrainController.Instance;
                var pet = brain?.Pet;
                if (pet == null) return;

                var state = pet.State;
                var needs = pet.Needs;
                var age = pet.Age;
                var stage = pet.Stage;

                var inventoryCopy = new Dictionary<string, int>(state.Inventory ?? new Dictionary<string, int>());
                inventoryCopy["siano"] = 999; // siano bez limitu

                var highScores = state.HighScores ?? new Dictionary<string, int>();

                var payload = new
                {
                    type = "state",
                    name = string.IsNullOrWhiteSpace(state.Name) ? "Świnka" : state.Name,
                    birthDateUtc = state.BirthDateUtc.ToString("o"),
                    pigDays = Math.Round(age.PigDays, 1),
                    stageKey = stage.ToString().ToLowerInvariant(),
                    stageName = LifeStages.Polish(stage),
                    needs = new
                    {
                        satiety = Math.Round(needs.Satiety, 1),
                        vitaminC = Math.Round(needs.VitaminC, 1),
                        energy = Math.Round(needs.Energy, 1),
                        mood = Math.Round(needs.Mood, 1),
                        cleanliness = Math.Round(needs.Cleanliness, 1),
                        teeth = Math.Round(needs.Teeth, 1),
                        health = Math.Round(needs.Health, 1)
                    },
                    clovers = state.Clovers,
                    bond = new
                    {
                        level = state.Bond.Level,
                        points = state.Bond.Points,
                        pointsToday = state.Bond.PointsToday,
                        maxPointsToday = pet.Balance?.BondDailyLimit ?? 30
                    },
                    inventory = inventoryCopy,
                    poops = state.PoopCount,
                    minigames = new
                    {
                        records = highScores,
                        dailyRewardedDate = state.MinigamesDailyDate ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                        dailyRewardedCount = state.MinigamesDailyCount
                    },
                    currentAction = brain.CurrentAction?.AnimationName ?? "idle",
                    isSleeping = pet.IsSleeping,
                    lastActiveUtc = state.LastActiveUtc.ToString("o")
                };

                string json = JsonConvert.SerializeObject(payload);
                _webView.CoreWebView2.PostWebMessageAsJson(json);
            }
            catch (Exception ex)
            {
                SwinkaBrainController.Log("[FormDomek] Błąd PostWebMessageAsJson: " + ex.Message);
            }
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string json = e.WebMessageAsJson;
                if (string.IsNullOrWhiteSpace(json)) return;

                var obj = JObject.Parse(json);
                string type = obj.Value<string>("type")?.ToLowerInvariant();

                switch (type)
                {
                    case "feed":
                        string item = obj.Value<string>("item") ?? "siano";
                        HandleFeed(item);
                        break;

                    case "clean":
                        HandleClean();
                        break;

                    case "call":
                        HandleCall();
                        break;

                    case "pet":
                        HandlePet();
                        break;

                    case "buy":
                        string buyItem = obj.Value<string>("itemId") ?? "papryka";
                        int price = obj.Value<int?>("price") ?? 10;
                        HandleBuy(buyItem, price);
                        break;

                    case "play":
                        HandlePlay();
                        break;

                    case "minigame_result":
                        string gameId = obj.Value<string>("gameId") ?? "gra-przyklad";
                        int score = obj.Value<int?>("score") ?? 0;
                        HandleMinigameResult(gameId, score);
                        break;

                    case "settings":
                        string action = obj.Value<string>("action")?.ToLowerInvariant();
                        HandleSettings(action, obj);
                        break;
                }

                // Natychmiastowa aktualizacja stanu po przetworzeniu akcji
                SendStateToWebView();
            }
            catch (Exception ex)
            {
                SwinkaBrainController.Log("[FormDomek] Błąd przetwarzania wiadomości: " + ex.Message);
            }
        }

        private void HandleFeed(string item)
        {
            var brain = SwinkaBrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;

            if (string.Equals(item, "siano", StringComparison.OrdinalIgnoreCase))
            {
                pet.Needs.Satiety = Math.Min(100.0, pet.Needs.Satiety + 12.0);
                pet.Needs.Teeth = Math.Min(100.0, pet.Needs.Teeth + 8.0);
                pet.AddBondPoints(2);
                pet.Count("karmienia");
                brain.RequestAnimation("eat");
                SwinkaBrainController.Log("[FormDomek] Nakarmiono sianem.");
            }
            else
            {
                if (pet.TryRemoveItem(item, 1))
                {
                    if (string.Equals(item, "papryka", StringComparison.OrdinalIgnoreCase))
                    {
                        pet.Needs.Satiety = Math.Min(100.0, pet.Needs.Satiety + 15.0);
                        pet.Needs.VitaminC = Math.Min(100.0, pet.Needs.VitaminC + 35.0);
                        pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 10.0);
                    }
                    else if (string.Equals(item, "marchewka", StringComparison.OrdinalIgnoreCase))
                    {
                        pet.Needs.Satiety = Math.Min(100.0, pet.Needs.Satiety + 18.0);
                        pet.Needs.VitaminC = Math.Min(100.0, pet.Needs.VitaminC + 15.0);
                        pet.Needs.Teeth = Math.Min(100.0, pet.Needs.Teeth + 10.0);
                    }
                    else if (string.Equals(item, "granulat", StringComparison.OrdinalIgnoreCase))
                    {
                        pet.Needs.Satiety = Math.Min(100.0, pet.Needs.Satiety + 25.0);
                        pet.Needs.VitaminC = Math.Min(100.0, pet.Needs.VitaminC + 5.0);
                    }
                    pet.AddBondPoints(2);
                    pet.Count("karmienia");
                    pet.Count(item);
                    brain.RequestAnimation("eat_treat");
                    SwinkaBrainController.Log(string.Format("[FormDomek] Nakarmiono przysmakiem: {0}", item));
                }
                else
                {
                    SwinkaBrainController.Log(string.Format("[FormDomek] Brak przedmiotu w ekwipunku: {0}", item));
                }
            }
        }

        private void HandleClean()
        {
            var brain = SwinkaBrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;

            int poops = pet.State.PoopCount;
            pet.CleanAllPoops();
            SwinkaPoopManager.Instance?.CloseAllVisuals();
            pet.AddClovers(poops > 0 ? poops : 1);
            pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 6.0);
            pet.Count("sprzatania");
            brain.RequestAnimation("happy");
            SwinkaBrainController.Log(string.Format("[FormDomek] Posprzątano klatkę (usunięto {0} bobków, +koniczynki).", poops));
        }

        private void HandleCall()
        {
            var brain = SwinkaBrainController.Instance;
            if (brain != null)
            {
                brain.CallPet();
                SwinkaBrainController.Log("[FormDomek] Zawołano świnkę z Domku.");
            }
        }

        private void HandlePet()
        {
            var brain = SwinkaBrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;

            pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 3.0);
            pet.AddBondPoints(1);
            pet.Count("glaskanie");
            brain.RequestAnimation("purr_pet");
            SwinkaBrainController.Log("[FormDomek] Pogłaskano świnkę z Domku (+3 humoru, +1 więź).");
        }

        private void HandleBuy(string itemId, int price)
        {
            var brain = SwinkaBrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;

            if (price < 0) price = 10;
            if (pet.TrySpendClovers(price))
            {
                pet.AddItem(itemId, 1);
                pet.Count("zakupy");
                SwinkaBrainController.Log(string.Format("[FormDomek] Kupiono {0} za {1} koniczynek.", itemId, price));
            }
            else
            {
                SwinkaBrainController.Log(string.Format("[FormDomek] Zbyt mało koniczynek na zakup {0} (cena: {1}, stan: {2}).",
                    itemId, price, pet.State.Clovers));
            }
        }

        private void HandlePlay()
        {
            var brain = SwinkaBrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;

            pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 15.0);
            pet.Needs.Energy = Math.Max(0.0, pet.Needs.Energy - 10.0);
            pet.AddClovers(10);
            brain.RequestAnimation("popcorn");
            SwinkaBrainController.Log("[FormDomek] Zabawa w Domku (+15 humoru, +10 koniczynek).");
        }

        private void HandleMinigameResult(string gameId, int score)
        {
            var brain = SwinkaBrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;

            if (pet.State.HighScores == null)
            {
                pet.State.HighScores = new Dictionary<string, int>();
            }

            int prev = 0;
            pet.State.HighScores.TryGetValue(gameId, out prev);
            if (score > prev)
            {
                pet.State.HighScores[gameId] = score;
            }

            // Limit 10 nagradzanych gier dziennie
            string today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            if (pet.State.MinigamesDailyDate != today)
            {
                pet.State.MinigamesDailyDate = today;
                pet.State.MinigamesDailyCount = 0;
            }

            int clovers = 0;
            if (pet.State.MinigamesDailyCount < 10)
            {
                clovers = Math.Min(40, Math.Max(0, score / 10));
                if (clovers > 0)
                {
                    pet.AddClovers(clovers);
                }
                pet.State.MinigamesDailyCount++;
            }

            pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 15.0);
            brain.RequestAnimation("popcorn");
            SwinkaBrainController.Log(string.Format("[FormDomek] Wynik minigry {0}: {1} pkt (+{2} koniczynek).", gameId, score, clovers));
        }

        private void HandleSettings(string action, JObject obj)
        {
            if (action == "close")
            {
                this.Hide();
                SwinkaBrainController.Log("[FormDomek] Zamknięcie okna Domku przez przycisk HTML.");
            }
            else if (action == "drag_start")
            {
                _dragStartCursor = Cursor.Position;
                _dragStartLocation = this.Location;
            }
            else if (action == "drag_move")
            {
                int dx = obj.Value<int?>("dx") ?? 0;
                int dy = obj.Value<int?>("dy") ?? 0;
                if (dx != 0 || dy != 0)
                {
                    this.Location = new Point(this.Location.X + dx, this.Location.Y + dy);
                }
                else
                {
                    Point cur = Cursor.Position;
                    int diffX = cur.X - _dragStartCursor.X;
                    int diffY = cur.Y - _dragStartCursor.Y;
                    this.Location = new Point(_dragStartLocation.X + diffX, _dragStartLocation.Y + diffY);
                }
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                this.Hide();
                return;
            }
            _refreshTimer?.Stop();
            _refreshTimer?.Dispose();
            base.OnFormClosing(e);
        }
    }
}
