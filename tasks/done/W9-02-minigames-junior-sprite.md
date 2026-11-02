# W9-02: Minigames use the junior sprite sheet
Goal: MinigryPig.preload maps junior to junior/spritesheet.png.
Zmieniaj: web/home/minigames/minigames-api.js
Wymagane: web/home/minigames/minigames-api.js
Weryfikacja: node --check web/home/minigames/minigames-api.js; node tools/qa/web-smoke.js
Steps:
1. Change `junior: 'baby/spritesheet.png'` to `'junior/spritesheet.png'` and drop the "no junior sprites yet" comment.
Zakazy: change existing assertions, new dependencies.
