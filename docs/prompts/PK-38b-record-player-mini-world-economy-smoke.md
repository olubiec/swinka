# PK-38b: Odtwarzacz płyt, Fala A4-A7: mini-odtwarzacz, świat, zakupy i smoke (package, 4 items)
Zmieniaj: web/home/features/music/player.js, web/home/features/music/player.css, web/home/features/music/world.js, web/home/features/music/economy.js, web/home/app.js, web/home/features/rooms/feature.js, tools/qa/music-smoke.js, docs/opt/log/PK-38b.md
Weryfikacja: node --check web/home/features/music/player.js && node --check web/home/features/music/world.js && node --check web/home/features/music/economy.js && node tools/qa/music-smoke.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Nie ruszaj: src/*, assets/*, tests/*, waves.yaml, AGENTS.md, web/home/features/music/engine.js i shelf.js (tylko czytamy; zmiany tylko w PK-38a)
Goal: Dokończenie Fali A: mini-odtwarzacz, sześć odtwarzaczy w świecie, zakupy i nagrody, smoke odtwarzacza. Przeczytaj tylko sekcję „Fala A” w `docs/PLAN_FALE_WDROZENIE.md`.
Depends on: PK-38a (A1-A3).
Steps: work the items below in order. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes.
### Item 1: A4 Mini-odtwarzacz.
- `player.js` i `player.css`: `mp_panel`, `mp_display`, `mp_btn(_pressed)`, `mp_knob`, `mp_thumb`; play, pauza, następna, głośność; bez blokowania sceny.
### Item 2: A5 Sześć odtwarzaczy w świecie.
- `world.js` plus rejestracja w `features/rooms/feature.js`: 6 sprite'ów z `players_design.json` (`assets/records/`), stawianie w pokoju, `badge_wear_*` przy założonym sprzęcie. Taniec wg odtwarzacza: `DanceFor` z PK-34a.
### Item 3: A6 Zakupy i nagrody.
- `economy.js` (hak w `shop`): ceny z `prices.js`, bez zmiany ekonomii bazowej. Mnożniki stanu: mint 1,0, worn 0,7, scratched 0,6, cracked 0,5, warped 0,6.
### Item 4: A7 Smoke odtwarzacza.
- `tools/qa/music-smoke.js`: scenariusze z sekcji „Smoke” w `PLAN_FALE_WDROZENIE.md`. Bramka A: `web-smoke` i `music-smoke` zielone, zrzuty 420 px półki i mini-odtwarzacza obejrzane (zrzuty w katalogu roboczym, nie w repo).
Prohibited: no new dependencies; no edits to app.js beyond the one menu entry the Fala A plan names.
Log: write `docs/opt/log/PK-38b.md` (max 10 lines: decisions and why, differences from the plan, anything left undone). No pull request text.
