# PK-P3f: Arrows, back and close from the game's pixel-art UI library (wave P3f)
Zmieniaj: tools/art/ui_arrows.py, assets/ui/arrow_left.png, assets/ui/arrow_left_pressed.png, assets/ui/arrow_right.png, assets/ui/arrow_right_pressed.png, assets/ui/back_btn.png, assets/ui/back_btn_pressed.png, assets/ui/ui.json, web/home/style.css, web/home/app.js, web/home/assets/ui/back.svg, web/home/assets/ui/close.svg, tools/qa/ux-p3-icons.js, docs/qa/shots/, docs/opt/log/PK-P3f.md
Wymagane: tools/qa/ux-p3-icons.js
Weryfikacja: node --check web/home/app.js && node --check tools/qa/ux-p3-icons.js && node tools/qa/ux-p3-icons.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report after P3: "back and close X are only so-so" (screens: the Garden window has a thin white X, the Album has an arrow and an X that differ from the header X; the bar arrows are flat boxes). P3b drew new SVGs instead of using the game library. Task: ONE set of pixel PNG controls in the game style used everywhere; delete the SVGs.
Depends on: PK-P3e merged (it uses the class names ui-arrow-left/right).

## Steps
1. Look at the existing controls once: `assets/ui/close_btn.png` (+`_pressed`), `btn_normal.png`, `tab_on.png`, `header_banner.png`, `ui.json`, and how the header close button uses them in `style.css`. The header X (dark wooden button with a light cross) is the reference for everything.
2. Use `close_btn.png`/`close_btn_pressed.png` for EVERY close control in every window (feature windows, More, Album, dialogs). No new close art.
3. New art only for what the library lacks, drawn by `tools/art/ui_arrows.py` with palette colors only, same wooden frame, same size and outline as `close_btn.png`: `arrow_left`, `arrow_right` (bar arrows) and `back_btn` (a back arrow in the same wooden button as the close X), each with a `_pressed` variant. Register them in `ui.json`.
4. `style.css`/`app.js`: one shared class for close, one for back, one for the bar arrows (`ui-arrow-left/right`), all using these PNGs with `image-rendering: pixelated`, integer scale, hit area at least 32x32 CSS px, `aria-label` kept, hover/active/focus-visible states using the `_pressed` art. Remove `web/home/assets/ui/back.svg` and `close.svg` and every CSS rule and text glyph that used the old faces.
5. Rewrite `ux-p3-icons.js` (you may replace the I1-I4 of P3b; keep their intent):
   - I1 `same-asset`: every close control in at least 8 windows has the same computed background-image (`close_btn.png`); every back control the same (`back_btn.png`); bar arrows `arrow_*.png`.
   - I2 `size-and-hit`: >= 32x32, visible, `aria-label`.
   - I3 `works`: back returns to More, close closes, Escape closes.
   - I4 `no-glyph-no-svg`: no ✕ ← → ‹ › as text, no `<svg>` or `.svg` background as control face.
   - I5 `screens`: with Playwright save screenshots (deviceScaleFactor 2) of the home window with the bar, More, the Garden window, the Album, to `docs/qa/shots/p3f-*.png` so the owner can look.
6. Verification line; fix until green. Log (max 10 lines) and list the screenshot files.

## Zasady grafiki (obowiązkowe, owner wymusił po teście P3)
- Legenda stylu to `docs/STYL_SWIATA.md` (czytaj tylko pkt 0-2 i 5, ~60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#fff` i `#000`, zakaz gradientów CSS i rozmycia, `image-rendering: pixelated`, skala tylko całkowita.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, tła `assets/world/bg/*`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko, gdy w bibliotece naprawdę nie ma, i wtedy: skrypt w `tools/art/` rysujący tylko kolorami palety, wpis w `ui.json` lub `atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu (belka, strzałki, cofnij, zamknij, przyciski) mają wyglądać jak reszta okna gry: panel/9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font`. Żadnych własnych SVG, glifów tekstowych (✕ ← → ‹ ›) ani domyślnych kontrolek przeglądarki.

Prohibited: changing or deleting existing test assertions (poza wskazanymi), new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P3f.md` (max 10 lines). Do not run git.
