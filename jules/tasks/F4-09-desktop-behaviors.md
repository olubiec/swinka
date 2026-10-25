# Task F4-09: Plug-in behaviours for the desktop pig

Read `AGENTS.md` first and follow it. Requires F1-01 (feature plugins) merged.

## Goal
Reactions of the pig to the outside world (music, fast mouse, fullscreen, weather, tricks, a companion) will be built
by different agents in parallel. Give them one extension point so nobody edits `BrainController.cs` at the same time.

## Files you may change
New: `src/Cuy/dotNet/Behaviors/IDesktopBehavior.cs`, `src/Cuy/dotNet/Behaviors/BehaviorHost.cs`,
`src/Cuy/dotNet/Behaviors/README.md`, `src/Cuy/dotNet/Behaviors/SampleBehavior.cs` (inactive by default);
`src/Cuy/dotNet/BrainController.cs` (three small hook calls only), `src/Cuy/dotNet/SelfTest.cs`.

## Specification
1. `IDesktopBehavior`: `string Id`, `void Start(BehaviorContext ctx)`, `void Tick(TimeSpan dt)` (UI thread, ~every 100 ms,
   must return fast), `void Stop()`. `BehaviorContext` exposes: `Pet` (Core), `FormPet ActivePet`, `BrainController Brain`,
   `Action<string> Log`, `bool IsHomeOpen`, `Func<string, bool> RequestAnimation` (wrapper that refuses while a script
   such as `FirstRunIntro` holds the pig), `IsBusy` (script, drag, toss, sulk). A behaviour must call
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

When done, open a pull request against `main` titled `F4-09: Desktop behaviour plug-ins`.
