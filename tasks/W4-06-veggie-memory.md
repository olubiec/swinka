# W4-06: Minigame Veggie Memory (calm card pairs)
Zmieniaj: web/home/minigames/veggie-memory.js, web/home/minigames/games.json
Wymagane: web/home/minigames/veggie-memory.js, web/home/minigames/games.json
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check web/home/minigames/veggie-memory.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/minigames/veggie-rain.js, web/home/minigames/minigames-api.js, web/home/index.html, AGENTS.md, docs/PLAN.md, tasks/*
Goal: A calm memory game (no time limit) appears in the Games hub through `games.json`.
Depends on: W3-06 (`games.json` loader) merged. Read `web/home/minigames/veggie-rain.js` first and copy its structure: `root.Minigry.register({ id, name, icon, desc, start })`, the `config` object (`container`, `stageKey`, `updateScore`, `endGame`), `root.MinigryPig.preload/create` for the little pig, Phaser 3.90 pinned locally with `pixelArt: true` and `roundPixels: true` set explicitly.
Facts: Card faces are icons from `assets/icons/icons_16.png` with indexes from `assets/icons/icons.json` (read how `veggie-rain.js` loads and scales them). Never use onion or chocolate icons. No Phaser 4, no external library.
Steps:
1. Append `"veggie-memory.js"` to the array in `games.json` (keep valid JSON and the existing entries).
2. Register `{ id: 'veggie_memory', name: 'Veggie Memory', icon: '🃏', desc, start }`. Levels: 12 cards (4x3), 16 (4x4), 20 (5x4), then 24 (6x4); pairs of different food icons chosen at random (bell pepper, cucumber, parsley, carrot, kale, strawberry, hay, pellets, chew stick, ball).
3. Cards: face down = green card with a leaf pattern drawn from rectangles; face up = icon scaled x3 on a cream card. Flip = two-step `scaleX` tween (1 to 0, swap the frame, 0 to 1), not `rotateY`. Own `canMove` lock set false on click and restored in the flip-complete callback; compare the two cards after the second flip. Match: they stay, a soft pop (`Sound.crunch` if it exists, else nothing), a heart floats up. No match: flip back after 700 ms. Input is blocked while two cards resolve.
4. The little pig sits bottom right and plays its celebration for one second when a level is cleared, then the next level starts. After the 24-card level `config.endGame(score)`. A "Finish" button (top right) ends early with the points so far. Mouse and touch only.
5. Score per pair = max(2, 12 - moves in this level beyond the minimum), plus 20 per cleared level; call `config.updateScore` after every change.
6. Keep the deck builder a pure function (`buildDeck(level, rng)`) and verify it under `if (window.__CUY_TEST__)`: pairs are unique, count is right for each level.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; how a level was cleared in the mock page (screenshot); "play one level in the real Home" goes to TESTY_RECZNE.md PHASER-01..
