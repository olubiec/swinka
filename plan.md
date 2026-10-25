1.  **Refactor `FirstRunIntro.cs` and extract `EdgePeekScene`:**
    *   Create a new file `src/Cuy/dotNet/EdgePeekScene.cs`.
    *   Define `enum EdgeSide { Left, Right }` in `EdgePeekScene.cs`.
    *   Extract the core logic from `FirstRunIntro.cs` into `EdgePeekScene(EdgeSide side, Action onDone, bool firstRun)`.
    *   Add conditional logic based on `side`:
        *   If `Right`, mirror positions (measure from `wa.Right`), set facing (`pet.SetFacing(true)` for facing left), and make the pig walk out to the left.
        *   Update `ScriptBegin` to accept `EdgeSide` (or create an overload / modify the existing one to handle facing correctly). The prompt says `ScriptBegin` must accept the side so it can face left on the right edge.
    *   Add conditional logic based on `firstRun`:
        *   On Retreat for non-first-run scenes, play `flee` animation while sliding back, then `idle`.
    *   Refactor `FirstRunIntro.cs` to be a thin wrapper around `new EdgePeekScene(EdgeSide.Left, onDone, firstRun: true)`.

2.  **Create `EdgePeekDirector.cs`:**
    *   Create `src/Cuy/dotNet/EdgePeekDirector.cs`.
    *   Implement `EdgePeekDirector.EnsureStarted()`, called from `FormPet` the first time the pet becomes visible (idempotent).
    *   It should use a WinForms timer ticking every 30s.
    *   Random peek condition:
        *   Never runs while `BrainController.Instance.Pet.State.NeedsNaming` is true or a first-run scene is active (`BrainController.ScriptAnimation != null` is a good proxy, or introduce a flag).
        *   At least 60 real minutes since the last peek (random 60-180 minutes).
        *   User active (`Win32Input.GetIdleTime().TotalMinutes < 2`).
        *   Home closed (`!HomeWindow.IsOpen`).
        *   Pig visible, not sleeping (`!pet.IsSleeping`), no food interaction (`FoodManager.Instance.State == None` or similar), no cursor interaction (`InteractionManager.Instance.LookState != TrackingCursor` or `!IsActiveInteraction`), not dragged/tossed (`!pet.IsTossing`), not inside a script, no full-screen app (`!SoundManager.Instance.IsFullScreenOrBusy()`).
    *   Debug flag: If `--peek-test` is passed on the command line (checked via `Environment.GetCommandLineArgs()`), make the first random peek happen after 20s.
    *   When conditions are met:
        *   Pick the nearer screen edge.
        *   Set script flag so Brain doesn't interfere (e.g., `BrainController.Instance.ScriptAnimation = "walk"` or a dedicated flag).
        *   Make the pig walk off-screen toward the edge using `pet.StepTowards(target, 2)` every tick (use a fast timer for walking off). Use `walk` animation.
        *   Wait 5-20s hidden.
        *   Run `EdgePeekScene` for that side.
        *   Log `[Peek] ...` lines for each step.

3.  **Update `FormPet.cs`:**
    *   Modify `ScriptBegin(double x, EdgeSide side = EdgeSide.Left)`. Set facing based on `side` (`SetFacing(side == EdgeSide.Right)`).
    *   In `NextStep()`, add the check for keeping the pig in Home:
        ```csharp
        if (HomeWindow.IsOpen && !_inHome)
        {
            EnterHome();
            BrainController.Log("[Home] Bug corrected: forced pig into Home.");
        }
        else if (!HomeWindow.IsOpen && _inHome && !Visible)
        {
            var wa = Screen.PrimaryScreen.WorkingArea;
            LeaveHome(new Point(wa.Left + wa.Width / 2, wa.Bottom));
            BrainController.Log("[Home] Bug corrected: forced pig out of Home.");
        }
        ```
    *   Ensure `Play()` respects `_inHome`:
        ```csharp
        if (HomeWindow.IsOpen) _inHome = true;
        Visible = !_inHome;
        ```
        (It looks like `Play(bool first, int forceSpawn = -1)` already partially does this, I should verify and refine).
    *   Call `EdgePeekDirector.EnsureStarted()` the first time the pet becomes visible (maybe in `Play()` or `NextStep()`).

4.  **Pre-commit steps:**
    *   Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
