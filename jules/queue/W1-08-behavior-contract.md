Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>".

# W1-08: Contract for desktop behavior plug-ins
Goal: one extension point so reactions of the pig (fullscreen, mouse, tricks) can be built in separate files.
Depends on: nothing (wave start). Read the two consumers first: `research/gotowce/src/Cuy/dotNet/Behaviors/DanceToMusicBehavior.cs` and `FullscreenHideBehavior.cs`; the interface must fit them.
Change: new `src/Cuy/dotNet/Behaviors/IDesktopBehavior.cs`, new `src/Cuy/dotNet/Behaviors/BehaviorContext.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. Namespace `Cuy.Behaviors`. `IDesktopBehavior`: `string Id { get; }`, `void Start(BehaviorContext ctx)`, `void Tick(TimeSpan dt)` (UI thread, about every 100 ms, must return fast), `void Stop()`.
2. `BehaviorContext` exposes exactly: `Cuy.Core.Pet Pet`, `FormPet ActivePet`, `BrainController Brain`, `Action<string> Log`, `bool IsBusy` (script, drag, toss, sulk), `bool IsHomeOpen`, `Func<string, bool> RequestAnimation` (returns false and does nothing while a script such as `FirstRunIntro` holds the pig). Plain properties with a constructor, no logic.
3. XML doc comment on each member saying who sets it (W2-05 `BehaviorHost` will).
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes (the two gotowce files are not copied here).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
