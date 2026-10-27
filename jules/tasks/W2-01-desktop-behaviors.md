# Task W2-01: Desktop behaviors plug-in contract

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: wave 1 merged.
Replaces old task(s): F4-09. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

## Goal
Reactions of the pig to the outside world (music, fast mouse, fullscreen, weather, tricks, a companion) will be built
by different agents in parallel. Give them one extension point so nobody edits `BrainController.cs` at the same time.

## Files you may change
New: `src/Cuy/dotNet/Behaviors/IDesktopBehavior.cs`, `src/Cuy/dotNet/Behaviors/BehaviorHost.cs`,
`src/Cuy/dotNet/Behaviors/README.md`, `src/Cuy/dotNet/Behaviors/SampleBehavior.cs` (inactive by default);
`src/Cuy/dotNet/BrainController.cs` (three small hook calls only), `src/Cuy/dotNet/SelfTest.cs`.

## Specification
1. `IDesktopBehavior` — the contract MUST match the ready-made behaviours in `research/gotowce/src/Cuy/dotNet/Behaviors/`
   (`DanceToMusicBehavior`, `FullscreenHideBehavior`) exactly: `string Id { get; }`, `void Start(BehaviorContext ctx)`,
   `void Tick(TimeSpan dt)` (UI thread, ~every 100 ms, must return fast), `void Stop()`. `BehaviorContext` exposes exactly these
   members, with these names and types: `Cuy.Core.Pet Pet`, `FormPet ActivePet`, `BrainController Brain`, `Action<string> Log`,
   `bool IsBusy` (script, drag, toss, sulk), `bool IsHomeOpen`, `Func<string, bool> RequestAnimation` (returns false and does nothing
   while a script such as `FirstRunIntro` holds the pig). Namespace of the behaviours: `Cuy.Behaviors`. A behaviour must call
   `ctx.Brain.ScriptAnimation`-style APIs only through the context.
2. `BehaviorHost` finds all non-abstract classes implementing the interface in the executing assembly (reflection, same
   pattern as `HomeFeatures`), creates them with the default constructor, starts them after the pet exists, ticks them
   from the existing `BrainController` update (try/catch per behaviour; a behaviour that throws 5 times is disabled and
   logged `[Behavior] x disabled`), stops them on exit.
3. Setting `DisabledBehaviors` (comma list in `LocalData`) lets the human switch one off without a rebuild.
4. `SelfTest.cs`: instantiate `BehaviorHost`, run one tick with a fake context, check a throwing behaviour is disabled.
5. `SampleBehavior` logs once and returns; `[Behavior]` lines appear in the log. Document how to add a behaviour in the README.

## Checks
Build passes (`-p:EnableWindowsTargeting=true`); `--selftest` code compiles.

## Gotowe pliki
- `research/gotowce/src/Cuy/dotNet/Behaviors/DanceToMusicBehavior.cs` and `FullscreenHideBehavior.cs` are the two consumers of this contract
  (built in F6-01 and F6-03). Read them first; the interface must compile with them unchanged except for the notes in those tasks.
  They also call `ctx.Brain.IsCurrentlySleeping()` (exists in `BrainController`) and `LocalData.GetIntValue(string)` (exists).
- `SampleBehavior` stays inactive; do not copy the gotowce behaviours in this task.

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC: nothing UNVERIFIED depends on this task.

When done, open a pull request against `main` titled `W2-01: Desktop behavior plug-ins`.
