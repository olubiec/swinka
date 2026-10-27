using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Cuy.Core;
using Cuy.Properties;

namespace Cuy
{
    /// <summary>
    /// Context menu of the tray icon (next to the Windows clock).
    /// Home | Feed (submenu with inventory items; hay is unlimited) | Call | Sounds |
    /// Start with Windows | About Cuy | (Debug: dev tools) | Quit
    /// </summary>
    public class ContextMenus : IDisposable
    {
        static ToolStripMenuItem feedMenuItem;
        static ToolStripMenuItem callMenuItem;
        static ToolStripMenuItem homeMenuItem;
        static ToolStripMenuItem closeMenuItem;

        static string author;
        static string version;
        static string title;
        static string info;

        public ContextMenuStrip Create()
        {
            ContextMenuStrip menu = new ContextMenuStrip();

            // 1. Home
            homeMenuItem = new ToolStripMenuItem("Home");
            homeMenuItem.Image = PetIcons.GetIconBitmap("house");
            homeMenuItem.Enabled = !HomeWindow.WebView2Missing;
            homeMenuItem.Click += (s, e) => OpenHomeWindow();
            menu.Items.Add(homeMenuItem);

            // 2. Feed (submenu: unlimited hay + items from the inventory)
            feedMenuItem = new ToolStripMenuItem("Feed");
            feedMenuItem.Image = PetIcons.GetIconBitmap("hay");
            feedMenuItem.DropDownOpening += (s, e) => PopulateFeedSubmenu(feedMenuItem);
            PopulateFeedSubmenu(feedMenuItem);
            menu.Items.Add(feedMenuItem);

            // 3. Call
            callMenuItem = new ToolStripMenuItem("Call");
            callMenuItem.Image = PetIcons.GetIconBitmap("pig_head");
            callMenuItem.Click += (s, e) =>
            {
                if (BrainController.Instance != null)
                {
                    BrainController.Instance.CallPet();
                }
            };
            menu.Items.Add(callMenuItem);

            // Play submenu
            var playMenuItem = new ToolStripMenuItem("Play");
            playMenuItem.Image = PetIcons.GetIconBitmap("ball");
            playMenuItem.DropDownOpening += (s, e) => PopulatePlaySubmenu(playMenuItem);
            PopulatePlaySubmenu(playMenuItem);
            menu.Items.Add(playMenuItem);

            menu.Items.Add(new ToolStripSeparator());

            // 4. Sounds (checked = on, saved in the settings)
            var soundsItem = new ToolStripMenuItem("Sounds") { CheckOnClick = true };
            soundsItem.Click += (s, e) =>
            {
                if (SoundManager.Instance != null) SoundManager.Instance.SoundsEnabled = soundsItem.Checked;
            };
            menu.Items.Add(soundsItem);

            // Size submenu
            var sizeItem = new ToolStripMenuItem("Size");

            var smallItem = new ToolStripMenuItem("Small");
            var bigItem = new ToolStripMenuItem("Big");

            EventHandler sizeChangeHandler = (s, e) =>
            {
                var clickedItem = s as ToolStripMenuItem;
                int newScale = clickedItem == smallItem ? 1 : 2;
                if (newScale != Program.MyData.GetScale())
                {
                    Program.MyData.SetScale(newScale);
                    smallItem.Checked = (newScale == 1);
                    bigItem.Checked = (newScale == 2);
                    BrainController.Log(string.Format("[Settings] Pet size -> {0}", newScale == 1 ? "Small" : "Big"));
                    Program.Mainthread.ReloadSize();
                }
            };

            smallItem.Click += sizeChangeHandler;
            bigItem.Click += sizeChangeHandler;

            sizeItem.DropDownItems.Add(smallItem);
            sizeItem.DropDownItems.Add(bigItem);
            menu.Items.Add(sizeItem);

            // 5. Start with Windows (checked = on)
            var autoStartItem = new ToolStripMenuItem("Start with Windows") { CheckOnClick = true };
            autoStartItem.Click += (s, e) =>
            {
                if (autoStartItem.Checked) AutoStart.Enable(); else AutoStart.Disable();
            };
            menu.Items.Add(autoStartItem);

            menu.Opening += (s, e) =>
            {
                soundsItem.Checked = SoundManager.Instance == null || SoundManager.Instance.SoundsEnabled;
                autoStartItem.Checked = AutoStart.IsEnabled;
                homeMenuItem.Enabled = !HomeWindow.WebView2Missing;
                int currentScale = Program.MyData.GetScale();
                smallItem.Checked = (currentScale == 1);
                bigItem.Checked = (currentScale == 2);
            };

            // 6. About
            var aboutItem = new ToolStripMenuItem("About Cuy");
            aboutItem.Click += (s, e) =>
                MessageBox.Show("Cuy 1.0.0 - made with love", "About Cuy", MessageBoxButtons.OK, MessageBoxIcon.Information);
            menu.Items.Add(aboutItem);

#if DEBUG
            // Dev tools (Debug builds only)
            menu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem brainItem = new ToolStripMenuItem("Pig brain (F9)");
            brainItem.Click += (s, e) => DebugOverlay.Toggle();
            menu.Items.Add(brainItem);

            ToolStripMenuItem speedItem = new ToolStripMenuItem
            {
                Text = "Clock 60x (test)",
                CheckOnClick = true,
                Checked = (BrainController.Instance != null && BrainController.Instance.TimeMultiplier >= 50.0)
            };
            speedItem.Click += (s, e) =>
            {
                if (BrainController.Instance != null)
                {
                    double newMul = speedItem.Checked ? 60.0 : 1.0;
                    BrainController.Instance.SetMultiplier(newMul);
                }
            };
            menu.Items.Add(speedItem);

            ToolStripMenuItem diagItem = new ToolStripMenuItem("Diagnostics");
            diagItem.Click += (s, e) => PetDiagnostics.Dump();
            menu.Items.Add(diagItem);
#endif

            menu.Items.Add(new ToolStripSeparator());

            // 7. Quit
            closeMenuItem = new ToolStripMenuItem("Quit");
            closeMenuItem.Image = Resources.exit;
            closeMenuItem.Click += new EventHandler(Exit_Click);
            menu.Items.Add(closeMenuItem);

            return menu;
        }

        public static void OpenHomeWindow()
        {
            HomeWindow.ShowHome();
        }

        public static void PopulatePlaySubmenu(ToolStripMenuItem playMenu)
        {
            playMenu.DropDownItems.Clear();

            var pet = BrainController.Instance?.Pet;
            var inventory = pet?.State?.Inventory;

            bool hasToys = false;
            string[] toys = { "ball", "tunnel", "hay_ball" };

            foreach (var toyId in toys)
            {
                if (inventory != null && inventory.ContainsKey(toyId) && inventory[toyId] > 0)
                {
                    hasToys = true;
                    var def = ItemCatalogLoader.GetItem(toyId);
                    string title = def.Name ?? toyId;

                    ToolStripMenuItem toyItem = new ToolStripMenuItem(title);
                    toyItem.Image = PetIcons.GetIconBitmap(def.IconName ?? toyId);
                    toyItem.Click += async (s, e) =>
                    {
                        if (BrainController.Instance != null)
                        {
                            string actionId = null;
                            if (toyId == "ball") actionId = "ball_play";
                            else if (toyId == "tunnel") actionId = "tunnel";
                            else if (toyId == "hay_ball") actionId = "hay_ball_play";

                            if (actionId != null)
                            {
                                if (!BrainController.Instance.ForceAction(actionId))
                                {
                                    if (HomeWindow.IsOpen)
                                    {
                                        HomeWindow.CloseIfOpen();
                                        await System.Threading.Tasks.Task.Delay(1500);
                                        BrainController.Instance.ForceAction(actionId);
                                    }
                                }
                            }
                        }
                    };
                    playMenu.DropDownItems.Add(toyItem);
                }
            }

            if (!hasToys)
            {
                var emptyItem = new ToolStripMenuItem("Buy toys in the Shop") { Enabled = false };
                playMenu.DropDownItems.Add(emptyItem);
            }
        }

        public static void PopulateFeedSubmenu(ToolStripMenuItem feedMenu)
        {
            feedMenu.DropDownItems.Clear();

            // Hay is always unlimited
            ToolStripMenuItem hayItem = new ToolStripMenuItem("Hay (unlimited)");
            hayItem.Image = PetIcons.GetIconBitmap("hay");
            hayItem.Click += (s, e) =>
            {
                if (BrainController.Instance != null)
                {
                    BrainController.Instance.Feed("hay");
                }
            };
            feedMenu.DropDownItems.Add(hayItem);

            // Items from the inventory
            var pet = BrainController.Instance?.Pet;
            if (pet != null && pet.State.Inventory != null)
            {
                foreach (var kvp in pet.State.Inventory)
                {
                    string itemId = kvp.Key;
                    int count = kvp.Value;
                    if (count <= 0) continue;
                    if (string.Equals(itemId, "hay", StringComparison.OrdinalIgnoreCase)) continue;

                    var def = ItemCatalogLoader.GetItem(itemId);
                    string title = string.Format("{0} ({1})", def.Name, count);

                    ToolStripMenuItem foodItem = new ToolStripMenuItem(title);
                    foodItem.Image = PetIcons.GetIconBitmap(def.IconName ?? itemId);
                    foodItem.Click += (s, e) =>
                    {
                        if (BrainController.Instance != null)
                        {
                            BrainController.Instance.Feed(itemId);
                        }
                    };
                    feedMenu.DropDownItems.Add(foodItem);
                }
            }
        }

        public static void UpdateIcon(Icon newIcon, string petName, string aboutAuthor, string aboutTitle, string aboutVersion, string aboutInfo)
        {
            author = aboutAuthor;
            title = aboutTitle;
            version = aboutVersion;
            info = aboutInfo;
        }

        void Exit_Click(object sender, EventArgs e)
        {
            try
            {
                BrainController.Instance?.Close();
            }
            catch (Exception ex) { BrainController.Log("[WARN] ContextMenus.Exit_Click: " + ex.Message); }
            Program.Mainthread.KillPets(true);
        }

        public void Dispose()
        {
        }
    }
}