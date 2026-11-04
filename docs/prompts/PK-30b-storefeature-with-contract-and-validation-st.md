# PK-30b: StoreFeature with contract and validation, store page
Zmieniaj: src/Cuy/dotNet/Features/StoreFeature.cs, docs/contracts/store.md, src/Cuy.Core/Input/Validation/StoreMessages.cs, tests/Cuy.Core.Tests/StoreMessageTests.cs, web/home/features/store/feature.js, web/home/features/store/feature.css, web/home/features/index.json, docs/opt/log/PK-30b.md
Wymagane: src/Cuy/dotNet/Features/StoreFeature.cs, docs/contracts/store.md, src/Cuy.Core/Input/Validation/StoreMessages.cs, tests/Cuy.Core.Tests/StoreMessageTests.cs, web/home/features/store/feature.js, web/home/features/index.json
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~StoreMessageTests" && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true && node --check web/home/features/store/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W30-03, W30-04, W30-05
Goal: StoreFeature with contract and validation, store page.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-30b.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W30-03: StoreFeature: state and the purchase message
Files of this item: src/Cuy/dotNet/Features/StoreFeature.cs
Goal: The Home page can read the home store and buy from it.
Depends on: W29 merged.
Facts: State key `store`: `{ clovers, rows: [ { kind, id, name, category, place, price, owned, placed, locked, lockedReason, icon } ], categories: [ { id, name, count } ] }` from `HomeStore.Rows`. Message `store_buy { kind, id, count }` calls `Pet.Purchase`; toasts: 'Not enough clovers', 'Not available yet', 'Bought!'. Rows are large (about 150): publish them only when the page asked (`store_open {}` message sets a flag for 5 minutes) and on changes.
Steps:
1. Implement with the planned names.

## Item W30-04: Contracts and validation for the store
Files of this item: docs/contracts/store.md, src/Cuy.Core/Input/Validation/StoreMessages.cs, tests/Cuy.Core.Tests/StoreMessageTests.cs
Goal: The `store` state and messages are documented and validated.
Depends on: W30-03 merged (read it).
Facts: Document `store` in `docs/contracts.md`; validator: `store_open {}`, `store_buy { kind (one of room|place|item|variant|decor|farm|stall|dorm), id <= 64, count 1-99 }`.
Steps:
1. Write doc and entries.
2. Tests: good and bad payloads, unknown kind, count 0 and 100.
Package override (wins over anything above): Do not edit `docs/contracts.md` or `MessageValidator.cs`: write `docs/contracts/store.md` and one `IMessageRuleSet` class `StoreMessages` (package PK-00).

## Item W30-05: Home store page
Files of this item: web/home/features/store/feature.js, web/home/features/store/feature.css, web/home/features/index.json
Goal: One page lists everything the player can buy for the home, with filters, locked reasons and prices.
Depends on: W29 merged; state `store` from W30-03.
Facts: Register the id `store` in `features/index.json`. Page: left list of `categories`, search box, filters (place, price range, 'only what I can afford', 'hide owned'), sort (price, name, comfort when present); cards with icon, name, price, owned/placed counts and a Buy button with a count stepper for items; locked rows show the padlock and a plain sentence built from `lockedReason` ('Unlock the garden first'). Sends `store_open` on show and `store_buy` on click; the clover balance is always visible. Also add a link 'Open the store' on the rooms page toolbar by dispatching `CustomEvent('open-feature', { detail: { id: 'store' } })` handled by `app.js` if it listens (check; otherwise leave the link out and say so). Text English, all text escaped.
Steps:
1. Implement the page; keyboard accessible; layout OK at the smoke sizes.
