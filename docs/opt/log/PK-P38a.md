# PK-P38a: Where the pig is: presence chip and exits
- Status: DONE
- Chip: #placesPresenceChips (.places-presence-chips), .places-presence-chip with text "Cuy is in <scene>" (or "<name> is in <scene>" for 2+ pigs) and button "Go there" (.chip-go-btn.ui-btn).
- Exits: bindCanvasExits binds CanvasPig.onPigExit to send places.pigMove {pigId, to}; disabled when pinned or locked (60s penalty).
- Arrivals: checkArrivals detects pig entering viewed scene and calls CanvasPig.enterFrom(oppositeSide).
- Mock: mock.js handles places.pigMove verifying adjacency and lock status, updating places.pigLocations.
- Differences from plan: None. All Pr1-Pr7 tests green.
