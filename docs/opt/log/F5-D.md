F5-D: drag depth restored (873a7e6 logic) in canvas-pig.js pointermove.
- pigX/pigY via clampDragToFree; pigAirY = DRAG_LIFT_MIN + lift above walk top, capped DRAG_LIFT_MAX.
- New consts DRAG_LIFT_MIN/MAX, DRAG_SWING_MAX/K at file top.
- endDrag unchanged (toss groundY = pigY already; landing snap existing).
- Removed drawEdgeIndicator(ctx) call; method and edgeHold timers kept.
- _dragGroundY writes left in pointerdown/endDrag (harmless, no readers).
