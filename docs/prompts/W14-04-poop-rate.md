# W14-04: PoopManager: droppings interval scaled by poop_rate
Zmieniaj: src/Cuy/dotNet/PoopManager.cs
Wymagane: src/Cuy/dotNet/PoopManager.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: How often a pig leaves a dropping follows the active pigs' poop_rate.
Depends on: W13 merged.
Facts: Interval today: `_random.Next(40, 91)` game minutes at lines ~42 and ~94. New interval = that value divided by `Pet.ActiveModifiers.PoopRate` (neutral when the feature is off), never below 10 minutes. The 8-droppings-at-once limit stays. Read the modifier each time a new interval is drawn. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Introduce one private helper `NextInterval()` used at both places and apply the division there.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
