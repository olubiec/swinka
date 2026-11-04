using System;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;
using Cuy.Core;

namespace Cuy
{
    /// <summary>
    /// Icon in the system tray (next to the Windows clock).
    /// Shows the app icon (the same icon as the exe, src/Cuy/cuy.ico),
    /// a tooltip with the pig's name,
    /// opens Home on double-click, and the context menu.
    /// </summary>
    public class ProcessIcon : IDisposable
    {
        private NotifyIcon ni;

        public ProcessIcon()
        {
            ni = new NotifyIcon();
        }

        public void Display()
        {
            ni.MouseClick += new MouseEventHandler(Ni_MouseClick);
            ni.MouseDoubleClick += new MouseEventHandler(Ni_MouseDoubleClick);

            // Set the tray icon from the app icon embedded in the exe
            try
            {
                ni.Icon = LoadAppIcon();
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
            ni.ContextMenuStrip = strip;
        }

        /// <summary>
        /// Updates the tray icon tooltip: the pig's name (WinForms limit for NotifyIcon.Text is 63 characters).
        /// </summary>
        public void UpdateTooltip()
        {
            if (ni == null) return;
            string petName = BrainController.Instance?.Pet?.State?.Name;
            if (string.IsNullOrWhiteSpace(petName)) petName = "Cuy";
            ni.Text = petName.Length > 63 ? petName.Substring(0, 63) : petName;
        }

        public void SetIcon(System.IO.MemoryStream icon, string petName, string aboutAuthor, string aboutTitle, string aboutVersion, string aboutInfo)
        {
            try
            {
                // Make sure the tray icon is the app icon
                ni.Icon = LoadAppIcon();
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

        /// <summary>
        /// Loads the app icon embedded in the exe (ApplicationIcon = cuy.ico in Cuy.csproj).
        /// Falls back to the pig head when the exe has no icon.
        /// </summary>
        private static Icon LoadAppIcon()
        {
            Icon icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            return icon ?? PetIcons.GetTrayIcon();
        }

        void Ni_MouseClick(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Left) return;
            // Left click on the head icon: opens Home, or closes it when it is already open.
            try
            {
                if (HomeWindow.IsOpen) HomeWindow.CloseIfOpen();
                else HomeWindow.ShowHome();
            }
            catch (Exception ex) { BrainController.Log("[ERROR] Tray click: " + ex); }
        }

        void Ni_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            // Nothing: a double click is two single clicks (open + close) and would flicker otherwise.
        }
    }
}