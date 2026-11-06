# PK-P3b: One back arrow and one close X in the game style (package, wave P3)
Zmieniaj: web/home/style.css, web/home/app.js, web/home/assets/ui/back.svg, web/home/assets/ui/close.svg, tools/qa/ux-p3-icons.js, docs/opt/log/PK-P3b.md
Wymagane: tools/qa/ux-p3-icons.js
Weryfikacja: node --check web/home/app.js && node --check tools/qa/ux-p3-icons.js && node tools/qa/ux-p3-icons.js && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report: "Back arrow and close X in More and feature windows do not match the game design." Task P3-04: one shared pair of icons used by every feature window and More.
Depends on: PK-P3a merged (it edits app.js and style.css first).

## Steps
1. grep how the back button and close X are drawn now (`.back`, `.close`, `modal-close`, `✕`, `←` in `app.js`, `style.css`, `features/*/feature.js`). Read only those ranges.
2. Test first: `tools/qa/ux-p3-icons.js` with `tools/qa/lib/ux.js`; run before the fix.
   - I1 `same-icons`: open More and at least 6 feature windows from it; every back control and every close control uses the same asset/class (same computed background-image or same inline SVG markup).
   - I2 `size-and-hit`: each is at least 32x32 CSS px, visible, with `aria-label` ("Back", "Close").
   - I3 `works`: back returns to More, close closes the window; Escape closes.
   - I4 `no-text-glyph`: no raw `✕`/`←` text characters left as the button face.
3. Create `assets/ui/back.svg` and `close.svg` in the style of the existing UI (take colors from CSS variables already in `style.css`; use `currentColor`). Replace the old faces with them through shared CSS classes; avoid editing each feature file if one CSS rule suffices.
4. Verification line; fix until green. Log (max 10 lines).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P3b.md` (max 10 lines). Do not run git.
