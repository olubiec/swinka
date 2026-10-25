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
using Cuy.Core;

namespace Cuy
{
    /// <summary>
    /// The guinea pig's Home window, based on WebView2:
    /// - Size: 420x640 px, no system frame (FormBorderStyle.None),
    /// - Transparent rounded corners and a desktop shadow (DWM composition),
    /// - Not on the taskbar (ShowInTaskbar = false),
    /// - Positioned automatically next to the system tray,
    /// - Content served from the local web/home folder at https://cuy.home/ and assets/ at https://cuy.assets/,
    /// - C# <-> JS bridge with Cuy.Core as the single source of truth.
    /// </summary>
    public partial class HomeWindow : Form
    {
        private static HomeWindow _instance;

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

        public HomeWindow()
        {
            InitializeComponent();
            SetupFormStyle();
            SetupRefreshTimer();
            AttachPetEvents();
        }

        public static HomeWindow Instance => _instance;

        /// <summary>True while the Home window is on screen.</summary>
        public static bool IsOpen => _instance != null && !_instance.IsDisposed && _instance.Visible;

        /// <summary>Closes Home (if open); the pig comes out onto the desktop.</summary>
        public static void CloseIfOpen()
        {
            if (IsOpen) _instance.Hide();
        }

        // Where the pig appears when Home closes; set by "take_out" (drag the pig out), otherwise below the window.
        private Point? _leavePoint;

        protected override void OnVisibleChanged(EventArgs e)
        {
            base.OnVisibleChanged(e);
            var pet = FormPet.ActivePet;
            if (pet == null || pet.IsDisposed) return;
            if (this.Visible)
            {
                pet.EnterHome();
            }
            else
            {
                Point p = _leavePoint ?? new Point(this.Left + this.Width / 2, this.Bottom - 40);
                _leavePoint = null;
                pet.LeaveHome(p);
            }
        }

        /// <summary>True when the Microsoft Edge WebView2 runtime is not installed: Home cannot open.</summary>
        public static bool WebView2Missing { get; private set; }

        private const string WebView2MissingMessage =
            "Cuy's Home needs Microsoft Edge WebView2. Get it at https://go.microsoft.com/fwlink/p/?LinkId=2124703";

        private static string GiftNotePath
        {
            get { return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "gift", "note.txt"); }
        }

        /// <summary>Text of gift\note.txt next to the exe while the letter has not been shown yet; otherwise null.</summary>
        private static string ReadGiftNote(GameState state)
        {
            try
            {
                if (state.GiftNoteShown || !File.Exists(GiftNotePath)) return null;
                string text = File.ReadAllText(GiftNotePath);
                return string.IsNullOrWhiteSpace(text) ? null : text;
            }
            catch (Exception ex)
            {
                BrainController.Log("[WARN] HomeWindow.ReadGiftNote: " + ex.Message);
                return null;
            }
        }

        /// <summary>
        /// Tells an open Home window about a state change in Cuy.Core (e.g. after feeding on the desktop or cleaning).
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
                var pet = BrainController.Instance?.Pet;
                if (pet == null) return;
                pet.NeedLow += (s, e) => NotifyStateChanged();
                pet.NeedCritical += (s, e) => NotifyStateChanged();
                pet.StageChanged += (s, e) => NotifyStateChanged();
                pet.Birthday += (s, e) => NotifyStateChanged();
                pet.LevelUp += (s, e) => NotifyStateChanged();
            }
            catch (Exception ex) { BrainController.Log("[WARN] HomeWindow.AttachPetEvents: " + ex.Message); }
        }

        public static void ShowHome()
        {
            BrainController.Log("[HomeWindow] ShowHome() called.");
            if (WebView2Missing) return;
            if (_instance == null || _instance.IsDisposed)
            {
                _instance = new HomeWindow();
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
            this.BackColor = Color.Black; // with -1 margins DWM treats a black background as the transparent alpha channel
            try
            {
                this.Icon = PetIcons.GetTrayIcon();
            }
            catch (Exception ex) { BrainController.Log("[WARN] HomeWindow.SetupFormStyle: " + ex.Message); }
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
                BrainController.Log("[HomeWindow] DWM warning: " + ex.Message);
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

                // Check for an unusual taskbar position (top/left)
                if (wa.Top > bounds.Top)
                {
                    targetY = wa.Top + padding;
                }
                else if (wa.Left > bounds.Left)
                {
                    targetX = wa.Left + padding;
                }

                // Keep it within the working area
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
                BrainController.Log("[HomeWindow] SetupWebViewAsync start.");
                _webView = new WebView2
                {
                    Dock = DockStyle.Fill,
                    DefaultBackgroundColor = Color.Transparent
                };
                this.Controls.Add(_webView);

                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Cuy",
                    "WebView2"
                );
                Directory.CreateDirectory(userDataFolder);

                BrainController.Log("[HomeWindow] Creating CoreWebView2Environment...");
                CoreWebView2Environment env;
                try
                {
                    env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                }
                catch (WebView2RuntimeNotFoundException)
                {
                    WebView2Missing = true;
                    BrainController.Log("[ERROR] Home: the WebView2 runtime is not installed.");
                    this.Hide();
                    MessageBox.Show(WebView2MissingMessage, "Cuy", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }
                BrainController.Log("[HomeWindow] CoreWebView2Environment created. Initialising the control...");
                await _webView.EnsureCoreWebView2Async(env);
                BrainController.Log("[HomeWindow] EnsureCoreWebView2Async done.");

                _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
#if DEBUG
                _webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
#else
                _webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
#endif

                string homeDir = ResolveHomePath();
                string assetsDir = ResolveAssetsPath();
                BrainController.Log(string.Format("[HomeWindow] Mapping home folder: {0}, assets: {1}", homeDir, assetsDir));

                _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "cuy.home",
                    homeDir,
                    CoreWebView2HostResourceAccessKind.Allow
                );

                if (string.IsNullOrEmpty(assetsDir) || !Directory.Exists(assetsDir))
                {
                    BrainController.Log("[ERROR] Home: cuy.assets folder not found. Paths tried: " + string.Join("; ", _assetsPathsTried));
                }
                else
                {
                    _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                        "cuy.assets",
                        assetsDir,
                        CoreWebView2HostResourceAccessKind.Allow
                    );
                }

                _webView.CoreWebView2.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
                _webView.CoreWebView2.WebResourceResponseReceived += (s, e) =>
                {
                    try
                    {
                        int status = e.Response.StatusCode;
                        if (status >= 400)
                        {
                            BrainController.Log("[WARN] Home " + status + " " + e.Request.Uri);
                        }
                    }
                    catch (Exception ex) { BrainController.Log("[WARN] HomeWindow.WebResourceResponseReceived: " + ex.Message); }
                };

                await _webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(JsErrorForwarder);

                _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
                _webView.CoreWebView2.NavigationCompleted += (s, e) =>
                {
                    _isWebViewReady = true;
                    BrainController.Log("[HomeWindow] Navigation to https://cuy.home/index.html done.");
                    SendStateToWebView();
                };

                _webView.CoreWebView2.Navigate("https://cuy.home/index.html");
            }
            catch (Exception ex)
            {
                BrainController.Log("[HomeWindow] WebView2 init error: " + ex.ToString());
            }
        }

        private static string ResolveHomePath()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            // 1. Check the web/home folder next to the executable
            string p1 = Path.Combine(baseDir, "web", "home");
            if (Directory.Exists(p1)) return Path.GetFullPath(p1);

            // 2. Search up the folder tree (repository / solution)
            DirectoryInfo dir = new DirectoryInfo(baseDir);
            while (dir != null)
            {
                string candidate = Path.Combine(dir.FullName, "web", "home");
                if (Directory.Exists(candidate))
                {
                    return Path.GetFullPath(candidate);
                }
                dir = dir.Parent;
            }

            // 3. Check the current working directory
            string p4 = Path.GetFullPath(Path.Combine("web", "home"));
            if (Directory.Exists(p4)) return Path.GetFullPath(p4);

            return p1;
        }

        private static readonly List<string> _assetsPathsTried = new List<string>();

        // Forwards page errors to the host log (see the 'log' case in OnWebMessageReceived).
        private const string JsErrorForwarder = @"(function () {
  function send(level, msg) {
    try { window.chrome.webview.postMessage({ type: 'log', level: level, msg: String(msg) }); } catch (e) {}
  }
  window.addEventListener('error', function (e) {
    send('error', (e.message || 'error') + ' at ' + (e.filename || '?') + ':' + (e.lineno || 0));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    send('error', 'unhandledrejection: ' + (r && r.stack ? r.stack : r));
  });
  var origError = console.error;
  console.error = function () {
    send('error', Array.prototype.map.call(arguments, String).join(' '));
    return origError.apply(console, arguments);
  };
})();";

        private static string ResolveAssetsPath()
        {
            _assetsPathsTried.Clear();
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            string p1 = Path.Combine(baseDir, "assets");
            _assetsPathsTried.Add(p1);
            if (Directory.Exists(p1)) return Path.GetFullPath(p1);

            DirectoryInfo dir = new DirectoryInfo(baseDir);
            while (dir != null)
            {
                string candidate = Path.Combine(dir.FullName, "assets");
                _assetsPathsTried.Add(candidate);
                if (Directory.Exists(candidate))
                {
                    return Path.GetFullPath(candidate);
                }
                dir = dir.Parent;
            }

            string pCurrent = Path.GetFullPath("assets");
            _assetsPathsTried.Add(pCurrent);
            if (Directory.Exists(pCurrent)) return Path.GetFullPath(pCurrent);

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

        public static void PostToPage(object payload)
        {
            if (_instance == null || _instance.IsDisposed || !_instance._isWebViewReady || _instance._webView?.CoreWebView2 == null)
            {
                return;
            }

            try
            {
                string json = JsonConvert.SerializeObject(payload);
                if (_instance.InvokeRequired)
                {
                    _instance.Invoke((Action)(() =>
                    {
                        try { _instance._webView.CoreWebView2.PostWebMessageAsJson(json); }
                        catch (Exception ex) { BrainController.Log("[HomeWindow] PostToPage Invoke error: " + ex.Message); }
                    }));
                }
                else
                {
                    _instance._webView.CoreWebView2.PostWebMessageAsJson(json);
                }
            }
            catch (Exception ex)
            {
                BrainController.Log("[HomeWindow] PostToPage serialize error: " + ex.Message);
            }
        }

        /// <summary>
        /// Sends the current game state from Cuy.Core to the WebView2 control as JSON.
        /// </summary>
        public void SendStateToWebView()
        {
            if (!_isWebViewReady || _webView?.CoreWebView2 == null || this.IsDisposed) return;

            try
            {
                var brain = BrainController.Instance;
                var pet = brain?.Pet;
                if (pet == null) return;

                var state = pet.State;
                var needs = pet.Needs;
                var age = pet.Age;
                var stage = pet.Stage;

                var inventoryCopy = new Dictionary<string, int>(state.Inventory ?? new Dictionary<string, int>());
                inventoryCopy["hay"] = 999;

                var highScores = state.HighScores ?? new Dictionary<string, int>();

                var payload = new Dictionary<string, object>
                {
                    { "type", "state" },
                    { "name", string.IsNullOrWhiteSpace(state.Name) ? "Cuy" : state.Name },
                    { "needsNaming", state.NeedsNaming },
                    { "giftNote", ReadGiftNote(state) },
                    { "birthDateUtc", state.BirthDateUtc.ToString("o") },
                    { "pigDays", Math.Round(age.PigDays, 1) },
                    { "stageKey", stage.ToString().ToLowerInvariant() },
                    { "stageName", LifeStages.DisplayName(stage) },
                    { "needs", new
                        {
                            fullness = Math.Round(needs.Satiety, 1),
                            vitaminC = Math.Round(needs.VitaminC, 1),
                            energy = Math.Round(needs.Energy, 1),
                            mood = Math.Round(needs.Mood, 1),
                            cleanliness = Math.Round(needs.Cleanliness, 1),
                            teeth = Math.Round(needs.Teeth, 1),
                            health = Math.Round(needs.Health, 1)
                        }
                    },
                    { "clovers", state.Clovers },
                    { "bond", new
                        {
                            level = state.Bond.Level,
                            points = state.Bond.Points,
                            pointsToday = state.Bond.PointsToday,
                            maxPointsToday = pet.Balance?.BondDailyLimit ?? 30
                        }
                    },
                    { "inventory", inventoryCopy },
                    { "album", state.Album != null ? new List<string>(state.Album.Keys) : new List<string>() },
                    { "poops", state.PoopCount },
                    { "minigames", new
                        {
                            records = highScores,
                            dailyRewardedDate = state.MinigamesDailyDate ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                            dailyRewardedCount = state.MinigamesDailyCount
                        }
                    },
                    { "currentAction", brain.CurrentAction?.AnimationName ?? "idle" },
                    { "isSleeping", pet.IsSleeping },
                    { "lastActiveUtc", state.LastActiveUtc.ToString("o") }
                };

                Cuy.Features.HomeFeatures.AddAllState(payload, brain);

                List<string> featureDirs = new List<string>();
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string featuresPath = Path.Combine(baseDir, "web", "home", "features");
                if (Directory.Exists(featuresPath))
                {
                    foreach (var dir in Directory.GetDirectories(featuresPath))
                    {
                        if (File.Exists(Path.Combine(dir, "feature.js")))
                        {
                            featureDirs.Add(Path.GetFileName(dir));
                        }
                    }
                    featureDirs.Sort();
                }
                payload["features"] = featureDirs;

                string json = JsonConvert.SerializeObject(payload);
                _webView.CoreWebView2.PostWebMessageAsJson(json);
            }
            catch (Exception ex)
            {
                BrainController.Log("[HomeWindow] PostWebMessageAsJson error: " + ex.Message);
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
                        string item = obj.Value<string>("item") ?? "hay";
                        HandleFeed(item);
                        break;

                    case "setname":
                        HandleSetName(obj.Value<string>("name"));
                        break;

                    case "giftnoteshown":
                        HandleGiftNoteShown();
                        break;

                    case "clean":
                        HandleClean();
                        break;

                    case "call":
                        HandleCall();
                        break;

                    case "take_out":
                        // The pig was dragged out of the Home scene: close Home, the pig drops at the cursor.
                        _leavePoint = Cursor.Position;
                        this.Hide();
                        BrainController.Log("[HomeWindow] Pig taken out of Home.");
                        return;

                    case "pet":
                        HandlePet();
                        break;

                    case "buy":
                        HandleBuy(obj.Value<string>("itemId"));
                        break;

                    case "play":
                        HandlePlay();
                        break;

                    case "minigame_result":
                        string gameId = obj.Value<string>("gameId") ?? "minigame";
                        int score = obj.Value<int?>("score") ?? 0;
                        HandleMinigameResult(gameId, score);
                        break;

                    case "log":
                        BrainController.Log("[Home JS] " + obj.Value<string>("msg"));
                        return;

                    case "settings":
                        string action = obj.Value<string>("action")?.ToLowerInvariant();
                        HandleSettings(action, obj);
                        break;

                    default:
                        if (Cuy.Features.HomeFeatures.Dispatch(type, obj, BrainController.Instance))
                        {
                            // If a feature handled it, it might have modified state
                            SendStateToWebView();
                        }
                        return; // return so we don't double send below, unless we change logic
                }

                // Update the state right after handling the action
                SendStateToWebView();
            }
            catch (Exception ex)
            {
                BrainController.Log("[HomeWindow] Message handling error: " + ex.Message);
            }
        }

        private void HandleFeed(string item)
        {
            var brain = BrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null || string.IsNullOrEmpty(item)) return;

            CuyItemDef def = FindItem(item);
            if (def == null)
            {
                BrainController.Log("[HomeWindow] Unknown item to feed: " + item);
                return;
            }

            // Only food can be fed (toys and equipment cannot be eaten).
            bool isFood = def.Category == "food" || def.Category == "vegetable" || def.Category == "treat" || def.Category == "chew_stick";
            if (!isFood)
            {
                BrainController.Log("[HomeWindow] Not food: " + def.Id);
                return;
            }

            // A full pig refuses food; nothing is consumed and nothing is rewarded.
            double fullnessEffect = 0.0;
            def.Effects.TryGetValue("fullness", out fullnessEffect);
            if (fullnessEffect > 0.0 && pet.Needs.Satiety >= 95.0)
            {
                BrainController.Log("[HomeWindow] The pig is full, refused " + def.Id + ".");
                return;
            }

            if (!def.IsUnlimited && !pet.TryRemoveItem(def.Id, 1))
            {
                BrainController.Log("[HomeWindow] Item not in inventory: " + def.Id);
                return;
            }

            // Effects come from assets/data/items.json (the same as food dropped on the desktop).
            foreach (var eff in def.Effects)
            {
                Need need;
                if (NeedNames.TryParseDataKey(eff.Key, out need))
                {
                    pet.ChangeNeed(need, eff.Value);
                }
            }

            pet.AddBondPoints(1);
            pet.Count("feedings");
            if (!def.IsUnlimited) pet.Count(def.Id);
            brain.RequestAnimation(def.IsUnlimited ? "eat" : "eat_treat");
            BrainController.Log("[HomeWindow] Fed " + def.Id + ".");
        }

        private static CuyItemDef FindItem(string itemId)
        {
            foreach (var d in ItemCatalogLoader.GetAll())
            {
                if (string.Equals(d.Id, itemId, StringComparison.OrdinalIgnoreCase)) return d;
            }
            return null;
        }

        private void HandleSetName(string rawName)
        {
            var pet = BrainController.Instance?.Pet;
            if (pet == null) return;

            string name = System.Text.RegularExpressions.Regex.Replace((rawName ?? "").Trim(), @"\s+", " ");
            if (name.Length == 0 || name.Length > 16 || !System.Text.RegularExpressions.Regex.IsMatch(name, @"^[\p{L}\p{N} ]+$"))
            {
                BrainController.Log("[HomeWindow] Rejected pet name.");
                return;
            }

            pet.State.Name = name;
            pet.State.NeedsNaming = false;
            BrainController.Instance.Session.AutoSaver.SaveNow();
            Program.Tray?.UpdateTooltip();
            NotifyStateChanged();
            BrainController.Log("[HomeWindow] Pet named: " + name);
        }

        private void HandleGiftNoteShown()
        {
            var pet = BrainController.Instance?.Pet;
            if (pet == null) return;
            pet.State.GiftNoteShown = true;
            BrainController.Instance.Session.AutoSaver.SaveNow();
        }

        private void HandleClean()
        {
            var brain = BrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;

            int poops = Math.Max(pet.State.PoopCount, pet.State.Poops.Count);
            if (poops <= 0)
            {
                // Nothing to clean: no clovers, no mood, no counter.
                BrainController.Log("[HomeWindow] Clean: the cage is already clean, nothing happened.");
                return;
            }

            pet.CleanAllPoops();
            PoopManager.Instance?.CloseAllVisuals();
            pet.AddClovers(poops);
            pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 6.0);
            pet.Count("cleanings");
            brain.RequestAnimation("happy");
            BrainController.Log(string.Format("[HomeWindow] Cage cleaned ({0} poops removed, +{0} clovers).", poops));
        }

        private void HandleCall()
        {
            // The pig is inside Home, so it only greets here (calling to the cursor is for the desktop).
            var brain = BrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;
            pet.AddBondPoints(1);
            pet.Count("calls");
            brain.RequestAnimation("greet");
            BrainController.Log("[HomeWindow] Pig called inside Home.");
        }

        private void HandlePet()
        {
            var brain = BrainController.Instance;
            if (brain == null) return;

            // Same path as petting on the desktop: shared limit of rewarded pets per hour.
            brain.PetPig();
        }

        private void HandleBuy(string itemId)
        {
            var brain = BrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null || string.IsNullOrEmpty(itemId)) return;

            // The price always comes from assets/data/items.json, never from the page.
            CuyItemDef def = FindItem(itemId);
            if (def == null || !def.Price.HasValue || def.Price.Value <= 0 || def.IsUnlimited)
            {
                BrainController.Log("[HomeWindow] Item cannot be bought: " + itemId);
                return;
            }

            // Toys and equipment are bought once.
            bool oneTime = def.Category == "toy" || def.Category == "equipment";
            if (oneTime && pet.GetItemCount(def.Id) > 0)
            {
                BrainController.Log("[HomeWindow] Already owned: " + def.Id);
                return;
            }

            int price = def.Price.Value;
            if (pet.TrySpendClovers(price))
            {
                pet.AddItem(def.Id, 1);
                pet.Count("purchases");
                BrainController.Log(string.Format("[HomeWindow] Bought {0} for {1} clovers.", def.Id, price));
            }
            else
            {
                BrainController.Log(string.Format("[HomeWindow] Not enough clovers for {0} (price: {1}, balance: {2}).",
                    def.Id, price, pet.State.Clovers));
            }
        }

        private void HandlePlay()
        {
            // Opening the games window must never give a reward; rewards come only from minigame_result.
            BrainController.Log("[HomeWindow] 'play' message ignored (no reward).");
        }

        private void HandleMinigameResult(string gameId, int score)
        {
            var brain = BrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;

            if (string.IsNullOrEmpty(gameId) || gameId.Length > 40) gameId = "minigame";
            if (score < 0) score = 0;

            // All rules (10 rewarded games a day, clovers = min(40, score / 10), mood) live in Cuy.Core.
            int clovers;
            bool isNewRecord;
            pet.RecordMinigameResult(gameId, score, out clovers, out isNewRecord);
            brain.RequestAnimation("popcorn");
            BrainController.Log(string.Format("[HomeWindow] Minigame {0}: {1} pts (+{2} clovers, record: {3}).",
                gameId, score, clovers, isNewRecord));
        }

        private void HandleSettings(string action, JObject obj)
        {
            if (action == "close")
            {
                this.Hide();
                BrainController.Log("[HomeWindow] Home window closed by the HTML button.");
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
