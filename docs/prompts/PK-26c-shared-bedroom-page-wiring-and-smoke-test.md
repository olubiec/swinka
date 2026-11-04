# PK-26c: Shared bedroom page, wiring and smoke test
Zmieniaj: web/home/features/rooms/dorm.js, web/home/features/rooms/dorm.css, web/home/features/rooms/feature.js, web/home/features/rooms/mock.js, tools/qa/web-smoke.js, TESTY_RECZNE.md
Wymagane: web/home/features/rooms/dorm.js, web/home/features/rooms/feature.js, web/home/features/rooms/mock.js, tools/qa/web-smoke.js, TESTY_RECZNE.md
Weryfikacja: node --check web/home/features/rooms/dorm.js && node --check web/home/features/rooms/feature.js && node --check web/home/features/rooms/mock.js && node --check tools/qa/web-smoke.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W26-06, W26-07, W26-09
Goal: Shared bedroom page, wiring and smoke test.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W26-06: Shared bedroom page: unlock, residents and move in or out
Files of this item: web/home/features/rooms/dorm.js, web/home/features/rooms/dorm.css
Goal: The player can unlock the shared bedroom and choose who lives in it.
Depends on: W25 merged; state `dorm` (W26-04); the page wiring is W26-07.
Facts: Export `window.DormPanel = { mount(container, ctx) }` (`ctx = { state, send }`). Locked: a card 'Shared bedroom - N clovers - needs two pigs' with the unlock button (disabled with the reason). Unlocked: portrait row of `candidates` as toggle chips (resident/not), button 'Move in together' for the selected set (`dorm_move_in`), 'Move out' per resident, level button, a calm line 'Friends who sleep together get along a little better' when `bondBonus > 0`. Memorial pigs can be chosen too (they are shown with a candle). After moving in, show the stored-items notice if the server toasted it. Text English.
Steps:
1. Implement the panel and styles.

## Item W26-07: Wire the shared bedroom into the rooms page and the mock
Files of this item: web/home/features/rooms/feature.js, web/home/features/rooms/mock.js
Goal: The rooms page has a 'Shared bedroom' tab and the mock supports it.
Depends on: W26-06 merged (same wave: load `dorm.js` only if present).
Facts: `feature.js`: add a tab after the pig tabs: 'Shared bedroom' (locked tab shows the price). The tab shows `DormPanel.mount` above the canvas and, when unlocked and the pig has residents, the dorm layout (`layouts.dorm`, grid 16x8..) edited like any other room. Pig tabs of residents show a small 'moved in' badge and open the dorm. `bridge.js`: add the `dorm` state and handlers (unlock 1500 needs 2 pigs, upgrade 1100/1800, move in/out with simple merging: put all items of the residents into the dorm layout side by side, anything beyond 16x8 goes to `storage`).
Steps:
1. Implement both files; keep existing mock keys and `?world=1`.
Package override (wins over anything above): Do not edit `bridge.js`: the dorm mock goes into `features/rooms/mock.js`.

## Item W26-09: Smoke test and manual steps for pig rooms and the shared bedroom
Files of this item: tools/qa/web-smoke.js, TESTY_RECZNE.md
Goal: The smoke test covers the new screens and the human has a checklist.
Depends on: W26-07 merged earlier? No: same wave, so write the smoke against the mock described in W25-07 and W26-07.
Facts: Smoke scenarios (mock, `?world=1`): the rooms page shows a tab per named pig; switching tabs changes the canvas room name; the customize panel appears and a variant swatch click changes the item's variant in the mock state; renaming the room updates the header; the storage list is visible; the shared bedroom tab shows the locked card; with the mock state unlocked the residents can be toggled; no console errors; `layoutProblems` empty at all sizes. `TESTY_RECZNE.md` (Polish): section 'Pokoje świnek i wspólna sypialnia' with numbered steps: each pig has its own room with its theme; recolour a sofa; rename; move an item between rooms; the comfort bar differs per pig; unlock the shared bedroom (needs two pigs, 1500), move two pigs in and out and check nothing was lost; the memory room wording; restart and check persistence.
Steps:
1. Add the scenarios in a new function called from the runner; add the manual section; edit nothing else.
