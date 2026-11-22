PK-T17: 8 PASS, 4 DEFECT, 0 SKIP (node --check && node tools/qa/ux-p123-editor-adv.js, msedge fallback).
DEFECT ED-undo-chain-20: 20-op pure simulation (with remove/place uid rotation) and live drag-place+19-flip chain failed (pureUndoMatch=false, liveCounts=null, liveUndoOk=false).
DEFECT ED-redo-chain: 20-op redo chain failed to match post-20-op snapshot (pureRedoMatch=false, liveRedoOk=false).
DEFECT ED-snap-edges: EditHistory.snapCell clamps indoor/wall to >=0, whereas indoor/floor (cx=-1,cy=-3,x=-8) and outdoor (cx=-1,cy=-1,x=-8) return negative coords.
DEFECT ED-budget-200-things: canvas-pig.js passes viewport w/h instead of width/height and omits interactive/isFixture on DrawBudget proxies, dropping both under 200 items.
