# W5-06: The pig is scared of a wildly shaken mouse
Zmieniaj: src/Cuy/dotNet/Behaviors/MouseFearBehavior.cs
Wymagane: src/Cuy/dotNet/Behaviors/MouseFearBehavior.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/dotNet/Platform/MouseShakeMonitor.cs, src/Cuy.Core/Input/MouseShakeDetector.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: Shaking the mouse next to the pig startles it; shaking again makes it flee to the screen edge and peek back later. Bond level softens this.
Depends on: W4-01 (`Pet.IsAway`), W1-06/W2-06 (`Pet.IsUnlocked("approach_cursor")`), W2-05 (`BehaviorHost`) merged. `MouseShakeMonitor.Shaken` and `MouseShakeDetector` (defaults: 6 reversals within 1 s, 900 px/s, within 300 px, debounce 2 s) already exist; do NOT create another detector or change the thresholds.
Facts: Animations that exist: `startle`, `freeze`, `flee`, `peek`, `front_look`, `sniff`. `SoundManager.PlayFear()` exists. `EdgePeekScene` exists. Read `Behaviors/IDesktopBehavior.cs` and `SampleBehavior.cs` first.
Steps:
1. `MouseFearBehavior` (new, an `IDesktopBehavior` found by reflection) subscribes to `MouseShakeMonitor.Shaken`. First shake near the pig: `startle` then `freeze` for 2 s, `SoundManager.PlayFear()`. A second shake within 10 s: `flee` to the nearest screen edge and leave through it (reuse `EdgePeekScene`), wait a random 5-20 s, `peek`, and return only if the cursor was calm for 5 s. The full flee happens at most once per 5 minutes.
2. Bond effects: if `Pet.IsUnlocked("approach_cursor")` the pig never flees; a shake gives startle and freeze with 50 % chance, and when the cursor rests within 300 px for 3 s and the pig is idle it walks to it (at most once per 5 minutes) and sniffs.
3. Never trigger while the pig is held, thrown, sulking, asleep, in Home, in a script (`FirstRunIntro`), or when `Pet.IsAway`. Log every trigger as `[Fear] ...`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": shake the mouse next to the pig twice (TESTY_RECZNE.md SHAKE-01)..
