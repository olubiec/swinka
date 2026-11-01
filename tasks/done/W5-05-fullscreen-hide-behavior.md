# W5-05: The pig leaves quietly during games, films and presentations
Zmieniaj: src/Cuy/dotNet/Behaviors/FullscreenHideBehavior.cs, src/Cuy/dotNet/PoopManager.cs, src/Cuy/dotNet/FoodManager.cs
Wymagane: src/Cuy/dotNet/Behaviors/FullscreenHideBehavior.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/dotNet/FormPet.cs, src/Cuy/dotNet/StatusBubble.cs, src/Cuy/dotNet/BrainController.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: When a fullscreen app covers the pig's monitor, the pig walks to the nearest edge and leaves; when it ends, the pig peeks back in.
Depends on: W4-01 (`FullscreenDetector`, `Pet.SetAway/IsAway`) merged; W2-05 (`BehaviorHost` finds behaviors by reflection, contract `IDesktopBehavior`) merged.
Facts: `research/gotowce/src/Cuy/dotNet/Behaviors/FullscreenHideBehavior.cs` is a draft that was never compiled; it expects `Pet.SetAway`, `PoopManager/FoodManager.HideAll/ShowAll` and `FormPet.HideStatusBubble` (the last one exists). `EdgePeekScene` exists. Read `Behaviors/IDesktopBehavior.cs` and `SampleBehavior.cs` first.
Steps:
1. Copy the draft to `src/Cuy/dotNet/Behaviors/FullscreenHideBehavior.cs` and fix it until it builds as an `IDesktopBehavior` (no registration code: `BehaviorHost` finds it).
2. Check `FullscreenDetector.Check()` every 3 s; leave after 2 positive checks, come back after 2 negative ones; hide only when `Covers(pig position)` (a game on another monitor does not hide the pig). Never during `FirstRunIntro`, a drag or a toss. Hide: the pig walks calmly to the nearest edge and leaves (reuse `EdgePeekScene`), then the pet form, poop forms, food forms and the status bubble are hidden and `Pet.SetAway(true)`. Show: `SetAway(false)`, all return and the pig peeks in from the edge.
3. `PoopManager` and `FoodManager`: add `HideAll()` and `ShowAll()` (hide or show every form they own; no data change). Log every change as `[Away] ... <Result.Reason>`; no care reminders while away.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": TESTY_RECZNE.md FS-01..FS-10 (borderless game, browser F11, PowerPoint, second monitor)..
