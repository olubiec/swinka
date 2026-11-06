# PK-P3c: Core: where each pig is (place and room) and scene data (wave P3c)
Zmieniaj: src/Cuy.Core/Pigs/PigLocation.cs, src/Cuy.Core/GameState.PigLocation.cs, assets/data/pig_roaming.json, assets/data/place_scenes.json, src/Cuy/dotNet/Features/PlacesFeature.cs, tests/Cuy.Core.Tests/PigLocationTests.cs, tools/qa/place-scenes-check.js, docs/opt/log/PK-P3c.md
Wymagane: tests/Cuy.Core.Tests/PigLocationTests.cs, tools/qa/place-scenes-check.js
Weryfikacja: dotnet build src/Cuy.Core/Cuy.Core.csproj -c Release && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PigLocation" && node tools/qa/place-scenes-check.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report after P3: "the pig can be in one room, and when we browse to other places nothing physical exists; the places are only previews, you cannot walk into them." This package gives the world the missing facts: each pig has ONE location, places have scene data (floor band, exits). Pulls forward P5-01 (Core location) from docs/PLAN_POPRAWEK_UX.md; P5-01 shrinks to "multi-pig on desktop".
Depends on: P3a and P3b merged (origin/main 5240b13).

## Steps
1. grep for the existing places model (`PlacesFeature.cs`, `st.places`, unlock state of garden/park/farm/market) and the existing pig roster. Read only those ranges. Reuse the existing unlock check; do not invent a second one.
2. `assets/data/place_scenes.json` (data only, no code reads numbers from anywhere else). Order of places: house (rooms in their existing order) -> garden -> park -> farm -> market, wrapping. For every scene: `id`, `kind` (`room`|`outdoor`), `bg` per time of day pointing to existing files in `assets/world/bg/` (garden_morning/day/evening/night, park_*, farm, market; rooms use the room wallpaper+floor, no bg file), `size` of the bg [w,h] (garden/farm/market 256x144, park 384x192), `walk` = floor band rectangle [x0,y0,x1,y1] in bg pixels where pigs may stand (take it from where the ground really is: open the PNG once to look), `depth_scale` [far,near] e.g. [0.82,1.0], `exits` = {left:{to,x}, right:{to,x}} (door/gate/path at the scene edge; the exit to the previous/next place in the order).
3. `assets/data/pig_roaming.json`: `interval_min_s`, `interval_max_s` (random wait before a free pig moves), `night_sleep_in_own_room` true, `pinned_default` false.
4. Tests FIRST, `tests/Cuy.Core.Tests/PigLocationTests.cs` with `ManualClock` and a seeded random:
   - L1 `start`: new game, the starter pig is at house/salon, free.
   - L2 `adjacent-only`: after the interval a free pig moves only to a neighbouring scene through an exit (house room <-> neighbouring room, last room <-> garden, garden <-> park, ...).
   - L3 `locked-skipped`: never moves into a locked place; if the only neighbour is locked, stays.
   - L4 `pinned-stays`: a pinned pig does not move however much time passes.
   - L5 `one-location`: a pig is never in two scenes; two pigs may share one scene.
   - L6 `old-save`: an old save without the field loads with every pig at house/salon, free, nothing duplicated.
   - L7 `deterministic`: same seed + same clock = same route.
5. Implement `PigLocation` (pure Core, no UI), saved with safe defaults. In `PlacesFeature.cs` add messages: state now includes `pigLocations` [{pigId, place, room, pinned}]; command `places.pigMove {pigId,to}` (validated in Core: neighbour + unlocked) and `places.pigPin {pigId,pinned}`. The tick is driven by the existing game clock (grep how other Core features tick).
6. `tools/qa/place-scenes-check.js` (Node, no deps): every bg file exists, `walk` lies inside `size`, every `exits.to` resolves, the loop of exits closes, `depth_scale` far<=near<=1.
7. Verification line; fix until green. Log with the exact JSON field names and message names (P3d/P3e read the log).

## Zasady grafiki (obowiązkowe, owner wymusił po teście P3)
- Legenda stylu to `docs/STYL_SWIATA.md` (czytaj tylko pkt 0-2 i 5, ~60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#fff` i `#000`, zakaz gradientów CSS i rozmycia, `image-rendering: pixelated`, skala tylko całkowita.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, tła `assets/world/bg/*`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko, gdy w bibliotece naprawdę nie ma, i wtedy: skrypt w `tools/art/` rysujący tylko kolorami palety, wpis w `ui.json` lub `atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu (belka, strzałki, cofnij, zamknij, przyciski) mają wyglądać jak reszta okna gry: panel/9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font`. Żadnych własnych SVG, glifów tekstowych (✕ ← → ‹ ›) ani domyślnych kontrolek przeglądarki.

Prohibited: changing or deleting existing test assertions (poza wskazanymi), new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P3c.md` (max 10 lines). Do not run git.
