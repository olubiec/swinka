# W26-06: Shared bedroom page: unlock, residents and move in or out
Zmieniaj: web/home/features/rooms/dorm.js, web/home/features/rooms/dorm.css
Wymagane: web/home/features/rooms/dorm.js
Weryfikacja: node --check web/home/features/rooms/dorm.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/features/rooms/feature.js, web/home/app.js, web/home/bridge.js
Goal: The player can unlock the shared bedroom and choose who lives in it.
Depends on: W25 merged; state `dorm` (W26-04); the page wiring is W26-07. Sub-wave W26a: no dependency on other tasks of the wave.
Facts: Export `window.DormPanel = { mount(container, ctx) }` (`ctx = { state, send }`). Locked: a card 'Shared bedroom - N clovers - needs two pigs' with the unlock button (disabled with the reason). Unlocked: portrait row of `candidates` as toggle chips (resident/not), button 'Move in together' for the selected set (`dorm_move_in`), 'Move out' per resident, level button, a calm line 'Friends who sleep together get along a little better' when `bondBonus > 0`. Memorial pigs can be chosen too (they are shown with a candle). After moving in, show the stored-items notice if the server toasted it. Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the panel and styles.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
