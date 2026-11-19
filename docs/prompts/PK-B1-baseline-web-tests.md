# PK-B1: Baseline repair: stale web UX tests after the 256x144 scene unification
Zmieniaj: tools/qa/ux-p1-decorate.js tools/qa/ux-p1-lifecycle.js tools/qa/ux-p2-player.js tools/qa/ux-p3-icons.js tools/qa/ux-p3-places.js tools/qa/ux-p34-pig-walk.js tools/qa/ux-p35-cleanup.js tools/qa/ux-p36-bar.js tools/qa/ux-p36-rooms-scroll.js tools/qa/ux-p38-presence.js tools/qa/ux-p39-blockers.js tools/qa/ux-p39-depth.js tools/qa/ux-p39-grid.js tools/qa/ux-p39-layout.js tools/qa/ux-p40-edit-move.js tools/qa/ux-p40-edit-place.js tools/qa/ux-p41-gramophone.js tools/qa/ux-p42-web-look.js tools/qa/ux-p43-market-scene.js tools/qa/ux-p44-drag-edge.js tools/qa/ux-p44-drag-switch.js tools/qa/ux-p45-overlay-pig.js tools/qa/ux-p45-overlay.js tools/qa/ux-p45-pig-shadow.js tools/qa/ux-p45-room-draw.js tools/qa/ux-p45-room-scene.js tools/qa/ux-p46-regress.js tools/qa/ux-p46-render.js tools/qa/ux-p50-canvas-wiring.js tools/qa/lib/ux.js web/home/canvas-pig.js web/home/features/places docs/qa/UX_WAVE_CHECKS.md docs/opt/log/PK-B1.md
Weryfikacja: node tools/qa/ux-all.js
Weryfikacja: node --check web/home/lib/pig-behavior.js && node --check tools/qa/home-behavior-check.js && node --check tools/qa/ux-p110-behavior.js && node tools/qa/home-behavior-check.js && node tools/qa/ux-p110-behavior.js
Limity (twarde): maks. 80 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Bring `node tools/qa/ux-all.js` to zero FAIL (except scripts that need Playwright in an environment without it) so wave 3 starts on a green web baseline instead of 29 red scripts.

Depends on: F2-6 (Q1 log `docs/opt/log/PK-Q1.md`, Q2 changes: scenes unified to 256x144, places bar and farm/market fixes in commits 1bdc2bf and 4706bbf).

## Kontekst
- Lista czerwonych testów z pierwszą linią błędu: `docs/opt/log/baseline-ux-f3.txt` (29 skryptów). Q1 oceniło 23 z nich jako "stare, sprzed fali 2", a 5-6 jako związane z falą 2 (`ux-p46-regress`, `ux-p40-edit-*`, `ux-p44-drag-*`).
- Znane przyczyny: (1) testy zakładają stare rozmiary scen (`192x112` pokój, `384x192` park, szerokość płótna 1536), a wszystkie sceny mają teraz `256x144` (`assets/data/place_scenes.json`); (2) etykieta przycisku Wstecz "Back" vs oczekiwane "Back to More"; (3) pasek miejsc ma teraz tło z `assets/ui/`; (4) chip obecności pokazuje nazwę świnki ("Pip is in Salon"), nie "Cuy is in"; (5) ścieżka świnki wchodzi w blokery (`ux-p34`, `ux-p39-grid`, `ux-p46-regress`: stopy w prostokącie blokera) - to może być PRAWDZIWA wada `canvas-pig.js`; (6) `ux-p45-pig-shadow` (`ctx.ellipse` 2000 razy) i `ux-p50-canvas-wiring` (3 świnki: 11 `drawImage` vs 4) - budżet rysowania, możliwa prawdziwa wada.
- Skrypty z "Cannot find module 'playwright'" (np. `ux-p46-render`) padają przez środowisko, nie przez kod: uruchom je tylko tam, gdzie Playwright jest zainstalowany (`npx playwright install chromium`), w logu zaznacz "ENV".

## Steps
1. Uruchom `node tools/qa/ux-all.js` raz, porównaj z `docs/opt/log/baseline-ux-f3.txt` (część mogła zostać naprawiona commitami z 19.11).
2. Dla każdego nadal czerwonego skryptu zdecyduj: STARE (test zakłada nieaktualny fakt: popraw oczekiwanie na dzisiejszą prawdę, np. odczytaj rozmiar sceny z `place_scenes.json` zamiast liczby w kodzie testu) albo WADA (kod robi coś złego dla gracza: stopy świnki w blokerze, nadmiar rysowania). STARE popraw w teście. WADĘ popraw w `canvas-pig.js` / `features/places/*` tylko jeśli poprawka ma do ok. 30 linii; większą zapisz jako `DEFECT <id>: <opis>` w logu i zostaw test czerwony ze `Skip`-em opisanym `DEFECT`.
3. Nie osłabiaj asercji bez powodu: zmiana oczekiwania musi mieć w logu uzasadnienie (jedna linia na test: STARE/WADA, co zmieniono).
4. Dopisz w `docs/qa/UX_WAVE_CHECKS.md` jedną linię "Baseline F3-0: N/85 PASS" z datą.
5. Weryfikacja do zera FAIL (poza ENV).

Prohibited: running git, new dependencies, touching C#, deleting tests, extra refactors.

Log: write `docs/opt/log/PK-B1.md` (max 20 linii: tabela test, STARE/WADA/ENV, poprawka; lista DEFECT).
