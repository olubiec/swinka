# W22-05: SelfTest: world data files
Zmieniaj: src/Cuy/dotNet/SelfTest.cs
Wymagane: src/Cuy/dotNet/SelfTest.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The desktop self-test parses and cross-checks the world data.
Depends on: W21 merged.
Facts: Add `Check` entries (neighbours show the style): `farm.json`, `market.json`, `places.json`, `world_items.json`, `items_farm.json` parse (`ParseData`); every crop `item` and `seed_item` exists in the item catalog; every placeable `icon` is non-empty; the list `files` at line ~304 (`items.json`, `items_shop.json`, `items_decor.json`) includes `items_farm.json`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the checks and the file in the list; nothing else.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
