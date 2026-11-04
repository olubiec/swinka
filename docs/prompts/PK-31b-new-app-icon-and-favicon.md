# PK-31b: New app icon and favicon
Zmieniaj: src/Cuy/Cuy.csproj, src/Cuy/cuy.ico, src/Cuy/dotNet/ProcessIcon.cs, web/home/index.html, docs/opt/log/PK-31b.md
Wymagane: src/Cuy/Cuy.csproj
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W31-02
Goal: New app icon and favicon.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-31b.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W31-02: G15: new app icon and favicon
Files of this item: src/Cuy/Cuy.csproj, src/Cuy/cuy.ico, src/Cuy/dotNet/ProcessIcon.cs, web/home/index.html
Goal: The exe, the tray icon, the Home window and the Home page use the new icon from `assets/app-icon/`.
Depends on: none.
Facts: New files exist: `assets/app-icon/{icon_16,icon_32,icon_256,cuy.ico,logo_256}.png` (whole pig in a frame). Today the app icon is `src/Cuy/cuy.ico` (referenced by `src/Cuy/Cuy.csproj`) and the tray icon is created in `src/Cuy/dotNet/ProcessIcon.cs`. The Home page is `web/home/index.html` (assets are served at `https://cuy.assets/` in the app and by relative path `../../assets/` in the browser mock). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Replace `src/Cuy/cuy.ico` with a byte copy of `assets/app-icon/cuy.ico` (use a shell copy, do not rewrite binaries by hand).
2. In `ProcessIcon.cs` make sure the tray icon comes from the same icon (embedded resource or `cuy.ico`), without changing menu logic.
3. In `web/home/index.html` add `<link rel="icon" type="image/png" sizes="32x32" href="../../assets/app-icon/icon_32.png">` and a 16 px link; keep the existing structure.
4. Build once with the verification command.
