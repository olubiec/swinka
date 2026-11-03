# W28-01: RunCheck: is the run fenced and how many pigs fit
Zmieniaj: src/Cuy.Core/World/RunCheck.cs, tests/Cuy.Core.Tests/RunCheckTests.cs
Wymagane: src/Cuy.Core/World/RunCheck.cs, tests/Cuy.Core.Tests/RunCheckTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A pure function finds the fenced area of the garden and tells how many pigs it holds.
Depends on: W27 merged.
Facts: Design: docs/PIG_ROOMS.md section 8. Input: the garden `RoomLayout`, its grid size, the item catalog and `HomeEconomyConfig.Run` (`blockers`, `gate_item`, `min_cells`, `cells_per_pig`). A cell is blocked when a placed item whose id is in `blockers` covers it. Flood fill (4-neighbour) from every free cell; the outside is everything that touches the grid edge, so a region counts as fenced only when it never reaches the grid edge. The best region is the largest fenced region with at least `min_cells`; it must have a gate: at least one `gate_item` placed on its border (touching one of its cells by a side). Capacity = floor(cells / cells_per_pig), at least 1 when the region qualifies. Pure, no clock. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `public static class RunCheck`: `RunInfo Analyze(RoomLayout garden, int cols, int rows, WorldItemCatalog items, HomeEconomyConfig cfg)` with `RunInfo { bool Valid; int Cells; int Capacity; bool HasGate; string Reason; IReadOnlyList<(int x,int y)> CellList }`, reasons: `ok`, `no_fence`, `too_small`, `no_gate`, `open_edge`.
2. Tests: an empty garden is `no_fence`; a 5x4 ring of `fence_wood` with a gate is valid with 12 cells and capacity 2; the same ring without a gate is `no_gate`; a ring with a one-cell gap is `no_fence`/open; a ring touching the grid edge is valid only if the edge is also closed by the ring itself (decide, document); a 3x3 ring is `too_small`; two rings pick the larger; a hedge counts as a blocker; deterministic output order.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
