# PK-P47q: Windows checks after wave P47
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, tools/qa/ux-p47-shots.js, docs/opt/log/PK-P47q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/screen-matrix.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Run the Windows checks of wave P47 and record the result. A failing check is written in the log and makes the line fail.
Depends on: all other packages of wave P47 (PK-P47a, b, c1, c2, c3, d1, d2, d3) merged, and the waves P39, P40, P43, P44, P45 before them.

## Kontekst (fakty zweryfikowane w repo 8.11.2026, nie szukaj ich drugi raz)
- Problem właściciela: okno domku (420x640) przycina scenę: `.stage-viewport` ma 132 px wysokości, a `#pigCanvas` ma `object-fit: cover; object-position: 50% 100%`, więc góra tła i boki są ucięte (sceny mają 240x130, 256x144 i 384x192, `web/home/features/places/scenes.js`, `canvas-pig.js` 276 i 394). Pod sceną są: nagłówek, karta tożsamości, belka miejsc, potrzeby (`.needs-section`) i dolny pasek 6 przycisków (`.actions-grid`: `btnFeed btnClean btnCall btnShop btnMinigames btnMore`).
- Cel: widać CAŁE tło sceny i świnki chodzące po nim. Dolny panel znika. Menu otwiera się w całości (pełny panel) po kliknięciu przycisku z paska.
- Decyzja projektowa: okno staje się poziome, **640x400** (CSS px; scena 16:9 skalowana 2.5x = 640x360 + 40 px pasek HUD u góry). Stałe 420/640 są w `src/Cuy/dotNet/HomeWindow.cs` (linie 232-235 i 287-290), `HomeWindow.Designer.cs:24`, `WebView2Probe.cs:103` i w CSS (`.game-device` `max-width/min-height`, `body.webview-mode .game-device`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (`openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')`. Istniejące testy używają id `btnFeed btnClean btnCall btnShop btnMinigames btnMore` i klas `.stage-viewport`, `.needs-section`, `.actions-grid`: zachowaj te id, zmieniasz tylko miejsce i wygląd.

## Pliki i elementy (zweryfikowane)
- `docs/qa/UX_WAVE_CHECKS.md`: add section 'Wave P47'. Screenshot script `tools/qa/ux-p47-shots.js` saves one shot per scene (salon, park, farm) and per open panel into `docs/qa/shots/`.

## Steps
1. Dopisz sekcję "Wave P47" do `docs/qa/UX_WAVE_CHECKS.md` (wiersz na każdy test `ux-p47-*`: fit, hud, layout, menu-core, menu-feed-pig, menu-modals, z logów `docs/opt/log/PK-P47*.md`, linia Weryfikacja) plus punkty ręczne w oknie 640x400: (1) okno mieści się na ekranie 1366x768 i 125% DPI; (2) całe tło sceny widać w salonie, parku i na farmie; (3) świnki chodzą po całej podłodze, głębia i cień z fali P45 działają; (4) każdy z 6 przycisków paska i imię świnki otwiera pełny panel pod paskiem, Esc / x / ten sam przycisk zamyka; (5) tryb Edit z fali P40: przycisk Edit obok paska miejsc jest widoczny i klikalny, szuflada pozycji nie wychodzi poza okno, ghost przy przeciąganiu z szuflady i upuszczenie na scenę (4 px) działają, blokery z P39 widoczne; (6) hotspoty z fali P43: podświetlenie po najechaniu i klik w scenie działają, nie przeszkadzają w głaskaniu i przeciąganiu świnki; (7) przeciąganie świnki z fali P44: trzymanie przy lewej/prawej krawędzi 600 ms zmienia scenę, wyciągnięcie poza okno nadal wypuszcza świnkę na pulpit; (8) kropka potrzeb przy imieniu świnki, `placesLockedHint` nie zasłania paska; (9) Sklep, Gry (każda minigra mieści się w panelu), Więcej i każdy kafelek Więcej przewija się tylko w środku panelu.
2. Uruchom `node tools/qa/ux-p47-shots.js` (zdjęcie na scenę i otwarty panel). Uruchom linię Weryfikacja RAZ, porównaj z `docs/opt/log/baseline-smoke.txt`, zapisz w logu PASS/FAIL na komendę.

Prohibited: product code changes. Run `node tools/qa/minigame-fit-check.js` once as an extra row (its 420x640 viewport literal is not edited; compare with the baseline and note any 640x400 effect in the log).
Log: write `docs/opt/log/PK-P47q.md` (max 10 lines). Do not run git.
