# W29-05: PropsFeature: state and messages for desktop props
Zmieniaj: src/Cuy/dotNet/Features/PropsFeature.cs
Wymagane: src/Cuy/dotNet/Features/PropsFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can read the props and move them between the desktop and the rooms.
Depends on: W28 merged. Sub-wave W29d: start only after W29-04 is merged (this task uses their code).
Facts: State key `props`: `{ max, desktop: [ { uid, itemId, name, icon, x, y } ], inRooms: [ { roomId, uid, itemId, name } ], free: [ { itemId, name, count } ] }`. Messages: `prop_to_desktop { itemId, x, y }`, `prop_move { uid, x, y }`, `prop_to_room { uid, room, x, y }` (x,y = -1 means first free cell), `prop_from_room { room, uid, x, y }`. Toasts: 'The desktop is full', 'Something is in the way', 'Put back on your desktop'. After a change post the new state so the desktop overlay (W29-07) updates. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement with the planned `Pet.*` names.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
