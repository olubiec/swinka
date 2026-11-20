# PK-PF-BG Log
- Status: OK
- Decisions (per RF3.md & real code): kept `market_bg.py` -> `market.png` and `farm_bg.py` -> `farm.png` (matching `ux-p47-bg.js`, not `*_day/morning/evening/night.png`).
- `market_bg.py`: added back wall + 3 flat posters (`y=54..73`, clear of stalls `y>=78` & `notice_board`/`sign_right`), `Random(61)` speckles, scalloped `BULBS` cable, and post-`light.render` bulb cores/halos (`light.render(..., [])` kept since `light.py` was outside `Czytaj tylko`).
- `farm_bg.py`: added procedural horizon pasture fence (`y=49..58`) skipping barn footprint (`x=174..242`); removed unused `import farm_b`.
- `garden_bg.py`: composited `garden/gate_garden.png` in centered fence gap, added `blob` horizon trees (`x=18..156`, clear of `tree_left`/`tree_right`, avoiding unread `tree_small`); removed unused `MOSS`, `tree_small`, `home`.
- `park_bg.py`: per `RF3.md` omitted `gazebo`/`bridge_wood`/foreground `tree_big` (active instances); restored `y<46` treeline (`Random(43)`), fixed stream bank clipping, aligned cobble path with `bridge` (`x=160`), updated `256x144` docstring, removed unused `MOSS`.
- Regenerated: `garden_{morning,day,evening,night}.png`, `park_{morning,day,evening,night}.png`, `market.png`, `farm.png`.
- Verification: `market_bg.py`, `farm_bg.py`, `garden_bg.py`, `park_bg.py`, `ux-p47-bg.js` (`ALL PASS (T1-T7)`), `check-assets.js` (`ASSETS OK`).
