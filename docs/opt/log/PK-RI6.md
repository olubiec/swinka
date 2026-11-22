# PK-RI6 Log
- Verified all 25 F4-2 files for R44 (Hay Hop), R45 (Companion), R48 (Dance Sync), R49 (Live Weather), and R50 (Stage Looks) exist on disk.
- Found 2 integration gaps: `GameState.Normalize()` (`src/Cuy.Core/GameState.cs:94-118`) does not initialize `Weather` when null (`R49.md:51`), and `HayHopMessages` registers `minigame.hay_hop.result` while `hayhop.js` -> `minigames-api.js` sends `minigame_result` without `durationMs` (`R44.md:66`).
- Verified exact line anchors in `web/home/canvas-pig.js`, `web/home/index.html`, `web/home/app.js`, `web/home/minigames/games.json`, `web/home/features/index.json`, `src/Cuy/dotNet/HomeWindow.cs`, and `src/Cuy/dotNet/Program.cs`.
- Documented insertion order (`PK-CS4` -> `PK-CV4` -> `PK-APP4`) and privacy invariants (no network calls before `Weather.Consent == true`, no `AnalyserNode` in `dance-sync.js`).
- Ran `node tools/qa/foundation-check.js docs/opt/foundations/RI6.md 4` to verify `RI6.md`.
