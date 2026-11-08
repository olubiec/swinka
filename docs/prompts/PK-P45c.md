# PK-P45c: Stage fills the window, bottom panel removed, HUD strip on top
Zmieniaj: web/home/index.html, web/home/style.css, tools/qa/lib/ux.js, tools/qa/ux-p45-layout.js, docs/opt/log/PK-P45c.md
Wymagane: tools/qa/ux-p45-layout.js
Weryfikacja: node --check tools/qa/lib/ux.js && node --check tools/qa/ux-p45-layout.js && node tools/qa/ux-p45-layout.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Layout 640x400: a 40 px HUD strip on top (name, stage, clovers, scene arrows, 6 menu icon buttons, sound, close) and the stage below it filling the rest. No identity card, needs section or bottom action grid in the flow.
Depends on: PK-P45a and PK-P45b merged.

## Kontekst (fakty zweryfikowane w repo 8.11.2026, nie szukaj ich drugi raz)
- Problem właściciela: okno domku (420x640) przycina scenę: `.stage-viewport` ma 132 px wysokości, a `#pigCanvas` ma `object-fit: cover; object-position: 50% 100%`, więc góra tła i boki są ucięte (sceny mają 240x130, 256x144 i 384x192, `web/home/features/places/scenes.js`, `canvas-pig.js` 276 i 394). Pod sceną są: nagłówek, karta tożsamości, belka miejsc, potrzeby (`.needs-section`) i dolny pasek 6 przycisków (`.actions-grid`: `btnFeed btnClean btnCall btnShop btnMinigames btnMore`).
- Cel: widać CAŁE tło sceny i świnki chodzące po nim. Dolny panel znika. Menu otwiera się w całości (pełny panel) po kliknięciu przycisku z paska.
- Decyzja projektowa: okno staje się poziome, **640x400** (CSS px; scena 16:9 skalowana 2.5x = 640x360 + 40 px pasek HUD u góry). Stałe 420/640 są w `src/Cuy/dotNet/HomeWindow.cs` (linie 232-235 i 287-290), `HomeWindow.Designer.cs:24`, `WebView2Probe.cs:103` i w CSS (`.game-device` `max-width/min-height`, `body.webview-mode .game-device`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (`openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')`. Istniejące testy używają id `btnFeed btnClean btnCall btnShop btnMinigames btnMore` i klas `.stage-viewport`, `.needs-section`, `.actions-grid`: zachowaj te id, zmieniasz tylko miejsce i wygląd.

## Pliki i elementy (zweryfikowane)
- `web/home/index.html`: header (lines 38-52), identity card 55-68, places bar 71-80, stage 82-85, needs 88-183, actions 186-243. Move the six `<button class="game-btn ...">` (same ids) into the HUD strip as 28 px icon buttons (icons `icon-m-feed`, `icon-m-clean`, `icon-m-call`, `icon-shop`, `icon-m-games`, `icon-m-more`, label as `title`/`aria-label`); the places bar (`placesPrevBtn`, `placesBarTitle`, `placesNextBtn`) moves into the same strip. Keep `foodDrawer` markup (PK-P45d reuses it). The identity card and needs section are NOT deleted: they are wrapped in `<section id="pigPanel" hidden>` for PK-P45d (all child ids unchanged: `petName`, `petAge`, `stageBadge`, `bondIndicator`, `bar*`, `val*`, `healthPercent`).
- `web/home/style.css`: `.game-device` (line ~96, `max-width: 420px; min-height: 620px`) and `body.webview-mode .game-device` (87, `max-width: 400px; max-height: 620px`) become 640x400; `.stage-viewport` (368, `flex: 0 0 132px; height: 132px`) becomes `flex: 1 1 auto; height: auto; min-height: 0`; `#pigCanvas` (380) `object-fit: contain; object-position: 50% 50%`, stage background `var(--ui-wood-0)` for the bands; `.stage-overlay-hint` (394) stays bottom-right.
- `tools/qa/lib/ux.js`: default viewport 420x640 -> 640x400 (grep `420`, `640`); also check `tools/qa/screen-matrix.js` and `a11y-check.js` for the same literal and fix only the viewport number.
- 9-slice UI from the palette (`--ui-wood-*`, `--ui-linen-*`), no glyphs: the close and sound buttons already exist, keep them.

## Steps
1. Write `tools/qa/ux-p45-layout.js` first: viewport 640x400; assert `.stage-viewport` height >= 340 px, `#pigCanvas` fully inside the stage, the six ids are visible in the HUD strip and clickable, `.needs-section` and `.actions-grid` are not visible in the flow, no horizontal/vertical page scroll.
2. Restructure `index.html` and `style.css` as above. The whole scene must show: at 640x360 the canvas box ratio equals 16:9 for 256x144 scenes.
3. Update the viewport in `tools/qa/lib/ux.js` (and the two other test tools if they hold the literal).
4. Run Weryfikacja.

Prohibited: Nie dodawaj zabawek (piłka, tunel itp. zostały usunięte). Bez glifów/emoji w grafice, tylko paleta i sprite'y z biblioteki UI.
Log: write `docs/opt/log/PK-P45c.md` (max 10 lines). Do not run git.
