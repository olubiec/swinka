# Task W3-04: Mouse fear and tricks

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: W2-01 (behaviors), W2-03 (bond unlocks), W3-02 (shared Home files) merged. Shake detector (F3-04) and edge peeks (F1-05) are on main.
Replaces old task(s): F6-02 + F6-05. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

Two behaviors that are both driven by the bond level. Part A is desktop-only; Part B has a Core part and a Home feature `tricks`. `ContextMenus.cs` gets one minimal edit (Part B step 4).

## Part A: fear of a shaken mouse (from F6-02)

### Specification
1. Core `MouseShakeDetector` and its tests already exist (task F3-04: `src/Cuy.Core/Input/MouseShakeDetector.cs`,
   `Push(int x, int y, double distanceToPigPx, DateTime utc)` returns true once per shake; defaults 6 horizontal reversals within 1 s,
   average speed above 900 px/s, cursor within 300 px, debounce 2 s) together with the desktop `MouseShakeMonitor`
   (`src/Cuy/dotNet/Platform/MouseShakeMonitor.cs`, event `Shaken`). Do NOT create another detector; use them.
2. `MouseFearBehavior` (`src/Cuy/dotNet/Behaviors/`): subscribes to `MouseShakeMonitor.Shaken` (the monitor polls the cursor every 33 ms). First shake near the pig ->
   `startle` then `freeze` for 2 s (sound: `SoundManager.PlayFear`). A second shake within 10 s -> `flee`: run to the nearest
   screen edge and leave through it (reuse `EdgePeekScene` from F1-05), wait random 5-20 s, then peek out (`peek`), and come
   back only if the cursor is calm (no shake for 5 s). Cooldown: the full flee at most once per 5 minutes.
3. Bond effects: if `Pet.IsUnlocked("approach_cursor")` (level 2+) the pig never flees; a shake only gives startle+freeze
   with 50 % chance, and when the cursor rests within 300 px for 3 s and the pig is idle it walks to it (at most once per
   5 minutes) and sniffs.
4. Never triggers while the pig is held, thrown, sulking, in Home, in a script (`FirstRunIntro`), asleep, or while
   the fullscreen hide (F6-03) is active. Log every trigger as `[Fear] ...`.

### Checks
`dotnet test ... -c Release`; build passes. PR "Windows check for the human": shake the mouse next to the pig twice.

### Gotowe pliki
- `research/gotowce/src/Cuy.Core/Input/MouseShakeDetector.cs` → `src/Cuy.Core/Input/MouseShakeDetector.cs` (already in the repo; F3-04 adds the monitor).

### Testy ręczne (ZWERYFIKUJ NA PC)
- `TESTY_RECZNE.md` SHAKE-01: thresholds come from a draft, not from a source; tune them by hand.
- Research R20.2 (PowerToys Find My Mouse, MIT, read in its source): a shake there is path length >= 1000 px within 1000 ms AND path >= 4 x the diagonal of the
  rectangle containing the movement, computed on raw relative mouse movement. Only the speed (900 px/s ~ 1000 px in 1 s) has support; 300 px from the pig, 2 s debounce,
  4 px step and 6 reversals have no source. Do NOT change the detector in this task; if SHAKE-01 shows false alarms, SHAKE-03 (add the path/diagonal criterion) is a separate task.
- Research R20.3: do not switch to `GetMouseMovePointsEx` (documented to misbehave with negative multi-monitor coordinates); keep `Cursor.Position` polling.

## Part B: tricks (from F6-05)

### Specification
1. Core (`Pet.Tricks.cs`, tests `TricksTests.cs`): `TrickResult Pet.TryPerformTrick(string id)` for `spin`, `stand_up`, `popcorn`,
   `hurdle` (unlock ids `trick_spin` L5, `trick_stand_up` L9, `trick_popcorn` L12, `trick_hurdle` L15 from `bond.json`).
   Results: `Ok`, `Locked`, `Tired` (energy < 25), `Cooldown` (30 s per trick), `Sleeping`. `Ok` costs 10 energy, gives
   +2 bond points (the daily bond limit still applies), +3 mood, and counts a diary stat. Numbers in `assets/data/tricks.json`.
2. Message `trick { id }`; the C# answer plays the animation on the desktop pig (or in Home if the pig is inside),
   `Tired` plays `yawn` and sends a page toast "Too tired for tricks".
3. Home feature `tricks` (web/home/features/tricks): four pixel buttons with the animation sprite, locked ones show the `padlock` icon (CSS `.icon-padlock`, exists in `assets/icons`)
   and "Level N"; state key `tricks: [{ id, unlocked, readyIn }]` (see `contracts.md`, add the section).
4. Tray menu: submenu `Tricks` with the unlocked tricks (edit `ContextMenus.cs` minimally).
5. Tricks respect `ScriptAnimation`/busy states (no trick while held, thrown or in the first-run intro).

### Checks
`dotnet test ... -c Release`, `node --check`, smoke test (assert the four buttons render), build passes.

When done, open a pull request against `main` titled `W3-04: Mouse fear and tricks`.
