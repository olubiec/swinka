# PK-P32a: Bridge: scene order and pig location messages to the page (wave P32)
Zmieniaj: src/Cuy.Core/Pigs/SceneOrder.cs, tests/Cuy.Core.Tests/SceneOrderTests.cs, src/Cuy/dotNet/Features/PlacesFeature.cs, docs/contracts/places-pig-location.md, docs/opt/log/PK-P32a.md
Wymagane: tests/Cuy.Core.Tests/SceneOrderTests.cs
Weryfikacja: dotnet build src/Cuy.Core/Cuy.Core.csproj -c Release && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~SceneOrder|FullyQualifiedName~PigLocation" && node --check tools/qa/lib/ux.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Make the page know the ring of scenes and where each pig is, and let it send a move and a pin. Thin C# glue over the Core of PK-P31b.
Depends on: PK-P31b merged (API names in docs/opt/log/PK-P31b.md).

## Steps
1. grep `PlacesFeature.cs` for how the places state is built and how commands are handled; grep Core for the rooms list (own rooms of pigs, dorm) and the unlock state of garden/park/farm/market. Read only those ranges.
2. Core, tests FIRST (`SceneOrderTests.cs`): `SceneOrder.Build(rooms, unlocked)` returns the ring: `salon`, then pig rooms in the existing room order, then `dorm` only if unlocked, then `garden`, `park`, `farm`, `market`. Locked places stay IN the list with `Locked=true` (the page shows a locked scene), only the roamer skips them.
   - O1 new game: `[salon, garden, park, farm, market]` with garden/park/farm/market locked as the game says.
   - O2 two pig rooms and dorm unlocked: order and ids correct.
   - O3 unlocking a place flips only that flag.
   - O4 ring: next of `market` is `salon`, previous of `salon` is `market`.
3. `PlacesFeature.cs`: the state message gains `places.order` [{id, title, locked, unlockHint}] and `places.pigLocations` [{pigId, scene, pinned}]; commands `places.pigMove {pigId, to}` (validated through Core: `to` is a neighbour in the ring and unlocked, else rejected with the usual error shape and no state change) and `places.pigPin {pigId, pinned}`. The roamer tick runs on the existing game tick (grep how other features tick); a move produces a state update.
4. `docs/contracts/places-pig-location.md` (max 40 lines): the exact message and field names and an example of each, so the page and mocks use the same shape.
5. Run the Weryfikacja line; fix until green. Do NOT touch web/ files (PK-P32b mirrors the contract in the browser mock).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P32a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
