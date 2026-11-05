# PK-37: Podpięcie muzyki do widoków Domku i minigier (package, 2 items)
Zmieniaj: web/home/app.js, web/home/features/rooms/feature.js, web/home/features/garden/feature.js, web/home/features/park/feature.js, web/home/features/farm/feature.js, web/home/features/market/feature.js, web/home/minigames/minigames-api.js, web/home/minigames/hay-maze.js, web/home/minigames/nyan-cuy.js, web/home/minigames/nyan-audio.js, web/home/index.html, web/home/music.js, tools/qa/web-smoke.js, docs/opt/log/PK-37.md
Wymagane: web/home/app.js, web/home/minigames/minigames-api.js
Weryfikacja: node --check web/home/app.js && node --check web/home/minigames/minigames-api.js && node tools/qa/music-engine-test.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Nie ruszaj: src/*, assets/*, tests/*, waves.yaml, AGENTS.md, web/home/music-engine.js i music-director.js (tylko wołamy je; zmiany tylko przez PK-34b)
Goal: Każdy widok Domku i minigra gra swoją muzykę przez dyrygenta. Muzyka zatrzymuje się po zamknięciu minigry (naprawia D-14). Pełna tabela podpięć w `docs/MUSIC_PLAN.md` sekcja 5.8.
Depends on: PK-34b (dyrygent), PK-36 (most) dla zachowania przy pełnym ekranie; sama podmiana w Domku działa bez pulpitu.
Steps: work the items below in order. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes.
### Item 1: Widoki Domku.
- `app.js` (`showOnly`, `openMinigamesModal`, `openAlbumModal`) i `features/*/feature.js`: wołanie `MusicDirector.setContext('home.view:<id>')`. Pokoje: `home.view:rooms.room:<id>` (prefiks `pig:` z `features/rooms/feature.js:3, 14`). Ogród, park, farma, targ: `place:<id>`. Album: `home.view:album` z wariantem `musicbox`.
- Nocny filtr dla miejsc z `lights.json` (przekazany w kontekście, nie zmienia danych).
- `index.html`: dodać `music-engine.js` i `music-director.js` przed `app.js`.
- `music.js` (`CuyMusic`): zostaje dla prostych pętli; jeśli `setVolume`/`setEnabled` mają mieć skutek, przekieruj je do `MusicEngine` (jedno źródło głośności).
### Item 2: Minigry i sprzątanie.
- `minigames-api.js` (start ok. 362-363, boss ok. 446, pauza 485/503, wynik 540): `MusicDirector.minigame(id)` przy starcie, `minigameEnd(id)` przy końcu, stop przy zamknięciu okna (`stop`). Stemy wg czasu/wyniku.
- `hay-maze.js` i `nyan-cuy.js`: dodać `onTimeLeft` (wywołanie co 1 s z pozostałym czasem) dla stemów.
- `nyan-audio.js`: usunąć plik i wszystkie odwołania (martwy kod po wdrożeniu `mg_nyan_cuy`); sprawdź `grep -rn nyan-audio web tools` i napraw wszystkie wystąpienia.
- `tools/qa/web-smoke.js`: jedna asercja, że po zamknięciu minigry dyrygent nie ma aktywnego kontekstu `minigame`.
Prohibited: no new dependencies; no new music files; no changes to minigame logic beyond the hooks above.
Log: write `docs/opt/log/PK-37.md` (max 10 lines: decisions and why, differences from the plan, anything left undone). No pull request text.
