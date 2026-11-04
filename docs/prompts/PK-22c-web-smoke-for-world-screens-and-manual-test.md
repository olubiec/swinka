# PK-22c: Web smoke for world screens and manual test steps
Zmieniaj: tools/qa/web-smoke.js, TESTY_RECZNE.md, docs/opt/log/PK-22c.md
Wymagane: tools/qa/web-smoke.js, TESTY_RECZNE.md
Weryfikacja: node --check tools/qa/web-smoke.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W22-03, W22-04
Goal: Web smoke for world screens and manual test steps.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-22c.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W22-03: Web smoke: places bar, rooms, garden, farm and market screens
Files of this item: tools/qa/web-smoke.js
Goal: The smoke test visits the four new screens in the mock and checks layout and errors.
Depends on: W21 merged.
Facts: Use the mock switch `?world=1` (W20-08). Scenarios: the places bar shows five places; the rooms feature loads, canvas present, the drawer lists owned items, placing an item by simulated click updates the item count; the garden shows the walk button; the farm shows 4 plots, planting dandelion changes the plot state, 'Harvest all' is disabled when nothing is ripe; the market shows the cap bar, selling a mock item reduces the owned count and the cap left; no console errors; `layoutProblems` empty at all configured sizes.
G10 (Image asset verification from docs/PLAN.md):
- Also verify in `tools/qa/web-smoke.js` that all `<img>` elements rendered in the world/pigs views have `complete && naturalWidth > 0` and no 404 resource errors occur.
Do not change existing checks.
Steps:
1. Add the scenarios in a new function called from the existing runner; keep the runtime within 60 seconds.
2. Verify all `<img>` elements have `complete && naturalWidth > 0` and assert no 404 resource errors occur (G10).

## Item W22-04: Manual test steps for the world (TESTY_RECZNE.md)
Files of this item: TESTY_RECZNE.md
Goal: The human has a numbered Windows checklist for the world.
Depends on: W21 merged.
Facts: The file is Polish; add the section 'Świat: dom, ogród, park, farma, targ' with numbered steps and expected results: arrange the living room and see mood decay slower after reaching high comfort; buy a bedroom; unlock the garden and send the pig for a walk (three times, then the refusal); unlock the farm, plant, water, wait (describe how to set the clock back in the save to skip waiting), harvest, feed the pig with the harvest; sell at the market until the cap message; deliver an order; see the daily specials; restart the app and check everything persisted; memory corner appears with a memorial pig; notification 'Something is ready on the farm!'.
Steps:
1. Write the section; do not edit others.
