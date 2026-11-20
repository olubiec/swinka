# PK-PF-FRM
- Files: web/home/features/farm/feature.js, web/home/features/farm/feature.css, docs/opt/log/PK-PF-FRM.md.
- Close UX: added .farm-popover-head + × .farm-popover-close calling closePopover()/closeScenePanel() on all popover states (plant, tooltip, orchard, shop) and drawer .farm-menu; added capture-phase pointerdown/mousedown outside-dismiss (>80ms guard) and Escape dismissal.
- Stock & Market loop: added getOwnedCount(st, cropId) (object & array st.inventory) showing Seeds + .farm-seed-owned "In bag: X" badge, guarded optional clover cost per RF6.md, and added .farm-popover-footer with .farm-goto-market-btn calling CuyPlaces.setCurrentPlace('market').
- Compatibility decisions (RF6.md): kept .farm-scene-panel/.farm-scene-tooltip/.farm-menu-head/[data-scene-close]/[data-plant] alongside #farmPopover/.farm-popover/.farm-popover-head/.farm-seed-btn/.farm-crop-bag/.farm-market-btn and CuyFarm.closePopover; CSS uses --ui-* tokens only.
- Verify: node --check web/home/features/farm/feature.js PASS (exit 0).
- Verify: node tools/qa/ux-p43-farm.js FAIL (MODULE_NOT_FOUND — file missing in repo, documented in RF6.md).
- Verify: node tools/qa/ux-p60-hotspots-adv.js FAIL (exit 1 outside Farm: DEFECT H1 in places/mock.js & ReferenceError resolveTab is not defined in market/feature.js:715).
- Verify: standalone headless Edge Playwright harness on farm/feature.js + feature.css PASS (ALL_FARM_CHECKS_PASS).
