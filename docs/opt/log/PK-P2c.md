# PK-P2c: Player controls only after clicking the gramophone
- Added `tools/qa/ux-p2-player.js` covering milestones M1-M5; noted pre-fix failures.
- Updated `player.js` and `player.css` to hide `.mp_panel` by default with `.hidden` and `z-index: 200`.
- Set panel role to `region` with `aria-label="Music player"` and added `data-allow-clip="true"`.
- Added `show`, `hide`, `toggle`, `isVisible`, and `hasGramophone` APIs in `player.js`.
- Implemented focusable `.room-gramophone-trigger` over placed gramophones in `rooms/feature.js`.
- Supported opening/toggling via gramophone click, Enter/Space keyboard, and canvas hit-test.
- Implemented hide paths: second click on gramophone, Escape key, and outside click.
- Ensured music engine and audio playback continue uninterrupted when panel is closed.
- Verification command passed cleanly: syntax checks, `ux-p2-player.js`, and `web-smoke.js` all green.
