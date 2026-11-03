# W30-05: Home store page
Zmieniaj: web/home/features/store/feature.js, web/home/features/store/feature.css, web/home/features/index.json
Wymagane: web/home/features/store/feature.js, web/home/features/index.json
Weryfikacja: node --check web/home/features/store/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js
Goal: One page lists everything the player can buy for the home, with filters, locked reasons and prices.
Depends on: W29 merged; state `store` from W30-03. Sub-wave W30a: no dependency on other tasks of the wave.
Facts: Register the id `store` in `features/index.json`. Page: left list of `categories`, search box, filters (place, price range, 'only what I can afford', 'hide owned'), sort (price, name, comfort when present); cards with icon, name, price, owned/placed counts and a Buy button with a count stepper for items; locked rows show the padlock and a plain sentence built from `lockedReason` ('Unlock the garden first'). Sends `store_open` on show and `store_buy` on click; the clover balance is always visible. Also add a link 'Open the store' on the rooms page toolbar by dispatching `CustomEvent('open-feature', { detail: { id: 'store' } })` handled by `app.js` if it listens (check; otherwise leave the link out and say so). Text English, all text escaped. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the page; keyboard accessible; layout OK at the smoke sizes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
