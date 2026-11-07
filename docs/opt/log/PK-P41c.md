# PK-P41c: Music state around minigames

- Added `MiniGames.track(audio)` and `MiniGames.leave()` teardown path in `minigames-api.js` (aliased to `root.MiniGames` and `root.Minigry`).
- Tracked audio registry stops and disconnects all game audio sources, closes Web Audio `AudioContext`s, and invokes `NyanAudio.stopMusic()`.
- Captures pre-game home music state (`playing`, `volume`, `position`) on `start()` and restores it exactly on `leave()`; stays paused if it was off.
- Teardown hooked into Back button, modal close X, Esc key, `visibilitychange` (when hidden), and `pagehide` events exactly once.
- Updated `nyan-audio.js`, `nyan-cuy.js`, `veggie-memory.js`, and `veggie-rain.js` to register audio nodes/contexts via `track()`.
- Wrote QA test suite `tools/qa/ux-p41-audio.js` validating A1 (start registers), A2 (leave silences), A3 (home music restored), A4 (leave paths), A5 (reenter).
- Decisions: Normalized gameId lookups in `getGame()` to support both hyphen and underscore notation; no external dependencies added.
