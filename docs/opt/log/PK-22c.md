# PK-22c: web smoke for world screens and manual test steps
- Done W22-03: `worldSmoke()` in tools/qa/web-smoke.js, called before `browser.close()`, uses `index.html?world=1`: places bar (5 places, inside window), rooms (drawer, click-place on cell 5,3, count checked in state and `.room-count`), garden (walk button enabled), farm (4 plots, plant, plot `is-growing`, Harvest all disabled), market (sell sets owned and cap left down), pigs. Layout via assertLayout except the places bar (own box check).
- G10: every `<img>` with src in `#placesBar` and `#modalBody` must have `complete && naturalWidth > 0`; any 404/error response, requestfailed, console or page error fails the run.
- Difference: item says "dandelion"; the farm mock has only parsley (used). Market sells carrot (parsley owned is 0 in the mock).
- Difference: header of web-smoke.js says 400x620 but the runner uses 420x640. At 400 the Home page itself scrolls sideways (existing layout), so only 420x640 is checked.
- Not tested: walk result and refusal (mock has no walk handler); clock skip is written in TESTY only.
- Done W22-04: section "9. Świat: dom, ogród, park, farma, targ" in TESTY_RECZNE.md (18 numbered steps). Save field names for the clock skip are left for the tester to read from save.json (not verified).
- Verified: `node --check tools/qa/web-smoke.js`; `node tools/qa/web-smoke.js` prints WEB SMOKE OK, exit 0, ~52 s total.
- Undone: none.
