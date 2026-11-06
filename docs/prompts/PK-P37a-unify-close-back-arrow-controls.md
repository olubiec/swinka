# PK-P37a: One close, one back and one arrow control everywhere, from the PNG library (wave P37)
Zmieniaj: web/home/style.css, web/home/app.js, web/home/assets/ui/back.svg, web/home/assets/ui/close.svg, web/home/features/places/feature.css, tools/qa/ux-p3-icons.js, docs/qa/shots/, docs/opt/log/PK-P37a.md
Wymagane: tools/qa/ux-p3-icons.js
Weryfikacja: node --check web/home/app.js && node --check tools/qa/ux-p3-icons.js && node tools/qa/ux-p3-icons.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Owner screens: the Garden window has a thin white X, the Album a different arrow and X than the header X (a big dark wooden one). Make every close control look and behave like the header X, every back control like `back_btn.png`, every bar arrow like `arrow_*.png`; delete the SVGs of P3b.
Depends on: PK-P35a and PK-P36a merged.

## Kontekst świata (fakty, nie szukaj ich drugi raz)
- Docelowa wizja właściciela: KAŻDE miejsce (pokoje domku, ogród, park, farma, targ) jest prawdziwą sceną w głównym oknie Home, po której świnka swobodnie chodzi. To pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, jest większa bliżej dołu ekranu i zasłaniana przez rzeczy stojące niżej. NIE prawdziwe 3D/WebGL. Okna „podglądu" miejsc mają zniknąć, bo scena jest w głównym oknie.
- Kolejność scen (pierścień): pokoje domku (salon, pokoje świnek `pig:<id>`, wspólna sypialnia `dorm`) -> `garden` -> `park` -> `farm` -> `market` -> z powrotem salon.
- Tła są gotowe: `assets/world/bg/` garden_{morning,day,evening,night}.png, farm.png, market.png (256x144), park_{morning,day,evening,night}.png (384x192). Pokoje rysuje dziś `drawHabitat` w `web/home/canvas-pig.js` (scena 240x130, `floorY` ok. 119, system warstw `addLayer(name, z, drawFn)`).
- Moduł miejsc w JS: `web/home/features/places/feature.js` (`window.CuyPlaces`, `DEFAULT_PLACES`, `S.currentPlace`). Pliki F: `web/home/features/{rooms,garden,farm,market}/feature.js`. Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`).
- Stan 6.11: P3a/P3b dały karuzelę i SVG-i, które NIE przeszły testu właściciela (zły styl, brak scen). Nie przywracaj ich.

## Steps
1. grep `style.css`, `app.js` and `features/*/feature.css|js` for the ways close and back are drawn: `.modal-close`, `.back`, `✕`, `←`, `×`, `close.svg`, `back.svg`, `close_btn`. Read only those ranges. The reference is the header close button (`assets/ui/close_btn.png` and `_pressed`).
2. Define three shared classes in `style.css`: `.ui-close` (background `assets/ui/close_btn.png`, `:active` the pressed png), `.ui-back` (`back_btn.png`), and keep `.ui-arrow-left/right` from P36a. All: 16x16 art shown at 32x32 CSS px (x2, `image-rendering: pixelated`), `aria-label` kept ("Close", "Back", "Previous place", "Next place"), visible `:focus-visible` outline using `--ui-hay-2`, no text node inside. Replace every old face in `app.js` and the feature files by these classes (prefer changing the shared builder function; avoid editing each feature if one rule suffices).
3. Delete `web/home/assets/ui/back.svg` and `close.svg` and every rule or glyph that used them or any raw `✕ ← → ‹ ›`.
4. Rewrite `ux-p3-icons.js` (you may replace I1-I4 of P3b; keep their intent):
   - I1 `same-asset`: in at least 8 windows (Shop, Games, Rooms, Garden, Farm, Market, Album, Diary, Settings, ...) the close control's computed `background-image` ends with `close_btn.png`; back controls `back_btn.png`; bar arrows `arrow_left.png`/`arrow_right.png`.
   - I2 `size-and-hit`: each >= 32x32, visible, has `aria-label`.
   - I3 `works`: back returns to More, close closes, Escape closes.
   - I4 `no-glyph-no-svg`: no `✕ ← → ‹ ›` text, no `<svg>` and no `.svg` background on controls.
   - I5 `screens`: Playwright screenshots (deviceScaleFactor 2) to `docs/qa/shots/p37-*.png`: home with the bar (garden scene), More, Garden window, Album, Rooms window. The owner will judge them.
5. Run the Weryfikacja line; fix until green. Log the screenshot files.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, `bg/`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko gdy w bibliotece naprawdę go nie ma: skrypt w `tools/art/` rysujący wyłącznie kolorami palety, wpis w `ui.json`/`atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu mają wyglądać jak reszta okna gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font` (Pixelify Sans), rozmiary `--ui-fs-*`, odstępy wielokrotności 4 px. Zakaz własnych SVG, glifów tekstowych (✕ ← → ‹ ›) i domyślnych kontrolek przeglądarki.
- Reguła zamykania: jeśli nie wiesz, jak coś ma wyglądać, otwórz najbliższy istniejący element gry (np. nagłówek okna Home z X i koniczynkami) i skopiuj jego klasy i zasoby.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P37a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
