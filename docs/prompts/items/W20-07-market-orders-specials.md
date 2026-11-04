# W20-07: Market orders board and daily specials
Zmieniaj: web/home/features/market/orders.js
Wymagane: web/home/features/market/orders.js
Weryfikacja: node --check web/home/features/market/orders.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/features/market/feature.js, web/home/app.js, web/home/bridge.js
Goal: The market shows the daily specials and the two orders.
Depends on: W20-06 is in the same wave: mount into `#market-extras` if present, otherwise create the container and say so.
Facts: Specials: cards with item name, struck-through old price, new price, 'Buy' (`market_special {index}`). Orders: two cards 'Bring 2 parsley - reward 9', progress (owned/needed), 'Deliver' enabled only when owned >= needed and the cap leaves room (the server decides; the button just sends `market_order {index}`); a done order is greyed. The board only appears when the state has orders (unlocked after 30 harvests): otherwise show 'Harvest 30 crops to open the order board' with the progress. Export `window.MarketExtras = { render(state, container) }` called by `feature.js` on each state push. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement `render` with escaped text and keyboard accessible buttons.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
