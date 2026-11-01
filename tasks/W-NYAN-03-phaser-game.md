# W-NYAN-03: Phaser 3 scene and integration for Nyan Cuy minigame
Goal: Deliver the playable Nyan Cuy minigame in Home using Phaser 3 and register it in games list.
Zmieniaj: web/home/minigames/nyan-cuy.js, web/home/minigames/games.json
Wymagane: web/home/minigames/nyan-cuy.js
Weryfikacja: node tools/qa/web-smoke.js
Steps:
1. Build `web/home/minigames/nyan-cuy.js` using Phaser 3:
   - Scrolling starfield background.
   - Pig sprite flying with waving ears and paws.
   - Dynamic trailing rainbow ribbon drawn behind the pig.
   - Treat collectibles and floating obstacles.
   - Game Over screen with score, high-score, and clover currency reward calculation via bridge.
2. Add `"nyan_cuy"` entry into `web/home/minigames/games.json` with title "Nyan Cuy", icon `icon-sparkle`, and category `arcade`.
