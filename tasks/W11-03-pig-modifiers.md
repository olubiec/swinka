# W11-03: PigModifiers value type (average and clamp)
Zmieniaj: src/Cuy.Core/Pigs/PigModifiers.cs, tests/Cuy.Core.Tests/PigModifiersTests.cs
Wymagane: src/Cuy.Core/Pigs/PigModifiers.cs, tests/Cuy.Core.Tests/PigModifiersTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/pigs_named.json
Goal: One small immutable type holds the eight per-pig multipliers and can be averaged over the active pigs and clamped to the allowed range.
Depends on: nothing (wave start). `Pet.ActiveModifiers` (the consumer) is W12-02.
Facts: Keys and meanings: `docs/NAMED_PIGS.md` section 3 and `modifier_keys` in `assets/data/pigs_named.json`: appetite, poop_rate, activity, bond_gain, minigame_score, wheek_rate, startle, joy_weight. Neutral is 1.0 for all. Pure and deterministic; no file access.
Steps:
1. `public readonly struct PigModifiers` in `Cuy.Core.Pigs` with get-only `double` properties `Appetite`, `PoopRate`, `Activity`, `BondGain`, `MinigameScore`, `WheekRate`, `Startle`, `JoyWeight`; `static PigModifiers Neutral`.
2. `static PigModifiers FromDictionary(IReadOnlyDictionary<string,double> values)`: keys are the snake_case names above, a missing key is 1.0, unknown keys are ignored, a value that is NaN, infinite or <= 0 becomes 1.0. `static PigModifiers Average(IEnumerable<PigModifiers> items)`: arithmetic mean per property, empty or null gives `Neutral`. `PigModifiers Clamp(double min, double max)`. `static PigModifiers AverageClamped(IEnumerable<PigModifiers> items, double min, double max)`.
3. Tests (`PigModifiersTests.cs`): `Neutral` is all 1.0; `FromDictionary` with only `appetite = 1.3` leaves the rest at 1.0; unknown key ignored; 0, -1, NaN and infinity become 1.0; average of Ned (appetite 1.3) and Glen (appetite 0.7) is 1.0; average of one item equals the item; empty list and null give `Neutral`; `Clamp(0.5, 1.5)` limits 2.0 to 1.5 and 0.2 to 0.5 and leaves 1.0; `AverageClamped` of two values 1.5 and 1.5 stays 1.5.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
