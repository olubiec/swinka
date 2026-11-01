# W-MULTI-04: Pig collection and adoption screen in Home
Goal: Create the "Pigs" feature module in Home where players view their collection and choose which 2 pigs are on screen.
Zmieniaj: web/home/features/pigs/feature.js, web/home/features/pigs/feature.css, web/home/features/index.json
Wymagane: web/home/features/pigs/feature.js
Weryfikacja: node tools/qa/web-smoke.js; node --check web/home/features/pigs/feature.js
Steps:
1. Create `web/home/features/pigs/feature.js` and `feature.css`:
   - Grid of adopted pigs: portrait, breed, discovered traits, active toggle.
   - Adoption button to spend clovers on adopting a new random pig.
2. Add `"pigs"` to `web/home/features/index.json`.

