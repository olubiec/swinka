# PK-P39c2: Placed items block, drag drop snaps to free ground, pointer mapping for contain
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p39-snap.js, docs/opt/log/PK-P39c2.md
Wymagane: tools/qa/ux-p39-snap.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p39-snap.js && node tools/qa/ux-p39-snap.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
## Kontekst (fakty zweryfikowane 8.11.2026, nie szukaj drugi raz)
- Cel: każde miejsce to scena w głównym oknie Home (widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y). Dane scen: `assets/data/place_scenes.json` (słownik `scenes` z kluczami `room`, `garden`, `park`, `farm`, `market`; pola snake_case: `kind`, `size`, `walk` [x0,y0,x1,y1], `depth_scale`, `bg`, `exits`). Pokoje domku (salon, `pig:<id>`, dorm) używają szablonu `room` (240x130, bez `bg`). `features/places/scenes.js` `def(id,tod)` (linie 311-345) zwraca camelCase `{id,kind,title,size,walk,depthScale,bgUrl,exits}`. Płótno: `web/home/canvas-pig.js` (klasa `PigCanvas`, API `CanvasPig.*`, instancja `window.CuyPig.mainInstance`).
- Test właściciela 7.11: świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; scena jest przycięta (drzewa w parku, domek na farmie); tła nie mają światła.
- `setThings(list, explicit)` canvas-pig.js:421-428; element listy z `CuyScenes.placedThings` (scenes.js:364-445): `{id,itemId,url,img,x,y,anchorX,anchorY,flat,flip}` (`x` środek, `y` dolna krawędź, brak pola szerokości: szerokość = `img.naturalWidth`, a gdy obraz się jeszcze ładuje 16).
- Przeciąganie: `bindEvents` canvas-pig.js:686-733 (`pointerdown`, `pointermove` ustawia `pigX/pigY` z `toScene(e)` i przycina do `walk`; `endDrag` 721-728 przycina ponownie). `toScene(e)` (linia ~661) używa `Math.max(...)` i `offY = rect.height - sceneHeight*s` (założenie `object-fit: cover`); po PK-P39b płótno ma `object-fit: contain`, więc ma być `Math.min`.
- Poprzednie logi: `docs/opt/log/PK-P39c1.md` (siatka `this.grid`, `isFree`, `buildGrid`).
Goal: Stojące przedmioty gracza (nie płaskie dywany) blokują siatkę; upuszczona świnka ląduje na najbliższej wolnej komórce; kliknięcia i przeciąganie mapują się poprawnie na scenę przy `contain`.
Depends on: PK-P39c1, PK-P39b merged.

## Pliki i elementy
- `web/home/canvas-pig.js`: `setThings` przebudowuje siatkę (`buildGrid()` z c1) odejmując ślad każdego stojącego przedmiotu `[x-anchorX, y-4, x-anchorX+w, y]` (`w` = `img.naturalWidth || 16`; `img.onload` przebudowuje siatkę); `nearestFree(x,y)` (przeszukanie pierścieniowe BFS po komórkach, tylko w pasie); `endDrag` oraz gałąź `pointermove` przypinają `pigX/pigY` do `nearestFree`; `toScene` -> `Math.min` (pozostaje `offX = (rect.width - sceneWidth*s)/2`, `offY = rect.height - sceneHeight*s`); `debug().grid.free` odświeżane.

## Steps
1. Testy najpierw `tools/qa/ux-p39-snap.js` (Playwright, `ux.js` `openHome`, wzór ustawiania sceny jak w `ux-p39-grid.js`): W1 `drop-snaps` (upuść świnkę myszą na blocker parku: stopy w 12 px od punktu upuszczenia, w wolnej komórce, w pasie); W2 `placed-item-blocks` (po `setThings` z wysokim przedmiotem `{flat:false,x,y,anchorX,anchorY,img:{naturalWidth:24,complete:true}}` stopy świnki przez 30 s `fastForward` nigdy nie wchodzą w jego ślad; usunięcie przedmiotu zwalnia komórki: `debug().grid.free` rośnie); W3 `flat-does-not-block` (dywan `flat:true` nie zmienia `grid.free`); W4 `toscene-contain` (ustaw `.stage-viewport` na 400x300 przy scenie 256x144, kliknij narożniki wyświetlonego obrazu: `toScene` zwraca (0,0) i (sceneW,sceneH) ±1); W5 `perf` (budowa siatki 384x192 + 30 przedmiotów < 20 ms).
2. Zaimplementuj jak wyżej.
3. Uruchom Weryfikacja; popraw do zielonego.

Prohibited: zmiana lub usuwanie istniejących asercji, nowe zależności, pliki spoza „Zmieniaj", dodatkowe refaktory, zabawki (piłka, tunel, siano, domek).
Log: write `docs/opt/log/PK-P39c2.md` (max 10 linii: nazwy API (`nearestFree`), formuła śladu przedmiotu, decyzje, BLOCKED jeśli dotyczy). Do not run git.
