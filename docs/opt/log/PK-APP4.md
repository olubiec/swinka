# PK-APP4 Log
- Added `lib/weather-live.js`, `lib/companion.js`, `lib/dance-sync.js`, `lib/stage-looks.js` script tags to `web/home/index.html`.
- Added `"weather"` to `web/home/features/index.json` and `"hayhop/hayhop-logic.js", "hayhop/hayhop.js"` to `web/home/minigames/games.json`.
- Wired `initBehaviorData()` in `web/home/app.js` to load `data/music_bpm.json`, `data/companions.json`, `data/stage_looks.json` (`StageLooks.setData`, guarded `canvasPig.setMusicBpmData`/`setCompanionData`).
- Wired `updateStateUI()` in `web/home/app.js` with `StageLooks.badge`, `CuyWeatherLive.mapState` -> `canvasPig.setWeatherKind`, and `canvasPig.setCompanion` (all guarded for parallel PK-CV4).
- Added `hookMusicBeatClock()` in `web/home/app.js` wrapping `CuyMusic.play`/`stop` with `DanceSync.beatClock` + `CanvasPig.setBeat` and exposing `CuyHome.getBeatClock()`.
- Added `tools/qa/ux-p136-app-optional.js` (A1-A6 all PASS; spies/stubs `CanvasPig.setBeat` when PK-CV4 is not yet merged).
