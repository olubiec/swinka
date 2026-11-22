# PK-R48 log
- Decision: Use deterministic `beatClock` + `assets/data/music_bpm.json` instead of Web Audio `AnalyserNode` (`music.js:152` creates `Audio` without `crossOrigin`, so `createMediaElementSource` on `https://cuy.assets/` risks CORS zeroing/silencing).
- Decision: Do not modify `web/home/music.js` or `assets/music/tracks.json`; match active track via `CuyMusic.getCurrentAudio().src` against `music_bpm.json`.
- API (`DanceSync` UMD in `web/home/lib/dance-sync.js`): `beatClock({bpm, startMs, offsetMs})` -> `{phase, beatIndex, onBeat, update, bpm, beatMs}`, `fpsForBpm(bpm, framesPerBeat)`, `resolveTrackBpm(trackIdOrSrc, bpmTable)`, `shouldStartDance(ctx)`, `shouldStopDance(ctx, elapsedMs)`, `createBrowserSync(opts)`.
- Constants/fields: `DEFAULT_BPM=120`, `FRAMES_PER_BEAT=4`, `MIN_FPS=4`, `MAX_FPS=16`, `MAX_DANCE_MS=30000`; start thresholds `mood>=85`, `energy>=40`; stop hysteresis `mood<75`, `energy<30`.
- Owner question (auto-answered): Whether to measure exact BPM of the 5 `.ogg` tracks via audio decoding or provide tunable starter BPMs in `music_bpm.json`. Chose tunable starter BPMs (marked `UNVERIFIED`) per `AGENTS.md` data-table convention.
- Verification: `node tools/qa/foundation-check.js docs/opt/foundations/R48.md 6` passed.
