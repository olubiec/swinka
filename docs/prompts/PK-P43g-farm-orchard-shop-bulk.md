# PK-P43g: Farm: orchard slots, shop and bulk buttons in the scene
Zmieniaj: web/home/features/farm/feature.js, web/home/features/farm/feature.css, tools/qa/ux-p43-farm-extras.js, docs/opt/log/PK-P43g.md
Wymagane: tools/qa/ux-p43-farm-extras.js
Weryfikacja: node --check web/home/features/farm/feature.js && node --check tools/qa/ux-p43-farm-extras.js && node tools/qa/ux-p43-farm-extras.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: On the farm scene: `Harvest all` and `Water all` buttons, orchard slot hotspots and the shop hotspot panel.
Depends on: PK-P43d merged (same file, so a later wave).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `web/home/features/farm/feature.js`: handlers already at lines 258 (`farm_harvest_all`), 265 (water all = loop of `farm_water`), 269 (`farm_buy {what}`), 272 (`orchard_plant {slot, cropId:"apple"}`), 275 (`orchard_harvest {slot}`). Reuse them; hotspots `orchard:<n>` and `shop` from PK-P43a.
- `bulk strip`: two library buttons in a strip under the scene bar, visible only when the scene is `farm`.

## Steps
1. Read PK-P43d log.
2. Tests FIRST (`ux-p43-farm-extras.js`): X1 `harvest-all-and-water-all`, X2 `orchard-empty-slot-plants`, X3 `orchard-ready-harvests`, X4 `shop-panel-buys`, X5 `strip-hidden-outside-farm`, X6 `panels-inside-window`.
3. Implement; run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P43g.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
