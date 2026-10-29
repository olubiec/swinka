# W6-04: Tricks on the desktop: state, message and tray menu
Zmieniaj: src/Cuy/dotNet/Features/TricksFeature.cs, src/Cuy/dotNet/ContextMenus.cs, src/Cuy.Core/Pet.Tricks.cs, tests/Cuy.Core.Tests/TricksTests.cs
Wymagane: src/Cuy/dotNet/Features/TricksFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true; dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/dotNet/HomeWindow.cs, src/Cuy/dotNet/BrainController.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The pig performs tricks on request from Home or the tray menu, with the right toast when it cannot.
Depends on: W3-08 (`Pet.TryPerformTrick`, `TrickResult`, `TricksConfig`) merged; `IHomeFeature` classes are found by reflection (`Features/README.md`).
Facts: Animations that exist: `spin`, `stand_up`, `popcorn`, `hurdle`. `HomeWindow.PostToPage(new { type = "toast", text })` is static. Contract (also used by the W5-08 mock and the W7-05 screen): state key `tricks: [ { id, title, unlocked, unlockLevel, readyIn } ]`, message `trick { id }`.
Steps:
1. Core: `Pet.Tricks.cs` gets `int TrickReadyInSeconds(string id)` (0 when ready; cooldown only, from the existing non-saved last-trick time) and a tiny test in `TricksTests.cs`. `unlockLevel` comes from the bond table (`BondUnlocks`, entry `trick_<id>`).
2. `TricksFeature` (`HomeFeatureBase`, `Id = "tricks"`): `AddState` writes the list above from `Pet.GetTricks()`; `HandleMessage("trick")` calls `Pet.TryPerformTrick(id)`: Ok -> `brain.RequestAnimation(<id>)`; Tired -> toast "Too tired for tricks"; Locked -> "Not unlocked yet"; Cooldown -> "Give me a moment"; Sleeping -> "Shh, sleeping". Return true so the state is pushed.
3. `ContextMenus.cs`: a "Tricks" submenu in the tray menu listing the unlocked tricks (disabled entries for locked ones with their level), calling the same code path. Log `[Trick] <id> <result>`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": with bond level 5+ the spin works from the tray and from Home..
