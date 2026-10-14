using System;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;
using Cuy.Core;

namespace Cuy
{
    /// <summary>
    /// Icon in the system tray (next to the Windows clock).
    /// Shows the guinea pig head from assets/icons/icons_16.png,
    /// a tooltip with the pig's name and its lowest need,
    /// opens Home on double-click, and the context menu.
    /// </summary>
    public class ProcessIcon : IDisposable
    {
        private NotifyIcon ni;
        private Timer _tooltipTimer;

        public ProcessIcon()
        {
            ni = new NotifyIcon();
        }

        public void Display()
        {
            ni.MouseClick += new MouseEventHandler(Ni_MouseClick);
            ni.MouseDoubleClick += new MouseEventHandler(Ni_MouseDoubleClick);

            // Set the pig head icon from assets/icons/icons_16.png
            try
            {
                ni.Icon = PetIcons.GetTrayIcon();
            }
            catch
            {
                ni.Icon = SystemIcons.Application;
            }

            UpdateTooltip();
            ni.Visible = true;

            // Attach the pig's context menu
            var contextMenu = new ContextMenus();
            var strip = contextMenu.Create();
            strip.Opening += (s, e) => UpdateTooltip();
            ni.ContextMenuStrip = strip;

            // Timer that keeps the tooltip up to date
            _tooltipTimer = new Timer();
            _tooltipTimer.Interval = 1000;
            _tooltipTimer.Tick += (s, e) => UpdateTooltip();
            _tooltipTimer.Start();
        }

        /// <summary>
        /// Updates the tray icon tooltip: the pig's name and its lowest need.
        /// </summary>
        public void UpdateTooltip()
        {
            if (ni == null) return;
            var brain = BrainController.Instance;
            if (brain != null && brain.Pet != null && brain.Needs != null)
            {
                string petName = brain.Pet.State?.Name;
                if (string.IsNullOrWhiteSpace(petName)) petName = "Cuy";

                Need lowest = brain.Needs.Lowest();
                string needName = NeedNames.DisplayName(lowest);
                int percent = (int)Math.Round(brain.Needs[lowest]);

                // WinForms limit for NotifyIcon.Text is 63 characters
                string tip = string.Format("{0} - {1}: {2}%", petName, needName, percent);
                if (tip.Length > 63)
                {
                    tip = string.Format("{0} - {1}", petName, needName);
                    if (tip.Length > 63) tip = tip.Substring(0, 63);
                }
                ni.Text = tip;
            }
            else
            {
                ni.Text = "Cuy";
            }
        }

        public void SetIcon(System.IO.MemoryStream icon, string petName, string aboutAuthor, string aboutTitle, string aboutVersion, string aboutInfo)
        {
            try
            {
                // Make sure the tray icon is the pig head
                ni.Icon = PetIcons.GetTrayIcon();
                UpdateTooltip();
                ContextMenus.UpdateIcon(ni.Icon, petName, aboutAuthor, aboutTitle, aboutVersion, aboutInfo);
            }
            catch (Exception)
            {
                try
                {
                    ni.Icon = new Icon(icon, 32, 32);
                    UpdateTooltip();
                }
                catch (Exception ex) { BrainController.Log("[WARN] ProcessIcon.SetIcon: " + ex.Message); }
            }
        }

        public void Dispose()
        {
            if (_tooltipTimer != null)
            {
                _tooltipTimer.Stop();
                _tooltipTimer.Dispose();
                _tooltipTimer = null;
            }

            if (ni != null)
            {
                if (ni.Icon != null)
                {
                    ni.Icon.Dispose();
                    ni.Icon = null;
                }
                ni.Visible = false;
                ni.Dispose();
                ni = null;
            }
        }

        void Ni_MouseClick(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                // Left click: bring the pig to the front
                Program.Mainthread.TopMostSheeps();
            }
        }

        void Ni_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                // Double-click on the icon opens Home
                HomeWindow.ShowHome();
            }
        }
    }
}