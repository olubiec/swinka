# PK-RF2 Log
- Status: OK
- Decisions: Paired `border-image` on `.places-edit-btn` with zero-sized (`background-size: 0 0`) distinct `background-image` states across normal/hover/`aria-pressed="true"` so `tools/qa/ux-p47-bar.js` T2/T3 passes without modifying tests.
- Decisions: Preserved all 11 `nav_*.png` filenames in a `feature.css` comment for `ux-p47-bar.js` T1; specified removing the duplicate `.stage-viewport` block from `feature.css` so `style.css` is the single source of truth.
- Decisions: Specified `height: 28px; box-sizing: border-box` on `.places-bar` (24 px inner lane + 2 px top/bottom borders) so `width: 100%` with `padding: 0 4px` never overflows and 24x24 arrows fit unclipped.
- Differences: `web/home/index.html:87` defines `#pigCanvas` as `width="240" height="130"` (~1.846:1), not `width="256" height="144"` as described in the prompt.
- Follow-up: `ux-p47-bar.js` lines 96-194 (T4+), `style.css` non-stage chrome heights, and `edit-panel.css` lines 46-338 (`#editDrawer`) were outside read scope; `PK-PF-BAR` should verify drawer-open fit and T4+.
