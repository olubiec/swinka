# W31-03: G11: 9-slice UI assets and the CSS classes that use them
Zmieniaj: web/home/lib/ui-assets.js, web/home/style.css
Wymagane: web/home/lib/ui-assets.js
Weryfikacja: node tools/qa/check-css-vars.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/app.js, web/home/index.html, assets/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can draw panels, buttons and separators from the pixel-art 9-slice pieces in `assets/ui/` instead of flat CSS boxes.
Depends on: none.
Facts: `assets/ui/ui.json` has `items[id] = { file, size:[w,h], slice:[l,t,r,b] }` for `panel_paper`, `panel_wood`, `btn_normal`, `btn_hover`, `btn_pressed`, `sep_h`, `sep_v`, `header_banner`, `shop_panel`. `web/home/lib/sprites.js` shows the project style for a browser module (IIFE, `root.X = ...`, assets base `https://cuy.assets/` in the app, relative path in the mock). Wiring into `app.js` is done in a later task, so do not touch `app.js` or `index.html`. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Create `web/home/lib/ui-assets.js` (same IIFE style): `UiAssets.apply(rootElement)` fetches `assets/ui/ui.json` once and sets CSS custom properties on `:root`, one per item: `--ui-<id>` (with `_` kept) holding `url(<assets base>/ui/<file>)`; on any failure it does nothing (flat CSS stays).
2. In `web/home/style.css` add classes `.ui-panel-paper`, `.ui-panel-wood`, `.ui-btn` (+ `:hover`, `:active`), `.ui-sep-h`, `.ui-sep-v`, `.ui-banner` using `border-image: var(--ui-<id>) <slice> fill / <slice>px` and `image-rendering: pixelated`, each with a fallback `background`/`border` that works when the variable is missing. Define the variables with `initial` fallbacks at `:root` so `node tools/qa/check-css-vars.js` stays green.
3. Do not restyle existing screens. Run both verification commands.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
