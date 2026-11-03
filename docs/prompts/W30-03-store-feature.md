# W30-03: StoreFeature: state and the purchase message
Zmieniaj: src/Cuy/dotNet/Features/StoreFeature.cs
Wymagane: src/Cuy/dotNet/Features/StoreFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can read the home store and buy from it.
Depends on: W29 merged. Sub-wave W30b: start only after W30-01, W30-02 are merged (this task uses their code).
Facts: State key `store`: `{ clovers, rows: [ { kind, id, name, category, place, price, owned, placed, locked, lockedReason, icon } ], categories: [ { id, name, count } ] }` from `HomeStore.Rows`. Message `store_buy { kind, id, count }` calls `Pet.Purchase`; toasts: 'Not enough clovers', 'Not available yet', 'Bought!'. Rows are large (about 150): publish them only when the page asked (`store_open {}` message sets a flag for 5 minutes) and on changes. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement with the planned names.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
