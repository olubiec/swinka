# W13-01: Brain: activity, joy and wheek multipliers
Zmieniaj: src/Cuy.Core/AI/Brain.cs, tests/Cuy.Core.Tests/BrainModifiersTests.cs
Wymagane: tests/Cuy.Core.Tests/BrainModifiersTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Pet.cs
Goal: The utility AI weighs walking/exploring, joyful actions and wheeking by the active pigs' multipliers.
Depends on: W12 merged (PigModifiers, Pet.ActiveModifiers).
Facts: `Brain` scores actions as `sum((1-need/100)^2 * effect) * random(0.8, 1.2) + base_weight` (see the comment near line 175, score at ~616). Action ids and categories are in `assets/data/actions.json` (find walking/exploring actions, the joyful ones popcorn, dance, zoomies, front_happy, and the wheek action). Wiring from Pet is done in W13-03; here `Brain` only exposes a provider. With no provider or with neutral modifiers the decisions for a fixed seed must be identical to today. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add `public Func<PigModifiers> ModifiersProvider { get; set; }` to `Brain` (null means neutral). In the scoring, multiply the final score of movement actions by `Activity`, of the joyful actions by `JoyWeight`, and the wheek action's score by `WheekRate`. Put the action-to-multiplier mapping in one small private method driven by ids/categories from the action definitions, not by hard-coded strings scattered in the code.
2. Tests (`BrainModifiersTests.cs`): with a fixed `Random` seed and no provider the decision sequence equals the sequence with a neutral provider; with `Activity = 1.5` more walking actions are chosen over 2000 decisions than with 0.6; with `JoyWeight = 1.5` joyful actions are chosen more often than with 1.0; `WheekRate = 1.5` raises wheek choices when a need is low; the provider is read on every decision (changing the returned value changes behaviour).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
