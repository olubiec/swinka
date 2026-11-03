# W22-07: World and portrait assets contract tests

Zmieniaj: tests/Cuy.Core.Tests/WorldAssetsTests.cs
Nie ruszaj: src/**, assets/**, web/**, AGENTS.md, docs/*, tasks/*
Wymagane: tests/Cuy.Core.Tests/WorldAssetsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter WorldAssetsTests
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Goal: Automated contract tests in xUnit verify that all world art, tiles, crops, portraits, and icons referenced by game data exist on disk with correct dimensions.
Depends on: W22-05 merged.
Facts: Contract tests protect the game assets from missing files or wrong sprite bounds. In `tests/Cuy.Core.Tests/WorldAssetsTests.cs`, implement tests that find repo files by walking up from `AppContext.BaseDirectory` to the repository root with `Cuy.sln` (using the existing `RepoFile` helper in tests).
Implement the 5 contract assertions:
1. Every `id` in `assets/data/named_pigs.json` (or `assets/data/pigs_named.json`) has `assets/sprites/portraits/<id>_32.png` (or `<id>.png`) with PNG dimensions verified from the PNG IHDR header (bytes 16..23 contain width and height as big-endian 32-bit integers).
2. Every `id` in `assets/data/world_items.json` exists in `sprites` (or `items`) of `assets/world/atlas.json`, has `w == tileW * 16` and `h == tileH * 16`, and fits inside the bounds of `atlas.png`.
3. Every crop `id` in `assets/data/farm.json` exists in `crops` (or `frames["crop_" + id]`) of `assets/world/farm/farm.json` with 4 frames of `32x32` inside `farm.png`, and every crop `item` exists in `assets/icons/icons.json`.
4. Every `floor_wood`, `floor_straw`, `floor_fleece`, `floor_grass`, `floor_soil`, `floor_stone` exists in `tiles` of `assets/world/tiles.json` with `16x16` frames inside `tiles.png`.
5. Every `icon` referenced by `world_items.json` or `places.json` exists in `assets/icons/icons.json`.
Test rules: do NOT modify production code or asset files. Keep tests deterministic, self-contained, and fast.
Steps:
1. Create `tests/Cuy.Core.Tests/WorldAssetsTests.cs` implementing the 5 contract assertions described above.
2. Verify with `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter WorldAssetsTests`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
