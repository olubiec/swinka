# PK-P4b2: Web: adoption popup, grey silhouettes, countdown
Zmieniaj: web/home/features/pigs/adoption-popup.js, web/home/features/pigs/feature.js, web/home/features/pigs/mock.js, web/home/index.html, tools/qa/ux-p4-adoption.js, docs/opt/log/PK-P4b2.md
Wymagane: tools/qa/ux-p4-adoption.js
Weryfikacja: node --check web/home/features/pigs/feature.js && node --check web/home/features/pigs/adoption-popup.js && node --check web/home/features/pigs/mock.js && node --check tools/qa/ux-p4-adoption.js && node tools/qa/ux-p4-adoption.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Window "Two pigs are waiting for adoption" with Kuki and Ned as grey silhouettes (no icon, name `???`), countdown `Xd Yh Zm`, Accept button; Kuki and Ned absent from the pigs list before adoption; no rename for named pigs. Tasks P4-03, P4-04 (web) + owner addendum 7.11.
Depends on: PK-P4b1 merged (field names in docs/opt/log/PK-P4b1.md and docs/contracts/pigs.md).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).


## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `web/home/features/pigs/feature.js`: 1012 lines. `formatRemaining(ms)` (line 4, reuse for `Xd Yh Zm`), `renderPigPortrait(pig,size)` (246), `getFallbackOffers(roster)` (313; Kuki/Ned/James/Glen/Racuch fallbacks - filter Kuki/Ned out while `state.adoption.status != "open"`), `getOfferRemainingMs` (227). Hide the rename control for pigs with `namedId`.
- `web/home/features/pigs/adoption-popup.js (NEW)`: `window.CuyAdoptionPopup = { open(state), close(), isOpen() }`; opened on `adoption_available` (listen via the bridge message listener used in `feature.js`) and from a "waiting" row in the My Pigs list. Silhouette = the pig portrait drawn with a flat grey from the palette (no icon, no name, `???`) until status is `open`; after Accept the roster shows real look and name.
- `web/home/features/pigs/mock.js`: 166 lines, Kuki/Ned entries at lines ~60 and ~80 with `look`. Add `CuyPigsMock.state("adoption-closed"|"adoption-waiting"|"adoption-open")` and a way to emit `adoption_available`; Accept (`adopt_group`) moves both pigs to the roster.
- `web/home/index.html`: add the `<script>` for `adoption-popup.js` next to the pigs scripts only if features are not loaded through `features/index.json`.
- `tools/qa/ux-p4-adoption.js (NEW)`: Playwright via `tools/qa/lib/ux.js` (`openHome`, `openMore`, `openFromMore`).

## Steps
1. Tests FIRST: D1 `hidden-before` (fresh mock: Kuki and Ned not on the list); D2 `popup-shows` (event opens popup with 2 grey silhouettes, no name text other than `???`, Accept button); D3 `countdown-format` (`2d 3h 5m`, regex `^\d+d \d+h \d+m$`); D4 `accept` (exactly one `adopt_group {groupId:"starter"}`; after state update both on the list with real names, popup gone); D5 `no-rename` (no rename control for Kuki/Ned); D6 `random-adoption-excludes` (random adoption picker never returns Kuki/Ned while status != open).
2. Implement popup, list filtering, mock states. Do not edit `canvas-pig.js` (PK-P4b3).
3. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P4b2.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
