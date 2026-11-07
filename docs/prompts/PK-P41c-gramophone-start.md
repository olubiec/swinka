# PK-P41c: Gramophone available from the start
Zmieniaj: web/home/features/music/player.js, web/home/features/music/prices.js, web/home/features/rooms/mock.js, assets/data/world_items.json, tools/qa/ux-p41-gramophone.js, docs/opt/log/PK-P41c.md
Wymagane: tools/qa/ux-p41-gramophone.js
Weryfikacja: node --check web/home/features/music/player.js && node --check tools/qa/ux-p41-gramophone.js && node tools/qa/ux-p41-gramophone.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The owner could not test the player click because no room has a gramophone (the player appears only by clicking a placed gramophone). Make the gramophone easy to get and the player testable.
Depends on: PK-P37a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. grep how the gramophone item (`gramophone`, `player_gramophone` in `world_items.json`) is bought/placed and how the player panel is shown (P2: hidden by default, click on the gramophone shows it).
2. Make a gramophone part of the starter set: a new game's salon already contains one placed gramophone (the smallest change: the default placed-items list of the starting room in the data/mock the code already uses; if the default room data lives in Core C# do NOT edit it here, instead make the gramophone cost 0 in the shop's first tab and note it in the log).
3. Test `tools/qa/ux-p41-gramophone.js`: Q1 `gramophone-in-start-room` (fresh mock state shows it), Q2 `click-shows-player`, Q3 `click-aside-hides`, Q4 `music-continues-after-hide`.
4. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41c.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
