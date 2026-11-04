# PK-32b: Apply UI assets in the main menu, pig lighting and contact shadow
Zmieniaj: web/home/app.js, web/home/canvas-pig.js
Wymagane: web/home/app.js, web/home/canvas-pig.js
Weryfikacja: node --check web/home/app.js && node --check web/home/canvas-pig.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W32-05, W32-06
Goal: Apply UI assets in the main menu, pig lighting and contact shadow.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W32-05: G11: apply UI assets, main menu background, removed ids
Files of this item: web/home/app.js
Goal: The Home page uses the 9-slice UI assets and the new menu background, and nothing refers to ids that were removed.
Depends on: W31 merged (`lib/ui-assets.js`, `check-assets.js`).
Facts: Changes in the art package: `plot_field` was removed (replaced by `plot_lawn`, `plot_orchard`), `bridge_wood` is now 32x32 (was 64x32), `bg:menu` is `assets/world/bg/menu.png`, new house/garden/farm/market ids are in `assets/world/atlas.json` (data-driven). `index.html` lists scripts; if `lib/ui-assets.js` is not listed there, load it from `app.js` with a dynamic script insertion (do not edit `index.html`). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. In `app.js` call `UiAssets.apply(document.documentElement)` once at start (guard when the module is missing).
2. Use `bg:menu` as the background of the main menu/home hub if such a hub screen exists in `app.js`; otherwise only add the helper and say so in the PR.
3. grep `plot_field` and `64x32`/`bridge_wood` in `web/` and `src/`; fix references in `app.js` only, list others in the PR.
4. Run both verification commands.

## Item W32-06: G13: pig lighting and contact shadow in Home scenes
Files of this item: web/home/canvas-pig.js
Goal: Pigs shown inside a room, garden or farm scene are lit by the scene light and have a contact shadow; pigs on the desktop are unchanged.
Depends on: W31 merged (`lib/lights.js`).
Facts: Rules are in `docs/SWIATLO_SWINEK.md`: draw `assets/world/fx/shadow_pig_{baby,junior,adult}.png` (30x6, 38x6, 46x6) at (32 - width/2, 57) inside the 64x64 pig frame, before the world light pass; light the pig itself separately without dither using the same sources in pig-frame coordinates and strength 0.5 (use `Lights.tint`, ambient `level`), so coats never burn out. Home only; the desktop app (WinForms) is not touched. The file is the canvas drawing code for Home pigs: read how it composes a frame first. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Add an optional `scene` argument/option (`{period, sources, origin}`) to the draw call; without it behave exactly as today.
2. When `scene` is given: shadow first, then the pig tinted by the ambient and the nearest sources.
3. Pick the shadow by life stage (`baby`, `junior`, `adult`; senior and legend use `adult`).
4. Run the verification command.
