using System;
using System.Collections.Generic;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using SwinkaCore;

namespace DesktopPet
{
    public enum FoodInteractionState
    {
        None,
        Approaching,
        Eating,
        Popcorning
    }

    /// <summary>
    /// Koordynator mechaniki karmienia (Zadanie B6):
    /// - Kładzie jedzenie na pulpicie (100-300 px od świnki)
    /// - Śledzi przeciąganie jedzenia myszką
    /// - Obsługuje spadek jedzenia na pasek zadań i zejście świnki z okna
    /// - Steruje podchodzeniem świnki i odtworzeniem eat / eat_treat (3-6 s)
    /// - Zwiększa potrzeby i punkty więzi
    /// - Pamięta ulubione warzywo i wyzwala radosny popcorn po jedzeniu.
    /// </summary>
    public sealed class SwinkaFoodManager
    {
        private static SwinkaFoodManager _instance;
        public static SwinkaFoodManager Instance => _instance;

        private readonly SwinkaBrainController _controller;
        private readonly Random _random = new Random();

        private FormFoodItem _activeFood;
        private FoodInteractionState _state = FoodInteractionState.None;
        private string _currentFoodId;
        private double _eatingRemainingSeconds;
        private bool _isDescendingFromWindow;

        public FormFoodItem ActiveFood => _activeFood;
        public FoodInteractionState State => _state;

        public SwinkaFoodManager(SwinkaBrainController controller)
        {
            _instance = this;
            _controller = controller ?? throw new ArgumentNullException(nameof(controller));
        }

        public static void Initialize(SwinkaBrainController controller)
        {
            if (_instance == null && controller != null)
            {
                new SwinkaFoodManager(controller);
            }
        }

        /// <summary>
        /// Kładzie jedzenie na powierzchni, na której stoi świnka (100-300 px od niej).
        /// </summary>
        public bool SpawnFood(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return false;

            var petForm = FormPet.ActivePet;
            if (petForm == null || petForm.IsDisposed) return false;

            // Anulowanie poprzedniego niezjedzonego jedzenia jeśli istniało
            CancelActiveFood();

            _currentFoodId = itemId;

            // Odczytujemy stan podłoża świnki
            IntPtr hwnd = petForm.CurrentHwndWindow;
            bool onTaskbar = (hwnd == IntPtr.Zero);
            Rectangle workingArea = Screen.PrimaryScreen.WorkingArea;

            int pigX = (int)petForm.PositionX;
            int pigY = (int)(petForm.PositionY + petForm.OffsetY);
            int pigW = petForm.Width;
            int pigH = petForm.Height;

            int distance = _random.Next(100, 301); // 100 - 300 px
            bool faceLeft = petForm.IsFacingLeft;

            int targetX;
            int targetY;
            Point relOffset = Point.Empty;

            if (onTaskbar)
            {
                targetY = workingArea.Bottom - 32;

                // Próba postawienia przed noskiem świnki
                if (faceLeft)
                {
                    targetX = pigX - distance;
                    if (targetX < workingArea.Left + 10)
                    {
                        // Za mało miejsca z lewej -> postaw z prawej
                        targetX = pigX + pigW + distance;
                    }
                }
                else
                {
                    targetX = pigX + pigW + distance;
                    if (targetX + 32 > workingArea.Right - 10)
                    {
                        // Za mało miejsca z prawej -> postaw z lewej
                        targetX = pigX - distance;
                    }
                }

                // Ograniczenie do granic pulpitu
                targetX = Math.Max(workingArea.Left + 10, Math.Min(workingArea.Right - 42, targetX));
            }
            else
            {
                // Świnka stoi na oknie aplikacji
                if (NativeMethods.GetWindowRect(new HandleRef(petForm, hwnd), out var rct) && (rct.Right - rct.Left > 0))
                {
                    targetY = rct.Top - 32;

                    int minX = rct.Left + 8;
                    int maxX = rct.Right - 40;

                    if (faceLeft)
                    {
                        targetX = pigX - distance;
                        if (targetX < minX)
                        {
                            targetX = pigX + pigW + distance;
                        }
                    }
                    else
                    {
                        targetX = pigX + pigW + distance;
                        if (targetX > maxX)
                        {
                            targetX = pigX - distance;
                        }
                    }

                    targetX = Math.Max(minX, Math.Min(maxX, targetX));
                    relOffset = new Point(targetX - rct.Left, targetY - rct.Top);
                }
                else
                {
                    // Okno nieczytelne -> spadek na pasek zadań
                    hwnd = IntPtr.Zero;
                    onTaskbar = true;
                    targetY = workingArea.Bottom - 32;
                    targetX = Math.Max(workingArea.Left + 10, Math.Min(workingArea.Right - 42, pigX + (faceLeft ? -distance : distance)));
                }
            }

            try
            {
                _activeFood = new FormFoodItem(itemId, hwnd, relOffset);
                _activeFood.Location = new Point(targetX, targetY);
                _activeFood.Show();

                _state = FoodInteractionState.Approaching;
                _isDescendingFromWindow = false;

                SwinkaBrainController.Log(string.Format(
                    "[Karmienie] Położono przedmiot {0} w ({1}, {2}) na {3} (dystans: {4}px).",
                    _activeFood.ItemDef?.Name ?? itemId, targetX, targetY, onTaskbar ? "pasku zadań" : "oknie", distance));

                return true;
            }
            catch (Exception ex)
            {
                SwinkaBrainController.Log("[Błąd] Nie udało się stworzyć okna jedzenia: " + ex.Message);
                _state = FoodInteractionState.None;
                return false;
            }
        }

        public void CancelActiveFood()
        {
            if (_activeFood != null && !_activeFood.IsDisposed)
            {
                try
                {
                    _activeFood.Close();
                    _activeFood.Dispose();
                }
                catch { }
            }
            _activeFood = null;
            _state = FoodInteractionState.None;
            _isDescendingFromWindow = false;
            SoundManager.Instance?.StopEatingCrunch();
        }

        // ---- Obsługa przeciągania myszą --------------------------------------

        public void OnFoodDragStart(FormFoodItem food)
        {
            SwinkaBrainController.Log(string.Format("[Karmienie] Gracz chwycił myszką {0}.", food.ItemDef?.Name ?? food.ItemId));
        }

        public void OnFoodDragging(FormFoodItem food)
        {
            // W trakcie przeciągania świnka czeka
        }

        public void OnFoodDropped(FormFoodItem food)
        {
            if (food == null || food.IsDisposed) return;

            var petForm = FormPet.ActivePet;
            if (petForm == null || petForm.IsDisposed) return;

            IntPtr pigHwnd = petForm.CurrentHwndWindow;
            Point foodPos = food.Location;

            // Sprawdzamy czy jedzenie zostało upuszczone na oknie świnki
            bool sameSurface = false;
            if (pigHwnd != IntPtr.Zero)
            {
                if (NativeMethods.GetWindowRect(new HandleRef(petForm, pigHwnd), out var rct))
                {
                    // Czy jedzenie jest na ramce tego samego okna?
                    if (foodPos.X >= rct.Left - 20 && foodPos.X <= rct.Right + 20 &&
                        Math.Abs(foodPos.Y - (rct.Top - 32)) <= 40)
                    {
                        sameSurface = true;
                        food.WindowHwnd = pigHwnd;
                        food.IsOnTaskbar = false;
                        food.WindowRelativeOffset = new Point(foodPos.X - rct.Left, foodPos.Y - rct.Top);
                    }
                }
            }
            else
            {
                // Świnka stoi na pasku zadań
                Rectangle workingArea = Screen.PrimaryScreen.WorkingArea;
                if (Math.Abs(foodPos.Y - (workingArea.Bottom - 32)) <= 40)
                {
                    sameSurface = true;
                    food.WindowHwnd = IntPtr.Zero;
                    food.IsOnTaskbar = true;
                }
            }

            if (!sameSurface)
            {
                // Zgodnie z PLAN.md:
                // "Jeśli świnka jest na innym oknie, przedmiot spada na pasek zadań i ona za nim schodzi."
                SwinkaBrainController.Log(string.Format(
                    "[Karmienie] Przedmiot {0} upuszczony poza podłożem świnki -> spada na pasek zadań, a świnka schodzi za nim.",
                    food.ItemDef?.Name ?? food.ItemId));

                food.StartFallToTaskbar();

                if (pigHwnd != IntPtr.Zero)
                {
                    TriggerPigDescend();
                }
            }
            else
            {
                SwinkaBrainController.Log(string.Format(
                    "[Karmienie] Przedmiot {0} upuszczony na tej samej powierzchni ({1}, {2}). Świnka idzie po niego.",
                    food.ItemDef?.Name ?? food.ItemId, foodPos.X, foodPos.Y));
                _state = FoodInteractionState.Approaching;
            }
        }

        public void OnFoodLandedOnTaskbar(FormFoodItem food)
        {
            var petForm = FormPet.ActivePet;
            if (petForm != null && !petForm.IsDisposed && petForm.CurrentHwndWindow != IntPtr.Zero)
            {
                TriggerPigDescend();
            }
        }

        private void TriggerPigDescend()
        {
            _isDescendingFromWindow = true;
            _state = FoodInteractionState.Approaching;
        }

        // ---- Pętla aktualizacji (wywoływana z BrainController) ----------------

        public void Update(TimeSpan gameElapsed)
        {
            if (_activeFood == null || _activeFood.IsDisposed)
            {
                if (_state != FoodInteractionState.None && _state != FoodInteractionState.Popcorning)
                {
                    _state = FoodInteractionState.None;
                }
                return;
            }

            _activeFood.UpdateTracking();

            var petForm = FormPet.ActivePet;
            if (petForm == null || petForm.IsDisposed) return;

            // Gdy użytkownik fizycznie podnosi świnkę lub nią rzuca, fizyka ma pierwszeństwo
            if (petForm.IsDragging || petForm.IsTossing) return;

            if (_activeFood.IsDragging) return;

            if (_state == FoodInteractionState.Approaching)
            {
                UpdateApproaching(petForm);
            }
            else if (_state == FoodInteractionState.Eating)
            {
                UpdateEating(petForm, gameElapsed);
            }
        }

        private void UpdateApproaching(FormPet petForm)
        {
            if (_activeFood == null || _activeFood.IsDisposed)
            {
                _state = FoodInteractionState.None;
                return;
            }

            IntPtr pigHwnd = petForm.CurrentHwndWindow;
            bool pigOnWindow = (pigHwnd != IntPtr.Zero);
            bool foodOnTaskbar = _activeFood.IsOnTaskbar || (_activeFood.WindowHwnd == IntPtr.Zero);

            // 1. Jeśli świnka jest na oknie, a jedzenie na pasku zadań -> świnka schodzi z okna
            if (pigOnWindow && (foodOnTaskbar || _isDescendingFromWindow))
            {
                // Wybieramy krawędź okna w stronę, w której leży jedzenie
                int foodX = _activeFood.Location.X;
                bool exitToLeft = foodX < (int)petForm.PositionX;
                petForm.StepOffWindowToTaskbar(exitToLeft);
                return;
            }

            // 2. Jeśli są na tym samym podłożu -> świnka podchodzi do jedzenia
            int foodCenterX = _activeFood.Location.X + 16;
            int petWidth = petForm.Width;
            int petMouthX = petForm.IsFacingLeft
                ? (int)petForm.PositionX + 12
                : (int)petForm.PositionX + petWidth - 12;

            int dx = foodCenterX - petMouthX;

            // Sprawdzamy czy świnka dotarła do jedzenia (odległość pyszczka <= 18 px)
            if (Math.Abs(dx) <= 18)
            {
                StartEating(petForm, _activeFood);
            }
            else
            {
                // Krok w stronę jedzenia
                // Obliczamy cel dla PositionX tak, by pyszczek znalazł się przy jedzeniu
                int targetX = (dx < 0) ? (foodCenterX - 12) : (foodCenterX - petWidth + 12);
                petForm.StepTowards(targetX, 2);
            }
        }

        private void StartEating(FormPet petForm, FormFoodItem food)
        {
            _state = FoodInteractionState.Eating;
            _isDescendingFromWindow = false;

            // Czas jedzenia: 3 - 6 sekund (PLAN.md B6)
            _eatingRemainingSeconds = 3.0 + (_random.NextDouble() * 3.0);

            // Ustawienie zwrotu ku jedzeniu
            petForm.SetFacing(food.Location.X < petForm.PositionX);

            // Animacja: "eat" dla siana, "eat_treat" dla warzyw/smakołyków
            string anim = string.Equals(food.ItemId, "siano", StringComparison.OrdinalIgnoreCase)
                ? "eat"
                : (food.ItemDef?.Animation ?? "eat_treat");

            petForm.PlayAnimationByName(anim);

            // Rozpoczęcie powtarzającego się chrupania z lekką zmianą wysokości (F1)
            SoundManager.Instance?.StartEatingCrunch();

            SwinkaBrainController.Log(string.Format(
                "[Karmienie] Świnka podeszła do {0} i zaczyna jeść (animacja: {1}, czas: {2:0.#}s).",
                food.ItemDef?.Name ?? food.ItemId, anim, _eatingRemainingSeconds));
        }

        private void UpdateEating(FormPet petForm, TimeSpan gameElapsed)
        {
            _eatingRemainingSeconds -= gameElapsed.TotalSeconds;
            SoundManager.Instance?.UpdateEating(gameElapsed);

            if (_eatingRemainingSeconds <= 0)
            {
                FinishEating(petForm);
            }
        }

        private void FinishEating(FormPet petForm)
        {
            SoundManager.Instance?.StopEatingCrunch();
            string foodId = _currentFoodId;
            var itemDef = _activeFood?.ItemDef ?? SwinkaItemCatalog.GetItem(foodId);

            // Przedmiot znika po zjedzeniu
            CancelActiveFood();

            // Zastosowanie efektów na potrzeby z PLAN.md / items.json
            if (itemDef != null && itemDef.Effects != null)
            {
                foreach (var eff in itemDef.Effects)
                {
                    if (NeedNames.TryParseDataKey(eff.Key, out Need need))
                    {
                        _controller.Pet.ChangeNeed(need, eff.Value);
                    }
                }
            }

            // Więź (+1 punkt) oraz statystyki
            _controller.Pet.AddBondPoints(1);
            _controller.Pet.RecordFoodEaten(foodId);

            SwinkaBrainController.Log(string.Format(
                "[Karmienie] Zjedzono {0}. Najedzenie: {1:0.#}%, Wit. C: {2:0.#}%, Humor: {3:0.#}%. Łącznie karmień: {4}.",
                itemDef?.Name ?? foodId,
                _controller.Pet.Needs.Satiety,
                _controller.Pet.Needs.VitaminC,
                _controller.Pet.Needs.Mood,
                _controller.Pet.State.Stats.Counters["karmienia"]));

            // Sprawdzenie czy to ulubione warzywo (wzór: Dosidicus)
            // Przy ulubionym warzywie czasem robi popcorn po jedzeniu (PLAN.md B6)
            bool isFavorite = _controller.Pet.IsFavoriteVegetable(foodId);
            if (isFavorite && _random.Next(100) < 50) // 50% szans
            {
                _state = FoodInteractionState.Popcorning;
                _controller.Pet.Count("popcorn_po_jedzeniu");
                _controller.Pet.Needs.Mood = Math.Min(100.0, _controller.Pet.Needs.Mood + 10.0);
                petForm.PlayAnimationByName("popcorn");

                SwinkaBrainController.Log(string.Format(
                    "[Karmienie] {0} to ulubione warzywo świnki! Świnka robi radosny popcorning (+10 humoru)!",
                    itemDef?.Name ?? foodId));
            }
            else
            {
                _state = FoodInteractionState.None;
                petForm.PlayAnimationByName("idle");
            }

            // Natychmiastowe powiadomienie otwartego okna Domku o zmianie stanu
            FormDomek.NotifyStateChanged();
        }
    }
}
