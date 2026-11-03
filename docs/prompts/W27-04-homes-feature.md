# W27-04: HomesFeature: where the pigs are
Zmieniaj: src/Cuy/dotNet/Features/HomesFeature.cs
Wymagane: src/Cuy/dotNet/Features/HomesFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can read the pigs' locations and set their home mode.
Depends on: W26 merged.
Facts: Pattern as `PlacesFeature` (W19-01). State key `homes`: `{ pigs: [ { pigId, name, mode, room, location, activity, memorial, portrait } ], rooms: [ { id, name } ] }` where `rooms` lists the rooms a pig can be tied to. Tick: re-publish the state at most every 20 seconds while the Home page is open (the schedule changes by slot). Message `pig_home { pigId, mode, room }` calls `Pet.SetHome`; refusals become toasts ('That room is not available'). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement with the planned `Pet.*` names; ignore unknown ids.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
