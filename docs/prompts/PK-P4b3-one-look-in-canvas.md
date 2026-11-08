# PK-P4b3: Web: one look source in the room canvas
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p4-look.js, docs/opt/log/PK-P4b3.md
Wymagane: tools/qa/ux-p4-look.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p4-look.js && node tools/qa/ux-p4-look.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The room canvas draws the starter pig from the roster entry only (same `look` as its portrait) and never as Kuki; drawing never depends on a second source. Task P4-01 (web side).
Depends on: PK-P4a2 merged (resolver contract in docs/opt/log/PK-P4a2.md).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `web/home/canvas-pig.js`: `KNOWN_NAMED_PIGS` (line 17, includes `cuy`), `normStage` (20), `normBreed` (26), `resolveLook(pig, stageOverride)` (57), `spriteFor(pig, stageOverride)` (178), `resolveSheet(breed,stage,paletteId,namedId)` (1516), `renderPortrait(look,stage,size)` (1527). Change only `resolveLook`/`spriteFor` so a pig with `look.spriteKey` or without `namedId` never resolves to a named sheet; mirror the Core contract.
- `web/home/features/pigs/feature.js`: its own copy of `resolveLook` (line 80) and `spriteFor` (201). Do NOT edit (PK-P4b2 owns the file); the test only compares outputs.
- `tools/qa/ux-p4-look.js (NEW)`: Playwright via `tools/qa/lib/ux.js`; read `CanvasPig.debug()` and the portrait `img[data-sprite-key]`/`attrSpriteKey` attribute.

## Steps
1. Tests FIRST: K1 `starter-not-kuki` (mock state with starter pig: spriteKey does not contain `/kuki/`); K2 `canvas-equals-portrait` (the canvas look key equals the portrait look key for the same roster entry, all stages); K3 `kuki-keeps-sheet` (Kuki roster entry still resolves to the Kuki sheet); K4 `no-namedId-default` (no `namedId` -> default ginger).
2. Fix `resolveLook`/`spriteFor` minimally; no refactor of the 1748-line file.
3. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P4b3.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
