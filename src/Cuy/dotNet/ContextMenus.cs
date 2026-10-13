using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Cuy.Core;
using Cuy.Properties;

namespace Cuy
{
    /// <summary>
    /// Menu podręczne w zasobniku systemowym (obok zegara Windows).
    /// - Nakarm (podmenu z przedmiotami z ekwipunku i liczbą sztuk, Siano zawsze bez limitu)
    /// - Zawołaj
    /// - Domek
    /// - Mózg świnki (F9)
    /// - Zegar 60x (Test)
    /// - Zamknij
    /// </summary>
    public class ContextMenus : IDisposable
    {
        static ToolStripMenuItem feedMenuItem;
        static ToolStripMenuItem callMenuItem;
        static ToolStripMenuItem domekMenuItem;
        static ToolStripMenuItem closeMenuItem;

        static string author;
        static string version;
        static string title;
        static string info;

        public ContextMenuStrip Create()
        {
            ContextMenuStrip menu = new ContextMenuStrip();

            // 1. Nakarm (podmenu: Siano bez limitu + przedmioty z ekwipunku)
            feedMenuItem = new ToolStripMenuItem("Nakarm");
            feedMenuItem.Image = PetIcons.GetIconBitmap("hay") ?? PetIcons.GetIconBitmap("siano");
            feedMenuItem.Font = new Font(feedMenuItem.Font, feedMenuItem.Font.Style | FontStyle.Bold);
            feedMenuItem.DropDownOpening += (s, e) => PopulateFeedSubmenu(feedMenuItem);
            PopulateFeedSubmenu(feedMenuItem);
            menu.Items.Add(feedMenuItem);

            // 2. Zawołaj
            callMenuItem = new ToolStripMenuItem("Zawołaj");
            callMenuItem.Image = PetIcons.GetIconBitmap("pet_head") ?? PetIcons.GetIconBitmap("glowa_swinki");
            callMenuItem.Click += (s, e) =>
            {
                if (BrainController.Instance != null)
                {
                    BrainController.Instance.CallPet();
                }
            };
            menu.Items.Add(callMenuItem);

            // 3. Domek
            domekMenuItem = new ToolStripMenuItem("Domek");
            domekMenuItem.Image = PetIcons.GetIconBitmap("house") ?? PetIcons.GetIconBitmap("domek");
            domekMenuItem.Click += (s, e) => OpenHomeWindow();
            menu.Items.Add(domekMenuItem);

            // Narzędzia testowe (tylko w Debug lub jako opcjonalne skróty)
            ToolStripSeparator sep = new ToolStripSeparator();
            menu.Items.Add(sep);

            ToolStripMenuItem brainItem = new ToolStripMenuItem("Mózg świnki (F9)");
            brainItem.Click += (s, e) => DebugOverlay.Toggle();
            menu.Items.Add(brainItem);

            ToolStripMenuItem speedItem = new ToolStripMenuItem
            {
                Text = "Zegar 60x (Test)",
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

            menu.Items.Add(new ToolStripSeparator());

            // 5. Zamknij
            closeMenuItem = new ToolStripMenuItem("Zamknij");
            closeMenuItem.Image = Resources.exit;
            closeMenuItem.Click += new EventHandler(Exit_Click);
            menu.Items.Add(closeMenuItem);

            return menu;
        }

        public static void OpenHomeWindow()
        {
            HomeWindow.ShowHome();
        }

        public static void OpenDomekWindow() => OpenHomeWindow();

        public static void PopulateFeedSubmenu(ToolStripMenuItem feedMenu)
        {
            feedMenu.DropDownItems.Clear();

            // Zawsze "Siano" bez limitu
            ToolStripMenuItem sianoItem = new ToolStripMenuItem("Siano (bez limitu)");
            sianoItem.Image = PetIcons.GetIconBitmap("hay") ?? PetIcons.GetIconBitmap("siano");
            sianoItem.Click += (s, e) =>
            {
                if (BrainController.Instance != null)
                {
                    BrainController.Instance.Feed("hay");
                }
            };
            feedMenu.DropDownItems.Add(sianoItem);

            // Przedmioty z ekwipunku
            var pet = BrainController.Instance?.Pet;
            if (pet != null && pet.State.Inventory != null)
            {
                foreach (var kvp in pet.State.Inventory)
                {
                    string itemId = kvp.Key;
                    int count = kvp.Value;
                    if (count <= 0) continue;
                    if (string.Equals(itemId, "siano", StringComparison.OrdinalIgnoreCase) || string.Equals(itemId, "hay", StringComparison.OrdinalIgnoreCase)) continue;

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
            catch { }
            Program.Mainthread.KillSheeps(true);
        }

        public void Dispose()
        {
        }
    }
}