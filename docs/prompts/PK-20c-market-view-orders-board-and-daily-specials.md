# PK-20c: Market view, orders board and daily specials
Zmieniaj: web/home/features/market/feature.js, web/home/features/market/feature.css, web/home/features/market/orders.js
Wymagane: web/home/features/market/feature.js, web/home/features/market/orders.js
Weryfikacja: node --check web/home/features/market/feature.js && node --check web/home/features/market/orders.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W20-06, W20-07
Goal: Market view, orders board and daily specials.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W20-06: Market view: stalls, quotes and the daily cap bar
Files of this item: web/home/features/market/feature.js, web/home/features/market/feature.css
Goal: The player can buy and sell at the market with market stall banners and pixel-icon illustrations.
Depends on: W19 merged (state key `market`, messages `market_*`).
Facts: Tabs: Seeds & tools, Home & garden, Pantry, Sell. Sell tab: list of owned crops with unit price now, demand meter (bar), a count stepper, total from `market_quote` answers, 'Sell' button; a cap bar 'The market will buy N more clovers' worth today' from `capLeft`/`cap`; when `capLeft == 0` show 'The market has enough for today'. Buy tabs list `buyable` by category with price and count stepper. The orders and specials panel is a separate file (`orders.js`, W20-07) mounted into a container div `#market-extras` that this file creates.
G7 (Market visuals from docs/PLAN.md):
- Render the stall header banner `<img class="market-stall-banner" src="../../assets/world/market_stall.png" alt="">` (`image-rendering: pixelated; max-width: 100%; height: auto;`) at the top of the market view.
- Show item icons for buyable items and products using `<span class="pixel-icon icon-${itemId.replace(/_/g, '-')}"></span>`.
Text English.
Steps:
1. Implement the tabs, lists, steppers, quote requests (debounced 150 ms) and messages.
2. Render the stall header banner (`market_stall.png`) and item icons (`.icon-*`) in the market view and styling in `feature.css` (G7).

## Item W20-07: Market orders board and daily specials
Files of this item: web/home/features/market/orders.js
Goal: The market shows the daily specials and the two orders.
Depends on: W20-06 is in the same wave: mount into `#market-extras` if present, otherwise create the container and say so.
Facts: Specials: cards with item name, struck-through old price, new price, 'Buy' (`market_special {index}`). Orders: two cards 'Bring 2 parsley - reward 9', progress (owned/needed), 'Deliver' enabled only when owned >= needed and the cap leaves room (the server decides; the button just sends `market_order {index}`); a done order is greyed. The board only appears when the state has orders (unlocked after 30 harvests): otherwise show 'Harvest 30 crops to open the order board' with the progress. Export `window.MarketExtras = { render(state, container) }` called by `feature.js` on each state push.
Steps:
1. Implement `render` with escaped text and keyboard accessible buttons.
