# W10-01: QA check that minigame canvases fit
Goal: tools/qa/minigame-fit-check.js starts each game from Minigry.list() at 420x640 and fails if the canvas is wider than its wrapper.
Zmieniaj: tools/qa/minigame-fit-check.js
Wymagane: tools/qa/minigame-fit-check.js
Weryfikacja: node tools/qa/minigame-fit-check.js prints FIT OK (after W9 is merged)
Steps:
1. Like tools/qa/web-smoke.js: serve the repo, open web/home/index.html in webview-mode, click #btnMinigames, start each game with a statement-body callback (do not await Minigry.start: its promise ends with the game), wait 1500 ms.
2. Compare the bounding rect of #modalBody canvas with .minigames-canvas-wrapper; fail on any overflow.
Zależy od: W9-04, W9-05, W9-06, W9-07 (zmergowane)
Zakazy: change existing assertions, files outside Zmieniaj.
