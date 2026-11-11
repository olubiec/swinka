# PK-R47: Research: art pipeline, clean backgrounds, room 16x9 and navigation bar
- Generators: In-house generation for clean backgrounds (D1) confirmed feasible via `tools/art/world/{garden_bg,park_bg,farm_bg,market_bg}.py` by gating blocker composites.
- D3 Places bar: Assets already exist in `assets/ui/` (`nav_bar_frame.png`, `nav_title_plate.png`, `nav_btn_arrow_*`, `nav_btn_edit*`) and pass `check-assets.js`.
- Room 256x144: Recommend Option (c) - fix canvas viewport to 256x144 in `canvas-pig.js`, seamlessly tile room backdrop to 16x9 cells, retain logical grid placement for 100% save compatibility.
- Park 256x144: Prune 6 out-of-bounds blockers and adjust walk/exit bounds in `place_scenes.json` to match uniform 256x144 canvas across all places.
- Light & Animation: `drawThing` lacks frame slicing for animated flame strips (`campfire_flame`); `placedThings` must map active light sources to `on_file` strips.
- Package Split: PK-P47a (in-house clean backgrounds) and PK-P47c (places bar UI wiring) are READY to start now; PK-P47b commissions artist for D2 (crops/stalls) and D4 (campfire).
- Differences from plan: None. All 7 sections verified with file/line evidence.
