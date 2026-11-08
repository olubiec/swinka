# PK-P45d: Menu buttons open full-window panels
Zmieniaj: web/home/app.js, web/home/menu-panel.js, web/home/menu-panel.css, web/home/index.html, tools/qa/ux-p45-menu.js, docs/opt/log/PK-P45d.md
Wymagane: tools/qa/ux-p45-menu.js
Weryfikacja: node --check web/home/app.js && node --check web/home/menu-panel.js && node --check tools/qa/ux-p45-menu.js && node tools/qa/ux-p45-menu.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Clicking any menu icon opens one full-window panel over the scene (Feed, Clean, Shop, Games, More, plus Pig = name/needs/health from the name button); the scene stays visible when no panel is open; Esc, × or clicking the same icon closes it.
Depends on: PK-P45c merged.

## Kontekst (fakty zweryfikowane w repo 8.11.2026, nie szukaj ich drugi raz)
- Problem właściciela: okno domku (420x640) przycina scenę: `.stage-viewport` ma 132 px wysokości, a `#pigCanvas` ma `object-fit: cover; object-position: 50% 100%`, więc góra tła i boki są ucięte (sceny mają 240x130, 256x144 i 384x192, `web/home/features/places/scenes.js`, `canvas-pig.js` 276 i 394). Pod sceną są: nagłówek, karta tożsamości, belka miejsc, potrzeby (`.needs-section`) i dolny pasek 6 przycisków (`.actions-grid`: `btnFeed btnClean btnCall btnShop btnMinigames btnMore`).
- Cel: widać CAŁE tło sceny i świnki chodzące po nim. Dolny panel znika. Menu otwiera się w całości (pełny panel) po kliknięciu przycisku z paska.
- Decyzja projektowa: okno staje się poziome, **640x400** (CSS px; scena 16:9 skalowana 2.5x = 640x360 + 40 px pasek HUD u góry). Stałe 420/640 są w `src/Cuy/dotNet/HomeWindow.cs` (linie 232-235 i 287-290), `HomeWindow.Designer.cs:24`, `WebView2Probe.cs:103` i w CSS (`.game-device` `max-width/min-height`, `body.webview-mode .game-device`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (`openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')`. Istniejące testy używają id `btnFeed btnClean btnCall btnShop btnMinigames btnMore` i klas `.stage-viewport`, `.needs-section`, `.actions-grid`: zachowaj te id, zmieniasz tylko miejsce i wygląd.

## Pliki i elementy (zweryfikowane)
- `web/home/app.js`: handlers in `bindButtons` (line ~515): `btnFeed` 523 (opens `foodDrawer`), `btnClean` 542, `btnCall` 563, `btnShop` 581, `btnMinigames` 587, `btnMore` 593 (`openMoreModal` at 842). `openFoodDrawer/closeFoodDrawer` exist. Modal markup `#modalBackdrop` (index.html), CSS `.modal-backdrop` 1112, `.modal-card` 1136 (`max-width: 380px; max-height: 85vh`).
- New `web/home/menu-panel.js` (`window.CuyMenuPanel.open(id) / close() / current()`): one container `#menuPanel` of the stage size (position: absolute over `.stage-viewport` and the strip stays visible), content: for `feed` the existing food grid, for `pig` the `#pigPanel` section from P45c (moved in by DOM, not copied), for shop/games/more the existing modal body (the modal card stretches to 100% width/height of the panel instead of 380 px). Clean and Call stay instant actions (no panel), with a short bubble as today.
- New `web/home/menu-panel.css` (linked from `index.html`, so `style.css` is not touched); `index.html` gets the `<link>` and `<script>` lines.
- Pig name click (`petName`) and a new small need-alert dot on the HUD name button open the `pig` panel; the dot shows when any need < 30 % (reuse the colour classes `level-low`).

## Steps
1. Write `tools/qa/ux-p45-menu.js` first: with `CuyScenesMock.state('seven')`: open each of feed/shop/games/more/pig, assert one panel at a time covering the stage, scene canvas still in DOM; Esc and second click close; Clean stays instant; existing `openMore` / `openFromMore` helpers still work.
2. Implement `menu-panel.js/.css`, rewire the handlers in `app.js` to `CuyMenuPanel.open`.
3. Keep modal-based flows (shop, games, more) working from other callers (grep `modalBackdrop`, `openMoreModal`, `openModal`).
4. Run Weryfikacja.

Prohibited: Nie dodawaj zabawek (piłka, tunel itp. zostały usunięte). Bez glifów/emoji w grafice, tylko paleta i sprite'y z biblioteki UI.
Log: write `docs/opt/log/PK-P45d.md` (max 10 lines). Do not run git.
