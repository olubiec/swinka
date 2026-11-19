# PK-QF2: Owner screenshots and visual verification sheet after F2-FIX
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, tools/qa/ux-p70-owner-shots.js, docs/qa/shots, docs/opt/log/PK-QF2.md
Wymagane: tools/qa/ux-p70-owner-shots.js
Weryfikacja: node --check tools/qa/ux-p70-owner-shots.js && node tools/qa/ux-p70-owner-shots.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj. Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Regenerate the owner screenshots `docs/qa/shots/owner-*.png` at `420x640` showing the restored classic places bar, fitted 16:9 canvas stage without brown frames, restored outdoor background details, all 10 Park items, and market stall signboards, and document the 9 F2-FIX checks in `docs/qa/UX_WAVE_CHECKS.md`.

Depends on: wszystkie paczki kroków F2F-1..F2F-5 scalone w `main`. Biegnie w kroku F2F-6 równolegle z `PK-QF1`.

Produces (names other packages rely on): Updated `docs/qa/shots/owner-*.png` and F2-FIX section in `docs/qa/UX_WAVE_CHECKS.md`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/qa/UX_WAVE_CHECKS.md`
- `tools/qa/ux-p70-owner-shots.js`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `tools/qa/ux-p70-owner-shots.js` i `docs/qa/UX_WAVE_CHECKS.md`.
2. Uruchom `node tools/qa/ux-p70-owner-shots.js`, aby wygenerować świeże zrzuty `docs/qa/shots/owner-*.png` po poprawkach F2-FIX.
3. W `docs/qa/UX_WAVE_CHECKS.md` dopisz sekcję `## F2-FIX (Live Testing Hotfixes)` z tabelą 9 naprawionych problemów, plikami testów `ux-p71..74` i krótką instrukcją sprawdzenia każdego punktu w grze.
4. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-QF2.md` (max 10 linii).
