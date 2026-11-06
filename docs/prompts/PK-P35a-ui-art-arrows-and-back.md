# PK-P35a: New pixel-art UI pieces: arrows and back button in the game library (wave P35)
Zmieniaj: tools/art/ui_arrows.py, assets/ui/arrow_left.png, assets/ui/arrow_left_pressed.png, assets/ui/arrow_right.png, assets/ui/arrow_right_pressed.png, assets/ui/back_btn.png, assets/ui/back_btn_pressed.png, assets/ui/ui.json, docs/qa/shots/p35a-ui-pieces.png, docs/opt/log/PK-P35a.md
Wymagane: assets/ui/ui.json
Weryfikacja: python3 tools/art/ui_arrows.py && python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt && node tools/qa/check-assets.js && node tools/qa/check-icons.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The owner said the back arrow, the close X and the bar arrows do not match the game. Previously agents drew SVGs from scratch. Here: the library gets arrow and back pieces that are visibly the same family as the existing `close_btn.png`; the close X is NOT redrawn (the existing `close_btn.png` is the reference and is used everywhere).
Depends on: nothing (runs in parallel with PK-P35b; disjoint files).

## Steps
1. Open (Read tool, images are shown; rule lifted for these) `assets/ui/close_btn.png`, `close_btn_pressed.png`, `btn_normal.png`, `tab_on.png`, `header_banner.png`, plus `assets/ui/ui.json` entries of them. Print their pixel colors with a tiny python snippet (palette names via `assets/data/style_palette.json`) to learn the frame: outline color, bevel, fill, size 16x16.
2. `tools/art/ui_arrows.py` (re-runnable, deterministic, palette colors only, outline `#3a1d17`): draws six 16x16 PNGs with EXACTLY the same wooden button frame, outline, highlight and shadow as `close_btn.png` and the same pressed offset as `close_btn_pressed.png`: `arrow_left`, `arrow_right` (a chunky pixel chevron in linen, 2 px stroke, hand-made slightly uneven like the cross on the X), `back_btn` (a pixel arrow pointing left with a short tail, same linen color). Each with `_pressed`.
3. Register the six in `assets/ui/ui.json` with `size` [16,16] and no slice (fixed size icons; look at how `close_btn` is registered and copy the shape).
4. Contact sheet `docs/qa/shots/p35a-ui-pieces.png`: scale x8 nearest-neighbour, on the `--ui-bg` color, showing close_btn, back_btn, arrow_left, arrow_right and their pressed versions side by side, labelled only by position (no extra text rendering needed; order in the log). The owner will look at it; make it large and clear.
5. Verification line (the script is idempotent; the first command regenerates the PNGs). `style_check.py` must show no new errors against the baseline. Log: file list and one sentence about the family look.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, `bg/`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko gdy w bibliotece naprawdę go nie ma: skrypt w `tools/art/` rysujący wyłącznie kolorami palety, wpis w `ui.json`/`atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu mają wyglądać jak reszta okna gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font` (Pixelify Sans), rozmiary `--ui-fs-*`, odstępy wielokrotności 4 px. Zakaz własnych SVG, glifów tekstowych (✕ ← → ‹ ›) i domyślnych kontrolek przeglądarki.
- Reguła zamykania: jeśli nie wiesz, jak coś ma wyglądać, otwórz najbliższy istniejący element gry (np. nagłówek okna Home z X i koniczynkami) i skopiuj jego klasy i zasoby.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P35a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
