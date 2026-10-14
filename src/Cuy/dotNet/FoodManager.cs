using System;
using System.Collections.Generic;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Cuy.Core;

namespace Cuy
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
    public sealed class FoodManager
    {
        private static FoodManager _instance;
        public static FoodManager Instance => _instance;

        private readonly BrainController _controller;
        private readonly Random _random = new Random();

        private FoodItemForm _activeFood;
        private FoodInteractionState _state = FoodInteractionState.None;
        private string _currentFoodId;
        private double _eatingRemainingSeconds;
        private bool _isDescendingFromWindow;

        public FoodItemForm ActiveFood => _activeFood;
        public FoodInteractionState State => _state;

        public FoodManager(BrainController controller)
        {
            _instance = this;
            _controller = controller ?? throw new ArgumentNullException(nameof(controller));
        }

        public static void Initialize(BrainController controller)
        {
            if (_instance == null && controller != null)
            {
                new FoodManager(controller);
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
                        if (targetX > workingArea.Right - 42)
                        {
                            targetX = Math.Max(workingArea.Left + 10, workingArea.Right - 42);
                        }
                    }
                }
                else
                {
                    targetX = pigX + pigW + distance;
                    if (targetX > workingArea.Right - 42)
                    {
                        // Za mało miejsca z prawej -> postaw z lewej
                        targetX = pigX - distance;
                        if (targetX < workingArea.Left + 10)
                        {
                            targetX = workingArea.Left + 10;
                        }
                    }
                }
            }
            else
            {
                // Jedzenie na oknie
                if (NativeMethods.GetWindowRect(new HandleRef(petForm, hwnd), out var rct) && (rct.Right - rct.Left > 0))
                {
                    targetY = rct.Top - 32;

                    if (faceLeft)
                    {
                        targetX = pigX - distance;
                        if (targetX < rct.Left)
                        {
                            targetX = pigX + pigW + distance;
                            if (targetX > rct.Right - 32) targetX = rct.Left + Math.Max(0, (rct.Right - rct.Left) / 2);
                        }
                    }
                    else
                    {
                        targetX = pigX + pigW + distance;
                        if (targetX > rct.Right - 32)
                        {
                            targetX = pigX - distance;
                            if (targetX < rct.Left) targetX = rct.Left + Math.Max(0, (rct.Right - rct.Left) / 2);
                        }
                    }

                    relOffset = new Point(targetX - rct.Left, targetY - rct.Top);
                }
                else
                {
                    // Fallback na pasek zadań
                    hwnd = IntPtr.Zero;
                    targetY = workingArea.Bottom - 32;
                    targetX = Math.Max(workingArea.Left + 10, Math.Min(workingArea.Right - 42, pigX + (faceLeft ? -distance : distance)));
                }
            }

            try
            {
                _activeFood = new FoodItemForm(itemId, hwnd, relOffset)
                {
                    Location = new Point(targetX, targetY)
                };
                _activeFood.Show();

                _state = FoodInteractionState.Approaching;
                _isDescendingFromWindow = false;

                // Odwrócenie świnki w stronę jedzenia i rozpoczęcie chodu
                int foodCenterX = targetX + 16;
                int petCenterX = (int)(petForm.PositionX + petForm.Width / 2);
                petForm.SetFacing(foodCenterX < petCenterX);
                petForm.PlayAnimationByName("walk");

                BrainController.Log(string.Format(
                    "[Karmienie] Położono {0} w ({1}, {2}). Rozpoczęto podchodzenie.",
                    itemId, targetX, targetY));

                return true;
            }
            catch (Exception ex)
            {
                BrainController.Log("[Błąd] Nie udało się stworzyć jedzenia: " + ex.Message);
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
                catch (Exception ex) { BrainController.Log("[WARN] FoodManager.CancelActiveFood: " + ex.Message); }
            }
            _activeFood = null;
            _currentFoodId = null;
            if (_state != FoodInteractionState.Popcorning)
            {
                _state = FoodInteractionState.None;
            }
        }

        // ---- Zdarzenia przeciągania myszką -----------------------------------

        public void OnFoodDragStart(FoodItemForm food)
        {
            if (food == null || food != _activeFood) return;

            // Gdy użytkownik podnosi jedzenie, świnka zatrzymuje się i patrzy za nim
            if (_state == FoodInteractionState.Approaching)
            {
                var petForm = FormPet.ActivePet;
                if (petForm != null && !petForm.IsDisposed)
                {
                    petForm.PlayAnimationByName("idle");
                }
            }
            BrainController.Log(string.Format("[Karmienie] Użytkownik podniósł {0} myszką.", food.ItemId));
        }

        public void OnFoodDragging(FoodItemForm food)
        {
            if (food == null || food != _activeFood) return;

            var petForm = FormPet.ActivePet;
            if (petForm != null && !petForm.IsDisposed)
            {
                // Obróć świnkę w stronę przeciąganego jedzenia
                int foodCenterX = food.Location.X + food.Width / 2;
                int petCenterX = (int)(petForm.PositionX + petForm.Width / 2);
                petForm.SetFacing(foodCenterX < petCenterX);
            }
        }

        public void OnFoodDropped(FoodItemForm food)
        {
            if (food == null || food != _activeFood) return;

            // Sprawdź czy jedzenie upuszczono w powietrzu -> jeśli tak, niech spada na pasek
            IntPtr underHwnd = FindWindowUnderFood(food);
            if (underHwnd == IntPtr.Zero)
            {
                Rectangle wa = Screen.PrimaryScreen.WorkingArea;
                if (food.Location.Y < wa.Bottom - food.Height - 5)
                {
                    food.StartFallToTaskbar();
                }
                else
                {
                    food.IsOnTaskbar = true;
                    food.WindowHwnd = IntPtr.Zero;
                    food.Location = new Point(food.Location.X, wa.Bottom - food.Height);
                    OnFoodLandedOnTaskbar(food);
                }
            }
            else
            {
                if (NativeMethods.GetWindowRect(new HandleRef(food, underHwnd), out var rct))
                {
                    food.WindowHwnd = underHwnd;
                    food.IsOnTaskbar = false;
                    food.Location = new Point(food.Location.X, rct.Top - food.Height);
                    food.WindowRelativeOffset = new Point(food.Location.X - rct.Left, food.Location.Y - rct.Top);

                    _state = FoodInteractionState.Approaching;
                    var petForm = FormPet.ActivePet;
                    if (petForm != null && !petForm.IsDisposed)
                    {
                        petForm.PlayAnimationByName("walk");
                    }
                }
            }

            BrainController.Log(string.Format("[Karmienie] Upuszczono {0} w ({1}, {2}).", food.ItemId, food.Location.X, food.Location.Y));
        }

        public void OnFoodLandedOnTaskbar(FoodItemForm food)
        {
            if (food == null || food != _activeFood) return;

            var petForm = FormPet.ActivePet;
            if (petForm == null || petForm.IsDisposed) return;

            IntPtr petHwnd = petForm.CurrentHwndWindow;
            if (petHwnd != IntPtr.Zero)
            {
                // Świnka jest na oknie, a jedzenie spadło na pasek zadań -> świnka schodzi z okna
                _isDescendingFromWindow = true;
                _state = FoodInteractionState.Approaching;
                petForm.TriggerFallFromWindow();
                BrainController.Log("[Karmienie] Jedzenie spadło na pasek zadań - świnka schodzi z okna!");
            }
            else
            {
                // Obie są na pasku zadań -> normalne podchodzenie
                _state = FoodInteractionState.Approaching;
                petForm.PlayAnimationByName("walk");
            }
        }

        private static IntPtr FindWindowUnderFood(FoodItemForm food)
        {
            int cx = food.Location.X + food.Width / 2;
            int cy = food.Location.Y + food.Height + 4;

            IntPtr found = IntPtr.Zero;
            NativeMethods.EnumWindows(delegate (IntPtr hWnd, int lParam)
            {
                if (!NativeMethods.IsWindowVisible(hWnd) || NativeMethods.IsIconic(hWnd)) return true;

                if (NativeMethods.GetWindowRect(new HandleRef(null, hWnd), out var rct))
                {
                    if (rct.Right - rct.Left > 100 && rct.Bottom - rct.Top > 100)
                    {
                        // Sprawdź czy punkt pod spodem leży na górnej krawędzi okna (+/- 20 px)
                        if (cx >= rct.Left && cx <= rct.Right && Math.Abs(cy - rct.Top) <= 24)
                        {
                            found = hWnd;
                            return false;
                        }
                    }
                }
                return true;
            }, IntPtr.Zero);

            return found;
        }

        // ---- Pętla gry (Update) ----------------------------------------------

        public void Update(TimeSpan gameElapsed)
        {
            if (_activeFood != null && !_activeFood.IsDisposed)
            {
                _activeFood.UpdateTracking();
            }

            var petForm = FormPet.ActivePet;
            if (petForm == null || petForm.IsDisposed) return;

            switch (_state)
            {
                case FoodInteractionState.Approaching:
                    UpdateApproaching(petForm, gameElapsed);
                    break;

                case FoodInteractionState.Eating:
                    UpdateEating(petForm, gameElapsed);
                    break;

                case FoodInteractionState.Popcorning:
                    // Czekamy na koniec animacji popcorn
                    if (petForm.CurrentAnimationName != "popcorn")
                    {
                        _state = FoodInteractionState.None;
                        petForm.PlayAnimationByName("idle");
                    }
                    break;
            }
        }

        private void UpdateApproaching(FormPet petForm, TimeSpan gameElapsed)
        {
            if (_activeFood == null || _activeFood.IsDisposed)
            {
                _state = FoodInteractionState.None;
                return;
            }

            if (_activeFood.IsDragging || _activeFood.IsFalling)
            {
                // Podczas przeciągania/spadania świnka czeka
                return;
            }

            // Sprawdzamy czy świnka jest w trakcie fizyki (spadek, rzucenie)
            if (petForm.IsDragging || petForm.IsTossing)
            {
                return;
            }

            IntPtr petHwnd = petForm.CurrentHwndWindow;
            IntPtr foodHwnd = _activeFood.WindowHwnd;

            // Sprawdzenie czy są na tej samej powierzchni
            if (petHwnd != foodHwnd)
            {
                // Jeśli świnka jest na oknie, a jedzenie na pasku zadań -> wymuś zejście
                if (petHwnd != IntPtr.Zero && foodHwnd == IntPtr.Zero && !_isDescendingFromWindow)
                {
                    _isDescendingFromWindow = true;
                    petForm.TriggerFallFromWindow();
                    return;
                }
                // Jeśli jedzenie jest na oknie, a świnka na pasku -> świnka nie może wejść na okno bez rampy,
                // więc podchodzi pod okno i czeka (beg / sniff)
                if (petHwnd == IntPtr.Zero && foodHwnd != IntPtr.Zero)
                {
                    int foodX = _activeFood.Location.X;
                    if (Math.Abs(petForm.PositionX - foodX) > 30)
                    {
                        petForm.StepTowards(foodX, 2);
                    }
                    else
                    {
                        if (petForm.CurrentAnimationName != "beg" && petForm.CurrentAnimationName != "sniff")
                        {
                            petForm.PlayAnimationByName("beg");
                        }
                    }
                    return;
                }
            }

            // Obie są na tej samej powierzchni
            _isDescendingFromWindow = false;

            int foodCenterX = _activeFood.Location.X + _activeFood.Width / 2;
            int petWidth = petForm.Width;
            bool faceLeft = petForm.IsFacingLeft;

            // Nosek świnki: gdy patrzy w lewo -> lewa krawędź; gdy w prawo -> prawa krawędź
            int noseX = faceLeft ? (int)petForm.PositionX : (int)(petForm.PositionX + petWidth);

            int dx = foodCenterX - noseX;

            // Ustawienie kierunku
            if (Math.Abs(dx) > 10)
            {
                bool shouldFaceLeft = (foodCenterX < (petForm.PositionX + petWidth / 2));
                if (shouldFaceLeft != faceLeft)
                {
                    petForm.SetFacing(shouldFaceLeft);
                }
            }

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

        private void StartEating(FormPet petForm, FoodItemForm food)
        {
            _state = FoodInteractionState.Eating;
            _isDescendingFromWindow = false;

            // Czas jedzenia: 3 - 6 sekund (PLAN.md B6)
            _eatingRemainingSeconds = 3.0 + (_random.NextDouble() * 3.0);

            // Ustawienie zwrotu ku jedzeniu
            petForm.SetFacing(food.Location.X < petForm.PositionX);

            // Animacja: "eat" dla siana, "eat_treat" dla warzyw/smakołyków
            string anim = (string.Equals(food.ItemId, "hay", StringComparison.OrdinalIgnoreCase))
                ? "eat"
                : (food.ItemDef?.Animation ?? "eat_treat");

            petForm.PlayAnimationByName(anim);

            // Rozpoczęcie powtarzającego się chrupania z lekką zmianą wysokości (F1)
            SoundManager.Instance?.StartEatingCrunch();

            BrainController.Log(string.Format(
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
            var itemDef = _activeFood?.ItemDef ?? ItemCatalogLoader.GetItem(foodId);

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

            BrainController.Log(string.Format(
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

                BrainController.Log(string.Format(
                    "[Karmienie] {0} to ulubione warzywo świnki! Świnka robi radosny popcorning (+10 humoru)!",
                    itemDef?.Name ?? foodId));
            }
            else
            {
                _state = FoodInteractionState.None;
                petForm.PlayAnimationByName("idle");
            }

            // Natychmiastowe powiadomienie otwartego okna Domku o zmianie stanu
            HomeWindow.NotifyStateChanged();
        }
    }
}
