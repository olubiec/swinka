# PK-P41b: Minigames: maze, music, back arrows
Zmieniaj: web/home/minigames/hay-maze.js, web/home/minigames/hay-maze-logic.js, web/home/minigames/minigames-api.js, web/home/minigames/index.html, web/home/features/coloring/feature.js, web/home/features/coloring/feature.css, tools/qa/ux-p41-games.js, docs/opt/log/PK-P41b.md
Wymagane: tools/qa/ux-p41-games.js
Weryfikacja: node --check web/home/minigames/hay-maze.js && node --check web/home/minigames/minigames-api.js && node --check tools/qa/ux-p41-games.js && node tools/qa/ux-p41-games.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Four bugs from the owner: (1) the hay maze solves itself the moment you click the goal; (2) music keeps playing after leaving a minigame; (3) in the pixel-art (coloring) screen going back shows TWO back arrows and one does nothing; (4) after P37 check every minigame window has exactly one X and one Back from the library.
Depends on: PK-P37a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. Tests FIRST, `tools/qa/ux-p41-games.js` (Playwright with the browser mock; if a minigame cannot be driven in the mock, test its logic module in Node):
   - G1 `maze-no-autosolve`: clicking the goal cell must NOT move the player or finish the maze; only valid steps along the open corridor move the player (test via `hay-maze-logic.js`: a click far from the player is ignored or moves one step at most).
   - G2 `music-stops`: starting a minigame mutes/stops the home music (if that is the design) or the minigame sound, and leaving the minigame (Back/X/Esc) leaves NO minigame audio playing and restores the home music state exactly as before. Assert through the audio API the code uses (`minigames-api.js` / `nyan-audio.js`), count of playing audio elements/nodes = 0 after leave.
   - G3 `coloring-one-back`: open Coloring (More), enter a picture, count `.ui-back`/`.modal-back` elements visible: exactly 1; it works and returns one level.
   - G4 `controls-unified`: in each minigame screen exactly one X (`.ui-close`) and Back (`.ui-back`) appear.
2. Run it, fix each failure at the root (maze: grep for the click handler of the goal; audio: grep `Audio(`, `pause(`, `unload`, `visibilitychange` in `web/home/minigames` and the bridge; coloring: remove the duplicated back element, keep the one with the working handler).
3. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
