# Task F5-01: Minigame "Hay Hop" (popcorn jumping on hay bales)

Read `AGENTS.md` first and follow it. Requires F4-08 (data-driven minigame list) merged.

## Goal
A new Phaser 3 minigame in ONE new file `web/home/minigames/hay-hop.js` (it is already listed in `games.json`; do not edit
any other file except the test line below). Copy the structure of `web/home/minigames/veggie-rain.js` (read it first):
IIFE, `Minigry.register({ id: 'hay_hop', name: 'Hay Hop', icon: '🌾', desc: '...', start })`,
`config.container`, `config.stageKey`, `config.updateScore(score)`, `config.endGame(score)`, pig via `MinigryPig`
(`pig_popcorn`, `pig_idle`, `pig_run`), icons from `icons_16.png` (indexes in `assets/icons/icons.json`).

## Rules of the game
- Portrait play area 360x290 (same as Veggie Rain). The pig jumps by itself (animation `pig_popcorn` while rising) from
  bale to bale; the player steers left/right (mouse x, arrow keys or A/D); the screen wraps horizontally.
- Bales (16x8 px rectangles in straw colours, scaled x2) spawn upward at random x. Types: normal 70 %, crumbling 20 %
  (disappears 0.4 s after a landing), kale leaf bonus 10 % (drawn with the kale icon above it, a landing there gives a
  super jump x1.6 and +20 points).
- Score = height climbed in metres (1 m = 10 px, one point each). Camera follows upward only. Falling below the screen
  ends the game; the game also ends after 90 s. Difficulty: gaps grow slowly from 40 px to 75 px.
- `endGame(score)` after a 900 ms pig_popcorn finishing pose. Rewards, limits and mood are handled by the shared code
  (clovers = min(40, points / 10)); do not compute them here.
- A pause when `document.hidden` is handled by the framework; make sure timers use Phaser `time`, not `setTimeout`.

## Checks
`node --check web/home/minigames/hay-hop.js`; `node tools/qa/web-smoke.js` passes (F4-08's smoke test starts every
registered game for 2 s and ends it). Add one line to the PR description describing how you played it in the mock page
(`web/home/index.html` in a browser).

When done, open a pull request against `main` titled `F5-01: Minigame Hay Hop`.
