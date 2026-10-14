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
    /// - Feed (submenu with inventory items and counts; hay is always unlimited)
    /// - Call
    /// - Home
    /// - Pig brain (F9)
    /// - Clock 60x (test)
    /// - Quit
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

            // 1. Feed (submenu: unlimited hay + items from the inventory)
            feedMenuItem = new ToolStripMenuItem("Feed");
            feedMenuItem.Image = PetIcons.GetIconBitmap("hay");
            feedMenuItem.Font = new Font(feedMenuItem.Font, feedMenuItem.Font.Style | FontStyle.Bold);
            feedMenuItem.DropDownOpening += (s, e) => PopulateFeedSubmenu(feedMenuItem);
            PopulateFeedSubmenu(feedMenuItem);
            menu.Items.Add(feedMenuItem);

            // 2. Call
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

            // 3. Home
            homeMenuItem = new ToolStripMenuItem("Home");
            homeMenuItem.Image = PetIcons.GetIconBitmap("house");
            homeMenuItem.Click += (s, e) => OpenHomeWindow();
            menu.Items.Add(homeMenuItem);

#if DEBUG
            // Dev tools (Debug builds only)
            ToolStripSeparator sep = new ToolStripSeparator();
            menu.Items.Add(sep);

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

            // 5. Quit
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