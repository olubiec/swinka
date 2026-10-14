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
    /// Coordinates the feeding mechanics:
    /// - Puts food on the desktop (100-300 px from the pig)
    /// - Tracks food dragged with the mouse
    /// - Handles food falling onto the taskbar and the pig climbing down from a window
    /// - Drives the pig's approach and plays eat / eat_treat (3-6 s)
    /// - Raises needs and bond points
    /// - Remembers the favourite vegetable and triggers a happy popcorn after eating.
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
        /// Puts food on the surface the pig stands on (100-300 px from it).
        /// </summary>
        public bool SpawnFood(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return false;

            var petForm = FormPet.ActivePet;
            if (petForm == null || petForm.IsDisposed) return false;

            // Cancel previous uneaten food if any
            CancelActiveFood();

            _currentFoodId = itemId;

            // Read the surface the pig stands on
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

                // Try to place it in front of the pig's nose
                if (faceLeft)
                {
                    targetX = pigX - distance;
                    if (targetX < workingArea.Left + 10)
                    {
                        // Not enough room on the left -> place on the right
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
                        // Not enough room on the right -> place on the left
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
                // Food on a window
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
                    // Fallback to the taskbar
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

                // Turn the pig towards the food and start walking
                int foodCenterX = targetX + 16;
                int petCenterX = (int)(petForm.PositionX + petForm.Width / 2);
                petForm.SetFacing(foodCenterX < petCenterX);
                petForm.PlayAnimationByName("walk");

                BrainController.Log(string.Format(
                    "[Feeding] Put {0} at ({1}, {2}). Approach started.",
                    itemId, targetX, targetY));

                return true;
            }
            catch (Exception ex)
            {
                BrainController.Log("[ERROR] Could not create food: " + ex.Message);
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

        // ---- Mouse drag events ------------------------------------------------

        public void OnFoodDragStart(FoodItemForm food)
        {
            if (food == null || food != _activeFood) return;

            // When the user picks the food up, the pig stops and watches it
            if (_state == FoodInteractionState.Approaching)
            {
                var petForm = FormPet.ActivePet;
                if (petForm != null && !petForm.IsDisposed)
                {
                    petForm.PlayAnimationByName("idle");
                }
            }
            BrainController.Log(string.Format("[Feeding] User picked up {0} with the mouse.", food.ItemId));
        }

        public void OnFoodDragging(FoodItemForm food)
        {
            if (food == null || food != _activeFood) return;

            var petForm = FormPet.ActivePet;
            if (petForm != null && !petForm.IsDisposed)
            {
                // Turn the pig towards the dragged food
                int foodCenterX = food.Location.X + food.Width / 2;
                int petCenterX = (int)(petForm.PositionX + petForm.Width / 2);
                petForm.SetFacing(foodCenterX < petCenterX);
            }
        }

        public void OnFoodDropped(FoodItemForm food)
        {
            if (food == null || food != _activeFood) return;

            // Check whether the food was dropped in mid-air -> if so, let it fall onto the taskbar
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

            BrainController.Log(string.Format("[Feeding] Dropped {0} at ({1}, {2}).", food.ItemId, food.Location.X, food.Location.Y));
        }

        public void OnFoodLandedOnTaskbar(FoodItemForm food)
        {
            if (food == null || food != _activeFood) return;

            var petForm = FormPet.ActivePet;
            if (petForm == null || petForm.IsDisposed) return;

            IntPtr petHwnd = petForm.CurrentHwndWindow;
            if (petHwnd != IntPtr.Zero)
            {
                // The pig is on a window and the food fell onto the taskbar -> the pig climbs down
                _isDescendingFromWindow = true;
                _state = FoodInteractionState.Approaching;
                petForm.TriggerFallFromWindow();
                BrainController.Log("[Feeding] Food fell onto the taskbar - the pig climbs down from the window!");
            }
            else
            {
                // Both on the taskbar -> normal approach
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
                        // Check whether the point below lies on a window's top edge (+/- 20 px)
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

        // ---- Game loop (Update) ----------------------------------------------

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
                // Wait for the popcorn animation to end
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
                // While the food is dragged or falling, the pig waits
                return;
            }

            // Check whether the pig is under physics (falling, thrown)
            if (petForm.IsDragging || petForm.IsTossing)
            {
                return;
            }

            IntPtr petHwnd = petForm.CurrentHwndWindow;
            IntPtr foodHwnd = _activeFood.WindowHwnd;

            // Check whether both are on the same surface
            if (petHwnd != foodHwnd)
            {
                // If the pig is on a window and the food on the taskbar -> force climbing down
                if (petHwnd != IntPtr.Zero && foodHwnd == IntPtr.Zero && !_isDescendingFromWindow)
                {
                    _isDescendingFromWindow = true;
                    petForm.TriggerFallFromWindow();
                    return;
                }
                // If the food is on a window and the pig on the taskbar -> the pig cannot climb onto the window without a ramp,
                // so it walks under the window and waits (beg / sniff)
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

            // Both on the same surface
            _isDescendingFromWindow = false;

            int foodCenterX = _activeFood.Location.X + _activeFood.Width / 2;
            int petWidth = petForm.Width;
            bool faceLeft = petForm.IsFacingLeft;

            // The pig's nose: facing left -> left edge; facing right -> right edge
            int noseX = faceLeft ? (int)petForm.PositionX : (int)(petForm.PositionX + petWidth);

            int dx = foodCenterX - noseX;

            // Set the direction
            if (Math.Abs(dx) > 10)
            {
                bool shouldFaceLeft = (foodCenterX < (petForm.PositionX + petWidth / 2));
                if (shouldFaceLeft != faceLeft)
                {
                    petForm.SetFacing(shouldFaceLeft);
                }
            }

            // Check whether the pig reached the food (mouth distance <= 18 px)
            if (Math.Abs(dx) <= 18)
            {
                StartEating(petForm, _activeFood);
            }
            else
            {
                // Step towards the food
                // Compute the PositionX target so the mouth ends up at the food
                int targetX = (dx < 0) ? (foodCenterX - 12) : (foodCenterX - petWidth + 12);
                petForm.StepTowards(targetX, 2);
            }
        }

        private void StartEating(FormPet petForm, FoodItemForm food)
        {
            _state = FoodInteractionState.Eating;
            _isDescendingFromWindow = false;

            // Eating time: 3 - 6 seconds (PLAN.md B6)
            _eatingRemainingSeconds = 3.0 + (_random.NextDouble() * 3.0);

            // Turn towards the food
            petForm.SetFacing(food.Location.X < petForm.PositionX);

            // Animation: "eat" for hay, "eat_treat" for vegetables and treats
            string anim = (string.Equals(food.ItemId, "hay", StringComparison.OrdinalIgnoreCase))
                ? "eat"
                : (food.ItemDef?.Animation ?? "eat_treat");

            petForm.PlayAnimationByName(anim);

            // Start the repeating crunch with a slight pitch change
            SoundManager.Instance?.StartEatingCrunch();

            BrainController.Log(string.Format(
                "[Feeding] The pig reached {0} and starts eating (animation: {1}, time: {2:0.#}s).",
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

            // The item disappears after eating
            CancelActiveFood();

            // Apply the effects on needs from items.json
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

            // Bond (+1 point) and statistics
            _controller.Pet.AddBondPoints(1);
            _controller.Pet.RecordFoodEaten(foodId);

            BrainController.Log(string.Format(
                "[Feeding] Ate {0}. Fullness: {1:0.#}%, Vit. C: {2:0.#}%, Mood: {3:0.#}%. Total feedings: {4}.",
                itemDef?.Name ?? foodId,
                _controller.Pet.Needs.Satiety,
                _controller.Pet.Needs.VitaminC,
                _controller.Pet.Needs.Mood,
                _controller.Pet.State.Stats.Counters["feedings"]));

            // Check whether this is the favourite vegetable (pattern: Dosidicus)
            // With the favourite vegetable it sometimes popcorns after eating (PLAN.md B6)
            bool isFavorite = _controller.Pet.IsFavoriteVegetable(foodId);
            if (isFavorite && _random.Next(100) < 50) // 50% chance
            {
                _state = FoodInteractionState.Popcorning;
                _controller.Pet.Count("popcorn_after_food");
                _controller.Pet.Needs.Mood = Math.Min(100.0, _controller.Pet.Needs.Mood + 10.0);
                petForm.PlayAnimationByName("popcorn");

                BrainController.Log(string.Format(
                    "[Feeding] {0} is the pig's favourite vegetable! The pig popcorns with joy (+10 mood)!",
                    itemDef?.Name ?? foodId));
            }
            else
            {
                _state = FoodInteractionState.None;
                petForm.PlayAnimationByName("idle");
            }

            // Notify an open Home window about the state change right away
            HomeWindow.NotifyStateChanged();
        }
    }
}
