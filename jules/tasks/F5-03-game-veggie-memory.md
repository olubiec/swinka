# Task F5-03: Minigame "Veggie Memory" (calm card pairs)

Read `AGENTS.md` first and follow it. Requires F4-08 merged.

## Goal
New minigame in ONE new file `web/home/minigames/veggie-memory.js` (already in `games.json`), structure as in `veggie-rain.js`
(`Minigry.register({ id: 'veggie_memory', name: 'Veggie Memory', icon: '🃏', desc, start })`). Calm: no time limit, soft sounds only.

## Rules of the game
- Cards (face down: a green card with a leaf pattern; face up: a veggie or item icon from `icons_16.png`, scaled x3 on a cream
  card). Levels: 12 cards (4x3), 16 (4x4), 20 (5x4), then 24 (6x4). Each level has pairs of different icons chosen at random from
  the food icons (bell pepper, cucumber, parsley, carrot, kale, strawberry, hay, pellets, chew stick, ball). Never use onion or chocolate.
- Click a card to flip it (tween). Implementation pattern (R10.2): own `canMove`/`isFlipping` lock that is set to false on the
  click and restored in the flip-complete callback; compare the two card names after the second flip. The flip is a two-step
  `scaleX` tween (1 -> 0, swap the frame, 0 -> 1). Do NOT use `rotateY`/Plane from the official example (Plane is gone in Phaser 4).
  Phaser 3.90.0 pinned locally, `pixelArt: true` and `roundPixels: true` set explicitly, no Phaser 4; check hover/click on overlapping
  card objects after the framework replacement. Two flipped cards: match -> they stay, a soft pop (`Sound.crunch` if it exists), a heart
  floats up; no match -> flip back after 700 ms. Input is blocked while two cards are being resolved.
- A small pig in the bottom-right corner (`MinigryPig`, `pig_idle`) watches; when a level is complete it plays `pig_popcorn`
  for one second, then the next level starts. After the 24-card level the game ends with `endGame`.
- Score per pair = max(2, 12 - moves in this level beyond the minimum), plus 20 per cleared level. The player can also press
  a button "Finish" (top right) to end the game early with the points so far. Call `config.updateScore` often.
- Keyboard: Tab/Enter is not required; mouse and touch only.

## Checks
`node --check`; `node tools/qa/web-smoke.js`. Describe in the PR how a level was cleared in the mock page.

## Gotowe pliki
None: no ready-made file; the flip and lock code is written in this task (no repository with a verified licence was found).

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC (`TESTY_RECZNE.md` PHASER-01): play one level in the real WebView2 Home (no double flips, scaleX flip looks right).

When done, open a pull request against `main` titled `F5-03: Minigame Veggie Memory`.
