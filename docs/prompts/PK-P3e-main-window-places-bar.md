# PK-P3e: Main window shows the place; bar in the game style; no preview windows (wave P3e)
Zmieniaj: web/home/app.js, web/home/index.html, web/home/style.css, web/home/features/places/feature.js, web/home/features/places/feature.css, web/home/features/rooms/feature.js, web/home/features/garden/feature.js, web/home/features/farm/feature.js, web/home/features/market/feature.js, tools/qa/ux-p3-world.js, docs/opt/log/PK-P3e.md
Wymagane: tools/qa/ux-p3-world.js
Weryfikacja: node --check web/home/app.js && node --check web/home/features/places/feature.js && node --check web/home/features/rooms/feature.js && node --check tools/qa/ux-p3-world.js && node tools/qa/ux-p3-world.js && node tools/qa/ux-p3-places.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report after P3: "the switching bar does not keep the style; rooms do not scroll; clicking an arrow opens a preview but you cannot enter any of the places; the preview would be redundant once places are real." Task: the carousel changes the scene of the MAIN window (canvas from P3d), never opens a window. Replaces the P3-01..P3-03 UI from P3a.
Depends on: PK-P3d merged (read docs/opt/log/PK-P3d.md for the scene API and docs/opt/log/PK-P3c.md for messages).

## Steps
1. grep the current carousel (`places/feature.js`, `.places-arrow`, `#placesBar`, `.room-tabs`, header "House" bar) and the arrows added inside the rooms/garden/farm/market windows. Read only those ranges.
2. Remove: the arrows floating inside feature windows (the dark squares at the window edges), the old `#placesBar`/`.room-tabs` strip, the room plan button. Rooms/Garden/Farm/Market windows opened from More stay as they are for now (they become in-scene editors in P6), but contain NO carousel arrows and are not opened by the carousel.
3. One bar directly above the scene in the main window: `[<]  Place name (room name)  [>]`. It is built from `assets/ui/` pieces (`header_banner`/`tab_on` 9-slice or the existing button classes; arrows are drawn by PK-P3f, until then use the class names `ui-arrow-left/right` with the current look). Same height and font as the header buttons. Order: living room -> each pig room -> shared bedroom (if unlocked) -> garden -> park -> farm -> market -> living room. Keys left/right work when no window is open. The bar never wraps into several rows; with many rooms the active name is shown and the rest is reached by arrows.
4. Selecting a place calls the scene API of P3d for the main canvas. A locked place shows the scene dimmed with a padlock and the one-line unlock hint (existing text source), pig not walking there.
5. Pig presence: `pigLocations` from the state. In the pig's own scene it walks (P3d). In another scene a small chip under the bar says `Cuy is in <place>` with a `Go there` button (jumps the bar to that scene). When the pig exits a scene (P3d `onPigExit`) the page sends `places.pigMove`; the chip follows.
6. Test first, `tools/qa/ux-p3-world.js` (Playwright, `tools/qa/lib/ux.js`, mock state with 3 rooms + all places unlocked, one locked variant):
   - M1 `bar-style`: the bar and its arrows have a background-image from `assets/ui/` (not a flat color), font `Pixelify Sans`, height equal to the header close button, text contains no ‹ › ← → glyphs.
   - M2 `full-cycle`: 12 clicks of the right arrow visit every scene in the order above and come back to the start; left arrow reverses it; keys work.
   - M3 `scene-changes-no-window`: each step changes the canvas scene id; no overlay/modal element is created.
   - M4 `pig-only-where-it-is`: the pig sprite is drawn only in its scene; in another scene the chip shows and `Go there` jumps to the pig's scene.
   - M5 `pig-walks-through-exit`: force a roam tick; the pig's location changes, the chip text follows, state message sent once.
   - M6 `no-arrows-in-windows`: open Rooms, Garden, Farm, Market, Album from More: zero `.places-arrow`/carousel arrows inside them.
   - M7 `many-rooms`: 6 rooms: the bar is one row, no horizontal page overflow, the active room name visible, arrows reach all rooms; the Rooms window content scrolls to its bottom (scrollTop can reach scrollHeight - clientHeight).
   - M8 `locked-hint`: locked place shows the hint text and no pig.
   Keep `ux-p3-places.js` green: you may change its assertions ONLY where they check the removed tab strip/plan, and list every change in the log.
7. Verification line; fix until green. Log (max 10 lines).

## Zasady grafiki (obowiązkowe, owner wymusił po teście P3)
- Legenda stylu to `docs/STYL_SWIATA.md` (czytaj tylko pkt 0-2 i 5, ~60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#fff` i `#000`, zakaz gradientów CSS i rozmycia, `image-rendering: pixelated`, skala tylko całkowita.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, tła `assets/world/bg/*`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko, gdy w bibliotece naprawdę nie ma, i wtedy: skrypt w `tools/art/` rysujący tylko kolorami palety, wpis w `ui.json` lub `atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu (belka, strzałki, cofnij, zamknij, przyciski) mają wyglądać jak reszta okna gry: panel/9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font`. Żadnych własnych SVG, glifów tekstowych (✕ ← → ‹ ›) ani domyślnych kontrolek przeglądarki.

Prohibited: changing or deleting existing test assertions (poza wskazanymi), new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P3e.md` (max 10 lines). Do not run git.
