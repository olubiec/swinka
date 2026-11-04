# PK-22b log (W22-02, reduced scope, stage gate)
- Decisions: WorldInvariantsTests.cs did not exist; created it. Real data via *.LoadFromFile(RepoFile(...)) and ItemCatalog.LoadDefault(); no statics, fixed DateTime clock, FarmEngine/MarketPricing/Comfort used directly.
- Covered (WORLD.md 6.4): sell*(1+w) < shop*(1-w) (item 2), annual profit 1-20 (item 2), forbidden absent and seed prices = catalog (item 3), one harvest after 400-day jump for plot and orchard max_stock (item 5), comfort cap 100 and mood reduction <= 15% (item 6), demand formula, floor, recovery and floored sale total, daily cap (item 10).
- Differences: profit check applies to annuals only (perennials have no single cycle). PlaceUnlock not used (no override item needs it). Shop price taken from item catalog (crop item), not seed price.
- Not done: no docs/economy-report.md section, no simulator port (per override).
- Verification NOT run: dotnet is not installed in this environment and the download is blocked (curl 403 via proxy), so dotnet test and dotnet build could not run. C# compile is unverified.
- node tools/qa/economy-sim.js --runs 12 --variant baseline --sweep --check: CHECK OK.
- Data cross-check in Python: all crop shop/seed prices present and equal, all invariants hold.
