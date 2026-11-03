# W26-04: DormFeature: state and messages
Zmieniaj: src/Cuy/dotNet/Features/DormFeature.cs
Wymagane: src/Cuy/dotNet/Features/DormFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can read the shared bedroom and run unlock, upgrade, move in and move out.
Depends on: W25 merged. Sub-wave W26c: start only after W26-02 is merged (this task uses their code).
Facts: Pattern as W19-01 (`PlacesFeature`). State key `dorm`: `{ unlocked, unlockCost, requiresPigs, level, maxLevel, nextLevelCost, cols, rows, maxResidents, residents: [pigId], candidates: [ { pigId, name, portrait, memorial, resident } ], bondBonus }`. Messages: `dorm_unlock {}`, `dorm_upgrade {}`, `dorm_move_in { pigIds: [..] }`, `dorm_move_out { pigId }`. The dorm layout itself is published by `RoomsFeature` under `layouts.dorm` (planned: W26-07 wires the page; if `RoomsFeature` does not publish it yet, publish `layouts.dorm` here under `dorm.layout` with the same shape and say so in the PR). Toasts: 'Not enough clovers', 'You need two pigs first', 'Not everything fit - the rest is in storage' (when items were stored), 'Welcome home'. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the feature class with the planned `Pet.*` names; unknown ids ignored.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
