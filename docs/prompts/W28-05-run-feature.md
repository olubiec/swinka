# W28-05: RunFeature: state and messages for the garden run
Zmieniaj: src/Cuy/dotNet/Features/RunFeature.cs
Wymagane: src/Cuy/dotNet/Features/RunFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can read the run and let pigs out and in.
Depends on: W27 merged. Sub-wave W28c: start only after W28-04 is merged (this task uses their code).
Facts: Pattern as `PlacesFeature`. State key `run`: `{ available, valid, reason, cells: [[x,y]..], capacity, out: [ { pigId, since, hoursToday } ], candidates: [ { pigId, name, portrait, out, memorial } ], verdict: { ok, message } }`. Messages `run_out { pigId }`, `run_in { pigId }`. Toasts from `RunRules.Message` and 'Needs a fence with a gate' / 'The run is full'. Tick: refresh at most every 30 seconds while the page is open. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement with the planned `Pet.*` names.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
