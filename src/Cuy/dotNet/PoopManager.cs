using System;
using System.Collections.Generic;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;
using Cuy.Core;

namespace Cuy
{
    /// <summary>
    /// Manages the life cycle of poops on the desktop:
    /// - Every 40-90 game minutes the pig leaves a poop (poop animation) where it stands
    /// - At most 8 poops at once
    /// - Clicking a poop removes it and gives 1 clover
    /// - The "cage cleanliness" need depends directly on the poop count (0 poops = 100%, 8 poops = 0%)
    /// - Poops disappear when the window they lie on closes, but the counter stays in the game state
    /// - Poops are saved in save.json and restored after the app restarts.
    /// </summary>
    public sealed class PoopManager
    {
        public const int MaxPoops = Cuy.Core.Pet.MaxPoops;

        private static PoopManager _instance;
        public static PoopManager Instance => _instance;

        private readonly BrainController _controller;
        private readonly Cuy.Core.Pet _pet;
        private readonly Random _random = new Random();
        private readonly List<PoopForm> _activePoops = new List<PoopForm>();

        private TimeSpan _timeUntilNextPoop;
        private TimeSpan _elapsedGameTime;

        public PoopManager(BrainController controller)
        {
            _instance = this;
            _controller = controller ?? throw new ArgumentNullException(nameof(controller));
            _pet = controller.Pet ?? throw new ArgumentNullException(nameof(controller.Pet));

            // Random time until the next poop (40-90 game minutes)
            _timeUntilNextPoop = TimeSpan.FromMinutes(_random.Next(40, 91));
            _elapsedGameTime = TimeSpan.Zero;
        }

        public static void Initialize(BrainController controller)
        {
            if (_instance == null && controller != null)
            {
                new PoopManager(controller);
            }
        }

        public IReadOnlyList<PoopForm> ActivePoops => _activePoops;
        public IReadOnlyList<PoopForm> ActiveBobki => _activePoops;

        /// <summary>
        /// Called on every update step in BrainController.Update().
        /// </summary>
        public void Update(TimeSpan gameElapsed)
        {
            // 1. Check and update poop positions on windows
            for (int i = _activePoops.Count - 1; i >= 0; i--)
            {
                if (i < _activePoops.Count)
                {
                    _activePoops[i].UpdateTracking();
                }
            }

            // 2. Count down game time to the next poop
            if (_pet.State.PoopCount < MaxPoops)
            {
                _elapsedGameTime += gameElapsed;
                if (_elapsedGameTime >= _timeUntilNextPoop)
                {
                    _elapsedGameTime = TimeSpan.Zero;
                    _timeUntilNextPoop = TimeSpan.FromMinutes(_random.Next(40, 91));
                    TrySpawnPoop();
                }
            }
        }

        /// <summary>
        /// Tries to leave a poop at the pig's current position.
        /// </summary>
        public bool TrySpawnPoop(bool force = false)
        {
            if (!force && _pet.State.PoopCount >= MaxPoops)
            {
                return false;
            }

            var petForm = FormPet.ActivePet;
            if (petForm == null || petForm.IsDisposed)
            {
                return false;
            }

            // If the pig is being dragged or thrown, wait for the landing
            if (petForm.IsDragging || petForm.IsTossing)
            {
                return false;
            }

            // Play the poop animation
            petForm.PlayAnimationByName("poop");
            _controller.RequestAnimation("poop");

            // Work out the position and the surface
            int petX = (int)petForm.PositionX;
            int petY = (int)(petForm.PositionY + petForm.OffsetY);
            int petW = petForm.Width;
            int petH = petForm.Height;

            // The poop lands behind the pig at the level of its feet
            int poopX = petForm.IsFacingLeft ? (petX + petW - 24) : (petX + 4);
            int poopY = petY + petH - 26;

            IntPtr hwnd = petForm.CurrentHwndWindow;
            bool onTaskbar = (hwnd == IntPtr.Zero);
            Point relOffset = Point.Empty;
            string windowTitle = null;

            if (!onTaskbar)
            {
                if (NativeMethods.GetWindowRect(new HandleRef(petForm, hwnd), out var rct) && (rct.Right - rct.Left > 0))
                {
                    relOffset = new Point(poopX - rct.Left, poopY - rct.Top);
                    StringBuilder sb = new StringBuilder(128);
                    NativeMethods.GetWindowText(hwnd, sb, 128);
                    windowTitle = sb.ToString();
                }
                else
                {
                    onTaskbar = true;
                    hwnd = IntPtr.Zero;
                }
            }

            var poopData = new PoopItem
            {
                Id = Guid.NewGuid().ToString("N"),
                X = poopX,
                Y = poopY,
                OnTaskbar = onTaskbar,
                WindowTitle = windowTitle,
                CreatedAtUtc = _controller.Clock.UtcNow
            };

            if (_pet.TryAddPoop(poopData))
            {
                try
                {
                    var form = new PoopForm(poopData, hwnd, relOffset);
                    form.Show();
                    _activePoops.Add(form);

                    BrainController.Log(string.Format(
                        "[Poop] Left a poop at ({0}, {1}) on {2}. Poops: {3}/8, Cleanliness: {4:0.#}%",
                        poopX, poopY, onTaskbar ? "the taskbar" : $"window \"{windowTitle}\"", _pet.State.PoopCount, _pet.Needs.Cleanliness));
                    HomeWindow.NotifyStateChanged();
                    return true;
                }
                catch (Exception ex)
                {
                    BrainController.Log("[ERROR] Could not show the poop window: " + ex.Message);
                }
            }

            return false;
        }

        /// <summary>
        /// Handles a poop click: removes the poop, +1 clover, refreshes cleanliness.
        /// </summary>
        public void OnPoopClicked(PoopForm poop)
        {
            if (poop == null) return;

            _activePoops.Remove(poop);
            _pet.CleanPoop(poop.PoopData.Id);

            try
            {
                poop.Close();
                poop.Dispose();
            }
            catch (Exception ex) { BrainController.Log("[WARN] PoopManager.OnPoopClicked: " + ex.Message); }

            BrainController.Log(string.Format(
                "[Poop] Poop cleaned up (+1 clover). Clovers: {0}, poops left: {1}/8, Cleanliness: {2:0.#}%",
                _pet.State.Clovers, _pet.State.PoopCount, _pet.Needs.Cleanliness));
            HomeWindow.NotifyStateChanged();
        }

        /// <summary>
        /// Handles closing of the window a poop lay on:
        /// the poop leaves the screen, but the counter stays in the game state.
        /// </summary>
        public void OnWindowClosed(PoopForm poopForm)
        {
            if (poopForm == null) return;

            _activePoops.Remove(poopForm);
            // Remove from the list of poops visible on screen
            _pet.State.Poops.RemoveAll(p => p.Id == poopForm.PoopData.Id);
            // _pet.State.PoopCount is deliberately NOT decreased!

            try
            {
                poopForm.Close();
                poopForm.Dispose();
            }
            catch (Exception ex) { BrainController.Log("[WARN] PoopManager.OnWindowClosed: " + ex.Message); }

            BrainController.Log(string.Format(
                "[Poop] Window with a poop closed (\"{0}\"). The poop left the screen, but the counter stays ({1}/8, Cleanliness: {2:0.#}%).",
                poopForm.PoopData.WindowTitle, _pet.State.PoopCount, _pet.Needs.Cleanliness));
        }

        /// <summary>
        /// Restores saved poops after the app restarts (from save.json).
        /// </summary>
        public void RestoreSavedPoops()
        {
            if (_pet?.State?.Poops == null) return;

            // Make sure cleanliness matches the saved state
            _pet.RecalculateCleanliness();

            var savedList = new List<PoopItem>(_pet.State.Poops);
            foreach (var item in savedList)
            {
                if (item.OnTaskbar)
                {
                    try
                    {
                        var form = new PoopForm(item, IntPtr.Zero, Point.Empty);
                        form.Show();
                        _activePoops.Add(form);
                    }
                    catch (Exception ex) { BrainController.Log("[WARN] PoopManager.RestoreSavedPoops: " + ex.Message); }
                }
                else
                {
                    // Check whether a window with the given title exists on the desktop
                    IntPtr foundHwnd = FindWindowByTitle(item.WindowTitle);
                    if (foundHwnd != IntPtr.Zero && NativeMethods.GetWindowRect(new HandleRef(null, foundHwnd), out var rct))
                    {
                        var relOffset = new Point(item.X - rct.Left, item.Y - rct.Top);
                        try
                        {
                            var form = new PoopForm(item, foundHwnd, relOffset);
                            form.Show();
                            _activePoops.Add(form);
                        }
                        catch (Exception ex) { BrainController.Log("[WARN] PoopManager.RestoreSavedPoops: " + ex.Message); }
                    }
                    else
                    {
                        // The window no longer exists after the restart: the poop is gone from the screen, the counter stays
                        _pet.State.Poops.RemoveAll(p => p.Id == item.Id);
                        BrainController.Log(string.Format(
                            "[Poop] Window \"{0}\" not found after the restart. The poop is gone, but the counter stays ({1}/8).",
                            item.WindowTitle, _pet.State.PoopCount));
                    }
                }
            }
        }

        private static IntPtr FindWindowByTitle(string title)
        {
            if (string.IsNullOrEmpty(title)) return IntPtr.Zero;
            IntPtr found = IntPtr.Zero;

            NativeMethods.EnumWindows(delegate (IntPtr hWnd, int lParam)
            {
                if (NativeMethods.IsWindowVisible(hWnd))
                {
                    StringBuilder sb = new StringBuilder(128);
                    NativeMethods.GetWindowText(hWnd, sb, 128);
                    if (string.Equals(sb.ToString(), title, StringComparison.OrdinalIgnoreCase))
                    {
                        found = hWnd;
                        return false; // stop
                    }
                }
                return true;
            }, IntPtr.Zero);

            return found;
        }

        /// <summary>
        /// Closes all active poop windows when the app closes.
        /// </summary>
        public void CloseAllVisuals()
        {
            foreach (var b in _activePoops)
            {
                try
                {
                    b.Close();
                    b.Dispose();
                }
                catch (Exception ex) { BrainController.Log("[WARN] PoopManager.CloseAllVisuals: " + ex.Message); }
            }
            _activePoops.Clear();
        }
    }
}
