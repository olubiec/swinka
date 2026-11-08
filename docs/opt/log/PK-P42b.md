# PK-P42b: Adoption countdown as days, hours, minutes

- Added pure function `formatRemaining(ms)` in `web/home/features/pigs/feature.js` exporting to `window.CuyPigs.formatRemaining` and `module.exports`.
- Format logic: `>= 1 day` -> `Xd Yh Zm`, `< 1 day` -> `Xh Ym`, `< 1 hour` -> `Xm`, `< 1 minute` -> `<1m`, `<= 0` -> `Ready`. Integers only via `Math.floor`; guards against NaN, non-finite, and negative inputs.
- Formatted adoption countdown in locked offer cards and button `aria-label` using `formatRemaining(remainingMs)`.
- Re-renders pigs feature view every 30s while visible with timer interval and local elapsed time tracking.
- Test `tools/qa/ux-p42-countdown.js` verifies D1 (100.5-days), D2 (3h5m), D3 (59s), D4 (zero/negative), D5 (no dot or NaN across 1000 inputs), D6 (23h59m60s rollover boundaries).
