# W3-02: Connect the behavior host to the desktop loop
Zmieniaj: src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/LocalData.cs, src/Cuy/dotNet/SelfTest.cs, src/Cuy/dotNet/Behaviors/BehaviorContext.cs
Wymagane: src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/SelfTest.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true; dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/dotNet/Behaviors/BehaviorHost.cs (jeśli wymaga zmiany: wypisz to w PR i zatrzymaj się), AGENTS.md, docs/PLAN.md, tasks/*
Goal: behaviors found by `BehaviorHost` start with the app, tick with it and stop with it, and a setting can switch single behaviors off.
Depends on: W2-05 (`BehaviorHost`, `SampleBehavior`) merged; W1-08 contract (`BehaviorContext`) on main. Read `BrainController.cs` (`Update`, where `HomeFeatures.TickAll` is called, `Close`), `Program.cs` (start order) and `LocalData.cs` first.
Steps:
1. `LocalData`: a tolerant setting `DisabledBehaviors` (comma-separated ids, default empty; a missing key must not throw: `AppSettings[...]` returns null for unknown keys; add the key to `app.config` / `Settings.settings` only if storing needs it and list the files in the PR). Accessors `GetDisabledBehaviors()` / `SetDisabledBehaviors(IEnumerable<string>)`.
2. `BrainController`: own one `BehaviorHost`; after the session and the desktop pig exist, add the ids from `GetDisabledBehaviors()` to `host.DisabledIds` and call `Start(context)`; call `Tick(realElapsed)` from the existing update loop (real time, not game time, and only when `realElapsed > 0`); call `Stop()` from `Close()`. The context is refreshed before each tick (`ActivePet = FormPet.ActivePet`, `IsBusy` = a script runs, the pig is dragged, tossed or sulking, `IsHomeOpen = HomeWindow.IsOpen`) and `RequestAnimation` returns false while a script such as `FirstRunIntro` holds the pig.
3. Everything inside a behavior is already try/catch-ed by the host; the call sites in `BrainController` must also be safe (a failing host never stops the loop; log `[Behavior] host error: ...` at most once per 60 s).
4. `SelfTest.cs`: add a check `behaviors`: create a host, `DisabledIds` contains `sample`, remove it, `Start` with a context whose pet is null-safe (or a minimal fake), `Tick` once, `Stop`; no exception, and the log shows `[Behavior] sample started`.
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` and `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` pass.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": `Cuy.exe --selftest` prints the new `behaviors` check as OK, and in the normal run `cuy.log` has no `[Behavior]` error lines (the sample behavior stays disabled).
