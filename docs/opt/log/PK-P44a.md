# PK-P44a: Drag the pig to the screen edge
- Decisions: Edge zone = outer 12px of canvas left/right. 600ms hold triggers onEdgeHold once; timer clears on zone exit and re-arms.
- API CanvasPig: `onEdgeHold({side: 'left'|'right'})`, `continueDrag(newSceneDef)`, `onDrop({x, y})`, `setEdgeNeighbours({left: bool, right: bool})`, `edgeNeighbours`, `clearEdgeHold()`.
- API PigCanvas: Mirrors CanvasPig methods and getters/setters.
- Drag continuation: continueDrag sets scene, clamps pig to scene band, positions pig visually 16px inside edge (pigX = edge + 16 on left, sceneWidth - 16 on right), and preserves drag.moved = true until pointerup.
- Take out rule: Beyond edge zone by 40px triggers take_out only when edgeNeighbours[side] === false; out above/below window always triggers take_out.
- Indicator: Growing chevron / arrow sprite drawn at the active edge during hold, exposed via CanvasPig.debug().edgeIndicator.
- Verification: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p44-drag-edge.js && node tools/qa/ux-p44-drag-edge.js (all G1-G7 passed).
