# Task F1-05: Random shy peeks from the screen edge + the pig never walks the desktop while Home is open

Read `AGENTS.md` first and follow it.

## Goal
1. The first-run scene (`src/Cuy/dotNet/FirstRunIntro.cs`) lets the pig stand behind the left screen edge, show only
   its nose, hide when the cursor comes close and walk out when left alone. The human loves it. Reuse it: rarely and
   randomly, the pig walks off the screen edge and later peeks back the same shy way.
2. Bug: sometimes the pig keeps walking on the desktop although Home is open (it should be "inside" Home:
   `FormPet.EnterHome()` hides it, `LeaveHome()` brings it back).

## Files you may change / add
`src/Cuy/dotNet/FirstRunIntro.cs`, new `src/Cuy/dotNet/EdgePeekScene.cs`, new `src/Cuy/dotNet/EdgePeekDirector.cs`,
`src/Cuy/dotNet/FormPet.cs`. Do NOT edit `Program.cs` (another task in this wave edits it).

## Specification
1. Extract the peek logic of `FirstRunIntro` into `EdgePeekScene` (a reusable scene): constructor
   `(EdgeSide side, Action onDone, bool firstRun)`; `side` Left or Right. For Right, mirror everything: positions
   measured from `wa.Right`, the pig faces left (`pet.SetFacing(true)`), it walks out to the left. Keep the phases
   (Setup → Peek → Retreat ↔ Peek → PeekMore → WalkOut), the calm-time rules, the cursor distance rule and the
   2-minute safety net. During the scene `BrainController.ScriptAnimation` is set and `FormPet.ScriptBegin/ScriptMoveTo/
   ScriptEnd` move the pig (they exist; `ScriptBegin` must accept the side so it can face left on the right edge).
   `FirstRunIntro` becomes a thin wrapper: `new EdgePeekScene(EdgeSide.Left, onDone, firstRun: true)`.
   On Retreat for non-first-run scenes play `flee` (row 43, exists in animations.xml) while sliding back, then `idle`.
2. `EdgePeekDirector`: `EdgePeekDirector.EnsureStarted()` is called from `FormPet` the first time the pet becomes visible
   (idempotent); it never runs while `BrainController.Instance.Pet.State.NeedsNaming` is true or a first-run scene is
   active. A WinForms timer every 30 s. A random peek happens when ALL are true: at least 60 real minutes since the last peek (random
   60-180), user active (`Win32Input.GetIdleTime()` < 2 min), Home closed (`!HomeWindow.IsOpen`), pig visible, not
   sleeping, no food interaction, no cursor interaction, not dragged/tossed, not inside a script, no full-screen app.
   Then: pick the nearer screen edge, make the pig walk off-screen toward it (use `pet.StepTowards(target, 2)` every
   tick until fully off-screen, `walk` animation, script flag set so the Brain does not interfere), wait 5-20 s hidden,
   then run `EdgePeekScene` for that side. Log `[Peek] ...` lines for each step.
3. Home bug: in `FormPet` add a cheap check in the main step (`NextStep`): if `HomeWindow.IsOpen && !_inHome` call
   `EnterHome()`; if `!HomeWindow.IsOpen && _inHome && !Visible` call `LeaveHome(<bottom centre of the primary working
   area>)`. Log once when the check corrects the state. Also make `Play()` (respawn) respect `_inHome` (already partly done).

## Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes.
- PR description "Windows check for the human": first run still works (delete `%AppData%\Cuy`); to test a random peek
  quickly, add a DEBUG-only command line flag `--peek-test` read inside `EdgePeekDirector` via
  `Environment.GetCommandLineArgs()` that makes the first random peek happen after 20 s (no other files).

When done, open a pull request against `main` titled `F1-05: Random edge peeks and pig stays inside open Home`.
