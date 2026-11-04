# PK-30c: Data checks, smoke test and manual steps, flags on for roaming
Zmieniaj: tools/qa/data-check.js, src/Cuy/dotNet/SelfTest.cs, src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionHomeExtrasTests.cs, tools/qa/web-smoke.js, TESTY_RECZNE.md, docs/opt/log/PK-30c.md
Wymagane: tools/qa/data-check.js, src/Cuy/dotNet/SelfTest.cs, tests/Cuy.Core.Tests/GameSessionHomeExtrasTests.cs, tools/qa/web-smoke.js, TESTY_RECZNE.md
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true && node --check tools/qa/data-check.js && node --check tools/qa/web-smoke.js && node tools/qa/web-smoke.js && node tools/qa/data-check.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W30-07, W30-09, W30-08
Goal: Data checks, smoke test and manual steps, flags on for roaming.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-30c.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W30-07: Data checks and SelfTest for the home extras
Files of this item: tools/qa/data-check.js, src/Cuy/dotNet/SelfTest.cs
Goal: The data check and the desktop self-test cover the new data files.
Depends on: W29 merged.
Facts: `data-check.js` already checks `pig_rooms.json` and `home_economy.json` (read the sections). Add: every theme `wall_tile`/`floor_tile` that exists in `assets/world/tiles.json` has a file; every placeable with `prop_of` has an atlas entry or is listed in a `missing_art` array printed as a warning (not an error); the sum of all prices is printed. `SelfTest.cs`: add `Check` entries (W22-05 style) for `pig_rooms.json`, `home_economy.json` parse, every theme skin exists in `items_decor.json`, every theme starter/signature exists in `world_items.json`.
Steps:
1. Implement both; keep the existing checks unchanged.

## Item W30-09: GameSession.Open switches roaming, run and props on
Files of this item: src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionHomeExtrasTests.cs
Goal: Roaming, the run and desktop props become active in the real game.
Depends on: W29 merged.
Facts: Add `HomesActive`, `RunActive`, `PropsActive` to the flags set in `GameSession.Open` (both branches) and call the migration of W29-04. Existing tests must keep passing; record any that break only because of the flags.
Steps:
1. Implement.
2. Tests: a new session has the three flags true; an old save with toys in the inventory puts them on the desktop once; the run is unavailable until the garden and a fence exist; every pig has a location.
Package override (wins over anything above): SCOPE CHANGE: the run and desktop props are deferred (no `RunActive`/`PropsActive` flags exist). Switch on `HomesActive` only, skip the W29-04 migration call and the toys test; the other assertions about homes stay.

## Item W30-08: Smoke test and manual steps for roaming, run, props and the store
Files of this item: tools/qa/web-smoke.js, TESTY_RECZNE.md
Goal: The smoke test covers the new screens and the human has a checklist.
Depends on: W29 merged.
Facts: Smoke (mock, `?world=1`): the house plan opens, shows one window per room, selecting a window switches the tab; pigs are drawn in the room (canvas not empty); the home switch changes the mock mode; the garden run panel shows 'Close a fence line with a gate' when empty and capacity after the mock fence exists, `?weather=rain` shows the gentle message; the tray shows the desktop props, dragging a chip into the canvas moves it to the room (count changes); the store lists categories, the search box filters, buying an item lowers the clovers; no console errors; `layoutProblems` empty. `TESTY_RECZNE.md` (Polish): section 'Dom: wędrowanie, wybieg, rzeczy z pulpitu, sklep' with numbered steps: tie a pig to a room and see it stay; roam and check the schedule (night in own room); build a fence with a gate, let two pigs out, rain rule, auto return in the evening; move the ball from the desktop to a room and back, restart, check it persisted; open Home with a prop on the desktop and see the chip; buy things in the store and see clovers; no way to sell.
Steps:
1. Add scenarios and the manual section; edit nothing else.
Package override (wins over anything above): SCOPE CHANGE: skip every smoke scenario and manual-test section about the garden run, the tray and desktop props. Keep roaming (house plan, home switch) and the store.
