# PK-P47d2: Feed and Pig buttons use the menu panel; HUD name and alert dot
Zmieniaj: web/home/app.js, tools/qa/ux-p47-menu-feed-pig.js, docs/opt/log/PK-P47d2.md
Wymagane: tools/qa/ux-p47-menu-feed-pig.js
Weryfikacja: node --check web/home/app.js && node --check tools/qa/ux-p47-menu-feed-pig.js && node tools/qa/ux-p47-menu-feed-pig.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: `btnFeed` and the new `btnPig` open the `feed` / `pig` panels; the HUD shows the pig name, stage icon and a need-alert dot (any need < 30 %). Clean and Call stay instant actions.
Depends on: PK-P47d1 merged.

## Kontekst (fakty zweryfikowane w repo 8.11.2026, nie szukaj ich drugi raz)
- Owner's problem: the Home window (420x640) crops the scene (`.stage-viewport` 132 px, `#pigCanvas` `object-fit: cover`). P47 makes the window landscape 640x400 CSS px: 40 px HUD strip (`#hudStrip`) on top, stage below it with the WHOLE scene (`contain`), bottom panel gone, menu opens as full-stage panel.
- `web/home/app.js`: `FOODS`/`closeFoodDrawer` 481-483, `renderFoodDrawer` 485, `giveFood` 497-518 (calls `closeFoodDrawer()` at 507 and 517), `bindButtons` 521: `btnFeed` handler 523-535 (toggles `foodDrawer.classList.active`), `foodDrawerClose` 536, a `document` Escape listener 537-539, `btnClean` 542, `btnCall` 563 (unchanged). `updateUI` renders state: name 346, stage badge 352-356 (`getStageIcon(stageKey)`), and line 424 `elements.foodDrawer?.classList.contains('active')` refreshes the drawer. Rename: `startRename` 258 bound to `#petName` click (288).
- HUD ids from c1: `btnPig`, `hudPigName`, `hudStageIcon`, `needAlertDot` (hidden by default). `CuyMenuPanel` API from d1 (`toggle/open/close/current`).
- Order: P47 runs AFTER waves P39 (scene fit, blockers), P45 (perspective in `canvas-pig.js`, `CuyRoomGeometry`), P40 (edit mode), P43 (hotspots) and P44 (pig drag to the edge). Do not undo what they added (hotspot, edit-mode and drag overlays, the Edit button and drawer); if a log `docs/opt/log/PK-P39b.md` or `PK-P45e*.md` exists, read only its last lines.

## Pliki i elementy (zweryfikowane)
- `elements`: add `btnPig`, `hudPigName`, `hudStageIcon`, `needAlertDot` next to `petName` (line 13).
- Feed: handler = `Sound.click()`; if `CuyMenuPanel.current() === 'feed'` close it; else `renderFoodDrawer(state)` then `CuyMenuPanel.open('feed')` and keep the `beg` animation and bubble. `closeFoodDrawer()` becomes `if (CuyMenuPanel.current() === 'feed') CuyMenuPanel.close()`; line 424 asks `CuyMenuPanel.current() === 'feed'`; delete the `document` Escape listener (537-539; d1 handles Esc). `foodDrawerClose` stays bound to `closeFoodDrawer`.
- Pig: `btnPig` click toggles `pig`. `startRename` (258) must first call `CuyMenuPanel.close()` so the welcome/rename view is not hidden under the panel.
- HUD sync in `updateUI`: `hudPigName.textContent = state.name || 'Cuy'`; `hudStageIcon.className = 'pixel-icon icon-stage-' + stageKey` (use the same `stageKey` as line 352-355); dot: `const NEED_ALERT_BELOW = 30;` show `needAlertDot` (and set its `title` to `Needs attention`) when `Math.min(...Object.values(state.needs))` < 30, else hide.

## Steps
1. Write `tools/qa/ux-p47-menu-feed-pig.js` first (viewport 640x400, mock `seven`; for need values reuse how `tools/qa/ux-p41-bond.js` or other `ux-p4*` tests push mock state with `bridge`; grep `needs` there): F1 `feed-opens-panel` (click `#btnFeed`: `CuyMenuPanel.current()==='feed'`, `#foodGrid` has a hay button inside `#menuPanel`), F2 `feed-toggle` (second click closes), F3 `feed-give` (click the hay button: a `feed` message is sent through the mock bridge and the panel closes), F4 `pig-panel` (click `#btnPig`: `#pigPanel` visible, six `.progress-fill` visible, `#petName` text equals `#hudPigName`), F5 `alert-dot` (state with `fullness: 20`: dot visible; all needs 80: hidden), F6 `clean-call-instant` (clicking `#btnClean` and `#btnCall` leaves `CuyMenuPanel.current()` null), F7 `one-at-a-time` (feed then pig then feed), F8 `esc-closes`.
2. Edit `app.js` as above (only the listed ranges).
3. Run Weryfikacja.

Prohibited: Nie dodawaj zabawek (piłka, tunel itp. zostały usunięte). Bez glifów/emoji w grafice, tylko paleta i sprite'y z biblioteki UI. No refactors, no new abstractions, no edits outside Zmieniaj.
Log: write `docs/opt/log/PK-P47d2.md` (max 10 lines). Do not run git.
