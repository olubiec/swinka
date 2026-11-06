# PK-P3a: Places carousel with arrows (package, wave P3)
Zmieniaj: web/home/features/places/feature.js, web/home/features/places/feature.css, web/home/app.js, web/home/index.html, web/home/style.css, web/home/features/rooms/feature.js, web/home/features/garden/feature.js, web/home/features/farm/feature.js, web/home/features/market/feature.js, tools/qa/ux-p3-places.js, docs/opt/log/PK-P3a.md
Wymagane: tools/qa/ux-p3-places.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check web/home/app.js && node --check web/home/features/rooms/feature.js && node --check tools/qa/ux-p3-places.js && node tools/qa/ux-p3-places.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report: "Home, garden, park, farm and market should be separate windows with arrows on the sides; a locked place shows what unlocks it; the old house plan goes away." Tasks P3-01, P3-02, P3-03, P3-05 from docs/PLAN_POPRAWEK_UX.md (section "Fala P3").
Depends on: P2 merged.

## Steps
1. Find the current place tabs/bar and the place list (grep `places`, `data-place` in `web/home/app.js`, `index.html`, `features/*`). Read only those ranges. If a feature folder from "Zmieniaj" does not exist, skip it and note it in the log.
2. Test first: `tools/qa/ux-p3-places.js` with `tools/qa/lib/ux.js` (PASS/FAIL, exit 1 on FAIL or page error); run before the fix, note failures in the log.
   - A1 `arrow-cycle`: the right arrow visits every place from the `places` list once and returns to the first; the left arrow goes backwards; keys ArrowLeft/ArrowRight do the same unless focus is in an input.
   - A2 `own-window`: each place renders its own view; exactly one place container is visible (`data-place` differs per place) and no leftover DOM of the previous place is visible.
   - A3 `state-kept`: leave a place and come back: its state (e.g. selected room) is unchanged.
   - A4 `rooms-then-garden`: in the house, arrows change rooms; from the last room the next arrow opens the garden; from the garden the previous arrow returns to the last room.
   - A5 `locked-hint`: a locked place shows the text of what unlocks it (from existing data/keys; if none exists show "Locked"), never an empty window; the arrow still skips or stops there consistently.
   - A6 `no-plan`: no isometric house plan element exists; room switching works.
3. Implement the carousel in `features/places/feature.js` (+ css), remove the old tab bar markup and the house plan (P3-05), keep room switching by arrows in `rooms/feature.js`. Buttons need `aria-label`; arrows are real `<button>` elements.
4. Verification line; fix until green. Log (max 10 lines).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P3a.md` (max 10 lines). Do not run git.
