# W9-08: Pig cards show a real pig portrait and the palette
Goal: each card in the My Pigs screen shows the pig's idle frame (not the house icon) and its palette name next to the breed.
Zmieniaj: web/home/features/pigs/feature.js, web/home/features/pigs/feature.css
Wymagane: web/home/features/pigs/feature.js
Weryfikacja: node --check web/home/features/pigs/feature.js; node tools/qa/web-smoke.js
Steps:
1. Replace `<span class="pixel-icon icon-house x2">` with a small canvas (64x64, scale x2, image-rendering pixelated) drawing idle frame 0 (row 0) of the sheet chosen by paletteId. Interim mapping until real coats exist: tricolor -> adult, dutch -> companion_black_white, agouti -> companion_agouti, albino -> companion_cream, cinnamon -> adult.
2. Show `breed · palette` in .pig-card-breed. Escape pig.name (use textContent, not innerHTML).
3. In the PR description list which paletteId values share a sheet, so a later art task can add real coats.
Zakazy: change existing assertions, new dependencies, files outside Zmieniaj.
