# W3-09: Away mode in Core and a fullscreen detector in the desktop app
> NIEAKTYWNE: odłożone z W3 (Pet.cs (zmiana z W3-03) — konflikt zakresu). Przed startem przepisz na format pętli i nową falę (W4-xx), patrz docs/JULES_LOOP.md.
Goal: Core can be told "the player is away" (the pig slows down and makes no mess); the desktop project has a compiling fullscreen detector ready to be hooked up later.
Depends on: W2-04 (`Pet.ApplyTime` hay hook, merged) so the `ApplyTime` hunk is already settled. Facts: `research/gotowce/src/Cuy/dotNet/Platform/FullscreenDetector.cs` is a ready-made draft (not compiled). The offline-rate decay already exists in `Pet.ApplyTime(..., offline)`; `TryAddPoop` exists.
Change: new `src/Cuy/dotNet/Platform/FullscreenDetector.cs`, new `src/Cuy.Core/Pet.Away.cs`, `src/Cuy.Core/Pet.cs` (only the two places named in step 3), new `tests/Cuy.Core.Tests/AwayTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `BrainController.cs`, `SoundManager.cs`, `Cuy.csproj` (SDK-style: new files are included automatically).
Steps:
1. Copy the draft to `src/Cuy/dotNet/Platform/FullscreenDetector.cs`; fix it so `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes (namespace `Cuy`, P/Invoke declarations inside the class, no unused usings). Public API: `static bool IsFullscreenAppRunning()` that never throws (returns false on any error) and ignores the desktop shell, the Cuy windows and the taskbar. Nothing calls it yet.
2. `Pet.Away.cs`: `public bool IsAway { get; private set; }` and `public void SetAway(bool away)`; not saved. `SetAway(false)` after a long away does not apply any catch-up.
3. `Pet.cs`, two one-line hunks only: in `ApplyTime` use `offline || IsAway` where the offline rate is chosen; in `TryAddPoop` return false first when `IsAway`.
4. Tests: while away, hunger and mood fall at the offline rate (compare with an offline step of the same length); no poop appears during 24 simulated hours away; after `SetAway(false)` pooping works again; away is not saved (save, load, `IsAway` false).
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` and `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` pass.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": none needed yet (detector is not hooked up).
