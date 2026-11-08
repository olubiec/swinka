# PK-P47a: Home window becomes landscape 640x400
Zmieniaj: src/Cuy/dotNet/HomeWindow.cs, src/Cuy/dotNet/HomeWindow.Designer.cs, src/Cuy/dotNet/WebView2Probe.cs, docs/opt/log/PK-P47a.md
Wymagane: src/Cuy/dotNet/HomeWindow.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The Home window is 640x400 instead of 420x640, still fits small screens and still sits at the bottom-right corner.
Depends on: PK-P44b, all packages of wave P45 (perspective, `docs/opt/PERSPECTIVE_PLAN.md`) and PK-P39b merged.

## Kontekst (fakty zweryfikowane w repo 8.11.2026, nie szukaj ich drugi raz)
- Problem właściciela: okno domku (420x640) przycina scenę: `.stage-viewport` ma 132 px wysokości, a `#pigCanvas` ma `object-fit: cover; object-position: 50% 100%`, więc góra tła i boki są ucięte (sceny mają 240x130, 256x144 i 384x192, `web/home/features/places/scenes.js`, `canvas-pig.js` 276 i 394). Pod sceną są: nagłówek, karta tożsamości, belka miejsc, potrzeby (`.needs-section`) i dolny pasek 6 przycisków (`.actions-grid`: `btnFeed btnClean btnCall btnShop btnMinigames btnMore`).
- Cel: widać CAŁE tło sceny i świnki chodzące po nim. Dolny panel znika. Menu otwiera się w całości (pełny panel) po kliknięciu przycisku z paska.
- Decyzja projektowa: okno staje się poziome, **640x400** (CSS px; scena 16:9 skalowana 2.5x = 640x360 + 40 px pasek HUD u góry). Stałe 420/640 są w `src/Cuy/dotNet/HomeWindow.cs` (linie 232-235 i 287-290), `HomeWindow.Designer.cs:24`, `WebView2Probe.cs:103` i w CSS (`.game-device` `max-width/min-height`, `body.webview-mode .game-device`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (`openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')`. Istniejące testy używają id `btnFeed btnClean btnCall btnShop btnMinigames btnMore` i klas `.stage-viewport`, `.needs-section`, `.actions-grid`: zachowaj te id, zmieniasz tylko miejsce i wygląd.

## Pliki i elementy (zweryfikowane)
- `HomeWindow.cs`: `SetupFormStyle` lines 232-235 (`Size/ClientSize/MaximumSize/MinimumSize = 420x640`), the doc comment at line 19, the DPI-fit block lines 283-296 (`420f`, `640f`, `420 * dpiScale`, `640 * dpiScale`), the placement at 299-322 (uses `this.Width/Height`, no change needed).
- `HomeWindow.Designer.cs:24` `ClientSize = (420, 640)`.
- `WebView2Probe.cs:103` `Width = 420, Height = 640`.
- Pet leave points use `this.Left + this.Width / 2, this.Bottom - 40` (lines 100, 129, 365): keep, they follow the size.

## Steps
1. Add two constants `HomeWidth = 640`, `HomeHeight = 400` in `HomeWindow.cs` and use them in every place above (no other literals left; grep `420` and `640` in the three files to confirm).
2. Keep the shrink-to-fit logic (`fit`, minimum 0.5) and the `_fitZoom` handling unchanged, only with the new base size.
3. Update the doc comment (size 640x400). Do not touch web files (another package does that).
4. Run Weryfikacja.

Prohibited: Nie dodawaj zabawek (piłka, tunel itp. zostały usunięte). Bez glifów/emoji w grafice, tylko paleta i sprite'y z biblioteki UI.
Log: write `docs/opt/log/PK-P47a.md` (max 10 lines). Do not run git.
