# PK-22b: World economy invariants test (data level, no simulator port)
Zmieniaj: tests/Cuy.Core.Tests/WorldInvariantsTests.cs, docs/opt/log/PK-22b.md
Wymagane: tests/Cuy.Core.Tests/WorldInvariantsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true && node tools/qa/economy-sim.js --runs 12 --variant baseline --sweep --check
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W22-02
Goal: World economy invariants test (data level, no simulator port).
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-22b.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W22-02: Port the economy simulator and enforce the world invariants
Files of this item: tests/Cuy.Core.Tests/WorldInvariantsTests.cs
Goal: The C# simulator and a test enforce the same thresholds as `tools/qa/economy-sim.js`.
Depends on: W21 merged.
Facts: Read `tools/qa/economy-sim.js` (the reference model) and docs/WORLD.md sections 6.3 and 6.4. The test builds a `Pet` with the real data and runs a compact version of the model: five profiles for 365 days with a seeded `Random` and a `ManualClock`, using the real `FarmEngine`, `MarketPricing`, `PlaceUnlock`. Thresholds (same as `--check`): regular does not own half of the content before day 150, casual before 200, heavy before 90; nobody owns all content within a year; farm benefit share <= 30 percent (regular), 35 (casual), 20 (heavy); the perfect player <= 25 percent; sales never above the cap. Keep the check tolerant (+-10 percent) because the C# model differs in detail; document differences in the report. Append a section 'World economy' to `docs/economy-report.md` with the tables; keep older sections unchanged.
Steps:
1. Add `--world` to the simulator printing the milestone table; add the test with the thresholds above; append the report section.
Package override (wins over anything above): REDUCED SCOPE: do not port the simulator and do not edit `tools/Cuy.Simulator/Program.cs` or `docs/economy-report.md`. The test reads the real data and the real `FarmEngine`, `MarketPricing`, `PlaceUnlock`, `Comfort` and enforces the data-level invariants of `docs/WORLD.md` section 6.4 (items 2, 3, 5, 6 and 10: sell price below shop price including the wiggle, profit per cycle 1-20, forbidden crops absent, seed prices equal the catalog, one harvest per plot after a 400-day clock jump, comfort cap 100 and mood reduction at most 15 percent, demand meter formula, sales never above the daily cap). The 365-day thresholds are covered by the Node simulator in the verification command.
