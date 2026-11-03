# W32-05: G11: apply UI assets, main menu background, removed ids
Zmieniaj: web/home/app.js
Wymagane: web/home/app.js
Weryfikacja: node tools/qa/check-assets.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/lib/*, web/home/features/*, web/home/index.html, assets/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page uses the 9-slice UI assets and the new menu background, and nothing refers to ids that were removed.
Depends on: W31 merged (`lib/ui-assets.js`, `check-assets.js`).
Facts: Changes in the art package: `plot_field` was removed (replaced by `plot_lawn`, `plot_orchard`), `bridge_wood` is now 32x32 (was 64x32), `bg:menu` is `assets/world/bg/menu.png`, new house/garden/farm/market ids are in `assets/world/atlas.json` (data-driven). `index.html` lists scripts; if `lib/ui-assets.js` is not listed there, load it from `app.js` with a dynamic script insertion (do not edit `index.html`). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. In `app.js` call `UiAssets.apply(document.documentElement)` once at start (guard when the module is missing).
2. Use `bg:menu` as the background of the main menu/home hub if such a hub screen exists in `app.js`; otherwise only add the helper and say so in the PR.
3. grep `plot_field` and `64x32`/`bridge_wood` in `web/` and `src/`; fix references in `app.js` only, list others in the PR.
4. Run both verification commands.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
