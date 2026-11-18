# PK-P47a: Clean 256x144 Backgrounds
- Garden: removed gate_garden, willow_tunnel, tree_small (x2), bush_berry, hedge (x2), flowerbed_tulip, flowerbed_daisy, bench_wood, bird_bath, torches/lantern lights; kept sky, hills, meadow, fence, path_stone (4 TODs).
- Park: resized 384x192 -> 256x144 (HORIZON=46, STREAM=54..68); removed gazebo, tree_big (x4), bridge_wood, flower_arch, bench_park (x2), lamp_post (x3), brazier; kept sky, hills, horizon trees, meadow, stream, path_cobble (4 TODs).
- Farm: removed barn_hay, fence_farm loop, and non-Zmieniaj orchard/album/scratchpad outputs in __main__; kept sky, hills, meadow.
- Market: removed STALLS, order_board, promo_1..3, poster_1..3, overhead bulbs/ropes/lights; kept evening sky, roofs, sand, cobbles.
- place_scenes.json: set bg_clean=true for garden/park/farm/market; cleared instance blockers (incl. market crates_barrels per R35 sec.4).
- place_scenes.json park: size [256,144], walk [8,80,248,138], behindLine 74, exits.right.x 252, blockers river_bank_left [0,54,120,68] & river_bank_right [152,54,256,68].
- place_scenes.json room: size [256,144], walk [40,56,216,126], behindLine 48, kept size_from_layout:true (per R28 sec.4).
- Verification: `node --check tools/qa/ux-p47-bg.js && node tools/qa/ux-p47-bg.js && node tools/qa/place-scenes-check.js && node tools/qa/check-assets.js` -> PASS (exit 0).
