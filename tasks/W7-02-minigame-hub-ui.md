# W7-02: Minigame hub UI: daily counter, result screen, first-play hint
Zmieniaj: web/home/minigames/minigames-api.js, web/home/minigames/minigames.css, web/home/app.js, web/home/style.css, web/home/bridge.js
Wymagane: web/home/minigames/minigames-api.js
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check web/home/minigames/minigames-api.js web/home/app.js web/home/bridge.js
Nie ruszaj: web/home/minigames/veggie-rain.js, web/home/minigames/veggie-memory.js, web/home/minigames/hay-maze.js, web/home/index.html, src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The Games hub tells the truth about rewards and shows a clear result after each game.
Depends on: W7-01 (same wave: it produces the real state, this task builds against the contract below and the mock), W3-06 (`games.json` loader), W5-08 (mock keys) merged.
Facts: Contract: `state.minigames = { records, dailyRewardedDate, dailyRewardedCount, dailyMax, plays, lastResult: { gameId, score, clovers, mood, isNewRecord, rewarded } | null }`. The page sends `minigame_result { gameId, score }`; the real app answers with a new state whose `lastResult` describes the payout (never recompute rewards in JS).
Steps:
1. Hub header: "Rewarded games today X / Y" with Y small paw or clover dots (filled = used). When the limit is reached each tile shows a note "Over the daily limit: only a little mood" (no promise of clovers). Tiles keep name, icon, description and best score (`records[id]`); add the play count (`plays[id]`).
2. Result screen (after `endGame`): points, the record with a "New record!" flash when `lastResult.isNewRecord`, clovers earned and mood gained taken from `lastResult` only (when `lastResult` has not arrived yet show "Saving..." and update when it does). Never show a reward line when `clovers` is 0 or `rewarded` is false. Buttons: Play again, Back.
3. First-play hint: before a game starts for the first time show its `desc` in a small overlay with a Start button; remember per game in `localStorage` inside try/catch (works without storage).
4. Mock (`bridge.js`): on `minigame_result` compute a plausible `lastResult` (clovers = min(40, floor(score/10)), mood 15 until `dailyMax`, then 3), update `records`, `plays`, `dailyRewardedCount`, and push the state. Smoke-test-friendly: no `console.error`, layout fits 420x640.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
