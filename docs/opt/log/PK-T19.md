# PK-T19: Desktop Props Adversarial Tests
Core (`PropsAdversarialTests`): 8 PASS, 0 DEFECT, 0 SKIP (`PROP-unowned-rejected`, `PROP-limit`, `PROP-duplicate`, `PROP-remove-missing`, `PROP-offscreen-coords`, `PROP-old-save-defaults`, `PROP-message-fuzz-300`, `PROP-manual-sheet`).
JS (`ux-p125-props-adv.js`): 2 PASS (`PROP-manual-sheet`, `PROP-console-clean`), 0 DEFECT, 2 SKIP (`PROP-ui-place-remove`, `PROP-ui-limit-message` - no desktop props UI in Home, rooms retired in P40d).
DEFECT: none.
Decisions: verified `PropsAdversarialTests` with `--filter "FullyQualifiedName~PropsAdversarialTests"` (full `Cuy.Core.Tests` suite has 7 pre-existing unrelated failures observed in PK-T18); Playwright fell back to `msedge` channel when default Chromium was missing.
