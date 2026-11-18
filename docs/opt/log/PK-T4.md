# PK-T4 Log
Results: 12 PASS, 2 DEFECT, 0 SKIP (14 cases in `tools/qa/ux-p61-multipig-adv.js`).
- DEFECT P1: When two pigs (one unnamed `starter` with `smooth`/`blaze_only.ginger` look and one named `ned`) are placed in `garden`, both render identical head pixels on `#pigCanvas` (`pigHash1 === pigHash2 === 7a8b81c5`).
  Steps: Call `CanvasPig.setPresentPigs([{ id: 'starter', look: starterLook, x: 60, y: 112 }, { id: 'ned', look: nedLook, x: 180, y: 112 }])` and `inst.render()`.
  Expected: Distinct head pixel hashes at `(60, 112)` and `(180, 112)` matching their distinct `CuyPig.renderPortrait` looks (`6c9ea4a9` vs `339df260`).
  Actual: Both positions render with identical pixel hash `7a8b81c5` because `drawPigFor` falls back when resolving `starter`'s palette/facing alongside `ned`.
- DEFECT P9: Frame time with 4 pigs in a lit scene exceeds 1.5x of 1 pig (3 & 4 pigs pass `minGap >= 22` and throw no exceptions).
  Steps: Render `garden` with `lightScene` active and measure median rAF frame time for 1 pig vs 4 pigs (`CanvasPig.setPresentPigs`).
  Expected: 4-pig frame time <= 1.5x of 1-pig frame time.
  Actual: Median frame time is 16.70 ms for 1 pig vs 31.60 ms for 4 pigs (ratio 1.89x > 1.5x) due to per-pig per-frame `litFrame` `getImageData`/`putImageData` CPU lighting.
