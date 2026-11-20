# PK-QF2 Log
- Regenerated all 8 `docs/qa/shots/owner-*.png` screenshots at `420x640` via `tools/qa/ux-p70-owner-shots.js` (using existing `msedge` fallback on Windows).
- Verified visually (`owner-salon.png`, `owner-park.png`, `owner-market.png`): classic places bar, fitted 16:9 stage without brown frames, outdoor details, 10 Park items, and Market stall signboards.
- Appended `## F2-FIX (Live Testing Hotfixes)` to `docs/qa/UX_WAVE_CHECKS.md` covering all 9 issues, `ux-p71..74` test files, and in-game verification steps.
- Decision: kept `tools/qa/ux-p70-owner-shots.js` untouched because `msedge` fallback was already implemented and executed cleanly.
- Verification `node --check tools/qa/ux-p70-owner-shots.js; if ($LASTEXITCODE -eq 0) { node tools/qa/ux-p70-owner-shots.js }` passed (`OWNER_SHOTS OK (8/8)`, exit code 0).
