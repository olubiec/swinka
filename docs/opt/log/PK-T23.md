# PK-T23 Log
- Results: 9 PASS, 1 DEFECT, 0 SKIP (JS: 6 PASS, 1 DEFECT; C#: 3/3 adversarial PASS, 25/25 filtered PASS).
- DEFECT COM-draw-order-with-furniture: Companion did not spawn in `garden` after `CanvasPig.setCompanion({ enabled: true, id: 'garden_friend' })` and `fastForward(100)`.
  - Steps: Open `web/home/index.html?mock=1`, enter `garden`, call `CanvasPig.setCompanion({ enabled: true, id: 'garden_friend' })`, call `CanvasPig.fastForward(100)`.
  - Expected: `CanvasPig.debug().companion` has 1 entry so Y-sorted draw order with furniture can be verified.
  - Actual: `CanvasPig.debug().companion` remained empty (`[]`).
- Note: `ux-p141-companion-adv.js` opens Home directly instead of `ux.openHome` because `ux.js` waits for `listFeatures().length > 10` while Home has 10 features.
