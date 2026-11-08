# PK-P45q: Windows checks after wave P45
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, tools/qa/ux-p45-shots.js, docs/opt/log/PK-P45q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/screen-matrix.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Run the Windows checks of wave P45 and record the result. A failing check is written in the log and makes the line fail.
Depends on: all other packages of wave P45 merged.

## Kontekst (fakty zweryfikowane w repo 8.11.2026, nie szukaj ich drugi raz)
- Problem właściciela: okno domku (420x640) przycina scenę: `.stage-viewport` ma 132 px wysokości, a `#pigCanvas` ma `object-fit: cover; object-position: 50% 100%`, więc góra tła i boki są ucięte (sceny mają 240x130, 256x144 i 384x192, `web/home/features/places/scenes.js`, `canvas-pig.js` 276 i 394). Pod sceną są: nagłówek, karta tożsamości, belka miejsc, potrzeby (`.needs-section`) i dolny pasek 6 przycisków (`.actions-grid`: `btnFeed btnClean btnCall btnShop btnMinigames btnMore`).
- Cel: widać CAŁE tło sceny i świnki chodzące po nim. Dolny panel znika. Menu otwiera się w całości (pełny panel) po kliknięciu przycisku z paska.
- Decyzja projektowa: okno staje się poziome, **640x400** (CSS px; scena 16:9 skalowana 2.5x = 640x360 + 40 px pasek HUD u góry). Stałe 420/640 są w `src/Cuy/dotNet/HomeWindow.cs` (linie 232-235 i 287-290), `HomeWindow.Designer.cs:24`, `WebView2Probe.cs:103` i w CSS (`.game-device` `max-width/min-height`, `body.webview-mode .game-device`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (`openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')`. Istniejące testy używają id `btnFeed btnClean btnCall btnShop btnMinigames btnMore` i klas `.stage-viewport`, `.needs-section`, `.actions-grid`: zachowaj te id, zmieniasz tylko miejsce i wygląd.

## Pliki i elementy (zweryfikowane)
- `docs/qa/UX_WAVE_CHECKS.md`: add section 'Wave P45'. Screenshot script `tools/qa/ux-p45-shots.js` saves one shot per scene (salon, park, farm) and per open panel into `docs/qa/shots/`.

## Steps
1. Dopisz sekcję "Wave P45" do `docs/qa/UX_WAVE_CHECKS.md` (wiersz na każdy test `ux-p45-*` z logów `docs/opt/log/PK-P45*.md`, linia Weryfikacja) plus punkty ręczne: okno 640x400 mieści się na ekranie 1366x768 i 125% DPI; całe tło sceny widać; świnki chodzą po całej podłodze; każdy przycisk menu otwiera pełny panel.
2. Uruchom linię Weryfikacja RAZ, porównaj z `docs/opt/log/baseline-smoke.txt`, zapisz w logu PASS/FAIL na komendę.

Prohibited: product code changes.
Log: write `docs/opt/log/PK-P45q.md` (max 10 lines). Do not run git.
