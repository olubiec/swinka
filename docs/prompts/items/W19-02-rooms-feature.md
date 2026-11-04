# W19-02: RoomsFeature: layouts, owned items and comfort
Zmieniaj: src/Cuy/dotNet/Features/RoomsFeature.cs
Wymagane: src/Cuy/dotNet/Features/RoomsFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can read and edit the layout of every place and room.
Depends on: W18 merged.
Facts: Pattern: `PigsFeature.cs` / `ShopFeature.cs` (class derives `HomeFeatureBase`, `Id`, `AddState`, `HandleMessage`, `Tick`; features are found by reflection; the page gets state via `AddState` and toasts via `HomeWindow.PostToPage`). JS never computes prices, times or rewards: publish ready numbers. Core API names are from W18 (`Pet.*`); if a name differs use the real one and list it. Contract text is written in W19-05. Property names in the state are camelCase. Rejected placements return a toast with the reason ('Something is in the way', 'Too close to the wall'). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. State key `rooms`: `{ layouts: { <placeOrRoomId>: { cols, rows, wallRows, wallpaper, floor, items: [ { uid, itemId, x, y, flip } ] } }, catalog: [ { id, name, places, w, h, price, comfort, layer, icon, owned, placed, repeatable, free } ], comfort: { score, cap, moodFactor }, skins: { wallpapers: [..], floors: [..] } }`
2. Messages: `room_buy { itemId }`, `room_place { place, itemId, x, y, flip }`, `room_move { place, uid, x, y }`, `room_flip { place, uid, flip }`, `room_remove { place, uid }`, `room_skin { room, slot, itemId }` (wallpaper/floor).
3. Unknown ids and indices are ignored; every result maps to a short English toast ('Not enough clovers', 'Not ready yet', ...); after each message post fresh state. Returns true for handled messages only.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
