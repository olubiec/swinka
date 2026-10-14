using System;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;
using Cuy.Core;

namespace Cuy
{
    /// <summary>
    /// Ikona w zasobniku systemowym (obok zegara Windows).
    /// Wyświetla głowę świnki z assets/icons/icons_16.png,
    /// tooltip z imieniem świnki i najniższą potrzebą,
    /// otwiera Domek przy dwukliku oraz menu kontekstowe.
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

            // Ustaw ikonę główki świnki z assets/icons/icons_16.png
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

            // Dołącz menu kontekstowe świnki
            var contextMenu = new ContextMenus();
            var strip = contextMenu.Create();
            strip.Opening += (s, e) => UpdateTooltip();
            ni.ContextMenuStrip = strip;

            // Timer aktualizujący tooltip na bieżąco
            _tooltipTimer = new Timer();
            _tooltipTimer.Interval = 1000;
            _tooltipTimer.Tick += (s, e) => UpdateTooltip();
            _tooltipTimer.Start();
        }

        /// <summary>
        /// Aktualizuje tekst podpowiedzi ikony w zasobniku: imię świnki i najniższa potrzeba.
        /// </summary>
        public void UpdateTooltip()
        {
            if (ni == null) return;
            var brain = BrainController.Instance;
            if (brain != null && brain.Pet != null && brain.Needs != null)
            {
                string petName = brain.Pet.State?.Name;
                if (string.IsNullOrWhiteSpace(petName)) petName = "Świnka";

                Need lowest = brain.Needs.Lowest();
                string needName = NeedNames.Polish(lowest);
                int percent = (int)Math.Round(brain.Needs[lowest]);

                // Limit WinForms dla NotifyIcon.Text to 63 znaki
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
                ni.Text = "Świnka";
            }
        }

        public void SetIcon(System.IO.MemoryStream icon, string petName, string aboutAuthor, string aboutTitle, string aboutVersion, string aboutInfo)
        {
            try
            {
                // Upewnij się, że ikona zasobnika to głowa świnki
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
                catch { }
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
                // Kliknięcie lewym przyciskiem: przenieś świnkę na wierzch
                Program.Mainthread.TopMostSheeps();
            }
        }

        void Ni_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                // Dwuklik na ikonę otwiera Domek
                HomeWindow.ShowHome();
            }
        }
    }
}