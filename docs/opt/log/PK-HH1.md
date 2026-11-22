# PK-HH1 Log
Status: PASS
Decisions:
- `hayhop-logic.js`: UMD `createGame({rng,width,height})` with `step(dtMs,input)`, `state()`, `score()`, `setPaused(bool)`.
- `hayhop.js`: Phaser 3 scene (360x290, pixelArt, palette-only colors, `MinigryPig` + `grass_tuft_1/2.png`, 4-level `../../../../assets/` path from `hayhop/`), `Minigry.register({id:'hay_hop'})`, `config.endGame(score)` once on fall, blur pauses.
- `hayhop/index.html`: standalone page loading `bridge.js`, `lib/palette.js`, `lib/sprites.js`, `phaser.min.js`, `minigames-api.js`, `hayhop-logic.js`, `hayhop.js`, auto-starting `MiniGames.start('hay_hop', {container})`.
- `ux-p130-hayhop.js`: Playwright uses `msedge` fallback; all H1-H10 + HOP adversarial tests and `node --check` passed.
