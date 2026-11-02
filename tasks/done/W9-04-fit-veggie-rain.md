# W9-04: Veggie Rain canvas fits the Home window
Goal: the 360x290 Phaser canvas is scaled to the 320 px wide .minigames-canvas-wrapper so the HUD text and the [ Finish ] button are fully visible.
Zmieniaj: web/home/minigames/veggie-rain.js
Wymagane: web/home/minigames/veggie-rain.js
Weryfikacja: node --check web/home/minigames/veggie-rain.js; node tools/qa/web-smoke.js
Steps:
1. In the Phaser.Game config add `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }` (keep width/height 360x290, pixelArt true) so pointer input still maps correctly.
2. Check with a screenshot at 420x640: the left edge of the HUD text and the right edge of [ Finish ] are visible; attach it to the PR.
Context: audit measured canvas 360 px inside a 320 px wrapper with overflow:hidden, clipping about 20 px on each side in all four games.
Zakazy: change existing assertions, new dependencies, files outside Zmieniaj.
