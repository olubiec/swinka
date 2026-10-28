# W4-01: Away mode in Core and a compiling fullscreen detector
Zmieniaj: src/Cuy/dotNet/Platform/FullscreenDetector.cs, src/Cuy.Core/Pet.Away.cs, src/Cuy.Core/Pet.cs, tests/Cuy.Core.Tests/AwayTests.cs
Wymagane: src/Cuy/dotNet/Platform/FullscreenDetector.cs, src/Cuy.Core/Pet.Away.cs, tests/Cuy.Core.Tests/AwayTests.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true; dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Nie ruszaj: src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/SoundManager.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: Core can be told "the player is away" (the pig slows down and makes no mess); the desktop project has a compiling fullscreen detector that later tasks hook up.
Depends on: W2-04 (`Pet.ApplyTime` hay hook) merged; W3-03 added one call in `Pet.Update` (leave it alone).
Facts: `research/gotowce/src/Cuy/dotNet/Platform/FullscreenDetector.cs` is a ready-made draft that was never compiled. The offline-rate decay exists in `Pet.ApplyTime(..., offline)`; `TryAddPoop` exists. Logic of the draft (Chromium `fullscreen_win.cc`): shell state D3D full screen or presentation mode, plus a foreground window that covers its whole monitor. `QUNS_BUSY` is NOT used to decide. The desktop (`Progman`, `WorkerW` with `SHELLDLL_DefView`), the taskbar and Cuy's own windows never count.
Steps:
1. Copy the draft to `src/Cuy/dotNet/Platform/FullscreenDetector.cs` and fix it until `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes (no unused usings; the namespace `Cuy.Platform` of the draft may stay). Keep the public API: `FullscreenDetector.Check()` returning `Result { IsFullscreen, ShellBusy, MonitorBounds, Reason }` with `Covers(Point)`; add `static bool IsFullscreenAppRunning()` that returns `Check().IsFullscreen` and never throws. Nothing calls it yet (W5 does).
2. `Pet.Away.cs`: `public bool IsAway { get; private set; }` and `public void SetAway(bool away)`; not saved. `SetAway(false)` does not apply any catch-up.
3. `Pet.cs`, two one-line hunks only: in `ApplyTime` use `offline || IsAway` where the offline rate is chosen; in `TryAddPoop` return false first when `IsAway`.
4. Tests in `AwayTests.cs`: while away, hunger and mood fall at the offline rate (compare with an offline step of the same length); no poop appears during 24 simulated hours away; after `SetAway(false)` pooping works again; `IsAway` is false after save and load.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": none yet (the detector is not hooked up)..
