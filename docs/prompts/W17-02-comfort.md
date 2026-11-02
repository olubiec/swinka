# W17-02: Comfort: capped sum and mood-decay factor
Zmieniaj: src/Cuy.Core/World/Comfort.cs, tests/Cuy.Core.Tests/ComfortTests.cs
Wymagane: src/Cuy.Core/World/Comfort.cs, tests/Cuy.Core.Tests/ComfortTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: A pure function turns placed items into a comfort score and a mood decay factor.
Depends on: W16 merged.
Facts: Design: docs/WORLD.md section 2.3. Score = sum of `comfort` of every placed item in all rooms/places, capped at `ComfortCap` (100). Factor = `1 - MoodDecayReductionAtCap * score / cap` (1.0 at score 0, 0.85 at the cap). Comfort never changes clovers, age or health. Also a per-place score for the garden walk requirement (`min_comfort_garden`). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `public static class Comfort`: `static int Score(WorldState world, WorldItemCatalog items, string placeIdOrNull)`, `static int Capped(int score, PlaceCatalog places)`, `static double MoodDecayFactor(int cappedScore, PlaceCatalog places)`.
2. Tests: empty world is 0 and factor 1.0; two sofas (comfort 6 each) give 12; a world above the cap is capped at 100 and the factor is exactly 0.85; unknown item ids contribute 0; per-place score counts only that place; the factor is monotonic non-increasing.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
