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
    /// Zarządza cyklem życia bobków na pulpicie (Zadanie B4):
    /// - Co 40-90 minut gry świnka zostawia bobek (animacja poop) w miejscu, gdzie stoi
    /// - Maksymalnie 8 bobków naraz
    /// - Kliknięcie bobka go usuwa i daje 1 koniczynkę
    /// - Potrzeba "Czystość klatki" zależy bezpośrednio od liczby bobków (0 bobków = 100%, 8 bobków = 0%)
    /// - Bobki znikają przy zamknięciu okna, na którym leżą, ale licznik zostaje w stanie gry
    /// - Bobki są zapisywane w save.json i przywracane po restarcie aplikacji.
    /// </summary>
    public sealed class PoopManager
    {
        public const int MaxPoops = Cuy.Core.Pet.MaxPoops;

        private static PoopManager _instance;
        public static PoopManager Instance => _instance;

        private readonly BrainController _controller;
        private readonly Cuy.Core.Pet _pet;
        private readonly Random _random = new Random();
        private readonly List<PoopForm> _activeBobki = new List<PoopForm>();

        private TimeSpan _timeUntilNextPoop;
        private TimeSpan _elapsedGameTime;

        public PoopManager(BrainController controller)
        {
            _instance = this;
            _controller = controller ?? throw new ArgumentNullException(nameof(controller));
            _pet = controller.Pet ?? throw new ArgumentNullException(nameof(controller.Pet));

            // Losowy czas do następnego bobka (40-90 minut gry)
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

        public IReadOnlyList<PoopForm> ActiveBobki => _activeBobki;

        /// <summary>
        /// Wywoływane co krok aktualizacji w BrainController.Update().
        /// </summary>
        public void Update(TimeSpan gameElapsed)
        {
            // 1. Sprawdzanie i aktualizacja pozycji bobków na oknach
            for (int i = _activeBobki.Count - 1; i >= 0; i--)
            {
                if (i < _activeBobki.Count)
                {
                    _activeBobki[i].UpdateTracking();
                }
            }

            // 2. Odliczanie czasu gry do kolejnego bobka
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
        /// Próbuje zostawić bobek w bieżącej pozycji świnki.
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

            // Jeśli świnka jest przeciągana lub rzucona, czekamy na wylądowanie
            if (petForm.IsDragging || petForm.IsTossing)
            {
                return false;
            }

            // Wywołaj animację poop
            petForm.PlayAnimationByName("poop");
            _controller.RequestAnimation("poop");

            // Określenie pozycji i podłoża
            int petX = (int)petForm.PositionX;
            int petY = (int)(petForm.PositionY + petForm.OffsetY);
            int petW = petForm.Width;
            int petH = petForm.Height;

            // Bobek ląduje z tyłu świnki na poziomie jej nóg
            int bobekX = petForm.IsFacingLeft ? (petX + petW - 24) : (petX + 4);
            int bobekY = petY + petH - 26;

            IntPtr hwnd = petForm.CurrentHwndWindow;
            bool onTaskbar = (hwnd == IntPtr.Zero);
            Point relOffset = Point.Empty;
            string windowTitle = null;

            if (!onTaskbar)
            {
                if (NativeMethods.GetWindowRect(new HandleRef(petForm, hwnd), out var rct) && (rct.Right - rct.Left > 0))
                {
                    relOffset = new Point(bobekX - rct.Left, bobekY - rct.Top);
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
                X = bobekX,
                Y = bobekY,
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
                    _activeBobki.Add(form);

                    BrainController.Log(string.Format(
                        "[Bobek] Zostawiono bobek w ({0}, {1}) na {2}. Liczba bobków: {3}/8, Czystość: {4:0.#}%",
                        bobekX, bobekY, onTaskbar ? "pasku zadań" : $"oknie \"{windowTitle}\"", _pet.State.PoopCount, _pet.Needs.Cleanliness));
                    HomeWindow.NotifyStateChanged();
                    return true;
                }
                catch (Exception ex)
                {
                    BrainController.Log("[Błąd] Nie udało się wyświetlić okna bobka: " + ex.Message);
                }
            }

            return false;
        }

        /// <summary>
        /// Obsługa kliknięcia bobka przez gracza: usunięcie bobka, +1 koniczynka, odświeżenie czystości.
        /// </summary>
        public void OnBobekClicked(PoopForm bobek)
        {
            if (bobek == null) return;

            _activeBobki.Remove(bobek);
            _pet.CleanPoop(bobek.PoopData.Id);

            try
            {
                bobek.Close();
                bobek.Dispose();
            }
            catch { }

            BrainController.Log(string.Format(
                "[Bobek] Posprzątano bobek (+1 koniczynka). Łącznie koniczynek: {0}, Pozostało bobków: {1}/8, Czystość: {2:0.#}%",
                _pet.State.Clovers, _pet.State.PoopCount, _pet.Needs.Cleanliness));
            HomeWindow.NotifyStateChanged();
        }

        /// <summary>
        /// Obsługa zamknięcia okna, na którym leżał bobek:
        /// Bobek znika z ekranu, ale licznik zostaje w stanie gry (wymóg B4).
        /// </summary>
        public void OnWindowClosed(PoopForm bobek)
        {
            if (bobek == null) return;

            _activeBobki.Remove(bobek);
            // Usunięcie z listy widocznych bobków na ekranie
            _pet.State.Poops.RemoveAll(p => p.Id == bobek.PoopData.Id);
            // Licznik _pet.State.PoopCount CELOWO NIE JEST zmniejszany!

            try
            {
                bobek.Close();
                bobek.Dispose();
            }
            catch { }

            BrainController.Log(string.Format(
                "[Bobek] Zamknięto okno z bobkiem (\"{0}\"). Bobek zniknął z ekranu, ale licznik zostaje w stanie gry ({1}/8, Czystość: {2:0.#}%).",
                bobek.PoopData.WindowTitle, _pet.State.PoopCount, _pet.Needs.Cleanliness));
        }

        /// <summary>
        /// Przywraca zapisane bobki po restarcie aplikacji (z save.json).
        /// </summary>
        public void RestoreSavedPoops()
        {
            if (_pet?.State?.Poops == null) return;

            // Upewnij się, że czystość odpowiada stanowi zapisu
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
                        _activeBobki.Add(form);
                    }
                    catch { }
                }
                else
                {
                    // Szukamy czy okno o podanym tytule istnieje na pulpicie
                    IntPtr foundHwnd = FindWindowByTitle(item.WindowTitle);
                    if (foundHwnd != IntPtr.Zero && NativeMethods.GetWindowRect(new HandleRef(null, foundHwnd), out var rct))
                    {
                        var relOffset = new Point(item.X - rct.Left, item.Y - rct.Top);
                        try
                        {
                            var form = new PoopForm(item, foundHwnd, relOffset);
                            form.Show();
                            _activeBobki.Add(form);
                        }
                        catch { }
                    }
                    else
                    {
                        // Okno już nie istnieje przy restarcie: bobek zniknął z ekranu, licznik zostaje w stanie gry
                        _pet.State.Poops.RemoveAll(p => p.Id == item.Id);
                        BrainController.Log(string.Format(
                            "[Bobek] Okno \"{0}\" nie zostało znalezione po restarcie. Bobek zniknął, ale licznik zostaje ({1}/8).",
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
        /// Zamyka wszystkie aktywne okna bobków przy zamykaniu aplikacji.
        /// </summary>
        public void CloseAllVisuals()
        {
            foreach (var b in _activeBobki)
            {
                try
                {
                    b.Close();
                    b.Dispose();
                }
                catch { }
            }
            _activeBobki.Clear();
        }
    }

    /// <summary>Alias dla kompatybilności wstecznej.</summary>
    public static class SwinkaPoopManager
    {
        public static PoopManager Instance => PoopManager.Instance;
        public static void Initialize(BrainController controller) => PoopManager.Initialize(controller);
    }
}
