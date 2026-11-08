# PK-P47b: Canvas shows the whole scene (fit, not crop)
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p47-fit.js, docs/opt/log/PK-P47b.md
Wymagane: tools/qa/ux-p47-fit.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p47-fit.js && node tools/qa/ux-p47-fit.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The whole scene background is visible in any canvas box: scaled uniformly to fit (contain), centred, bands filled with the scene edge colour. Pointer mapping stays exact.
Depends on: PK-P44b, all packages of wave P45 (perspective, `docs/opt/PERSPECTIVE_PLAN.md`) and PK-P39b merged.

## Kontekst (fakty zweryfikowane w repo 8.11.2026, nie szukaj ich drugi raz)
- Problem właściciela: okno domku (420x640) przycina scenę: `.stage-viewport` ma 132 px wysokości, a `#pigCanvas` ma `object-fit: cover; object-position: 50% 100%`, więc góra tła i boki są ucięte (sceny mają 240x130, 256x144 i 384x192, `web/home/features/places/scenes.js`, `canvas-pig.js` 276 i 394). Pod sceną są: nagłówek, karta tożsamości, belka miejsc, potrzeby (`.needs-section`) i dolny pasek 6 przycisków (`.actions-grid`: `btnFeed btnClean btnCall btnShop btnMinigames btnMore`).
- Cel: widać CAŁE tło sceny i świnki chodzące po nim. Dolny panel znika. Menu otwiera się w całości (pełny panel) po kliknięciu przycisku z paska.
- Decyzja projektowa: okno staje się poziome, **640x400** (CSS px; scena 16:9 skalowana 2.5x = 640x360 + 40 px pasek HUD u góry). Stałe 420/640 są w `src/Cuy/dotNet/HomeWindow.cs` (linie 232-235 i 287-290), `HomeWindow.Designer.cs:24`, `WebView2Probe.cs:103` i w CSS (`.game-device` `max-width/min-height`, `body.webview-mode .game-device`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (`openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')`. Istniejące testy używają id `btnFeed btnClean btnCall btnShop btnMinigames btnMore` i klas `.stage-viewport`, `.needs-section`, `.actions-grid`: zachowaj te id, zmieniasz tylko miejsce i wygląd.

## Uwaga o innych falach
- PK-P39b już pokazuje całą scenę pod belką miejsc w oknie portretowym, a wave P45 zmienia rysowanie pokoju i skalę świnki w `canvas-pig.js`. Ten pakiet NIE powtarza tych zmian: zostaw to, co zrobiły, zmień tylko mapowanie na `contain` w wiodącym polu płótna 640x360 (jeśli P39b już daje contain, ogranicz się do wspólnego `viewTransform()` i testu). Przeczytaj `docs/opt/log/PK-P39b.md` i `PK-P45e.md` przed edycją.

## Pliki i elementy (zweryfikowane)
- `web/home/canvas-pig.js`: `toScene(e)` at ~line 663 uses `Math.max(...)` (cover) and bottom alignment (`offY = rect.height - sceneHeight*s`). Change to contain: `s = Math.min(rect.width/sceneWidth, rect.height/sceneHeight)`, `offX` and `offY` both centred. Check other users of the same maths with grep (`getBoundingClientRect`, drag edge zone from P44a, ghost/pickAt from P40b) and make them call one shared helper `viewTransform()` returning `{s, offX, offY}`.
- The CSS `#pigCanvas` `object-fit: cover` is changed by PK-P47c (not here). In this package the canvas element is set by JS: `canvas.style.objectFit = 'contain'; canvas.style.objectPosition = '50% 50%'` in the constructor so the test works without the CSS change.
- Test `tools/qa/ux-p47-fit.js`: open Home, set scene `park` (384x192) and `salon` (240x130) with several canvas box sizes (640x360, 420x132, 300x300) via `page.setViewportSize` / style, assert: `debug().viewTransform` covers the whole scene (offX >= 0 and offY >= 0, s*w <= box w, s*h <= box h) and a click at a scene corner maps back to (0,0)/(w,h) within 1 px.

## Steps
1. Write `tools/qa/ux-p47-fit.js` first (tests first), expose `viewTransform` in `debug()`.
2. Implement `viewTransform()` and replace the cover maths in `toScene` and every other place found by grep.
3. Check that the edge indicator (P44a) and the ghost (P40b) still use scene coordinates.
4. Run Weryfikacja.

Prohibited: Nie dodawaj zabawek (piłka, tunel itp. zostały usunięte). Bez glifów/emoji w grafice, tylko paleta i sprite'y z biblioteki UI.
Log: write `docs/opt/log/PK-P47b.md` (max 10 lines). Do not run git.
