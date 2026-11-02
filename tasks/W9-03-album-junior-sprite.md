# W9-03: Album stickers use the junior sprite sheet
Goal: the Album in web/home/app.js draws junior stickers from sprites/junior.
Zmieniaj: web/home/app.js
Wymagane: web/home/app.js
Weryfikacja: node --check web/home/app.js; node tools/qa/web-smoke.js
Steps:
1. Replace `const folder = (stage === 'junior') ? 'baby' : stage;` with `const folder = stage;`.
Zakazy: change existing assertions, new dependencies.
