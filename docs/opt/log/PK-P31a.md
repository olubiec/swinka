# PK-P31a: Scene data file for all places
- Created assets/data/place_scenes.json and validator tools/qa/place-scenes-check.js.
- Room walk [10,96,230,126]: habitat room floor boundary from canvas-pig.
- Garden walk [8,80,248,138]: lawn safely below fence posts (y=70).
- Park walk [10,110,374,186]: open grass foreground safely below river (y=86-100).
- Farm walk [8,80,248,138]: open pasture below fence (y=74) and barn base.
- Market walk [8,120,248,140]: cobblestone promenade running in front of stall counters.
- Exits form bidirectional closed ring: house <-> garden <-> park <-> farm <-> market <-> house.
- Depth scale ranges: room [0.88,1.0], garden [0.82,1.0], park [0.78,1.0], farm [0.82,1.0], market [0.92,1.0].
- All checks C1-C7 pass.
