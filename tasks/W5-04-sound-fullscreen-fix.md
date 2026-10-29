# W5-04: SoundManager uses the real fullscreen detector
Zmieniaj: src/Cuy/dotNet/SoundManager.cs
Wymagane: src/Cuy/dotNet/SoundManager.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/dotNet/Platform/FullscreenDetector.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: Sounds are muted for a real fullscreen game, film or presentation, and a click on the desktop no longer counts as fullscreen.
Depends on: W4-01 (`FullscreenDetector.Check()`) merged.
Facts: `SoundManager.IsFullScreenOrBusy()` (cached for 1.5 s) uses `SHQueryUserNotificationState` and treats `QUNS_BUSY` and a click on the desktop (`Progman`/`WorkerW`) as fullscreen. That is the known bug.
Steps:
1. Replace the body of `IsFullScreenOrBusy()` with `FullscreenDetector.Check().IsFullscreen`, keeping the existing cache (`FullScreenCacheTtlMs`) and the public name. Remove the now-unused P/Invoke declarations and enum values from `SoundManager.cs`.
2. Log each change of the result once: `[Sound] fullscreen=<bool> (<Reason>)`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
