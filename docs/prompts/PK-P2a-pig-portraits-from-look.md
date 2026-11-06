# PK-P2a: Every pig gets its own portrait (package, wave P2)
Zmieniaj: web/home/features/pigs/feature.js, web/home/features/pigs/feature.css, web/home/canvas-pig.js, tools/qa/ux-p2-portraits.js, docs/opt/log/PK-P2a.md
Wymagane: tools/qa/ux-p2-portraits.js
Weryfikacja: node --check web/home/features/pigs/feature.js && node --check web/home/canvas-pig.js && node --check tools/qa/ux-p2-portraits.js && node tools/qa/ux-p2-portraits.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report: "All pig icons in More look the same." Diagnosis: `renderPigPortrait(id)` in `pigs/feature.js` loads `assets/sprites/portraits/<id>.png`; PNGs exist only for named pigs (kuki, ned, james, glen...), every other pig falls to the same `icon-pig-head`. Draw the portrait from the pig's look (breed + paletteId + coat) so each pig is different, with no new art files.
Depends on: P1 merged (feature windows have a clean lifecycle).

## Steps
1. Test first: `tools/qa/ux-p2-portraits.js` using `tools/qa/lib/ux.js` (PASS/FAIL, exit 1 on FAIL or page error). Scenarios (run before the fix, note failures in the log):
   - R1 `portraits-differ`: mock roster of 4 pigs with 4 different looks (breed/palette combinations from `assets/sprites/breeds.json` and `palettes.json`; set them through a mock handler or the mock state) -> openMore -> "My Pigs": the 4 portraits are different images (compare `canvas.toDataURL()` or `img.src` pairwise; all 6 pairs differ).
   - R2 `portrait-matches-main-sprite`: the portrait of a pig is built from the same look the main sprite uses (assert the same `look` object reaches both: spy on the function you add in step 2).
   - R3 `unnamed-pig-no-404`: no request to `portraits/<id>.png` for a pig that has no such file (no failed request in the page log); the old PNG is used only for named pigs that have a file, or dropped if the canvas portrait is better.
   - R4 `all-stages`: baby, junior, adult, senior portraits render (non-empty: at least 20% opaque pixels).
2. In `canvas-pig.js` add an exported pure function `window.CuyPig.renderPortrait(look, stage, size)` returning a canvas (head crop of the idle frame, nearest-neighbour scaling, size 32 or 64). It must use the same sprite/palette code path as the main pig; if that code is private, expose the smallest needed piece, do not copy it. Cache by `breed|palette|stage|size`.
3. `pigs/feature.js`: `renderPigPortrait(pig)` uses `renderPortrait` for every pig (roster cards, adoption offers, the pig picker); keep the PNG only as a fallback when no look is known. Offers (not adopted) use their `look` too. `pigs/feature.css`: portrait frame stays 32x32 / 64x64, `image-rendering: pixelated`.
4. Verification line; fix until green. Log (max 10 lines).
Prohibited: changing or deleting existing test assertions, new dependencies, new PNG files, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P2a.md` (max 10 lines). Do not run git.
