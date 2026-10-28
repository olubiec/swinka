Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>".

# W2-05: Behavior host that finds and runs plug-ins
Goal: every class implementing `IDesktopBehavior` is found, started and ticked safely.
Depends on: W1-08 (`IDesktopBehavior`, `BehaviorContext`) merged.
Change: new `src/Cuy/dotNet/Behaviors/BehaviorHost.cs`, new `src/Cuy/dotNet/Behaviors/SampleBehavior.cs`, new `src/Cuy/dotNet/Behaviors/README.md`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `LocalData.cs` (W2-09 owns it in this wave; the setting for disabled behaviors is added by W3-02), `BrainController.cs`.
Steps:
1. `BehaviorHost` (namespace `Cuy.Behaviors`) finds all non-abstract classes implementing `IDesktopBehavior` in the executing assembly by reflection (same pattern as `HomeFeatures.LoadAll`), creates them with the default constructor and offers `void Start(BehaviorContext ctx)`, `void Tick(TimeSpan dt)` and `void Stop()` for all of them. Try/catch per behavior; a behavior that throws 5 times is disabled for the rest of the run and logged `[Behavior] <id> disabled`. Log every start and stop as `[Behavior] <id> started` / `stopped`.
2. Disabled ids: `public HashSet<string> DisabledIds { get; }` on the host (case-insensitive), consulted before `Start`; a disabled id is never started. The host does not read any setting itself.
3. `SampleBehavior` (id `sample`) logs `[Behavior] sample started` once in `Start` and does nothing else. It is never started by default: the host's constructor puts `sample` into `DisabledIds`, and the README says how to enable it (`DisabledIds.Remove("sample")`).
4. `README.md` (10 lines): how to add a behavior (one class, one file, `Id`, keep `Tick` fast, use `ctx.RequestAnimation`, never block).
5. Do not hook the host into `BrainController` (W3-02 does).
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
