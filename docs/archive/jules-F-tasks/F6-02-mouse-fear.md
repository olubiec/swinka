# Task F6-02: The pig is scared of a wildly shaken mouse

Read `AGENTS.md` first and follow it. Requires F3-04 (shake detector), F4-09, F4-05 (bond unlocks) and F1-05 (edge peeks: `EdgePeekScene`) merged.

## Specification
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

## Checks
`dotnet test ... -c Release`; build passes. PR "Windows check for the human": shake the mouse next to the pig twice.

## Gotowe pliki
- `research/gotowce/src/Cuy.Core/Input/MouseShakeDetector.cs` → `src/Cuy.Core/Input/MouseShakeDetector.cs` (already in the repo; F3-04 adds the monitor).

## Testy ręczne (ZWERYFIKUJ NA PC)
- `TESTY_RECZNE.md` SHAKE-01: thresholds come from a draft, not from a source; tune them by hand.
- Research R20.2 (PowerToys Find My Mouse, MIT, read in its source): a shake there is path length >= 1000 px within 1000 ms AND path >= 4 x the diagonal of the
  rectangle containing the movement, computed on raw relative mouse movement. Only the speed (900 px/s ~ 1000 px in 1 s) has support; 300 px from the pig, 2 s debounce,
  4 px step and 6 reversals have no source. Do NOT change the detector in this task; if SHAKE-01 shows false alarms, SHAKE-03 (add the path/diagonal criterion) is a separate task.
- Research R20.3: do not switch to `GetMouseMovePointsEx` (documented to misbehave with negative multi-monitor coordinates); keep `Cursor.Position` polling.

When done, open a pull request against `main` titled `F6-02: Fear of a shaken mouse`.
