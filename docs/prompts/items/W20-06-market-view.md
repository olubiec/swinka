# W20-06: Market view: stalls, quotes and the daily cap bar
Zmieniaj: web/home/features/market/feature.js, web/home/features/market/feature.css
Wymagane: web/home/features/market/feature.js
Weryfikacja: node --check web/home/features/market/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js, web/home/features/market/orders.js
Goal: The player can buy and sell at the market with market stall banners and pixel-icon illustrations.
Depends on: W19 merged (state key `market`, messages `market_*`).
Facts: Tabs: Seeds & tools, Home & garden, Pantry, Sell. Sell tab: list of owned crops with unit price now, demand meter (bar), a count stepper, total from `market_quote` answers, 'Sell' button; a cap bar 'The market will buy N more clovers' worth today' from `capLeft`/`cap`; when `capLeft == 0` show 'The market has enough for today'. Buy tabs list `buyable` by category with price and count stepper. The orders and specials panel is a separate file (`orders.js`, W20-07) mounted into a container div `#market-extras` that this file creates.
G7 (Market visuals from docs/PLAN.md):
- Render the stall header banner `<img class="market-stall-banner" src="../../assets/world/market_stall.png" alt="">` (`image-rendering: pixelated; max-width: 100%; height: auto;`) at the top of the market view.
- Show item icons for buyable items and products using `<span class="pixel-icon icon-${itemId.replace(/_/g, '-')}"></span>`.
Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the tabs, lists, steppers, quote requests (debounced 150 ms) and messages.
2. Render the stall header banner (`market_stall.png`) and item icons (`.icon-*`) in the market view and styling in `feature.css` (G7).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
