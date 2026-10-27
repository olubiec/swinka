# W2-05: Behavior host that finds and runs plug-ins
Goal: every class implementing `IDesktopBehavior` is found, started and ticked safely.
Depends on: W1-08 (contract) merged.
Change: new `src/Cuy/dotNet/Behaviors/BehaviorHost.cs`, new `src/Cuy/dotNet/Behaviors/SampleBehavior.cs`, new `src/Cuy/dotNet/Behaviors/README.md`, `src/Cuy/dotNet/LocalData.cs` (setting `DisabledBehaviors`)
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. `BehaviorHost` finds all non-abstract classes implementing `IDesktopBehavior` in the executing assembly by reflection (same pattern as `HomeFeatures`), creates them with the default constructor, offers `Start(BehaviorContext)`, `Tick(TimeSpan)` and `Stop()` for all. Try/catch per behaviour; a behaviour that throws 5 times is disabled and logged `[Behavior] <id> disabled`.
2. `LocalData` setting `DisabledBehaviors` (comma list of ids); disabled ids are never started.
3. `SampleBehavior` (id `sample`, disabled by default through the setting default) logs `[Behavior] sample started` once and does nothing else. The README explains in 10 lines how to add a behavior.
4. Do not hook the host into `BrainController` yet (W3-02 does).
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
