# PK-DN1: Dance Sync (beat clock + BPM data)
- Decisions: deterministic `beatClock` + `assets/data/music_bpm.json` instead of `AnalyserNode` (per R48 CORS/WebView2 constraint); `lastBeat` starts at `0` so `update(startMs)` does not double-fire on beat 0.
- API (`window.DanceSync` / `module.exports`): `DEFAULT_BPM=120`, `FRAMES_PER_BEAT=4`, `MIN_FPS=4`, `MAX_FPS=16`, `MAX_DANCE_MS=30000`, `beatClock`, `fpsForBpm`, `resolveTrackBpm`, `shouldStartDance`, `shouldStopDance`, and browser-only `createBrowserSync`.
- Data (`assets/data/music_bpm.json`): `version=1`, `defaultBpm=120`, `framesPerBeat=4`, `maxDanceMs=30000`, `tracks` for all 5 entries in `assets/music/tracks.json` (`games_1:132`, `games_2:138`, `games_boss:150`, `menu:116`, `calm:96`).
- Differences from R48: test file named `tools/qa/ux-p132-dance.js` per prompt `Zmieniaj:` (R48 section 4 mentioned `dance-sync-test.js`); no `STUB` needed in pure Node tests.
- Verification: `node --check` + `node tools/qa/ux-p132-dance.js` -> 9 passed, 0 failed.
