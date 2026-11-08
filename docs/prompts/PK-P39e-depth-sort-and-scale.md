# PK-P39e: Pig scale per scene and passing behind objects
Zmieniaj: web/home/canvas-pig.js, web/home/features/places/scenes.js, tools/qa/ux-p39-depth.js, docs/opt/log/PK-P39e.md
Wymagane: tools/qa/ux-p39-depth.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check web/home/features/places/scenes.js && node --check tools/qa/ux-p39-depth.js && node tools/qa/ux-p39-depth.js && node tools/qa/ux-p34-pig-walk.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
## Kontekst (fakty zweryfikowane 8.11.2026, nie szukaj drugi raz)
- Cel: każde miejsce to scena w głównym oknie Home (widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y). Dane scen: `assets/data/place_scenes.json` (słownik `scenes` z kluczami `room`, `garden`, `park`, `farm`, `market`; pola snake_case: `kind`, `size`, `walk` [x0,y0,x1,y1], `depth_scale`, `bg`, `exits`). Pokoje domku (salon, `pig:<id>`, dorm) używają szablonu `room` (240x130, bez `bg`). `features/places/scenes.js` `def(id,tod)` (linie 311-345) zwraca camelCase `{id,kind,title,size,walk,depthScale,bgUrl,exits}`. Płótno: `web/home/canvas-pig.js` (klasa `PigCanvas`, API `CanvasPig.*`, instancja `window.CuyPig.mainInstance`).
- Test właściciela 7.11: świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; scena jest przycięta (drzewa w parku, domek na farmie); tła nie mają światła.
- Skala: `getDrawScale()` canvas-pig.js:438-445 = lerp(`depthScale[0]`, `depthScale[1]`, (pigY-y0)/(y1-y0)) zaokrąglone do 1/8; sprite 64x64 (`FRAME_SIZE`) rysowany od stóp (32,59) w `drawPig` ~1285. Szerokość ciała dorosłej świnki ~46 px (`PIG_SHADOW_WIDTH.adult`, linia ~257). Przy dzisiejszej skali 1.0 świnka ma ~19% szerokości pokoju (240), ~18% ogrodu (256), tylko ~12% parku (384).
- Rysowanie: kolejność w `draw` canvas-pig.js:1050-1090 (tło, płaskie, stojące za świnką, światło, `drawPig` linia ~1072, stojące przed świnką). Tło to `this.sceneBgImg` (obraz 1:1 do rozmiaru sceny). `applySceneLight(ctx, scene)` 1347 mnoży całe płótno przez ambient.
- Dane: `scene.blockers[].occlude` z PK-P39a, przekazane w `def()` przez PK-P39c1 (`CuyScenes.def(id).blockers`).
Goal: Świnka ma proporcjonalny rozmiar do sceny, jest mniejsza wyżej, a obiekty tła, za którymi stoi (jej stopy wyżej niż podstawa obiektu), ją przesłaniają.
Depends on: PK-P39a, PK-P39c1, PK-P39c2, PK-P39d merged (ten sam canvas-pig.js; światło z P39d stosowane do przesłony).

## Pliki i elementy
- `web/home/features/places/scenes.js` `def()`: dodaj `pigWidthFrac: typeof template.pig_width_frac === 'number' ? template.pig_width_frac : null` (JSON nie jest w „Zmieniaj", pole opcjonalne).
- `web/home/canvas-pig.js`: stała `PIG_BODY_W = 46`; w `setScene` `this.pigWidthFrac = def.pigWidthFrac ?? (kind === 'room' ? 0.19 : 0.17)`; `getDrawScale()`: skala dołu pasa `sb = pigWidthFrac * sceneWidth / PIG_BODY_W`, góry `sb * depthScale[0] / depthScale[1]`, lerp po `pigY`, zaokrąglenie do 1/8 (pokój 240 px daje ~1.0 jak dziś, park ~1.4, ogród ~0.95); `debug().pig` rozszerz o `bodyW` (= `PIG_BODY_W * scale`); `drawOcclusion(ctx)` wołane tuż po `drawPig`: dla każdego blockera z `occlude`, gdy `pigY < rect.y1` i `pigX` w `[occlude.x0 - 28*scale, occlude.x1 + 28*scale]`: `ctx.save(); clip na occlude; drawImage(sceneBgImg, ox,oy,w,h, ox,oy,w,h); jeśli this.lightScene: applySceneLight(ctx, this.lightScene); ctx.restore()`. `behind_line` pozostaje niewykorzystane (zapisz w logu).

## Steps
1. Testy najpierw `tools/qa/ux-p39-depth.js` (Playwright, `ux.js` `openHome`, `CanvasPig.setScene(CuyScenes.def(id,'day'))`, `mainInstance.pigX/pigY` ustawiane wprost): D1 `scale-monotonic` (skala u góry pasa < u dołu, obie w `depthScale` ±1/8, każda scena); D2 `proportion` (`debug().pig.bodyW / sceneWidth` na dole pasa 0,14-0,20 plener i 0,16-0,24 pokój); D3 `behind-covers` (garden, blocker `fountain` z `occlude`: stopy świnki nad jego podstawą i `pigX` w jego zakresie -> piksele w `occlude` równe pikselom samego tła (render z `setPigVisible(false)` jako wzorzec); stopy poniżej -> piksele świnki widoczne); D4 `whole-pixels` (`pig.x/y` całkowite po draw, rozmiar rysowanej klatki całkowity); D5 `room-no-regression` (salon: skala na dole >= 0,98 i wszystkie skale w [0.88, 1.0]).
2. Zaimplementuj jak wyżej.
3. Uruchom Weryfikacja (zawiera `ux-p34-pig-walk.js` jako test regresji); popraw do zielonego.

Prohibited: zmiana lub usuwanie istniejących asercji, nowe zależności, pliki spoza „Zmieniaj", dodatkowe refaktory, zabawki (piłka, tunel, siano, domek).
Log: write `docs/opt/log/PK-P39e.md` (max 10 linii: domyślne `pigWidthFrac` per rodzaj sceny i zmierzone skale per scena, `bodyW`, ograniczenia przesłony, BLOCKED jeśli dotyczy). Do not run git.
