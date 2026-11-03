# W30-07: Data checks and SelfTest for the home extras
Zmieniaj: tools/qa/data-check.js, src/Cuy/dotNet/SelfTest.cs
Wymagane: tools/qa/data-check.js, src/Cuy/dotNet/SelfTest.cs
Weryfikacja: node tools/qa/data-check.js && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The data check and the desktop self-test cover the new data files.
Depends on: W29 merged.
Facts: `data-check.js` already checks `pig_rooms.json` and `home_economy.json` (read the sections). Add: every theme `wall_tile`/`floor_tile` that exists in `assets/world/tiles.json` has a file; every placeable with `prop_of` has an atlas entry or is listed in a `missing_art` array printed as a warning (not an error); the sum of all prices is printed. `SelfTest.cs`: add `Check` entries (W22-05 style) for `pig_rooms.json`, `home_economy.json` parse, every theme skin exists in `items_decor.json`, every theme starter/signature exists in `world_items.json`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement both; keep the existing checks unchanged.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
