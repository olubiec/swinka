# PK-T26 Stage Looks & Home Regression Log
Result: 6 PASS, 2 DEFECT, 0 SKIP (8 total checks in tools/qa/ux-p144-stage-regression.js).
PASS: STG-every-stage-and-breed-renders, STG-badge-never-clipped-420x640, STG-age-days-increase-with-clock, STG-legend-vs-baby-differ, STG-regression-window-bottom-visible, STG-console-clean-5min.
DEFECT STG-regression-all-7-scenes-sleep-eat-walk: After switching across 7 unlocked scenes via places_pig_move, walkTo/applyReaction('feed')/setNeeds(energy=2)+fastForward(2500) stayed idle (beh=undefined) in pig:pig_1/dorm/garden/park/farm and returned eat_treat instead of eat/sleep in salon/market.
DEFECT STG-regression-edit-undo-still-works: Opening Edit mode via #placesEditBtn in salon and clicking catalog items left canUndo=false on CuyEdit.getHistoryCounts() and #editUndoBtn disabled.
Note: Added local openHome420() in ux-p144-stage-regression.js because tools/qa/lib/ux.js waits for listFeatures().length > 10 while Home currently registers 10 features.
