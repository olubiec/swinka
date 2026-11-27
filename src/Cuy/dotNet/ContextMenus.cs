using System.Linq;
using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Cuy.Core;

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
            ContextMenuStrip menu = new ContextMenuStrip
            {
                Renderer = new CozyPixelMenuRenderer(),
                Font = StatusBubble.CreatePixelFont(12f, FontStyle.Regular),
                BackColor = CozyPixelColorTable.BgCream,
                ForeColor = CozyPixelColorTable.WoodDark,
                ShowImageMargin = true
            };

            // 1. Home
            homeMenuItem = new ToolStripMenuItem("Home");
            homeMenuItem.Image = PetIcons.GetIconBitmap("house");
            homeMenuItem.Enabled = !HomeWindow.WebView2Missing;
            homeMenuItem.Click += (s, e) => OpenHomeWindow();
            menu.Items.Add(homeMenuItem);

            // 2. Feed (submenu: unlimited hay + items from the inventory)
            feedMenuItem = new ToolStripMenuItem("Feed");
            feedMenuItem.Image = PetIcons.GetIconBitmap("m_feed");
            feedMenuItem.DropDownOpening += (s, e) => PopulateFeedSubmenu(feedMenuItem);
            PopulateFeedSubmenu(feedMenuItem);
            menu.Items.Add(feedMenuItem);

            // 3. Call
            callMenuItem = new ToolStripMenuItem("Call");
            callMenuItem.Image = PetIcons.GetIconBitmap("m_call");
            callMenuItem.Click += (s, e) =>
            {
                if (BrainController.Instance != null)
                {
                    BrainController.Instance.CallPet();
                }
            };
            menu.Items.Add(callMenuItem);

            // Tricks submenu
            var tricksMenuItem = new ToolStripMenuItem("Tricks");
            tricksMenuItem.Image = PetIcons.GetIconBitmap("m_tricks");
            tricksMenuItem.DropDownOpening += (s, e) => PopulateTricksSubmenu(tricksMenuItem);
            PopulateTricksSubmenu(tricksMenuItem);
            menu.Items.Add(tricksMenuItem);

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
            aboutItem.Image = PetIcons.GetIconBitmap("x_info");
            aboutItem.Click += (s, e) =>
                MessageBox.Show("Cuy 1.0.0 - made with love", "About Cuy", MessageBoxButtons.OK, MessageBoxIcon.Information);
            menu.Items.Add(aboutItem);

            var updateItem = new ToolStripMenuItem("Update available!") { Visible = false };
            updateItem.Click += (s, e) => OpenHomeWindow();
            menu.Items.Add(updateItem);

            menu.Opening += (s, e) =>
            {
                updateItem.Visible = Cuy.Features.SettingsFeature.IsUpdateAvailable;
                if (updateItem.Visible)
                {
                    string ver = Cuy.Features.SettingsFeature.AvailableVersion;
                    updateItem.Text = string.IsNullOrEmpty(ver) ? "Update available!" : $"Update available ({ver})!";
                }
            };

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
            closeMenuItem.Image = PetIcons.GetIconBitmap("x_close");
            closeMenuItem.Click += new EventHandler(Exit_Click);
            menu.Items.Add(closeMenuItem);

            return menu;
        }

        public static void OpenHomeWindow()
        {
            HomeWindow.ShowHome();
        }

        public static void PopulateTricksSubmenu(ToolStripMenuItem tricksMenu)
        {
            tricksMenu.DropDownItems.Clear();
            var brain = BrainController.Instance;
            var pet = brain?.Pet;
            if (pet == null) return;

            var tricks = pet.GetTricks().ToList();
            if (tricks.Count == 0)
            {
                var emptyItem = new ToolStripMenuItem("No tricks available") { Enabled = false };
                tricksMenu.DropDownItems.Add(emptyItem);
                return;
            }

            foreach (var trick in tricks)
            {
                string label = trick.Unlocked
                    ? trick.Title
                    : string.Format("{0} (Bond Lv. {1})", trick.Title, trick.UnlockLevel);

                ToolStripMenuItem item = new ToolStripMenuItem(label);
                item.Enabled = trick.Unlocked;
                if (trick.Unlocked)
                {
                    item.Click += (s, e) =>
                    {
                        if (BrainController.Instance != null)
                        {
                            Cuy.Features.TricksFeature.PerformTrick(trick.Id, BrainController.Instance);
                        }
                    };
                }
                tricksMenu.DropDownItems.Add(item);
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
                    if (!ItemCatalogLoader.Exists(itemId)) continue; // removed item left in an old save

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

        private sealed class CozyPixelColorTable : ProfessionalColorTable
        {
            public static readonly Color BgCream = Color.FromArgb(251, 240, 217);       // --ui-linen-3 (#fbf0d9)
            public static readonly Color MarginLinen = Color.FromArgb(239, 220, 184);   // --ui-linen-2 (#efdcb8)
            public static readonly Color HoverHay = Color.FromArgb(246, 226, 160);      // --ui-hay-3 (#f6e2a0)
            public static readonly Color PressedWood = Color.FromArgb(227, 178, 122);   // --ui-wood-4 (#e3b27a)
            public static readonly Color SeparatorLinen = Color.FromArgb(183, 157, 120);// --ui-linen-0 (#b79d78)
            public static readonly Color WoodDark = Color.FromArgb(71, 40, 28);         // --ui-wood-0 (#47281c)
            public static readonly Color CheckMoss = Color.FromArgb(151, 165, 105);     // --ui-moss-3 (#97a569)

            public override Color ToolStripDropDownBackground => BgCream;
            public override Color ImageMarginGradientBegin => MarginLinen;
            public override Color ImageMarginGradientMiddle => MarginLinen;
            public override Color ImageMarginGradientEnd => MarginLinen;
            public override Color MenuBorder => WoodDark;
            public override Color MenuItemBorder => WoodDark;
            public override Color MenuItemSelected => HoverHay;
            public override Color MenuItemSelectedGradientBegin => HoverHay;
            public override Color MenuItemSelectedGradientEnd => HoverHay;
            public override Color MenuItemPressedGradientBegin => PressedWood;
            public override Color MenuItemPressedGradientEnd => PressedWood;
            public override Color SeparatorDark => SeparatorLinen;
            public override Color SeparatorLight => BgCream;
            public override Color CheckBackground => CheckMoss;
            public override Color CheckSelectedBackground => HoverHay;
            public override Color CheckPressedBackground => PressedWood;
        }

        private sealed class CozyPixelMenuRenderer : ToolStripProfessionalRenderer
        {
            public CozyPixelMenuRenderer() : base(new CozyPixelColorTable())
            {
                RoundedEdges = false;
            }

            protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e)
            {
                using (var pen = new Pen(CozyPixelColorTable.WoodDark, 2f))
                {
                    e.Graphics.DrawRectangle(pen, 1, 1, e.AffectedBounds.Width - 2, e.AffectedBounds.Height - 2);
                }
            }

            protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e)
            {
                Rectangle rect = new Rectangle(2, 1, e.Item.Width - 4, e.Item.Height - 2);
                if (e.Item.Selected && e.Item.Enabled)
                {
                    using (var b = new SolidBrush(CozyPixelColorTable.HoverHay))
                    {
                        e.Graphics.FillRectangle(b, rect);
                    }
                    using (var p = new Pen(CozyPixelColorTable.WoodDark, 1f))
                    {
                        e.Graphics.DrawRectangle(p, rect.X, rect.Y, rect.Width - 1, rect.Height - 1);
                    }
                }
                else
                {
                    using (var b = new SolidBrush(CozyPixelColorTable.BgCream))
                    {
                        e.Graphics.FillRectangle(b, rect);
                    }
                }
            }

            protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
            {
                e.TextColor = e.Item.Enabled ? CozyPixelColorTable.WoodDark : CozyPixelColorTable.SeparatorLinen;
                base.OnRenderItemText(e);
            }

            protected override void OnRenderArrow(ToolStripArrowRenderEventArgs e)
            {
                e.ArrowColor = e.Item != null && e.Item.Enabled ? CozyPixelColorTable.WoodDark : CozyPixelColorTable.SeparatorLinen;
                base.OnRenderArrow(e);
            }

            protected override void OnRenderItemCheck(ToolStripItemImageRenderEventArgs e)
            {
                Rectangle r = e.ImageRectangle;
                using (var b = new SolidBrush(CozyPixelColorTable.CheckMoss))
                {
                    e.Graphics.FillRectangle(b, r);
                }
                using (var p = new Pen(CozyPixelColorTable.WoodDark, 1f))
                {
                    e.Graphics.DrawRectangle(p, r.X, r.Y, r.Width - 1, r.Height - 1);
                }
                using (var checkPen = new Pen(CozyPixelColorTable.WoodDark, 2f))
                {
                    int cx = r.X + r.Width / 2;
                    int cy = r.Y + r.Height / 2;
                    e.Graphics.DrawLine(checkPen, cx - 3, cy, cx - 1, cy + 3);
                    e.Graphics.DrawLine(checkPen, cx - 1, cy + 3, cx + 4, cy - 3);
                }
            }
        }
    }
}