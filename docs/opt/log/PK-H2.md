Status: PASS (ux-p111-rest-spots.js 10/10 S1..S10, node --check green on run 1).
API: window.RestSpots / module.exports { pick({kind,scene,things,pigPos,taken,rng}), ITEM_KINDS }.
Return shape: { gx, gy, anim, faceLeft, spotType, thingId, pair: null | { gx, gy, anim, faceLeft } } or null.
Decisions: item categories use real world_items.json IDs (5 houses, 3 beds, 7 cushions); priority house > bed > cushion > floor corner; within tier sorted by comfort, pigPos distance, rng.
For house spots probes (x, y-1) then (x, y) and nearby offsets within 32px so out-of-bounds items do not falsely clamp into walk; fallback floor scans corners (12px margin) then 6px grid.
For sleep_together checks wide beds/cushions (w>=2) then floor for two points separated by 20px horizontally, both inside walk, passing isFree, and clear of taken.
Differences from R37: added optional scene.blockers fallback when scene.isFree is omitted (still requires scene.isFree===true whenever provided).
Stubs: none (pure Node unit tests with mock scene/isFree objects).