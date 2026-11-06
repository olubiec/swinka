# PK-P3d: Scene engine: every place is a walkable pseudo-3D scene (wave P3d)
Zmieniaj: web/home/canvas-pig.js, web/home/features/places/scenes.js, web/home/features/places/mock.js, tools/qa/ux-p3-scenes.js, docs/opt/log/PK-P3d.md
Wymagane: tools/qa/ux-p3-scenes.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check web/home/features/places/scenes.js && node --check tools/qa/ux-p3-scenes.js && node tools/qa/ux-p3-scenes.js && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Owner decision after the P3 test: "I wanted a full 3D room for EVERY place where the pig can move freely; the nice backgrounds of the garden, market etc. are not deployed as places; the preview would then be redundant." Meaning (decided, do not ask): not real 3D/WebGL (it breaks the pixel-art legend) but a pseudo-3D scene: front view from above, a floor band with depth, the pig moves in x AND y, scales with depth, is hidden behind things that stand lower on the screen. Same engine for rooms and outdoor places.
Depends on: PK-P3c merged (read docs/opt/log/PK-P3c.md for the JSON field names; data in assets/data/place_scenes.json).

## Steps
1. grep `canvas-pig.js` for the scene (`sceneWidth`, `floorY`, `drawHabitat`, `addLayer`, pig `pigX`, walk logic) and read only those ranges. Today the pig walks on one line at `floorY`, the scene is 240x130 and all places look like the house.
2. New `features/places/scenes.js` (one file, no new abstractions): loads `place_scenes.json`; `CuyScenes.set(placeId, roomId)` picks the scene, loads its bg PNG for the current time of day (use the existing ambient/time of day value, do not add a clock), exposes the floor band, scale range and exits. `mock.js` gives the browser tests a fake `pigLocations` and scenes.
3. `canvas-pig.js`: the canvas size follows the scene (bg size; keep integer scaling with `object-fit: cover` logic that exists). Draw order = bg, flat things, then everything standing on the floor sorted by its bottom edge (props and pigs together), then light layers. A room scene keeps today's wallpaper+floor drawing. Pig state gets `pigY`; walking picks targets inside the `walk` band (2D), speed and sprite scale from depth (`depth_scale`), `imageSmoothingEnabled=false`, positions rounded to whole pixels.
4. Exits: a free pig that walks to an exit emits `onPigExit({to})` (the page sends `places.pigMove`); a pig arriving from another scene enters at the matching exit edge walking inwards. Pinned pig never walks to an exit. A scene where the pig is not present draws no pig.
5. Placed things: draw the decorations that are already saved for the scene (house rooms from `st.rooms.layouts`, garden/park/farm/market from their existing saved layouts; grep how each feature stores them) at their saved positions, y-sorted. Only drawing, no editing, no saving.
6. Test first, `tools/qa/ux-p3-scenes.js` (Playwright via `tools/qa/lib/ux.js`, uses the mock):
   - E1 `own-background`: for each of the 5 places (and 2 house rooms) the scene id and the bg file differ; garden at night uses the night file.
   - E2 `walks-in-2d`: over 12 s a free pig's y changes by at least 12 px and x covers 60% of the band width; it never leaves the `walk` band.
   - E3 `depth`: the same pig drawn lower on the screen is larger (ratio within `depth_scale`) and drawn after a prop whose bottom is higher.
   - E4 `exit-and-enter`: force the pig to an exit: `onPigExit` fires once with the right `to`; after `set(to)` the pig appears at the opposite edge.
   - E5 `absent-pig`: scene without the pig draws zero pig sprites.
   - E6 `placed-things`: a saved decoration in the layout is drawn at its saved position, and a lower one covers a higher one.
   - E7 `pixel-clean`: smoothing off; the drawn frame contains only colors from `style_palette.json` plus the pig/prop sprite colors (use the existing palette-test helper if it fits, else sample the bg only).
7. Verification line; fix until green. Log (max 10 lines): API names for P3e.

## Zasady grafiki (obowiązkowe, owner wymusił po teście P3)
- Legenda stylu to `docs/STYL_SWIATA.md` (czytaj tylko pkt 0-2 i 5, ~60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#fff` i `#000`, zakaz gradientów CSS i rozmycia, `image-rendering: pixelated`, skala tylko całkowita.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, tła `assets/world/bg/*`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko, gdy w bibliotece naprawdę nie ma, i wtedy: skrypt w `tools/art/` rysujący tylko kolorami palety, wpis w `ui.json` lub `atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu (belka, strzałki, cofnij, zamknij, przyciski) mają wyglądać jak reszta okna gry: panel/9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font`. Żadnych własnych SVG, glifów tekstowych (✕ ← → ‹ ›) ani domyślnych kontrolek przeglądarki.

Prohibited: changing or deleting existing test assertions (poza wskazanymi), new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P3d.md` (max 10 lines). Do not run git.
